import { getToken } from './auth';

interface RequestOptions extends RequestInit {
  skipRefresh?: boolean;
  retries?: number;
  retryDelay?: number;
}

interface AuthContextRef {
  refreshToken?: () => Promise<boolean>;
  logout?: () => void;
}

// Global reference to auth context methods (set by AuthProvider)
let authContextRef: AuthContextRef = {};

export function setAuthContextRef(context: AuthContextRef) {
  authContextRef = context;
}

export async function request(url: string, options: RequestOptions = {}): Promise<Response> {
  const {
    skipRefresh = false,
    retries = 1,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  // Get current token
  const token = getToken();

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let lastError: Error | null = null;
  
  // Retry logic
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`[REQUEST] ${fetchOptions.method || 'GET'} ${url} (attempt ${attempt + 1}/${retries + 1})`);

      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle 401 Unauthorized responses
      if (response.status === 401 && !skipRefresh && authContextRef.refreshToken) {
        console.log('[REQUEST] Received 401, attempting token refresh');
        
        try {
          const refreshSuccess = await authContextRef.refreshToken();
          
          if (refreshSuccess) {
            console.log('[REQUEST] Token refreshed successfully, retrying request');
            
            // Get the new token and retry the request
            const newToken = getToken();
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`;
              
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                headers,
              });
              
              if (retryResponse.status !== 401) {
                return retryResponse;
              }
              
              console.log('[REQUEST] Still getting 401 after token refresh, forcing logout');
            }
          }
        } catch (refreshError) {
          console.error('[REQUEST] Token refresh failed:', refreshError);
        }
        
        // If refresh failed or still getting 401, logout
        if (authContextRef.logout) {
          console.log('[REQUEST] Logging out due to persistent 401');
          authContextRef.logout();
        } else {
          // Fallback: manual cleanup and redirect
          localStorage.clear();
          window.location.href = '/login';
        }
        
        throw new Error('Authentication failed. Please log in again.');
      }

      // Handle other non-retriable errors
      if (!response.ok && (response.status < 500 || response.status > 599)) {
        // Don't retry client errors (4xx) except 401 (handled above)
        return response;
      }

      // Handle server errors (5xx) - these are retriable
      if (!response.ok && attempt < retries) {
        throw new Error(`Server error ${response.status}: ${response.statusText}`);
      }

      return response;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`[REQUEST] Attempt ${attempt + 1} failed:`, lastError.message);

      // If this is the last attempt, throw the error
      if (attempt === retries) {
        break;
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      console.log(`[REQUEST] Retrying in ${delay}ms...`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Update token for retry in case it was refreshed
      const currentToken = getToken();
      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error('Request failed after all retries');
}

// Convenience method for GET requests
export async function get(url: string, options?: RequestOptions): Promise<Response> {
  return request(url, { ...options, method: 'GET' });
}

// Convenience method for POST requests
export async function post(url: string, data?: unknown, options?: RequestOptions): Promise<Response> {
  return request(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Convenience method for PUT requests
export async function put(url: string, data?: unknown, options?: RequestOptions): Promise<Response> {
  return request(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

// Convenience method for DELETE requests
export async function del(url: string, options?: RequestOptions): Promise<Response> {
  return request(url, { ...options, method: 'DELETE' });
}