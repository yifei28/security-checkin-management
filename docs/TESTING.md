# 测试指南

这个文档说明如何运行项目的各种测试，确保在GitHub push之前功能正常。

## 快速开始

### 在推送前运行完整检查
```bash
npm run pre-push
```

### 或者使用脚本
```bash
./scripts/pre-push-check.sh
```

## 可用的测试命令

### 核心测试命令

```bash
# 运行所有测试
npm test

# 运行CI综合测试（推荐用于push前检查）
npm run test:ci

# 运行核心TypeScript修复验证
npm run test:core

# 带界面运行测试（调试用）
npm run test:headed

# 交互式测试界面
npm run test:ui
```

### 开发命令

```bash
# 代码检查
npm run lint

# TypeScript编译和构建
npm run build

# 启动开发服务器
npm run dev
```

## 测试套件说明

### 1. CI综合测试 (`ci-comprehensive.spec.ts`)

这是主要的CI/CD测试套件，包含：

- **🔧 构建和TypeScript验证**: 确保应用无编译错误
- **🔐 认证和授权**: 登录、退出、权限检查
- **🧭 导航和路由**: 页面间导航、路由保护
- **📊 API响应处理**: 数据加载、错误处理
- **⚠️ 错误处理**: 网络错误、表单验证
- **💾 数据持久化**: 认证状态保存
- **🎯 核心功能**: 保安管理、站点管理、签到记录
- **🚀 性能和稳定性**: 加载时间、快速切换
- **🔍 系统健康检查**: 整体功能验证

### 2. 核心TypeScript修复验证 (`typescript-fixes-core-validation.spec.ts`)

专门验证TypeScript修复，包含：

- 登录和用户数据处理（修复的日期类型）
- API错误处理（无类型错误）
- 页面导航（无类型错误）
- 状态持久化（页面重新加载）
- 控制台错误检查

## 在CI/CD中使用

### GitHub Actions

项目包含 `.github/workflows/ci.yml` 配置，会在以下情况自动运行：

- 推送到 `main` 或 `develop` 分支
- 创建到 `main` 分支的 Pull Request

CI流程包括：
1. 安装依赖
2. ESLint检查
3. TypeScript编译和构建
4. 安装Playwright浏览器
5. 运行综合测试
6. 上传测试报告

### 本地Pre-push检查

推荐在每次推送前运行：

```bash
npm run pre-push
```

这个命令会依次运行：
1. ESLint代码检查
2. TypeScript编译和构建
3. CI综合测试

## 测试配置

### 测试凭据

测试使用以下凭据（确保后端有对应的测试用户）：

```javascript
const TEST_CREDENTIALS = {
  username: 'admin',
  password: '11235813'
};
```

### 后端要求

测试需要后端API服务运行在 `http://localhost:8080`，包含：

- `/api/login` - 登录接口
- `/api/guards` - 保安管理接口
- `/api/sites` - 站点管理接口
- `/api/checkin` - 签到记录接口

### 环境要求

- Node.js 20+
- 后端API服务正在运行
- 测试用户存在于数据库中

## 故障排除

### 常见问题

1. **测试失败：无法连接到后端**
   ```bash
   # 检查后端是否运行
   curl http://localhost:8080/api/login
   ```

2. **认证失败**
   - 确保测试凭据在后端数据库中存在
   - 检查用户名/密码是否正确

3. **TypeScript编译错误**
   ```bash
   # 单独检查TypeScript
   npx tsc -b
   ```

4. **Playwright浏览器未安装**
   ```bash
   npx playwright install
   ```

### 调试测试

```bash
# 以头模式运行（看到浏览器）
npm run test:headed

# 使用交互式UI
npm run test:ui

# 运行特定测试文件
npx playwright test tests/ci-comprehensive.spec.ts

# 查看测试报告
npx playwright show-report
```

## 最佳实践

### 推送前检查清单

- [ ] 运行 `npm run lint` 检查代码质量
- [ ] 运行 `npm run build` 确保构建成功
- [ ] 运行 `npm run test:ci` 验证功能
- [ ] 检查所有测试通过
- [ ] 查看测试报告确认无误

### 开发工作流

1. **开发功能**
   ```bash
   npm run dev
   ```

2. **代码检查**
   ```bash
   npm run lint
   ```

3. **构建测试**
   ```bash
   npm run build
   ```

4. **功能测试**
   ```bash
   npm run test:ci
   ```

5. **推送代码**
   ```bash
   git push origin main
   ```

### 持续集成

- 所有push都会触发GitHub Actions CI
- PR需要通过所有测试才能合并
- 测试报告会作为artifact保存30天
- 失败的测试会阻止部署

## 更新测试

当添加新功能时，请更新相应的测试：

1. **新页面**: 在 `ci-comprehensive.spec.ts` 中添加导航测试
2. **新API**: 添加API响应处理测试
3. **新组件**: 添加组件交互测试
4. **TypeScript更改**: 更新类型验证测试

---

有问题请查看测试报告或咨询开发团队。