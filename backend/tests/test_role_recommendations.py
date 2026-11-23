from __future__ import annotations

import json
from datetime import timedelta

from fastapi.testclient import TestClient

from app.jobs.purge_resumes import purge_due
from app.services.gemini_client import AnalysisUnavailable
from app.services.role_recommendation_service import GENERATION_FAILED, NOT_ENOUGH_INFORMATION
from app.timeutil import utc_now
from tests.test_resume_analysis import FakeGemini, gemini_answer
from tests.test_resumes import make_pdf, sign_in, upload

RESUME_TEXT = "Ada Lovelace. Skills: Python and SQL. Experience: built data pipelines in Python."
ROLE_NAMES = ["Python Developer", "Backend Developer", "Data Engineer", "Full Stack Developer", "AI Engineer"]


class ScriptedGemini:
    """Answers the calls in order. An exception in the list is raised instead of answered."""

    def __init__(self, *answers: str | Exception) -> None:
        self.answers = list(answers)
        self.prompts: list[str] = []

    @property
    def calls(self) -> int:
        return len(self.prompts)

    def generate_json(self, prompt: str) -> str:
        self.prompts.append(prompt)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


def roles_json(names: list[str] = ROLE_NAMES) -> str:
    return json.dumps({"roles": [{"name": name, "reason": f"Fits the Python work: {name}."} for name in names]})


def analyzed(app, client: TestClient, answer: str | None = None) -> None:
    """Signs in, uploads a resume and runs the analysis, so the confirmed information exists."""
    sign_in(client)
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    app.state.gemini = FakeGemini(answer or gemini_answer(skills=["Python", "SQL"]))
    assert client.post("/api/resume/analysis").status_code == 200


def test_five_roles_with_names_and_reasons_are_generated_and_stored(app, client: TestClient) -> None:
    analyzed(app, client)
    gemini = ScriptedGemini(roles_json())
    app.state.gemini = gemini

    response = client.get("/api/role-recommendations")

    assert response.status_code == 200, response.text
    body = response.json()
    assert [role["name"] for role in body["roles"]] == ROLE_NAMES
    assert [role["position"] for role in body["roles"]] == [1, 2, 3, 4, 5]
    assert all(role["reason"] for role in body["roles"])
    assert body["selected_role"] is None
    assert '"Python"' in gemini.prompts[0]  # the confirmed skills are what the roles are based on
    assert gemini.calls == 1


def test_the_stored_list_is_reused_for_the_same_resume(app, client: TestClient) -> None:
    analyzed(app, client)
    first = ScriptedGemini(roles_json())
    app.state.gemini = first
    client.get("/api/role-recommendations")

    app.state.gemini = ScriptedGemini()  # no answers left: any call would fail the test
    second = client.get("/api/role-recommendations")

    assert second.status_code == 200
    assert [role["name"] for role in second.json()["roles"]] == ROLE_NAMES


