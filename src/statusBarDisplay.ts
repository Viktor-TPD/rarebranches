import * as vscode from 'vscode';
import { Rarity } from './types';
import { RARITY_STYLES } from './rarityEngine';

export class StatusBarDisplay implements vscode.Disposable {
  private _item: vscode.StatusBarItem;

  constructor() {
    this._item = vscode.window.createStatusBarItem(
      'branchRarity.badge',
      vscode.StatusBarAlignment.Left,
      100
    );
    this._item.name = 'Branch Rarity Badge';
  }

  update(branchName: string, rarity: Rarity, isNew: boolean): void {
    const style = RARITY_STYLES[rarity];
    const newTag = isNew ? ' ✨' : '';
    this._item.text = `${style.icon} ${branchName} [${style.label}${newTag}]`;
    this._item.tooltip = isNew
      ? `New branch discovered! Rarity: ${style.label}`
      : `Branch rarity: ${style.label}`;
    this._item.color = new vscode.ThemeColor(style.themeColorId);
    this._item.backgroundColor =
      rarity === 'legendary'
        ? new vscode.ThemeColor('statusBarItem.warningBackground')
        : undefined;
    this._item.show();
  }

  hide(): void {
    this._item.hide();
  }

  dispose(): void {
    this._item.dispose();
  }
}
