import * as vscode from 'vscode';
import { isAbsolute } from 'path';
import { Configuration } from '../configuration';

const WORKSPACE_TOKEN = '${workspaceFolder}';

export class SkipPathProvider {
  constructor(
    private readonly configuration: Configuration,
    private readonly log: vscode.LogOutputChannel,
  ) {}

  public async resolveSkipPaths(
    config: vscode.DebugConfiguration,
    folder?: vscode.WorkspaceFolder,
  ): Promise<string[]> {
    let merged: string[] = [];

    const fromConfig = this.configuration.getSkipPaths(folder);
    merged.push(...fromConfig);

    const fileName = this.configuration.getSkipPathsFileName(folder).trim();
    if (fileName) {
      const fromFile = await this.readSkipPathsFile(fileName, folder);
      merged.push(...fromFile);
    }

    if (Array.isArray(config.skipPaths)) {
      const fromLaunchConfig = config.skipPaths.filter((s) => typeof s === 'string');
      merged.push(...fromLaunchConfig);
    }

    merged = merged.map((s) => s.trim()).filter(Boolean);

    if (folder) {
      const root = folder.uri.path;
      merged = merged.map((s) =>
        s.startsWith(WORKSPACE_TOKEN) ? root + s.slice(WORKSPACE_TOKEN.length) : s,
      );
    }

    return [...new Set(merged)];
  }

  private async readSkipPathsFile(
    skipPathsFile: string,
    folder?: vscode.WorkspaceFolder,
  ): Promise<string[]> {
    const skipPathsFileUri =
      !folder || isAbsolute(skipPathsFile)
        ? vscode.Uri.file(skipPathsFile)
        : vscode.Uri.joinPath(folder.uri, skipPathsFile);

    const exists = await vscode.workspace.fs.stat(skipPathsFileUri).then(
      (stat) => Boolean(stat.type & vscode.FileType.File),
      () => false,
    );
    if (!exists) {
      this.log.info(`Resolved skipPathFile '${skipPathsFile}' not found, ignoring`);
      return [];
    }

    const data = await vscode.workspace.fs.readFile(skipPathsFileUri);
    return data
      .toString()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#'));
  }
}
