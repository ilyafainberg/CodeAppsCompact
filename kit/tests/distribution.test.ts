// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
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
const packed = (path: string) => execFileSync('tar', ['-xOf', archive, `package/${path}`], { encoding: 'utf8' });
const normalize = (text: string) => text.replace(/\r\n/g, '\n');

function checkLocalLinks(path: string, boundary?: string): void {
  for (const match of read(path).matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
    const resolved = resolve(dirname(path), target);
    expect(existsSync(resolved), `${path}: ${target}`).toBe(true);
    if (boundary) expect(relative(boundary, resolved)).not.toMatch(/^\.\./);
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
      '$schema', 'author', 'description', 'homepage', 'keywords', 'license', 'name', 'repository', 'version',
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
    checkLocalLinks(resolve(skillRoot, 'SKILL.md'), skillRoot);
    checkLocalLinks(resolve(skillRoot, 'references', 'install.md'), skillRoot);
    checkLocalLinks(resolve(root, 'README.md'));
    checkLocalLinks(resolve(kitRoot, 'README.md'));
  });

  it('ships one local archive with a matching digest, not a separate download URL', () => {
    expect(kit.name).toBe(pkg.name);
    expect(kit.version).toBe(pkg.version);
    expect(kit.compatibleInstalledVersions).toEqual(['0.1.0', '0.1.1', pkg.version]);
    expect(kit.url).toBeUndefined();
    expect(kit.archive).toBe(`assets/${pkg.name}-${pkg.version}.tgz`);
    expect(readdirSync(resolve(skillRoot, 'assets'))).toEqual([`${pkg.name}-${pkg.version}.tgz`]);
    expect(kit.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(createHash('sha256').update(readFileSync(archive)).digest('hex')).toBe(kit.sha256);
  });

  it('includes every consumer asset and excludes maintainer files', () => {
    const expected = [
      'API.txt', 'LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js',
      'examples/App.tsx', 'examples/main.tsx', 'examples/service.ts', 'examples/style.css', 'package.json',
    ];
    const entries = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split(/\r?\n/).sort();
    expect(entries).toEqual(expected.map(path => `package/${path}`).sort());
    expect(JSON.parse(packed('package.json'))).toEqual(pkg);
    for (const path of expected.filter(path => path !== 'package.json')) {
      expect(normalize(packed(path)), path).toBe(normalize(read(resolve(kitRoot, path))));
    }
  });

  it('includes the same MIT license in repository, kit, and skill', () => {
    const license = normalize(read(resolve(root, 'LICENSE')));
    expect(normalize(read(resolve(kitRoot, 'LICENSE')))).toBe(license);
    expect(normalize(read(resolve(skillRoot, 'LICENSE')))).toBe(license);
    expect(normalize(packed('LICENSE'))).toBe(license);
  });
});
