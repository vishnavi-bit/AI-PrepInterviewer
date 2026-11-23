Applications: web (primary), api

# WI-055 Implementation: Interview configuration page and session settings

Requirement: REQ-432 (F-005 Interview configuration). Decision: DEC-467. Feature: FEAT-1395.

## Approach
- Web (primary): add an Interview Configuration page that shows the selected role (from F-004), a single-choice interview type (Technical, HR, Behavioral, Project-based), a single-choice difficulty (Easy, Medium, Hard), a duration selector limited to the configured options, and a review summary of all settings with a "Start interview" action.
- API: accept the selected configuration (role, interview type, difficulty, duration) and store or pass it to the interview session created on start, so the session uses exactly the reviewed settings.
- Duration options come from one configuration source (not hard-coded in the page), so the values can be set later without a code change.

## Areas and files likely affected
- frontend/src/pages/ (new Interview Configuration page)
- frontend/src/App.tsx (route to the new page)
- frontend/src/api/ (client call that sends the configuration when the interview starts)
- backend/app/api/ (endpoint that receives the configuration and passes it to the session)
- backend/app/config.py (duration options from configuration)
- backend/tests/ (tests for the configuration endpoint and option validation)

## Risks
- Duration values are not defined yet. REQ-432 leaves "which duration options are configured (minutes)" open; until they are set, the page can only show placeholders.
- The role comes from F-004 (Job Role Recommendation). If that feature is not finished, the role field has no real data.
- Interview session (REQ-433) must accept the configuration; the contract between the API and the session must be agreed before both sides are built.

## Assumptions
- The selected role is passed in from the role recommendation result; this work item does not re-implement role selection.
- Exactly one value per choice is required before "Start interview" is enabled.
- Invalid or unavailable durations are rejected by the API with a validation error.
