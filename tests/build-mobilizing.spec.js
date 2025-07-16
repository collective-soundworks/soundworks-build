import path from 'node:path';
import fs from 'node:fs';
import { execSync, fork } from 'node:child_process';

import { delay } from '@ircam/sc-utils';
import { assert } from 'chai';
import klawSync from 'klaw-sync';
import puppeteer from 'puppeteer';
import terminate from 'terminate';

const CI = process.argv.includes('--ci');

if (CI) {
  console.log('>>>>>>>>>>>>> RUNNING IN CI <<<<<<<<<<<<<<<<<<');
}

// ------------------------------------------------------------------------
// use mobilizing template application
// ------------------------------------------------------------------------

describe('# Build mobilizing', () => {
  const appDirname = path.join(process.cwd(), 'tests', 'test-mobilizing');
  const srcDirname = path.join(appDirname, 'src');
  const destDirname = path.join(appDirname, '.build');
  const browserClient = 'mobile';

  before(async function() {
    this.timeout(30000);

    // clean build directory
    fs.rmSync(destDirname, { recursive: true, force: true });

    if (!fs.existsSync(path.join(appDirname, 'node_modules'))) {
      console.log('install dependencies');
      execSync('npm install', { cwd: appDirname, stdio: 'inherit' });
      await delay(1000);
    }

    execSync('npm run build', { cwd: appDirname, stdio: 'inherit' });
    await delay(500);
  });

  after(function() {
    this.timeout(10000);
    fs.rmSync(path.join(appDirname, 'node_modules'), {
      recursive: true,
      force: true,
    });
  });

  let proc = null;
  beforeEach(() => proc = new Set());
  afterEach(() => proc.forEach(p => terminate(p.pid)));

  it(`should test against local copy of @soundworks/build`, () => {
    const buildDirname = path.join(appDirname, 'node_modules', '@soundworks', 'build');
    const stats = fs.lstatSync(buildDirname);
    assert.isTrue(stats.isSymbolicLink(), '@soundworks/build is not local copy');
  });

  it('should transpile  or copy all files in `src`', async function() {
    this.timeout(10000);

    assert.isTrue(fs.existsSync(destDirname));

    const srcFiles = klawSync(srcDirname);

    srcFiles.forEach(srcFilename => {
      const destFilename = srcFilename.path.replace(srcDirname, destDirname);
      assert.isTrue(fs.existsSync(destFilename), `File "${path.relative(appDirname, destFilename)}" not found`);
    });
  });

  it('should properly bundle browser client files: `src/clients/${name}.js` -> `.build/public/${name}.js`', () => {
    const browserBundlePathname = path.join(destDirname, 'public', `${browserClient}.js`);
    assert.isTrue(fs.existsSync(browserBundlePathname), `File "${path.relative(appDirname, browserBundlePathname)}" not found`);
  });

  it(`browser clients should launch properly`, function() {
    const timeoutDuration = CI ? 30 * 1000 : 10 * 1000;
    this.timeout(timeoutDuration);

    return new Promise(async resolve => {
      // prepare puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        ignoreDefaultArgs: ["--disable-extensions"],
        args: ["--no-sandbox", '--use-fake-ui-for-media-stream'],
      });
      const page = await browser.newPage();

      const serverFilename = path.join(destDirname, 'server.js');
      const serverProc = fork(serverFilename, [], {
        cwd: appDirname,
        stdio: 'inherit',
      });
      proc.add(serverProc);

      serverProc.on('message', async msg => {
        console.log('> In test:', msg);

        if (msg === 'browser ack received') {
          clearTimeout(timeout);
          await browser.close();
          resolve();
        }
      });

      await delay(CI ? 10000 : 1000);
      await page.goto('http://127.0.0.1:8000');

      const timeout = setTimeout(async () => {
        await browser.close();
        assert.fail('No ack received after', timeoutDuration, 's');
      }, timeoutDuration);
    });
  });
});
