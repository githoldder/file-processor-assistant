#!/usr/bin/env python3
"""
Test different conversion types
"""

import asyncio
from playwright.async_api import async_playwright

TEST_CASES = [
    ("png_to_pdf", "证件照_1748960774467_413_579.png"),
    ("word_to_pdf", "2025 APMCM Control Sheet.docx"),
    ("excel_to_pdf", "5.2025计算机学院团委学生会换届汇总表.xlsx"),
]


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        for conv_key, filename in TEST_CASES:
            print(f"\n=== Testing: {conv_key} ({filename}) ===")

            # Reset page
            await page.goto("http://127.0.0.1:5173")
            await page.wait_for_load_state("networkidle")

            # Select conversion type
            conv_btn = await page.query_selector(
                f'button:has-text("{conv_key.replace("_", " → ")}")'
            )
            if conv_btn:
                await conv_btn.click()

            # Upload file
            test_file = (
                f"/Users/caolei/Desktop/文件处理全能助手/test_samples/{filename}"
            )
            file_input = await page.query_selector('input[type="file"]')
            await file_input.set_input_files(test_file)

            # Wait for upload
            await asyncio.sleep(3)

            # Click start
            start_btn = await page.query_selector('button:has-text("开始转换")')
            if start_btn:
                await start_btn.click()

            # Wait for result
            for i in range(20):
                await asyncio.sleep(1)
                download_btn = await page.query_selector('a:has-text("下载")')
                if download_btn:
                    print(f"  ✓ SUCCESS at {i + 1}s")
                    break
            else:
                print(f"  ✗ FAILED - no download button")

        await browser.close()
        print("\n=== All tests completed ===")


if __name__ == "__main__":
    asyncio.run(main())
