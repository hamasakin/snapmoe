# SnapMoe Userscript - 开发指南

基于 Vite 的现代化 userscript 开发环境。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env` 并填入你的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_WORKER_URL=https://pic-collect-upload.your-account.workers.dev/
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_WORKER_API_KEY=your-api-key
```

### 3. 开发模式

```bash
npm run dev
```

自动监听文件变化并重新构建到 `dist/snapmoe.user.js`。

### 4. 构建生产版本

```bash
npm run build
```

## 📦 项目结构

```
userscript/
├── src/
│   ├── main.js          # 主要源代码
│   └── metadata.txt     # Userscript 元数据
├── dist/
│   └── snapmoe.user.js  # 构建输出（安装此文件）
├── .env                 # 环境变量配置（不要提交）
├── .env.example         # 环境变量模板
├── vite.config.js       # Vite 配置
├── eslint.config.js     # ESLint 配置
└── package.json
```

## 🔧 可用命令

```bash
# 开发模式（监听文件变化）
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix

# 格式化代码
npm run format
```

## 🔐 环境变量

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `VITE_WORKER_URL` | Cloudflare Worker URL | ✅ |
| `VITE_SUPABASE_URL` | Supabase 项目 URL | ✅ |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | ✅ |
| `VITE_WORKER_API_KEY` | Worker API 密钥 | ❌ 可选 |

**工作原理**：
- 配置在 `.env` 文件中定义
- 构建时 Vite 自动将 `import.meta.env.VITE_*` 替换为实际值
- 构建后的脚本直接包含配置，无需运行时动态读取
- 不再使用 `GM_getValue`/`GM_setValue`

**注意**：
- 修改配置后必须重新构建才能生效
- 不要将 `.env` 文件提交到 Git
- 构建后的脚本是独立的，配置已经注入其中

## 💡 开发工作流

1. **修改代码** - 编辑 `src/main.js`
2. **自动构建** - Vite 自动检测并构建
3. **测试** - 在 Tampermonkey 中更新 `dist/snapmoe.user.js`
4. **提交** - 使用 Git 提交更改

## 📝 发布新版本

1. 更新版本号：
   - `src/metadata.txt` 中的 `@version`
   - `package.json` 中的 `version`

2. 构建：
   ```bash
   npm run build
   ```

3. 测试并提交：
   ```bash
   git add .
   git commit -m "Release vX.X.X"
   git tag vX.X.X
   git push origin main --tags
   ```

## 🛠️ 技术栈

- **Vite** - 极速构建工具
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化
- **环境变量** - 配置管理

## 📚 文档

- **用户文档** - [README.md](./README.md)
- **开发文档** - [DEV-GUIDE.md](./DEV-GUIDE.md)

## ❓ 常见问题

### 如何修改配置？

编辑 `.env` 文件，然后重新构建：

```bash
npm run build
```

### 构建后的文件在哪？

在 `dist/snapmoe.user.js`，在 Tampermonkey 中安装此文件。

### 如何调试？

在浏览器控制台查看 `[SnapMoe]` 前缀的日志。

---

查看 [DEV-GUIDE.md](./DEV-GUIDE.md) 了解更多详细信息。
