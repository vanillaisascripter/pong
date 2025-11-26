const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const paddleWidth = 10;
const paddleHeight = 80;
const ballSize = 10;

const left = {
  x: 20,
  y: canvas.height / 2 - paddleHeight / 2,
  dy: 0,
  score: 0
};

const right = {
  x: canvas.width - 20 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  dy: 0,
  score: 0
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  dx: 4,
  dy: 3
};

const keys = {};

document.addEventListener("keydown", e => (keys[e.key] = true));
document.addEventListener("keyup", e => (keys[e.key] = false));

// TOUCH CONTROLS
function handleTouch(e) {
  const rect = canvas.getBoundingClientRect();
  const touches = e.touches;

  left.dy = 0;
  right.dy = 0;

  for (let i = 0; i < touches.length; i++) {
    const x = touches[i].clientX - rect.left;
    const y = touches[i].clientY - rect.top;

    const isLeftSide = x < canvas.width / 2;

    if (isLeftSide) {
      if (y < left.y) left.dy = -5;
      else if (y > left.y + paddleHeight) left.dy = 5;
    } else {
      if (y < right.y) right.dy = -5;
      else if (y > right.y + paddleHeight) right.dy = 5;
    }
  }

  e.preventDefault();
}

canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });
canvas.addEventListener("touchend", e => {
  left.dy = 0;
  right.dy = 0;
  e.preventDefault();
});

function update() {
  // Keyboard controls (still active on desktop)
  if (keys["w"]) left.dy = -5;
  else if (keys["s"]) left.dy = 5;
  else if (!("ontouchstart" in window)) left.dy = 0;

  if (keys["ArrowUp"]) right.dy = -5;
  else if (keys["ArrowDown"]) right.dy = 5;
  else if (!("ontouchstart" in window)) right.dy = 0;

  left.y += left.dy;
  right.y += right.dy;

  left.y = Math.max(0, Math.min(canvas.height - paddleHeight, left.y));
  right.y = Math.max(0, Math.min(canvas.height - paddleHeight, right.y));

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.y <= 0 || ball.y + ballSize >= canvas.height) {
    ball.dy = -ball.dy;
  }

  if (
    ball.x <= left.x + paddleWidth &&
    ball.y + ballSize >= left.y &&
    ball.y <= left.y + paddleHeight
  ) {
    ball.dx = Math.abs(ball.dx);
  }

  if (
    ball.x + ballSize >= right.x &&
    ball.y + ballSize >= right.y &&
    ball.y <= right.y + paddleHeight
  ) {
    ball.dx = -Math.abs(ball.dx);
  }

  if (ball.x < 0) {
    right.score++;
    resetBall(-1);
  } else if (ball.x > canvas.width) {
    left.score++;
    resetBall(1);
  }
}

function resetBall(direction) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.dx = 4 * direction;
  ball.dy = 3 * (Math.random() > 0.5 ? 1 : -1);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  for (let y = 0; y < canvas.height; y += 20) {
    ctx.fillRect(canvas.width / 2 - 1, y, 2, 10);
  }

  ctx.fillRect(left.x, left.y, paddleWidth, paddleHeight);
  ctx.fillRect(right.x, right.y, paddleWidth, paddleHeight);

  ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillText(left.score, canvas.width / 4, 40);
  ctx.fillText(right.score, (canvas.width * 3) / 4, 40);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
