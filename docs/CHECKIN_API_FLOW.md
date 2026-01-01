# 签到记录筛选API调用流程详解

## 概述

签到记录页面(`/admin/checkins`)通过复杂的筛选系统与后端API交互，实现分页、排序和多条件筛选功能。

## 1. API调用架构

### 1.1 网络层配置

```typescript
// vite.config.ts - 开发环境代理配置
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8080',  // 后端API地址
      changeOrigin: true,
      secure: false
    }
  }
}
```

### 1.2 请求流程

```
前端 → Vite代理 → 后端API(localhost:8080)
  ↓
请求日志: [PROXY] GET /api/checkin -> http://localhost:8080/api/checkin
  ↓
响应日志: [PROXY] GET /api/checkin <- 200/403/500
```

## 2. 签到记录API调用详细流程

### 2.1 主要API端点

| 端点 | 方法 | 用途 |
|------|------|------|
| `/api/checkin` | GET | 获取分页签到记录 |
| `/api/guards` | GET | 获取保安列表 |
| `/api/sites` | GET | 获取站点列表 |

### 2.2 API参数构建过程

#### 基础参数（总是包含）:
```typescript
const params = new URLSearchParams({
  page: '1',              // 页码（1-based）
  pageSize: '20',         // 每页记录数
  sortBy: 'timestamp',    // 排序字段
  sortOrder: 'desc'       // 排序方向
});
```

#### 日期筛选参数（条件添加）:
```typescript
// 当用户选择"今天"时
if (filters.dateRange === 'today') {
  params.append('startDate', '2025-08-10T00:00:00');
  params.append('endDate', '2025-08-10T23:59:59');
}
```

#### 其他筛选参数:
```typescript
if (filters.status !== 'all') {
  params.append('status', 'success'); // success/failed/pending
}
if (filters.guardId !== 'all') {
  params.append('guardId', 'guard_123');
}
if (filters.siteId !== 'all') {
  params.append('siteId', 'site_456');
}
```

### 2.3 完整API调用示例

#### 请求URL:
```
GET http://localhost:8080/api/checkin?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc&startDate=2025-08-10T00:00:00&endDate=2025-08-10T23:59:59&status=success
```

#### 期望响应格式:
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_1",
      "guardId": "guard_1",
      "siteId": "site_1", 
      "timestamp": "2025-08-10T09:30:00",
      "location": {
        "lat": 39.9088,
        "lng": 116.3974
      },
      "faceImageUrl": "https://example.com/face.jpg",
      "status": "success",
      "reason": null
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  },
  "statistics": {  // 可选 - 目前后端未实现
    "totalRecords": 100,
    "successCount": 75,
    "failedCount": 20,
    "pendingCount": 5,
    "successRate": 75
  }
}
```

## 3. 前端调用实现

### 3.1 数据获取函数

```typescript
// 主要的数据获取函数
const fetchRecordsWithPagination = async (
  paginationParams: PaginationParams, 
  filters?: FilterOptions
) => {
  // 1. 构建查询参数
  const params = new URLSearchParams({
    page: paginationParams.page.toString(),
    pageSize: paginationParams.pageSize.toString(),
    sortBy: paginationParams.sortBy || 'timestamp',
    sortOrder: paginationParams.sortOrder || 'desc'
  });

  // 2. 添加日期筛选
  if (filters?.dateRange && filters.dateRange !== 'all') {
    // 复杂的日期范围计算逻辑...
  }

  // 3. 添加其他筛选
  if (filters?.status && filters.status !== 'all') {
    params.append('status', filters.status);
  }

  // 4. 发送请求
  return request(`${BASE_URL}/api/checkin?${params}`);
};
```

### 3.2 组件中的调用

```typescript
useEffect(() => {
  const fetchData = async () => {
    try {
      // 并行请求三个API
      const [recordsRes, guardsRes, sitesRes] = await Promise.all([
        fetchRecordsWithPagination({ 
          page: pagination.pageIndex + 1,
          pageSize: pagination.pageSize 
        }, {
          dateRange: dateFilter,    // 'today'/'week'/'month'/'all'
          status: statusFilter,     // 'success'/'failed'/'pending'/'all'
          guardId: guardFilter,     // 保安ID或'all'
          siteId: siteFilter       // 站点ID或'all'
        }),
        request(`${BASE_URL}/api/guards`),
        request(`${BASE_URL}/api/sites`)
      ]);

      // 处理响应...
    } catch (error) {
      // 错误处理...
    }
  };

  fetchData();
}, [pagination, dateFilter, statusFilter, guardFilter, siteFilter]);
```

## 4. 筛选功能与后端的关系

### 4.1 日期筛选问题分析

**前端发送的时间参数**（正确）:
- `startDate=2025-08-10T00:00:00`
- `endDate=2025-08-10T23:59:59`

**后端应该做的事情**:
1. 接收并解析这两个时间参数
2. 在数据库查询中添加时间范围条件:
   ```sql
   WHERE timestamp >= '2025-08-10T00:00:00' 
   AND timestamp <= '2025-08-10T23:59:59'
   ```
3. 返回符合条件的记录

**可能的问题**:
- 后端没有处理`startDate`和`endDate`参数
- 后端时区处理不正确
- 数据库中的时间格式与前端期望不匹配

### 4.2 其他筛选功能

| 筛选类型 | 前端参数 | 后端应处理 |
|----------|----------|------------|
| 状态筛选 | `status=success` | `WHERE status = 'success'` |
| 保安筛选 | `guardId=guard_123` | `WHERE guardId = 'guard_123'` |
| 站点筛选 | `siteId=site_456` | `WHERE siteId = 'site_456'` |

## 5. 当前问题诊断

### 5.1 网络请求监控

从Vite代理日志可以看到:
```
[PROXY] POST /api/auth/refresh -> http://localhost/api/auth/refresh
[PROXY] POST /api/auth/refresh <- 403
```

这表明:
1. 后端服务可能没有运行（返回403）
2. 认证Token可能已过期
3. API端点可能配置不正确

### 5.2 调试步骤

1. **检查后端服务状态**:
   ```bash
   curl http://localhost:8080/api/checkin
   ```

2. **检查API参数**:
   - 打开浏览器开发者工具
   - 查看Network标签
   - 观察实际发送的请求URL和参数

3. **检查响应数据**:
   - 验证返回的记录是否符合时间筛选条件
   - 检查pagination信息是否正确

## 6. 解决方案

### 6.1 前端已实现的调试工具

1. **调试页面**: `/admin/debug-date-filter`
2. **控制台日志**: 自动记录API请求参数
3. **测试脚本**: `debug-api-params.js`

### 6.2 需要后端配合的部分

1. **实现完整的筛选支持**
2. **返回统计信息** (可选)
3. **修复时区处理问题**

## 7. API文档对比

### 后端API文档中的定义:
```
GET /api/checkin?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc
```

### 前端实际发送的请求:
```
GET /api/checkin?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc&startDate=2025-08-10T00:00:00&endDate=2025-08-10T23:59:59&status=success
```

**差异**: 前端发送了额外的筛选参数，但后端API文档中没有明确说明这些参数的处理方式。