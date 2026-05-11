#!/usr/bin/env python3
"""
Test script to open converted files in browser and verify
"""

import asyncio
import os
from playwright.async_api import async_playwright

OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"


async def open_image_in_browser(image_path: str):
    """Open image in browser and take screenshot"""
    print(f"\nOpening: {image_path}")

    image_url = f"file://{os.path.abspath(image_path)}"
    print(f"URL: {image_url}")

    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Set viewport
        await page.set_viewport_size({"width": 1200, "height": 1600})

        # Navigate to image
        await page.goto(image_url)

        # Wait for load
        await asyncio.sleep(3)

        # Take screenshot
        screenshot_name = os.path.basename(image_path).replace(".png", "_browser.png")
        screenshot_path = os.path.join(OUTPUT_DIR, screenshot_name)
        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot: {screenshot_path}")

        await asyncio.sleep(5)
        await browser.close()


async def open_pdf_in_browser(pdf_path: str):
    """Open PDF in browser and take screenshot"""
    print(f"\nOpening: {pdf_path}")

    pdf_url = f"file://{os.path.abspath(pdf_path)}"
    print(f"URL: {pdf_url}")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        await page.set_viewport_size({"width": 1200, "height": 1600})

        await page.goto(pdf_url)
        await asyncio.sleep(3)

        screenshot_name = os.path.basename(pdf_path).replace(".pdf", "_browser.png")
        screenshot_path = os.path.join(OUTPUT_DIR, screenshot_name)
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"Screenshot: {screenshot_path}")

        await asyncio.sleep(5)
        await browser.close()


async def main():
    print("=" * 60)
    print("Testing converted files in browser")
    print("=" * 60)

    # Test PDF to images result
    await open_image_in_browser(os.path.join(OUTPUT_DIR, "page_001.png"))

    # Test XLSX to PDF result
    await open_pdf_in_browser(os.path.join(OUTPUT_DIR, "converted_output.pdf"))

    # Test PPTX to PDF result
    await open_pdf_in_browser(os.path.join(OUTPUT_DIR, "pptx_test_output.pdf"))

    print("\nAll tests completed!")


if __name__ == "__main__":
    asyncio.run(main())
