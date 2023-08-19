import { OpenAIClient } from "@azure/openai";
import * as vscode from "vscode";
import * as common from "./common";
import { performance } from "perf_hooks";
import { debugLog } from "./common";

export async function createOrRefactor(
  propmptCompleter: common.PromptCompleter
) {
  let interval = undefined;
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No active editor");
      return;
    }

    const whatToDo = await vscode.window.showInputBox({
      prompt: "What can I do for you?",
    });
    if (!whatToDo) {
      return;
    }

    const start = performance.now(); // start stopwatch

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "cptX is working on your request",
        cancellable: true,
      },
      async (progress, token) => {
        interval = common.updateProgress(progress, start);

        const selectedCode = editor.document.getText(editor.selection).trim();
        const refactor = selectedCode.length > 0;
        let aboveText = "";
        let belowText = "";
        if (refactor) {
          ({ aboveText, belowText } = common.getTextAroundSelection(editor));
        } else {
          ({ aboveText, belowText } = common.getCodeAroundCursor(editor));
        }

        let { expert, language, languageId } = common.getExpertAndLanguage(editor);

        let prompt = compilePrompt(
          whatToDo,
          selectedCode,
          editor.document.fileName,
          aboveText,
          belowText,
          expert,
          language,
          languageId
        );

        for (var m in prompt) {
          debugLog(prompt[m].content);
        }

        const result = await propmptCompleter(
          prompt
        );
        clearInterval(interval);
        progress.report({ increment: 100 });

        if (result.trim().length === 0 && !token.isCancellationRequested) {
          vscode.window.showInformationMessage(
            `cptX received nothing from GPT(${common.getElapsedSeconds(
              start
            )} seconds)`
          );
          return;
        }

        if (!token.isCancellationRequested) {
          await editor.edit((editBuilder) => {
            if (refactor) {
              editBuilder.replace(editor.selection, result);
            } else {
              const cursorLineNotEmpty = !editor.document.lineAt(
                editor.selection.end.line
              ).isEmptyOrWhitespace;
              if (cursorLineNotEmpty) {
                editBuilder.insert(editor.selection.end, "\n");
              }
              editBuilder.insert(editor.selection.end, result);
            }
          });
          if (!refactor) {
            var endPos = editor.selection.end;
            var startPos = new vscode.Position(
              endPos.line - result.split("\n").length + 1,
              0
            );
            editor.selection = new vscode.Selection(startPos, endPos);
          }
          vscode.window.showInformationMessage(
            `cptX completed operation (${common.getElapsedSeconds(start)}s)`
          );

          await vscode.commands.executeCommand("editor.action.formatSelection");
        }
      }
    );
  } catch (error: any) {
    if (interval !== undefined) {
      clearInterval(interval);
    }
    let addition = "";
    if (error.error) {
      if (error.error.code) {
        addition += `${error.error.code}. `;
      }
      if (error.error.message) {
        addition += `${error.error.message}`;
      }
    }
    if (error.message) {
      addition += `${error.message}. `;
    }
    vscode.window.showErrorMessage(
      `cptX failed to generate code: ${error}${addition}`
    );
  }
}

function compilePrompt(
  whatToDo: string,
  selectedCode: string,
  fileName: string,
  aboveText: string,
  belowText: string,
  expert: string,
  language: string,
  languageId: string
): common.Message[] {
  if (language.trim().length !== 0) {
    language = " " + language;
  }

  let messages: common.Message[] = [];

  let systemMessage = `You're an AI assistant acting as an expert ${expert} and capable of chained reasoning as humans do. `;
  systemMessage += `You're providing output through a VSCode extension. `;
  systemMessage += `Your output will be inserted directly into code editor! `;
  systemMessage += `In the next messages a user will provide you with his/her request (instructions), show the surrounding code from the file that is in currently open in the editor. `;
  systemMessage +=
    fileName.trim().length !== 0
      ? "The name of the file currenty open is '" + fileName + "'."
      : "";
  systemMessage += `\n`;
  systemMessage += `- Carefully follow the instructions\n`;
  systemMessage += `- Make sure that you only respond with a valid${language} code block and only with a valid${language} code block\n`;
  systemMessage += `- Don't wrap you repsonse into markdown until asked specifically`; // quite often woth June versions of OpenAI I see mede returnig blocked wraped in MD, e.g. ```dart ...
  systemMessage += `- Be concise\n`;
  systemMessage += `- Use${language} comments to escape any free text\n`;
  systemMessage += `- If there're instructions for the user provide them as{language} comments before the produce code block\n`;
  systemMessage += `- You can also use inline comments\n`;
  systemMessage += `- The code you produce plugs into the code in the open editor and doesn't break it\n`;

  //   systemMessage += `REMEMBER! Only valid${language} code block can be in your repsonse! `;
  //   systemMessage += `Your response will be inserted as-is to code editor! `;
  //   systemMessage += `Free text response will break the compilation and spoil the code in the editor!`;

  common.addSystem(messages, systemMessage);
  common.addUser(messages, `Ready?)`);
  common.addAssistant(messages, common.commentOutLine(languageId, `OK`));

  const refactor = selectedCode.trim().length > 0;

  common.addUser(messages, `Here is the instruction -> \n\n${whatToDo}`);

  if (refactor) {
    common.addUser(
      messages,
      `The following code is currently selected in the editor and your output will replace it -> \n\n${selectedCode}`
    );

    if (aboveText.trim().length !== 0) {
      common.addUser(
        messages,
        `For the context, here's part of the code above the selection -> \n\n${aboveText}`
      );
    }
    if (belowText.trim().length !== 0) {
      common.addUser(
        messages,
        `For the context, here's part of the code below the selection -> \n\n${belowText}`
      );
    }
  } else {
    const above = aboveText.split(`\n`).slice(-7).join(`\n`);
    const below = belowText.split(`\n`).slice(0, 7).join(`\n`);

    let s = `Your code block will be inserted `;
    if (above.trim().length !== 0) {
      s += `after the lines:\n\n` + above + `\n\n`;
    } else if (below.trim().length !== 0) {
      s += `before the lines:\n\n` + below + `\n\n`;
    }

    common.addUser(messages, s);

    common.addUser(
      messages,
      `For the context, here's more code that is currently open in the editor -> \n\n` +
        aboveText +
        belowText
    );

    if (language.trim().length !== 0) {
      common.addUser(
        messages,
        `Only reply in ${language} and produce a valid code block`
      );
    }
  }

  return messages;
}
