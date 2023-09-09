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
    return (
      vscode.workspace.getConfiguration("cptx").get("ContextSize") ??
      2048
    );
  }
}

export const pluginSettings = new Settings();
