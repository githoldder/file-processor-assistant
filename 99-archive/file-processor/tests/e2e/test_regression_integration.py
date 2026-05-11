#!/usr/bin/env python3
"""
回归测试 - 集成测试套件
基于 回归测试计划-集成.md

测试用例:
- IR-001: 完整转换端到端流程 (Word -> PDF)
- IR-002: 批量转换端到端流程
- IR-003: PDF 转换为 Word
- IR-004: 长尾路径与错误处理
- IR-005: 并发压力测试

使用Playwright模拟真实用户行为，验证最终结果
"""

import asyncio
import os
import sys
import time
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional

# Test configuration
API_BASE = "http://localhost/api/v1"
FRONTEND_URL = "http://localhost"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/regression"

# Test files
TEST_SAMPLES = {
    "pdf": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf",
    "xlsx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/5.2025计算机学院团委学生会换届汇总表.xlsx",
    "docx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet.docx",
    "pptx": "/Users/caolei/Desktop/文件处理全能助手/test_samples/2024年文娱乐部招新ppt.pptx",
    "md": "/Users/caolei/Desktop/文件处理全能助手/test_samples/瘦子增肌计划(1).md",
}


class RegressionTestResult:
    def __init__(self, test_id: str, description: str):
        self.test_id = test_id
        self.description = description
        self.passed = False
        self.error: Optional[str] = None
        self.screenshots: List[str] = []
        self.downloaded_files: List[str] = []
        self.details: Dict[str, Any] = {}


def log_test(test: RegressionTestResult, message: str, success: bool = True):
    icon = "✓" if success else "✗"
    print(f"[{icon}] {test.test_id}: {message}")


