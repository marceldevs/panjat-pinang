/** Procedural placeholder SFX via Web Audio — no external assets required. */

let ctx: AudioContext | null = null;
let musicGain: GainNode | null = null;
let musicTimer: number | null = null;
let muted = false;

function ac(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function setMuted(v: boolean): void {
  muted = v;
  if (musicGain) musicGain.gain.value = muted ? 0 : 0.08;
}

export function isMuted(): boolean {
  return muted;
}

function beep(
  freq: number,
  duration: number,
  type: OscillatorType = "square",
  gain = 0.08,
  when = 0
): void {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export function sfxClimb(grade: string): void {
  if (grade === "perfect") {
    beep(660, 0.08, "triangle", 0.1);
    beep(880, 0.12, "triangle", 0.09, 0.07);
  } else if (grade === "great") {
    beep(520, 0.1, "triangle", 0.08);
  } else if (grade === "good") {
    beep(390, 0.1, "sine", 0.07);
  } else {
    beep(180, 0.15, "sawtooth", 0.05);
  }
}

export function sfxBump(): void {
  beep(120, 0.12, "sawtooth", 0.07);
  beep(90, 0.18, "square", 0.04, 0.05);
}

export function sfxPickup(): void {
  beep(740, 0.06, "sine", 0.07);
  beep(980, 0.1, "sine", 0.06, 0.05);
}

export function sfxAbility(): void {
  beep(440, 0.08, "triangle", 0.08);
  beep(554, 0.08, "triangle", 0.07, 0.06);
  beep(659, 0.12, "triangle", 0.06, 0.12);
}

export function sfxWin(): void {
  const notes = [523, 659, 784, 1046];
  notes.forEach((n, i) => beep(n, 0.18, "triangle", 0.09, i * 0.12));
}

export function sfxAnnounce(): void {
  beep(300, 0.1, "square", 0.05);
  beep(450, 0.14, "square", 0.05, 0.1);
}

export function sfxClick(): void {
  beep(640, 0.04, "square", 0.04);
}

export function startMusic(): void {
  const a = ac();
  if (musicGain) return;
  musicGain = a.createGain();
  musicGain.gain.value = muted ? 0 : 0.08;
  musicGain.connect(a.destination);

  const pattern = [262, 294, 330, 349, 392, 349, 330, 294];
  let i = 0;
  const tick = () => {
    if (!musicGain) return;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "triangle";
    osc.frequency.value = pattern[i % pattern.length]!;
    g.gain.value = 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.28);
    osc.connect(g);
    g.connect(musicGain);
    osc.start();
    osc.stop(a.currentTime + 0.3);
    i++;
    musicTimer = window.setTimeout(tick, 320);
  };
  tick();
}

export function stopMusic(): void {
  if (musicTimer) window.clearTimeout(musicTimer);
  musicTimer = null;
  musicGain = null;
}

export function unlockAudio(): void {
  void ac().resume();
}
