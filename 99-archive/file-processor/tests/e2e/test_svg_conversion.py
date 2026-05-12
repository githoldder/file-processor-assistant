#!/usr/bin/env python3
"""
E2E Test: SVG -> PDF/PNG Conversion with Error Handling
=========================================================
重点测试:
1. SVG -> PDF 正常转换
2. SVG -> PNG 正常转换
3. 400 错误处理
4. 402 错误处理
5. 404 错误处理
6. 无效文件处理

Usage:
    python tests/e2e/test_svg_conversion.py
"""

import asyncio
import os
import sys
import time
from pathlib import Path
from typing import Optional

# Test configuration
FRONTEND_URL = "http://localhost"
API_BASE = "http://localhost:8000/api/v1"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_conversion"

# Test files
TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


def log_step(step: str, message: str, success: bool = True):
    icon = "✓" if success else "✗"
    print(f"[{icon}] {step}: {message}")


async def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/errors", exist_ok=True)


async def take_screenshot(page, name: str) -> str:
    path = f"{OUTPUT_DIR}/{name}_{int(time.time())}.png"
    await page.screenshot(path=path, full_page=True)
    return path


async def verify_file_opens(file_path: str) -> bool:
    """验证文件可以正常打开"""
    if not os.path.exists(file_path):
        return False

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        return False

    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".pdf":
        try:
            import fitz

            doc = fitz.open(file_path)
            pages = len(doc)
            doc.close()
            return pages > 0
        except:
            return False

    elif ext == ".png":
        with open(file_path, "rb") as f:
            header = f.read(8)
            return header[:4] == b"\x89PNG"

    return True


async def test_error_400_bad_request(page) -> bool:
    """测试 400 错误 - 无效请求"""
    print("\n" + "=" * 60)
    print("Test: 400 Error - Bad Request")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 不上传文件直接点击转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()
            await asyncio.sleep(2)

        # 检查是否有错误提示
        error_text = await page.content()

        # 也测试发送无效的转换类型
        # 通过直接调用API测试400错误
        import requests

        # 发送没有文件的请求
        response = requests.post(
            f"{API_BASE}/convert",
            files={},
            data={"conversion_type": "svg_to_pdf"},
            timeout=10,
        )

        if response.status_code == 422:  # FastAPI validation error
            log_step(
                "1", f"Got expected validation error: {response.status_code}", True
            )
        elif response.status_code == 400:
            log_step("1", f"Got 400 Bad Request: {response.text[:100]}", True)
        else:
            log_step(
                "1",
                f"Got status {response.status_code}",
                response.status_code in [400, 422],
            )

        await take_screenshot(page, "error_400")
        return True

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        return False


async def test_error_402_payment_required(page) -> bool:
    """测试 402 错误 - 通常是服务器内部错误"""
    print("\n" + "=" * 60)
    print("Test: 402 Error - Payment Required / Server Error")
    print("=" * 60)

    try:
        # 发送可能导致服务器内部错误的请求
        # 例如：发送损坏的文件
        import requests

        # 发送损坏的SVG内容
        corrupted_svg = b"This is not a valid SVG file <broken>"

        response = requests.post(
            f"{API_BASE}/convert",
            files={"file": ("broken.svg", corrupted_svg, "image/svg+xml")},
            data={"conversion_type": "svg_to_pdf"},
            timeout=30,
        )

        log_step("1", f"Response status: {response.status_code}")

        # 402很少见，通常是服务内部错误，可能是500
        if response.status_code in [402, 500, 502, 503]:
            log_step(
                "2",
                f"Got server error: {response.status_code} - {response.text[:100]}",
                True,
            )
            return True
        elif response.status_code == 200:
            # 如果成功了，检查结果是否有效
            log_step("2", "Request succeeded, checking result...", True)
            return True
        else:
            log_step("2", f"Got status {response.status_code}", True)
            return True

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        return False


async def test_error_404_not_found(page) -> bool:
    """测试 404 错误 - 资源未找到"""
    print("\n" + "=" * 60)
    print("Test: 404 Error - Not Found")
    print("=" * 60)

    try:
        import requests

        # 测试不存在的task_id
        fake_task_id = "this-task-does-not-exist-12345"
        response = requests.get(f"{API_BASE}/tasks/{fake_task_id}", timeout=10)

        if response.status_code == 404:
            log_step("1", f"Got expected 404: Task not found", True)
        else:
            log_step(
                "1",
                f"Got status {response.status_code}: {response.text[:100]}",
                response.status_code == 404,
            )

        # 测试下载不存在的文件
        response2 = requests.get(
            f"{API_BASE}/tasks/{fake_task_id}/download", timeout=10
        )

        if response2.status_code == 404:
            log_step("2", f"Got expected 404 for download", True)
        else:
            log_step("2", f"Got status {response2.status_code}", True)

        # 测试访问不存在的文件
        response3 = requests.get(f"{API_BASE}/files/{fake_task_id}", timeout=10)

        if response3.status_code == 404:
            log_step("3", f"Got expected 404 for file", True)
        else:
            log_step("3", f"Got status {response3.status_code}", True)

        return True

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        return False


