/**
 * Core Data Model Interfaces
 * 
 * This file contains the primary TypeScript interfaces for the security check-in 
 * management system, defining the structure for Guards, Sites, and Check-in Records.
 */

/**
 * Pagination interfaces for API requests and responses
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse {
  /** Total number of items */
  total: number;
  /** Current page number */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * API Response with optional pagination
 */
/**
 * Statistics for check-in records
 */
export interface CheckInStatistics {
  /** Total number of records matching the filter */
  totalRecords: number;
  /** Number of successful check-ins */
  successCount: number;
  /** Number of failed check-ins */
  failedCount: number;
  /** Number of pending check-ins */
  pendingCount: number;
  /** Success rate percentage */
  successRate: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination?: PaginationResponse;
  message?: string;
  statistics?: CheckInStatistics;
}

/**
 * Guard interface represents a security guard in the system
 */
export interface Guard {
  /** Unique identifier for the guard */
  id: string;
  
  /** Full name of the guard */
  name: string;
  
  /** Contact phone number */
  phoneNumber: string;
  
  /** URL to the guard's profile photo */
  photoUrl: string;
  
  /** Array of site IDs where this guard is assigned */
  assignedSiteIds: string[];
}

/**
 * Site interface represents a work location/site where guards are deployed
 */
export interface Site {
  /** Unique identifier for the site */
  id: string;
  
  /** Name/title of the site location */
  name: string;
  
  /** Geographic latitude coordinate */
  latitude: number;
  
  /** Geographic longitude coordinate */
  longitude: number;
  
  /** Allowed check-in radius in meters */
  allowedRadiusMeters: number;
  
  /** Array of guard IDs assigned to this site */
  assignedGuardIds: string[];
}

/**
 * Location coordinates for check-in records
 */
export interface Location {
  /** Latitude coordinate */
  lat: number;
  
  /** Longitude coordinate */
  lng: number;
}

/**
 * Check-in record status enum values
 */
export type CheckInStatus = 'success' | 'failed' | 'pending';

/**
 * CheckInRecord interface represents a guard's check-in event at a site
 */
export interface CheckInRecord {
  /** Unique identifier for the check-in record */
  id: string;
  
  /** ID of the guard who performed the check-in */
  guardId: string;
  
  /** ID of the site where the check-in occurred */
  siteId: string;
  
  /** Timestamp when the check-in was performed */
  timestamp: string;
  
  /** GPS location coordinates of the check-in */
  location: Location;
  
  /** URL to the face verification photo */
  faceImageUrl: string;
  
  /** Status of the check-in verification */
  status: CheckInStatus;
  
  /** Optional reason for failed verification or additional notes */
  reason?: string;
}

// ===================================================================
// API Response Types
// ===================================================================

/**
 * HTTP status codes for API responses
 */
export const HttpStatusCode = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type HttpStatusCode = typeof HttpStatusCode[keyof typeof HttpStatusCode];

/**
 * Generic API response wrapper for consistent API communication
 */
export interface ApiResponseGeneric<T = unknown> {
  /** Response data payload */
  data: T;
  
  /** Indicates if the request was successful */
  success: boolean;
  
  /** Human-readable message about the response */
  message: string;
  
  /** Optional array of error messages for detailed error reporting */
  errors?: string[];
  
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  
  /** Request timestamp */
  timestamp?: string;
}

/**
 * API error interface for standardized error responses
 */
export interface ApiError {
  /** Error code identifier */
  code: string;
  
  /** Human-readable error message */
  message: string;
  
  /** Detailed error description */
  details?: string;
  
  /** Field-specific validation errors */
  field?: string;
  
  /** HTTP status code */
  statusCode: HttpStatusCode;
  
  /** Error timestamp */
  timestamp: string;
}

/**
 * Pagination metadata for list responses - unified with PaginationResponse
 */
export interface PaginationMeta {
  /** Total number of items across all pages */
  total: number;
  
