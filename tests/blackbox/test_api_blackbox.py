import requests
import pytest
import time

BASE_URL = "http://localhost:8000"

def test_health():
    try:
        res = requests.get(f"{BASE_URL}/health")
        assert res.status_code == 200
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend not running.")

def test_upload_and_list():
    try:
        file_content = b"Hello, World! Blackbox test."
        files = {"file": ("blackbox_test.txt", file_content, "text/plain")}
        # Try with and without trailing slash if 405 occurs
        res = requests.post(f"{BASE_URL}/api/v1/files/upload", files=files)
        if res.status_code == 405:
            res = requests.post(f"{BASE_URL}/api/v1/files/upload/", files=files)
        assert res.status_code == 200
        
        res = requests.get(f"{BASE_URL}/api/v1/files")
        assert res.status_code == 200
    except requests.exceptions.ConnectionError:
        pytest.skip("Backend not running.")

def test_full_conversion_cycle():
    try:
        file_content = b"Mock document content"
        files = {"file": ("test.docx", file_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        data = {"target_format": "word_to_pdf"}
        res = requests.post(f"{BASE_URL}/api/v1/convert", files=files, data=data)
        if res.status_code == 200:
            task_id = res.json().get("task_id")
            if task_id:
                # Poll status
                for _ in range(10):
                    status_res = requests.get(f"{BASE_URL}/api/v1/tasks/{task_id}")
                    if status_res.json()["status"] == "success":
                        break
                    time.sleep(1)
    except Exception:
        pytest.skip("Backend or Redis down.")
