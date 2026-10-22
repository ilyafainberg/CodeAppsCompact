# Install the bundled ZIP

[kit.json](kit.json) identifies the included [kit ZIP](../assets/codeappscompact-0.1.3.zip), version, SHA-256, and supported installed versions. Resolve its `archive` path relative to the installed skill directory. All CodeAppsCompact assets are present locally; do not fetch a separate kit or query the npm registry for `codeappscompact`.

## Reuse first

Work in the intended app/package directory. Inspect its package manager, lockfile, dependencies, and scripts. Preserve workspace boundaries and user edits.

Resolve `codeappscompact` with that project's tooling and inspect its actual version, provenance, and `API.txt`. Reuse a supported working installation without an update check. If already declared but not restored, use its existing lockfile and package manager. A missing locked artifact, unsupported version, custom origin, incompatible peers, or mixed lockfiles needs an explicit decision, not an automatic replacement with the bundle. A new skill version does not authorize an app upgrade.

## Install when absent

1. Obtain any required host approval. The kit requires Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0. Preserve compatible installed peers. Add missing peers only within authorized dependency changes using the app's package manager. They are not vendored with the skill and may require the configured registry.
2. Locate the ZIP inside this skill and compare its SHA-256 to the full digest in `kit.json` before extraction, installation, or execution. If missing, mismatched, or inaccessible, stop with an explicit error and request reinstallation of the complete skill. Do not accept a new hash, download a substitute, or rebuild the component.
3. Inspect ZIP paths and its package manifest. Expected files under `package` are `package.json`, `dist`, `API.txt`, `examples`, README, and LICENSE. Reject absolute/traversal paths, duplicate or case-colliding paths, escaping links, unexpected executable hooks, or inconsistent package identity. The ZIP is prebuilt; `private: true` prevents publishing, not local installation. Its build/test/bundle scripts are for maintainers, not install hooks.
4. Extract into a new project-local directory, normally `vendor\codeappscompact-0.1.3` on Windows. Do not overwrite existing files: reuse an existing directory only after comparing its complete file list and bytes against the verified ZIP; otherwise stop. Verify the extracted files too. Do not depend directly on an absolute path into an agent's skill installation, which may move or be removed.
5. Install the extracted `package` directory with the existing package manager and lifecycle scripts disabled. **npm does not install ZIP files directly.** Use npm's `--install-links` copy mode to avoid symlinks and installing the kit's maintainer development dependencies. If this conflicts with the app's existing local/workspace dependency policy, stop for a decision rather than silently changing project-wide settings. In PowerShell, from the app directory, with `$archive` set to the verified ZIP's absolute path:

   ```powershell
   $destination = ".\vendor\codeappscompact-0.1.3"
   if (Test-Path -LiteralPath $destination) { throw "Destination already exists; inspect before reuse." }
   Expand-Archive -LiteralPath $archive -DestinationPath $destination
   npm install --save-exact --install-links --ignore-scripts --no-audit --no-fund ".\vendor\codeappscompact-0.1.3\package"
   ```

   Use an available safe ZIP extractor and equivalent local-directory/script-control options for another platform or package manager; do not add a second lockfile. Inspect any necessary dependency scripts before explicitly authorizing them. Never use `--force`, bypass peer constraints, or enable scripts globally to conceal a failure.
6. Confirm the app resolves the intended package and version, its `API.txt` is available, and `RecordScreen` imports with the installed peers. The manifest and lockfile must point to the project-relative extracted directory, not the ZIP, skill directory, or a temporary path. Keep the **entire extracted directory**, manifest, and lockfile together in the app repository; retaining only the ZIP is not enough. Account for ignore rules such as `dist/`: add narrowly scoped exceptions if needed, and confirm the vendored JavaScript and declarations are actually tracked. Preserve the same install mode for later restores and CI; for npm, use `npm ci --install-links --ignore-scripts --no-audit --no-fund`. Confirm a clean checkout can restore without the original skill installation.

Read the installed API contract and continue the skill. No global install, npm account, MCP server, kit source checkout, or kit download is needed. Report the exact blocked stage if dependencies or installation are unavailable. Tool permission decisions are authoritative; do not bypass registry, TLS, tenant, or filesystem restrictions.
