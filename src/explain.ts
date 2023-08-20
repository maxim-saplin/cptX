import { OpenAIClient } from "@azure/openai";
import * as vscode from "vscode";
import * as common from "./common";
import { performance } from "perf_hooks";
import { debugLog } from "./common";

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
        // added token parameter
        interval = common.updateProgress(progress, start);
        let requestTokens =common.countTokens(request);
        let { aboveText, belowText } = common.getCodeAroundSelection(editor, requestTokens);

        let { expert, language } = common.getExpertAndLanguage(editor);
        const prompt = compilePrompt(
          request,
          selectedCode,
          editor.document.fileName,
          aboveText,
          belowText,
          expert,
          language
        );

        for(var m in prompt) { debugLog(prompt[m]);};

        let {reply: explanation, promptTokens, completionTokens} = await propmptCompleter(prompt);

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
          vscode.window.showInformationMessage(explanation, { modal: true });
          vscode.window.showInformationMessage(
            `cptX completed operation (${common.getElapsedSeconds(start)}s). Tokens (${promptTokens}|${promptTokens+completionTokens})`
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

function compilePrompt(
  whatToDo: string,
  selectedCode: string,
  fileName: string,
  aboveCode: string,
  belowCode: string,
  expert: string,
  language: string
): common.Message[] {
  if (language.trim().length !== 0) {
    language = " " + language;
  }

  let messages: common.Message[] = [];

  let systemMessage = `You're an AI assistant acting as an expert ${expert} and capable of chained reasoning as humans do. `;
  systemMessage += `You're providing output through a VSCode extension. `;
  systemMessage += `In the next messages a user will provide you with his/her request (instructions), show the surrounding code from the file that is in currently open in the editor. `;
  systemMessage += fileName.trim().length !== 0 ? 'The name of the file currenty open is \''+fileName+'\'.' : '';
  systemMessage += `Your goal is to provide advice and consultation.`;
  systemMessage += `\n`;
  systemMessage += `- Carefully follow the instructions\n`;
  systemMessage += `- Be concise\n`;

  common.addSystem(messages, systemMessage);


  if (whatToDo.trim().length === 0) {whatToDo = `Please explain the code`;};
  common.addUser(messages,`Here is the request -> \n\n${whatToDo}`);

  if (selectedCode.trim().length !== 0) {
    common.addUser(messages,
      `The following code is currently selected in the editor and is in the focus of the request -> \n\n${selectedCode}`
    );
    if (aboveCode.trim().length !== 0) {
      common.addUser(messages,`For the context, here's part of the code above the selection -> \n\n${aboveCode}`);
  }
  if (belowCode.trim().length !== 0) {
    common.addUser(messages,`For the context, here's part of the code below the selection -> \n\n${belowCode}`);
  }
  } else {
    common.addUser(messages,`For the context, here's the code that is currently open in the editor -> \n\n` + aboveCode + belowCode);

    let interesting =
      aboveCode.split("\n").slice(-5).join("\n") +
      belowCode.split("\n").slice(0, 5).join("\n");

    if (interesting.trim().length !== 0) {
      interesting = `User's cursor is currently near this code -> \n\n` + interesting;
    }

    common.addUser(messages,interesting);
  }

  return messages;
}

export { explainOrAsk };
