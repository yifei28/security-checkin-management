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

/**
 * API Response for single objects
 */
export interface ApiResponseSingle<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * API Response for arrays with optional pagination
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T[];
  pagination?: PaginationResponse;
  message?: string;
  statistics?: CheckInStatistics;
}

/**
 * Guard role types
 */
export const GuardRole = {
  TEAM_MEMBER: 'TEAM_MEMBER',
  TEAM_LEADER: 'TEAM_LEADER'
} as const;

export type GuardRole = typeof GuardRole[keyof typeof GuardRole];

/**
 * Guard role display names mapping
 */
export const GuardRoleDisplayNames = {
  [GuardRole.TEAM_MEMBER]: '队员',
  [GuardRole.TEAM_LEADER]: '队长'
} as const;

/**
 * Gender types
 */
export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
} as const;

export type Gender = typeof Gender[keyof typeof Gender];

/**
 * Gender display names mapping
 */
export const GenderDisplayNames = {
  [Gender.MALE]: '男',
  [Gender.FEMALE]: '女'
} as const;

/**
 * Employment status types
 */
export const EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  PROBATION: 'PROBATION',
  SUSPENDED: 'SUSPENDED',
  RESIGNED: 'RESIGNED',
  RETIRED: 'RETIRED'
} as const;

export type EmploymentStatus = typeof EmploymentStatus[keyof typeof EmploymentStatus];

/**
 * Employment status display names mapping
 */
export const EmploymentStatusDisplayNames = {
  [EmploymentStatus.ACTIVE]: '在职',
  [EmploymentStatus.PROBATION]: '试用期',
  [EmploymentStatus.SUSPENDED]: '停职',
  [EmploymentStatus.RESIGNED]: '离职',
  [EmploymentStatus.RETIRED]: '退休'
} as const;

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

  /** Site ID where this guard is assigned (only one site allowed) */
  siteId: string | null;

  /** Guard role: TEAM_MEMBER or TEAM_LEADER */
  role: GuardRole;

  /** Employee ID (auto-generated, read-only) */
  employeeId?: string;

  /** WeChat OpenID (read-only, bound via mobile app) */
  openId?: string;

  /** ID card number (18 digits, unique) */
  idCardNumber?: string;

  /** Gender */
  gender?: Gender;

  /** Birth date in YYYY-MM-DD format */
  birthDate?: string;

  /** Age (calculated from birthDate, read-only) */
  age?: number;

  /** Height in centimeters */
  height?: number;

  /** Employment status */
  employmentStatus?: EmploymentStatus;

  /** Original hire date (first employment, never changes) */
  originalHireDate?: string;

  /** Latest hire date (updated when rehired) */
  latestHireDate?: string;

  /** Resignation date */
  resignDate?: string | null;

  /** Certificate levels (1-5, undefined = no certificate) */
  firefightingCertLevel?: number;
  securityGuardCertLevel?: number;
  securityCheckCertLevel?: number;
}

/**
 * Checkin location interface for multi-location support
 */
export interface CheckinLocation {
  /** Unique identifier for the location */
  id: number;

  /** Name of the location (e.g., "东门", "西门") */
  name: string;

  /** Geographic latitude coordinate */
  latitude: number;

  /** Geographic longitude coordinate */
  longitude: number;

  /** Allowed check-in radius in meters */
  allowedRadius: number;
}

/**
 * Site interface represents a work location/site where guards are deployed
 */
export interface Site {
  /** Unique identifier for the site */
  id: string;

  /** Name/title of the site location */
  name: string;

  /** Geographic latitude coordinate (legacy, for backward compatibility) */
  latitude: number;

  /** Geographic longitude coordinate (legacy, for backward compatibility) */
  longitude: number;

  /** Allowed check-in radius in meters (legacy, for backward compatibility) */
  allowedRadiusMeters: number;

  /** Array of guard IDs assigned to this site */
  assignedGuardIds: string[];

  /** Array of checkin locations (new multi-location support) */
  locations?: CheckinLocation[];

  /** Number of checkin locations */
  locationCount?: number;

  /** Number of guards assigned to this site */
  guardCount?: number;

  /** Number of guards currently on duty */
  onDutyNow?: number;

  /** Whether the site is active */
  isActive?: boolean;

