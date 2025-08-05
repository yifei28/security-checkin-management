export async function request(url: string, options: RequestInit = {}) {
  // Get token from local storage
  const token = localStorage.getItem('token');

  // Prepare headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // If token exists, add it to the headers
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  // Make the API request
  const response = await fetch(url, {
    ...options,
    headers,
  });

  // If token is invalid or expired, redirect to login
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Token is invalid or expired. Redirecting to login.');
  }

  return response;
}