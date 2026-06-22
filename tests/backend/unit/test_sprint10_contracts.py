import os
import asyncio
import io
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.routers import files, folders
from app.routers import convert
from app.models.schemas import ConversionType
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


def test_p0_conversion_whitelist_matches_stable_user_flow():
    expected = {
        "word_to_pdf",
        "doc_to_pdf",
        "excel_to_pdf",
        "csv_to_pdf",
        "pptx_to_pdf",
        "markdown_to_pdf",
        "markdown_to_html",
        "svg_to_png",
        "svg_to_pdf",
        "png_to_pdf",
        "jpg_to_pdf",
        "jpeg_to_pdf",
        "png_to_ico",
        "pdf_to_images",
    }
    capability_keys = {cap["key"] for cap in get_capabilities()}

    assert expected.issubset(capability_keys)
    assert expected == convert.P0_WHITELIST


def test_all_capabilities_have_schema_enum_values():
    enum_values = {item.value for item in ConversionType}
    capability_keys = {cap["key"] for cap in get_capabilities()}

    assert capability_keys.issubset(enum_values)


def test_preview_type_matrix_includes_media_and_documents():
    assert preview._detect_preview_type("lecture.mp3") == "audio"
    assert preview._detect_preview_type("demo.mp4") == "video"
    assert preview._detect_preview_type("slides.pptx") == "pdf"
    assert preview._detect_preview_type("legacy.doc") == "pdf"
    assert preview._detect_preview_type("table.csv") == "html"


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


def test_csv_preview_renders_html_table_with_transformed_content_length():
    csv_bytes = "name,score\nAlice,98\nBob,87\n".encode("utf-8")

    class FakeResponse:
        def read(self):
            return csv_bytes

        def close(self):
            pass

        def release_conn(self):
            pass

    class FakeClient:
        def stat_object(self, _bucket, _object_name):
            return SimpleNamespace(size=len(csv_bytes))

        def get_object(self, _bucket, _object_name):
            return FakeResponse()

    with patch.object(preview, "BUCKET", "test-bucket"):
        result = asyncio.run(preview._stream_csv_html(FakeClient(), "grades.csv"))

    assert result is not None
    result_stat, iter_content, content_type = result
    rendered = b"".join(iter_content())
    assert content_type == "text/html; charset=utf-8"
    assert b"<table>" in rendered
    assert b"<th>name</th>" in rendered
    assert b"<td>Alice</td>" in rendered
    assert result_stat.size == len(rendered)


def test_markdown_preview_uses_rendered_html_content_length():
    md_bytes = b"# Title\n\n| A | B |\n| - | - |\n| 1 | 2 |\n"

    class FakeResponse:
        def read(self):
            return md_bytes

        def close(self):
            pass

        def release_conn(self):
            pass

    class FakeClient:
        def stat_object(self, _bucket, _object_name):
            return SimpleNamespace(size=len(md_bytes))

        def get_object(self, _bucket, _object_name):
            return FakeResponse()

    with patch.object(preview, "BUCKET", "test-bucket"):
        result = asyncio.run(preview._stream_markdown_html(FakeClient(), "readme.md"))

    assert result is not None
    result_stat, iter_content, content_type = result
    rendered = b"".join(iter_content())
    assert content_type == "text/html; charset=utf-8"
    assert b"<html>" in rendered
    assert result_stat.size == len(rendered)


def test_move_to_folder_accepts_keep_marker_target_and_moves_object():
    moved = {}

    class FakeClient:
        def stat_object(self, _bucket, object_name):
            if object_name in {"reports/.keep", "root/file.csv"}:
                return SimpleNamespace(size=0)
            raise RuntimeError("missing")

        def copy_object(self, _bucket, new_object_name, source):
            moved["new"] = new_object_name
            moved["source"] = source.object_name

        def remove_object(self, _bucket, object_name):
            moved["removed"] = object_name

    with patch.object(folders, "BUCKET", "test-bucket"), \
         patch.object(folders, "get_minio_client", return_value=FakeClient()), \
         patch.object(folders, "log_event"):
        result = asyncio.run(folders.move_to_folder("root/file.csv", "reports"))

    assert result["object_name"] == "reports/file.csv"
    assert moved == {
        "new": "reports/file.csv",
        "source": "root/file.csv",
        "removed": "root/file.csv",
    }


def test_move_to_root_does_not_require_folder_marker():
    moved = {}

    class FakeClient:
        def stat_object(self, _bucket, object_name):
            if object_name == "reports/file.csv":
                return SimpleNamespace(size=0)
            raise RuntimeError("missing")

        def copy_object(self, _bucket, new_object_name, source):
            moved["new"] = new_object_name
            moved["source"] = source.object_name

        def remove_object(self, _bucket, object_name):
            moved["removed"] = object_name

    with patch.object(folders, "BUCKET", "test-bucket"), \
         patch.object(folders, "get_minio_client", return_value=FakeClient()), \
         patch.object(folders, "log_event"):
        result = asyncio.run(folders.move_to_folder("reports/file.csv", ""))

    assert result["object_name"] == "file.csv"
    assert moved["new"] == "file.csv"


def test_display_name_uuid_cleanup():
    assert files._display_name("uploads/12345678-1234-1234-1234-1234567890ab_课程报告.docx") == "课程报告.docx"
    assert files._display_name("conversions/12345678-1234-1234-1234-1234567890ab_大数据报告.pdf") == "大数据报告.pdf"
    assert files._display_name("my_file.txt") == "my_file.txt"
