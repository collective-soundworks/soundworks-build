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

describe('# Build applications using old layout', () => {
  const appDirname = path.join(process.cwd(), 'tests', 'test-old-layout');
  const srcDirname = path.join(appDirname, 'src');
  const destDirname = path.join(appDirname, '.build');
  const browserClient = 'player';
  const nodeClient = 'thing';

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

  it('Should transpile  or copy all files in `src`', async function() {
    this.timeout(10000);

    assert.isTrue(fs.existsSync(destDirname));

    const srcFiles = klawSync(srcDirname);

    srcFiles.forEach(srcFilename => {
      const destFilename = srcFilename.path.replace(srcDirname, destDirname);
      assert.isTrue(fs.existsSync(destFilename), `File "${path.relative(appDirname, destFilename)}" not found`);
    });
  });

  it('Should properly bundle browser client files: `src/clients/${name}/index.js` -> `.build/public/${name}.js`', () => {
    const browserBundlePathname = path.join(destDirname, 'public', `${browserClient}.js`);
    assert.isTrue(fs.existsSync(browserBundlePathname), `File "${path.relative(appDirname, browserBundlePathname)}" not found`);
  });

  it(`Browser clients should launch properly`, function() {
    this.timeout(10 * 1000);

    return new Promise(async resolve => {
      // prepare puppeteer
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      // run the server
      // const controller = new AbortController();

      const serverFilename = path.join(destDirname, 'server', 'index.js');
      const serverProc = fork(serverFilename, [], {
        // signal: controller.signal,
        cwd: appDirname,
        stdio: 'inherit',
      });

      serverProc.on('message', async msg => {
        console.log('> In test:', msg);

        if (msg === 'browser ack received') {
          clearTimeout(timeout);
          terminate(serverProc.pid);
          await browser.close();
          resolve();
        }
      });

      await delay(CI ? 5000 : 1000);
      await page.goto('http://127.0.0.1:8000');

      const timeout = setTimeout(async () => {
        terminate(serverProc.pid);
        await browser.close();
        assert.fail('No ack received after 5s');
      }, 5000);
    });
  });

  it(`Node clients should launch properly`, function() {
    this.timeout(10 * 1000);

    return new Promise(async resolve => {
      // run the server
      const serverFilename = path.join(destDirname, 'server', 'index.js');
      const serverProc = fork(serverFilename, [], {
        cwd: appDirname,
        stdio: 'inherit',
      });

      serverProc.on('message', async msg => {
        console.log('> In test:', msg);

        if (msg === 'node ack received') {
          clearTimeout(timeout);
          terminate(serverProc.pid);
          terminate(clientProc.pid);
          resolve();
        }
      });

      await delay(CI ? 5000 : 1000);
      const clientFilename = path.join(destDirname, 'clients', nodeClient, 'index.js');
      const clientProc = fork(clientFilename, [], {
        cwd: appDirname,
        stdio: 'inherit',
      });

      const timeout = setTimeout(() => {
        terminate(serverProc.pid);
        terminate(clientProc.pid);
        assert.fail('No ack received after 5s');
      }, 5000);
    });
  });
});
