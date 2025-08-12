import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Server } from '@soundworks/core/server.js';
import pluginSketchManager from '@mobilizing/soundworks-plugin-sketch-manager/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

const config = loadConfig(process.env.ENV, import.meta.url);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

config.env.verbose = false;
const server = new Server(config);
configureHttpRouter(server);

server.pluginManager.register('sketch-manager', pluginSketchManager, {
  directory: resolve(dirname(fileURLToPath(import.meta.url)), './sketches'),
});

server.stateManager.defineClass('test', {
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

// Activate the first sketch.
const sketchManager = await server.pluginManager.get('sketch-manager');
const firstSketch = Object.keys(sketchManager.sketches).at(0);
if (firstSketch) {
  sketchManager.activateSketch(firstSketch);
}

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
