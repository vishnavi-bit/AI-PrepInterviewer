// Browser speech: speech-to-text (SpeechRecognition) and text-to-speech (speechSynthesis). No keys, no server calls.
// Every failure returns a message the candidate can act on, and typing an answer is always possible.

type RecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};

export const SPEECH_ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access in your browser settings, or type your answer.',
  'service-not-allowed': 'Speech recognition is blocked in this browser. Type your answer instead.',
  'no-speech': 'We did not hear anything. Try again, or type your answer.',
  'audio-capture': 'No microphone was found. Connect one, or type your answer.',
  network: 'Speech recognition needs an internet connection in this browser. Type your answer instead.',
  aborted: '',
};

export function recognitionSupported(): boolean {
  return typeof window !== 'undefined' && Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

export function speechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export interface Listener {
  stop(): void;
}

// Starts listening. Interim text is reported as it comes; the final text is reported once the candidate stops.
export function listen(handlers: { onText: (text: string, final: boolean) => void; onError: (message: string) => void; onEnd: () => void }): Listener {
  const w = window as unknown as Record<string, new () => RecognitionLike>;
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onError('Voice answers are not supported in this browser. Type your answer, or use Chrome or Edge.');
    return { stop() {} };
  }
  const rec = new Ctor();
  rec.lang = 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  let finalText = '';
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += `${r[0].transcript} `;
      else interim += r[0].transcript;
    }
    handlers.onText((finalText + interim).trim(), false);
  };
  rec.onerror = (e) => {
    const message = SPEECH_ERRORS[e.error] ?? 'Speech recognition stopped unexpectedly. Type your answer instead.';
    if (message) handlers.onError(message);
  };
  rec.onend = () => {
    handlers.onText(finalText.trim(), true);
    handlers.onEnd();
  };
  try {
    rec.start();
  } catch {
    handlers.onError('Could not start the microphone. Try again, or type your answer.');
  }
  return { stop: () => rec.stop() };
}

// Reads text aloud. Returns a cancel function. Picks a female English voice when the browser has one.
export function speak(text: string, handlers: { onStart?: () => void; onEnd?: () => void; onError?: (message: string) => void } = {}): () => void {
  if (!speechSynthesisSupported()) {
    handlers.onError?.('Audio is not available in this browser. You can read the question on screen.');
    return () => undefined;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'en-US';
  utter.rate = 0.98;
  utter.pitch = 1.05;
  const voices = synth.getVoices();
  const preferred = voices.find((v) => v.lang.startsWith('en') && /female|samantha|zira|aria|jenny|google uk english female/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith('en'));
  if (preferred) utter.voice = preferred;
  utter.onstart = () => handlers.onStart?.();
  utter.onend = () => handlers.onEnd?.();
  utter.onerror = () => {
    handlers.onEnd?.();
    handlers.onError?.('The question could not be read aloud. It is still shown on screen.');
  };
  synth.speak(utter);
  return () => synth.cancel();
}
