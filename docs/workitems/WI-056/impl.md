# WI-056 implementation plan: F-006 AI interview management (session flow)

Applications: api (primary), web (other)
Requirement: REQ-433 (F-006 AI interview management). Feature FEAT-1396, decision DEC-468.

## Decisions from the Q&A (WI-056)
1. Question plan: 10 main questions, generated once by Gemini when the interview starts.
2. Follow-ups: at most 2 per main question (20 at most in total).
3. Overall time: the configured interview duration (F-005) is the final time limit.
4. Per-question time: each main question gets configured duration / 10, shown as a countdown. The candidate gets a warning when 1 minute remains.
5. Question timer expiry: save the answer received so far, or mark it unanswered if empty, then move to the next main question.
6. Follow-ups use the remaining overall interview time. They do not get a separate countdown and do not extend the overall duration.
7. Overall timer expiry: end the interview immediately, even if the current answer or follow-up is incomplete. The partial answer is saved.

## Approach
### api (primary, APP-041)
- Session creation (`POST /api/interview-sessions`): read the selected role (`role_recommendations_repo.get_selected_role`), the configuration (`interview_settings_repo.get_for_user`, via `interview_configuration_service.get_configuration`) and the active resume text (`resumes_repo.get_text_for_user`). Refuse with a clear message when any is missing. Store the session with `started_at`, `deadline_at = started_at + duration`.
- Question plan: one Gemini call (`GeminiClient`, new method) that returns 10 main questions for the role, interview type, difficulty and resume text, validated like `resume_analysis_service.parse_and_validate`. Stored in the session.
- Answers and follow-ups (`POST /api/interview-sessions/{id}/answers`): accept one answer for the current question. Server-side checks: the session is in progress, the overall deadline has not passed, and the per-question deadline has not passed (a late answer keeps only what arrived before the deadline and is marked timed out).
- Follow-up decision: after an answer, ask Gemini whether a relevant follow-up is needed, only if the main question has fewer than 2 follow-ups and the overall time remains. Follow-up text is generated for that case.
- Advance: when the answer (or follow-up chain) is done, move to the next main question. Move on when the question timer expires.
- Ending: `POST /api/interview-sessions/{id}/end` for early end by the candidate; the overall deadline is also enforced on every request, so an expired session is closed on the next call.
- Persistence: migration `005_interview_sessions.sql` with `interview_sessions` (user, status, role, interview type, difficulty, duration, started_at, deadline_at, ended_at, plan) and `interview_answers` (session, position, main or follow-up, parent position, question text, answer text, state: answered, unanswered, timed out).
- Routes and wiring: new router in `backend/app/api/interview_sessions.py`, registered in `backend/app/main.py`.
- Tests: `backend/tests/test_interview_sessions.py` covering session creation, plan size 10, follow-up cap, per-question and overall deadlines, early end, and saved statuses.

### web (other, APP-040)
- API client `frontend/src/api/interviewSession.ts`.
- Interview Room page `frontend/src/pages/InterviewRoom.tsx` matching the layout in `docs/requirements/REQ-433/mock.md`: overall timer, "Question n of 10", question text, answer box, Submit and End buttons, status.
- Route in `frontend/src/App.tsx` and styles in `frontend/src/styles.css`.
- The countdown on the page is for display; the server enforces the deadlines.
- Scores and feedback are not shown during the interview.

## Verification against REQ-433
| Acceptance criterion | Covered by |
|---|---|
| 1. Session created from the selected configuration | Session creation reads role, type, difficulty, duration |
| 2. Questions relevant to role and interview type | Gemini plan prompt uses role, type and resume |
| 3. Answer submitted for each question | Answers endpoint; room Submit button |
| 4. Relevant follow-up when appropriate | Follow-up decision, capped at 2 per main question |
| 5. Moves to next question | Advance step after answer or question timer expiry |
| 6. Ends when plan complete, time expires, or user ends | Plan complete, overall deadline, end endpoint (decisions 5 to 7) |
| 7. Session status and answers saved | `interview_sessions` and `interview_answers` tables |

Checked against the answered Q&A: plan size 10 and the follow-up cap match Q1; the per-question countdown, 1-minute warning and saving unanswered answers match Q2; the plan generated once at the start matches Q3. The timing decisions above match the pasted decisions.

## Assumptions (review before implementation)
- Session status mapping: plan complete gives `completed`; overall timer expiry gives `interrupted`; the candidate ending early gives `ended early`. REQ-433 names the three statuses but does not map them.
- Follow-ups have no separate countdown. They run inside the remaining overall time.
- Gemini failures during plan generation return an error and create no session. Gemini failures during follow-up decisions skip the follow-up and move on.

## Risks
- Gemini latency at interview start (plan generation) and between questions; the per-question timer keeps running while the call is made, so the server deadline is the source of truth.
- Clock differences between browser and server: the server computes all deadlines.
- Duplicate or late submissions for the same question: the endpoint must accept one answer per question and reject later ones.
- A duration that is not set up (409 from F-005) must stop session creation with the same message.

## Out of scope
- Voice answers (F-007), scoring and feedback (later features), and the candidate's session history view.
