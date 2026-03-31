import * as vscode from 'vscode';
import { Rarity, Modifier } from './types';
import { RARITY_STYLES, buildLabel } from './rarityEngine';

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

  update(branchName: string, rarity: Rarity, isNew: boolean, modifier?: Modifier): void {
    const style = RARITY_STYLES[rarity];
    const label = buildLabel(rarity, modifier);
    const newTag = isNew ? ' ✨' : '';
    this._item.text = `${style.icon} ${branchName} [${label}${newTag}]`;
    this._item.tooltip = isNew
      ? `New branch discovered! Rarity: ${label}`
      : `Branch rarity: ${label}`;
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
