import * as vscode from 'vscode';
import { BranchDetector } from './branchDetector';
import { StatusBarDisplay } from './statusBarDisplay';
import { sendBannerToTerminal } from './terminalDisplay';
import { getOrAssignRarity, clearAllRarities } from './rarityEngine';

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('Branch Rarity');
  log.appendLine('[extension] activated');

  const statusBar = new StatusBarDisplay();
  const detector = new BranchDetector(log);

  detector.onNewBranch(event => {
    const { record, isNew } = getOrAssignRarity(event.branchName, context.globalState);
    const config = vscode.workspace.getConfiguration('branchRarity');

    if (config.get<boolean>('showStatusBar', true)) {
      statusBar.update(event.branchName, record.rarity, isNew);
    }

    if (isNew) {
      sendBannerToTerminal(event.branchName, record.rarity);

      // Notifications for uncommon and above
      const name = event.branchName;
      switch (record.rarity) {
        case 'uncommon':
          vscode.window.showInformationMessage(`✦ Uncommon branch: ${name}`);
          break;
        case 'rare':
          vscode.window.showWarningMessage(`★★ Rare branch discovered: ${name}`);
          break;
        case 'legendary':
          vscode.window.showErrorMessage(`🔥 LEGENDARY branch discovered: ${name}`);
          break;
      }
    }
  });

  detector.activate();

  context.subscriptions.push(
    vscode.commands.registerCommand('branchRarity.clearAll', () => {
      clearAllRarities(context.globalState);
      vscode.window.showInformationMessage('Branch Rarity: all records cleared.');
    }),
    statusBar,
    detector,
    log
  );
}

export function deactivate(): void {
  // Cleanup handled via context.subscriptions
}
