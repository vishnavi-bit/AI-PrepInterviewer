# WI-058: Generate and save AI interview evaluation report

Applications: api (primary), web (other)
Requirement: REQ-435 (F-008 AI performance evaluation), Decision DEC-470, Feature FEAT-1398

## Approach

When an interview session ends with status `completed`, the backend asks Gemini to evaluate the candidate's answers for that session. The response is parsed and validated against a fixed schema, the overall score is computed in code (not by Gemini), and only a valid report is saved, linked to the signed-in user and the interview session. The web app shows the saved report on the interview result view, with the disclaimer that scores are AI-generated practice estimates.

This follows the existing pattern in `backend/app/services/resume_analysis_service.py` (build prompt, parse and validate, reject malformed output) and the Gemini call in `backend/app/services/gemini_client.py`. Gemini is called from the backend only.

## Decisions taken from Q&A

- **Generation:** automatic when the interview ends (q3). Not on request.
- **Categories per interview type (q1), each scored 0 to 100:**
  - Technical: Technical Knowledge 30%, Problem-solving 25%, Answer Accuracy 25%, Answer Clarity 20%
  - HR: Communication 30%, Confidence 20%, Professionalism 20%, Answer Relevance 30%
  - Behavioral: Communication 20%, Situation Analysis 25%, Decision-making 25%, Answer Relevance 30%
  - Project-based: Project Knowledge 30%, Technical Understanding 25%, Problem-solving 25%, Answer Clarity 20%
- **Overall score (q2):** weighted average of the applicable category scores for the session's interview type. Each type's weights total exactly 100. Technical weights are never applied to other types. Answer Clarity is weighted only where listed above.
- Score output: integer 0 to 100 for the overall score; category scores 0 to 100.

## Areas and files likely affected

api (primary, APP-041):
- `backend/app/db/migrations/006_interview_reports.sql` (new): table `interview_reports` with `id`, `session_id` (FK to `interview_sessions`, unique), `user_id` (FK to `users`), `overall_score`, `category_scores` (JSON), `strengths`, `improvements`, `suggestions`, `created_at`.
- `backend/app/db/interview_reports_repo.py` (new): save and read by session id, always scoped to the user.
- `backend/app/services/interview_report_service.py` (new): build prompt per interview type, parse and validate, compute weighted overall score, save only when valid.
- `backend/app/services/interview_session_service.py`: call the report service when a session closes with `COMPLETED` (`_close` path, `_advance`). Evaluation must not block or undo the session close if it fails.
- `backend/app/api/interview_reports.py` (new): `GET /api/interview-sessions/{session_id}/report` for the signed-in user only.
- `backend/app/main.py`: register the new router.
- `backend/tests/test_interview_reports.py` (new).

web (other, APP-040):
- `frontend/src/api/interviewReport.ts` (new): fetch the report.
- `frontend/src/pages/` result view (new page or part of `InterviewRoom.tsx`): show overall score, category scores, strengths, improvement suggestions and the practice-estimate disclaimer.
- `frontend/src/App.tsx`: route for the result view.
- `frontend/src/styles.css`: result styling.

## Validation rules (acceptance criterion 5)

- Reject the AI output (do not save a valid report) if it is not JSON, is not an object, lacks the category scores required for the session's interview type, or has a score outside 0 to 100.
- The overall score is always recomputed from the category scores with the type's weights; any overall score returned by Gemini is ignored.
- A failed or invalid evaluation stores no valid report. The user sees that the report is unavailable and can retry the report request.

## Risks

- Gemini latency at session close: keep the call within the configured timeout (`GEMINI_TIMEOUT_SECONDS`) and do not hold the close response on it.
- Gemini output drift: validation must be strict so malformed output never reaches the table.
- Session ownership: the report endpoint must check `user_id` against the session.

## Assumptions

- The evaluation uses submitted answers in `interview_answers` (`answer_text`) plus the session `plan` and interview type.
- Question-wise feedback is optional and only when enough answers exist (per the requirement); the first version may omit it.
- Reports are not regenerated automatically after being saved.
