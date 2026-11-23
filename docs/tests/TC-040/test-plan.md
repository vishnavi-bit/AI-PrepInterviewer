# TC-040 test plan: F-008 AI interview evaluation report

Requirement: REQ-435 (F-008 AI performance evaluation)
Work item: WI-058 (Generate and save AI interview evaluation report)

## Scope

Verifies that a completed interview produces a saved, valid evaluation report with type-specific scoring, that invalid AI output is never saved, that the report is tied to the correct user and session, and that the practice-estimate disclaimer is shown.

## Scenarios

### 1. Completed interview is evaluated automatically (AC1, AC2)
- Steps: complete an interview session (status `COMPLETED`) with submitted answers.
- Expected: the backend requests an evaluation from Gemini once; a report row is saved for that session.
- Expected: no report is generated for a session that is abandoned or not completed.

### 2. Report structure is complete (AC2, AC3)
- Steps: open the saved report for a completed session.
- Expected: contains an integer overall score from 0 to 100, one score per category for the interview type (0 to 100 each), strengths, improvement areas and suggestions.
- Expected: the result view shows overall score, category scores, strengths, suggestions and the disclaimer.

### 3. Technical interview uses technical criteria and weights (AC4)
- Steps: evaluate a Technical session where Gemini returns valid category scores Technical Knowledge 80, Problem-solving 60, Answer Accuracy 80, Answer Clarity 100.
- Expected: category names are exactly Technical Knowledge, Problem-solving, Answer Accuracy, Answer Clarity.
- Expected: overall score is 79 (0.30×80 + 0.25×60 + 0.25×80 + 0.20×100).

### 4. HR interview uses HR criteria and weights (AC4)
- Steps: evaluate an HR session where Gemini returns Communication 80, Confidence 70, Professionalism 60, Answer Relevance 90.
- Expected: category names are exactly Communication, Confidence, Professionalism, Answer Relevance; no Technical Knowledge or Problem-solving score appears.
- Expected: overall score is 77 (0.30×80 + 0.20×70 + 0.20×60 + 0.30×90).

### 5. Behavioral and Project-based interviews use their own criteria (AC4)
- Steps: evaluate one Behavioral session (Communication, Situation Analysis, Decision-making, Answer Relevance) and one Project-based session (Project Knowledge, Technical Understanding, Problem-solving, Answer Clarity).
- Expected: each report uses only its own type's categories and weights from WI-058 (Behavioral 20/25/25/30; Project-based 30/25/25/20).
- Expected: Technical weights are never applied to any other type.

### 6. Overall score is recomputed in code (AC3)
- Steps: Gemini returns a valid response whose top-level overall score is 95 while the category scores give 79 under Technical weights.
- Expected: saved overall score is 79; the 95 from Gemini is ignored.

### 7. Invalid AI output is not saved (AC5)
Run each case separately; for each:
- 7a. Gemini returns text that is not JSON. Expected: no report saved.
- 7b. Gemini returns JSON that is not an object (e.g. a list). Expected: no report saved.
- 7c. A required category score for the session's type is missing. Expected: no report saved.
- 7d. A score is outside 0 to 100 (e.g. 101 or -1). Expected: no report saved.
- Expected in all cases: the interview session still shows `COMPLETED`; the report request reports the report as unavailable; a retry request is possible.

### 8. Evaluation failure does not block session close
- Steps: make the Gemini call time out (`GEMINI_TIMEOUT_SECONDS`) or fail; complete a session.
- Expected: the session close succeeds and returns promptly; no valid report is stored; the user sees the report as unavailable.

### 9. Report is linked to the correct user and session (AC6)
- Steps: as the session owner, request `GET /api/interview-sessions/{session_id}/report`.
- Expected: returns the report for that session only; the stored row has the owner's `user_id` and the session's `session_id`.
- Steps: as a different signed-in user, request the same URL.
- Expected: access is denied and no report content is returned.
- Steps: request the report for a session id that does not exist.
- Expected: no report content is returned.

### 10. Saved report is not regenerated automatically
- Steps: after a valid report is saved, re-open the session and request the report again.
- Expected: the same stored report is returned; no second report row is created for the session (one report per session).

### 11. Disclaimer is shown with every report
- Steps: open the result view for a valid report.
- Expected: the text states that scores are AI-generated practice estimates, not hiring guarantees.

## Out of scope for this plan
- Question-wise or topic-wise feedback (optional in WI-058 first version).
- Scoring rubric beyond the weights recorded in WI-058.
