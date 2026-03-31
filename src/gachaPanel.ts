import * as vscode from "vscode";
import * as fs from "fs";
import { Rarity, Modifier } from "./types";

const HIT_FILE = "/tmp/branch-rarity-hit";

let currentPanel: vscode.WebviewPanel | undefined;
let closeTimeout: NodeJS.Timeout | undefined;

export function showGachaScreen(
  branchName: string,
  rarity: Rarity,
  modifier: Modifier | undefined,
  onReveal: () => void,
): void {
  // Dispose any existing panel
  if (currentPanel) {
    clearTimeout(closeTimeout);
    currentPanel.dispose();
    currentPanel = undefined;
  }

  const panel = vscode.window.createWebviewPanel(
    "branchRarity.gacha",
    `Wow! ${branchName}'s true nature is revealed!`,
    vscode.ViewColumn.Beside,
    { enableScripts: true },
  );

  currentPanel = panel;
  panel.webview.html = getWebviewContent(branchName, rarity, modifier);

  // Signal the bash script that a gacha is active
  fs.writeFileSync(HIT_FILE, `${rarity}:${branchName}`);

  panel.onDidDispose(() => {
    clearTimeout(closeTimeout);
    currentPanel = undefined;
    try {
      fs.unlinkSync(HIT_FILE);
    } catch {}
    onReveal();
  });

  // Webview signals close (button click or animation end)
  panel.webview.onDidReceiveMessage((msg) => {
    if (msg.type === "close") panel.dispose();
  });
}

function darkenHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

function darkenRgba(rgba: string, amount: number): string {
  return rgba.replace(
    /[\d.]+(?=,[\d.]+\))|[\d.]+(?=\))/g,
    (m, _offset, str) => {
      // Only darken RGB parts (first 3 numbers), not the alpha
      const parts = str.match(/[\d.]+/g) as string[];
      const idx = parts.indexOf(m);
      return idx < 3
        ? String(Math.max(0, Math.round(parseFloat(m) * (1 - amount))))
        : m;
    },
  );
}

