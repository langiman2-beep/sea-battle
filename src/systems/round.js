import { player, saveProgress } from "./storage.js";

const PLANNED_SHIPS = 16;
const PLANNED_SHAHEDS = 20;
const SHELLS_PER_BURST = 6;

export const ammo = {
  torpedoes: Math.ceil(PLANNED_SHIPS * 1.15),
  aaShells: Math.ceil(PLANNED_SHAHEDS * SHELLS_PER_BURST * 1.3) + 50,
  rockets: 5,
};

export const roundState = {
  round: player.currentRound || 1,
  timeLeft: 300,
  missed: 0,
  maxMissed: 5,
  status: "playing", // 'playing' | 'lost' | 'won'
};

export function startNextRound() {
  roundState.round = player.currentRound || roundState.round + 1;
  roundState.timeLeft = 300;
  roundState.missed = 0;
  roundState.status = "playing";

  ammo.torpedoes = Math.ceil(PLANNED_SHIPS * 1.15);
  ammo.aaShells = Math.ceil(PLANNED_SHAHEDS * SHELLS_PER_BURST * 1.3) + 50;
  ammo.rockets = 5;
}

function playAlertBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(290, ctx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.31);
  } catch {
    // молча пропускаем, если браузер заблокировал звук
  }
}

function playVictoryFanfare() {
  if (!player.bgSound && !player.music) return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [
      { freq: 523.25, start: 0.0, dur: 0.16 },
      { freq: 659.25, start: 0.15, dur: 0.16 },
      { freq: 783.99, start: 0.3, dur: 0.18 },
      { freq: 1046.5, start: 0.48, dur: 0.55 },
    ];

    notes.forEach((n) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.start);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + n.start);
      gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + n.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + n.start + n.dur,
      );

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + n.start);
      osc.stop(ctx.currentTime + n.start + n.dur + 0.02);
    });
  } catch {
    // молча пропускаем
  }
}

export function registerMiss() {
  if (roundState.status !== "playing") return;
  roundState.missed += 1;
  playAlertBeep();
  if (roundState.missed >= roundState.maxMissed) {
    roundState.status = "lost";
  }
}

export function updateRoundTimer(dt) {
  if (roundState.status !== "playing") return;
  roundState.timeLeft = Math.max(0, roundState.timeLeft - dt);
  if (roundState.timeLeft === 0) {
    roundState.status = "won";
    // Сразу сохраняем следующий раунд, чтобы после отдыха не откатывало назад
    player.currentRound = roundState.round + 1;
    saveProgress();
    playVictoryFanfare();
  }
}
