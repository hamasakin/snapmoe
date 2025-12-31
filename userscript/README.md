# Pic Collect 油猴脚本使用指南

## 功能说明

这是一个基于 Tampermonkey 的浏览器插件，可以在任何网站上悬浮显示收藏按钮，一键收藏图片到你的 Cloudflare R2 存储和 Supabase 数据库。

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
3. 复制 `pic-collect.user.js` 的全部内容
4. 粘贴到编辑器中
5. 按 `Ctrl+S` (或 `Cmd+S`) 保存

### 3. 验证安装

1. 访问任何有图片的网站（例如：https://unsplash.com）
2. 将鼠标悬停在图片上
3. 应该看到一个紫色的 "⭐ 收藏" 按钮

## 使用方法

### 收藏图片

1. **浏览网页**: 在任何网站上浏览图片
2. **悬浮显示**: 将鼠标移动到图片上，会自动显示 "⭐ 收藏" 按钮
3. **点击收藏**: 点击按钮即可收藏图片
4. **收藏状态**:
   - ⏳ 收藏中... - 正在上传
   - ✅ 成功 - 收藏成功
   - ❌ 失败 - 收藏失败
   - 图片已存在 - 该图片已经收藏过了（基于 SHA256 哈希去重）

### 过滤规则

脚本会自动过滤掉尺寸小于 100×100 像素的图片（通常是图标、小按钮等）。

## 工作原理

1. **检测图片**: 当鼠标悬停在图片上时，脚本会检查图片尺寸
2. **下载图片**: 点击收藏后，脚本从原始 URL 下载图片
3. **计算哈希**: 计算图片的 SHA256 哈希值用于去重
4. **上传 R2**: 将图片上传到 Cloudflare R2 存储
5. **保存元数据**: 将图片信息（URL、尺寸、来源等）保存到 Supabase 数据库
6. **去重检查**: 如果图片已存在（基于哈希），则跳过上传

## 配置说明

脚本中的配置已经预设好，无需修改：

```javascript
const SUPABASE_URL = 'https://nenpnltcvapjgaakntha.supabase.co'
const SUPABASE_ANON_KEY = '...'
const R2_ACCOUNT_ID = '6928af033cf9fd582b21e1a9a2165f84'
const R2_ACCESS_KEY_ID = 'R2'
const R2_SECRET_ACCESS_KEY = '...'
const R2_BUCKET_NAME = 'pic-collect'
const R2_PUBLIC_URL = 'https://pub-503f8ebc7e1d4c8eacc08af4f823286d.r2.dev'
```

## 常见问题

### Q: 为什么有些图片不显示收藏按钮？

A: 脚本会过滤小于 100×100 像素的图片。如果需要修改这个限制，可以编辑脚本中的这一行：

```javascript
if (img.naturalWidth < 100 || img.naturalHeight < 100) return
```

### Q: 收藏失败怎么办？

A: 常见原因：
1. 图片 URL 受 CORS 限制，无法下载
2. 网络连接问题
3. R2 或 Supabase 配置错误

可以打开浏览器控制台（F12）查看详细错误信息。

### Q: 如何查看已收藏的图片？

A: 访问 Web 前端界面：http://localhost:5173（开发环境）或部署后的 URL。

### Q: 脚本会在所有网站上运行吗？

A: 是的，脚本配置为 `@match *://*/*`，会在所有网站上运行。如果你只想在特定网站使用，可以修改这一行：

```javascript
// @match https://specific-site.com/*
```

### Q: 脚本对性能有影响吗？

A: 脚本只在鼠标悬停时工作，对性能影响很小。UI 按钮的显示/隐藏都有防抖处理。

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

## 安全说明

- 脚本使用的是 Supabase 的 `anon` 密钥，只有读写权限
- 所有通信都使用 HTTPS 加密
- 图片存储在公开的 R2 bucket，任何人都可以通过 URL 访问（个人使用场景）
- 如需更高安全性，建议配置 RLS（Row Level Security）策略

## 技术栈

- **Tampermonkey**: 浏览器脚本管理器
- **Supabase SDK**: 数据库操作
- **AWS SDK**: R2 对象存储操作（S3 兼容）
- **Crypto API**: SHA256 哈希计算

## 更新日志

### v1.0.0 (2026-01-01)
- 初始版本
- 支持图片收藏功能
- 自动去重（基于 SHA256）
- 悬浮按钮 UI
- R2 + Supabase 存储方案

## 许可证

MIT License

## 联系方式

如有问题或建议，请在 GitHub 仓库提 Issue。
