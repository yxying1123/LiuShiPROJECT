#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将扩展版 Markdown 用户手册转换为 DOCX（基于模板）。
"""

from pathlib import Path

from convert_manual_md_to_docx import convert


ROOT = Path("/Users/yangxiaoyu/学习/all/all-projectR")
INPUT_MD = ROOT / "doc" / "cluster系统用户手册-扩展版.md"
TEMPLATE_DOCX = ROOT / "doc" / "用户手册模版.docx"
OUTPUT_DOCX = ROOT / "doc" / "cluster系统用户手册-扩展版.docx"


if __name__ == "__main__":
    convert(INPUT_MD, OUTPUT_DOCX, TEMPLATE_DOCX)
    print(f"已生成: {OUTPUT_DOCX}")
