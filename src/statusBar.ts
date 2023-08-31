import * as vscode from "vscode";
import { countTokens, debugLog } from "./common";

let cptxStatusBarItem: vscode.StatusBarItem;

function initStatusBar(
  commandToRunOnClick: string,
  context: vscode.ExtensionContext
) {
  cptxStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  cptxStatusBarItem.command = commandToRunOnClick;
  context.subscriptions.push(cptxStatusBarItem);

  // register some listener that make sure the status bar
  // item always up-to-date
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem)
  );
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updateStatusBarItem)
  );

  // update status bar item once at start
  updateStatusBarItem();
}

// function debounce(func: () => void, delaySeconds: number): () => void {
//   let timeoutId: NodeJS.Timeout;

//   return () => {
//     clearTimeout(timeoutId);
//     timeoutId = setTimeout(func, delaySeconds * 1000);
//   };
// }

function updateStatusBarItem(): void {
//  const startTime = Date.now();

  const selected = getTokensForSelectedText();
  const total = getTotalTokensForEditor();
  if (selected > 0 || total > 0) {
    let s = `${total} tkn`;
    if (selected > 0) {
      s += ` (${selected} sel)`;
    }
    cptxStatusBarItem.text = s;
    cptxStatusBarItem.show();
  } else {
    cptxStatusBarItem.hide();
  }
// ~10ms for a large file with ~5k tokens

//   const endTime = Date.now();
//   const elapsedTime = endTime - startTime;
//   debugLog(`updateStatusBarItem -> ${elapsedTime}ms`);
}

function getTokensForSelectedText(): number {
  const activeEditor = vscode.window.activeTextEditor;
  let tokens = 0;
  if (activeEditor) {
    let selectedText = activeEditor.document
      .getText(activeEditor.selection)
      .trim();
    tokens = countTokens(selectedText);
  }
  return tokens;
}

function getTotalTokensForEditor(): number {
  let totalTokens = 0;
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    const text = activeEditor.document.getText();
    totalTokens = countTokens(text);
  }
  return totalTokens;
}

export { initStatusBar };
