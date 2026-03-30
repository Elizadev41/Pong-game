const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const STORAGE_KEY = "paddle-ball-best-score";

const game = {
  width: canvas.width,
  height: canvas.height,
  paddle: {
    baseWidth: 110,
    minWidth: 62,
    width: 110,
    height: 18,
    x: canvas.width / 2 - 55,
    y: canvas.height - 30,
    speed: 420,
  },
  ball: {
    size: 18,
    x: canvas.width / 2,
    y: 185,
    vx: 0,
    vy: 0,
    speed: 320,
  },
  particles: [],
  stars: [],
  score: 0,
  best: loadBestScore(),
  lives: 3,
  state: "welcome",
  pausedFromState: "playing",
  countdownStart: 0,
  lastTime: 0,
  mouseX: canvas.width / 2,
  lastMouseMove: 0,
  activeControl: "mouse",
  keys: {
    left: false,
    right: false,
  },
  menuButtons: {
    play: { x: 120, y: 250, w: 160, h: 46 },
    how: { x: 120, y: 308, w: 160, h: 46 },
    back: { x: 120, y: 324, w: 160, h: 46 },
  },
};

createStars();
resetBall();

function loadBestScore() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = Number(stored);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function saveBestScore() {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(game.best));
  } catch {}
}

function createStars() {
  for (let i = 0; i < 32; i += 1) {
    game.stars.push({
      x: Math.random() * game.width,
      y: Math.random() * game.height,
      size: Math.random() * 2.4 + 0.8,
      speed: Math.random() * 16 + 8,
      alpha: Math.random() * 0.5 + 0.25,
    });
  }
}

function resetBall() {
  game.ball.x = game.width / 2;
  game.ball.y = 185;
  game.ball.vx = 0;
  game.ball.vy = 0;
}

function resetPaddle() {
  game.paddle.width = game.paddle.baseWidth;
  game.paddle.x = game.width / 2 - game.paddle.width / 2;
}

function startCountdown(newGame) {
  if (newGame) {
    game.score = 0;
    game.lives = 3;
    resetPaddle();
  }

  game.state = "countdown";
  game.countdownStart = performance.now();
  resetBall();
  clearParticles();
}

function launchBall() {
  const angle = (Math.random() * 120 + 210) * (Math.PI / 180);
  game.ball.speed = 320 + Math.min(game.score * 10, 140);
  game.ball.vx = Math.cos(angle) * game.ball.speed;
  game.ball.vy = Math.sin(angle) * game.ball.speed;
  game.state = "playing";
}

function pauseGame() {
  if (game.state === "playing" || game.state === "countdown") {
    game.pausedFromState = game.state;
    game.state = "paused";
  }
}

function resumeGame() {
  if (game.state === "paused") {
    game.state = game.pausedFromState;
  }
}

function restartGame() {
  startCountdown(true);
}

function clearParticles() {
  game.particles.length = 0;
}

function updateDifficulty() {
  const nextWidth = Math.max(game.paddle.minWidth, game.paddle.baseWidth - game.score * 2);
  const centerX = game.paddle.x + game.paddle.width / 2;
  game.paddle.width = nextWidth;
  game.paddle.x = clamp(centerX - nextWidth / 2, 0, game.width - nextWidth);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function spawnParticles(x, y, color, count, forceY) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 90 + 40;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: forceY !== undefined ? forceY * (Math.random() * 0.6 + 0.7) : Math.sin(angle) * speed,
      life: Math.random() * 0.35 + 0.25,
      maxLife: 0.6,
      size: Math.random() * 4 + 2,
      color,
    });
  }
}

