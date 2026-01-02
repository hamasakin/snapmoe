# Gemini 项目分析: SnapMoe

## 项目概述

本项目名为 **SnapMoe**，是一个功能全面的个人图片收藏工具。它允许用户在浏览网页时，通过单击操作将图片保存到个人的、托管在云端的收藏夹中。所有收藏的图片通过一个专门的 Web 界面进行管理，该界面支持标签、筛选和搜索功能。

该项目是一个 monorepo，由四个独立但协同工作的主要服务组成：

1.  **用户脚本 (`userscript/`)**: 一个 Tampermonkey 脚本，用户需要安装在自己的浏览器中。它会在任何网页的图片上方动态注入一个“收藏”按钮。当点击该按钮时，它会负责下载图片、计算哈希值并将其发送以进行后续处理。
2.  **Cloudflare Worker (`worker/`)**: 一个处理原始图片存储的 API 服务。它从用户脚本接收图片数据，验证请求，然后将文件上传到 Cloudflare R2 存储桶。它还处理从 R2 删除图片的请求。
3.  **Supabase 后端 (`supabase/`)**: 数据和逻辑层。使用 PostgreSQL 数据库存储所有图片的元数据（原始 URL、R2 URL、标签、来源网站等）。后端还包括无服务器的边缘函数（Edge Functions），用户脚本通过调用这些函数来获取数据和保存元数据，从而绕过潜在的浏览器 CORS 问题。
4.  **React 前端 (`frontend/`)**: 一个现代化的单页应用程序，为收藏夹提供主要的用户界面。它以瀑布流的形式展示收藏的图片，提供强大的筛选和标签功能，并允许用户管理他们的收藏。

## 架构与技术

该架构旨在实现低成本和高性能，大量利用了 Cloudflare 和 Supabase 慷慨的免费套餐。

| 组件 | 技术 | 角色 |
| :--- | :--- | :--- |
| **前端** | React, TypeScript, Vite, Tailwind CSS | 提供用于查看和管理图片的主要图库界面。 |
| **数据获取** | TanStack Query | 管理服务器状态、缓存和后台数据同步，以实现流畅的 UI。 |
| **图片上传** | Cloudflare Worker | 用于从 R2 上传和删除图片的无服务器 API 端点。 |
| **图片存储** | Cloudflare R2 | 可扩展、低成本的对象存储，用于存放实际的图片文件。 |
| **元数据** | Supabase (PostgreSQL) | 存储所有图片元数据、标签和网站信息。 |
| **后端逻辑** | Supabase Edge Functions | 由用户脚本调用的无服务器函数，用于获取已收藏的图片和保存元数据。 |
| **收藏脚本** | Tampermonkey (用户脚本) | 在网页中注入 UI 以触发展示和收藏过程。 |

### 数据流（图片收藏过程）

1.  用户在任何网站上将鼠标悬停在一张图片上。**用户脚本**会注入一个“收藏”按钮。
2.  用户点击该按钮。
3.  **用户脚本**下载图片数据（使用 `GM_xmlhttpRequest` 绕过 CORS），计算其 SHA-256 哈希值，并获取其尺寸。
4.  **用户脚本**将图片数据、哈希值和 API 密钥通过 `POST` 请求发送到 **Cloudflare Worker**。
5.  **Worker** 验证 API 密钥并将图片上传到 **Cloudflare R2**。它返回公开的 R2 URL 和路径。
6.  **用户脚本**接收到 R2 URL 后，向一个 **Supabase Edge Function** (`save-image-metadata`) 发送 `POST` 请求。
7.  **Edge Function** 将图片的所有元数据（原始 URL、R2 URL、哈希值、来源网站等）保存到 **Supabase PostgreSQL** 数据库中。

## 构建与运行

项目包含了辅助脚本，以简化开发体验。

### 1. 环境准备

- Node.js 和 npm
- [Tampermonkey](https://www.tampermonkey.net/) 浏览器扩展
- 一个已设置好 R2 的 Cloudflare 账户
- 一个已创建项目的 Supabase 账户

### 2. 安装依赖

从项目根目录运行安装脚本，为所有子项目安装依赖：

```bash
# 在 Linux/Mac 上
./scripts/common/setup.sh

# 在 Windows 上
scripts\\common\\setup.bat
```

### 3. 配置

配置通过 `frontend` 和 `worker` 目录下的 `.env` 文件进行管理，以及直接在 `userscript/src/main.js` 文件中进行（该文件在构建时从环境变量填充）。

- **`frontend/.env`**: `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。
- **`worker/wrangler.toml` & Secrets**: 在 `wrangler.toml` 中配置 R2 存储桶绑定，并通过 Wrangler CLI 设置 secrets (`R2_PUBLIC_URL`, `API_KEY`)。
- **`userscript/`**: 在构建脚本之前，配置 Supabase 和 Worker 的 URL。

### 4. 运行开发服务器

使用提供的脚本同时运行前端和 worker 的开发服务器：

```bash
# 启动所有开发服务
./scripts/common/dev.sh

# 或者单独启动服务
./scripts/common/dev.sh frontend
./scripts/common/dev.sh worker
```

- **前端:** 运行在 `http://localhost:5173`
- **Worker:** 运行在 `http://localhost:8787`

### 5. 构建和安装用户脚本

用户脚本必须先构建，然后在 Tampermonkey 中安装。

```bash
cd userscript
npm run build
```

这将生成 `userscript/dist/snapmoe.user.js` 文件，可以将其安装到 Tampermonkey。运行中的脚本需要配置为指向你的本地或已部署的 Worker 和 Supabase URL。

## 开发规范

- **Monorepo 结构:** 项目被组织成一个 monorepo，包含四个不同的包（`frontend`, `worker`, `userscript`, `supabase`）。
- **TypeScript & JavaScript:** 前端、worker 和 Supabase 函数使用 TypeScript。用户脚本使用现代 JavaScript 编写。
- **关注点分离:** 每个服务都有明确定义的职责。Worker 只处理文件存储，前端只处理图库 UI，数据库/边缘函数管理数据状态。用户脚本则作为在客户端浏览器上的协调者。
- **安全性:**
  - Cloudflare Worker 受一个秘密的 API 密钥（`X-API-Key` 请求头）保护。
  - Supabase 表启用了行级安全（RLS），但策略是宽松的（`USING (true)`），这反映了该工具旨在个人使用。对于多用户环境，这些策略需要更加严格。
- **数据库:** 数据库模式（`supabase/init.sql`）定义良好，使用触发器自动管理 `updated_at` 时间戳并维护 `websites` 表中的统计数据，这是一个很好的优化。
- **构建工具:** `frontend` 和 `userscript` 项目使用 Vite，因为它速度快且功能现代。Cloudflare Worker 使用 Wrangler。