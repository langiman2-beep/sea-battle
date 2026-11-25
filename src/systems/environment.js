import bgSrc from "../assets/bg-sea.webp";
import { roundState } from "./round.js";
import { playThunderSound } from "./sound.js";

const bgImg = new Image();
bgImg.src = bgSrc;

let lastEnvTime = 0;
let lastRainTime = 0;

// Состояние молний
const lightning = {
  cooldown: 5.5,
  life: 0,
  maxLife: 0.36,
  points: [],
  branches: [],
};

// Капли дождя (2-й раунд и штормовые ночные раунды 4+)
const rainDrops = Array.from({ length: 140 }, () => ({
  x: Math.random(),
  y: Math.random(),
  speed: 0.95 + Math.random() * 0.65,
  len: 12 + Math.random() * 14,
}));

function spawnLightning(w, horizonY) {
  const startX = w * (0.12 + Math.random() * 0.76);
  const endY = horizonY * (0.72 + Math.random() * 0.25);
  const steps = 8;
  const pts = [{ x: startX, y: 0 }];
  const branches = [];

  let curX = startX;
  for (let i = 1; i <= steps; i++) {
    curX += (Math.random() - 0.5) * (w * 0.055);
    const curY = (endY / steps) * i;
    pts.push({ x: curX, y: curY });

    if (i > 1 && i < steps - 1 && Math.random() < 0.45) {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const b1x = curX + dir * (18 + Math.random() * 28);
      const b1y = curY + 22 + Math.random() * 26;
      const b2x = b1x + dir * (10 + Math.random() * 22);
      const b2y = b1y + 18 + Math.random() * 24;
      branches.push([
        { x: curX, y: curY },
        { x: b1x, y: b1y },
        { x: b2x, y: b2y },
      ]);
    }
  }

  lightning.points = pts;
  lightning.branches = branches;
  lightning.life = lightning.maxLife;
  playThunderSound();
}

