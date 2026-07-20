import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "../..");

function pageDirectories(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return pageDirectories(path);
    return entry.name === "page.tsx" ? [relative(root, directory)] : [];
  });
}

describe("repository contract", () => {
  it("has one canonical two-segment dynamic notebook route", () => {
    const routes = pageDirectories(join(root, "app")).filter((path) => {
      const dynamicSegments = path
        .split("/")
        .filter((segment) => segment.startsWith("[") && segment.endsWith("]"));
      return dynamicSegments.length === 2;
    });

    expect(routes).toEqual(["app/[username]/[slug]"]);
  });

  it("has exactly one PostCSS configuration", () => {
    const candidates = [
      "postcss.config.js",
      "postcss.config.cjs",
      "postcss.config.mjs",
    ];
    const present = candidates.filter((path) => existsSync(join(root, path)));
    expect(present).toEqual(["postcss.config.js"]);
  });

  it("does not leave generated TypeScript build information in the repository", () => {
    expect(existsSync(join(root, "tsconfig.tsbuildinfo"))).toBe(false);
  });
});
