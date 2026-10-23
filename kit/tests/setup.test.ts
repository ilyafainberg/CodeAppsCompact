// @vitest-environment node
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const skillRoot = resolve(import.meta.dirname, '..', '..', 'plugins', 'codeappscompact', 'skills', 'codeappscompact');
const assets = join(skillRoot, 'assets');
const pkg: { version: string; peerDependencies: Record<string, string> } = JSON.parse(readFileSync(join(assets, 'package.json'), 'utf8'));
const temporary: string[] = [];
const peerVersions = { '@microsoft/power-apps': '1.5.0', '@tanstack/react-query': '5.90.5', react: '18.3.1' };
const writeJson = (path: string, value: unknown) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
const read = (path: string) => readFileSync(path, 'utf8');
const offline = { ...process.env, npm_config_offline: 'true', npm_config_update_notifier: 'false' };

function fixture(extra: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'codeappscompact setup '));
  temporary.push(root);
  const app = join(root, 'app & spaces');
  mkdirSync(app);
  writeJson(join(app, 'package.json'), { name: 'setup-consumer', private: true, type: 'module', dependencies: peerVersions, ...extra });
  writeJson(join(app, 'package-lock.json'), { name: 'setup-consumer', lockfileVersion: 3, packages: {} });
  return { root, app, destination: join(app, 'vendor', `codeappscompact-${pkg.version}`) };
}

function setup(app: string, skill = skillRoot) {
  const result = spawnSync(process.execPath, [join(skill, 'scripts', 'setup.mjs'), app], { encoding: 'utf8', env: offline, timeout: 60000 });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

function runAsync(command: string, args: string[], cwd?: string): Promise<{ status: number; output: string }> {
  return new Promise((resolve, reject) => {
    execFile(command, args, { cwd, encoding: 'utf8', env: offline, timeout: 90000 }, (error, stdout, stderr) => {
      if (error && (typeof error.code !== 'number' || error.killed || error.signal)) {
        reject(error);
      } else {
        resolve({ status: typeof error?.code === 'number' ? error.code : 0, output: stdout + stderr });
      }
    });
  });
}

async function runNpm(app: string, args: string[]) {
  const windows = process.platform === 'win32';
  const result = await runAsync(windows ? process.env.ComSpec || 'cmd.exe' : 'npm',
    windows ? ['/d', '/s', '/c', ['npm', ...args].join(' ')] : args,
    app);
  expect(result.status, result.output).toBe(0);
}

function rejectWithoutChanges(app: string, expected: RegExp) {
  const manifest = read(join(app, 'package.json'));
  const lock = existsSync(join(app, 'package-lock.json')) ? read(join(app, 'package-lock.json')) : undefined;
  const before = readdirSync(app).sort();
  const result = setup(app);
  expect(result.status, result.output).toBe(1);
  expect(result.output).toMatch(expected);
  expect(read(join(app, 'package.json'))).toBe(manifest);
  expect(existsSync(join(app, 'package-lock.json')) ? read(join(app, 'package-lock.json')) : undefined).toBe(lock);
  expect(readdirSync(app).sort()).toEqual(before);
}

afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true });
});

