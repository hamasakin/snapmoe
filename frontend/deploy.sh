#!/bin/bash

# Vercel 部署脚本
# 使用方法: ./deploy.sh

echo "🚀 开始部署到 Vercel..."

# 检查是否在 frontend 目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在 frontend 目录下运行此脚本"
    exit 1
fi

# 检查是否已登录 Vercel
if ! vercel whoami &>/dev/null; then
    echo "⚠️  未检测到 Vercel 登录，请先登录："
    echo "   运行: vercel login"
    exit 1
fi

# 检查构建
echo "📦 检查构建..."
if ! npm run build; then
    echo "❌ 构建失败，请检查错误信息"
    exit 1
fi

# 部署到生产环境
echo "🚀 部署到生产环境..."
vercel --prod

echo "✅ 部署完成！"
echo "📝 请确保在 Vercel Dashboard 中配置了以下环境变量："
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
