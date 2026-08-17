import { generateKeyPairSync, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

const appHost = "127.0.0.1";
const appPort = "3100";
const contentHost = "::1";
const contentPort = "3101";
const appOrigin = `http://${appHost}:${appPort}`;
const contentOrigin = `http://localhost:${contentPort}`;
const renderRevisionId = "rr-m0-isolation-v1";
const previewDraftId = "draft-m0-isolation";
const previewDraftGeneration = "7";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();
const publicKeyPem = publicKey
  .export({ format: "pem", type: "spki" })
  .toString();
const keyId = `m0-manual-${randomUUID()}`;

const children = [
  spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      appHost,
      "--port",
      appPort,
    ],
    {
      env: {
        APP_URL: appOrigin,
        CONTENT_CAPABILITY_KEY_ID: keyId,
        CONTENT_CAPABILITY_PRIVATE_KEY_PEM: privateKeyPem,
        CONTENT_ORIGIN: contentOrigin,
        M0_PROOF_ENABLED: "1",
        NEXT_TELEMETRY_DISABLED: "1",
        NODE_ENV: "production",
      },
      stdio: "inherit",
    },
  ),
  spawn(process.execPath, ["scripts/m0-content-gateway.mjs"], {
    env: {
      APP_URL: appOrigin,
      CONTENT_CAPABILITY_KEY_ID: keyId,
      CONTENT_CAPABILITY_PUBLIC_KEY_PEM: publicKeyPem,
      M0_GATEWAY_ENVIRONMENT_MODE: "strict-allowlist",
      M0_PREVIEW_DRAFT_GENERATION: previewDraftGeneration,
      M0_PREVIEW_DRAFT_ID: previewDraftId,
      M0_RENDER_REVISION_ID: renderRevisionId,
      M0_CONTENT_HOST: contentHost,
      M0_CONTENT_PORT: contentPort,
    },
    stdio: "inherit",
  }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

for (const child of children) {
  child.on("error", (error) => {
    process.stderr.write(`M0 proof server failed to start: ${error.message}\n`);
    stop();
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    if (!stopping) {
      process.stderr.write(
        `M0 proof child exited unexpectedly (${signal ?? code ?? "unknown"})\n`,
      );
      stop();
      process.exitCode = code && code !== 0 ? code : 1;
    }
  });
}

await Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.once("exit", resolve);
      }),
  ),
);
