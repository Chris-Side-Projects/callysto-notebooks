import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");
const packageLock = require("../package-lock.json");
const { getSharp } = require("next/dist/server/image-optimizer");

const expectedSharpVersion = packageJson.overrides?.next?.sharp;
assert.match(
  expectedSharpVersion ?? "",
  /^\d+\.\d+\.\d+$/,
  "overrides.next.sharp must be an exact version",
);

const sharpRecords = Object.entries(packageLock.packages ?? {}).filter(
  ([packagePath]) =>
    packagePath === "node_modules/sharp" ||
    packagePath.endsWith("/node_modules/sharp"),
);
assert.deepEqual(
  sharpRecords.map(([packagePath, packageRecord]) => ({
    packagePath,
    version: packageRecord.version,
  })),
  [{ packagePath: "node_modules/sharp", version: expectedSharpVersion }],
  "the lockfile must contain exactly one resolved sharp version",
);
assert.notEqual(
  sharpRecords[0][1].hasInstallScript,
  true,
  "the resolved sharp package must not add an install script",
);

const sharpPlatformRecords = Object.entries(packageLock.packages ?? {}).filter(
  ([packagePath]) =>
    /^node_modules\/@img\/sharp-(?!libvips)[^/]+$/.test(packagePath),
);
assert.ok(
  sharpPlatformRecords.length > 0,
  "the lockfile must include sharp platform packages",
);
for (const [packagePath, packageRecord] of sharpPlatformRecords) {
  assert.equal(
    packageRecord.version,
    expectedSharpVersion,
    `${packagePath} must match the sharp override`,
  );
}

const sharp = await getSharp();
assert.equal(
  sharp.versions.sharp,
  expectedSharpVersion,
  "Next must load the overridden sharp version",
);
assert.equal(
  sharp.versions.vips,
  "8.18.3",
  "sharp must load the patched libvips version",
);

const source = await sharp({
  create: {
    width: 2,
    height: 2,
    channels: 4,
    background: { r: 10, g: 20, b: 30, alpha: 1 },
  },
})
  .png()
  .toBuffer();
const transformed = await sharp(source).resize(1, 1).png().toBuffer();
const metadata = await sharp(transformed).metadata();

assert.deepEqual(
  { format: metadata.format, height: metadata.height, width: metadata.width },
  { format: "png", height: 1, width: 1 },
  "Next's sharp path must complete an in-memory PNG transform",
);

console.log(
  JSON.stringify({
    format: metadata.format,
    height: metadata.height,
    libvips: sharp.versions.vips,
    sharp: sharp.versions.sharp,
    width: metadata.width,
  }),
);
