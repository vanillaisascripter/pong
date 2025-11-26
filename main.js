const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// --- NATIVE (LARGE) PLAYFIELD --- //
const NATIVE_WIDTH = 1280;
const NATIVE_HEIGHT = 720;
let scale = 1;

// Fit canvas to screen but keep aspect ratio
function resize() {
  const deviceW = window.innerWidth;
  const deviceH = window.innerHeight;
  const scaleFit = Math.min(deviceW / NATIVE_WIDTH, deviceH / NATIVE_HEIGHT); // show all playfield [web:70][web:79]

  scale = scaleFit;
  canvas.width = deviceW;
  canvas.height = deviceH;

  ctx.setTransform(scale, 0, 0, scale, (deviceW - NATIVE_WIDTH * scale) / 2, (deviceH - NATIVE_HEIGHT * scale) / 2);
}
window.addEventListener("resize", resize);
resize();

// --- GAME CONSTANTS (IN NATIVE UNITS) --- //
const paddleWidth = 20;
const paddleHeight = 160;
const paddleForwardRange = 40; // how far toward center paddles can move
const ballSize = 20;

const baseBallSpeed = 10;
let ballSpeed = baseBallSpeed;

const maxBounceAngle = Math.PI / 3; // 60 degrees [web:65][web:68]

// paddles can move both vertically and slightly horizontally
const paddleSpeedY = 16;
const paddleSpeedX = 8;

// --- GAME OBJECTS --- //
const left = { x: 60, y: NATIVE_HEIGHT / 2 - paddleHeight / 2, vx: 0, vy: 0, score: 0 };
const right = { x: NATIVE_WIDTH - 60 - paddleWidth, y: NATIVE_HEIGHT / 2 - paddleHeight / 2, vx: 0, vy: 0, score: 0 };

const ball = {
  x: NATIVE_WIDTH / 2 - ballSize / 2,
  y: NATIVE_HEIGHT / 2 - ballSize / 2,
  vx: baseBallSpeed,
  vy: 0
};

// --- TOUCH INPUT STATE --- //
let touches = [];

canvas.addEventListener("touchstart", e => {
  handleTouch(e);
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  handleTouch(e);
}, { passive: false });

canvas.addEventListener("touchend", e => {
  touches = Array.from(e.touches);
  stopPaddlesIfNoTouch();
  e.preventDefault();
}, { passive: false });

function handleTouch(e) {
  e.preventDefault();
  touches = Array.from(e.touches);

  // Reset desired velocities each frame
  left.vx = 0;
  left.vy = 0;
  right.vx = 0;
  right.vy = 0;

  const rect = canvas.getBoundingClientRect();

  touches.forEach(t => {
    const screenX = t.clientX - rect.left;
    const screenY = t.clientY - rect.top;

    // convert from screen to game coordinates
    const gameX = (screenX - (canvas.width - NATIVE_WIDTH * scale) / 2) / scale;
    const gameY = (screenY - (canvas.height - NATIVE_HEIGHT * scale) / 2) / scale;

    const isLeftSide = gameX < NATIVE_WIDTH / 2;

    const paddle = isLeftSide ? left : right;

    // vertical movement: move paddle toward touch Y
    if (gameY < paddle.y + paddleHeight / 2 - 10) {
      paddle.vy = -paddleSpeedY;
    } else if (gameY > paddle.y + paddleHeight / 2 + 10) {
      paddle.vy = paddleSpeedY;
    }

    // horizontal "forward/back": swiping horizontally moves paddle a bit toward/away from center
    const centerX = isLeftSide ? 80 : NATIVE_WIDTH - 80 - paddleWidth;
    const forwardDir = isLeftSide ? 1 : -1; // toward center
    const offsetFromHome = (paddle.x - centerX) * forwardDir;

    if (gameX * forwardDir > centerX * forwardDir + 15 && offsetFromHome < paddleForwardRange) {
      paddle.vx = paddleSpeedX * forwardDir; // move toward center
    } else if (gameX * forwardDir < centerX * forwardDir - 15 && offsetFromHome > -paddleForwardRange) {
      paddle.vx = -paddleSpeedX * forwardDir; // move back
    }
  });
}

function stopPaddlesIfNoTouch() {
  if (touches.length === 0) {
    left.vx = left.vy = 0;
    right.vx = right.vy = 0;
  }
}

