/** Question audio through the browser's speech synthesis. Text is always shown; audio is an extra. */

export function isTtsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
}

export type SpeakHandlers = {
  onStart?: () => void;
  onEnd?: () => void;
  /** The browser's error code. "canceled" and "interrupted" come from stopping speech on purpose. */
  onError?: (code: string) => void;
};

/** Speaks the text, cancelling anything already playing. Returns false when audio is unavailable. */
export function speak(text: string, handlers: SpeakHandlers = {}): boolean {
  if (!isTtsSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = (event) => handlers.onError?.(event.error);
  synth.speak(utterance);
  return true;
}

/** Stops any speech now. Safe to call when nothing is playing or audio is unavailable. */
export function stopSpeaking(): void {
  if (isTtsSupported()) window.speechSynthesis.cancel();
}
