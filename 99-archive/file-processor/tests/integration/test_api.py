#!/usr/bin/env python3
"""
Debug download - check if download URL works
"""

import asyncio
import requests
from playwright.async_api import async_playwright


async def main():
    # First, test the conversion via API directly
    print("1. Testing conversion via API...")

    # Upload file and get task
    with open(
        "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf",
        "rb",
    ) as f:
        files = {"file": f}
        response = requests.post(
            "http://localhost:8000/api/v1/convert?conversion_type=pdf_to_word",
            files=files,
        )

    task_id = response.json()["task_id"]
    print(f"   Task ID: {task_id}")

    # Wait for conversion
    import time

    for i in range(20):
        time.sleep(1)
        response = requests.get(f"http://localhost:8000/api/v1/tasks/{task_id}")
        status = response.json()["status"]
        print(f"   Status at {i + 1}s: {status}")
        if status == "SUCCESS":
            break

    # Try download
    print("\n2. Testing download endpoint...")
    download_response = requests.get(
        f"http://localhost:8000/api/v1/tasks/{task_id}/download"
    )
    print(f"   Status code: {download_response.status_code}")
    print(f"   Content type: {download_response.headers.get('Content-Type')}")
    print(f"   Content length: {len(download_response.content)} bytes")

    if download_response.status_code == 200:
        # Save to file
        with open("/tmp/test_download.pdf", "wb") as f:
            f.write(download_response.content)
        print("   ✓ Downloaded to /tmp/test_download.pdf")
    else:
        print(f"   ✗ Error: {download_response.text}")


if __name__ == "__main__":
    asyncio.run(main()) if False else main()
