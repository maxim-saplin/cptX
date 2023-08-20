# Use ChatGPT as your (almost)free copilot
Save time not copying and pasting code between VSCode and ChatGPT window. The extension gives GPT context (code surrounding cursor or selection), primes the model by asking it to act as an expert in the given technology/language, sends your prompt and inserts the returned code block to the editor.

OpenAI (Gpt3.5) and Azure (Gpt3.5 and Gpt4) are supported!!!

![Into](images/intro.gif)

The extension is a great addition to Amazon CodeWhisperer or Github Copilot if you are missing the ability to explicitly instruct LLM on steps/task OR don't like suggestions that are continuously generated.

## Features
- Polyglot, can be used with any language
- Refactor selected code
- Insert new code at the current cursor location
- Ask for advice or explanation
- Supports APIs provided by OpenAI and Azure (OpenAI models hosted by Microsoft as part of Cognitive Services)
    - 'gpt-3.5-turbo' model when using OpenAI, any chat model when using Azure ('gpt-35-turbo' OR 'gpt4')

## Getting started with OpenAI
*Prerequisites:*
You need an OpenAI free trial or paid account.

*Configuring and using the extension:*
1. Go to https://platform.openai.com/account/api-keys and create a new key, copy it
2. Open VSCode Settings (File → Preferences → Settings *OR* Code → Settings → Settings), type "cptx" and paste API key

    <img src="images/settings.png" alt="drawing" width="500"/>
    
    - Make sure you have API provider set to "OpenAI (Gpt3.5)", leave Azure params empty

3. Open file in editor and select code of interest or put cursor at the desired location
4. Open up Command Palette (⇧⌘P on macOS, Ctrl + Shift + P on Windows and Linux) and type "cptx"
5. Choose any of the 2 commands:
    - cptX: Ask AI the question (e.g. explain)
    - cptX: Create new OR refactor existing code
    <img src="images/commands.png" alt="drawing" width="650"/>

6. Hit enter and wait for extension to complete the request

## Getting started with Azure
Azure requires a little more steps as OpenAI models require custom deployments before use.

*Prerequisites:*
- An active MS Azure subscription with credits available (e.g. free monthly credits assigned for within Professional/Enterprise subscription)
- As of May 2023 OpenAI services can not be created right, Microsoft approval needs to be requested
    - When creating an OpenAI service in Azure Portal there's a link to waitlist form, fill it, give couple of days for confirmation from MS
    - Gpt4 has a separate waitlist and a separate form that can be filled when you are granted with access to OpenAI Services
