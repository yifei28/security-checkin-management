# 保安角色管理功能API文档

## 概述

保安角色管理功能为保安管理系统新增了角色区分能力，支持两种角色：队员（TEAM_MEMBER）和队长（TEAM_LEADER）。本文档针对前端管理网站的集成提供详细的API变更说明。

## 角色定义

### 枚举值与显示名称

| 枚举值 | 中文显示名 | 英文描述 | 说明 |
|--------|-----------|----------|------|
| `TEAM_MEMBER` | 队员 | Team Member | 普通保安人员 |
| `TEAM_LEADER` | 队长 | Team Leader | 保安队长，具有管理职责 |

## API 变更详情

### 1. 保安列表查询 API

**接口**: `GET /api/guards`

**变更**: 响应数据中新增 `role` 字段

#### 请求示例
```http
GET /api/guards
Authorization: Bearer {jwt_token}
```

#### 响应示例
```json
{
  "success": true,
  "data": [
    {
      "id": "guard_27",
      "name": "李易非",
      "phoneNumber": "15711202091",
      "employeeId": "20250816-0000027-PIw1XF",
      "site": {
        "id": "site_1",
        "name": "办公大楼A座"
      },
      "role": "TEAM_LEADER",  // 新增字段
      "isActive": true,
      "createdAt": "2025-08-19T14:24:11.744824"
    }
  ]
}
```

### 2. 创建保安 API

**接口**: `POST /api/guards`

**变更**: 请求体中支持 `role` 字段（可选）

#### 请求示例
```json
{
  "name": "张三",
  "phoneNumber": "13800138000",
  "site": {
    "id": 1
  },
  "role": "TEAM_LEADER"  // 可选字段，不传默认为 TEAM_MEMBER
}
```

#### 响应示例
```json
{
  "id": 29,
  "name": "张三",
  "employeeId": "20250819-0000029-Ab12Cd",
  "openId": null,
  "phoneNumber": "13800138000",
  "site": {
    "id": 1,
    "name": "办公大楼A座",
    "latitude": 39.878185,
    "longitude": 116.620212,
    "allowedRadiusMeters": 500.0
  },
  "role": "TEAM_LEADER"
}
```

### 3. 更新保安信息 API

**接口**: `PUT /api/guards/{id}`

**变更**: 请求体中支持 `role` 字段更新

#### 请求示例
```json
{
  "name": "李易非",
  "phoneNumber": "15711202091",
  "site": {
    "id": 1
  },
  "role": "TEAM_MEMBER"  // 可更新角色
}
```

#### 响应示例
```json
{
  "id": 27,
  "name": "李易非",
  "employeeId": "20250816-0000027-PIw1XF",
  "openId": "oQFdKvshNsFrqDIOaV0U00cniNCM",
  "phoneNumber": "15711202091",
  "site": {
    "id": 1,
    "name": "办公大楼A座",
    "latitude": 39.878185,
    "longitude": 116.620212,
    "allowedRadiusMeters": 500.0
  },
  "role": "TEAM_MEMBER"
}
```

## 前端实现建议

### 1. 数据模型更新

#### TypeScript 接口定义
```typescript
// 保安角色枚举
export enum GuardRole {
  TEAM_MEMBER = 'TEAM_MEMBER',
  TEAM_LEADER = 'TEAM_LEADER'
}

// 角色显示名称映射
export const GuardRoleDisplayNames = {
  [GuardRole.TEAM_MEMBER]: '队员',
  [GuardRole.TEAM_LEADER]: '队长'
} as const;

// 保安数据接口
export interface SecurityGuard {
  id: string;
  name: string;
  phoneNumber: string;
  employeeId: string;
  site: {
    id: string;
    name: string;
  };
  role: GuardRole; // 新增字段
  isActive: boolean;
  createdAt: string;
}

// 创建/更新请求接口
export interface CreateGuardRequest {
  name: string;
  phoneNumber: string;
  site: {
    id: number;
  };
  role?: GuardRole; // 可选字段
}
```

