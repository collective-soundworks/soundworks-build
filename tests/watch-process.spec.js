import path from 'node:path';
import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { EOL } from 'node:os';

import { delay } from '@ircam/sc-utils';
import { assert } from 'chai';
import terminate from 'terminate/promise';

const appDirname = path.join(process.cwd(), 'tests', 'test-app');

const LONG_RUN = process.argv.includes('--long-run');
const IS_RPI = process.argv.includes('--rpi');

function launchProcess(cmd, cwd) {
  const words = cmd.split(' ');
  const proc = spawn(words.shift(), words, { cwd });
  proc.on('close', (code) => {
    console.log(`child process "${cmd}" exited with code ${code}`);
  });
  return proc;
}

// @todo - clean test app, re-install, etc.

describe('# watch-process', () => {
  const thingLogFile = path.join(process.cwd(), 'tests', 'log-thing.txt');
  const utilsSrcFilename = path.join(appDirname, 'src', 'lib', 'utils.js');
  const utilsDistFilename = path.join(appDirname, '.build', 'lib', 'utils.js');

  describe.skip('## source maps', () => {});

  describe('## restart process', () => {
    beforeEach(() => {
      // clean log file
      try {
        fs.unlinkSync(thingLogFile);
      } catch (err) {}
      // clean src/lib/utils.js
      fs.writeFileSync(utilsSrcFilename, `export const execute = (a, b) => a + b;`);
    });

    it.only('should restart process when changes are triggered locally by `build-application`', async function() {
      const numIterations = LONG_RUN ? 1000 : 5;
      this.timeout(5000 + numIterations * 1000);

      const server = launchProcess(`npm run watch:inspect server`, appDirname);
      await delay(IS_RPI ? 5000 : 1000);

      const thing = launchProcess(`npm run watch thing`, appDirname);
      await delay(IS_RPI ? 2000 : 500);

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        assert.deepEqual(lines, [5, 0]); // 0 is last empty line
      }

      const expected = [5];

      for (let i = 0; i < numIterations; i++) {
        let operation;
        if (i % 2 === 0) {
          operation = `export const execute = (a, b) => a * b;`;
          expected.push(6);
        } else {
          operation = `export const execute = (a, b) => a + b;`;
          expected.push(5);
        }

        console.log('change utils.js to:', operation);
        fs.writeFileSync(utilsSrcFilename, operation);
        await delay(500);
      }

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        expected.push(0); // last new line
        console.log(lines);
        assert.deepEqual(lines, expected);
      }

      await delay(500);
      await terminate(thing.pid);
      await terminate(server.pid);
    });

    it('should restart process when changes are made from network (e.g. rsync)', async function() {
      const numIterations = LONG_RUN ? 1000 : 5;
      this.timeout(5000 + numIterations * 1000);

      try {
        execSync(`which rsync`)
      } catch (err) {
        console.log('rsync not found, abort test...');
        return;
      }

      const server = launchProcess(`npm run dev`, appDirname);
      await delay(IS_RPI ? 5000 : 1000);

      const thing = launchProcess(`npm run watch thing`, appDirname);
      await delay(IS_RPI ? 2000 : 500);

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        assert.deepEqual(lines, [5, 0]); // 0 is last empty line
      }

      // modify utils file regularly
      // - file is build by `dev` script
      // - `watch thing` process is restarted on build change
      const expected = [5];
      const utilsAdd = path.join(process.cwd(), 'tests', 'test-app-fixtures', 'utils-add.js');
      const utilsMult = path.join(process.cwd(), 'tests', 'test-app-fixtures', 'utils-mult.js');

      for (let i = 0; i < numIterations; i++) {
        let srcFilename;
        if (i % 2 === 0) {
          srcFilename = utilsMult;
          expected.push(6);
        } else {
          srcFilename = utilsAdd;
          expected.push(5);
        }

        console.log('rsync build file:', srcFilename, 'to .build');
        execSync(`rsync ${srcFilename} ${utilsDistFilename}`);
        await delay(500);
      }

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        expected.push(0); // last new line
        console.log(lines);
        assert.deepEqual(lines, expected);
      }

      await delay(500);
      await terminate(thing.pid);
      await terminate(server.pid);
    });
  });
});
