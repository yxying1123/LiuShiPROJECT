"""
Tests for the reduction service module
"""
import pytest
import numpy as np
import pandas as pd
from io import BytesIO

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from service.reduction import (
    load_and_sample,
    load_and_sample_xy,
    run_umap,
    run_phenograph,
    _apply_filters,
)


class TestLoadAndSample:
    """Tests for load_and_sample function."""

    def test_load_and_sample_basic(self, tmp_path):
        """Test basic file loading and sampling."""
        # Create a test CSV file
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n10,11,12\n")

        df, sam = load_and_sample([str(csv_file)], 2, ["col1", "col2"])

        assert isinstance(df, pd.DataFrame)
        assert df.shape[0] <= 2
        assert list(df.columns) == ["col1", "col2"]
        assert len(sam) == df.shape[0]
        assert all(s == "test.csv" for s in sam)

    def test_load_and_sample_all_rows(self, tmp_path):
        """Test loading all rows when lineNum <= 0."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n1,2\n3,4\n5,6\n")

        df, sam = load_and_sample([str(csv_file)], 0, ["col1", "col2"])

        assert df.shape[0] == 3
        assert len(sam) == 3

    def test_load_and_sample_multiple_files(self, tmp_path):
        """Test loading from multiple files."""
        csv1 = tmp_path / "file1.csv"
        csv1.write_text("col1,col2\n1,2\n3,4\n")
        csv2 = tmp_path / "file2.csv"
        csv2.write_text("col1,col2\n5,6\n7,8\n")

        df, sam = load_and_sample([str(csv1), str(csv2)], 1, ["col1", "col2"])

        assert df.shape[0] <= 2  # 1 sample from each file
        assert len(sam) == df.shape[0]

    def test_load_and_sample_nonexistent_column(self, tmp_path):
        """Test loading with non-existent column."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n1,2\n3,4\n")

        # Should raise ValueError when no valid columns
        with pytest.raises(ValueError):
            load_and_sample([str(csv_file)], 2, ["nonexistent"])

    def test_load_and_sample_empty_file(self, tmp_path):
        """Test loading from empty file."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n")

        with pytest.raises(ValueError):
            load_and_sample([str(csv_file)], 2, ["col1", "col2"])

    def test_load_and_sample_return_all(self, tmp_path):
        """Test load_and_sample with return_all=True."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2,col3\n1,2,3\n4,5,6\n7,8,9\n")

        df_reduction, df_full, sam = load_and_sample(
            [str(csv_file)], 2, ["col1", "col2"], return_all=True
        )

        assert isinstance(df_reduction, pd.DataFrame)
        assert isinstance(df_full, pd.DataFrame)
        assert df_reduction.shape[1] == 2  # Only selected columns
        assert df_full.shape[1] == 3  # All columns

    def test_load_and_sample_with_filters(self, tmp_path):
        """Test load_and_sample with filter conditions."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n1,10\n5,20\n10,30\n15,40\n20,50\n")

        filters = [{"column": "col1", "operator": ">", "value": "5"}]
        df, sam = load_and_sample([str(csv_file)], 10, ["col1", "col2"], filters=filters)

        assert isinstance(df, pd.DataFrame)
        # Should only have rows where col1 > 5
        assert all(df["col1"] > 5)
        assert df.shape[0] == 3  # 10, 15, 20

    def test_load_and_sample_with_multiple_filters(self, tmp_path):
        """Test load_and_sample with multiple filter conditions."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n1,10\n5,20\n10,30\n15,40\n20,50\n")

        filters = [
            {"column": "col1", "operator": ">=", "value": "5"},
            {"column": "col2", "operator": "<=", "value": "40"},
        ]
        df, sam = load_and_sample([str(csv_file)], 10, ["col1", "col2"], filters=filters)

        assert isinstance(df, pd.DataFrame)
        # Should have rows where col1 >= 5 AND col2 <= 40
        assert all(df["col1"] >= 5)
        assert all(df["col2"] <= 40)
        assert df.shape[0] == 3  # 5,20; 10,30; 15,40

    def test_load_and_sample_with_filter_no_match(self, tmp_path):
        """Test load_and_sample with filter that matches no rows."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("col1,col2\n1,10\n2,20\n3,30\n")

        filters = [{"column": "col1", "operator": ">", "value": "100"}]

        # Should raise ValueError when no data matches filters
        with pytest.raises(ValueError):
            load_and_sample([str(csv_file)], 10, ["col1", "col2"], filters=filters)


class TestLoadAndSampleXY:
    """Tests for load_and_sample_xy function."""

    def test_load_and_sample_xy_basic(self, tmp_path):
        """Test basic XY loading."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("x_col,y_col,other\n1,2,3\n4,5,6\n7,8,9\n")

        df, sam = load_and_sample_xy([str(csv_file)], 2, "x_col", "y_col")

        assert isinstance(df, pd.DataFrame)
        assert df.shape[0] <= 2
        assert "x_col" in df.columns
        assert "y_col" in df.columns
        assert len(sam) == df.shape[0]

    def test_load_and_sample_xy_all_rows(self, tmp_path):
        """Test XY loading with all rows."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("x,y\n1,2\n3,4\n5,6\n")

        df, sam = load_and_sample_xy([str(csv_file)], 0, "x", "y")

        assert df.shape[0] == 3

    def test_load_and_sample_xy_missing_columns(self, tmp_path):
        """Test XY loading with missing columns."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("a,b\n1,2\n")

        with pytest.raises(ValueError):
            load_and_sample_xy([str(csv_file)], 2, "x", "y")

    def test_load_and_sample_xy_with_filters(self, tmp_path):
        """Test XY loading with filter conditions."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("x,y,filter_col\n1,2,10\n3,4,20\n5,6,30\n7,8,40\n")

        filters = [{"column": "filter_col", "operator": ">=", "value": "20"}]
        df, sam = load_and_sample_xy([str(csv_file)], 10, "x", "y", filters=filters)

        assert isinstance(df, pd.DataFrame)
        assert "x" in df.columns
        assert "y" in df.columns
        # Should only have rows where filter_col >= 20
        assert all(df["filter_col"] >= 20)
        assert df.shape[0] == 3  # 3,4,20; 5,6,30; 7,8,40

    def test_load_and_sample_xy_with_multiple_filters(self, tmp_path):
        """Test XY loading with multiple filter conditions."""
        csv_file = tmp_path / "test.csv"
        csv_file.write_text("x,y,col1,col2\n1,2,10,100\n3,4,20,200\n5,6,30,300\n7,8,40,400\n")

        filters = [
            {"column": "col1", "operator": ">", "value": "15"},
            {"column": "col2", "operator": "<", "value": "350"},
        ]
        df, sam = load_and_sample_xy([str(csv_file)], 10, "x", "y", filters=filters)

        assert isinstance(df, pd.DataFrame)
        # Should have rows where col1 > 15 AND col2 < 350
        assert all(df["col1"] > 15)
        assert all(df["col2"] < 350)
        assert df.shape[0] == 2  # 3,4,20,200; 5,6,30,300


class TestApplyFilters:
    """Tests for _apply_filters function."""

    def test_apply_filters_greater_than(self):
        """Test filter with > operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 15, 20], "col2": [2, 4, 6, 8, 10]})
        filters = [{"column": "col1", "operator": ">", "value": "5"}]

        result = _apply_filters(df, filters)

        assert len(result) == 3
        assert all(result["col1"] > 5)

    def test_apply_filters_less_than(self):
        """Test filter with < operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 15, 20]})
        filters = [{"column": "col1", "operator": "<", "value": "10"}]

        result = _apply_filters(df, filters)

        assert len(result) == 2
        assert all(result["col1"] < 10)

    def test_apply_filters_equal(self):
        """Test filter with = operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 5, 20]})
        filters = [{"column": "col1", "operator": "=", "value": "5"}]

        result = _apply_filters(df, filters)

        assert len(result) == 2
        assert all(result["col1"] == 5)

    def test_apply_filters_not_equal(self):
        """Test filter with != operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 5, 20]})
        filters = [{"column": "col1", "operator": "!=", "value": "5"}]

        result = _apply_filters(df, filters)

        assert len(result) == 3
        assert all(result["col1"] != 5)

    def test_apply_filters_greater_equal(self):
        """Test filter with >= operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 15, 20]})
        filters = [{"column": "col1", "operator": ">=", "value": "10"}]

        result = _apply_filters(df, filters)

        assert len(result) == 3
        assert all(result["col1"] >= 10)

    def test_apply_filters_less_equal(self):
        """Test filter with <= operator."""
        df = pd.DataFrame({"col1": [1, 5, 10, 15, 20]})
        filters = [{"column": "col1", "operator": "<=", "value": "10"}]

        result = _apply_filters(df, filters)

        assert len(result) == 3
        assert all(result["col1"] <= 10)

    def test_apply_filters_multiple_conditions(self):
        """Test filter with multiple conditions (AND logic)."""
        df = pd.DataFrame({"col1": [1, 5, 10, 15, 20], "col2": [10, 20, 30, 40, 50]})
        filters = [
            {"column": "col1", "operator": ">=", "value": "5"},
            {"column": "col2", "operator": "<=", "value": "40"},
        ]

        result = _apply_filters(df, filters)

        assert len(result) == 3
        assert all(result["col1"] >= 5)
        assert all(result["col2"] <= 40)

    def test_apply_filters_empty_filters(self):
        """Test filter with empty filters list."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        result = _apply_filters(df, [])

        assert len(result) == 3
        assert result.equals(df)

    def test_apply_filters_none_filters(self):
        """Test filter with None filters."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        result = _apply_filters(df, None)

        assert len(result) == 3
        assert result.equals(df)

    def test_apply_filters_nonexistent_column(self):
        """Test filter with non-existent column."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        filters = [{"column": "nonexistent", "operator": ">", "value": "1"}]

        result = _apply_filters(df, filters)

        # Should return original dataframe when column doesn't exist
        assert len(result) == 3

    def test_apply_filters_invalid_value(self):
        """Test filter with invalid value."""
        df = pd.DataFrame({"col1": [1, 2, 3]})
        filters = [{"column": "col1", "operator": ">", "value": "invalid"}]

        result = _apply_filters(df, filters)

        # Should return original dataframe when value is invalid
        assert len(result) == 3


class TestRunUmap:
    """Tests for run_umap function."""

    def test_run_umap_basic(self):
        """Test basic UMAP reduction."""
        # Create sample data
        data = pd.DataFrame({
            "col1": [1, 2, 3, 4, 5],
            "col2": [2, 4, 6, 8, 10],
            "col3": [3, 6, 9, 12, 15],
        })

        params = {
            "n_neighbors": 2,
            "min_dist": 0.1,
            "n_jobs": 1,
        }

        result = run_umap(data, params)

        assert isinstance(result, pd.DataFrame)
        assert result.shape == (5, 2)
        assert list(result.columns) == ["xColumn", "yColumn"]

    def test_run_umap_single_row(self):
        """Test UMAP with single row."""
        data = pd.DataFrame({"col1": [1], "col2": [2]})

        params = {"n_neighbors": 2, "min_dist": 0.1}

        # UMAP requires at least n_neighbors + 1 samples
        # This should either work or raise an appropriate error
        try:
            result = run_umap(data, params)
            assert isinstance(result, pd.DataFrame)
        except Exception as e:
            # Expected to fail with insufficient data
            assert "samples" in str(e).lower() or "neighbors" in str(e).lower()

    def test_run_umap_large_dataset(self):
        """Test UMAP with larger dataset."""
        np.random.seed(42)
        data = pd.DataFrame(np.random.randn(100, 10))

        params = {
            "n_neighbors": 15,
            "min_dist": 0.001,
            "n_jobs": 1,
        }

        result = run_umap(data, params)

        assert isinstance(result, pd.DataFrame)
        assert result.shape == (100, 2)


class TestRunPhenograph:
    """Tests for run_phenograph function."""

    def test_run_phenograph_basic(self):
        """Test basic Phenograph clustering."""
        # Create sample data with clear clusters
        np.random.seed(42)
        cluster1 = np.random.randn(20, 2) + [0, 0]
        cluster2 = np.random.randn(20, 2) + [10, 10]
        data = pd.DataFrame(np.vstack([cluster1, cluster2]))

        communities, q_value = run_phenograph(data, k=10)

        assert isinstance(communities, np.ndarray)
        assert len(communities) == 40
        assert isinstance(q_value, float)
        # Should find at least 2 communities
        assert len(np.unique(communities)) >= 2

    def test_run_phenograph_small_dataset(self):
        """Test Phenograph with small dataset."""
        data = pd.DataFrame({
            "col1": [1, 2, 3],
            "col2": [2, 4, 6],
        })

        communities, q_value = run_phenograph(data, k=2)

        assert isinstance(communities, np.ndarray)
        assert len(communities) == 3

    def test_run_phenograph_two_samples(self):
        """Test Phenograph with only 2 samples."""
        data = pd.DataFrame({
            "col1": [1, 2],
            "col2": [2, 4],
        })

        communities, q_value = run_phenograph(data, k=2)

        assert isinstance(communities, np.ndarray)
        assert len(communities) == 2
        # With only 2 samples, should assign to same cluster
        assert len(np.unique(communities)) == 1
        assert q_value == 0.0

    def test_run_phenograph_single_sample(self):
        """Test Phenograph with single sample."""
        data = pd.DataFrame({"col1": [1], "col2": [2]})

        communities, q_value = run_phenograph(data, k=2)

        assert isinstance(communities, np.ndarray)
        assert len(communities) == 1
        assert communities[0] == 0
        assert q_value == 0.0

    def test_run_phenograph_custom_params(self):
        """Test Phenograph with custom parameters."""
        np.random.seed(42)
        data = pd.DataFrame(np.random.randn(50, 5))

        communities, q_value = run_phenograph(
            data,
            k=10,
            resolution=1.5,
            n_iterations=10,
            seed=42,
        )

        assert isinstance(communities, np.ndarray)
        assert len(communities) == 50
        assert isinstance(q_value, float)
