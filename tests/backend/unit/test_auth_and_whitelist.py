import pytest
from fastapi.testclient import TestClient
from app.routers.convert import _safe_pdf_output_name

def test_auth_me_default(client: TestClient):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json() == {"role": "user"}

def test_auth_role_switch(client: TestClient):
    response = client.post("/api/v1/auth/role", json={"role": "admin"})
    assert response.status_code == 200
    assert response.json() == {"role": "admin"}
    
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json() == {"role": "admin"}

def test_auth_role_invalid(client: TestClient):
    response = client.post("/api/v1/auth/role", json={"role": "invalid"})
    assert response.status_code == 400

def test_whitelist_rejection(client: TestClient):
    files = {"file": ("test.txt", b"dummy content", "text/plain")}
    data = {"target_format": "pdf_to_html"}
    response = client.post("/api/v1/convert", files=files, data=data)
    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"].lower()

def test_whitelist_existing_rejection(client: TestClient):
    data = {"object_name": "dummy.pdf", "target_format": "pdf_to_html"}
    response = client.post("/api/v1/convert/existing", data=data)
    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"].lower()

def test_whitelist_preview_rejection(client: TestClient):
    files = {"file": ("test.txt", b"dummy content", "text/plain")}
    data = {"target_format": "pdf_to_html"}
    response = client.post("/api/v1/convert/preview", files=files, data=data)
    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"].lower()

def test_pdf_export_filename_is_normalized():
    assert _safe_pdf_output_name("课程报告_edited") == "课程报告_edited.pdf"
    assert _safe_pdf_output_name("../bad name.pdf") == "bad_name.pdf"
