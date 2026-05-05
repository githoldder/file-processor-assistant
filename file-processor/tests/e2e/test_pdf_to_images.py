#!/usr/bin/env python3
"""
Test script to verify PDF to Images conversion
"""

import os
import requests
import time
import zipfile
import io

OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/xlsx_conversion"
PDF_FILE = "/Users/caolei/Desktop/文件处理全能助手/test_samples/2025 APMCM Control Sheet_20251120102742.pdf"


def convert_pdf_to_images():
    """Convert PDF to images via API"""
    print("=" * 60)
    print("Converting PDF to Images")
    print("=" * 60)

    with open(PDF_FILE, "rb") as f:
        files = {"file": ("test.pdf", f.read(), "application/pdf")}

        r = requests.post(
            "http://127.0.0.1:8000/api/v1/convert?conversion_type=pdf_to_images",
            files=files,
            timeout=60,
        )
        print(f"Upload Status: {r.status_code}")

        task_id = r.json().get("task_id")
        print(f"Task ID: {task_id}")

        # Wait for task to complete
        for i in range(30):
            time.sleep(2)
            result = requests.get(f"http://127.0.0.1:8000/api/v1/tasks/{task_id}")
            result_json = result.json()
            status = result_json.get("status")
            print(f"Status: {status}")

            if status == "SUCCESS":
                result_data = result_json.get("result", {})
                print(f"Result status: {result_data.get('status')}")
                print(f"Images count: {result_data.get('images_count')}")

                # Download the zip file
                download = requests.get(
                    f"http://127.0.0.1:8000/api/v1/tasks/{task_id}/download"
                )
                print(f"Download status: {download.status_code}")

                if download.status_code == 200:
                    # Save zip
                    zip_path = os.path.join(OUTPUT_DIR, "pdf_to_images_test.zip")
                    with open(zip_path, "wb") as f:
                        f.write(download.content)
                    print(f"Saved ZIP: {len(download.content)} bytes")

                    # Extract and show
                    with zipfile.ZipFile(io.BytesIO(download.content)) as zf:
                        print(f"\nZIP contents: {zf.namelist()}")
                        for name in zf.namelist():
                            img_data = zf.read(name)
                            img_path = os.path.join(OUTPUT_DIR, name)
                            with open(img_path, "wb") as f:
                                f.write(img_data)
                            print(f"Extracted: {name} ({len(img_data)} bytes)")

                    return os.path.join(OUTPUT_DIR, "page_001.png")
                else:
                    print(f"Error: {download.text}")
                    return None
            elif status == "FAILURE":
                print(f"Failure: {result_json}")
                return None


if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    result = convert_pdf_to_images()
    print(f"\nResult: {result}")
    print("\nTest completed!")
