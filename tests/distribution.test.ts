// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const pluginRoot = resolve(root, 'plugins', 'codeappscompact');
const skillRoot = resolve(pluginRoot, 'skills', 'codeappscompact');
const read = (path: string) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read(resolve(root, 'package.json')));
const catalog = JSON.parse(read(resolve(root, 'marketplace.json')));
const plugin = JSON.parse(read(resolve(pluginRoot, 'plugin.json')));
const kit = JSON.parse(read(resolve(skillRoot, 'references', 'kit.json')));
const skill = read(resolve(skillRoot, 'SKILL.md'));

function checkLocalLinks(path: string): void {
  for (const match of read(path).matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^https?:\/\//.test(target) || target.startsWith('#')) continue;
    expect(existsSync(resolve(dirname(path), target)), `${path}: ${target}`).toBe(true);
  }
}

describe('GitHub kit and portable skill distribution', () => {
  it('keeps npm publication disabled and package metadata synchronized', () => {
    const lock = JSON.parse(read(resolve(root, 'package-lock.json')));
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

  it('ships a portable discoverable skill with self-contained reference links', () => {
    const frontmatter = skill.split(/^---\s*$/m)[1];
    expect(frontmatter).toBeDefined();
    expect(frontmatter).toMatch(/^name: codeappscompact$/m);
    expect(frontmatter).toMatch(/^description: .+Power Platform Code Apps/m);
    expect(frontmatter).toContain(`version: "${pkg.version}"`);
    expect(frontmatter).not.toMatch(/^(allowed-tools|model):/m);
    checkLocalLinks(resolve(skillRoot, 'SKILL.md'));
    checkLocalLinks(resolve(skillRoot, 'references', 'install.md'));
    checkLocalLinks(resolve(root, 'README.md'));
  });

  it('pins a versioned GitHub archive and full SHA-256 rather than a registry or branch', () => {
    expect(kit.name).toBe(pkg.name);
    expect(kit.version).toBe(pkg.version);
    expect(kit.compatibleInstalledVersions).toContain(pkg.version);
    expect(kit.url).toBe(`https://github.com/ilyafainberg/CodeAppsCompact/releases/download/v${pkg.version}/${pkg.name}-${pkg.version}.tgz`);
    expect(kit.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(kit.sha256).not.toBe('0'.repeat(64));
  });
});
