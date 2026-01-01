# 安保签到小程序 - API调用文档

## 基础信息

**服务器地址**: `http://your-server:8080`  
**Content-Type**: `application/json; charset=UTF-8`  
**认证方式**: JWT Token (在请求头中携带)

---

## 快速开始指南 🚀

### 开发流程概览
1. **用户登录** → 获取`employeeId`和`token`
2. **保存用户信息** → 本地缓存`userInfo`对象
3. **签到操作** → 使用`employeeId`进行签到
4. **查询记录** → 使用`employeeId`查询，直接显示返回的姓名和站点名称

### 必须保存的关键字段
从登录响应中必须保存以下字段：
- `token`: JWT认证令牌（所有API请求都需要）
- `userInfo.employeeId`: 员工编号（签到和查询记录时使用）
- `userInfo.name`: 保安姓名（界面显示）
- `userInfo.department`: 工作站点名称（界面显示）

---

## 1. 微信小程序登录相关 API

### 1.1 小程序登录 (首次登录)
**接口**: `POST /api/wechat-login`  
**说明**: 保安首次使用小程序时进行登录，需要手机号授权

**请求体**:
```json
{
  "phoneCode": "从wx.getPhoneNumber获取的code",
  "loginCode": "从wx.login获取的code",
  "encryptedData": "加密数据(可选)",
  "iv": "加密向量(可选)"
}
```

**成功响应**:
```json
{
  "success": true,
  "token": "JWT_TOKEN_STRING",
  "userInfo": {
    "openid": "wx_openid_001",
    "name": "张三",
    "employeeId": "20250809-0000017-tiKUHu",  // 重要：保存此字段用于后续API调用
    "phone": "13800138001",
    "department": "办公大楼A座"
  },
  "message": "登录成功",
  "expiresIn": 7200  // Token有效期2小时（秒）
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "手机号未注册，请联系管理员",
  "error_code": "PHONE_NOT_REGISTERED"
}
```

### 1.2 小程序启动检查 (静默登录)
**接口**: `POST /api/wechat-launch`  
**说明**: 小程序启动时检查用户登录状态，无需用户操作

**请求体**:
```json
{
  "loginCode": "从wx.login获取的code"
}
```

**成功响应**: 
- 已绑定用户：返回格式与登录接口相同
- 未绑定用户：
```json
{
  "success": false,
  "message": "用户未绑定手机号",
  "error_code": "NOT_BOUND"
}
```

### 1.3 Token刷新
**接口**: `POST /api/wechat-refresh-token`  
**说明**: 刷新即将过期的JWT Token  
**请求头**: `Authorization: Bearer {当前token}`

**请求体**: 无需请求体

**成功响应**: 与登录接口相同，返回新的token和用户信息

---

## 2. 签到功能 API

### 2.1 签到验证 (预检查)
**接口**: `POST /api/checkin/validate`
**说明**: 在正式签到前验证是否满足签到条件  
**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "employeeId": "20250809-0000017-tiKUHu",
  "latitude": 39.9088,
  "longitude": 116.3974,
  "faceImageUrl": "人脸图片URL (可选)"
}
```
**注意**: employeeId必须使用登录响应中的userInfo.employeeId

**成功响应**:
```json
{
  "success": true,
  "message": "验证通过，可以签到"
}
```

**失败响应示例**:
```json
{
  "success": false,
  "message": "签到位置超出允许范围（实际距离：850米）"
}
```
其他可能的失败原因：
- "没有找到保安信息，请联系管理员"
- "尚未分配工作单位，无法签到"
- "位置不准确，请检查定位"
- "当前时间不在签到时间段内"
- "您今天已经成功签到了"

### 2.2 正式签到
**接口**: `POST /api/checkin`  
**说明**: 执行实际签到操作  
**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{
  "employeeId": "20250809-0000017-tiKUHu",
  "latitude": 39.9088, 
  "longitude": 116.3974,
  "faceImageUrl": "https://example.com/face.jpg (可选)"
}
```

**成功响应**:
```json
{
  "success": true,
  "message": "签到成功"
}
```

**失败响应**: 与签到验证接口相同

---

## 3. 数据查询 API

### 3.1 获取我的签到记录（小程序专用）
**接口**: `GET /api/checkin/my-records`  
**说明**: 分页获取特定保安的签到记录  
**请求头**: `Authorization: Bearer {token}`

