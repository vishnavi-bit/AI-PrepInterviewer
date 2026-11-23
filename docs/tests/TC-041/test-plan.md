# TC-041 test plan: F-009 Dashboard and interview history

Requirement: REQ-436 (F-009 Dashboard and interview history). Work item: WI-059 (web primary, api). Decision: DEC-471. Feature: FEAT-1399.
Sources: docs/requirements/REQ-436/req.md (acceptance 1 to 6), docs/workitems/WI-059/impl.md (answered questions: weak topic, progress trend, average threshold).

## Preconditions
- Candidate A has at least three completed interview sessions with saved results across two roles, and one started but unfinished session.
- Candidate B has at least one completed session with a saved result (different scores from A).
- Candidate C is a new account with no interview sessions.
- Candidate D has exactly one completed session (for the threshold cases).
- Each user can sign in with their own account; API and web are running against the same data.

## Scenarios

### 1. Dashboard shows only the logged-in user's data (acceptance 1)
Steps:
1. Sign in as A. Open the Dashboard.
2. Compare the completed interview count, most recent score and recent list with A's saved sessions.

Expected:
- Completed interviews = number of A's completed sessions (the unfinished session is not counted).
- Most recent score = score of A's newest completed session.
- No figures or interviews belonging to B appear.

### 2. Previous completed interviews are listed (acceptance 2)
Steps:
1. As A, open the Dashboard and read "Recent interviews".

Expected:
- Each completed session appears once with role, date and score, most recent first.
- The unfinished session does not appear.
- Each row has an Open action.

### 3. A previous report can be opened (acceptance 3)
Steps:
1. As A, click Open on an older completed interview.

Expected:
- The saved report view for that session opens, with the same score and content as saved.
- Navigating back returns to the Dashboard.

### 4. Score comparisons use saved results (acceptance 4)
Steps:
1. As A, compare the average score, most recent score and progress trend with the saved scores of A's completed sessions.
2. As D (one completed session), open the Dashboard.

Expected:
- Average score = mean of A's saved completed scores (shown because A has 2 or more).
- Progress trend = difference between the two most recent completed scores, shown as improvement, decline or no change.
- For D: average score is hidden, only the most recent score is shown, and no progress trend is shown.
- Boundary: with exactly 2 completed sessions the average is shown; with 1 it is not.

### 5. Weak topics and role-wise performance use saved results
Steps:
1. As A, where a topic's average score across completed sessions is below 60, and another topic's average is 60 or above, check "Strengths / weak topics".
2. Check "Role-wise performance" against A's sessions per role.

Expected:
- Only topics with an average below 60% are listed as weak.
- Role-wise performance lists each role with saved results.
- Where no data exists for a section, that section is shown empty or omitted without an error.

### 6. Users with no interview history (acceptance 5)
Steps:
1. Sign in as C and open the Dashboard.

Expected:
- A welcome message is shown in place of the figures and lists.
- No zero-value figures, empty-average placeholder or error message is shown.
- The dashboard loads without a console error.

### 7. One user cannot view another user's dashboard data (acceptance 6)
Steps:
1. Sign in as B. Call the dashboard summary, session list and report endpoints for A's data (use A's session id for the report).
2. In the web app, as B, attempt to open a report that belongs to A (use a copied link or URL).

Expected:
- The dashboard summary and session list returned to B contain only B's data.
- A's session report request returns not found, not A's report content.
- The web app shows a not-found state and no A data.
- Repeat the same checks while logged in as B for A's session list (must not return A's sessions).

### 8. Unauthenticated access is blocked
Steps:
1. Without signing in, open the dashboard route.
2. Call the dashboard API endpoints without a session token.

Expected:
- The web app redirects to login (RequireAuth).
- The API responds with an unauthorised status and no data.

### 9. Excluded sessions do not affect figures
Steps:
1. As A, compare every figure (count, scores, average, trend, weak topics) against only completed sessions.

Expected:
- Started but unfinished sessions are excluded from all figures and from the list.

### 10. Layout at phone width
Steps:
1. Open the dashboard at phone width (about 375px) with data (A) and with no history (C).

Expected:
- 16px side gutter on each side.
- No horizontal page scroll.
- Recent interviews list and Open actions remain usable.
