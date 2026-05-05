#!/usr/bin/env python3
"""
Test script to verify xlsx to pdf conversion quality
- Converts xlsx to pdf
- Opens the PDF in browser
- Takes screenshots for visual verification
"""

import asyncio
import os
import tempfile
from pathlib import Path

# Add backend to path
import sys

sys.path.insert(0, "/Users/caolei/Desktop/文件处理全能助手/backend")

from app.services.converter import DocumentConverter


XLSX_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


def convert_xlsx_to_pdf():
    """Convert xlsx to pdf and save"""
    print("=" * 60)
    print("Step 1: Converting XLSX to PDF")
    print("=" * 60)

    converter = DocumentConverter(temp_dir="/tmp/converter_test")

    # Read xlsx file
    with open(XLSX_FILE, "rb") as f:
        xlsx_data = f.read()

    print(f"Input file: {XLSX_FILE}")
    print(f"Input size: {len(xlsx_data)} bytes")

    # Convert to pdf
    pdf_data = converter.excel_to_pdf(xlsx_data)

    print(f"Output size: {len(pdf_data)} bytes")

    # Save to temp file
    output_pdf = os.path.join(OUTPUT_DIR, "converted_output.pdf")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(output_pdf, "wb") as f:
        f.write(pdf_data)

    print(f"Saved to: {output_pdf}")
    return output_pdf


async def open_pdf_and_screenshot(pdf_path: str):
    """Open PDF in browser and take screenshot"""
    print("\n" + "=" * 60)
    print("Step 2: Opening PDF in browser and taking screenshots")
    print("=" * 60)

    from playwright.async_api import async_playwright

    # Convert file path to file:// URL
    pdf_url = f"file://{os.path.abspath(pdf_path)}"
    print(f"Opening: {pdf_url}")

    async with async_playwright() as p:
        # Launch browser (headless=False to see the browser)
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Set viewport size
        await page.set_viewport_size({"width": 1200, "height": 1600})

        # Navigate to PDF
        await page.goto(pdf_url)
        await page.wait_for_timeout(3000)  # Wait for PDF to load

        # Take screenshot of first page
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "pdf_page_1.png"), full_page=False
        )
        print(f"Screenshot saved: {OUTPUT_DIR}/pdf_page_1.png")

        # Try to get PDF info
        print("\n" + "=" * 60)
        print("Step 3: Analyzing PDF content")
        print("=" * 60)

        # Check PDF metadata using PyMuPDF
        import fitz

        doc = fitz.open(pdf_path)
        print(f"PDF pages: {len(doc)}")

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text()
            print(f"\n--- Page {page_num + 1} ---")
            print(f"Text length: {len(text)} characters")
            print(f"Text preview (first 500 chars):\n{text[:500]}")

            # Get images
            img_list = page.get_images()
            print(f"Images on page: {len(img_list)}")

        doc.close()

        # Wait a bit more for user to see
        await asyncio.sleep(5)

        await browser.close()


async def debug_conversion():
    """Debug the conversion process"""
    print("\n" + "=" * 60)
    print("DEBUG: Direct conversion analysis")
    print("=" * 60)

    from app.services.converter import DocumentConverter
    import fitz

    converter = DocumentConverter(temp_dir="/tmp/converter_test")

    # Read xlsx
    with open(XLSX_FILE, "rb") as f:
        xlsx_data = f.read()

    # Try Gotenberg first (check if available)
    import os

    gotenberg_url = os.getenv("GOTENBERG_URL", "http://localhost:3000")
    print(f"Gotenberg URL: {gotenberg_url}")

    import requests

    try:
        response = requests.get(gotenberg_url, timeout=5)
        print(f"Gotenberg status: {response.status_code}")
    except Exception as e:
        print(f"Gotenberg NOT available: {e}")
        print("Will use fallback method (reportlab)")

    # Try conversion and analyze
    try:
        pdf_data = converter.excel_to_pdf(xlsx_data)

        # Save and analyze
        debug_pdf = os.path.join(OUTPUT_DIR, "debug_output.pdf")
        with open(debug_pdf, "wb") as f:
            f.write(pdf_data)

        # Analyze with PyMuPDF
        doc = fitz.open(debug_pdf)
        print(f"\nDebug PDF analysis:")
        print(f"  Pages: {len(doc)}")

        for i, page in enumerate(doc):
            text = page.get_text()
            print(f"  Page {i + 1}: {len(text)} chars, {len(page.get_images())} images")
            if text.strip():
                print(f"  Text sample: {text[:200]}...")

        doc.close()

    except Exception as e:
        print(f"Conversion error: {e}")
        import traceback

        traceback.print_exc()


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Step 1: Convert
    pdf_path = convert_xlsx_to_pdf()

    # Step 2: Debug conversion
    await debug_conversion()

    # Step 3: Open in browser and screenshot
    await open_pdf_and_screenshot(pdf_path)

    print("\n" + "=" * 60)
    print(f"Test completed. Check screenshots in: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
