# API 筛选接口文档

## 概述

所有列表查询接口支持后端筛选，筛选后的结果仍按分页返回。

---

## 筛选规则

1. **所有筛选参数都是可选的**，不传则不筛选该条件
2. **传 `all` 等同于不传**，表示全部
3. **多个筛选条件是 AND 关系**，同时满足才返回
4. **筛选后分页信息会更新**，`total` 和 `totalPages` 反映筛选后的数量

---

## 保安列表筛选

**GET** `/api/guards`

### 筛选参数

| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `name` | string | 姓名模糊搜索 | `张`、`王明` |
| `siteId` | string | 单位ID | `site_1` 或 `1` |
| `employmentStatus` | string | 在职状态 | `ACTIVE`、`RESIGNED` |
| `role` | string | 角色 | `TEAM_LEADER`、`TEAM_MEMBER` |
| `firefightingCertMin` | int | 消防证最低级别 | `1-5` |
| `firefightingCertMax` | int | 消防证最高级别 | `1-5` |
| `securityGuardCertMin` | int | 保安证最低级别 | `1-5` |
| `securityGuardCertMax` | int | 保安证最高级别 | `1-5` |
| `securityCheckCertMin` | int | 安检证最低级别 | `1-5` |
| `securityCheckCertMax` | int | 安检证最高级别 | `1-5` |

### employmentStatus 可选值

| 值 | 说明 |
|-----|------|
| `ACTIVE` | 在职 |
| `PROBATION` | 试用期 |
| `RESIGNED` | 离职 |
| `TERMINATED` | 辞退 |
| `all` | 全部（不筛选） |

### role 可选值

| 值 | 说明 |
|-----|------|
| `TEAM_LEADER` | 队长 |
| `TEAM_MEMBER` | 队员 |
| `all` | 全部（不筛选） |

### 证书筛选说明

证书级别支持**范围筛选**，使用 `Min` 和 `Max` 参数组合：

| 场景 | 参数 | 效果 |
|------|------|------|
| 有证（不限级别） | `Min=1` | 级别 >= 1 |
| 3级及以上 | `Min=3` | 级别 >= 3 |
| 1-3级 | `Min=1&Max=3` | 1 <= 级别 <= 3 |
| 精确3级 | `Min=3&Max=3` | 级别 = 3 |
| 不筛选 | 不传 | 不筛选该证书 |

**证书类型**：
- `firefightingCert` - 消防证
- `securityGuardCert` - 保安证
- `securityCheckCert` - 安检证

### 请求示例

```javascript
// 搜索姓"张"的保安
GET /api/guards?name=张

// 筛选某个单位的保安
GET /api/guards?siteId=site_1

// 筛选在职的队长
GET /api/guards?employmentStatus=ACTIVE&role=TEAM_LEADER

// 组合筛选：某单位的在职队员，按姓名排序
GET /api/guards?siteId=site_1&employmentStatus=ACTIVE&role=TEAM_MEMBER&sortBy=name&sortOrder=asc

// 带分页的筛选
GET /api/guards?name=张&page=1&pageSize=10

// 筛选有消防证的保安（不限级别）
GET /api/guards?firefightingCertMin=1

// 筛选消防证3级及以上的保安
GET /api/guards?firefightingCertMin=3

// 筛选消防证精确3级的保安
GET /api/guards?firefightingCertMin=3&firefightingCertMax=3

// 筛选消防证1-3级的保安
GET /api/guards?firefightingCertMin=1&firefightingCertMax=3

// 筛选同时有消防证和保安证的
GET /api/guards?firefightingCertMin=1&securityGuardCertMin=1

// 组合筛选：某单位有消防证3级以上的在职队员
GET /api/guards?siteId=site_1&employmentStatus=ACTIVE&firefightingCertMin=3
```

---

## 单位列表筛选

**GET** `/api/sites`

### 筛选参数

| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `name` | string | 名称模糊搜索 | `北京`、`万达` |

### 请求示例

```javascript
// 搜索名称包含"北京"的单位
GET /api/sites?name=北京

// 搜索名称包含"广场"的单位，按名称排序
GET /api/sites?name=广场&sortBy=name&sortOrder=asc
```

---

## 签到记录筛选

**GET** `/api/checkin`

### 筛选参数

| 参数 | 类型 | 说明 | 示例值 |
|------|------|------|--------|
| `startDate` | string | 开始日期 | `2025-12-25` 或 `2025-12-25T00:00:00` |
| `endDate` | string | 结束日期 | `2025-12-31` 或 `2025-12-31T23:59:59` |
| `status` | string | 签到状态 | `success`、`failed`、`pending` |
| `guardId` | string | 保安ID | `guard_1` 或 `1` |
| `siteId` | string | 单位ID | `site_1` 或 `1` |

### status 可选值

| 值 | 说明 |
|-----|------|
| `success` | 成功 |
| `failed` | 失败 |
| `pending` | 待处理 |
| `all` | 全部（不筛选） |

### 请求示例

