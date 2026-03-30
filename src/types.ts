import * as vscode from 'vscode';

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

// Minimal surface of VSCode's Git extension API v1
export interface GitExtensionAPI {
  readonly repositories: GitRepository[];
  onDidOpenRepository: vscode.Event<GitRepository>;
}

export interface GitRepository {
  readonly rootUri: vscode.Uri;
  readonly state: GitRepositoryState;
  readonly onDidCommit: vscode.Event<void>;
  readonly onDidCheckout: vscode.Event<void>;
}

export interface GitRepositoryState {
  readonly HEAD: GitBranch | undefined;
}

export interface GitBranch {
  readonly name?: string;
}
