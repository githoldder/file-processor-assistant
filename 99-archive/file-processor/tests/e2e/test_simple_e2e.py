#!/usr/bin/env python3
"""
Simple test to verify PDF -> Images conversion
Steps: Upload -> Select format -> Convert -> Download -> Verify
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_PDF = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def test_pdf_to_png():
    print("=" * 50)
    print("PDF -> PNG E2E Test")
    print("=" * 50)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Open frontend
        print("\n[1] Open frontend")
        await page.goto("http://127.0.0.1:3003")
        await page.wait_for_load_state("networkidle")

        # 2. Upload PDF
        print("[2] Upload PDF")
        await page.set_input_files('input[type="file"]', TEST_PDF)
        await asyncio.sleep(2)

        # 3. Select format: click the select dropdown
        print("[3] Select PDF -> PNG format")

        # Find and click the select element
        select = await page.query_selector("select")
        if select:
            # Click to open dropdown
            await select.click()
            await asyncio.sleep(0.5)

            # Select the images option
            await select.select_option(value="images")
            await asyncio.sleep(1)

        # 4. Click start conversion
        print("[4] Start conversion")

        # Wait for the convert button to be enabled
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            await start_btn.click()

        # 5. Wait for conversion
        print("[5] Wait for conversion...")

        for i in range(30):
            await asyncio.sleep(2)

            # Check if download button appears
            dl = await page.query_selector('button:has-text("下载")')
            if dl:
                print(f"    Done at {i * 2}s")
                break

            # Check for error
            err = await page.query_selector("text=失败, text=error")
            if err:
                print("    ERROR!")
                break

        # 6. Download
        print("[6] Download")

        dl = await page.query_selector('button:has-text("下载")')

        if dl:
            async with page.expect_download() as di:
                await dl.click()

            download = await di.value
            dl_path = os.path.join(OUTPUT_DIR, "e2e_final.png")
            await download.save_as(dl_path)
            print(f"    Saved: {dl_path}")
        else:
            print("    No download button!")
            await browser.close()
            return False

        # 7. Verify
        print("[7] Verify")

        await browser.close()

        with open(dl_path, "rb") as f:
            header = f.read(8)
            print(f"    Header: {header.hex()}")

            if header[:4] == b"\x89PNG":
                print("\n" + "=" * 50)
                print("SUCCESS!")
                print("=" * 50)
                return True
            else:
                print("\n" + "=" * 50)
                print(f"FAILED! Got: {header[:8].hex()}")
                print("=" * 50)
                return False


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    result = asyncio.run(test_pdf_to_png())
    exit(0 if result else 1)
