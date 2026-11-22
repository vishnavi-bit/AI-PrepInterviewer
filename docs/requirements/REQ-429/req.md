# F-002 Resume upload and management

Feature: F-002: Resume Upload & Management (FEAT-1392). Decision: DEC-464. Requirement: REQ-429.

## Purpose
An authenticated candidate uploads and manages one resume in PDF or DOCX format. The resume is the basis for analysis, recommendations and questions.

## Behaviour
- Upload a PDF or DOCX resume.
- Validate file type and the configured file-size limit; show a useful error for an invalid or unreadable file.
- Extract readable text from a supported resume.
- View uploaded resume information.
- Replace an existing resume.
- Request deletion of a resume and its extracted information, subject to the retention rules.
- Store the original file outside the database; keep metadata and extracted text in Turso.

## Acceptance criteria
1. An authenticated user can upload a valid PDF or DOCX file.
2. Unsupported or invalid files are rejected with a useful message.
3. Readable text is extracted from a supported resume.
4. A user can replace an existing resume.
5. A user cannot view or replace another user's resume.

## Order and dependencies
Order: 2 of 10
Depends on: F-001 Account, login and profile (sign-in is needed to own a resume)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-002), Section 5.2, Section 3 (resume storage rule), Section 8 (database rules).

## Open questions
- What is the configured file-size limit?
- What is the retention period for resumes after deletion? The source says "application's retention rules" without values.
- Which file storage is used in production (the source allows a controlled local location in development)?
- Is only one resume kept per candidate at a time, or are older versions kept?