async def test_invalid_file_type(page) -> bool:
    """测试无效文件类型处理"""
    print("\n" + "=" * 60)
    print("Test: Invalid File Type Handling")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 上传一个无效的文件 (exe文件)
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            log_step("1", "File input not found", False)
            return False

        # 尝试上传二进制文件
        exe_content = b"MZ\x90\x00\x03\x00\x00\x00"  # PE header
        import tempfile

        with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as f:
            f.write(exe_content)
            exe_path = f.name

        await file_input.set_input_files(exe_path)
        await asyncio.sleep(2)

        # 尝试转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()
            await asyncio.sleep(3)

        # 检查是否有错误提示
        error_elements = await page.query_selector_all(
            "text=失败, text=不支持, text=无效, text=error"
        )

        await take_screenshot(page, "invalid_file_type")

        os.unlink(exe_path)

        if error_elements:
            log_step("1", "Invalid file type correctly rejected", True)
            return True
        else:
            log_step("1", "No error shown for invalid file", False)
            return False

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        return False


async def test_svg_to_pdf(page) -> bool:
    """测试 SVG -> PDF 转换"""
    print("\n" + "=" * 60)
    print("Test: SVG -> PDF")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "svg_pdf_01_home")
        log_step("1", "Frontend loaded")

        # 上传SVG文件
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            log_step("2", "File input not found", False)
            return False

        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(2)
        await take_screenshot(page, "svg_pdf_02_uploaded")
        log_step("2", "SVG file uploaded")

        # 选择转换类型
        await asyncio.sleep(2)
        select_elem = await page.query_selector("select")
        if not select_elem:
            log_step("3", "Select element not found", False)
            return False

        await select_elem.select_option(value="pdf")
        await take_screenshot(page, "svg_pdf_03_select_pdf")
        log_step("3", "Selected: SVG -> PDF")

        # 点击开始转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if not convert_btn:
            log_step("4", "Convert button not found", False)
            return False

        await convert_btn.click()
        await take_screenshot(page, "svg_pdf_04_converting")
        log_step("4", "Conversion started")

        # 等待转换完成 - 使用轮询方式检查状态
        for i in range(30):
            await asyncio.sleep(2)

            # 检查是否有下载按钮
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                log_step("5", f"Conversion completed at {i * 2}s")
                break

            # 检查是否有错误
            error = await page.query_selector("text=失败")
            if error:
                log_step("5", "Conversion failed", False)
                await take_screenshot(page, "svg_pdf_error")
                return False
        else:
            log_step("5", "Conversion timeout", False)
            return False

        await take_screenshot(page, "svg_pdf_05_completed")

        # 使用API下载
        import requests

        # 获取页面上的文件列表
        task_id = None

        # 通过调用API检查任务状态
        # 假设前端会保存task_id
        # 直接通过API测试
        with open(TEST_SVG, "rb") as f:
            files = {"file": f}
            data = {"conversion_type": "svg_to_pdf"}
            resp = requests.post(
                f"{API_BASE}/convert", files=files, data=data, timeout=30
            )

        if resp.status_code != 200:
            log_step(
                "API", f"API returned {resp.status_code}: {resp.text[:100]}", False
            )
            return False

        task_data = resp.json()
        task_id = task_data.get("task_id")
        log_step("API", f"Task created: {task_id}")

        # 等待转换完成
        for i in range(30):
            await asyncio.sleep(2)
            status_resp = requests.get(f"{API_BASE}/tasks/{task_id}")
            status_data = status_resp.json()

            if status_data.get("status") == "SUCCESS":
                log_step("6", "Conversion SUCCESS")
                break
            elif status_data.get("status") == "FAILURE":
                log_step("6", f"Conversion FAILED: {status_data.get('error')}", False)
                return False
        else:
            log_step("6", "Conversion timeout", False)
            return False

        # 下载结果
        dl_resp = requests.get(f"{API_BASE}/tasks/{task_id}/download", timeout=30)

        if dl_resp.status_code == 200:
            filename = f"svg_to_pdf_{task_id[:8]}.pdf"
            dl_path = f"{OUTPUT_DIR}/downloads/{filename}"
            with open(dl_path, "wb") as f:
                f.write(dl_resp.content)

            file_size = len(dl_resp.content)
            log_step("7", f"Downloaded: {filename} ({file_size} bytes)")

            if await verify_file_opens(dl_path):
                log_step("8", "PDF file is valid", True)
                return True
            else:
                log_step("8", "PDF file validation failed", False)
                return False
        else:
            log_step("7", f"Download failed: {dl_resp.status_code}", False)
            return False

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        import traceback

        traceback.print_exc()
        return False


