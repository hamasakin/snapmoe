# Cloudflare Worker 部署指南（v2.5.0）

## 功能说明

Worker 负责处理图片的 R2 存储操作：
- **上传图片**：接收 base64 图片数据，上传到 R2，返回公开 URL
- **删除图片**：从 R2 删除指定路径的图片

**注意**：元数据的保存和查询由前端直接使用 Supabase SDK 处理，无需经过 Worker。

## 架构说明（v2.5.0）

```
UserScript
  ├─ 查询已收藏 → Supabase SDK (直接)
  ├─ 上传图片 → Worker (R2) + Supabase SDK (元数据)
  └─ 删除图片 → Worker (R2) + Supabase SDK (元数据)
```

**Worker 职责**：
- ✅ 上传图片到 R2（需要 Access Key）
- ✅ 从 R2 删除图片
- ❌ ~~不再调用 Supabase Edge Functions~~（v2.5.0 移除）

**前端职责**（UserScript）：
- ✅ 使用 Supabase SDK 直接查询已收藏图片
- ✅ 上传成功后保存元数据到 Supabase
- ✅ 删除时同步删除 Supabase 记录

## 环境要求

- Node.js 16+
- npm 或 yarn
- Cloudflare 账号
- Cloudflare R2 存储桶

## 快速开始

### 1. 安装依赖

```bash
cd worker
npm install
```

### 2. 登录 Cloudflare

```bash
npx wrangler login
```

### 3. 创建 R2 存储桶

```bash
# 创建名为 snapmoe 的存储桶
npx wrangler r2 bucket create snapmoe

# 配置公开访问域名
# 访问 Cloudflare Dashboard → R2 → snapmoe → Settings → Public Access
# 启用 "Allow public access" 并复制域名（例如：https://pub-xxx.r2.dev）
```

### 4. 配置环境变量

```bash
# 设置 R2 公开访问 URL
npx wrangler secret put R2_PUBLIC_URL
# 粘贴你的 R2 公开域名：https://pub-xxx.r2.dev

# 设置 API Key（生产环境必需，用于身份验证）
npx wrangler secret put API_KEY
# 输入一个强密码作为 API Key（例如：使用 openssl rand -hex 32 生成）
```

**⚠️ 重要**：生产环境必须配置 `API_KEY`，否则 Worker 可能被未授权访问。开发环境可以不配置（会显示警告但允许访问）。

### 5. 部署 Worker

**方式一：使用部署脚本（推荐）**

```bash
./deploy.sh
```

脚本会自动检查登录状态并部署。

**注意**：确保脚本有执行权限
```bash
chmod +x deploy.sh
```

**方式二：手动部署**

```bash
npm run deploy
```

部署成功后会返回 Worker URL，例如：
```
https://pic-collect-upload.your-subdomain.workers.dev
```

记下这个 URL，需要在 UserScript 中配置。

## 配置文件说明

### wrangler.toml

```toml
name = "pic-collect-upload"
main = "src/index.ts"
compatibility_date = "2024-01-01"

# R2 存储桶绑定
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pic-collect"
```

**配置项**：
- `name`: Worker 名称
- `binding`: R2 绑定名称（代码中通过 `env.R2_BUCKET` 访问）
- `bucket_name`: R2 存储桶名称

## API 接口

### 1. 上传图片

**端点**：`POST /`

**请求体**：
```json
{
  "imageData": "base64编码的图片数据",
  "fileHash": "SHA256哈希",
  "imageId": "图片唯一ID",
  "imageName": "图片文件名",
  "timestamp": 1234567890,
  "mimeType": "image/jpeg",
  "width": 1920,
  "height": 1080
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "r2Url": "https://pub-xxx.r2.dev/1234567890-abc123-image.jpg",
    "r2Path": "1234567890-abc123-image.jpg",
    "fileSize": 123456,
    "mimeType": "image/jpeg",
    "width": 1920,
    "height": 1080
  }
}
```

### 2. 删除图片

**端点**：`DELETE /?r2Path=<路径>`

**查询参数**：
- `r2Path`: R2 中的文件路径

**响应**：
```json
{
  "success": true,
  "message": "删除成功"
}
```

## 本地开发

```bash
# 启动本地开发服务器
npm run dev

# 访问 http://localhost:8787
```

## 常见问题

### Q: 为什么 Worker 不再调用 Supabase？

A: v2.5.0 架构优化后：
- 前端直接使用 Supabase SDK 访问数据库（更快、更简单）
- Worker 只负责需要服务端权限的 R2 操作
- 减少网络延迟，简化部署流程

### Q: 如何更新 Worker？

```bash
# 修改代码后重新部署
npm run deploy
```

### Q: 如何查看 Worker 日志？

```bash
# 实时查看日志
npx wrangler tail

# 或在 Cloudflare Dashboard → Workers & Pages → pic-collect-upload → Logs
```

### Q: R2 如何配置公开访问？

1. 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 R2 → 选择你的存储桶
3. Settings → Public Access → Enable
4. 复制生成的公开域名

### Q: Worker 部署失败怎么办？

常见原因：
1. 未登录 Cloudflare：运行 `npx wrangler login`
2. R2 存储桶不存在：运行 `npx wrangler r2 bucket create pic-collect`
3. 配置错误：检查 `wrangler.toml` 中的 `bucket_name`

### Q: 如何生成安全的 API Key？

```bash
# 使用 openssl 生成 32 字节的随机密钥（64 个十六进制字符）
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生成后，使用 `npx wrangler secret put API_KEY` 设置到 Worker。

### Q: 生产环境安全配置

**必须配置**：
1. ✅ `R2_PUBLIC_URL`：R2 公开访问域名
2. ✅ `API_KEY`：API 密钥（防止未授权访问）

**前端配置**：
在 Vercel 环境变量中添加 `VITE_WORKER_API_KEY`，值应与 Worker 的 `API_KEY` 相同。

## 成本估算

| 服务 | 免费额度 | 超出费用 |
|------|----------|----------|
| Worker 请求 | 100,000 请求/天 | $0.50 / 百万请求 |
| R2 存储 | 10GB | $0.015 / GB / 月 |
| R2 操作 | 100万次/月 | $0.36 / 百万次 |

**估算**：
- 每天收藏 100 张图片（每张 1MB）
- 每月存储约 3GB
- **费用：$0/月**（在免费额度内）

## 架构变更说明

### v2.5.0（当前版本）
- ✅ Worker 只负责 R2 操作
- ✅ 前端直接使用 Supabase SDK
- ✅ 简化部署（无需配置 Supabase 环境变量）
- ✅ 提升性能（减少网络跳转）

### v2.4.2（旧版本）
- ❌ Worker 调用 Edge Functions 保存元数据
- ❌ 需要配置 SUPABASE_URL 和 SUPABASE_ANON_KEY
- ❌ 多一次网络请求

## 相关链接

- [项目主页](../README.md)
- [UserScript 使用指南](../userscript/README.md)
- [架构说明文档](../docs/v2.5.0-REMOVE-EDGE-FUNCTIONS.md)
- [Cloudflare R2 文档](https://developers.cloudflare.com/r2/)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 许可证

MIT License
