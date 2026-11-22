# F-007 Virtual avatar and voice interaction

Feature: F-007: Virtual Avatar & Voice Interaction (FEAT-1397). Decision: DEC-469. Requirement: REQ-434.

## Purpose
A 2D animated female interviewer speaks the questions and listens to voice answers. Text is always shown, so the interview works without audio or microphone.

## Behaviour
- The interview screen shows a 2D animated female interviewer, labelled as a visual representation of the AI interviewer.
- The avatar shows idle, speaking and listening states.
- Questions are always shown as text, and spoken with TTS when available.
- The candidate can replay or mute audio.
- The candidate answers by microphone recording; speech is converted to text by STT, and the transcript can be reviewed or corrected where practical.
- A typed-answer option is always available.
- Microphone permission errors, empty transcripts and speech-service failures show clear messages.

## Acceptance criteria
1. The interview screen displays the 2D avatar.
2. The avatar shows appropriate basic animation states.
3. Interview questions remain visible as text.
4. The user can hear questions when TTS is available.
5. The user can submit a voice answer when microphone permission is granted.
6. Recorded speech is converted to a transcript when STT is available.
7. The user can submit a typed answer if voice input is unavailable.
8. Audio and microphone failures show understandable messages.

## Order and dependencies
Order: 7 of 10
Depends on: F-006 AI Interview Management (avatar speaks the session's questions and receives its answers)

## Source documents
- docs/source/AI_PrepInterviewer_Requirements.md, Section 7 (F-007), Section 5.7, Section 3 (speech and avatar rows), Section 6 (usability and accessibility), Section 2.1 (main objectives).

## Open questions
- Browser speech capability or a selected STT/TTS provider? The source allows either and does not decide.
- Which avatar animation assets are used? The source says "2D animation assets" without naming them.
- What is the fallback when TTS is unavailable on a device? The source requires text to stay visible.