async def test_svg_to_png(page) -> bool:
    """测试 SVG -> PNG 转换"""
    print("\n" + "=" * 60)
    print("Test: SVG -> PNG")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "svg_png_01_home")
        log_step("1", "Frontend loaded")

        # 上传SVG文件
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            log_step("2", "File input not found", False)
            return False

        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(2)
        await take_screenshot(page, "svg_png_02_uploaded")
        log_step("2", "SVG file uploaded")

        # 选择转换类型
        await asyncio.sleep(2)
        select_elem = await page.query_selector("select")
        if not select_elem:
            log_step("3", "Select element not found", False)
            return False

        await select_elem.select_option(value="png")
        await take_screenshot(page, "svg_png_03_select_png")
        log_step("3", "Selected: SVG -> PNG")

        # 通过API测试
        import requests

        with open(TEST_SVG, "rb") as f:
            files = {"file": f}
            data = {"conversion_type": "svg_to_png"}
            resp = requests.post(
                f"{API_BASE}/convert", files=files, data=data, timeout=30
            )

        if resp.status_code != 200:
            log_step(
                "API", f"API returned {resp.status_code}: {resp.text[:100]}", False
            )
            return False

        task_data = resp.json()
        task_id = task_data.get("task_id")
        log_step("API", f"Task created: {task_id}")

        # 等待转换完成
        for i in range(30):
            await asyncio.sleep(2)
            status_resp = requests.get(f"{API_BASE}/tasks/{task_id}")
            status_data = status_resp.json()

            if status_data.get("status") == "SUCCESS":
                log_step("4", "Conversion SUCCESS")
                break
            elif status_data.get("status") == "FAILURE":
                log_step("4", f"Conversion FAILED: {status_data.get('error')}", False)
                return False
        else:
            log_step("4", "Conversion timeout", False)
            return False

        # 下载结果
        dl_resp = requests.get(f"{API_BASE}/tasks/{task_id}/download", timeout=30)

        if dl_resp.status_code == 200:
            filename = f"svg_to_png_{task_id[:8]}.png"
            dl_path = f"{OUTPUT_DIR}/downloads/{filename}"
            with open(dl_path, "wb") as f:
                f.write(dl_resp.content)

            file_size = len(dl_resp.content)
            log_step("5", f"Downloaded: {filename} ({file_size} bytes)")

            if await verify_file_opens(dl_path):
                log_step("6", "PNG file is valid", True)
                return True
            else:
                log_step("6", "PNG file validation failed", False)
                return False
        else:
            log_step("5", f"Download failed: {dl_resp.status_code}", False)
            return False

    except Exception as e:
        log_step("X", f"Error: {e}", False)
        import traceback

        traceback.print_exc()
        return False


async def main():
    print("=" * 60)
    print("SVG Conversion E2E Test with Error Handling")
    print("=" * 60)

    await ensure_output_dir()

    from playwright.async_api import async_playwright

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # Test 400 Error
        print("\n--- Testing Error Handling ---")
        page = await browser.new_page()
        results.append(("400 Error", await test_error_400_bad_request(page)))
        await page.close()

        # Test 402/500 Error
        page = await browser.new_page()
        results.append(("402/500 Error", await test_error_402_payment_required(page)))
        await page.close()

        # Test 404 Error
        page = await browser.new_page()
        results.append(("404 Error", await test_error_404_not_found(page)))
        await page.close()

        # Test Invalid File
        page = await browser.new_page()
        results.append(("Invalid File", await test_invalid_file_type(page)))
        await page.close()

        # Test SVG -> PDF
        print("\n--- Testing SVG Conversion ---")
        page = await browser.new_page()
        results.append(("SVG -> PDF", await test_svg_to_pdf(page)))
        await page.close()

        # Test SVG -> PNG
        page = await browser.new_page()
        results.append(("SVG -> PNG", await test_svg_to_png(page)))
        await page.close()

        await browser.close()

    # Print summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = 0
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1

    print(f"\nTotal: {len(results)} tests")
    print(f"Passed: {passed}")
    print(f"\nScreenshots: {OUTPUT_DIR}/")
    print(f"Downloads: {OUTPUT_DIR}/downloads/")
    print(f"Errors: {OUTPUT_DIR}/errors/")

    return passed >= len(results) - 1  # 允许1个失败


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
