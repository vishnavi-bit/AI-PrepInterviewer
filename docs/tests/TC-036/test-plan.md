# TC-036 Test plan: F-005 Interview configuration

Requirement: REQ-432 (F-005 Interview configuration). Work item: WI-055. Decision: DEC-467. Feature: FEAT-1395.

## Scope
Covers acceptance criteria 1-5 of REQ-432 for the web Interview Configuration page and the API that passes the configuration to the interview session. Role selection (F-004) is out of scope except that the role shown on the page must be the one chosen in F-004.

## Preconditions
- A candidate is signed in and has a role chosen from the F-004 result (for example "Python Developer").
- The duration options come from the single configuration source (backend/app/config.py). The test reads the configured list and does not hard-code minute values.

## Scenarios

### S1 - Select an interview type (AC 1)
1. Open the Interview Configuration page.
2. Observe the interview type choices.
3. Select each of: Technical, HR, Behavioral, Project-based.
- Expected: exactly four choices are offered with these names; selecting one clears the previous selection (single choice).
- Expected: "Start interview" stays disabled until a type is chosen.

### S2 - Select a difficulty (AC 2)
1. Observe the difficulty choices.
2. Select each of: Easy, Medium, Hard.
- Expected: exactly three choices; single choice; the selection is shown on the page.

### S3 - Select an available duration (AC 3)
1. Open the duration selector.
2. Compare its options with the configured duration list.
- Expected: the options equal the configured list, no others.
3. Select one configured option.
- Expected: the option is shown as selected.
4. Submit a duration that is not in the configured list through the API (see S6).
- Expected: validation error; no session is created.

### S4 - Review the configuration before start (AC 4)
1. Choose a role, one interview type, one difficulty and one duration.
2. View the review summary before pressing "Start interview".
- Expected: the summary shows the role, interview type, difficulty and duration exactly as selected.
3. Change one choice.
- Expected: the summary updates to the new value.

### S5 - Start is blocked until every field is set
1. Leave one of role, type, difficulty or duration unset (repeat for each field).
- Expected: "Start interview" is disabled and no session starts.

### S6 - API accepts and validates the configuration (AC 5, validation)
1. Send a start request with role, type, difficulty and a configured duration.
- Expected: the request succeeds and the created interview session stores exactly these four values.
2. Send a start request with an unknown interview type, an unknown difficulty, or a duration not in the configured list.
- Expected: each request is rejected with a validation error; no session is created.

### S7 - Settings reach the interview session (AC 5, end to end)
1. Complete the configuration in the web page and press "Start interview".
2. Read the session created for this candidate.
- Expected: the session's role, interview type, difficulty and duration equal the reviewed values.
- Expected: no value is replaced by a default.

## Out of scope
- The interview conduct itself (REQ-433).
- Exact duration values: they are set in configuration; scenarios S3 and S6 use the configured list.

## Open items
- Duration values are not yet defined in REQ-432 (open question there). The scenarios hold for any configured list, but S3 and S7 cannot run with real values until they are set.
