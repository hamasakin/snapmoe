# 生产环境安全配置指南

## 概述

本文档说明如何在生产环境中安全配置 Worker，防止未授权访问。

## 问题

Worker 目前可以直接访问，任何人都可以调用上传和删除接口，存在安全风险。

## 解决方案

使用 **API Key 身份验证**机制保护 Worker：

1. Worker 验证请求头中的 `X-API-Key`
2. 前端在请求时携带 API Key
3. 只有匹配的 API Key 才能访问 Worker

## 配置步骤

### 1. 生成 API Key

使用以下命令生成一个安全的随机密钥：

```bash
# 使用 openssl（推荐）
openssl rand -hex 32

# 或使用 Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

生成后，保存这个密钥（例如：`a1b2c3d4e5f6...`），后续需要配置到 Worker 和前端。

### 2. 配置 Worker

在 Worker 目录下执行：

```bash
cd worker

# 设置 API Key
npx wrangler secret put API_KEY
# 粘贴刚才生成的密钥

# 如果还没有设置其他环境变量，也需要设置：
npx wrangler secret put R2_PUBLIC_URL
# 粘贴你的 R2 公开域名
```

### 3. 配置前端

#### 方式一：Vercel Dashboard（推荐）

1. 访问 [Vercel Dashboard - Environment Variables](https://vercel.com/hamasakins-projects/snapmoe-frontend/settings/environment-variables)
2. 添加环境变量：
   - **Name**: `VITE_WORKER_API_KEY`
   - **Value**: 与 Worker 中配置的 `API_KEY` 相同的值
   - **Environment**: 选择 `Production`（或所有环境）
3. 保存后会自动触发重新部署

#### 方式二：本地开发

在 `frontend/.env` 文件中添加：

```env
VITE_WORKER_API_KEY=your-secret-api-key
```

### 4. 验证配置

1. **检查 Worker 日志**：
   ```bash
   cd worker
   npx wrangler tail
   ```
   如果看到警告 `⚠️ API_KEY 未配置，跳过身份验证`，说明 Worker 未配置 API Key。

2. **测试前端上传**：
   - 访问前端应用
   - 尝试上传一张图片
   - 如果成功，说明配置正确
   - 如果返回 401 错误，检查 API Key 是否匹配

## 安全特性

### 1. 时间安全比较

Worker 使用时间安全字符串比较函数，防止时序攻击：

```typescript
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
```

### 2. 开发环境兼容

如果未配置 `API_KEY`，Worker 会显示警告但允许访问，方便本地开发：

```typescript
if (!env.API_KEY) {
  console.warn("⚠️ API_KEY 未配置，跳过身份验证（仅用于开发环境）");
  return true;
}
```

### 3. CORS 支持

Worker 的 CORS 头已更新，允许 `X-API-Key` 请求头：

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
};
```

## 常见问题

### Q: 如果忘记 API Key 怎么办？

A: 重新生成一个新的 API Key，并同时更新 Worker 和前端配置。

### Q: 可以配置多个 API Key 吗？

A: 当前实现只支持单个 API Key。如果需要多个 Key，可以：
1. 修改 Worker 代码支持多个 Key
2. 或使用更高级的身份验证方案（如 JWT）

### Q: API Key 泄露了怎么办？

A: 立即：
1. 生成新的 API Key
2. 更新 Worker 配置：`npx wrangler secret put API_KEY`
3. 更新前端环境变量
4. 重新部署前端

### Q: 开发环境也需要配置吗？

A: 不是必需的。如果未配置，Worker 会显示警告但允许访问。但建议开发环境也配置，以模拟生产环境。

## 最佳实践

1. ✅ **生产环境必须配置** API Key
2. ✅ **使用强随机密钥**（至少 32 字节）
3. ✅ **定期轮换** API Key（建议每 3-6 个月）
4. ✅ **不要将 API Key 提交到 Git**
5. ✅ **使用环境变量**管理密钥
6. ✅ **监控 Worker 日志**，及时发现异常访问

## 相关文档

- [Worker 部署指南](../worker/README.md)
- [前端部署指南](../frontend/DEPLOY.md)
- [部署信息](../DEPLOYMENT-INFO.md)
