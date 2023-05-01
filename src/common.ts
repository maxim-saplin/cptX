import { OpenAIApi } from "openai";
import * as vscode from 'vscode';

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
    let expert = '';
    let language = '';
    const languageId = getLanguageId(editor);

    switch (languageId) {
          case "dart":
            language = "Dart";
            expert = "Flutter developer";
            break;
          case "javascript":
            language = "JavaScript";
            expert = "Full-stack developer";
            break;
          case "typescript":
            language = "TypeScript";
            expert = "Full-stack developer";
            break;
          case "python":
            language = "Python";
            expert = "Back-end developer";
            break;
          case "java":
            language = "Java";
            expert = "Back-end developer";
            break;
          case "csharp":
            language = "C#";
            expert = ".NET developer";
            break;
          case "go":
            language = "Go";
            expert = "Back-end developer";
            break;
          case "ruby":
            language = "Ruby";
            expert = "Back-end developer";
            break;
          case "rust":
            language = "Rust";
            expert = "Systems software engineer";
            break;
          case "html":
            language = "HTML";
            expert = "Front-end developer";
            break;
          case "css":
            language = "CSS";
            expert = "Front-end developer";
            break;
          case "json":
            language = "JSON";
            break;
          case "yaml":
            language = "YAML";
            expert = "DevOps engineer";
            break;
      }

    return {expert, language };
}

export {
  updateProgress,
  getCodeAroundCursor,
  getCodeAroundSelection,
  calculateLineBoundariesWithMaxWordsLimmits,
  getGptReply,
  getLanguageId,
  getDeveloperAndLanguage as getExpertAndLanguage,
};