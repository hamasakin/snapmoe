@echo off
echo ====================================
echo 部署 Pic-Collect Cloudflare Worker
echo ====================================
echo.

cd /d "%~dp0"

echo 正在部署 Worker...
call npm run deploy

echo.
echo ====================================
echo 部署完成！
echo ====================================
echo.
echo Worker URL: https://pic-collect-upload.你的账号.workers.dev
echo.
echo 记得更新前端配置中的 Worker URL
echo.
pause
