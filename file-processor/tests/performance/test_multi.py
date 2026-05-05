#!/usr/bin/env python3
"""
Test multiple files and add more files functionality
"""

import asyncio
from playwright.async_api import async_playwright

PDF_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
WORD_FILE = (
    "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx"
)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Initial state
        print("1. Loading frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")

        # 2. Upload first PDF file
        print("2. Uploading first PDF file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(PDF_FILE)
        await asyncio.sleep(3)
        await page.screenshot(path="test_screenshots/multi_01_first_file.png")

        # 3. Check if buttons appear
        print("3. Checking buttons...")
        start_btn = await page.query_selector('button:has-text("开始转换")')
        add_btn = await page.query_selector('button:has-text("添加更多文件")')

        if start_btn and add_btn:
            print("   ✓ Both buttons visible: '开始转换' and '添加更多文件'")
        else:
            print("   ✗ Buttons not found properly")

        # 4. Click "添加更多文件"
        print("4. Clicking '添加更多文件'...")
        if add_btn:
            await add_btn.click()
            await asyncio.sleep(1)

            # Upload Word file
            await file_input.set_input_files(WORD_FILE)
            await asyncio.sleep(3)
            await page.screenshot(path="test_screenshots/multi_02_two_files.png")

        # 5. Check file count
        files = await page.query_selector_all("text=/.*\.pdf|.*\.docx/")
        print(f"   Files displayed: {len(files)}")

        # 6. Click "开始全部转换"
        print("5. Clicking '开始全部转换'...")
        all_start_btn = await page.query_selector('button:has-text("开始全部转换")')
        if all_start_btn:
            await all_start_btn.click()
        else:
            # Try individual start buttons
            start_btns = await page.query_selector_all('button:has-text("开始转换")')
            for btn in start_btns:
                await btn.click()
                await asyncio.sleep(0.5)

        # 7. Wait for conversions
        print("6. Waiting for conversions...")
        for i in range(20):
            await asyncio.sleep(1)
            await page.screenshot(path=f"test_screenshots/multi_03_progress_{i}.png")

            download_btns = await page.query_selector_all('a:has-text("下载")')
            if len(download_btns) >= 2:
                print(f"   ✓ Both files converted at {i + 1}s!")
                break

        await page.screenshot(path="test_screenshots/multi_04_final.png")

        # Final check
        download_btns = await page.query_selector_all('a:has-text("下载")')
        print(f"\nResult: {len(download_btns)} download buttons found")

        await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
