# F-001 Account, login and profile

Feature: F-001: User Authentication & Profile (FEAT-1391). Decision: DEC-463. Requirement: REQ-428.

## Purpose
Candidates can create an account, log in securely, log out, and manage basic profile information. Every resume, interview and report belongs to one account, so this comes first.

## Behaviour
- A new candidate registers with the required account details.
- A registered candidate logs in and logs out.
- Pages for personal data require authentication.
- Passwords are hashed and never stored as plain text.
- The candidate can view and update basic profile information.
- A candidate can access only their own data.

## Acceptance criteria
1. A new user can register successfully with valid details.
2. A registered user can log in and log out.
3. Invalid login details produce a safe, understandable error.
4. Passwords are not stored as plain text.
5. A user cannot access another user's private data.

## Order and dependencies
Order: 1 of 10
Depends on: none

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-001), Section 5.1, Section 6 (security and privacy), Section 9 (Registration, Login, Profile and Settings pages).

## Open questions
- Which account details are required at registration (for example name, email, password only)? The source does not list them.
- Which profile fields can be updated? The source says only "basic profile information".
- Which hashing algorithm is used? The source requires "secure password hashing" without naming one.
- Is login by email or by username?
