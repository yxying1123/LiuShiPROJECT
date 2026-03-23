import pytest
import os
import sys
import tempfile
import shutil
from fastapi.testclient import TestClient

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, STORAGE_DIR


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def temp_storage_dir():
    """Create a temporary storage directory for tests."""
    temp_dir = tempfile.mkdtemp()
    original_storage = STORAGE_DIR

    # Monkey patch the storage directory
    import main
    main.STORAGE_DIR = temp_dir

    yield temp_dir

    # Cleanup
    main.STORAGE_DIR = original_storage
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def sample_csv_file():
    """Create a sample CSV file for testing."""
    content = "col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n"
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(content)
    temp_file.close()

    yield temp_file.name

    os.unlink(temp_file.name)


@pytest.fixture
def sample_csv_file_with_text():
    """Create a sample CSV file with text columns for testing."""
    content = "name,col1,col2\nAlice,1,2\nBob,3,4\nCharlie,5,6\n"
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False)
    temp_file.write(content)
    temp_file.close()

    yield temp_file.name

    os.unlink(temp_file.name)
