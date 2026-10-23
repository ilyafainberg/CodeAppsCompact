---
name: codeappscompact
description: Build or update compact React/TypeScript record-list and create/edit screens in Power Platform Code Apps. Use the prebuilt package in this skill's assets folder; configure fields and a typed service adapter instead of regenerating the component. Not for Canvas Apps, model-driven apps, or deployment.
license: MIT
compatibility: Requires an authorized React/TypeScript Code App, Node.js 22.12 or newer, project package tooling, and host-provided local file and execution capabilities. Install the complete skill folder, including assets.
metadata:
  version: "0.1.6"
---

# CodeAppsCompact

Use the existing `RecordScreen`; generate only app-specific configuration, adapters, styling integration, and tests. All kit files are ordinary files in `assets`, relative to the folder containing this `SKILL.md`. No original location, source checkout, download, extraction, or kit build is needed. If the host exposes only skill text or assets are missing, stop and request the complete folder rather than fetching or regenerating a substitute.

## 1. Check fit

Inspect the existing app, dependency manifest/lockfile, query provider, generated services, and acceptance criteria. This skill does not scaffold or publish an app. Report a missing project or service rather than inventing one.

Supported: list, search over loaded records, cursor paging, create/edit/cancel, and flat string/number drafts with text/email/number/select fields. Delete, relationships, uploads, nested drafts, server-side search, and cross-system transactions are not supplied. Preserve unsupported requirements and explain the gap.

## 2. Reuse or install

Read [assets/package.json](assets/package.json) for the bundled version, Node requirement, and peer dependencies. Resolve `codeappscompact` in the app. Reuse a working installation whose own `API.txt` supports the request. Restore a declared but missing dependency with the existing lockfile; do not silently upgrade or replace another version, origin, or custom package.

If absent and app changes are authorized, copy the entire `assets` folder into a new versioned directory inside the app, then install that local directory with its existing package manager. For npm, run from the app directory with `$skillRoot` set to the installed folder containing this `SKILL.md`:

```powershell
$source = Join-Path $skillRoot 'assets'
$version = (Get-Content -LiteralPath (Join-Path $source 'package.json') -Raw | ConvertFrom-Json).version
$destination = ".\vendor\codeappscompact-$version"
if (Test-Path -LiteralPath $destination) { throw 'Destination exists; inspect before reusing.' }
New-Item -ItemType Directory -Path '.\vendor' -Force | Out-Null
Copy-Item -LiteralPath $source -Destination $destination -Recurse -ErrorAction Stop
npm install --save-exact --install-links --ignore-scripts --no-audit --no-fund $destination
if ($LASTEXITCODE -ne 0) { throw 'Local package installation failed.' }
```

Keep the complete copied directory, including `dist`, with the app's manifest and lockfile; check ignore rules. Never depend on an absolute path into the skill installation. For npm clean restores use `npm ci --install-links --ignore-scripts --no-audit --no-fund`. Other package managers need equivalent local-directory options; preserve workspace policy and do not add a second lockfile or overwrite an existing destination.

Ordinary peer dependencies belong to the app and may need its configured registry. Preserve compatible peers and obtain approval for required dependency changes. Use only authorized host tools; never bypass permission decisions, TLS, peer constraints, or registry restrictions. The skill grants no permissions and requires no install hooks.

## 3. Configure, do not regenerate

Read the [bundled API reference](assets/API.txt) directly, or the installed package's own `API.txt` when reusing another version. Read relevant type declarations; load the [synthetic example](assets/examples/App.tsx) only if needed, not the implementation or unrelated connector documentation.

Inspect actual generated service signatures and response types. Write a typed `DataService<R, D>` adapter without invented fields, casts to `any`, or successful empty fallbacks. Preserve failure results, paging tokens, identity, and supported write semantics.

Supply fields, columns, defaults, `getId`, `toDraft`, and `searchText`. Draft keys and widened primitive types must match defaults exactly. Reuse the app's stable `QueryClientProvider` with a distinct infinite-query key per resource. Compose `RecordScreen` with existing styles; do not hand-copy it or regenerate SDK services.

Search covers loaded records only. Writes are not automatically retried; refresh failure must not replay a committed write. The app owns SDK setup, authentication, connections, and permissions. Do not create connections, change schemas, modify production data, or deploy without separate authorization.

## 4. Verify and finish

Confirm package resolution, version, `RecordScreen` import, and project-relative dependency/lockfile paths. The copied package must restore without the original skill folder.

Run existing type/build checks and focused behavior tests for loading/errors, validation, create/update payloads, paging, and failed-save preservation. Exercise writes only with synthetic data or an explicitly authorized isolated backend. Authorized live reads are needed before claiming connector compatibility.

Correct observed failures and rerun affected checks, with at most two corrective passes. Stop earlier on success, missing access/input, or no viable new approach; never weaken checks. Verify saved files and dependency/lockfile state.

Report kit version, whether reused or copied from the bundle, feature changes, actual checks, data mode, and gaps concisely. Do not claim deployment, live compatibility, or measured token savings from synthetic checks alone.
