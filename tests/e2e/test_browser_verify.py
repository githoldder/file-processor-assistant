#!/usr/bin/env python3
"""
Test script to verify converted files - open in browser and take screenshots
"""

import asyncio
import os
import sys
import requests
import time
import zipfile
import io
from playwright.async_api import async_playwright

OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"
PDF_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


async def open_and_screenshot(file_path: str) -> bool:
    """Open file in browser and take screenshot"""
    if not os.path.exists(file_path):
        print(f"[ERROR] File not found: {file_path}")
        return False

    file_url = f"file://{os.path.abspath(file_path)}"
    screenshot_name = os.path.basename(file_path).replace(".", "_") + ".png"
    screenshot_path = os.path.join(OUTPUT_DIR, screenshot_name)

    print(f"[Browser] Opening: {file_url}")

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False)
            page = await browser.new_page()

            # Set large viewport for PDF/images
            await page.set_viewport_size({"width": 1400, "height": 2000})

            await page.goto(file_url)
            await asyncio.sleep(3)

            await page.screenshot(path=screenshot_path, full_page=True)
            print(f"[Screenshot] Saved: {screenshot_path}")

            await browser.close()

        return True

    except Exception as e:
        print(f"[ERROR] Browser error: {e}")
        return False


async def test_pdf_to_images():
    """Convert PDF to images and verify in browser"""
    print("\n" + "=" * 50)
    print("Testing: PDF -> Images")
    print("=" * 50)

    with open(PDF_FILE, "rb") as f:
        files = {"file": ("test.pdf", f.read(), "application/pdf")}
        r = requests.post(
            "http://127.0.0.1:8000/api/v1/convert?conversion_type=pdf_to_images",
            files=files,
            timeout=60,
        )

    print(f"[API] Status: {r.status_code}")
    task_id = r.json().get("task_id")

    # Wait for completion
    for i in range(20):
        time.sleep(2)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        if result.json().get("status") == "SUCCESS":
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            with zipfile.ZipFile(io.BytesIO(download.content)) as zf:
                for name in zf.namelist():
                    img_data = zf.read(name)
                    img_path = os.path.join(OUTPUT_DIR, name)
                    with open(img_path, "wb") as f:
                        f.write(img_data)
                    print(f"[Save] {name} ({len(img_data)} bytes)")

                    # Open in browser and screenshot
                    await open_and_screenshot(img_path)

            return True

    return False


async def test_xlsx_to_pdf():
    """Convert XLSX to PDF and verify in browser"""
    print("\n" + "=" * 50)
    print("Testing: XLSX -> PDF")
    print("=" * 50)

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

    print(f"[API] Status: {r.status_code}")
    task_id = r.json().get("task_id")

    for i in range(20):
        time.sleep(2)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        if result.json().get("status") == "SUCCESS":
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            pdf_path = os.path.join(OUTPUT_DIR, "xlsx_result.pdf")
            with open(pdf_path, "wb") as f:
                f.write(download.content)

            print(f"[Save] {pdf_path} ({len(download.content)} bytes)")
            await open_and_screenshot(pdf_path)
            return True

    return False


async def test_pptx_to_pdf():
    """Convert PPTX to PDF and verify in browser"""
    print("\n" + "=" * 50)
    print("Testing: PPTX -> PDF")
    print("=" * 50)

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

    print(f"[API] Status: {r.status_code}")
    task_id = r.json().get("task_id")

    for i in range(30):
        time.sleep(3)
        result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
        if result.json().get("status") == "SUCCESS":
            download = requests.get(
                f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
            )

            pdf_path = os.path.join(OUTPUT_DIR, "pptx_result.pdf")
            with open(pdf_path, "wb") as f:
                f.write(download.content)

            print(f"[Save] {pdf_path} ({len(download.content)} bytes)")
            await open_and_screenshot(pdf_path)
            return True

    return False


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("=" * 50)
    print("Conversion Tests with Browser Screenshot")
    print("=" * 50)

    success = True

    # Test all conversions
    if not await test_pdf_to_images():
        print("[ERROR] PDF to Images failed")
        success = False

    if not await test_xlsx_to_pdf():
        print("[ERROR] XLSX to PDF failed")
        success = False

    if not await test_pptx_to_pdf():
        print("[ERROR] PPTX to PDF failed")
        success = False

    print("\n" + "=" * 50)
    if success:
        print("ALL TESTS PASSED!")
    else:
        print("SOME TESTS FAILED!")
        sys.exit(1)
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
