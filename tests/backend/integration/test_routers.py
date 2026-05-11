from unittest.mock import patch
from app.models.schemas import TaskStatus, TaskResponse

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

@patch("app.routers.tasks.get_task_status")
def test_get_task_found(mock_get_task_status, client):
    mock_get_task_status.return_value = TaskResponse(
        task_id="test-id", 
        status=TaskStatus.SUCCESS,
        result_url="http://test"
    )
    response = client.get("/api/v1/tasks/test-id")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

@patch("app.routers.tasks.get_task_status")
def test_get_task_not_found(mock_get_task_status, client):
    mock_get_task_status.return_value = None
    response = client.get("/api/v1/tasks/non-existent")
    assert response.status_code == 404
