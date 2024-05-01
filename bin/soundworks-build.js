#!/usr/bin/env node

import { program } from 'commander';

import buildApplication from '../src/build-application.js';
import watchProcess from '../src/watch-process.js';
import deleteBuild from '../src/delete-build.js';

program
  .option('-b, --build', 'build application')
  .option('-w, --watch', 'watch file system to rebuild application, use in conjunction with --build flag')
  .option('-p, --watch-process <name>', 'restart a node process when its sources')
  .option('-d, --debug', 'watch process with --inspect flag, use in conjunction with --watch-process flag')
  .option('-D, --delete-build', 'delete .build directory')
;

program.parse(process.argv);

const options = program.opts();

if (options.build) {
  buildApplication(options.watch);
}

if (options.watchProcess) {
  watchProcess(options.watchProcess, options.debug);
}

if (options.deleteBuild) {
  deleteBuild();
}

