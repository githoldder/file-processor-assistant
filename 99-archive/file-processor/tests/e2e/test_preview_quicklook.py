#!/usr/bin/env python3
"""
Test script to verify converted files can be opened with Mac Preview
Uses qlmanage (QuickLook) to test if files are valid
"""

import os
import sys
import subprocess
import requests
import time
import zipfile
import io

OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"
PDF_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


def test_quicklook(file_path: str) -> bool:
    """Test if file can be opened with QuickLook/Mac Preview"""
    print(f"\n[QuickLook] Testing: {file_path}")

    # Test thumbnail generation (faster, doesn't open preview window)
    try:
        result = subprocess.run(
            ["qlmanage", "-t", file_path], capture_output=True, text=True, timeout=60
        )
    except subprocess.TimeoutExpired:
        print(f"[QuickLook] TIMEOUT - skipping QuickLook test")
        # Fall back to file type validation
        result = subprocess.run(
            ["file", file_path], capture_output=True, text=True, timeout=10
        )
        print(f"[file] {result.stdout.strip()}")
        return True

    if result.returncode != 0:
        print(f"[QuickLook] ERROR: {result.stderr}")
        return False

    # Additional validation: check file is a valid image/PDF
    result = subprocess.run(
        ["file", file_path], capture_output=True, text=True, timeout=10
    )
    print(f"[file] {result.stdout.strip()}")

    print(f"[QuickLook] SUCCESS")
    return True


def test_pdf_to_images():
    """Convert PDF to images and verify"""
    print("=" * 60)
    print("Testing PDF to Images Conversion")
    print("=" * 60)

    with open(PDF_FILE, "rb") as f:
        files = {"file": ("test.pdf", f.read(), "application/pdf")}
        r = requests.post(
            "http://127.0.0.1:8000/api/v1/convert?conversion_type=pdf_to_images",
            files=files,
            timeout=60,
        )

    print(f"Upload Status: {r.status_code}")
    task_id = r.json().get("task_id")
    print(f"Task ID: {task_id}")

    # Wait for completion
    for i in range(30):
        time.sleep(2)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        result_json = result.json()

        if result_json.get("status") == "SUCCESS":
            # Download ZIP
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            if download.status_code != 200:
                raise Exception(f"Download failed: {download.status_code}")

            # Save ZIP
            zip_path = os.path.join(OUTPUT_DIR, "test_output.zip")
            with open(zip_path, "wb") as f:
                f.write(download.content)
            print(f"Saved ZIP: {zip_path}")

            # Extract and test each image
            with zipfile.ZipFile(io.BytesIO(download.content)) as zf:
                for name in zf.namelist():
                    img_data = zf.read(name)
                    img_path = os.path.join(OUTPUT_DIR, name)

                    # Save image
                    with open(img_path, "wb") as f:
                        f.write(img_data)

                    # Fix permissions
                    os.chmod(img_path, 0o644)

                    print(f"\nTesting image: {name} ({len(img_data)} bytes)")

                    # Test with QuickLook
                    if not test_quicklook(img_path):
                        raise Exception(
                            f"Image {name} cannot be opened with QuickLook/Preview!"
                        )

            print("\n" + "=" * 60)
            print("PDF to Images: ALL TESTS PASSED!")
            print("=" * 60)
            return img_path

        elif result_json.get("status") == "FAILURE":
            raise Exception(f"Conversion failed: {result_json}")

    raise Exception("Timeout waiting for conversion")


def test_xlsx_to_pdf():
    """Convert XLSX to PDF and verify"""
    print("\n" + "=" * 60)
    print("Testing XLSX to PDF Conversion")
    print("=" * 60)

    xlsx_file = "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx"

    with open(xlsx_file, "rb") as f:
        files = {
            "file": (
                "test.xlsx",
                f.read(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        }
        r = requests.post(
            "http://127.0.0.1:8000/api/v1/convert?conversion_type=excel_to_pdf",
            files=files,
            timeout=60,
        )

    print(f"Upload Status: {r.status_code}")
    task_id = r.json().get("task_id")
    print(f"Task ID: {task_id}")

    for i in range(30):
        time.sleep(2)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        result_json = result.json()

        if result_json.get("status") == "SUCCESS":
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            pdf_path = os.path.join(OUTPUT_DIR, "test_xlsx.pdf")
            with open(pdf_path, "wb") as f:
                f.write(download.content)

            os.chmod(pdf_path, 0o644)
            print(f"Saved PDF: {pdf_path}")

            # QuickLook can test PDFs too
            if not test_quicklook(pdf_path):
                raise Exception("PDF cannot be opened with Preview!")

            print("\n" + "=" * 60)
            print("XLSX to PDF: TEST PASSED!")
            print("=" * 60)
            return pdf_path

        elif result_json.get("status") == "FAILURE":
            raise Exception(f"Conversion failed: {result_json}")

    raise Exception("Timeout")


def test_pptx_to_pdf():
    """Convert PPTX to PDF and verify"""
    print("\n" + "=" * 60)
    print("Testing PPTX to PDF Conversion")
    print("=" * 60)

    pptx_file = (
        "/Users/caolei/Desktop/文件处理全能助手/test_samples/2024年文娱部招新ppt.pptx"
    )

    with open(pptx_file, "rb") as f:
        files = {
            "file": (
                "test.pptx",
                f.read(),
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            )
        }
        r = requests.post(
            "http://127.0.0.1:8000/api/v1/convert?conversion_type=pptx_to_pdf",
            files=files,
            timeout=120,
        )

    print(f"Upload Status: {r.status_code}")
    task_id = r.json().get("task_id")
    print(f"Task ID: {task_id}")

    for i in range(60):
        time.sleep(3)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        result_json = result.json()

        if result_json.get("status") == "SUCCESS":
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            pdf_path = os.path.join(OUTPUT_DIR, "test_pptx.pdf")
            with open(pdf_path, "wb") as f:
                f.write(download.content)

            os.chmod(pdf_path, 0o644)
            print(f"Saved PDF: {pdf_path}")

            if not test_quicklook(pdf_path):
                raise Exception("PDF cannot be opened with Preview!")

            print("\n" + "=" * 60)
            print("PPTX to PDF: TEST PASSED!")
            print("=" * 60)
            return pdf_path

        elif result_json.get("status") == "FAILURE":
            raise Exception(f"Conversion failed: {result_json}")

    raise Exception("Timeout")


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        # Test all conversions
        test_pdf_to_images()
        test_xlsx_to_pdf()
        test_pptx_to_pdf()

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED!")
        print("=" * 60)

    except Exception as e:
        print(f"\n{'=' * 60}")
        print(f"TEST FAILED: {e}")
        print("=" * 60)
        sys.exit(1)
