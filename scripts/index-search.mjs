// Builds the Typesense collection behind the documentation search of the Bold
// app. Every run indexes the pages listed in docs.json into a new collection
// and then points the `docs` alias to it, so removed pages disappear and
// searches never see a half-built index.
//
// Environment:
//   TYPESENSE_URL              Typesense server, e.g. https://search.bold-factory.com
//   TYPESENSE_ADMIN_API_KEY    Key allowed to manage collections, aliases and keys
//   TYPESENSE_DOCS_SEARCH_KEY  Optional. Search-only key value to provision for
//                              the app (NEXT_PUBLIC_DOCUMENTATION_SEARCH_KEY)
//
// Usage: node scripts/index-search.mjs [--dry-run]

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDirectory, "..");

const aliasName = "docs";
const collectionPrefix = `${aliasName}_`;
const searchKeyDescription = "Bold documentation search key";
const embeddingModel = "ts/multilingual-e5-small";
const maximumChunkLength = 1500;
const importBatchSize = 100;

// ---------------------------------------------------------------------------
// Navigation

function collectPages(docsConfig) {
  const pages = [];

  function visit(node, hierarchy) {
    if (typeof node === "string") {
      pages.push({ page: node, hierarchy });
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child) => visit(child, hierarchy));
      return;
    }
    if (!node || typeof node !== "object") return;

    const label = node.tab ?? node.group ?? node.anchor ?? node.dropdown;
    const childHierarchy = label ? [...hierarchy, label] : hierarchy;
    if (typeof node.root === "string") visit(node.root, childHierarchy);
    for (const key of ["languages", "tabs", "anchors", "dropdowns", "groups", "pages"]) {
      if (node[key]) visit(node[key], childHierarchy);
    }
  }

  const spanish = docsConfig.navigation.languages.find((language) => language.language === "es");
  visit(spanish, []);

  const seen = new Set();
  return pages.filter(({ page }) => {
    if (seen.has(page)) return false;
    seen.add(page);
    return true;
  });
}

// ---------------------------------------------------------------------------
// MDX to plain text

function parseFrontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { attributes: {}, body: source };

  const attributes = {};
  for (const line of match[1].split(/\r?\n/)) {
    const attribute = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!attribute) continue;
    let value = attribute[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1).replace(/\\"/g, '"');
    attributes[attribute[1]] = value;
  }
  return { attributes, body: source.slice(match[0].length) };
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)'|\\{"([^"]*)"\\})`));
  return match ? (match[1] ?? match[2] ?? match[3]) : null;
}

// Text of a single line, such as a heading, without inline Markdown.
function toInlineText(markdown) {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|\s)[*_]([^*_\n]+)[*_]/g, "$1$2")
    .trim();
}

function toPlainText(markdown) {
  return (
    markdown
      // Code is not useful for a semantic search of product behavior.
      .replace(/```[\s\S]*?```/g, " ")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/^(import|export) .*$/gm, " ")
      // Component titles carry content, e.g. <Step title="Crea la receta">.
      .replace(/<[A-Z][A-Za-z]*\b[^>]*>/g, (tag) => {
        const title = getAttribute(tag, "title") ?? getAttribute(tag, "label");
        return title ? `\n${title}. ` : " ";
      })
      .replace(/<\/?[A-Za-z][^>]*>/g, " ")
      .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__)(.*?)\1/g, "$2")
      .replace(/(^|\s)[*_]([^*_\n]+)[*_]/g, "$1$2")
      .replace(/^\s*\|?\s*:?-{3,}.*$/gm, " ")
      .replace(/\|/g, " ")
      .replace(/^\s*>\s?/gm, "")
      .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
      .replace(/[ \t]+/g, " ")
      .replace(/\s*\n\s*/g, "\n")
      .replace(/\n{2,}/g, "\n")
      .trim()
  );
}

