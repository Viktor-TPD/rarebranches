import * as vscode from 'vscode';
import { GitExtensionAPI, GitRepository, NewBranchEvent } from './types';

export class BranchDetector implements vscode.Disposable {
  private _disposables: vscode.Disposable[] = [];
  private _onNewBranch = new vscode.EventEmitter<NewBranchEvent>();
  readonly onNewBranch = this._onNewBranch.event;
  readonly log: vscode.OutputChannel;

  // Tracks last-seen branch per repo root — used by both strategies for dedup
  private _lastBranchPerRepo = new Map<string, string | undefined>();
  // Tracks which workspace folders already have a HEAD watcher
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

  // Strategy A: Git extension API — catches VSCode-initiated git operations
  private setupGitApiWatcher(): void {
    const gitExtension = vscode.extensions.getExtension('vscode.git');
    if (!gitExtension) {
      this.log.appendLine('[detector] vscode.git extension not found');
      return;
    }

    const initApi = () => {
      if (!gitExtension.isActive) {
        this.log.appendLine('[detector] vscode.git not active after activate()');
        return;
      }
      const api: GitExtensionAPI = gitExtension.exports.getAPI(1);
      this.log.appendLine(`[detector] Git API ready, ${api.repositories.length} repo(s)`);

      for (const repo of api.repositories) {
        this.subscribeToRepo(repo);
      }
      this._disposables.push(
        api.onDidOpenRepository(repo => {
          this.log.appendLine(`[detector] new repo opened: ${repo.rootUri.fsPath}`);
          this.subscribeToRepo(repo);
        })
      );
    };

    if (gitExtension.isActive) {
      initApi();
    } else {
      this.log.appendLine('[detector] activating vscode.git...');
      gitExtension.activate().then(initApi);
    }
  }

  private subscribeToRepo(repo: GitRepository): void {
    const repoRoot = repo.rootUri.fsPath;
    this._lastBranchPerRepo.set(repoRoot, repo.state.HEAD?.name);
    this.log.appendLine(`[detector] subscribed to repo: ${repoRoot} (HEAD: ${repo.state.HEAD?.name ?? 'none'})`);

    this._disposables.push(
      repo.onDidCheckout(() => {
        this.log.appendLine(`[detector] onDidCheckout fired for ${repoRoot}`);
        const currentBranch = repo.state.HEAD?.name;
        if (currentBranch) {
          this.fire(currentBranch, repoRoot);
        }
      })
    );
  }

  // Strategy B: .git/HEAD file watcher — catches external git commands
  private watchFolder(folder: vscode.WorkspaceFolder): void {
    if (this._watchedFolders.has(folder.uri.fsPath)) return;
    this._watchedFolders.add(folder.uri.fsPath);

    this.log.appendLine(`[detector] watching HEAD for: ${folder.uri.fsPath}`);
    const headPattern = new vscode.RelativePattern(folder.uri, '.git/HEAD');
    const watcher = vscode.workspace.createFileSystemWatcher(headPattern);
    this._disposables.push(watcher);

    const onHeadChange = async (uri: vscode.Uri) => {
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
    this.setupGitApiWatcher();
    this.setupHeadFileWatcher();
  }

  dispose(): void {
    this._onNewBranch.dispose();
    for (const d of this._disposables) d.dispose();
    this._disposables = [];
  }
}
