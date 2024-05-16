import path from 'node:path';
import { EOL } from 'node:os';
import { createRequire } from 'node:module';

import { AnsiUp } from 'ansi_up';
import chalk from 'chalk';
import chokidar from 'chokidar';
import * as esbuild from 'esbuild';
import fs from 'fs-extra';
import JSON5 from 'json5';
import klawSync from 'klaw-sync';
import swc from '@swc/core';

const cwd = process.cwd();
const cwdRegExp = new RegExp(cwd, 'g');
const supportedFilesRegExp = /\.(js|jsx|mjs|ts|tsx)$/;

// ------------------------------------------------------
// Compiler section
// ------------------------------------------------------
async function doCompileOrCopy(pathname, inputFolder, outputFolder) {
  if (fs.lstatSync(pathname).isDirectory()) {
    return;
  }

  const inputFilename = pathname;
  const outputFilename = inputFilename
    .replace(inputFolder, outputFolder)
    .replace(supportedFilesRegExp, '.js');

  fs.ensureDirSync(path.dirname(outputFilename));

  if (supportedFilesRegExp.test(inputFilename)) {
    try {
      const sourceFileName = path.relative(path.dirname(outputFilename), inputFilename);

      let { code, map } = await swc.transformFile(inputFilename, {
        sourceMaps: true,
        // Path to "real" file to create source maps
        sourceFileName,
        // These files will only be executed by node so we can safely
        // target newer version of javascript
        // This settings has precedence over the .swcrc file
        jsc: {
          target: 'es2022',
        },
      });

      code += `${EOL}//# sourceMappingURL=./${path.basename(outputFilename)}.map`;

      fs.writeFileSync(outputFilename, code, { recursive: true });
      fs.writeFileSync(`${outputFilename}.map`, map, { recursive: true });

      console.log(chalk.green(`> compiled\t ${inputFilename}`));
    } catch (err) {
      console.error(err.message);
    }
  } else {
    try {
      fs.copyFileSync(inputFilename, outputFilename);
      console.log(chalk.green(`> copied\t ${inputFilename}`));
    } catch(err) {
      console.error(err.message);
    }
  }
}

async function compile(inputFolder, outputFolder, watch) {
  if (!watch) {
    const files = klawSync(inputFolder);
    const promises = files
      .map(file => path.relative(process.cwd(), file.path))
      .map(pathname => doCompileOrCopy(pathname, inputFolder, outputFolder));
    return Promise.all(promises);
  } else {
    const watcher = chokidar.watch(inputFolder, { ignoreInitial: true });

    watcher.on('add', pathname => doCompileOrCopy(pathname, inputFolder, outputFolder));
    watcher.on('change', pathname => doCompileOrCopy(pathname, inputFolder, outputFolder));
    watcher.on('unlink', pathname => {
      const outputFilename = pathname.replace(inputFolder, outputFolder);
      fs.unlinkSync(outputFilename);
      fs.unlinkSync(`${outputFilename}.map`);

      console.log(chalk.green(`> deleted\t ${outputFilename}`));
    });
  }
}

// ------------------------------------------------------
// Bundler section
// ------------------------------------------------------
function writeErrorInOutputFile(errorMessage, outputFile) {
  // - escape string literals so that we can insert them in the log string literal message
  // - remove `cwd` from pathnames to make them more readable
  const msg = errorMessage
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
    .replace(cwdRegExp, '.');

  const ansiUp = new AnsiUp();
  const html = ansiUp.ansi_to_html(msg);
  const style = 'width: 100%; margin: 20px; padding: 20px; font-size: 12px; background-color: white; color: #121212; border: 1px solid #d9534f; border-radius: 1px;';

  const jsErrorFile = `
document.body.innerHTML = \`<pre style="${style}"><code>${html}</code></pre>\`;
console.log(\`${msg}\`);
  `;

  fs.writeFileSync(outputFile, jsErrorFile);
}

