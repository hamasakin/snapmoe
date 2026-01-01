# SnapMoe - 二次元图片收藏工具

一个基于 Cloudflare Worker + R2 + Supabase 的个人图片收藏工具。

## 功能特点

- 🖱️ 在任何网站上悬停图片，一键收藏到云端
- 🎨 瀑布流界面浏览和管理图片
- 🏷️ 按网站自动分类
- 🔒 自动去重（SHA256 哈希）
- 💰 完全免费（免费额度充足）
- 📦 10GB 存储 + 零流量费用

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 数据库 | Supabase PostgreSQL | 存储图片元数据 |
| 图片存储 | Cloudflare R2 | 10GB 免费，零流量费用 |
| 上传服务 | Cloudflare Worker | 无服务器，原生 R2 支持 |
| 数据访问 | Supabase JS SDK | 直接访问数据库（v2.5.0 新增） |
| 前端 | React + TypeScript | 瀑布流界面 |
| 收藏脚本 | Tampermonkey | 浏览器插件 |

## 快速开始

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

### 1. 配置前端

编辑 `frontend/.env`：
```env
VITE_WORKER_URL=https://pic-collect-upload.YOUR-ACCOUNT.workers.dev/
VITE_SUPABASE_URL=你的supabase项目URL
VITE_SUPABASE_ANON_KEY=你的supabase匿名密钥
VITE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### 2. 启动开发环境

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

### 3. 安装油猴脚本

1. 安装 Tampermonkey 浏览器扩展
2. 创建新脚本
3. 复制 `userscript/snapmoe.user.js` 内容
4. 修改配置（第 16-20 行）：
   ```javascript
   const WORKER_URL = "你的Worker URL";
   const SUPABASE_URL = "你的Supabase项目URL";
   const SUPABASE_ANON_KEY = "你的Supabase匿名密钥";
   ```
5. 保存并启用

### 4. 开始收藏

访问任何网站，鼠标悬停图片，点击"⭐ 收藏"按钮！

## 项目结构

```
snapmoe/
├── worker/              # Cloudflare Worker（图片上传到 R2）
├── frontend/            # React 前端（瀑布流界面）
├── userscript/          # 油猴脚本（使用 Supabase SDK）
├── scripts/             # 通用开发脚本
│   └── common/         # 初始化、开发环境启动等
├── supabase/            # 数据库配置
│   └── init.sql        # 数据库初始化
└── docs/                # 文档
    └── v2.5.0-REMOVE-EDGE-FUNCTIONS.md  # 架构说明
```

**架构说明**（v2.5.0）：
- ✅ UserScript 直接使用 Supabase JS SDK 访问数据库
- ✅ Worker 负责 R2 存储操作（需要 Access Key）
- ❌ 不再使用 Edge Functions（已移除）

## 部署

### 部署前端到 Vercel

```bash
cd frontend
./deploy.sh
```

**前置要求：**
- 已安装 Vercel CLI：`npm install -g vercel`
- 已登录：`vercel login`
- 已在 Vercel Dashboard 配置环境变量（`VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`）

详见 [frontend/DEPLOY.md](frontend/DEPLOY.md)

### 部署 Worker 到 Cloudflare

```bash
cd worker
./deploy.sh
```

**前置要求：**
- 已登录 Cloudflare：`npx wrangler login`
- 已创建 R2 存储桶
- 已配置 `R2_PUBLIC_URL` secret

详见 [worker/README.md](worker/README.md)

### 脚本说明

- 通用脚本位于 `scripts/common/` 目录
- 各项目的部署脚本位于各自目录（`frontend/deploy.sh`、`worker/deploy.sh`）
- 详见 [scripts/README.md](scripts/README.md)

## 数据库初始化

在 Supabase Dashboard 中运行 `supabase/init.sql`，创建所需的表结构。

## 成本估算

| 服务 | 免费额度 | 估算容量 |
|------|----------|----------|
| Supabase | 500MB 数据库 | ~100万条记录 |
| Cloudflare R2 | 10GB 存储 | ~5000-10000 张图片 |
| Cloudflare Worker | 100,000 请求/天 | 充足 |
| **总计** | **$0/月** | **完全免费** |

## 常见问题

### Q: 如何配置 UserScript？

修改 `userscript/snapmoe.user.js` 第 16-20 行：
```javascript
const WORKER_URL = "https://your-worker.workers.dev/";
const SUPABASE_URL = "https://xxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
```

获取 Supabase 配置：
1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择项目 → Settings → API
3. 复制 **Project URL** 和 **anon public** key

### Q: 图片存储在哪里？

图片存储在你的 Cloudflare R2 存储桶，元数据存储在 Supabase 数据库。

### Q: 可以部署到生产环境吗？

可以。前端部署到 Vercel/Netlify，Worker 已在 Cloudflare 上运行。

## 许可证

MIT License
