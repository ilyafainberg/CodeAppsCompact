---
name: codeappscompact
description: Build or update compact React/TypeScript record-list and create/edit screens in Power Platform Code Apps. Use when the user wants CodeAppsCompact or a reusable record screen over generated Power Apps services. The kit is bundled as a ZIP with this portable skill; configure fields and a typed service adapter instead of regenerating the component. Not for Canvas Apps, model-driven apps, or deployment.
license: MIT
compatibility: Requires an authorized React/TypeScript Code App, Node.js 22.12 or newer, project package tooling, and host-provided local file, ZIP extraction, and execution capabilities. Install the complete skill folder, including assets and references.
metadata:
  version: "0.1.5"
---

# CodeAppsCompact

This complete skill folder is the portable unit: it contains the prebuilt kit, directly readable API reference, types, and synthetic example. Resolve bundled paths from the folder containing this `SKILL.md`, never from the app's working directory or the skill's original location. No hosting metadata, source checkout, or network lookup is needed to locate the kit. Text-only skill imports are insufficient; the host must expose the complete folder.

Generate only app-specific configuration, adapters, styling integration, and tests, not another record-screen implementation.

## 1. Check fit

Inspect the existing app, dependency manifest/lockfile, query provider, generated services, and acceptance criteria. This skill does not scaffold or publish an app. Report a missing project or service rather than inventing one.

Supported: list, search over loaded records, cursor paging, create/edit/cancel, and flat string/number drafts with text/email/number/select fields. Delete, relationships, uploads, nested drafts, server-side search, and cross-system transactions are not supplied. Preserve unsupported requirements and explain the gap.

## 2. Reuse or install the bundled kit

Read [kit.json](references/kit.json). Its `archive` path is relative to this installed skill's directory. Resolve `codeappscompact` in the app and inspect its version, declared dependency path, and package-root `API.txt`. Reuse a working supported installation. Restore a declared but missing dependency from its existing lockfile; never silently replace its version, origin, or a custom package.

If absent, follow [local installation](references/install.md): verify the included ZIP's SHA-256 and contents, extract it into the app's `vendor` directory, and install the extracted package directory with the existing package manager. npm cannot install a ZIP directly. Retain the extracted files with the app for clean restores. No separate kit download, npm-registry package lookup, or source build is needed. Missing or corrupt bundled assets mean an incomplete skill installation: stop and request the complete skill, not a substitute download or regenerated component.

Use only tools supplied and authorized by the current host; permission decisions are authoritative. Installing the skill is not authorization to modify an app. Ordinary peer dependencies may still need the app's configured registry; never bypass TLS, registry, tenant, or filesystem restrictions.

## 3. Configure, do not regenerate

For the bundled kit version, read the [bundled API reference](references/API.txt) directly: it is a plain file in this skill's `references` folder, readable without ZIP extraction or package installation. It matches the version in `kit.json`. If reusing a different supported version, read that installed package's own root `API.txt` instead. Read relevant declarations from the actual installed package. Load its synthetic example only if needed, not the implementation or unrelated connector documentation.

Inspect actual generated service signatures and response types. Write a typed `DataService<R, D>` adapter without invented fields, casts to `any`, or successful empty fallbacks. Preserve failure results, paging tokens, identity, and supported write semantics.

Supply fields, columns, defaults, `getId`, `toDraft`, and `searchText`. Draft keys and widened primitive types must match defaults exactly. Reuse the app's stable `QueryClientProvider` with a distinct infinite-query key per resource. Compose `RecordScreen` with existing styles; do not hand-copy it or regenerate SDK services.

Search covers loaded records only. Writes are not automatically retried; refresh failure must not replay a committed write. The app owns SDK setup, authentication, connections, and permissions. Do not create connections, change schemas, modify production data, or deploy without separate authorization.

## 4. Verify and finish

Run existing type/build checks and focused behavior tests for loading/errors, validation, create/update payloads, paging, and failed-save preservation. Exercise writes only with synthetic data or an explicitly authorized isolated backend. Authorized live reads are needed before claiming connector compatibility.

Correct observed failures and rerun affected checks, with at most two corrective passes. Stop earlier on success, missing access/input, or no viable new approach; never weaken checks. Verify saved files and dependency/lockfile state.

Report kit version, whether reused or installed from the bundle, feature changes, actual checks, data mode, and gaps concisely. Do not claim deployment, live compatibility, or measured token savings from synthetic checks alone.
