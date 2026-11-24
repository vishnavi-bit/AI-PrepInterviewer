# Data retention and deletion

Applies to: AI PrepInterviewer backend and web app. Source: REQ-437 (F-010) and WI-060.

## What we keep, and for how long

| Data | Kept for | Measured from | Deleted with it |
|---|---|---|---|
| Resume (file and extracted text) | 1 year | the candidate's last activity | the AI analysis and role suggestions made from it |
| Interview transcripts (questions and answers) | 1 year | the interview date | the interview's report |
| Interview reports (scores and feedback) | 1 year | the interview date | nothing else |

"Last activity" means a successful sign-in, or a change the candidate makes to their data: uploading or deleting a resume, changing their profile or password, starting an interview, or answering a question. Viewing pages does not count.

"Interview date" means the date the interview started.

Periods are one calendar year. A 29 February interview is measured back to 28 February.

## Automatic deletion

A retention job runs the rules and deletes what is past its period:

- `python -m app.jobs.retention` (from the backend folder), run on a schedule by the hosting platform.
- It deletes only what is past its period. Running it twice in a row deletes nothing the second time.
- Each run logs the number of resumes and interviews it deleted, and never their content.

## Deletion requested by the candidate

- A candidate can delete their resume, or any finished interview, at any time.
- Deletion is immediate. It is not held back for a waiting period.
- Deleting a resume removes its file, its AI analysis and its role suggestions.
- Deleting an interview removes its questions, answers and report.
- An interview still in progress cannot be deleted. The candidate must end it first.

## Verification

A deletion request needs the candidate's current password, re-entered in the same request. Being signed in is not enough.

A wrong password deletes nothing and is logged without the password.

## Logging

The backend writes structured JSON logs. Each entry has a timestamp, a level, an event name and, where there is one, a request ID.

Logs never contain:

- passwords, session tokens or cookies;
- API keys or other credentials (values that look like keys are masked);
- resume text, interview answers or questions;
- email addresses at sign-in.

Errors returned to the candidate are generic and carry only a request ID. Stack traces are not returned to the browser.

The retention period for logs themselves is not yet set. See the open items below.

## Credentials

Gemini and database credentials are read from environment variables on the backend only. They never appear in frontend code or in the built frontend.

## Deployment

- The application does not depend on a particular hosting platform.
- Production requires HTTPS. Set `APP_ENV=production` and `COOKIE_SECURE=true`. The application refuses to start in production if secure cookies are off.
- HTTPS termination, and any redirect from HTTP to HTTPS, belong to the hosting platform or the reverse proxy in front of the application.
- The hosting target is not chosen yet.

## Open items

- How long logs are kept, and where they are stored.
- Whether a candidate can delete their whole account. Not covered by these rules yet.
- The hosting target.
