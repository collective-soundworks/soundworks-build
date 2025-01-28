import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';

import PluginCheckin from '@soundworks/plugin-checkin/client.js';
import PluginFilesystem from '@soundworks/plugin-filesystem/client.js';
import PluginLogger from '@soundworks/plugin-logger/client.js';
import PluginPlatformInit from '@soundworks/plugin-platform-init/client.js';
import PluginPosition from '@soundworks/plugin-position/client.js';
import PluginSync from '@soundworks/plugin-sync/client.js';
import PluginScripting from '@soundworks/plugin-scripting/client.js';

import * as webaudio from 'node-web-audio-api';
import * as utils from '@ircam/sc-utils';
import * as scheduling from '@ircam/sc-scheduling';

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

  console.log(`Hello ${client.config.app.name}!`);
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
