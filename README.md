# CodeAppsCompact

**One portable skill folder. Its record-screen kit and all CodeAppsCompact assets are included.**

CodeAppsCompact helps an agent build Power Platform Code Apps by configuring a reusable React/TypeScript screen instead of rewriting its list, form, paging, validation, and error handling.

**0.1.4 - experimental, MIT-licensed.** Distributed as a complete skill ZIP or through the marketplace, not the npm registry. Live Power Apps-host and tenant compatibility remain unverified. This release changes packaging, not component behavior.

## Install the skill

**Portable installation:** import [codeappscompact-skill-0.1.4.zip](https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v0.1.4/codeappscompact-skill-0.1.4.zip), or copy the complete [skill folder](plugins/codeappscompact/skills/codeappscompact) through your host's supported mechanism. Preserve `assets` and `references`; importing only the text of `SKILL.md` is insufficient. The folder can be moved or shared intact. Neither the skill nor its nested kit contains repository URLs, original-location paths, or maintainer build instructions. The host must expose the bundled files to its agent.

**Marketplace installation** is an optional delivery method; it is not a runtime dependency of the skill. This repository is a single-plugin marketplace.

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
codeappscompact/
  SKILL.md
  LICENSE
  references/
    install.md
    kit.json
  assets/
    codeappscompact-0.1.4.zip
```

The inner ZIP includes prebuilt JavaScript, TypeScript declarations, `API.txt`, a synthetic example, a consumer README, runtime-only package metadata, and the MIT license. It has no scripts, development dependencies, or hosting metadata. No separate kit download or source build is needed. Every required path resolves from the installed skill folder, not a checkout or the app's current directory.

## Use it

In an existing React/TypeScript Code App, ask:

> Use CodeAppsCompact to add a service-request screen using our existing generated service. Include summary, owner email, priority, and estimated hours. Support creating, editing, paging, and searching loaded records. Preserve the theme and do not deploy.

The agent reuses a supported installed kit. If absent, it verifies the bundled ZIP, extracts it into the app's `vendor` directory, and installs the extracted package folder with the app's package manager. npm cannot install a ZIP directly. The agent then reads the installed API and writes only your fields, columns, validation, and typed service adapter. Keep the entire extracted package directory, dependency manifest, and lockfile with the app; neither the skill's ZIP nor its original installation is needed for subsequent restores.

Missing or corrupt assets mean an incomplete skill installation: supply the complete folder rather than fetching a substitute or regenerating the component. Existing locked dependencies and custom packages are not silently replaced.

**Self-contained does not mean a complete offline app environment.** Node.js >=22.12.0, React, TanStack React Query, and the Power Apps SDK are still required. Missing peers may need your configured registry. No npm account is needed for this kit. The skill has no install hooks and grants no tool permissions; modifying an app still requires authorization.

## Scope

`RecordScreen` supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. The app owns its query provider, styling, generated services, authentication, connections, permissions, and deployment.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. The skill does not scaffold or deploy an app. Synthetic examples are not live integrations. See the local [package guide](kit/README.md) and [API contract](kit/API.txt).

## Maintainer workspace

The portable [skill](plugins/codeappscompact/skills/codeappscompact/SKILL.md) is independent of this workspace. `kit` contains source, tests, the synthetic demo, and build tools; consumers do not need them. `marketplace.json`, `.claude-plugin`, and the plugin manifests provide discovery only. Maintainer instructions stay here, outside the portable bundle.

Use Node.js >=22.12.0 and PowerShell 7 (`pwsh`). ZIP creation and distribution tests use built-in .NET ZIP support; consumers can use any safe ZIP extractor.

```powershell
cd .\kit
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build:demo
```

`npm run dev` runs the in-memory synthetic demo on Vite's loopback URL. It makes no tenant requests and resets on reload. These commands do not publish or deploy.

To release a packaging or component change:

1. Update the package/lockfile, both marketplace catalogs, both plugin manifests, skill version, documentation filenames, and `references\kit.json` together. Review supported installed versions; keep npm publishing disabled.
2. Remove only the previous tracked kit archive when changing its version. Run `npm run bundle:skill` from `kit`. It builds the component, includes an explicit consumer-file and package-metadata allowlist, uses fixed ZIP timestamps, and updates the bundled SHA-256. Never package this maintainer guide or development scripts.
3. Run type checking, tests, and the demo build. Distribution tests verify contents, metadata, links, digest, absence of origin references, and extraction from a relocated standalone skill. Exercise local-directory installation and clean lockfile restore in an isolated consumer without the original skill folder.
4. Commit the reviewed source and complete bundle. Package the entire skill directory into `codeappscompact-skill-<version>.zip` with one top-level `codeappscompact` folder. Publish that ZIP on a new release tag; never replace old release artifacts. Confirm the published ZIP matches the reviewed one.

Both marketplace catalogs represent the same catalog; the plugin's Agent Plugins 1.0 and legacy manifests must stay synchronized. No npm publishing, automatic updates, install hooks, telemetry, or tenant changes are involved.

## Token evidence and limits

The earlier 0.1.0 pilot reported 78.6% fewer model-output tokens and 42.8% fewer total tokens across three paired authoring trials of one synthetic record-management feature. Input documentation was counted. This does not establish savings across all apps, against every existing framework, or for this installation workflow. Reuse is the saving mechanism; discovery and dependency setup still have costs. No new token benchmark is claimed. Private benchmark prompts, usage logs, and trial sources are not included.

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.
