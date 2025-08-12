import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function bootstrap() {
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // https://soundworks.dev/tools/helpers.html#nodelauncher
  launcher.register(client);

  await client.start();

  const test = await client.stateManager.attach('test');

  let sum = 0;

  // dynamic import
  const { dynamicImport } = await import(`../imports/dynamic-import.js`);
  sum += dynamicImport(); // +1

  // variable dynamic import
  const testImport = 'dynamic-import-var';
  const { dynamicImportVar } = await import(`../imports/${testImport}.js`);
  sum += dynamicImportVar(); // +2

  // blob dynamic import - plugin-scripting
  const blobImport = `\
export function dynamicBlobImport() {
  console.log('dynamic blob import, ok!');
  return 3;
}`;
  const url = 'data:text/javascript;base64,' + btoa(blobImport)
  const { dynamicBlobImport } =  await import(/* webpackIgnore: true */url);
  sum += dynamicBlobImport();

  test.set({ nodeResult: sum });
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
