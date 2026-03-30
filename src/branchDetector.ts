import * as vscode from 'vscode';
import { NewBranchEvent } from './types';

export class BranchDetector implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];
  private _onNewBranch = new vscode.EventEmitter<NewBranchEvent>();
  readonly onNewBranch = this._onNewBranch.event;
  readonly log: vscode.OutputChannel;

  private _lastBranchPerRepo = new Map<string, string | undefined>();
  private _watchedFolders = new Set<string>();

  constructor(log: vscode.OutputChannel) {
    this.log = log;
  }

  private fire(branchName: string, repoRoot: string): void {
    const previous = this._lastBranchPerRepo.get(repoRoot);
    if (branchName === previous) return;
    this._lastBranchPerRepo.set(repoRoot, branchName);
    this.log.appendLine(`[detector] branch changed → "${branchName}" (was: "${previous ?? 'none'}")`);
    this._onNewBranch.fire({ branchName, repoRoot });
  }

  private watchFolder(folder: vscode.WorkspaceFolder): void {
    if (this._watchedFolders.has(folder.uri.fsPath)) return;
    this._watchedFolders.add(folder.uri.fsPath);

    this.log.appendLine(`[detector] watching HEAD for: ${folder.uri.fsPath}`);
    const headPattern = new vscode.RelativePattern(folder.uri, '.git/HEAD');
    const watcher = vscode.workspace.createFileSystemWatcher(headPattern);
    this._disposables.push(watcher);

    let debounce: NodeJS.Timeout | undefined;

    const onHeadChange = (uri: vscode.Uri) => {
      // Debounce: git may fire multiple fs events for a single checkout
      clearTimeout(debounce);
      debounce = setTimeout(async () => {
        this.log.appendLine(`[detector] .git/HEAD changed: ${uri.fsPath}`);
        try {
          const raw = await vscode.workspace.fs.readFile(uri);
          const content = Buffer.from(raw).toString('utf8').trim();
          this.log.appendLine(`[detector] HEAD content: "${content}"`);
          const match = content.match(/^ref: refs\/heads\/(.+)$/);
          if (!match) return; // detached HEAD
          this.fire(match[1], folder.uri.fsPath);
        } catch (e) {
          this.log.appendLine(`[detector] HEAD read error: ${e}`);
        }
      }, 50);
    };

    this._disposables.push(watcher.onDidChange(onHeadChange));
    this._disposables.push(watcher.onDidCreate(onHeadChange));
  }

  private setupHeadFileWatcher(): void {
    const folders = vscode.workspace.workspaceFolders ?? [];
    this.log.appendLine(`[detector] workspace folders at activation: ${folders.length}`);
    for (const folder of folders) {
      this.watchFolder(folder);
    }

    // Also watch for folders added after activation
    this._disposables.push(
      vscode.workspace.onDidChangeWorkspaceFolders(e => {
        for (const folder of e.added) {
          this.log.appendLine(`[detector] workspace folder added: ${folder.uri.fsPath}`);
          this.watchFolder(folder);
        }
      })
    );
  }

  activate(): void {
    this.log.appendLine('[detector] activating...');
    this.setupHeadFileWatcher();
  }

  dispose(): void {
    this._onNewBranch.dispose();
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }
}
