# Spec gaps: candidate-journey

Source: docs/requirements/REQ-428 to REQ-437 (req.md and mock.md), with docs/source/AI_PrepInterviewer_Requirements.md. The spec is not changed. Each gap below is shown in the mock as a "Not defined" alert on the control or step named, and nothing is invented to fill it.

## Spec gaps

1. **Registration details.** The spec says "Account details: (to confirm)" (REQ-428 mock). The register page shows an alert and three sample fields. Screen S02.
2. **Login identifier.** The spec does not say whether login uses an email or a username (REQ-428 open question). The field is labelled "Email or username" and alerts on click. Screen S03.
3. **Login error wording.** Criterion 3 requires a safe, understandable error, but no wording is given. The error note alerts. Screen S03.
4. **Editable profile fields.** The spec says "basic profile information" only (REQ-428). The profile note alerts. Screen S11.
5. **Resume file-size limit.** The spec says "the configured file-size limit" with no value (REQ-429). The Choose file button alerts. Screen S05.
6. **Retention period for deleted resumes.** The spec says "subject to the retention rules" with no period (REQ-429, F-010). The Delete resume button alerts. Screen S05.
7. **Analysis unavailable.** The spec requires an understandable error when Gemini fails but gives no wording (REQ-430, criterion 5). The analysing step shows an alert. Screen S05, step resume-analysing.
8. **Where corrections are stored.** The spec says the candidate can review and correct the analysis, but not whether the correction replaces the AI output or sits beside it (REQ-430). The Edit button alerts. Screen S05.
9. **Roles shown at once.** The spec does not say how many recommendations are shown (REQ-431). The roles note alerts; the mock shows two sample roles. Screen S06.
10. **Duration options.** The spec says "configured options" with no values (REQ-432). The duration select alerts; 15, 30 and 45 minutes are sample values. Screen S07.
11. **Question plan size.** The spec does not say how many questions a plan has (REQ-433). The question counter alerts; the mock uses 2 sample questions. Screen S08.
12. **Follow-up limit.** The spec says "a limited number" of follow-ups with no number (REQ-433). The follow-up tag alerts. Screen S08.
13. **Timer behaviour.** The spec does not say how the timer is shown or what happens when time runs out mid-answer (REQ-433). The timer alerts. Screen S08.
14. **Early end and its report.** The spec allows ending early and says the status is recorded, but does not say whether a scored report is produced (REQ-433, REQ-435). The End interview button alerts. Screen S08.
15. **Speech-to-text service.** The spec allows a browser capability or a selected provider and does not choose (REQ-434). The Record answer button alerts. Screen S08.
16. **Text-to-speech fallback.** The spec requires question text to stay visible but does not say what the candidate hears or sees when TTS is unavailable (REQ-434). The Replay button alerts. Screen S08.
17. **Avatar assets.** The spec says "2D animation assets" without naming them (REQ-434). The avatar placeholder alerts. Screen S08.
18. **Category scores and rubric.** The spec gives example categories but does not say which apply to each interview type, or how the overall score out of 100 is calculated (REQ-435). The category heading alerts. Screen S09.
19. **Report timing.** The spec does not say whether the report is generated automatically or only when the candidate asks (REQ-435). The report note alerts. Screen S09.
20. **Average score threshold.** The spec says the average is shown "when enough completed sessions exist" but does not give the number (REQ-436). The dashboard note alerts. Screen S04.
21. **Weak topics and progress trend.** The spec does not define a weak topic or how a progress trend is calculated (REQ-436). The weak-topics line alerts. Screen S04.

## Gaps not shown in the tour

These have no screen in this walkthrough, so no alert is shown. Each is recorded so it is not lost.

22. **Analysis structure.** The JSON structure of the AI analysis is not given (REQ-430 open question). Not visible in the tour.
23. **Full role list.** Whether the list of roles is fixed or open is not decided; the spec says the examples are not a fixed list (REQ-431). The mock shows two sample roles.
24. **Question plan timing.** Whether the plan is generated at the start or one question at a time is not decided (REQ-433). The tour uses a plan in the seed.
25. **Transcript and report retention.** The spec requires retention rules for transcripts and reports but gives no periods (REQ-437). The tour shows only the resume delete note.
26. **Password hashing.** The algorithm is not named (REQ-428). No screen shows it.
27. **Production file storage.** The spec allows a controlled local location in development but does not choose the production store (REQ-429). Not shown.
28. **Logging tool and format.** Not named (REQ-437). Not shown.
29. **Hosting and HTTPS.** The spec says "use HTTPS in deployment" but does not name the host (REQ-437). Not shown.

## Walkthrough notes (not spec gaps)

- Screen codes S01 to S11 are made for this walkthrough, following the page numbers in Section 9 of the source document. The spec has no screen codes.
- Assumption: Replace swaps out the single resume. The spec does not say whether older versions are kept (REQ-429 open question). The replace control only shows a message.
- Assumption: both the register and the log-in paths lead to a new candidate's dashboard, because the tour starts with no history.
- The tour shows the success path only. Invalid login, unsupported file, empty transcript, microphone error and speech-service failure are not played through. Their requirements are noted in the gap list above.
- The avatar is a placeholder, not 2D artwork. Upload, analysis, speech and the report are not real; every value is sample data.
- Tab-bar clicks that the tour does not use show an off-script hint.
- The desktop app has a phone-view toggle. The mobile checks (360 to 430 px, no sideways scroll, 44 px tap targets, 16 px inputs) are not run by the validator; check them by hand.
- The admin dashboard and later enhancements are out of scope (Section 10 of the source document).
