import * as vscode from "vscode";
import { Rarity, Modifier } from "./types";
import { RARITY_STYLES, buildLabel } from "./rarityEngine";

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export class StatusBarDisplay implements vscode.Disposable {
  private _item: vscode.StatusBarItem;
  private _foilInterval: NodeJS.Timeout | undefined;
  private _foilHue = 0;

  constructor() {
    this._item = vscode.window.createStatusBarItem(
      "branchRarity.badge",
      vscode.StatusBarAlignment.Left,
      100,
    );
    this._item.name = "Branch Rarity Badge";
  }

  update(
    branchName: string,
    rarity: Rarity,
    isNew: boolean,
    modifier?: Modifier,
  ): void {
    this._stopFoil();

    const style = RARITY_STYLES[rarity];
    const label = buildLabel(rarity, modifier);
    this._item.text = `${style.icon} ${branchName} [${label}]`;
    this._item.tooltip = isNew
      ? `New branch discovered! Rarity: ${label}`
      : `Branch rarity: ${label}`;
    this._item.backgroundColor =
      rarity === "legendary" && modifier !== "foiled" && modifier !== "gold"
        ? new vscode.ThemeColor("statusBarItem.warningBackground")
        : undefined;

    if (modifier === "gold") {
      this._item.color = "#FFD700";
    } else if (modifier === "foiled") {
      this._startFoil();
    } else {
      this._item.color = new vscode.ThemeColor(style.themeColorId);
    }

    this._item.show();
  }

  private _startFoil(): void {
    this._foilHue = 0;
    this._item.color = hslToHex(0, 100, 65);
    this._foilInterval = setInterval(() => {
      this._foilHue = (this._foilHue + 1) % 360;
      const hex = hslToHex(this._foilHue, 100, 65);
      this._item.color = hex;
      const t = this._item.text;
      this._item.text = t;
    }, 150);
  }

  private _stopFoil(): void {
    if (this._foilInterval) {
      clearInterval(this._foilInterval);
      this._foilInterval = undefined;
    }
  }

  hide(): void {
    this._stopFoil();
    this._item.hide();
  }

  dispose(): void {
    this._stopFoil();
    this._item.dispose();
  }
}