```javascript
// 查询今天的签到记录
GET /api/checkin?startDate=2025-12-31&endDate=2025-12-31

// 查询某保安的签到记录
GET /api/checkin?guardId=guard_1

// 查询某单位的失败记录
GET /api/checkin?siteId=site_1&status=failed

// 查询日期范围内某单位的成功签到
GET /api/checkin?startDate=2025-12-25&endDate=2025-12-31&siteId=site_1&status=success
```

---

## 前端代码示例

### 通用筛选请求封装

```javascript
/**
 * 通用列表查询（支持分页+筛选）
 * @param {string} endpoint - API端点
 * @param {object} options - 查询选项
 * @param {object} options.pagination - 分页参数 {page, pageSize, sortBy, sortOrder}
 * @param {object} options.filters - 筛选参数
 */
async function fetchList(endpoint, options = {}) {
  const { pagination = {}, filters = {} } = options;

  // 默认分页参数
  const defaultPagination = {
    page: 1,
    pageSize: 20,
    sortBy: 'id',
    sortOrder: 'asc'
  };

  // 合并参数，过滤掉空值和 'all'
  const params = {
    ...defaultPagination,
    ...pagination,
    ...Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v && v !== 'all')
    )
  };

  const queryString = new URLSearchParams(params).toString();

  const response = await fetch(`${API_BASE}${endpoint}?${queryString}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  return response.json();
}
```

### 保安列表筛选示例

```javascript
// 查询保安列表
const result = await fetchList('/api/guards', {
  pagination: {
    page: 1,
    pageSize: 20,
    sortBy: 'name',
    sortOrder: 'asc'
  },
  filters: {
    name: '张',           // 姓名搜索
    siteId: 'site_1',     // 单位筛选
    employmentStatus: 'ACTIVE',  // 在职状态
    role: 'TEAM_MEMBER'   // 角色筛选
  }
});

console.log(result.data);           // 筛选后的保安列表
console.log(result.pagination.total); // 符合条件的总数
```

### 单位列表筛选示例

```javascript
// 搜索北京的单位
const result = await fetchList('/api/sites', {
  filters: {
    name: '北京'
  }
});
```

### 签到记录筛选示例

```javascript
// 查询某单位今日的成功签到
const today = new Date().toISOString().split('T')[0]; // '2025-12-31'

const result = await fetchList('/api/checkin', {
  pagination: {
    sortBy: 'timestamp',
    sortOrder: 'desc'
  },
  filters: {
    startDate: today,
    endDate: today,
    siteId: 'site_1',
    status: 'success'
  }
});
```

### Vue 组件示例

```vue
<template>
  <div>
    <!-- 筛选表单 -->
    <div class="filters">
      <input v-model="filters.name" placeholder="搜索姓名" @input="handleSearch" />

      <select v-model="filters.siteId" @change="handleFilter">
        <option value="">全部单位</option>
        <option v-for="site in sites" :key="site.id" :value="site.id">
          {{ site.name }}
        </option>
      </select>

      <select v-model="filters.employmentStatus" @change="handleFilter">
        <option value="">全部状态</option>
        <option value="ACTIVE">在职</option>
        <option value="PROBATION">试用期</option>
        <option value="RESIGNED">离职</option>
      </select>

      <select v-model="filters.role" @change="handleFilter">
        <option value="">全部角色</option>
        <option value="TEAM_LEADER">队长</option>
        <option value="TEAM_MEMBER">队员</option>
      </select>
    </div>

    <!-- 数据列表 -->
    <table>
      <tr v-for="guard in guards" :key="guard.id">
        <td>{{ guard.name }}</td>
        <td>{{ guard.site?.name }}</td>
        <td>{{ guard.role }}</td>
        <td>{{ guard.employmentStatus }}</td>
      </tr>
    </table>

    <!-- 分页 -->
    <pagination
      :total="pagination.total"
      :current="pagination.page"
      :page-size="pagination.pageSize"
      @change="handlePageChange"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      guards: [],
      pagination: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      filters: {
        name: '',
        siteId: '',
        employmentStatus: '',
        role: ''
      }
    };
  },

  methods: {
    async fetchGuards() {
      const result = await fetchList('/api/guards', {
        pagination: {
          page: this.pagination.page,
          pageSize: this.pagination.pageSize
        },
        filters: this.filters
      });

      this.guards = result.data;
      this.pagination = result.pagination;
    },

    // 防抖搜索
    handleSearch: debounce(function() {
      this.pagination.page = 1;  // 搜索时重置到第一页
      this.fetchGuards();
    }, 300),

    handleFilter() {
      this.pagination.page = 1;
      this.fetchGuards();
    },

    handlePageChange(page) {
      this.pagination.page = page;
      this.fetchGuards();
    }
  }
};
</script>
```

---

## 注意事项

1. **筛选时重置分页**：当筛选条件改变时，应将 `page` 重置为 1
2. **搜索防抖**：文本搜索建议使用防抖（300ms），避免频繁请求
3. **空值处理**：空字符串和 `all` 都表示不筛选，前端可统一处理
4. **ID 格式**：支持 `site_1` 和 `1` 两种格式，后端会自动处理前缀

---

## 更新日志

- **2026-01-01**: 新增证书筛选参数（消防证、保安证、安检证）
- **2025-12-31**: 新增后端筛选功能文档