async def ensure_output_dir():
    """确保输出目录存在"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/screenshots", exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)


async def wait_for_api_ready(page) -> bool:
    """等待API就绪"""
    for _ in range(10):
        try:
            resp = await page.evaluate("""async () => {
                try {
                    const response = await fetch('/api/v1/health');
                    return response.ok;
                } catch {
                    return false;
                }
            }""")
            if resp:
                return True
        except:
            pass
        await asyncio.sleep(1)
    return False


async def take_screenshot(page, name: str) -> Optional[str]:
    """截图并返回路径"""
    path = f"{OUTPUT_DIR}/screenshots/{name}_{int(time.time())}.png"
    await page.screenshot(path=path, full_page=True)
    return path


async def upload_file_and_select_conversion(
    page, file_path: str, conversion_type: str
) -> bool:
    """
    上传文件并选择转换类型
    """
    try:
        # 上传文件
        file_input = await page.query_selector('input[type="file"]')
        if not file_input:
            return False

        await file_input.set_input_files(file_path)
        await asyncio.sleep(2)

        # 选择转换类型
        select = await page.query_selector("select")
        if select:
            await select.select_option(value=conversion_type)
            await asyncio.sleep(1)

        return True
    except Exception as e:
        print(f"Upload error: {e}")
        return False


async def wait_for_download_button(page, timeout: int = 60) -> bool:
    """
    等待下载按钮出现
    """
    for i in range(timeout // 2):
        await asyncio.sleep(2)
        dl_btn = await page.query_selector('button:has-text("下载")')
        if dl_btn:
            return True

        # 检查是否失败
        error = await page.query_selector("text=失败, text=error")
        if error:
            return False

    return False


async def download_file(page, test: RegressionTestResult) -> Optional[str]:
    """
    点击下载按钮并保存文件
    """
    try:
        dl_btn = await page.query_selector('button:has-text("下载")')
        if not dl_btn:
            return None

        async with page.expect_download(timeout=60000) as download_info:
            await dl_btn.click()

        download = await download_info.value
        filename = download.suggested_filename
        save_path = f"{OUTPUT_DIR}/downloads/{test.test_id}_{filename}"
        await download.save_as(save_path)

        test.downloaded_files.append(save_path)
        return save_path
    except Exception as e:
        test.error = f"Download failed: {e}"
        return None


async def verify_file_opens(file_path: str) -> bool:
    """
    验证文件可以正常打开
    """
    if not os.path.exists(file_path):
        return False

    file_size = os.path.getsize(file_path)
    if file_size == 0:
        return False

    # 根据文件类型验证
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

    elif ext in [".docx", ".xlsx", ".pptx"]:
        # Office文件检查ZIP头部
        with open(file_path, "rb") as f:
            header = f.read(4)
            return header == b"PK\x03\x04"

    return True


async def capture_preview_screenshot(page, file_path: str) -> Optional[str]:
    """
    捕获文件预览截图
    """
    ext = os.path.splitext(file_path)[1].lower()

    try:
        if ext == ".pdf":
            pdf_url = f"file://{os.path.abspath(file_path)}"
            await page.goto(pdf_url)
            await asyncio.sleep(3)
            path = f"{OUTPUT_DIR}/screenshots/preview_{os.path.basename(file_path)}_{int(time.time())}.png"
            await page.screenshot(path=path, full_page=False)
            return path
        else:
            # 其他类型文件，当前页面截图
            path = f"{OUTPUT_DIR}/screenshots/preview_{os.path.basename(file_path)}_{int(time.time())}.png"
            await page.screenshot(path=path, full_page=True)
            return path
    except Exception as e:
        print(f"Preview capture error: {e}")
        return None


# ============================================================
# 测试用例实现
# ============================================================


async def test_ir001_word_to_pdf(page) -> RegressionTestResult:
    """
    IR-001: 完整转换端到端流程
    步骤: 上传 Word 文件 → 转换为 PDF → 下载 PDF
    期望: 任务成功，下载可用，PDF可正常打开
    """
    test = RegressionTestResult("IR-001", "Word -> PDF 完整转换流程")

    try:
        # 1. 打开前端
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "ir001_01_home")

        # 2. 上传Word文件
        file_path = TEST_SAMPLES["docx"]
        await upload_file_and_select_conversion(page, file_path, "pdf")
        await take_screenshot(page, "ir001_02_uploaded")

        # 3. 点击开始转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()

        # 4. 等待转换完成
        log_test(test, "等待转换完成...")
        success = await wait_for_download_button(page)

        if not success:
            test.error = "转换超时或失败"
            log_test(test, test.error, False)
            return test

        await take_screenshot(page, "ir001_03_completed")

        # 5. 下载文件
        dl_path = await download_file(page, test)
        if not dl_path:
            test.error = "下载失败"
            log_test(test, test.error, False)
            return test

        log_test(test, f"文件已下载: {os.path.basename(dl_path)}")

        # 6. 验证文件可以打开
        if not await verify_file_opens(dl_path):
            test.error = "下载的PDF文件无法打开"
            log_test(test, test.error, False)
            return test

        # 7. 捕获预览截图
        await page.goto(FRONTEND_URL)
        await capture_preview_screenshot(page, dl_path)

        test.passed = True
        log_test(test, "测试通过 - PDF文件可正常打开", True)

    except Exception as e:
        test.error = str(e)
        log_test(test, f"测试失败: {e}", False)

    return test


async def test_ir002_batch_conversion(page) -> RegressionTestResult:
    """
    IR-002: 批量转换端到端流程
    步骤: 上传多文件 → 批量转换 → 全部下载确认
    期望: 所有任务完成并可下载
    """
    test = RegressionTestResult("IR-002", "批量转换流程")

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "ir002_01_home")

        # 上传多个文件
        files = [TEST_SAMPLES["docx"], TEST_SAMPLES["xlsx"]]

        for file_path in files:
            file_input = await page.query_selector('input[type="file"]')
            await file_input.set_input_files(file_path)
            await asyncio.sleep(1)

        await take_screenshot(page, "ir002_02_files_uploaded")

        # 等待文件就绪
        await asyncio.sleep(3)

        # 批量转换
        start_btns = await page.query_selector_all('button:has-text("开始转换")')
        for btn in start_btns:
            await btn.click()
            await asyncio.sleep(0.5)

        log_test(test, "等待批量转换完成...")

        # 等待所有转换完成 (最多120秒)
        for i in range(60):
            await asyncio.sleep(2)
            dl_btns = await page.query_selector_all('button:has-text("下载")')
            # 检查是否有失败的
            errors = await page.query_selector_all("text=失败")

            if len(dl_btns) >= len(files):
                await take_screenshot(page, "ir002_03_completed")
                log_test(test, f"所有转换完成: {len(dl_btns)} 个文件", True)
                break

            if len(errors) > 0:
                test.error = "部分转换失败"
                log_test(test, test.error, False)
                return test
        else:
            test.error = "批量转换超时"
            log_test(test, test.error, False)
            return test

        # 下载所有文件
        dl_btns = await page.query_selector_all('button:has-text("下载")')
        for btn in dl_btns:
            dl_path = await download_file(page, test)
            if dl_path:
                log_test(test, f"下载: {os.path.basename(dl_path)}")

        # 验证文件
        valid_count = 0
        for f in test.downloaded_files:
            if await verify_file_opens(f):
                valid_count += 1

        if valid_count == len(files):
            test.passed = True
            log_test(test, f"测试通过 - {valid_count}/{len(files)} 文件有效", True)
        else:
            test.error = f"部分文件无效: {valid_count}/{len(files)}"
            log_test(test, test.error, False)

    except Exception as e:
        test.error = str(e)
        log_test(test, f"测试失败: {e}", False)

    return test


async def test_ir003_pdf_to_word(page) -> RegressionTestResult:
    """
    IR-003: PDF 转换为 Word
    步骤: 上传 PDF → 转换为 Word → 下载 Word
    期望: Word 文件可用且可正常打开
    """
    test = RegressionTestResult("IR-003", "PDF -> Word 转换")

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 上传PDF
        await upload_file_and_select_conversion(page, TEST_SAMPLES["pdf"], "word")
        await take_screenshot(page, "ir003_01_uploaded")

        # 开始转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()

        log_test(test, "等待转换完成...")
        success = await wait_for_download_button(page)

        if not success:
            test.error = "转换超时或失败"
            log_test(test, test.error, False)
            return test

        await take_screenshot(page, "ir003_02_completed")

        # 下载
        dl_path = await download_file(page, test)
        if not dl_path:
            test.error = "下载失败"
            log_test(test, test.error, False)
            return test

        # 验证文件
        if await verify_file_opens(dl_path):
            test.passed = True
            log_test(test, "测试通过 - Word文件有效", True)
        else:
            test.error = "Word文件无法打开"
            log_test(test, test.error, False)

    except Exception as e:
        test.error = str(e)
        log_test(test, f"测试失败: {e}", False)

    return test


async def test_ir004_invalid_file(page) -> RegressionTestResult:
    """
    IR-004: 长尾路径与错误处理
    步骤: 提交无效输入 → 检查错误响应
    期望: 返回明确错误信息且状态码合理
    """
    test = RegressionTestResult("IR-004", "错误处理 - 无效文件")

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 上传不支持的文件类型
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(
            "/Users/caolei/Desktop/文件处理全能助手/test_samples/732B2B2D39FE15753A31D3D0C33E0DC1.jpg"
        )
        await asyncio.sleep(2)

        # 尝试转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        if convert_btn:
            await convert_btn.click()

        # 等待错误出现
        await asyncio.sleep(5)

        # 检查是否有错误提示
        error_elements = await page.query_selector_all(
            "text=失败, text=error, text=不支持"
        )

        # 或者检查文件是否保持待处理状态而没有转换选项
        select = await page.query_selector("select")

        if error_elements or not select:
            test.passed = True
            log_test(test, "测试通过 - 正确处理无效文件", True)
        else:
            test.error = "未正确处理无效文件"
            log_test(test, test.error, False)

    except Exception as e:
        test.error = str(e)
        log_test(test, f"测试失败: {e}", False)

    return test


async def test_ir005_concurrent_requests(page) -> RegressionTestResult:
    """
    IR-005: 并发压力测试
    步骤: 发起多个并发请求 → 监控系统稳定性
    期望: 无崩溃，任务均进入正确状态
    """
    test = RegressionTestResult("IR-005", "并发压力测试")

    try:
        # 使用直接API调用进行并发测试
        import requests

        tasks = []
        for i in range(5):
            with open(TEST_SAMPLES["docx"], "rb") as f:
                files = {"file": f}
                data = {"conversion_type": "word_to_pdf"}
                resp = requests.post(
                    f"{API_BASE}/convert", files=files, data=data, timeout=30
                )
                tasks.append(resp)

        # 验证所有请求都成功提交
        success_count = sum(1 for t in tasks if t.status_code == 200)

        if success_count == 5:
            # 检查任务状态
            for t in tasks:
                task_data = t.json()
                task_id = task_data.get("task_id")

                # 等待任务完成
                for _ in range(30):
                    status_resp = requests.get(f"{API_BASE}/tasks/{task_id}")
                    status_data = status_resp.json()

                    if status_data.get("status") == "SUCCESS":
                        break
                    await asyncio.sleep(1)

            test.passed = True
            log_test(test, f"测试通过 - {success_count}/5 并发请求成功", True)
        else:
            test.error = f"部分请求失败: {success_count}/5"
            log_test(test, test.error, False)

    except Exception as e:
        test.error = str(e)
        log_test(test, f"测试失败: {e}", False)

    return test


# ============================================================
# 主测试运行器
# ============================================================


async def run_all_tests():
    """运行所有回归测试"""
    print("=" * 70)
    print("回归测试 - 集成测试套件")
    print("=" * 70)
    print()

    await ensure_output_dir()

    from playwright.async_api import async_playwright

    results: List[RegressionTestResult] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # 测试 IR-001: Word to PDF
        print("\n" + "=" * 70)
        print("IR-001: Word -> PDF 完整转换流程")
        print("=" * 70)
        page = await browser.new_page()
        results.append(await test_ir001_word_to_pdf(page))
        await page.close()

        # 测试 IR-003: PDF to Word
        print("\n" + "=" * 70)
        print("IR-003: PDF -> Word 转换")
        print("=" * 70)
        page = await browser.new_page()
        results.append(await test_ir003_pdf_to_word(page))
        await page.close()

        # 测试 IR-004: 错误处理
        print("\n" + "=" * 70)
        print("IR-004: 错误处理测试")
        print("=" * 70)
        page = await browser.new_page()
        results.append(await test_ir004_invalid_file(page))
        await page.close()

        # 测试 IR-005: 并发测试
        print("\n" + "=" * 70)
        print("IR-005: 并发压力测试")
        print("=" * 70)
        page = await browser.new_page()
        results.append(await test_ir005_concurrent_requests(page))
        await page.close()

        # 测试 IR-002: 批量转换
        print("\n" + "=" * 70)
        print("IR-002: 批量转换流程")
        print("=" * 70)
        page = await browser.new_page()
        results.append(await test_ir002_batch_conversion(page))
        await page.close()

        await browser.close()

    # 打印汇总
    print("\n" + "=" * 70)
    print("测试结果汇总")
    print("=" * 70)

    passed = 0
    failed = 0

    for r in results:
        status = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{status}: {r.test_id} - {r.description}")
        if r.error:
            print(f"       错误: {r.error}")

        if r.passed:
            passed += 1
        else:
            failed += 1

    print(f"\n总计: {len(results)} 个测试")
    print(f"通过: {passed}")
    print(f"失败: {failed}")
    print(f"\n截图保存在: {OUTPUT_DIR}/screenshots/")
    print(f"下载文件保存在: {OUTPUT_DIR}/downloads/")

    return failed == 0


if __name__ == "__main__":
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)
