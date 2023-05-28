import * as vscode from 'vscode';
import { createOrRefactor } from './createOrRefactor';
import { OpenAIClient, OpenAIKeyCredential, AzureKeyCredential } from "@azure/openai";
//import {setLogLevel} from "@azure/logger";
import { explainOrAsk } from './explain';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "cptX" is now active!');
	//setLogLevel("verbose");

	let { client, model } = getOpenAIApi();
	var completer = function(prompt: string): Promise<string> {
		return getCompletion(client, model, prompt);
	}

	vscode.workspace.onDidChangeConfiguration(event => {
		let affected = event.affectsConfiguration("cptx.APIKey");
		if (affected) {
			({ client, model } = getOpenAIApi());
			completer = function(prompt: string): Promise<string> {
				return getCompletion(client, model, prompt);
			}
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
	}
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
			throw new Error('Azure parameters are missing for cptX extension with Azure API provider set. Please check extension settings and try again.');
		}
	}

	const creds = isAzure ? new AzureKeyCredential(key) : new OpenAIKeyCredential(key);
	const client = isAzure ? new OpenAIClient(settings.azureEndpoint, creds) : new OpenAIClient(creds);
	const model = isAzure ? settings.azureDeploymentName : "gpt-3.5-turbo";

	return { client, model };
}

async function getCompletion(client: OpenAIClient, model: string, prompt: string) {
	// TODO, remove workaround when Azure Open AI is fixed https://github.com/Azure/azure-sdk-for-js/issues/26021
	let isAzure = getAzureSettings().apiProvider === "Azure (Gpt3.5 or Gpt4)";
	let options = isAzure ?
	  {} :
	  {
		requestOptions:
		{
		  headers: {
			Authorization: `Bearer ${getApiKey()}`,
		  },
		}
	  };
  
	const completion = await client
	  .getChatCompletions(
		model,
		[{
		  role: "user",
		  content: prompt,
		}],
		options
	  );
  
	let reply = completion.choices[0].message?.content ?? '';
  
	return reply;
  }