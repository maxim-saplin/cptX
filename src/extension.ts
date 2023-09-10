import * as vscode from "vscode";
import { createOrRefactor } from "./createOrRefactor";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from "./explain";
import { Message, PromptCompleter } from "./common";
import { getCompleter } from "./openai";
import { initTelemetry, sendConfigurationChangedEvent } from "./telemetry";
import { initStatusBar } from "./statusBar";
import { config, extensionSettings } from "./settings";

export function activate(context: vscode.ExtensionContext) {
  //console.log('Congratulations, your extension "cptX" is now active!');
  //setLogLevel("verbose");

  context.subscriptions.push(initTelemetry());

  config.init();

  var completer = getCompleter();

  vscode.workspace.onDidChangeConfiguration((event) => {
    let affected = event.affectsConfiguration("cptx.APIKey");
    if (affected) {
      completer = getCompleter();
    }
    sendConfigurationChangedEvent(
      extensionSettings.apiProvider,
      extensionSettings.contextSize,
      extensionSettings.explanationInTab
    );
  });

  const createOrRefactorCommand = "cptX.createOrRefactor";
  const explainOrAskCommand = "cptX.explainOrAsk";

  context.subscriptions.push(
    vscode.commands.registerCommand(createOrRefactorCommand, () =>
      createOrRefactor(completer)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(explainOrAskCommand, () =>
      explainOrAsk(completer)
    )
  );

  initStatusBar(explainOrAskCommand, context);
}

// This method is called when your extension is deactivated
export function deactivate() {}
