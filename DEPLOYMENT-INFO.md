# SnapMoe 部署信息

## Vercel 前端部署

**项目名称**：`snapmoe-frontend`  
**生产环境 URL**：https://snapmoe-frontend.vercel.app  
**项目 ID**：`prj_YHl6FnmcIwHpJxbp1TgqGNnmOcAm`  
**团队**：hamasakins-projects

### 部署状态

✅ **部署成功** - 2026-01-02

### 需要配置的环境变量

在 [Vercel Dashboard](https://vercel.com/hamasakins-projects/snapmoe-frontend/settings/environment-variables) 中添加以下环境变量：

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

**注意**：前端只负责展示图片，上传功能由 UserScript 处理，因此不需要配置 Worker 相关的环境变量。

### 配置步骤

1. 访问 [Vercel Dashboard - Environment Variables](https://vercel.com/hamasakins-projects/snapmoe-frontend/settings/environment-variables)
2. 点击 "Add New" 添加每个环境变量
3. 选择环境（Production、Preview、Development）
4. 保存后会自动触发重新部署

### 验证部署

配置环境变量后，访问 https://snapmoe-frontend.vercel.app 验证应用是否正常运行。

## Cloudflare Worker

**Worker 名称**：`pic-collect-upload`  
**R2 存储桶**：`pic-collect`

### 需要配置的环境变量

使用以下命令配置 Worker 环境变量：

```bash
cd worker

# 设置 R2 公开访问 URL
npx wrangler secret put R2_PUBLIC_URL

# 设置 API Key（生产环境必需）
npx wrangler secret put API_KEY
```

**⚠️ 重要**：生产环境必须配置 `API_KEY`，用于防止未授权访问。

## Supabase（保持不变）

使用现有的 Supabase 项目配置。
