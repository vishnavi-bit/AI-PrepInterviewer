from __future__ import annotations

from dataclasses import replace

from fastapi.testclient import TestClient

from app.services.interview_configuration_service import DURATION_INVALID, NO_DURATIONS, NO_ROLE
from tests.test_resumes import sign_in
from tests.test_role_recommendations import ROLE_NAMES, ScriptedGemini, analyzed, roles_json

DURATIONS = (30, 45, 60)
VALID = {"interview_type": "Technical", "difficulty": "Medium", "duration_minutes": 45}


def with_durations(app, options: tuple[int, ...] = DURATIONS) -> None:
    app.state.settings = replace(app.state.settings, interview_duration_options=options)


def with_selected_role(app, client: TestClient, position: int = 3) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")
    assert client.post("/api/role-recommendations/selection", json={"position": position}).status_code == 200


def test_the_page_starts_empty_and_lists_the_configured_durations(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)

    body = client.get("/api/interview-configuration").json()

    assert body == {"role": ROLE_NAMES[2], "duration_options": list(DURATIONS), "settings": None}


def test_the_configuration_is_saved_and_shown_again(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)

    saved = client.put("/api/interview-configuration", json=VALID)

    assert saved.status_code == 200, saved.text
    assert saved.json()["settings"] == VALID
    assert saved.json()["role"] == ROLE_NAMES[2]
    assert client.get("/api/interview-configuration").json()["settings"] == VALID
    assert app.state.db.execute("SELECT interview_type, difficulty, duration_minutes FROM interview_settings") == [
        {"interview_type": "Technical", "difficulty": "Medium", "duration_minutes": 45}
    ]


def test_saving_again_replaces_the_previous_choice(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)
    client.put("/api/interview-configuration", json=VALID)

    client.put(
        "/api/interview-configuration",
        json={"interview_type": "Project-based", "difficulty": "Hard", "duration_minutes": 60},
    )

    assert client.get("/api/interview-configuration").json()["settings"] == {
        "interview_type": "Project-based",
        "difficulty": "Hard",
        "duration_minutes": 60,
    }
    assert len(app.state.db.execute("SELECT user_id FROM interview_settings")) == 1


def test_every_interview_type_and_difficulty_can_be_chosen(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)

    for interview_type in ("Technical", "HR", "Behavioral", "Project-based"):
        for difficulty in ("Easy", "Medium", "Hard"):
            response = client.put(
                "/api/interview-configuration",
                json={"interview_type": interview_type, "difficulty": difficulty, "duration_minutes": 30},
            )
            assert response.status_code == 200, response.text


def test_saving_needs_a_selected_role(app, client: TestClient) -> None:
    with_durations(app)
    sign_in(client)

    response = client.put("/api/interview-configuration", json=VALID)

    assert response.status_code == 409
    assert response.json()["detail"] == NO_ROLE


def test_only_configured_durations_are_accepted(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)

    response = client.put("/api/interview-configuration", json={**VALID, "duration_minutes": 50})

    assert response.status_code == 422
    assert response.json()["detail"] == DURATION_INVALID


def test_saving_without_any_configured_duration_is_refused(app, client: TestClient) -> None:
    with_selected_role(app, client)  # no durations configured

    response = client.put("/api/interview-configuration", json=VALID)

    assert response.status_code == 409
    assert response.json()["detail"] == NO_DURATIONS


def test_unknown_types_difficulties_and_durations_are_rejected(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)

    assert client.put("/api/interview-configuration", json={**VALID, "interview_type": "Casual"}).status_code == 422
    assert client.put("/api/interview-configuration", json={**VALID, "difficulty": "Expert"}).status_code == 422
    assert client.put("/api/interview-configuration", json={**VALID, "duration_minutes": 0}).status_code == 422
    assert client.put("/api/interview-configuration", json={**VALID, "duration_minutes": 9999}).status_code == 422


def test_another_users_configuration_is_not_visible(app, client: TestClient) -> None:
    with_durations(app)
    with_selected_role(app, client)
    client.put("/api/interview-configuration", json=VALID)

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")
        body = grace_client.get("/api/interview-configuration").json()

    assert body["role"] is None
    assert body["settings"] is None


def test_configuration_routes_require_sign_in(app, client: TestClient) -> None:
    assert client.get("/api/interview-configuration").status_code == 401
    assert client.put("/api/interview-configuration", json=VALID).status_code == 401
