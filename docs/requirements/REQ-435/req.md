# F-008 AI performance evaluation

Feature: F-008: AI Performance Evaluation (FEAT-1398). Decision: DEC-470. Requirement: REQ-435.

## Purpose
After the interview, Gemini evaluates the candidate's answers and the system saves a structured report with scores, strengths, weaknesses and practice suggestions. The report states that scores are AI-generated practice estimates, not guarantees of hiring outcomes.

## Behaviour
- Evaluate the submitted answers with Gemini, using criteria that match the interview type.
- Produce an overall score out of 100 and relevant category scores (for example technical knowledge, communication, answer clarity and relevance, problem-solving).
- List strengths, areas for improvement and suggestions for future practice.
- Give question-wise or topic-wise feedback when enough data exists.
- Validate the AI output; invalid output is not saved as a valid report.
- Save the report linked to the correct user and interview session.
- Show the practice-estimate disclaimer with the report.

## Acceptance criteria
1. A completed interview can be evaluated.
2. The system generates a structured report.
3. The report includes an overall score and useful feedback.
4. Evaluation criteria match the selected interview type.
5. Invalid AI output is not saved as a valid report.
6. The report is associated with the correct user and interview session.

## Order and dependencies
Order: 8 of 10
Depends on: F-006 AI Interview Management (needs the saved answers); F-007 Virtual Avatar & Voice Interaction (voice transcripts, where used)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-008), Section 5.8, Section 4 (steps 19 to 21), Section 8 (answer_evaluations, interview_reports).

## Open questions
- Which category scores are used for each interview type? The source gives examples only.
- What is the scoring rubric behind the overall score out of 100?
- Is the report generated automatically or only when the candidate asks?
