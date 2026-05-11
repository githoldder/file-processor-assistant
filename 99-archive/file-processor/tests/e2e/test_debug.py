#!/usr/bin/env python3
"""
E2E Test: PDF -> Images conversion - Debug version
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_PDF = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def test_pdf_to_images_e2e():
    print("=" * 60)
    print("E2E Test: PDF -> Images (Debug)")
    print("=" * 60)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 1. Open frontend
        print("\n[1] Opening frontend...")
        await page.goto("http://127.0.0.1:3003")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_01.png"))

        # 2. Upload PDF file
        print("[2] Uploading PDF...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_PDF)
        await asyncio.sleep(3)  # Wait for upload
        await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_02.png"))
        print("    Uploaded")

        # 3. Check page content
        content = await page.content()
        print(f"    Page contains 'PDF ->': {'PDF ->' in content}")

        # 4. Find and click the select dropdown
        print("[3] Looking for select...")

        # Get all select elements
        selects = await page.query_selector_all("select")
        print(f"    Found {len(selects)} select elements")

        if selects:
            select = selects[0]

            # Get options
            options = await page.query_selector_all("select option")
            print(f"    Found {len(options)} options")

            # Print each option
            for i, opt in enumerate(options[:5]):
                text = await opt.inner_text()
                value = await opt.get_attribute("value")
                print(f"      Option {i}: '{text}' (value: {value})")

            # Try to select by value
            await select.select_option(value="images")
            print("    Selected 'images'")

            await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_03.png"))

        # 5. Check if the button changed
        print("[4] Looking for start button...")

        # Check page content again
        content = await page.content()

        # Look for any button with text
        buttons = await page.query_selector_all("button")
        for btn in buttons:
            text = await btn.inner_text()
            print(f"    Button: {text[:50]}")

        # Find start button
        start_btn = await page.query_selector('button:has-text("开始转换")')
        if start_btn:
            print("    Found '开始转换' button, clicking...")
            await start_btn.click()
            await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_04.png"))
        else:
            print("    Button not found!")
            await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_04_fail.png"))
            await browser.close()
            return False

        # 6. Wait for result
        print("[5] Waiting for result...")

        for i in range(30):
            await asyncio.sleep(2)

            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                print(f"    Done at {i * 2}s")
                break

            if i % 5 == 0:
                await page.screenshot(
                    path=os.path.join(OUTPUT_DIR, f"debug_wait_{i}.png")
                )

        await page.screenshot(path=os.path.join(OUTPUT_DIR, "debug_05_result.png"))

        # 7. Download
        print("[6] Downloading...")

        dl_btn = await page.query_selector('button:has-text("下载")')

        if dl_btn:
            try:
                async with page.expect_download(timeout=30000) as download_info:
                    await dl_btn.click()

                download = await download_info.value
                dl_path = os.path.join(OUTPUT_DIR, "debug_download.png")
                await download.save_as(dl_path)
                print(f"    Saved: {dl_path}")
            except Exception as e:
                print(f"    Error: {e}")
                await browser.close()
                return False
        else:
            print("    No download button!")
            await browser.close()
            return False

        # 8. Verify
        print("[7] Verifying...")

        await browser.close()

        with open(dl_path, "rb") as f:
            header = f.read(8)
            print(f"    Header: {header.hex()}")

            if header[:4] == b"\x89PNG":
                print("\n" + "=" * 60)
                print("SUCCESS!")
                print("=" * 60)
                return True
            else:
                print("\n" + "=" * 60)
                print(f"FAILED! Got: {header[:8].hex()}")
                print("=" * 60)
                return False


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    asyncio.run(test_pdf_to_images_e2e())
