# Use ChatGPT as your (almost)free copilot

Save time for copying and pasting code between VSCode and ChatGPT window. The extension provides ChatGPT with context (code surrounding your cursor or selection), prime the model by asking it to act as expert in the given technology/languages, send your prompt and insert the returned code block.

The extension might be a great addition to Amazom CodeWhisperer orGithub Copilot for the cases when you need to explicitly instruct GPT on  changes to be done and have the request scoped to your currently open file OR selection within the editor.

## Features

- Based on 'gpt-3.5-turbo' model by OpenAI
- Polyglot, write in any language
- Refactor selected code
- Insert new code at the current cursor location
- Ask for advice or explanation

## Limitations
- The context is limited by whatever code is in the current file, no knowledge of project structure or other files
- The extension doesn't add imports when new dependencies are used in created code

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Extension Settings and OpenAI API Key

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## How is it different from Amazon Codewhisperer and GitHub Copilot
- Unlike Codewhisperer the extension can work with any programming language or technology. E.g. Flutter and Dart are supported (while no available in Codewhisperer)
- It is not an uncommon opinion over the internet (as of April 2023) that ChatGPT is better at coding than both options.
- It's almost free. CoPilot costs you $20 monthly or $100 yearly. Even with heavy usage it's unlikely you'll exceed $1 monthly bill.
- Oh, and you don't have to enter credit card details (as with GH Copilot) to start free 3 month trial with $5 monthly for OpenAI API (as of April 2023).
- The extension is explicit is use, i.e. it doesn't work in background and doesn't interfere by constantly suggesting code and moving lines around -> you request an action and you get a response.

## Release Notes

### 0.0.1

Initial release of the the extension