#!/usr/bin/env python3
"""
Browser automation test for file conversion
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


async def test_pdf_to_word():
    print("=" * 50)
    print("Testing PDF to Word Conversion")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to frontend
        print("\n[1] Opening frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/01_frontend_loaded.png")
        print("    Frontend loaded successfully")

        # Check if conversion type PDF -> Word is selected (default)
        print("\n[2] Verifying conversion type selection...")
        pdf_to_word_btn = await page.query_selector('button:has-text("PDF → Word")')
        if pdf_to_word_btn:
            print("    PDF -> Word conversion type is selected")
            await page.screenshot(
                path="test_screenshots/02_conversion_type_selected.png"
            )

        # Upload file
        print("\n[3] Uploading PDF file...")
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(TEST_FILE)
            print(f"    File selected: {os.path.basename(TEST_FILE)}")
            await page.screenshot(path="test_screenshots/03_file_uploaded.png")

        # Wait for processing
        print("\n[4] Waiting for conversion to complete...")
        await asyncio.sleep(5)
        await page.screenshot(path="test_screenshots/04_processing.png")

        # Check status
        await asyncio.sleep(10)
        await page.screenshot(path="test_screenshots/05_after_10s.png")

        # Check for result
        download_btn = await page.query_selector('a:has-text("下载")')
        if download_btn:
            print("    ✓ Conversion SUCCESS - Download button found!")
            await page.screenshot(path="test_screenshots/06_success.png")
        else:
            error_span = await page.query_selector('span:has-text("失败")')
            if error_span:
                print("    ✗ Conversion FAILED")
                await page.screenshot(path="test_screenshots/06_failed.png")
            else:
                print("    ? Conversion still in progress or unknown state")
                await page.screenshot(path="test_screenshots/06_unknown.png")

        # Wait a bit more
        await asyncio.sleep(10)
        await page.screenshot(path="test_screenshots/07_final.png")

        await browser.close()
        print("\nTest completed!")


async def test_word_to_pdf():
    print("\n" + "=" * 50)
    print("Testing Word to PDF Conversion")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to frontend
        print("\n[1] Opening frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")

        # Select Word to PDF conversion
        print("\n[2] Selecting Word -> PDF conversion...")
        await page.click('button:has-text("Word → PDF")')
        await page.screenshot(path="test_screenshots/word_to_pdf_01_selected.png")

        # Upload file
        print("\n[3] Uploading Word file...")
        word_file = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx"
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(word_file)
            print(f"    File selected")
            await page.screenshot(path="test_screenshots/word_to_pdf_02_uploaded.png")

        # Wait for processing
        print("\n[4] Waiting for conversion...")
        await asyncio.sleep(20)
        await page.screenshot(path="test_screenshots/word_to_pdf_03_result.png")

        await browser.close()
        print("\nTest completed!")


async def main():
    # Create screenshots directory
    os.makedirs("test_screenshots", exist_ok=True)

    # Test 1: PDF to Word
    await test_pdf_to_word()

    # Test 2: Word to PDF
    await test_word_to_pdf()

    print("\n" + "=" * 50)
    print("All tests completed!")
    print("Screenshots saved in test_screenshots/")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())
