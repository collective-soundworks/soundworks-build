import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

import { assert } from 'chai';
import { delay } from '@ircam/sc-utils';

const appDirname = path.join(process.cwd(), 'tests', 'test-deps');

const CI = process.argv.includes('--ci');

describe('Check all our usual deps are correctly building', () => {
  before(async function() {
    this.timeout(50000);

    if (!fs.existsSync(path.join(appDirname, 'node_modules'))) {
      console.log('install dependencies');
      execSync('npm install', { cwd: appDirname, stdio: 'inherit' });
      await delay(1000);
    }
  });

  it(`Should test against local copy of @soundworks/build`, () => {
    const buildDirname = path.join(appDirname, 'node_modules', '@soundworks', 'build');
    const stats = fs.lstatSync(buildDirname);
    assert.isTrue(stats.isSymbolicLink(), '@soundworks/build is not local copy');
  });

  it('should properly build test app', async function() {
    this.timeout(CI ? 20000 : 5000);

    const buildPath = path.join(appDirname, '.build');

    fs.rmSync(buildPath, { recursive: true, force: true });
    const result = execSync('npm run build', {
      cwd: appDirname,
    });

    console.log(result.toString());
    assert.isTrue(fs.existsSync(path.join(buildPath, 'server.js')));
    assert.isTrue(fs.existsSync(path.join(buildPath, 'clients', 'browser.js')));
    assert.isTrue(fs.existsSync(path.join(buildPath, 'clients', 'node.js')));
    assert.isTrue(fs.existsSync(path.join(buildPath, 'public', 'browser.js')));
  });
})