function updateParticles(delta) {
  for (const particle of game.particles) {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.life -= delta;
    particle.vy += 120 * delta;
  }

  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function updateStars(delta) {
  for (const star of game.stars) {
    star.y += star.speed * delta;
    if (star.y > game.height + 4) {
      star.y = -4;
      star.x = Math.random() * game.width;
    }
  }
}

function updatePaddle(delta, now) {
  if (game.keys.left || game.keys.right) {
    game.activeControl = "keyboard";
  } else if (now - game.lastMouseMove < 600) {
    game.activeControl = "mouse";
  }

  if (game.activeControl === "keyboard") {
    let direction = 0;
    if (game.keys.left) direction -= 1;
    if (game.keys.right) direction += 1;
    game.paddle.x += direction * game.paddle.speed * delta;
  } else {
    game.paddle.x = game.mouseX - game.paddle.width / 2;
  }

  game.paddle.x = clamp(game.paddle.x, 0, game.width - game.paddle.width);
}

function updateBall(delta) {
  const ball = game.ball;
  const radius = ball.size / 2;

  ball.x += ball.vx * delta;
  ball.y += ball.vy * delta;

  if (ball.x - radius <= 0) {
    ball.x = radius;
    ball.vx *= -1;
    spawnParticles(ball.x, ball.y, "#7be7e7", 8);
  }

  if (ball.x + radius >= game.width) {
    ball.x = game.width - radius;
    ball.vx *= -1;
    spawnParticles(ball.x, ball.y, "#7be7e7", 8);
  }

  if (ball.y - radius <= 0) {
    ball.y = radius;
    ball.vy *= -1;
    spawnParticles(ball.x, ball.y, "#ffe27a", 10, 55);
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
    ball.vx = offset * 290;
    ball.vy = -speed;

    game.score += 1;
    game.best = Math.max(game.best, game.score);
    saveBestScore();
    updateDifficulty();
    spawnParticles(ball.x, ball.y, "#5ff7c8", 16, -80);
  }

  if (ball.y - radius > game.height) {
    game.lives -= 1;
    spawnParticles(ball.x, game.height - 8, "#ff7d7d", 18, -100);

    if (game.lives <= 0) {
      game.best = Math.max(game.best, game.score);
      saveBestScore();
      game.state = "lost";
      resetBall();
    } else {
      startCountdown(false);
    }
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, game.height);
  gradient.addColorStop(0, "#120c1c");
  gradient.addColorStop(0.55, "#19142a");
  gradient.addColorStop(1, "#09060f");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.fillStyle = "rgba(255, 207, 92, 0.06)";
  ctx.fillRect(18, 18, game.width - 36, game.height - 36);

  for (const star of game.stars) {
    ctx.fillStyle = `rgba(255, 229, 161, ${star.alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.035)";
  for (let y = 0; y < game.height; y += 6) {
    ctx.fillRect(0, y, game.width, 2);
  }
}

function drawArenaGlow() {
  ctx.strokeStyle = "#ffcf5c";
  ctx.lineWidth = 4;
  roundRect(ctx, 12, 12, game.width - 24, game.height - 24, 10);
  ctx.stroke();
}

function drawPaddle() {
  const paddle = game.paddle;
  const gradient = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.height);
  gradient.addColorStop(0, "#ffd76f");
  gradient.addColorStop(1, "#ff8b3d");
  ctx.fillStyle = gradient;
  roundRect(ctx, paddle.x, paddle.y, paddle.width, paddle.height, 5);
  ctx.fill();
}

function drawBall() {
  const gradient = ctx.createRadialGradient(
    game.ball.x - 3,
    game.ball.y - 3,
    2,
    game.ball.x,
    game.ball.y,
    game.ball.size
  );
  gradient.addColorStop(0, "#fff7d8");
  gradient.addColorStop(0.45, "#ff8b3d");
  gradient.addColorStop(1, "#ff476f");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = hexToRgba(particle.color, alpha);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud() {
  ctx.textBaseline = "top";
  ctx.font = "bold 16px Courier New, monospace";

  drawHudPill(14, 14, 108, 32, `SCORE ${game.score}`, "#ff476f");
  drawHudPill(146, 14, 108, 32, `BEST ${game.best}`, "#ffcf5c");
  drawHudPill(278, 14, 108, 32, `LIVES ${game.lives}`, "#57e3ff");

  ctx.fillStyle = "rgba(255, 236, 182, 0.82)";
  ctx.font = "11px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.fillText("MOVE MOUSE/WASD/ARROWS   P PAUSE   R RESTART", game.width / 2, 54);
}

function drawHudPill(x, y, width, height, text, accent) {
  ctx.fillStyle = "rgba(10, 8, 18, 0.86)";
  roundRect(ctx, x, y, width, height, 8);
  ctx.fill();

  ctx.fillStyle = accent;
  roundRect(ctx, x + 4, y + 4, 8, height - 8, 2);
  ctx.fill();

  ctx.fillStyle = "#fff6da";
  ctx.textAlign = "left";
  ctx.fillText(text, x + 22, y + 8);
}

function drawOverlay(alpha) {
  ctx.fillStyle = `rgba(3, 8, 16, ${alpha})`;
  ctx.fillRect(0, 0, game.width, game.height);
}

function drawPanel(x, y, width, height) {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, "rgba(30, 20, 49, 0.96)");
  gradient.addColorStop(1, "rgba(12, 10, 20, 0.96)");
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, width, height, 10);
  ctx.fill();

  ctx.strokeStyle = "#ffcf5c";
  ctx.lineWidth = 3;
  roundRect(ctx, x + 1, y + 1, width - 2, height - 2, 9);
  ctx.stroke();
}

function drawCenteredText(text, y, size, color, weight = "700") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Courier New, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, game.width / 2, y);
}

function drawButton(text, button, fill, outline) {
  ctx.fillStyle = fill;
  roundRect(ctx, button.x, button.y, button.w, button.h, 8);
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = 3;
  roundRect(ctx, button.x, button.y, button.w, button.h, 8);
  ctx.stroke();

  drawCenteredText(text, button.y + button.h / 2 + 1, 18, "#f7feff");
}

function drawWelcome(now) {
  drawOverlay(0.18);
  drawPanel(40, 58, 320, 312);

  ctx.fillStyle = "rgba(255, 71, 111, 0.18)";
  ctx.beginPath();
  ctx.arc(320, 92, 40, 0, Math.PI * 2);
  ctx.fill();

  drawCenteredText("PADDLE BALL", 104, 34, "#ffcf5c");
  drawCenteredText("RETRO ARCADE", 136, 18, "#57e3ff", "600");
  drawCenteredText("KEEP THE BALL ALIVE. SURVIVE THE SPEED UP.", 174, 14, "#ffeec7", "500");
  drawCenteredText("BEST SCORE: " + game.best, 206, 20, "#ffffff");

  const pulse = (Math.sin(now / 240) + 1) / 2;
  const playFill = pulse > 0.5 ? "#ff476f" : "#cc2f56";
  drawButton("PLAY", game.menuButtons.play, playFill, "#ffd68a");
  drawButton("HOW TO PLAY", game.menuButtons.how, "#2c2140", "#57e3ff");

  ctx.fillStyle = "rgba(255, 238, 199, 0.78)";
  ctx.font = "12px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.fillText("MOUSE, WASD, AND ARROWS ALL WORK.", game.width / 2, 381);
}

function drawHowToPlay() {
  drawOverlay(0.22);
  drawPanel(34, 42, 332, 334);

  drawCenteredText("HOW TO PLAY", 82, 30, "#ffcf5c");

  const lines = [
    "Keep the ball from falling past the paddle.",
    "Move with mouse, A/D, or the arrow keys.",
    "Every hit raises your score and increases difficulty.",
    "The paddle slowly shrinks as your score grows.",
    "Press P to pause and R to restart instantly.",
    "Your best score is saved automatically.",
  ];

  ctx.fillStyle = "#fff4d2";
  ctx.font = "14px Courier New, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  let y = 128;
  for (const line of lines) {
    ctx.fillStyle = "#ff476f";
    ctx.beginPath();
    ctx.arc(64, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff4d2";
    ctx.fillText(line, 80, y);
    y += 36;
  }

  drawButton("BACK", game.menuButtons.back, "#2c2140", "#57e3ff");
}

function drawCountdown(now) {
  drawHud();
  drawOverlay(0.2);

  const elapsed = (now - game.countdownStart) / 1000;
  const num = 3 - Math.floor(elapsed);

  if (num <= 0) {
    launchBall();
    return;
  }

  drawCenteredText("GET READY", 160, 22, "#ffffff");
  drawCenteredText(String(num), 224, 92, "#ffe27a");
}

function drawPaused() {
  drawHud();
  drawBall();
  drawOverlay(0.44);
  drawPanel(72, 118, 256, 160);
  drawCenteredText("PAUSED", 166, 34, "#57e3ff");
  drawCenteredText("PRESS P TO RESUME", 214, 16, "#ffffff", "500");
  drawCenteredText("PRESS R TO RESTART", 244, 16, "#f6dd7a", "500");
}

function drawLost() {
  drawHud();
  drawBall();
  drawOverlay(0.46);
  drawPanel(58, 92, 284, 214);
  drawCenteredText("GAME OVER", 142, 34, "#ff476f");
  drawCenteredText("FINAL SCORE: " + game.score, 192, 20, "#ffffff");
  drawCenteredText("BEST SCORE: " + game.best, 224, 18, "#f6dd7a", "600");
  drawButton("PLAY AGAIN", { x: 120, y: 252, w: 160, h: 46 }, "#cc2f56", "#ffd68a");
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

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function pointInButton(button, x, y) {
  return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
}

function animate(now) {
  const delta = Math.min((now - game.lastTime) / 1000 || 0, 0.033);
  game.lastTime = now;

  updateStars(delta);
  updateParticles(delta);
  updatePaddle(delta, now);

  drawBackground();
  drawArenaGlow();
  drawPaddle();
  drawParticles();

  if (game.state === "playing") {
    updateBall(delta);
    drawBall();
    drawHud();
  } else if (game.state === "countdown") {
    drawBall();
    drawCountdown(now);
  } else if (game.state === "paused") {
    drawPaused();
  } else if (game.state === "lost") {
    drawLost();
  } else if (game.state === "how") {
    drawHowToPlay();
  } else {
    drawWelcome(now);
  }

  requestAnimationFrame(animate);
}

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  game.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  game.lastMouseMove = performance.now();
});

canvas.addEventListener("click", (event) => {
  const rect = canvas.getBoundingClientRect();
  const clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;

  if (game.state === "welcome") {
    if (pointInButton(game.menuButtons.play, clickX, clickY)) {
      startCountdown(true);
      return;
    }

    if (pointInButton(game.menuButtons.how, clickX, clickY)) {
      game.state = "how";
    }

    return;
  }

  if (game.state === "how" && pointInButton(game.menuButtons.back, clickX, clickY)) {
    game.state = "welcome";
    return;
  }

  if (game.state === "lost" && clickX >= 120 && clickX <= 280 && clickY >= 252 && clickY <= 298) {
    startCountdown(true);
  }
});

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "p", "r"].includes(key)) {
    event.preventDefault();
  }

  if (key === "a" || key === "arrowleft") {
    game.keys.left = true;
  }

  if (key === "d" || key === "arrowright") {
    game.keys.right = true;
  }

  if (key === "p") {
    if (game.state === "paused") {
      resumeGame();
    } else {
      pauseGame();
    }
  }

  if (key === "r") {
    restartGame();
  }

  if ((key === "enter" || key === " ") && game.state === "welcome") {
    startCountdown(true);
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();

  if (key === "a" || key === "arrowleft") {
    game.keys.left = false;
  }

  if (key === "d" || key === "arrowright") {
    game.keys.right = false;
  }
});

requestAnimationFrame(animate);
