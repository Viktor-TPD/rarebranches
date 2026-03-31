export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type Modifier = 'glass' | 'dark' | 'foiled' | 'gold';

export interface BranchRecord {
  rarity: Rarity;
  modifier?: Modifier;
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
}

