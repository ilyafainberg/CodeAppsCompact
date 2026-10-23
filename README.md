# CodeAppsCompact

**One portable skill folder. The ready-to-install record-screen package is directly in `assets`.**

CodeAppsCompact helps an agent build Power Platform Code Apps by configuring a reusable React/TypeScript screen instead of rewriting its list, form, paging, validation, and error handling.

**0.1.6 - experimental, MIT-licensed.** Distributed as a complete skill ZIP or through the marketplace, not the npm registry. Live Power Apps-host and tenant compatibility remain unverified. This release changes packaging, not component behavior.

## Install the skill

**Portable installation:** import [codeappscompact-skill-0.1.6.zip](https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v0.1.6/codeappscompact-skill-0.1.6.zip), or copy the complete [skill folder](plugins/codeappscompact/skills/codeappscompact) through your host's supported mechanism. Preserve `assets`; importing only the text of `SKILL.md` is insufficient. The folder can be moved or shared intact. It contains no repository URLs, original-location paths, or maintainer build instructions. The host must expose the bundled files to its agent.

**Marketplace installation** is an optional delivery method, not a runtime dependency. This repository is a single-plugin marketplace.

GitHub Copilot CLI (terminal):

```powershell
copilot plugin marketplace add ilyafainberg/CodeAppsCompact
copilot plugin install codeappscompact@codeappscompact
```

Claude Code (inside a session):

```text
/plugin marketplace add ilyafainberg/CodeAppsCompact
/plugin install codeappscompact@codeappscompact
```

Existing users must update or reinstall the complete skill, not just `SKILL.md`. Reload the host if it requires a new session.

```text
codeappscompact\
  SKILL.md
  LICENSE
  assets\
    package.json
    API.txt
    README.md
    LICENSE
    dist\
      index.js
      index.d.ts
    examples\
      App.tsx
      main.tsx
      service.ts
      style.css
```

There is **no nested kit archive, `kit.json`, or `install.md`**. `SKILL.md` contains the installation steps, [assets/package.json](plugins/codeappscompact/skills/codeappscompact/assets/package.json) supplies standard package metadata, and [assets/API.txt](plugins/codeappscompact/skills/codeappscompact/assets/API.txt) is directly readable. The outer skill ZIP is only a convenient way to deliver the complete folder; the kit itself needs no extraction, download, or build. Its metadata has no scripts, development dependencies, or hosting information. Every required path resolves from the installed skill folder.

## Use it

In an existing React/TypeScript Code App, ask:

> Use CodeAppsCompact to add a service-request screen using our existing generated service. Include summary, owner email, priority, and estimated hours. Support creating, editing, paging, and searching loaded records. Preserve the theme and do not deploy.

The agent reuses a working installed kit. If absent, it copies `assets` into the app's versioned `vendor` directory and installs that local package folder with the app's package manager. It reads the matching API and writes only your fields, columns, validation, and typed service adapter. Keep the complete copied package, dependency manifest, and lockfile with the app so later restores do not need the skill's original location. Existing locked dependencies and custom packages are not silently replaced.

**Self-contained does not mean a complete offline app environment.** Node.js >=22.12.0, React, TanStack React Query, and the Power Apps SDK are still required. Missing peers may need your configured registry. No npm account is needed for this kit. The skill has no install hooks and grants no tool permissions; modifying an app still requires authorization.

## Scope

`RecordScreen` supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. The app owns its query provider, styling, generated services, authentication, connections, permissions, and deployment.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. The skill does not scaffold or deploy an app. Synthetic examples are not live integrations. See the local [package guide](kit/README.md) and [bundled API contract](plugins/codeappscompact/skills/codeappscompact/assets/API.txt).

## Maintainer workspace

The portable [skill](plugins/codeappscompact/skills/codeappscompact/SKILL.md) is independent of this workspace. `kit` contains source, tests, the synthetic demo, and build tools; consumers do not need them. Marketplace and plugin manifests provide discovery only. Maintainer instructions stay here, outside the portable bundle.

Use Node.js >=22.12.0 and PowerShell 7 (`pwsh`) for the asset-copy build script.

```powershell
cd .\kit
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build:demo
```

`npm run dev` runs the in-memory synthetic demo on Vite's loopback URL. It makes no tenant requests and resets on reload. These commands do not publish or deploy.

To release a packaging or component change:

1. Update the package/lockfile, both marketplace catalogs, both plugin manifests, skill version, and documentation filenames together. Keep npm publishing disabled.
2. Run `npm run bundle:skill` from `kit`. It builds the component and synchronizes the plain files in `assets` using explicit consumer-file and package-metadata allowlists. `kit\API.txt` is canonical; do not edit its generated `assets\API.txt` copy independently. The script rejects unexpected asset files rather than silently deleting or packaging them. Never include this maintainer guide or development scripts.
3. Run type checking and tests. Distribution tests verify the exact asset tree, metadata, links, source synchronization, absence of origin references, and copying from a relocated standalone skill. Exercise local-directory installation and clean lockfile restore in an isolated consumer without the original skill folder. Include the generated `assets\dist` files in version control; the root ignore rules explicitly permit them. Build the demo if component behavior changed.
4. Commit the reviewed source and complete skill folder. Package that folder into `codeappscompact-skill-<version>.zip` with one top-level `codeappscompact` folder. Publish the ZIP on a new release tag; never replace old release artifacts. Confirm the published ZIP matches the reviewed one.

Both marketplace catalogs represent the same catalog; the plugin's Agent Plugins 1.0 and legacy manifests must stay synchronized. No npm publishing, automatic updates, install hooks, telemetry, or tenant changes are involved.

## Token evidence and limits

The earlier 0.1.0 pilot reported 78.6% fewer model-output tokens and 42.8% fewer total tokens across three paired authoring trials of one synthetic record-management feature. Input documentation was counted. This does not establish savings across all apps, against every existing framework, or for this installation workflow. Reuse is the saving mechanism; discovery and dependency setup still have costs. No new token benchmark is claimed. Private benchmark prompts, usage logs, and trial sources are not included.

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.
