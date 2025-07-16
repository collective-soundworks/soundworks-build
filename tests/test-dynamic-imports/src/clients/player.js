import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  launcher.register(client, { initScreensContainer: $container });

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
  const file = new File([blobImport], 'dynamic-blob-import.js', { type: 'text/javascript' });
  const url = URL.createObjectURL(file);
  const { dynamicBlobImport } =  await import(/* webpackIgnore: true */url);
  sum += dynamicBlobImport();

  test.set({ browserResult: sum });

  render(html`
    <div class="simple-layout">
      <p>Hello ${client.config.app.name}!</p>

      <sw-credits .infos="${client.config.app}"></sw-credits>
    </div>
  `, $container);
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
