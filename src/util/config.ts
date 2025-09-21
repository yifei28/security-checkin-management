// Use relative URL for API calls
// Development: proxied through Vite dev server to localhost:8080
// Production: proxied through Nginx to backend container
// Backend endpoints include /api prefix, so BASE_URL should be empty
export const BASE_URL = '';
// export const BASE_URL = 'http://localhost:8080';