import TelemetryReporter from "@vscode/extension-telemetry";

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
    reporter.sendTelemetryEvent("extensionStarted");
  }
}

const K = new TextDecoder().decode(
  new Uint8Array([
    101, 99, 50, 52, 57, 52, 97, 52, 45, 50, 52, 56, 49, 45, 52, 98, 51, 50, 45,
    57, 50, 99, 54, 45, 98, 98, 101, 55, 100, 56, 99, 51, 55, 98, 49, 98,
  ])
);

export {initTelemetry};
