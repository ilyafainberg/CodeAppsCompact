# CodeAppsCompact kit maintenance

This directory is for maintainers. Consumers install the self-contained skill from [CodeAppsCompact](https://github.com/ilyafainberg/CodeAppsCompact), which already includes the built kit. They do not clone or build this directory.

The `codeappscompact` package exports `RecordScreen` and its TypeScript contracts. See [API.txt](API.txt) for the full behavior and [examples/App.tsx](examples/App.tsx) for configuration. [examples/main.tsx](examples/main.tsx) supplies the caller-owned query provider; [examples/service.ts](examples/service.ts) is synthetic. The package injects no styles, creates no query client, and performs no direct network requests.

## Develop

Use Node.js >=22.12.0; CI uses Node.js 24. From this directory:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run typecheck
npm test
npm run build:demo
npm run dev
```

The synthetic demo runs at Vite's loopback URL, uses in-memory data, makes no tenant requests, and resets on reload. These commands do not publish or deploy. `npm test` builds the library before comparing the checked-in skill archive to the current source. After intentional package changes, regenerate that archive with `npm run bundle:skill` before testing.

## Update the bundle

1. Update the package/lockfile, both marketplace catalogs, both plugin manifests, skill version, documentation filenames, and skill's `references\kit.json` together. Review supported installed versions instead of assuming compatibility. Keep npm publishing disabled (`private: true`).
2. Remove only the previous tracked kit archive when changing its version. Run `npm run bundle:skill`. It builds the library, packs the allowlisted consumer files into the skill's `assets` directory, and records their SHA-256 in `kit.json`. The component, declarations, API, example, README, and license all travel inside that archive; no separate kit release is needed.
3. Run type checking, tests, and the demo build. Review the archive and the git diff, including the generated manifest. Distribution tests compare the archive to the current build and documentation, verify its digest and metadata, and reject extra packaged files. They use the system `tar` command (available in current Windows and the Linux CI image).
4. Commit the complete skill bundle with its source. Package the entire skill directory into `codeappscompact-skill-<version>.zip`, with one top-level `codeappscompact` folder. Include `assets`, `references`, `SKILL.md`, and LICENSE. Exercise installation from that ZIP in an isolated consumer, including a clean lockfile restore without the original skill directory.
5. Publish the skill ZIP on a new GitHub release tag pointing to the reviewed commit. Do not replace an existing release's artifacts. Confirm the public ZIP matches the reviewed bundle. Marketplace installs receive the same checked-in assets; portable users need only the skill ZIP. No npm publishing, automatic updates, install hooks, telemetry, or tenant changes are involved.

The repository-root `marketplace.json` and `.claude-plugin\marketplace.json` represent the same catalog. The plugin has Agent Plugins 1.0 and legacy manifests. Keep both pairs synchronized.

## Consumer boundaries

The skill verifies and copies its local archive into the app's `vendor` directory, then uses the app's package manager. Retain that archive with the app's manifest and lockfile; do not reference the agent's installation directory. Ordinary React, TanStack React Query, and Power Apps SDK dependencies remain external. The package is not published to npm; a registry package with the same name is not evidence of this project's provenance.

Only flat string/number record drafts and read/create/update screens are supplied. Authentication, SDK setup, connections, permissions, schema, styling, query-provider ownership, and deployment belong to the app. Neither the example nor these tests establish live Power Apps-host or tenant compatibility. Version 0.1.2 changes packaging, not component behavior.

## Token evidence and limits

The earlier 0.1.0 pilot reported 78.6% fewer model-output tokens and 42.8% fewer total tokens across three paired authoring trials of one synthetic record-management feature. Input documentation was counted. This does not establish savings across all applications, against every existing framework, or for this bundled installation workflow. The reusable implementation is the saving mechanism, not the skill's wording; discovery and first-time dependency setup still have costs. No new token benchmark is claimed.

Private benchmark prompts, usage logs, and trial sources are not included. Licensed under the [MIT License](LICENSE).
