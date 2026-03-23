# Backend Tests

This directory contains comprehensive unit and integration tests for the cluster-End backend.

## Test Structure

```
tests/
├── conftest.py              # Test fixtures and configuration
├── test_main_basic.py       # Tests for basic endpoints (/, /files, etc.)
├── test_main_upload.py      # Tests for upload and processing endpoints
├── test_main_heatmap.py     # Tests for heatmap endpoints
├── test_main_helpers.py     # Tests for helper functions
└── test_service_reduction.py # Tests for reduction service module
```

## Running Tests

### Install Dependencies

```bash
pip install -r requirements-dev.txt
```

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html
```

### Run Specific Test File

```bash
pytest tests/test_main_basic.py
```

### Run with Verbose Output

```bash
pytest -v
```

### Run Only Fast Tests

```bash
pytest -m "not slow"
```

## Test Categories

- **Unit Tests**: Fast tests for individual functions
- **Integration Tests**: Tests for endpoint interactions
- **Slow Tests**: Tests that take longer (e.g., UMAP computation)

## Coverage Report

After running with `--cov-report=html`, open `htmlcov/index.html` to view the coverage report.

## Test Fixtures

Common fixtures are defined in `conftest.py`:

- `client`: FastAPI test client
- `temp_storage_dir`: Temporary storage directory
- `sample_csv_file`: Sample CSV file for testing

## Adding New Tests

1. Create test functions with `test_` prefix
2. Use fixtures from `conftest.py`
3. Add markers for test categories (`@pytest.mark.slow`, etc.)
4. Follow the existing naming conventions