**查询参数**:
- `employeeId`: 员工编号（必填，从登录响应获取）
- `page`: 页码，默认1
- `pageSize`: 每页条数，默认20
- `sortBy`: 排序字段，默认timestamp
- `sortOrder`: 排序方向，asc或desc，默认desc

**示例**: `GET /api/checkin/my-records?employeeId=20250809-0000017-tiKUHu&page=1&pageSize=10`

**响应** (**重要变更：guardId和siteId现在返回名称而不是ID**):
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_4",
      "guardId": "张三",
      "siteId": "办公大楼A座", 
      "timestamp": "2025-08-09T15:55:03Z",
      "location": {
        "lat": 39.9088,
        "lng": 116.3974
      },
      "faceImageUrl": "https://example.com/faces/zhang_success.jpg",
      "status": "success",
      "reason": null
    },
    {
      "id": "checkin_9",
      "guardId": "张三",
      "siteId": "办公大楼A座",
      "timestamp": "2025-08-09T11:55:03Z",
      "location": {
        "lat": 39.9088,
        "lng": 116.3974
      },
      "faceImageUrl": "https://example.com/faces/zhang_pending.jpg",
      "status": "pending",
      "reason": "人脸识别中，请稍候"
    }
  ],
  "pagination": {
    "total": 7,
    "page": 1,
    "pageSize": 10,
    "totalPages": 1
  }
}
```

**注意事项**:
- `guardId` 字段返回保安姓名（如："张三"），而不是数据库ID
- `siteId` 字段返回站点名称（如："办公大楼A座"），而不是数据库ID
- `status` 可能的值: "success"(成功), "failed"(失败), "pending"(待处理)
- `reason` 仅在签到失败或待处理时有值，成功时为null

### 3.2 获取所有签到记录（管理端）
**接口**: `GET /api/checkin`  
**说明**: 分页获取所有签到记录（需要管理员权限）  
**请求头**: `Authorization: Bearer {token}`

**查询参数**:
- `page`: 页码，默认1
- `pageSize`: 每页条数，默认50
- `sortBy`: 排序字段，默认timestamp
- `sortOrder`: 排序方向，asc或desc，默认desc

**示例**: `GET /api/checkin?page=1&pageSize=20&sortBy=timestamp&sortOrder=desc`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "checkin_1",
      "guardId": "guard_1",
      "siteId": "site_1", 
      "timestamp": "2025-01-08T09:30:00Z",
      "location": {
        "lat": 39.9088,
        "lng": 116.3974
      },
      "faceImageUrl": "https://example.com/face.jpg",
      "status": "SUCCESS",  // SUCCESS, FAILED, PENDING
      "reason": null  // 失败原因，成功时为null
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```

### 3.3 获取保安列表（管理端）
**接口**: `GET /api/guards`  
**说明**: 获取所有保安信息  
**请求头**: `Authorization: Bearer {token}`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "guard_1",
      "name": "张三",
      "phone": "13800138000",
      "employeeId": "20250108-1234567-ABC123",
      "site": {
        "id": "site_1",
        "name": "办公大楼A座"
      },
      "active": true,
      "createdAt": "2025-01-08T12:00:00Z"
    }
  ]
}
```

### 3.4 获取工作站点列表（管理端）
**接口**: `GET /api/sites`  
**说明**: 获取所有工作站点信息  
**请求头**: `Authorization: Bearer {token}`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "site_1", 
      "name": "办公大楼A座",
      "latitude": 39.9088,
      "longitude": 116.3974,
      "allowedRadiusMeters": 100.0,
      "assignedGuardIds": ["guard_1", "guard_2"],
      "active": true,
      "createdAt": "2025-01-08T12:00:00Z"
    }
  ]
}
```

---

## 4. 人脸识别 API

### 4.1 人脸识别验证
**接口**: `POST /api/face_recognition`  
**说明**: 用于签到时进行人脸识别验证，支持活体检测和人脸比对  
**请求头**: `Authorization: Bearer {token}`  
**Content-Type**: `multipart/form-data`

**请求参数**:
- `faceImage`: 人脸图片文件 (form-data上传，支持jpg/png格式)
- `employeeId`: 员工编号（必填，从登录响应获取）

**curl示例**:
```bash
curl -X POST http://your-server:8080/api/face_recognition \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "faceImage=@/path/to/face.jpg" \
  -F "employeeId=20250809-0000017-tiKUHu"
```

