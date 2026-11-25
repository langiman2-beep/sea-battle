import { player } from "./storage.js";

let audioCtx = null;
let bgMasterGain = null;
let sfxMasterGain = null;
let musicMasterGain = null;
let shahedGain = null;
let started = false;
let gullTimer = null;
let musicTimer = null;
let pinkNoiseBuf = null;
let whiteNoiseBuf = null;

function createPinkNoiseBuffer(ctx, seconds = 5) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.055;
    b6 = white * 0.115926;
  }
  return buffer;
}

function createWhiteNoiseBuffer(ctx, seconds = 2) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

// Естественный крик морской чайки ("кья-а-а")
function playSingleGull(ctx, dest) {
  const now = ctx.currentTime;
  const calls = Math.random() > 0.45 ? 2 : 1;

  for (let i = 0; i < calls; i++) {
    const t = now + i * 0.42;
    const dur = 0.34 + Math.random() * 0.08;
    const base = 1150 + Math.random() * 260;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = "sawtooth";
    osc2.type = "triangle";

    // Резкий взлёт питча и протяжный спад
    osc1.frequency.setValueAtTime(base * 0.82, t);
    osc1.frequency.exponentialRampToValueAtTime(base * 1.48, t + 0.07);
    osc1.frequency.exponentialRampToValueAtTime(base * 0.72, t + dur);

    osc2.frequency.setValueAtTime(base * 1.64, t);
    osc2.frequency.exponentialRampToValueAtTime(base * 2.95, t + 0.07);
    osc2.frequency.exponentialRampToValueAtTime(base * 1.42, t + dur);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1650, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + 0.07);
    filter.frequency.exponentialRampToValueAtTime(1250, t + dur);
    filter.Q.value = 3.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.11, t + 0.03);
    gain.gain.setValueAtTime(0.095, t + 0.11);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur + 0.02);
    osc2.stop(t + dur + 0.02);
  }
}

function startAmbientMusic(ctx, dest) {
  const chords = [
    [164.81, 196.0, 246.94, 329.63],
    [130.81, 196.0, 261.63, 329.63],
    [110.0, 164.81, 220.0, 261.63],
    [123.47, 185.0, 246.94, 293.66],
  ];
  let step = 0;

  const playStep = () => {
    if (!audioCtx || document.visibilityState === "hidden") return;
    if (audioCtx.state === "suspended") return;

    const now = ctx.currentTime;
    const chord = chords[Math.floor(step / 4) % chords.length];
    const note = chord[step % chord.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(note, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.9);

    if (step % 4 === 0) {
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = "triangle";
      bass.frequency.setValueAtTime(chord[0] * 0.5, now);

      bassGain.gain.setValueAtTime(0.0001, now);
      bassGain.gain.linearRampToValueAtTime(0.18, now + 0.15);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.8);

      bass.connect(bassGain);
      bassGain.connect(dest);
      bass.start(now);
      bass.stop(now + 2.9);
    }

    step += 1;
  };

  playStep();
  musicTimer = setInterval(playStep, 750);
}

export function updateSoundSettings() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  if (bgMasterGain) {
    bgMasterGain.gain.setTargetAtTime(player.bgSound ? 0.42 : 0, now, 0.1);
  }
  if (sfxMasterGain) {
    sfxMasterGain.gain.setTargetAtTime(player.bgSound ? 0.72 : 0, now, 0.05);
  }
  if (musicMasterGain) {
    musicMasterGain.gain.setTargetAtTime(player.music ? 0.15 : 0, now, 0.15);
  }
  if (!player.bgSound && shahedGain) {
    shahedGain.gain.setTargetAtTime(0, now, 0.1);
  }
}

export function setShahedBuzz(active) {
  if (!audioCtx || !shahedGain) return;
  const now = audioCtx.currentTime;
  const target = active && player.bgSound ? 0.065 : 0;
  shahedGain.gain.setTargetAtTime(target, now, 0.25);
}

