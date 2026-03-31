import * as vscode from "vscode";
import { Rarity, Modifier, BranchRecord, RarityStyle } from "./types";

const STATE_KEY = "branchRarity.knownBranches";


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
