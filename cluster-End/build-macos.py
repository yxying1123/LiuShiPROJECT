#!/usr/bin/env python3
"""
macOS-specific build script for the Cluster App.
Assumes frontend is already built and copied to static/ directory.
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


def build_executable(arch):
    """Build the standalone executable using PyInstaller."""
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dist_dir = os.path.join(backend_dir, "dist")
    exe_name = f"cluster-app-macos-{arch}"

    print("\n=== Building Executable with PyInstaller ===")
    print(f"Backend directory: {backend_dir}")
    print(f"Static directory exists: {os.path.exists(os.path.join(backend_dir, 'static'))}")

    # Clean previous builds
    if os.path.exists(dist_dir):
        shutil.rmtree(dist_dir)
    build_dir = os.path.join(backend_dir, "build")
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir)

    # PyInstaller command for macOS
    cmd = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onefile",
        "--name", exe_name,
        "--distpath", dist_dir,
        "--workpath", os.path.join(backend_dir, "build"),
        "--specpath", backend_dir,
        # Add data files - macOS uses colon
        "--add-data", f"static:static",
        "--add-data", f"model:model",
        "--add-data", f"service:service",
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
        # Main entry point
        os.path.join(backend_dir, "launch.py"),
    ]

    run_command(cmd, cwd=backend_dir)

    # Return the path to the built executable
    exe_path = os.path.join(dist_dir, exe_name)
    return exe_path


def main():
    """Main build process."""
    # Get architecture from command line argument
    arch = sys.argv[1] if len(sys.argv) > 1 else "arm64"

    print("=" * 60)
    print("Cluster App macOS Build Script")
    print(f"Architecture: {arch}")
    print("=" * 60)

    # Build executable
    exe_path = build_executable(arch)

    print("\n" + "=" * 60)
    print("Build completed successfully!")
    print(f"Executable: {exe_path}")
    print(f"File exists: {os.path.exists(exe_path)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
