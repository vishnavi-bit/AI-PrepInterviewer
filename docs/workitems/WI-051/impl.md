# WI-051 Implementation plan: resume upload, replace, extract and ownership

Applications: api (primary), web (other)
Requirement: REQ-429 (F-002 Resume Upload & Management, FEAT-1392, DEC-464)

## Answers applied
- q1 File-size limit: 5 MB. Enforced in the API; the web page checks it too for a quick message.
- q2 Storage: controlled local storage on the server. The original file is written to a configured local directory outside the database. Turso holds metadata and extracted text only. Storage sits behind a small interface so object storage can replace it later without changing the API.
- q3 One resume: each candidate has at most one resume. Replace overwrites it. No version history.
- q4 Deletion: a delete request removes the original file and the extracted text within 30 days. The record is marked for deletion immediately and hidden from the candidate; a purge step removes the file and text once 30 days have passed.

## Approach (api, primary)
1. Config: add the max resume size (5 MB), the allowed types (PDF, DOCX), and the storage directory to settings. Read from environment variables.
2. Storage: a `ResumeFileStore` interface with a local-disk implementation. It saves under a generated name (never the user's filename), reads, and deletes. Paths are built from the user id and generated name, never from client input.
3. Extraction: a text extractor per type (PDF and DOCX). A file with no readable text (for example a scanned PDF) is rejected as unreadable.
4. Validation on upload: check the extension and the content signature (magic bytes), not only the extension. Reject a file over 5 MB before reading it all. Return a clear error message for each rejection.
5. Endpoints, all requiring an authenticated user (F-001 sign-in):
   - `POST /api/resume`: upload a resume. If one exists, this replaces it.
   - `GET /api/resume`: return metadata (filename, type, size, uploaded time) and not the file contents.
   - `DELETE /api/resume`: mark the resume for deletion (see q4).
6. Ownership: every query filters by the authenticated user id. Another user's resume returns 404 (not 403), so the existence of a resume is not revealed.
7. Replace order: write the new file, then update the row in Turso, then delete the old file. If a step fails, the old resume stays in place.
8. Purge: a function that deletes files and extracted text for resumes whose delete request is more than 30 days old. Run on a schedule or by a manual command (choice to confirm at implementation).

## Data (Turso)
- Table `resumes`: `id`, `user_id` (unique, so one resume per user), `original_filename`, `content_type`, `size_bytes`, `storage_key`, `extracted_text`, `uploaded_at`, `delete_requested_at` (nullable).

## Likely affected files (api, backend/ is currently empty apart from .venv, so these are new)
- backend/app/config.py: size limit, types, storage directory
- backend/app/main.py: register the resume router
- backend/app/api/resumes.py: the three endpoints
- backend/app/services/resume_service.py: validation, replace, delete, ownership
- backend/app/services/text_extraction.py: PDF and DOCX text extraction
- backend/app/storage/resume_store.py: storage interface and local implementation
- backend/app/db/resumes_repo.py: Turso queries for the `resumes` table
- backend/app/jobs/purge_resumes.py: 30-day purge
- backend/tests/test_resumes.py: upload, reject, extract, replace, ownership, delete

## Likely affected files (web, other application)
- The React resume page (the mock: upload, current resume, replace, delete, error message), its API client module, and component tests. Exact paths to confirm, because no frontend folder is in the repository yet.

## Risks
- Local storage on one server does not survive a second server or a disk loss. Accepted for now (q2); object storage is the planned replacement.
- Turso is not used for file bytes (per the source rules).
- The purge needs a scheduler. None exists in the repository yet.
- Text extraction quality varies by file. Unreadable files are rejected rather than stored empty.

## Assumptions
- F-001 (REQ-428) provides an authenticated user id to every request. Its status is not checked here.
- PDF and DOCX parsing libraries are chosen at implementation time (for example pypdf and python-docx) and recorded in the requirements file.
- The mock is a page in the web app; no other pages are in scope.
