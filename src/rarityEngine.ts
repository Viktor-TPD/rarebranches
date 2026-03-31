import * as vscode from "vscode";
import { Rarity, BranchRecord, RarityStyle } from "./types";

const STATE_KEY = "branchRarity.knownBranches";

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
  const record: BranchRecord = {
    rarity: rollRarity(),
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
