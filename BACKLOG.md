## 0. Ignoring surrounding items when selecting smaller piece and asking to update it (e.g. in this case asked to have all params used in SQL)

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

## 1. When selecting code and asking to proceed the series (taking the first item as an example), the first item might be dropped from the result

Sample Dart code, when  3 overrides are selected and cptX is asked to add faObserver to the remaining 2 overrides, the returned result has 2 overrides, didPush is omitted

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

  ## 2 No valid code crested for a dart

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

## 3 backlog/package.json has garbage text inserted.
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

## 4 Not a codeblock returned, backlog/extension.ts_, cursor at line #59
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

## 5 Flutter/Dart, not valid code block returned for data_table_2.dart
*Prompt:* Add 2 fields for the 2 scroll bar visibility params in the constructor
*Result:*
```
  /// Exposes scroll controller of the SingleChildScrollView that makes data rows horizontally scrollable
  final ScrollController? horizontalScrollController;
--->  
Add the following code block right after the last field in the constructor:

  /// Determines whether the vertical scroll bar is visible.
  final bool? isVerticalScrollBarVisible;

  /// Determines whether the horizontal scroll bar is visible.
  final bool? isHorizontalScrollBarVisible;
```

## 6 Proofreading produces bad result, data_table_2_2.dart
*Prompt:* Proofread
*Result:*
As an AI language model, I cannot guarantee the accuracy of code reviews. However, based on my analysis, the code snippet seems to be defining properties and methods for a customized version of the DataTable widget in Flutter, implementing sticky columns and rows. The comments provide clear explanations of each property and method specified, including any customization or deviation from the standard DataTable widget. The `getMinMaxRowHeight` method calculates the effective minimum and maximum row heights based on provided values or fallbacks to the theme's defaults. Overall, the code seems well-documented and organized.

Selected block:
```
  /// The height of each row (excluding the row that contains column headings).
  ///
  /// If null, [DataTableThemeData.dataRowMinHeight] is used. This value defaults
  /// to [kMinInteractiveDimension] to adhere to the Material Design
  /// specifications.
  /// 
  /// Note that unlike stock [DataTable] from the SDK there's no capability to define min/max
  /// height of a row, corresponding properties are ingored. This is an implementation tradeoff
  /// making it possible to have performant sticky columns.
```

## 7 Don't mention bot is AI assistant

"As an AI language model, I cannot provide suggestions on how to restore NuGet packages in VSCode. However, I can review the provided code snippet."

E.g. add to prompt "don't preface your answer with AI"

## 8 Dart doc not fixed for sqlite_storage.dart

*Prompt:* Fix doc
*Expected:* Double slashes are changed to triple
*Selected block:*
/// SQLite implemetaion that saves prompt metadata to local file
/// Check for 'prompts' table, creates one if not present, check for
/// schema if present, fails if schema is not expected,
/// Here's how the table looks
/// ```
/// CREATE TABLE
// prompts (
//   run_started_at DATETIME not null default CURRENT_TIMESTAMP,
//   prompt_sent_at DATETIME not null,
//   prompt_updated_at DATETIME not null,
//   run_tag TEXT null,
//   tag TEXT null,
//   status TEXT not null,
//   prompt_tokens INTEGER NULL,
//   total_tokens INTEGER NULL,
//   request TEXT null,
//   response TEXT null,
//   retries INTEGER null,
//   primary key (run_started_at, prompt_sent_at)
// )
///```

## Invalid code block returned for sqlite_storage_2.dart

*Prompt:* Check the selected block to check for item equality rather than reference equality
To check for item equality rather than reference equality, replace the following code block:

*Selected block:*
        if (columns != expectedColumns) {
          throw Exception(
              'Prompts table schema does not match expected schema');
        }

*Result:*
```dart
if (columns != expectedColumns) {
  throw Exception(
      'Prompts table schema does not match expected schema');
}
```

with:

```dart
if (columns.length != expectedColumns.length ||
    !columns.every(expectedColumns.contains)) {
  throw Exception('Prompts table schema does not match expected schema');
}
```

This block checks if the `columns` list has the same length and contents as the `expectedColumns` list, using the `every` method to check for item equality. If they don't match, it throws an exception.

## Change precision, common.ts

*Prompt:* : Change precision of {end - start} to 2 decimals after point

*Selected block:*
`console.log(`getTextAroundSelection(): ${end - start}ms,`
in

 ```
  const end = performance.now();
  if (isDebugMode()) {
    console.log(`getTextAroundSelection(): ${end - start}ms,
    ${totalTokens} tokens,
    ${aboveText.split('\n').length + belowText.split('\n').length} lines`);
  }
  ```

*Expected:* 
`console.log(`getTextAroundSelection(): ${(end - start).toFixed(2)}ms,`