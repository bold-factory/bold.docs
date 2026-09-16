---
name: update-changelog
description: Review deployed Bold Client and Bold Backend changes and fill the Spanish Bold Docs product changelog with one concise entry per missing week. Use only when explicitly invoked to update release notes from production code.
---

# Update the Bold changelog

Update `es/novedades/changelog.mdx` from the code that has actually reached production. Do not automate, schedule, commit, or publish the result.

## Establish the release range

- Work from `bold.docs`; use the sibling repositories `../bold.client` and `../bold.backend` as the source of product behavior.
- Read the applicable `AGENTS.md` files and preserve all existing local changes.
- Inspect each repository with read-only Git commands using `git --no-optional-locks`. Fetch `origin` so remote production references are current, but do not merge, switch branches, or modify source repositories.
- Confirm the production branch in each repository's deployment workflow. It is currently `origin/main`; never infer production changes from `dev`, feature branches, local commits, or the working tree.
- Read the newest changelog entries, then inspect first-parent production merges and their contained commits. Use deployed ancestry and merge times to decide the range, not only commit author dates.
- Create one entry for each missing ISO week, labelled with that week's Monday as `YYYY-MM-DD`. If a standalone entry already falls inside a missing week, consolidate it into the weekly entry instead of creating two entries for the same week.

Useful discovery commands include:

```powershell
git --no-optional-locks log origin/main --first-parent --date=iso-strict
git --no-optional-locks log origin/main --no-merges --date=short
git --no-optional-locks diff --name-status <production-start> <production-end>
git --no-optional-locks show <commit> -- <relevant-paths>
```

Choose separate start and end commits for Client and Backend when their production merges do not align.

## Decide what belongs in release notes

- Treat commit subjects as an index, not proof. Inspect the relevant code, UI copy, contracts, tests, or documentation before describing behavior.
- Include observable customer behavior and changes to the public API or customer-facing integrations.
- Exclude refactors, tests, dependency updates, generated files, migrations, telemetry, deployment work, internal administration, production diagnostics, and fixes whose only effect is data repair or operational resilience.
- Do not disclose secrets, customer data, internal hostnames, diagnostics, ticket identifiers, or implementation details.
- When several commits implement or stabilize one capability, describe the resulting capability once. Do not reproduce the commit log.
- If behavior cannot be verified, omit it rather than presenting an uncertain claim.

## Write the weekly entry

- Keep entries newest first and preserve older entries outside the release range.
- Follow the existing `<Update>` layout. Tags must match the content and use the established values `Nuevas funcionalidades`, `Mejoras`, and `Correcciones`.
- Give each substantial feature or product change its own level-two heading with a descriptive product title.
- Group small refinements under `## Mejoras` and small fixes under `## Correcciones`. Omit empty headings and unused tags.
- Write concise Spanish bullets that describe the outcome in user terms. Use the terminology in `AGENTS.md`, including **OF**, **coproducto**, **Panel de control**, **modo de trabajo**, **usuario**, **empleado**, and **perfil**.
- Prefer verified, observable wording. Avoid marketing claims, internal component names, and explanations of how the code was implemented.
- Do not add screenshots or change navigation for an existing changelog page.

## Verify and report

- Review the changelog diff against the production commit inventory to catch omissions, duplicates, and unreleased work.
- Run `pnpm validate` and `pnpm broken-links` from `bold.docs`.
- Report the weeks added, the major themes, validation results, and any intentionally excluded or uncertain release area.
- Finish with the repository-required `.git/index.lock` check in every Git worktree inspected.
