import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "test-results",
]);
const required = [
  "ARCHITECTURE.md",
  "DECISIONS.md",
  "INTENT.md",
  "PLAN.md",
  "PRODUCT_SPEC.md",
  "README.md",
  "TODO.md",
  "UX_SPEC.md",
  "docs/SECURITY.md",
  "docs/TEST_PLAN.md",
];

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(path);
    return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

const failures = [];
for (const path of required) {
  if (!existsSync(join(root, path)))
    failures.push(`missing required document: ${path}`);
}

const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of markdownFiles(root)) {
  const text = readFileSync(file, "utf8");
  for (const [index, line] of text.split("\n").entries()) {
    if (/[ \t]+$/.test(line)) {
      failures.push(
        `${relative(root, file)}:${index + 1}: trailing whitespace`,
      );
    }
  }

  for (const match of text.matchAll(linkPattern)) {
    let target = match[1].trim();
    if (target.startsWith("<") && target.endsWith(">"))
      target = target.slice(1, -1);
    if (
      !target ||
      target.startsWith("#") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    )
      continue;
    target = decodeURIComponent(target.split("#", 1)[0].split("?", 1)[0]);
    if (!target) continue;
    const resolved = resolve(dirname(file), target);
    if (!existsSync(resolved)) {
      failures.push(`${relative(root, file)}: broken local link: ${match[1]}`);
      continue;
    }
    if (
      lstatSync(resolved).isDirectory() &&
      !existsSync(join(resolved, "README.md"))
    ) {
      failures.push(
        `${relative(root, file)}: linked directory has no README: ${match[1]}`,
      );
    }
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `Documentation contract passed (${markdownFiles(root).length} Markdown files).`,
);
