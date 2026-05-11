#!/usr/bin/env python3
"""
Browser automation test for file conversion - Tests all conversion types
"""

import asyncio
import os
from playwright.async_api import async_playwright

TEST_SAMPLES_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_samples"

CONVERSION_TESTS = [
    {
        "name": "PDF → Word",
        "conversion_type": "pdf_to_word",
        "input_file": "2025 APMCM Control Sheet_20251120102742.pdf",
        "button_text": "PDF → Word",
    },
    {
        "name": "Word → PDF",
        "conversion_type": "word_to_pdf",
        "input_file": "2025 APMCM Control Sheet.docx",
        "button_text": "Word → PDF",
    },
    {
        "name": "Excel → PDF",
        "conversion_type": "excel_to_pdf",
        "input_file": "5.2025计算机学院团委学生会换届汇总表.xlsx",
        "button_text": "Excel → PDF",
    },
    {
        "name": "PNG → PDF",
        "conversion_type": "png_to_pdf",
        "input_file": "证件照_1748960774467_413_579.png",
        "button_text": "PNG → PDF",
    },
]


async def test_conversion(page, test_config):
    """Test a single conversion type"""
    conversion_type = test_config["conversion_type"]
    input_file = test_config["input_file"]
    test_name = test_config["name"]
    button_text = test_config["button_text"]
    input_path = os.path.join(TEST_SAMPLES_DIR, input_file)

    print(f"\n{'=' * 50}")
    print(f"Testing: {test_name}")
    print(f"{'=' * 50}")

    # Navigate to frontend
    print("[1] Opening frontend...")
    await page.goto("http://127.0.0.1:5173")
    await page.wait_for_load_state("networkidle")
    await asyncio.sleep(1)

    # Find and click the conversion type button
    print(f"[2] Selecting {test_name}...")
    try:
        # Button text format: "PDF → Word"
        convert_btn = await page.query_selector(f'button:has-text("{button_text}")')
        if convert_btn:
            await convert_btn.click()
            print(f"    Clicked: {button_text}")
            await asyncio.sleep(0.5)
        else:
            print(f"    Button not found: {button_text}")
            await page.screenshot(
                path=f"test_screenshots/{conversion_type}_button_not_found.png"
            )
            return False
    except Exception as e:
        print(f"    Error selecting: {e}")
        return False

    # Upload file
    print("[3] Uploading file...")
    file_input = await page.query_selector('input[type="file"]')
    if file_input and os.path.exists(input_path):
        await file_input.set_input_files(input_path)
        print(f"    File: {input_file}")
        await asyncio.sleep(2)
    else:
        print(f"    File not found: {input_path}")
        return False

    # Wait for processing
    print("[4] Waiting for conversion...")
    await asyncio.sleep(3)

    # Wait more for conversion to complete
    await asyncio.sleep(7)

    # Check result
    # Look for download button
    download_btn = await page.query_selector('a:has-text("下载")')
    if download_btn:
        print(f"    ✓ {test_name} SUCCESS!")
        await page.screenshot(path=f"test_screenshots/{conversion_type}_success.png")
        return True

    # Check for error
    error_span = await page.query_selector('span:has-text("失败")')
    if error_span:
        print(f"    ✗ {test_name} FAILED")
        await page.screenshot(path=f"test_screenshots/{conversion_type}_failed.png")
        return False

    # Check for processing status
    processing = await page.query_selector(".animate-spin")
    if processing:
        print(f"    ... {test_name} still processing")
        await asyncio.sleep(5)

        # Check again
        download_btn = await page.query_selector('a:has-text("下载")')
        if download_btn:
            print(f"    ✓ {test_name} SUCCESS!")
            return True

        error_span = await page.query_selector('span:has-text("失败")')
        if error_span:
            print(f"    ✗ {test_name} FAILED")
            return False

    print(f"    ? {test_name} - Unknown state")
    await page.screenshot(path=f"test_screenshots/{conversion_type}_unknown.png")
    return False


async def main():
    os.makedirs("test_screenshots", exist_ok=True)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        results = []

        for test_config in CONVERSION_TESTS:
            result = await test_conversion(page, test_config)
            results.append({"name": test_config["name"], "success": result})
            await asyncio.sleep(2)

        await browser.close()

    # Print summary
    print(f"\n{'=' * 50}")
    print("Test Summary")
    print(f"{'=' * 50}")
    for r in results:
        status = "✓ PASS" if r["success"] else "✗ FAIL"
        print(f"{status}: {r['name']}")

    passed = sum(1 for r in results if r["success"])
    print(f"\nTotal: {passed}/{len(results)} passed")


if __name__ == "__main__":
    asyncio.run(main())
