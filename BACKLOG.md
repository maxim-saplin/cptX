## 0. Ignoring surrounding items when selecting smaller peiace and asking to update it (e.g. in this case asked to have all params used in SQL)

void updatePromptInDb(DateTime promtStartedAt, int promptTokens, int totalTokens, int pairsReturned,
     int validNamespaceCount, int validSkillsCount, int naSkillCount, int validMatches) {
  final db = getDb();
  try {
Here's the updated code block with all values from local params added:

```
void updatePromptInDb(DateTime promtStartedAt, int promptTokens, int totalTokens, int pairsReturned,
     int validNamespaceCount, int validSkillsCount, int naSkillCount, int validMatches) {
  final db = getDb();
  try {
    db.execute(
        "UPDATE prompts SET status = ?, tokens_sent = ?, total_tokens = ?, pairs_returned = ?, namespaces_returned_valid = ?, skills_returned_valid = ?, skills_returned_na = ?, pairs_returned_valid_not_na = ? WHERE prompt_sent_at = ?",
        [
          'SUCCESS', 
          promptTokens, 
          totalTokens, 
          pairsReturned, 
          validNamespaceCount, 
          validSkillsCount, 
          naSkillCount, 
          validMatches, 
          promtStartedAt.toIso8601String()
        ]);
  } finally {
    db.dispose();
  }
}
```
  } finally {
    db.dispose();
  }
}

## 1. When selecting code and asking to proceed the series (taking the first item as an example), the first item might be droped from the result

Sample Dart code, when  3 overrides are selected and cptX is asked to add faObserver to the remaining 2 overrides, the returned result has 2 overrides, didPush is ommited

```
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    if (faObserver != null) {
      faObserver!.didPush(route, previousRoute);
      return;
    }
    if (routeFilter(route)) {
      _sendScreenView(route);
    }
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null && routeFilter(newRoute)) {
      _sendScreenView(newRoute);
    }
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (previousRoute != null &&
        routeFilter(previousRoute) &&
        routeFilter(route)) {
      _sendScreenView(previousRoute);
    }
  }
  ```

  ##3 No valid code crested for a dart

  class PromptRunner {
  /// A class for running an OpenAI prompt.
  PromptRunner({
    required this.parallelWorkers,
    required this.apiKeys,
    required this.breakOnError,
    required this.totalIterations,
    required this.startAtIteration,
  });

  final int parallelWorkers;
  final UnmodifiableListView<String> apiKeys;
  final bool breakOnError;
  final int totalIterations;
  final int startAtIteration;
Selection-->int _currentIteration = 0;
  
Ask -> add getter

RESULT -->

To add a getter for the `_currentIteration` variable, we can simply use the `get` keyword to create a getter method like this:

```dart
int _currentIteration = 0;

int get currentIteration => _currentIteration;
```

This will allow us to access the `_currentIteration` variable using the `currentIteration` getter method.

##4 backlog/package.json has garbage text inserted.
*Prompt:* Add dropdown with 3 values: OpenAI Gpt3.5, Azure Gpt3.5, Azure Gpt4 - default value is OpenAI. Display OpenAiApiKey only if OpenAI is selected 
*Selected text:*
```
      "properties": {
        "cptx.OpenAiApiKey": {
          "type": "string",
          "markdownDescription": "OpenAI API key from https://platform.openai.com/account/api-keys"
        }
      }
```
*Result*:
Here's the modified code block:

```
"properties": {
  "cptx.apiProvider": {
    "type": "string",
    "enum": [
      "OpenAI Gpt3.5",
      "Azure Gpt3.5",
      "Azure Gpt4"
    ],
    "default": "OpenAI Gpt3.5",
    "markdownDescription": "Choose the AI provider for the copilot"
  },
  "cptx.OpenAiApiKey": {
    "type": "string",
    "markdownDescription": "OpenAI API key from https://platform.openai.com/account/api-keys",
    "visibleWhen": {
      "equals": "OpenAI Gpt3.5",
      "$ref": "#/properties/cptx.apiProvider"
    }
  }
}
```

I added a new property `cptx.apiProvider` with an `enum` attribute of three values: OpenAI Gpt3.5, Azure Gpt3.5, and Azure Gpt4. 

The `default` value is set to OpenAI Gpt3.5. 

I also added a `"visibleWhen"` property to the `cptx.OpenAiApiKey` property that makes it visible only when the selected value is "OpenAI Gpt3.5".

##5 Not a codeblock returned, backlog/extension.ts_, cursor at line #59
*Prompt:*If apiProvider != "Azure (Gpt3.5 or Gpt4)" and azure params in settings are empty - throw

*Result:*

	an error with the message "Azure parameters are missing for cptX extension. Please check extension settings and try again." Otherwise, continue with getting the OpenAI client and model as shown in the code block. 

```
	if (settings.apiProvider !== 'Azure (Gpt3.5 or Gpt4)' && !settings.azureEndpoint && !settings.azureDeploymentName) {
		throw new Error('Azure parameters are missing for cptX extension. Please check extension settings and try again.');
	}

	const openaiClient = new OpenAIClient(
		settings.apiProvider === 'Azure (Gpt3.5 or Gpt4)'
			? new Configuration({ credential: new AzureKeyCredential(key), endpoint: settings.azureEndpoint })
			: new Configuration({ apiKey: key }),
	);
	const model = settings.azureDeploymentName;

	return { client: openaiClient, model };
```