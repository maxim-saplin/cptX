import * as vscode from "vscode";
import { createOrRefactor } from "./createOrRefactor";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from "./explain";
import { Message, PromptCompleter } from "./common";
import { getCompleter } from "./openai";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "cptX" is now active!');
  //setLogLevel("verbose");


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

// This method is called when your extension is deactivated
export function deactivate() {}