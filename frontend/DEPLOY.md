# Vercel 部署指南

## 前置要求

1. 确保已安装 Node.js 和 npm
2. 确保前端项目可以正常构建：`npm run build`

## 部署步骤

### 方法一：使用部署脚本（推荐）

```bash
cd frontend
./deploy.sh
```

脚本会自动检查登录状态、构建项目并部署。

**注意**：确保脚本有执行权限
```bash
chmod +x deploy.sh
```

### 方法二：使用 Vercel CLI（手动）

1. **安装 Vercel CLI**（如果未安装）：
   ```bash
   npm install -g vercel
   ```

2. **登录 Vercel**：
   ```bash
   vercel login
   ```
   按照提示完成登录（支持 GitHub、GitLab、Bitbucket 或邮箱登录）

3. **在 frontend 目录下部署**：
   ```bash
   cd frontend
   vercel
   ```

4. **首次部署会询问以下问题**：
   - Set up and deploy? → **Y**
   - Which scope? → 选择你的团队或个人账户
   - Link to existing project? → **N**（首次部署）
   - What's your project's name? → 输入项目名称（如：snapmoe-frontend）
   - In which directory is your code located? → **./**（当前目录）
   - Want to override the settings? → **N**（使用 vercel.json 配置）

5. **配置环境变量**：
   部署完成后，在 Vercel Dashboard 中配置以下环境变量：
   - `VITE_SUPABASE_URL` - 你的 Supabase 项目 URL
   - `VITE_SUPABASE_ANON_KEY` - 你的 Supabase 匿名密钥
   
   **注意**：前端只负责展示图片，上传功能由 UserScript 处理，因此不需要配置 Worker 相关的环境变量。

6. **重新部署以应用环境变量**：
   ```bash
   vercel --prod
   ```

### 方法二：通过 Git 集成（自动部署）

1. **在 Vercel Dashboard 中**：
   - 访问 https://vercel.com/dashboard
   - 点击 "Add New Project"
   - 导入你的 Git 仓库
   - 设置 Root Directory 为 `frontend`
   - 配置环境变量（见上方）
   - 点击 Deploy

2. **后续更新**：
   每次推送到 Git 仓库的 main/master 分支会自动触发部署

## 环境变量配置

在 Vercel Dashboard → Project Settings → Environment Variables 中添加：

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**注意**：前端只负责展示图片，上传功能由 UserScript 处理，因此不需要配置 Worker 相关的环境变量。

## 验证部署

部署成功后，访问 Vercel 提供的 URL（如：`https://snapmoe-frontend.vercel.app`）验证应用是否正常运行。

## 故障排除

### 构建失败

- 检查 `package.json` 中的构建脚本是否正确
- 确保所有依赖都已安装：`npm install`
- 检查 TypeScript 错误：`npm run build`

### 环境变量未生效

- 确保变量名以 `VITE_` 开头
- 重新部署项目以应用新的环境变量
- 检查 Vercel Dashboard 中的环境变量配置

### SPA 路由问题

- `vercel.json` 已配置 SPA 路由重定向
- 如果仍有问题，检查 `vercel.json` 中的 `rewrites` 配置
