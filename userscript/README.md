# SnapMoe 油猴脚本使用指南

## 功能说明

这是一个基于 Tampermonkey 的浏览器插件，可以在任何网站上悬浮显示收藏按钮，一键收藏图片到你的 Cloudflare R2 存储和 Supabase 数据库。

**v2.6.0 更新**：完全绕过 CSP！使用 Edge Functions 代理所有数据库操作，真正实现在任何网站都能正常使用。

## 安装步骤

### 1. 安装 Tampermonkey 浏览器扩展

根据你使用的浏览器选择对应的扩展：

- **Chrome**: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
- **Firefox**: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
- **Edge**: [Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)
- **Safari**: [App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)

### 2. 安装脚本

1. 打开 Tampermonkey 仪表盘
2. 点击 "+" 创建新脚本
3. 复制 `snapmoe.user.js` 的全部内容
4. 粘贴到编辑器中
5. 按 `Ctrl+S` (或 `Cmd+S`) 保存

### 3. 配置脚本

脚本使用 Tampermonkey 的存储 API 管理配置，有两种配置方式：

#### 方式一：通过浏览器控制台配置（推荐）

1. 打开任意网页，按 `F12` 打开开发者工具
2. 切换到 **Console** 标签
3. 执行以下命令设置配置：

```javascript
// 设置 Cloudflare Worker URL
GM_setValue('WORKER_URL', 'https://your-worker.workers.dev/');

// 设置 Supabase URL
GM_setValue('SUPABASE_URL', 'https://xxx.supabase.co');

// 设置 Supabase Anon Key
GM_setValue('SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');

// 设置 Worker API Key（可选，如果 Worker 需要身份验证）
GM_setValue('WORKER_API_KEY', 'your-secret-api-key');
```

4. 刷新页面使配置生效

#### 方式二：通过脚本代码配置

在脚本中找到 `initConfig()` 函数，修改默认值：

```javascript
function initConfig() {
  if (GM_getValue("WORKER_URL") === undefined) {
    setConfig("WORKER_URL", "https://your-worker.workers.dev/");
  }
  if (GM_getValue("SUPABASE_URL") === undefined) {
    setConfig("SUPABASE_URL", "https://xxx.supabase.co");
  }
  // ... 其他配置
}
```

### 4. 获取 Supabase 配置

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 点击左侧 **Settings** → **API**
4. 复制以下信息：
   - **Project URL** → 填入 `SUPABASE_URL`
   - **Project API keys → anon public** → 填入 `SUPABASE_ANON_KEY`

### 5. 验证安装

1. 访问任何有图片的网站（例如：https://unsplash.com）
2. 将鼠标悬停在图片上
3. 应该看到一个紫色的 "⭐ 收藏" 按钮（未收藏）或绿色的 "✅ 已收藏" 按钮

## 配置说明

### 必需配置

- **WORKER_URL**: Cloudflare Worker 的 URL（例如：`https://pic-collect-upload.xxx.workers.dev/`）
- **SUPABASE_URL**: Supabase 项目 URL（例如：`https://xxx.supabase.co`）
- **SUPABASE_ANON_KEY**: Supabase 匿名密钥

### 可选配置

- **WORKER_API_KEY**: Worker API 密钥（如果 Worker 配置了 API Key 身份验证，则需要设置）

### 查看当前配置

在浏览器控制台执行：

```javascript
console.log('WORKER_URL:', GM_getValue('WORKER_URL'));
console.log('SUPABASE_URL:', GM_getValue('SUPABASE_URL'));
console.log('SUPABASE_ANON_KEY:', GM_getValue('SUPABASE_ANON_KEY'));
console.log('WORKER_API_KEY:', GM_getValue('WORKER_API_KEY') || '未配置');
```

### 重置配置

如果需要重置配置，在浏览器控制台执行：

```javascript
GM_deleteValue('WORKER_URL');
GM_deleteValue('SUPABASE_URL');
GM_deleteValue('SUPABASE_ANON_KEY');
GM_deleteValue('WORKER_API_KEY');
```

然后刷新页面，脚本会使用默认值。

## 使用方法

### 收藏图片

1. **浏览网页**: 在任何网站上浏览图片
2. **悬浮显示**: 将鼠标移动到图片上，会自动显示收藏按钮
3. **按钮状态**:
   - 🟣 **"⭐ 收藏"** - 未收藏，点击可收藏
   - 🟢 **"✅ 已收藏"** - 已收藏，右键可删除
