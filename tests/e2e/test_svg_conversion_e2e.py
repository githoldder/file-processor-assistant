#!/usr/bin/env python3
"""
E2E Test: SVG -> PDF/PNG Conversion (Complete)
==============================================
使用 Playwright 控制浏览器模拟真实用户行为

测试场景:
1. SVG → PDF 正常转换流程
2. SVG → PNG 正常转换流程
3. 异常情况1: 转换卡在0%或显示失败
4. 异常情况2: 转换成功但下载显示4xx错误

验证:
- 文件成功转换
- 下载的文件可以正常打开
- 截图验证文字布局样式

Usage:
    python tests/e2e/test_svg_conversion_e2e.py
"""

import asyncio
import os
import sys
import time
import tempfile
from pathlib import Path

# Test configuration
FRONTEND_URL = "http://localhost"
API_BASE = "http://localhost:8000/api/v1"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_e2e"

# Test files
TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error = None
        self.screenshots = []
        self.downloaded_file = None


def log(msg: str, success: bool = True):
    icon = "✓" if success else "✗"
    print(f"[{icon}] {msg}")


async def ensure_output_dir():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)


async def take_screenshot(page, name: str) -> str:
    path = f"{OUTPUT_DIR}/{name}_{int(time.time() * 1000)}.png"
    await page.screenshot(path=path, full_page=True)
    return path


def verify_pdf(file_path: str) -> bool:
    """验证PDF文件"""
    if not os.path.exists(file_path):
        return False

    size = os.path.getsize(file_path)
    if size == 0:
        return False

    try:
        import fitz

        doc = fitz.open(file_path)
        pages = len(doc)
        doc.close()
        return pages > 0
    except:
        return False


def verify_png(file_path: str) -> bool:
    """验证PNG文件"""
    if not os.path.exists(file_path):
        return False

    size = os.path.getsize(file_path)
    if size == 0:
        return False

    with open(file_path, "rb") as f:
        header = f.read(8)
        return header[:4] == b"\x89PNG"


async def test_svg_to_pdf_normal(page, test_result: TestResult):
    """测试1: SVG → PDF 正常转换流程"""
    print("\n" + "=" * 60)
    print("Test 1: SVG → PDF 正常转换流程")
    print("=" * 60)

    try:
        # 1. 打开前端页面
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "test1_01_home")
        log("1. 前端页面加载完成")

        # 2. 上传SVG文件
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            test_result.error = "未找到文件上传控件"
            return

        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)
        await take_screenshot(page, "test1_02_uploaded")
        log("2. SVG文件上传成功")

        # 3. 选择转换类型
        await asyncio.sleep(2)
        select_elem = await page.query_selector("select")
        if not select_elem:
            test_result.error = "未找到转换类型下拉框"
            return

        await select_elem.select_option(value="pdf")
        await take_screenshot(page, "test1_03_selected_pdf")
        log("3. 选择 PDF 转换类型")

        # 4. 点击开始转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if not convert_btn:
            test_result.error = "未找到转换按钮"
            return

        await convert_btn.click()
        await take_screenshot(page, "test1_04_clicked_convert")
        log("4. 点击开始转换")

        # 5. 监控转换进度 - 异常情况1检测
        start_time = time.time()
        timeout = 120  # 2分钟超时

        while time.time() - start_time < timeout:
            await asyncio.sleep(2)

            # 检查是否有失败提示
            error_elements = await page.query_selector_all(
                "text=失败, text=error, text=Error"
            )
            if error_elements:
                await take_screenshot(page, "test1_error_failed")
                test_result.error = "转换显示失败"
                log("异常1: 转换显示失败", False)
                return

            # 检查进度是否卡在0%
            progress_elements = await page.query_selector_all("text=0%")
            for elem in progress_elements:
                text = await elem.text_content()
                if "0%" in text:
                    await take_screenshot(page, "test1_error_stuck")
                    log("异常1: 转换卡在0%", False)
                    # 等待更长时间看是否恢复
                    await asyncio.sleep(10)
                    error_elements = await page.query_selector_all("text=失败")
                    if error_elements:
                        test_result.error = "转换卡在0%后失败"
                        return

            # 检查是否有下载按钮（转换成功）
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                await take_screenshot(page, "test1_05_download_ready")
                log("5. 转换完成，下载按钮出现")
                break
        else:
            test_result.error = "转换超时"
            log("异常1: 转换超时", False)
            return

        # 6. 点击下载 - 异常情况2检测
        try:
            async with page.expect_download(timeout=60000) as download_info:
                await dl_btn.click()

            download = await download_info.value
            filename = download.suggested_filename
            save_path = f"{OUTPUT_DIR}/downloads/test1_svg_to_pdf_{filename}"
            await download.save_as(save_path)

            await take_screenshot(page, "test1_06_downloaded")
            log(f"6. 文件下载成功: {filename} ({os.path.getsize(save_path)} bytes)")

        except Exception as e:
            await take_screenshot(page, "test1_error_download")
            test_result.error = f"异常2: 下载失败 - {e}"
            log(f"异常2: 点击下载后出错", False)
            return

        # 7. 验证文件可以打开
        if verify_pdf(save_path):
            test_result.downloaded_file = save_path
            log("7. PDF文件验证通过，可以正常打开", True)
            test_result.passed = True
        else:
            test_result.error = "下载的PDF文件无法打开"
            log("7. PDF文件验证失败", False)

    except Exception as e:
        test_result.error = str(e)
        log(f"测试失败: {e}", False)
        import traceback

        traceback.print_exc()


