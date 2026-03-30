import * as vscode from 'vscode';
import { Rarity } from './types';

let currentPanel: vscode.WebviewPanel | undefined;
let closeTimeout: NodeJS.Timeout | undefined;

export function showGachaScreen(branchName: string, rarity: Rarity): void {
  // Dispose any existing panel
  if (currentPanel) {
    clearTimeout(closeTimeout);
    currentPanel.dispose();
    currentPanel = undefined;
  }

  const panel = vscode.window.createWebviewPanel(
    'branchRarity.gacha',
    'Branch Rarity',
    vscode.ViewColumn.Beside,
    { enableScripts: true }
  );

  currentPanel = panel;

  panel.webview.html = getWebviewContent(branchName, rarity);

  // Auto-close after 3 seconds
  closeTimeout = setTimeout(() => {
    if (!panel.visible) return;
    panel.dispose();
  }, 3000);

  panel.onDidDispose(() => {
    clearTimeout(closeTimeout);
    currentPanel = undefined;
  });

  // Allow webview to request early close
  panel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'close') panel.dispose();
  });
}

function getWebviewContent(branchName: string, rarity: Rarity): string {
  const configs: Record<Exclude<Rarity, 'common'>, {
    color: string;
    glow: string;
    label: string;
    emoji: string;
    particleCount: number;
    flash: boolean;
  }> = {
    uncommon: {
      color: '#4CAF50',
      glow: 'rgba(76,175,80,0.6)',
      label: 'UNCOMMON',
      emoji: '✦',
      particleCount: 30,
      flash: false,
    },
    rare: {
      color: '#2196F3',
      glow: 'rgba(33,150,243,0.6)',
      label: 'RARE',
      emoji: '★',
      particleCount: 50,
      flash: false,
    },
    legendary: {
      color: '#FF9800',
      glow: 'rgba(255,152,0,0.8)',
      label: 'LEGENDARY',
      emoji: '🔥',
      particleCount: 100,
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

  #scene {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    position: relative;
    z-index: 1;
  }

  #orb {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #fff, ${cfg.color});
    box-shadow: 0 0 40px ${cfg.glow}, 0 0 80px ${cfg.glow};
    animation: pulse 0.6s ease-in-out infinite alternate;
  }

  #orb.burst {
    animation: burst 0.3s ease-out forwards;
  }

  #reveal {
    text-align: center;
    opacity: 0;
    transform: scale(0.5);
    transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
  }

  #reveal.show {
    opacity: 1;
    transform: scale(1);
  }

  #rarity-label {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 4px;
    color: ${cfg.color};
    text-shadow: 0 0 12px ${cfg.glow};
    margin-bottom: 8px;
  }

  #branch-name {
    font-size: 22px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 0 20px ${cfg.glow};
    max-width: 280px;
    word-break: break-all;
    text-align: center;
  }

  #emoji {
    font-size: 32px;
    margin-bottom: 4px;
  }

  canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;
  }

  @keyframes pulse {
    from { box-shadow: 0 0 30px ${cfg.glow}, 0 0 60px ${cfg.glow}; transform: scale(1); }
    to   { box-shadow: 0 0 60px ${cfg.glow}, 0 0 120px ${cfg.glow}; transform: scale(1.08); }
  }

  @keyframes burst {
    0%   { transform: scale(1); opacity: 1; }
    60%  { transform: scale(2.5); opacity: 0.6; }
    100% { transform: scale(0); opacity: 0; }
  }

  @keyframes fadeOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }
</style>
</head>
<body>
<div id="flash"></div>
<canvas id="canvas"></canvas>

<div id="scene">
  <div id="orb"></div>
  <div id="reveal">
    <div id="emoji">${cfg.emoji}</div>
    <div id="rarity-label">${cfg.label}</div>
    <div id="branch-name">${safeName}</div>
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();
  const color = '${cfg.color}';
  const particleCount = ${cfg.particleCount};
  const doFlash = ${cfg.flash};

  // --- Particle system ---
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animating = false;

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
      const speed = 2 + Math.random() * 6;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 3 + Math.random() * 4,
        alpha: 1,
        decay: 0.015 + Math.random() * 0.015,
        color: color,
      });
    }
    if (!animating) {
      animating = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => p.alpha > 0);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // gravity
      p.alpha -= p.decay;
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (particles.length > 0) {
      requestAnimationFrame(tick);
    } else {
      animating = false;
    }
  }

  // --- Animation sequence ---
  const orb = document.getElementById('orb');
  const reveal = document.getElementById('reveal');
  const flash = document.getElementById('flash');

  // 0.8s — orb shakes
  setTimeout(() => {
    orb.style.animation = 'pulse 0.15s ease-in-out infinite alternate';
    orb.style.filter = 'brightness(1.5)';
  }, 800);

  // 1.4s — burst, reveal, particles
  setTimeout(() => {
    orb.classList.add('burst');

    if (doFlash) {
      flash.style.transition = 'opacity 0.08s ease';
      flash.style.opacity = '0.9';
      setTimeout(() => {
        flash.style.transition = 'opacity 0.3s ease';
        flash.style.opacity = '0';
      }, 80);
    }

    spawnParticles();

    setTimeout(() => {
      reveal.classList.add('show');
    }, 100);
  }, 1400);

  // 2.7s — start fade out
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.3s ease';
    document.body.style.opacity = '0';
  }, 2700);

  // 3.0s — close
  setTimeout(() => {
    vscode.postMessage({ type: 'close' });
  }, 3000);
</script>
</body>
</html>`;
}
