"""
Tests for basic endpoints in main.py
"""
import pytest
import os


class TestRootEndpoint:
    """Tests for the root endpoint."""

    def test_root_endpoint(self, client):
        """Test the root endpoint returns expected message."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Hello World"
        assert "time" in data


class TestFileListEndpoint:
    """Tests for the file list endpoint."""

    def test_list_files_empty(self, client, temp_storage_dir):
        """Test listing files when storage is empty."""
        response = client.get("/files")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert data["data"]["files"] == []

    def test_list_files_with_files(self, client, temp_storage_dir):
        """Test listing files when storage has files."""
        # Create a test file
        test_file = os.path.join(temp_storage_dir, "test.csv")
        with open(test_file, "w") as f:
            f.write("col1,col2\n1,2\n")

        response = client.get("/files")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert len(data["data"]["files"]) == 1
        assert data["data"]["files"][0]["name"] == "test.csv"
        assert "size" in data["data"]["files"][0]
        assert "modified" in data["data"]["files"][0]


class TestFileUploadEndpoint:
    """Tests for the file upload endpoint."""

    def test_upload_single_file(self, client, temp_storage_dir):
        """Test uploading a single file."""
        content = b"col1,col2\n1,2\n3,4\n"
        response = client.post(
            "/files/upload",
            files={"files": ("test.csv", content, "text/csv")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert len(data["data"]["files"]) == 1
        assert data["data"]["files"][0]["name"] == "test.csv"

    def test_upload_multiple_files(self, client, temp_storage_dir):
        """Test uploading multiple files."""
        content1 = b"col1,col2\n1,2\n"
        content2 = b"col1,col2\n3,4\n"
        response = client.post(
            "/files/upload",
            files=[
                ("files", ("test1.csv", content1, "text/csv")),
                ("files", ("test2.csv", content2, "text/csv")),
            ],
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert len(data["data"]["files"]) == 2

    def test_upload_no_files(self, client):
        """Test uploading with no files."""
        response = client.post("/files/upload")
        # FastAPI returns 422 for validation errors
        assert response.status_code in [400, 422]
        data = response.json()
        # Error message may vary based on validation

    def test_upload_invalid_extension(self, client):
        """Test uploading file with invalid extension."""
        content = b"invalid content"
        response = client.post(
            "/files/upload",
            files={"files": ("test.exe", content, "application/octet-stream")},
        )
        assert response.status_code == 400
        data = response.json()
        assert "不支持的文件类型" in data["detail"]

    def test_upload_txt_file(self, client, temp_storage_dir):
        """Test uploading a .txt file."""
        content = b"col1 col2\n1 2\n"
        response = client.post(
            "/files/upload",
            files={"files": ("test.txt", content, "text/plain")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200


class TestFileDeleteEndpoint:
    """Tests for the file delete endpoint."""

    def test_delete_existing_file(self, client, temp_storage_dir):
        """Test deleting an existing file."""
        # Create a test file
        test_file = os.path.join(temp_storage_dir, "test.csv")
        with open(test_file, "w") as f:
            f.write("col1,col2\n1,2\n")

        response = client.delete("/files/test.csv")
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert data["data"]["name"] == "test.csv"
        assert not os.path.exists(test_file)

    def test_delete_nonexistent_file(self, client):
        """Test deleting a non-existent file."""
        response = client.delete("/files/nonexistent.csv")
        assert response.status_code == 404
        data = response.json()
        assert "文件不存在" in data["detail"]

    def test_delete_file_with_special_chars(self, client, temp_storage_dir):
        """Test deleting file with URL-encoded name."""
        # Create a test file with spaces
        test_file = os.path.join(temp_storage_dir, "test file.csv")
        with open(test_file, "w") as f:
            f.write("col1,col2\n1,2\n")

        response = client.delete("/files/test%20file.csv")
        assert response.status_code == 200
        data = response.json()
        assert data["data"]["name"] == "test file.csv"


class TestFileDownloadEndpoint:
    """Tests for the file download endpoint."""

    def test_download_existing_file(self, client, temp_storage_dir):
        """Test downloading an existing file."""
        # Create a test file
        test_file = os.path.join(temp_storage_dir, "test.csv")
        content = "col1,col2\n1,2\n"
        with open(test_file, "w") as f:
            f.write(content)

        response = client.get("/files/download/test.csv")
        assert response.status_code == 200
        assert response.content.decode() == content
        assert response.headers["content-disposition"] == 'attachment; filename="test.csv"'

    def test_download_nonexistent_file(self, client):
        """Test downloading a non-existent file."""
        response = client.get("/files/download/nonexistent.csv")
        assert response.status_code == 404
        data = response.json()
        assert "文件不存在" in data["detail"]


class TestFileMetadataEndpoint:
    """Tests for the file metadata endpoint."""

    def test_get_metadata_single_file(self, client, temp_storage_dir):
        """Test getting metadata for a single file."""
        # Create a test file
        test_file = os.path.join(temp_storage_dir, "test.csv")
        with open(test_file, "w") as f:
            f.write("col1,col2,col3\n1,2,3\n4,5,6\n")

        response = client.post(
            "/files/metadata",
            json={"names": ["test.csv"], "limit": 100},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["code"] == 200
        assert len(data["data"]["files"]) == 1
        file_data = data["data"]["files"][0]
        assert file_data["name"] == "test.csv"
        assert "columns" in file_data
        assert "numericColumns" in file_data
        assert set(file_data["columns"]) == {"col1", "col2", "col3"}
        assert set(file_data["numericColumns"]) == {"col1", "col2", "col3"}

    def test_get_metadata_multiple_files(self, client, temp_storage_dir):
        """Test getting metadata for multiple files."""
        # Create test files
        for i in range(2):
            test_file = os.path.join(temp_storage_dir, f"test{i}.csv")
            with open(test_file, "w") as f:
                f.write(f"col{i},col{i+1}\n1,2\n")

        response = client.post(
            "/files/metadata",
            json={"names": ["test0.csv", "test1.csv"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["files"]) == 2

    def test_get_metadata_nonexistent_file(self, client):
        """Test getting metadata for a non-existent file."""
        response = client.post(
            "/files/metadata",
            json={"names": ["nonexistent.csv"]},
        )
        assert response.status_code == 404

    def test_get_metadata_no_names(self, client):
        """Test getting metadata with no file names."""
        response = client.post("/files/metadata", json={})
        assert response.status_code == 400
        data = response.json()
        assert "请提供文件名列表" in data["detail"]

    def test_get_metadata_string_name(self, client, temp_storage_dir):
        """Test getting metadata with a single string name."""
        test_file = os.path.join(temp_storage_dir, "test.csv")
        with open(test_file, "w") as f:
            f.write("col1,col2\n1,2\n")

        response = client.post(
            "/files/metadata",
            json={"names": "test.csv"},
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]["files"]) == 1