  /** Current page number (1-indexed) */
  page: number;
  
  /** Number of items per page */
  pageSize: number;
  
  /** Total number of pages */
  totalPages: number;
  
  /** Whether there is a next page */
  hasNext: boolean;
  
  /** Whether there is a previous page */
  hasPrevious: boolean;
}

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  /** Response data payload */
  data: T[];
  /** Indicates if the request was successful */
  success: boolean;
  /** Human-readable message about the response */
  message: string;
  /** Pagination metadata */
  pagination: PaginationMeta;
  /** Optional array of error messages for detailed error reporting */
  errors?: string[];
  /** HTTP status code */
  statusCode?: HttpStatusCode;
  /** Request timestamp */
  timestamp?: string;
}

/**
 * Request metadata for tracking and debugging
 */
export interface RequestMeta {
  /** Unique request identifier */
  requestId: string;
  
  /** Request timestamp */
  timestamp: string;
  
  /** API version */
  version: string;
  
  /** Request duration in milliseconds */
  duration?: number;
}

// ===================================================================
// Authentication & User Types
// ===================================================================

/**
 * User roles in the system
 */
export type UserRole = 'admin' | 'superAdmin';

/**
 * User interface representing a system user
 */
export interface User {
  /** Unique user identifier */
  id: string;
  
  /** Username for login */
  username: string;
  
  /** User role determining access permissions */
  role: UserRole;
  
  /** Account creation timestamp */
  createdAt: string;
  
  /** Optional last login timestamp */
  lastLoginAt?: string;
  
  /** Full name of the user */
  fullName?: string;
  
  /** Email address */
  email?: string;
  
  /** Whether the account is active */
  isActive: boolean;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  /** Username for authentication */
  username: string;
  
  /** Password for authentication */
  password: string;
  
  /** Optional remember me flag */
  rememberMe?: boolean;
}

/**
 * Login response from authentication endpoint
 */
export interface LoginResponse {
  /** JWT access token */
  token: string;
  
  /** Authenticated user information */
  user: User;
  
  /** Token expiration time in seconds */
  expiresIn: number;
  
  /** Optional refresh token */
  refreshToken?: string;
  
  /** Token type (typically "Bearer") */
  tokenType: string;
}

/**
 * JWT token payload structure
 */
export interface JwtTokenPayload {
  /** Subject (user ID) */
  sub: string;
  
  /** User role */
  role: UserRole;
  
  /** Username */
  username: string;
  
  /** Expiration time (Unix timestamp) */
  exp: number;
  
  /** Issued at time (Unix timestamp) */
  iat: number;
  
  /** Optional issuer */
  iss?: string;
  
  /** Optional audience */
  aud?: string;
}

/**
 * Session storage data structure for localStorage
 */
export interface SessionData {
  /** JWT access token */
  token: string;
  
  /** User information */
  user: User;
  
  /** Token expiration timestamp */
  expiresAt: number;
  
  /** Whether user is super admin (for quick access) */
  superAdmin: boolean;
  
  /** Session creation timestamp */
  loginTime: number;
}

/**
 * Authentication state for application context
 */
export interface AuthState {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  
  /** Current user data */
  user: User | null;
  
  /** JWT token */
  token: string | null;
  
  /** Authentication loading state */
  loading: boolean;
  
