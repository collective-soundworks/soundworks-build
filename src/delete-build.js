import fs from 'node:fs/promises';
import chalk from 'chalk';

export default async function deleteBuild() {
  await fs.rm('.build', { recursive: true, force: true });
  console.log(chalk.yellow(`+ deleted build folder`));
}