const esbuildSwcPlugin = {
  name: 'swc',
  setup(build) {
    build.onLoad({ filter: /.*/ }, async args => {
      const inputFilename = args.path;
      const contents = await fs.promises.readFile(inputFilename, 'utf8');

      try {
        let { code } = await swc.transformFile(inputFilename, {
          sourceMaps: 'inline',
        });

        return { contents: code };
      } catch (err) {
        throw err;
      }
    });

    build.onEnd(result => {
      const outputFile = path.relative(cwd, build.initialOptions.outfile);

      if (result.errors.length > 0) {
        // write first error in outputFile to have feedback on client side
        const error = result.errors[0];
        writeErrorInOutputFile(error.text, outputFile);
      } else {
        for (let filename in result.metafile.outputs) {
          console.log(chalk.green(`> bundled\t ${filename}`));
        }
      }
    });
  }
};

async function bundle(inputFile, outputFile, watch) {
  if (!watch) {
    try {
      await esbuild.build({
        entryPoints: [inputFile],
        outfile: outputFile,
        bundle: true,
        format: 'esm',
        minify: true,
        sourcemap: 'linked',
        metafile: true,
        plugins: [esbuildSwcPlugin],
      });
    } catch(err) {
      // just swallow errors as we don't want the process
      // to return on first bundle pass
    }
  } else {
    const ctx = await esbuild.context({
      entryPoints: [inputFile],
      outfile: outputFile,
      bundle: true,
      format: 'esm',
      minify: true,
      sourcemap: 'linked',
      metafile: true,
      plugins: [esbuildSwcPlugin],
    });

    await ctx.watch();
  }
}

/**
 * BUILD STRATEGY
 * -------------------------------------------------------------
 *
 * cf. https://github.com/collective-soundworks/soundworks/issues/23
 *
 * 1. Copy * from `src` into `.build` keeping file system and structure
 *    intact, we keep the copy to allow further support (typescript, etc.)
 *    This allows to not impose further structure to client code.
 * 2. Find browser clients in `src/clients` from `config/application`
 *    and build them into .build/public` using` webpack
 *
 * @note:
 * - exit with error message if `src/public` exists (reserved path)
 * -------------------------------------------------------------
 */
export default async function buildApplication(watch = false) {
  // `src/public` cannot be used, is reserved by build system
  if (fs.existsSync(path.join('src', 'public'))) {
    console.error(chalk.red(`[@soundworks/template-build]
> The path "src/public" is reserved by the application build process.
> Please rename this file or directory, and restart the build process`));
    process.exit(0);
  }

  // 1. Transpile `src` to `.build`
  const compileMsg = `+ ${watch ? 'watching' : 'transpiling'} \`src\` to \`.build\``;
  console.log(chalk.yellow(compileMsg));
  await compile('src', '.build', watch);

  // 2. Build "browser" clients from `src` to `.build/public`
  // Get application config file get list of declared browser clients
  let clientsConfig = null;
  try {
    const configData = fs.readFileSync(path.join(cwd, 'config', 'application.json'));
    clientsConfig = JSON5.parse(configData).clients;
  } catch(err) {
    console.error(chalk.red(`[@soundworks/build] Invalid \`config/application.json\` file`));
    process.exit(1);
  }

  // Find valid "browsers" clients paths
  const clientsSrc = path.join('src', 'clients');
  const filenames = fs.readdirSync(clientsSrc);
  const clients = filenames
    .filter(filename => {
      const clientPath = path.join(clientsSrc, filename);
      const isDir = fs.lstatSync(clientPath).isDirectory();
      return isDir;
    }).filter(dirname => {
      return clientsConfig[dirname] && clientsConfig[dirname].target === 'browser';
    });

  // Bundle all valid declared client
  for (let clientName of clients) {
    const bundleMsg = `+ ${watch ? 'watching' : 'bundling'} browser client "${clientName}"`;
    console.log(chalk.yellow(bundleMsg));

    const inputFile = path.join(cwd, 'src', 'clients', clientName, 'index.js');
    const outputFile = path.join(cwd, '.build', 'public', `${clientName}.js`);

    bundle(inputFile, outputFile, watch);
  }

  process.on('SIGINT', function() {
    console.log(chalk.cyan('\n>>> EXIT'))
    process.exit(0);
  });
}
