# API 更新说明 (2025-12-31)

## 概述

本次更新重构了员工数据模型，`SecurityGuard`（保安）现在继承自 `Employee`（员工）抽象类，为未来支持其他员工类型打卡做准备。

---

## 实体结构

### Employee（员工抽象父类）

所有员工类型的基类，包含通用字段。

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| `id` | Long | 主键 | 自增 |
| `name` | String | 姓名 | |
| `employeeId` | String | 员工编号 | 唯一，自动生成（格式：YYYYMMDD-7位序号-6位随机） |
| `openId` | String | 微信 OpenID | 唯一 |
| `phoneNumber` | String | 手机号 | 唯一 |
| `birthDate` | LocalDate | 出生日期 | |
| `age` | Integer | 年龄 | **只读，根据 birthDate 自动计算** |
| `idCardNumber` | String | 身份证号 | 唯一，18位 |
| `gender` | Gender | 性别 | 枚举：MALE / FEMALE |
| `employmentStatus` | EmploymentStatus | 在职状态 | 枚举，默认 ACTIVE |
| `originalHireDate` | LocalDate | 首次入职日期 | 不变，用于计算总工龄 |
| `latestHireDate` | LocalDate | 最近入职日期 | 返聘时更新 |
| `resignDate` | LocalDate | 离职日期 | |

### SecurityGuard（保安，继承 Employee）

保安员实体，包含保安特有字段。

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| *继承 Employee 所有字段* | | | |
| `site` | WorkSite | 工作地点 | 外键关联 |
| `role` | GuardRole | 角色 | 枚举：TEAM_LEADER（队长）/ TEAM_MEMBER（队员） |
| `height` | Integer | 身高（cm） | |

### 继承关系图

```
Employee (抽象父类，表名：employee)
    │
    └── SecurityGuard (子类，employee_type = 'GUARD')
            ├── site (工作地点)
            ├── role (队长/队员)
            └── height (身高)
```

### 数据库存储

使用 JPA 单表继承策略（`SINGLE_TABLE`），所有员工存储在 `employee` 表中，通过 `employee_type` 列区分类型。

---

## 新增字段

### SecurityGuard / Employee 实体新增以下字段：

| 字段名 | 类型 | 说明 | 示例值 |
|--------|------|------|--------|
| `idCardNumber` | String | 身份证号（18位，唯一） | `"110101199001011234"` |
| `gender` | String (枚举) | 性别 | `"MALE"` 或 `"FEMALE"` |
| `employmentStatus` | String (枚举) | 在职状态 | 见下方枚举值 |
| `originalHireDate` | String (日期) | 首次入职日期 | `"2020-03-15"` |
| `latestHireDate` | String (日期) | 最近入职日期（返聘时更新） | `"2025-01-01"` |
| `resignDate` | String (日期) | 离职日期 | `"2024-12-31"` |
| `birthDate` | String (日期) | 出生日期 | `"1990-05-20"` |
| `age` | Integer | 年龄（**计算字段，只读**） | `34` |

### employmentStatus 枚举值

| 值 | 中文含义 |
|----|----------|
| `ACTIVE` | 在职 |
| `PROBATION` | 试用期 |
| `SUSPENDED` | 停职 |
| `RESIGNED` | 离职 |
| `RETIRED` | 退休 |

### gender 枚举值

| 值 | 中文含义 |
|----|----------|
| `MALE` | 男 |
| `FEMALE` | 女 |

---

## API 变更

### GET /api/guards

返回数据新增上述字段：

```json
{
  "id": 1,
  "name": "张三",
  "employeeId": "20251231-0000001-Ab3xYz",
  "phoneNumber": "13800138000",
  "birthDate": "1990-05-20",
  "age": 34,
  "idCardNumber": "110101199005201234",
  "gender": "MALE",
  "employmentStatus": "ACTIVE",
  "originalHireDate": "2020-03-15",
  "latestHireDate": "2020-03-15",
  "resignDate": null,
  "height": 175,
  "role": "TEAM_MEMBER",
  "site": { ... }
}
```

### PUT /api/guards/{id}

现在支持更新以下字段：

```json
{
  "name": "张三",
  "phoneNumber": "13800138000",
  "birthDate": "1990-05-20",
  "height": 175,
  "role": "TEAM_LEADER",
  "idCardNumber": "110101199005201234",
  "gender": "MALE",
  "employmentStatus": "ACTIVE",
  "originalHireDate": "2020-03-15",
  "latestHireDate": "2025-01-01",
  "resignDate": null,
  "site": { "id": 1 }
}
```

---

## 注意事项

1. **age 字段是只读的**：由后端根据 `birthDate` 自动计算，前端不需要传递

2. **日期格式**：所有日期字段使用 `YYYY-MM-DD` 格式

3. **employmentStatus 默认值**：新建员工默认为 `ACTIVE`

4. **返聘处理**：
   - `originalHireDate`：首次入职日期，不会改变
   - `latestHireDate`：最近入职日期，返聘时更新此字段
   - 可通过两个日期计算总工龄和当前工龄

5. **身份证号唯一**：同一个身份证号不能重复注册

---

## 数据库变更

- 表名从 `security_guard` 改为 `employee`
- 新增 `employee_type` 列（值为 `GUARD`，用于区分员工类型）
- 外键关系保持不变

---

## 前端建议

1. 员工列表页面可新增筛选条件：在职状态、性别
2. 员工详情页面展示新字段
3. 编辑表单添加新字段输入
4. 年龄显示直接使用 `age` 字段，无需前端计算
