# Install the bundled ZIP

[kit.json](kit.json) identifies the included [kit ZIP](../assets/codeappscompact-0.1.5.zip), version, SHA-256, and supported installed versions. Resolve its `archive` path relative to the folder containing `SKILL.md`, wherever that folder is installed. All CodeAppsCompact assets travel with that folder; no original checkout, marketplace metadata, remote location, or package-registry lookup is required. Do not fetch a separate kit.

The bundled [API reference](API.txt) is a plain file at `references\API.txt`, relative to `SKILL.md`. Read it without extracting or installing anything. It describes the bundled kit version; a different installed version must use its own package-root `API.txt`.

## Reuse first

Work in the intended app/package directory. Inspect its package manager, lockfile, dependencies, and scripts. Preserve workspace boundaries and user edits.

Resolve `codeappscompact` with that project's tooling and inspect its actual version, declared dependency path, and package-root `API.txt`. Reuse a supported working installation without an update check. If already declared but not restored, use its existing lockfile and package manager. A missing locked artifact, unsupported version, custom origin, incompatible peers, or mixed lockfiles needs an explicit decision, not an automatic replacement with the bundle. A new skill version does not authorize an app upgrade.

## Install when absent

1. Obtain any required host approval. The kit requires Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0. Preserve compatible installed peers. Add missing peers only within authorized dependency changes using the app's package manager. They are not vendored with the skill and may require the configured registry.
2. Locate the ZIP inside this skill and compare its SHA-256 to the full digest in `kit.json` before extraction, installation, or execution. If missing, mismatched, or inaccessible, stop with an explicit error and request the complete skill folder from the user or host. Do not accept a new hash, download a substitute, or rebuild the component.
3. Inspect ZIP paths and its package manifest. Expected files under `package` are `package.json`, `dist`, `API.txt`, `examples`, README, and LICENSE. Reject absolute/traversal paths, duplicate or case-colliding paths, escaping links, or inconsistent package identity. The consumer manifest contains runtime metadata and peer requirements only: no scripts, development dependencies, or hosting metadata. The ZIP is prebuilt; `private: true` prevents publishing, not local installation.
4. Extract into a new project-local directory, normally `vendor\codeappscompact-0.1.5` on Windows. Do not overwrite existing files: reuse an existing directory only after comparing its complete file list and bytes against the verified ZIP; otherwise stop. Verify the extracted files too. The extracted API reference is `vendor\codeappscompact-0.1.5\package\API.txt`, not a file at the skill root. Do not depend directly on an absolute path into an agent's skill installation, which may move or be removed.
5. Install the extracted `package` directory with the existing package manager and lifecycle scripts disabled. **npm does not install ZIP files directly.** Use npm's `--install-links` copy mode so the installed kit is not a symlink. If this conflicts with the app's existing local/workspace dependency policy, stop for a decision rather than silently changing project-wide settings. In PowerShell, from the app directory, with `$archive` set to the verified ZIP's absolute path:

   ```powershell
   $destination = ".\vendor\codeappscompact-0.1.5"
   if (Test-Path -LiteralPath $destination) { throw "Destination already exists; inspect before reuse." }
   Expand-Archive -LiteralPath $archive -DestinationPath $destination
   npm install --save-exact --install-links --ignore-scripts --no-audit --no-fund ".\vendor\codeappscompact-0.1.5\package"
   ```

   Use an available safe ZIP extractor and equivalent local-directory/script-control options for another platform or package manager; do not add a second lockfile. Inspect any necessary dependency scripts before explicitly authorizing them. Never use `--force`, bypass peer constraints, or enable scripts globally to conceal a failure.
6. Confirm the app resolves the intended package and version, its package-root `API.txt` is available, and `RecordScreen` imports with the installed peers. The manifest and lockfile must point to the project-relative extracted directory, not the ZIP, skill directory, or a temporary path. Keep the **entire extracted directory**, manifest, and lockfile together with the app; retaining only the ZIP is not enough. Account for ignore rules such as `dist/`: add narrowly scoped exceptions if needed, and confirm the vendored JavaScript and declarations are actually retained. Preserve the same install mode for later restores and CI; for npm, use `npm ci --install-links --ignore-scripts --no-audit --no-fund`. Confirm a clean copy of the app can restore without the original skill installation.

Read the version-matched API contract and continue the skill. No global install, npm account, MCP server, kit source checkout, or kit download is needed. Report the exact blocked stage if dependencies or installation are unavailable. Tool permission decisions are authoritative; do not bypass registry, TLS, tenant, or filesystem restrictions.
