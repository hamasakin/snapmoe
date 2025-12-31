# Pic Collect - 图片收藏工具

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
| 前端 | React + TypeScript | 瀑布流界面 |
| 收藏脚本 | Tampermonkey | 浏览器插件 |

## 快速开始

### 1. 配置前端

编辑 `frontend/.env`：
```env
VITE_WORKER_URL=https://pic-collect-upload.sorasahsx.workers.dev/
VITE_SUPABASE_URL=你的supabase项目URL
VITE_SUPABASE_ANON_KEY=你的supabase匿名密钥
VITE_R2_PUBLIC_URL=https://pub-xxx.r2.dev
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 3. 安装油猴脚本

1. 安装 Tampermonkey 浏览器扩展
2. 创建新脚本
3. 复制 `userscript/pic-collect.user.js` 内容
4. 保存并启用

### 4. 开始收藏

访问任何网站，鼠标悬停图片，点击"⭐ 收藏"按钮！

## 项目结构

```
pic-collect/
├── worker/              # Cloudflare Worker（图片上传）
├── frontend/            # React 前端
├── userscript/          # 油猴脚本
└── supabase/           # 数据库配置
    └── init.sql        # 数据库初始化
```

## 部署 Worker（可选）

如果需要部署自己的 Worker：

```bash
cd worker
npm install
npx wrangler login
npm run deploy
```

详见 [worker/README.md](worker/README.md)

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

### Q: 如何更换 Worker URL？

修改两处：
1. `userscript/pic-collect.user.js` 第 20 行
2. `frontend/.env` 的 `VITE_WORKER_URL`

### Q: 图片存储在哪里？

图片存储在你的 Cloudflare R2 存储桶，元数据存储在 Supabase 数据库。

### Q: 可以部署到生产环境吗？

可以。前端部署到 Vercel/Netlify，Worker 已在 Cloudflare 上运行。

## 许可证

MIT License
