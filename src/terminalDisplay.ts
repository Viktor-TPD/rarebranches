import * as vscode from 'vscode';
import { Rarity } from './types';

const RESET = '\x1b[0m';

// Each builder returns lines joined with \n — we'll printf the whole thing
const BANNERS: Record<Rarity, (name: string) => string> = {
  common: (name) =>
    `\x1b[38;5;245m  [branch-rarity] ${name} — Common${RESET}`,

  uncommon: (name) => {
    const c = '\x1b[38;5;40m';
    const pad = name.substring(0, 28).padEnd(28);
    return [
      `${c}  ╔══════════════════════════════╗`,
      `  ║  ✦ UNCOMMON BRANCH FOUND ✦   ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════╝${RESET}`,
    ].join('\n');
  },

  rare: (name) => {
    const c = '\x1b[1m\x1b[38;5;33m';
    const pad = name.substring(0, 28).padEnd(28);
    return [
      `${c}  ╔══════════════════════════════╗`,
      `  ║   ★★  RARE BRANCH FOUND  ★★   ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════╝${RESET}`,
    ].join('\n');
  },

  legendary: (name) => {
    const c = '\x1b[1m\x1b[38;5;214m';
    const pad = name.substring(0, 32).padEnd(32);
    return [
      `${c}  ╔══════════════════════════════════╗`,
      `  ║  🔥 LEGENDARY BRANCH FOUND 🔥    ║`,
      `  ║  ${pad}║`,
      `  ╚══════════════════════════════════╝${RESET}`,
    ].join('\n');
  },
};

export function sendBannerToTerminal(branchName: string, rarity: Rarity): void {
  const config = vscode.workspace.getConfiguration('branchRarity');
  if (!config.get<boolean>('showTerminalBanner', true)) return;

  const terminal = vscode.window.activeTerminal;
  if (!terminal) return;

  const banner = BANNERS[rarity](branchName);

  // Escape backslashes and double-quotes for the shell string,
  // then use printf to render ANSI codes without executing them as commands.
  const escaped = banner
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  terminal.sendText(`printf "${escaped}\\n"`, true);
}
