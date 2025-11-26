import { Engine } from "./engine.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Native resolution (big playfield)
const NATIVE_WIDTH = 1280;
const NATIVE_HEIGHT = 720;
let scale = 1;

// Fit canvas to screen while keeping aspect ratio [web:70][web:79]
function resize(engine) {
  const deviceW = window.innerWidth;
  const deviceH = window.innerHeight;
  const scaleFit = Math.min(deviceW / NATIVE_WIDTH, deviceH / NATIVE_HEIGHT);

  scale = scaleFit;
  canvas.width = deviceW;
  canvas.height = deviceH;

  ctx.setTransform(
    scale,
    0,
    0,
    scale,
    (deviceW - NATIVE_WIDTH * scale) / 2,
    (deviceH - NATIVE_HEIGHT * scale) / 2
  );

  if (engine) engine.onResize(NATIVE_WIDTH, NATIVE_HEIGHT);
}

const engine = new Engine(canvas, ctx, NATIVE_WIDTH, NATIVE_HEIGHT);
resize(engine);
window.addEventListener("resize", () => resize(engine));

// Main loop (fixed‑timestep physics is overkill here; simple frame‑based is fine) [web:103][web:119]
let lastTime = 0;
function loop(timestamp) {
  const dt = (timestamp - lastTime) / 1000 || 0;
  lastTime = timestamp;
  engine.update(dt);
  engine.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
