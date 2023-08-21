import TelemetryReporter from "@vscode/extension-telemetry";
import { getContextSize } from "./common";

let reporter: TelemetryReporter;

function initTelemetry(): TelemetryReporter {
  reporter = new TelemetryReporter(K);
  setTimeout(() => {
    sendExtensionStarted();
  }, 20);
  return reporter;
}

// send event any time after activation
function sendExtensionStarted() {
  if (reporter) {
    reporter.sendTelemetryEvent('extensionStarted');
  }
}

function sendCreateEvent(
  promptTokensCalculated: number,
  propmtTokens: number,
  completionTokens: number,
  durationSeconds: number
) {
  if (reporter) {
    reporter.sendTelemetryEvent('createCommand', undefined, {
      contextSize: getContextSize(),
      promptTokensCalculated: promptTokensCalculated,
      propmtTokens: propmtTokens,
      completionTokens: completionTokens,
      durationSeconds: durationSeconds,
    });
  }
}

function sendCreateCanceledEvent(durationSeconds: number) {
  if (reporter) {
    reporter.sendTelemetryEvent('createCommandCanceled', undefined, {
      contextSize: getContextSize(),
      durationSeconds: durationSeconds,
    });
  }
}

function sendExplainEvent(
  promptTokensCalculated: number,
  propmtTokens: number,
  completionTokens: number,
  durationSeconds: number
) {
  if (reporter) {
    reporter.sendTelemetryEvent('explainCommand', undefined, {
      contextSize: getContextSize(),
      promptTokensCalculated: promptTokensCalculated,
      propmtTokens: propmtTokens,
      completionTokens: completionTokens,
      durationSeconds: durationSeconds,
    });
  }
}

function sendExplainCanceledEvent(durationSeconds: number) {
  if (reporter) {
    reporter.sendTelemetryEvent('explainCommandCanceled', undefined, {
      contextSize: getContextSize(),
      durationSeconds: durationSeconds,
    });
  }
}

// Adding the requested send function for the `configurationChanged` event with additional parameters `contextSize` and `apiProvider`

function sendConfigurationChangedEvent(
  apiProvider: string,
  contextSize: number
) {
  if (reporter) {
    reporter.sendTelemetryEvent('configurationChanged', {
      apiProvider: apiProvider,
      contextSize: contextSize.toString(),
    });
  }
}

// End of code block

const K = new TextDecoder().decode(
  new Uint8Array([
    101, 99, 50, 52, 57, 52, 97, 52, 45, 50, 52, 56, 49, 45, 52, 98, 51, 50, 45,
    57, 50, 99, 54, 45, 98, 98, 101, 55, 100, 56, 99, 51, 55, 98, 49, 98,
  ])
);

export {
  initTelemetry,
  sendCreateEvent,
  sendExplainEvent,
  sendCreateCanceledEvent,
  sendExplainCanceledEvent,
  sendConfigurationChangedEvent,
};
