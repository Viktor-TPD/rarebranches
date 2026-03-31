import * as vscode from 'vscode';
import * as fs from 'fs';
import { Rarity } from './types';

const HIT_FILE = '/tmp/branch-rarity-hit';

let currentPanel: vscode.WebviewPanel | undefined;
let closeTimeout: NodeJS.Timeout | undefined;

export function showGachaScreen(branchName: string, rarity: Rarity, onReveal: () => void): void {
  // Dispose any existing panel
  if (currentPanel) {
    clearTimeout(closeTimeout);
    currentPanel.dispose();
    currentPanel = undefined;
  }

  const panel = vscode.window.createWebviewPanel(
    'branchRarity.gacha',
    `Wow! ${branchName}'s true nature is revealed!`,
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  currentPanel = panel;
  panel.webview.html = getWebviewContent(branchName, rarity);

  // Signal the bash script that a gacha is active
  fs.writeFileSync(HIT_FILE, `${rarity}:${branchName}`);

  panel.onDidDispose(() => {
    clearTimeout(closeTimeout);
    currentPanel = undefined;
    try { fs.unlinkSync(HIT_FILE); } catch {}
    onReveal();
  });

  // Webview signals close (button click or animation end)
  panel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'close') panel.dispose();
  });
}

function getWebviewContent(branchName: string, rarity: Rarity): string {
  const configs: Record<Exclude<Rarity, 'common'>, {
    color: string;
    glow: string;
    label: string;
    particleCount: number;
    flash: boolean;
  }> = {
    uncommon: {
      color: '#4CAF50',
      glow: 'rgba(76,175,80,0.6)',
      label: 'UNCOMMON BRANCH',
      particleCount: 40,
      flash: false,
    },
    rare: {
      color: '#2196F3',
      glow: 'rgba(33,150,243,0.6)',
      label: 'RARE BRANCH',
      particleCount: 80,
      flash: false,
    },
    legendary: {
      color: '#FF9800',
      glow: 'rgba(255,152,0,0.8)',
      label: 'LEGENDARY BRANCH',
      particleCount: 150,
      flash: true,
    },
  };

  const cfg = configs[rarity as Exclude<Rarity, 'common'>];

  // Escape branch name for safe HTML insertion
  const safeName = branchName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return /* html */`<!DOCTYPE html>
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
    animation: pulse 1.2s ease-in-out infinite alternate, rainbow 3s linear infinite;
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
</style>
</head>
<body>
<div id="flash"></div>
<canvas id="canvas"></canvas>

<div id="orb"></div>

<div id="reveal">
  <div id="rarity-label">${cfg.label}</div>
  <div id="branch-name">${safeName}</div>
</div>

<button id="dismiss">DISMISS</button>

<script>
  const vscode = acquireVsCodeApi();
  const color = '${cfg.color}';
  const particleCount = ${cfg.particleCount};
  const doFlash = ${cfg.flash};

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
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 3 + Math.random() * 5,
        alpha: 1,
        decay: 0.008 + Math.random() * 0.01,
      });
    }
    if (!rafId) rafId = requestAnimationFrame(tick);
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.alpha > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;
      p.alpha -= p.decay;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
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

  // Phase 1 (1s): faster pulse, orb grows
  setTimeout(() => {
    orb.style.animation = 'pulse 0.4s ease-in-out infinite alternate, rainbow 3s linear infinite';
    orb.style.width = '160px';
    orb.style.height = '160px';
    orb.style.transition = 'width 0.8s ease, height 0.8s ease';
  }, 1000);

  // Phase 2 (3s): violent shake, rainbow speeds up
  setTimeout(() => {
    orb.style.animation = 'shake 0.08s linear infinite, rainbow 0.8s linear infinite';
    orb.style.filter = 'brightness(2)';
  }, 3000);

  // Phase 3 (4s): shake harder, rainbow even faster
  setTimeout(() => {
    orb.style.animation = 'shake 0.08s linear infinite, rainbow 0.3s linear infinite';
    orb.style.filter = 'brightness(3)';
    orb.style.width = '180px';
    orb.style.height = '180px';
  }, 4000);

  // Phase 4 (5s): BURST
  setTimeout(() => {
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

    // Remove orb from layout after burst completes
    setTimeout(() => {
      orb.remove();

      // Reveal floats in
      reveal.classList.add('show');
      setTimeout(() => {
        reveal.classList.remove('show');
        reveal.style.opacity = '1';
        reveal.classList.add('float');
        dismiss.classList.add('show');
      }, 500);
    }, 400);
  }, 5000);
</script>
</body>
</html>`;
}
