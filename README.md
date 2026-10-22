# CodeAppsCompact

**Install one skill. Its record-screen kit is already included as a ZIP.**

CodeAppsCompact helps an agent build Power Platform Code Apps by configuring a reusable React/TypeScript screen instead of rewriting its list, form, paging, validation, and error handling.

**0.1.3 - experimental, MIT-licensed.** Distributed through GitHub, not the npm registry. Live Power Apps-host and tenant compatibility remain unverified. This release changes packaging, not component behavior.

## Install the skill

This repository is a single-plugin marketplace. Register it in your agent:

**GitHub Copilot CLI** (terminal):

```powershell
copilot plugin marketplace add ilyafainberg/CodeAppsCompact
copilot plugin install codeappscompact@codeappscompact
```

**Claude Code** (inside a session):

```text
/plugin marketplace add ilyafainberg/CodeAppsCompact
/plugin install codeappscompact@codeappscompact
```

**Other Agent Skills hosts:** import [codeappscompact-skill-0.1.3.zip](https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v0.1.3/codeappscompact-skill-0.1.3.zip), or copy the complete [skill folder](plugins/codeappscompact/skills/codeappscompact) through your host's supported mechanism. Preserve `assets` and `references`; importing only the text of `SKILL.md` is insufficient. Existing users must update or reinstall the complete skill to receive the ZIP bundle. Reload the host if it requires a new session.

The skill contains everything specific to CodeAppsCompact:

```text
codeappscompact/
  SKILL.md
  LICENSE
  references/
    install.md
    kit.json
  assets/
    codeappscompact-0.1.3.zip
```

The ZIP includes prebuilt JavaScript, TypeScript declarations, `API.txt`, a synthetic example, package metadata, and the MIT license. No separate kit download or source build is needed.

## Use it

In an existing React/TypeScript Code App, ask:

> Use CodeAppsCompact to add a service-request screen using our existing generated service. Include summary, owner email, priority, and estimated hours. Support creating, editing, paging, and searching loaded records. Preserve the theme and do not deploy.

The agent reuses a supported installed kit. If absent, it verifies the bundled ZIP, extracts it into the app's `vendor` directory, and installs the extracted package folder with the app's package manager. npm cannot install a ZIP directly. The agent then reads the installed API and writes only your fields, columns, validation, and typed service adapter. Keep the entire extracted package directory, dependency manifest, and lockfile together in the app repository; the skill's ZIP is not needed for subsequent restores.

The skill assumes its assets are present. An incomplete or corrupt installation is an error: reinstall the complete skill rather than fetching a substitute or regenerating the component. Existing locked dependencies and custom packages are not silently replaced.

**Bundled does not mean a complete offline app environment.** Node.js >=22.12.0, React, TanStack React Query, and the Power Apps SDK are still required. Missing dependencies may need your configured registry. No npm account is needed for this kit. Installation runs no skill hooks and grants no tool permissions; modifying an app still requires authorization.

## Scope

`RecordScreen` supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. The app owns its query provider, styling, generated services, authentication, connections, permissions, and deployment.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. The skill does not scaffold or deploy an app. Synthetic examples are not live integrations.

## Repository layout

- [Skill](plugins/codeappscompact/skills/codeappscompact/SKILL.md): instructions, local installation reference, and bundled ZIP.
- [kit](kit/README.md): maintainer-only source, API, example, tests, and build tools. Consumers do not need this directory.
- `marketplace.json` and `.claude-plugin`: discovery metadata for supported hosts.

See [kit maintenance](kit/README.md) for development, release steps, and the earlier token pilot's evidence and limits. No new token-saving measurement is claimed for this packaging change.

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.
