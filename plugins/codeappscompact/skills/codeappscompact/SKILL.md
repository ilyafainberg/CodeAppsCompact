---
name: codeappscompact
description: Build or update compact React/TypeScript record-list and create/edit screens in Power Platform Code Apps. Use when the user wants CodeAppsCompact or a reusable record screen over generated Power Apps services. Reuse an installed kit or download the pinned GitHub kit when missing; configure the app-specific fields and adapter instead of regenerating the component. Not for Canvas Apps, model-driven apps, or deployment.
license: MIT
compatibility: Requires an authorized React/TypeScript Code App workspace, Node.js 22.12 or newer, project package tooling, and host-provided file, execution, and HTTPS-download capabilities when setup is needed.
metadata:
  version: "0.1.1"
  repository: https://github.com/ilyafainberg/CodeAppsCompact
---

# CodeAppsCompact

Implement the requested feature, not a new framework. The kit supplies `RecordScreen`; generate only app-specific configuration, adapters, styling integration, and tests.

## 1. Check fit

Inspect the existing app, dependency manifest/lockfile, query provider, generated services, and acceptance criteria. Reuse supplied project and environment details. This skill needs a React/TypeScript Code App; it does not scaffold, initialize, or publish one. If the project or required service is missing, identify that prerequisite rather than inventing it.

Supported: list, local search over loaded records, cursor paging, create/edit/cancel, and flat string/number drafts with text/email/number/select fields. Delete, relationships, uploads, nested drafts, server-side search, and cross-system transactions are not supplied. Preserve unsupported requirements and explain the gap; do not silently reduce scope.

## 2. Ensure the kit exists

Read [the small kit manifest](references/kit.json). Resolve `codeappscompact` in the consuming project and inspect its version, provenance, and installed `API.txt`. Reuse a working supported version without downloading or checking for updates. If the dependency is already declared but not restored, use its existing lockfile and package manager; do not replace its source. Do not silently upgrade another version or overwrite a local/custom package.

If absent, follow [installation and reuse](references/install.md): obtain any required host approval, download the pinned GitHub archive, verify SHA-256, review it, and install it project-locally. The package is not published to npm. A skill grants no permissions: use only authorized host tools, stop on denial, and never bypass TLS, registry, tenant, or filesystem restrictions. Installing this skill alone does not authorize modifying an app.

## 3. Configure, do not regenerate

Read the installed kit's `API.txt` and relevant declarations. Load its synthetic example only if needed; do not load the implementation or unrelated connector documentation by default.

Inspect the actual generated service signatures and response types. Write a typed `DataService<R, D>` adapter without inventing fields, casts to `any`, or successful empty fallbacks. Preserve failure results, paging tokens, identity, and supported write semantics. Synthetic example services are not live integrations.

Supply fields, columns, defaults, `getId`, `toDraft`, and `searchText`. Draft keys and widened primitive types must match defaults exactly. Reuse the app's stable `QueryClientProvider`; give each resource a distinct infinite-query key. Compose `RecordScreen` with existing styles. Do not hand-copy the component or regenerate SDK services.

Keep reads and writes explicit: local search does not query the whole backend; writes are not automatically retried; refresh failure must not replay a committed write. The app owns SDK setup, authentication, connections, and permissions. Do not create connections, change schemas, modify production data, or deploy without separate authorization.

## 4. Verify and finish

Run the app's existing type/build checks and focused behavior tests for loading/errors, validation, create/update payloads, paging, and failed-save preservation. Exercise writes only with synthetic data or an explicitly authorized isolated backend. Authorized live reads are needed before claiming actual connector compatibility.

Inspect observed failures, correct their causes, and rerun failed/affected checks. Use an initial implementation and at most two corrective passes; stop earlier on success, missing access/input, or no viable new approach. Do not weaken checks to finish. Verify saved files and dependency/lockfile state, not just command submission.

Report the kit version/source, feature changes, actual checks, data mode, and remaining gaps concisely. Do not claim deployment, live compatibility, or measured token savings from synthetic checks alone.
