from fastapi.testclient import TestClient
from src.app import app, activities
import uuid

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)


def test_signup_and_delete_participant_flow():
    # create a temporary activity to avoid touching global test data
    temp_name = "pytest-temp-activity-" + uuid.uuid4().hex
    activities[temp_name] = {
        "description": "temporary activity for tests",
        "schedule": "now",
        "max_participants": 3,
        "participants": [],
    }

    test_email = f"test-{uuid.uuid4().hex}@example.com"

    # signup should succeed
    r = client.post(f"/activities/{temp_name}/signup?email={test_email}")
    assert r.status_code == 200
    assert test_email in activities[temp_name]["participants"]

    # signing up again returns 400
    r2 = client.post(f"/activities/{temp_name}/signup?email={test_email}")
    assert r2.status_code == 400

    # remove the participant
    r3 = client.delete(f"/activities/{temp_name}/participants?email={test_email}")
    assert r3.status_code == 200
    assert test_email not in activities[temp_name]["participants"]

    # removing again should return 404
    r4 = client.delete(f"/activities/{temp_name}/participants?email={test_email}")
    assert r4.status_code == 404

    # cleanup
    del activities[temp_name]


def test_signup_invalid_activity():
    r = client.post("/activities/this-does-not-exist/signup?email=a@b.com")
    assert r.status_code == 404