  /** Creation timestamp */
  createdAt?: string;
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
 * Work status enum values (new model replacing CheckInStatus)
 */
export const WorkStatus = {
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  TIMEOUT: 'TIMEOUT',
  LEGACY: 'LEGACY'
} as const;

export type WorkStatus = typeof WorkStatus[keyof typeof WorkStatus];

/**
 * Work status display names mapping
 */
export const WorkStatusDisplayNames = {
  [WorkStatus.ACTIVE]: '在岗中',
  [WorkStatus.COMPLETED]: '已下岗',
  [WorkStatus.TIMEOUT]: '超时下岗',
  [WorkStatus.LEGACY]: '旧数据'
} as const;

/**
 * Work status colors for UI display
 */
export const WorkStatusColors = {
  [WorkStatus.ACTIVE]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  [WorkStatus.COMPLETED]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  [WorkStatus.TIMEOUT]: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  [WorkStatus.LEGACY]: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' }
} as const;

/**
 * Spot check status enum values
 */
export const SpotCheckStatus = {
  PENDING: 'PENDING',
  PASSED: 'PASSED',
  MISSED: 'MISSED'
} as const;

export type SpotCheckStatus = typeof SpotCheckStatus[keyof typeof SpotCheckStatus];

/**
 * Spot check status display names
 */
export const SpotCheckStatusDisplayNames = {
  [SpotCheckStatus.PENDING]: '待处理',
  [SpotCheckStatus.PASSED]: '已通过',
  [SpotCheckStatus.MISSED]: '超时未响应'
} as const;

/**
 * Spot check status colors for UI display
 */
export const SpotCheckStatusColors = {
  [SpotCheckStatus.PENDING]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  [SpotCheckStatus.PASSED]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  [SpotCheckStatus.MISSED]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
} as const;

/**
 * Spot check trigger type enum
 */
export const SpotCheckTriggerType = {
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL'
} as const;

export type SpotCheckTriggerType = typeof SpotCheckTriggerType[keyof typeof SpotCheckTriggerType];

/**
 * Spot check trigger type display names
 */
export const SpotCheckTriggerTypeDisplayNames = {
  [SpotCheckTriggerType.AUTOMATIC]: '自动触发',
  [SpotCheckTriggerType.MANUAL]: '手动触发'
} as const;

/**
 * SpotCheck interface represents a random spot check during work session
 */
export interface SpotCheck {
  /** Unique identifier */
  id: string;

  /** Associated work session ID */
  checkinRecordId: string;

  /** Creation timestamp */
  createdAt: string;

  /** Deadline for response (createdAt + 15 minutes) */
  deadline: string;

  /** Completion timestamp (if completed) */
  completedAt?: string;

  /** Current status */
  status: SpotCheckStatus;

  /** How the spot check was triggered */
  triggerType: SpotCheckTriggerType;

  /** Verification location latitude */
  latitude?: number;

  /** Verification location longitude */
  longitude?: number;

  /** Face verification image URL */
  faceImageUrl?: string;

  /** Reason for failure (if applicable) */
  failReason?: string;
}

/**
 * Legacy check-in record status enum values (for backward compatibility)
 * @deprecated Use WorkStatus instead
 */
export type CheckInStatus = 'success' | 'failed' | 'pending';

/**
 * CheckInRecord interface represents a work session (工作片段)
 * Updated from simple check-in to work session model
 */
export interface CheckInRecord {
  /** Unique identifier for the work session */
  id: string;

  /** ID of the guard who is working */
  guardId: string;

  /** ID of the site where the work occurs */
  siteId: string;

  /** Start time (上岗时间) - replaces old 'timestamp' */
  startTime: string;

  /** Start location latitude */
  startLatitude: number;

  /** Start location longitude */
  startLongitude: number;

  /** Start face verification image URL */
  startFaceImageUrl: string;

  /** End time (下岗时间) - null if still active */
  endTime?: string | null;

  /** End location latitude */
  endLatitude?: number;

  /** End location longitude */
  endLongitude?: number;

  /** End face verification image URL */
  endFaceImageUrl?: string;

  /** Work session status */
  status: WorkStatus;

  /** Work duration in minutes */
  durationMinutes?: number;

  /** Total spot checks triggered */
  spotCheckTotal: number;

  /** Spot checks passed */
  spotCheckPassed: number;

  /** Associated spot checks (loaded on demand) */
  spotChecks?: SpotCheck[];

  // Legacy fields for backward compatibility
  /** @deprecated Use startTime instead */
  timestamp?: string;

  /** @deprecated Use startLatitude/startLongitude instead */
  location?: Location;

  /** @deprecated Use startFaceImageUrl instead */
  faceImageUrl?: string;

