import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { Server } from '@soundworks/core/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

import PluginCheckin from '@soundworks/plugin-checkin/server.js';
import PluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import PluginLogger from '@soundworks/plugin-logger/server.js';
import PluginPlatformInit from '@soundworks/plugin-platform-init/server.js';
import PluginPosition from '@soundworks/plugin-position/server.js';
import PluginSync from '@soundworks/plugin-sync/server.js';
import PluginScripting from '@soundworks/plugin-scripting/server.js';

import * as webaudio from 'node-web-audio-api';
import * as utils from '@ircam/sc-utils';
import * as scheduling from '@ircam/sc-scheduling';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

const server = new Server(config);
configureHttpRouter(server);

// Register plugins and create shared state classes
// server.pluginManager.register('my-plugin', plugin);
// server.stateManager.defineClass('my-class', description);

await server.start();

// and do your own stuff!
