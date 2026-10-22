# CodeAppsCompact

**Install the skill. Ask for a Code Apps record screen. The agent obtains the kit only when it is missing.**

CodeAppsCompact is a GitHub-hosted React/TypeScript kit and portable agent skill for Power Platform Code Apps. The agent configures fields, columns, validation, and generated-service mappings instead of regenerating list/editor behavior.

**Status:** 0.1.1, experimental, MIT-licensed. The kit and skill are distributed through [GitHub Releases](https://github.com/ilyafainberg/CodeAppsCompact/releases/tag/v0.1.1), not the npm registry. Live Power Apps-host and tenant compatibility remain unverified. Version 0.1.1 changes distribution and documentation; the 0.1.0 component behavior is unchanged.

## 1. Install the skill

This repository is a single-plugin skill marketplace named `codeappscompact`. It contains one plugin and one skill, both named `codeappscompact`. Register it explicitly in your agent; the repository is not automatically listed in every host's central catalog.

### GitHub Copilot CLI

Run in your terminal:

```powershell
copilot plugin marketplace add ilyafainberg/CodeAppsCompact
copilot plugin install codeappscompact@codeappscompact
```

### Claude Code

Run inside a Claude Code session:

```text
/plugin marketplace add ilyafainberg/CodeAppsCompact
/plugin install codeappscompact@codeappscompact
```

### Other Agent Skills-compatible hosts

Download [codeappscompact-skill-0.1.1.zip](https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v0.1.1/codeappscompact-skill-0.1.1.zip) and import its `codeappscompact` folder through your host's supported skill mechanism. Alternatively, copy the complete [skill directory](plugins/codeappscompact/skills/codeappscompact), including `references`, to a supported skill location. Copying only `SKILL.md` loses the installation instructions and pinned kit manifest.

The skill is host-neutral guidance, not an executable installer or a grant of permissions. Installation does not run hooks, register MCP servers, download the runtime kit, change a Code App, or deploy anything. The agent performs those kit setup steps only when you invoke the skill for an authorized task. Reload your host if it requires a new session to discover installed skills.

## 2. Ask for the feature

In an existing React/TypeScript Code App, for example:

> Use CodeAppsCompact to add a service-request screen using our existing generated service. Include summary, owner email, priority, and estimated hours. Support creating, editing, paging, and searching loaded records. Preserve the existing theme and do not deploy.

The skill guides the agent to:

1. Inspect the app, package manager, generated service types, and requested behavior.
2. Reuse a compatible installed `codeappscompact` package. If it is declared but not restored, restore the existing lockfile instead of replacing its origin or version.
3. If absent, obtain any required permission, download the version-pinned kit from this repository's GitHub release, verify SHA-256, inspect its contents, and install it project-locally. No npm login is needed for the kit.
4. Read the installed version's `API.txt` and write only the app-specific configuration and service adapter.
5. Run the app's checks and report whether integration used synthetic data or authorized live services. A synthetic pass does not establish tenant compatibility.

The default downloaded archive is kept inside the consuming app's `vendor` directory and installed as a local file dependency. Keep that archive, the dependency manifest, and the lockfile together in the app repository so a clean checkout can restore it. A valid existing installation is reused without another download or update check. Upgrades are explicit.

**GitHub replaces kit hosting, not dependency management.** The package import remains `codeappscompact`; npm, pnpm, or Yarn can install the verified archive. React, TanStack React Query, and the Power Apps SDK remain peer dependencies and may still require your configured package registry. The skill does not bypass registry, TLS, tenant, or tool-permission restrictions.

## What the kit handles

`RecordScreen` provides a record table, search over loaded records, cursor-based pagination and deduplication, accessible create/edit forms, primitive field validation, and visible read/write errors. Failed writes preserve the form; writes are not automatically retried. Refresh failure after a committed save does not replay the write.

The app supplies a `DataService<R, D>` with `getAll`, `create`, and `update` returning the Power Apps SDK's `IOperationResult<T>`, plus fields, columns, defaults, identity, and draft mappings. A caller-owned `QueryClientProvider` is required. The library injects no styles and creates no query client.

Supported drafts are flat objects with widened `string` and `number` values. There is no delete, relationship editor, upload, nested draft schema, server-side search, or cross-system transaction support. Authentication, SDK setup, connections, permissions, and deployment remain the Code App's responsibility. Inspect real generated connector signatures rather than assuming they match the synthetic example. Unsupported requirements must stay visible, not be silently dropped.

## Reference and manual use

- [Portable skill](plugins/codeappscompact/skills/codeappscompact/SKILL.md): compact agent workflow.
- [Kit installation and reuse](plugins/codeappscompact/skills/codeappscompact/references/install.md): host-neutral procedure and an npm example.
- [Pinned kit manifest](plugins/codeappscompact/skills/codeappscompact/references/kit.json): release URL, supported installed versions, and SHA-256.
- [API.txt](API.txt): complete public API and behavior contract; also included in the kit.
- [examples/App.tsx](examples/App.tsx): configured screen. [examples/main.tsx](examples/main.tsx) supplies the query provider; [examples/service.ts](examples/service.ts) is explicitly synthetic.

The kit archive contains compiled JavaScript, TypeScript declarations, API documentation, synthetic examples, README, and LICENSE. It has no install lifecycle hook. After following the verification procedure, an npm project can install its local archive:

```powershell
npm install --save-exact --ignore-scripts --no-audit --no-fund ".\vendor\codeappscompact-0.1.1.tgz"
```

Import normally:

```typescript
import { RecordScreen, type DataService } from 'codeappscompact';
```

Do not use `npm install codeappscompact` without the archive path: this project does not publish the kit to the npm registry, and a registry name is not proof of this repository's provenance.

## Evidence and limits

The reusable implementation, rather than the skill's wording, is the token-saving mechanism. The earlier 0.1.0 pilot reported 78.6% fewer model-output tokens and 42.8% fewer total tokens across three paired authoring trials of one synthetic record-management feature. Input documentation was counted. This does not establish savings across all applications, against every existing framework, or for this newly packaged installation workflow. Skill discovery, downloads, and first-time dependency setup have their own costs; no new token benchmark is claimed here.

Private benchmark prompts, usage logs, and trial sources are not included. The synthetic example and tests are not a connected or deployed Power Apps app.

## Develop and run the synthetic example

Use Node.js 22.12 or newer; CI uses Node.js 24. The lockfile pins development dependencies, including React 18 and Power Apps SDK 1.5.0.

```powershell
git clone https://github.com/ilyafainberg/CodeAppsCompact.git
cd CodeAppsCompact
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build
npm run build:demo
npm run dev
```

Open Vite's printed loopback URL. The example uses in-memory synthetic data, makes no tenant requests, stores no credentials, and resets on reload. Neither build command publishes or deploys anything.

## Distribution maintenance

The root `marketplace.json` and `.claude-plugin/marketplace.json` expose the same catalog. `plugins/codeappscompact/plugin.json` uses the Agent Plugins 1.0 format; its `.claude-plugin/plugin.json` companion supports legacy hosts. The skill uses the standard `SKILL.md` format with local references and no host-specific tool requirements, hooks, or automatic updates.

For a new release, update the package, lockfile, plugin manifests, skill version, installation filenames, and kit manifest together. Run the checks, build, then use `npm pack --ignore-scripts` to produce the kit. Review the archive's files and compute its SHA-256 before updating the pinned kit manifest. Archive the complete skill directory only after that hash is recorded. Publish both archives and `SHA256SUMS` on a new GitHub release tag pointing to the reviewed commit; never replace an existing version's artifacts. Verify anonymous downloads, checksums, marketplace discovery, and installation in a separate consumer before announcing availability.

`"private": true` intentionally blocks npm publishing while allowing local packing and installation. CI checks types, behavior, distribution metadata, library/demo builds, and package contents; it does not publish to npm, deploy Code Apps, or change tenant data.

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.
