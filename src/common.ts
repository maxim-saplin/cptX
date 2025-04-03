import { RequestOptions } from "https";
import { Performance, performance } from "perf_hooks";
import * as vscode from "vscode";
import { getEncoding } from "js-tiktoken";
import { config, extensionSettings } from "./settings";

function updateProgress(
  progress: vscode.Progress<{
    message?: string | undefined;
    increment?: number | undefined;
  }>,
  start: number | undefined
) {
  let progressPercent = 0;
  let prevProgressPercent = 0;
  const interval = setInterval(() => {
    prevProgressPercent = progressPercent;
    progressPercent = (progressPercent + 5) % 100;
    const increment = progressPercent - prevProgressPercent;
    progress.report({
      message: start !== undefined ? getElapsedSeconds(start) + "s" : "",
      increment,
    });
  }, 100);
  return interval;
}

const encoding = getEncoding("o200k_base");
function getContextSize() : number {
  return extensionSettings.contextSize;
}
// This is the number of tokens that goes in the first request leaving the rest for completion and insertion into editor
const maxTokensInRequest = 0.67 * getContextSize();

function countTokens(input: string): number {
  const tokens = encoding.encode(input).length;
  return tokens;
}

/**
 * Retrieves the code around the cursor in the TextEditor.
 * Limmits the number of text to max token ceiling based on settings (ContextSize).
 *
 * @param editor The vscode.TextEditor object representing the active editor.
 * @param tokensAlreadyInRequest gives the function knowledge how many tokens are already reserved/in use (e.g. instruction, prompt)
 * @returns An object containing the code above the cursor, the code below the cursor, and the cursor line number.
 */

function getCodeAroundCursor(
  editor: vscode.TextEditor,
  tokensAlreadyInRequest: number
): { aboveText: string; belowText: string; cursorLine: number; tokens: number } {
  const cursorLine = editor.selection.active.line;
  let lineAbove = cursorLine - 1;
  let lineBelow = cursorLine + 1;
  let totalTokens = 0;
  ({ lineAbove, lineBelow, totalTokens } = calculateLineBoundariesWithMaxTokensLimmit(
    lineAbove,
    lineBelow,
    editor,
    maxTokensInRequest - tokensAlreadyInRequest
  ));

  var aboveText = editor.document.getText(
    new vscode.Range(lineAbove, 0, cursorLine + 1, 0)
  );
  var belowText = editor.document.getText(
    new vscode.Range(cursorLine + 1, 0, lineBelow, 0)
  );
  return { aboveText, belowText, cursorLine, tokens: totalTokens };
}

type PromptCompleter = (messages: Message[]) => Promise<Completion>;

type Completion = {
  reply: string;
  promptTokens: number;
  completionTokens: number;
};

/**
 * Retrieves the code around the selected block in the TextEditor.
 * Limmits the number of text to max token ceiling based on settings (ContextSize).
 *
 * @param editor The vscode.TextEditor object representing the active editor.
 * @param tokensAlreadyInRequest gives the function knowledge how many tokens are already reserved/in use (e.g. instruction, prompt)
 * @returns An object containing the code above the cursor, the code below the cursor, and the cursor line number.
 */

function getCodeAroundSelection(
  editor: vscode.TextEditor,
  tokensAlreadyInRequest: number
): { aboveText: string; belowText: string; tokens: number } {
  const start = performance.now();

  let lineAbove = editor.selection.start.line - 1;
  let lineBelow = editor.selection.end.line + 1;
  let totalTokens = 0;
  ({ lineAbove, lineBelow, totalTokens } =
    calculateLineBoundariesWithMaxTokensLimmit(
      lineAbove,
      lineBelow,
      editor,
      maxTokensInRequest - tokensAlreadyInRequest
    ));

  var aboveText = editor.document.getText(
    new vscode.Range(lineAbove, 0, editor.selection.start.line, 0)
  );
  var belowText = editor.document.getText(
    new vscode.Range(
      editor.selection.end.line +
        // Don't add 1 line if there's something selected
        (editor.selection.isEmpty ? 0 : 1),
      0,
      lineBelow,
      0
    )
  );

  const end = performance.now();
  debugLog(
    `getTextAroundSelection(): ${(end - start).toFixed(
      2
    )}ms, ${totalTokens} tokens, ${
      aboveText.split("\n").length + belowText.split("\n").length
    } lines`
  );

  return { aboveText, belowText, tokens: totalTokens };
}

function debugLog(message: any) {
  if (config.isDebugMode) {
    console.log(message);
  }
}

function calculateLineBoundariesWithMaxTokensLimmit(
  lineAbove: number,
  lineBelow: number,
  editor: vscode.TextEditor,
  maxTokens: number
) {
  //let aboveTokens = 0;
  //let belowTokens = 0;
  let totalTokens = 0;
  const maxLines = 16384;

  let iterationCounter = 0;
  while (iterationCounter < maxLines) {
    let outOfAboveLines = lineAbove < 0;
    let outOfBelowLines = lineBelow >= editor.document.lineCount;
    if (outOfAboveLines && outOfBelowLines) {
      break;
    }

    if (!outOfAboveLines) {
      totalTokens += countTokens(editor.document.lineAt(lineAbove).text);
      if (totalTokens > maxTokens) {
        break;
      }
    }

    if (!outOfBelowLines) {
      totalTokens += countTokens(editor.document.lineAt(lineBelow).text);
      if (totalTokens > maxTokens) {
        break;
      }
    }

    lineAbove--;
    lineBelow++;
    iterationCounter++;
  }

  if (lineAbove < 0) {
    lineAbove = 0;
  }
  if (lineBelow >= editor.document.lineCount) {
    lineBelow = editor.document.lineCount - 1;
  }
  return { lineAbove, lineBelow, totalTokens };
}

