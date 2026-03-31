import * as vscode from "vscode";
import { Rarity, Modifier, BranchRecord, RarityStyle } from "./types";

const STATE_KEY = "branchRarity.knownBranches";

// Test fixtures — branches that always get a fixed rarity+modifier (never persisted, always re-shows gacha)
const TEST_BRANCHES: Record<string, { rarity: Rarity; modifier?: Modifier }> = {
  'test/uncommon':        { rarity: 'uncommon' },
  'test/uncommon-glass':  { rarity: 'uncommon', modifier: 'glass' },
  'test/uncommon-dark':   { rarity: 'uncommon', modifier: 'dark' },
  'test/uncommon-foiled': { rarity: 'uncommon', modifier: 'foiled' },
  'test/rare':            { rarity: 'rare' },
  'test/rare-glass':      { rarity: 'rare', modifier: 'glass' },
  'test/rare-dark':       { rarity: 'rare', modifier: 'dark' },
  'test/rare-foiled':     { rarity: 'rare', modifier: 'foiled' },
  'test/legendary':       { rarity: 'legendary' },
  'test/legendary-glass': { rarity: 'legendary', modifier: 'glass' },
  'test/legendary-dark':  { rarity: 'legendary', modifier: 'dark' },
  'test/legendary-foiled':{ rarity: 'legendary', modifier: 'foiled' },
  'test/uncommon-gold':   { rarity: 'uncommon', modifier: 'gold' },
  'test/rare-gold':       { rarity: 'rare', modifier: 'gold' },
  'test/legendary-gold':  { rarity: 'legendary', modifier: 'gold' },
};

export function rollModifier(): Modifier | undefined {
  const roll = Math.random();
  if (roll < 0.10) return 'glass';
  if (roll < 0.20) return 'dark';
  if (roll < 0.30) return 'foiled';
  if (roll < 0.40) return 'gold';
  return undefined;
}

export function buildLabel(rarity: Rarity, modifier?: Modifier): string {
  const rarityWord = rarity.charAt(0).toUpperCase() + rarity.slice(1);
  if (!modifier) return rarityWord;
  const modWord = modifier.charAt(0).toUpperCase() + modifier.slice(1);
  return `${modWord} ${rarityWord}`;
}

export function rollRarity(): Rarity {
  const roll = Math.random();
  if (roll < 1 / 10) return "legendary";
  if (roll < 1 / 5) return "rare";
  if (roll < 1 / 3) return "uncommon";
  return "common";
}

export function getOrAssignRarity(
  branchName: string,
  repoRoot: string,
  state: vscode.Memento,
): { record: BranchRecord; isNew: boolean } {
  // Test fixture — always fires gacha, never persisted
  const fixture = TEST_BRANCHES[branchName];
  if (fixture) {
    return { record: { ...fixture, discoveredAt: Date.now() }, isNew: true };
  }

  const key = `${repoRoot}::${branchName}`;
  const map: Record<string, BranchRecord> = state.get(STATE_KEY, {});
  const existing = map[key];
  if (existing) {
    return { record: existing, isNew: false };
  }
  const rarity = rollRarity();
  const record: BranchRecord = {
    rarity,
    modifier: rarity !== 'common' ? rollModifier() : undefined,
    discoveredAt: Date.now(),
  };
  map[key] = record;
  state.update(STATE_KEY, map);
  return { record, isNew: true };
}

export function clearAllRarities(state: vscode.Memento): void {
  state.update(STATE_KEY, {});
}

export const RARITY_STYLES: Record<Rarity, RarityStyle> = {
  common: {
    label: "Common",
    icon: "$(git-branch)",
    themeColorId: "branchRarity.common",
  },
  uncommon: {
    label: "Uncommon",
    icon: "$(sparkle)",
    themeColorId: "branchRarity.uncommon",
  },
  rare: {
    label: "Rare",
    icon: "$(star-full)",
    themeColorId: "branchRarity.rare",
  },
  legendary: {
    label: "LEGENDARY",
    icon: "$(flame)",
    themeColorId: "branchRarity.legendary",
  },
};
