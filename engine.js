// Simple classes for game objects
class Paddle {
  constructor(x, y, w, h, isLeft) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.score = 0;
    this.isLeft = isLeft;
    this.homeX = x;
    this.maxForward = 40; // how far toward center you can move
  }
}

class Ball {
  constructor(x, y, size, baseSpeed) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.baseSpeed = baseSpeed;
    this.speed = baseSpeed;
    this.vx = baseSpeed;
    this.vy = 0;
    this.spin = 0; // simple scalar spin: >0 topspin, <0 backspin [web:88][web:89]
  }
}

class InputSystem {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.engine = engine;
    this.touches = [];

    canvas.addEventListener(
      "touchstart",
      e => this.handleTouch(e),
      { passive: false }
    );
    canvas.addEventListener(
      "touchmove",
      e => this.handleTouch(e),
      { passive: false }
    );
    canvas.addEventListener(
      "touchend",
      e => this.handleEnd(e),
      { passive: false }
    );
  }

  screenToGame(x, y) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = x - rect.left;
    const sy = y - rect.top;
    const gameX =
      (sx - (this.canvas.width - this.engine.width * this.engine.scale) / 2) /
      this.engine.scale;
    const gameY =
      (sy - (this.canvas.height - this.engine.height * this.engine.scale) / 2) /
      this.engine.scale;
    return { x: gameX, y: gameY };
  }

  handleTouch(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
  }

  handleEnd(e) {
    e.preventDefault();
    this.touches = Array.from(e.touches);
    if (this.touches.length === 0) {
      this.engine.left.vx = this.engine.left.vy = 0;
      this.engine.right.vx = this.engine.right.vy = 0;
    }
  }

  update() {
    const left = this.engine.left;
    const right = this.engine.right;
    const paddleSpeedY = this.engine.paddleSpeedY;
    const paddleSpeedX = this.engine.paddleSpeedX;

    left.vx = left.vy = 0;
    right.vx = right.vy = 0;

    this.touches.forEach(t => {
      const { x, y } = this.screenToGame(t.clientX, t.clientY);
      const isLeftSide = x < this.engine.width / 2;
      const p = isLeftSide ? left : right;

      // Vertical: move toward finger
      if (y < p.y + p.h / 2 - 10) p.vy = -paddleSpeedY;
      else if (y > p.y + p.h / 2 + 10) p.vy = paddleSpeedY;

      // Forward/back movement
      const dirToCenter = p.isLeft ? 1 : -1;
      const offset = (p.x - p.homeX) * dirToCenter;

      if (x * dirToCenter > p.homeX * dirToCenter + 15 && offset < p.maxForward) {
        p.vx = paddleSpeedX * dirToCenter;
      } else if (
        x * dirToCenter < p.homeX * dirToCenter - 15 &&
        offset > -p.maxForward
      ) {
        p.vx = -paddleSpeedX * dirToCenter;
      }
    });
  }
}

class PhysicsSystem {
  constructor(engine) {
    this.engine = engine;
    this.maxBounceAngle = Math.PI / 3; // 60° [web:65][web:68]
    this.spinFactor = 0.003; // how strongly spin curves the path [web:88][web:89]
    this.spinDecay = 0.98;   // spin slowly fades
  }

  resetBall(direction) {
    const { width, height } = this.engine;
    const b = this.engine.ball;
    b.x = width / 2 - b.size / 2;
    b.y = height / 2 - b.size / 2;
    b.speed = b.baseSpeed;
    b.vx = direction * b.speed;
    b.vy = 0;
    b.spin = 0;
  }

  update(dt) {
    const e = this.engine;
    const l = e.left;
    const r = e.right;
    const b = e.ball;

    // Move paddles
    this.updatePaddle(l, dt);
    this.updatePaddle(r, dt);

    // Ball motion with simple spin influence (curves Y slightly) [web:88][web:89][web:94]
    b.x += b.vx * dt * 60;
    b.y += (b.vy + b.spin * this.spinFactor * e.height) * dt * 60;
    b.spin *= this.spinDecay;

    // Wall collisions
    if (b.y <= 0) {
      b.y = 0;
      b.vy = Math.abs(b.vy);
      b.spin = -b.spin * 0.5; // invert some spin at the table edge
    } else if (b.y + b.size >= e.height) {
      b.y = e.height - b.size;
      b.vy = -Math.abs(b.vy);
      b.spin = -b.spin * 0.5;
    }

    // Paddle collisions
    this.checkPaddleCollision(l, 1);
    this.checkPaddleCollision(r, -1);

    // Scoring
    if (b.x + b.size < 0) {
      r.score++;
      this.resetBall(1);
    } else if (b.x > e.width) {
      l.score++;
      this.resetBall(-1);
    }
  }

