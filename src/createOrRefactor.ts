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

        let { expert, language, languageId } =
          common.getExpertAndLanguage(editor);

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

        const result = await propmptCompleter(prompt);
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
  let instructions = `- Carefully follow the instructions\n`;
  instructions += `- Make sure that you only respond with a valid${language} code block and only with a valid${language} code block\n`;
  instructions += `- Don't wrap you repsonse into markdown until asked specifically`; // quite often woth June versions of OpenAI I see mede returnig blocked wraped in MD, e.g. ```dart ...
  instructions += `- Be concise\n`;
  instructions += `- Do not repeat the surrounding code provided as context (above and below code snippets)\n`;
  instructions += `- Use${language} comments to escape any free text\n`;
  instructions += `- If there're instructions for the user provide them as{language} comments before the produce code block\n`;
  instructions += `- You can also use inline comments\n`;
  instructions += `- The code you produce plugs into the code in the open editor and doesn't break it\n`;

  common.addSystem(messages, systemMessage);
  common.addUser(messages, `Ready?)`);
  common.addAssistant(
    messages,
    common.commentOutLine(languageId, `OK`) +
      `\n` +
      common.commentOutLine(languageId, `I am ready`)
  );

  const refactor = selectedCode.trim().length > 0;

  common.addUser(messages, `Here is the instruction -> \n\n${whatToDo}`);

  common.addAssistant(
    messages,
    common.commentOutLine(languageId, `Thank you`) +
      `\n` +
      common.commentOutLine(
        languageId,
        `Awaiting for code snippets from the open file`
      )
  );

  if (refactor) {
    let contextExistis =
      aboveText.trim().length !== 0 || belowText.trim().length;
    common.addUser(
      messages,
      `The following code is currently selected in the editor` +
        `and your output will replace it. Only change the selected code`
        // contextExistis
        // ? `, do not repeat any surrounding code from the context in your reply. `
        // : `.`
    );

    common.addUser(messages, selectedCode);

    let aboveAdded = false;

    if (contextExistis) {
      if (aboveText.trim().length !== 0) {
        common.addAssistant(
          messages,
          common.commentOutLine(
            languageId,
            `Please provide surrounding code if any`
          )
        );
        common.addUser(
          messages,
          `For the context, here's part of the code above the selection`
        );
        common.addUser(messages, aboveText);
        aboveAdded = true;
      }
      if (belowText.trim().length !== 0) {
        let assistant = aboveAdded
          ? `Is there more code below`
          : `Please provide surrounding code if any`;
        common.addAssistant(
          messages,
          common.commentOutLine(languageId, assistant)
        );
        common.addUser(
          messages,
          (!aboveAdded ? `For the context, here's` : `And here's`) +
            `part of the code below the selection`
        );
        common.addUser(messages, belowText);
      }

      common.addUser(messages, `Do not return in your reply and do not repeast the code provided as context.`+
      ` By doing so you will create duplication code and break code in edotr.`);
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

    common.addAssistant(
      messages,
      common.commentOutLine(
        languageId,
        `Please provide surrounding code if any`
      )
    );

    common.addUser(
      messages,
      `For the context, here's the code that is currently open in the editor -> \n\n` +
        aboveText +
        belowText
    );
  }

  common.addAssistant(
    messages,
    common.commentOutLine(
      languageId,
      `I am ready to complete the request and generate the code snippet that will be inserted into Visual Studio Code editor`
    )
  );

  common.addUser(
    messages,
    `Please proceed and don't forget about all the instructions that you have been given:\n` + instructions
  );

  return messages;
}
