let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined' || !window.AudioContext) return null;
  try {
    audioContext ??= new window.AudioContext();
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {});
    return audioContext;
  } catch {
    return null;
  }
}

function playTone(context: AudioContext, frequency: number, startAt: number, duration: number, volume: number, type: OscillatorType) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration);
}

export function playVoteBell() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  playTone(context, 880, now, 0.42, 0.045, 'sine');
  playTone(context, 1320, now, 0.32, 0.018, 'sine');
}

export function playCelebration() {
  const context = getAudioContext();
  if (!context) return;
  const now = context.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone(context, frequency, now + index * 0.14, 0.34, 0.04, 'triangle');
  });
}
