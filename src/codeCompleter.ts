import { OpenAIApi } from "openai";
import * as vscode from 'vscode';

export async function createOrRefactor(openAi: OpenAIApi) {
    try {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }

        const whatToDo = await vscode.window.showInputBox({ prompt: "What do you wnat me to do?" });
        if (!whatToDo) {
            return;
        }

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "cptX is working on your request",
                cancellable: false
            }, 
            async (progress) => {
                const interval = updateProgress(progress);

                const selectedCode = editor.document.getText(editor.selection).trim();
                const refactor = selectedCode.length > 0;
                let aboveText  = '';
                let belowText  = '';
                let cursorLine = 0;
                if (refactor) {
                    ({ aboveText, belowText } = getCodeAroundSelection(editor));
                }
                else {
                    ({ aboveText, belowText, cursorLine } = getCodeAroundCursor(editor));
                }

                let {developer, language} = getDeveloperAndLanguage(editor);

                let prompt = compilePrompt(whatToDo, selectedCode, aboveText, belowText, developer, language);

                //console.log(prompt);

                const result = await getGptReply(openAi,  prompt);
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

    function updateProgress(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>) {
        let progressPercent = 0;
        let prevProgressPercent = 0;
        const interval = setInterval(() => {
            prevProgressPercent = progressPercent;
            progressPercent = (progressPercent + 5) % 100;
            const increment = progressPercent - prevProgressPercent;
            progress.report({ increment });
        }, 100);
        return interval;
    }
}

function compilePrompt(whatToDo: string, refactorBlock: string, aboveText: string, belowText: string, developer: string, language: string) {
    if (language.trim().length !== 0) {
        language = ' ' + language;
    }
    let prompt = `You're an expert ${developer} software engineer. Produce a valid${language} code block (use${language} comments if you want to add something in order not to produce non-compilable code) based on the following request:\n${whatToDo}\n\n`;
    const refactor = refactorBlock.trim().length > 0;

    if (refactor) {

        prompt += `☝ Assume that the produced code block will replace the following existing code block. Either change it according to the request OR add comments if no changes are required→\n${refactorBlock}\n\n`;
    }

    prompt += `☝ Should you have any suggestions add them as as${language} comments at the top the produced code block. Inline comments are also welcome.\n\n`;
    prompt += `☝ To give you more context, here's `;
    if (aboveText.length > 0) {
        prompt += refactor ? `the code above the code block you're asked to change→\n${aboveText}\n\n` : `the code above the line where you're asked to insert the code→\n${aboveText}\n\n`;
    }
    if (belowText.length > 0) {
        if (aboveText.length > 0) { prompt += `And here's `; }
        prompt += refactor ? `the code below the code block you're asked to change→\n${belowText}\n\n` : `the code below the line where you're asked to insert the code→\n${belowText}\n\n`;
    };
    return prompt;
}

function getCodeAroundCursor(editor: vscode.TextEditor) {
    const maxWords = 2500;

    const cursorLine = editor.selection.active.line;
    let lineAbove = cursorLine - 1;
    let lineBelow = cursorLine + 1;
    ({ lineAbove, lineBelow } = calculateLineBoundariesWithMaxWordsLimmits(lineAbove, lineBelow, editor, maxWords));

    var aboveText = editor.document.getText(new vscode.Range(lineAbove, 0, cursorLine + 1, 0));
    var belowText = editor.document.getText(new vscode.Range(cursorLine + 1, 0, lineBelow, 0));
    return { aboveText, belowText, cursorLine };
}

function getCodeAroundSelection(editor: vscode.TextEditor) {
    const maxWords = 2500;

    let lineAbove = editor.selection.start.line - 1;
    let lineBelow = editor.selection.end.line + 1;
    ({ lineAbove, lineBelow } = calculateLineBoundariesWithMaxWordsLimmits(lineAbove, lineBelow, editor, maxWords));

    var aboveText = editor.document.getText(new vscode.Range(lineAbove, 0, editor.selection.start.line, 0));
    var belowText = editor.document.getText(new vscode.Range(editor.selection.end.line + 1, 0, lineBelow, 0));
    return { aboveText, belowText };
}

function calculateLineBoundariesWithMaxWordsLimmits(lineAbove: number, lineBelow: number, editor: vscode.TextEditor, maxWords: number) {
    let aboveWordCounter = 0;
    let belowWordCounter = 0;

    let iterationCounter = 0;
    while (iterationCounter < 1024) {
        let outOfAboveLines = lineAbove < 0;
        let outOfBelowLines = lineBelow >= editor.document.lineCount;
        if (outOfAboveLines && outOfBelowLines) {
            break;
        }

        if (!outOfAboveLines) {
            aboveWordCounter += editor.document.lineAt(lineAbove).text.split(' ').length;
            if (aboveWordCounter + belowWordCounter > maxWords) { break; }
        }

        if (!outOfBelowLines) {
            belowWordCounter += editor.document.lineAt(lineBelow).text.split(' ').length;
            if (aboveWordCounter + belowWordCounter > maxWords) { break; }
        }

        lineAbove--;
        lineBelow++;
        iterationCounter++;
    }

    if (lineAbove < 0) { lineAbove = 0; }
    if (lineBelow >= editor.document.lineCount) { lineBelow = editor.document.lineCount - 1; }
    return { lineAbove, lineBelow };
}

async function getGptReply(openAi: OpenAIApi, prompt: string) {
    const completion = await openAi.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [{
            role: "user",
            content: prompt,
        }]
    });
    let reply = completion.data.choices[0].message?.content ?? '';
    return reply;
}

function getLanguageId(editor: vscode.TextEditor) {
    const languageId = editor.document.languageId;
    return languageId;
}

function getDeveloperAndLanguage(editor: vscode.TextEditor) {
    let developer = '';
    let language = '';
    const languageId = getLanguageId(editor);

    switch (languageId) {
          case "dart":
            language = "Dart";
            developer = "Flutter";
            break;
          case "javascript":
            language = "JavaScript";
            developer = "Full-stack";
            break;
          case "typescript":
            language = "TypeScript";
            developer = "Full-stack";
            break;
          case "python":
            language = "Python";
            developer = "Back-end";
            break;
          case "java":
            language = "Java";
            developer = "Back-end";
            break;
          case "csharp":
            language = "C#";
            developer = ".NET";
            break;
          case "go":
            language = "Go";
            developer = "Back-end";
            break;
          case "ruby":
            language = "Ruby";
            developer = "Back-end";
            break;
          case "rust":
            language = "Rust";
            developer = "Systems";
            break;
          case "html":
            language = "HTML";
            developer = "Front-end";
            break;
          case "css":
            language = "CSS";
            developer = "Front-end";
            break;
          case "json":
            language = "JSON";
            break;
          case "yaml":
            language = "YAML";
            developer = "DevOps";
            break;
      }

    return { developer, language };
}
