import { OpenAIClient } from "@azure/openai";
import * as vscode from 'vscode';
import * as common from './common';
import { performance } from "perf_hooks";

async function explainOrAsk(propmptCompleter: (propmt: string) => Promise<string>)  {
  let interval = undefined;
  try {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return vscode.window.showErrorMessage('No active editor');
    }

    const selectedCode = editor.document.getText(editor.selection).trim();

    // If empty - ask to explain
    let request = await vscode.window.showInputBox({ prompt: "What can I do for you?", value: "explain" }) ?? '';

    if (!request) {
      return;
    } else if (request.toLowerCase() === 'explain') { request = ''; }

    const start = performance.now(); // start stopwatch

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "cptX is working on your request",
        cancellable: true
      },
      async (progress, token) => { // added token parameter
        interval = common.updateProgress(progress, start);
        let { aboveText, belowText } = common.getCodeAroundSelection(editor);

        let { expert, language } = common.getExpertAndLanguage(editor);
        const prompt = compilePrompt(request, selectedCode, aboveText, belowText, expert, language);
        console.log(prompt);

        const explanation = await propmptCompleter(prompt); // added token parameter

        if (explanation.trim().length === 0 && !token.isCancellationRequested) {
          vscode.window.showInformationMessage(`cptX received nothing from GPT(${common.getElapsed(start)} seconds)`);
          return;
      }
        if (!token.isCancellationRequested) { // check if token is canceled before showing info message
          vscode.window.showInformationMessage(explanation, { modal: true });
          vscode.window.showInformationMessage(`cptX completed operation (${common.getElapsed(start)}s)`);
        }
      }
    );

  } catch (error: any) {
    if (interval !== undefined) {
      clearInterval(interval);
    }
    // TODO, check error messages are shown
    let addition = "";
    if (error.error ) {
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
    vscode.window.showErrorMessage(`Failed to generate explanation: ${addition}`);
  }
}

function compilePrompt(request: string, selectedText: string, aboveText: string, belowText: string, profile: string, language: string) {
  if (language.trim().length !== 0) {
    language = ' ' + language;
  }

  if (profile.trim().length === 0) {
    profile = 'software developer';
  }

  let prompt = `You're an expert ${profile}`;

  if (language.trim().length !== 0) {
    prompt += ` experienced in ${language}`;
  }

  if (selectedText.trim().length !== 0) {
    prompt += `. Please review the following code snippet:\n\n\n\n\n\n\n`;
    prompt += selectedText + `\n\n\n\n\n\n\n`;
    if (request.trim().length === 0) {
      prompt += `and explain it.`;
    } else {
      prompt += `and provide your comment according to the following request: ${request}`;
    }
    if (aboveText.trim().length !== 0 && belowText.trim().length !== 0) {
      prompt += `\n\nFor the context. `;
      if (aboveText.trim().length !== 0) {
        prompt += `Here's the code above:\n\n\n\n\n\n\n`;
        prompt += aboveText + `\n\n\n\n\n\n\n`;
      }
      if (belowText.trim().length !== 0) {
        prompt += `Here's the code below:\n\n\n\n\n\n\n`;
        prompt += belowText + `\n\n\n\n\n\n\n`;
      }
    }
  } else {
    prompt += `. Please review the following code snippet:\n\n\n\n\n\n\n`;
    prompt += aboveText + belowText + `\n\n\n\n\n\n\n`;
    if (request.trim().length === 0) {
      prompt += `and explain it.\n\n`;
    } else {
      prompt += `and provide your comment according to the following request: ${request}\n\n`;
    }

    const interesting = aboveText.split('\n').slice(-5).join('\n') + belowText.split('\n').slice(0, 5).join('\n');

    if (interesting.trim().length !== 0) {
      prompt += `The area of interest is near this code:\n` + interesting;
    }
  }

  return prompt;
}

export { explainOrAsk };