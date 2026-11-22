# F-010 Security and data management

Feature: F-010: Security & Data Management (FEAT-1400). Decision: DEC-472. Requirement: REQ-437.

## Purpose
Personal data is protected across the frontend, backend, Gemini integration, file storage and Turso. Each candidate's data is isolated, credentials stay on the backend, and uploaded and AI data are validated.

## Behaviour
- Private Gemini and Turso credentials stay on the backend (environment variables or a secrets manager).
- Backend endpoints check authentication and ownership before returning personal records.
- Database queries enforce user ownership of private records.
- Uploaded files are validated; resume text and candidate answers are treated as untrusted (instructions inside a resume must not override the application).
- Logs and error messages do not reveal passwords, tokens or secrets.
- Documented retention and deletion rules cover resumes, transcripts and reports.

## Acceptance criteria
1. No private Gemini or Turso credentials appear in frontend code.
2. Backend endpoints verify authentication where required.
3. Database queries enforce user ownership of private records.
4. Invalid files and unsafe inputs are handled safely.
5. Logs and error messages do not reveal passwords, tokens or secrets.
6. Documented rules exist for storing and deleting personal data.

## Order and dependencies
Order: 10 of 10
Depends on: none as a feature. Note: its rules apply from F-001 onward; the order follows Section 7, so the security checks must be built into F-001 to F-009 as they are built.

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-010), Section 5.10, Section 6 (security and privacy), Section 8 (database design rules).

## Open questions
- Retention periods for resumes, transcripts and reports? The source requires rules but gives no durations.
- Which logging tool or format is used?
- Is HTTPS and the hosting target decided? The source says "use HTTPS in deployment".
