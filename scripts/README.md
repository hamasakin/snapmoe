# 项目脚本说明

本目录包含项目的通用开发脚本。

## 脚本结构

```
scripts/
└── common/
    ├── setup.sh    # 项目初始化脚本
    └── dev.sh      # 启动开发环境脚本
```

各项目的部署脚本位于各自目录：
- `frontend/deploy.sh` - 前端部署脚本
- `worker/deploy.sh` - Worker 部署脚本

## 通用脚本

### 1. 项目初始化

```bash
./scripts/common/setup.sh
```

功能：
- 检查 Node.js 版本
- 安装前端依赖
- 安装 Worker 依赖
- 显示后续配置步骤

### 2. 启动开发环境

```bash
# 启动所有服务
./scripts/common/dev.sh

# 或只启动前端
./scripts/common/dev.sh frontend

# 或只启动 Worker
./scripts/common/dev.sh worker
```

功能：
- 检查依赖是否安装
- 启动对应的开发服务器
- 支持同时启动多个服务

## 项目部署脚本

### 前端部署

```bash
cd frontend
./deploy.sh
```

详见 [frontend/DEPLOY.md](../frontend/DEPLOY.md)

### Worker 部署

```bash
cd worker
./deploy.sh
```

详见 [worker/README.md](../worker/README.md)

## 注意事项

1. **执行权限**：确保脚本有执行权限
   ```bash
   chmod +x scripts/**/*.sh
   chmod +x frontend/deploy.sh
   chmod +x worker/deploy.sh
   ```

2. **首次使用**：运行 `setup.sh` 初始化项目

3. **开发环境**：使用 `dev.sh` 快速启动开发服务器
