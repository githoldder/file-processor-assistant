#!/usr/bin/env python3
"""
Complete E2E Test: PDF -> Images conversion via frontend
Tests the full flow: upload -> convert -> download -> preview in browser
"""

import asyncio
import os
import time
from playwright.async_api import async_playwright

TEST_PDF = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def test_pdf_to_images_e2e():
    """Full E2E test for PDF to Images conversion"""
    print("=" * 60)
    print("E2E Test: PDF -> Images")
    print("=" * 60)

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Step 1: Open frontend
        print("\n[1] Opening frontend...")
        await page.goto("http://127.0.0.1:3003")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_01_frontend.png"), full_page=True
        )
        print("    Frontend loaded")

        # Step 2: Select PDF -> Images conversion
        print("\n[2] Selecting conversion type...")

        # Find and click PDF -> Images button
        pdf_to_images_btn = await page.query_selector(
            'button:has-text("PDF"), button:has-text("图片")'
        )
        if pdf_to_images_btn:
            await pdf_to_images_btn.click()
            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, "e2e_02_select_type.png"), full_page=True
            )
            print("    Conversion type selected")

        # Wait a bit for UI to update
        await asyncio.sleep(1)

        # Step 3: Upload PDF file
        print("\n[3] Uploading PDF file...")
        file_input = await page.query_selector('input[type="file"]')
        if file_input:
            await file_input.set_input_files(TEST_PDF)
            filename = os.path.basename(TEST_PDF)
            print(f"    File selected: {filename}")
            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, "e2e_03_uploaded.png"), full_page=True
            )
        else:
            print("    ERROR: No file input found!")
            await browser.close()
            return False

        # Step 4: Click start conversion
        print("\n[4] Starting conversion...")

        # Find and click the convert button
        convert_btn = await page.query_selector(
            'button:has-text("开始转换"), button:has-text("转换")'
        )
        if convert_btn:
            await convert_btn.click()
            print("    Clicked convert button")

        # Wait for conversion to complete
        print("\n[5] Waiting for conversion...")
        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_04_converting.png"), full_page=True
        )

        # Poll for completion (check for download button or result)
        for i in range(60):  # 2 minutes max
            await asyncio.sleep(2)

            # Check for success indicators
            download_btn = await page.query_selector(
                'a:has-text("下载"), button:has-text("下载")'
            )
            success_text = await page.query_selector("text=成功, text=完成")

            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, f"e2e_05_wait_{i}.png"), full_page=True
            )

            if download_btn or success_text:
                print(f"    Conversion completed after {i * 2} seconds")
                break
        else:
            print("    ERROR: Conversion timeout!")
            await browser.close()
            return False

        await page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_06_completed.png"), full_page=True
        )

        # Step 5: Click download
        print("\n[6] Clicking download...")

        # Find download link/button - try multiple selectors
        download_link = None

        # Try different selectors
        selectors = [
            "a[download]",
            'a:has-text("下载")',
            'button:has-text("下载")',
            'div:has-text("下载")',
            ".download-btn",
        ]

        for selector in selectors:
            download_link = await page.query_selector(selector)
            if download_link:
                print(f"    Found download button with selector: {selector}")
                break

        if download_link:
            # Get the href
            href = await download_link.get_attribute("href")
            print(f"    Download URL: {href}")

            # Click to trigger download
            async with page.expect_download() as download_info:
                await download_link.click()

            download = await download_info.value
            download_path = os.path.join(OUTPUT_DIR, "e2e_downloaded.png")
            await download.save_as(download_path)
            print(f"    Downloaded to: {download_path}")

            await page.screenshot(
                path=os.path.join(OUTPUT_DIR, "e2e_07_downloaded.png"), full_page=True
            )
        else:
            print("    ERROR: No download button found!")
            await browser.close()
            return False

        # Step 6: Verify downloaded file can be opened in browser
        print("\n[7] Verifying downloaded file in browser...")

        # Open the downloaded file in a new page
        new_page = await browser.new_page()
        download_url = f"file://{os.path.abspath(download_path)}"

        print(f"    Opening: {download_url}")
        await new_page.goto(download_url)
        await asyncio.sleep(3)

        # Take screenshot to verify content
        await new_page.screenshot(
            path=os.path.join(OUTPUT_DIR, "e2e_08_preview.png"), full_page=True
        )
        print("    Screenshot saved: e2e_08_preview.png")

        # Check for any errors in the page
        page_content = await new_page.content()

        # Close browser
        await new_page.close()
        await browser.close()

        # Verify the downloaded file exists and is valid
        if os.path.exists(download_path):
            file_size = os.path.getsize(download_path)
            print(f"\n[Result] Downloaded file size: {file_size} bytes")

            # Verify it's a valid PNG
            with open(download_path, "rb") as f:
                header = f.read(8)
                if header[:8] == b"\x89PNG\r\n\x1a\n":
                    print("[Result] File is valid PNG format!")
                else:
                    print(f"[ERROR] Invalid file format! Header: {header[:8].hex()}")
                    return False
        else:
            print("[ERROR] Downloaded file not found!")
            return False

        print("\n" + "=" * 60)
        print("E2E TEST PASSED!")
        print("=" * 60)
        return True


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    try:
        result = await test_pdf_to_images_e2e()
        if not result:
            print("\n[FAILED] E2E test failed!")
            exit(1)
    except Exception as e:
        print(f"\n[ERROR] {e}")
        import traceback

        traceback.print_exc()
        exit(1)


if __name__ == "__main__":
    asyncio.run(main())
