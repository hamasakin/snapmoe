#!/bin/bash

# 项目初始化脚本
# 使用方法: ./setup.sh

echo "🔧 开始初始化项目..."

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到 Node.js，请先安装 Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 错误: Node.js 版本过低，需要 16+，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本: $(node -v)"

# 安装前端依赖
echo "📦 安装前端依赖..."
cd frontend
if [ -f "package.json" ]; then
    npm install
    echo "✅ 前端依赖安装完成"
else
    echo "⚠️  未找到 frontend/package.json"
fi
cd ..

# 安装 Worker 依赖
echo "📦 安装 Worker 依赖..."
cd worker
if [ -f "package.json" ]; then
    npm install
    echo "✅ Worker 依赖安装完成"
else
    echo "⚠️  未找到 worker/package.json"
fi
cd ..

echo ""
echo "✅ 项目初始化完成！"
echo ""
echo "📝 下一步："
echo "   1. 配置前端环境变量："
echo "      - 创建 frontend/.env 文件"
echo "      - 配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY"
echo ""
echo "   2. 配置 Worker："
echo "      - 登录 Cloudflare: cd worker && npx wrangler login"
echo "      - 创建 R2 存储桶: npx wrangler r2 bucket create pic-collect"
echo "      - 配置 R2_PUBLIC_URL: npx wrangler secret put R2_PUBLIC_URL"
echo ""
echo "   3. 启动开发环境："
echo "      - 前端: cd frontend && npm run dev"
echo "      - Worker: cd worker && npm run dev"
