#!/usr/bin/env python3
"""
Launch script for the packaged Cluster App.
This script serves as the entry point for the PyInstaller executable.
It starts the FastAPI backend and serves the frontend static files.
"""

import os
import sys
import webbrowser
import threading
import time
from pathlib import Path

# Determine if we're running from a PyInstaller bundle
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    BASE_DIR = Path(sys._MEIPASS)
else:
    # Running in a normal Python environment
    BASE_DIR = Path(__file__).parent

# Add the base directory to Python path for imports
sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, File, Form, HTTPException, Request, Body, UploadFile
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn

# Import main app modules
from main import app as main_app, STORAGE_DIR, ALLOWED_EXTENSIONS
from model.ResponseModel import ResponseModel
import shutil
from urllib.parse import unquote

# Create a new FastAPI app for the bundled version
app = FastAPI(title="Cluster App", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all routes from main app
# We need to manually add each route because we can't easily merge routers
from main import (
    root, list_files, upload_files, delete_file, download_file,
    files_metadata, files_metadata_all, upload_file, upload_xy,
    upload_flow_merge, select, cluster, heatmap_cluster_tree_points
)

# Register all routes
app.get("/")(root)
app.get("/files")(list_files)
app.post("/files/upload")(upload_files)
app.delete("/files/{filename}")(delete_file)
app.get("/files/download/{filename}")(download_file)
app.post("/files/metadata")(files_metadata)
app.get("/files/metadata/all")(files_metadata_all)
app.post("/upload/file")(upload_file)
app.post("/upload/xy")(upload_xy)
app.post("/upload/flow/merge")(upload_flow_merge)
app.post("/select")(select)
app.post("/cluster")(cluster)
app.post("/heatmap/cluster-tree/points")(heatmap_cluster_tree_points)

# Copy exception handler from main
from main import http_exception_handler
app.exception_handler(Exception)(http_exception_handler)

# Mount static files (frontend)
static_dir = BASE_DIR / "static"
if static_dir.exists():
    app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve the frontend SPA."""
        # API routes should be handled by the registered routes above
        # This catches all other paths and serves the index.html
        file_path = static_dir / full_path

        # If the file exists and is not a directory, serve it
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))

        # Otherwise, serve index.html for client-side routing
        index_path = static_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))

        return {"error": "Frontend not found"}
else:
    @app.get("/{full_path:path}")
    async def no_frontend(full_path: str):
        return {"error": "Frontend static files not found. Please rebuild the application."}


def get_free_port():
    """Find a free port to use."""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.listen(1)
        port = s.getsockname()[1]
    return port


def open_browser(url, delay=2):
    """Open the browser after a delay."""
    time.sleep(delay)
    webbrowser.open(url)


def main():
    """Main entry point."""
    # Ensure storage directory exists
    os.makedirs(STORAGE_DIR, exist_ok=True)

    # Get port (use 8000 by default, or find a free one)
    port = int(os.environ.get("PORT", 8000))

    # Try to use the specified port, if not available find a free one
    import socket
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', port))
    except socket.error:
        print(f"Port {port} is in use, finding a free port...")
        port = get_free_port()

    host = "127.0.0.1"
    url = f"http://{host}:{port}"

    print("=" * 60)
    print("Cluster App is starting...")
    print(f"Open your browser and navigate to: {url}")
    print("=" * 60)

    # Open browser in a separate thread
    threading.Thread(target=open_browser, args=(url, 3), daemon=True).start()

    # Start the server
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="info",
        access_log=False
    )


if __name__ == "__main__":
    main()
