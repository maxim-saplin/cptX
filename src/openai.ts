import {
  AzureKeyCredential,
  ChatMessage,
  OpenAIClient,
  OpenAIKeyCredential,
} from "@azure/openai";
import * as vscode from "vscode";
import { Completion, Message, PromptCompleter } from "./common";

function getAzureSettings(): {
  apiProvider: string;
  azureEndpoint: string;
  azureDeploymentName: string;
} {
  const config = vscode.workspace.getConfiguration("cptx");
  const apiProvider = config.get<string>("apiProvider");
  const azureEndpoint = config.get<string>("AzureEndpoint");
  const azureDeploymentName = config.get<string>("AzureDeploymentName");

  return {
    apiProvider: apiProvider ?? "",
    azureEndpoint: azureEndpoint ?? "",
    azureDeploymentName: azureDeploymentName ?? "",
  };
}

function getApiKey(): string {
  const config = vscode.workspace.getConfiguration("cptx");
  const apiKey = config.get<string>("APIKey");
  return apiKey ?? "";
}

function getOpenAIApi(): { client: OpenAIClient; model: string } {
  const key = getApiKey().trim();

  if (!key) {
    throw new Error(
      "OpenAI API key is not set for cptX extension. Please check extension settings and try again."
    );
  }

  var settings = getAzureSettings();

  var isAzure = settings.apiProvider === "Azure (Gpt3.5 or Gpt4)";

  // Check if apiProvider is set to Azure and Azure parameters are provided, throw error if not
  if (isAzure) {
    if (!settings.azureEndpoint || !settings.azureDeploymentName) {
      throw new Error(
        "Azure API provider is chosen for cptX extension yet Azure parameters are missing. Please check extension settings and try again."
      );
    }
  }

  const creds = isAzure
    ? new AzureKeyCredential(key)
    : new OpenAIKeyCredential(key);
  const client = isAzure
    ? new OpenAIClient(settings.azureEndpoint, creds)
    : new OpenAIClient(creds);
  const model = isAzure ? settings.azureDeploymentName : "gpt-3.5-turbo";

  return { client, model };
}

async function getCompletion(
  client: OpenAIClient,
  model: string,
  messages: ChatMessage[] /*prompt: string*/
): Promise<Completion> {
  const completion = await client.getChatCompletions(model, messages, {
    temperature: 0.0,
  });

  let reply = completion.choices[0].message?.content ?? "";

  return {
    reply,
    promptTokens: completion.usage.promptTokens,
    completionTokens: completion.usage.completionTokens,
  };
}

function getCompleter(): PromptCompleter {
  function _getCompleter(client: OpenAIClient, model: string): PromptCompleter {
    return function (messages: Message[]): Promise<Completion> {
      return getCompletion(client, model, messages);
    };
  }

  let { client, model } = getOpenAIApi();

  return _getCompleter(client, model);
}

export { getCompleter };
