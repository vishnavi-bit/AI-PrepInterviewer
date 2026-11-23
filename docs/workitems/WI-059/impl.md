# WI-059: Dashboard and interview history

Applications: web (primary), api

Requirement: REQ-436 (F-009 Dashboard and interview history). Decision: DEC-471. Feature: FEAT-1399.

## Approach

Add a candidate dashboard that shows only the logged-in user's completed interviews, their scores and progress, and lets the user reopen a saved report. The API computes the dashboard figures from saved interview results and enforces per-user access. The web app renders the dashboard and the history list, and handles the no-history state.

Answered questions that shape the plan:

- **Weak topic:** a topic is weak when its average score across completed interviews is below 60%. The "Strengths / weak topics" list shows these topics.
- **Progress trend:** the difference between the scores of the two most recent completed interviews. Show improvement, decline, or no change. Needs at least two completed interviews.
- **Average score:** shown only when the user has 2 or more completed interviews. Below that, show the most recent score only.

## Scope

API (api, other application):

- Read-only endpoints under the logged-in user's identity:
  - dashboard summary: completed interview count, most recent score, average score (only when count >= 2), progress trend, weak topics, role-wise performance;
  - list of the user's completed interview sessions (role, date, score);
  - saved report for one of the user's completed sessions.
- Every query filters by the authenticated user id. A request for another user's session or report returns not found, not the data (acceptance 6).
- Scores and reports come from the saved interview results only (acceptance 4).

Web (web, primary):

- Dashboard page with: completed interviews, most recent score, average score (when shown), recent interviews list with an Open action, role-wise performance, strengths/weak topics, suggested practice, progress trend.
- Open action navigates to the saved report view for that session.
- No-history state: a welcome message in place of the figures (acceptance 5).
- Route is protected by the existing login guard (`RequireAuth`).

## Likely affected files (confirm during implementation)

api:

- `backend/app/api/interview_sessions.py` (new dashboard routes, or a new `dashboard.py` next to it)
- `backend/app/services/interview_session_service.py` (summary and trend calculation)
- `backend/app/db/interview_sessions_repo.py` (queries filtered by user, completed sessions only)
- `backend/app/db/migrations/` only if an index on user and status is needed

web:

- `frontend/src/pages/` (new `Dashboard.tsx`; reuse the report view if one exists, otherwise add a minimal one)
- `frontend/src/api/interviewSession.ts` (client calls for the new endpoints)
- `frontend/src/App.tsx` (route and navigation link)
- `frontend/src/styles.css` (dashboard layout, responsive at phone width)

## Risks

- Cross-user data leak if any query misses the user filter. Mitigation: tests that log in as user B and request user A's sessions and reports, expecting not found.
- Score averages mixing incomplete sessions. Mitigation: all figures use completed sessions only.
- Report view may not exist yet for saved sessions. If it does not, opening a report is blocked until it does.

## Assumptions

- "Completed" means the interview session has a saved result. Sessions that were started but not finished are excluded.
- Scores are on the 0 to 100 scale shown in the mock.
- The 60% weak-topic threshold and the 2-interview minimum are fixed values for now, not settings.

## Out of scope

- Charts beyond the role-wise list (the mock allows "chart/list"; a list is enough for this item).
- Changes to how scores are produced (F-008).
