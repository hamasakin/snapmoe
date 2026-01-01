# GitHub Actions CI/CD 配置指南

本项目配置了 GitHub Actions 自动化部署流程，每次推送到 `main` 或 `master` 分支时自动部署：
- Frontend 到 Vercel
- Worker 到 Cloudflare
- Supabase Functions（可选）

## 前置准备

### 1. 获取 Vercel 配置

#### 1.1 获取 Vercel Token
1. 访问 https://vercel.com/account/tokens
2. 点击 "Create Token"
3. 给 Token 起个名字（如：`github-actions`）
4. 选择 Scope（建议选择具体的 Project）
5. 复制生成的 Token（只显示一次）

#### 1.2 获取 Vercel Project ID 和 Org ID
在项目根目录运行：
```bash
cd frontend
npx vercel link
```

然后查看生成的 `.vercel/project.json` 文件：
```json
{
  "orgId": "team_xxxxx",
  "projectId": "prj_xxxxx"
}
```

或者从已有的部署信息：
- **Project ID**: `prj_YHl6FnmcIwHpJxbp1TgqGNnmOcAm`
- **Org ID**: 需要从 `.vercel/project.json` 获取

### 2. 获取 Cloudflare 配置

#### 2.1 获取 Cloudflare API Token
1. 访问 https://dash.cloudflare.com/profile/api-tokens
2. 点击 "Create Token"
3. 使用 "Edit Cloudflare Workers" 模板
4. 或者创建自定义 Token 并授予以下权限：
   - Account > Cloudflare Workers Scripts > Edit
   - Account > Account Settings > Read
5. 复制生成的 API Token

#### 2.2 获取 Cloudflare Account ID
1. 访问 https://dash.cloudflare.com
2. 在右侧侧边栏可以看到 "Account ID"
3. 或者从 Workers & Pages 页面的 URL 中获取

### 3. 获取 Supabase 配置（可选）

#### 3.1 获取 Supabase Access Token
1. 访问 https://supabase.com/dashboard/account/tokens
2. 点击 "Generate New Token"
3. 给 Token 起个名字（如：`github-actions`）
4. 复制生成的 Token

#### 3.2 获取 Supabase Project Ref
1. 访问你的 Supabase 项目
2. 在 Settings > General 中找到 "Project ID" 或 "Reference ID"
3. 或者从 Supabase URL 中获取：`https://xxx.supabase.co`（xxx 就是 project ref）

## 配置 GitHub Secrets

在你的 GitHub 仓库中添加以下 Secrets：

### 步骤：
1. 访问你的 GitHub 仓库
2. 进入 `Settings` > `Secrets and variables` > `Actions`
3. 点击 "New repository secret" 添加以下 Secrets：

### 必需的 Secrets

#### Vercel 相关
| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `VERCEL_TOKEN` | Vercel API Token | 见上方第 1.1 节 |
| `VERCEL_PROJECT_ID` | Vercel 项目 ID | `prj_YHl6FnmcIwHpJxbp1TgqGNnmOcAm` |
| `VERCEL_ORG_ID` | Vercel 组织/团队 ID | 见上方第 1.2 节 |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 你的 Supabase 项目地址 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | Supabase Dashboard 中获取 |

#### Cloudflare 相关
| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | 见上方第 2.1 节 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID | 见上方第 2.2 节 |

#### Supabase Functions 相关（可选）
| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `SUPABASE_ACCESS_TOKEN` | Supabase Access Token | 见上方第 3.1 节 |
| `SUPABASE_PROJECT_REF` | Supabase 项目引用 ID | 见上方第 3.2 节 |

## 工作流程说明

### 触发条件
- 推送到 `main` 或 `master` 分支时自动触发
- 也可以在 GitHub Actions 页面手动触发

### 部署流程

#### 1. Frontend 部署
```
代码检出 → 安装 Node.js → 安装依赖 → 构建项目 → 部署到 Vercel
```

#### 2. Worker 部署
```
代码检出 → 安装 Node.js → 安装依赖 → 部署到 Cloudflare Workers
```

#### 3. Supabase Functions 部署（可选）
```
代码检出 → 安装 Supabase CLI → 链接项目 → 部署 Functions
```

## 使用方法

### 自动部署
推送代码到 main/master 分支：
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

部署会自动开始，可以在 GitHub 仓库的 "Actions" 标签页查看部署状态。

### 手动部署
1. 访问你的 GitHub 仓库
2. 点击 "Actions" 标签
3. 选择 "Deploy Frontend and Worker" workflow
4. 点击 "Run workflow" 按钮
5. 选择分支并确认

## 验证部署

### Frontend
部署成功后访问：https://snapmoe-frontend.vercel.app

### Worker
部署成功后，Worker 会自动更新到 Cloudflare

### Supabase Functions
使用 Supabase Dashboard 查看 Functions 部署状态

## 故障排除

### 构建失败
1. 检查 Actions 日志中的错误信息
2. 确保本地可以成功构建：
   ```bash
   cd frontend && npm run build
   cd worker && npm run deploy
   ```

### Secrets 配置错误
1. 确保所有必需的 Secrets 都已正确配置
2. 检查 Secrets 的值是否正确（注意前后空格）
3. Token 是否已过期

### Vercel 部署失败
1. 检查 `VERCEL_TOKEN` 是否有效
2. 确认 `VERCEL_PROJECT_ID` 和 `VERCEL_ORG_ID` 是否正确
3. 检查环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY` 是否配置

### Cloudflare 部署失败
1. 检查 `CLOUDFLARE_API_TOKEN` 权限是否足够
2. 确认 `CLOUDFLARE_ACCOUNT_ID` 是否正确
3. 确保 R2 存储桶已创建

### Supabase 部署失败
1. 检查 `SUPABASE_ACCESS_TOKEN` 是否有效
2. 确认 `SUPABASE_PROJECT_REF` 是否正确
3. 确保 Functions 代码没有语法错误

## 禁用部分部署

如果你不需要部署某个部分，可以：

### 禁用 Supabase Functions 部署
在 `.github/workflows/deploy.yml` 中注释或删除 `deploy-supabase` job。

### 只部署 Frontend
```bash
# 在 GitHub Actions 页面手动触发时，可以修改 workflow 文件
# 或者创建单独的 workflow 文件
```

## 高级配置

### 环境分离
如果需要区分 staging 和 production 环境：
1. 创建不同的分支（如 `develop` 和 `main`）
2. 配置不同的 Secrets（添加环境前缀）
3. 修改 workflow 根据分支使用不同的 Secrets

### 部署通知
可以添加 Slack、Discord 或其他通知集成：
```yaml
- name: Notify on Slack
  uses: slackapi/slack-github-action@v1.24.0
  with:
    payload: |
      {
        "text": "Deployment completed!"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

## 注意事项

1. **安全性**：
   - 不要在代码中硬编码任何 Token 或 Secret
   - 定期轮换 API Tokens
   - 使用最小权限原则配置 Tokens

2. **成本**：
   - 每次推送都会触发部署，注意 GitHub Actions 分钟数限制
   - Vercel 和 Cloudflare 免费层有使用限制

3. **并发**：
   - 三个 job 会并行运行，加快部署速度
   - 如果有依赖关系，可以使用 `needs` 关键字控制顺序

## 相关链接

- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [Vercel CLI 文档](https://vercel.com/docs/cli)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Supabase CLI 文档](https://supabase.com/docs/guides/cli)
