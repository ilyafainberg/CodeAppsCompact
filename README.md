# CodeAppsCompact

**A portable agent skill with a ready-made React record screen. Reuse it, configure it, and write less boilerplate.**

CodeAppsCompact helps agents build Power Platform Code Apps using `RecordScreen` for lists, forms, validation, pagination, and visible connector errors. The agent supplies your fields, columns, and service integration instead of regenerating that behavior.

**0.1.7 - experimental, MIT-licensed.** Distributed through GitHub, not the npm registry. Live Power Apps-host and tenant compatibility remain unverified. This release simplifies skill execution; component behavior is unchanged.

## Install the complete skill

Import [codeappscompact-skill-0.1.7.zip](https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v0.1.7/codeappscompact-skill-0.1.7.zip), or copy the complete [skill folder](plugins/codeappscompact/skills/codeappscompact) through your agent host's supported mechanism. Keep `assets` and `scripts`; importing only `SKILL.md` is insufficient. Update existing installations with the complete folder and reload the host if required.

```text
codeappscompact\
  SKILL.md
  LICENSE
  scripts\setup.mjs
  assets\
    package.json
    API.txt
    README.md
    LICENSE
    dist\
    examples\
```

Everything resolves from this folder, which can be moved or shared intact. It has no repository dependency, nested archive, separate installation manifest, or install hooks. The outer ZIP is just a delivery format. Your host must expose the files and authorize any app changes.

### Marketplace installation

This repository is a single-plugin marketplace. Discovery is optional; it is not required to execute the installed skill.

GitHub Copilot CLI:

```powershell
copilot plugin marketplace add ilyafainberg/CodeAppsCompact
copilot plugin install codeappscompact@codeappscompact
```

Claude Code:

```text
/plugin marketplace add ilyafainberg/CodeAppsCompact
/plugin install codeappscompact@codeappscompact
```

## Use it

In an existing React/TypeScript Code App, ask:

> Use CodeAppsCompact to add a service-request screen using our existing generated service. Include summary, owner email, priority, and estimated hours. Support creating, editing, paging, and searching loaded records. Preserve the theme and do not deploy.

The agent follows one short path:

1. **Reuse first.** Resolve the existing package and read its matching API. Restore a missing declared dependency rather than replacing it.
2. **Set up once if absent.** For standalone npm apps, run `node "<skill-folder>\scripts\setup.mjs" "<app-folder>"`. The helper copies the plain assets into the app, installs locally, and reuses identical copies on repeat runs. It rejects modified copies and conflicting dependencies. Non-npm projects and workspaces retain their existing integration process; the helper stops without changing them.
3. **Configure the screen.** Read the short contract at the beginning of `API.txt`. Use a generated service directly if its types and behavior fit; adapt only mismatches. Detailed declarations and examples are optional references.
4. **Check the integration.** Verify app-specific mappings and behavior. Check portable installation only when dependencies change, not for every screen.

Keep the copied `vendor` package, including `dist`, with the app's manifest and lockfile; review ignore rules. The app then restores without the skill's original location. npm clean restores use `npm ci --install-links --ignore-scripts --strict-peer-deps --legacy-peer-deps=false --force=false --no-audit --no-fund`.

**Self-contained does not mean a complete offline app environment.** Node.js >=22.12.0, React, TanStack React Query, and the Power Apps SDK are app prerequisites. Missing dependencies need authorization and may require the app's configured registry. No npm account is needed for the bundled kit. The helper never downloads the kit, changes registries, or grants permissions.

## Scope

`RecordScreen` supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. A failed refresh does not replay a committed write.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. Your app owns styling, its query provider, generated services, authentication, connections, permissions, and deployment. Synthetic examples are not live integrations. See the [package guide](kit/README.md) and [API contract](plugins/codeappscompact/skills/codeappscompact/assets/API.txt).

## Maintain the kit

`kit` contains the source, tests, synthetic demo, and build tools. Consumers need none of them. The marketplace/plugin manifests provide discovery and retain compatibility with both supported host formats.

Use Node.js >=22.12.0 and PowerShell 7 for the maintainer asset-copy script:

```powershell
cd .\kit
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
```

`npm run dev` runs the local in-memory demo; `npm run build:demo` builds it. Neither publishes or deploys.

The setup integration test may use the configured registry to install app peers, then runs kit setup and clean restore offline. It does not assume a previously populated registry metadata cache.

For a release:

1. Update package/lockfile, marketplace/plugin versions, skill metadata, and documentation together. Keep npm publishing disabled.
2. Run `npm run bundle:skill` from `kit`. Its explicit allowlist synchronizes the consumer assets. `kit\API.txt` is canonical; do not edit generated copies. The setup helper lives directly in the skill's `scripts` folder. Unexpected assets must be inspected and removed explicitly, never silently packaged or deleted.
3. Run type checking and tests. Distribution checks cover the exact bundle and portable links; setup tests cover copying, safe repeat runs, conflicts, and actual installation/restore from a relocated skill. Build the demo when component behavior changes. Commit the complete skill, including `assets\dist`.
4. ZIP the complete skill under one `codeappscompact` folder. Publish a new release and verify the downloaded artifact matches. Do not replace historical releases.

## Evidence and limitations

The earlier 0.1.0 synthetic pilot reported 78.6% fewer model-output tokens and 42.8% fewer total tokens across three paired authoring trials of one record-management feature, with input documentation counted. This does not establish savings across all apps, against every existing framework, or for this setup workflow. No new token savings are claimed; private benchmark materials are not included.

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.
