import * as vscode from "vscode";
import { createOrRefactor } from "./createOrRefactor";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from "./explain";
import { Message, PromptCompleter } from "./common";
import { getCompleter } from "./openai";
import { initTelemetry } from "./telemetry";

export function activate(context: vscode.ExtensionContext) {
  //console.log('Congratulations, your extension "cptX" is now active!');
  //setLogLevel("verbose");

  context.subscriptions.push(initTelemetry());

  var completer = getCompleter();

  vscode.workspace.onDidChangeConfiguration((event) => {
    let affected = event.affectsConfiguration("cptx.APIKey");
    if (affected) {
      completer = getCompleter();
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("cptX.createOrRefactor", () =>
      createOrRefactor(completer)
    )
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("cptX.explainOrAsk", () =>
      explainOrAsk(completer)
    )
  );
}

// Function to obfuscate the key by storing it as a byte array and recovering it as a string when asked
function obfuscateKey(key: string): Uint8Array {
  // Convert the key to a byte array
  const byteArray = new TextEncoder().encode(key);
  return byteArray;
}

// This method is called when your extension is deactivated
export function deactivate() {}