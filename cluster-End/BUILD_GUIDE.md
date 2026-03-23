# Cluster App 打包指南

本文档说明如何将 Cluster App 打包为独立的可执行文件，用于 macOS 和 Windows 平台的发布。

## 项目结构

```
projectR-demo/
├── cluster/          # 前端项目 (React + Vite)
│   ├── package.json
│   ├── vite.config.js
│   └── dist/         # 前端构建输出目录
└── cluster-End/      # 后端项目 (FastAPI + Python)
    ├── launch.py     # 打包入口文件
    ├── main.py       # FastAPI 主应用
    ├── build.py      # 通用打包脚本
    ├── build-macos.py    # macOS 专用打包脚本
    ├── build-win.py      # Windows 专用打包脚本
    ├── static/       # 前端静态文件 (需从 cluster/dist 复制)
    ├── model/        # 数据模型
    ├── service/      # 业务逻辑
    └── dist/         # 打包输出目录
```

## 环境准备

### 1. 安装 Python 依赖

```bash
cd cluster-End

# 创建虚拟环境（推荐）
python -m venv venv

# 激活虚拟环境
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 安装打包工具
pip install pyinstaller pyinstaller-hooks-contrib
```

### 2. 安装 Node.js 依赖

```bash
cd ../cluster

# 使用 npm 或 yarn
npm install
# 或
yarn install
```

## 打包方式

### 方式一：使用通用打包脚本（推荐）

通用打包脚本会自动构建前端并打包后端：

```bash
cd cluster-End

# 完整打包（前端 + 后端）
python build.py

# 仅构建前端
python build.py --frontend

# 仅构建后端（需先构建前端）
python build.py --backend
```

### 方式二：分平台打包

#### macOS 打包

```bash
cd cluster-End

# 方法1：使用通用脚本
python build.py

# 方法2：使用 macOS 专用脚本（需先手动构建前端）
cd ../cluster && npm run build
cd ../cluster-End
cp -r ../cluster/dist static/
python build-macos.py

# 指定架构（可选）
python build-macos.py arm64    # Apple Silicon (M1/M2/M3)
python build-macos.py amd64    # Intel Mac
```

输出文件：`dist/cluster-app-macos-arm64` 或 `dist/cluster-app-macos-amd64`

#### Windows 打包

```bash
# 在 Windows 环境中执行
cd cluster-End

# 方法1：使用通用脚本
python build.py

# 方法2：使用 Windows 专用脚本（需先手动构建前端）
cd ..\cluster && npm run build
cd ..\cluster-End
xcopy /E /I ..\cluster\dist static\
python build-win.py
```

输出文件：`dist/cluster-app-windows-amd64.exe`

## 打包输出

打包完成后，可执行文件位于 `cluster-End/dist/` 目录：

- **macOS ARM64**: `cluster-app-macos-arm64`
- **macOS Intel**: `cluster-app-macos-amd64`
- **Windows**: `cluster-app-windows-amd64.exe`

## 运行打包后的应用

### macOS

```bash
# 给予执行权限
chmod +x dist/cluster-app-macos-arm64

# 运行
./dist/cluster-app-macos-arm64
```

首次运行可能会遇到安全提示，请前往 **系统设置 > 隐私与安全性** 允许应用运行。

### Windows

双击运行 `cluster-app-windows-amd64.exe`，或从命令行运行：

```cmd
dist\cluster-app-windows-amd64.exe
```

## 发布准备

### macOS 应用签名（可选但推荐）

```bash
# 使用开发者证书签名
codesign --deep --force --verify --verbose --sign "Developer ID Application: Your Name" dist/cluster-app-macos-arm64

# 创建 DMG 安装包（可选）
# 可使用 create-dmg 工具
```

### Windows 应用签名（可选但推荐）

需要使用代码签名证书对 `.exe` 文件进行签名，避免 Windows Defender 拦截。

## 常见问题

### 1. 打包后应用无法启动

- 检查 `static/` 目录是否存在且包含前端构建文件
- 检查 `launch.py` 中的 `multiprocessing.freeze_support()` 是否已添加

### 2. 缺少依赖模块错误

在 `build.py` 中的 `--hidden-import` 和 `--collect-all` 参数中添加缺失的模块。

### 3. 前端资源加载失败

确保前端构建输出目录正确复制到 `cluster-End/static/`：

```bash
# macOS/Linux
cp -r ../cluster/dist/* static/

# Windows
xcopy /E /I ..\cluster\dist\* static\
```

### 4. 图标不显示

将图标文件放在 `cluster/public/` 目录下：
- macOS: 支持 `.png` 或 `.icns` 格式
- Windows: 支持 `.png` 或 `.ico` 格式

### 5. 杀毒软件拦截

打包后的应用可能被误报为病毒，这是 PyInstaller 的常见问题。解决方案：
- 使用代码签名证书签名应用
- 向杀毒软件厂商提交误报申诉
- 使用 `--onefile` 以外的打包方式

## 技术说明

### 打包原理

1. **前端构建**: 使用 Vite 构建 React 应用，生成静态文件
2. **文件整合**: 将前端静态文件复制到后端目录
3. **PyInstaller 打包**:
   - 将 Python 解释器、依赖库和项目代码打包为单个可执行文件
   - 嵌入前端静态文件作为数据文件
   - 使用 `launch.py` 作为入口点启动 FastAPI 服务和静态文件服务

### 关键配置

- `--onefile`: 打包为单个可执行文件
- `--add-data`: 嵌入数据文件（前端静态文件）
- `--hidden-import`: 显式导入隐藏依赖
- `--collect-all`: 收集指定包的所有子模块
- `--noconsole`: Windows 下不显示控制台窗口

## 更新日志

### 打包脚本更新记录

- **2024-03-23**: 初始版本，支持 macOS 和 Windows 打包
- 添加 `multiprocessing.freeze_support()` 支持，修复多进程相关问题
- 添加 `--frontend` 和 `--backend` 参数支持分步构建
