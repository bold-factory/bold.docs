import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const temporaryRoot = path.join(root, '.tmp', 'translation-tests');
mkdirSync(temporaryRoot, { recursive: true });
const spanish = '---\ntitle: "Ejemplo"\ndescription: "Prueba."\n---\n\n## Primera sección\n\n[Ir](/es/example#primera-sección)\n\n```http\nGET /v1/items/skus\n```\n';
const english = '---\ntitle: "Example"\ndescription: "Test."\n---\n\n## First section\n\n[Go](/en/example#first-section)\n\n```http\nGET /v1/items/skus\n```\n';
const sourceHash = createHash('sha256').update(spanish).digest('hex');

function fixture(run) {
  const directory = mkdtempSync(path.join(temporaryRoot, 'case-'));
  const write = (name, content) => writeFileSync(path.join(directory, name), content);
  for (const folder of ['scripts', 'es', 'en', 'sources/translations']) mkdirSync(path.join(directory, folder), { recursive: true });
  copyFileSync(path.join(root, 'scripts/check-translations.mjs'), path.join(directory, 'scripts/check-translations.mjs'));
  copyFileSync(path.join(root, 'scripts/heading-anchors.mjs'), path.join(directory, 'scripts/heading-anchors.mjs'));
  write('es/example.mdx', spanish);
  write('en/example.mdx', english);
  write('docs.json', JSON.stringify({ navigation: { languages: [{ language: 'es', pages: ['es/example'] }, { language: 'en', pages: ['en/example'] }] } }));
  write('sources/translations/en.json', JSON.stringify({ version: 1, sourceLanguage: 'es', targetLanguage: 'en', pages: [{ source: 'es/example.mdx', target: 'en/example.mdx', sourceHash }] }));
  const execute = (...args) => spawnSync(process.execPath, ['scripts/check-translations.mjs', ...args], { cwd: directory, encoding: 'utf8' });
  try { run({ write, execute, directory }); }
  finally {
    const relative = path.relative(temporaryRoot, directory);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Unsafe fixture cleanup path');
    rmSync(directory, { recursive: true, force: true });
  }
}

test('matching localized content passes', () => fixture(({ execute }) => assert.equal(execute().status, 0)));
test('line endings alone do not mark a translation stale', () => fixture(({ write, execute }) => {
  write('es/example.mdx', spanish.replaceAll('\n', '\r\n'));
  assert.equal(execute().status, 0);
}));
test('a changed source is reported as stale', () => fixture(({ write, execute }) => {
  write('es/example.mdx', spanish + '\nNuevo texto.\n');
  assert.match(execute().stderr, /Spanish source changed/);
}));
test('a missing translation fails', () => fixture(({ directory, execute }) => {
  rmSync(path.join(directory, 'en/example.mdx'));
  assert.match(execute().stderr, /Missing translation/);
}));
test('Spanish heading anchors must be translated', () => fixture(({ write, execute }) => {
  write('en/example.mdx', english.replace('#first-section)', '#primera-sección)'));
  assert.match(execute().stderr, /missing heading anchor/);
}));
test('heading anchors retain inline underscores and unwrap Markdown emphasis', () => fixture(({ write, execute }) => {
  write('en/example.mdx', english.replace('## First section', '## **First** api_key *section*')
    .replace('#first-section)', '#first-api_key-section)'));
  assert.equal(execute().status, 0);
  write('en/example.mdx', english.replace('## First section', '## api*key')
    .replace('#first-section)', '#api-key)'));
  assert.equal(execute().status, 0);
}));
test('heading anchors preserve code spans and Markdown autolinks', () => fixture(({ write, execute }) => {
  write('en/example.mdx', english.replace('## First section', '## `api_key<T>`')
    .replace('#first-section)', '#api_key%3Ct%3E)'));
  assert.equal(execute().status, 0);
  write('en/example.mdx', english.replace('## First section', '## <https://example.com>')
    .replace('#first-section)', '#https%2F%2Fexample-com)'));
  assert.equal(execute().status, 0);
  write('en/example.mdx', english.replace('## First section', '## <span>**First** section</span>'));
  assert.equal(execute().status, 0);
}));
test('technical API examples cannot silently drift', () => fixture(({ write, execute }) => {
  write('en/example.mdx', english.replace('/v1/items/skus', '/v1/items/products'));
  assert.match(execute().stderr, /technical code examples differ/);
}));
test('removing a translated section fails the structure check', () => fixture(({ write, execute }) => {
  write('en/example.mdx', english.replace('## First section\n', ''));
  assert.match(execute().stderr, /headings, components/);
}));
test('recording reviewed content updates only its source hash', () => fixture(({ write, execute, directory }) => {
  write('es/example.mdx', spanish + '\nNuevo texto.\n');
  write('en/example.mdx', english + '\nNew text.\n');
  assert.equal(execute('--record', 'es/example.mdx').status, 0);
  const manifest = JSON.parse(readFileSync(path.join(directory, 'sources/translations/en.json'), 'utf8'));
  assert.notEqual(manifest.pages[0].sourceHash, sourceHash);
  assert.equal(execute().status, 0);
}));
test('failed validation refuses to record a new source hash', () => fixture(({ write, execute, directory }) => {
  write('en/example.mdx', english.replace('#first-section)', '#missing)'));
  const manifestPath = path.join(directory, 'sources/translations/en.json');
  const before = readFileSync(manifestPath, 'utf8');
  assert.equal(execute('--record', 'es/example.mdx').status, 1);
  assert.equal(readFileSync(manifestPath, 'utf8'), before);
}));

