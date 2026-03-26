import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { scaffoldOfficialContentPack } from './scaffold-official-content-pack';

const tempRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempRoots.splice(0).map(root => fs.rm(root, { recursive: true, force: true })),
  );
});

async function createTempRoot(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'official-content-pack-'));
  tempRoots.push(root);
  return root;
}

function relativePath(rootDir: string, target: string): string {
  return path.relative(rootDir, target).replace(/\\/g, '/');
}

describe('scaffoldOfficialContentPack', () => {
  it('creates the exact expected official module skeleton', async () => {
    const rootDir = await createTempRoot();

    const result = await scaffoldOfficialContentPack({
      mode: 'module',
      module: 'basic_tragedy',
      script: 'my_script',
      rootDir,
    });

    expect(result.createdFiles.map(file => relativePath(rootDir, file))).toEqual([
      'packages/domain/src/data/scripts/basicTragedy/README.md',
      'packages/domain/src/data/scripts/basicTragedy/myScript.ts',
      'packages/game-logic/src/rules/modules/basic-tragedy/index.ts',
      'packages/game-logic/src/rules/modules/basic-tragedy/manifest.ts',
    ]);

    const manifestSource = await fs.readFile(
      path.join(rootDir, 'packages/game-logic/src/rules/modules/basic-tragedy/manifest.ts'),
      'utf8',
    );
    const scriptSource = await fs.readFile(
      path.join(rootDir, 'packages/domain/src/data/scripts/basicTragedy/myScript.ts'),
      'utf8',
    );

    expect(manifestSource).toContain("roleIds:");
    expect(manifestSource).toContain("incidentIds:");
    expect(manifestSource).toContain("plotIds:");
    expect(manifestSource).toContain("scriptIds: ['my_script']");
    expect(manifestSource).not.toContain('manualScripts');

    expect(scriptSource).toContain("moduleId: 'basic-tragedy'");
    expect(scriptSource).toContain("tragedySetId: 'basic_tragedy'");
    expect(scriptSource).toContain('scriptSpecialRules: [');
    expect(scriptSource).toContain("id: 'my_script_special_rule'");
  });

  it('adds a new script to an existing official module manifest', async () => {
    const rootDir = await createTempRoot();

    await scaffoldOfficialContentPack({
      mode: 'module',
      module: 'basic_tragedy',
      script: 'my_script',
      rootDir,
    });

    const result = await scaffoldOfficialContentPack({
      mode: 'script',
      module: 'basic_tragedy',
      script: 'second_script',
      rootDir,
    });

    expect(result.createdFiles.map(file => relativePath(rootDir, file))).toEqual([
      'packages/domain/src/data/scripts/basicTragedy/secondScript.ts',
    ]);
    expect(result.updatedFiles.map(file => relativePath(rootDir, file))).toEqual([
      'packages/game-logic/src/rules/modules/basic-tragedy/manifest.ts',
    ]);

    const manifestSource = await fs.readFile(
      path.join(rootDir, 'packages/game-logic/src/rules/modules/basic-tragedy/manifest.ts'),
      'utf8',
    );

    expect(manifestSource).toContain("scriptIds: ['my_script', 'second_script']");
  });
});
