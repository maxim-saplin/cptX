import { OpenAIApi } from "openai";
import * as vscode from 'vscode';
import * as common from './common';

export async function createOrRefactor(openAi: OpenAIApi) {
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

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "cptX is working on your request",
                cancellable: true
            }, 
            // TODO, make it cancelable OR timeout
            async (progress) => {
                const interval = common.updateProgress(progress);

                const selectedCode = editor.document.getText(editor.selection).trim();
                const refactor = selectedCode.length > 0;
                let aboveText  = '';
                let belowText  = '';
                let cursorLine = 0;
                if (refactor) {
                    ({ aboveText, belowText } = common.getCodeAroundSelection(editor));
                }
                else {
                    ({ aboveText, belowText, cursorLine } = common.getCodeAroundCursor(editor));
                }

                let {expert, language} = common.getExpertAndLanguage(editor);

                let prompt = compilePrompt(whatToDo, selectedCode, aboveText, belowText, expert, language);

                console.log(prompt);

                const result = await common.getGptReply(openAi,  prompt);
                clearInterval(interval);
                progress.report({ increment: 100 });

                if (result.trim().length === 0) {
                    vscode.window.showInformationMessage('cptX replied nothing');
                    return;
                }

                editor.edit((editBuilder) => {
                    if (refactor) {
                        editBuilder.replace(editor.selection, result);
                    } else {
                        const selection = new vscode.Selection(cursorLine, 0, cursorLine, 0);
                        editBuilder.insert(selection.end, '\n');
                        editBuilder.insert(selection.end, result);   
                    }             
                    
                });
                vscode.window.showInformationMessage('cptX replied to the prompt');
            });
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to generate code: ${error}`);
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
        prompt += refactorBlock+'\n\n\n\n\n\n\n';
        prompt += `☝ ${whatToDo}\n\n`;
    }
    else {
        prompt += `Produce a code block that will be inserted directly into VSCode editor in the location marked by '→→→' in the following source code:\n`;
        prompt += aboveText+'\n\n'+belowText;
        prompt += `☝${whatToDo}\n\n`;
    }

    if (refactor && aboveText.trim().length !== 0 && belowText.trim().length !== 0) {
        prompt += `\nFor the context. `;
        if (aboveText.trim().length !== 0) {
            prompt += `Here's the code above:\n\n\n\n\n\n\n`;
            prompt += aboveText+`\n\n\n\n\n\n\n`;
        }
        if (aboveText.trim().length !== 0) {
            prompt += `Here's the code below:\n\n\n\n\n\n\n`;
            prompt += belowText+`\n\n\n\n\n\n\n`;
        }
    }
    
    return prompt;
}