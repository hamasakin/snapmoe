# Repository Guidelines

## 项目结构与模块组织
- `frontend/` 前端 React + TypeScript，源代码在 `frontend/src`，静态资源在 `frontend/public`，构建产物在 `frontend/dist`。
- `worker/` Cloudflare Worker，入口 `worker/src/index.ts`，配置在 `worker/wrangler.toml`。
- `userscript/` Tampermonkey 脚本，源码在 `userscript/src`，构建输出在 `userscript/dist`。
- `supabase/` 数据库 SQL 与可选 Edge Functions；`scripts/` 通用脚本；`docs/` 部署与安全文档。

## 构建、测试与开发命令
- 初始化依赖：`scripts/common/setup.sh` 或 `scripts\common\setup.bat`。
- 启动开发：`scripts/common/dev.sh`（可选 `frontend` 或 `worker`）。
- 前端：`cd frontend && npm run dev` / `npm run build` / `npm run lint` / `npm run preview`。
- Worker：`cd worker && npm run dev` / `npm run deploy` / `npm run tail`。
- Userscript：`cd userscript && npm run dev` / `npm run build` / `npm run lint` / `npm run format`。

## 代码风格与命名规范
- ESLint 作为基础校验：`frontend/eslint.config.js` 与 `userscript/eslint.config.js`。
- 前端组件使用 `PascalCase.tsx`，Hooks 使用 `useXxx.ts`。
- Userscript 使用 2 空格缩进、双引号、分号、多行逗号；必要时运行 `npm run format`。

## 测试指南
- 当前无自动化测试；提交前至少运行相关模块的 `npm run lint` 与 `npm run build`。
- 手动冒烟：同时启动前端与 Worker，确认 `userscript/dist/snapmoe.user.js` 构建成功。

## 提交与 PR 规范
- 提交信息倾向 Conventional Commits：`feat:`、`fix:`、`docs:`、`chore:`、`style:`。
- PR 需包含变更说明、关联 issue（如有）、验证步骤；UI 变更附截图或 GIF，基础设施变更说明新增的密钥/配置。

## 安全与配置提示
- 本地配置在 `frontend/.env`、`worker/.env`、`userscript/.env`，不要提交密钥。
- 新增绑定或环境变量请同步更新 `worker/wrangler.toml` 与相关文档。
