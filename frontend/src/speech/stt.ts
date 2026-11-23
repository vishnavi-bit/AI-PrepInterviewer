/** Voice answers through the browser's speech recognition. The typed answer is always the fallback. */

// The Web Speech API types are not in the standard DOM library, so the parts used here are declared.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type RecognitionErrorEvent = { error: string };
type RecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSttSupported(): boolean {
  return recognitionCtor() !== null;
}

export type ListenHandlers = {
  /** A finished piece of the transcript, to be added to the answer box. */
  onText: (text: string) => void;
  /** A message the candidate should see, or null for a quiet stop (such as the candidate pressing stop). */
  onError: (message: string | null) => void;
  /** Called once when recognition has stopped, after any error or text. */
  onEnd: () => void;
};

/** Messages for the errors the browser reports. Each one points back to the typed answer. */
export function voiceErrorText(code: string): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone permission is needed for voice answers. Allow it in your browser, or type your answer.";
    case "no-speech":
      return "No speech was heard. Try again, or type your answer.";
    case "audio-capture":
      return "No microphone was found. Type your answer instead.";
    case "network":
      return "Speech recognition could not reach its service. Type your answer instead.";
    case "aborted":
      return null;
    default:
      return "Voice input failed. Type your answer instead.";
  }
}

/** Starts one recording. Returns a stop function, or null when voice input is unavailable. */
export function startListening(handlers: ListenHandlers): (() => void) | null {
  const Ctor = recognitionCtor();
  if (!Ctor) return null;

  const recognition = new Ctor();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result.isFinal) handlers.onText(result[0].transcript.trim());
    }
  };
  recognition.onerror = (event) => handlers.onError(voiceErrorText(event.error));
  recognition.onend = () => handlers.onEnd();

  try {
    recognition.start();
  } catch {
    // start() throws when a recording is already running; report it as unavailable for this attempt.
    handlers.onError("Voice input is busy. Try again in a moment.");
    handlers.onEnd();
    return null;
  }
  return () => recognition.stop();
}
