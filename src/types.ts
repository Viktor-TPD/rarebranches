export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface BranchRecord {
  rarity: Rarity;
  discoveredAt: number;
}

export interface NewBranchEvent {
  branchName: string;
  repoRoot: string;
}

export interface RarityStyle {
  label: string;
  icon: string;
  themeColorId: string;
  ansiCode: string;
}

