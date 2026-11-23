# TC-032: F-001 Account, login and profile - test plan

Requirement: REQ-428 (F-001 Account, login and profile, DEC-463)
Work item: WI-050 (applications: api primary, web)

## Scope
Acceptance tests for the five acceptance criteria of REQ-428, plus the profile behaviour and the access rules in WI-050. Session mechanics are not specified by the requirement or the work item, so the scenarios check observable results only (a signed-in user can reach personal pages, a signed-out user cannot, logout ends the session), not how the session is stored.

## Preconditions
- The API and web application run against a test database with the users table from WI-050 (001_users migration applied).
- Two test accounts exist, user A and user B, created through registration. Their passwords are known to the tester.

## Scenarios

### S1. Register with valid details (AC1)
Steps:
1. Open the Registration page.
2. Enter a Name, a unique Email and a Password.
3. Submit.

Expected:
- The account is created and the user is shown as registered (signed in or sent to login, as the UI does).
- A row exists in the users table with the given name and email, and a password_hash value.

### S2. Register with invalid details shows field errors (AC3)
Steps:
1. Submit the Registration page with an empty Name, an invalid Email and a short Password.

Expected:
- No account is created.
- Each invalid field shows an understandable error message next to it.

### S3. Register with an email already in use
Steps:
1. Register with the email of user A.

Expected:
- No second account is created for that email.
- The message is safe and understandable and does not reveal anything beyond "this email is already registered".

### S4. Log in with valid credentials (AC2)
Steps:
1. Open the Login page.
2. Enter user A's email and password.
3. Submit.

Expected:
- The user reaches the Profile page.
- Personal pages open without being redirected to login.

### S5. Log out (AC2)
Steps:
1. While signed in as user A, choose Log out.
2. Try to open the Profile page directly.

Expected:
- The user is signed out.
- The Profile page redirects to the Login page.

### S6. Pages for personal data require authentication
Steps:
1. Without signing in, open the Profile and Settings page.

Expected:
- The user is redirected to the Login page.
- No profile data is shown.

### S7. Invalid login gives one generic, safe error (AC3)
Steps:
1. Log in with user A's email and a wrong password.
2. Log in with an email that is not registered and any password.

Expected:
- Both attempts show the same generic error message.
- The message does not say whether the email exists or which field was wrong.
- The user stays signed out.

### S8. Passwords are stored hashed (AC4)
Steps:
1. Register a new account with a known password, for example "Test-Pass-123".
2. Inspect the users table row for that account.

Expected:
- The password_hash value is not equal to the password and does not contain it.
- The hash uses argon2id (the stored value starts with the argon2id identifier).
- No column in the users table holds the plain password.

### S9. View own profile
Steps:
1. Sign in as user A.
2. Open the Profile and Settings page.

Expected:
- Name, Target role and Avatar of user A are shown.
- Email is shown but cannot be edited.

### S10. Update own profile
Steps:
1. Sign in as user A.
2. Change Name and Target role, and upload a small image as Avatar within the allowed type and size.
3. Save.
4. Reload the page.

Expected:
- The new values are shown after reload.
- The updated_at value of the row changes.
- The Email value is unchanged.

### S11. Change password requires the old password
Steps:
1. Sign in as user A.
2. Try to change the password with a wrong current password.
3. Try again with the correct current password and a new password.
4. Log out and log in with the new password.

Expected:
- The wrong current password is rejected and nothing changes.
- The correct current password succeeds.
- Login works with the new password and fails with the old one.

### S12. A user cannot access another user's private data (AC5)
Steps:
1. Sign in as user A.
2. Using the API directly with user A's session, request the profile of user B, and attempt to update user B's profile.
3. Confirm user B's row in the users table.

Expected:
- Reading or updating user B's profile is refused (not found or forbidden).
- User B's row is unchanged.
- Requests for user A's own profile still succeed.

### S13. Unauthenticated API access to profile is refused
Steps:
1. Without a session, call the profile read and update endpoints.

Expected:
- Both calls are refused as unauthenticated.
- No profile data is returned.

## Automated coverage
backend/tests/test_auth.py covers S1, S3, S4, S5, S7 and S8. backend/tests/test_profile.py covers S9 to S13. The web flows S2, S6 and S10 are checked manually or with browser tests, as the project chooses.

## Pass criteria
All scenarios S1 to S13 pass. Acceptance criteria AC1 to AC5 of REQ-428 are each covered by at least one passing scenario (AC1: S1, AC2: S4 and S5, AC3: S2 and S7, AC4: S8, AC5: S12).
