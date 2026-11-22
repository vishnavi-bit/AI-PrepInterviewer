# F-006 AI interview management

Feature: F-006: AI Interview Management (FEAT-1396). Decision: DEC-468. Requirement: REQ-433.

## Purpose
The candidate takes a timed mock interview: Gemini generates role- and resume-relevant questions, the candidate answers each one, and relevant follow-ups are asked when appropriate. Session status and answers are saved.

## Behaviour
- An interview session is created from the selected configuration.
- Questions are generated for the role, interview type and resume, and shown as text.
- The candidate submits an answer for each question (voice or typed, see F-007).
- A limited number of relevant follow-up questions can be asked.
- The interview moves to the next question.
- A timer tracks the configured duration.
- The interview ends when the question plan is complete, the time expires, or the candidate ends it early.
- Session status (completed, interrupted, ended early) and answers are saved.
- Scores and detailed feedback are not shown during the interview.

## Acceptance criteria
1. An interview session is created from the selected configuration.
2. Questions are relevant to the selected role and interview type.
3. The user can submit an answer for each question.
4. A relevant follow-up is generated when appropriate.
5. The interview moves to the next question.
6. The interview ends when the question plan is complete, the duration expires, or the user ends it.
7. Session status and submitted answers are saved.

## Order and dependencies
Order: 6 of 10
Depends on: F-005 Interview Configuration (session uses the configuration)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-006), Section 5.6, Section 4 (steps 10 and 16 to 18), Section 8 (interview tables).

## Open questions
- How many questions are in a question plan, and how many follow-ups are allowed?
- How is the timer shown and what happens when it runs out mid-answer?
- Is the question plan generated at the start or question by question?
