// Translation parity and freshness checks. This does not judge English quality.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHeadingSlugger } from './heading-anchors.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'sources/translations/en.json');
const read = page => readFileSync(path.join(root, page), 'utf8');
const hash = content => createHash('sha256').update(content.replaceAll('\r\n', '\n')).digest('hex');
const errors = [];
const fail = message => errors.push(message);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(file) : file.endsWith('.mdx') ? [path.relative(root, file).replaceAll('\\', '/')] : [];
  }).sort();
}

function headings(content) {
  const slugify = createHeadingSlugger();
  return [...content.replace(/```[\s\S]*?```/g, '').matchAll(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/gm)]
    .map(match => ({ level: match[1].length, slug: slugify(match[2]) }));
}

function signature(content) {
  const withoutCode = content.replace(/```[\s\S]*?```/g, '');
  return {
    headings: headings(content).map(({ level }) => level),
    components: [...withoutCode.matchAll(/<\/?([A-Z][A-Za-z]+)\b/g)].map(match => match[0]),
    tableRows: [...withoutCode.matchAll(/^\s*\|.*\|\s*$/gm)].length,
    listItems: [...withoutCode.matchAll(/^[ \t]*(?:[-*+]|\d+\.)\s+\S/gm)].length,
    diagramEdges: [...content.matchAll(/```mermaid\r?\n([\s\S]*?)```/g)]
      .map(match => (match[1].match(/-->|---|==>|\.->|\.\.>/g) ?? []).length),
    codeLanguages: [...content.matchAll(/^\s*```([^\s`]*)[^\n]*\n/gm)].map(match => match[1]).filter(Boolean),
  };
}

function technicalBlocks(content) {
  return [...content.matchAll(/^[ \t]*```(\w+)[^\n]*\n([\s\S]*?)^[ \t]*```/gm)]
    .filter(match => !['mermaid', 'text'].includes(match[1]))
    .map(match => `${match[1]}\n${match[2].replaceAll('\r\n', '\n').trim()}`);
}

const spanish = walk(path.join(root, 'es'));
const english = walk(path.join(root, 'en'));
const config = JSON.parse(read('docs.json'));
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, sourceLanguage: 'es', targetLanguage: 'en', pages: [] };
const records = new Map(manifest.pages.map(record => [record.source, record]));
const targets = new Set();
const validPath = (file, language) => typeof file === 'string' &&
  new RegExp(`^${language}/[a-z0-9/-]+\\.mdx$`).test(file) &&
  !file.split('/').some(part => part === '..' || part === '.');
for (const record of manifest.pages) {
  if (!validPath(record.source, 'es') || !validPath(record.target, 'en')) fail(`Invalid manifest path: ${record.source} -> ${record.target}`);
  if (targets.has(record.target)) fail(`Duplicate translation target: ${record.target}`);
  targets.add(record.target);
}
if (records.size !== manifest.pages.length) fail('Duplicate Spanish source in manifest');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const recordArguments = process.argv.slice(2);
const recording = recordArguments[0] === '--record';
if (recordArguments.length && (!recording || recordArguments.length < 2)) {
  throw new Error('Usage: node scripts/check-translations.mjs [--record es/path.mdx ...]');
}
const toRecord = new Set(recording ? recordArguments.slice(1).map(page => page.replaceAll('\\', '/')) : []);
for (const page of toRecord) if (!spanish.includes(page)) fail(`Unknown Spanish page: ${page}`);

