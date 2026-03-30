import * as vscode from 'vscode';
import { Rarity, BranchRecord, RarityStyle } from './types';

const STATE_KEY = 'branchRarity.knownBranches';

export function rollRarity(): Rarity {
  const roll = Math.random();
  if (roll < 1 / 100) return 'legendary';
  if (roll < 1 / 50)  return 'rare';
  if (roll < 1 / 20)  return 'uncommon';
  return 'common';
}

export function getOrAssignRarity(
  branchName: string,
  state: vscode.Memento
): { record: BranchRecord; isNew: boolean } {
  const map: Record<string, BranchRecord> = state.get(STATE_KEY, {});
  const existing = map[branchName];
  if (existing) {
    return { record: existing, isNew: false };
  }
  const record: BranchRecord = {
    rarity: rollRarity(),
    discoveredAt: Date.now(),
  };
  map[branchName] = record;
  state.update(STATE_KEY, map);
  return { record, isNew: true };
}

export function clearAllRarities(state: vscode.Memento): void {
  state.update(STATE_KEY, {});
}

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  common: {
    label: 'Common',
    icon: '$(git-branch)',
    themeColorId: 'branchRarity.common',
    ansiCode: '\x1b[38;5;245m',
  },
  uncommon: {
    label: 'Uncommon',
    icon: '$(sparkle)',
    themeColorId: 'branchRarity.uncommon',
    ansiCode: '\x1b[38;5;40m',
  },
  rare: {
    label: 'Rare',
    icon: '$(star-full)',
    themeColorId: 'branchRarity.rare',
    ansiCode: '\x1b[1m\x1b[38;5;33m',
  },
  legendary: {
    label: 'LEGENDARY',
    icon: '$(flame)',
    themeColorId: 'branchRarity.legendary',
    ansiCode: '\x1b[1m\x1b[38;5;214m',
  },
};