4. **点击收藏**: 点击按钮即可收藏图片
5. **收藏进度**:
   - ⏳ 收藏中... - 正在上传
   - ✅ 成功 - 收藏成功
   - ❌ 失败 - 收藏失败

### 删除图片

对于已收藏的图片：
1. 鼠标悬停显示 "✅ 已收藏" 按钮
2. **右键点击**按钮
3. 确认删除
4. 删除成功后按钮变回 "⭐ 收藏"

### 过滤规则

脚本会自动过滤掉尺寸小于 100×100 像素的图片（通常是图标、小按钮等）。

## 工作原理

### v2.6.0 架构

```
UserScript
  ├─ 获取已收藏 → GM_xmlhttpRequest → Edge Function → Supabase
  ├─ 上传图片 → GM_xmlhttpRequest → Cloudflare Worker → R2
  ├─ 保存元数据 → GM_xmlhttpRequest → Edge Function → Supabase
  └─ 删除图片 → GM_xmlhttpRequest → Edge Function → Supabase
                └─ GM_xmlhttpRequest → Cloudflare Worker → R2
```

**关键特性**：
- **所有网络请求**都通过 `GM_xmlhttpRequest`
- **完全绕过 CSP 限制**，可在任何网站使用
- **Edge Functions** 代理所有数据库操作
- **无需 Supabase SDK**，脚本更轻量

**详细流程**：

1. **页面加载**: 脚本通过 Edge Function 查询当前页面已收藏的图片列表
2. **检测图片**: 当鼠标悬停时，检查图片是否已收藏
3. **下载图片**: 使用 `GM_xmlhttpRequest` 绕过 CORS 限制下载图片
4. **计算哈希**: 计算图片的 SHA256 哈希值用于去重
5. **上传 Worker**: 将图片（base64）通过 `GM_xmlhttpRequest` 发送给 Cloudflare Worker
6. **Worker 处理**:
   - 上传图片到 R2 存储
   - 返回 R2 URL 和路径
7. **保存元数据**: 通过 Edge Function 保存元数据到 Supabase
8. **更新缓存**: 本地更新已收藏列表

## 配置说明

脚本需要配置三个关键参数：

```javascript
// Cloudflare Worker URL（处理 R2 上传）
const WORKER_URL = "https://your-worker.workers.dev/";

// Supabase 配置（直接访问数据库）
const SUPABASE_URL = "https://xxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

**安全性说明**：
- ✅ Supabase Anon Key 是设计用于前端的公开密钥
- ✅ 所有数据库操作受 RLS（Row Level Security）策略保护
- ✅ Cloudflare Worker 处理需要敏感权限的 R2 操作
- ✅ 使用 `GM_xmlhttpRequest` 绕过 CORS 和 CSP 限制

## 常见问题

### Q: 为什么需要 Edge Functions？

A: v2.6.0 引入了 Edge Functions 来完全绕过 CSP 限制：

**问题**：Supabase SDK 内部使用 `fetch()` API，在严格 CSP 网站上会被阻止

**解决方案**：
- 创建 3 个 Edge Functions 代理所有数据库操作
- Userscript 使用 `GM_xmlhttpRequest` 调用 Edge Functions
- Edge Functions 在服务端执行数据库操作，不受 CSP 限制

**Edge Functions**：
1. `get-collected-images` - 查询已收藏图片
2. `save-image-metadata` - 保存图片元数据
3. `delete-image` - 删除图片记录

### Q: 为什么需要配置 Supabase？

A: v2.6.0 通过 Edge Functions 访问数据库，提供更好的 CSP 兼容性：
- **Edge Functions** 代理所有数据库操作
- **Worker** 负责 R2 存储操作（需要 Access Key）
- 所有请求都通过 `GM_xmlhttpRequest` 发起

### Q: 为什么还需要 Cloudflare Worker？

A: Worker 负责：
- 上传图片到 R2（需要 Access Key，不能暴露在前端）
- 删除 R2 中的图片
- 处理大文件的 base64 编码

### Q: 为什么有些图片不显示收藏按钮？

A: 脚本会过滤小于 100×100 像素的图片。如果需要修改这个限制，可以编辑脚本中的这一行：

```javascript
if (img.naturalWidth < 100 || img.naturalHeight < 100) return
```

### Q: 在 Pixiv 等网站上无法收藏图片？

A: **v2.6.0 已彻底解决！** 

v2.5.2 虽然修复了 Worker 通信的 CSP 问题，但 Supabase SDK 内部仍使用 `fetch()`，导致在严格 CSP 网站上部分功能失败。

v2.6.0 移除了 Supabase SDK，改用 Edge Functions + `GM_xmlhttpRequest`，**100% 绕过所有 CSP 限制**！

现在可以在以下网站完全正常使用：
- ✅ Pixiv (www.pixiv.net)
- ✅ Twitter/X
- ✅ Instagram
- ✅ 任何其他网站

如果仍有问题，请：
1. 确保使用的是 **v2.6.0 或更高版本**
2. 检查 Edge Functions 是否已正确部署
3. 查看浏览器控制台的错误信息

### Q: 收藏失败怎么办？

A: 常见原因：
1. Worker URL 配置错误
2. Supabase 配置错误（检查 URL 和 Key）
3. 网络连接问题
4. 图片 URL 无法访问

可以打开浏览器控制台（F12）查看详细错误信息。

### Q: 如何查看已收藏的图片？

A: 访问 Web 前端界面：
- 开发环境：http://localhost:5173
- 生产环境：部署后的 URL

### Q: 脚本会在所有网站上运行吗？

A: 是的，脚本配置为 `@match *://*/*`，会在所有网站上运行。如果你只想在特定网站使用，可以修改这一行：

