#!/usr/bin/env python3
"""
Test script to verify PPTX to PDF conversion
"""

import asyncio
import os
import requests
import time

OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"

PPTX_FILE = (
    "/Users/caolei/Desktop/文件处理全能助手/test_samples/2024年文娱部招新ppt.pptx"
)


def convert_pptx_to_pdf():
    """Convert PPTX to PDF via API"""
    print("=" * 60)
    print("Converting PPTX to PDF")
    print("=" * 60)

    with open(PPTX_FILE, "rb") as f:
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

        # Wait for task to complete
        for i in range(60):
            time.sleep(3)
            result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
            result_json = result.json()
            status = result_json.get("status")
            print(f"Status: {status}")

            if status == "SUCCESS":
                result_data = result_json.get("result", {})
                print(f"Result status: {result_data.get('status')}")

                if result_data.get("status") == "success":
                    # Download the file
                    download = requests.get(
                        f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
                    )
                    output_path = os.path.join(OUTPUT_DIR, "pptx_test_output.pdf")
                    with open(output_path, "wb") as f:
                        f.write(download.content)
                    print(f"Saved PDF: {len(download.content)} bytes")
                    return output_path
                else:
                    print(f"Error: {result_data.get('error')}")
                    return None
            elif status == "FAILURE":
                print(f"Failure: {result_json}")
                return None


async def open_pdf_and_screenshot(pdf_path: str):
    """Open PDF in browser and take screenshot"""
    if not pdf_path or not os.path.exists(pdf_path):
        print("PDF file not found")
        return

    from playwright.async_api import async_playwright

    pdf_url = f"file://{os.path.abspath(pdf_path)}"
    print(f"\nOpening: {pdf_url}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        await page.set_viewport_size({"width": 1200, "height": 1600})
        await page.goto(pdf_url)
        await asyncio.sleep(3)

        # Take screenshot
        screenshot_path = os.path.join(OUTPUT_DIR, "pptx_pdf_page_1.png")
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"Screenshot saved: {screenshot_path}")

        await asyncio.sleep(5)
        await browser.close()


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Convert
    pdf_path = convert_pptx_to_pdf()

    if pdf_path:
        # Open and screenshot
        await open_pdf_and_screenshot(pdf_path)

    print("\nTest completed!")


if __name__ == "__main__":
    asyncio.run(main())