// Mirrors the heading ids rendered by Mintlify (@mintlify/common slugify +
// cleanHeadingId): accented headings keep their characters, e.g.
// "Cuándo usar un ajuste" -> "cuándo-usar-un-ajuste".
function createHeadingSlugger() {
  const occurrences = new Map();
  return (heading) => {
    const text = toInlineText(heading);
    const encoded = encodeURIComponent(text.toLowerCase().trim().replace(/\s+/g, "-"));
    const hasEncodedCharacters = /%[0-9A-F]{2}/.test(encoded);
    let slug = encoded
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(hasEncodedCharacters ? /[^a-zA-Z\d%_]+/g : /[^a-z\d_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");
    if (!hasEncodedCharacters) slug = slug.toLowerCase();

    const count = occurrences.get(slug) ?? 0;
    occurrences.set(slug, count + 1);
    if (count > 0) slug = `${slug}-${count + 1}`;

    return decodeURIComponent(slug)
      .replace(/[?,;:!'"()[\]{}]/g, "")
      .replace(/\p{Extended_Pictographic}|[‍︎️]/gu, "");
  };
}

function splitLongText(text) {
  if (text.length <= maximumChunkLength) return [text];
  const parts = [];
  let current = "";
  for (const paragraph of text.split("\n")) {
    if (current && current.length + paragraph.length + 1 > maximumChunkLength) {
      parts.push(current);
      current = "";
    }
    current = current ? `${current}\n${paragraph}` : paragraph;
  }
  if (current) parts.push(current);
  return parts;
}

// Splits a page into its introduction and one chunk per level 2 or 3 heading.
function toChunks(body, slugify) {
  const withoutCode = body.replace(/```[\s\S]*?```/g, (block) => block.replace(/^#/gm, "\\#"));
  const chunks = [];
  let current = { section: null, anchor: null, lines: [] };

  for (const line of withoutCode.split(/\r?\n/)) {
    const heading = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      chunks.push(current);
      current = { section: toInlineText(heading[2]), anchor: slugify(heading[2]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  chunks.push(current);

  return chunks
    .filter(({ lines }) => !isNavigationOnly(lines.join("\n")))
    .flatMap(({ section, anchor, lines }) =>
      splitLongText(toPlainText(lines.join("\n"))).map((content) => ({ section, anchor, content })),
    );
}

// Sections such as "Relacionado" only list links or cards to other pages. They
// would match almost any query without explaining anything.
function isNavigationOnly(markdown) {
  const withoutLinks = markdown
    .replace(/<Card\b[\s\S]*?<\/Card>/g, " ")
    .replace(/<Card\b[^>]*\/>/g, " ")
    .replace(/<\/?Columns\b[^>]*>/g, " ")
    .replace(/^\s*[-*+]\s+\[[^\]]*\]\([^)]*\)\s*$/gm, " ");
  return markdown.trim() !== "" && toPlainText(withoutLinks) === "";
}

function buildDocuments() {
  const docsConfig = JSON.parse(readFileSync(path.join(projectRoot, "docs.json"), "utf8"));
  const documents = [];

  for (const { page, hierarchy } of collectPages(docsConfig)) {
    const filePath = path.join(projectRoot, `${page}.mdx`);
    if (!existsSync(filePath)) continue; // Generated pages, such as the API reference.

    const { attributes, body } = parseFrontmatter(readFileSync(filePath, "utf8"));
    if (attributes.hidden === "true" || attributes.noindex === "true" || attributes.rss === "true") continue;

    const pagePath = `/${page}`;
    const pageTitle = attributes.title ?? path.basename(page);
    const slugify = createHeadingSlugger();

    toChunks(body, slugify).forEach((chunk, position) => {
      const content = position === 0 && attributes.description
        ? `${attributes.description}\n${chunk.content}`.trim()
        : chunk.content;
      if (!content && !chunk.section) return;

      documents.push({
        id: `${page.replace(/[^\w-]+/g, "_")}-${position}`,
        page_path: pagePath,
        page_title: pageTitle,
        hierarchy,
        ...(chunk.section ? { section: chunk.section, anchor: chunk.anchor } : {}),
        content,
        position,
      });
    });
  }

  return documents;
}

// ---------------------------------------------------------------------------
// Typesense

function createClient(baseUrl, apiKey) {
  return async function request(method, pathname, { body, query, contentType = "application/json" } = {}) {
    const url = new URL(pathname, baseUrl);
    if (query) url.search = new URLSearchParams(query).toString();
    const response = await fetch(url, {
      method,
      headers: { "X-TYPESENSE-API-KEY": apiKey, "Content-Type": contentType },
      body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    const text = await response.text();
    if (response.status === 404 && method === "GET") return null;
    if (!response.ok) throw new Error(`${method} ${pathname} failed with ${response.status}: ${text}`);
    return contentType === "application/json" ? JSON.parse(text) : text;
  };
}

function createSchema(name) {
  return {
    name,
    fields: [
      { name: "page_path", type: "string", facet: true },
      { name: "page_title", type: "string" },
      { name: "hierarchy", type: "string[]" },
      { name: "section", type: "string", optional: true },
      { name: "anchor", type: "string", optional: true, index: false },
      { name: "content", type: "string" },
      { name: "position", type: "int32" },
      {
        name: "embedding",
        type: "float[]",
        embed: {
          from: ["page_title", "section", "content"],
          model_config: { model_name: embeddingModel },
        },
      },
    ],
  };
}

async function importDocuments(request, collection, documents) {
  for (let start = 0; start < documents.length; start += importBatchSize) {
    const batch = documents.slice(start, start + importBatchSize);
    const response = await request("POST", `/collections/${collection}/documents/import`, {
      query: { action: "create" },
      contentType: "text/plain",
      body: batch.map((document) => JSON.stringify(document)).join("\n"),
    });
    const failures = response
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .filter((result) => !result.success);
    if (failures.length > 0) {
      throw new Error(`Failed to import ${failures.length} documents. First error: ${failures[0].error}`);
    }
    console.log(`Imported ${Math.min(start + batch.length, documents.length)}/${documents.length} sections`);
  }
}

async function ensureSearchKey(request, value) {
  const { keys } = await request("GET", "/keys");
  const existing = keys.filter((key) => key.description === searchKeyDescription);
  if (existing.length === 1 && value.startsWith(existing[0].value_prefix)) return;

  for (const key of existing) await request("DELETE", `/keys/${key.id}`);
  await request("POST", "/keys", {
    body: {
      description: searchKeyDescription,
      actions: ["documents:search"],
      collections: [aliasName],
      value,
    },
  });
  console.log("Provisioned the documentation search key");
}

async function main() {
  const documents = buildDocuments();
  const pageCount = new Set(documents.map((document) => document.page_path)).size;
  console.log(`Prepared ${documents.length} sections from ${pageCount} pages`);

  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify(documents.slice(0, 3), null, 2));
    return;
  }

  const { TYPESENSE_URL, TYPESENSE_ADMIN_API_KEY, TYPESENSE_DOCS_SEARCH_KEY } = process.env;
  if (!TYPESENSE_URL || !TYPESENSE_ADMIN_API_KEY) {
    throw new Error("TYPESENSE_URL and TYPESENSE_ADMIN_API_KEY are required");
  }
  const request = createClient(TYPESENSE_URL, TYPESENSE_ADMIN_API_KEY);

  const collection = `${collectionPrefix}${Date.now()}`;
  await request("POST", "/collections", { body: createSchema(collection) });
  console.log(`Created collection ${collection}`);

  try {
    await importDocuments(request, collection, documents);
  } catch (error) {
    await request("DELETE", `/collections/${collection}`);
    throw error;
  }

  await request("PUT", `/aliases/${aliasName}`, { body: { collection_name: collection } });
  console.log(`Alias ${aliasName} now points to ${collection}`);

  // Removes the previous collection and any left behind by interrupted runs.
  const collections = await request("GET", "/collections");
  for (const { name } of collections) {
    if (name.startsWith(collectionPrefix) && name !== collection) {
      await request("DELETE", `/collections/${name}`);
      console.log(`Deleted collection ${name}`);
    }
  }

  if (TYPESENSE_DOCS_SEARCH_KEY) await ensureSearchKey(request, TYPESENSE_DOCS_SEARCH_KEY);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
