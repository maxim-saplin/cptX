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

    let prompt = `☝☝☝ You're an expert ${profile} asked to produce a valid${language} code block based on the following request:\n\n${whatToDo}\n\n`;
    const refactor = refactorBlock.trim().length > 0;

    if (refactor) {
        prompt += `☝☝☝ The produced code block will replace the eixsting code block which is located between '↓↓↓' and '↑↑↑' in the following source code→\n`;
        prompt += aboveText+'\n↓↓↓\n';
        prompt += refactorBlock+'\n↑↑↑\n';
        prompt += belowText+'\n\n';
        prompt += `☝☝☝ The produced code block will be inserted in the location between '↓↓↓' and '↑↑↑'\n`;
        prompt += `☝☝☝ Do not repeat whatever is present in the provided source code above '↓↓↓' and below '↑↑↑'\n`;
    }
    else {
        prompt += `☝☝☝ The produced code block will be inserted in the location marked by '→→→' in the following source code→\n`;
        prompt += aboveText+'\n\n'+belowText;
    }
    prompt += `☝☝☝ Make sure whatever you're producing is valid${language} code and it doesn't break anything in the source file.`;
    prompt += `☝☝☝ Be as concise as possible, you code will simply be pasted into the source code`;

    // prompt += `☝ To give you more context, here's `;
    // if (aboveText.length > 0) {
    //     prompt += refactor ? `the code above the code block you're asked to change→\n${aboveText}\n\n` : `the code above the line where you're asked to insert the code→\n${aboveText}\n\n`;
    // }
    // if (belowText.length > 0) {
    //     if (aboveText.length > 0) { prompt += `And here's `; }
    //     prompt += refactor ? `the code below the code block you're asked to change→\n${belowText}\n\n` : `the code below the line where you're asked to insert the code→\n${belowText}\n\n`;
    // };
    return prompt;
}