import chalk from 'chalk';
import rimraf from 'rimraf';

export default function deleteBuild() {
  rimraf('.build', () => console.log(chalk.yellow(`+ deleted build folder`)));
}

