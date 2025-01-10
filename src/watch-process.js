import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';

import loadConfig from '@soundworks/helpers/load-config.js';
import chalk from 'chalk';
// import chokidar from 'chokidar';
// import debounce from 'debounce';
import portfinder from 'portfinder';
// import terminate from 'terminate/promise';

// const processes = new Map();

// async function forkProcess(processPath, inspect) {
//   if (processes.has(processPath)) {
//     await killProcess(processPath);
//   }

//   const options = {
//     stdio: 'inherit',
//     execArgv: [
//       '--trace-warnings',
//       '--enable-source-maps',
//     ],
//   };

//   if (inspect) {
//     const port = await portfinder.getPortPromise({ port: 9229 });
//     options.execArgv.unshift(`--inspect=${port}`)
//   }

//   // @important - The timeout is required for the inspect to properly exit
//   // The value of 100ms has been chosen by "rule of thumb"
//   setTimeout(() => {
//     const proc = fork(processPath, [], options);
//     processes.set(processPath, proc);
//   }, inspect ? 100 : 0);
// }

// // kill the forked process hosting the proc
// async function killProcess(processPath) {
//   const proc = processes.get(processPath);

//   if (proc) {
//     try {
//       await terminate(proc.pid, 'SIGINT');
//     } catch (err) {
//       console.log(`[@soundworks/build] watch-process could not terminate process "${processPath}"`);
//       console.log(err);
//     }

//     processes.delete(processPath);
//   }
// }

export default async function watchProcess(processName, inspect) {
  let processPath = null;

  // `--watch` flag has been declared stable in node v22.0.0
  // cf. https://nodejs.org/api/cli.html#--watch
  const [major, _minor, _patch] = process.versions.node.split('.').map(Number);
  if (major < 22) {
    console.log(chalk.red(`[@soundworks/build] watch-process rely on the "--watch" flag which has been declared stable in node v22.0.0, but your node version ${process.versions.node}. Please upgrade to node >= 22`));
  }

  // check that application has been built
  if (!fs.existsSync(path.join('.build'))) {
    console.log(chalk.red(`[@soundworks/build] Can't watch process, application has not been built yet, please run \`npm run build\` or \`npm run dev\` beforehand`));
    process.exit(1);
  }

  if (processName === 'server') {
    processPath = path.join('.build', processName, 'index.js');
  } else {
    // Get application config file and make sure client is declared as a "node" target
    const config = loadConfig(process.env.ENV);
    const clientsConfig = config.app.clients;

    if (!clientsConfig[processName]) {
      console.log(chalk.red(`[@soundworks/build] Process \`${processName}\` not declared in \`./config/application.yaml\``));
      process.exit(1);
    }

    if (clientsConfig[processName].runtime !== 'node') {
      console.log(chalk.red(`[@soundworks/build] Process \`${processName}\` not declared as a "node" runtime process in \`./config/application.yaml\``));
      process.exit(1);
    }

    processPath = path.join('.build', 'clients', processName, 'index.js');
  }

  console.log(chalk.cyan(`> watching process\t ${processPath}`));
  // default flags for node processes in watch/dev mode

  // Notes on the different solution we explored here:
  // - `chokidar` does not provide a way to restart the process when a dependency,
  // which is outside the watched directory is changed. Which is rather bad DX
  // - `nodemon` has the same problem, while it may look like the opposite in a simple
  // testbad. It restarts the process even the changed does not concern it... probably
  // because it watches process.cwd() by default, so same behavior as with `chokidar`
  // but with larger "watch" scope
  // - `node --watch` looks like the most suited solution for our use cases but we had
  // problemswith RPis with first released (cf. 280b735, May 1, 2024). But --watch but
  // has been declared stable in v20.13 (released on May 7, 2024) while our RPi had
  // `v20.11.1` installed. Maybe / Hopefully fixed

  const options = {
    stdio: 'inherit',
    execArgv: [
      '--trace-warnings',
      '--enable-source-maps',
      '--watch',
    ],
  };

  // Must be before --watch for some reason
  // @fixme - this is not suited for node clients has the "real" client procecss
  // is handlded by the launched.
  if (inspect) {
    const port = await portfinder.getPortPromise({ port: 9229 });
    options.execArgv.unshift(`--inspect=${port}`);
  }

  fork(processPath, [], options);

  // // Check that the process entry point exists
  // if (!fs.existsSync(processPath)) {
  //   console.log(chalk.red(`[@soundworks/build] Cannot watch process \`${processName}\`, file \`${processPath}\` does not exists`));
  //   process.exit(1);
  // }

  // const watcher = chokidar.watch([processPath, path.join('config')], {
  //   ignoreInitial: true,
  // });

  // console.log(chalk.cyan(`> watching process\t ${processPath}`));

  // watcher.on('change', debounce(filename => start(processPath, inspect), 500))
  // // as we ignore initial changes we can start the process now
  // forkProcess(processPath, inspect);
}