def test_selection_is_saved_and_is_not_forced_to_the_first_role(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")

    chosen = client.post("/api/role-recommendations/selection", json={"position": 3})

    assert chosen.status_code == 200, chosen.text
    assert chosen.json()["selected_role"] == "Data Engineer"
    assert client.get("/api/role-recommendations").json()["selected_role"] == "Data Engineer"
    assert app.state.db.execute("SELECT selected_role FROM interview_configurations") == [
        {"selected_role": "Data Engineer"}
    ]


def test_invalid_output_is_retried_once_then_accepted(app, client: TestClient) -> None:
    analyzed(app, client)
    gemini = ScriptedGemini("not json", roles_json())
    app.state.gemini = gemini

    response = client.get("/api/role-recommendations")

    assert response.status_code == 200, response.text
    assert gemini.calls == 2
    assert len(response.json()["roles"]) == 5


def test_invalid_output_twice_is_an_error_and_nothing_is_stored(app, client: TestClient) -> None:
    analyzed(app, client)
    gemini = ScriptedGemini(roles_json(ROLE_NAMES[:4]), json.dumps({"roles": [{"name": "Python Developer"}]}))
    app.state.gemini = gemini

    response = client.get("/api/role-recommendations")

    assert response.status_code == 502
    assert response.json()["detail"] == GENERATION_FAILED
    assert gemini.calls == 2
    assert app.state.db.execute("SELECT user_id FROM role_recommendations") == []


def test_duplicate_role_names_are_rejected(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json(["Python Developer"] * 5), roles_json(["Python Developer"] * 5))

    assert client.get("/api/role-recommendations").status_code == 502


def test_gemini_unavailable_is_reported_without_a_retry(app, client: TestClient) -> None:
    analyzed(app, client)
    gemini = ScriptedGemini(AnalysisUnavailable("down"))
    app.state.gemini = gemini

    response = client.get("/api/role-recommendations")

    assert response.status_code == 503
    assert response.json()["detail"] == GENERATION_FAILED
    assert gemini.calls == 1


def test_roles_need_an_analysis_with_some_skills_or_experience(app, client: TestClient) -> None:
    analyzed(app, client, answer=gemini_answer())  # analysis found nothing usable
    gemini = ScriptedGemini()
    app.state.gemini = gemini

    response = client.get("/api/role-recommendations")

    assert response.status_code == 409
    assert response.json()["detail"] == NOT_ENOUGH_INFORMATION
    assert gemini.calls == 0


def test_corrections_are_used_as_the_confirmed_information(app, client: TestClient) -> None:
    analyzed(app, client)
    client.put(
        "/api/resume/analysis/corrections",
        json={**json.loads(gemini_answer()), "skills": ["Rust"]},
    )
    gemini = ScriptedGemini(roles_json())
    app.state.gemini = gemini

    assert client.get("/api/role-recommendations").status_code == 200
    assert '"Rust"' in gemini.prompts[0]  # the corrected skills are used, not the AI output
    assert '"Python"' not in gemini.prompts[0]


def test_no_analysis_or_resume_means_nothing_is_generated(app, client: TestClient) -> None:
    sign_in(client)
    gemini = ScriptedGemini()
    app.state.gemini = gemini

    assert client.get("/api/role-recommendations").status_code == 404  # no resume at all
    upload(client, make_pdf(RESUME_TEXT), "cv.pdf")
    assert client.get("/api/role-recommendations").status_code == 409  # resume but no analysis
    assert gemini.calls == 0


def test_selection_needs_stored_roles_and_a_valid_position(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini()

    assert client.post("/api/role-recommendations/selection", json={"position": 1}).status_code == 409

    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")
    assert client.post("/api/role-recommendations/selection", json={"position": 6}).status_code == 422
    assert client.post("/api/role-recommendations/selection", json={"position": 0}).status_code == 422


def test_another_users_roles_are_not_visible(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")
    client.post("/api/role-recommendations/selection", json={"position": 2})

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")
        assert grace_client.get("/api/role-recommendations").status_code == 404  # Grace has no resume
        assert grace_client.post("/api/role-recommendations/selection", json={"position": 1}).status_code == 404


def test_replacing_the_resume_makes_the_old_roles_unavailable(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")

    upload(client, make_pdf("Ada Lovelace new resume with SQL and Python"), "new.pdf")
    app.state.gemini = FakeGemini(gemini_answer(skills=["SQL"]))
    client.post("/api/resume/analysis")
    app.state.gemini = ScriptedGemini(roles_json(["SQL Developer", "Data Analyst", "BI Developer", "AI Engineer", "Python Developer"]))

    response = client.get("/api/role-recommendations")

    assert response.status_code == 200
    assert response.json()["roles"][0]["name"] == "SQL Developer"  # regenerated, not the old list
    assert response.json()["selected_role"] is None  # the old selection is not an option any more


def test_purging_the_resume_removes_the_stored_roles(app, client: TestClient) -> None:
    analyzed(app, client)
    app.state.gemini = ScriptedGemini(roles_json())
    client.get("/api/role-recommendations")
    client.post("/api/role-recommendations/selection", json={"position": 2})
    client.delete("/api/resume")

    assert purge_due(app.state.db, app.state.resume_store, now=utc_now() + timedelta(days=31)) == 1
    assert app.state.db.execute("SELECT user_id FROM role_recommendations") == []


def test_role_routes_require_sign_in(client: TestClient) -> None:
    assert client.get("/api/role-recommendations").status_code == 401
    assert client.post("/api/role-recommendations/selection", json={"position": 1}).status_code == 401
