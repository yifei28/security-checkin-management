/**
 * Zod Validation Schemas
 * 
 * This file contains Zod validation schemas for all data models and forms
 * in the security check-in management system. These schemas provide runtime
 * validation and TypeScript type inference.
 */

import { z } from 'zod';

// ===================================================================
// Core Data Model Schemas
// ===================================================================

/**
 * Location schema for GPS coordinates
 */
export const LocationSchema = z.object({
  lat: z.number().min(-90, '纬度必须在-90到90之间').max(90, '纬度必须在-90到90之间'),
  lng: z.number().min(-180, '经度必须在-180到180之间').max(180, '经度必须在-180到180之间'),
});

/**
 * Check-in status enum schema
 */
export const CheckInStatusSchema = z.enum(['success', 'failed', 'pending'], {
  errorMap: () => ({ message: '检查状态必须是成功、失败或待处理' }),
});

/**
 * Guard validation schema
 */
export const GuardSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  name: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符'),
  phoneNumber: z
    .string()
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  photoUrl: z.string().url('请输入有效的照片URL'),
  assignedSiteIds: z.array(z.string()).default([]),
});

/**
 * Site validation schema
 */
export const SiteSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  name: z.string().min(2, '站点名称至少需要2个字符').max(100, '站点名称不能超过100个字符'),
  latitude: z.number().min(-90, '纬度必须在-90到90之间').max(90, '纬度必须在-90到90之间'),
  longitude: z.number().min(-180, '经度必须在-180到180之间').max(180, '经度必须在-180到180之间'),
  assignedGuardIds: z.array(z.string()).default([]),
});

/**
 * Check-in record validation schema
 */
export const CheckInRecordSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  guardId: z.string().min(1, '保安ID不能为空'),
  siteId: z.string().min(1, '站点ID不能为空'),
  timestamp: z.date(),
  location: LocationSchema,
  faceImageUrl: z.string().url('请输入有效的人脸照片URL'),
  status: CheckInStatusSchema,
  reason: z.string().max(500, '原因描述不能超过500个字符').optional(),
});

// ===================================================================
// Authentication Schemas
// ===================================================================

/**
 * User role schema
 */
export const UserRoleSchema = z.enum(['admin', 'superAdmin'], {
  errorMap: () => ({ message: '用户角色必须是管理员或超级管理员' }),
});

/**
 * User validation schema
 */
export const UserSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  username: z
    .string()
    .min(3, '用户名至少需要3个字符')
    .max(20, '用户名不能超过20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  role: UserRoleSchema,
  createdAt: z.date(),
  lastLoginAt: z.date().optional(),
  fullName: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符').optional(),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  isActive: z.boolean().default(true),
});

/**
 * Login request validation schema
 */
export const LoginSchema = z.object({
  username: z
    .string()
    .min(1, '请输入用户名')
    .min(3, '用户名至少需要3个字符')
    .max(20, '用户名不能超过20个字符'),
  password: z
    .string()
    .min(1, '请输入密码')
    .min(6, '密码至少需要6个字符')
    .max(100, '密码不能超过100个字符'),
  rememberMe: z.boolean().default(false),
});

/**
 * Login response validation schema
 */
export const LoginResponseSchema = z.object({
  token: z.string().min(1, '令牌不能为空'),
  user: UserSchema,
  expiresIn: z.number().positive('过期时间必须为正数'),
  refreshToken: z.string().optional(),
  tokenType: z.string().default('Bearer'),
});

// ===================================================================
// Form Validation Schemas
// ===================================================================

/**
 * Guard form validation schema (for create/edit forms)
 */
export const GuardFormSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符').max(50, '姓名不能超过50个字符'),
  phoneNumber: z
    .string()
    .min(1, '请输入手机号码')
    .regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码'),
  photoUrl: z.string().url('请输入有效的照片URL').or(z.literal('')),
  assignedSiteIds: z.array(z.string()).default([]),
});

/**
 * Site form validation schema (for create/edit forms)
 */
export const SiteFormSchema = z.object({
  name: z.string().min(2, '站点名称至少需要2个字符').max(100, '站点名称不能超过100个字符'),
  latitude: z
    .number({ invalid_type_error: '纬度必须是数字' })
    .min(-90, '纬度必须在-90到90之间')
    .max(90, '纬度必须在-90到90之间'),
  longitude: z
    .number({ invalid_type_error: '经度必须是数字' })
    .min(-180, '经度必须在-180到180之间')
    .max(180, '经度必须在-180到180之间'),
  assignedGuardIds: z.array(z.string()).default([]),
});

/**
 * Check-in filter form schema (for search/filter forms)
 */
export const CheckInFilterSchema = z.object({
  guardId: z.string().optional(),
  siteId: z.string().optional(),
  status: CheckInStatusSchema.optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

// ===================================================================
// API Response Schemas
// ===================================================================

/**
 * Generic API response schema
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string(),
    errors: z.array(z.string()).optional(),
    statusCode: z.number().optional(),
    timestamp: z.string().optional(),
  });

/**
 * Pagination metadata schema
 */
export const PaginationMetaSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  currentPage: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrevious: z.boolean(),
});

/**
 * Paginated response schema
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    success: z.boolean(),
    message: z.string(),
    errors: z.array(z.string()).optional(),
    statusCode: z.number().optional(),
    timestamp: z.string().optional(),
    pagination: PaginationMetaSchema,
  });

// ===================================================================
// Type Inference Utilities
// ===================================================================

/**
 * Inferred TypeScript types from Zod schemas
 */
export type GuardFormData = z.infer<typeof GuardFormSchema>;
export type SiteFormData = z.infer<typeof SiteFormSchema>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type CheckInFilterData = z.infer<typeof CheckInFilterSchema>;

// ===================================================================
// Validation Utility Functions
// ===================================================================

/**
 * Validates data against a schema and returns result with error messages
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const errors = result.error.errors.map(err => err.message);
  return { success: false, errors };
}

/**
 * Validates form data and returns formatted errors for form fields
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; fieldErrors: Record<string, string[]> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  const fieldErrors: Record<string, string[]> = {};
  result.error.errors.forEach(err => {
    const field = err.path.join('.');
    if (!fieldErrors[field]) {
      fieldErrors[field] = [];
    }
    fieldErrors[field].push(err.message);
  });
  
  return { success: false, fieldErrors };
}

/**
 * Creates a validation function for a specific schema
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (data: unknown) => validateData(schema, data);
}