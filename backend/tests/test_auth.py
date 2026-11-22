from __future__ import annotations

from fastapi.testclient import TestClient

from app.db import users
from tests.conftest import PASSWORD, login, register


def test_new_user_can_register(client: TestClient) -> None:
    # Acceptance 1
    body = register(client)
    assert body["email"] == "ada@example.com"
    assert body["name"] == "Ada"
    assert "password" not in body and "password_hash" not in body


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    register(client)
    response = client.post(
        "/api/auth/register",
        json={"name": "Other", "email": "ADA@example.com", "password": PASSWORD},
    )
    assert response.status_code == 409


def test_registration_rejects_invalid_details(client: TestClient) -> None:
    response = client.post(
        "/api/auth/register",
        json={"name": "  ", "email": "not-an-email", "password": "short"},
    )
    assert response.status_code == 422


def test_registered_user_can_log_in_and_out(client: TestClient) -> None:
    # Acceptance 2
    register(client)
    response = login(client)
    assert response.status_code == 200
    assert response.json()["email"] == "ada@example.com"
    assert client.get("/api/profile").status_code == 200

    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/profile").status_code == 401


def test_logout_invalidates_the_token_on_the_server(client: TestClient) -> None:
    register(client)
    login(client)
    token = client.cookies.get("session")
    client.post("/api/auth/logout")

    client.cookies.set("session", token)  # replay the old cookie
    assert client.get("/api/profile").status_code == 401


def test_wrong_password_and_unknown_email_give_the_same_safe_error(client: TestClient) -> None:
    # Acceptance 3
    register(client)
    wrong_password = login(client, password="not-the-password")
    unknown_email = login(client, email="nobody@example.com")
    malformed = client.post("/api/auth/login", json={"email": "", "password": ""})

    assert wrong_password.status_code == 401
    assert unknown_email.status_code == 401
    assert malformed.status_code == 401
    assert wrong_password.json() == unknown_email.json() == malformed.json()


def test_passwords_are_hashed_not_stored_in_plain_text(client: TestClient, app) -> None:
    # Acceptance 4
    register(client)
    row = users.get_user_by_email(app.state.db, "ada@example.com")
    assert row is not None
    assert row["password_hash"] != PASSWORD
    assert row["password_hash"].startswith("$argon2id$")
    assert PASSWORD not in row["password_hash"]


def test_personal_pages_require_sign_in(client: TestClient) -> None:
    assert client.get("/api/profile").status_code == 401
    assert client.patch("/api/profile", json={"name": "X"}).status_code == 401
    assert client.get("/api/profile/avatar").status_code == 401


def test_user_cannot_see_another_users_data(client: TestClient, app) -> None:
    # Acceptance 5: there is no user id in any URL; each request only sees its own session's user.
    register(client, email="ada@example.com", name="Ada")
    register(client, email="grace@example.com", name="Grace")

    ada = TestClient(app)
    grace = TestClient(app)
    assert login(ada, email="ada@example.com").status_code == 200
    assert login(grace, email="grace@example.com").status_code == 200

    assert ada.get("/api/profile").json()["name"] == "Ada"
    assert grace.get("/api/profile").json()["name"] == "Grace"

    # Grace's update changes only Grace's row.
    grace.patch("/api/profile", json={"name": "Grace H."})
    assert ada.get("/api/profile").json()["name"] == "Ada"
