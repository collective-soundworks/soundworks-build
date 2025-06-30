import '@soundworks/helpers/polyfills.js';
import { Server } from '@soundworks/core/server.js';
import { loadConfig } from '@soundworks/helpers/node.js';

import '../utils/catch-unhandled-errors.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config = loadConfig(process.env.ENV, import.meta.url);
config.verbose = false;

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

const server = new Server({
  app: config.app,
  env: {
    ...config.env,
    // verbose: false,
  },
});
// configure the server for usage within this application template
server.useDefaultApplicationTemplate();

server.stateManager.registerSchema('test', {
  browserAck: {
    type: 'boolean',
    default: false,
  },
  nodeAck: {
    type: 'boolean',
    default: false,
  },
});

await server.start();

const test = await server.stateManager.create('test');
test.onUpdate(updates => {
  if (updates.browserAck === true) {
    console.log('> Browser ack received');
    process.send('browser ack received');
  }
  if (updates.nodeAck === true) {
    console.log('> Node ack received');
    process.send('node ack received');
  }
});


