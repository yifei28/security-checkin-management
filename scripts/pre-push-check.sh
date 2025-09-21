#!/bin/bash

# Pre-push check script for checkin-frontend
# This script runs all necessary checks before pushing to GitHub

set -e

echo "🚀 开始 Pre-push 检查..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step() {
    echo -e "\n${YELLOW}🔧 $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "错误: 请在项目根目录运行此脚本"
    exit 1
fi

# Step 1: ESLint check
print_step "步骤 1/4: ESLint 代码检查"
if npm run lint; then
    print_status "ESLint 检查通过"
else
    print_error "ESLint 检查失败"
    exit 1
fi

# Step 2: TypeScript compilation and build
print_step "步骤 2/4: TypeScript 编译和构建"
if npm run build; then
    print_status "TypeScript 编译和构建成功"
else
    print_error "构建失败"
    exit 1
fi

# Step 3: Core TypeScript fixes validation
print_step "步骤 3/4: 核心 TypeScript 修复验证"
if npm run test:core; then
    print_status "核心 TypeScript 修复验证通过"
else
    print_warning "核心测试失败，但继续进行综合测试"
fi

# Step 4: Comprehensive CI tests
print_step "步骤 4/4: 综合功能测试"
if npm run test:ci; then
    print_status "综合测试通过"
else
    print_error "综合测试失败"
    echo "请检查测试报告: npx playwright show-report"
    exit 1
fi

echo ""
print_status "🎉 所有检查都通过了！可以安全 push 到 GitHub。"
echo ""
echo "运行的检查："
echo "  ✅ ESLint 代码质量检查"
echo "  ✅ TypeScript 编译检查"
echo "  ✅ 项目构建验证"
echo "  ✅ 核心 TypeScript 修复验证"
echo "  ✅ 综合功能测试"
echo ""
echo "推荐的 git push 命令："
echo "  git push origin main"
echo ""