test('translated slugs preserve navigation, anchors and the recorded target', () => fixture(({ write, execute, directory }) => {
  renameSync(path.join(directory, 'en/example.mdx'), path.join(directory, 'en/translated-example.mdx'));
  write('en/translated-example.mdx', english.replace('/en/example#', '/en/translated-example#'));
  write('docs.json', JSON.stringify({ navigation: { languages: [{ language: 'es', pages: ['es/example'] }, { language: 'en', pages: ['en/translated-example'] }] } }));
  const manifestPath = path.join(directory, 'sources/translations/en.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  manifest.pages[0].target = 'en/translated-example.mdx';
  write('sources/translations/en.json', JSON.stringify(manifest));
  assert.equal(execute('--record', 'es/example.mdx').status, 0);
  assert.equal(JSON.parse(readFileSync(manifestPath, 'utf8')).pages[0].target, 'en/translated-example.mdx');
}));
test('duplicate translation targets fail', () => fixture(({ write, execute }) => {
  write('sources/translations/en.json', JSON.stringify({ pages: [
    { source: 'es/example.mdx', target: 'en/example.mdx', sourceHash },
    { source: 'es/second.mdx', target: 'en/example.mdx', sourceHash },
  ] }));
  assert.match(execute().stderr, /Duplicate translation target/);
}));
test('unsafe manifest paths fail before reading files', () => fixture(({ write, execute }) => {
  write('sources/translations/en.json', JSON.stringify({ pages: [{ source: 'es/example.mdx', target: 'en/../README.mdx', sourceHash }] }));
  assert.match(execute().stderr, /Invalid manifest path/);
}));
test('navigation must use the mapped translation', () => fixture(({ write, execute }) => {
  write('docs.json', JSON.stringify({ navigation: { languages: [{ language: 'es', pages: ['es/example'] }, { language: 'en', pages: ['en/wrong'] }] } }));
  assert.match(execute().stderr, /navigation paths differ/);
}));
test('legacy English URLs redirect directly to a translated page', () => fixture(({ write, execute }) => {
  const navigation = { languages: [{ language: 'es', pages: ['es/example'] }, { language: 'en', pages: ['en/example'] }] };
  write('docs.json', JSON.stringify({ navigation, redirects: [{ source: '/en/old-example', destination: '/en/example' }] }));
  assert.equal(execute().status, 0);
  write('docs.json', JSON.stringify({ navigation, redirects: [{ source: '/en/old-example', destination: '/en/missing' }] }));
  assert.match(execute().stderr, /no translated destination/);
}));
test('English redirect loops fail', () => fixture(({ write, execute }) => {
  write('docs.json', JSON.stringify({ navigation: { languages: [{ language: 'es', pages: ['es/example'] }, { language: 'en', pages: ['en/example'] }] }, redirects: [{ source: '/en/example', destination: '/en/example' }] }));
  assert.match(execute().stderr, /must point directly/);
}));
test('localized slugs require reciprocal language-switcher links', () => fixture(({ write, execute }) => {
  const source = spanish.replace('title:', 'en_link: "/en/example"\ntitle:');
  const target = english.replace('title:', 'es_link: "/es/example"\ntitle:');
  write('es/example.mdx', source);
  write('en/example.mdx', target);
  write('sources/translations/en.json', JSON.stringify({ version: 2, pages: [{ source: 'es/example.mdx', target: 'en/example.mdx', sourceHash: createHash('sha256').update(source).digest('hex') }] }));
  assert.equal(execute().status, 0);
  write('en/example.mdx', target.replace('es_link: "/es/example"', 'es_link: "/es/wrong"'));
  assert.match(execute().stderr, /es_link must point/);
}));
