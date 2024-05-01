import fs from 'node:fs';
import path from 'node:path';
import { fork } from 'node:child_process';

import chalk from 'chalk';
import JSON5 from 'json5';

export default function watchProcess(processName, inspect) {
  let processPath = null;

  // default falgs for node processes
  const execArgv = [
    '--trace-warnings',
    '--enable-source-maps',
    '--watch',
  ];

  if (inspect) {
    execArgv.push('--inspect');
  }


  if (processName === 'server') {
    processPath = path.join('.build', processName, 'index.js');
  } else {
    // Get application config file and make sure client is declared as a "node" target
    let clientsConfig = null;
    try {
      const configData = fs.readFileSync(path.join('config', 'application.json'));
      clientsConfig = JSON5.parse(configData).clients;
    } catch(err) {
      console.log(chalk.red(`[@soundworks/devtools] Invalid \`config/application.json\` file`));
      process.exit(0);
    }

    if (!clientsConfig[processName]) {
      console.log(chalk.red(`[@soundworks/devtools] Process \`${processName}\` not declared in \`./config/application.json\``));
      process.exit(0);
    }

    if (clientsConfig[processName].target !== 'node') {
      console.log(chalk.red(`[@soundworks/devtools] Process \`${processName}\` not declared as "node" target in \`./config/application.json\``));
      process.exit(0);
    }

    processPath = path.join('.build', 'clients', processName, 'index.js');
  }

  // Check that the process entry point exists
  if (!fs.existsSync(processPath)) {
    console.log(chalk.red(`[@soundworks/devtools] Cannot watch process \`${processName}\`, file \`${processPath}\` does not exists, you might want to run \`npm run build\``));
    process.exit(0);
  }

  console.log(chalk.cyan(`> watching process\t ${processPath}`));

  const options = {
    stdio: 'inherit',
    execArgv
  };

  fork(processPath, [], options);
}
