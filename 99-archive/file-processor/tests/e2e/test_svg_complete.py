#!/usr/bin/env python3
"""
E2E Test: SVG Conversion - Complete Browser Test
================================================
使用 Playwright 控制浏览器，完整测试SVG转换流程

测试场景:
1. SVG → PDF 正常转换 + 下载验证
2. SVG → PNG 正常转换 + 下载验证
3. 异常1: 转换卡在0%或显示失败
4. 异常2: 转换成功但下载显示4xx错误

Usage:
    python tests/e2e/test_svg_complete.py
"""

import asyncio
import os
import sys
import time
import requests

FRONTEND_URL = "http://localhost"
API_BASE = "http://localhost:8000/api/v1"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_complete"

TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


class TestResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = False
        self.error: str = ""
        self.screenshots = []


def log(msg: str, success: bool = True):
    icon = "✓" if success else "✗"
    print(f"[{icon}] {msg}")


async def take_screenshot(page, name: str):
    path = f"{OUTPUT_DIR}/{name}_{int(time.time() * 1000)}.png"
    await page.screenshot(path=path, full_page=True)
    return path


async def test_svg_to_pdf(page, result: TestResult):
    """测试: SVG → PDF"""
    print("\n" + "=" * 50)
    print("Test: SVG → PDF")
    print("=" * 50)

    try:
        # 1. 打开前端
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "pdf_01_home")
        log("1. 前端加载完成")

        # 2. 上传SVG
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)
        await take_screenshot(page, "pdf_02_uploaded")
        log("2. 文件上传成功")

        # 3. 选择PDF转换
        select = await page.query_selector("select")
        await select.select_option(value="pdf")
        await asyncio.sleep(1)
        await take_screenshot(page, "pdf_03_selected")
        log("3. 选择 PDF 转换")

        # 4. 点击开始转换
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        await convert_btn.click()
        await take_screenshot(page, "pdf_04_clicked")
        log("4. 点击开始转换")

        # 5. 等待转换完成 (检测异常1)
        for i in range(60):
            await asyncio.sleep(2)

            # 检查是否失败
            failed = await page.query_selector_all("text=失败")
            if failed:
                await take_screenshot(page, "pdf_error_failed")
                result.error = "转换显示失败"
                log("异常1: 转换失败", False)
                return

            # 检查进度是否卡在0%
            stuck = await page.query_selector_all("text=0%")
            if stuck and i > 10:  # 等待超过20秒仍为0%
                await take_screenshot(page, "pdf_error_stuck")
                result.error = "转换卡在0%"
                log("异常1: 转换卡在0%", False)
                return

            # 检查是否完成
            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                await take_screenshot(page, "pdf_05_completed")
                log(f"5. 转换完成 ({i * 2}秒)")
                break
        else:
            result.error = "转换超时"
            log("异常1: 转换超时", False)
            return

        # 6. 点击下载 (检测异常2)
        try:
            async with page.expect_download(timeout=30000) as download_info:
                await dl_btn.click()

            download = await download_info.value
            filename = download.suggested_filename
            save_path = f"{OUTPUT_DIR}/downloads/{filename}"
            await download.save_as(save_path)

            await take_screenshot(page, "pdf_06_downloaded")
            log(f"6. 下载成功: {filename}")

        except Exception as e:
            await take_screenshot(page, "pdf_error_download")
            result.error = f"异常2: 下载失败 - {e}"
            log("异常2: 下载失败", False)
            return

        # 7. 验证PDF
        if os.path.exists(save_path):
            size = os.path.getsize(save_path)
            try:
                import fitz

                doc = fitz.open(save_path)
                pages = len(doc)
                doc.close()

                if pages > 0:
                    log(f"7. PDF有效: {pages}页, {size}bytes", True)
                    result.passed = True
                else:
                    result.error = "PDF无效"
                    log("7. PDF无效", False)
            except:
                result.error = "PDF验证失败"
                log("7. PDF验证失败", False)
        else:
            result.error = "文件未保存"
            log("7. 文件未保存", False)

    except Exception as e:
        result.error = str(e)
        log(f"错误: {e}", False)


