import { createContext, useContext, useReducer, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { logout, setAuthData, isTokenExpired, getCurrentUser, getToken, decodeJwtToken } from '../util/auth';
import type { LoginFormData } from '../types/schemas';
import { request, setAuthContextRef } from '../util/request';
import { BASE_URL } from '../util/config';

// ===================================================================
// Types and Interfaces
// ===================================================================

interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'superAdmin';
  fullName?: string;
  email?: string;
  lastLoginAt?: string;
  createdAt: Date;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  refreshError: string | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: AuthUser; token: string } }
  | { type: 'AUTH_ERROR'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'SET_USER'; payload: AuthUser }
  | { type: 'CLEAR_ERROR' }
  | { type: 'INITIALIZE'; payload: { user: AuthUser | null; token: string | null } }
  | { type: 'TOKEN_REFRESH_START' }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: { token: string; user?: AuthUser } }
  | { type: 'TOKEN_REFRESH_ERROR'; payload: string };

interface AuthContextType {
  // State
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
  refreshError: string | null;
  
  // Actions
  login: (credentials: LoginFormData) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  refreshUser: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

// ===================================================================
// Context Creation
// ===================================================================

const AuthContext = createContext<AuthContextType | null>(null);

// ===================================================================
// Auth Reducer
// ===================================================================

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to check existing auth
  error: null,
  isRefreshing: false,
  refreshError: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        refreshError: null,
      };
    
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isRefreshing: false,
        refreshError: null,
      };
    
    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
        isRefreshing: false,
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isRefreshing: false,
        refreshError: null,
      };
    
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
      };
    
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
        refreshError: null,
      };
    
    case 'INITIALIZE':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!action.payload.token && !!action.payload.user,
        isLoading: false,
      };

    case 'TOKEN_REFRESH_START':
      return {
        ...state,
        isRefreshing: true,
        refreshError: null,
      };
    
    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user || state.user,
        isRefreshing: false,
        refreshError: null,
        error: null, // Clear any previous errors
      };
    
    case 'TOKEN_REFRESH_ERROR':
      return {
        ...state,
        isRefreshing: false,
        refreshError: action.payload,
      };
    
    default:
      return state;
  }
}