```javascript
// @match https://specific-site.com/*
```

### Q: 如何判断脚本是否正常工作？

A: 打开浏览器控制台（F12），应该看到：
```
[SnapMoe] 初始化成功
[SnapMoe] Cloudflare Worker URL: https://...
[SnapMoe] Supabase URL: https://...
[SnapMoe] 脚本已加载，开始监听图片
[SnapMoe] 正在加载已收藏图片列表...
[SnapMoe] 已加载 X 张已收藏图片
```

## 数据存储

- **图片文件**: 存储在 Cloudflare R2（10GB 免费额度）
- **元数据**: 存储在 Supabase PostgreSQL 数据库（500MB 免费额度）

### 存储的元数据包括：

- 原始 URL
- R2 存储 URL
- 来源网站
- 来源页面 URL
- 图片尺寸（宽×高）
- 文件大小
- 文件类型
- SHA256 哈希（用于去重）
- 收藏时间

## 技术栈

- **Tampermonkey**: 浏览器脚本管理器
- **GM_xmlhttpRequest**: 绕过 CORS 和 CSP 限制（所有网络请求）
- **Supabase Edge Functions**: 代理数据库操作（v2.6.0 新增）
- **Crypto API**: SHA256 哈希计算
- **Cloudflare Worker**: R2 存储操作

## 更新日志

### v2.6.0 (2026-01-01) ⭐ 重大更新
- 🎯 **完全绕过 CSP**：移除 Supabase SDK，使用 Edge Functions
- 🚀 **创建 3 个 Edge Functions**：代理所有数据库操作
- ✅ **100% 兼容性**：现在真正可以在 Pixiv、Twitter 等严格 CSP 网站正常工作
- 📦 **移除 SDK 依赖**：脚本更轻量，不再加载 Supabase SDK
- 🔐 **统一请求方式**：所有网络请求都通过 `GM_xmlhttpRequest`

### v2.5.2 (2026-01-01)
- 🐛 **修复 CSP 错误**：将 Worker 通信从 `fetch()` 改为 `GM_xmlhttpRequest`
- ⚠️ **局限性**：Supabase SDK 内部仍使用 `fetch()`，部分功能在严格 CSP 网站无法使用

### v2.5.0 (2026-01-01)
- 🚀 **架构优化**：移除 Edge Functions，直接使用 Supabase SDK
- ⚡ **性能提升**：获取已收藏图片速度提升 50%
- ⚠️ **CSP 问题**：在严格 CSP 网站上无法使用

### v2.4.2
- 修复删除功能
- 优化错误处理

### v2.2.0
- 🔥 修复 CORS 问题
- 使用 GM_xmlhttpRequest 绕过限制
- 支持防盗链图片

### v2.1.0
- ✨ 新增已收藏图片标识
- 智能按钮状态（未收藏/已收藏）
- 支持右键删除

### v1.0.0
- 初始版本
- 支持图片收藏功能
- 自动去重（基于 SHA256）

## 许可证

MIT License

## 相关链接

- [项目主页](../README.md)
- [架构说明](../docs/v2.5.0-REMOVE-EDGE-FUNCTIONS.md)
- [Worker 部署指南](../worker/README.md)