for (const source of spanish) {
  const record = records.get(source);
  if (!record) { fail(`Missing manifest mapping for Spanish page: ${source}`); continue; }
  const target = record.target;
  if (!english.includes(target)) { fail(`Missing translation: ${target}`); continue; }
  const original = read(source);
  const translated = read(target);
  if (manifest.version >= 2) {
    const counterpart = (content, key) => content.split(/\r?\n---/)[0].match(new RegExp(`^${key}:\\s*["']([^"'\\r\\n]+)["']\\s*$`, 'm'))?.[1];
    if (counterpart(original, 'en_link') !== '/' + target.replace(/\.mdx$/, '')) fail(`${source}: en_link must point to its mapped translation`);
    if (counterpart(translated, 'es_link') !== '/' + source.replace(/\.mdx$/, '')) fail(`${target}: es_link must point to its Spanish source`);
  }
  for (const field of ['title', 'description']) {
    if (!new RegExp(`^${field}:\\s*["']?\\S`, 'm').test(translated.split(/\r?\n---/)[0])) fail(`${target}: missing ${field}`);
  }
  if (JSON.stringify(signature(original)) !== JSON.stringify(signature(translated))) fail(`${target}: headings, components, table rows, list items, diagram edges, or code languages differ`);
  if (JSON.stringify(technicalBlocks(original)) !== JSON.stringify(technicalBlocks(translated))) fail(`${target}: technical code examples differ`);
  const withoutCode = translated.replace(/```[\s\S]*?```/g, '');
  if (/(?:\]\(|href=["'])\/es\//.test(withoutCode)) fail(`${target}: link returns to Spanish`);
  if (toRecord.has(source)) records.set(source, { source, target, sourceHash: hash(original) });
  else if (record.sourceHash !== hash(original)) fail(`${target}: Spanish source changed; review translation and record it`);

  for (const match of withoutCode.matchAll(/(?:\]\(|href=["'])(\/en\/[^\s)"']+|#[^\s)"']+)/g)) {
    const link = match[1];
    const [route, anchor] = link.split('#');
    if (!anchor) continue;
    const destination = route ? `${route.slice(1).split('?')[0]}.mdx` : target;
    if (!existsSync(path.join(root, destination))) { fail(`${target}: missing linked page ${link}`); continue; }
    let decoded;
    try { decoded = decodeURIComponent(anchor); } catch { fail(`${target}: malformed anchor ${anchor}`); continue; }
    const destinationContent = read(destination);
    if (!headings(destinationContent).some(heading => heading.slug === decoded) &&
        !destinationContent.includes(`id="${decoded}"`) && !destinationContent.includes(`id='${decoded}'`)) {
      fail(`${target}: missing heading anchor ${link}`);
    }
  }
}

for (const target of english) if (!targets.has(target)) fail(`English page without Spanish counterpart: ${target}`);
for (const source of records.keys()) if (!spanish.includes(source)) fail(`Obsolete manifest entry: ${source}`);

function navigationPaths(node) {
  if (typeof node === 'string') return /^(es|en)\//.test(node) ? [node] : [];
  if (Array.isArray(node)) return node.flatMap(navigationPaths);
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).filter(([key]) => !['language', 'default', 'navbar', 'banner', 'footer'].includes(key)).flatMap(([, value]) => navigationPaths(value));
}
const languages = config.navigation.languages;
const sourceNavigation = languages.find(language => language.language === 'es');
const targetNavigation = languages.find(language => language.language === 'en');
const routes = new Map(manifest.pages.map(record => [record.source.replace(/\.mdx$/, ''), record.target.replace(/\.mdx$/, '')]));
const directories = new Map();
for (const record of manifest.pages) {
  let source = path.posix.dirname(record.source), target = path.posix.dirname(record.target);
  while (source !== '.' && target !== '.') {
    if (directories.has(source) && directories.get(source) !== target) fail(`Inconsistent translated directory: ${source}`);
    directories.set(source, target);
    source = path.posix.dirname(source); target = path.posix.dirname(target);
  }
}
function translatedRoute(route) {
  if (routes.has(route)) return routes.get(route);
  for (const [source, target] of [...directories].sort((a, b) => b[0].length - a[0].length)) {
    if (route === source || route.startsWith(source + '/')) return target + route.slice(source.length);
  }
  return route;
}
if (!sourceNavigation || !targetNavigation) fail('docs.json must include Spanish and English navigation');
else if (JSON.stringify(navigationPaths(sourceNavigation).map(translatedRoute)) !== JSON.stringify(navigationPaths(targetNavigation))) fail('Spanish and English navigation paths differ from manifest mappings');

const redirectSources = new Set();
for (const redirect of config.redirects ?? []) {
  if (redirectSources.has(redirect.source)) fail(`Duplicate redirect source: ${redirect.source}`);
  redirectSources.add(redirect.source);
}
for (const redirect of config.redirects ?? []) {
  if (!redirect.source.startsWith('/en/')) continue;
  if (!targets.has(redirect.destination.slice(1) + '.mdx')) fail(`English redirect has no translated destination: ${redirect.source} -> ${redirect.destination}`);
  if (redirectSources.has(redirect.destination)) fail(`English redirect must point directly to a page: ${redirect.source}`);
}

const titles = new Map();
for (const target of english) {
  const title = read(target).match(/^title:\s*["']?(.*?)["']?\s*$/m)?.[1];
  if (titles.has(title)) fail(`Duplicate English title: ${title} (${titles.get(title)}, ${target})`);
  titles.set(title, target);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
if (recording) {
  manifest.pages = [...records.values()].sort((a,b) => a.source.localeCompare(b.source, 'en'));
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Recorded ${toRecord.size} reviewed translations.`);
}
console.log(`Translations valid: ${spanish.length} Spanish pages, ${english.length} English pages; matching navigation, structure, code, anchors, and source hashes.`);
