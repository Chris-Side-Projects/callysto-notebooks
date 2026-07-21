import { defineConfig, devices } from "@playwright/test";
import { generateKeyPairSync, randomUUID } from "node:crypto";

const M0_RENDER_REVISION_ID = "rr-m0-isolation-v1";
const M0_PREVIEW_DRAFT_ID = "draft-m0-isolation";
const M0_PREVIEW_DRAFT_GENERATION = 7;

const noProxyHosts = new Set(
  `${process.env.NO_PROXY ?? ""},${process.env.no_proxy ?? ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
for (const host of ["127.0.0.1", "::1", "[::1]", "localhost"]) {
  noProxyHosts.add(host);
}
const noProxy = [...noProxyHosts].join(",");
process.env.NO_PROXY = noProxy;
process.env.no_proxy = noProxy;

const appHost = "127.0.0.1";
const appPort = 3100;
const contentHost = "::1";
const contentPort = 3101;
const appOrigin = `http://${appHost}:${appPort}`;
const contentOrigin = `http://localhost:${contentPort}`;
const contentListenOrigin = `http://[${contentHost}]:${contentPort}`;
const useProductionServer =
  Boolean(process.env.CI) || process.env.CALLYSTO_PLAYWRIGHT_PRODUCTION === "1";
const webServerCommand = useProductionServer
  ? `npm run start -- --hostname ${appHost} --port ${appPort}`
  : `npm run dev -- --hostname ${appHost} --port ${appPort}`;

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();
const publicKeyPem = publicKey
  .export({ format: "pem", type: "spki" })
  .toString();
const capabilityKeyId = `m0-playwright-${randomUUID()}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: appOrigin,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: [
    {
      command: webServerCommand,
      env: {
        APP_URL: appOrigin,
        CONTENT_CAPABILITY_KEY_ID: capabilityKeyId,
        CONTENT_CAPABILITY_PRIVATE_KEY_PEM: privateKeyPem,
        CONTENT_CAPABILITY_PUBLIC_KEY_PEM: "",
        CONTENT_ORIGIN: contentOrigin,
        CONTENT_PREVIEW_TTL_SECONDS: "5",
        CONTENT_PUBLIC_TTL_SECONDS: "3",
        M0_PROOF_ENABLED: "1",
      },
      reuseExistingServer: false,
      timeout: 120_000,
      url: appOrigin,
    },
    {
      command: "node scripts/m0-content-gateway-launcher.mjs",
      env: {
        APP_URL: appOrigin,
        AUTH_SECRET: "must-not-reach-content-gateway",
        CONTENT_CAPABILITY_KEY_ID: capabilityKeyId,
        CONTENT_CAPABILITY_PRIVATE_KEY_PEM: "must-not-reach-content-gateway",
        CONTENT_CAPABILITY_PUBLIC_KEY_PEM: publicKeyPem,
        DATABASE_URL: "must-not-reach-content-gateway",
        M0_PREVIEW_DRAFT_GENERATION: String(M0_PREVIEW_DRAFT_GENERATION),
        M0_PREVIEW_DRAFT_ID,
        M0_RENDER_REVISION_ID,
        M0_CONTENT_HOST: contentHost,
        M0_CONTENT_PORT: String(contentPort),
        R2_SECRET_ACCESS_KEY: "must-not-reach-content-gateway",
      },
      reuseExistingServer: false,
      timeout: 30_000,
      url: `${contentListenOrigin}/health`,
    },
  ],
});
