# WI-050: F-001 Account, login and profile

Applications: api (primary), web

Requirement: REQ-428 (F-001: User Authentication & Profile, FEAT-1391, decision DEC-463)

## Approach

Build the account foundation in the FastAPI backend first, then the React screens that call it. Every later feature depends on a signed-in candidate, so this item is the base for the rest.

Decisions from the Q&A:
- Registration collects Name and Email, plus a Password (required for login).
- Login uses Email as the unique identifier.
- Profile fields the candidate can update: Name, Password, Avatar, Target role. Email is not editable.
- Passwords are hashed with argon2id.

Backend (api, primary):
- User table in Turso (libSQL): id, name, email (unique), password_hash, avatar reference, target_role, created_at, updated_at. Never store the plain password.
- Registration endpoint: validate input, check email is unique, hash the password, create the user.
- Login endpoint: look up by email, verify the argon2id hash, issue a session token. A wrong email or password returns one generic, safe error message.
- Logout endpoint: invalidate the session.
- Profile endpoints: read the current user's profile, update the editable fields, and change the password (re-verify the old one).
- Access control: every personal-data route requires an authenticated session and only reads or writes rows owned by that user. Database queries filter by the authenticated user id.
- Secrets (hash parameters, token signing key, database credentials) come from environment configuration, not from code.

Web (other application):
- Registration page: name, email, password; shows field errors.
- Login page: email, password; shows the safe error on failure.
- Profile and Settings page: view and edit name, target role and avatar; change password; log out. Pages for personal data redirect to login when unauthenticated.

## Areas and files likely affected

The repository has no application code yet (only docs), so these paths are proposed new files, not existing ones.

api:
- backend/app/main.py: register the auth and profile routers.
- backend/app/auth/security.py: argon2id hashing and verification, session token creation and checking.
- backend/app/auth/routes.py: register, login, logout.
- backend/app/profile/routes.py: read and update profile, change password.
- backend/app/db/users.py: user queries scoped by owner.
- backend/app/db/migrations/001_users.sql: users table and sessions table (created, not run).
- backend/tests/test_auth.py, backend/tests/test_profile.py: acceptance tests for REQ-428 (register, login/logout, safe error, hashed password, cross-user access denied).

web:
- frontend/src/pages/Register.tsx, frontend/src/pages/Login.tsx, frontend/src/pages/Profile.tsx.
- frontend/src/api/auth.ts: calls to the backend auth and profile endpoints.
- frontend/src/components/RequireAuth.tsx: route guard for personal-data pages.

## Risks

- Cross-user data leak if a query forgets the owner filter. Mitigation: owner-scoped query helpers and tests that try to read another user's profile.
- Account enumeration through registration or login messages. Mitigation: generic login error; registration duplicate check returns a safe message.
- Avatar upload handling (file type, size, storage location) adds the most new surface area. Keep it limited to a small image type list and a size limit.
- Turso (libSQL) access from FastAPI needs a verified client library; confirm the driver works with the chosen Python version.

## Assumptions (to confirm in review)

- Password is required at registration even though the Q&A list named only Name and Email. Login needs a password, so it is treated as always required.
- Session method: a server-issued session token stored in an HTTP-only cookie, revoked on logout. The Q&A did not choose this.
- Avatar is stored as an image file in a local uploads folder, with only its reference in the users table. The Q&A did not choose the storage location.
- No database migration is run by this item; the migration file is written for review.
- Only the Candidate role exists (per the project context), so there is no admin or other-role access path.
