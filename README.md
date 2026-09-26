# Bold Factory docs

This repository contains the Mintlify documentation site for Bold Factory.

The public docs are written in Spanish under `es/`. Pages are MDX files with YAML frontmatter, and site navigation lives in `docs.json`.

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
```

The project link checker resolves localized `/es/` routes against their MDX files. You can also run `pnpm broken-links:mintlify` to compare the result with the Mintlify CLI.

## In-app search index

The search dialog of the Bold app (`Ctrl+K`) also searches this documentation. `scripts/index-search.mjs` splits every page listed in `docs.json` into sections, one per `##` or `###` heading, and indexes them in Typesense with a multilingual embedding for semantic search. Sections that only link to other pages are skipped.

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
