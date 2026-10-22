# Install or reuse the GitHub kit

Use this reference only when kit setup is needed. [kit.json](kit.json) pins the package name, release URL, version, SHA-256, and supported existing versions. The manifest travels with the skill, including in the standalone skill ZIP. Never substitute `main`, `latest`, a similarly named npm package, or an unreviewed fork.

## Reuse before downloading

1. Work in the intended app/package directory. Inspect its package manager, lockfile, Node version, existing dependencies, and installation scripts. Respect workspace boundaries and user edits.
2. Resolve `codeappscompact` using that project's package tooling and inspect the actual package version and provenance. A directory with the right name is not sufficient. A supported installed package with its API reference and working import needs no download or reinstall.
3. If the manifest/lockfile already declares the package but installation is missing, restore that locked dependency using the existing manager. Preserve pinned versions, local paths, and custom origins. If its archive is missing, recover the exact declared artifact or report the blocker; do not silently switch to this skill's current release.
4. An unsupported version, custom package, incompatible peer range, or mixed lockfiles needs a compatibility decision, not an automatic replacement. Keep the existing app working. Obtain approval only where the host or scope requires it; permission denial is final.

## Missing kit

1. Check the declared peer ranges and engine requirements before changing the app. The current kit needs Node.js >=22.12.0, React >=18.3.1 <20, TanStack React Query >=5.90.5 <6, and Power Apps SDK ^1.5.0. Preserve compatible versions already installed. Add missing peers through the app's package manager only within authorized dependency changes. GitHub hosts this kit; ordinary dependencies still need an available package source.
2. Choose a project-local archive path, normally `vendor\codeappscompact-0.1.1.tgz` on Windows. Do not overwrite an existing file. A matching cached archive can be reused after verifying its hash; a mismatch must stop with an explicit integrity error.
3. Download the exact HTTPS URL from `kit.json` using an authorized host tool into a new temporary file. Follow GitHub's normal asset redirects, but do not disable certificate validation or transmit project data. Hash the downloaded bytes with SHA-256 and compare with the manifest's full digest before extraction, installation, or execution. On mismatch or denial, stop; never accept a new hash merely to finish. After verification, move the file to the chosen archive path without overwriting another file.
4. Inspect archive paths and the packaged manifest before installing. Expected files are `package.json`, `dist`, `API.txt`, `examples`, README, and LICENSE under the archive's `package` directory. Reject traversal/absolute paths, links escaping that directory, unexpected executable hooks, or content inconsistent with this kit. The package's `private: true` blocks publishing, not local installation. Its `prepack` build command is for maintainers; consumers receive prebuilt JavaScript and types.
5. Install the verified local archive with the existing manager, keeping lifecycle scripts disabled where supported. For npm in PowerShell, from the app directory:

   ```powershell
   npm install --save-exact --ignore-scripts --no-audit --no-fund ".\vendor\codeappscompact-0.1.1.tgz"
   ```

   For another manager, use its documented local-tarball and script-control options; do not introduce a second lockfile. Inspect any necessary dependency scripts before explicitly authorizing them. Never use `--force`, bypass peer constraints, or enable scripts globally to conceal a failure.
6. Verify that `codeappscompact` resolves from the app, its version and `API.txt` match the intended release, and its `RecordScreen` export loads with the installed peers. Check the manifest and lockfile point to the verified project-relative archive, not a temporary absolute path. Keep the archive, manifest, and lockfile together in the consuming repository; account for any existing archive ignore rules explicitly. This makes clean-checkout restoration possible. Remove only temporary files created by this download.

Read the installed API contract, then continue the skill's implementation and checks. No global package, npm account, new MCP server, or source build of the kit is required. If GitHub, dependencies, checksum verification, or installation is unavailable, report the exact blocked stage and request the smallest authorized substitute; do not claim the kit is installed.

## Updates

Keep existing supported installations by default. A new skill release is not authorization to update every app. For an approved upgrade, review the new version's manifest and API, preserve local work and the prior lockfile, install the separately verified archive, and rerun affected checks. Never replace a release artifact in place.
