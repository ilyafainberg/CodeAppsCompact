---
name: codeappscompact
description: Build or update compact React/TypeScript record-list and create/edit screens in Power Platform Code Apps. Reuse an installed RecordScreen or set up the package bundled in this skill; configure only the app-specific parts. Not for Canvas Apps, model-driven apps, or deployment.
license: MIT
compatibility: Requires an authorized React/TypeScript Code App, Node.js 22.12 or newer, project package tooling, and host-provided local file and execution capabilities. Install the complete skill folder, including assets and scripts.
metadata:
  version: "0.1.7"
---

# CodeAppsCompact

Configure `RecordScreen`, not a new implementation. The package is plain files in `assets`; the setup helper locates them relative to itself. No source checkout, download, extraction, or kit build is needed. Use only authorized host tools and respect every permission decision.

## 1. Inspect and reuse

Inspect the existing app, acceptance criteria, package tooling, query provider, and actual generated service types. This skill does not scaffold or publish an app; report missing inputs rather than inventing them.

Supported: lists, search over loaded records, cursor paging, create/edit/cancel, and flat string/number drafts. Delete, relationships, uploads, nested drafts, server-side search, and cross-system transactions are not supplied; preserve those requirements and explain the gap.

Resolve `codeappscompact` in the app first. If its import works and its own `API.txt` supports the request, reuse it and go to step 3. Do not inspect or copy the bundle just to replace a working installation. If a declared dependency is missing, restore its existing lockfile using the app's workflow; never silently upgrade or replace a different version, origin, or custom package.

## 2. Set up only when absent

Read [assets/package.json](assets/package.json) for the bundled version and peer requirements. Preserve compatible app dependencies; obtain approval for any missing peers or other dependency changes. Missing bundled files require the complete skill folder, not a fetched or regenerated substitute.

For an authorized standalone npm app, run the [setup helper](scripts/setup.mjs) with the app directory:

```text
node "<installed-skill-folder>\scripts\setup.mjs" "<app-folder>"
```

It copies `assets` to `vendor\codeappscompact-<version>`, installs that local folder with lifecycle scripts disabled and peer checks enforced, and checks the import and relative lockfile paths. An identical existing copy is reused. Modified assets, conflicting declarations, or linked destinations cause an explicit stop, never an overwrite. A failed npm command is reported; inspect its dependency state before retrying.

The helper does not switch package managers, install tooling, or manage workspaces. For those projects, use their existing approved local-package workflow with the same assets; do not introduce an npm lockfile. Ordinary peer dependencies still belong to the app and may require its configured registry. Never bypass TLS, peer constraints, registry restrictions, or tool permissions.

## 3. Configure

Read the quick authoring contract at the start of the matching API: the installed package's `API.txt` when reusing it, otherwise the [bundled API reference](assets/API.txt). Consult detailed sections for relevant edge cases, declarations only for unresolved typing questions, and the [synthetic example](assets/examples/App.tsx) only when needed. Do not load the implementation or unrelated connector documentation.

Use the generated service directly when its types AND behavior satisfy `DataService<R, D>`. Otherwise adapt only mismatches in payloads, results, paging, identity, or method binding. Do not invent fields, cast to `any`, or hide failures behind successful empty results.

Supply the app-specific configuration described by the API and preserve the app's query provider and styles. Do not copy the component or regenerate SDK services. The app owns SDK setup, authentication, connections, and permissions. Connections, schema changes, production writes, and deployment require separate authorization.

## 4. Verify the changed surface

When installation changes, confirm package resolution/version and project-relative manifest/lockfile paths. Keep the complete vendor package, including `dist`, with the app; review ignore rules and verify a clean restore in an isolated copy without the skill folder. For npm, use `npm ci --install-links --ignore-scripts --strict-peer-deps --legacy-peer-deps=false --force=false --no-audit --no-fund`.

For screen changes, run the app's existing type/build checks and focused integration tests for its mappings, IDs, write payloads, pagination, and error propagation. Do not repeat portability checks or recreate the library's generic tests for each screen. Test writes with synthetic data or an explicitly authorized isolated backend; authorized live reads are needed before claiming connector compatibility.

Fix observed failures without weakening requirements. Stop on missing access/input or no viable progress. Summarize the feature change, kit version/reuse, data mode, and remaining gaps concisely. Do not claim deployment, live compatibility, or measured token savings from synthetic checks.
