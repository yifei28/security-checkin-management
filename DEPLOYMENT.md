# 🚀 前端部署指南

## 📦 部署方式

### 🔧 本地部署测试
```bash
# 基本部署（使用当前代码）
./deploy.sh

# 更新代码并部署
./deploy.sh --update

# 更新代码、部署并清理镜像
./deploy.sh --update --clean

# 查看帮助
./deploy.sh --help
```

### 🌐 生产环境自动部署
推送到main分支会触发自动部署：
```bash
git add .
git commit -m "feat: 更新功能"
git push origin main
```

## 📋 部署流程

### 🎯 CI阶段（测试和构建）
1. **环境设置**: Node.js 20 + npm缓存
2. **代码检查**: ESLint代码质量检查
3. **构建验证**: TypeScript编译 + Vite构建
4. **功能测试**: Playwright基本功能测试
5. **Docker构建**: 验证容器化构建

### 🚀 CD阶段（自动部署）
1. **SSH连接服务器**
2. **更新代码**: 自动拉取最新代码
3. **执行部署脚本**: `./deploy.sh --update --clean`
4. **健康检查**: 验证服务状态

## 🔧 deploy.sh 功能说明

### 主要功能
- ✅ **环境检查**: 验证Docker和Docker Compose
- ✅ **代码更新**: Git拉取最新代码（可选）
- ✅ **容器管理**: 停止旧容器，启动新容器
- ✅ **健康检查**: 验证服务启动状态
- ✅ **状态展示**: 显示部署结果和有用命令

### 参数选项
- `--update`: 从git仓库更新代码
- `--clean`: 清理Docker悬空镜像
- `--help`: 显示帮助信息

### 健康检查端点
脚本会检查以下端点：
- `http://localhost:3000/` - 主页面
- `http://localhost:3000/health` - 健康检查端点

## 🏗️ 架构说明

### 服务架构
```
用户 → nginx:443 (SSL) → localhost:3000 → Docker容器:80 → React应用
     (服务器配置)        (端口映射)       (nginx.conf)
```

### 文件结构
```
checkin-frontend/
├── docker-compose.yml    # 容器编排
├── Dockerfile            # 多阶段构建
├── nginx.conf           # 容器内nginx配置
├── deploy.sh            # 部署脚本
└── .github/workflows/   # CI/CD配置
    └── deploy.yml
```

## 📊 监控和维护

### 常用命令
```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 重新构建并启动
docker-compose up -d --build
```

### 故障排查
```bash
# 查看容器日志
docker-compose logs checkin-frontend

# 进入容器检查
docker-compose exec checkin-frontend sh

# 检查nginx配置
docker-compose exec checkin-frontend nginx -t

# 重新加载nginx配置
docker-compose exec checkin-frontend nginx -s reload
```

## 🔒 安全配置

### GitHub Secrets 配置
在仓库 Settings > Secrets and variables > Actions 中设置：
```
SERVER_HOST     = 服务器IP地址
SERVER_USER     = 服务器用户名 (如: ubuntu)
SERVER_SSH_KEY  = SSH私钥内容
SERVER_PORT     = SSH端口 (默认: 22)
```

### 服务器要求
- ✅ Docker 和 Docker Compose 已安装
- ✅ SSH密钥认证配置
- ✅ Git已安装
- ✅ nginx服务器配置（SSL终端）

## 🎯 部署检查清单

### 部署前检查
- [ ] 代码已推送到仓库
- [ ] GitHub Secrets已配置
- [ ] 服务器Docker环境正常
- [ ] nginx配置正确

### 部署后验证
- [ ] 容器状态正常 (`docker-compose ps`)
- [ ] 应用可访问 (`curl http://localhost:3000`)
- [ ] 生产域名正常 (`https://duhaosecurity.com`)
- [ ] 日志无错误 (`docker-compose logs`)

## 🔄 回滚策略

如果部署出现问题：
```bash
# 快速回滚到上一个版本
git reset --hard HEAD~1
./deploy.sh

# 或者手动回滚
docker-compose down
git checkout <previous-commit>
./deploy.sh
```

---

**🎉 现在你拥有了完整的自动化部署流程！**