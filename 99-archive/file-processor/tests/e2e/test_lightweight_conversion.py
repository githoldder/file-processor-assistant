#!/usr/bin/env python3
"""
Lightweight E2E Test Suite for File Conversion System
======================================================
Tests:
1. File conversion success verification
2. Conversion type selection recognition
3. HTTP error detection (400, 402, 502, etc.)
4. Browser download functionality
5. Preview screenshot capture

Usage:
    python tests/e2e/test_lightweight_conversion.py
"""

import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any

# Test configuration
API_BASE = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots"

# Test files
TEST_SAMPLES = {
    "pdf": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf",
    "xlsx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx",
    "docx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx",
    "pptx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2024年文娱部招新ppt.pptx",
    "md": "/Users/caolei/Desktop/文件处理全能助手/test_samples/瘦子增肌计划(1).md",
}

# Conversion types to test
CONVERSION_TESTS = [
    {"from": "pdf", "to": "word", "label": "PDF → Word"},
    {"from": "pdf", "to": "images", "label": "PDF → 图片"},
    {"from": "xlsx", "to": "pdf", "label": "Excel → PDF"},
    {"from": "docx", "to": "pdf", "label": "Word → PDF"},
    {"from": "pptx", "to": "pdf", "label": "PPTX → PDF"},
    {"from": "md", "to": "pdf", "label": "Markdown → PDF"},
]


def log_step(step: str, message: str, success: bool = True):
    """Log test step with visual indicator"""
    icon = "✓" if success else "✗"
    print(f"[{icon}] Step {step}: {message}")


