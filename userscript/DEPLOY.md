# Userscript GitHub Pages 部署说明

## 设置步骤

### 1. 启用 GitHub Pages（推荐手动启用）

**方法一：手动启用（推荐）**
1. 前往 GitHub 仓库的 **Settings** → **Pages**
2. 在 **Source** 部分，选择 **GitHub Actions**
3. 保存设置

**方法二：自动启用**
Workflow 已配置为自动启用 GitHub Pages（需要管理员权限）。如果自动启用失败，请使用方法一手动启用。

**注意**：
- 如果是组织仓库，可能需要组织管理员权限
- 首次启用可能需要几分钟时间生效

### 2. 配置 Secrets（可选）

如果 userscript 构建时需要环境变量，请在仓库的 **Settings** → **Secrets and variables** → **Actions** 中添加以下 secrets：

- `VITE_WORKER_URL` - Cloudflare Worker URL
- `VITE_SUPABASE_URL` - Supabase 项目 URL
- `VITE_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `VITE_WORKER_API_KEY` - Worker API 密钥（可选）

### 3. 触发部署

部署会在以下情况自动触发：

- 推送到 `main` 或 `master` 分支，且 `userscript/` 目录有变更
- 手动在 Actions 页面触发 workflow

### 4. 访问部署的脚本

部署完成后，可以通过以下 URL 访问：

```
https://<你的用户名>.github.io/<仓库名>/snapmoe.user.js
```

例如：`https://username.github.io/pic-collect/snapmoe.user.js`

## 工作流程

1. **构建** - 使用 Vite 构建 userscript
2. **准备** - 创建部署目录和 index.html 页面
3. **上传** - 上传构建产物到 GitHub Pages artifact
4. **部署** - 自动部署到 GitHub Pages

## 手动触发

如果需要手动触发部署：

1. 前往 GitHub 仓库的 **Actions** 标签页
2. 选择 **Deploy Userscript to GitHub Pages** workflow
3. 点击 **Run workflow** 按钮

## 故障排除

### 错误：Get Pages site failed

如果遇到此错误，请按以下步骤操作：

1. **检查权限**：
   - 确保你是仓库的所有者或管理员
   - 如果是组织仓库，确保有组织管理员权限

2. **手动启用 Pages**：
   - 前往 **Settings** → **Pages**
   - 选择 **GitHub Actions** 作为源
   - 保存设置

3. **检查 Workflow 权限**：
   - 前往 **Settings** → **Actions** → **General**
   - 确保 "Workflow permissions" 设置为 "Read and write permissions"
   - 或者确保 workflow 文件中的 `permissions` 部分包含 `administration: write`

4. **重新运行 Workflow**：
   - 在 Actions 页面重新运行失败的 workflow

### 其他常见问题

- **首次部署可能需要几分钟时间**：GitHub Pages 需要时间来初始化和部署
- **构建失败**：检查 Actions 日志以获取详细信息
- **环境变量未生效**：确保在 GitHub Secrets 中正确配置了环境变量
