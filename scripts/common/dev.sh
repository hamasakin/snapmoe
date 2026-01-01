#!/bin/bash

# 启动所有开发服务
# 使用方法: ./dev.sh [frontend|worker|all]

SERVICE=${1:-all}

echo "🚀 启动开发环境..."

if [ "$SERVICE" = "frontend" ] || [ "$SERVICE" = "all" ]; then
    echo "📦 启动前端开发服务器..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "⚠️  前端依赖未安装，正在安装..."
        npm install
    fi
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ 前端开发服务器已启动 (PID: $FRONTEND_PID)"
    cd ..
fi

if [ "$SERVICE" = "worker" ] || [ "$SERVICE" = "all" ]; then
    echo "📦 启动 Worker 开发服务器..."
    cd worker
    if [ ! -d "node_modules" ]; then
        echo "⚠️  Worker 依赖未安装，正在安装..."
        npm install
    fi
    npm run dev &
    WORKER_PID=$!
    echo "✅ Worker 开发服务器已启动 (PID: $WORKER_PID)"
    cd ..
fi

if [ "$SERVICE" = "all" ]; then
    echo ""
    echo "✅ 所有开发服务已启动！"
    echo ""
    echo "📝 访问地址："
    echo "   - 前端: http://localhost:5173"
    echo "   - Worker: http://localhost:8787"
    echo ""
    echo "按 Ctrl+C 停止所有服务"
    
    # 等待用户中断
    trap "kill $FRONTEND_PID $WORKER_PID 2>/dev/null; exit" INT TERM
    wait
fi
