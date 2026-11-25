import gullSrc from "../assets/gull.webp";
import { playGullAngrySound } from "../systems/sound.js";

function loadSprite(src) {
  const ready = document.createElement("canvas");
  ready.width = 0;
  ready.height = 0;
  const img = new Image();
  img.onload = () => {
    ready.width = img.width;
    ready.height = img.height;
    const c = ready.getContext("2d");
    c.drawImage(img, 0, 0);
    const frame = c.getImageData(0, 0, ready.width, ready.height);
    const d = frame.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i],
        g = d[i + 1],
        b = d[i + 2];
      const x = (i / 4) % ready.width;
      const y = Math.floor(i / 4 / ready.width);
      const magenta = Math.min(r, b) - g;

      if (magenta > 18 || (x > ready.width * 0.88 && y > ready.height * 0.88)) {
        d[i + 3] = 0;
      } else if (magenta > 0) {
        d[i] = Math.min(r, g + 8);
        d[i + 2] = Math.min(b, g + 8);
      }
    }
    c.putImageData(frame, 0, 0);
  };
  img.src = src;
  return ready;
}

const gullSprite = loadSprite(gullSrc);

export const gulls = [];
const callouts = [];

function createGull(randomX = false) {
  const dir = Math.random() > 0.5 ? 1 : -1;
  const baseY = 0.08 + Math.random() * 0.27;
  const scale = 0.72 + Math.random() * 0.55;
  return {
    x: randomX ? Math.random() : dir === 1 ? -0.07 : 1.07,
    y: baseY,
    baseY,
    dir,
    scale,
    speed: (0.017 + Math.random() * 0.015) * (0.85 + scale * 0.2),
    flapSpeed: 3.4 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    scared: 0,
    calloutCooldown: 0,
  };
}

for (let i = 0; i < 4; i++) {
  gulls.push(createGull(true));
}

export function checkGullShot(px, py, w, h) {
  const baseHit = Math.min(w, h) * 0.036;

  for (let i = 0; i < gulls.length; i++) {
    const g = gulls[i];
    const gx = g.x * w;
    const gy = g.y * h;
    if (Math.hypot(px - gx, py - gy) < baseHit * g.scale) {
      g.scared = 1.8;
      if (g.calloutCooldown <= 0) {
        g.calloutCooldown = 2.0;
        playGullAngrySound();
        callouts.push({
          lines: ["Ти що, псих?", "Що тобі чайка зробила?"],
          nx: g.x,
          ny: g.y,
          offsetY: 0,
          alpha: 1,
          life: 2.8,
        });
      }
      return true;
    }
  }
  return false;
}

export function updateGulls(dt) {
  for (let i = 0; i < gulls.length; i++) {
    const g = gulls[i];
    if (g.calloutCooldown > 0) g.calloutCooldown -= dt;

    let speedMult = 1;
    if (g.scared > 0) {
      g.scared = Math.max(0, g.scared - dt);
      speedMult = 2.2;
      g.baseY = Math.max(0.06, g.baseY - dt * 0.045);
    }

    g.x += g.speed * speedMult * g.dir * dt;
    g.phase += dt * g.flapSpeed * (g.scared > 0 ? 1.9 : 1);
    g.y = g.baseY + Math.sin(g.phase * 0.6) * 0.011;

    if ((g.dir === 1 && g.x > 1.08) || (g.dir === -1 && g.x < -0.08)) {
      gulls[i] = createGull(false);
    }
  }

  for (let i = callouts.length - 1; i >= 0; i--) {
    const c = callouts[i];
    c.offsetY -= 16 * dt;
    c.life -= dt;
    if (c.life < 0.7) {
      c.alpha = Math.max(0, c.life / 0.7);
    }
    if (c.life <= 0) callouts.splice(i, 1);
  }
}

export function drawGulls(ctx, w, h, time) {
  if (!gullSprite.width) return;

  const baseW = Math.min(w, h) * 0.075;

  gulls.forEach((g) => {
    const gx = g.x * w;
    const gy = g.y * h;
    const gw = baseW * g.scale;
    const gh = gw * (gullSprite.height / gullSprite.width);

    const tilt = Math.sin(g.phase * 0.6) * 0.09;
    const flapScaleY = 0.88 + Math.sin(g.phase) * 0.14;

    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(g.dir, flapScaleY);
    ctx.rotate(tilt);
    ctx.drawImage(gullSprite, -gw / 2, -gh / 2, gw, gh);
    ctx.restore();
  });
}

export function drawGullCallouts(ctx, w, h, isScope) {
  if (!callouts.length) return;

  const r = Math.min(w, h) * 0.43;

  callouts.forEach((c) => {
    const fontSize = isScope
      ? Math.max(13, Math.min(18, Math.round(r * 0.092)))
      : 18;
    const lineH = Math.round(fontSize * 1.28);

    ctx.save();
    ctx.globalAlpha = Math.max(0, c.alpha);
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const maxW = Math.max(
      ...c.lines.map((line) => ctx.measureText(line).width),
    );
    const padX = 14;
    const padY = 8;
    const boxW = maxW + padX * 2;
    const boxH = lineH * c.lines.length + padY * 2;

    let cx;
    let cy;
    if (isScope) {
      cx = w / 2;
      cy = h / 2 - r * 0.28 + c.offsetY * 0.35;
    } else {
      cx = Math.max(boxW / 2 + 12, Math.min(w - boxW / 2 - 12, c.nx * w));
      cy = Math.max(boxH / 2 + 64, c.ny * h - 34 + c.offsetY);
    }

    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fde047";
    c.lines.forEach((line, idx) => {
      const ly = cy - boxH / 2 + padY + lineH * idx + lineH / 2;
      ctx.fillText(line, cx, ly);
    });

    ctx.restore();
  });
}
