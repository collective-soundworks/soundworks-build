import ClientSketch from '@mobilizing/soundworks-plugin-sketch-manager/ClientSketch.js';
import { html, render, nothing } from 'lit';

export default class extends ClientSketch {
  #renderApp(clear = false) {
    render(clear ? nothing : html`
      <div class="simple-layout">
        <p>Sketch ${this.name}!</p>
      </div>
    `, this.container);
  }

  /**
   * @inheritdoc
   */
  async start() {
    await super.start();
    this.#renderApp();
  }

  /**
   * @inheritdoc
   */
  async stop() {
    this.#renderApp(true);
    await super.stop();
  }
}
