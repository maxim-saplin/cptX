import {
  AzureKeyCredential,
  ChatMessage,
  OpenAIClient,
  OpenAIKeyCredential,
} from "@azure/openai";
import * as vscode from "vscode";
import { Completion, Message, PromptCompleter } from "./common";
import { extensionSettings } from "./settings";

function getOpenAIApi(requireKey: boolean = true): { client: OpenAIClient | null; model: string } {
  const key = extensionSettings.apiKey;
  const apiProvider = extensionSettings.apiProvider;
  const azureEndpoint = extensionSettings.azureEndpoint;
  const azureDeploymentName = extensionSettings.azureDeploymentName;

  if (!key) {
    if (requireKey) {
      throw new Error(
        "OpenAI API key is not set for cptX extension. Please check extension settings and try again."
      );
    } else {
      // Return null client when key is not required (for features like token counting)
      return { client: null, model: "gpt-3.5-turbo" };
    }
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
    promptTokens: completion.usage?.promptTokens || 0,
    completionTokens: completion.usage?.completionTokens || 0,
  };
}

function getCompleter(): PromptCompleter {
  function _getCompleter(client: OpenAIClient | null, model: string): PromptCompleter {
    return async function (messages: Message[]): Promise<Completion> {
      if (!client) {
        // API key is required when actually making API calls
        throw new Error(
          "OpenAI API key is not set for cptX extension. Please check extension settings and try again."
        );
      }
      return getCompletion(client, model, messages);
    };
  }

  // Don't require API key until an actual API call is made
  let { client, model } = getOpenAIApi(false);

  return _getCompleter(client, model);
}

export { getCompleter };
