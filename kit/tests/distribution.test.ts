// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const kitRoot = resolve(import.meta.dirname, '..');
const root = resolve(kitRoot, '..');
const pluginRoot = resolve(root, 'plugins', 'codeappscompact');
const skillRoot = resolve(pluginRoot, 'skills', 'codeappscompact');
const read = (path: string) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read(resolve(kitRoot, 'package.json')));
const catalog = JSON.parse(read(resolve(root, 'marketplace.json')));
const plugin = JSON.parse(read(resolve(pluginRoot, 'plugin.json')));
const kit = JSON.parse(read(resolve(skillRoot, 'references', 'kit.json')));
const skill = read(resolve(skillRoot, 'SKILL.md'));
const archive = resolve(skillRoot, kit.archive);
const entries: { name: string; content: string; attributes: number }[] = JSON.parse(execFileSync('pwsh', [
  '-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `
    $ErrorActionPreference = 'Stop'
    $zip = [IO.Compression.ZipFile]::OpenRead($env:CODEAPPSCOMPACT_ARCHIVE)
    try {
      @($zip.Entries | ForEach-Object {
        $reader = [IO.StreamReader]::new($_.Open())
        try {
          [pscustomobject]@{ name = $_.FullName; content = $reader.ReadToEnd(); attributes = $_.ExternalAttributes }
        }
        finally { $reader.Dispose() }
      }) | ConvertTo-Json -Compress
    }
    finally { $zip.Dispose() }
  `,
], { encoding: 'utf8', env: { ...process.env, CODEAPPSCOMPACT_ARCHIVE: archive } }));
const packed = (path: string) => {
  const entry = entries.find(item => item.name === `package/${path}`);
  if (!entry) throw new Error(`Missing bundled file: ${path}`);
  return entry.content;
};
const normalize = (text: string) => text.replace(/\r\n/g, '\n');

function checkLocalLinks(path: string, boundary?: string): void {
  for (const match of read(path).matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (target.startsWith('#')) continue;
    if (/^[a-z][a-z\d+.-]*:/i.test(target)) {
      expect(boundary, `${path}: external link ${target}`).toBeUndefined();
      continue;
    }
    expect(isAbsolute(target), `${path}: absolute link ${target}`).toBe(false);
    const resolved = resolve(dirname(path), target);
    expect(existsSync(resolved), `${path}: ${target}`).toBe(true);
    if (boundary) {
      const local = relative(boundary, resolved);
      expect(local).not.toMatch(/^\.\.(?:[\\/]|$)/);
      expect(isAbsolute(local)).toBe(false);
    }
  }
}

describe('self-contained skill distribution', () => {
  it('keeps npm publication disabled and package metadata synchronized', () => {
    const lock = JSON.parse(read(resolve(kitRoot, 'package-lock.json')));
    expect(pkg.name).toBe('codeappscompact');
    expect(pkg.private).toBe(true);
    expect(pkg.publishConfig).toBeUndefined();
    expect(pkg.license).toBe('MIT');
    expect(lock.version).toBe(pkg.version);
    expect(lock.packages[''].version).toBe(pkg.version);
    expect(pkg.files).toEqual(['dist', 'API.txt', 'examples']);
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
      expect(pkg.scripts[hook]).toBeUndefined();
    }
  });

  it('exposes one real plugin through matching marketplace catalogs', () => {
    const compatibility = JSON.parse(read(resolve(root, '.claude-plugin', 'marketplace.json')));
    expect(compatibility).toEqual(catalog);
    expect(catalog.name).toBe('codeappscompact');
    expect(catalog.plugins).toHaveLength(1);
    expect(catalog.plugins[0].name).toBe(plugin.name);
    expect(catalog.plugins[0].version).toBe(pkg.version);
    expect(catalog.plugins[0].repository).toBeUndefined();
    expect(resolve(root, catalog.plugins[0].source)).toBe(pluginRoot);
  });

  it('keeps portable and legacy plugin identities equal without executable components', () => {
    const legacy = JSON.parse(read(resolve(pluginRoot, '.claude-plugin', 'plugin.json')));
    const { $schema, ...metadata } = plugin;
    expect($schema).toBe('https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    expect(legacy).toEqual(metadata);
    expect(plugin.name).toBe('codeappscompact');
    expect(plugin.version).toBe(pkg.version);
    expect(Object.keys(plugin).sort()).toEqual([
      '$schema', 'author', 'description', 'keywords', 'license', 'name', 'version',
    ].sort());
    expect(readdirSync(pluginRoot).sort()).toEqual(['.claude-plugin', 'plugin.json', 'skills']);
    expect(readdirSync(resolve(pluginRoot, 'skills'))).toEqual(['codeappscompact']);
  });

  it('keeps skill links inside its portable folder and repository links valid', () => {
    const frontmatter = skill.split(/^---\s*$/m)[1];
    expect(frontmatter).toBeDefined();
    expect(frontmatter).toMatch(/^name: codeappscompact$/m);
    expect(frontmatter).toMatch(/^description: .+Power Platform Code Apps/m);
    expect(frontmatter).toContain(`version: "${pkg.version}"`);
    expect(frontmatter).not.toMatch(/^(allowed-tools|model):/m);
    expect(frontmatter).not.toMatch(/\b(repository|homepage):/);
    checkLocalLinks(resolve(skillRoot, 'SKILL.md'), skillRoot);
    checkLocalLinks(resolve(skillRoot, 'references', 'install.md'), skillRoot);
    checkLocalLinks(resolve(root, 'README.md'));
    checkLocalLinks(resolve(kitRoot, 'README.md'), kitRoot);
  });

  it('ships one real ZIP with a matching digest, not a separate download URL', () => {
    expect(kit.name).toBe(pkg.name);
    expect(kit.version).toBe(pkg.version);
    expect(kit.compatibleInstalledVersions).toEqual(['0.1.0', '0.1.1', '0.1.2', '0.1.3', '0.1.4', pkg.version]);
    expect(kit.url).toBeUndefined();
    expect(kit.archive).toBe(`assets/${pkg.name}-${pkg.version}.zip`);
    expect(readdirSync(resolve(skillRoot, 'assets'))).toEqual([`${pkg.name}-${pkg.version}.zip`]);
    const bytes = readFileSync(archive);
    expect([...bytes.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(kit.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(kit.sha256);
  });

  it('exposes the matching API as a plain skill reference before installation', () => {
    const reference = read(resolve(skillRoot, 'references', 'API.txt'));
    expect(skill).toContain('[bundled API reference](references/API.txt)');
    expect(normalize(reference)).toBe(normalize(packed('API.txt')));
    expect(normalize(reference)).toBe(normalize(read(resolve(kitRoot, 'API.txt'))));
  });

  it('includes every consumer asset and excludes maintainer files and links', () => {
    const expected = [
      'API.txt', 'LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js',
      'examples/App.tsx', 'examples/main.tsx', 'examples/service.ts', 'examples/style.css', 'package.json',
    ];
    expect(entries.map(entry => entry.name).sort()).toEqual(expected.map(path => `package/${path}`).sort());
    for (const entry of entries) expect((entry.attributes >>> 16) & 0o170000).not.toBe(0o120000);
    for (const path of expected.filter(path => path !== 'package.json')) {
      expect(normalize(packed(path)), path).toBe(normalize(read(resolve(kitRoot, path))));
    }
  });

  it('ships only runtime package metadata, not development scripts or origin information', () => {
    const consumer = JSON.parse(packed('package.json'));
    const fields = [
      'name', 'version', 'description', 'license', 'type', 'main', 'types', 'exports',
      'files', 'sideEffects', 'engines', 'peerDependencies', 'private',
    ];
    expect(Object.keys(consumer).sort()).toEqual(fields.sort());
    for (const key of fields) expect(consumer[key], key).toEqual(pkg[key]);
    expect(packed('README.md')).not.toMatch(/npm (ci|run (build|test|dev))|bundle-skill|marketplace\.json/);
  });

  it('contains no external URLs, original workspace paths, or repository identifiers', () => {
    expect(readdirSync(skillRoot).sort()).toEqual(['LICENSE', 'SKILL.md', 'assets', 'references']);
    expect(readdirSync(resolve(skillRoot, 'references')).sort()).toEqual(['API.txt', 'install.md', 'kit.json']);
    const portableText = [
      { name: 'SKILL.md', content: skill },
      { name: 'LICENSE', content: read(resolve(skillRoot, 'LICENSE')) },
      { name: 'references/API.txt', content: read(resolve(skillRoot, 'references', 'API.txt')) },
      { name: 'references/kit.json', content: JSON.stringify(kit) },
      { name: 'references/install.md', content: read(resolve(skillRoot, 'references', 'install.md')) },
      ...entries,
    ];
    for (const { name, content } of portableText) {
      expect(content, name).not.toMatch(/https?:\/\/|git\+|github:|\b(?:ilyafainberg|codeapps-records|CopilotWorkspace)\b|[a-z]:[\\/]/i);
    }
  });

  it('reads the API before extraction from a relocated skill and retains the extracted package', () => {
    const temporary = mkdtempSync(resolve(tmpdir(), 'codeappscompact portable '));
    const copiedSkill = resolve(temporary, 'unrelated folder', 'copied skill');
    const destination = resolve(temporary, 'consumer app', 'vendor', `codeappscompact-${pkg.version}`);
    try {
      cpSync(skillRoot, copiedSkill, { recursive: true, errorOnExist: true });
      const manifest = JSON.parse(read(resolve(copiedSkill, 'references', 'kit.json')));
      const copiedArchive = resolve(copiedSkill, manifest.archive);
      expect(createHash('sha256').update(readFileSync(copiedArchive)).digest('hex')).toBe(manifest.sha256);
      checkLocalLinks(resolve(copiedSkill, 'SKILL.md'), copiedSkill);
      checkLocalLinks(resolve(copiedSkill, 'references', 'install.md'), copiedSkill);
      expect(existsSync(destination)).toBe(false);
      expect(normalize(read(resolve(copiedSkill, 'references', 'API.txt')))).toBe(normalize(packed('API.txt')));
      execFileSync('pwsh', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', `
        $ErrorActionPreference = 'Stop'
        Expand-Archive -LiteralPath $env:CODEAPPSCOMPACT_ARCHIVE -DestinationPath $env:CODEAPPSCOMPACT_DESTINATION
      `], {
        cwd: temporary,
        env: { ...process.env, CODEAPPSCOMPACT_ARCHIVE: copiedArchive, CODEAPPSCOMPACT_DESTINATION: destination },
      });
      rmSync(copiedSkill, { recursive: true });
      expect(existsSync(copiedSkill)).toBe(false);
      for (const entry of entries) {
        expect(normalize(read(resolve(destination, entry.name))), entry.name).toBe(normalize(entry.content));
      }
      const packageRoot = resolve(destination, 'package');
      checkLocalLinks(resolve(packageRoot, 'README.md'), packageRoot);
      const consumer = JSON.parse(read(resolve(packageRoot, 'package.json')));
      expect(existsSync(resolve(packageRoot, consumer.exports['.'].import))).toBe(true);
      expect(existsSync(resolve(packageRoot, consumer.exports['.'].types))).toBe(true);
    } finally {
      rmSync(temporary, { recursive: true });
    }
  }, 15000);

  it('documents ZIP extraction, copy installation, and matching clean-restore options', () => {
    const instructions = read(resolve(skillRoot, 'references', 'install.md'));
    expect(instructions).toContain('[API reference](API.txt)');
    expect(instructions).toContain(`vendor\\codeappscompact-${pkg.version}\\package\\API.txt`);
    expect(instructions).toContain('Expand-Archive');
    expect(instructions).toContain(`".\\vendor\\codeappscompact-${pkg.version}\\package"`);
    expect(instructions).toContain('npm install --save-exact --install-links --ignore-scripts');
    expect(instructions).toContain('npm ci --install-links --ignore-scripts');
    expect(instructions).toContain('local-directory');
    expect(instructions).not.toMatch(/npm install[^\r\n]*\.zip/);
    expect(instructions).not.toMatch(/\.tgz|tarball/);
  });

  it('includes the same MIT license in repository, kit, and skill', () => {
    const license = normalize(read(resolve(root, 'LICENSE')));
    expect(normalize(read(resolve(kitRoot, 'LICENSE')))).toBe(license);
    expect(normalize(read(resolve(skillRoot, 'LICENSE')))).toBe(license);
    expect(normalize(packed('LICENSE'))).toBe(license);
  });
});
