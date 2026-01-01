# 签到统计API需求文档

## 📋 接口概述

**接口名称**: 签到记录统计API  
**接口地址**: `GET /api/checkin/statistics`  
**功能描述**: 获取满足筛选条件的所有签到记录的统计信息，用于在前端显示完整的统计数据而非仅当前页数据。

## 🎯 业务背景

当前签到记录页面存在的问题：
- 统计信息（成功签到数、失败签到数、成功率）只显示当前页面的20条记录
- 用户需要看到**所有筛选结果**的统计信息，而不仅仅是当前页
- 例如：筛选"今天"的记录可能有100条，但用户只能看到第1页20条的统计信息

## 🔧 接口规范

### 请求参数

| 参数名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `startDate` | string | 否 | 开始日期时间 | `2025-08-10T00:00:00` |
| `endDate` | string | 否 | 结束日期时间 | `2025-08-10T23:59:59` |
| `status` | string | 否 | 签到状态筛选 | `success`/`failed`/`pending` |
| `guardId` | string | 否 | 保安ID筛选 | `guard_123` |
| `siteId` | string | 否 | 站点ID筛选 | `site_456` |

### 请求示例

```http
GET /api/checkin/statistics?startDate=2025-08-10T00:00:00&endDate=2025-08-10T23:59:59&status=success
Authorization: Bearer <jwt-token>
Content-Type: application/json
```

### 响应格式

```json
{
  "success": true,
  "data": {
    "totalRecords": 156,
    "successCount": 142,
    "failedCount": 12,
    "pendingCount": 2,
    "successRate": 91
  },
  "message": "统计信息获取成功"
}
```

### 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| `totalRecords` | number | 满足筛选条件的记录总数 |
| `successCount` | number | 成功签到的记录数 |
| `failedCount` | number | 失败签到的记录数 |
| `pendingCount` | number | 待处理签到的记录数 |
| `successRate` | number | 成功率百分比（整数，如91表示91%） |

## 📊 业务逻辑

### 筛选条件说明

1. **日期范围筛选**：
   - 如果提供`startDate`和`endDate`，筛选该时间范围内的记录
   - 日期格式：`YYYY-MM-DDTHH:mm:ss`（本地时间，无时区后缀）
   - 筛选逻辑：`timestamp >= startDate AND timestamp <= endDate`

2. **状态筛选**：
   - `success`: 只统计成功的签到记录
   - `failed`: 只统计失败的签到记录  
   - `pending`: 只统计待处理的签到记录
   - 如果不提供此参数，统计所有状态的记录

3. **保安筛选**：
   - 如果提供`guardId`，只统计该保安的记录
   - 支持格式：`guard_123` 或纯数字 `123`

4. **站点筛选**：
   - 如果提供`siteId`，只统计该站点的记录  
   - 支持格式：`site_456` 或纯数字 `456`

### 统计计算逻辑

```sql
-- 伪SQL示例
SELECT 
  COUNT(*) as totalRecords,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,  
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount,
  ROUND(
    SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 0
  ) as successRate
FROM checkin_records 
WHERE 
  (startDate IS NULL OR timestamp >= startDate)
  AND (endDate IS NULL OR timestamp <= endDate)  
  AND (status IS NULL OR status = status)
  AND (guardId IS NULL OR guard_id = guardId)
  AND (siteId IS NULL OR site_id = siteId)
```

## 🔒 权限要求

- 需要有效的JWT Token
- 用户角色：admin 或 superAdmin
- 与现有的 `/api/checkin` 接口保持相同的权限级别

## ⚠️ 注意事项

### 性能考虑
- 该接口可能需要统计大量数据，建议：
  - 对筛选字段建立数据库索引（timestamp, guard_id, site_id, status）
  - 对于大数据量场景，考虑添加合理的查询超时机制
  - 可以考虑缓存热门查询结果（如"今天"的统计）

### 错误处理
- 参数格式错误：返回 400 Bad Request
- 权限不足：返回 403 Forbidden  
- 服务器错误：返回 500 Internal Server Error

## 🎨 前端集成说明

### 调用时机
前端会在以下情况调用此接口：
1. 页面加载时，根据当前筛选条件获取统计
2. 用户更改筛选条件时（日期范围、状态、保安、站点）
3. 请求会有300ms防抖，避免频繁调用

### 降级机制  
如果此接口返回403或500错误，前端会：
1. 显示警告提示："统计API暂不可用"
2. 降级使用当前页数据进行统计
3. 在UI上明确标识这是"(本页)"统计而非完整统计

### UI显示效果
接口正常时：
- 显示绿色提示："✓ 以下统计数据为所有筛选条件下的完整统计信息"
- 统计数字后显示 "(完整)" 或 "(全部)" 标识

接口异常时：
- 显示黄色警告："注意：以下统计数据仅包含当前页面的20条记录"  
- 统计数字后显示 "(本页)" 标识

## 📋 测试用例

### 基础功能测试

1. **无筛选条件**
   ```
   GET /api/checkin/statistics
   预期：返回所有签到记录的统计
   ```

2. **日期范围筛选**
   ```
   GET /api/checkin/statistics?startDate=2025-08-10T00:00:00&endDate=2025-08-10T23:59:59
   预期：返回今天的签到统计
   ```

3. **状态筛选**
   ```
   GET /api/checkin/statistics?status=success
   预期：只统计成功的签到记录
   ```

4. **组合筛选**
   ```
   GET /api/checkin/statistics?startDate=2025-08-10T00:00:00&endDate=2025-08-10T23:59:59&status=failed&guardId=guard_123
   预期：今天保安guard_123的失败签到统计
   ```

### 边界情况测试

1. **空结果集**
   ```
   GET /api/checkin/statistics?startDate=2030-01-01T00:00:00&endDate=2030-01-01T23:59:59
   预期：返回全0的统计数据
   ```

2. **非法参数**
   ```
   GET /api/checkin/statistics?startDate=invalid-date
   预期：返回400错误
   ```

3. **权限测试**
   ```
   GET /api/checkin/statistics
   Header: Authorization: Bearer <invalid-token>
   预期：返回403错误
   ```

## 🚀 上线计划

### 开发阶段
1. 实现接口逻辑和数据库查询
2. 添加必要的索引优化性能
3. 完成单元测试和集成测试

### 测试阶段  
1. 功能测试：验证各种筛选条件组合
2. 性能测试：大数据量场景下的响应时间
3. 兼容性测试：确保不影响现有接口

### 上线后
1. 前端会自动检测接口可用性并切换到完整统计显示
2. 监控接口性能和错误率
3. 根据实际使用情况优化查询性能

---

**联系方式**: 如有疑问请联系前端开发团队  
**文档版本**: v1.0  
**最后更新**: 2025-08-10