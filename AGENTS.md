> For Mintlify product knowledge (components, configuration, writing standards),
> install the Mintlify skill: `npx skills add https://mintlify.com/docs`

# Documentation project instructions

## About this project

- This is a documentation site built on [Mintlify](https://mintlify.com)
- This documentation refers to the Bold backend and client applications.
- The source repositories should be available as sibling folders next to `bold.docs`: `../bold.backend` and `../bold.client`
- Refer to `../bold.backend` and `../bold.client` as source context when documenting backend or client behavior.
- Pages are MDX files with YAML frontmatter
- Configuration lives in `docs.json`
- Use the Mintlify MCP server, `https://mcp.mintlify.com`, to edit content and settings via MCP
- Use the Mintlify docs MCP server, `https://www.mintlify.com/docs/mcp`, to query information about using Mintlify via MCP

## Terminology

- Use **orden de fabricación** and **OF**, not **orden de producción**.
- Use **coproducto**, not **co-producto**.
- Use **Panel de control** for the administration and configuration area.
- Use **modo de trabajo** for the operator-facing execution interface.
- Distinguish **usuario** (an account with access) from **empleado** (a person whose work or presence is recorded).
- Use **perfil** for a named set of permissions in user-facing content. Use `role` only for API fields or code references.

## Style preferences

- Use active voice and second person ("you")
- Keep sentences concise — one idea per sentence
- Use sentence case for headings
- Bold for UI elements: Click **Settings**
- Code formatting for file names, commands, paths, and code references
- Avoid marketing claims, absolute guarantees, and unsupported superlatives.
- Prefer observable product behavior over promises such as "error-free", "exact", or "100% accurate".
- Do not add product screenshots unless the user requests them. The interface changes frequently.
- In the **Guides** section, use short titles that describe tasks or typical industrial processes.
- Do not use Bold-specific concepts in guide titles. Widely understood industrial terms and abbreviations, such as **OF**, are acceptable.
- Introduce Bold-specific concepts in the guide body with a short explanation and a link to the relevant page in **Concepts**.
- Each guide should explain how to complete a process in Bold, including alternative workflows when more than one is available.
- Give pages unique `title` values for search and browser context. Use `sidebarTitle` when the navigation needs a shorter label.

## Content boundaries

- Document behavior available to Bold customers and routes included in the public OpenAPI specification.
- Do not document internal-only administration, debugging, deployment, or operational tooling.
- Verify backend and client behavior in `../bold.backend` and `../bold.client` before stating rules, defaults, limits, or automatic behavior.
- Do not publish secrets, customer data, personal data, internal hostnames, or production diagnostics.
- Mark behavior that cannot be verified with a TODO comment instead of presenting it as fact.
