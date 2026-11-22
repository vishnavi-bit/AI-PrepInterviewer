# F-010 mock: no screen of its own (from Section 5.10 and 6 only)

This feature has no page in Section 9. It is a set of rules applied to every screen.

```
Every private screen (Dashboard, Resume, Interview Room, Result, History, Profile)
  -> backend checks: is the user logged in?
  -> backend checks: does this record belong to this user?
  -> if no: safe "not found / not allowed" message, no data returned
  -> errors and logs: no passwords, tokens or secrets shown
```
