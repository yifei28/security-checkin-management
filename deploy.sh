#!/bin/bash
set -e

echo "🚀 Starting Frontend Deployment..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="$(pwd)"
CONTAINER_NAME="checkin-frontend"
IMAGE_NAME="checkin-frontend:latest"

# 日志函数
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查必要的工具
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed!"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed!"
        exit 1
    fi

    log_success "All requirements satisfied"
}

# Git拉取重试函数
pull_code_with_retry() {
    local max_attempts=10
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        log_warning "🔄 Git pull attempt $attempt/$max_attempts..."

        # 尝试正常拉取
        if timeout 60 git pull origin main --no-edit; then
            log_success "✅ Code pulled successfully"
            return 0
        else
            log_error "❌ Pull attempt $attempt failed"

            attempt=$((attempt + 1))
            if [ $attempt -le $max_attempts ]; then
                log_warning "⏳ Waiting 10 seconds before retry..."
                sleep 10
            fi
        fi
    done

    log_error "💥 All $max_attempts git pull attempts failed"
    return 1
}

# 更新代码（如果在服务器上）
update_code() {
    if [ "$1" == "--update" ]; then
        log_info "Updating code from repository..."

        # 配置Git安全目录（避免权限问题）
        git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

        # 执行Git操作
        if pull_code_with_retry; then
            log_success "✅ Code update completed"
        else
            log_error "💥 Git update failed after 10 attempts"
            log_error "🚫 Deployment aborted"
            exit 1
        fi
    else
        log_info "Skipping code update (use --update flag to update from git)"
    fi
}

# 停止并清理旧容器
cleanup_old_deployment() {
    log_info "Cleaning up old deployment..."

    # 停止并删除旧容器
    if docker-compose ps | grep -q "$CONTAINER_NAME"; then
        log_info "Stopping existing containers..."
        docker-compose down
        log_success "Old containers stopped"
    else
        log_info "No existing containers found"
    fi

    # 清理悬空镜像（可选）
    if [ "$1" == "--clean" ]; then
        log_info "Cleaning up dangling images..."
        docker image prune -f
        log_success "Dangling images cleaned"
    fi
}

# 构建和启动新部署
deploy_new_version() {
    log_info "Building and deploying new version..."

    # 构建并启动容器
    if docker-compose up -d --build; then
        log_success "Containers built and started successfully"
    else
        log_error "Failed to build and start containers"
        exit 1
    fi
}

# 等待服务启动
wait_for_service() {
    log_info "Waiting for service to start..."

    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "Up"; then
            log_success "Service is starting... (attempt $attempt/$max_attempts)"
            break
        fi

        log_info "Waiting for containers to start... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    if [ $attempt -gt $max_attempts ]; then
        log_error "Service failed to start within expected time"
        docker-compose logs
        exit 1
    fi

    # 额外等待服务完全准备好
    log_info "Waiting additional 15 seconds for service to be ready..."
    sleep 15
}

# 健康检查
health_check() {
    log_info "Performing health check..."

    # 检查容器状态
    if ! docker-compose ps | grep -q "Up"; then
        log_error "Containers are not running"
        docker-compose logs
        exit 1
    fi

    # 检查服务响应
    local health_endpoints=(
        "http://localhost:3000/"
        "http://localhost:3000/health"
    )

    local service_healthy=false

    for endpoint in "${health_endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null 2>&1; then
            log_success "Service is healthy at $endpoint"
            service_healthy=true
            break
        else
            log_warning "Health check failed for $endpoint"
        fi
    done

    if [ "$service_healthy" = false ]; then
        log_error "All health checks failed"
        log_info "Container logs:"
        docker-compose logs --tail=50
        exit 1
    fi
}

# 显示部署状态
show_deployment_status() {
    log_info "Deployment Status:"
    echo ""

    # 显示容器状态
    log_info "Container Status:"
    docker-compose ps
    echo ""

    # 显示端口映射
    log_info "Service URLs:"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🌐 Production: https://duhaosecurity.com"
    echo ""

    # 显示有用的命令
    log_info "Useful Commands:"
    echo "📊 View logs: docker-compose logs -f"
    echo "🔄 Restart: docker-compose restart"
    echo "🛑 Stop: docker-compose down"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "Frontend Deployment Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --update    Update code from git repository before deployment"
    echo "  --clean     Clean up dangling Docker images after deployment"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Deploy current code"
    echo "  $0 --update          # Update code and deploy"
    echo "  $0 --update --clean  # Update code, deploy, and clean up images"
}

# 主函数
main() {
    # 解析参数
    local update_code_flag=false
    local clean_images_flag=false

    for arg in "$@"; do
        case $arg in
            --update)
                update_code_flag=true
                ;;
            --clean)
                clean_images_flag=true
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $arg"
                show_help
                exit 1
                ;;
        esac
    done

    # 执行部署步骤
    log_info "Starting deployment process..."
    echo ""

    check_requirements

    if [ "$update_code_flag" = true ]; then
        update_code --update
    else
        update_code
    fi

    if [ "$clean_images_flag" = true ]; then
        cleanup_old_deployment --clean
    else
        cleanup_old_deployment
    fi

    deploy_new_version
    wait_for_service
    health_check

    echo ""
    log_success "🎉 Frontend deployment completed successfully!"
    echo ""

    show_deployment_status
}

# 错误处理
trap 'log_error "Deployment failed! Check the logs above for details."; exit 1' ERR

# 执行主函数
main "$@"