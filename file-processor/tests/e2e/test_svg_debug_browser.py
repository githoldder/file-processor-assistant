#!/usr/bin/env python3
"""
Browser Test: SVG Conversion Issue Debug
=========================================
使用 Playwright 检查前端转换卡在0%的问题

Usage:
    python tests/e2e/test_svg_debug_browser.py
"""

import asyncio
import os
import sys
import time

FRONTEND_URL = "http://localhost"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_debug"

TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


async def debug_svg_conversion():
    """调试SVG转换问题"""
    print("=" * 60)
    print("SVG Conversion Debug Test")
    print("=" * 60)

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 监听所有网络请求
        requests = []

        def handle_request(request):
            requests.append(
                {
                    "url": request.url,
                    "method": request.method,
                    "resource": request.resource_type,
                    "time": time.time(),
                }
            )
            print(
                f"  [Request] {request.method} {request.url} ({request.resource_type})"
            )

        def handle_response(response):
            status = response.status
            url = response.url
            print(f"  [Response] {status} {url}")

        page.on("request", handle_request)
        page.on("response", handle_response)

        # 1. 打开前端
        print("\n[1] 打开前端页面...")
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=f"{OUTPUT_DIR}/01_home.png", full_page=True)

        # 2. 上传SVG文件
        print("\n[2] 上传SVG文件...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)
        await page.screenshot(path=f"{OUTPUT_DIR}/02_uploaded.png", full_page=True)

        # 检查控制台错误
        console_errors = []
        page.on(
            "console",
            lambda msg: console_errors.append(msg.text)
            if msg.type == "error"
            else None,
        )

        # 3. 选择SVG -> PDF转换
        print("\n[3] 选择转换类型...")
        await asyncio.sleep(2)
        select_elem = await page.query_selector("select")
        options = await select_elem.evaluate("""(sel) => {
            return Array.from(sel.options).map(o => ({value: o.value, text: o.text}));
        }""")
        print(f"    可用选项: {options}")

        await select_elem.select_option(value="pdf")
        await page.screenshot(path=f"{OUTPUT_DIR}/03_selected.png", full_page=True)

        # 4. 点击开始转换
        print("\n[4] 点击开始转换...")
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        await convert_btn.click()

        # 等待一段时间观察
        for i in range(10):
            await asyncio.sleep(2)

            # 获取当前文件状态
            file_status = await page.evaluate("""() => {
                const files = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? [] : [];
                // 尝试获取文件状态
                const fileDivs = document.querySelectorAll('[class*="file"]');
                if (fileDivs.length > 0) {
                    return Array.from(fileDivs).map(d => d.textContent).join('\\n');
                }
                return 'No file elements found';
            }""")

            # 检查页面内容
            progress = await page.query_selector_all("text=0%")
            converting = await page.query_selector_all("text=转换中")
            failed = await page.query_selector_all("text=失败")
            completed = await page.query_selector_all("text=下载")

            print(
                f"\n  [Check {i + 1}] 进度0%: {len(progress)}, 转换中: {len(converting)}, 失败: {len(failed)}, 完成: {len(completed)}"
            )

            if len(completed) > 0:
                print("  转换完成!")
                break
            if len(failed) > 0:
                print("  转换失败!")
                break

        await page.screenshot(path=f"{OUTPUT_DIR}/04_after_convert.png", full_page=True)

        # 打印所有请求
        print("\n" + "=" * 60)
        print("All Network Requests:")
        print("=" * 60)
        for req in requests:
            print(f"  {req['method']} {req['url']}")

        # 检查控制台错误
        if console_errors:
            print("\n" + "=" * 60)
            print("Console Errors:")
            print("=" * 60)
            for err in console_errors:
                print(f"  {err}")

        await browser.close()


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    await debug_svg_conversion()
    print(f"\n截图保存在: {OUTPUT_DIR}/")


if __name__ == "__main__":
    asyncio.run(main())
