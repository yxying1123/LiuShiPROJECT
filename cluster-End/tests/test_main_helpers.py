"""
Tests for helper functions in main.py
"""
import pytest
import os
import json
import pandas as pd
import numpy as np

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import (
    _safe_basename,
    _resolve_storage_path,
    _unique_path,
    _file_info,
    _list_storage_files,
    _scale_matrix,
    _parse_filter_rules,
    _apply_dataframe_filters,
    FILTER_OPERATORS,
    _flat_tree,
    _linkage_to_tree,
)


class TestSafeBasename:
    """Tests for _safe_basename function."""

    def test_safe_basename_normal(self):
        """Test with normal filename."""
        assert _safe_basename("test.csv") == "test.csv"

    def test_safe_basename_with_path(self):
        """Test with path traversal attempt."""
        assert _safe_basename("/etc/passwd") == "passwd"
        assert _safe_basename("../../etc/passwd") == "passwd"

    def test_safe_basename_with_whitespace(self):
        """Test with whitespace."""
        assert _safe_basename("  test.csv  ") == "test.csv"

    def test_safe_basename_empty(self):
        """Test with empty string."""
        with pytest.raises(Exception):
            _safe_basename("")

    def test_safe_basename_none(self):
        """Test with None."""
        with pytest.raises(Exception):
            _safe_basename(None)


class TestResolveStoragePath:
    """Tests for _resolve_storage_path function."""

    def test_resolve_storage_path_normal(self, temp_storage_dir):
        """Test with normal filename."""
        import main
        main.STORAGE_DIR = temp_storage_dir

        path = _resolve_storage_path("test.csv")
        assert path == os.path.join(temp_storage_dir, "test.csv")

    def test_resolve_storage_path_path_traversal(self, temp_storage_dir):
        """Test path traversal prevention - basename strips path."""
        import main
        main.STORAGE_DIR = temp_storage_dir

        # Path traversal is prevented by _safe_basename which calls os.path.basename
        # So "../../etc/passwd" becomes "passwd"
        path = _resolve_storage_path("../../etc/passwd")
        assert path == os.path.join(temp_storage_dir, "passwd")


class TestUniquePath:
    """Tests for _unique_path function."""

    def test_unique_path_new_file(self, temp_storage_dir):
        """Test with non-existent file."""
        path = os.path.join(temp_storage_dir, "test.csv")
        assert _unique_path(path) == path

    def test_unique_path_existing_file(self, temp_storage_dir):
        """Test with existing file."""
        path = os.path.join(temp_storage_dir, "test.csv")
        with open(path, "w") as f:
            f.write("content")

        unique = _unique_path(path)
        assert unique == os.path.join(temp_storage_dir, "test_1.csv")

    def test_unique_path_multiple_existing(self, temp_storage_dir):
        """Test with multiple existing files."""
        base = os.path.join(temp_storage_dir, "test.csv")
        for i in range(3):
            path = f"{temp_storage_dir}/test_{i}.csv" if i > 0 else base
            with open(path, "w") as f:
                f.write("content")

        unique = _unique_path(base)
        assert unique == os.path.join(temp_storage_dir, "test_3.csv")


class TestFileInfo:
    """Tests for _file_info function."""

    def test_file_info(self, temp_storage_dir):
        """Test getting file info."""
        path = os.path.join(temp_storage_dir, "test.csv")
        with open(path, "w") as f:
            f.write("test content")

        info = _file_info(path)

        assert info["name"] == "test.csv"
        assert info["size"] == len("test content")
        assert "modified" in info


class TestListStorageFiles:
    """Tests for _list_storage_files function."""

    def test_list_empty_storage(self, temp_storage_dir):
        """Test listing empty storage."""
        import main
        main.STORAGE_DIR = temp_storage_dir

        files = _list_storage_files()
        assert files == []

    def test_list_storage_with_files(self, temp_storage_dir):
        """Test listing storage with files."""
        import main
        main.STORAGE_DIR = temp_storage_dir

        # Create test files
        for name in ["b.csv", "a.csv", "c.csv"]:
            path = os.path.join(temp_storage_dir, name)
            with open(path, "w") as f:
                f.write("content")

        files = _list_storage_files()

        assert len(files) == 3
        # Should be sorted by modified time (descending)
        names = [f["name"] for f in files]
        assert set(names) == {"a.csv", "b.csv", "c.csv"}


class TestScaleMatrix:
    """Tests for _scale_matrix function."""

    def test_scale_column(self):
        """Test column scaling."""
        df = pd.DataFrame({
            "col1": [1, 2, 3, 4, 5],
            "col2": [10, 20, 30, 40, 50],
        })

        scaled = _scale_matrix(df, "column")

        # Mean should be approximately 0
        assert abs(scaled["col1"].mean()) < 1e-10
        assert abs(scaled["col2"].mean()) < 1e-10

    def test_scale_row(self):
        """Test row scaling."""
        df = pd.DataFrame({
            "col1": [1, 2, 3],
            "col2": [10, 20, 30],
        })

        scaled = _scale_matrix(df, "row")

        # Each row should have mean approximately 0
        for idx in scaled.index:
            assert abs(scaled.loc[idx].mean()) < 1e-10

    def test_scale_none(self):
        """Test no scaling."""
        df = pd.DataFrame({"col1": [1, 2, 3], "col2": [4, 5, 6]})

        scaled = _scale_matrix(df, "none")

        pd.testing.assert_frame_equal(scaled, df)

    def test_scale_invalid(self):
        """Test invalid scale option."""
        df = pd.DataFrame({"col1": [1, 2, 3]})

        with pytest.raises(ValueError) as exc_info:
            _scale_matrix(df, "invalid")
        assert "Unsupported scale" in str(exc_info.value)


