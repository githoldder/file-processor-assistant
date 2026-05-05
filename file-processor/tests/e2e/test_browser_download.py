#!/usr/bin/env python3
"""
Browser-based test for file conversion and download
"""

import asyncio
import os
from playwright.async_api import async_playwright

API_BASE = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://127.0.0.1:3002"


async def test_excel_to_pdf():
    """Test Excel to PDF conversion and download"""
    print("=" * 60)
    print("Testing: Excel -> PDF (User reported issue)")
    print("=" * 60)

    test_file = "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Go to frontend
        print("1. Opening frontend...")
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/browser_01_home.png")
        print("   ✓ Frontend loaded")

        # Upload file
        print("2. Uploading Excel file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(test_file)

        # Wait for upload
        await asyncio.sleep(2)
        await page.screenshot(path="test_screenshots/browser_02_uploaded.png")
        print("   ✓ File uploaded")

        # Wait for ready status
        await asyncio.sleep(3)

        # Check status
        status_text = await page.text_content("body")
        if "Excel" in status_text:
            print("   ✓ Shows Excel file")

        # Check if format selector is visible
        select = await page.query_selector("select")
        if select:
            print("   ✓ Format selector visible")
            await page.screenshot(path="test_screenshots/browser_03_ready.png")

        # Click start conversion button
        print("3. Starting conversion...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()
            print("   ✓ Clicked start button")

        # Wait for conversion
        print("4. Waiting for conversion...")
        for i in range(20):
            await asyncio.sleep(1)
            await page.screenshot(
                path=f"test_screenshots/browser_04_converting_{i}.png"
            )

            # Check if download button appears
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                print(f"   ✓ Download button appeared after {i + 1}s")
                break
        else:
            print("   ✗ Download button not found after 20s")

        # Get current page state
        await page.screenshot(path="test_screenshots/browser_05_completed.png")

        # Try to click download
        print("5. Testing download...")
        dl_btn = await page.query_selector('button:has-text("下载")')
        if dl_btn:
            # Click and wait for download
            async with page.expect_download() as download_info:
                await dl_btn.click()

            download = await download_info.value
            print(f"   ✓ Download triggered: {download.suggested_filename}")
            print(f"   Path: {download.path}")
        else:
            # Check for error
            error_text = await page.text_content("body")
            if "error" in error_text.lower() or "失败" in error_text:
                print("   ✗ Error detected in UI")

        # Check console for errors
        print("\n6. Console messages:")

        await browser.close()

    print("\n" + "=" * 60)


async def test_markdown_to_pdf():
    """Test Markdown to PDF conversion"""
    print("=" * 60)
    print("Testing: Markdown -> PDF")
    print("=" * 60)

    test_file = "/Users/caolei/Desktop/文件处理全能助手/test_samples/瘦子增肌计划(1).md"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Listen to console
        page.on("console", lambda msg: print(f"   [Console] {msg.text}"))
        page.on("pageerror", lambda err: print(f"   [Error] {err}"))

        # Go to frontend
        print("1. Opening frontend...")
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/md_01_home.png")

        # Upload file
        print("2. Uploading Markdown file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(test_file)

        await asyncio.sleep(2)
        await page.screenshot(path="test_screenshots/md_02_uploaded.png")

        # Wait for ready
        await asyncio.sleep(3)

        # Check file type
        status = await page.text_content("body")
        if "markdown" in status.lower() or "md" in status.lower():
            print("   ✓ Markdown file recognized")

        # Start conversion
        print("3. Starting conversion...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()

        # Wait for result
        print("4. Waiting for conversion...")
        for i in range(20):
            await asyncio.sleep(1)
            await page.screenshot(path=f"test_screenshots/md_04_{i}.png")

            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                print(f"   ✓ Download ready at {i + 1}s")
                break
        else:
            print("   ✗ Conversion timed out")

        await page.screenshot(path="test_screenshots/md_05_final.png")

        # Try download
        print("5. Testing download...")
        dl_btn = await page.query_selector('button:has-text("下载")')
        if dl_btn:
            async with page.expect_download() as download_info:
                await dl_btn.click()
            download = await download_info.value
            print(f"   ✓ Download: {download.suggested_filename}")

        await browser.close()

    print("\n" + "=" * 60)


async def main():
    print("\n" + "=" * 60)
    print("BROWSER-BASED CONVERSION TEST")
    print("=" * 60 + "\n")

    await test_excel_to_pdf()
    await test_markdown_to_pdf()

    print("\n=== ALL TESTS COMPLETE ===")


if __name__ == "__main__":
    asyncio.run(main())
