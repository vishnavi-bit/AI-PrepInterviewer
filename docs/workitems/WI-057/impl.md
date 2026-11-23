# WI-057: F-007 Interview avatar and voice input

Applications: web (primary)

Requirement: REQ-434 (F-007 Virtual avatar and voice interaction). Decision: DEC-469. Feature: FEAT-1397. Depends on: F-006 AI Interview Management (the avatar speaks the session's questions and receives its answers).

## Decisions from Q&A
- Speech: browser speech only (Web Speech API). No speech provider and no API change. The `api` application is not touched.
- Avatar: simple placeholder 2D animations created in the project, with idle, speaking and listening states. No external assets.
- TTS unavailable: the replay and mute controls are shown disabled, with a short message that audio is not available on this device. The question text stays visible.

## Approach
1. Interview screen (web): add a session page that shows the current question from the F-006 session (`current.text`) as visible text, the avatar, and the answer area. The page reads the session through the existing client in `frontend/src/api/interviewSession.ts`.
2. Avatar: a React component with three states (`idle`, `speaking`, `listening`), drawn as inline SVG with CSS animation. It carries a visible label that says it is a visual representation of the AI interviewer.
3. Question audio (TTS): use `speechSynthesis`. Replay and mute controls sit beside the question. When `speechSynthesis` or a voice is unavailable, the controls render disabled with the message from Q&A (q3).
4. Answer input: a microphone button starts `SpeechRecognition` and fills an editable transcript. The candidate can correct the transcript before submitting. A typed-answer field is always available. When speech recognition is unavailable, only the typed field is shown.
5. Submit: the answer is sent through the existing F-006 answer submission call. If that call does not exist yet, it is added to `interviewSession.ts` in the web app only, against the API F-006 already provides.
6. Errors: map microphone permission denial, no speech detected (empty transcript), and recognition errors to clear messages. Each message keeps the typed-answer path open.

## Areas and files likely affected
- `frontend/src/pages/InterviewSession.tsx` (new): interview screen. Question text, avatar, answer area, replay and mute.
- `frontend/src/components/InterviewAvatar.tsx` (new): 2D avatar with idle, speaking and listening states.
- `frontend/src/components/AnswerInput.tsx` (new): microphone capture, editable transcript, typed fallback, error messages.
- `frontend/src/speech/tts.ts` (new) and `frontend/src/speech/stt.ts` (new): browser speech wrappers with feature detection.
- `frontend/src/api/interviewSession.ts`: submit-answer call, only if F-006 has not already added it.
- `frontend/src/App.tsx`: route for the interview session page.
- `frontend/src/styles.css`: avatar, state and control styles; the page must work at phone width.

## Risks
- Web Speech API support differs by browser. Firefox has no `SpeechRecognition`, so the typed path must be the complete fallback, not an afterthought.
- Chrome and Edge send recognition audio to the browser vendor's online service, so voice input does not work offline. Document this in the UI copy if the product owner wants it.
- Voice availability differs by OS and browser, so TTS behaviour must be tested per platform.
- F-006 must provide the current question and the answer submission. If its endpoints differ from `interviewSession.ts`, this item is blocked on F-006.

## Assumptions
- The F-006 session API in `frontend/src/api/interviewSession.ts` is the source of the current question and the submit endpoint.
- No backend change is needed; browser speech only.
- Placeholder animations are enough to meet acceptance criterion 2; final art is out of scope.
- Acceptance criteria 1 to 8 in REQ-434 are the test basis.
