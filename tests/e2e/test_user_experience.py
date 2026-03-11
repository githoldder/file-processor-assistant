#!/usr/bin/env python3
"""
Comprehensive E2E Test - User Experience Focus
Tests the complete user flow through the browser UI
"""

import asyncio
import os
from playwright.async_api import async_playwright
from datetime import datetime

FRONTEND_URL = "http://127.0.0.1:3002"
SCREENSHOT_DIR = "tests/e2e/screenshots"

SAMPLE_FILES = {
    "pdf": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf",
    "docx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx",
    "xlsx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx",
    "png": "/Users/caolei/Desktop/文件处理全能助手/test_samples/证件照_1748960774467_413_579.png",
    "md": "/Users/caolei/Desktop/文件处理全能助手/test_samples/瘦子增肌计划(1).md",
}


async def take_screenshot(page, name):
    os.makedirs(SCREENSHOT_DIR, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    path = f"{SCREENSHOT_DIR}/{timestamp}_{name}.png"
    await page.screenshot(path=path, full_page=True)
    return path


async def check_console_errors(page):
    errors = []
    page.on(
        "console",
        lambda msg: errors.append(f"[{msg.type}] {msg.text}")
        if msg.type == "error"
        else None,
    )
    page.on("pageerror", lambda err: errors.append(f"[PageError] {err}"))
    return errors


async def test_homepage_loading(page):
    """Test 1: Homepage loads correctly"""
    print("\n" + "=" * 60)
    print("TEST 1: Homepage Loading")
    print("=" * 60)

    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")
    await take_screenshot(page, "01_homepage")

    title = await page.title()
    print(f"Page title: {title}")

    body_text = await page.text_content("body")
    has_title = "文件处理" in body_text or "全能" in body_text
    print(f"Contains app title: {has_title}")

    file_input = await page.query_selector('input[type="file"]')
    print(f"File input found: {file_input is not None}")

    return has_title and file_input is not None


async def test_file_upload_flow(page, file_type, file_path):
    """Test 2: File upload flow"""
    print("\n" + "=" * 60)
    print(f"TEST 2: File Upload - {file_type.upper()}")
    print("=" * 60)

    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")
    await take_screenshot(page, f"02_{file_type}_initial")

    file_input = await page.query_selector('input[type="file"]')
    await file_input.set_input_files(file_path)
    await take_screenshot(page, f"02_{file_type}_uploaded")

    await asyncio.sleep(3)
    await take_screenshot(page, f"02_{file_type}_after_upload")

    body_text = await page.text_content("body")
    file_recognized = (
        os.path.basename(file_path).split(".")[0] in body_text
        or file_type.lower() in body_text.lower()
    )
    print(f"File recognized in UI: {file_recognized}")

    return file_recognized


async def test_format_selection(page, file_type):
    """Test 3: Format selection"""
    print("\n" + "=" * 60)
    print(f"TEST 3: Format Selection - {file_type.upper()}")
    print("=" * 60)

    select = await page.query_selector("select")
    if select:
        await take_screenshot(page, f"03_{file_type}_select_visible")
        print("Format selector visible: True")

        options = await select.query_selector_all("option")
        print(f"Available formats: {len(options)}")
        return True
    return False


async def test_conversion_and_download(page, file_type, conversion_type):
    """Test 4 & 5: Conversion and Download"""
    print("\n" + "=" * 60)
    print(f"TEST 4-5: Conversion & Download - {file_type} to {conversion_type}")
    print("=" * 60)

    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")

    # Upload file first
    file_path = SAMPLE_FILES.get(file_type)
    if not file_path or not os.path.exists(file_path):
        print(f"Test file not found: {file_type}")
        return False

    file_input = await page.query_selector('input[type="file"]')
    await file_input.set_input_files(file_path)

    # Wait for file to be processed and button to appear
    await asyncio.sleep(5)

    # Find the start conversion button - it's inside the file card
    start_btn = await page.query_selector('button:has-text("开始转换")')

    if not start_btn:
        # Try alternative - check what's on the page
        page_html = await page.content()
        await take_screenshot(page, f"04_{file_type}_debug")

        # Check if there's a convert button with different selector
        convert_buttons = await page.query_selector_all("button")
        print(f"Found {len(convert_buttons)} buttons on page")

        # Look for any button with "开始" or "转换"
        for btn in convert_buttons:
            text = await btn.text_content()
            print(f"Button text: {text}")

        if not start_btn:
            print("Start button not found (file may not be uploaded)")
            return False

    await start_btn.click()
    await take_screenshot(page, f"04_{file_type}_conversion_started")

    success = False
    for i in range(30):
        await asyncio.sleep(1)

        dl_btn = await page.query_selector('button:has-text("下载")')
        if dl_btn:
            await take_screenshot(page, f"05_{file_type}_download_ready")
            print(f"Download button appeared at {i + 1}s")

            download_url = await dl_btn.get_attribute("onclick")
            print(f"Download action: {download_url}")
            success = True
            break

        error_elem = await page.query_selector('span:has-text("失败")')
        if error_elem:
            await take_screenshot(page, f"05_{file_type}_failed")
            print(f"Conversion failed at {i + 1}s")
            break

        # Also check for download link (a tag)
        dl_link = await page.query_selector('a:has-text("下载")')
        if dl_link:
            await take_screenshot(page, f"05_{file_type}_download_ready_link")
            print(f"Download link appeared at {i + 1}s")
            success = True
            break

    if not success:
        await take_screenshot(page, f"05_{file_type}_timeout")
        print("Conversion timeout - no download button found")

    return success


async def test_ui_responsiveness(page):
    """Test 6: UI responsiveness"""
    print("\n" + "=" * 60)
    print("TEST 6: UI Responsiveness")
    print("=" * 60)

    await page.set_viewport_size({"width": 375, "height": 667})
    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")
    await take_screenshot(page, "06_mobile_view")

    await page.set_viewport_size({"width": 1920, "height": 1080})
    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")
    await take_screenshot(page, "06_desktop_view")

    print("Viewport sizes tested: 375px, 1920px")
    return True


async def test_error_handling(page):
    """Test 7: Error handling"""
    print("\n" + "=" * 60)
    print("TEST 7: Error Handling")
    print("=" * 60)

    await page.goto(FRONTEND_URL)
    await page.wait_for_load_state("networkidle")

    start_btn = await page.query_selector('button:has-text("开始转换")')
    if start_btn:
        await start_btn.click()
        await asyncio.sleep(2)
        await take_screenshot(page, "07_no_file_error")
        print("Error handling tested (no file)")

    return True


async def run_all_tests():
    print("\n" + "=" * 60)
    print("FILE PROCESSOR - COMPREHENSIVE E2E TEST")
    print("User Experience Focus")
    print("=" * 60)

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # Test each file type
        for file_type, file_path in SAMPLE_FILES.items():
            if not os.path.exists(file_path):
                print(f"Skipping {file_type} - test file not found")
                continue

            page = await browser.new_page()

            # Capture console errors
            console_errors = []

            def handle_console(msg):
                if msg.type == "error":
                    console_errors.append(msg.text)

            page.on("console", handle_console)

            try:
                # Test homepage
                r1 = await test_homepage_loading(page)
                results.append(("Homepage", r1))

                # Test upload
                r2 = await test_file_upload_flow(page, file_type, file_path)
                results.append((f"Upload {file_type}", r2))

                # Test format selection
                r3 = await test_format_selection(page, file_type)
                results.append((f"Format select {file_type}", r3))

                # Test conversion
                conversion_map = {
                    "pdf": "word",
                    "docx": "pdf",
                    "xlsx": "pdf",
                    "png": "pdf",
                    "md": "pdf",
                }
                r4 = await test_conversion_and_download(
                    page, file_type, conversion_map.get(file_type, "pdf")
                )
                results.append((f"Convert {file_type}", r4))

            except Exception as e:
                print(f"Error testing {file_type}: {e}")
                results.append((f"Error {file_type}", False))
            finally:
                await page.close()

        # UI Tests
        page = await browser.new_page()
        try:
            r5 = await test_ui_responsiveness(page)
            results.append(("Responsiveness", r5))

            r6 = await test_error_handling(page)
            results.append(("Error handling", r6))
        finally:
            await browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{name}: {status}")

    passed_count = sum(1 for _, p in results if p)
    print(f"\nTotal: {passed_count}/{len(results)} passed")

    return passed_count == len(results)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