function getLanguageId(editor: vscode.TextEditor) {
  // https://code.visualstudio.com/docs/languages/identifiers
  const languageId = editor.document.languageId;
  return languageId;
}

function getExpertAndLanguage(editor: vscode.TextEditor) {
  let expert = "software developer";
  let language = "";
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
      expert = "Web developer";
      break;
    case "yaml":
      language = "YAML";
      expert = "DevOps engineer";
      break;
    case "c":
      language = "C";
      expert = "Systems programmer";
      break;
    case "cpp":
      language = "C++";
      expert = "Game developer";
      break;
    case "swift":
      language = "Swift";
      expert = "Apple developer";
      break;
    case "objective-c":
      language = "Objective-C";
      expert = "Apple developer";
      break;
    case "objective-cpp":
      language = "Objective-C++";
      expert = "Apple developer";
      break;
    case "kotlin":
      language = "Kotlin";
      expert = "Android developer";
      break;
    case "php":
      language = "PHP";
      expert = "PHP developer";
      break;
    case "sql":
      language = "SQL";
      expert = "Database developer";
      break;
    case "shellscript":
        language = "Bash";
        expert = "DevOps engineer";
        break;
  }

  return { expert, language, languageId };
}

function commentOutLine(languageId: string, line: string): string {
  let commentedLine = "";

  switch (languageId) {
    case "dart":
      commentedLine = `// ` + line;
      break;
    case "javascript":
      commentedLine = `// ` + line;
      break;
    case "typescript":
      commentedLine = `// ` + line;
      break;
    case "python":
      commentedLine = `# ` + line;
      break;
    case "java":
      commentedLine = `// ` + line;
      break;
    case "csharp":
      commentedLine = `// ` + line;
      break;
    case "go":
      commentedLine = `// ` + line;
      break;
    case "ruby":
      commentedLine = `# ` + line;
      break;
    case "rust":
      commentedLine = `// ` + line;
      break;
    case "html":
      commentedLine = `<!-- ` + line + `-->`;
      break;
    case "css":
      commentedLine = `/* ` + line + `*/`;
      break;
    case "yaml":
      commentedLine = `# ` + line;
      break;
    case "c":
      commentedLine = `// ` + line;
      break;
    case "cpp":
      commentedLine = `// ` + line;
      break;
    case "swift":
      commentedLine = `// ` + line;
      break;
    case "objective-c":
      commentedLine = `// ` + line;
      break;
    case "objective-cpp":
      commentedLine = `// ` + line;
      break;
    case "kotlin":
      commentedLine = `// ` + line;
      break;
    case "php":
      commentedLine = `// ` + line;
      break;
    case "sql":
      commentedLine = `-- ` + line;
      break;
    case "shellscript":
      commentedLine = `# ` + line;
      break;
    default:
      commentedLine = `// ` + line;
  }

  return commentedLine;
}

function getElapsedSeconds(start: number): string {
  const end = performance.now();
  const duration = ((end - start) / 1000).toFixed(1); // return 1 decimal after point
  return duration;
}

function getElapsedSecondsNumber(start: number): number {
  const end = performance.now();
  const duration = ((end - start) / 1000); // return 1 decimal after point
  return duration;
}

type Message = {
  role: string;
  content: string;
};

type Role = "system" | "user" | "assistant";

function addMessageToPrompt(messages: Message[], content: string, role: Role) {
  messages.push({ role, content });
}

// Wrapper for adding a system message to the prompt
function addSystem(messages: Message[], content: string) {
  return addMessageToPrompt(messages, content, "system");
}

// Wrapper for adding a user message to the prompt
function addUser(messages: Message[], content: string) {
  return addMessageToPrompt(messages, content, "user");
}

// Wrapper for adding an assistant message to the prompt
function addAssistant(messages: Message[], content: string) {
  return addMessageToPrompt(messages, content, "assistant");
}

function removeTripleBackticks(input: string): string {
  let lines = input.split("\n");

  // Trim empty lines at the ends
  let startIndex = 0;
  let endIndex = lines.length - 1;
  while (startIndex <= endIndex && lines[startIndex].trim() === "") {
    startIndex++;
  }
  while (endIndex >= startIndex && lines[endIndex].trim() === "") {
    endIndex--;
  }

  lines = lines.slice(startIndex, endIndex + 1);
  startIndex = 0;
  endIndex = lines.length - 1;

  // Find tripple backticks
  while (startIndex <= endIndex) {
    if (lines[startIndex].trim().startsWith("```")) {
      break;
    }
    startIndex++;
  }
  while (endIndex >= startIndex) {
    if (lines[endIndex].trim().startsWith("```")) {
      break;
    }
    endIndex--;
  }

  if (startIndex +1 <= endIndex-1 && startIndex >= 0 && endIndex < lines.length ) {
    lines = lines.slice(startIndex+1, endIndex);
  }

  return lines.join("\n");
}

const formatDate = (
  date: Date,
  secondFormat: boolean = false
): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  if (secondFormat) {
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } else {
    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }
};

export {
  updateProgress,
  getCodeAroundCursor,
  getCodeAroundSelection,
  getLanguageId,
  getExpertAndLanguage,
  getElapsedSeconds,
  getElapsedSecondsNumber,
  PromptCompleter,
  Completion,
  debugLog,
  Message,
  addSystem,
  addUser,
  addAssistant,
  commentOutLine,
  removeTripleBackticks as extractBlockBetweenTripleBackticks,
  countTokens,
  getContextSize,
  formatDate
};