  updatePaddle(p, dt) {
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;

    // Clamp vertical
    if (p.y < 0) p.y = 0;
    if (p.y + p.h > this.engine.height) p.y = this.engine.height - p.h;

    // Clamp horizontal around homeX
    const dirToCenter = p.isLeft ? 1 : -1;
    const offset = (p.x - p.homeX) * dirToCenter;
    if (offset > p.maxForward) p.x = p.homeX + p.maxForward * dirToCenter;
    if (offset < -p.maxForward) p.x = p.homeX - p.maxForward * dirToCenter;
  }

  checkPaddleCollision(p, direction) {
    const b = this.engine.ball;

    if (
      b.x < p.x + p.w &&
      b.x + b.size > p.x &&
      b.y < p.y + p.h &&
      b.y + b.size > p.y
    ) {
      // Where on paddle did we hit? (-1 top, 0 middle, 1 bottom) [web:65][web:77]
      const paddleCenter = p.y + p.h / 2;
      const ballCenter = b.y + b.size / 2;
      const rel = (ballCenter - paddleCenter) / (p.h / 2);
      const relClamped = Math.max(-1, Math.min(1, rel));

      let angle = relClamped * this.maxBounceAngle;

      // Increase speed a bit each hit [web:78]
      b.speed *= 1.05;

      // Extra boost if paddle moving into ball
      const relVx = p.vx * direction;
      if (relVx > 0) {
        b.speed *= 1 + Math.min(relVx / 50, 0.25);
      }

      // Add spin based on paddle vertical motion and hit offset
      b.spin += p.vy * relClamped * 0.1;

      b.vx = direction * b.speed * Math.cos(angle);
      b.vy = b.speed * Math.sin(angle);

      // Nudge ball outside paddle
      if (direction === 1) {
        b.x = p.x + p.w;
      } else {
        b.x = p.x - b.size;
      }
    }
  }
}

class RenderSystem {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  render(engine) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = "white";

    // Center dashed line
    for (let y = 0; y < this.height; y += 50) {
      ctx.fillRect(this.width / 2 - 3, y, 6, 25);
    }

    // Paddles
    ctx.fillRect(engine.left.x, engine.left.y, engine.left.w, engine.left.h);
    ctx.fillRect(engine.right.x, engine.right.y, engine.right.w, engine.right.h);

    // Ball
    ctx.fillRect(engine.ball.x, engine.ball.y, engine.ball.size, engine.ball.size);

    // Scores
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.fillText(engine.left.score, this.width * 0.25, 80);
    ctx.fillText(engine.right.score, this.width * 0.75, 80);
  }
}

export class Engine {
  constructor(canvas, ctx, width, height) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.scale = 1;

    // Config
    this.paddleSpeedY = 16;
    this.paddleSpeedX = 8;

    const paddleW = 20;
    const paddleH = 160;
    const ballSize = 20;
    const baseBallSpeed = 10;

    this.left = new Paddle(80, height / 2 - paddleH / 2, paddleW, paddleH, true);
    this.right = new Paddle(
      width - 80 - paddleW,
      height / 2 - paddleH / 2,
      paddleW,
      paddleH,
      false
    );
    this.ball = new Ball(
      width / 2 - ballSize / 2,
      height / 2 - ballSize / 2,
      ballSize,
      baseBallSpeed
    );

    this.input = new InputSystem(canvas, this);
    this.physics = new PhysicsSystem(this);
    this.renderer = new RenderSystem(ctx, width, height);
  }

  onResize(width, height) {
    this.width = width;
    this.height = height;
  }

  update(dt) {
    this.input.update();
    this.physics.update(dt);
  }

  render() {
    this.renderer.render(this);
  }
       }