  /** Authentication error */
  error: string | null;
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  /** Refresh token */
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface RefreshTokenResponse {
  /** New access token */
  token: string;
  
  /** New expiration time in seconds */
  expiresIn: number;
  
  /** Optional new refresh token */
  refreshToken?: string;
}

// ===================================================================
// Utility Types
// ===================================================================

/**
 * Form state utility types for enhanced component development
 */
export type PartialGuard = Partial<Guard>;
export type RequiredSite = Required<Site>;
export type GuardWithoutId = Omit<Guard, 'id'>;
export type SiteWithoutId = Omit<Site, 'id'>;
export type CheckInRecordWithoutId = Omit<CheckInRecord, 'id'>;

/**
 * Form state types for create/edit operations
 */
export type GuardCreateInput = Omit<Guard, 'id'>;
export type GuardUpdateInput = Partial<GuardCreateInput> & { id: string };
export type SiteCreateInput = Omit<Site, 'id'>;
export type SiteUpdateInput = Partial<SiteCreateInput> & { id: string };

/**
 * Pick utility types for component props
 */
export type GuardSummary = Pick<Guard, 'id' | 'name' | 'phoneNumber'>;
export type SiteSummary = Pick<Site, 'id' | 'name'>;
export type CheckInSummary = Pick<CheckInRecord, 'id' | 'timestamp' | 'status'>;

/**
 * Record status types for different entities
 */
export type EntityStatus = 'loading' | 'success' | 'error' | 'idle';

/**
 * Extended API types for enhanced functionality
 */

/**
 * Form data interfaces for API requests
 */
export interface GuardFormData {
  name: string;
  phoneNumber: string;
  photoUrl?: string;
  assignedSiteIds: string[];
}

export interface SiteFormData {
  name: string;
  latitude: number;
  longitude: number;
  assignedGuardIds: string[];
}

/**
 * Assignment request interfaces
 */
export interface GuardAssignmentRequest {
  guardId: string;
  siteIds: string[];
}

export interface SiteAssignmentRequest {
  siteId: string;
  guardIds: string[];
}

/**
 * Bulk update request interfaces
 */
export interface GuardBulkUpdateRequest {
  id: string;
  updates: Partial<GuardFormData>;
}

export interface SiteBulkUpdateRequest {
  id: string;
  updates: Partial<SiteFormData>;
}

/**
 * Enhanced summary interfaces for dashboard and analytics
 */
export interface EnhancedGuardSummary {
  guardId: string;
  guardName: string;
  totalCheckIns: number;
  successfulCheckIns: number;
  failedCheckIns: number;
  successRate: number;
  assignedSites: number;
  lastCheckIn?: string;
}

export interface EnhancedSiteSummary {
  siteId: string;
  siteName: string;
  totalCheckIns: number;
  successfulCheckIns: number;
  failedCheckIns: number;
  successRate: number;
  assignedGuards: number;
  lastCheckIn?: string;
}

export interface CheckInRecordSummary {
  date: string;
  totalCheckIns: number;
  successfulCheckIns: number;
  failedCheckIns: number;
  successRate: number;
  uniqueGuards: number;
  uniqueSites: number;
}

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
  totalGuards: number;
  totalSites: number;
  totalCheckIns: number;
  todayCheckIns: number;
  successfulCheckIns: number;
  failedCheckIns: number;
  successRate: number;
  activeGuards: number;
  activeSites: number;
  recentCheckIns: CheckInRecord[];
  checkInTrends: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Generic form state type
 */
export interface FormState<T> {
  data: T;
  errors: Record<keyof T, string[]> | null;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

/**
 * Generic list state type for data tables
 */
export interface ListState<T> {
  items: T[];
  loading: boolean;
  error: string | null;
  pagination: PaginationMeta | null;
  selectedItems: T[];
  filters: Record<string, unknown>;
}

/**
 * API call state utility type
 */
export interface ApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

// ===================================================================
// Type Guards and Assertions
// ===================================================================

/**
 * Type guard to check if a value is a valid Guard
 */
export function isGuard(value: unknown): value is Guard {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'phoneNumber' in value &&
    'photoUrl' in value &&
    'assignedSiteIds' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).phoneNumber === 'string' &&
    typeof (value as any).photoUrl === 'string' &&
    Array.isArray((value as any).assignedSiteIds)
  );
}

/**
 * Type guard to check if a value is a valid Site
 */