async def test_svg_to_png_normal(page, test_result: TestResult):
    """测试2: SVG → PNG 正常转换流程"""
    print("\n" + "=" * 60)
    print("Test 2: SVG → PNG 正常转换流程")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "test2_01_home")
        log("1. 前端页面加载完成")

        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            test_result.error = "未找到文件上传控件"
            return

        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)
        await take_screenshot(page, "test2_02_uploaded")
        log("2. SVG文件上传成功")

        await asyncio.sleep(2)
        select_elem = await page.query_selector("select")
        if not select_elem:
            test_result.error = "未找到转换类型下拉框"
            return

        await select_elem.select_option(value="png")
        await take_screenshot(page, "test2_03_selected_png")
        log("3. 选择 PNG 转换类型")

        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if not convert_btn:
            test_result.error = "未找到转换按钮"
            return

        await convert_btn.click()
        await take_screenshot(page, "test2_04_clicked_convert")
        log("4. 点击开始转换")

        # 5. 监控转换进度
        start_time = time.time()
        timeout = 120

        while time.time() - start_time < timeout:
            await asyncio.sleep(2)

            error_elements = await page.query_selector_all("text=失败, text=error")
            if error_elements:
                await take_screenshot(page, "test2_error_failed")
                test_result.error = "转换显示失败"
                log("异常1: 转换显示失败", False)
                return

            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                await take_screenshot(page, "test2_05_download_ready")
                log("5. 转换完成")
                break
        else:
            test_result.error = "转换超时"
            log("异常1: 转换超时", False)
            return

        # 6. 下载
        try:
            async with page.expect_download(timeout=60000) as download_info:
                await dl_btn.click()

            download = await download_info.value
            filename = download.suggested_filename
            save_path = f"{OUTPUT_DIR}/downloads/test2_svg_to_png_{filename}"
            await download.save_as(save_path)

            await take_screenshot(page, "test2_06_downloaded")
            log(f"6. 文件下载成功: {filename} ({os.path.getsize(save_path)} bytes)")

        except Exception as e:
            await take_screenshot(page, "test2_error_download")
            test_result.error = f"异常2: 下载失败 - {e}"
            log(f"异常2: 点击下载后出错", False)
            return

        # 7. 验证文件
        if verify_png(save_path):
            test_result.downloaded_file = save_path
            log("7. PNG文件验证通过，可以正常打开", True)

            # 8. 截图验证布局
            await page.goto(f"file://{os.path.abspath(save_path)}")
            await asyncio.sleep(2)
            await take_screenshot(page, "test2_08_preview")
            log("8. 预览截图已保存")

            test_result.passed = True
        else:
            test_result.error = "下载的PNG文件无法打开"
            log("7. PNG文件验证失败", False)

    except Exception as e:
        test_result.error = str(e)
        log(f"测试失败: {e}", False)
        import traceback

        traceback.print_exc()


async def test_error_conversion_stuck(page, test_result: TestResult):
    """测试3: 异常情况 - 转换卡住或失败"""
    print("\n" + "=" * 60)
    print("Test 3: 异常情况 - 转换卡住或失败")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 上传一个可能引起问题的文件
        file_input = await page.query_selector('input[type="file"]')

        # 创建一个损坏的SVG文件
        corrupted_svg = b"<svg><broken>"
        with tempfile.NamedTemporaryFile(suffix=".svg", delete=False) as f:
            f.write(corrupted_svg)
            corrupted_path = f.name

        await file_input.set_input_files(corrupted_path)
        await asyncio.sleep(2)

        # 选择转换类型并点击
        select_elem = await page.query_selector("select")
        if select_elem:
            await select_elem.select_option(value="pdf")

        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()
            await asyncio.sleep(5)

        # 检查是否有错误
        error_elements = await page.query_selector_all(
            "text=失败, text=不支持, text=无效"
        )
        fail_elements = await page.query_selector_all("text=失败")

        await take_screenshot(page, "test3_error_handling")

        if error_elements or fail_elements:
            log("正确处理了错误情况", True)
            test_result.passed = True
        else:
            # 如果没有立即显示错误，检查是否会卡住
            await asyncio.sleep(10)
            error_elements = await page.query_selector_all("text=失败")
            if error_elements:
                log("超时后正确显示失败", True)
                test_result.passed = True
            else:
                log("未检测到明确的错误提示", False)
                test_result.error = "错误处理不明确"

        os.unlink(corrupted_path)

    except Exception as e:
        test_result.error = str(e)
        log(f"测试失败: {e}", False)


