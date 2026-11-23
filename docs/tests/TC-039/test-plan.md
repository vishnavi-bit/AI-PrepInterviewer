# TC-039 Test plan: F-007 Interview avatar and voice input

Requirement: REQ-434 (F-007 Virtual avatar and voice interaction). Work item: WI-057. Decision: DEC-469. Feature: FEAT-1397.
Scope: web interview screen (`frontend/`). Browser speech only (Web Speech API); no backend change.
Test basis: REQ-434 acceptance criteria 1 to 8, and the WI-057 plan and Q&A decisions.

## Preconditions
- An F-006 interview session is running and shows a current question (`current.text`).
- Test on at least Chrome (or Edge) and Firefox. Firefox has no `SpeechRecognition`.
- Test per platform for TTS, since voice availability depends on OS and browser.
- Microphone permission is in a known state for each case (granted, denied, not yet asked).

## Scenarios

### TC-039-S01 Avatar is shown on the interview screen (AC 1)
1. Open the interview session page.
2. Expected: a 2D interviewer avatar is visible, with a visible label saying it is a visual representation of the AI interviewer.

### TC-039-S02 Avatar shows idle, speaking and listening states (AC 2)
1. Open the session page with no question being read and no recording.
2. Expected: avatar is in `idle`.
3. Start question audio (or trigger replay).
4. Expected: avatar switches to `speaking` while audio plays, and returns to `idle` after it ends.
5. Start microphone recording.
6. Expected: avatar switches to `listening` while recording is active.

### TC-039-S03 Question text stays visible (AC 3)
1. Open the session page with TTS available, then with TTS unavailable.
2. Expected: the current question text is displayed in both cases, and it matches `current.text` from the session.
3. Expected: the text remains visible while audio plays, is muted, or fails.

### TC-039-S04 Questions are spoken when TTS is available (AC 4)
1. With `speechSynthesis` and a voice available, open the session page.
2. Expected: the question is read aloud.
3. Click Replay.
4. Expected: the question is read aloud again.
5. Click Mute while audio is playing, then Replay.
6. Expected: audio stops on Mute; the replay control respects the mute state as designed.

### TC-039-S05 TTS unavailable: controls disabled with a message (WI-057 Q&A q3)
1. Open the session page on a device or browser without `speechSynthesis` or without a voice.
2. Expected: Replay and Mute are shown disabled, with a short message that audio is not available on this device.
3. Expected: the question text stays visible and the answer area still works.

### TC-039-S06 Voice answer submitted when microphone permission is granted (AC 5)
1. Grant microphone permission. Click the microphone button and speak an answer.
2. Stop recording.
3. Submit the answer.
4. Expected: the answer is submitted through the F-006 answer submission call and the session advances or records it.

### TC-039-S07 Recorded speech becomes an editable transcript (AC 6)
1. With STT available, record a short answer.
2. Expected: a transcript appears in an editable field.
3. Edit one word in the transcript and submit.
4. Expected: the submitted answer contains the edited text, not the raw recognition output.

### TC-039-S08 Typed answer submitted when voice input is unavailable (AC 7)
1. Use Firefox, or a browser without `SpeechRecognition`.
2. Expected: the microphone control is not offered; only the typed answer field is shown.
3. Type an answer and submit.
4. Expected: the typed answer is submitted through the same F-006 submission call.
5. Also check: with microphone permission denied, the typed answer field is still available and works.

### TC-039-S09 Microphone permission denied shows an understandable message (AC 8)
1. Deny microphone permission. Click the microphone button.
2. Expected: a clear message says microphone access was denied and that the candidate can type the answer instead.
3. Expected: the typed answer field remains usable.

### TC-039-S10 Empty transcript and speech-service errors show messages (AC 8)
1. Record with no speech, then stop.
2. Expected: a message says no speech was detected; the transcript is empty and the candidate can retry or type.
3. Force a recognition error (for example, disconnect the network, which affects Chrome and Edge online recognition).
4. Expected: a clear message appears, and the typed answer path stays open.

### TC-039-S11 Audio failure shows an understandable message (AC 8)
1. Simulate a `speechSynthesis` error (for example, a voice that fails to play).
2. Expected: a clear message appears; the question text stays visible; Replay and Mute remain usable or are disabled with a message.

### TC-039-S12 Phone-width layout (WI-057 approach, step 7)
1. Open the session page at phone width (about 375 px).
2. Expected: avatar, question, controls and answer area are all visible; no horizontal page scroll.

### TC-039-S13 Voice-service disclosure (WI-057 risks)
1. In Chrome or Edge, open the microphone flow.
2. Expected: if the product owner requires it, UI copy states that voice recognition uses the browser vendor's online service and does not work offline. Confirm the copy matches the decision before marking this step passed.

## Out of scope
- Speech provider integration and any API change (WI-057 q1 decision: browser speech only).
- Final avatar artwork (WI-057 q2 decision: placeholder animations only).
- F-006 session logic beyond reading the current question and submitting an answer.
