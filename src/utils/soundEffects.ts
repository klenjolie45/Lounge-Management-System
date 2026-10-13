// Web Audio API sound generator for Kitchen Order Chimes & Notifications
// Synthesizes crisp, realistic kitchen bell and ticket alerts without external audio file dependencies.

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Plays a classic, authentic brass kitchen service order bell chime ("Ding-Ding!").
 * Resonant, bright, and impossible for the chef or waitstaff to miss.
 */
export function playKitchenOrderChime(priority: 'normal' | 'rush' | 'vip' = 'normal') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (priority === 'vip' || priority === 'rush') {
      // 3-tone urgent ascending chime for VIP / Rush orders: 880Hz -> 1175Hz -> 1480Hz
      const freqs = [880, 1174.66, 1479.98];
      freqs.forEach((freq, idx) => {
        playBellNote(ctx, freq, now + idx * 0.14, 0.45, 0.35);
      });
    } else {
      // Classic two-tone kitchen order bell: high bell "Ding-Ding" (1046.5Hz -> 1318.5Hz)
      playBellNote(ctx, 1046.5, now, 0.4, 0.3); // High C6
      playBellNote(ctx, 1318.51, now + 0.15, 0.6, 0.35); // E6
    }
  } catch (err) {
    console.warn('[Audio] Could not play kitchen order chime:', err);
  }
}

/**
 * Helper to synthesize a realistic metallic bell note with exponential decay and slight harmonic richness
 */
function playBellNote(
  ctx: AudioContext,
  fundamentalFreq: number,
  startTime: number,
  duration: number,
  masterGainValue: number
) {
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  // Smooth attack & exponential decay
  masterGain.gain.setValueAtTime(0.001, startTime);
  masterGain.gain.linearRampToValueAtTime(masterGainValue, startTime + 0.015);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  // Fundamental frequency oscillator (sine)
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(fundamentalFreq, startTime);
  osc1.connect(masterGain);
  osc1.start(startTime);
  osc1.stop(startTime + duration);

  // First overtone oscillator (sine at ~2x frequency for bell clarity)
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(fundamentalFreq * 2.01, startTime);
  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0.25, startTime);
  gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.7);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(startTime);
  osc2.stop(startTime + duration);

  // High metallic strike transient (triangle wave for chime character)
  const osc3 = ctx.createOscillator();
  osc3.type = 'triangle';
  osc3.frequency.setValueAtTime(fundamentalFreq * 2.76, startTime);
  const gain3 = ctx.createGain();
  gain3.gain.setValueAtTime(0.15, startTime);
  gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.4);
  osc3.connect(gain3);
  gain3.connect(masterGain);
  osc3.start(startTime);
  osc3.stop(startTime + duration);
}