export function startSurfSound() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  if (!audioCtx) {
    audioCtx = new AudioCtx();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }

  if (started) {
    updateSoundSettings();
    return;
  }
  started = true;

  pinkNoiseBuf = createPinkNoiseBuffer(audioCtx, 5);
  whiteNoiseBuf = createWhiteNoiseBuffer(audioCtx, 2);

  bgMasterGain = audioCtx.createGain();
  bgMasterGain.gain.value = player.bgSound ? 0.42 : 0;
  bgMasterGain.connect(audioCtx.destination);

  sfxMasterGain = audioCtx.createGain();
  sfxMasterGain.gain.value = player.bgSound ? 0.72 : 0;
  sfxMasterGain.connect(audioCtx.destination);

  musicMasterGain = audioCtx.createGain();
  musicMasterGain.gain.value = player.music ? 0.15 : 0;
  musicMasterGain.connect(audioCtx.destination);

  // 1. Живой накат морской волны и шелест пены на берегу (без загробного гула)
  const surfSrc = audioCtx.createBufferSource();
  surfSrc.buffer = pinkNoiseBuf;
  surfSrc.loop = true;

  const surfHighpass = audioCtx.createBiquadFilter();
  surfHighpass.type = "highpass";
  surfHighpass.frequency.value = 130;

  const surfFilter = audioCtx.createBiquadFilter();
  surfFilter.type = "lowpass";
  surfFilter.frequency.value = 780;

  const surfWaveGain = audioCtx.createGain();
  surfWaveGain.gain.value = 0.34;

  // Волна набегает каждые ~8 секунд, раскрывая шипение пены
  const waveLfo = audioCtx.createOscillator();
  waveLfo.type = "sine";
  waveLfo.frequency.value = 0.125;

  const waveAmp = audioCtx.createGain();
  waveAmp.gain.value = 0.22;
  waveLfo.connect(waveAmp);
  waveAmp.connect(surfWaveGain.gain);

  const waveBright = audioCtx.createGain();
  waveBright.gain.value = 560;
  waveLfo.connect(waveBright);
  waveBright.connect(surfFilter.frequency);

  surfSrc.connect(surfHighpass);
  surfHighpass.connect(surfFilter);
  surfFilter.connect(surfWaveGain);
  surfWaveGain.connect(bgMasterGain);

  surfSrc.start();
  waveLfo.start();

  // 2. Лёгкий свежий морской бриз (широкий воздушный фильтр, без свиста)
  const windSrc = audioCtx.createBufferSource();
  windSrc.buffer = pinkNoiseBuf;
  windSrc.loop = true;

  const windFilter = audioCtx.createBiquadFilter();
  windFilter.type = "bandpass";
  windFilter.frequency.value = 480;
  windFilter.Q.value = 0.65;

  const windGain = audioCtx.createGain();
  windGain.gain.value = 0.11;

  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(bgMasterGain);
  windSrc.start();

  // 3. Негромкое тарахтение летящего шахеда ("мопед" в небе)
  const shahedOsc1 = audioCtx.createOscillator();
  const shahedOsc2 = audioCtx.createOscillator();
  shahedOsc1.type = "sawtooth";
  shahedOsc2.type = "triangle";
  shahedOsc1.frequency.value = 74;
  shahedOsc2.frequency.value = 148;

  const shahedFilter = audioCtx.createBiquadFilter();
  shahedFilter.type = "lowpass";
  shahedFilter.frequency.value = 340;

  const shahedPulseNode = audioCtx.createGain();
  shahedPulseNode.gain.value = 0.65;

  // Пульсация двухтактного движка ~28 Гц
  const engineLfo = audioCtx.createOscillator();
  engineLfo.type = "sine";
  engineLfo.frequency.value = 28;
  const engineLfoDepth = audioCtx.createGain();
  engineLfoDepth.gain.value = 0.35;
  engineLfo.connect(engineLfoDepth);
  engineLfoDepth.connect(shahedPulseNode.gain);

  shahedGain = audioCtx.createGain();
  shahedGain.gain.value = 0;

  shahedOsc1.connect(shahedFilter);
  shahedOsc2.connect(shahedFilter);
  shahedFilter.connect(shahedPulseNode);
  shahedPulseNode.connect(shahedGain);
  shahedGain.connect(bgMasterGain);

  shahedOsc1.start();
  shahedOsc2.start();
  engineLfo.start();

  // 4. Периодические крики чаек
  gullTimer = setInterval(() => {
    if (!audioCtx || !player.bgSound || document.visibilityState === "hidden") {
      return;
    }
    if (Math.random() < 0.72) {
      playSingleGull(audioCtx, bgMasterGain);
    }
  }, 8500);

  // 5. Фоновая музыка
  startAmbientMusic(audioCtx, musicMasterGain);
}

