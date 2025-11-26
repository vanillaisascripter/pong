const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// Resize canvas to fit screen with 16:9 area
function resize() {
  const ratio = 16 / 9;
  let w = window.innerWidth;
  let h = window.innerHeight;

  if (w / h > ratio) {
    w = h * ratio;
  } else {
    h = w / ratio;
  }

  canvas.width = w;
  canvas.height = h;
}
window.addEventListener("resize", () => {
  resize();
  setSizes();
  initPositions();
});
resize();

// Dynamic sizes based on canvas
let paddleWidth, paddleHeight, ballSize, paddleSpeed, ballSpeedX, ballSpeedY;

function setSizes() {
  paddleWidth = canvas.width * 0.02;
  paddleHeight = canvas.height * 0.2;
  ballSize = canvas.width * 0.02;
  paddleSpeed = canvas.height * 0.02;
  ballSpeedX = canvas.width * 0.012;
  ballSpeedY = canvas.height * 0.012;
}
setSizes();

const left = { x: 0, y: 0, dy: 0, score: 0 };
const right = { x: 0, y: 0, dy: 0, score: 0 };
const ball = { x: 0, y: 0, dx: 0, dy: 0 };

function initPositions() {
  left.x = canvas.width * 0.05;
  left.y = canvas.height / 2 - paddleHeight / 2;
  right.x = canvas.width * 0.95 - paddleWidth;
  right.y = canvas.height / 2 - paddleHeight / 2;
  resetBall(Math.random() > 0.5 ? 1 : -1);
}

function resetBall(direction) {
  ball.x = canvas.width / 2 - ballSize / 2;
  ball.y = canvas.height / 2 - ballSize / 2;
  ball.dx = ballSpeedX * direction;
  ball.dy = ballSpeedY * (Math.random() > 0.5 ? 1 : -1);
}
initPositions();

// TOUCH: drag on left/right half to move that paddle
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
      if (y < left.y) left.dy = -paddleSpeed;
      else if (y > left.y + paddleHeight) left.dy = paddleSpeed;
    } else {
      if (y < right.y) right.dy = -paddleSpeed;
      else if (y > right.y + paddleHeight) right.dy = paddleSpeed;
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

  if (ball.x + ballSize < 0) {
    right.score++;
    resetBall(1);
  } else if (ball.x > canvas.width) {
    left.score++;
    resetBall(-1);
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";

  // center dashed line
  for (let y = 0; y < canvas.height; y += canvas.height * 0.08) {
    ctx.fillRect(canvas.width / 2 - 1, y, 2, canvas.height * 0.04);
  }

  ctx.fillRect(left.x, left.y, paddleWidth, paddleHeight);
  ctx.fillRect(right.x, right.y, paddleWidth, paddleHeight);
  ctx.fillRect(ball.x, ball.y, ballSize, ballSize);

  ctx.font = `${canvas.height * 0.08}px Arial`;
  ctx.textAlign = "center";
  ctx.fillText(left.score, canvas.width * 0.25, canvas.height * 0.12);
  ctx.fillText(right.score, canvas.width * 0.75, canvas.height * 0.12);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
