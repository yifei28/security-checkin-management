import { STORAGE_KEYS, type User, type JwtTokenPayload } from '../types';

/**
 * Check if user is currently logged in
 */
export function isLoggedIn(): boolean {
  const token = getToken();
  if (!token) return false;
  
  // Check if token is not expired
  return !isTokenExpired();
}

/**
 * Get the current JWT token from localStorage
 */
export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Check if user is a super admin
 */
export function isSuperAdmin(): boolean {
  return localStorage.getItem(STORAGE_KEYS.SUPER_ADMIN) === 'true';
}

/**
 * Get current user data from localStorage with type safety
 */
export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    const userData = JSON.parse(userStr);
    
    // Validate user data structure
    if (!userData || typeof userData !== 'object') return null;
    if (!userData.id || !userData.username || !userData.role) return null;
    
    // Convert date strings back to Date objects if needed
    return {
      ...userData,
      createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
      lastLoginAt: userData.lastLoginAt ? new Date(userData.lastLoginAt) : undefined,
      isActive: userData.isActive !== false, // Default to true if not specified
    } as User;
  } catch (error) {
    console.warn('[AUTH] Error parsing user data from localStorage:', error);
    return null;
  }
}

/**
 * Clear all authentication data
 * This function is called on logout or when tokens are invalid
 */
export function logout(): void {
  // Clear all authentication-related data
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.SUPER_ADMIN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  
  // Clear any remember me data if needed
  try {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (!userData.rememberMe) {
        localStorage.removeItem('user');
      }
    }
  } catch {
    // If there's an error parsing, just remove it
    localStorage.removeItem('user');
  }
  
  console.log('[AUTH] Authentication data cleared');
}

/**
 * Store authentication data after successful login with proper typing
 */
export function setAuthData(token: string, user: User, isSuperAdmin: boolean = false): void {
  if (!token || !user) {
    console.error('[AUTH] Invalid token or user data provided to setAuthData');
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({
      ...user,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    }));
    localStorage.setItem(STORAGE_KEYS.SUPER_ADMIN, isSuperAdmin.toString());
    
    console.log('[AUTH] Authentication data stored successfully');
  } catch (error) {
    console.error('[AUTH] Error storing authentication data:', error);
  }
}

/**
 * Decode JWT token payload with type safety
 */
export function decodeJwtToken(token: string): JwtTokenPayload | null {
  try {
    // Basic JWT structure check (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    // Decode payload
    const payload = JSON.parse(atob(parts[1]));
    
    // Validate required fields
    if (!payload.sub || !payload.exp || !payload.iat) {
      return null;
    }
    
    return payload as JwtTokenPayload;
  } catch (error) {
    console.warn('[AUTH] Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Check if token is expired with improved error handling
 */
export function isTokenExpired(): boolean {
  const token = getToken();
  if (!token) return true;
  
  const payload = decodeJwtToken(token);
  if (!payload) return true;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expiredTime = payload.exp;
  
  // Only consider token expired if it's actually past expiration time
  // Don't use buffer here - let the refresh logic handle early refresh
  return currentTime >= expiredTime;
}

/**
 * Get the user role from the current token
 */
export function getUserRoleFromToken(): 'admin' | 'superAdmin' | null {
  const token = getToken();
  if (!token) return null;
  
  const payload = decodeJwtToken(token);
  return payload?.role || null;
}

/**
 * Get user ID from the current token
 */
export function getUserIdFromToken(): string | null {
  const token = getToken();
  if (!token) return null;
  
  const payload = decodeJwtToken(token);
  return payload?.sub || null;
}

/**
 * Check if current token will expire soon (within 10 minutes)
 */
export function isTokenExpiringSoon(): boolean {
  const token = getToken();
  if (!token) return false;
  
  const payload = decodeJwtToken(token);
  if (!payload) return false;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expiredTime = payload.exp;
  
  // Check if token expires within 10 minutes
  const warningTime = 10 * 60; // 10 minutes
  return currentTime >= (expiredTime - warningTime);
}

/**
 * Validate if the current authentication state is consistent
 */
export function validateAuthState(): boolean {
  const token = getToken();
  const user = getCurrentUser();
  const superAdmin = isSuperAdmin();
  
  // If no token, should have no user data
  if (!token) {
    return !user && !superAdmin;
  }
  
  // If token exists, should have user data
  if (!user) return false;
  
  // Super admin flag should match user role
  const shouldBeSuperAdmin = user.role === 'superAdmin';
  return superAdmin === shouldBeSuperAdmin;
}

/**
 * Get time until token expiration in seconds
 */
export function getTimeUntilExpiration(): number {
  const token = getToken();
  if (!token) return 0;
  
  const payload = decodeJwtToken(token);
  if (!payload) return 0;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const expiredTime = payload.exp;
  
  return Math.max(0, expiredTime - currentTime);
}