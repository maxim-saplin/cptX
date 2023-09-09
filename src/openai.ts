import {
  AzureKeyCredential,
  ChatMessage,
  OpenAIClient,
  OpenAIKeyCredential,
} from "@azure/openai";
import * as vscode from "vscode";
import { Completion, Message, PromptCompleter } from "./common";
import { extensionSettings } from "./settings";

function getOpenAIApi(): { client: OpenAIClient; model: string } {
  const key = extensionSettings.apiKey;
  const apiProvider = extensionSettings.apiProvider;
  const azureEndpoint = extensionSettings.azureEndpoint;
  const azureDeploymentName = extensionSettings.azureDeploymentName;

  if (!key) {
    throw new Error(
      "OpenAI API key is not set for cptX extension. Please check extension settings and try again."
    );
  }

  var isAzure = apiProvider === "Azure (Gpt3.5 or Gpt4)";

  // Check if apiProvider is set to Azure and Azure parameters are provided, throw error if not
  if (isAzure) {
    if (!azureEndpoint || !azureDeploymentName) {
      throw new Error(
        "Azure API provider is chosen for cptX extension yet Azure parameters are missing. Please check extension settings and try again."
      );
    }
  }

  const creds = isAzure
    ? new AzureKeyCredential(key)
    : new OpenAIKeyCredential(key);
  const client = isAzure
    ? new OpenAIClient(azureEndpoint, creds)
    : new OpenAIClient(creds);
  const model = isAzure ? azureDeploymentName : "gpt-3.5-turbo";

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
