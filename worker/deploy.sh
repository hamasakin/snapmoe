#!/bin/bash

# Cloudflare Worker 部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始部署 Cloudflare Worker..."

# 检查是否在 worker 目录
if [ ! -f "package.json" ] || [ ! -f "wrangler.toml" ]; then
    echo "❌ 错误: 请在 worker 目录下运行此脚本"
    exit 1
fi

# 检查是否已安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查是否已登录 Cloudflare
if ! npx wrangler whoami &>/dev/null; then
    echo "⚠️  未检测到 Cloudflare 登录，请先登录："
    echo "   运行: npx wrangler login"
    exit 1
fi

# 部署到生产环境
echo "🚀 部署到 Cloudflare..."
npm run deploy

echo "✅ 部署完成！"
echo "📝 请确保已配置以下环境变量："
echo "   - R2_PUBLIC_URL (通过 wrangler secret put R2_PUBLIC_URL)"
