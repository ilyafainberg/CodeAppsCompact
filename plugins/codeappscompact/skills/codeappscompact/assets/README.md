# CodeAppsCompact

A prebuilt React/TypeScript record-screen package included in the complete CodeAppsCompact skill. Runtime code, types, API contract, synthetic examples, and license are plain files; no source checkout or build is needed.

## Use

Reuse a working installation first. Otherwise follow `SKILL.md` and its setup helper to copy this package into the app and install the local directory. The helper supports standalone npm apps and reuses identical copies; other package managers and workspaces keep their own approved integration workflow. Keep the entire copied package with the app's manifest and lockfile, not a dependency on the skill's original location. `private: true` prevents registry publication, not local installation.

Read the quick authoring contract at the start of [API.txt](API.txt). Configure the screen and use the app's generated service directly when its types and behavior fit; write an adapter only for mismatches. The detailed contract and type declarations resolve edge cases.

The [screen example](examples/App.tsx), [query provider](examples/main.tsx), [synthetic service](examples/service.ts), and [styles](examples/style.css) are optional references, not a standalone app or live integration. The kit injects no styles, creates no query client, and performs no direct network requests.

## Prerequisites and boundaries

Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0 belong to the consuming app. They are not bundled; installation may require its configured registry and authorization.

Supports lists, search over loaded records, cursor paging, create/edit/cancel, flat string/number drafts, validation, and visible read/write errors. Failed saves preserve inputs; writes are not automatically retried. Refresh failures never replay committed writes.

Delete, relationships, uploads, nested drafts, backend-wide search, and cross-system transactions are not supplied. The app owns styling, its query provider, generated services, authentication, connections, permissions, and deployment. Live Power Apps-host and tenant compatibility remain unverified.

Licensed under the [MIT License](LICENSE).
