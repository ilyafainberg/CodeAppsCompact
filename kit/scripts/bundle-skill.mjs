import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const kitRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillRoot = resolve(kitRoot, '..', 'plugins', 'codeappscompact', 'skills', 'codeappscompact');
const pkg = JSON.parse(readFileSync(resolve(kitRoot, 'package.json'), 'utf8'));
const manifestPath = resolve(skillRoot, 'references', 'kit.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const filename = `${pkg.name}-${pkg.version}.tgz`;
const archive = `assets/${filename}`;
const assets = resolve(skillRoot, 'assets');
const npmCli = process.env.npm_execpath;

if (!npmCli) throw new Error('Run this script with npm run bundle:skill.');
if (pkg.name !== 'codeappscompact' || pkg.private !== true) {
  throw new Error('Expected the private codeappscompact package; npm publication must remain disabled.');
}
if (manifest.name !== pkg.name || manifest.version !== pkg.version || manifest.archive !== archive
    || !manifest.compatibleInstalledVersions.includes(pkg.version)) {
  throw new Error('Update kit.json identity, local archive path, and reviewed compatibility before bundling.');
}
mkdirSync(assets, { recursive: true });
if (readdirSync(assets).some(name => name !== filename)) {
  throw new Error('Remove the previous tracked kit archive explicitly; assets must contain only the current kit.');
}

const result = JSON.parse(execFileSync(process.execPath, [
  npmCli, 'pack', '--ignore-scripts', '--json', '--pack-destination', assets,
], { cwd: kitRoot, encoding: 'utf8' }));
if (result.length !== 1 || result[0].filename !== filename) {
  throw new Error('npm pack did not produce the expected kit archive.');
}
manifest.sha256 = createHash('sha256').update(readFileSync(resolve(assets, filename))).digest('hex');
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Bundled ${filename} (${result[0].size} bytes); updated kit.json SHA-256.`);
