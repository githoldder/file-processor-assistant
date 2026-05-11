#!/usr/bin/env python3
"""
Test complete conversion and download flow
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Load frontend
        print("1. Loading frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/v3_01_initial.png")

        # 2. Upload file
        print("2. Uploading file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_FILE)

        # Wait for upload progress
        for i in range(10):
            await asyncio.sleep(0.3)
        await page.screenshot(path="test_screenshots/v3_02_ready.png")

        # 3. Click start conversion
        print("3. Starting conversion...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()

        # 4. Wait for conversion to complete
        print("4. Waiting for conversion...")
        for i in range(20):
            await asyncio.sleep(1)
            await page.screenshot(path=f"test_screenshots/v3_03_progress_{i}.png")

            # Check for download button
            download_btn = await page.query_selector('button:has-text("下载")')
            if download_btn:
                print(f"   ✓ Conversion done at {i + 1}s")
                break

        await page.screenshot(path="test_screenshots/v3_04_completed.png")

        # 5. Click download button
        print("5. Clicking download button...")
        download_btn = await page.query_selector('button:has-text("下载")')

        if download_btn:
            # Get initial downloads directory
            downloads_before = set(os.listdir("/Users/caolei/Downloads"))

            await download_btn.click()
            print("   ✓ Download button clicked")

            # Wait for download
            await asyncio.sleep(3)

            downloads_after = set(os.listdir("/Users/caolei/Downloads"))
            new_files = downloads_after - downloads_before

            if new_files:
                print(f"   ✓ New file downloaded: {new_files}")
            else:
                print("   ⚠ No new file detected in Downloads folder")

        await page.screenshot(path="test_screenshots/v3_05_final.png")
        print("\n=== TEST COMPLETED ===")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
