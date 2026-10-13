// Web Audio API based Kitchen & Order Sound Notifications

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('Could not initialize AudioContext:', e);
    return null;
  }
}

/**
 * Unlock AudioContext on first user interaction (touch/click)
 */
export function initAudioOnUserGesture(): void {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/**
 * Play an authentic kitchen order bell / chime notification.
 * High priority (rush/vip) plays a rapid urgent triple-tone chime.
 * Normal priority plays a resonant brass restaurant service bell (two-tone chime).
 */
export function playKitchenOrderChime(priority: 'normal' | 'rush' | 'vip' = 'normal'): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (priority === 'rush' || priority === 'vip') {
      // Rapid urgent triple chime: 659.25Hz -> 880Hz -> 1046.5Hz
      const tones = [659.25, 880, 1046.5];
      tones.forEach((freq, idx) => {
        const startTime = now + idx * 0.12;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.48);
      });
    } else {
      // Classic restaurant kitchen service bell (Ding-Ding tone)
      // Chime 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const harmonic1 = ctx.createOscillator();
      const gain1 = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);

      harmonic1.type = 'sine';
      harmonic1.frequency.setValueAtTime(1174.66, now); // 2nd harmonic for bell brightness

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.015);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc1.connect(gain1);
      harmonic1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      harmonic1.start(now);
      osc1.stop(now + 0.65);
      harmonic1.stop(now + 0.65);

      // Chime 2: 880 Hz (A5) 140ms later for classic two-tone chime
      const startTime2 = now + 0.14;
      const osc2 = ctx.createOscillator();
      const harmonic2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, startTime2);

      harmonic2.type = 'sine';
      harmonic2.frequency.setValueAtTime(1760, startTime2);

      gain2.gain.setValueAtTime(0.001, startTime2);
      gain2.gain.linearRampToValueAtTime(0.35, startTime2 + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, startTime2 + 0.85);

      osc2.connect(gain2);
      harmonic2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(startTime2);
      harmonic2.start(startTime2);
      osc2.stop(startTime2 + 0.9);
      harmonic2.stop(startTime2 + 0.9);
    }
  } catch (err) {
    console.warn('Audio notification failed:', err);
  }
}
