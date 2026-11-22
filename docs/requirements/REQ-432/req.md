# F-005 Interview configuration

Feature: F-005: Interview Configuration (FEAT-1395). Decision: DEC-467. Requirement: REQ-432.

## Purpose
Before a mock interview starts, the candidate chooses the interview type, difficulty and duration, and reviews them with the chosen role.

## Behaviour
- The candidate selects the job role (from F-004).
- Interview type: Technical, HR, Behavioral or Project-based.
- Difficulty: Easy, Medium or Hard.
- Duration: from the configured options.
- The selected configuration is shown for review before the interview starts.
- The configuration is passed to the interview session.

## Acceptance criteria
1. The user can select an interview type.
2. The user can select a difficulty level.
3. The user can select an available duration.
4. The application displays the selected configuration.
5. The selected settings are passed to the interview session.

## Order and dependencies
Order: 5 of 10
Depends on: F-004 Job Role Recommendation (the role is part of the configuration)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-005), Section 5.5, Section 4 (step 9), Section 9 (Interview Configuration page).

## Open questions
- Which duration options are configured (values in minutes)? The source says "configured options" only.