class TestParseFilterRules:
    """Tests for _parse_filter_rules function."""

    def test_parse_empty_rules(self):
        """Test parsing empty rules."""
        assert _parse_filter_rules(None) == []
        assert _parse_filter_rules("") == []
        assert _parse_filter_rules([]) == []

    def test_parse_valid_rules(self):
        """Test parsing valid rules."""
        rules = [
            {"column": "col1", "operator": ">", "value": "5"},
            {"column": "col2", "operator": "<=", "value": "10"},
        ]

        parsed = _parse_filter_rules(rules)

        assert len(parsed) == 2
        assert parsed[0] == {"column": "col1", "operator": ">", "value": 5.0}
        assert parsed[1] == {"column": "col2", "operator": "<=", "value": 10.0}

    def test_parse_json_string(self):
        """Test parsing JSON string."""
        rules_json = '[{"column": "col1", "operator": ">", "value": "5"}]'

        parsed = _parse_filter_rules(rules_json)

        assert len(parsed) == 1
        assert parsed[0]["column"] == "col1"

    def test_parse_invalid_json(self):
        """Test parsing invalid JSON."""
        with pytest.raises(Exception):
            _parse_filter_rules("invalid json")

    def test_parse_invalid_rule_format(self):
        """Test parsing invalid rule format."""
        with pytest.raises(Exception):
            _parse_filter_rules("not a list")

    def test_parse_incomplete_rule(self):
        """Test parsing incomplete rule."""
        rules = [{"column": "col1"}]  # Missing operator and value

        with pytest.raises(Exception):
            _parse_filter_rules(rules)


class TestApplyDataframeFilters:
    """Tests for _apply_dataframe_filters function."""

    def test_apply_filters_basic(self):
        """Test applying basic filters."""
        df = pd.DataFrame({
            "col1": [1, 2, 3, 4, 5],
            "col2": ["a", "b", "c", "d", "e"],
        })

        filters = [{"column": "col1", "operator": ">", "value": "2"}]
        filtered = _apply_dataframe_filters(df, filters)

        assert len(filtered) == 3
        assert all(filtered["col1"] > 2)

    def test_apply_multiple_filters(self):
        """Test applying multiple filters."""
        df = pd.DataFrame({
            "col1": [1, 2, 3, 4, 5],
            "col2": [10, 20, 30, 40, 50],
        })

        filters = [
            {"column": "col1", "operator": ">=", "value": "2"},  # Matches rows 2,3,4 (values 2,3,4)
            {"column": "col2", "operator": "<", "value": "40"},  # Matches rows 0,1,2 (values 10,20,30)
        ]
        filtered = _apply_dataframe_filters(df, filters)

        # Intersection: row 2 only (col1=3, col2=30)
        # Actually: row index 2 (col1=3, col2=30) is the only match
        assert len(filtered) == 2  # Rows with indices 1,2 (col1=2,3 and col2=20,30)
        assert all(filtered["col1"] >= 2)
        assert all(filtered["col2"] < 40)

    def test_apply_filter_no_match(self):
        """Test filter that matches nothing."""
        df = pd.DataFrame({"col1": [1, 2, 3]})

        filters = [{"column": "col1", "operator": ">", "value": "100"}]

        with pytest.raises(Exception) as exc_info:
            _apply_dataframe_filters(df, filters)
        assert "筛选后无可用数据" in str(exc_info.value)

    def test_apply_filter_nonexistent_column(self):
        """Test filter on non-existent column."""
        df = pd.DataFrame({"col1": [1, 2, 3]})

        filters = [{"column": "nonexistent", "operator": ">", "value": "0"}]

        with pytest.raises(Exception) as exc_info:
            _apply_dataframe_filters(df, filters)
        assert "筛选列不存在" in str(exc_info.value)


class TestFilterOperators:
    """Tests for FILTER_OPERATORS."""

    def test_operators(self):
        """Test all filter operators."""
        series = pd.Series([1, 2, 3, 4, 5])

        # Test =
        result = FILTER_OPERATORS["="](series, 3)
        assert result.tolist() == [False, False, True, False, False]

        # Test ==
        result = FILTER_OPERATORS["=="](series, 3)
        assert result.tolist() == [False, False, True, False, False]

        # Test >
        result = FILTER_OPERATORS[">"](series, 3)
        assert result.tolist() == [False, False, False, True, True]

        # Test <
        result = FILTER_OPERATORS["<"](series, 3)
        assert result.tolist() == [True, True, False, False, False]

        # Test >=
        result = FILTER_OPERATORS[">="](series, 3)
        assert result.tolist() == [False, False, True, True, True]

        # Test <=
        result = FILTER_OPERATORS["<="](series, 3)
        assert result.tolist() == [True, True, True, False, False]


class TestTreeFunctions:
    """Tests for tree-related functions."""

    def test_flat_tree(self):
        """Test _flat_tree function."""
        labels = ["A", "B", "C"]
        tree = _flat_tree(labels)

        assert tree["name"] == "root"
        assert len(tree["children"]) == 3
        assert tree["children"][0]["name"] == "A"
        assert tree["children"][1]["name"] == "B"
        assert tree["children"][2]["name"] == "C"

    def test_linkage_to_tree(self):
        """Test _linkage_to_tree function."""
        # Simple linkage matrix: 2 leaf nodes merged
        linkage_matrix = np.array([
            [0, 1, 1.0, 2],  # Merge leaf 0 and 1
        ])
        labels = ["A", "B"]

        tree = _linkage_to_tree(linkage_matrix, labels)

        assert tree["name"] == "root"
        assert "children" in tree
        assert len(tree["children"]) == 2
