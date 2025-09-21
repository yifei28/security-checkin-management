// Use relative URL for API calls
// Development: proxied through Vite dev server to localhost:8080
// Production: proxied through Nginx to backend container
// Backend endpoints include /api prefix, final URL will be /api/api/endpoint
export const BASE_URL = '/api';
// export const BASE_URL = 'http://localhost:8080';