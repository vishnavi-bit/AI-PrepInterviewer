# F-004 Job role recommendation

Feature: F-004: Job Role Recommendation (FEAT-1394). Decision: DEC-466. Requirement: REQ-431.

## Purpose
After resume analysis, the system recommends suitable technology job roles, explains each one, and lets the candidate choose the role to practise. The candidate is not forced to take the first recommendation.

## Behaviour
- Recommendations are generated from confirmed resume information.
- Each recommendation has a role title and a short explanation.
- The candidate selects one role.
- The selected role is saved with the interview configuration.
- Multiple technology-related roles are supported (examples: Python Developer, Full Stack Developer, Frontend Developer, Backend Developer, AI Engineer; the list is not fixed).

## Acceptance criteria
1. Role recommendations are shown after resume analysis.
2. Each recommendation includes a role name and an explanation.
3. Recommendations are based on the candidate's skills and experience.
4. The candidate can select one role.
5. The selected role is saved with the interview configuration.

## Order and dependencies
Order: 4 of 10
Depends on: F-003 AI Resume Analysis (needs confirmed skills and experience)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-004), Section 5.4, Section 2.2 (example roles), Section 4 (steps 7 and 8).

## Open questions
- How many recommendations are shown at once?
- Is the full list of roles fixed or open? The source says the examples are not a fixed list.
