// @vitest-environment node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const kitRoot = resolve(import.meta.dirname, '..');
const root = resolve(kitRoot, '..');
const pluginRoot = resolve(root, 'plugins', 'codeappscompact');
const skillRoot = resolve(pluginRoot, 'skills', 'codeappscompact');
const assets = resolve(skillRoot, 'assets');
const read = (path: string) => readFileSync(path, 'utf8');
const pkg = JSON.parse(read(resolve(kitRoot, 'package.json')));
const catalog = JSON.parse(read(resolve(root, 'marketplace.json')));
const plugin = JSON.parse(read(resolve(pluginRoot, 'plugin.json')));
const skill = read(resolve(skillRoot, 'SKILL.md'));
const bundled = (path: string) => read(resolve(assets, path));
const normalize = (text: string) => text.replace(/\r\n/g, '\n');
const consumerFiles = [
  'API.txt', 'LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js',
  'examples/App.tsx', 'examples/main.tsx', 'examples/service.ts', 'examples/style.css', 'package.json',
];

function filesIn(directory: string, base = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(directory, entry.name);
    expect(entry.isSymbolicLink(), path).toBe(false);
    if (entry.isDirectory()) return filesIn(path, base);
    expect(entry.isFile(), path).toBe(true);
    return relative(base, path).replaceAll('\\', '/');
  }).sort();
}

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
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack']) expect(pkg.scripts[hook]).toBeUndefined();
  });

  it('exposes one plugin through matching marketplace catalogs', () => {
    expect(JSON.parse(read(resolve(root, '.claude-plugin', 'marketplace.json')))).toEqual(catalog);
    expect(catalog.name).toBe('codeappscompact');
    expect(catalog.plugins).toHaveLength(1);
    expect(catalog.plugins[0].name).toBe(plugin.name);
    expect(catalog.plugins[0].version).toBe(pkg.version);
    expect(catalog.plugins[0].repository).toBeUndefined();
    expect(resolve(root, catalog.plugins[0].source)).toBe(pluginRoot);
  });

  it('keeps portable and legacy plugin identities equal without automatic hooks', () => {
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
    expect(frontmatter).toMatch(/^name: codeappscompact$/m);
    expect(frontmatter).toMatch(/^description: .+Power Platform Code Apps/m);
    expect(frontmatter).toContain(`version: "${pkg.version}"`);
    expect(frontmatter).not.toMatch(/^(allowed-tools|model):/m);
    expect(frontmatter).not.toMatch(/\b(repository|homepage):/);
    checkLocalLinks(resolve(skillRoot, 'SKILL.md'), skillRoot);
    checkLocalLinks(resolve(root, 'README.md'));
    checkLocalLinks(resolve(kitRoot, 'README.md'), kitRoot);
    checkLocalLinks(resolve(assets, 'README.md'), assets);
  });

  it('ships plain assets and one explicit helper, with no obsolete installation files', () => {
    expect(readdirSync(skillRoot).sort()).toEqual(['LICENSE', 'SKILL.md', 'assets', 'scripts']);
    expect(readdirSync(resolve(skillRoot, 'scripts'))).toEqual(['setup.mjs']);
    expect(filesIn(assets)).toEqual([...consumerFiles].sort());
    expect(filesIn(skillRoot).some(path => /(?:kit\.json|install\.md|\.(?:zip|tgz|ps1))$/i.test(path))).toBe(false);
    const consumer = JSON.parse(bundled('package.json'));
    expect(existsSync(resolve(assets, consumer.exports['.'].import))).toBe(true);
    expect(existsSync(resolve(assets, consumer.exports['.'].types))).toBe(true);
  });

  it('exposes one matching API file with a short authoring contract before detailed reference', () => {
    expect(skill).toContain('[bundled API reference](assets/API.txt)');
    expect(normalize(bundled('API.txt'))).toBe(normalize(read(resolve(kitRoot, 'API.txt'))));
    expect(filesIn(skillRoot).filter(path => path.endsWith('API.txt'))).toEqual(['assets/API.txt']);
    expect(bundled('API.txt')).toMatch(/^Quick authoring contract\r?\n/);
    expect(bundled('API.txt').indexOf('Detailed reference')).toBeGreaterThan(0);
  });

  it('synchronizes all consumer assets with canonical sources', () => {
    for (const path of consumerFiles.filter(path => path !== 'package.json')) {
      expect(normalize(bundled(path)), path).toBe(normalize(read(resolve(kitRoot, path))));
    }
  });

  it('ships runtime metadata without development scripts or origin information', () => {
    const consumer = JSON.parse(bundled('package.json'));
    const fields = [
      'name', 'version', 'description', 'license', 'type', 'main', 'types', 'exports',
      'files', 'sideEffects', 'engines', 'peerDependencies', 'private',
    ];
    expect(Object.keys(consumer).sort()).toEqual(fields.sort());
    for (const key of fields) expect(consumer[key], key).toEqual(pkg[key]);
    expect(bundled('README.md')).not.toMatch(/npm (ci|run (build|test|dev))|bundle-skill|marketplace\.json/);
  });

  it('contains no external URLs, original workspace paths, or repository identifiers', () => {
    for (const path of filesIn(skillRoot)) {
      expect(read(resolve(skillRoot, path)), path).not.toMatch(
        /https?:\/\/|git\+|github:|\b(?:ilyafainberg|codeapps-records|CopilotWorkspace)\b|[a-z]:[\\/]/i,
      );
    }
  });

  it('keeps reuse first and replaces the shell recipe with one setup command', () => {
    expect(skill.indexOf('Resolve `codeappscompact`')).toBeLessThan(skill.indexOf('[assets/package.json]'));
    expect(skill).toContain('[setup helper](scripts/setup.mjs)');
    expect(skill).toContain('node "<installed-skill-folder>\\scripts\\setup.mjs" "<app-folder>"');
    expect(skill).toContain('npm ci --install-links --ignore-scripts --strict-peer-deps');
    expect(skill).toContain('including `dist`');
    expect(skill).toContain('types AND behavior');
    expect(skill).toContain('only for unresolved typing');
    expect(skill).toContain('Do not repeat portability checks');
    expect(skill).not.toMatch(/kit\.json|install\.md|Copy-Item|Join-Path|Expand-Archive|\.zip\b|SHA-?256|\.tgz|two corrective passes/);
  });

  it('includes the same MIT license in repository, kit, and skill', () => {
    const license = normalize(read(resolve(root, 'LICENSE')));
    expect(normalize(read(resolve(kitRoot, 'LICENSE')))).toBe(license);
    expect(normalize(read(resolve(skillRoot, 'LICENSE')))).toBe(license);
    expect(normalize(bundled('LICENSE'))).toBe(license);
  });
});
