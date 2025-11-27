import { Physics } from './physics.js';
import { Rendering } from './rendering.js';
import { Controls } from './controls.js';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.physics = new Physics();
    this.rendering = new Rendering(canvas);
    this.controls = new Controls(canvas, this.physics);
  }

  start() {
    this.rendering.init();
    this.controls.init();
    this.gameLoop();
  }

  gameLoop() {
    this.physics.update();
    this.rendering.render(this.physics.state);
    requestAnimationFrame(() => this.gameLoop());
  }
}