// ===================================================================
// AuthProvider Component
// ===================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  
  // Refs for managing timers and preventing memory leaks
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // ===================================================================
  // Token Refresh Logic
  // ===================================================================

  const refreshToken = useCallback(async (): Promise<boolean> => {
    if (state.isRefreshing) {
      console.log('[AUTH] Refresh already in progress, skipping');
      return false;
    }

    dispatch({ type: 'TOKEN_REFRESH_START' });

    try {
      console.log('[AUTH] Attempting to refresh token');
      
      const currentToken = getToken();
      if (!currentToken) {
        throw new Error('No token available for refresh');
      }

      const response = await request(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token returned from refresh endpoint');
      }

      console.log('[AUTH] Token refresh successful');

      // Update stored auth data with new token
      if (state.user) {
        const userForStorage = {
          id: state.user.id,
          username: state.user.username,
          role: state.user.role,
          createdAt: state.user.createdAt,
          lastLoginAt: new Date(),
          fullName: state.user.fullName,
          email: state.user.email,
          isActive: state.user.isActive,
        };
        setAuthData(data.token, userForStorage, state.user.role === 'superAdmin');
      }

      // Update context state
      dispatch({
        type: 'TOKEN_REFRESH_SUCCESS',
        payload: {
          token: data.token,
          user: data.user || state.user,
        }
      });

      // Reset retry count on successful refresh
      retryCountRef.current = 0;

      // Schedule next refresh
      scheduleTokenRefresh(data.token);

      return true;

    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);

      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Token refresh failed';

      dispatch({
        type: 'TOKEN_REFRESH_ERROR',
        payload: errorMessage
      });

      // Increment retry count
      retryCountRef.current += 1;

      // If we've exceeded max retries, force logout
      if (retryCountRef.current >= maxRetries) {
        console.log('[AUTH] Max refresh retries exceeded, logging out');
        logoutAction();
      } else {
        // Schedule retry in 30 seconds
        console.log(`[AUTH] Scheduling token refresh retry ${retryCountRef.current}/${maxRetries} in 30 seconds`);
        refreshTimeoutRef.current = setTimeout(() => {
          refreshToken();
        }, 30 * 1000);
      }

      return false;
    }
  }, [state.isRefreshing, state.user]);

  // Schedule token refresh based on token expiry
  const scheduleTokenRefresh = useCallback((token: string) => {
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }

    try {
      const payload = decodeJwtToken(token);
      if (!payload) {
        console.warn('[AUTH] Cannot decode token for scheduling refresh');
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresIn = payload.exp - now;
      
      // Schedule refresh 5 minutes (300 seconds) before expiry
      // or immediately if token expires within 5 minutes
      const refreshIn = Math.max(expiresIn - 300, 30);

      if (refreshIn > 0) {
        console.log(`[AUTH] Scheduling token refresh in ${refreshIn} seconds`);
        refreshTimeoutRef.current = setTimeout(() => {
          refreshToken();
        }, refreshIn * 1000);
      } else {
        console.log('[AUTH] Token expires soon, refreshing immediately');
        refreshToken();
      }

    } catch (error) {
      console.error('[AUTH] Error scheduling token refresh:', error);
    }
  }, [refreshToken]);

  // Initialize auth state from localStorage on mount (ONLY ONCE)
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = getToken();
        const storedUser = getCurrentUser();
        
        // Convert stored User to AuthUser if it exists
        let user: AuthUser | null = null;
        if (storedUser) {
          user = {
            id: storedUser.id,
            username: storedUser.username,
            role: storedUser.role,
            fullName: storedUser.fullName,
            email: storedUser.email,
            lastLoginAt: storedUser.lastLoginAt?.toISOString(),
            createdAt: storedUser.createdAt,
            isActive: storedUser.isActive,
          };
        }
        
        // Check if token exists and is not expired
        console.log('[AUTH] Initialization check:', {
          hasToken: !!token,
          hasUser: !!storedUser,
          tokenExpired: token ? isTokenExpired() : 'no token',
          tokenLength: token?.length,
          userUsername: storedUser?.username
        });
        
        if (token && !isTokenExpired()) {
          if (user) {
            console.log('[AUTH] Initializing with existing valid token and user data');
            dispatch({
              type: 'INITIALIZE',
              payload: { user, token }
            });
          } else {
            console.log('[AUTH] Valid token found but user data missing - creating minimal user from token');
            // Extract basic user info from token if possible
            const payload = decodeJwtToken(token);
            const minimalUser: AuthUser = {
              id: payload?.sub || 'unknown',
              username: payload?.username || 'user',
              role: payload?.role || 'admin',
              createdAt: new Date(),
              isActive: true,
            };
            
            dispatch({
              type: 'INITIALIZE',
              payload: { user: minimalUser, token }
            });
          }
        } else {
          if (token) {
            console.log('[AUTH] Token found but expired, cleaning up');
            logout();
          } else {
            console.log('[AUTH] No token found');
          }
          dispatch({
            type: 'INITIALIZE',
            payload: { user: null, token: null }
          });
        }
      } catch (error) {
        console.error('[AUTH] Error initializing auth:', error);
        logout(); // Clean up any corrupted data
        dispatch({
          type: 'INITIALIZE',
          payload: { user: null, token: null }
        });
      }
    };

    initializeAuth();

    // Cleanup timeout on unmount
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []); // Remove scheduleTokenRefresh dependency to prevent re-initialization

  // Separate effect to schedule token refresh when token changes
  useEffect(() => {
    if (state.isAuthenticated && state.token) {
      scheduleTokenRefresh(state.token);
    }
  }, [state.token, state.isAuthenticated, scheduleTokenRefresh]);

  // ===================================================================
  // Auth Actions
  // ===================================================================

  const loginAction = async (credentials: LoginFormData): Promise<void> => {
    dispatch({ type: 'AUTH_START' });

    try {
      console.log('[AUTH] Attempting login for user:', credentials.username);

      const response = await request(`${BASE_URL}/api/login`, {
        method: 'POST',
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || '登录失败，请检查用户名和密码');
      }

      const data = await response.json();
      console.log('[AUTH] Login successful');

      // Extract user and auth info
      const user: AuthUser = {
        id: data.user?.id || data.id || credentials.username,
        username: credentials.username,
        role: data.superAdmin || data.user?.role === 'superAdmin' ? 'superAdmin' : 'admin',
        fullName: data.user?.fullName,
        email: data.user?.email,
        lastLoginAt: new Date().toISOString(),
        createdAt: data.user?.createdAt ? new Date(data.user.createdAt) : new Date(),
        isActive: data.user?.isActive !== false,
      };

      const token = data.token;

      // Store auth data - convert to types/User format
      const userForStorage = {
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: new Date(),
        fullName: user.fullName,
        email: user.email,
        isActive: user.isActive,
      };
      setAuthData(token, userForStorage, user.role === 'superAdmin');

      // Handle remember me functionality
      if (credentials.rememberMe) {
        const userToSave = {
          username: credentials.username,
          rememberMe: true
        };
        localStorage.setItem('user', JSON.stringify(userToSave));
        console.log('[AUTH] Saved user data for remember me:', userToSave);
      } else {
        localStorage.removeItem('user');
        console.log('[AUTH] Remember me not checked, cleared saved user data');
      }

      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user, token }
      });

      // Schedule token refresh for the new token
      scheduleTokenRefresh(token);

    } catch (error) {
      console.error('[AUTH] Login error:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '网络连接错误，请检查网络后重试';
      
      dispatch({
        type: 'AUTH_ERROR',
        payload: errorMessage
      });
      
      throw error; // Re-throw for component handling
    }
  };

  const logoutAction = (): void => {
    console.log('[AUTH] Performing logout');
    
    // Clear any pending refresh timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
    
    // Reset retry count
    retryCountRef.current = 0;
    
    logout(); // Clear localStorage
    dispatch({ type: 'LOGOUT' });
  };

  const clearErrorAction = (): void => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const refreshUser = async (): Promise<void> => {
    try {
      // This would typically fetch fresh user data from the API
      // For now, we'll just update the lastLoginAt
      if (state.user) {
        const updatedUser = {
          ...state.user,
          lastLoginAt: new Date().toISOString(),
        };
        
        // Update localStorage - convert to types/User format
        const userForStorage = {
          id: updatedUser.id,
          username: updatedUser.username,
          role: updatedUser.role,
          createdAt: updatedUser.createdAt,
          lastLoginAt: new Date(),
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          isActive: updatedUser.isActive,
        };
        setAuthData(state.token || '', userForStorage, updatedUser.role === 'superAdmin');
        
        dispatch({
          type: 'SET_USER',
          payload: updatedUser
        });
      }
    } catch (error) {
      console.error('[AUTH] Error refreshing user data:', error);
    }
  };

  // Set auth context reference for request utility (after all functions are defined)
  useEffect(() => {
    setAuthContextRef({
      refreshToken,
      logout: logoutAction,
    });
  }, [refreshToken, logoutAction]);

  // ===================================================================
  // Context Value
  // ===================================================================

  const contextValue: AuthContextType = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    isRefreshing: state.isRefreshing,
    refreshError: state.refreshError,
    
    // Actions
    login: loginAction,
    logout: logoutAction,
    clearError: clearErrorAction,
    refreshUser,
    refreshToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ===================================================================
// Custom Hook
// ===================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

// ===================================================================
// Convenience Hooks
// ===================================================================

export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useAuthLoading(): boolean {
  const { isLoading } = useAuth();
  return isLoading;
}