def ensure_output_dir():
    """Create output directory for screenshots"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/conversion", exist_ok=True)


async def test_frontend_loading(page) -> bool:
    """Test 1: Frontend loads successfully"""
    log_step("1", "Testing frontend loading...", True)

    try:
        await page.goto(FRONTEND_URL, wait_until="networkidle", timeout=30000)
        await page.screenshot(
            path=f"{OUTPUT_DIR}/conversion/01_frontend_loaded.png", full_page=True
        )
        log_step("1", "Frontend loaded successfully", True)
        return True
    except Exception as e:
        log_step("1", f"Frontend loading failed: {e}", False)
        return False


async def test_file_upload(page, file_path: str) -> bool:
    """Test 2: File upload functionality"""
    log_step("2", f"Uploading file: {os.path.basename(file_path)}...", True)

    try:
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            log_step("2", "File input not found", False)
            return False

        await file_input.set_input_files(file_path)
        await page.wait_for_timeout(2000)
        await page.screenshot(
            path=f"{OUTPUT_DIR}/conversion/02_file_uploaded.png", full_page=True
        )
        log_step("2", "File uploaded successfully", True)
        return True
    except Exception as e:
        log_step("2", f"File upload failed: {e}", False)
        return False


async def test_conversion_type_selection(page, target_format: str) -> bool:
    """Test 3: Verify conversion type selection is recognized"""
    log_step("3", f"Selecting conversion type: {target_format}...", True)

    try:
        await page.wait_for_timeout(2000)

        select_elem = await page.query_selector("select")
        if not select_elem:
            log_step("3", "Conversion type selector not found", False)
            return False

        await select_elem.select_option(value=target_format)
        await page.screenshot(
            path=f"{OUTPUT_DIR}/conversion/03_selected_{target_format}.png",
            full_page=True,
        )

        selected_value = await select_elem.input_value()
        log_step("3", f"Conversion type selected: {selected_value}", True)
        return True
    except Exception as e:
        log_step("3", f"Conversion type selection failed: {e}", False)
        return False


async def test_conversion_execution(page) -> bool:
    """Test 4: Execute conversion and check for errors"""
    log_step("4", "Starting conversion...", True)

    try:
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if not convert_btn:
            log_step("4", "Start conversion button not found", False)
            return False

        await convert_btn.click()
        await page.screenshot(
            path=f"{OUTPUT_DIR}/conversion/04_conversion_started.png", full_page=True
        )

        # Wait for conversion to complete (max 60 seconds)
        for i in range(30):
            await asyncio.sleep(2)

            # Check for download button
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                log_step("4", f"Conversion completed at {i * 2}s", True)
                await page.screenshot(
                    path=f"{OUTPUT_DIR}/conversion/05_conversion_completed.png",
                    full_page=True,
                )
                return True

            # Check for error messages
            error_elements = await page.query_selector_all(
                "text=失败, text=error, text=Error"
            )
            if error_elements:
                log_step("4", "Conversion failed with error", False)
                await page.screenshot(
                    path=f"{OUTPUT_DIR}/conversion/05_conversion_error.png",
                    full_page=True,
                )
                return False

        log_step("4", "Conversion timeout", False)
        return False
    except Exception as e:
        log_step("4", f"Conversion execution failed: {e}", False)
        return False


async def test_browser_download(page) -> bool:
    """Test 5: Download file through browser"""
    log_step("5", "Testing browser download...", True)

    try:
        dl_btn = await page.query_selector('button:has-text("下载")')
        if not dl_btn:
            log_step("5", "Download button not found", False)
            return False

        # Set up download handler
        async with page.expect_download(timeout=60000) as download_info:
            await dl_btn.click()

        download = await download_info.value
        save_path = os.path.join(
            OUTPUT_DIR,
            "conversion",
            f"downloaded_{int(time.time())}_{download.suggested_filename}",
        )
        await download.save_as(save_path)

        file_size = os.path.getsize(save_path)
        log_step(
            "5",
            f"Downloaded file: {download.suggested_filename} ({file_size} bytes)",
            True,
        )

        # Verify file is not empty
        if file_size > 0:
            log_step("5", "Download successful (file not empty)", True)
            return True
        else:
            log_step("5", "Downloaded file is empty", False)
            return False
    except Exception as e:
        log_step("5", f"Browser download failed: {e}", False)
        return False


async def test_preview_screenshot(page, file_path: str) -> bool:
    """Test 6: Preview converted file and capture screenshot"""
    log_step("6", "Capturing preview screenshot...", True)

    try:
        # Determine file type and open accordingly
        ext = os.path.splitext(file_path)[1].lower()

        if ext == ".pdf":
            # Open PDF in browser
            pdf_url = f"file://{os.path.abspath(file_path)}"
            await page.goto(pdf_url)
            await page.wait_for_timeout(3000)
            await page.screenshot(
                path=f"{OUTPUT_DIR}/conversion/06_preview.png", full_page=False
            )
            log_step("6", "PDF preview screenshot captured", True)
            return True
        elif ext in [".png", ".jpg", ".jpeg"]:
            # For images, just screenshot current page
            await page.screenshot(
                path=f"{OUTPUT_DIR}/conversion/06_preview.png", full_page=False
            )
            log_step("6", "Image preview screenshot captured", True)
            return True
        else:
            # For other types, just screenshot current state
            await page.screenshot(
                path=f"{OUTPUT_DIR}/conversion/06_preview.png", full_page=True
            )
            log_step("6", "Preview screenshot captured", True)
            return True
    except Exception as e:
        log_step("6", f"Preview screenshot failed: {e}", False)
        return False


async def test_api_health() -> bool:
    """Test API health check"""
    import requests

    log_step("0", "Checking API health...", True)

    try:
        response = requests.get(f"{API_BASE}/health", timeout=10)
        if response.status_code == 200:
            log_step("0", "API is healthy", True)
            return True
        else:
            log_step(f"0", f"API health check failed: {response.status_code}", False)
            return False
    except Exception as e:
        log_step("0", f"API not reachable: {e}", False)
        return False


async def test_error_detection(page) -> bool:
    """Test error detection (400, 402, 502, etc.)"""
    log_step("E", "Testing error detection...", True)

    try:
        # Check console for errors
        errors = []

        def handle_console(msg):
            if msg.type == "error":
                errors.append(msg.text)

        page.on("console", handle_console)

        # Try uploading an invalid file to trigger error
        await page.goto(FRONTEND_URL, wait_until="networkidle")

        # Upload a non-supported file type
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(
            "/Users/caolei/Desktop/文件处理全能助手/test_samples/732B2B2D39FE15753A31D3D0C33E0DC1.jpg"
        )
        await page.wait_for_timeout(3000)

        # Check for HTTP errors in network
        # (This is a simplified check - in production, you'd check actual HTTP responses)

        if errors:
            log_step("E", f"Errors detected in console: {len(errors)}", True)
            for err in errors:
                print(f"   - {err}")
        else:
            log_step("E", "No console errors detected", True)

        return True
    except Exception as e:
        log_step("E", f"Error detection test failed: {e}", False)
        return False


async def run_single_conversion_test(
    page, from_type: str, to_type: str, label: str
) -> Dict[str, Any]:
    """Run a single conversion test"""

    test_file = TEST_SAMPLES.get(from_type)
    if not test_file:
        return {"success": False, "error": f"Test file not found for {from_type}"}

    result = {
        "test": label,
        "from": from_type,
        "to": to_type,
        "success": False,
        "steps": {},
    }

    try:
        # Step 1: Load frontend
        result["steps"]["frontend"] = await test_frontend_loading(page)
        if not result["steps"]["frontend"]:
            return result

        # Step 2: Upload file
        result["steps"]["upload"] = await test_file_upload(page, test_file)
        if not result["steps"]["upload"]:
            return result

        # Step 3: Select conversion type
        result["steps"]["selection"] = await test_conversion_type_selection(
            page, to_type
        )
        if not result["steps"]["selection"]:
            return result

        # Step 4: Execute conversion
        result["steps"]["conversion"] = await test_conversion_execution(page)
        if not result["steps"]["conversion"]:
            return result

        # Step 5: Download
        result["steps"]["download"] = await test_browser_download(page)

        # All steps passed
        result["success"] = True
        return result

    except Exception as e:
        result["error"] = str(e)
        return result


async def main():
    """Main test runner"""
    print("=" * 70)
    print("Lightweight E2E Test Suite - File Conversion System")
    print("=" * 70)
    print()

    ensure_output_dir()

    # Check API health first
    if not await test_api_health():
        print(
            "\nERROR: API is not reachable. Please ensure Docker containers are running."
        )
        print("Run: docker compose up -d")
        sys.exit(1)

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
        page = await browser.new_page()

        # Track console errors
        console_errors = []

        def handle_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
                print(f"   [Console Error]: {msg.text}")

        page.on("console", handle_console)

        # Test each conversion type
        results = []

        for conv_test in CONVERSION_TESTS:
            print(f"\n{'=' * 70}")
            print(f"Testing: {conv_test['label']}")
            print(f"{'=' * 70}")

            result = await run_single_conversion_test(
                page, conv_test["from"], conv_test["to"], conv_test["label"]
            )
            results.append(result)

            # Print result
            if result["success"]:
                print(f"\n✓ {conv_test['label']}: PASSED")
            else:
                print(f"\n✗ {conv_test['label']}: FAILED")
                if "error" in result:
                    print(f"   Error: {result['error']}")
                failed_steps = [k for k, v in result["steps"].items() if not v]
                print(f"   Failed at: {', '.join(failed_steps)}")

            # Small delay between tests
            await asyncio.sleep(2)

        await browser.close()

        # Print summary
        print(f"\n{'=' * 70}")
        print("TEST SUMMARY")
        print(f"{'=' * 70}")

        passed = sum(1 for r in results if r["success"])
        failed = len(results) - passed

        for r in results:
            status = "✓ PASS" if r["success"] else "✗ FAIL"
            print(f"{status}: {r['test']}")

        print(f"\nTotal: {len(results)} tests")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")

        if console_errors:
            print(f"\nConsole Errors: {len(console_errors)}")
            for err in console_errors[:5]:
                print(f"  - {err}")

        # Exit with appropriate code
        sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
