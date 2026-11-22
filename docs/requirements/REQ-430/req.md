# F-003 AI resume analysis

Feature: F-003: AI Resume Analysis (FEAT-1393). Decision: DEC-465. Requirement: REQ-430.

## Purpose
Gemini analyses the extracted resume text and identifies skills, education, projects, experience, internships, certifications and technologies. The candidate reviews and corrects the result before it is used.

## Behaviour
- The backend sends extracted resume text to Gemini.
- The analysis returns only information present in the resume.
- The backend validates the AI response before storing or showing it.
- The analysis is shown in a readable format.
- The candidate can review and correct extracted information.
- Invalid or incomplete AI responses are handled safely.

## Acceptance criteria
1. Extracted resume text is sent to Gemini through the backend.
2. The analysis identifies relevant information present in the resume.
3. The system does not invent missing qualifications or experience.
4. The analysis is shown in a readable format.
5. Invalid or incomplete AI responses are handled safely.

## Order and dependencies
Order: 3 of 10
Depends on: F-002 Resume upload and management (needs extracted resume text)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-003), Section 5.3, Section 4 (steps 5 and 6), Section 6 (performance: loading indicators).

## Open questions
- What JSON structure does the analysis use? The source names the categories but not a schema.
- Are corrections stored separately from the AI output, or does the candidate's version replace it?
- What is shown when the AI is unavailable? The source requires an understandable error but no wording.
