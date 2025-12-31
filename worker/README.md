# Pic-Collect Cloudflare Worker

图片上传到 R2 存储的 Cloudflare Worker。

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

### 3. 部署
```bash
npm run deploy
```

或使用脚本：
- Windows: `deploy.bat`
- Linux/Mac: `./deploy.sh`

## 配置

`wrangler.toml` 已配置好：
```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "pic-collect"

[vars]
R2_PUBLIC_URL = "https://pub-503f8ebc7e1d4c8eacc08af4f823286d.r2.dev"
```

## 本地开发

```bash
npm run dev
```

访问 http://localhost:8787 测试

## API

### POST /

**请求体：**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "fileHash": "abc123",
  "imageId": "img001",
  "imageName": "example.jpg",
  "timestamp": 1735689600000,
  "originalUrl": "https://example.com/image.jpg",
  "sourceWebsite": "example.com"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "r2Url": "https://pub-xxx.r2.dev/1735689600000-abc123-example.jpg",
    "r2Path": "1735689600000-abc123-example.jpg",
    "fileSize": 123456,
    "mimeType": "image/jpeg"
  }
}
```

## 日志查看

```bash
npm run tail
```

## 特点

- ✅ 原生 R2 支持（零依赖）
- ✅ 自动处理 CORS
- ✅ 支持元数据
- ✅ 免费额度充足（100,000 请求/天）
