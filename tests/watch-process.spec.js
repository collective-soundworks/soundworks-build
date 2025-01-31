import path from 'node:path';
import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import { EOL } from 'node:os';

import { delay } from '@ircam/sc-utils';
import { assert } from 'chai';
import terminate from 'terminate/promise';

const appDirname = path.join(process.cwd(), 'tests', 'test-app');

const LONG_RUN = process.argv.includes('--long-run');
const CI = process.argv.includes('--ci');

if (CI) {
  console.log('>>>>>>>>>>>>> RUNNING IN CI <<<<<<<<<<<<<<<<<<');
}

function launchProcess(cmd, cwd) {
  const words = cmd.split(' ');
  const proc = spawn(words.shift(), words, { cwd, stdio: 'inherit' });
  proc.on('close', (code) => {
    console.log(`child process "${cmd}" exited with code ${code}`);
  });
  return proc;
}

const thingLogFile = path.join(process.cwd(), 'tests', 'log-thing.txt');
const utilsSrcFilename = path.join(appDirname, 'src', 'lib', 'utils.js');
const utilsDistFilename = path.join(appDirname, '.build', 'lib', 'utils.js');
// fixture
const utilsAdd = path.join(process.cwd(), 'tests', 'test-app-fixtures', 'utils-add.js');
const utilsMult = path.join(process.cwd(), 'tests', 'test-app-fixtures', 'utils-mult.js');

describe.only('# watch-process', () => {
  before(async function() {
    this.timeout(30000);

    if (!fs.existsSync(path.join(appDirname, 'node_modules'))) {
      console.log('install dependencies');
      execSync('npm install', { cwd: appDirname, stdio: 'inherit' });
      await delay(1000);
    }

    // re-init lib/utils.js
    const code = fs.readFileSync(utilsAdd).toString();
    fs.writeFileSync(utilsSrcFilename, code);
  });

  beforeEach(() => {
    // clean log file
    try {
      fs.unlinkSync(thingLogFile);
    } catch (err) {}
  });

  afterEach(() => {
    // clean src/lib/utils.js to avoid constant git change
    const code = fs.readFileSync(utilsAdd).toString();
    fs.writeFileSync(utilsSrcFilename, code);
  });

  describe('## restart process', () => {
    it('should restart process when changes are triggered locally by `build-application`', async function() {
      const numIterations = LONG_RUN ? 20 : 5;
      this.timeout((CI ? 50000 : 5000) + numIterations * 1000);

      const server = launchProcess(`npm run dev`, appDirname);
      await delay(CI ? 10000 : 1000);

      const thing = launchProcess(`npm run watch thing`, appDirname);
      await delay(CI ? 5000 : 500);

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        assert.deepEqual(lines, [5, 0]); // 0 is last empty line
      }

      const expected = [5];
      const utilsAddCode = fs.readFileSync(utilsAdd).toString();
      const utilsMultCode = fs.readFileSync(utilsMult).toString();

      for (let i = 0; i < numIterations; i++) {
        let operation;
        if (i % 2 === 0) {
          operation = utilsMultCode;
          expected.push(6);
        } else {
          operation = utilsAddCode;
          expected.push(5);
        }

        console.log('change utils.js to:', operation);
        fs.writeFileSync(utilsSrcFilename, operation);
        // link to 2s timestamp granularity on FAT drives?
        // https://stackoverflow.com/questions/11546839/why-does-file-modified-time-automatically-increase-by-2-seconds-when-copied-to-u
        await delay(CI ? 2000 : 1000);
      }

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        expected.push(0); // last new line
        console.log(lines);
        assert.deepEqual(lines, expected);
      }

      await delay(CI ? 2000 : 500);
      await terminate(thing.pid);
      await terminate(server.pid);
    });

    it('should restart process when changes are made from network (e.g. rsync)', async function() {
      const numIterations = LONG_RUN ? 20 : 5;
      this.timeout((CI ? 50000 : 5000) + numIterations * 1000);

      try {
        execSync(`which rsync`)
      } catch (err) {
        console.log('rsync not found, abort test...');
        return;
      }

      execSync(`npm run build`, { cwd: appDirname });

      const server = launchProcess(`npm run watch:inspect server`, appDirname);
      await delay(CI ? 5000 : 1000);

      const thing = launchProcess(`npm run watch thing`, appDirname);
      await delay(CI ? 5000 : 500);

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        assert.deepEqual(lines, [5, 0]); // 0 is last empty line
      }

      // modify utils file regularly
      // - file is build by `dev` script
      // - `watch thing` process is restarted on build change
      const expected = [5];

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
        execSync(`rsync --inplace ${srcFilename} ${utilsDistFilename}`);
        // link to 2s timestamp granularity on FAT drives?
        // https://stackoverflow.com/questions/11546839/why-does-file-modified-time-automatically-increase-by-2-seconds-when-copied-to-u
        await delay(CI ? 2000 : 500);
      }

      {
        const data = fs.readFileSync(thingLogFile).toString();
        const lines = data.split(EOL).map(Number);
        expected.push(0); // last new line
        console.log(lines);
        assert.deepEqual(lines, expected);
      }

      await delay(CI ? 2000 : 500);
      await terminate(thing.pid);
      await terminate(server.pid);
    });
  });

  describe('## check --enable-source-maps flag', () => {
    it('should report errors from source files', async function() {
      const numIterations = LONG_RUN ? 20 : 5;
      this.timeout((CI ? 50000 : 5000) + numIterations * 1000);

      const utilsThrows = path.join(process.cwd(), 'tests', 'test-app-fixtures', 'utils-throws.js');
      const code = fs.readFileSync(utilsThrows).toString();
      fs.writeFileSync(utilsSrcFilename, code);

      const server = launchProcess(`npm run dev`, appDirname);
      await delay(CI ? 10000 : 1000);

      const thing = spawn('npm', ['run', 'watch', 'thing'], { cwd: appDirname });

      let stackTraceFound = false;
      const expectedStackTrace = `src/lib/utils.js:2`;

      thing.stderr.on('data', data => {
        // console.group(data);
        if (data.toString().includes(expectedStackTrace)) {
          console.log('### Expected stack trace found:');
          console.log(data.toString());
          stackTraceFound = true;
        }
      });

      await delay(CI ? 2000 : 500);
      await terminate(thing.pid);
      await terminate(server.pid);

      assert.isTrue(stackTraceFound);
    });
  });
});
