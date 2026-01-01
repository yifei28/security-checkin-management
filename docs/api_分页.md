# API 分页接口文档

## 概述

所有列表查询接口已统一支持分页，返回格式一致。

---

## 通用分页参数

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | int | 1 | 页码（从1开始） |
| `pageSize` | int | 20 | 每页条数 |
| `sortBy` | string | "id" | 排序字段 |
| `sortOrder` | string | "asc" | 排序方向：asc/desc |

---

## 通用响应格式

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 31,
    "page": 1,
    "pageSize": 20,
    "totalPages": 2
  }
}
```

### pagination 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `total` | long | 总记录数 |
| `page` | int | 当前页码（从1开始） |
| `pageSize` | int | 每页条数 |
| `totalPages` | int | 总页数 |

---

## 接口列表

### 1. 保安列表

**GET** `/api/guards`

**请求示例：**
```
GET /api/guards?page=1&pageSize=10&sortBy=name&sortOrder=asc
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "guard_1",
      "name": "张伟",
      "phoneNumber": "13800000001",
      "employeeId": "20251231-0000001-Abc123",
      "site": {
        "id": "site_1",
        "name": "北京市朝阳区万达广场"
      },
      "role": "TEAM_LEADER",
      "isActive": true,
      "createdAt": "2025-12-31T16:18:34",
      "birthDate": "1985-03-15",
      "age": 40,
      "height": 178,
      "idCardNumber": "110101198503150011",
      "gender": "MALE",
      "employmentStatus": "ACTIVE",
      "originalHireDate": "2020-01-15",
      "latestHireDate": "2020-01-15",
      "resignDate": null
    }
  ],
  "pagination": {
    "total": 31,
    "page": 1,
    "pageSize": 10,
    "totalPages": 4
  }
}
```

**可排序字段：** `id`, `name`, `phoneNumber`, `employeeId`

---

### 2. 单位列表

**GET** `/api/sites`

**请求示例：**
```
GET /api/sites?page=1&pageSize=10
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "site_1",
      "name": "北京市朝阳区万达广场",
      "latitude": 39.9219,
      "longitude": 116.4551,
      "allowedRadiusMeters": 200.0,
      "assignedGuardIds": ["guard_1", "guard_2", "guard_3"],
      "isActive": true,
      "createdAt": "2025-12-31T16:19:06"
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

**可排序字段：** `id`, `name`

---

### 3. 管理员列表

**GET** `/api/admin`

**请求示例：**
```
GET /api/admin?page=1&pageSize=10
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "admin_1",
      "username": "admin",
      "isSuperAdmin": true
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**可排序字段：** `id`, `username`

---

### 4. 签到记录列表（管理端）

**GET** `/api/checkin`

**额外筛选参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `startDate` | string | 开始日期，格式：`2025-12-25` 或 `2025-12-25T00:00:00` |
| `endDate` | string | 结束日期 |
| `status` | string | 状态筛选：`success` / `failed` / `pending` / `all` |
| `guardId` | string | 保安ID，如 `guard_1` |
| `siteId` | string | 单位ID，如 `site_1` |

**请求示例：**
```
GET /api/checkin?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc&startDate=2025-12-25&status=success
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_136",
      "guardId": "guard_6",
      "siteId": "site_2",
      "timestamp": "2025-12-31T08:16:55",
      "location": {
        "lat": 39.9832,
        "lng": 116.3166
      },
      "faceImageUrl": "/images/face_137.jpg",
      "status": "success",
      "reason": null
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "totalPages": 8
  },
  "statistics": {
    "totalRecords": 150,
    "successCount": 142,
    "failedCount": 7,
    "pendingCount": 1,
    "successRate": 95
  }
}
```

**可排序字段：** `id`, `timestamp`

---

### 5. 我的签到记录（小程序端）

**GET** `/api/checkin/my-records`

**必需参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `employeeId` | string | 员工ID（必填） |

**请求示例：**
```
GET /api/checkin/my-records?employeeId=20251231-0000001-Abc123&page=1&pageSize=10
```

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_136",
      "guardId": "张伟",
      "siteId": "北京市朝阳区万达广场",
      "timestamp": "2025-12-31T08:16:55",
      "location": {
        "lat": 39.9832,
        "lng": 116.3166
      },
      "faceImageUrl": "/images/face_137.jpg",
      "status": "success",
      "reason": null
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "pageSize": 10,
    "totalPages": 3
  }
}
```

> 注意：小程序端返回的 `guardId` 和 `siteId` 是名称而非ID

---

## 前端分页组件示例

### 请求封装

```javascript
async function fetchPaginatedData(endpoint, params = {}) {
  const defaultParams = {
    page: 1,
    pageSize: 20,
    sortBy: 'id',
    sortOrder: 'asc'
  };

  const queryParams = new URLSearchParams({
    ...defaultParams,
    ...params
  });

  const response = await fetch(`${API_BASE}${endpoint}?${queryParams}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

// 使用示例
const result = await fetchPaginatedData('/api/guards', {
  page: 2,
  pageSize: 10,
  sortBy: 'name'
});

console.log(result.data);        // 当前页数据
console.log(result.pagination);  // 分页信息
```

### 分页状态管理

```javascript
// Vue/React 状态示例
const paginationState = {
  current: 1,           // 当前页 (对应 page)
  pageSize: 20,         // 每页条数
  total: 0,             // 总条数 (从 pagination.total 获取)
  totalPages: 0         // 总页数 (从 pagination.totalPages 获取)
};

// 更新分页状态
function updatePagination(response) {
  const { pagination } = response;
  paginationState.current = pagination.page;
  paginationState.pageSize = pagination.pageSize;
  paginationState.total = pagination.total;
  paginationState.totalPages = pagination.totalPages;
}
```

---

## 枚举值参考

### GuardRole (保安角色)

| 值 | 显示名称 |
|-----|---------|
| `TEAM_LEADER` | 队长 |
| `TEAM_MEMBER` | 队员 |

### Gender (性别)

| 值 | 显示名称 |
|-----|---------|
| `MALE` | 男 |
| `FEMALE` | 女 |

### EmploymentStatus (在职状态)

| 值 | 显示名称 |
|-----|---------|
| `ACTIVE` | 在职 |
| `PROBATION` | 试用期 |
| `RESIGNED` | 离职 |
| `TERMINATED` | 辞退 |

### CheckinStatus (签到状态)

| 值 | 显示名称 |
|-----|---------|
| `success` | 成功 |
| `failed` | 失败 |
| `pending` | 待处理 |

---

## 错误响应

当请求失败时，返回格式：

```json
{
  "success": false,
  "data": null,
  "pagination": null
}
```

或直接返回错误信息：

```json
{
  "error": "Authorization header is missing or malformed"
}
```

---

## 更新日志

- **2025-12-31**: 统一所有列表接口分页格式，新增 Admin 分页接口