- You have created Azure OpenAI service/endpoint in Azure Portal (https://portal.azure.com)
- For this endpoint you have created a deployment in Azure AI Studio (https://oai.azure.com/portal)


*Configuring and using the extension:*
1. Go to https://oai.azure.com/portal and open chat playground
    - You can click in the right top corner and pick an endpoint/resource if there're multiple
2. Click "View code" button under "Chat Session" pane, here you can find the 3 params required by the extension
    
    <img src="images/oai.png" alt="drawing" width="650"/>
   
    - Endpoint (openai.api_base)
    - Deployment (engine)
    - API Key (scroll down to the bottom of the pop-up)

3. Open VSCode Settings (File → Preferences → Settings *OR* Code → Settings → Settings), type "cptx" 

    <img src="images/settings_azure.png" alt="drawing" width="500"/>
    
    - Set API provider to "Azure (Gpt3.5 or Gpt4)"
    - Paste API key, endpoint and model

4. Open file in editor and select code of interest or put cursor at the desired location
5. Open up Command Palette (⇧⌘P on macOS, Ctrl + Shift + P on Windows and Linux) and type "cptx"
6. Choose any of the 2 commands:
    - cptX: Ask AI the question (e.g. explain)
    - cptX: Create new OR refactor existing code
    <img src="images/commands.png" alt="drawing" width="650"/>

7. Hit enter and wait for extension to complete the request

## Limitations
- LLMs/GPT are non-deterministic. If you don't get what you want from the first attempt - iterate, experiment.
    - Unlike standard refactoring tools, which rely on static analysis/deterministic logic and produce the right result from 1st attempt, be ready to check and fix the product of LLM/GPT
- The context is limited by whatever code is in the current file, no knowledge of project structure or other files
    - The extension gathers all lines around cursor/selection (up to 2500 words total)
- The extension doesn't add imports when new dependencies are introduced in the created code

## How is it different from Amazon CodeWhisperer and GitHub Copilot
- Unlike CodeWhisperer the extension can work with any programming language or technology. E.g. Flutter and Dart are supported (while not available in CodeWhisperer)
- It is not an uncommon opinion over the internet (as of April 2023) that ChatGPT is better at coding than above options.
- It's almost free. CoPilot costs you $20 monthly or $100 yearly. With this extension even with heavy usage it's unlikely you'll exceed $1 monthly bill for OpenAI usage.
- Oh, and you don't have to enter credit card details (as with GH Copilot) to start the free 3 month trial with $5 monthly quota for OpenAI API calls (as of April 2023).
- The extension is explicit is use, i.e. it doesn't work in the background and doesn't interfere by constantly suggesting code and moving lines around -> you request something and you get a response.

## Privacy

The extension relies on APIs and cloud service by OpenAI and Microsoft. Both OpenAI and Azure state that they don't use prompts sent to APIs for training or improving models, the data you put into models can't leak into base models:
- Azure [privacy statement](https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy#is-customer-data-processed-by-azure-openai-sent-to-openai) says that:
    - Customer data processed by Azure OpenAI is not sent to OpenAI
    - And not used to train the OpenAI models
    - It is possible to [opt-out](https://learn.microsoft.com/en-us/legal/cognitive-services/openai/data-privacy?context=%2Fazure%2Fcognitive-services%2Fopenai%2Fcontext%2Fcontext#can-a-customer-opt-out-of-the-logging-and-human-review-process) of the logging and human review process
- OpenAI [data usage polices](https://openai.com/policies/api-data-usage-policies) say that no data submitted via API is used for training or improving their models

The extension does not use the public chat at https://chat.openai.com/ which was the source of news around leaks (user prompts used for training) and bans (explicitly restricting employees from using ChatGPT for work related matters).

## Tips and Tricks

- "Check for bugs" request in 'cptX: Ask AI the question (e.g. explain)' - you can select ~100-300 lines (~2000k context) and ask to verify what's written, the extension is good at spotting minor issues (e.g. had this trailing comma in SQLite query which drove me crazy with runtime exceptions)


## Release Notes

### 1.0.0
 - New prompts for better results (system message, multiple user messages)
 - LLM context size can be defined in settings
 - Tokenizer for better management of context size (tiktoken)
 - VSCode Telemetry

### 0.0.9
 - Updated Microsoft openai client library fixing Azure auth (https://github.com/Azure/azure-sdk-for-js/issues/26021) 

### 0.0.8
 - More detailed error message (e.g. API not available)

### 0.0.7
 - Added support for Azure OpenAI endpoints (Gpt3.5 and Gpt4)
 - Extended Readme 

### 0.0.6
- Verbose error detail if OpenAI call is failed

### 0.0.5
- Created code is formatted (Format selection)

### 0.0.4
- Time reporting fixed for create or refactor
- More language profiles for AI priming (Dart, JavaScript, TypeScript, Python, Java, C#, Go, Ruby, Rust, HTML, CSS, JSON, YAML, C, C++, Swift, Objective-C, Objective-C++, Kotlin)
- Readme fixes

### 0.0.3
- Cancellation fixed
- Explanation fixed
- Typos in Readme

### 0.0.2

Description texts fixed

### 0.0.1

Initial release of the the extension