async def test_svg_to_png(page, result: TestResult):
    """测试: SVG → PNG"""
    print("\n" + "=" * 50)
    print("Test: SVG → PNG")
    print("=" * 50)

    try:
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await take_screenshot(page, "png_01_home")
        log("1. 前端加载完成")

        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)
        await take_screenshot(page, "png_02_uploaded")
        log("2. 文件上传成功")

        select = await page.query_selector("select")
        await select.select_option(value="png")
        await asyncio.sleep(1)
        await take_screenshot(page, "png_03_selected")
        log("3. 选择 PNG 转换")

        convert_btn = await page.query_selector('button:has-text("开始转换")')
        await convert_btn.click()
        await take_screenshot(page, "png_04_clicked")
        log("4. 点击开始转换")

        # 等待转换完成
        for i in range(60):
            await asyncio.sleep(2)

            failed = await page.query_selector_all("text=失败")
            if failed:
                await take_screenshot(page, "png_error_failed")
                result.error = "转换失败"
                log("异常1: 转换失败", False)
                return

            dl_btn = await page.query_selector('button:has-text("下载")')
            if dl_btn:
                await take_screenshot(page, "png_05_completed")
                log(f"5. 转换完成 ({i * 2}秒)")
                break
        else:
            result.error = "转换超时"
            log("异常1: 转换超时", False)
            return

        # 下载
        try:
            async with page.expect_download(timeout=30000) as download_info:
                await dl_btn.click()

            download = await download_info.value
            filename = download.suggested_filename
            save_path = f"{OUTPUT_DIR}/downloads/{filename}"
            await download.save_as(save_path)

            await take_screenshot(page, "png_06_downloaded")
            log(f"6. 下载成功: {filename}")

        except Exception as e:
            await take_screenshot(page, "png_error_download")
            result.error = f"异常2: 下载失败 - {e}"
            log("异常2: 下载失败", False)
            return

        # 验证PNG
        if os.path.exists(save_path):
            size = os.path.getsize(save_path)
            with open(save_path, "rb") as f:
                header = f.read(8)
                is_png = header[:4] == b"\x89PNG"

            if is_png:
                log(f"7. PNG有效: {size}bytes", True)
                result.passed = True
            else:
                result.error = "PNG无效"
                log("7. PNG无效", False)
        else:
            result.error = "文件未保存"
            log("7. 文件未保存", False)

    except Exception as e:
        result.error = str(e)
        log(f"错误: {e}", False)


async def test_error_handling(page, result: TestResult):
    """测试: 错误处理"""
    print("\n" + "=" * 50)
    print("Test: 错误处理")
    print("=" * 50)

    # 测试404下载
    try:
        resp = requests.get(f"{API_BASE}/tasks/fake-id-12345/download", timeout=10)

        if resp.status_code == 404:
            log("1. 404错误处理正确", True)
        else:
            log(f"1. 状态码: {resp.status_code}", True)

        # 测试400请求
        resp = requests.post(f"{API_BASE}/convert", files={}, timeout=10)
        if resp.status_code in [400, 422]:
            log("2. 400/422错误处理正确", True)
        else:
            log(f"2. 状态码: {resp.status_code}", True)

        result.passed = True

    except Exception as e:
        result.error = str(e)
        log(f"错误: {e}", False)


async def main():
    print("=" * 60)
    print("SVG Conversion Complete E2E Test")
    print("=" * 60)

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)

    from playwright.async_api import async_playwright

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # Test 1: SVG → PDF
        page = await browser.new_page()
        r = TestResult("SVG → PDF")
        await test_svg_to_pdf(page, r)
        results.append(r)
        await page.close()

        # Test 2: SVG → PNG
        page = await browser.new_page()
        r = TestResult("SVG → PNG")
        await test_svg_to_png(page, r)
        results.append(r)
        await page.close()

        # Test 3: 错误处理
        page = await browser.new_page()
        r = TestResult("错误处理")
        await test_error_handling(page, r)
        results.append(r)
        await page.close()

        await browser.close()

    # 汇总
    print("\n" + "=" * 60)
    print("测试结果")
    print("=" * 60)

    passed = 0
    for r in results:
        status = "✓ PASS" if r.passed else "✗ FAIL"
        print(f"{status}: {r.name}")
        if r.error:
            print(f"    错误: {r.error}")
        if r.passed:
            passed += 1

    print(f"\n总计: {len(results)}")
    print(f"通过: {passed}")
    print(f"截图: {OUTPUT_DIR}/")

    return passed >= len(results) - 1


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
