import * as vscode from "vscode";
import TelemetryReporter from '@vscode/extension-telemetry';
import { createOrRefactor } from "./createOrRefactor";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from "./explain";
import { Message, PromptCompleter } from "./common";
import { getCompleter } from "./openai";

export function activate(context: vscode.ExtensionContext) {
  //console.log('Congratulations, your extension "cptX" is now active!');
  //setLogLevel("verbose");

  let reporter = new TelemetryReporter(K);
  context.subscriptions.push(reporter);

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

const K = new TextDecoder().decode(
  new Uint8Array([
    101, 99, 50, 52, 57, 52, 97, 52, 45, 50, 52, 56, 49, 45, 52, 98, 51, 50, 45,
    57, 50, 99, 54, 45, 98, 98, 101, 55, 100, 56, 99, 51, 55, 98, 49, 98,
  ])
);


// This method is called when your extension is deactivated
export function deactivate() {}