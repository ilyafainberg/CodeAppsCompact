# CodeAppsCompact

Experimental React/TypeScript record screens for Power Platform Code Apps. Configure fields, columns, validation, and a service adapter instead of repeatedly implementing list/editor state management.

**Status:** version 0.1.0, experimental and MIT-licensed. Live Power Apps-host and tenant compatibility remain unverified. npm publication is pending; use the local package workflow below until the registry release is available.

## What it does

`RecordScreen` provides a record table, local search over loaded records, cursor-based pagination and deduplication, accessible create/edit forms, primitive field validation, and explicit read/write errors. Failed writes preserve the form; writes are not automatically retried. A failed refresh after a successful save does not replay the write.

The app supplies a `DataService<R, D>` with `getAll`, `create`, and `update` returning the Power Apps SDK's `IOperationResult<T>`, plus app-specific mappings. The component requires a caller-owned `QueryClientProvider`.

Supported drafts are flat objects with widened `string` and `number` values. There is no delete, relationship editor, upload support, nested draft schema, or cross-system transaction support. Authentication, SDK initialization, connection configuration, permissions, and deployment remain the host app's responsibility. Actual generated connector signatures must be inspected and adapted; do not assume they match the synthetic service.

## Develop and run the synthetic example

Use Node.js 22.12 or newer; CI uses Node.js 24. The lockfile pins the development dependencies, including React 18 and Power Apps SDK 1.5.0.

```powershell
git clone https://github.com/ilyafainberg/CodeAppsCompact.git
cd CodeAppsCompact
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build
npm run dev
```

Open the local URL printed by Vite. The example uses in-memory synthetic service-request data: it makes no tenant requests, stores no credentials, and resets on reload. `npm run build:demo` creates a local demo build; it does not publish or deploy a Code App.

## Use the package locally

From this repository:

```powershell
npm pack
```

The prepack script builds the JavaScript and declarations. The archive is `codeappscompact-0.1.0.tgz`. From a consuming Code App, install the archive using its actual local path, for example:

```powershell
npm install --save-exact "C:\path\to\CodeAppsCompact\codeappscompact-0.1.0.tgz"
```

The required peers are React, TanStack React Query, and the Power Apps SDK; their supported ranges are in `package.json`. Then import `RecordScreen` and the public types from `codeappscompact`. The library does not inject styles or create a query client. Use the host application's styling and query provider, and adapt its generated services to the documented service contract.

`examples/App.tsx` is a complete configured screen; `examples/main.tsx` demonstrates the query provider, and `examples/service.ts` is the synthetic adapter used by the example and tests. Its strings, including the priority draft field, intentionally use widened primitive types; the select field configuration constrains accepted values.

## API and agent workflow

Read [API.txt](API.txt) for the full version-matched contract. An agent should inspect the existing app and generated services, read that reference, and write only the fields, columns, mappings, and integration that are specific to the requested feature. Keep errors visible, preserve the stated paging/search semantics, and run the app's own checks. Do not create connections, change tenant data, or publish without authorization.

The reusable implementation is the token-saving mechanism. A dedicated portable agent skill is not included yet. This repository does not ship benchmark prompts, usage logs, or trial source. The original pilot artifacts are kept separately; synthetic tests do not establish live-tenant compatibility or savings across all Code Apps.

## Repository layout

- `src/index.tsx`: the original 0.1.0 library implementation.
- `API.txt`: complete public API and behavior contract.
- `examples/`: synthetic request-management screen and service.
- `tests/`: behavior checks and a separate inventory-schema example.
- `.github/workflows/ci.yml`: type checking, tests, library/demo builds, and package-content preview. No deployment or npm publishing.

Build outputs, dependencies, archives, environment files, and npm configuration are ignored by Git. The npm file allowlist includes `dist` and `API.txt`; npm also includes its standard package metadata, README, and LICENSE.

## Release and licensing status

Licensed under the [MIT License](LICENSE), copyright 2026 Ilya Fainberg.

The npm package name is `codeappscompact` (lowercase, as required by npm). Release metadata permits public publication to `https://registry.npmjs.org/` and defaults to the experimental `next` tag rather than `latest`. This configuration does not publish the package by itself.

Before publishing, confirm registry connectivity, npm sign-in, and name/version availability; run the repository checks and review `npm pack --dry-run`. An authorized release uses:

```powershell
npm publish --access public --tag next --registry=https://registry.npmjs.org/
```

Do not describe the npm release as available until its registry metadata has been verified.
