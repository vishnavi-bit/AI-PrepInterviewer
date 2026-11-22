# F-009 Dashboard and interview history

Feature: F-009: Dashboard & Interview History (FEAT-1399). Decision: DEC-471. Requirement: REQ-436.

## Purpose
The candidate sees their own completed interviews, scores and progress on a dashboard, and can reopen saved reports to compare performance over time.

## Behaviour
- Show total completed interviews, the most recent score, and the average score when enough completed sessions exist.
- List previous interview sessions and open their saved reports.
- Show role-wise or topic-wise performance where data exists.
- Show progress trends and suggest areas for further practice based on earlier results.
- Show only the logged-in user's data; show a helpful state when there is no history yet.

## Acceptance criteria
1. The dashboard displays data belonging to the logged-in user.
2. The user can see previous completed interviews.
3. The user can open a previous report.
4. Score comparisons use saved interview results.
5. The dashboard handles users with no interview history.
6. One user cannot view another user's dashboard data.

## Order and dependencies
Order: 9 of 10
Depends on: F-008 AI Performance Evaluation (dashboard shows saved reports and scores)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-009), Section 5.9, Section 4 (step 22), Section 9 (Dashboard and Interview History pages).

## Open questions
- What counts as a "weak topic" and how is "progress trend" calculated?
- How many sessions are needed before the average score is shown?
