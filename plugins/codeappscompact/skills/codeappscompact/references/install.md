# Install the bundled kit

[kit.json](kit.json) identifies the included [kit archive](../assets/codeappscompact-0.1.2.tgz), version, SHA-256, and supported installed versions. Resolve its `archive` path relative to the installed skill directory. All CodeAppsCompact assets are present locally; do not fetch a separate kit or query the npm registry for `codeappscompact`.

## Reuse first

Work in the intended app/package directory. Inspect its package manager, lockfile, dependencies, and scripts. Preserve workspace boundaries and user edits.

Resolve `codeappscompact` with that project's tooling and inspect its actual version, provenance, and `API.txt`. Reuse a supported working installation without an update check. If already declared but not restored, use its existing lockfile and package manager. A missing locked artifact, unsupported version, custom origin, incompatible peers, or mixed lockfiles needs an explicit decision, not an automatic replacement with the bundle. A new skill version does not authorize an app upgrade.

## Install when absent

1. Obtain any required host approval. The kit requires Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0. Preserve compatible installed peers. Add missing peers only within authorized dependency changes using the app's package manager. They are not vendored with the skill and may require the configured registry.
2. Locate the archive inside this skill and compare its SHA-256 to the full digest in `kit.json` before extraction, installation, or execution. If missing, mismatched, or inaccessible, stop with an explicit error and request reinstallation of the complete skill. Do not accept a new hash, download a substitute, or rebuild the component.
3. Inspect archive paths and its package manifest. Expected contents under `package` are `package.json`, `dist`, `API.txt`, `examples`, README, and LICENSE. Reject absolute/traversal paths, escaping links, unexpected executable hooks, or inconsistent package identity. The archive is prebuilt; `private: true` prevents publishing, not local installation. Its build/test/pack scripts are for maintainers, not install hooks.
4. Copy the verified archive to the app, normally `vendor\codeappscompact-0.1.2.tgz` on Windows. Do not overwrite an existing file: reuse it only if its hash matches, otherwise stop. Verify the copied bytes too. Do not depend directly on an absolute path into an agent's skill installation, which may move or be removed.
5. Install the project-local archive with the existing package manager and lifecycle scripts disabled. For npm in PowerShell, from the app directory:

   ```powershell
   npm install --save-exact --ignore-scripts --no-audit --no-fund ".\vendor\codeappscompact-0.1.2.tgz"
   ```

   Use the equivalent local-tarball and script-control options for another manager; do not add a second lockfile. Inspect any necessary dependency scripts before explicitly authorizing them. Never use `--force`, bypass peer constraints, or enable scripts globally to conceal a failure.
6. Confirm the app resolves the intended package and version, its `API.txt` is available, and `RecordScreen` imports with the installed peers. The manifest and lockfile must point to the project-relative vendored archive, not the skill directory or a temporary path. Keep that archive, manifest, and lockfile together in the app repository, accounting explicitly for archive ignore rules. A clean checkout must be able to restore them.

Read the installed API contract and continue the skill. No global install, npm account, MCP server, kit source checkout, or kit download is needed. Report the exact blocked stage if dependencies or installation are unavailable. Tool permission decisions are authoritative; do not bypass registry, TLS, tenant, or filesystem restrictions.
