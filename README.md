# SnapMoe - 图片收藏工具

一个基于 Cloudflare Worker + R2 + Supabase 的个人图片收藏工具，支持一键收藏、标签管理和智能筛选。

## ✨ 功能特点

- 🖱️ **一键收藏** - 在任何网站上悬停图片，一键收藏到云端
- 🎨 **瀑布流界面** - 美观的响应式瀑布流界面浏览和管理图片
- 🏷️ **标签系统** - 为图片添加标签，支持多标签筛选（交集逻辑）
- 📂 **自动分类** - 按网站自动分类，统计每个网站的图片数量
- 🔍 **智能筛选** - 支持按网站和标签组合筛选图片
- 🔒 **自动去重** - 基于 SHA256 哈希的智能去重机制
- 💰 **完全免费** - 使用免费额度充足的服务
- 📦 **大容量存储** - 10GB 存储 + 零流量费用
- 🖼️ **图片预览** - 支持大图预览、缩放、全屏和下载
- ⚡ **无限滚动** - 自动加载更多图片，流畅的浏览体验

## 🛠️ 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 数据库 | Supabase PostgreSQL | 存储图片元数据和标签 |
| 图片存储 | Cloudflare R2 | 10GB 免费，零流量费用 |
| 上传服务 | Cloudflare Worker | 无服务器，原生 R2 支持 |
| 数据访问 | Supabase JS SDK | 直接访问数据库 |
| 前端框架 | React + TypeScript | 现代化 UI 框架 |
| UI 组件 | Tailwind CSS | 实用优先的 CSS 框架 |
| 状态管理 | TanStack Query | 强大的数据同步和缓存 |
| 图片预览 | yet-another-react-lightbox | 功能丰富的图片预览组件 |
| 收藏脚本 | Tampermonkey | 浏览器用户脚本 |
| 构建工具 | Vite | 极速的前端构建工具 |

## 📋 数据库结构

### 核心表

- **images** - 图片元数据表
  - 存储图片的基本信息（URL、尺寸、文件大小等）
  - 自动记录来源网站和页面
  - 支持 SHA256 哈希去重

- **tags** - 标签表
  - 存储所有标签名称
  - 支持标签的创建和管理

- **image_tags** - 图片标签关联表
  - 多对多关系
  - 支持一张图片多个标签

- **websites** - 网站统计表
  - 自动统计每个网站的图片数量
  - 记录最后收藏时间

## 🚀 快速开始

### 0. 项目初始化（推荐）

使用脚本快速初始化项目：

**Linux/Mac:**
```bash
./scripts/common/setup.sh
```

**Windows:**
```cmd
scripts\common\setup.bat
```

这将自动安装所有依赖。

### 1. 配置 Supabase

