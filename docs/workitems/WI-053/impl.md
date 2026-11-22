# WI-053 Implementation plan: F-003 AI resume analysis via Gemini (backend) and review page

Applications: api (APP-041, primary), web (APP-040, other)
Requirement: REQ-430 (F-003 AI resume analysis, FEAT-1393, DEC-465)

## Answered questions
- q1 JSON structure: the answered template is used. Top-level categories: `skills`, `education` (degree, institution, year, score), `projects` (name, description, technologies), `experience`, `internships`, `certifications`, `technologies`. The answer does not give the item shape for `experience`, `internships`, `certifications` and `technologies`. This plan decides: `experience` and `internships` are objects with `title`, `organization`, `period`, `description`; `certifications`, `skills` and `technologies` are lists of text.
- q2 Corrections: stored separately from the AI output. The AI output is never overwritten by the candidate's corrections.
- q3 Failure message: the answered text is shown for every failed analysis (Gemini unavailable, invalid or incomplete answer).

## Approach (api, primary)
1. Config: `GEMINI_API_KEY`, `GEMINI_MODEL` (default `gemini-2.5-flash`) and `GEMINI_TIMEOUT_SECONDS` are read from the environment. The key is never sent to the browser or written to code. Without a key, analysis reports itself unavailable.
2. Gemini client (`services/gemini_client.py`): one POST to the Gemini `generateContent` endpoint with a JSON response type and temperature 0. The key is sent in the `x-goog-api-key` header, not in the URL. Transport errors and non-200 answers raise `AnalysisUnavailable`. An answer with no text is passed on as an empty string, which validation rejects.
3. Prompt (`build_prompt`): the extracted resume text, between explicit delimiters, with instructions to use only what the text states, to return empty lists for missing categories, and to treat the text as data.
4. Validation (`parse_and_validate`): the answer must be a JSON object with at least one known category. Each list must be a list, each text value must be text, and entries whose main field is empty are dropped. Otherwise the answer is invalid.
5. Grounding (`keep_grounded`): each entry is kept only if its main value (skill or technology text, institution, project name, title) appears in the resume text (case-insensitive, whitespace collapsed). This is the guard for acceptance 3.
6. Analyze (`POST /api/resume/analysis`): requires an active resume (404 otherwise). Invalid answers return 502. Unavailable Gemini returns 503. Both use the answered message. On success the validated output is stored with the resume id and any old corrections are cleared.
7. Read (`GET /api/resume/analysis`): returns the AI output, the corrections (or null) and a `corrected` flag. An analysis made for a replaced resume is not returned (404).
8. Corrections (`PUT /api/resume/analysis/corrections`): needs an analysis for the current resume (404 otherwise). The payload is validated for structure only and stored in its own column. Invalid payloads return 422 with a fixed message.
9. Lifecycle: replacing the resume deletes the stored analysis. The purge job deletes the analysis together with the resume row, after the file is removed. Ownership: every query is scoped to the signed-in user; another user's analysis looks like "no analysis" (404).

## Data (Turso / SQLite)
- Table `resume_analyses` (migration `003_resume_analyses.sql`): `user_id` (primary key, references `users`, cascade delete), `resume_id`, `ai_output` (JSON text), `corrections` (JSON text, nullable), `analyzed_at`, `corrected_at` (nullable). No foreign key on `resume_id`, because the resume row is updated in place on replace.

## Web (APP-040, other)
3. `frontend/src/api/resumeAnalysis.ts`: read, analyze and save-corrections calls. A 404 on read means "no analysis yet".
4. `frontend/src/components/ResumeAnalysis.tsx`: the "Analyze resume" button, the readable view (tags for the list categories, one block per entry for the object categories, "None found in your resume" for empty ones), and the edit form (one textarea per text list, one input per field for each entry, add and remove, Confirm and Cancel). Text lists are edited as raw text and parsed on save, so pressing Enter is not rewritten.
5. `frontend/src/pages/Resume.tsx`: renders the component under the upload section when a resume exists, keyed by upload time, so a replaced resume starts with its own analysis state.
6. `frontend/src/styles.css`: styles for the analysis view and form.

## Affected files
- api: `backend/app/config.py`, `backend/app/main.py` (app state and router), `backend/app/db/migrations/003_resume_analyses.sql`, `backend/app/db/analyses_repo.py`, `backend/app/db/resumes_repo.py` (`get_text_for_user`), `backend/app/services/gemini_client.py`, `backend/app/services/resume_analysis_service.py`, `backend/app/api/resume_analysis.py`, `backend/app/services/resume_service.py` (clear analysis on replace), `backend/app/jobs/purge_resumes.py` (delete analysis on purge), `backend/.env.example`, `backend/tests/test_resume_analysis.py`
- web: `frontend/src/api/resumeAnalysis.ts`, `frontend/src/components/ResumeAnalysis.tsx`, `frontend/src/pages/Resume.tsx`, `frontend/src/styles.css`

## Verification (as of this plan)
- Backend: `pytest` passes, 57 tests in total, 11 of them for this work item (the analysis tests use a fake Gemini client and an injected HTTP transport, so no network call is made).
- Web: `tsc --noEmit` and `vite build` pass. No frontend test exists.

## Not done or not verified
- The Gemini call has not been run against the live API. `GEMINI_API_KEY` is not set in this environment, and the model name is not checked against the account.
- The page has not been tested in a browser. Only type-checking and the production build were run.
- The grounding check is a text match. A paraphrase of a name (for example an abbreviation) is dropped, so some real content may be missing from the result.
- Prompt-injection protection is limited to delimiters and an instruction. The grounding check reduces what an injected instruction can add, but it does not remove the risk.
- Re-analysis is manual. There is no automatic analysis after upload.
- The purge job has no scheduler (inherited from WI-051).

## Risks
- The resume text and the analysis are personal data sent to an external service (Gemini). The candidate must be told this before analysis; the page's hint states that the analysis lists only what the resume says but does not name the external service. A privacy notice is outside this work item.
- Gemini output may change between model versions. The validator and the grounding check protect the stored shape, not the quality of the analysis.
