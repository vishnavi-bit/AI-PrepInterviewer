Applications: api (primary), web (other)

# WI-054 Implementation plan: F-004 Job role recommendation

Requirement: REQ-431. Decision: DEC-466. Feature: FEAT-1394.

## Answered questions
- Recommendations shown at once: 5.
- Role list: open. Roles are generated from the candidate's confirmed resume information, not taken from a fixed catalogue. The examples in REQ-431 (Python Developer, Full Stack Developer, Frontend Developer, Backend Developer, AI Engineer) are illustrative only.

## Approach
api (primary):
1. After resume analysis, generate up to 5 technology job roles from the candidate's confirmed skills and experience. Each role has a role name and a short reason (acceptance 2 and 3).
2. Store the generated list per resume, so the same candidate sees the same 5 roles when they return to the page.
3. Expose two endpoints: read the recommendations for a resume, and save the candidate's selected role (acceptance 4 and 5). The selection is not forced to the first role.
4. Save the selected role with the interview configuration (acceptance 5).

web (other):
5. Add a Job Role Recommendation page that follows the mock in docs/requirements/REQ-431/mock.md: five options, each with its role name and "Why" text, one selectable at a time, and a "Choose this role" button.
6. Show the page after resume analysis completes (acceptance 1), and call the api to read the list and save the selection.

## Areas and files likely affected
api (APP-041):
- backend/app/services/role_recommendation_service.py (new): builds the recommendation prompt from confirmed resume data and validates the result (5 roles, each with a name and reason).
- backend/app/api/role_recommendations.py (new): read and select endpoints.
- backend/app/db/role_recommendations_repo.py (new): stores the generated list and the selected role.
- backend/app/db/migrations/003_role_recommendations.sql (new): next migration after 002_resumes.sql.
- backend/app/main.py: register the new router.
- backend/app/services/resume_service.py: read the confirmed skills and experience used as input (existing; not changed unless the output shape is missing a field).
- backend/tests/test_role_recommendations.py (new).

web (APP-040):
- frontend/src/pages/RoleRecommendation.tsx (new): page from the mock.
- frontend/src/api/roleRecommendation.ts (new): calls to the read and select endpoints.
- frontend/src/App.tsx: add the route and link it from the post-analysis flow.
- frontend/src/styles.css: styles for the option list.

## Risks
- Interview configuration: the repo has no interview-configuration record yet. Acceptance 5 needs one to save the selected role into. Assumption: a minimal interview-configuration record holding the selected role is created here, and the full configuration is out of scope. The preview should confirm this.
- Dependency on F-003: recommendations need confirmed skills and experience. If the resume analysis output is incomplete, the api must return a clear "not enough information" response rather than inventing roles.
- Generated output may be malformed or contain fewer than 5 roles. The service validates the output and retries once; if it still fails, the api returns an error and the page shows it.
- Recommendations are generated from resume text, which is personal data. They are stored only with the resume they came from, and follow the resume purge job (backend/app/jobs/purge_resumes.py).

## Assumptions
- Roles are generated on demand the first time the page is requested for a resume, then stored.
- The list is always 5 roles.
- The candidate must select a role before continuing; there is no default selection.
- Existing authentication (backend/app/auth/deps.py) guards both endpoints.
