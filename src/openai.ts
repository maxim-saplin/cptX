import { OpenAI, AzureOpenAI } from "openai";
import { Completion, Message, PromptCompleter } from "./common";
import { extensionSettings } from "./settings";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

function getOpenAIApi(requireKey: boolean = true): { client: OpenAI | AzureOpenAI | null; model: string } {
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

  const isAzure = apiProvider === "Azure (Gpt3.5 or Gpt4)" || apiProvider === "Azure OpenAI";

  // Check if apiProvider is set to Azure and Azure parameters are provided, throw error if not
  if (isAzure) {
    if (!azureEndpoint || !azureDeploymentName) {
      throw new Error(
        "Azure API provider is chosen for cptX extension yet Azure parameters are missing. Please check extension settings and try again."
      );
    }
  }

  let client;
  let model = isAzure ? azureDeploymentName : "gpt-3.5-turbo";
  
  if (isAzure) {
    // For Azure OpenAI
    const apiVersion = "2024-08-01-preview";
    
    client = new AzureOpenAI({
      apiKey: key,
      endpoint: azureEndpoint,
      apiVersion: apiVersion,
      deployment: azureDeploymentName,
    });

  } else {
    client = new OpenAI({
      apiKey: key,
    });
  }

  return { client, model };
}

async function getCompletion(
  client: OpenAI | AzureOpenAI,
  model: string,
  messages: Message[]
): Promise<Completion> {
  // Map your custom Message type to ChatCompletionMessageParam
  const formattedMessages = messages.map(message => {
    // Our Message type only has role and content properties
    // Cast to the expected role types but preserve the structure
    return {
      role: message.role as "system" | "user" | "assistant",
      content: message.content
    } as ChatCompletionMessageParam;
  });

  const completion = await client.chat.completions.create({
    model: model,
    messages: formattedMessages,
    temperature: 0.0,
  });

  let reply = completion.choices[0].message?.content ?? "";

  return {
    reply,
    promptTokens: completion.usage?.prompt_tokens || 0,
    completionTokens: completion.usage?.completion_tokens || 0,
  };
}

function getCompleter(): PromptCompleter {
  function _getCompleter(client: OpenAI | AzureOpenAI | null, model: string): PromptCompleter {
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
