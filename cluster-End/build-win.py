#!/usr/bin/env python3
"""
Windows-specific build script for the Cluster App.

Usage:
    python build-win.py

Prerequisites:
    1. Frontend must be built first: cd ..\cluster && npm run build
    2. Static files must be copied: xcopy /E /I ..\cluster\dist static\
    3. PyInstaller must be installed: pip install pyinstaller

Note: Run this script in a Windows environment (Windows 10/11 or Wine).
"""

import os
import sys
import shutil
import subprocess
import platform


def run_command(cmd, cwd=None, env=None):
    """Run a command and print output."""
    # Safe print for Windows encoding issues
    try:
        print(f"Running: {' '.join(cmd)}")
    except UnicodeEncodeError:
        print("Running: [command with non-ASCII characters]")
    result = subprocess.run(cmd, cwd=cwd, env=env, capture_output=True, text=True)
    if result.stdout:
        try:
            print(result.stdout)
        except UnicodeEncodeError:
            print(result.stdout.encode('utf-8', errors='replace').decode('utf-8'))
    if result.stderr:
        try:
            print(result.stderr, file=sys.stderr)
        except UnicodeEncodeError:
            print(result.stderr.encode('utf-8', errors='replace').decode('utf-8'), file=sys.stderr)
    if result.returncode != 0:
        print(f"Command failed with return code {result.returncode}")
        sys.exit(1)
    return result


def build_executable():
    """Build the standalone executable using PyInstaller."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(backend_dir, "dist")
    exe_name = "cluster-app-windows-amd64.exe"

    print("\n=== Building Executable with PyInstaller ===")
    print(f"Backend directory: {backend_dir}")
    print(f"Static directory exists: {os.path.exists(os.path.join(backend_dir, 'static'))}")

    # Clean previous builds
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    build_dir = os.path.join(backend_dir, "build")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    # Copy icon to backend directory (supports .png and .ico)
    icon_source = os.path.join(backend_dir, "..", "cluster", "public", "细胞分析.png")
    icon_source = os.path.abspath(icon_source)
    icon_dest = os.path.join(backend_dir, "icon.ico")

    # Use .ico file if exists, otherwise use .png
    if os.path.exists(os.path.join(backend_dir, "..", "cluster", "public", "icon.ico")):
        icon_path = os.path.join(backend_dir, "..", "cluster", "public", "icon.ico")
    elif os.path.exists(icon_source):
        icon_path = icon_source
    else:
        icon_path = None
        print("Warning: Icon file not found, using default icon")

    # PyInstaller command for Windows
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

    # Add data files - Windows uses semicolon
    cmd.extend([
        "--add-data", "static;static",
        "--add-data", "model;model",
        "--add-data", "service;service",
        # Windows-specific options
        "--noconsole",
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
        # Collect all submodules for key packages
        "--collect-all", "scipy",
        "--collect-all", "sklearn",
        "--collect-all", "umap",
        "--collect-all", "numba",
        "--collect-all", "pynndescent",
        "--collect-all", "flowkit",
        # Main entry point
        os.path.join(backend_dir, "launch.py"),
    ])

    run_command(cmd, cwd=backend_dir)

    # Return the path to the built executable
    exe_path = os.path.join(dist_dir, exe_name)
    return exe_path


def main():
    """Main build process."""
    print("=" * 60)
    print("Cluster App Windows Build Script")
    print("=" * 60)

    # Check if static directory exists
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(backend_dir, "static")
    if not os.path.exists(static_dir):
        print("\n⚠️  Warning: static\ directory not found!")
        print("Please build the frontend first:")
        print("  cd ..\\cluster")
        print("  npm run build")
        print("  xcopy /E /I ..\\cluster\\dist static\\")
        print("\nOr run the full build script:")
        print("  python build.py")
        sys.exit(1)

    # Build executable
    exe_path = build_executable()

    print("\n" + "=" * 60)
    print("Build completed successfully!")
    print(f"Executable: {exe_path}")
    print(f"File exists: {os.path.exists(exe_path)}")
    print("\nTo run the app:")
    print(f"  {exe_path}")
    print("=" * 60)


if __name__ == "__main__":
    main()
