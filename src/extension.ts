import * as vscode from 'vscode';
import { createOrRefactor } from './createOrRefactor';
import { OpenAIClient, OpenAIKeyCredential, AzureKeyCredential, ChatMessage } from "@azure/openai";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from './explain';
import { Message, PromptCompleter } from './common';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "cptX" is now active!');
	//setLogLevel("verbose");

	function getCompleter(client: OpenAIClient, model: string): PromptCompleter {
		return function(messages: Message[]): Promise<string> {
			for (var m in messages) {
				messages.push({role: messages[m].role, content: messages[m].content});
			}
			return getCompletion(client, model, messages);
		};
	}

	let { client, model } = getOpenAIApi();
	var completer = getCompleter(client, model);

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("cptx.APIKey");
		if (affected) {
			({ client, model } = getOpenAIApi());
			completer = getCompleter(client, model);
		}
	});

	context.subscriptions.push(vscode.commands.registerCommand('cptX.createOrRefactor', () => createOrRefactor(completer)));
	context.subscriptions.push(vscode.commands.registerCommand('cptX.explainOrAsk', () => explainOrAsk(completer)));
}


// This method is called when your extension is deactivated
export function deactivate() { }

function getApiKey(): string {
	const config = vscode.workspace.getConfiguration('cptx');
	const apiKey = config.get<string>('APIKey');
	return apiKey ?? '';
}

function getAzureSettings(): { apiProvider: string, azureEndpoint: string, azureDeploymentName: string } {
	const config = vscode.workspace.getConfiguration('cptx');
	const apiProvider = config.get<string>('apiProvider');
	const azureEndpoint = config.get<string>('AzureEndpoint');
	const azureDeploymentName = config.get<string>('AzureDeploymentName');

	return {
		apiProvider: apiProvider ?? '',
		azureEndpoint: azureEndpoint ?? '',
		azureDeploymentName: azureDeploymentName ?? ''
	};
}

function getOpenAIApi(): { client: OpenAIClient, model: string } {
	const key = getApiKey().trim();

	if (!key) {
		throw new Error('OpenAI API key is not set for cptX extension. Please check extension settings and try again.');
	}

	var settings = getAzureSettings();

	var isAzure = settings.apiProvider === "Azure (Gpt3.5 or Gpt4)";

	// Check if apiProvider is set to Azure and Azure parameters are provided, throw error if not
	if (isAzure) {
		if (!settings.azureEndpoint || !settings.azureDeploymentName) {
			throw new Error('Azure API provider is chosen for cptX extension yet Azure parameters are missing. Please check extension settings and try again.');
		}
	}

	const creds = isAzure ? new AzureKeyCredential(key) : new OpenAIKeyCredential(key);
	const client = isAzure ? new OpenAIClient(settings.azureEndpoint, creds) : new OpenAIClient(creds);
	const model = isAzure ? settings.azureDeploymentName : "gpt-3.5-turbo";

	return { client, model };
}

async function getCompletion(client: OpenAIClient, model: string,  messages: ChatMessage[] /*prompt: string*/) {
  
	const completion = await client
	  .getChatCompletions(
		model,
		messages,
		{temperature: 0.0}
	  );
  
	let reply = completion.choices[0].message?.content ?? '';
  
	return reply;
  }