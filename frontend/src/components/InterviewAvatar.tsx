export type AvatarState = "idle" | "speaking" | "listening";

const STATE_TEXT: Record<AvatarState, string> = {
  idle: "Interviewer is waiting",
  speaking: "Interviewer is speaking",
  listening: "Interviewer is listening",
};

/**
 * A placeholder 2D interviewer. It labels itself as a visual representation of the AI interviewer,
 * and its state is shown in text too, so nothing depends on the animation.
 */
export function InterviewAvatar({ state }: { state: AvatarState }) {
  return (
    <figure className={`avatar avatar-${state}`}>
      <svg viewBox="0 0 120 140" role="img" aria-label="Visual representation of the AI interviewer" focusable="false">
        <ellipse className="avatar-shoulders" cx="60" cy="132" rx="48" ry="20" />
        <rect className="avatar-neck" x="51" y="88" width="18" height="18" rx="6" />
        <ellipse className="avatar-face" cx="60" cy="56" rx="30" ry="34" />
        <path className="avatar-hair" d="M28 52 C24 20 46 14 60 14 C80 14 98 22 92 54 C88 36 76 30 60 30 C44 30 34 38 28 52 Z" />
        <ellipse className="avatar-eye" cx="49" cy="58" rx="3" ry="3.5" />
        <ellipse className="avatar-eye" cx="71" cy="58" rx="3" ry="3.5" />
        <path className="avatar-mouth" d="M51 74 Q60 80 69 74" />
        <rect className="avatar-mouth-open" x="54" y="72" width="12" height="7" rx="3" />
        <circle className="avatar-ring" cx="60" cy="56" r="48" />
      </svg>
      <figcaption className="avatar-state">{STATE_TEXT[state]}</figcaption>
    </figure>
  );
}