1. 在 [Supabase Dashboard](https://app.supabase.com/) 创建新项目
2. 在 SQL Editor 中运行 `supabase/init.sql` 初始化数据库
3. 获取项目配置：
   - Settings → API → Project URL
   - Settings → API → anon public key

### 2. 配置 Cloudflare R2

1. 在 Cloudflare Dashboard 创建 R2 存储桶
2. 配置公开访问（Public Access）
3. 获取 R2 公开 URL（格式：`https://pub-xxx.r2.dev`）

### 3. 配置前端

创建 `frontend/.env`：
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. 配置 Worker

创建 `worker/.env`：
```env
R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

配置 `wrangler.toml`：
```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "your-bucket-name"
```

### 5. 启动开发环境

**方式一：使用脚本（推荐）**

```bash
# 启动所有服务
./scripts/common/dev.sh

# 或只启动前端
./scripts/common/dev.sh frontend

# 或只启动 Worker
./scripts/common/dev.sh worker
```

**方式二：手动启动**

```bash
# 前端
cd frontend
npm run dev
# 访问 http://localhost:5173

# Worker（另一个终端）
cd worker
npm run dev
# 访问 http://localhost:8787
```

### 6. 安装油猴脚本

1. 安装 [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
2. 构建用户脚本：
   ```bash
   cd userscript
   npm install
   npm run build
   ```
3. 在 Tampermonkey 中安装 `userscript/dist/snapmoe.user.js`
4. 修改脚本配置（第 16-20 行）：
   ```javascript
   const WORKER_URL = "你的Worker URL";
   const SUPABASE_URL = "你的Supabase项目URL";
   const SUPABASE_ANON_KEY = "你的Supabase匿名密钥";
   ```
5. 保存并启用

### 7. 开始收藏

访问任何网站，鼠标悬停图片，点击"⭐ 收藏"按钮！

## 📁 项目结构

```
snapmoe/
├── frontend/              # React 前端应用
│   ├── src/
│   │   ├── components/   # React 组件
│   │   │   ├── ImageCard.tsx    # 图片卡片（支持标签编辑）
│   │   │   ├── ImageGrid.tsx    # 图片网格布局
│   │   │   ├── TagInput.tsx     # 标签输入组件
│   │   │   ├── LazyImage.tsx    # 懒加载图片组件
│   │   │   └── ...
│   │   ├── pages/        # 页面组件
│   │   │   └── Gallery.tsx      # 图片画廊（支持筛选）
│   │   ├── hooks/        # React Hooks
│   │   │   └── useImages.ts     # 图片数据管理
│   │   ├── services/     # API 服务
│   │   │   └── images.ts        # 图片和标签 API
│   │   └── lib/          # 工具库
│   │       └── supabase.ts      # Supabase 客户端
│   └── ...
├── worker/                # Cloudflare Worker
│   ├── src/
│   │   └── index.ts      # Worker 入口（R2 上传/删除）
│   └── wrangler.toml    # Worker 配置
├── userscript/           # Tampermonkey 脚本
│   ├── src/
│   │   ├── main.js       # 脚本主逻辑
│   │   └── metadata.txt # 脚本元数据
│   └── dist/
│       └── snapmoe.user.js  # 构建输出
├── supabase/             # 数据库配置
│   ├── init.sql          # 数据库初始化脚本
│   └── functions/        # Edge Functions（可选）
│       ├── delete-image/      # 删除图片
│       ├── get-collected-images/  # 获取已收藏图片
│       └── save-image-metadata/   # 保存图片元数据
├── scripts/              # 开发脚本
│   └── common/          # 通用脚本
│       ├── setup.sh     # 项目初始化
│       └── dev.sh       # 开发环境启动
└── docs/                 # 文档
    ├── CICD-SETUP.md    # CI/CD 配置指南
    └── PRODUCTION-SECURITY.md  # 生产环境安全指南
```

## 🎯 核心功能说明

### 标签系统

- **添加标签**：在图片卡片上点击标签区域，输入标签名称
- **创建新标签**：输入不存在的标签名称，按 Enter 创建
- **删除标签**：点击标签上的 × 按钮
- **标签筛选**：在画廊页面顶部选择标签进行筛选
- **多标签筛选**：选择多个标签时，显示包含所有选中标签的图片（交集）

### 图片管理

- **浏览图片**：瀑布流布局，自动加载更多
- **预览图片**：点击图片打开大图预览，支持缩放、全屏、下载
- **删除图片**：点击删除按钮，确认后删除
- **查看来源**：点击"来源"按钮跳转到原始页面

### 筛选功能

- **按网站筛选**：选择特定网站，只显示该网站的图片
- **按标签筛选**：选择标签，只显示包含该标签的图片
- **组合筛选**：同时选择网站和标签，进行组合筛选

## 🚢 部署

### 🚀 自动部署（推荐）

本项目已配置 GitHub Actions，每次推送代码到 `main` 或 `master` 分支时自动部署：
- ✅ Frontend 自动部署到 Vercel
- ✅ Worker 自动部署到 Cloudflare
- ✅ UserScript 自动构建并发布

**配置步骤：**
1. Fork 或 Clone 本项目到你的 GitHub
2. 在 GitHub 仓库设置中添加必需的 Secrets：
   - `VERCEL_TOKEN` - Vercel 访问令牌
   - `VERCEL_ORG_ID` - Vercel 组织 ID
   - `VERCEL_PROJECT_ID` - Vercel 项目 ID
   - `CLOUDFLARE_API_TOKEN` - Cloudflare API 令牌
   - `CLOUDFLARE_ACCOUNT_ID` - Cloudflare 账户 ID
3. 推送代码，自动触发部署

详细配置指南：📖 [docs/CICD-SETUP.md](docs/CICD-SETUP.md)

### 手动部署

#### 部署前端到 Vercel

```bash
cd frontend
./deploy.sh
```

**前置要求：**
- 已安装 Vercel CLI：`npm install -g vercel`
- 已登录：`vercel login`
- 已在 Vercel Dashboard 配置环境变量

详见 [frontend/DEPLOY.md](frontend/DEPLOY.md)

#### 部署 Worker 到 Cloudflare

```bash
cd worker
./deploy.sh
```

**前置要求：**
- 已登录 Cloudflare：`npx wrangler login`
- 已创建 R2 存储桶
- 已配置 `R2_PUBLIC_URL` secret

详见 [worker/README.md](worker/README.md)

#### 构建 UserScript

```bash
cd userscript
npm install
npm run build
```

构建后的文件在 `userscript/dist/snapmoe.user.js`，在 Tampermonkey 中安装此文件。

## 💰 成本估算

| 服务 | 免费额度 | 估算容量 |
|------|----------|----------|
| Supabase | 500MB 数据库 | ~100万条记录 |
| Cloudflare R2 | 10GB 存储 | ~5000-10000 张图片 |
| Cloudflare Worker | 100,000 请求/天 | 充足 |
| Vercel | 100GB 带宽/月 | 充足 |
| **总计** | **$0/月** | **完全免费** |

## ❓ 常见问题

### Q: 如何配置 UserScript？

修改 `userscript/src/main.js` 中的配置（第 16-20 行），然后重新构建：
```bash
cd userscript
npm run build
```

或在构建后的 `dist/snapmoe.user.js` 中直接修改配置。

### Q: 图片存储在哪里？

图片存储在 Cloudflare R2 存储桶，元数据和标签存储在 Supabase 数据库。

### Q: 如何添加标签？

1. 在前端画廊页面找到要添加标签的图片
2. 点击图片卡片上的标签区域
3. 输入标签名称，按 Enter 创建或选择已有标签
4. 点击"完成"保存

### Q: 如何筛选图片？

在画廊页面顶部有两个筛选器：
- **网站筛选器**：选择要查看的网站
- **标签筛选器**：选择要查看的标签

可以同时使用两个筛选器进行组合筛选。

### Q: 标签筛选的逻辑是什么？

当选择多个标签时，只显示**同时包含所有选中标签**的图片（交集逻辑）。例如：
- 选择标签 A 和 B，只显示同时有 A 和 B 的图片
- 不显示只有 A 或只有 B 的图片

### Q: 可以部署到生产环境吗？

可以。前端部署到 Vercel/Netlify，Worker 已在 Cloudflare 上运行。建议阅读 [docs/PRODUCTION-SECURITY.md](docs/PRODUCTION-SECURITY.md) 了解生产环境安全配置。

### Q: 如何删除图片？

在图片卡片上点击"删除"按钮，确认后删除。删除操作会：
1. 从 Cloudflare R2 删除图片文件
2. 从 Supabase 数据库删除元数据和标签关联

### Q: 支持哪些图片格式？

支持所有常见的图片格式：JPG、PNG、GIF、WebP 等。

## 📚 相关文档

- [前端部署指南](frontend/DEPLOY.md)
- [Worker 部署指南](worker/README.md)
- [UserScript 开发指南](userscript/README.md)
- [CI/CD 配置指南](docs/CICD-SETUP.md)
- [生产环境安全指南](docs/PRODUCTION-SECURITY.md)

## 📝 更新日志

### v2.6.5
- ✨ 新增标签系统，支持为图片添加标签
- ✨ 新增标签筛选功能，支持多标签交集筛选
- 🎨 优化图片卡片 UI，支持标签编辑
- 🐛 修复图片名称显示问题

### v2.5.0
- ✅ UserScript 直接使用 Supabase JS SDK 访问数据库
- ✅ Worker 负责 R2 存储操作
- ❌ 移除 Edge Functions 依赖

## 📄 许可证

MIT License

---

**享受收藏图片的乐趣！** 🎉
