#!/usr/bin/env python3
"""
SVG Conversion E2E Test - Final Version
========================================

Usage:
    python tests/e2e/test_svg_final.py
"""

import asyncio
import os
import sys
import time

FRONTEND_URL = "http://localhost"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_final"

TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


async def test_svg_conversion():
    """测试SVG转换"""
    print("=" * 50)
    print("SVG Conversion E2E Test")
    print("=" * 50)

    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)

        # 监听网络请求
        request_log = []

        def log_request(request):
            request_log.append(
                {"url": request.url, "method": request.method, "time": time.time()}
            )

        page = await browser.new_page()
        page.on("request", log_request)

        # 1. 打开前端
        print("\n[1] 打开前端...")
        await page.goto(FRONTEND_URL)
        await page.wait_for_load_state("networkidle")

        # 2. 上传文件
        print("[2] 上传SVG...")
        file_input = await page.query_selector('input[type="file"]')
        await file_input.set_input_files(TEST_SVG)
        await asyncio.sleep(3)

        # 3. 选择PDF转换
        print("[3] 选择PDF...")
        select = await page.query_selector("select")
        await select.select_option(value="pdf")
        await asyncio.sleep(1)

        # 4. 点击转换
        print("[4] 点击转换...")
        convert_btn = await page.query_selector('button:has-text("开始转换")')
        await convert_btn.click()

        # 5. 等待结果
        print("[5] 等待转换...")
        for i in range(30):
            await asyncio.sleep(2)

            # 获取页面上的所有文本
            page_text = await page.evaluate("""() => document.body.innerText""")

            # 检查状态
            if "下载" in page_text and "转换完成" in page_text:
                print(f"    ✓ 转换成功! ({i * 2}秒)")

                # 截图
                await page.screenshot(path=f"{OUTPUT_DIR}/success.png", full_page=True)

                # 点击下载
                dl_btn = await page.query_selector('button:has-text("下载")')
                if dl_btn:
                    async with page.expect_download(timeout=30000) as d:
                        await dl_btn.click()
                    download = await d.value
                    save_path = f"{OUTPUT_DIR}/output.{download.suggested_filename.split('.')[-1]}"
                    await download.save_as(save_path)
                    print(f"    ✓ 下载成功: {os.path.getsize(save_path)} bytes")

                    # 验证
                    if save_path.endswith(".pdf"):
                        import fitz

                        doc = fitz.open(save_path)
                        print(f"    ✓ PDF页数: {len(doc)}")
                        doc.close()

                print("\n✓ PASS: SVG转换测试通过")
                await browser.close()
                return True

            if "失败" in page_text or "error" in page_text.lower():
                await page.screenshot(path=f"{OUTPUT_DIR}/failed.png", full_page=True)
                print(f"    ✗ 转换失败")
                print(f"    页面内容: {page_text[:200]}...")
                break

        # 打印请求日志
        print("\n请求日志:")
        for req in request_log:
            print(f"  {req['method']} {req['url']}")

        await browser.close()
        return False


async def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    result = await test_svg_conversion()

    print(f"\n截图: {OUTPUT_DIR}/")
    return result


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
