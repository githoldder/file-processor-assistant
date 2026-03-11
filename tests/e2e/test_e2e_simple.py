#!/usr/bin/env python3
"""
Simple E2E Test for PDF to Images
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_PDF = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def test_e2e():
    print("=" * 50)
    print("E2E Test: PDF -> Images")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Open frontend
        print("\n[1] Open frontend")
        await page.goto("http://127.0.0.1:3003")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_01.png"), full_page=True
        )

        # 2. Select PDF to Images
        print("[2] Select conversion")
        pdf_btn = await page.query_selector(
            'button:has-text("PDF"), button:has-text("图片")'
        )
        if pdf_btn:
            await pdf_btn.click()
        await asyncio.sleep(1)
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_02.png"), full_page=True
        )

        # 3. Upload
        print("[3] Upload file")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_PDF)
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_03.png"), full_page=True
        )

        # 4. Convert
        print("[4] Start conversion")
        convert_btn = await page.query_selector(
            'button:has-text("开始"), button:has-text("转换")'
        )
        if convert_btn:
            await convert_btn.click()

        # Wait for completion
        print("[5] Wait for result...")
        for i in range(30):
            await asyncio.sleep(2)
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                print(f"    Done at {i * 2}s")
                break
            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, f"e2e_wait_{i}.png"), full_page=True
            )

        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_04_result.png"), full_page=True
        )

        # 5. Download
        print("[6] Download")
        dl_btn = await page.query_selector('button:has-text("下载")')

        if dl_btn:
            # Download via API instead of clicking
            task_id = None
            # Get task_id from page
            task_id_input = await page.query_selector('[data-task-id], [class*="task"]')

            # Try to get task info from network
            async with page.expect_download() as download_info:
                await dl_btn.click()

            download = await download_info.value
            dl_path = os.path.join(OUTPUT_DIR, "e2e_download.png")
            await download.save_as(dl_path)
            print(f"    Saved: {dl_path}")
        else:
            print("    No download button!")

        await browser.close()

        # Verify
        print("\n[7] Verify file")
        if os.path.exists(dl_path):
            size = os.path.getsize(dl_path)
            print(f"    Size: {size} bytes")

            # Check PNG header
            with open(dl_path, "rb") as f:
                header = f.read(8)
                print(f"    Header: {header.hex()}")

                if header[:4] == b"\x89PNG":
                    print("\n" + "=" * 50)
                    print("SUCCESS! Valid PNG file!")
                    print("=" * 50)
                    return True
                else:
                    print(f"\nERROR: Invalid format! Got: {header[:8]}")
                    return False
        else:
            print("    File not found!")
            return False


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    asyncio.run(test_e2e())