**成功响应**:
```json
{
  "success": true,
  "message": "识别通过"
}
```

**失败响应**:
```json
{
  "success": false,
  "message": "活体或人脸识别未通过"
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "识别服务异常"
}
```

### 4.2 使用说明

**集成流程**:
1. 用户点击签到时，先调用微信小程序的摄像头功能
2. 引导用户进行人脸识别（建议包含眨眼、张嘴等活体检测动作）
3. 将拍摄的照片上传至 `/api/face_recognition` 进行验证
4. 验证通过后，再调用 `/api/checkin` 进行签到（可将图片URL包含在请求中）

**技术要求**:
- 图片格式: JPG, PNG
- 图片大小: 建议500KB以内
- 分辨率: 建议640x480以上
- 人脸清晰度: 人脸区域占图片20%以上

**错误处理**:
- 网络超时: 建议设置30秒超时
- 服务异常: 可以允许跳过人脸识别直接签到（根据业务需求）
- 识别失败: 提示用户重新拍照或调整光线

**外部服务依赖**:
- 人脸识别服务地址: `http://localhost:8000/recognize`
- 该服务需要单独部署Python人脸识别服务
- 服务支持活体检测和人脸特征比对

---

## 5. 签到业务规则

### 5.1 签到时间限制
- **上午班**: 8:00 - 11:00
- **下午班**: 13:00 - 15:00
- 超出时间范围将签到失败

### 5.2 位置验证
- 签到位置与分配站点的距离必须在允许范围内
- 每个站点都有各自的`allowedRadiusMeters`设置
- 使用Haversine公式计算GPS距离

### 5.3 重复签到检查
- 每个保安每天只能成功签到一次
- 允许多次尝试签到，但只记录一次成功记录
- 失败的签到尝试也会被记录

### 5.4 签到状态说明
- `SUCCESS`: 签到成功
- `FAILED`: 签到失败 (距离超出、时间不对等)
- `PENDING`: 等待处理 (人脸识别中等)

---

## 6. 错误处理

### 6.1 HTTP状态码
- `200`: 请求成功
- `400`: 请求参数错误
- `401`: 未授权 (Token无效或过期)
- `500`: 服务器内部错误

### 6.2 常见错误信息
- `"没有找到保安信息，请联系管理员"`: 保安账号不存在
- `"尚未分配工作单位，无法签到"`: 保安未分配工作站点
- `"位置不准确，请检查定位"`: GPS坐标缺失
- `"签到位置超出允许范围（实际距离：XXX米）"`: 位置验证失败
- `"当前时间不在签到时间段内"`: 时间限制
- `"您今天已经成功签到了"`: 重复签到

---

## 7. 开发注意事项

### 7.1 关键参数说明 ⚠️ 重要
- **employeeId**: 从微信登录成功响应的`userInfo.employeeId`字段获取，格式如：`20250809-0000017-tiKUHu`
- **用户信息**: 登录后必须将完整的`userInfo`对象存储在本地缓存
- **签到记录返回格式变更**: 
  - `guardId`字段现在返回**保安姓名**（如："张三"），而不是数据库ID
  - `siteId`字段现在返回**站点名称**（如："办公大楼A座"），而不是数据库ID
  - 前端可以直接显示这些名称，无需额外查询

### 7.2 Token管理
- JWT Token有效期为2小时
- 建议在Token过期前30分钟主动刷新
- 存储Token时注意安全性

### 7.3 签到流程建议
- **第一步**: 获取用户当前位置 (GPS)
- **第二步**: 调用`/api/checkin/validate`进行预检查，给用户即时反馈
- **第三步**: 如果需要人脸识别，调用摄像头拍照并上传至`/api/face_recognition`验证
- **第四步**: 如果验证通过，再调用`/api/checkin`进行正式签到
- **第五步**: 根据响应结果显示签到成功或失败信息

### 7.4 位置权限
- 确保获取高精度GPS坐标
- 建议在签到前提示用户开启定位权限
- 处理定位失败的异常情况

### 7.5 网络请求
- 所有接口都需要设置超时时间
- 处理网络异常和服务器错误
- 实现合适的重试机制

### 7.6 用户体验
- 签到验证可以在用户点击签到前执行，提供即时反馈
- 显示具体的错误原因，帮助用户理解问题
- 考虑离线缓存机制，网络恢复后同步