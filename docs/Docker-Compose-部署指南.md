# Docker Compose 前端部署指南

## 概述

使用Docker Compose管理前端应用的部署，包括：
- **前端应用** (React + Nginx)

后端应用和数据库保持独立运行，互不干扰。

## 文件结构

```
checkin-frontend/
├── docker-compose.yml              # 前端Docker Compose配置
├── Dockerfile                      # 前端镜像构建文件
├── nginx.conf                     # Nginx配置
└── Docker-Compose-部署指南.md      # 本文档
```

## 快速部署

### 1. 停止当前前端容器

```bash
# 确保在项目根目录
cd /path/to/checkin-frontend

# 停止当前运行的前端容器（如果有）
sudo docker stop checkin-frontend 2>/dev/null || true
sudo docker rm checkin-frontend 2>/dev/null || true
```

### 2. 使用Docker Compose部署前端

```bash
# 构建并启动前端服务
sudo docker-compose up -d

# 查看服务状态
sudo docker-compose ps

# 查看前端日志
sudo docker-compose logs -f frontend
```

## 服务管理命令

### 启动/停止服务

```bash
# 启动所有服务
sudo docker-compose -f docker-compose.production.yml --env-file .env.production up -d

# 停止所有服务
sudo docker-compose -f docker-compose.production.yml down

# 停止并删除数据卷（注意：会删除数据库数据）
sudo docker-compose -f docker-compose.production.yml down -v
```

### 单独管理服务

```bash
# 只启动数据库
sudo docker-compose -f docker-compose.production.yml --env-file .env.production up -d database

# 重启后端服务
sudo docker-compose -f docker-compose.production.yml restart backend

# 查看前端日志
sudo docker-compose -f docker-compose.production.yml logs -f frontend
```

### 更新服务

```bash
# 更新前端（重新构建）
sudo docker-compose -f docker-compose.production.yml build frontend
sudo docker-compose -f docker-compose.production.yml up -d frontend

# 更新后端（需要新的后端镜像）
sudo docker-compose -f docker-compose.production.yml pull backend
sudo docker-compose -f docker-compose.production.yml up -d backend
```

## 网络架构

```
Internet → Nginx (Host:80/443)
             ├→ / → Frontend Container (Port 3000)
             └→ /api → Backend Container (Port 8080)
                        └→ MySQL Container (Internal:3306)
                        └→ Redis Container (Internal:6379)
```

### 端口映射

- **前端**：`3000:80` - 主机3000端口映射到容器80端口
- **后端**：`8080:8080` - 主机8080端口映射到容器8080端口
- **MySQL**：`3306:3306` - 主机3306端口映射到容器3306端口
- **Redis**：`6379:6379` - 主机6379端口映射到容器6379端口

## 数据持久化

### 数据卷

Docker Compose会自动创建以下数据卷：

```bash
# 查看数据卷
sudo docker volume ls | grep checkin

# 数据卷位置
mysql-data     # MySQL数据文件
mysql-logs     # MySQL日志文件
```

### 数据备份

```bash
# 备份MySQL数据
sudo docker-compose -f docker-compose.production.yml exec database mysqldump -u root -p checkin_db > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复MySQL数据
sudo docker-compose -f docker-compose.production.yml exec -T database mysql -u root -p checkin_db < backup_file.sql
```

## 监控和维护

### 健康检查

所有服务都配置了健康检查：

```bash
# 查看服务健康状态
sudo docker-compose -f docker-compose.production.yml ps

# 查看详细健康状态
sudo docker inspect checkin-frontend --format='{{.State.Health.Status}}'
sudo docker inspect checkin-backend --format='{{.State.Health.Status}}'
sudo docker inspect checkin-database --format='{{.State.Health.Status}}'
```

### 日志管理

```bash
# 查看所有服务日志
sudo docker-compose -f docker-compose.production.yml logs

# 实时查看特定服务日志
sudo docker-compose -f docker-compose.production.yml logs -f backend

# 清理日志（重新创建容器）
sudo docker-compose -f docker-compose.production.yml up -d --force-recreate
```

### 资源监控

```bash
# 查看容器资源使用情况
sudo docker stats $(sudo docker-compose -f docker-compose.production.yml ps -q)

# 查看网络情况
sudo docker network ls | grep checkin
sudo docker network inspect checkin-frontend_checkin-network
```

## 故障排查

### 常见问题

1. **服务无法启动**
```bash
# 查看详细错误信息
sudo docker-compose -f docker-compose.production.yml logs service_name

# 检查端口占用
sudo netstat -tlnp | grep -E ':(3000|8080|3306|6379)'
```

2. **数据库连接失败**
```bash
# 检查数据库容器状态
sudo docker-compose -f docker-compose.production.yml exec database mysql -u root -p

# 检查网络连接
sudo docker-compose -f docker-compose.production.yml exec backend ping database
```

3. **前端无法访问后端API**
```bash
# 测试API连接
sudo docker-compose -f docker-compose.production.yml exec frontend wget -O- http://backend:8080/health

# 检查Nginx配置
sudo docker-compose -f docker-compose.production.yml exec frontend nginx -t
```

### 重置环境

```bash
# 完全重置（删除所有数据）
sudo docker-compose -f docker-compose.production.yml down -v
sudo docker system prune -f
sudo docker volume prune -f

# 重新部署
sudo docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

## 性能优化

### 资源限制

可以在docker-compose.production.yml中添加资源限制：

```yaml
services:
  backend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 缓存优化

```bash
# 启用Docker构建缓存
sudo docker-compose -f docker-compose.production.yml build --no-cache frontend

# 清理无用镜像
sudo docker image prune -f
```

## 安全建议

1. **更改默认密码**：修改.env.production中的所有密码
2. **网络隔离**：生产环境中移除不必要的端口映射
3. **定期备份**：设置定期数据备份计划
4. **更新镜像**：定期更新基础镜像和应用镜像
5. **日志审计**：定期检查应用和安全日志

## 生产环境部署检查清单

- [ ] 修改.env.production中的默认密码
- [ ] 确认Nginx SSL证书配置
- [ ] 设置定期数据备份
- [ ] 配置监控和告警
- [ ] 测试灾难恢复流程
- [ ] 检查防火墙和安全组配置
- [ ] 验证所有健康检查正常工作

完成Docker Compose部署后，你的完整系统将通过 `https://duhaosecurity.com` 提供服务！