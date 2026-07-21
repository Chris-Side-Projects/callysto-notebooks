import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const forwardedNames = [
  "APP_URL",
  "CONTENT_CAPABILITY_KEY_ID",
  "CONTENT_CAPABILITY_PUBLIC_KEY_PEM",
  "M0_CONTENT_HOST",
  "M0_CONTENT_PORT",
  "M0_PREVIEW_DRAFT_GENERATION",
  "M0_PREVIEW_DRAFT_ID",
  "M0_RENDER_REVISION_ID",
];

const gatewayEnvironment = { M0_GATEWAY_ENVIRONMENT_MODE: "strict-allowlist" };
for (const name of forwardedNames) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required by the M0 content gateway launcher`);
  }
  gatewayEnvironment[name] = value;
}

const gatewayPath = fileURLToPath(
  new URL("./m0-content-gateway.mjs", import.meta.url),
);
const child = spawn(process.execPath, [gatewayPath], {
  env: gatewayEnvironment,
  stdio: "inherit",
});

let stopping = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    if (!child.killed) {
      child.kill(signal);
    }
  });
}

child.on("error", (error) => {
  process.stderr.write(
    `M0 content gateway launcher failed: ${error.message}\n`,
  );
  process.exitCode = 1;
});

const { code, signal } = await new Promise((resolve) => {
  child.once("exit", (exitCode, exitSignal) =>
    resolve({ code: exitCode, signal: exitSignal }),
  );
});

if (!stopping && code !== 0) {
  process.stderr.write(
    `M0 content gateway exited unexpectedly (${signal ?? code ?? "unknown"})\n`,
  );
  process.exitCode = code ?? 1;
}
