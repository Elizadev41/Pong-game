const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const game = {
  width: canvas.width,
  height: canvas.height,
  paddle: {
    width: 100,
    height: 18,
    x: canvas.width / 2 - 50,
    y: canvas.height - 28,
  },
  ball: {
    size: 18,
    x: canvas.width / 2,
    y: 180,
    vx: 0,
    vy: 0,
  },
  score: 0,
  best: 0,
  lives: 3,
  state: "welcome",
  countdownStart: 0,
  lastTime: 0,
  mouseX: canvas.width / 2,
};

function resetBall() {
  game.ball.x = game.width / 2;
  game.ball.y = 180;
  game.ball.vx = 0;
  game.ball.vy = 0;
}

function startCountdown(newGame) {
  if (newGame) {
    game.score = 0;
    game.lives = 3;
  }

  game.state = "countdown";
  game.countdownStart = performance.now();
  resetBall();
}

function launchBall() {
  const angle = (Math.random() * 120 + 210) * (Math.PI / 180);
  const speed = 320;
  game.ball.vx = Math.cos(angle) * speed;
  game.ball.vy = Math.sin(angle) * speed;
  game.state = "playing";
}

function updatePaddle() {
  game.paddle.x = Math.max(
    0,
    Math.min(game.mouseX - game.paddle.width / 2, game.width - game.paddle.width)
  );
}

function updateBall(delta) {
  const ball = game.ball;
  const radius = ball.size / 2;

  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  if (ball.x - radius <= 0) {
    ball.x = radius;
    ball.vx *= -1;
  }

  if (ball.x + radius >= game.width) {
    ball.x = game.width - radius;
    ball.vx *= -1;
  }

  if (ball.y - radius <= 0) {
    ball.y = radius;
    ball.vy *= -1;
  }

  const paddle = game.paddle;
  const hitsPaddle =
    ball.vy > 0 &&
    ball.x + radius >= paddle.x &&
    ball.x - radius <= paddle.x + paddle.width &&
    ball.y + radius >= paddle.y &&
    ball.y - radius <= paddle.y + paddle.height;

  if (hitsPaddle) {
    const center = paddle.x + paddle.width / 2;
    const offset = (ball.x - center) / (paddle.width / 2);
    const speed = Math.min(320 + game.score * 18, 620);

    ball.y = paddle.y - radius;
    ball.vx = offset * 260;
    ball.vy = -speed;

    game.score += 1;
    game.best = Math.max(game.best, game.score);
  }

  if (ball.y - radius > game.height) {
    game.lives -= 1;

    if (game.lives <= 0) {
      game.best = Math.max(game.best, game.score);
      game.state = "lost";
      resetBall();
    } else {
      startCountdown(false);
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
  gradient.addColorStop(0, "#dff4f3");
  gradient.addColorStop(1, "#bdd9d7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);
}

function drawPaddle() {
  ctx.fillStyle = "#5f9ea0";
  roundRect(ctx, game.paddle.x, game.paddle.y, game.paddle.width, game.paddle.height, 8);
  ctx.fill();
}

function drawBall() {
  ctx.fillStyle = "#008080";
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawHud() {
  ctx.font = "18px Arial";
  ctx.textBaseline = "top";

  ctx.fillStyle = "#008080";
  ctx.textAlign = "left";
  ctx.fillText("Score: " + game.score, 10, 10);

  ctx.textAlign = "center";
  ctx.fillText("Best: " + game.best, game.width / 2, 10);

  ctx.fillStyle = "#dc3c3c";
  ctx.textAlign = "right";
  ctx.fillText("Lives: " + game.lives, game.width - 10, 10);
}

function drawOverlay(alpha) {
  ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
}

function drawCenteredText(text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, game.width / 2, y);
}

function drawButton(text, x, y, width, height, color) {
  ctx.fillStyle = color;
  roundRect(ctx, x, y, width, height, 22);
  ctx.fill();
  drawCenteredText(text, y + height / 2 + 1, 18, "#ffffff");
}

function drawWelcome(now) {
  drawOverlay(0.5);
  drawCenteredText("Paddle Ball", 120, 36, "#00b4b4");
  drawCenteredText("Keep the ball in the air.", 180, 16, "#ffffff");
  drawCenteredText("Do not let it touch the ground.", 205, 16, "#ffffff");
  drawCenteredText("You start with 3 lives.", 250, 14, "#ffdc00");
  drawCenteredText("The ball speeds up as your score grows.", 272, 14, "#ffdc00");
  drawCenteredText("Move the mouse to control the paddle.", 294, 14, "#ffdc00");

  const pulse = (Math.sin(now / 300) + 1) / 2;
  const color = pulse > 0.5 ? "#00c8c8" : "#00a0a0";
  drawButton("PLAY", game.width / 2 - 80, 330, 160, 44, color);
}

function drawCountdown(now) {
  drawHud();
  drawOverlay(0.35);

  const elapsed = (now - game.countdownStart) / 1000;
  const num = 3 - Math.floor(elapsed);

  if (num <= 0) {
    launchBall();
    return;
  }

  drawCenteredText("Get ready!", 150, 20, "#ffffff");
  drawCenteredText(String(num), 220, 90, "#ffdc00");
}

function drawLost() {
  drawHud();
  drawOverlay(0.55);
  drawCenteredText("You Lose!", 140, 38, "#dc3c3c");
  drawCenteredText("Final Score: " + game.score, 195, 20, "#ffffff");
  drawCenteredText("Best: " + game.best, 230, 18, "#ffdc00");
  drawButton("PLAY AGAIN", game.width / 2 - 80, 300, 160, 44, "#00b4b4");
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function animate(now) {
  const delta = Math.min((now - game.lastTime) / 1000 || 0, 0.033);
  game.lastTime = now;

  updatePaddle();
  drawBackground();
  drawPaddle();

  if (game.state === "playing") {
    drawBall();
    updateBall(delta);
    drawHud();
  } else if (game.state === "countdown") {
    drawBall();
    drawCountdown(now);
  } else if (game.state === "lost") {
    drawBall();
    drawLost();
  } else {
    drawWelcome(now);
  }

  requestAnimationFrame(animate);
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  game.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;

  const playButton =
    game.state === "welcome" &&
    clickX >= game.width / 2 - 80 &&
    clickX <= game.width / 2 + 80 &&
    clickY >= 330 &&
    clickY <= 374;

  const replayButton =
    game.state === "lost" &&
    clickX >= game.width / 2 - 80 &&
    clickX <= game.width / 2 + 80 &&
    clickY >= 300 &&
    clickY <= 344;

  if (playButton || replayButton) {
    startCountdown(true);
  }
});

requestAnimationFrame(animate);
