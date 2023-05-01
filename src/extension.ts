import * as vscode from 'vscode';
import { createOrRefactor } from './createOrRefactor';
import { Configuration, OpenAIApi} from "openai";
import { explainOrAsk } from './explain';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cptX" is now active!');


	let openAi = getOpenAIApi();

	vscode.workspace.onDidChangeConfiguration(event => {
        let affected = event.affectsConfiguration("cptx.OpenAiApiKey");
        if (affected) { 
			openAi = getOpenAIApi();
		}
    });

	context.subscriptions.push(vscode.commands.registerCommand('cptX.createOrRefactor', () => createOrRefactor(openAi)));
	context.subscriptions.push(vscode.commands.registerCommand('cptX.explainOrAsk', () => explainOrAsk(openAi)));
}

// This method is called when your extension is deactivated
export function deactivate() {}

function getApiKey(): string {
    const config = vscode.workspace.getConfiguration('cptx');
    const apiKey = config.get<string>('OpenAiApiKey');
    return apiKey ?? '';
}

function getOpenAIApi() {
	const key = getApiKey();

	// check if key is empty and throw
	if (key.trim().length === 0) {
		throw new Error('OpenAI API key is not set for ccptx extension. Please check extension settings and try again.');
	}
	
	return new OpenAIApi(new Configuration({
		apiKey: key,
	}));
}