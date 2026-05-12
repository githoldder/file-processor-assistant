#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright
import os


async def main():
    async with async_playwright() as p:
        # Launch browser
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()

        # Navigate to frontend
        print("Opening frontend...")
        await page.goto("http://127.0.0.1:5173")
        await page.wait_for_load_state("networkidle")

        print(f"Page title: {await page.title()}")
        print(f"Current URL: {page.url}")

        # Take screenshot
        await page.screenshot(path="screenshot_01_frontend.png")
        print("Screenshot saved: screenshot_01_frontend.png")

        # Wait for user to interact manually if needed
        print("\nWaiting 10 seconds for page to fully load...")
        await asyncio.sleep(10)

        # Check for any errors in console
        console_messages = []
        page.on(
            "console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}")
        )

        # Look for conversion-related elements
        print("\nLooking for file upload elements...")

        # Try to find file input
        file_inputs = await page.query_selector_all('input[type="file"]')
        print(f"Found {len(file_inputs)} file input(s)")

        # Try to find conversion buttons
        buttons = await page.query_selector_all("button")
        print(f"Found {len(buttons)} button(s)")

        # Take screenshot
        await page.screenshot(path="screenshot_02_loaded.png")

        # Get page content for analysis
        content = await page.content()
        print(f"\nPage content length: {len(content)} characters")

        # Look for specific UI elements
        if "转换" in content or "convert" in content.lower():
            print("Found conversion-related content!")

        await browser.close()
        print("\nBrowser test completed!")


if __name__ == "__main__":
    asyncio.run(main())
