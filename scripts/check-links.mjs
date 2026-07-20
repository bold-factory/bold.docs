import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");
const contentRoot = path.join(projectRoot, "es");

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath).replaceAll("\\", "/");
}

function pageExists(pagePath) {
  const cleanPath = pagePath.replace(/^\//, "").replace(/\.mdx$/, "");
  return (
    existsSync(path.join(projectRoot, `${cleanPath}.mdx`)) ||
    existsSync(path.join(projectRoot, cleanPath, "index.mdx"))
  );
}

const mdxFiles = walk(contentRoot).filter((filePath) => filePath.endsWith(".mdx"));
const errors = [];
const navigationPages = new Set();
const docsConfig = JSON.parse(readFileSync(path.join(projectRoot, "docs.json"), "utf8"));

function collectNavigationPages(value, parentKey = "") {
  if (typeof value === "string") {
    if (value.startsWith("es/") && parentKey !== "directory") {
      navigationPages.add(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectNavigationPages(item, parentKey);
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectNavigationPages(item, key);
    }
  }
}

collectNavigationPages(docsConfig.navigation);

for (const page of navigationPages) {
  if (!pageExists(page)) errors.push(`docs.json: no existe la página ${page}`);
}

let internalLinkCount = 0;

for (const filePath of mdxFiles) {
  const content = readFileSync(filePath, "utf8");
  const fileName = relativePath(filePath);
  const references = [
    ...content.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g),
    ...content.matchAll(/(?:href|src)=["']([^"']+)["']/g),
  ].map((match) => match[1]);

  for (const reference of references) {
    if (
      reference.startsWith("#") ||
      reference.startsWith("http://") ||
      reference.startsWith("https://") ||
      reference.startsWith("mailto:") ||
      reference.startsWith("tel:")
    ) {
      continue;
    }

    const target = decodeURIComponent(reference.split(/[?#]/, 1)[0]);
    if (!target) continue;

    internalLinkCount += 1;

    if (target.startsWith("/es/")) {
      if (!pageExists(target)) errors.push(`${fileName}: no existe ${reference}`);
      continue;
    }

    if (target.startsWith("/")) {
      const assetPath = path.join(projectRoot, target.replace(/^\//, ""));
      if (!existsSync(assetPath)) errors.push(`${fileName}: no existe ${reference}`);
      continue;
    }

    const resolvedTarget = path.resolve(path.dirname(filePath), target);
    const relativeTarget = relativePath(resolvedTarget);
    if (!pageExists(relativeTarget) && !existsSync(resolvedTarget)) {
      errors.push(`${fileName}: no existe ${reference}`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Se encontraron ${errors.length} enlaces o páginas inexistentes:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Enlaces correctos: ${mdxFiles.length} páginas MDX, ${navigationPages.size} páginas de navegación y ${internalLinkCount} referencias internas.`,
);
