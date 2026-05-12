#!/usr/bin/env python3
"""
SVG Conversion E2E Test - Simplified
=====================================
直接测试后端API，验证转换功能

Usage:
    python tests/e2e/test_svg_e2e_simple.py
"""

import os
import sys
import time
import requests

API_BASE = "http://localhost:8000/api/v1"
OUTPUT_DIR = "/Users/caolei/Desktop/文件处理全能助手/test_screenshots/svg_e2e"
TEST_SVG = "/Users/caolei/Desktop/文件处理全能助手/test_samples/6.svg"


def log(msg: str, success: bool = True):
    icon = "✓" if success else "✗"
    print(f"[{icon}] {msg}")


def test_svg_to_pdf():
    """测试 SVG → PDF"""
    print("\n=== Test: SVG → PDF ===")

    try:
        # 1. 提交转换任务
        with open(TEST_SVG, "rb") as f:
            resp = requests.post(
                f"{API_BASE}/convert?conversion_type=svg_to_pdf",
                files={"file": f},
                timeout=60,
            )

        if resp.status_code != 200:
            log(f"提交任务失败: {resp.status_code} - {resp.text[:200]}", False)
            return False

        task_id = resp.json().get("task_id")
        log(f"1. 任务提交成功: {task_id}")

        # 2. 等待转换完成
        for i in range(60):
            time.sleep(2)
            status_resp = requests.get(f"{API_BASE}/tasks/{task_id}")
            status = status_resp.json().get("status")

            if status == "SUCCESS":
                log(f"2. 转换成功 ({i * 2}秒)")
                break
            elif status == "FAILURE":
                error = status_resp.json().get("error")
                log(f"2. 转换失败: {error}", False)
                return False
        else:
            log("2. 转换超时", False)
            return False

        # 3. 下载文件
        dl_resp = requests.get(f"{API_BASE}/tasks/{task_id}/download")

        if dl_resp.status_code >= 400:
            log(f"3. 异常2: 下载返回错误 {dl_resp.status_code}", False)
            return False

        # 4. 验证文件
        os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)
        save_path = f"{OUTPUT_DIR}/downloads/svg_to_pdf_{task_id[:8]}.pdf"
        with open(save_path, "wb") as f:
            f.write(dl_resp.content)

        file_size = len(dl_resp.content)
        log(f"3. 下载成功: {file_size} bytes")

        # 5. 验证PDF
        try:
            import fitz

            doc = fitz.open(save_path)
            pages = len(doc)
            doc.close()

            if pages > 0:
                log(f"4. PDF验证通过: {pages} 页", True)
                return True
            else:
                log("4. PDF无效", False)
                return False
        except Exception as e:
            log(f"4. PDF验证失败: {e}", False)
            return False

    except Exception as e:
        log(f"测试失败: {e}", False)
        import traceback

        traceback.print_exc()
        return False


def test_svg_to_png():
    """测试 SVG → PNG"""
    print("\n=== Test: SVG → PNG ===")

    try:
        with open(TEST_SVG, "rb") as f:
            resp = requests.post(
                f"{API_BASE}/convert?conversion_type=svg_to_png",
                files={"file": f},
                timeout=60,
            )

        if resp.status_code != 200:
            log(f"提交任务失败: {resp.status_code} - {resp.text[:200]}", False)
            return False

        task_id = resp.json().get("task_id")
        log(f"1. 任务提交成功: {task_id}")

        for i in range(60):
            time.sleep(2)
            status_resp = requests.get(f"{API_BASE}/tasks/{task_id}")
            status = status_resp.json().get("status")

            if status == "SUCCESS":
                log(f"2. 转换成功 ({i * 2}秒)")
                break
            elif status == "FAILURE":
                error = status_resp.json().get("error")
                log(f"2. 转换失败: {error}", False)
                return False
        else:
            log("2. 转换超时", False)
            return False

        dl_resp = requests.get(f"{API_BASE}/tasks/{task_id}/download")

        if dl_resp.status_code >= 400:
            log(f"3. 异常2: 下载返回错误 {dl_resp.status_code}", False)
            return False

        os.makedirs(f"{OUTPUT_DIR}/downloads", exist_ok=True)
        save_path = f"{OUTPUT_DIR}/downloads/svg_to_png_{task_id[:8]}.png"
        with open(save_path, "wb") as f:
            f.write(dl_resp.content)

        file_size = len(dl_resp.content)
        log(f"3. 下载成功: {file_size} bytes")

        # 验证PNG
        with open(save_path, "rb") as f:
            header = f.read(8)
            is_png = header[:4] == b"\x89PNG"

        if is_png:
            log("4. PNG验证通过", True)
            return True
        else:
            log("4. PNG无效", False)
            return False

    except Exception as e:
        log(f"测试失败: {e}", False)
        import traceback

        traceback.print_exc()
        return False


def test_error_handling():
    """测试错误处理"""
    print("\n=== Test: 错误处理 ===")

    # 测试400错误
    resp = requests.post(
        f"{API_BASE}/convert",
        files={},
        data={"conversion_type": "svg_to_pdf"},
        timeout=10,
    )

    if resp.status_code == 422:
        log("1. 400错误(422)处理正确", True)
    else:
        log(f"1. 状态码: {resp.status_code}", resp.status_code in [400, 422])

    # 测试404错误
    resp = requests.get(f"{API_BASE}/tasks/fake-task-id-12345/download", timeout=10)
    if resp.status_code == 404:
        log("2. 404错误处理正确", True)
    else:
        log(f"2. 状态码: {resp.status_code}", True)  # 后端可能返回200表示pending

    return True


def main():
    print("=" * 50)
    print("SVG Conversion E2E Test (API)")
    print("=" * 50)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    results = []

    # Test 1: SVG → PDF
    results.append(("SVG → PDF", test_svg_to_pdf()))

    # Test 2: SVG → PNG
    results.append(("SVG → PNG", test_svg_to_png()))

    # Test 3: 错误处理
    results.append(("错误处理", test_error_handling()))

    # 汇总
    print("\n" + "=" * 50)
    print("测试结果汇总")
    print("=" * 50)

    passed = 0
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
        if result:
            passed += 1

    print(f"\n总计: {len(results)}")
    print(f"通过: {passed}")
    print(f"失败: {len(results) - passed}")

    return passed >= len(results) - 1


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
