from __future__ import annotations

from datetime import timedelta
from io import BytesIO
from pathlib import Path

import pytest
from docx import Document
from fastapi.testclient import TestClient

from app.db.connection import DatabaseError
from tests.conftest import PASSWORD, delete_verified, login, register

DOCX_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


def sign_in(client: TestClient, email: str = "ada@example.com", name: str = "Ada") -> None:
    register(client, email=email, name=name)
    assert login(client, email=email).status_code == 200


def make_pdf(text: str | None) -> bytes:
    """A minimal PDF. With text=None the page has no text, like a scanned page."""
    stream = b"" if text is None else f"BT /F1 24 Tf 72 720 Td ({text}) Tj ET".encode("ascii")
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R "
        b"/Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    out = b"%PDF-1.4\n"
    offsets = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += b"%d 0 obj\n" % number + body + b"\nendobj\n"
    xref_at = len(out)
    out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objects) + 1)
    for offset in offsets:
        out += b"%010d 00000 n \n" % offset
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objects) + 1, xref_at)
    return out


def make_docx(text: str) -> bytes:
    document = Document()
    document.add_paragraph(text)
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def upload(client: TestClient, data: bytes, filename: str = "resume.pdf"):
    return client.post("/api/resume", files={"file": (filename, data, "application/octet-stream")})


def stored_files(settings) -> list[Path]:
    return [path for path in (settings.uploads_dir / "resumes").rglob("*") if path.is_file()]


def test_upload_pdf_then_read_metadata_only(client: TestClient) -> None:
    sign_in(client)
    response = upload(client, make_pdf("Ada Lovelace resume"), "cv.pdf")

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["original_filename"] == "cv.pdf"
    assert body["content_type"] == "application/pdf"
    assert body["size_bytes"] > 0
    assert "uploaded_at" in body
    # Metadata only: no file contents, no extracted text, no storage location.
    assert "extracted_text" not in body and "storage_key" not in body

    current = client.get("/api/resume")
    assert current.status_code == 200
    assert current.json()["original_filename"] == "cv.pdf"


def test_upload_docx(client: TestClient) -> None:
    sign_in(client)
    response = upload(client, make_docx("Grace Hopper resume"), "cv.docx")

    assert response.status_code == 200, response.text
    assert response.json()["content_type"] == DOCX_TYPE


def test_unsupported_or_mismatched_files_are_rejected(client: TestClient) -> None:
    sign_in(client)

    not_allowed = upload(client, b"plain text", "notes.txt")
    assert not_allowed.status_code == 415
    assert not_allowed.json()["detail"] == "Upload a PDF or DOCX resume."

    pdf_named_docx = upload(client, make_pdf("hello"), "cv.docx")
    assert pdf_named_docx.status_code == 415

    fake_pdf = upload(client, b"<html>not a pdf</html>", "cv.pdf")
    assert fake_pdf.status_code == 415

    assert client.get("/api/resume").status_code == 404


def test_oversized_file_is_refused_with_a_clear_message(client: TestClient, settings) -> None:
    sign_in(client)
    too_big = b"%PDF-" + b"0" * settings.max_resume_bytes

    response = upload(client, too_big, "big.pdf")

    assert response.status_code == 413
    assert response.json()["detail"] == "The resume must be 5 MB or smaller."
    assert stored_files(settings) == []


def test_unreadable_files_are_rejected_not_stored_empty(client: TestClient, settings) -> None:
    sign_in(client)

    scanned = upload(client, make_pdf(None), "scan.pdf")
    assert scanned.status_code == 422
    assert "selectable text" in scanned.json()["detail"]

    broken_docx = upload(client, b"PK\x03\x04 not really a word document", "broken.docx")
    assert broken_docx.status_code == 422

    assert client.get("/api/resume").status_code == 404
    assert stored_files(settings) == []