  /** Optional reason/notes */
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
  siteId: string | null;
  role?: GuardRole; // Optional, defaults to TEAM_MEMBER
  // New fields
  idCardNumber?: string;
  gender?: Gender;
  birthDate?: string;
  height?: number;
  employmentStatus?: EmploymentStatus;
  originalHireDate?: string;
  latestHireDate?: string;
  resignDate?: string | null;
}

export interface SiteFormData {
  name: string;
  latitude: number;
  longitude: number;
  assignedGuardIds: string[];
}

/**
 * Form data for creating/updating checkin locations
 */
export interface CheckinLocationFormData {
  name: string;
  latitude: number;
  longitude: number;
  allowedRadius?: number;  // defaults to 100 meters
}

/**
 * Assignment request interfaces
 */
export interface GuardAssignmentRequest {
  guardId: string;
  siteId: string | null;
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

// ===================================================================
// Site Detail Types (for expandable site rows)
// ===================================================================

/**
 * On-duty guard information for site detail map
 */
export interface OnDutyGuard {
  /** Guard ID */
  id: string;
  /** Guard name */
  name: string;
  /** Current latitude position */
  lat: number;
  /** Current longitude position */
  lng: number;
  /** Work session start time */
  startTime: string;
}

/**
 * Site detail data returned from statistics API
 * Used in expanded site rows for displaying statistics, maps, and reports
 */
export interface SiteDetailData {
  /** Number of guards currently on duty at this site */
  onDutyCount: number;
  /** Total number of guards assigned to this site */
  totalGuards: number;
  /** Check-in rate percentage for today */
  checkinRate: number;
  /** List of on-duty guards with their positions */
  onDutyGuards: OnDutyGuard[];
}

/**
 * Work record data for site weekly report export
 */
export interface SiteWorkRecord {
  /** Work session date */
  date: string;
  /** Guard name */
  guardName: string;
  /** Start time (上岗时间) */
  startTime: string;
  /** End time (下岗时间) */
  endTime?: string;
  /** Work duration in minutes */
  durationMinutes?: number;
  /** Work status */
  status: WorkStatus | string;
  /** Total spot checks triggered */
  spotCheckTotal: number;
  /** Spot checks passed */
  spotCheckPassed: number;
  /** Start location latitude */
  startLatitude?: number;
  /** Start location longitude */
  startLongitude?: number;
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
    'siteId' in value &&
    'role' in value &&
    typeof (value as Guard).id === 'string' &&
    typeof (value as Guard).name === 'string' &&
    typeof (value as Guard).phoneNumber === 'string' &&
    typeof (value as Guard).photoUrl === 'string' &&
    ((value as Guard).siteId === null || typeof (value as Guard).siteId === 'string') &&
    Object.values(GuardRole).includes((value as Guard).role)
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
    typeof (value as Site).id === 'string' &&
    typeof (value as Site).name === 'string' &&
    typeof (value as Site).latitude === 'number' &&
    typeof (value as Site).longitude === 'number' &&
    Array.isArray((value as Site).assignedGuardIds)
  );
}

/**
 * Type guard to check if a value is a valid CheckInRecord (work session)
 */
export function isCheckInRecord(value: unknown): value is CheckInRecord {
  if (typeof value !== 'object' || value === null) return false;

  const record = value as CheckInRecord;

  // Required fields
  if (typeof record.id !== 'string') return false;
  if (typeof record.guardId !== 'string') return false;
  if (typeof record.siteId !== 'string') return false;

  // New model uses startTime, legacy uses timestamp
  const hasStartTime = typeof record.startTime === 'string';
  const hasTimestamp = typeof record.timestamp === 'string';
  if (!hasStartTime && !hasTimestamp) return false;

  // New model uses WorkStatus, legacy uses CheckInStatus
  const validWorkStatuses = Object.values(WorkStatus);
  const validLegacyStatuses = ['success', 'failed', 'pending'];
  const statusValid = validWorkStatuses.includes(record.status as WorkStatus) ||
                      validLegacyStatuses.includes(record.status as string);
  if (!statusValid) return false;

  return true;
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
    typeof (value as User).id === 'string' &&
    typeof (value as User).username === 'string' &&
    ['admin', 'superAdmin'].includes((value as User).role) &&
    typeof (value as User).createdAt === 'string' &&
    typeof (value as User).isActive === 'boolean'
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
    typeof (value as ApiResponse<T>).success === 'boolean' &&
    typeof (value as ApiResponse<T>).message === 'string'
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
export type FunctionParams<T extends (...args: unknown[]) => unknown> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Function return type utility
 */
export type FunctionReturn<T extends (...args: unknown[]) => unknown> = T extends (...args: unknown[]) => infer R ? R : never;

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