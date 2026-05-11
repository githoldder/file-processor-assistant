import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import sys
import os

# Add backend to sys.path so app can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../backend')))

from app.main import app

@pytest.fixture(autouse=True)
def mock_external_services():
    with patch("app.main.init_minio"), \
         patch("app.main.init_redis"), \
         patch("app.main.close_redis"):
        yield

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client