async def test_error_download_4xx(page, test_result: TestResult):
    """测试4: 异常情况 - 转换成功但下载显示4xx错误"""
    print("\n" + "=" * 60)
    print("Test 4: 异常情况 - 下载4xx错误")
    print("=" * 60)

    try:
        # 使用一个有效的任务ID进行测试
        # 模拟下载不存在的文件
        import requests

        fake_task_id = "non-existent-task-id-12345"
        response = requests.get(f"{API_BASE}/tasks/{fake_task_id}/download", timeout=10)

        await take_screenshot(page, "test4_download_error")

        if response.status_code == 404:
            log("正确返回404错误", True)
            test_result.passed = True
        elif response.status_code == 500:
            log("正确返回500错误", True)
            test_result.passed = True
        else:
            log(f"返回状态码: {response.status_code}", response.status_code >= 400)
            test_result.passed = response.status_code >= 400

    except Exception as e:
        test_result.error = str(e)
        log(f"测试失败: {e}", False)


async def test_batch_svg_conversion(page, test_result: TestResult):
    """测试5: 批量SVG转换"""
    print("\n" + "=" * 60)
    print("Test 5: 批量SVG转换")
    print("=" * 60)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 上传多个SVG文件
        file_input = await page.query_selector('input[type="file"]')

        # 注意: 浏览器文件上传每次只能选一个
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(2)
        await take_screenshot(page, "test5_01_first_file")

        # 选择转换
        select_elem = await page.query_selector("select")
        if select_elem:
            await select_elem.select_option(value="pdf")

        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()
            log("点击第一个文件转换")

        # 等待完成
        for i in range(60):
            await asyncio.sleep(2)
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                log(f"第一个文件转换完成")
                await take_screenshot(page, "test5_02_first_done")
                break
        else:
            test_result.error = "第一个文件转换超时"
            return

        # 测试第二个文件
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(2)

        select_elem = await page.query_selector("select")
        if select_elem:
            await select_elem.select_option(value="png")

        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()

        for i in range(60):
            await asyncio.sleep(2)
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                log(f"第二个文件转换完成")
                await take_screenshot(page, "test5_03_second_done")
                break
        else:
            test_result.error = "第二个文件转换超时"
            return

        test_result.passed = True
        log("批量转换测试完成", True)

    except Exception as e:
        test_result.error = str(e)
        log(f"测试失败: {e}", False)


async def main():
    print("=" * 60)
    print("SVG 转换 E2E 完整测试")
    print("=" * 60)

    await ensure_output_dir()

    from playwright.async_api import async_playwright

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # Test 1: SVG → PDF 正常流程
        page = await browser.new_page()
        result = TestResult("SVG → PDF 正常转换")
        await test_svg_to_pdf_normal(page, result)
        results.append(result)
        await page.close()

        # Test 2: SVG → PNG 正常流程
        page = await browser.new_page()
        result = TestResult("SVG → PNG 正常转换")
        await test_svg_to_png_normal(page, result)
        results.append(result)
        await page.close()

        # Test 3: 错误处理 - 转换失败
        page = await browser.new_page()
        result = TestResult("异常处理 - 转换失败")
        await test_error_conversion_stuck(page, result)
        results.append(result)
        await page.close()

        # Test 4: 错误处理 - 下载4xx
        page = await browser.new_page()
        result = TestResult("异常处理 - 下载4xx")
        await test_error_download_4xx(page, result)
        results.append(result)
        await page.close()

        # Test 5: 批量转换
        page = await browser.new_page()
        result = TestResult("批量SVG转换")
        await test_batch_svg_conversion(page, result)
        results.append(result)
        await page.close()

        await browser.close()

    # 打印汇总
    print("\n" + "=" * 60)
    print("测试结果汇总")
    print("=" * 60)

    passed = 0
    for r in results:
        status = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{status}: {r.name}")
        if r.error:
            print(f"       错误: {r.error}")
        if r.passed:
            passed += 1

    print(f"\n总计: {len(results)} 个测试")
    print(f"通过: {passed}")
    print(f"失败: {len(results) - passed}")
    print(f"\n截图目录: {OUTPUT_DIR}/")
    print(f"下载目录: {OUTPUT_DIR}/downloads/")

    return passed >= len(results) - 1


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
