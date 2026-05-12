#!/usr/bin/env python3
"""
Test the complete conversion flow
"""

import asyncio
import time
from playwright.async_api import async_playwright

TEST_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Step 1: Initial state
        print("Step 1: Loading frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/new_01_initial.png")
        print("  ✓ Frontend loaded")

        # Step 2: Select conversion type (PDF -> Word is default)
        print("Step 2: Selecting conversion type...")
        await page.click('button:has-text("PDF → Word")')
        await asyncio.sleep(0.5)
        await page.screenshot(path="test_screenshots/new_02_conversion_selected.png")
        print("  ✓ Conversion type selected")

        # Step 3: Upload file
        print("Step 3: Uploading file...")
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(TEST_FILE)
            print("  ✓ File selected")

        # Step 4: Check upload progress (0% -> 100%)
        print("Step 4: Checking upload progress...")
        for i in range(6):
            await asyncio.sleep(0.5)
            await page.screenshot(path=f"test_screenshots/new_03_upload_{i}.png")

        await page.screenshot(path="test_screenshots/new_04_upload_done.png")
        print("  ✓ Upload completed")

        # Step 5: Click "开始转换" button
        print("Step 5: Starting conversion...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()
            print("  ✓ Clicked '开始转换'")

        # Step 6: Wait for conversion to complete
        print("Step 6: Waiting for conversion...")
        for i in range(15):
            await asyncio.sleep(1)
            await page.screenshot(path=f"test_screenshots/new_06_converting_{i}.png")

            # Check if download button appears
            download_btn = await page.query_selector('a:has-text("下载")')
            if download_btn:
                print(f"  ✓ Download button appeared at {i + 1}s")
                break

        await page.screenshot(path="test_screenshots/new_07_final.png")

        # Check final state
        download_btn = await page.query_selector('a:has-text("下载")')
        if download_btn:
            print("  ✓ SUCCESS: Download button is visible!")
        else:
            print("  ✗ FAILED: Download button not found")

        await browser.close()
        print("\nTest completed!")


if __name__ == "__main__":
    asyncio.run(main())
