#!/usr/bin/env python3
"""
Browser Test: SVG Conversion Detailed Debug
============================================
使用 Playwright 检查前端转换的详细问题

Usage:
    python tests/e2e/test_svg_debug2.py
"""

import asyncio
import os
import sys

FRONTEND_URL = "http://localhost"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_debug2"

TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


async def debug_svg_conversion():
    """调试SVG转换问题"""
    print("=" * 60)
    print("SVG Conversion Detailed Debug")
    print("=" * 60)

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # 监听响应
        responses = []

        def handle_response(response):
            responses.append(
                {
                    "url": response.url,
                    "status": response.status,
                    "status_text": response.status_text,
                }
            )
            print(f"  [Response {response.status}] {response.url}")

        page.on("response", handle_response)

        # 1. 打开前端
        print("\n[1] 打开前端页面...")
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 2. 上传SVG文件
        print("\n[2] 上传SVG文件...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)

        # 3. 选择 SVG -> PDF
        print("\n[3] 选择转换类型...")
        select_elem = await page.query_selector("select")
        await select_elem.select_option(value="pdf")
        await asyncio.sleep(1)

        # 4. 点击开始转换
        print("\n[4] 点击开始转换...")
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        await convert_btn.click()

        # 等待请求完成
        await asyncio.sleep(5)

        # 检查 responses
        print("\n" + "=" * 60)
        print("Responses received:")
        print("=" * 60)
        for resp in responses:
            print(f"  [{resp['status']}] {resp['url']}")

        # 查找转换API的响应
        convert_resp = [r for r in responses if "convert" in r["url"]]
        if convert_resp:
            print(f"\n转换API响应: {convert_resp[0]}")

        # 获取页面状态
        print("\n" + "=" * 60)
        print("Page State:")
        print("=" * 60)

        # 检查按钮文本
        buttons = await page.query_selector_all("button")
        for btn in buttons:
            text = await btn.text_content()
            print(f"  Button: {text}")

        # 检查是否有错误提示
        error_elements = await page.query_selector_all(
            "text=失败, text=error, text=Error"
        )
        print(f"\n错误元素数量: {len(error_elements)}")

        # 获取文件的详细信息
        file_info = await page.evaluate("""() => {
            // 尝试获取文件状态
            const appElement = document.querySelector('#root');
            if (!appElement) return 'No root element';
            
            // 获取所有文本内容
            return appElement.innerText;
        }""")

        print(f"\n页面内容片段: {file_info[:500]}...")

        await page.screenshot(path=f"{OUTPUT_DIR}/debug.png", full_page=True)

        await browser.close()


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    await debug_svg_conversion()
    print(f"\n截图保存在: {OUTPUT_DIR}/")


if __name__ == "__main__":
    asyncio.run(main())
