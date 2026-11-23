# TC-038 test plan: F-006 AI interview management (session flow)

Requirement: REQ-433 (F-006 AI interview management). Work item: WI-056 (session flow). Decisions: WI-056 Q&A (as recorded in docs/workitems/WI-056/impl.md).

## Preconditions
- A signed-in candidate with an active resume and a selected role.
- An interview configuration saved (F-005): role, interview type, difficulty and duration.
- Gemini is reachable for the normal cases. Failure cases use a stubbed or failing Gemini client.
- Clock control is available on the server so deadlines can be reached without waiting.

## Scenarios

### S1. Session is created from the selected configuration (AC1)
Steps:
1. Start an interview with a saved configuration.
2. Read the stored session.
Expected:
- A session exists with the user, role, interview type, difficulty and duration taken from the configuration.
- `started_at` is set and `deadline_at` equals `started_at` plus the configured duration.
- Status is in progress.

### S2. Session creation refuses when an input is missing (AC1)
Steps:
1. Start an interview with no selected role, then with no active resume, then with no configuration (409 from F-005).
Expected:
- Each attempt is refused with a clear message naming the missing item.
- No session row is created.

### S3. Question plan has 10 relevant main questions (AC2)
Steps:
1. Start an interview for a given role, interview type and resume.
2. Read the question plan stored in the session.
Expected:
- Exactly 10 main questions are stored, generated once when the interview starts.
- The questions match the selected role and interview type (checked by review against the role and type).
- The plan is not regenerated when the candidate moves to the next question.
- If plan generation fails, the request returns an error and no session is created.

### S4. Candidate can submit one answer per question (AC3)
Steps:
1. Submit an answer for main question 1.
2. Submit a second answer for main question 1.
3. Submit an answer for main question 2 after question 1 is done.
Expected:
- The first answer is saved with state `answered`.
- The second answer for the same question is rejected and the first is kept.
- The answer for question 2 is accepted.
- In the room, the Submit button sends the answer for the current question.

### S5. Relevant follow-up is generated when appropriate (AC4)
Steps:
1. Submit an answer that Gemini judges to need a follow-up.
2. Submit the answer to the follow-up.
3. Repeat until the main question has 2 follow-ups.
Expected:
- A follow-up question is stored as a child of the main question.
- No more than 2 follow-ups are stored for one main question (up to 20 in total across the plan).
- When Gemini judges no follow-up is needed, none is stored and the interview moves on.
- If the follow-up decision call fails, the follow-up is skipped and the interview moves on.

### S6. Follow-ups use the remaining overall time only (WI-056 decision 6)
Steps:
1. Let a follow-up run while the overall deadline has time left.
2. Check the per-question timer on the room page.
Expected:
- A follow-up has no separate countdown on the page.
- The overall deadline is unchanged after the follow-up.

### S7. Interview moves to the next question (AC5)
Steps:
1. Answer main question 3 and let no follow-up be asked.
Expected:
- The room shows "Question 4 of 10".
- The question text and per-question countdown reset for question 4.

### S8. Per-question timer: warning and expiry (WI-056 decisions 4 and 5)
Steps:
1. Start a main question with a configured duration of D. Check that the question countdown is D / 10.
2. Let the countdown reach 1 minute remaining.
3. Let the countdown expire with an answer partly typed on the server, then with an empty answer.
Expected:
- The candidate sees a warning when 1 minute remains.
- On expiry with an answer received, the partial answer is saved with state `timed out`.
- On expiry with no answer, the question is saved as `unanswered`.
- The interview moves to the next main question in both cases.
- An answer arriving after the question deadline is saved only up to what arrived before the deadline and marked `timed out`.

### S9. Overall time expiry ends the interview immediately (AC6, WI-056 decision 7)
Steps:
1. Let the overall deadline pass while a follow-up is in progress with a partial answer.
2. Make any request to the session after the deadline.
Expected:
- The session is closed on that request, even though the answer was incomplete.
- The partial answer is saved.
- The session status is `interrupted` (mapping listed as an assumption in impl.md).
- No further questions are accepted.

### S10. Plan completion ends the interview (AC6)
Steps:
1. Answer all 10 main questions (with any follow-ups) before the overall deadline.
Expected:
- The session ends with status `completed`.
- The room shows the interview as finished. No scores or feedback are shown.

### S11. Candidate ends the interview early (AC6)
Steps:
1. Click End interview during question 5.
2. Call the end endpoint for the same session again.
Expected:
- The session ends with status `ended early` and `ended_at` is set.
- The second call does not change the stored status or time.
- Answers already submitted are kept.

### S12. Session status and answers are saved (AC7)
Steps:
1. Complete one session of each kind: completed (S10), interrupted (S9), ended early (S11).
2. Read `interview_sessions` and `interview_answers` for each.
Expected:
- Each session row has user, status, role, interview type, difficulty, duration, `started_at`, `deadline_at`, `ended_at` and the plan.
- Each answer row has session, position, main or follow-up, parent position, question text, answer text and state (`answered`, `unanswered` or `timed out`).
- Follow-up rows reference their parent main question.

### S13. Scores and feedback are not shown during the interview
Steps:
1. Check the Interview Room page at start, during questions and after the interview ends.
Expected:
- No score or detailed feedback is shown on the page or returned by the interview endpoints.

### S14. Room layout matches the mock (docs/requirements/REQ-433/mock.md)
Steps:
1. Open the Interview Room page during an interview.
Expected:
- The page shows the overall time left, "Question n of 10", the question text, an answer box, Submit answer and End interview buttons, and the status "in progress".

## Out of scope
- Voice answers (F-007), scoring and feedback, and the session history view.
