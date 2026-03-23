#!/usr/bin/env python3
"""
本地打包脚本 - 用于在 Windows/macOS 上本地构建并打包 Release

用法:
    python release-local.py [version]

示例:
    python release-local.py v1.3.1
    python release-local.py 1.3.1

如果不指定版本号，默认使用 v1.0.0
"""

import os
import sys
import shutil
import subprocess
import platform
from pathlib import Path


def run_command(cmd, cwd=None, env=None, shell=False):
    """运行命令并打印输出"""
    print(f"\n>>> 执行: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        shell=shell,
        encoding='utf-8',
        errors='replace'
    )
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        print(f"❌ 命令失败，返回码: {result.returncode}")
        sys.exit(1)
    return result


def get_version():
    """获取版本号"""
    if len(sys.argv) > 1:
        version = sys.argv[1]
        # 确保版本号以 v 开头
        if not version.startswith('v'):
            version = 'v' + version
        return version
    return "v1.0.0"


def get_platform_info():
    """获取平台信息"""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        return "windows", "amd64", ".exe"
    elif system == "darwin":
        if machine == "arm64":
            return "macos", "arm64", ""
        else:
            return "macos", "amd64", ""
    else:
        return system, machine, ""


def build_frontend(cluster_dir):
    """构建前端"""
    print("\n" + "=" * 60)
    print("步骤 1/4: 构建前端")
    print("=" * 60)

    # 检查 node_modules 是否存在
    node_modules = os.path.join(cluster_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("📦 安装前端依赖...")
        if os.path.exists(os.path.join(cluster_dir, "yarn.lock")):
            run_command(["yarn", "install"], cwd=cluster_dir)
        else:
            run_command(["npm", "install"], cwd=cluster_dir)

    # 构建前端
    print("🔨 构建前端...")
    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    run_command(["npm", "run", "build"], cwd=cluster_dir, env=env)

    # 返回构建输出目录
    build_dir = os.path.join(cluster_dir, "dist")
    if not os.path.exists(build_dir):
        build_dir = os.path.join(cluster_dir, "build")

    if not os.path.exists(build_dir):
        print(f"❌ 构建目录不存在: {build_dir}")
        sys.exit(1)

    print(f"✅ 前端构建完成: {build_dir}")
    return build_dir


def copy_files(build_dir, backend_dir):
    """复制前端文件到后端目录"""
    print("\n" + "=" * 60)
    print("步骤 2/4: 复制前端文件到后端")
    print("=" * 60)

    static_dir = os.path.join(backend_dir, "static")

    # 删除旧的 static 目录
    if os.path.exists(static_dir):
        print(f"🗑️  删除旧的 static 目录...")
        shutil.rmtree(static_dir)

    # 复制新的构建文件
    print(f"📋 复制前端文件到: {static_dir}")
    shutil.copytree(build_dir, static_dir)

    # 复制图标文件
    cluster_dir = os.path.join(backend_dir, "..", "cluster")
    icon_source = os.path.join(cluster_dir, "public", "细胞分析.png")
    if os.path.exists(icon_source):
        shutil.copy2(icon_source, os.path.join(static_dir, "细胞分析.png"))
        print("📋 复制图标文件")

    print("✅ 文件复制完成")


def build_executable(backend_dir, version, platform_name, arch, ext):
    """构建可执行文件"""
    print("\n" + "=" * 60)
    print("步骤 3/4: 构建可执行文件")
    print("=" * 60)

    # 执行打包脚本
    if platform.system().lower() == "windows":
        script = os.path.join(backend_dir, "build-win.py")
    else:
        script = os.path.join(backend_dir, "build-macos.py")

    if not os.path.exists(script):
        print(f"❌ 打包脚本不存在: {script}")
        sys.exit(1)

    print(f"🔨 执行打包脚本: {script}")
    run_command([sys.executable, script], cwd=backend_dir)

    # 检查构建结果
    dist_dir = os.path.join(backend_dir, "dist")
    if not os.path.exists(dist_dir):
        print(f"❌ 构建输出目录不存在: {dist_dir}")
        sys.exit(1)

    # 查找生成的可执行文件
    exe_files = [f for f in os.listdir(dist_dir) if f.endswith(ext) or (not ext and 'cluster-app' in f)]
    if not exe_files:
        print(f"❌ 未找到可执行文件")
        sys.exit(1)

    # 重命名为带版本号的文件名
    original_file = os.path.join(dist_dir, exe_files[0])
    new_filename = f"cluster-app-{version}-{platform_name}-{arch}{ext}"
    new_file = os.path.join(dist_dir, new_filename)

    if os.path.exists(new_file):
        os.remove(new_file)

    shutil.move(original_file, new_file)
    print(f"✅ 可执行文件构建完成: {new_file}")

    return new_file


def create_release_package(exe_file, version, platform_name, arch, backend_dir):
    """创建发布包"""
    print("\n" + "=" * 60)
    print("步骤 4/4: 创建发布包")
    print("=" * 60)

    # 创建 release 目录
    release_dir = os.path.join(backend_dir, "..", "release")
    os.makedirs(release_dir, exist_ok=True)

    # 复制可执行文件到 release 目录
    release_filename = os.path.basename(exe_file)
    release_file = os.path.join(release_dir, release_filename)

    shutil.copy2(exe_file, release_file)

    print(f"✅ 发布包已创建: {release_file}")
    print(f"\n📦 文件信息:")
    print(f"   文件名: {release_filename}")
    print(f"   大小: {os.path.getsize(release_file) / (1024*1024):.2f} MB")
    print(f"   路径: {release_file}")

    return release_file


def main():
    """主函数"""
    version = get_version()
    platform_name, arch, ext = get_platform_info()

    print("=" * 60)
    print("Cluster App 本地打包工具")
    print("=" * 60)
    print(f"版本: {version}")
    print(f"平台: {platform_name} ({arch})")
    print(f"系统: {platform.system()} {platform.release()}")
    print(f"Python: {platform.python_version()}")
    print("=" * 60)

    # 获取目录路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = script_dir
    cluster_dir = os.path.join(backend_dir, "..", "cluster")
    cluster_dir = os.path.abspath(cluster_dir)

    print(f"\n📁 项目路径:")
    print(f"   后端目录: {backend_dir}")
    print(f"   前端目录: {cluster_dir}")

    # 检查目录是否存在
    if not os.path.exists(cluster_dir):
        print(f"❌ 前端目录不存在: {cluster_dir}")
        sys.exit(1)

    # 执行打包步骤
    try:
        # 步骤 1: 构建前端
        build_dir = build_frontend(cluster_dir)

        # 步骤 2: 复制文件
        copy_files(build_dir, backend_dir)

        # 步骤 3: 构建可执行文件
        exe_file = build_executable(backend_dir, version, platform_name, arch, ext)

        # 步骤 4: 创建发布包
        release_file = create_release_package(exe_file, version, platform_name, arch, backend_dir)

        # 完成
        print("\n" + "=" * 60)
        print("🎉 打包完成!")
        print("=" * 60)
        print(f"\n📦 发布文件: {release_file}")
        print(f"\n💡 提示:")
        print(f"   1. 在 Windows 上运行: 双击 {os.path.basename(release_file)}")
        print(f"   2. 在 macOS 上运行: 先执行 chmod +x {os.path.basename(release_file)}，然后运行")
        print(f"\n📋 手动上传到 GitHub Release:")
        print(f"   1. 访问: https://github.com/yxying1123/LiuShiPROJECT/releases")
        print(f"   2. 点击 'Create a new release'")
        print(f"   3. 选择标签: {version}")
        print(f"   4. 上传文件: {os.path.basename(release_file)}")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\n⚠️ 用户取消操作")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
