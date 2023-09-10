import * as vscode from "vscode";

class Settings {
  get apiKey(): string {
    return vscode.workspace.getConfiguration("cptx").get("APIKey") || "";
  }
  get apiProvider(): string {
    return vscode.workspace.getConfiguration("cptx").get("apiProvider") || "";
  }
  get azureEndpoint(): string {
    return vscode.workspace.getConfiguration("cptx").get("AzureEndpoint") || "";
  }
  get azureDeploymentName(): string {
    return (
      vscode.workspace.getConfiguration("cptx").get("AzureDeploymentName") || ""
    );
  }
  get contextSize(): number {
    return vscode.workspace.getConfiguration("cptx").get("ContextSize") ?? 2048;
  }
  get explanationInTab(): boolean {
    return (
      vscode.workspace.getConfiguration("cptx").get("ExplanationInTab") || false
    );
  }
}

class Config {
  get isDebugMode(): boolean {
    return process.env.VSCODE_DEBUG_MODE === "true";
  }

  async init(): Promise<void> {
    const cptxFolderUri = this.cptxFolderUri;
    if (cptxFolderUri) {
      try {
        const folderExists = await vscode.workspace.fs.stat(cptxFolderUri);
        if (!folderExists) {
          await vscode.workspace.fs.createDirectory(cptxFolderUri);
        }
      } catch (error) {
        console.error(error);
      }
    }
  }

  get cptxFolderUri(): vscode.Uri | undefined {
    const x = vscode.workspace.workspaceFolders?.[0]?.uri;
    return x ? vscode.Uri.joinPath(x, ".cptx") : undefined;
  }
}

export const extensionSettings = new Settings();
export const config = new Config();