function drawMoon(ctx, w, h, time) {
  const mx = w * 0.72;
  const my = h * 0.16;
  const mr = Math.min(w, h) * 0.044;
  const pulse = 0.92 + Math.sin(time * 0.8) * 0.08;

  ctx.save();

  // Широкий лунный ореол в тучах
  const outerGlow = ctx.createRadialGradient(
    mx,
    my,
    mr * 0.4,
    mx,
    my,
    mr * 5.2 * pulse,
  );
  outerGlow.addColorStop(0, "rgba(226, 238, 255, 0.42)");
  outerGlow.addColorStop(0.35, "rgba(148, 184, 235, 0.18)");
  outerGlow.addColorStop(1, "rgba(15, 23, 42, 0)");
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 5.2 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Диск луны
  const discGrad = ctx.createRadialGradient(
    mx - mr * 0.25,
    my - mr * 0.25,
    mr * 0.1,
    mx,
    my,
    mr,
  );
  discGrad.addColorStop(0, "#fffbeb");
  discGrad.addColorStop(0.75, "#e2e8f0");
  discGrad.addColorStop(1, "#94a3b8");

  ctx.fillStyle = discGrad;
  ctx.shadowColor = "rgba(226, 238, 255, 0.85)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  // Лёгкие лунные моря/кратеры (видно в перископ)
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(100, 116, 139, 0.24)";
  ctx.beginPath();
  ctx.arc(mx - mr * 0.28, my - mr * 0.12, mr * 0.24, 0, Math.PI * 2);
  ctx.arc(mx + mr * 0.22, my + mr * 0.2, mr * 0.18, 0, Math.PI * 2);
  ctx.arc(mx + mr * 0.12, my - mr * 0.34, mr * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawEnvironment(ctx, w, h, time) {
  if (!bgImg.complete) return;

  const dt = lastEnvTime
    ? Math.min(0.05, Math.max(0, time - lastEnvTime))
    : 0.016;
  lastEnvTime = time;

  const scale = Math.max(w / bgImg.width, h / bgImg.height);
  const imgW = bgImg.width * scale;
  const imgH = bgImg.height * scale;
  const ox = (w - imgW) / 2;
  const oy = (h - imgH) / 2;
  const horizonY = Math.floor(h * 0.46);

  const isNight = roundState.round >= 3;
  const isStorm = roundState.round === 2 || roundState.round >= 4;

  // 1. Базовый фон
  ctx.drawImage(bgImg, ox, oy, imgW, imgH);

  // Ночное затемнение базового пейзажа в 3-м раунде и выше
  if (isNight) {
    ctx.save();
    ctx.fillStyle = "rgba(5, 13, 30, 0.64)";
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // 2. Живое небо: луна (ночью), ползущие тучи + молнии
  const skyDestH = horizonY - oy;
  const skySrcH = skyDestH / scale;
  const drift = (time * (isStorm ? 26 : 16)) % (imgW * 2);
  const startX = ox + drift - imgW * 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, horizonY);
  ctx.clip();

  // Ночью рисуем луну ДО облачного слоя, чтобы тучи плыли прямо поверх неё
  if (isNight) {
    drawMoon(ctx, w, h, time);
  }

  ctx.globalAlpha = isNight ? 0.56 : 0.42;
  for (let i = 0; i < 3; i++) {
    const x = startX + i * imgW;
    if (i === 1) {
      ctx.save();
      ctx.translate(x + imgW, oy);
      ctx.scale(-1, 1);
      ctx.drawImage(bgImg, 0, 0, bgImg.width, skySrcH, 0, 0, imgW, skyDestH);
      ctx.restore();
    } else {
      ctx.drawImage(bgImg, 0, 0, bgImg.width, skySrcH, x, oy, imgW, skyDestH);
    }
  }

  // Тёмно-синяя вуаль поверх ночных туч
  if (isNight) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(6, 15, 36, 0.46)";
    ctx.fillRect(0, 0, w, horizonY);
  } else {
    // Дневной солнечный просвет
    ctx.globalAlpha = 1;
    const glowAlpha = (isStorm ? 0.03 : 0.08) + Math.sin(time * 1.4) * 0.03;
    const glow = ctx.createRadialGradient(
      w * 0.34,
      h * 0.24,
      10,
      w * 0.34,
      h * 0.24,
      w * 0.32,
    );
    glow.addColorStop(0, `rgba(255, 244, 214, ${glowAlpha})`);
    glow.addColorStop(1, "rgba(255, 244, 214, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, horizonY);
  }

  // Обновление и отрисовка молний
  lightning.cooldown -= dt;
  if (lightning.cooldown <= 0) {
    spawnLightning(w, horizonY);
    lightning.cooldown = isStorm
      ? 3.8 + Math.random() * 4.5
      : 7.5 + Math.random() * 7.5;
  }

  if (lightning.life > 0) {
    lightning.life = Math.max(0, lightning.life - dt);
    const ratio = lightning.life / lightning.maxLife;
    const flicker = ratio > 0.72 || (ratio > 0.25 && ratio < 0.55) ? 1 : 0.35;
    const alpha = ratio * flicker;

    ctx.fillStyle = `rgba(205, 228, 255, ${alpha * 0.32})`;
    ctx.fillRect(0, 0, w, horizonY);

    if (lightning.points.length > 1) {
      ctx.save();
      ctx.strokeStyle = `rgba(224, 242, 254, ${alpha * 0.95})`;
      ctx.shadowColor = "#93c5fd";
      ctx.shadowBlur = 14;
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
      for (let i = 1; i < lightning.points.length; i++) {
        ctx.lineTo(lightning.points[i].x, lightning.points[i].y);
      }
      ctx.stroke();

      ctx.lineWidth = 1.3;
      lightning.branches.forEach((br) => {
        ctx.beginPath();
        ctx.moveTo(br[0].x, br[0].y);
        for (let k = 1; k < br.length; k++) {
          ctx.lineTo(br[k].x, br[k].y);
        }
        ctx.stroke();
      });
      ctx.restore();
    }
  }
  ctx.restore();

  // 3. Живое море и прибой по маске бухты
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, horizonY);
  ctx.lineTo(w, horizonY);
  ctx.lineTo(w, h * 0.61);
  ctx.lineTo(w * 0.72, h * 0.68);
  ctx.lineTo(w * 0.5, h * 0.77);
  ctx.lineTo(w * 0.3, h * 0.69);
  ctx.lineTo(0, h * 0.61);
  ctx.closePath();
  ctx.clip();

  const seaBottom = Math.floor(h * 0.77);
  const sliceH = 4;

  for (let y = horizonY; y < seaBottom; y += sliceH) {
    const depth = (y - horizonY) / (seaBottom - horizonY);
    const waveMult = isStorm ? 1.35 : 1;
    const shiftX = Math.sin(time * 2.2 + y * 0.08) * (1 + depth * 5) * waveMult;
    const shiftY = Math.sin(time * 1.6 + depth * 3) * (depth * 4) * waveMult;
    const sy = (y - oy) / scale;
    const sh = sliceH / scale;
    ctx.drawImage(
      bgImg,
      0,
      sy,
      bgImg.width,
      sh,
      ox + shiftX,
      y + shiftY,
      imgW,
      sliceH + 2,
    );
  }

  if (isNight) {
    ctx.fillStyle = "rgba(5, 14, 34, 0.52)";
    ctx.fillRect(0, horizonY, w, seaBottom - horizonY);

    // Мерцающая лунная дорожка на волнах под луной
    const moonX = w * 0.72;
    for (let y = horizonY + 4; y < seaBottom - 8; y += 6) {
      const depth = (y - horizonY) / (seaBottom - horizonY);
      const shimmer = 0.5 + 0.5 * Math.sin(time * 3.2 + y * 0.35);
      const halfW = (6 + depth * 28) * (0.7 + shimmer * 0.5);
      const waveOffset = Math.sin(time * 2.4 + y * 0.12) * (2 + depth * 7);

      ctx.fillStyle = `rgba(219, 234, 254, ${(0.08 + shimmer * 0.14) * (1 - depth * 0.35)})`;
      ctx.beginPath();
      ctx.ellipse(moonX + waveOffset, y, halfW, 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawRain(ctx, w, h, time) {
  const hasRain = roundState.round === 2 || roundState.round >= 4;
  if (!hasRain) {
    lastRainTime = time;
    return;
  }

  const dt = lastRainTime
    ? Math.min(0.05, Math.max(0, time - lastRainTime))
    : 0.016;
  lastRainTime = time;

  ctx.save();
  ctx.fillStyle = "rgba(8, 18, 32, 0.2)";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(186, 214, 245, 0.42)";
  ctx.lineWidth = 1.25;
  ctx.beginPath();

  const windX = -0.18;
  for (let i = 0; i < rainDrops.length; i++) {
    const d = rainDrops[i];
    d.y += d.speed * dt;
    d.x += windX * d.speed * dt;

    if (d.y > 1.04) {
      d.y = -0.04;
      d.x = Math.random();
    }
    if (d.x < -0.05) d.x += 1.1;

    const x = d.x * w;
    const y = d.y * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + windX * d.len * 1.6, y + d.len);
  }

  ctx.stroke();
  ctx.restore();
}