describe('portable setup helper', () => {
  it.each(['yarn.lock', 'pnpm-lock.yaml', 'bun.lock', 'bun.lockb', '.yarnrc.yml', '.pnp.cjs'])('preserves non-npm policy (%s)', marker => {
    const { app } = fixture();
    writeFileSync(join(app, marker), 'existing policy');
    rejectWithoutChanges(app, /standalone npm apps only/);
  });

  it('preserves a declared alternative package manager', () => {
    const { app } = fixture({ packageManager: 'pnpm@10.0.0' });
    rejectWithoutChanges(app, /existing package-manager workflow/);
  });

  it('does not guess a package manager when no policy is available', () => {
    const { app } = fixture();
    rmSync(join(app, 'package-lock.json'));
    rejectWithoutChanges(app, /Confirm the app tooling/);
  });

  it.each([false, true])('preserves workspace policy (ancestor: %s)', ancestor => {
    const { root, app } = fixture(ancestor ? {} : { workspaces: ['packages/*'] });
    if (ancestor) writeJson(join(root, 'package.json'), { private: true, workspaces: ['app*'] });
    rejectWithoutChanges(app, /Workspace detected/);
  });

  it('rejects conflicting npm lockfiles and damaged lock metadata', () => {
    const { app } = fixture();
    writeJson(join(app, 'npm-shrinkwrap.json'), { lockfileVersion: 3 });
    rejectWithoutChanges(app, /Multiple npm lockfiles/);
    rmSync(join(app, 'npm-shrinkwrap.json'));
    writeJson(join(app, 'package-lock.json'), { lockfileVersion: 1 });
    rejectWithoutChanges(app, /repair or update/);
  });

  it('preserves custom or different-version dependencies', () => {
    const { app } = fixture({ dependencies: { ...peerVersions, codeappscompact: 'file:vendor/custom' } });
    rejectWithoutChanges(app, /different dependency declaration/);
  });

  it('restores missing declared dependencies through the existing lockfile, not setup', () => {
    const { app } = fixture({ dependencies: { ...peerVersions, codeappscompact: `file:vendor/codeappscompact-${pkg.version}` } });
    rejectWithoutChanges(app, /Restore the existing lockfile/);
  });

  it.each(['changed', 'extra', 'missing'])('does not overwrite a %s vendor copy', mode => {
    const { app, destination } = fixture();
    cpSync(assets, destination, { recursive: true });
    const target = join(destination, mode === 'extra' ? 'custom.txt' : 'API.txt');
    if (mode === 'missing') rmSync(target);
    else writeFileSync(target, 'user-owned content');
    rejectWithoutChanges(app, /vendor copy is modified or incomplete/);
    expect(existsSync(target)).toBe(mode !== 'missing');
    if (mode !== 'missing') expect(read(target)).toBe('user-owned content');
  });

  it('rejects linked destinations without touching their targets', () => {
    const { root, app } = fixture();
    const outside = join(root, 'existing files');
    mkdirSync(outside);
    writeFileSync(join(outside, 'keep.txt'), 'preserve me');
    symlinkSync(outside, join(app, 'vendor'), process.platform === 'win32' ? 'junction' : 'dir');
    rejectWithoutChanges(app, /regular directory/);
    expect(readdirSync(outside)).toEqual(['keep.txt']);
    expect(read(join(outside, 'keep.txt'))).toBe('preserve me');
  });

  it('reports missing app peers before copying or invoking installation', () => {
    const { app } = fixture();
    rejectWithoutChanges(app, /Restore or obtain approval to install the app peer/);
    expect(existsSync(join(app, 'vendor'))).toBe(false);
  });

  it('reports missing bundled assets rather than downloading or rebuilding them', () => {
    const { root, app } = fixture();
    const skill = join(root, 'incomplete skill');
    cpSync(skillRoot, skill, { recursive: true });
    rmSync(join(skill, 'assets', 'dist', 'index.js'));
    const result = setup(app, skill);
    expect(result.status).toBe(1);
    expect(result.output).toContain('Missing bundled file');
    expect(existsSync(join(app, 'vendor'))).toBe(false);
  });

  it('accepts an identical vendor-only copy without overwriting it', () => {
    const { app, destination } = fixture();
    cpSync(assets, destination, { recursive: true });
    rejectWithoutChanges(app, /Restore or obtain approval to install the app peer/);
    expect(read(join(destination, 'API.txt'))).toBe(read(join(assets, 'API.txt')));
  });

  it('honors the pinned npm version without installing tooling', () => {
    const { app } = fixture({ packageManager: 'npm@999.0.0' });
    for (const [name, version] of Object.entries(peerVersions)) {
      const directory = join(app, 'node_modules', name);
      mkdirSync(directory, { recursive: true });
      writeJson(join(directory, 'package.json'), { name, version });
    }
    rejectWithoutChanges(app, /Use the app's pinned npm 999\.0\.0/);
    expect(existsSync(join(app, 'vendor'))).toBe(false);
  });

  it('does not bypass incompatible peers even when npm configuration requests it', async () => {
    const versions = { ...peerVersions, react: '17.0.0' };
    const { app } = fixture({ dependencies: versions });
    for (const [name, version] of Object.entries(versions)) {
      const directory = join(app, 'node_modules', name);
      mkdirSync(directory, { recursive: true });
      writeJson(join(directory, 'package.json'), { name, version });
    }
    writeFileSync(join(app, '.npmrc'), 'legacy-peer-deps=true\nforce=true\n');
    const manifest = read(join(app, 'package.json'));
    const result = await runAsync(process.execPath, [join(skillRoot, 'scripts', 'setup.mjs'), app]);
    expect(result.status, result.output).toBe(1);
    expect(result.output).toContain('ERESOLVE');
    expect(read(join(app, 'package.json'))).toBe(manifest);
    expect(read(join(app, '.npmrc'))).toBe('legacy-peer-deps=true\nforce=true\n');
  }, 90000);

  it('installs from a moved skill, reuses safely, and restores without that skill', async () => {
    const { root, app, destination } = fixture();
    const skill = join(root, 'moved skill & spaces');
    cpSync(skillRoot, skill, { recursive: true });
    const runSetup = () => runAsync(process.execPath, [join(skill, 'scripts', 'setup.mjs'), app]);
    await runNpm(app, ['install', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund']);
    const original = JSON.parse(read(join(app, 'package.json')));
    writeJson(join(app, 'package.json'), { ...original, scripts: { postinstall: 'node -e "throw new Error(\'Lifecycle scripts must not run\')"' } });
    const first = await runSetup();
    expect(first.status, first.output).toBe(0);
    expect(first.output).toContain(`Installed codeappscompact ${pkg.version}`);
    expect(read(join(destination, 'API.txt'))).toBe(read(join(assets, 'API.txt')));
    const manifest = read(join(app, 'package.json'));
    const lock = read(join(app, 'package-lock.json'));
    const repeated = await runSetup();
    expect(repeated.status, repeated.output).toBe(0);
    expect(repeated.output).toContain('no files changed');
    expect(read(join(app, 'package.json'))).toBe(manifest);
    expect(read(join(app, 'package-lock.json'))).toBe(lock);
    expect(lock).not.toContain(root.replaceAll('\\', '\\\\'));

    writeFileSync(join(app, 'node_modules', 'codeappscompact', 'API.txt'), 'custom installed content');
    const conflict = await runSetup();
    expect(conflict.status).toBe(1);
    expect(conflict.output).toContain('Installed package differs');
    expect(read(join(app, 'node_modules', 'codeappscompact', 'API.txt'))).toBe('custom installed content');
    expect(read(join(app, 'package-lock.json'))).toBe(lock);

    rmSync(skill, { recursive: true });
    rmSync(join(app, 'node_modules'), { recursive: true });
    await runNpm(app, ['ci', '--install-links', '--ignore-scripts', '--strict-peer-deps', '--legacy-peer-deps=false', '--force=false', '--no-audit', '--no-fund']);
    const imported = spawnSync(process.execPath, ['--input-type=module', '--eval',
      'import { RecordScreen } from "codeappscompact"; if (typeof RecordScreen !== "function") process.exit(1);'],
      { cwd: app, encoding: 'utf8' });
    expect(imported.status, imported.stderr).toBe(0);
    expect(read(join(app, 'package-lock.json'))).toBe(lock);
    expect(read(join(app, 'node_modules', 'codeappscompact', 'API.txt'))).toBe(read(join(assets, 'API.txt')));
    expect(existsSync(skill)).toBe(false);
  }, 180000);
});
