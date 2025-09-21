# Push前功能检查指南

## 快速检查

### 推荐命令（推送前使用）
```bash
npm run test-push
```

这个命令会运行：
1. ✅ **TypeScript编译检查** (`tsc -b`)
2. ✅ **项目构建** (`vite build`)
3. ✅ **综合功能测试** (7个核心测试)

### 完整检查（包含代码质量）
```bash
npm run pre-push
```

这个命令会运行：
1. 🔍 **ESLint代码检查**
2. ✅ **TypeScript编译检查**
3. ✅ **项目构建**
4. ✅ **综合功能测试**

## 测试内容

### 🔐 认证功能
- ✅ 登录功能正常
- ✅ 无TypeScript运行时错误

### 🧭 路由导航
- ✅ 所有主要页面可访问
  - `/admin` - 管理后台首页
  - `/admin/guards` - 保安管理
  - `/admin/sites` - 站点管理
  - `/admin/checkins` - 签到记录
- ✅ 页面导航无TypeScript错误

### 💾 状态持久化
- ✅ 页面刷新保持登录状态
- ✅ 认证状态正确存储

### ⚡ 性能检查
- ✅ 应用在8秒内加载完成
- ✅ 加载性能正常

### 🎯 核心页面功能
- ✅ 每个管理页面基本功能正常
- ✅ 页面结构完整
- ✅ 无关键错误

### 🔍 系统完整性
- ✅ 完整用户流程测试
- ✅ **无TypeScript相关错误**
- ✅ 应用可安全推送到GitHub

## 测试结果示例

```
✅ 登录功能正常，无TypeScript错误
✅ 应用加载时间: 479ms
✅ 状态持久化正常，无TypeScript错误
✅ 应用启动正常，构建无TypeScript错误
✅ 完整用户流程测试通过
✅ 系统完整性检查通过 - 应用可以安全push到GitHub
✅ 所有页面导航正常，无TypeScript错误
✅ 所有管理页面基本功能正常，无TypeScript错误

7 passed (8.6s)
```

## 使用方法

### 1. 开发完成后
```bash
# 快速功能检查
npm run test-push
```

### 2. 重要功能完成后
```bash
# 完整代码质量检查
npm run pre-push
```

### 3. 如果有问题
```bash
# 查看详细测试报告
npx playwright show-report

# 运行带界面的测试（调试用）
npm run test:headed

# 交互式测试界面
npm run test:ui
```

## 失败处理

### 如果TypeScript编译失败
```bash
# 单独检查TypeScript错误
npx tsc -b
```

### 如果构建失败
```bash
# 单独运行构建
npm run build
```

### 如果测试失败
```bash
# 查看测试报告
npx playwright show-report

# 确保后端API运行在8080端口
curl http://localhost:8080/api/login

# 确保开发服务器正常
npm run dev
```

## 后端要求

测试需要后端API正常运行：
- **端口**: `http://localhost:8080`
- **测试用户**: `admin` / `11235813`
- **必需接口**:
  - `POST /api/login`
  - `GET /api/guards`
  - `GET /api/sites`
  - `GET /api/checkin`

## 测试文件

- **主要测试**: `tests/pre-push-check.spec.ts`
- **TypeScript修复验证**: `tests/typescript-fixes-core-validation.spec.ts`
- **更全面的测试**: `tests/ci-comprehensive.spec.ts`

## 总结

这个测试套件确保：
1. ✅ **TypeScript类型安全** - 无编译和运行时错误
2. ✅ **核心功能正常** - 登录、导航、页面加载
3. ✅ **构建成功** - 可以部署
4. ✅ **性能良好** - 加载时间合理
5. ✅ **状态管理** - 认证状态正确

**推荐使用 `npm run test-push` 进行快速检查！**