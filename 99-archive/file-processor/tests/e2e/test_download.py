#!/usr/bin/env python3
"""
Test complete flow with download
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
DOWNLOAD_DIR = "/Users/caolei/Downloads"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Initial state
        print("1. Loading frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/v2_01_initial.png")

        # 2. Upload file
        print("2. Uploading PDF file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_FILE)

        # Wait for upload
        for i in range(8):
            await asyncio.sleep(0.3)
            await page.screenshot(path=f"test_screenshots/v2_02_upload_{i}.png")

        await page.screenshot(path="test_screenshots/v2_03_ready.png")

        # 3. Check file info and format selector
        print("3. Checking file info and format selector...")
        file_info = await page.query_selector("text=PDF文档")
        if file_info:
            print("   ✓ Shows 'PDF文档' as file type")

        format_select = await page.query_selector("select")
        if format_select:
            print("   ✓ Format selector is visible")

        # 4. Select conversion format
        print("4. Selecting conversion format...")
        await page.select_option("select", "docx")
        await asyncio.sleep(0.5)
        await page.screenshot(path="test_screenshots/v2_04_format_selected.png")

        # 5. Click start conversion
        print("5. Starting conversion...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()

        # Wait for conversion
        print("6. Waiting for conversion...")
        for i in range(15):
            await asyncio.sleep(1)
            await page.screenshot(path=f"test_screenshots/v2_05_converting_{i}.png")

            # Check for download button
            download_btn = await page.query_selector('a:has-text("下载")')
            if download_btn:
                print(f"   ✓ Download button appeared at {i + 1}s")
                break

        await page.screenshot(path="test_screenshots/v2_06_completed.png")

        # 7. Click download
        print("7. Clicking download button...")
        download_btn = await page.query_selector('a:has-text("下载")')

        if download_btn:
            download_url = await download_btn.get_attribute("href")
            print(f"   Download URL: {download_url}")

            # Navigate to download URL directly
            await page.goto(download_url)
            await asyncio.sleep(2)
            print("   ✓ Download triggered!")

        await page.screenshot(path="test_screenshots/v2_07_final.png")
        print("\n=== TEST COMPLETED ===")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