export function isSite(value: unknown): value is Site {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'latitude' in value &&
    'longitude' in value &&
    'assignedGuardIds' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).name === 'string' &&
    typeof (value as any).latitude === 'number' &&
    typeof (value as any).longitude === 'number' &&
    Array.isArray((value as any).assignedGuardIds)
  );
}

/**
 * Type guard to check if a value is a valid CheckInRecord
 */
export function isCheckInRecord(value: unknown): value is CheckInRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'guardId' in value &&
    'siteId' in value &&
    'timestamp' in value &&
    'location' in value &&
    'faceImageUrl' in value &&
    'status' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).guardId === 'string' &&
    typeof (value as any).siteId === 'string' &&
    typeof (value as any).timestamp === 'string' &&
    typeof (value as any).location === 'object' &&
    typeof (value as any).faceImageUrl === 'string' &&
    ['success', 'failed', 'pending'].includes((value as any).status)
  );
}

/**
 * Type guard to check if a value is a valid User
 */
export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'username' in value &&
    'role' in value &&
    'createdAt' in value &&
    'isActive' in value &&
    typeof (value as any).id === 'string' &&
    typeof (value as any).username === 'string' &&
    ['admin', 'superAdmin'].includes((value as any).role) &&
    typeof (value as any).createdAt === 'string' &&
    typeof (value as any).isActive === 'boolean'
  );
}

/**
 * Type guard to check if a value is a valid ApiResponse
 */
export function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'data' in value &&
    'success' in value &&
    'message' in value &&
    typeof (value as any).success === 'boolean' &&
    typeof (value as any).message === 'string'
  );
}

/**
 * Type assertion function for Guards
 */
export function assertGuard(value: unknown): asserts value is Guard {
  if (!isGuard(value)) {
    throw new Error('Value is not a valid Guard');
  }
}

/**
 * Type assertion function for Sites
 */
export function assertSite(value: unknown): asserts value is Site {
  if (!isSite(value)) {
    throw new Error('Value is not a valid Site');
  }
}

/**
 * Type assertion function for Users
 */
export function assertUser(value: unknown): asserts value is User {
  if (!isUser(value)) {
    throw new Error('Value is not a valid User');
  }
}

// ===================================================================
// Enum and Constant Types
// ===================================================================

/**
 * Application route paths
 */
export const ROUTES = {
  LOGIN: '/login',
  ADMIN: '/admin',
  ADMIN_GUARDS: '/admin/guards',
  ADMIN_SITES: '/admin/sites',
  ADMIN_CHECKINS: '/admin/checkins',
  MANAGER: '/manager',
} as const;

export type RouteKeys = keyof typeof ROUTES;
export type RoutePaths = typeof ROUTES[RouteKeys];

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  SUPER_ADMIN: 'superAdmin',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

export type StorageKeys = keyof typeof STORAGE_KEYS;

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REFRESH: '/api/auth/refresh',
    LOGOUT: '/api/auth/logout',
  },
  GUARDS: '/api/guards',
  SITES: '/api/sites',
  CHECKINS: '/api/checkin',
  DASHBOARD: '/api/dashboard-metrics',
} as const;

// ===================================================================
// Generic Helper Types
// ===================================================================

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make specific properties optional
 */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Deep partial type
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Non-nullable type utility
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Extract array item type
 */
export type ArrayElement<T> = T extends readonly (infer U)[] ? U : never;

/**
 * Function parameter types utility
 */
export type FunctionParams<T extends (...args: any[]) => any> = T extends (...args: infer P) => any ? P : never;

/**
 * Function return type utility
 */
export type FunctionReturn<T extends (...args: any[]) => any> = T extends (...args: any[]) => infer R ? R : never;

// ===================================================================
// API Client Types
// ===================================================================

/**
 * Re-export common axios types for convenience
 */
export type { AxiosError, AxiosHeaders } from 'axios';

// ===================================================================
// Re-export Validation Schemas
// ===================================================================

// Re-export all validation schemas and utilities
export * from './schemas';