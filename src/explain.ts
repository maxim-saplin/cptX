import * as vscode from "vscode";
import * as common from "./common";
import { performance } from "perf_hooks";
import { debugLog } from "./common";
import { sendExplainCanceledEvent, sendExplainEvent } from "./telemetry";
import { config, extensionSettings } from "./settings";
import path = require("path");

async function explainOrAsk(propmptCompleter: common.PromptCompleter) {
  let interval = undefined;
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return vscode.window.showErrorMessage("No active editor");
    }

    const selectedCode = editor.document.getText(editor.selection).trim();

    // If empty - ask to explain
    let request =
      (await vscode.window.showInputBox({
        prompt: "What can I do for you?",
        value: "explain",
      })) ?? "";

    if (!request) {
      return;
    } else if (request.toLowerCase() === "explain") {
      request = "";
    }

    const start = performance.now(); // start stopwatch

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "cptX is working on your request",
        cancellable: true,
      },
      async (progress, token) => {
        token.onCancellationRequested((e) =>
          sendExplainCanceledEvent(common.getElapsedSecondsNumber(start))
        );
        // added token parameter
        interval = common.updateProgress(progress, start);
        let knownTokens =
          common.countTokens(request) +
          common.countTokens(selectedCode) +
          getEmptyPromptTokens();
        let {
          aboveText,
          belowText,
          tokens: editorTextTokens,
        } = common.getCodeAroundSelection(editor, knownTokens);

        let { expert, language } = common.getExpertAndLanguage(editor);
        let calculatedPromptTokens = knownTokens + editorTextTokens;
        let { messages: prompt, interesting } = compilePrompt(
          request,
          selectedCode,
          editor.document.fileName,
          aboveText,
          belowText,
          expert,
          language
        );

        for (var m in prompt) {
          debugLog(prompt[m].content);
        }

        let {
          reply: explanation,
          promptTokens,
          completionTokens,
        } = await propmptCompleter(prompt);
        debugLog("\n↓ ↓ ↓ reply↓ ↓ ↓ \n" + explanation);

        if (explanation.trim().length === 0 && !token.isCancellationRequested) {
          vscode.window.showInformationMessage(
            `cptX received nothing from GPT(${common.getElapsedSeconds(
              start
            )} seconds)`
          );
          return;
        }
        if (!token.isCancellationRequested) {
          // check if token is canceled before showing info message
          sendExplainEvent(
            calculatedPromptTokens,
            promptTokens,
            completionTokens,
            common.getElapsedSecondsNumber(start)
          );
          if (extensionSettings.explanationInTab && config.cptxFolderUri) {
            if (!config.cptxFolderUri) {
              vscode.window.showErrorMessage(
                "No cptx folder availble to store the results of explanation."
              );
            } else {
              let date = new Date();

              let fileName = `explain-${common.formatDate(date)}.md`;
              let filePath = path.join(config.cptxFolderUri.fsPath, fileName);
              let fileUri = vscode.Uri.file(filePath);

              let s =
                `${explanation}\n\n-----------------\n\n` +
                `${common.formatDate(date, true)} | ${
                  editor.document.fileName
                }\n\n` +
                `#### Request:\n${request === "" ? "explain" : request}\n\n` +
                (selectedCode
                  ? "#### Selected code:\n```" + selectedCode.trim() + "```"
                  : "#### Code around cursor:\n```" +
                    interesting.trim() +
                    "```");

              await vscode.workspace.fs.writeFile(fileUri, Buffer.from(s));
              await vscode.commands.executeCommand(
                "markdown.showPreview",
                fileUri
              );
            }
          } else {
            vscode.window.showInformationMessage(explanation, { modal: true });
          }
          vscode.window.showInformationMessage(
            `cptX completed operation (${common.getElapsedSeconds(
              start
            )}s). Tokens sent ${promptTokens}, total ${
              promptTokens + completionTokens
            })`
          );
          debugLog(
            `\nPrompt tokens (calculated|actual|total actual): ${calculatedPromptTokens}|${promptTokens}|${
              promptTokens + completionTokens
            }`
          );
        }
      }
    );
  } catch (error: any) {
    if (interval !== undefined) {
      clearInterval(interval);
    }
    // TODO, check error messages are shown
    let addition = "";
    if (error.error) {
      if (error.error.code) {
        addition += `${error.error.code}. `;
      }
      if (error.error.message) {
        addition += `${error.error.message}. `;
      }
    }
    if (error.message) {
      addition += `${error.message}. `;
    }
    vscode.window.showErrorMessage(
      `Failed to generate explanation: ${addition}`
    );
  }
}

var _emptyPromptTokens = -1;

function getEmptyPromptTokens(): number {
  if (_emptyPromptTokens < 0) {
    let emptyPrompt = compilePrompt(
      "",
      "",
      "testfile.php",
      "testcodeabove",
      "testcodebelow",
      "PHP Developer",
      "PHP"
    ).messages;
    const foldedPrompt = emptyPrompt.map((message) => message.content).join("");
    _emptyPromptTokens = common.countTokens(foldedPrompt);
  }
  return _emptyPromptTokens;
}

function compilePrompt(
  whatToDo: string,
  selectedCode: string,
  fileName: string,
  aboveCode: string,
  belowCode: string,
  expert: string,
  language: string
): { messages: common.Message[]; interesting: string } {
  if (language.trim().length !== 0) {
    language = " " + language;
  }

  let messages: common.Message[] = [];

  let systemMessage = `You're an AI assistant acting as an expert ${expert} and capable of chained reasoning as humans do. `;
  systemMessage += `You're providing output through a VSCode extension. `;
  systemMessage += `In the next messages a user will provide you with his/her request (instructions), show the surrounding code from the file that is in currently open in the editor. `;
  systemMessage +=
    fileName.trim().length !== 0
      ? "The name of the file currenty open is '" + fileName + "'."
      : "";
  systemMessage += `Your goal is to provide advice and consultation.`;
  systemMessage += `\n`;
  systemMessage += `- Carefully follow the instructions\n`;
  systemMessage += `- Be concise\n`;

  common.addSystem(messages, systemMessage);

  if (whatToDo.trim().length === 0) {
    whatToDo = `Please explain the code`;
  }
  common.addUser(messages, `Here is the request -> \n\n${whatToDo}`);

  let interesting = ``;

  if (selectedCode.trim().length !== 0) {
    common.addUser(
      messages,
      `The following code is currently selected in the editor and is in the focus of the request -> \n\n${selectedCode}`
    );
    if (aboveCode.trim().length !== 0) {
      common.addUser(
        messages,
        `For the context, here's part of the code above the selection -> \n\n${aboveCode}`
      );
    }
    if (belowCode.trim().length !== 0) {
      common.addUser(
        messages,
        `For the context, here's part of the code below the selection -> \n\n${belowCode}`
      );
    }
  } else {
    common.addUser(
      messages,
      `For the context, here's the code that is currently open in the editor -> \n\n` +
        aboveCode +
        belowCode
    );

    interesting =
      aboveCode.split("\n").slice(-5).join("\n") +
      belowCode.split("\n").slice(0, 5).join("\n");

    if (interesting.trim().length !== 0) {
      interesting =
        `User's cursor is currently near this code -> \n\n` + interesting;
    }

    common.addUser(messages, interesting);
  }

  return { messages, interesting };
}

export { explainOrAsk };
