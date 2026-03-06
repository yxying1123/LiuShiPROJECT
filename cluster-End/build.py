#!/usr/bin/env python3
"""
Build script to package the Cluster App into a standalone executable.
This script:
1. Builds the frontend (React + Vite)
2. Packages the backend (FastAPI) with PyInstaller
3. Embeds the frontend static files into the executable
"""

import os
import sys
import shutil
import subprocess
import platform


def run_command(cmd, cwd=None, env=None):
    """Run a command and print output."""
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode != 0:
        print(f"Command failed with return code {result.returncode}")
        sys.exit(1)
    return result


def build_frontend():
    """Build the frontend React app."""
    frontend_dir = os.path.join(os.path.dirname(__file__), "..", "cluster")
    frontend_dir = os.path.abspath(frontend_dir)

    if not os.path.exists(frontend_dir):
        print(f"Frontend directory not found: {frontend_dir}")
        sys.exit(1)

    print("\n=== Building Frontend ===")

    # Install dependencies
    if os.path.exists(os.path.join(frontend_dir, "yarn.lock")):
        run_command(["yarn", "install"], cwd=frontend_dir)
    else:
        run_command(["npm", "install"], cwd=frontend_dir)

    # Build frontend
    env = os.environ.copy()
    env["NODE_ENV"] = "production"
    run_command(["npm", "run", "build"], cwd=frontend_dir, env=env)

    # Return the build output directory
    build_dir = os.path.join(frontend_dir, "build")
    if not os.path.exists(build_dir):
        # Fallback to dist if build doesn't exist
        build_dir = os.path.join(frontend_dir, "dist")

    return build_dir


def copy_frontend_to_backend(build_dir):
    """Copy frontend build files to backend for packaging."""
    backend_dir = os.path.dirname(__file__)
    static_dir = os.path.join(backend_dir, "static")

    print("\n=== Copying Frontend to Backend ===")

    # Remove old static directory if exists
    if os.path.exists(static_dir):
        shutil.rmtree(static_dir)

    # Copy new build files
    shutil.copytree(build_dir, static_dir)
    print(f"Frontend files copied to: {static_dir}")

    return static_dir


def get_platform_name():
    """Get the platform-specific name for the executable."""
    system = platform.system().lower()
    machine = platform.machine().lower()

    if system == "windows":
        return f"cluster-app-{system}-amd64.exe"
    elif system == "darwin":
        if machine == "arm64":
            return f"cluster-app-macos-arm64"
        else:
            return f"cluster-app-macos-amd64"
    elif system == "linux":
        return f"cluster-app-{system}-{machine}"
    else:
        return f"cluster-app-{system}-{machine}"


def build_executable():
    """Build the standalone executable using PyInstaller."""
    backend_dir = os.path.dirname(__file__)
    dist_dir = os.path.join(backend_dir, "dist")
    exe_name = get_platform_name()

    print("\n=== Building Executable with PyInstaller ===")

    # Clean previous builds
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    build_dir = os.path.join(backend_dir, "build")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    # 获取图标路径（支持 .png 和 .ico）
    icon_source = os.path.join(backend_dir, "..", "cluster", "public", "细胞分析.png")
    icon_source = os.path.abspath(icon_source)
    
    # 如果存在 .ico 文件则直接使用，否则使用 .png
    if os.path.exists(os.path.join(backend_dir, "..", "cluster", "public", "icon.ico")):
        icon_path = os.path.join(backend_dir, "..", "cluster", "public", "icon.ico")
    elif os.path.exists(icon_source):
        icon_path = icon_source
    else:
        icon_path = None
        print("Warning: 图标文件未找到，将使用默认图标")

    # PyInstaller command
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--name", exe_name,
        "--distpath", dist_dir,
        "--workpath", os.path.join(backend_dir, "build"),
        "--specpath", backend_dir,
    ]
    
    # Add icon if exists
    if icon_path:
        cmd.extend(["--icon", icon_path])
    
    # Add data files
    cmd.extend([
        "--add-data", f"static{os.pathsep}static",
        "--add-data", f"model{os.pathsep}model",
        "--add-data", f"service{os.pathsep}service",
        # Hidden imports for scientific libraries
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "sklearn.utils._typedefs",
        "--hidden-import", "sklearn.utils._heap",
        "--hidden-import", "sklearn.utils._sorting",
        "--hidden-import", "sklearn.utils._vector_sentinel",
        "--hidden-import", "sklearn.neighbors._partition_nodes",
        "--hidden-import", "scipy.special._special_ufuncs",
        "--hidden-import", "scipy.special.cython_special",
        "--hidden-import", "scipy.sparse.csgraph._validation",
        "--hidden-import", "scipy.sparse._csparsetools",
        "--hidden-import", "scipy.sparse.linalg._eigen.arpack._arpack",
        "--hidden-import", "scipy.sparse.linalg._propack._spropack",
        "--hidden-import", "scipy.sparse.linalg._propack._dpropack",
        "--hidden-import", "scipy.sparse.linalg._propack._cpropack",
        "--hidden-import", "scipy.sparse.linalg._propack._zpropack",
        "--hidden-import", "pynndescent",
        "--hidden-import", "numba",
        "--hidden-import", "numba.core",
        "--hidden-import", "numba.cuda",
        "--hidden-import", "fastapi",
        "--hidden-import", "fastapi.middleware.cors",
        "--hidden-import", "pandas",
        "--hidden-import", "numpy",
        "--hidden-import", "umap",
        "--hidden-import", "sklearn",
        "--hidden-import", "scipy",
        "--hidden-import", "igraph",
        "--hidden-import", "leidenalg",
        "--hidden-import", "flowkit",
        "--hidden-import", "pydantic",
        "--hidden-import", "pydantic.deprecated",
        # Collect all submodules for key packages
        "--collect-all", "scipy",
        "--collect-all", "sklearn",
        "--collect-all", "umap",
        "--collect-all", "numba",
        "--collect-all", "pynndescent",
        "--collect-all", "igraph",
        "--collect-all", "leidenalg",
        "--collect-all", "flowkit",
        # Main entry point
        os.path.join(backend_dir, "launch.py"),
    ])

    # Windows-specific options
    if platform.system().lower() == "windows":
        cmd.extend(["--noconsole"])

    run_command(cmd, cwd=backend_dir)

    # Return the path to the built executable
    exe_path = os.path.join(dist_dir, exe_name)
    return exe_path


def main():
    """Main build process."""
    print("=" * 60)
    print("Cluster App Build Script")
    print("=" * 60)

    # Step 1: Build frontend
    frontend_build = build_frontend()

    # Step 2: Copy frontend to backend
    copy_frontend_to_backend(frontend_build)

    # Step 3: Build executable
    exe_path = build_executable()

    print("\n" + "=" * 60)
    print("Build completed successfully!")
    print(f"Executable: {exe_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
