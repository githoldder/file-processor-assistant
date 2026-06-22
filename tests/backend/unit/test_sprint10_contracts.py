import os
import asyncio
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.routers import files, folders
from app.services.conversion_capabilities import get_capabilities
from app.services import preview


def test_capabilities_cover_sprint10_matrix():
    keys = {cap["key"] for cap in get_capabilities()}

    assert {
        "svg_to_png",
        "svg_to_pdf",
        "png_to_svg",
        "png_to_ico",
        "png_to_pdf",
        "jpg_to_pdf",
        "jpeg_to_pdf",
        "markdown_to_pdf",
        "markdown_to_html",
        "markdown_to_word",
        "word_to_markdown",
        "pdf_to_images",
    }.issubset(keys)


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("/reports//phase-1/", "reports/phase-1"),
        ("reports/phase-1", "reports/phase-1"),
        ("", ""),
    ],
)
def test_path_sanitizers_compress_slashes(raw, expected):
    assert files._sanitize_path(raw) == expected
    assert folders._sanitize_path(raw) == expected


@pytest.mark.parametrize("raw", ["../secret", "reports/../secret"])
def test_path_sanitizers_reject_traversal(raw):
    with pytest.raises(HTTPException):
        files._sanitize_path(raw)
    with pytest.raises(HTTPException):
        folders._sanitize_path(raw)


def test_keep_markers_are_folders_not_files():
    marker = SimpleNamespace(object_name="reports/.keep", size=0, last_modified=None)

    assert files._is_folder(marker)
    assert files._is_system_prefix(marker.object_name)
    assert files._build_folder_entry(marker)["path"] == "reports"


def test_preview_raw_stream_returns_callable_iterator(tmp_path):
    sample = tmp_path / "sample.pdf"
    sample.write_bytes(b"%PDF-1.4\n")
    stat = SimpleNamespace(size=sample.stat().st_size)

    class FakeResponse:
        def stream(self, _chunk_size):
            yield sample.read_bytes()

        def close(self):
            pass

        def release_conn(self):
            pass

    class FakeClient:
        def stat_object(self, _bucket, _object_name):
            return stat

        def get_object(self, _bucket, _object_name):
            return FakeResponse()

    with patch.object(preview, "BUCKET", "test-bucket"):
        result = asyncio.run(preview._stream_raw(FakeClient(), "sample.pdf"))

    assert result is not None
    result_stat, iter_content, content_type = result
    assert result_stat.size == os.path.getsize(sample)
    assert callable(iter_content)
    assert b"".join(iter_content()).startswith(b"%PDF")
    assert content_type == "application/pdf"


def test_display_name_uuid_cleanup():
    assert files._display_name("uploads/12345678-1234-1234-1234-1234567890ab_课程报告.docx") == "课程报告.docx"
    assert files._display_name("conversions/12345678-1234-1234-1234-1234567890ab_大数据报告.pdf") == "大数据报告.pdf"
    assert files._display_name("my_file.txt") == "my_file.txt"

