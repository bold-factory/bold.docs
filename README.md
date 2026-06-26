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
