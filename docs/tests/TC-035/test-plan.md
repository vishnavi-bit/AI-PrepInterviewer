# TC-035 Test plan: F-003 AI resume analysis

Requirement: REQ-430 (F-003 AI resume analysis, DEC-465)
Work item: WI-053 (api APP-041 primary, web APP-040)

Acceptance criteria covered: 1 (text sent to Gemini via backend), 2 (relevant information identified), 3 (nothing invented), 4 (readable display), 5 (invalid or incomplete AI answers handled safely).

## Preconditions
- A user is signed in and has an active uploaded resume with extracted text.
- Backend tests use a fake Gemini client and an injected HTTP transport (no live network call).
- Live check (manual, optional): `GEMINI_API_KEY` set, model `gemini-2.5-flash` (or `GEMINI_MODEL`) reachable.

## Scenarios

### S1 Analysis sends resume text to Gemini through the backend (AC1)
1. Upload a resume whose text contains a known skill, e.g. "Python", and a known institution.
2. Call `POST /api/resume/analysis` as that user.
3. Expected: the fake Gemini client receives one request whose prompt contains the extracted resume text between the delimiters. The key is sent in the `x-goog-api-key` header and is not present in the URL or in the response body.
4. Expected: response 200 with the analysis; `GET /api/resume/analysis` returns the same output with `corrected: false` and `corrections: null`.

### S2 Analysis identifies information present in the resume (AC2)
1. Fake Gemini returns a valid object with `skills`, `education`, `projects`, `experience`, `internships`, `certifications`, `technologies`, all grounded in the resume text.
2. Expected: every grounded entry is present in the stored `ai_output` with its shape: `education` items have `degree`, `institution`, `year`, `score`; `projects` items have `name`, `description`, `technologies`; `experience` and `internships` are objects with `title`, `organization`, `period`, `description`; `skills`, `certifications`, `technologies` are lists of text.

### S3 Nothing is invented (AC3)
1. Fake Gemini returns a valid object that also contains a skill ("Kubernetes") and an institution ("Imaginary University") that do not appear in the resume text.
2. Expected: those entries are dropped by the grounding check; they do not appear in `ai_output`.
3. Fake Gemini returns empty lists for every category (resume with no certifications, for example).
4. Expected: the stored output has empty lists for those categories, and the web page shows "None found in your resume" for each empty category.
5. Case and whitespace: an entry "python  SQL" matches a resume line "Python SQL" (case-insensitive, whitespace collapsed) and is kept.

### S4 Readable display (AC4)
1. Open the Resume page with a stored analysis.
2. Expected: list categories are shown as tags; object categories show one block per entry with its fields; empty categories show "None found in your resume".
3. Expected: the "Analyze resume" button and the analysis section appear under the upload section; a replaced resume starts with no analysis shown.

### S5 Invalid AI answer is handled safely (AC5)
Run each with fake Gemini returning the stated answer:
1. Not a JSON object (e.g. a plain text answer) -> 502, message is the answered text: "We couldn't analyze your resume right now. Please try again in a few moments. Your uploaded resume is safe. If the problem continues, you can try uploading your resume again or contact support."
2. JSON object with no known category -> 502 with the same message.
3. A category whose value is not a list (e.g. `"skills": "Python"`), or a text value that is not text -> 502 with the same message.
4. Empty answer (no text) -> 502 with the same message.
5. Expected for all: nothing is stored (`GET /api/resume/analysis` returns 404 "no analysis" if none existed before), and no partial output is shown.
6. Entries with an empty main field (e.g. a project with an empty name) are dropped and the rest of a valid answer is still stored.

### S6 Gemini unavailable (AC5)
1. Fake transport raises a transport error, or Gemini returns non-200.
2. Expected: 503 with the answered message; nothing stored.
3. With `GEMINI_API_KEY` unset: analysis reports itself unavailable (503, same message); no network call is made.
4. Web: the message is displayed as an understandable error, and the resume itself is still listed as uploaded.

### S7 Candidate corrections are stored separately (AC5 and review requirement)
1. Run an analysis, then `PUT /api/resume/analysis/corrections` with a valid payload.
2. Expected: `GET` returns `corrected: true`, the candidate's corrections, and the unchanged `ai_output`. The AI output is never overwritten.
3. Expected: a correction payload that fails structure validation returns 422 with the fixed message and is not stored.
4. Expected: `PUT` with no analysis for the current resume returns 404.
5. Web: Edit shows one textarea per text list and one input per field for each entry; add and remove work; Confirm saves; Cancel discards. Text lists are parsed on save, so pressing Enter does not split an entry.

### S8 Replacing the resume clears the analysis
1. Run an analysis, then replace the resume with a new upload.
2. Expected: the old analysis and corrections are deleted; `GET /api/resume/analysis` returns 404 until the new resume is analysed.
3. Expected: the purge job removes the analysis together with the resume row.

### S9 Ownership
1. User A runs an analysis. User B calls `GET`, `POST` and `PUT` on the analysis endpoints.
2. Expected: user B sees "no analysis" (404) and cannot read or change user A's analysis.

### S10 Analyze requires a resume
1. A user with no active resume calls `POST /api/resume/analysis`.
2. Expected: 404; no Gemini call is made.

## Out of scope for this plan
- Quality of Gemini's output and paraphrased names (the grounding check drops them; this is a known limitation in WI-053).
- Privacy notice wording before analysis (outside WI-053).
- Automatic analysis after upload (not in scope; analysis is manual).

## How to run
- Backend: `pytest backend/tests/test_resume_analysis.py` (covers S1-S10 at the service and API level).
- Web: `tsc --noEmit` and `vite build`; browser check of S4 and S7 is manual, since no frontend test exists.