// --- GAME LOGIC --- //
function resetBall(direction) {
  ball.x = NATIVE_WIDTH / 2 - ballSize / 2;
  ball.y = NATIVE_HEIGHT / 2 - ballSize / 2;
  ballSpeed = baseBallSpeed;
  ball.vx = direction * ballSpeed;
  ball.vy = 0;
}

function updatePaddle(p) {
  p.x += p.vx;
  p.y += p.vy;

  // clamp vertical
  if (p.y < 0) p.y = 0;
  if (p.y + paddleHeight > NATIVE_HEIGHT) p.y = NATIVE_HEIGHT - paddleHeight;

  // clamp horizontal to small band
  const isLeft = p === left;
  const homeX = isLeft ? 80 : NATIVE_WIDTH - 80 - paddleWidth;
  const forwardDir = isLeft ? 1 : -1;
  const offset = (p.x - homeX) * forwardDir;
  if (offset > paddleForwardRange) p.x = homeX + paddleForwardRange * forwardDir;
  if (offset < -paddleForwardRange) p.x = homeX - paddleForwardRange * forwardDir;
}

function update() {
  updatePaddle(left);
  updatePaddle(right);

  ball.x += ball.vx;
  ball.y += ball.vy;

  // top/bottom bounce
  if (ball.y <= 0) {
    ball.y = 0;
    ball.vy = -ball.vy;
  } else if (ball.y + ballSize >= NATIVE_HEIGHT) {
    ball.y = NATIVE_HEIGHT - ballSize;
    ball.vy = -ball.vy;
  }

  // paddle collision with better physics
  checkPaddleCollision(left, 1);
  checkPaddleCollision(right, -1);

  // scoring
  if (ball.x + ballSize < 0) {
    right.score++;
    resetBall(1);
  } else if (ball.x > NATIVE_WIDTH) {
    left.score++;
    resetBall(-1);
  }
}

function checkPaddleCollision(paddle, direction) {
  // direction: +1 for left paddle (ball moving right), -1 for right paddle
  if (
    ball.x < paddle.x + paddleWidth &&
    ball.x + ballSize > paddle.x &&
    ball.y < paddle.y + paddleHeight &&
    ball.y + ballSize > paddle.y
  ) {
    // Compute hit position on paddle (-1 top, 0 center, 1 bottom) [web:65][web:68][web:77]
    const paddleCenter = paddle.y + paddleHeight / 2;
    const ballCenter = ball.y + ballSize / 2;
    const relativeY = (ballCenter - paddleCenter) / (paddleHeight / 2);
    const clampedRelY = Math.max(-1, Math.min(1, relativeY));

    // Base bounce angle
    let bounceAngle = clampedRelY * maxBounceAngle;

    // Speed up a bit each hit
    ballSpeed *= 1.05;

    // Extra boost if paddle moving toward ball [web:71][web:78]
    const relativeVX = paddle.vx * direction; // >0 means paddle moving into ball
    if (relativeVX > 0) {
      ballSpeed *= 1 + Math.min(relativeVX / 20, 0.25);
    }

    // New velocity from angle
    ball.vx = direction * ballSpeed * Math.cos(bounceAngle);
    ball.vy = ballSpeed * Math.sin(bounceAngle);

    // Move ball outside paddle to avoid sticking
    if (direction === 1) {
      ball.x = paddle.x + paddleWidth;
    } else {
      ball.x = paddle.x - ballSize;
    }
  }
}

// --- RENDERING (IN NATIVE SPACE, SCALED BY TRANSFORM) --- //
function draw() {
  ctx.clearRect(0, 0, canvas.width / scale, canvas.height / scale);

  ctx.fillStyle = "white";

  // center dashed line
  for (let y = 0; y < NATIVE_HEIGHT; y += 50) {
    ctx.fillRect(NATIVE_WIDTH / 2 - 3, y, 6, 25);
  }

  // paddles and ball
  ctx.fillRect(left.x, left.y, paddleWidth, paddleHeight);
  ctx.fillRect(right.x, right.y, paddleWidth, paddleHeight);
  ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

  // scores
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText(left.score, NATIVE_WIDTH * 0.25, 80);
  ctx.fillText(right.score, NATIVE_WIDTH * 0.75, 80);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
