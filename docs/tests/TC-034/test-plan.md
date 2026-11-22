# TC-034 Test plan: resume upload, replace, view, delete and ownership

Requirement: REQ-429 (F-002 Resume Upload & Management, DEC-464)
Work item: WI-051 (api primary, web other)
Preconditions: a test database (Turso test instance) and a configured local storage directory for test files. Two test users (candidate A and candidate B), both signed in through F-001. Test PDF and DOCX files with readable text, plus invalid fixtures: an oversized file (over 5 MB), a file with a wrong extension (for example a `.pdf` that is really a text file), a scanned PDF with no text layer, and an empty file.

## Scenarios

### S1 Upload a valid PDF (AC1)
Steps:
1. Sign in as candidate A.
2. `POST /api/resume` with a valid text PDF under 5 MB.
Expected: success response with metadata (original filename, type PDF, size in bytes, uploaded time). The file is stored outside the database under a generated name, not the client filename.

### S2 Upload a valid DOCX (AC1)
Steps:
1. Sign in as candidate A.
2. `POST /api/resume` with a valid DOCX under 5 MB.
Expected: success response with type DOCX and correct metadata.

### S3 Upload requires authentication (AC1)
Steps:
1. Without a session, call `POST /api/resume`, `GET /api/resume` and `DELETE /api/resume`.
Expected: each request is refused as unauthenticated and no file is stored.

### S4 Reject an unsupported file type (AC2)
Steps:
1. Upload a file with an unsupported type (for example `.txt` or `.png`).
Expected: rejected with a clear message naming the allowed types (PDF, DOCX). Nothing is stored.

### S5 Reject a file whose content does not match its extension (AC2)
Steps:
1. Upload a file named `.pdf` whose content is not a PDF (checked by content signature, not only extension).
Expected: rejected with a clear message. Nothing is stored.

### S6 Reject an oversized file (AC2)
Steps:
1. Upload a file just over 5 MB.
Expected: rejected with a clear size message. The file is rejected before the whole file is read. The web page shows the same limit message before sending.

### S7 Reject a file with no readable text (AC2, AC3)
Steps:
1. Upload a scanned PDF with no text layer, and an empty DOCX.
Expected: rejected as unreadable with a clear message. No empty resume is stored.

### S8 Extract readable text (AC3)
Steps:
1. Upload a valid PDF and a valid DOCX containing known sentences.
2. Read the stored extracted text (through the database or the service layer).
Expected: the known sentences appear in the extracted text for both file types.

### S9 View resume metadata without file contents (AC1, AC3)
Steps:
1. After S1, call `GET /api/resume` as candidate A.
Expected: returns filename, type, size and uploaded time. The response does not include the file bytes.

### S10 Replace an existing resume (AC4)
Steps:
1. Upload resume R1 as candidate A.
2. Upload resume R2 (different filename and text) as candidate A with `POST /api/resume`.
3. Call `GET /api/resume`.
Expected: metadata now describes R2. Only one resume row exists for candidate A. The extracted text is R2's text. R1's file is removed from storage.

### S11 Failed replace keeps the old resume (AC4)
Steps:
1. Upload R1 as candidate A.
2. Make the replacement fail during the write of R2 (for example an invalid file that is rejected after the old resume exists, or a simulated storage write error).
Expected: the old resume R1 is still returned by `GET /api/resume` and its file still exists.

### S12 Another user's resume is not visible (AC5)
Steps:
1. Upload a resume as candidate A.
2. Sign in as candidate B and call `GET /api/resume`.
Expected: B gets the same response as when B has no resume (404 for A's resume). A's filename and metadata are not revealed.

### S13 Another user's resume cannot be replaced (AC5)
Steps:
1. Upload a resume as candidate A.
2. As candidate B, call `POST /api/resume` and then `DELETE /api/resume`.
Expected: B's upload creates B's own resume only. A's resume is unchanged. B's delete does not affect A's resume.

### S14 Ownership cannot be set from the client (AC5)
Steps:
1. Send a request body or path with another user's id (or a storage path from another user).
Expected: the id is ignored; the resume always belongs to the authenticated user. Storage paths are never taken from client input.

### S15 Delete request hides the resume (WI-051 q4)
Steps:
1. Upload a resume as candidate A.
2. Call `DELETE /api/resume`.
Expected: `GET /api/resume` no longer shows the resume to A. The row has `delete_requested_at` set. The file and extracted text still exist until the purge runs.

### S16 Purge removes resumes after 30 days (WI-051 q4)
Steps:
1. Create a resume with `delete_requested_at` more than 30 days in the past (set the value in the test database).
2. Run the purge job.
Expected: the stored file and extracted text are removed. A resume with `delete_requested_at` less than 30 days old is not removed.

### S17 Web upload page (WI-051 web)
Steps:
1. Sign in and open the resume page.
2. Upload a valid file; then try an invalid file and an oversized file.
3. Use Replace and Delete.
Expected: the page shows the current resume filename, the error message for invalid or unreadable files, and updates after replace or delete. The layout matches the mock in REQ-429 (upload, current resume, replace, delete, error message).

## Regression
- Re-run S1, S8 and S12 after any change to storage or extraction libraries.

## Out of scope
- Object storage (not in use; local storage is the decision in WI-051 q2).
- Version history of resumes (only one resume per candidate, per WI-051 q3).
