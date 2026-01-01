# GitHub Actions CI/CD Workflows

本目录包含自动化部署的 GitHub Actions workflows。

## 可用的 Workflows

### 1. deploy.yml - 完整部署流程
**触发条件：** 推送到 main/master 分支或手动触发

**包含：**
- ✅ Frontend 部署到 Vercel
- ✅ Worker 部署到 Cloudflare
- ✅ Supabase Functions 部署（可选）

**所有部署并行运行，快速完成！**

### 2. deploy-frontend-only.yml - 仅部署前端
**触发条件：** 推送到 main/master 分支且 frontend 目录有变化

**适用场景：** 只修改了前端代码时

### 3. deploy-worker-only.yml - 仅部署 Worker
**触发条件：** 推送到 main/master 分支且 worker 目录有变化

**适用场景：** 只修改了 Worker 代码时

## 使用方法

### 自动触发
```bash
# 修改代码后
git add .
git commit -m "feat: add new feature"
git push origin main
```

GitHub Actions 会根据修改的文件自动选择运行哪些 workflow。

### 手动触发
1. 访问 GitHub 仓库
2. 点击 `Actions` 标签
3. 选择要运行的 workflow
4. 点击 `Run workflow` 按钮

## 配置要求

### 必需的 GitHub Secrets

详见：[../docs/CICD-SETUP.md](../docs/CICD-SETUP.md)

**最小配置（Frontend + Worker）：**
- `VERCEL_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_ORG_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

## 禁用不需要的部署

### 禁用 Supabase Functions 部署
编辑 `deploy.yml`，注释或删除 `deploy-supabase` job：

```yaml
# deploy-supabase:
#   name: Deploy Supabase Functions
#   ...
```

### 只使用分离的 Workflows
如果你想更精细地控制何时部署什么：

1. 删除或重命名 `deploy.yml`
2. 使用 `deploy-frontend-only.yml` 和 `deploy-worker-only.yml`
3. 这样只有相关文件改变时才会触发对应的部署

## 监控部署状态

### 查看运行日志
1. GitHub 仓库 → `Actions` 标签
2. 点击具体的 workflow run
3. 查看每个 job 的详细日志

### 部署状态徽章
在 README.md 中添加状态徽章：

```markdown
![Deploy Status](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/deploy.yml/badge.svg)
```

## 故障排除

### 构建失败
1. 查看 Actions 日志中的错误信息
2. 在本地运行相同的构建命令测试
3. 检查依赖是否正确安装

### 部署失败
1. 确认所有 Secrets 都已正确配置
2. 检查 Token 是否过期
3. 验证账户 ID 和项目 ID 是否正确

### 超时问题
如果部署经常超时：
1. 检查网络连接
2. 考虑拆分大型部署
3. 调整 timeout 设置

## 高级配置

### 环境分离
创建不同环境的 workflow：

```yaml
# deploy-staging.yml
on:
  push:
    branches:
      - develop

# deploy-production.yml
on:
  push:
    branches:
      - main
```

### 添加测试步骤
在部署前运行测试：

```yaml
- name: Run tests
  run: npm test
  
- name: Run linting
  run: npm run lint
```

### 添加通知
部署完成后发送通知：

```yaml
- name: Notify on success
  if: success()
  run: |
    curl -X POST YOUR_WEBHOOK_URL \
      -d "Deployment successful!"
```

## 相关文档

- 📖 [完整配置指南](../docs/CICD-SETUP.md)
- ✅ [配置检查清单](../docs/CICD-CHECKLIST.md)
- 🚀 [Vercel 部署文档](../frontend/DEPLOY.md)
- ⚡ [Worker 部署文档](../worker/README.md)