function getSfxContext() {
  if (!player.bgSound) return null;
  if (!started) startSurfSound();
  if (!audioCtx || !sfxMasterGain) return null;
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTorpedoSound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Пневматический пуск торпеды + всплеск воды
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(230, now);
  osc.frequency.exponentialRampToValueAtTime(58, now + 0.32);

  gain.gain.setValueAtTime(0.38, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start(now);
  osc.stop(now + 0.37);

  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuf || createWhiteNoiseBuffer(ctx, 1);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(820, now + 0.05);
  filter.frequency.exponentialRampToValueAtTime(260, now + 0.45);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.28, now + 0.05);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(sfxMasterGain);
  noise.start(now + 0.05);
  noise.stop(now + 0.5);
}

export function playAASound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Хлёсткий выстрел зенитной пушки
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(190, now);
  osc.frequency.exponentialRampToValueAtTime(44, now + 0.09);

  gain.gain.setValueAtTime(0.32, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start(now);
  osc.stop(now + 0.11);

  const crack = ctx.createBufferSource();
  crack.buffer = whiteNoiseBuf || createWhiteNoiseBuffer(ctx, 1);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(1350, now);
  filter.Q.value = 1.2;

  const cGain = ctx.createGain();
  cGain.gain.setValueAtTime(0.26, now);
  cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  crack.connect(filter);
  filter.connect(cGain);
  cGain.connect(sfxMasterGain);
  crack.start(now);
  crack.stop(now + 0.09);
}

export function playRocketSound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Реактивный старт и свист ракеты
  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuf || createWhiteNoiseBuffer(ctx, 1);

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(380, now);
  filter.frequency.exponentialRampToValueAtTime(1450, now + 0.22);
  filter.frequency.exponentialRampToValueAtTime(460, now + 0.68);
  filter.Q.value = 1.6;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.42, now + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxMasterGain);
  noise.start(now);
  noise.stop(now + 0.75);
}

export function playExplosionSound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  // Мощный взрыв попадания
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(125, now);
  osc.frequency.exponentialRampToValueAtTime(24, now + 0.58);

  gain.gain.setValueAtTime(0.55, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

  osc.connect(gain);
  gain.connect(sfxMasterGain);
  osc.start(now);
  osc.stop(now + 0.65);

  const noise = ctx.createBufferSource();
  noise.buffer = whiteNoiseBuf || createWhiteNoiseBuffer(ctx, 1);
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(720, now);
  filter.frequency.exponentialRampToValueAtTime(85, now + 0.7);

  const nGain = ctx.createGain();
  nGain.gain.setValueAtTime(0.48, now);
  nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.74);

  noise.connect(filter);
  filter.connect(nGain);
  nGain.connect(sfxMasterGain);
  noise.start(now);
  noise.stop(now + 0.76);
}

export function playThunderSound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const noise = ctx.createBufferSource();
  noise.buffer = pinkNoiseBuf || createPinkNoiseBuffer(ctx, 2);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(220, now);
  filter.frequency.exponentialRampToValueAtTime(60, now + 1.4);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.01, now);
  gain.gain.linearRampToValueAtTime(0.32, now + 0.14);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(sfxMasterGain);
  noise.start(now);
  noise.stop(now + 1.55);
}

// Восклицательный вскрик, когда стреляют по чайке ("Ай-яй-яй!")
export function playGullAngrySound() {
  const ctx = getSfxContext();
  if (!ctx) return;
  const now = ctx.currentTime;

  const notes = [
    { f1: 880, f2: 1920, f3: 1180, t: 0.0, d: 0.17 },
    { f1: 1120, f2: 2150, f3: 940, t: 0.18, d: 0.22 },
  ];

  notes.forEach((n) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";

    osc.frequency.setValueAtTime(n.f1, now + n.t);
    osc.frequency.exponentialRampToValueAtTime(n.f2, now + n.t + n.d * 0.42);
    osc.frequency.exponentialRampToValueAtTime(n.f3, now + n.t + n.d);

    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.linearRampToValueAtTime(0.28, now + n.t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

    osc.connect(gain);
    gain.connect(sfxMasterGain);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  });
}
