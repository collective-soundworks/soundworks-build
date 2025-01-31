import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

import { delay } from '@ircam/sc-utils';
import { assert } from 'chai';

const appDirname = path.join(process.cwd(), 'tests', 'test-app');

describe('delete-build', () => {
  before(async function() {
    this.timeout(30000);

    if (!fs.existsSync(path.join(appDirname, 'node_modules'))) {
      console.log('install dependencies');
      execSync('npm install', { cwd: appDirname, stdio: 'inherit' });
      await delay(1000);
    }
  });

  it('should properly clean .build directory', async function() {
    this.timeout(10000);

    const buildDirname = path.join(appDirname, '.build');

    execSync('npm run build', { cwd: appDirname, stdio: 'inherit' });
    await delay(500);

    assert.isTrue(fs.existsSync(buildDirname));

    execSync('npm run clean', { cwd: appDirname, stdio: 'inherit' });
    await delay(500);

    assert.isFalse(fs.existsSync(buildDirname));
  });
});
