#!/usr/bin/env python3
"""
Test multiple conversion types
"""

import asyncio
from playwright.async_api import async_playwright

TEST_FILES = [
    (
        "/Users/caolei/Desktop/文件处理全能助手/test_samples/证件照_1748960774467_413_579.png",
        "png",
        "pdf",
    ),
    (
        "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx",
        "docx",
        "pdf",
    ),
    (
        "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx",
        "xlsx",
        "pdf",
    ),
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        for test_file, from_ext, to_ext in TEST_FILES:
            print(f"\n=== Testing: {from_ext} -> {to_ext} ===")

            # Load page
            await page.goto("http://127.0.0.1:5173")
            await page.wait_for_load_state("networkidle")

            # Upload file
            file_input = await page.query_selector('input[type="file"]')
            await file_input.set_input_files(test_file)

            # Wait for upload
            await asyncio.sleep(3)

            # Check file type shown
            file_type = await page.query_selector(f"text={from_ext.upper()}")
            print(f"  File type shown: {'✓' if file_type else '✗'}")

            # Check format selector has options
            select = await page.query_selector("select")
            if select:
                options = await select.query_selector_all("option")
                print(f"  Format options available: {len(options)}")

            # Select format
            await page.select_option("select", to_ext)

            # Start conversion
            start_btn = await page.query_selector('button:has-text("开始转换")')
            if start_btn:
                await start_btn.click()

            # Wait for download
            for i in range(15):
                await asyncio.sleep(1)
                download_btn = await page.query_selector('a:has-text("下载")')
                if download_btn:
                    print(f"  ✓ Success at {i + 1}s")
                    break
            else:
                print(f"  ✗ Failed")

        await browser.close()
        print("\n=== All tests completed ===")


if __name__ == "__main__":
    asyncio.run(main())
