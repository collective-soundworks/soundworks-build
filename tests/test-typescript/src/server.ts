import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { Server, type ServerConfig } from '@soundworks/core/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const config: ServerConfig = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

config.env.verbose = false;
const server = new Server(config);
configureHttpRouter(server);

server.stateManager.defineClass('test', {
  browserResult: {
    type: 'integer',
    default: 0,
  },
  nodeResult: {
    type: 'integer',
    default: 0,
  },
});

await server.start();

const test = await server.stateManager.create('test');
test.onUpdate(updates => {
  if ('browserResult' in updates) {
    if (updates.browserResult === 6) {
      console.log('> browser result is valid');
      process.send('browser result is valid');
    } else {
      console.log('> browser result is invalid');
      process.send('browser result is invalid');
    }
  }

  if ('nodeResult' in updates) {
    if (updates.nodeResult === 6) {
      console.log('> node result is valid');
      process.send('node result is valid');
    } else {
      console.log('> node result is invalid');
      process.send('node result is invalid');
    }
  }
});


