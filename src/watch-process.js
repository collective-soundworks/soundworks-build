import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';

import chalk from 'chalk';
import JSON5 from 'json5';
import portfinder from 'portfinder';

export default async function watchProcess(processName, inspect) {
  let processPath = null;

  if (processName === 'server') {
    processPath = path.join('.build', processName, 'index.js');
  } else {
    // Get application config file and make sure client is declared as a "node" target
    let clientsConfig = null;
    try {
      const configData = fs.readFileSync(path.join('config', 'application.json'));
      clientsConfig = JSON5.parse(configData).clients;
    } catch(err) {
      console.log(chalk.red(`[@soundworks/build] Invalid \`config/application.json\` file`));
      process.exit(1);
    }

    if (!clientsConfig[processName]) {
      console.log(chalk.red(`[@soundworks/build] Process \`${processName}\` not declared in \`./config/application.json\``));
      process.exit(1);
    }

    if (clientsConfig[processName].target !== 'node') {
      console.log(chalk.red(`[@soundworks/build] Process \`${processName}\` not declared as "node" target in \`./config/application.json\``));
      process.exit(1);
    }

    processPath = path.join('.build', 'clients', processName, 'index.js');
  }

  // Check that the process entry point exists
  if (!fs.existsSync(processPath)) {
    console.log(chalk.red(`[@soundworks/build] Cannot watch process \`${processName}\`, file \`${processPath}\` does not exists, you might want to run \`npm run build\``));
    process.exit(1);
  }

  console.log(chalk.cyan(`> watching process\t ${processPath}`));
  // default flags for node processes in watch/dev mode
  const execArgv = [
    '--trace-warnings',
    '--enable-source-maps',
    '--watch',
  ];

  // Must be before --watch for some reason
  // @fixme - this is not suited for node clients has the "real" client procecss
  // is handlded by the launched.
  if (inspect) {
    const port = await portfinder.getPortPromise({ port: 9229 });
    execArgv.unshift(`--inspect=${port}`);
  }

  const options = {
    stdio: 'inherit',
    execArgv
  };

  fork(processPath, [], options);
}