### 2. UI 组件更新

#### 表格显示
```tsx
// 在保安列表表格中新增角色列
const columns = [
  // ... 其他列
  {
    title: '角色',
    dataIndex: 'role',
    key: 'role',
    render: (role: GuardRole) => (
      <Tag color={role === GuardRole.TEAM_LEADER ? 'gold' : 'blue'}>
        {GuardRoleDisplayNames[role]}
      </Tag>
    )
  },
  // ... 其他列
];
```

#### 表单组件
```tsx
// 在创建/编辑保安表单中添加角色选择
<Form.Item
  name="role"
  label="角色"
  initialValue={GuardRole.TEAM_MEMBER}
>
  <Select>
    <Select.Option value={GuardRole.TEAM_MEMBER}>
      {GuardRoleDisplayNames[GuardRole.TEAM_MEMBER]}
    </Select.Option>
    <Select.Option value={GuardRole.TEAM_LEADER}>
      {GuardRoleDisplayNames[GuardRole.TEAM_LEADER]}
    </Select.Option>
  </Select>
</Form.Item>
```

### 3. API 服务更新

```typescript
// API 服务方法示例
export class GuardService {
  
  // 获取保安列表
  static async getGuards(): Promise<ApiResponse<SecurityGuard[]>> {
    const response = await api.get('/api/guards');
    return response.data;
  }
  
  // 创建保安
  static async createGuard(data: CreateGuardRequest): Promise<SecurityGuard> {
    const response = await api.post('/api/guards', data);
    return response.data;
  }
  
  // 更新保安
  static async updateGuard(id: string, data: CreateGuardRequest): Promise<SecurityGuard> {
    const response = await api.put(`/api/guards/${id}`, data);
    return response.data;
  }
}
```

### 4. 筛选和搜索功能

```tsx
// 角色筛选组件
const RoleFilter: React.FC<{
  value?: GuardRole;
  onChange: (role?: GuardRole) => void;
}> = ({ value, onChange }) => (
  <Select
    placeholder="选择角色"
    allowClear
    value={value}
    onChange={onChange}
    style={{ width: 120 }}
  >
    <Select.Option value={GuardRole.TEAM_MEMBER}>
      {GuardRoleDisplayNames[GuardRole.TEAM_MEMBER]}
    </Select.Option>
    <Select.Option value={GuardRole.TEAM_LEADER}>
      {GuardRoleDisplayNames[GuardRole.TEAM_LEADER]}
    </Select.Option>
  </Select>
);
```

## 数据库变更

### 表结构变更
- 表名: `security_guard`
- 新增字段: `role` (ENUM类型)
- 可选值: 'TEAM_MEMBER', 'TEAM_LEADER'
- 默认值: 'TEAM_MEMBER'

### 迁移说明
系统已自动为现有保安数据设置默认角色为 `TEAM_MEMBER`。

## 注意事项

1. **向后兼容**: 所有现有API保持向后兼容，`role` 字段为新增字段
2. **默认值**: 创建保安时如不指定角色，默认为 `TEAM_MEMBER`
3. **枚举值**: 前端应使用枚举常量而非硬编码字符串
4. **显示名称**: 统一使用 `GuardRoleDisplayNames` 映射显示中文名称
5. **权限控制**: 后续可基于角色实现不同的权限控制逻辑

## 测试建议

### 功能测试
1. 验证保安列表正确显示角色信息
2. 测试创建保安时角色选择功能
3. 测试更新保安角色功能
4. 验证角色筛选功能
5. 测试角色的默认值设置

### 边界测试
1. 测试无角色字段的旧数据兼容性
2. 验证非法角色值的处理
3. 测试角色更新的权限控制

## 联系支持

如在集成过程中遇到问题，请联系后端开发团队获取支持。