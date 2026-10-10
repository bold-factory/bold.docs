# Bold Factory docs

This repository contains the Mintlify documentation site for Bold Factory.

The public docs are written in Spanish under `es/` and English under `en/`. Pages are MDX files with YAML frontmatter, and site navigation lives in `docs.json`. Spanish remains the default language.

## Local development

Install dependencies:

```bash
pnpm install
```

Run a local preview:

```bash
pnpm dev
```

Project scripts run the local `mint` dependency and store temporary Mintlify runtime files under `.tmp/`.

Validate the docs before publishing:

```bash
pnpm validate
pnpm broken-links
pnpm translations:check
```

The project link checker resolves localized `/es/` and `/en/` routes against their MDX files. You can also run `pnpm broken-links:mintlify` to compare the result with the Mintlify CLI.

## Translation mechanism

Spanish is the source language. Every Spanish page has an English counterpart, including pages accessible only by URL. English paths use translated directories and slugs, such as `en/guides/getting-started/prepare-master-data.mdx` for `es/ayuda/primeros-pasos/preparar-datos-base.mdx`. The explicit `source` and `target` pairs in `sources/translations/en.json` identify corresponding pages even when their URLs differ. Translate titles, descriptions, sidebar labels, prose, component labels, and visible Mermaid text. Preserve API identifiers, permission names, formulas, technical examples, and external URLs. Internal English links use `/en/`; update heading anchors when translating their destination headings.

Both languages have matching navigation in `docs.json`, including the same public OpenAPI source with a separate generated-page directory for each language. Spanish frontmatter includes `en_link` and English frontmatter includes `es_link`, each pointing to the corresponding page. Mintlify uses these fields to keep the current page when switching languages with different slugs. The checker verifies these links against the manifest. English navbar labels are configured on its language entry. Shared image assets remain under `images/`. Redirects preserve the previous English URLs with Spanish slugs. When you rename a page, update its manifest target, language links, navigation and links, and redirect its old URL directly to the new one.

Use these terms consistently in English prose:

| Spanish | English |
| --- | --- |
| orden de fabricación / OF | manufacturing order / MO |
| petición de fabricación | manufacturing request |
| receta | recipe |
| familia / artículo | family / item |
| coproducto | co-product |
| Panel de control | Control panel |
| modo de trabajo | work mode |
| perfil de permisos | permission profile |
| usuario / empleado | user / employee |
| parte de trabajo de mantenimiento | maintenance work order |

When directing readers to a button or screen, use its actual English label from `../bold.client/src/**/_i18n/en-US.ts`. For example, the client currently labels the manufacturing order screen **Production orders** and the permission profile screen **Roles**. Keep these UI labels distinct from the prose glossary.

`sources/translations/en.json` records a SHA-256 hash of the Spanish source for each translated page. Hashes normalize CRLF to LF so platform-specific line endings do not mark translations as stale. `pnpm translations:check` checks coverage, source freshness, navigation correspondence, heading structure, component sequence, table row and list item counts, Mermaid edge counts, technical code examples, unique English titles, linked English heading anchors, and English redirect destinations. These checks detect structural drift; review the English wording and meaning separately.

When editing documentation:

1. Update the Spanish page and its English counterpart together. Find its English path in the manifest. If you add a page, add both navigation entries, reciprocal `en_link` / `es_link` frontmatter fields, and a manifest entry with `source`, `target`, and an empty `sourceHash`; the next recording step fills the hash. Choose a concise English slug and keep the directory hierarchy consistent across languages.
2. Verify rules and UI labels against the backend and client. Keep TODO comments for behavior you cannot verify.
3. After reviewing the affected translation, record its current source hash:

   ```bash
   pnpm translations:check --record es/conceptos/catalogo/articulos.mdx
   ```

   You can pass several source pages after `--record`. This only records the listed pages and refuses to write if the checks fail.
4. Run `pnpm validate`, `pnpm broken-links`, and `pnpm translations:check`.

For parallel translation work, assign exclusive destination directories to each contributor. One integrator owns navigation, the manifest, and final validation. Contributors read the same Spanish source and glossary and preserve content instead of summarizing it.

## In-app search index

The search dialog of the Bold app (`Ctrl+K`) also searches this documentation. `scripts/index-search.mjs` splits every page listed in the Spanish navigation in `docs.json` into sections, one per `##` or `###` heading, and indexes them in Typesense with a multilingual embedding for semantic search. Sections that only link to other pages are skipped. This existing app index remains Spanish; the documentation site's English navigation and search use Mintlify.

Each run builds a new `docs_<timestamp>` collection and then points the `docs` alias to it, so removed pages disappear and searches never see a partial index. The `Update search index` workflow runs it on every push to `main` that changes content.

The workflow needs these settings in the `production` environment:

| Setting | Type | Purpose |
| --- | --- | --- |
| `TYPESENSE_URL` | Variable | Typesense server, for example `https://search.bold-factory.com`. |
| `TYPESENSE_ADMIN_API_KEY` | Secret | Key that can manage collections, aliases and keys. |
| `TYPESENSE_DOCS_SEARCH_KEY` | Variable | Value of the search-only key the app uses. The script creates the key if it is missing. Use the same value as `NEXT_PUBLIC_DOCUMENTATION_SEARCH_KEY` in `bold.client`. |

To inspect the sections without indexing, or to fill a local Typesense:

```bash
pnpm search:index --dry-run
TYPESENSE_URL=http://localhost:8108 TYPESENSE_ADMIN_API_KEY=local-typesense-api-key pnpm search:index
```

## Project structure

| Path | Purpose |
| --- | --- |
| `docs.json` | Mintlify configuration, navigation, redirects, theme and site metadata. |
| `es/ayuda` | User-facing product documentation. |
| `es/conceptos` | Functional model, glossary-style explanations and cross-module references. |
| `es/desarrolladores` | API, authentication, pagination and webhook documentation. |
| `en` | English counterparts of all public Spanish pages. |
| `sources/translations/en.json` | Translation source hashes, excluded from the published site. |
| `images` | Static image assets used by the site. |
| `sources` | Source material excluded from the Mintlify build. |

## Writing guidelines

- Use active voice and second person.
- Keep headings in sentence case.
- Use bold for UI labels, such as **Panel de control**.
- Use code formatting for commands, file names, paths, endpoints and permission names.
- Prefer concrete flows, examples and troubleshooting over generic task descriptions.
- Add new public pages to `docs.json`; otherwise they are hidden from navigation.

## Source context

When documenting backend or client behavior, check the sibling repositories when available:

- `../bold.backend`
- `../bold.client`
