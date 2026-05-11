#!/usr/bin/env python3
"""
E2E Test: PDF -> Images conversion
Steps: Open browser -> Select PDF->PNG -> Upload -> Convert -> Download -> Verify
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_PDF = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def test_pdf_to_images_e2e():
    print("=" * 60)
    print("E2E Test: PDF -> Images")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Open frontend
        print("\n[1] Opening frontend...")
        await page.goto("http://127.0.0.1:3003")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_01_frontend.png"), full_page=True
        )
        print("    Done")

        # 2. Upload PDF file first
        print("\n[2] Uploading PDF file...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_PDF)
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_02_uploaded.png"), full_page=True
        )
        print(f"    File uploaded")

        # 3. Wait for file to be ready, then select "images" format
        print("\n[3] Selecting PDF -> Images format...")

        # Wait for the select dropdown to appear (after upload completes)
        await asyncio.sleep(2)

        # Find the select dropdown and change to "images"
        select_elem = await page.query_selector("select")
        if select_elem:
            # Get all options
            await select_elem.select_option(value="images")
            print("    Selected: PDF -> 图片")
            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, "e2e_03_select_format.png"),
                full_page=True,
            )
        else:
            print("    ERROR: Select not found!")
            await browser.close()
            return False

        # 4. Click start conversion button
        print("\n[4] Starting conversion...")

        # Find and click "开始转换" button
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()
            print("    Clicked start button")
        else:
            print("    ERROR: Start button not found!")
            await browser.close()
            return False

        # 5. Wait for conversion to complete
        print("\n[5] Waiting for conversion...")

        for i in range(30):
            await asyncio.sleep(2)

            # Check if download button appears
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                print(f"    Conversion completed at {i * 2}s")
                break

            # Also check for error
            error = await page.query_selector("text=失败, text=error")
            if error:
                print(f"    ERROR: Conversion failed!")
                await page.screenshot(
                    path=os.path.join(OUTPUT_DIR, "e2e_error.png"), full_page=True
                )
                await browser.close()
                return False
        else:
            print("    ERROR: Timeout!")
            await browser.close()
            return False

        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_06_completed.png"), full_page=True
        )

        # 6. Click download button
        print("\n[6] Downloading...")

        dl_btn = await page.query_selector('button:has-text("下载")')

        if dl_btn:
            try:
                # Use expect_download to capture the download
                async with page.expect_download(timeout=30000) as download_info:
                    await dl_btn.click()

                download = await download_info.value
                dl_path = os.path.join(OUTPUT_DIR, "e2e_downloaded.png")
                await download.save_as(dl_path)
                print(f"    Saved to: {dl_path}")
            except Exception as e:
                print(f"    Download error: {e}")
                await browser.close()
                return False
        else:
            print("    ERROR: Download button not found!")
            await browser.close()
            return False

        # 7. Verify the downloaded file
        print("\n[7] Verifying file...")

        await browser.close()

        if not os.path.exists(dl_path):
            print("    ERROR: File not found!")
            return False

        file_size = os.path.getsize(dl_path)
        print(f"    File size: {file_size} bytes")

        # Check file format
        with open(dl_path, "rb") as f:
            header = f.read(8)
            header_hex = header.hex()
            print(f"    File header: {header_hex}")

            # PNG: 89 50 4E 47 0D 0A 1A 0A
            if header[:4] == b"\x89PNG":
                print("\n" + "=" * 60)
                print("SUCCESS! Valid PNG file!")
                print("=" * 60)
                return True
            # ZIP: 50 4B 03 04
            elif header[:2] == b"PK":
                print("\n" + "=" * 60)
                print("WARNING: Got ZIP file instead of PNG!")
                print("=" * 60)
                return False
            else:
                print("\n" + "=" * 60)
                print(f"ERROR: Unknown format!")
                print("=" * 60)
                return False


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        success = await test_pdf_to_images_e2e()
        if success:
            print("\nALL TESTS PASSED!")
        else:
            print("\nTESTS FAILED!")
            exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback

        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
