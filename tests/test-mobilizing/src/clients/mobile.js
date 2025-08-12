import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import pluginSketchManager from '@mobilizing/soundworks-plugin-sketch-manager/client.js';
import { html, render } from 'lit';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx @mobilizing/platform`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);
  let imported = false;;

  client.pluginManager.register('sketch-manager', pluginSketchManager, {
    root: $container,
    import: async (sketch) => {
      const { default: SketchClass } = await import(
        `../sketches/${sketch}/clients/${client.role}/index.js`
      );

      // if import fails, we don't go here
      imported = true;

      return SketchClass;
    },
  });


  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();
  console.log('after start', client);

  // throw new Error('test line 38');

  const test = await client.stateManager.attach('test');
  if (imported !== null) {
    console.log('send browser ack');
    await test.set({ browserAck: true });
  }

  function renderApp() {
    render(html`
      <div class='simple-layout'>
        <p>Hello ${client.config.app.name}!</p>

        <sw-credits .infos='${client.config.app}'></sw-credits>
      </div>
    `, $container);
  }

  renderApp();

  // Handle sketch activation/deactivation.
  const sketchManager = await client.pluginManager.get('sketch-manager');
  sketchManager.on('sketchactivated', (_sketchName, _sketchInstance) => {
    // Do something when a sketch is activated
  });
  sketchManager.on('sketchdeactivated', (_sketchName, _sketchInstance) => {
    // Do something when a sketch is deactivated
  });
  sketchManager.activeSketches.forEach((_sketchName) => {
    // Do something with already active sketches
    // const sketchInstance = sketchManager.getSketchInstance(_sketchName);
  });
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
