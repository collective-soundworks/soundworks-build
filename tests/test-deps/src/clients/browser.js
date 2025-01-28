import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

import PluginCheckin from '@soundworks/plugin-checkin/client.js';
import PluginFilesystem from '@soundworks/plugin-filesystem/client.js';
import PluginLogger from '@soundworks/plugin-logger/client.js';
import PluginPlatformInit from '@soundworks/plugin-platform-init/client.js';
import PluginPosition from '@soundworks/plugin-position/client.js';
import PluginSync from '@soundworks/plugin-sync/client.js';
import PluginScripting from '@soundworks/plugin-scripting/client.js';

import devicemotion from '@ircam/devicemotion';
import * as scheduling from '@ircam/sc-scheduling';
import * as utils from '@ircam/sc-utils';
import '@ircam/sc-components';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>

        <sw-credits .infos="${client.config.app}"></sw-credits>
      </div>
    `, $container);
  }

  renderApp();
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
