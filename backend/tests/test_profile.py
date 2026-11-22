from __future__ import annotations

from fastapi.testclient import TestClient

from tests.conftest import PASSWORD, PNG_BYTES, login, register


def _signed_in(client: TestClient, email: str = "ada@example.com", name: str = "Ada") -> None:
    register(client, email=email, name=name)
    assert login(client, email=email).status_code == 200


def test_profile_shows_and_updates_name_and_target_role(client: TestClient) -> None:
    _signed_in(client)
    assert client.get("/api/profile").json()["target_role"] is None

    updated = client.patch("/api/profile", json={"name": "Ada L.", "target_role": "Python Developer"})
    assert updated.status_code == 200
    assert updated.json()["name"] == "Ada L."
    assert updated.json()["target_role"] == "Python Developer"

    cleared = client.patch("/api/profile", json={"target_role": "  "})
    assert cleared.json()["target_role"] is None
    assert cleared.json()["name"] == "Ada L."  # untouched fields keep their value


def test_email_cannot_be_changed(client: TestClient) -> None:
    _signed_in(client)
    response = client.patch("/api/profile", json={"email": "other@example.com"})
    assert response.status_code == 422
    assert client.get("/api/profile").json()["email"] == "ada@example.com"


def test_blank_name_is_rejected(client: TestClient) -> None:
    _signed_in(client)
    assert client.patch("/api/profile", json={"name": "   "}).status_code == 422
    assert client.patch("/api/profile", json={"name": None}).status_code == 422


def test_password_change_requires_current_password(client: TestClient) -> None:
    _signed_in(client)
    wrong = client.post("/api/profile/password", json={"current_password": "nope-nope", "new_password": "brand-new-pass"})
    assert wrong.status_code == 400


def test_password_change_takes_effect_and_signs_out_other_devices(client: TestClient) -> None:
    _signed_in(client)
    this_device = client.cookies.get("session")

    other = TestClient(client.app)
    assert login(other).status_code == 200
    assert other.get("/api/profile").status_code == 200

    response = client.post(
        "/api/profile/password",
        json={"current_password": PASSWORD, "new_password": "brand-new-pass"},
    )
    assert response.status_code == 204

    assert other.get("/api/profile").status_code == 401  # other device signed out
    assert client.cookies.get("session") == this_device
    assert client.get("/api/profile").status_code == 200  # this device stays signed in
    assert login(client, password=PASSWORD).status_code == 401
    assert login(client, password="brand-new-pass").status_code == 200


def test_avatar_upload_and_download(client: TestClient) -> None:
    _signed_in(client)
    upload = client.put("/api/profile/avatar", files={"file": ("me.png", PNG_BYTES, "image/png")})
    assert upload.status_code == 200
    assert upload.json()["avatar_url"] == "/api/profile/avatar"

    download = client.get("/api/profile/avatar")
    assert download.status_code == 200
    assert download.headers["content-type"] == "image/png"
    assert download.content == PNG_BYTES


def test_avatar_rejects_non_images_and_large_files(client: TestClient, settings) -> None:
    _signed_in(client)
    not_image = client.put("/api/profile/avatar", files={"file": ("x.png", b"<html>nope</html>", "image/png")})
    assert not_image.status_code == 415

    too_big = client.put(
        "/api/profile/avatar",
        files={"file": ("big.png", PNG_BYTES + b"0" * (settings.max_avatar_bytes), "image/png")},
    )
    assert too_big.status_code == 413


def test_avatar_is_private_to_its_owner(client: TestClient) -> None:
    _signed_in(client, email="ada@example.com", name="Ada")
    client.put("/api/profile/avatar", files={"file": ("me.png", PNG_BYTES, "image/png")})
    client.post("/api/auth/logout")

    _signed_in(client, email="grace@example.com", name="Grace")
    # Grace has no avatar; she cannot see Ada's.
    assert client.get("/api/profile/avatar").status_code == 404
    assert client.get("/api/profile").json()["avatar_url"] is None
