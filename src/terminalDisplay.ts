import * as vscode from 'vscode';
import { Rarity } from './types';

// Use \033 octal escapes — printf interprets these natively without
// needing -e or $'...' shell quoting tricks.
const R = '\\033[0m';
const BANNERS: Record<Exclude<Rarity, 'common'>, (name: string) => string> = {
  uncommon: (name) => {
    const c = '\\033[38;5;40m';
    const pad = name.substring(0, 28).padEnd(28);
    return [
      `${c}  ╔══════════════════════════════╗`,
      `  ║  ✦ UNCOMMON BRANCH FOUND ✦   ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════╝${R}`,
    ].join('\\n');
  },

  rare: (name) => {
    const c = '\\033[1m\\033[38;5;33m';
    const pad = name.substring(0, 28).padEnd(28);
    return [
      `${c}  ╔══════════════════════════════╗`,
      `  ║   ★★  RARE BRANCH FOUND  ★★   ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════╝${R}`,
    ].join('\\n');
  },

  legendary: (name) => {
    const c = '\\033[1m\\033[38;5;214m';
    const pad = name.substring(0, 32).padEnd(32);
    return [
      `${c}  ╔══════════════════════════════════╗`,
      `  ║  🔥 LEGENDARY BRANCH FOUND 🔥    ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════════╝${R}`,
    ].join('\\n');
  },
};

export function sendBannerToTerminal(branchName: string, rarity: Rarity): void {
  if (rarity === 'common') return;

  const config = vscode.workspace.getConfiguration('branchRarity');
  if (!config.get<boolean>('showTerminalBanner', true)) return;

  const terminal = vscode.window.activeTerminal;
  if (!terminal) return;

  // printf interprets \033 and \n natively — no shell escaping needed for ANSI.
  // We only need to escape single-quotes in the branch name itself.
  const banner = BANNERS[rarity](branchName).replace(/'/g, "'\\''");
  terminal.sendText(`printf '${banner}\\n'`, true);
}
