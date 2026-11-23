from __future__ import annotations

import json
from datetime import timedelta

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.services.gemini_client import AnalysisUnavailable, GeminiClient
from app.services.resume_analysis_service import ANALYSIS_FAILED_MESSAGE, CORRECTIONS_INVALID_MESSAGE
from tests.conftest import delete_verified
from tests.test_resumes import make_pdf, sign_in, upload

RESUME_TEXT = "Ada Lovelace. Skills: Python and SQL. Education: BSc Mathematics, University of London, 2015."


class FakeGemini:
    """Stands in for Gemini. Returns a fixed answer, or raises the given exception."""

    def __init__(self, answer: str | Exception) -> None:
        self.answer = answer
        self.prompts: list[str] = []

    def generate_json(self, prompt: str) -> str:
        self.prompts.append(prompt)
        if isinstance(self.answer, Exception):
            raise self.answer
        return self.answer


def gemini_answer(**categories) -> str:
    base = {
        "skills": [],
        "education": [],
        "projects": [],
        "experience": [],
        "internships": [],
        "certifications": [],
        "technologies": [],
    }
    base.update(categories)
    return json.dumps(base)


def analyze(client: TestClient):
    return client.post("/api/resume/analysis")


def test_analysis_sends_resume_text_through_the_backend_and_drops_invented_items(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    fake = FakeGemini(
        gemini_answer(
            skills=["Python", "SQL", "Rust"],  # Rust is not in the resume, so it must be dropped
            education=[{"institution": "University of London", "degree": "BSc Mathematics", "year": "2015", "score": ""}],
        )
    )
    app.state.gemini = fake

    response = analyze(client)

    assert response.status_code == 200, response.text
    assert "Ada Lovelace" in fake.prompts[0]  # the extracted text went to Gemini
    body = response.json()
    assert body["ai_output"]["skills"] == ["Python", "SQL"]
    assert body["ai_output"]["education"][0]["institution"] == "University of London"
    assert body["corrected"] is False and body["corrections"] is None

    assert client.get("/api/resume/analysis").json() == body


def test_corrections_are_stored_next_to_the_ai_output_not_over_it(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))
    ai_output = analyze(client).json()["ai_output"]

    corrected = client.put(
        "/api/resume/analysis/corrections",
        json={**json.loads(gemini_answer()), "skills": ["Python", "Team leadership"]},
    )

    assert corrected.status_code == 200, corrected.text
    body = corrected.json()
    assert body["ai_output"] == ai_output  # the AI output is kept as it was
    assert body["corrections"]["skills"] == ["Python", "Team leadership"]
    assert body["corrected"] is True


def test_invalid_or_unavailable_answers_are_handled_safely(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")

    cases = [
        ("not json at all", 502),
        ("{}", 502),  # nothing recognisable
        (json.dumps({**json.loads(gemini_answer()), "skills": "Python"}), 502),  # wrong type
        (AnalysisUnavailable("Gemini returned HTTP 503."), 503),
    ]
    for answer, status in cases:
        app.state.gemini = FakeGemini(answer)
        response = analyze(client)
        assert response.status_code == status, (answer, response.text)
        assert response.json()["detail"] == ANALYSIS_FAILED_MESSAGE
        assert client.get("/api/resume/analysis").status_code == 404  # nothing half-stored

    assert client.get("/api/resume").status_code == 200  # the uploaded resume is untouched


def test_analysis_needs_an_uploaded_resume(app, client: TestClient) -> None:
    sign_in(client)
    app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))

    assert analyze(client).status_code == 404
    assert app.state.gemini.prompts == []  # nothing is sent when there is no resume


def test_invalid_corrections_are_rejected(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))
    analyze(client)

    response = client.put("/api/resume/analysis/corrections", json={"skills": [123]})

    assert response.status_code == 422
    assert response.json()["detail"] == CORRECTIONS_INVALID_MESSAGE


def test_corrections_need_an_analysis_first(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")

    assert client.put("/api/resume/analysis/corrections", json={"skills": []}).status_code == 404


def test_another_users_analysis_is_not_visible(app, client: TestClient) -> None:
    with TestClient(app) as ada_client:
        sign_in(ada_client, email="ada@example.com", name="Ada")
        upload(ada_client, make_pdf(RESUME_TEXT), "ada.pdf")
        app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))
        analyze(ada_client)

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")
        assert grace_client.get("/api/resume/analysis").status_code == 404
        assert grace_client.put("/api/resume/analysis/corrections", json={"skills": []}).status_code == 404


def test_replacing_the_resume_makes_the_old_analysis_unavailable(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "old.pdf")
    app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))
    analyze(client)

    upload(client, make_pdf("Ada Lovelace new resume with SQL"), "new.pdf")

    assert client.get("/api/resume/analysis").status_code == 404
    assert app.state.db.execute("SELECT user_id FROM resume_analyses") == []


def test_deleting_the_resume_removes_the_analysis_at_once(app, client: TestClient) -> None:
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    app.state.gemini = FakeGemini(gemini_answer(skills=["Python"]))
    analyze(client)
    delete_verified(client, "/api/resume")

    assert app.state.db.execute("SELECT user_id FROM resume_analyses") == []


def test_no_api_key_means_analysis_is_unavailable_without_a_network_call(tmp_path) -> None:
    def must_not_be_called(request: httpx.Request) -> httpx.Response:
        raise AssertionError("no request should be sent without a key")

    settings = Settings(
        turso_url=None,
        turso_token=None,
        sqlite_path=str(tmp_path / "t.db"),
        uploads_dir=tmp_path,
        session_days=7,
        cookie_secure=False,
        max_avatar_bytes=1,
        gemini_api_key=None,
    )
    gemini = GeminiClient(settings, client=httpx.Client(transport=httpx.MockTransport(must_not_be_called)))

    with pytest.raises(AnalysisUnavailable):
        gemini.generate_json("hello")


def test_gemini_client_sends_the_key_in_a_header_and_handles_failures(tmp_path) -> None:
    seen: dict[str, object] = {}

    def answer(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["key"] = request.headers.get("x-goog-api-key")
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": '{"skills": []}'}]}}]})

    settings = Settings(
        turso_url=None,
        turso_token=None,
        sqlite_path=str(tmp_path / "t.db"),
        uploads_dir=tmp_path,
        session_days=7,
        cookie_secure=False,
        max_avatar_bytes=1,
        gemini_api_key="test-key",
        gemini_model="gemini-test",
    )
    gemini = GeminiClient(settings, client=httpx.Client(transport=httpx.MockTransport(answer)))

    assert gemini.generate_json("p") == '{"skills": []}'
    assert seen["key"] == "test-key"
    assert "test-key" not in str(seen["url"])  # the key is never in the URL
    assert str(seen["url"]).endswith("/models/gemini-test:generateContent")

    failing = GeminiClient(settings, client=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500))))
    with pytest.raises(AnalysisUnavailable):
        failing.generate_json("p")

    empty = GeminiClient(settings, client=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(200, json={}))))
    assert empty.generate_json("p") == ""  # treated as an invalid answer by the service
