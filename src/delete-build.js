import chalk from 'chalk';
import { rimraf } from 'rimraf';

export default async function deleteBuild() {
  await rimraf('.build');
  console.log(chalk.yellow(`+ deleted build folder`));
}

