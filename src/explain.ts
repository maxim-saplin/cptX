import { OpenAIApi } from "openai";
import * as vscode from 'vscode';
import * as common from './common';

async function explain(openAi: OpenAIApi) {
    try {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return vscode.window.showErrorMessage('No active editor');
      }
      const selectedCode = editor.document.getText(editor.selection).trim();
      if (selectedCode.length === 0) {
        return vscode.window.showErrorMessage('Please select some code to explain');
      }

      let { aboveText, belowText } = common.getCodeAroundSelection(editor);
  
      const prompt = `Please explain the selected code or provide advice:\n\n${selectedCode}`;
  
      const explanation = await common.getGptReply(openAi, prompt);
      vscode.window.showInformationMessage(explanation);
  
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate explanation: ${error}`);
    }
  } 