def test_replace_overwrites_and_removes_the_old_file(client: TestClient, settings) -> None:
    sign_in(client)
    upload(client, make_pdf("first version"), "old.pdf")
    assert len(stored_files(settings)) == 1

    response = upload(client, make_docx("second version"), "new.docx")

    assert response.status_code == 200
    assert client.get("/api/resume").json()["original_filename"] == "new.docx"
    # One resume per candidate: the old file is gone, only the new one remains.
    files = stored_files(settings)
    assert len(files) == 1
    assert files[0].suffix == ".docx"


def test_failed_replace_keeps_the_old_resume(client: TestClient, app, settings, monkeypatch) -> None:
    sign_in(client)
    upload(client, make_pdf("keep me"), "keep.pdf")
    before = client.get("/api/resume").json()

    def broken_upsert(*args, **kwargs):
        raise DatabaseError("simulated failure")

    monkeypatch.setattr("app.services.resume_service.resumes_repo.upsert_resume", broken_upsert)
    # The candidate gets a generic error with no internal detail; the request ID is in the header (WI-060).
    response = upload(client, make_docx("replacement"), "new.docx")
    assert response.status_code == 500
    assert response.json() == {"detail": "Something went wrong. Please try again."}
    assert "simulated failure" not in response.text
    assert response.headers["X-Request-ID"]

    assert client.get("/api/resume").json() == before
    files = stored_files(settings)
    assert len(files) == 1 and files[0].suffix == ".pdf"


def test_another_users_resume_is_not_visible_or_replaceable(app, settings) -> None:
    with TestClient(app) as ada_client:
        sign_in(ada_client, email="ada@example.com", name="Ada")
        upload(ada_client, make_pdf("Ada's resume"), "ada.pdf")

    with TestClient(app) as grace_client:
        sign_in(grace_client, email="grace@example.com", name="Grace")

        # Grace has no resume of her own, so she cannot see Ada's.
        assert grace_client.get("/api/resume").status_code == 404
        # Nothing in the API takes another user's id, so Grace cannot delete Ada's either.
        assert delete_verified(grace_client, "/api/resume").status_code == 404

        # Grace uploading creates her own resume and leaves Ada's file untouched.
        assert upload(grace_client, make_docx("Grace's resume"), "grace.docx").status_code == 200

    with TestClient(app) as ada_client:
        assert login(ada_client, email="ada@example.com").status_code == 200
        assert ada_client.get("/api/resume").json()["original_filename"] == "ada.pdf"
    assert len(stored_files(settings)) == 2


def test_resume_routes_require_sign_in(client: TestClient) -> None:
    assert client.get("/api/resume").status_code == 401
    assert delete_verified(client, "/api/resume").status_code == 401
    assert upload(client, make_pdf("hello")).status_code == 401


def test_delete_removes_the_file_and_text_at_once(app, settings) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("to be deleted"), "gone.pdf")
        assert len(stored_files(settings)) == 1

        assert delete_verified(client, "/api/resume").status_code == 204
        assert client.get("/api/resume").status_code == 404
        assert delete_verified(client, "/api/resume").status_code == 404  # nothing left to delete

    assert stored_files(settings) == []
    assert app.state.db.execute("SELECT id FROM resumes") == []


def test_delete_needs_the_current_password_and_deletes_nothing_without_it(app, settings) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("keep me"), "keep.pdf")

        response = delete_verified(client, "/api/resume", password="not-the-password")

        assert response.status_code == 403
        assert client.get("/api/resume").status_code == 200
    assert len(stored_files(settings)) == 1


def test_upload_after_delete_creates_a_fresh_resume(app, settings) -> None:
    with TestClient(app) as client:
        sign_in(client)
        upload(client, make_pdf("first"), "first.pdf")
        delete_verified(client, "/api/resume")

        assert upload(client, make_docx("second"), "second.docx").status_code == 200
        assert client.get("/api/resume").json()["original_filename"] == "second.docx"

    files = stored_files(settings)
    assert len(files) == 1 and files[0].suffix == ".docx"
