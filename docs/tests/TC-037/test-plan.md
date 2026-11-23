# TC-037 Test plan: F-004 Job role recommendation

Requirement: REQ-431. Work item: WI-054. Feature: FEAT-1394 (F-004). Decision: DEC-466.

Written for: QA and developers verifying WI-054 against REQ-431.

## Scope
Acceptance criteria 1-5 from REQ-431, as planned in WI-054 (api: APP-041 primary, web: APP-040).

Out of scope: the full interview configuration (only the selected role is saved, per WI-054 assumption), role list content beyond the rules below, and the resume purge job except where noted in S8.

## Preconditions
- A test candidate account, signed in.
- A resume uploaded and analysed (F-003) with confirmed skills and experience.
- A second candidate account whose resume has no confirmed skills or experience (for S6).
- Access to the stored interview configuration for the test candidate (API or database), to check the saved role.

## Scenarios

### S1 - Recommendations are shown after resume analysis (AC 1)
Steps:
1. Complete resume analysis for the test resume.
2. Observe the next screen in the flow.

Expected:
- The Job Role Recommendation page is shown without the candidate navigating to it manually.
- The page lists exactly 5 roles.

### S2 - Each recommendation has a role name and an explanation (AC 2)
Steps:
1. Open the Job Role Recommendation page for the test resume.
2. Read each of the 5 options.

Expected:
- Every option shows a non-empty role name and a non-empty "Why" explanation.
- Options are displayed as in docs/requirements/REQ-431/mock.md (one selectable at a time, "Choose this role" button).

### S3 - Recommendations reflect the candidate's skills and experience (AC 3)
Steps:
1. Use a resume whose confirmed skills are clearly Python and backend work.
2. Open the page and read the role names and explanations.
3. Repeat with a resume clearly focused on frontend work (React, CSS).

Expected:
- The first resume's roles are backend or Python-related; the explanations cite skills or experience from that resume.
- The second resume's roles are frontend-related; explanations cite its skills.
- Neither list is identical to a fixed catalogue; roles are not simply copied from the example list in REQ-431 regardless of resume.

### S4 - Candidate selects one role (AC 4)
Steps:
1. On the page, select one option.
2. Click "Choose this role".
3. Reload the page.

Expected:
- Only one option can be selected at a time.
- No role is selected by default before the candidate chooses; "Choose this role" is not active before a choice is made.
- After reload, the chosen role is still shown as selected, and the same 5 roles are shown (the list is stored per resume, WI-054 step 2).

### S5 - Selected role is saved with the interview configuration (AC 5)
Steps:
1. Complete S4 choosing role B (not the first option).
2. Read the interview configuration record for the test candidate.

Expected:
- The record holds role B as the selected role.
- Choosing a different role later replaces the saved value.

### S6 - No recommendations without enough resume information
Steps:
1. Request recommendations for the second candidate's resume (no confirmed skills or experience).

Expected:
- The API returns a clear "not enough information" response.
- The page shows that message; no roles are invented.

### S7 - Malformed generated output
Steps:
1. Force the generation step to return fewer than 5 roles, or a role missing its name or reason (test double or fixture).

Expected:
- The service retries once.
- If the retry also fails, the API returns an error and the page shows it. No partial list is shown as complete.

### S8 - Access and data handling
Steps:
1. Call the read and select endpoints without a session.
2. Call them with a session for a different candidate.
3. Delete or purge the test resume (purge job, backend/app/jobs/purge_resumes.py) and check the recommendation data.

Expected:
- Unauthenticated calls are rejected.
- A candidate cannot read or select roles for another candidate's resume.
- After the resume is purged, its stored recommendations are removed too.

## Pass criteria
All scenarios S1-S8 pass. S1-S5 cover REQ-431 acceptance criteria 1-5 directly; S6-S8 cover the risks listed in WI-054.

## Open points carried from REQ-431
- Number of recommendations: answered in WI-054 as 5.
- Role list open or fixed: answered in WI-054 as open (generated from the resume).