function getWebviewContent(
  branchName: string,
  rarity: Rarity,
  modifier: Modifier | undefined,
): string {
  const baseConfigs: Record<
    Exclude<Rarity, "common">,
    {
      color: string;
      glow: string;
      label: string;
      particleCount: number;
      flash: boolean;
    }
  > = {
    uncommon: {
      color: "#4CAF50",
      glow: "rgba(76,175,80,0.6)",
      label: "UNCOMMON BRANCH",
      particleCount: 40,
      flash: false,
    },
    rare: {
      color: "#2196F3",
      glow: "rgba(33,150,243,0.6)",
      label: "RARE BRANCH",
      particleCount: 80,
      flash: false,
    },
    legendary: {
      color: "#FF9800",
      glow: "rgba(255,152,0,0.8)",
      label: "LEGENDARY BRANCH",
      particleCount: 150,
      flash: true,
    },
  };

  const base = baseConfigs[rarity as Exclude<Rarity, "common">];

  // Apply modifier overrides
  const modPrefix = modifier ? modifier.toUpperCase() + " " : "";
  const cfg = {
    ...base,
    label: modPrefix + base.label,
    color: modifier === "dark" ? darkenHex(base.color, 0.3) : base.color,
    glow: modifier === "dark" ? darkenRgba(base.glow, 0.3) : base.glow,
  };

  // Escape branch name for safe HTML insertion
  const safeName = branchName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0d0d0d;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-family: 'Segoe UI', system-ui, sans-serif;
  }

  #flash {
    position: fixed;
    inset: 0;
    background: white;
    opacity: 0;
    pointer-events: none;
    z-index: 100;
  }

  canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  /* The orb — rainbow hue cycles during suspense, color revealed on burst */
  #orb {
    position: relative;
    width: 140px;
    height: 140px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff 0%, #e05050 60%, #111 100%);
    box-shadow: 0 0 40px rgba(220,80,80,0.5), 0 0 80px rgba(220,80,80,0.25);
    animation: orbFadeIn 2.2s ease-out forwards, pulse 1.2s ease-in-out infinite alternate;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
    cursor: default;
  }

  /* Reveal — floats after burst, orb is gone */
  #reveal {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    opacity: 0;
    z-index: 2;
  }

  #reveal.show {
    animation: revealIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
  }

  #reveal.float {
    animation: float 3s ease-in-out infinite;
  }

  #rarity-label {
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 4px;
    color: ${cfg.color};
    text-shadow: 0 0 10px ${cfg.glow};
    margin-bottom: 10px;
  }

  #branch-name {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 20px ${cfg.glow}, 0 0 40px ${cfg.glow};
    word-break: break-all;
    max-width: 260px;
    line-height: 1.3;
  }

  /* Dismiss button — hidden until reveal */
  #dismiss {
    margin-top: 36px;
    padding: 8px 28px;
    background: transparent;
    border: 1px solid ${cfg.color};
    color: ${cfg.color};
    font-size: 12px;
    letter-spacing: 2px;
    cursor: pointer;
    border-radius: 2px;
    opacity: 0;
    transition: opacity 0.4s ease, background 0.2s ease;
    z-index: 1;
  }

  #dismiss.show {
    opacity: 1;
  }

  #dismiss:hover {
    background: ${cfg.color}22;
  }

  @keyframes orbFadeIn {
    from { opacity: 0; transform: scale(0.6); }
    to   { opacity: 1; transform: scale(1); }
  }

  @keyframes pulse {
    from { transform: scale(1); }
    to   { transform: scale(1.07); }
  }

  @keyframes rainbow {
    0%   { filter: hue-rotate(0deg)   brightness(1.2); }
    100% { filter: hue-rotate(360deg) brightness(1.2); }
  }

  @keyframes screenshake {
    0%,100% { transform: translate(0, 0); }
    10%     { transform: translate(-8px, -4px); }
    20%     { transform: translate(8px, 4px); }
    30%     { transform: translate(-6px, 6px); }
    40%     { transform: translate(6px, -6px); }
    50%     { transform: translate(-10px, 2px); }
    60%     { transform: translate(10px, -2px); }
    70%     { transform: translate(-4px, -8px); }
    80%     { transform: translate(4px, 8px); }
    90%     { transform: translate(-6px, -4px); }
  }

  @keyframes shake {
    0%,100% { transform: translate(0,0) scale(1.1); }
    20%      { transform: translate(-4px, 2px) scale(1.12); }
    40%      { transform: translate(4px, -2px) scale(1.09); }
    60%      { transform: translate(-3px, -3px) scale(1.13); }
    80%      { transform: translate(3px, 3px) scale(1.10); }
  }

  @keyframes burst {
    0%   { transform: scale(1.1);  opacity: 1; }
    50%  { transform: scale(3);    opacity: 0.5; background: radial-gradient(circle, #fff, ${cfg.color}); }
    100% { transform: scale(4.5);  opacity: 0; }
  }

  @keyframes revealIn {
    from { opacity: 0; transform: translateY(20px) scale(0.8); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-12px); }
  }

  /* Glass modifier — frosted panel + travelling light sheen */
  ${
    modifier === "glass"
      ? `
  @keyframes glassSheen {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  #reveal.glass-panel {
    position: relative;
    background: rgba(255,255,255,0.08);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 12px;
    padding: 28px 36px;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    box-shadow: 0 4px 32px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.2);
    overflow: hidden;
  }
  #reveal.glass-panel::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.35) 50%, transparent 65%);
    background-size: 200% 100%;
    animation: glassSheen 2.4s ease-in-out infinite;
    mix-blend-mode: screen;
    pointer-events: none;
    border-radius: 12px;
  }
  `
      : ""
  }

  /* Dark modifier */
  ${
    modifier === "dark"
      ? `
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
    pointer-events: none;
    z-index: 0;
  }
  `
      : ""
  }

  /* Gold modifier — golden text with sheen sweeping through the letters */
  ${modifier === 'gold' ? `
  @keyframes goldSheen {
    0%   { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  #rarity-label {
    background: linear-gradient(105deg, #FFD700 30%, #ffffff 50%, #FFD700 70%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: goldSheen 3s ease-in-out infinite;
    text-shadow: none;
  }
  #branch-name {
    background: linear-gradient(105deg, #FFD700 30%, #ffffff 50%, #FFD700 70%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: goldSheen 3s ease-in-out infinite;
    text-shadow: none;
  }
  #dismiss {
    border-color: #FFD700;
    color: #FFD700;
  }
  #dismiss:hover {
    background: rgba(255,215,0,0.1) !important;
  }
  ` : ''}

  /* Foiled modifier — rainbow letters only, no shimmer overlay */
  ${
    modifier === "foiled"
      ? `
  @keyframes foilShimmer {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  #rarity-label {
    background: linear-gradient(90deg, #ff0080, #ff8c00, #ffe600, #00ff80, #00cfff, #cc00ff, #ff0080);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: foilShimmer 2s linear infinite;
    text-shadow: none;
  }
  #branch-name {
    background: linear-gradient(90deg, #ff0080, #ff8c00, #ffe600, #00ff80, #00cfff, #cc00ff, #ff0080);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: foilShimmer 2s linear infinite;
    text-shadow: none;
  }
  #dismiss {
    background: linear-gradient(90deg, #ff0080, #ff8c00, #ffe600, #00ff80, #00cfff, #cc00ff, #ff0080) !important;
    background-size: 200% auto !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    background-clip: text !important;
    animation: foilShimmer 2s linear infinite !important;
    border-color: #cc00ff !important;
  }
  `
      : ""
  }
</style>
</head>
<body>
<div id="flash"></div>
<canvas id="canvas"></canvas>

<div id="orb"></div>

<div id="reveal"${modifier === "glass" ? ' class="glass-panel"' : ""}>
  <div id="rarity-label">${cfg.label}</div>
  <div id="branch-name">${safeName}</div>
</div>

<button id="dismiss">DISMISS</button>

<script>
  const vscode = acquireVsCodeApi();
  const color = '${cfg.color}';
  const particleCount = ${cfg.particleCount};
  const doFlash = ${cfg.flash};
  const MODIFIER = '${modifier ?? ""}';

  // --- Particle system ---
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let rafId = null;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnParticles() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    for (let i = 0; i < particleCount; i++) {
      if (MODIFIER === 'dark') {
        // Ooze from top, heavy fall
        const darkColors = ['#3a0057', '#5c0080', '#220033', '#4a006e', '#1a0026'];
        particles.push({
          x: Math.random() * canvas.width,
          y: -10 - Math.random() * 40,
          vx: (Math.random() - 0.5) * 1.2,
          vy: 1.5 + Math.random() * 3,
          size: 4 + Math.random() * 6,
          alpha: 0.85 + Math.random() * 0.15,
          decay: 0.004 + Math.random() * 0.006,
          gravity: 0.22,
          shape: 'circle',
          color: darkColors[Math.floor(Math.random() * darkColors.length)],
          hue: null,
        });
      } else if (MODIFIER === 'glass') {
        // Sparkle crosses, slow drift upward
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2,
          size: 4 + Math.random() * 4,
          alpha: 0.8 + Math.random() * 0.2,
          decay: 0.005 + Math.random() * 0.007,
          gravity: 0.02,
          shape: 'sparkle',
          color: '#ffffff',
          hue: null,
        });
      } else if (MODIFIER === 'foiled') {
        // Multicolor burst
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 3 + Math.random() * 5,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.01,
          gravity: 0.12,
          shape: 'circle',
          color: null,
          hue: Math.random() * 360,
        });
      } else {
        // Default burst
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 8;
        particles.push({
          x: cx, y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          size: 3 + Math.random() * 5,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.01,
          gravity: 0.12,
          shape: 'circle',
          color: color,
          hue: null,
        });
      }
    }
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16), bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff, ag = (ah >> 8) & 0xff, ab = ah & 0xff;
    const br = (bh >> 16) & 0xff, bg = (bh >> 8) & 0xff, bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return '#' + [r, g, bl].map(c => c.toString(16).padStart(2, '0')).join('');
  }

  function drawSparkle(x, y, size, alpha, sparkleColor) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillStyle = sparkleColor || '#ffffff';
    ctx.translate(x, y);
    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.2, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.alpha > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      if (p.maxVy !== undefined) p.vy = Math.min(p.vy, p.maxVy);
      p.alpha -= p.decay;
      if (p.hue !== null) p.hue += 1.5;
      const fillColor = p.hue !== null ? 'hsl(' + (p.hue % 360) + ',100%,65%)' : p.color;
      if (p.shape === 'sparkle') {
        const sparkleColor = p.goldFade
          ? lerpColor('#ffffff', '#FFD700', 1 - p.alpha)
          : (p.color || '#ffffff');
        drawSparkle(p.x, p.y, p.size, p.alpha, sparkleColor);
      } else {
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    rafId = particles.length > 0 ? requestAnimationFrame(tick) : null;
  }

  // --- Sequence ---
  const orb = document.getElementById('orb');
  const reveal = document.getElementById('reveal');
  const flash = document.getElementById('flash');
  const dismiss = document.getElementById('dismiss');

  dismiss.addEventListener('click', () => vscode.postMessage({ type: 'close' }));

  // Continuously drive hue and orb size on an easing curve over 5 seconds
  const BURST_AT = 5000;
  const startTime = performance.now();
  let hue = 0;
  let burst = false;

  function animateOrb(now) {
    if (burst) return;
    const elapsed = now - startTime;
    const t = Math.min(elapsed / BURST_AT, 1); // 0 → 1 over 5s

    // Exponential ease: visibly moving from frame 1, explosive at the end
    // t=0 → eased=0, t=1 → eased=1, but with steep acceleration
    const eased = t === 0 ? 0 : Math.pow(2, 10 * t - 10);

    // Hue speed: ~60deg/s at start, clamped at 75% of original ceiling, 66% slower overall
    const degPerMs = Math.min((0.06 + eased * 3) * 0.34, 2.25 * 0.34);
    hue += degPerMs * (now - (animateOrb.last || now));
    animateOrb.last = now;

    // Size grows from 140 → 185px on the same curve
    const size = 140 + eased * 45;
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';

    // Brightness ramps 1 → 4
    const brightness = 1 + eased * 3;

    // Switch from pulse to shake when eased > 0.35
    const shakeSpeed = eased > 0.35 ? '0.08s' : null;
    if (shakeSpeed && !orb.dataset.shaking) {
      orb.dataset.shaking = '1';
      orb.style.animation = 'shake 0.08s linear infinite';
    }

    orb.style.filter = 'hue-rotate(' + (hue % 360) + 'deg) brightness(' + brightness.toFixed(2) + ')';

    if (t < 1) {
      requestAnimationFrame(animateOrb);
    } else {
      doBurst();
    }
  }
  animateOrb.last = null;
  requestAnimationFrame(animateOrb);

  function doBurst() {
    burst = true;

    if (doFlash) {
      flash.style.transition = 'opacity 0.06s';
      flash.style.opacity = '1';
      setTimeout(() => {
        flash.style.transition = 'opacity 0.4s';
        flash.style.opacity = '0';
      }, 60);
    }

    orb.style.animation = 'burst 0.4s ease-out forwards';
    orb.style.filter = 'brightness(1)';
    spawnParticles();

    if (doFlash) {
      document.body.style.animation = 'screenshake 0.5s ease-out';
      setTimeout(() => { document.body.style.animation = ''; }, 500);
    }

    setTimeout(() => {
      orb.remove();
      reveal.classList.add('show');
      setTimeout(() => {
        reveal.classList.remove('show');
        reveal.style.opacity = '1';
        reveal.classList.add('float');
        dismiss.classList.add('show');

        if (MODIFIER === 'gold') {
          let goldActive = true;
          dismiss.addEventListener('click', () => { goldActive = false; }, { once: true });
          (function goldStarTick() {
            if (!goldActive) return;
            const delay = 3000 + Math.random() * 2000;
            setTimeout(() => {
              if (!goldActive) return;
              const rect = reveal.getBoundingClientRect();
              particles.push({
                x: rect.left + Math.random() * rect.width,
                y: rect.top  + Math.random() * rect.height,
                vx: (Math.random() - 0.5) * 0.3,
                vy: -0.15 - Math.random() * 0.2,
                maxVy: undefined,
                size: 6 + Math.random() * 6,
                alpha: 1,
                decay: 0.007 + Math.random() * 0.005,
                gravity: 0,
                shape: 'sparkle',
                color: '#FFD700',
                goldFade: true,
                hue: null,
              });
              if (!rafId) rafId = requestAnimationFrame(tick);
              goldStarTick();
            }, delay);
          })();
        }

        if (MODIFIER === 'dark') {
          const darkColors = ['#3a0057', '#5c0080', '#220033', '#4a006e', '#1a0026'];
          let dripActive = true;
          dismiss.addEventListener('click', () => { dripActive = false; }, { once: true });
          (function dripTick() {
            if (!dripActive) return;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;
            const count = 1 + Math.floor(Math.random() * 1.25);
            for (let i = 0; i < count; i++) {
              particles.push({
                x: cx + (Math.random() - 0.5) * 120,
                y: cy + (Math.random() - 0.5) * 40,
                vx: (Math.random() - 0.5) * 0.27,
                vy: (1 + Math.random() * 2) * 0.04,
                maxVy: 0.35,
                size: 3 + Math.random() * 5,
                alpha: 0.7 + Math.random() * 0.3,
                decay: 0.006 + Math.random() * 0.006,
                gravity: 0.03,
                shape: 'circle',
                color: darkColors[Math.floor(Math.random() * darkColors.length)],
                hue: null,
              });
            }
            if (!rafId) rafId = requestAnimationFrame(tick);
            setTimeout(dripTick, 100 + Math.random() * 80);
          })();
        }
      }, 500);
    }, 400);
  }
</script>
</body>
</html>`;
}
