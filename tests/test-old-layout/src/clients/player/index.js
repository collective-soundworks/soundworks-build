import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const test = await client.stateManager.attach('test');
  test.set({ browserAck: true });

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>
      </div>
    `, $container);
  }

  renderApp();
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate')) || 1,
});
