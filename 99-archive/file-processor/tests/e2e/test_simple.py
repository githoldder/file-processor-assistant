#!/usr/bin/env python3
"""
Simple browser test to check current frontend state
"""

import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to frontend
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path="test_screenshots/01_frontend_initial.png")
        print("Initial state saved")

        # Upload a file
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(
                "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
            )
            await asyncio.sleep(2)
            await page.screenshot(path="test_screenshots/02_after_upload.png")
            print("After upload saved")

            await asyncio.sleep(3)
            await page.screenshot(path="test_screenshots/03_after_3s.png")
            print("After 3s saved")

            await asyncio.sleep(5)
            await page.screenshot(path="test_screenshots/04_after_8s.png")
            print("After 8s saved")

        await browser.close()
        print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
