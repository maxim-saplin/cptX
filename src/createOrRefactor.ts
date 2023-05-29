import { OpenAIClient } from "@azure/openai";
import * as vscode from 'vscode';
import * as common from './common';
import { performance } from "perf_hooks";

export async function createOrRefactor(propmptCompleter: (propmt: string) => Promise<string>) {
    let interval = undefined;
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const whatToDo = await vscode.window.showInputBox({ prompt: "What can I do for you?" });
        if (!whatToDo) {
            return;
        }

        const start = performance.now(); // start stopwatch

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "cptX is working on your request",
                cancellable: true
            },
            async (progress, token) => {
                interval = common.updateProgress(progress, start,);

                const selectedCode = editor.document.getText(editor.selection).trim();
                const refactor = selectedCode.length > 0;
                let aboveText = '';
                let belowText = '';
                if (refactor) {
                    ({ aboveText, belowText } = common.getCodeAroundSelection(editor));
                }
                else {
                    ({ aboveText, belowText } = common.getCodeAroundCursor(editor));
                }

                let { expert, language } = common.getExpertAndLanguage(editor);

                let prompt = compilePrompt(whatToDo, selectedCode, aboveText, belowText, expert, language);

                console.log(prompt);

                const result = await propmptCompleter(prompt);
                clearInterval(interval);
                progress.report({ increment: 100 });

                if (result.trim().length === 0 && !token.isCancellationRequested) {
                    vscode.window.showInformationMessage(`cptX received nothing from GPT(${common.getElapsed(start)} seconds)`);
                    return;
                }

                if (!token.isCancellationRequested) {
                    await editor.edit((editBuilder) => {
                        if (refactor) {
                            editBuilder.replace(editor.selection, result);
                        } else {
                            const cursorLineNotEmpty = !editor.document.lineAt(editor.selection.end.line).isEmptyOrWhitespace;
                            if (cursorLineNotEmpty) {
                                editBuilder.insert(editor.selection.end, '\n');
                            }
                            editBuilder.insert(editor.selection.end, result);
                        }

                    });
                    if (!refactor) {
                        var endPos = editor.selection.end;
                        var startPos = new vscode.Position(endPos.line-result.split('\n').length+1, 0);
                        editor.selection = new vscode.Selection(startPos, endPos);
                    }
                    vscode.window.showInformationMessage(`cptX completed operation (${common.getElapsed(start)}s)`);

                    await vscode.commands.executeCommand('editor.action.formatSelection');
                }
            });
    } catch (error: any) {
        if (interval !== undefined) {
            clearInterval(interval);
        }
        let addition = "";
        if (error.error ) {
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
        vscode.window.showErrorMessage(`cptX failed to generate code: ${error}${addition}`);
    }
}

function compilePrompt(whatToDo: string, refactorBlock: string, aboveText: string, belowText: string, profile: string, language: string) {
    if (language.trim().length !== 0) {
        language = ' ' + language;
    }

    if (profile.trim().length === 0) {
        profile = 'software developer';
    }

    let prompt = `You're an expert ${profile} who is asked of coding assistance.\n`;
    prompt += `☝ Produce a valid${language} code block\n`;
    prompt += `☝ Be concise\n`;
    prompt += `☝ No free text, use${language} comments if necessary\n`;
    const refactor = refactorBlock.trim().length > 0;

    if (refactor) {
        prompt += `Change the following code block:\n\n\n\n\n\n\n`;
        prompt += refactorBlock + '\n\n\n\n\n\n\n';
        prompt += `☝ ${whatToDo}\n\n`;
    }
    else {
        const above = aboveText.split('\n').slice(-7).join('\n');
        const below = belowText.split('\n').slice(0, 7).join('\n');

        prompt += `Produce a code block that will be inserted directly into VSCode editor in the following source code:\n\n\n\n\n\n\n`;
        prompt += aboveText + belowText + '\n\n\n\n\n\n\n';
        if (above.trim().length !== 0) {
            prompt += `after the lines:\n\n` + above + `\n\n`;
        }
        else if (below.trim().length !== 0) {
            prompt += `before the lines:\n\n` + below + `\n\n`;
        }
        prompt += `Follow the instruction: ${whatToDo}`;
    }

    if (refactor && aboveText.trim().length !== 0 && belowText.trim().length !== 0) {
        prompt += `\nFor the context. `;
        if (aboveText.trim().length !== 0) {
            prompt += `Here's the code above:\n\n\n\n\n\n\n`;
            prompt += aboveText + `\n\n\n\n\n\n\n`;
        }
        if (aboveText.trim().length !== 0) {
            prompt += `Here's the code below:\n\n\n\n\n\n\n`;
            prompt += belowText + `\n\n\n\n\n\n\n`;
        }
    }

    return prompt;
}