import * as vscode from 'vscode';
import { BranchDetector } from './branchDetector';
import { StatusBarDisplay } from './statusBarDisplay';
import { showGachaScreen } from './gachaPanel';
import { getOrAssignRarity, clearAllRarities } from './rarityEngine';

export function activate(context: vscode.ExtensionContext): void {
  const log = vscode.window.createOutputChannel('Branch Rarity');
  log.appendLine('[extension] activated');

  const statusBar = new StatusBarDisplay();
  const detector = new BranchDetector(log);

  detector.onNewBranch(event => {
    const { record, isNew } = getOrAssignRarity(event.branchName, event.repoRoot, context.globalState);

    const config = vscode.workspace.getConfiguration('branchRarity');

    if (record.rarity === 'common') {
      if (config.get<boolean>('showStatusBar', true)) {
        statusBar.hide();
      }
      return;
    }

    const updateStatusBar = () => {
      if (config.get<boolean>('showStatusBar', true)) {
        statusBar.update(event.branchName, record.rarity, isNew);
      }
    };

    if (isNew) {
      showGachaScreen(event.branchName, record.rarity, updateStatusBar);
    } else {
      updateStatusBar();
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
