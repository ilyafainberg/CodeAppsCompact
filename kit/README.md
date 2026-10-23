# CodeAppsCompact

A prebuilt React/TypeScript record-screen kit, included in the complete CodeAppsCompact skill. This package contains its runtime code, types, API contract, synthetic example, and license. No source checkout or build is needed.

## Use

Follow the installation steps in `SKILL.md` to copy this entire package from the skill's `assets` folder into your app and install that local directory with the app's existing package manager. Keep the complete copied package with the app's dependency manifest and lockfile; do not depend on the skill's original location. The package is private to prevent registry publication, not local installation.

Read [API.txt](API.txt) for the `RecordScreen` contract. Configure fields, columns, defaults, validation, record identity, and a typed adapter over the app's existing generated services instead of regenerating the screen.

The [screen example](examples/App.tsx), [query-provider setup](examples/main.tsx), [synthetic service](examples/service.ts), and [example styles](examples/style.css) are optional local references, not a standalone app or live connector integration. The kit injects no styles, creates no query client, and performs no direct network requests.

## App prerequisites

Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0. These ordinary peer dependencies belong to the consuming app and are not bundled. Their installation may require the app's configured registry.

## Boundaries

Supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, validation, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. A failed refresh never replays a committed write.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. The app owns styling, its query provider, generated services, authentication, connections, permissions, and deployment. Live Power Apps-host and tenant compatibility remain unverified.

Licensed under the [MIT License](LICENSE).
