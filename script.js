const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const soundToggle = document.getElementById("soundToggle");

const STORAGE_KEY = "paddle-ball-best-score";
const SOUND_STORAGE_KEY = "paddle-ball-sound-muted";
const BASE_BALL_SIZE = 18;
const TINY_BALL_SIZE = 12;
const POWER_UP_START_SCORE = 5;
const DIFFICULTY_MODES = {
  easy: {
    label: "EASY",
    color: "#7dffb6",
    startingLives: 4,
    paddleWidth: 126,
    minPaddleWidth: 74,
    paddleSpeed: 450,
    launchSpeed: 300,
    speedGainPerScore: 8,
    maxLaunchBonus: 110,
    paddleShrinkPerScore: 1.4,
  },
  normal: {
    label: "NORMAL",
    color: "#57e3ff",
    startingLives: 3,
    paddleWidth: 110,
    minPaddleWidth: 62,
    paddleSpeed: 420,
    launchSpeed: 320,
    speedGainPerScore: 10,
    maxLaunchBonus: 140,
    paddleShrinkPerScore: 2,
  },
  hard: {
    label: "HARD",
    color: "#ff6f91",
    startingLives: 2,
    paddleWidth: 96,
    minPaddleWidth: 50,
    paddleSpeed: 395,
    launchSpeed: 344,
    speedGainPerScore: 12,
    maxLaunchBonus: 175,
    paddleShrinkPerScore: 2.4,
  },
};
const POWER_UP_TYPES = {
  tinyBall: { label: "TINY BALL", color: "#57e3ff" },
  slowMo: { label: "SLOW MO", color: "#9f8cff" },
  scoreBoost: { label: "2X SCORE", color: "#ffcf5c" },
  extraLife: { label: "+1 LIFE", color: "#ff6f91" },
  multiBall: { label: "MULTI BALL", color: "#7dffb6" },
  shield: { label: "SHIELD", color: "#8ee6ff" },
};

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
  balls: [],
  powerUps: [],
  particles: [],
  stars: [],
  score: 0,
  best: loadBestScore(),
  lives: 3,
  difficulty: "normal",
  state: "welcome",
  pausedFromState: "playing",
  countdownStart: 0,
  lastTime: 0,
  runStartedAt: 0,
  runEndedAt: 0,
  mouseX: canvas.width / 2,
  lastMouseMove: 0,
  activeControl: "mouse",
  keys: {
    left: false,
    right: false,
  },
  effects: {
    tinyBallUntil: 0,
    slowMoUntil: 0,
    scoreBoostUntil: 0,
  },
  shieldCharges: 0,
  stats: createRunStats(),
  nextPowerUpScore: 0,
  lastPowerUpLabel: "",
  lastPowerUpColor: "#ffffff",
  lastPowerUpUntil: 0,
};

const sound = createSoundSystem();
updateSoundButton();

createStars();
applyDifficultySettings();
resetBalls();

function createSoundSystem() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const music = new Audio("arcade.mp3");
  music.loop = true;
  music.volume = 0.34;
  music.preload = "auto";

  return {
    context: AudioContextCtor ? new AudioContextCtor() : null,
    music,
    muted: loadMutedPreference(),
    enabled: false,
    lastWallToneAt: 0,
    lastButtonToneAt: 0,
  };
}

function loadMutedPreference() {
  try {
    return window.localStorage.getItem(SOUND_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMutedPreference() {
  try {
    window.localStorage.setItem(SOUND_STORAGE_KEY, String(sound.muted));
  } catch {}
}

function updateSoundButton() {
  if (!soundToggle) {
    return;
  }

  soundToggle.textContent = sound.muted ? "Sound: Off" : "Sound: On";
  soundToggle.setAttribute("aria-pressed", String(sound.muted));
}

async function unlockSound() {
  try {
    if (sound.context && sound.context.state === "suspended") {
      await sound.context.resume();
    }

    sound.enabled = !sound.context || sound.context.state === "running";

    if (!sound.muted) {
      sound.music.play().catch(() => {});
    }
  } catch {
    sound.enabled = false;
  }
}

function playTone({
  frequency,
  duration = 0.12,
  type = "sine",
  volume = 0.035,
  slideTo,
  when = 0,
}) {
  if (!sound.context || sound.muted || !sound.enabled) {
    return;
  }

  const startAt = sound.context.currentTime + when;
  const oscillator = sound.context.createOscillator();
  const gain = sound.context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, startAt + duration);
  }

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(sound.context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

function playWallSound() {
  const now = performance.now();
  if (now - sound.lastWallToneAt < 45) {
    return;
  }

  sound.lastWallToneAt = now;
  playTone({ frequency: 420, slideTo: 320, duration: 0.08, type: "square", volume: 0.025 });
}

function playPaddleSound() {
  playTone({ frequency: 520, slideTo: 760, duration: 0.09, type: "square", volume: 0.04 });
  playTone({ frequency: 660, slideTo: 880, duration: 0.07, type: "triangle", volume: 0.022, when: 0.015 });
}

function playCountdownSound() {
  playTone({ frequency: 350, slideTo: 390, duration: 0.09, type: "triangle", volume: 0.028 });
}

function playLaunchSound() {
  playTone({ frequency: 390, slideTo: 720, duration: 0.16, type: "sawtooth", volume: 0.03 });
}

function playLifeLostSound() {
  playTone({ frequency: 280, slideTo: 150, duration: 0.22, type: "sawtooth", volume: 0.04 });
}

function playGameOverSound() {
  playTone({ frequency: 260, slideTo: 180, duration: 0.16, type: "square", volume: 0.04 });
  playTone({ frequency: 210, slideTo: 120, duration: 0.24, type: "triangle", volume: 0.032, when: 0.08 });
}

function playButtonSound() {
  const now = performance.now();
  if (now - sound.lastButtonToneAt < 80) {
    return;
  }

  sound.lastButtonToneAt = now;
  playTone({ frequency: 480, slideTo: 620, duration: 0.07, type: "triangle", volume: 0.025 });
}

function playPowerUpSound(type) {
  if (type === "extraLife") {
    playTone({ frequency: 560, slideTo: 940, duration: 0.18, type: "triangle", volume: 0.04 });
    return;
  }

  if (type === "multiBall") {
    playTone({ frequency: 420, slideTo: 680, duration: 0.14, type: "square", volume: 0.034 });
    playTone({ frequency: 520, slideTo: 860, duration: 0.16, type: "triangle", volume: 0.026, when: 0.04 });
    return;
  }

  if (type === "shield") {
    playTone({ frequency: 360, slideTo: 620, duration: 0.18, type: "sawtooth", volume: 0.032 });
    playTone({ frequency: 540, slideTo: 820, duration: 0.16, type: "triangle", volume: 0.024, when: 0.04 });
    return;
  }

  playTone({ frequency: 470, slideTo: 760, duration: 0.13, type: "triangle", volume: 0.032 });
}

function toggleSound() {
  sound.muted = !sound.muted;
  saveMutedPreference();
  updateSoundButton();
  if (sound.muted) {
    sound.music.pause();
  } else {
    sound.music.play().catch(() => {});
    playButtonSound();
  }
}

function getMenuLayout() {
  const panelWidth = 320;
  const panelHeight = 352;
  const panelX = (game.width - panelWidth) / 2;
  const panelY = 36;
  const buttonWidth = 160;
  const buttonHeight = 46;
  const buttonX = panelX + (panelWidth - buttonWidth) / 2;
  const diffY = panelY + 186;
  const diffWidth = 82;
  const diffGap = 8;
  const diffX = panelX + (panelWidth - (diffWidth * 3 + diffGap * 2)) / 2;

  return {
    panel: { x: panelX, y: panelY, w: panelWidth, h: panelHeight },
    difficultyLabelY: panelY + 176,
    difficultyButtons: [
      { key: "easy", x: diffX, y: diffY, w: diffWidth, h: 34 },
      { key: "normal", x: diffX + diffWidth + diffGap, y: diffY, w: diffWidth, h: 34 },
      { key: "hard", x: diffX + (diffWidth + diffGap) * 2, y: diffY, w: diffWidth, h: 34 },
    ],
    play: { x: buttonX, y: panelY + 244, w: buttonWidth, h: buttonHeight },
    how: { x: buttonX, y: panelY + 298, w: buttonWidth, h: buttonHeight },
    footerY: panelY + panelHeight + 10,
  };
}

function getHowToLayout() {
  const panelWidth = 344;
  const panelHeight = 344;
  const panelX = (game.width - panelWidth) / 2;
  const panelY = 34;

  return {
    panel: { x: panelX, y: panelY, w: panelWidth, h: panelHeight },
    back: { x: panelX + 112, y: panelY + 290, w: 120, h: 42 },
    textX: panelX + 52,
    bulletX: panelX + 36,
  };
}

function getPauseLayout() {
  return {
    panel: { x: (game.width - 256) / 2, y: 118, w: 256, h: 160 },
  };
}

function getGameOverLayout() {
  const panelWidth = 284;
  const panelHeight = 274;
  const panelX = (game.width - panelWidth) / 2;
  const panelY = 62;

  return {
    panel: { x: panelX, y: panelY, w: panelWidth, h: panelHeight },
    playAgain: { x: panelX + 62, y: panelY + 218, w: 160, h: 46 },
  };
}

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

function createRunStats() {
  return {
    bounces: 0,
    powerUpsCollected: 0,
    shieldsTriggered: 0,
    longestStreak: 0,
    currentStreak: 0,
    maxBallsInPlay: 1,
  };
}

function getDifficultyConfig() {
  return DIFFICULTY_MODES[game.difficulty];
}

function setDifficulty(mode) {
  if (!DIFFICULTY_MODES[mode]) {
    return;
  }

  game.difficulty = mode;
  applyDifficultySettings();
}

function applyDifficultySettings() {
  const config = getDifficultyConfig();
  game.paddle.baseWidth = config.paddleWidth;
  game.paddle.minWidth = config.minPaddleWidth;
  game.paddle.speed = config.paddleSpeed;
  game.paddle.width = config.paddleWidth;
  game.paddle.x = clamp(game.paddle.x, 0, game.width - game.paddle.width);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function createBall(overrides = {}) {
  return {
    size: getCurrentBallSize(),
    x: game.width / 2,
    y: game.height * 0.46,
    vx: 0,
    vy: 0,
    speed: 320,
    ...overrides,
  };
}

function resetBalls() {
  game.balls = [createBall()];
}

function getCurrentBallSize() {
  return isTinyBallActive() ? TINY_BALL_SIZE : BASE_BALL_SIZE;
}

function refreshBallSizes() {
  const size = getCurrentBallSize();
  for (const ball of game.balls) {
    ball.size = size;
  }
}

function getNextPowerUpScore(currentScore = game.score) {
  return currentScore + Math.floor(Math.random() * 4) + 2;
}

function resetPowerUpSchedule() {
  game.nextPowerUpScore = POWER_UP_START_SCORE + Math.floor(Math.random() * 4) + 1;
}

function showPowerUpMessage(type) {
  game.lastPowerUpLabel = POWER_UP_TYPES[type].label;
  game.lastPowerUpColor = POWER_UP_TYPES[type].color;
  game.lastPowerUpUntil = performance.now() + 1600;
}

function resetPaddle() {
  game.paddle.width = game.paddle.baseWidth;
  game.paddle.x = game.width / 2 - game.paddle.width / 2;
}

function clearParticles() {
  game.particles.length = 0;
}

function clearPowerUps() {
  game.powerUps.length = 0;
}

function clearEffects() {
  game.effects.tinyBallUntil = 0;
  game.effects.slowMoUntil = 0;
  game.effects.scoreBoostUntil = 0;
  game.shieldCharges = 0;
  game.lastPowerUpLabel = "";
  game.lastPowerUpUntil = 0;
}

function startCountdown(newGame) {
  if (newGame) {
    applyDifficultySettings();
    game.score = 0;
    game.lives = getDifficultyConfig().startingLives;
    game.runStartedAt = performance.now();
    game.runEndedAt = 0;
    game.stats = createRunStats();
    clearEffects();
    clearPowerUps();
    resetPowerUpSchedule();
    resetPaddle();
  }

  game.state = "countdown";
  game.countdownStart = performance.now();
  resetBalls();
  clearParticles();
  playCountdownSound();
}

function launchBall() {
  const config = getDifficultyConfig();
  const launchSpeed = config.launchSpeed + Math.min(game.score * config.speedGainPerScore, config.maxLaunchBonus);

  for (const ball of game.balls) {
    const angle = (Math.random() * 120 + 210) * (Math.PI / 180);
    ball.speed = launchSpeed;
    ball.size = getCurrentBallSize();
    ball.vx = Math.cos(angle) * launchSpeed;
    ball.vy = Math.sin(angle) * launchSpeed;
  }

  game.state = "playing";
  playLaunchSound();
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

function updateDifficulty() {
  const config = getDifficultyConfig();
  const nextWidth = Math.max(game.paddle.minWidth, game.paddle.baseWidth - game.score * config.paddleShrinkPerScore);
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

function getRandomPowerUpType() {
  const types = ["tinyBall", "slowMo", "scoreBoost", "extraLife", "multiBall", "shield"];
  return types[Math.floor(Math.random() * types.length)];
}

function maybeSpawnPowerUp(x, y) {
  if (game.score < game.nextPowerUpScore) {
    return;
  }

  if (Math.random() > 0.2) {
    return;
  }

  const type = getRandomPowerUpType();
  const config = POWER_UP_TYPES[type];

  game.powerUps.push({
    type,
    x,
    y,
    vy: 96,
    size: 18,
    color: config.color,
    label: config.label,
  });

  game.nextPowerUpScore = getNextPowerUpScore();
}

function activatePowerUp(type) {
  const now = performance.now();

  if (type === "tinyBall") {
    game.effects.tinyBallUntil = now + 10000;
    refreshBallSizes();
  } else if (type === "slowMo") {
    game.effects.slowMoUntil = now + 10000;
  } else if (type === "scoreBoost") {
    game.effects.scoreBoostUntil = now + 10000;
  } else if (type === "extraLife") {
    game.lives += 1;
  } else if (type === "multiBall") {
    spawnMultiBall();
  } else if (type === "shield") {
    game.shieldCharges = Math.min(game.shieldCharges + 1, 2);
  }

  game.stats.powerUpsCollected += 1;
  showPowerUpMessage(type);
  playPowerUpSound(type);
}

function spawnMultiBall() {
  if (game.balls.length === 0) {
    return;
  }

  const sourceBall = game.balls[Math.floor(Math.random() * game.balls.length)];
  const ballSize = getCurrentBallSize();
  const sourceDirection = sourceBall.vx === 0 ? 1 : Math.sign(sourceBall.vx);
  const newDirection = sourceDirection * -1;

  game.balls.push(
    createBall({
      x: sourceBall.x,
      y: sourceBall.y,
      size: ballSize,
      speed: sourceBall.speed,
      vx: (Math.abs(sourceBall.vx) + 80) * newDirection,
      vy: -Math.max(220, Math.abs(sourceBall.vy) || sourceBall.speed),
    })
  );
  game.stats.maxBallsInPlay = Math.max(game.stats.maxBallsInPlay, game.balls.length);
}

function updatePowerUps(delta) {
  const paddle = game.paddle;

  for (let i = game.powerUps.length - 1; i >= 0; i -= 1) {
    const powerUp = game.powerUps[i];
    powerUp.y += powerUp.vy * delta;

    const caught =
      powerUp.x + powerUp.size >= paddle.x &&
      powerUp.x - powerUp.size <= paddle.x + paddle.width &&
      powerUp.y + powerUp.size >= paddle.y &&
      powerUp.y - powerUp.size <= paddle.y + paddle.height;

    if (caught) {
      activatePowerUp(powerUp.type);
      spawnParticles(powerUp.x, powerUp.y, powerUp.color, 18, -70);
      game.powerUps.splice(i, 1);
      continue;
    }

    if (powerUp.y - powerUp.size > game.height) {
      game.powerUps.splice(i, 1);
    }
  }
}

function isTinyBallActive() {
  return game.effects.tinyBallUntil > performance.now();
}

function isScoreBoostActive() {
  return game.effects.scoreBoostUntil > performance.now();
}

function isSlowMoActive() {
  return game.effects.slowMoUntil > performance.now();
}

function updateEffects(now) {
  if (game.effects.tinyBallUntil <= now && game.effects.tinyBallUntil !== 0) {
    game.effects.tinyBallUntil = 0;
    refreshBallSizes();
  }

  if (game.effects.slowMoUntil <= now && game.effects.slowMoUntil !== 0) {
    game.effects.slowMoUntil = 0;
  }

  if (game.effects.scoreBoostUntil <= now && game.effects.scoreBoostUntil !== 0) {
    game.effects.scoreBoostUntil = 0;
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

function updateBall(ball, delta) {
  const radius = ball.size / 2;
  const speedFactor = isSlowMoActive() ? 0.62 : 1;

  ball.x += ball.vx * delta * speedFactor;
  ball.y += ball.vy * delta * speedFactor;

  if (ball.x - radius <= 0) {
    ball.x = radius;
    ball.vx *= -1;
    spawnParticles(ball.x, ball.y, "#7be7e7", 8);
    playWallSound();
  }

  if (ball.x + radius >= game.width) {
    ball.x = game.width - radius;
    ball.vx *= -1;
    spawnParticles(ball.x, ball.y, "#7be7e7", 8);
    playWallSound();
  }

  if (ball.y - radius <= 0) {
    ball.y = radius;
    ball.vy *= -1;
    spawnParticles(ball.x, ball.y, "#ffe27a", 10, 55);
    playWallSound();
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
    ball.speed = speed;

    game.score += isScoreBoostActive() ? 2 : 1;
    game.stats.bounces += 1;
    game.stats.currentStreak += 1;
    game.stats.longestStreak = Math.max(game.stats.longestStreak, game.stats.currentStreak);
    game.best = Math.max(game.best, game.score);
    saveBestScore();
    updateDifficulty();
    spawnParticles(ball.x, ball.y, "#5ff7c8", 16, -80);
    playPaddleSound();
    maybeSpawnPowerUp(ball.x, ball.y);
  }

  if (ball.y + radius >= game.height - 10 && game.shieldCharges > 0 && ball.vy > 0) {
    game.shieldCharges -= 1;
    game.stats.shieldsTriggered += 1;
    game.stats.currentStreak = 0;
    ball.y = game.height - 10 - radius;
    ball.vy = -Math.max(Math.abs(ball.vy), 260);
    spawnParticles(ball.x, game.height - 10, "#8ee6ff", 24, -120);
    playPowerUpSound("shield");
    return false;
  }

  if (ball.y - radius > game.height) {
    spawnParticles(ball.x, game.height - 8, "#ff7d7d", 18, -100);
    return true;
  }

  return false;
}

function updateBalls(delta) {
  for (let i = game.balls.length - 1; i >= 0; i -= 1) {
    const ballLost = updateBall(game.balls[i], delta);
    if (ballLost) {
      game.stats.currentStreak = 0;
      game.balls.splice(i, 1);
    }
  }

  if (game.balls.length > 0) {
    return;
  }

  game.lives -= 1;
  playLifeLostSound();

  if (game.lives <= 0) {
    game.best = Math.max(game.best, game.score);
    saveBestScore();
    game.runEndedAt = performance.now();
    game.state = "lost";
    resetBalls();
    playGameOverSound();
  } else {
    startCountdown(false);
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

function drawBall(ball) {
  const gradient = ctx.createRadialGradient(ball.x - 3, ball.y - 3, 2, ball.x, ball.y, ball.size);
  gradient.addColorStop(0, "#fff7d8");
  gradient.addColorStop(0.45, "#ff8b3d");
  gradient.addColorStop(1, "#ff476f");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.size / 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBalls() {
  for (const ball of game.balls) {
    drawBall(ball);
  }
}

function drawPowerUps() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (const powerUp of game.powerUps) {
    ctx.fillStyle = hexToRgba(powerUp.color, 0.18);
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.size + 5, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createLinearGradient(powerUp.x, powerUp.y - powerUp.size, powerUp.x, powerUp.y + powerUp.size);
    gradient.addColorStop(0, "#fff8dc");
    gradient.addColorStop(1, powerUp.color);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#190f23";
    ctx.font = "700 11px Courier New, monospace";
    ctx.fillText(getPowerUpShortLabel(powerUp.type), powerUp.x, powerUp.y + 1);
  }
}

function getPowerUpShortLabel(type) {
  if (type === "tinyBall") return "T";
  if (type === "slowMo") return "SM";
  if (type === "scoreBoost") return "2X";
  if (type === "extraLife") return "+1";
  return "MB";
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

function drawShield() {
  if (game.shieldCharges <= 0) {
    return;
  }

  const shieldY = game.height - 10;
  ctx.save();
  ctx.strokeStyle = "rgba(142, 230, 255, 0.9)";
  ctx.lineWidth = 4;
  ctx.shadowColor = "rgba(142, 230, 255, 0.55)";
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(38, shieldY);
  ctx.lineTo(game.width - 38, shieldY);
  ctx.stroke();
  ctx.restore();
}

function drawHud() {
  ctx.textBaseline = "top";
  ctx.font = "bold 16px Courier New, monospace";

  drawHudPill(14, 14, 108, 32, `SCORE ${game.score}`, "#ff476f");
  drawHudPill(146, 14, 108, 32, `BEST ${game.best}`, "#ffcf5c");
  drawHudPill(278, 14, 108, 32, `LIVES ${game.lives}`, "#57e3ff");
  drawHudPill(14, 332, 112, 28, `BALLS ${game.balls.length}`, "#7dffb6");
  drawHudPill(142, 332, 108, 28, `MODE ${getDifficultyConfig().label}`, getDifficultyConfig().color);
  drawActiveEffects();

  drawWrappedCenteredText(
    "MOVE MOUSE OR USE WASD/ARROWS. CATCH POWER-UPS. P PAUSE. R RESTART.",
    63,
    10,
    "rgba(255, 236, 182, 0.82)",
    360,
    12,
    "400"
  );
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
  ctx.font = "bold 16px Courier New, monospace";
  ctx.fillText(text, x + 22, y + 8);
}

function drawActiveEffects() {
  const now = performance.now();
  const effects = [];

  if (game.effects.tinyBallUntil > now) {
    effects.push({
      text: `TINY ${Math.ceil((game.effects.tinyBallUntil - now) / 1000)}S`,
      color: "#57e3ff",
      width: 106,
    });
  }

  if (game.effects.slowMoUntil > now) {
    effects.push({
      text: `SLOW ${Math.ceil((game.effects.slowMoUntil - now) / 1000)}S`,
      color: "#9f8cff",
      width: 106,
    });
  }

  if (game.effects.scoreBoostUntil > now) {
    effects.push({
      text: `2X ${Math.ceil((game.effects.scoreBoostUntil - now) / 1000)}S`,
      color: "#ffcf5c",
      width: 92,
    });
  }

  if (game.shieldCharges > 0) {
    effects.push({
      text: `SHIELD ${game.shieldCharges}`,
      color: "#8ee6ff",
      width: 116,
    });
  }

  let x = 264;
  for (const effect of effects) {
    drawHudPill(x, 332, effect.width, 28, effect.text, effect.color);
    x += effect.width + 10;
  }
}

function drawPowerUpMessage() {
  if (game.lastPowerUpUntil <= performance.now()) {
    return;
  }

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const width = 172;
  const height = 34;
  const x = (game.width - width) / 2;
  const y = 54;

  ctx.fillStyle = "rgba(10, 8, 18, 0.9)";
  roundRect(ctx, x, y, width, height, 10);
  ctx.fill();

  ctx.fillStyle = game.lastPowerUpColor;
  roundRect(ctx, x + 5, y + 5, 10, height - 10, 3);
  ctx.fill();

  ctx.fillStyle = "#fff6da";
  ctx.font = "700 16px Courier New, monospace";
  ctx.fillText(game.lastPowerUpLabel, game.width / 2 + 8, y + height / 2 + 1);
  ctx.restore();
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

function drawWrappedCenteredText(text, y, size, color, maxWidth, lineHeight, weight = "700") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Courier New, monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i += 1) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], game.width / 2, startY + i * lineHeight);
  }
}

function drawWrappedText(text, x, y, size, color, maxWidth, lineHeight, weight = "400") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px Courier New, monospace`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  const words = text.split(" ");
  const lines = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i += 1) {
    const nextLine = `${currentLine} ${words[i]}`;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }

  lines.push(currentLine);

  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  return lines.length;
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

function drawDifficultyButton(button) {
  const isSelected = game.difficulty === button.key;
  const config = DIFFICULTY_MODES[button.key];
  const fill = isSelected ? hexToRgba(config.color, 0.22) : "#241936";
  const outline = isSelected ? config.color : "#4b3966";
  const label = button.key === "normal" ? "NORMAL" : config.label;

  ctx.fillStyle = fill;
  roundRect(ctx, button.x, button.y, button.w, button.h, 8);
  ctx.fill();

  ctx.strokeStyle = outline;
  ctx.lineWidth = isSelected ? 3 : 2;
  roundRect(ctx, button.x, button.y, button.w, button.h, 8);
  ctx.stroke();

  ctx.fillStyle = isSelected ? "#fff8dd" : "#d7cfee";
  ctx.font = "700 14px Courier New, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, button.x + button.w / 2, button.y + button.h / 2 + 1);
}

function drawWelcome(now) {
  const layout = getMenuLayout();

  drawOverlay(0.18);
  drawPanel(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h);

  ctx.fillStyle = "rgba(255, 71, 111, 0.18)";
  ctx.beginPath();
  ctx.arc(layout.panel.x + layout.panel.w - 40, layout.panel.y + 34, 40, 0, Math.PI * 2);
  ctx.fill();

  drawCenteredText("PADDLE BALL", layout.panel.y + 46, 34, "#ffcf5c");
  drawCenteredText("RETRO ARCADE", layout.panel.y + 78, 18, "#57e3ff", "600");
  drawWrappedCenteredText(
    "KEEP THE BALL ALIVE. SURVIVE THE SPEED UP.",
    layout.panel.y + 120,
    14,
    "#ffeec7",
    248,
    18,
    "500"
  );
  drawCenteredText("BEST SCORE: " + game.best, layout.panel.y + 156, 20, "#ffffff");
  drawCenteredText("SELECT DIFFICULTY", layout.difficultyLabelY, 14, "#ffe9b8", "600");

  for (const button of layout.difficultyButtons) {
    drawDifficultyButton(button);
  }

  const pulse = (Math.sin(now / 240) + 1) / 2;
  const playFill = pulse > 0.5 ? "#ff476f" : "#cc2f56";
  drawButton("PLAY", layout.play, playFill, "#ffd68a");
  drawButton("HOW TO PLAY", layout.how, "#2c2140", "#57e3ff");

  drawWrappedCenteredText(
    "POWER-UPS CAN DROP DURING LONGER RUNS.",
    layout.footerY,
    12,
    "rgba(255, 238, 199, 0.78)",
    320,
    14,
    "400"
  );
}

function drawHowToPlay() {
  const layout = getHowToLayout();

  drawOverlay(0.22);
  drawPanel(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h);

  drawCenteredText("HOW TO PLAY", layout.panel.y + 48, 30, "#ffcf5c");

  const lines = [
    "Keep the ball above the paddle.",
    "Move with mouse, WASD, or arrows.",
    "Catch T, SM, 2X, +1, MB, and SH power-ups.",
    "The paddle shrinks as you score.",
    "Press P to pause and R to restart.",
    "Best score saves automatically.",
  ];

  let y = layout.panel.y + 94;
  for (const line of lines) {
    ctx.fillStyle = "#ff476f";
    ctx.beginPath();
    ctx.arc(layout.bulletX, y, 4, 0, Math.PI * 2);
    ctx.fill();

    const lineCount = drawWrappedText(line, layout.textX, y, 13, "#fff4d2", 264, 16);
    y += Math.max(32, lineCount * 18 + 12);
  }

  drawButton("BACK", layout.back, "#2c2140", "#57e3ff");
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
  const layout = getPauseLayout();

  drawHud();
  drawBalls();
  drawOverlay(0.44);
  drawPanel(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h);
  drawCenteredText("PAUSED", 166, 34, "#57e3ff");
  drawCenteredText("PRESS P TO RESUME", 214, 16, "#ffffff", "500");
  drawCenteredText("PRESS R TO RESTART", 244, 16, "#f6dd7a", "500");
}

function drawLost() {
  const layout = getGameOverLayout();
  const survivalTime = formatDuration((game.runEndedAt || performance.now()) - game.runStartedAt);
  const statLines = [
    `MODE ${getDifficultyConfig().label}`,
    `TIME ${survivalTime}`,
    `BOUNCES ${game.stats.bounces}`,
    `POWER-UPS ${game.stats.powerUpsCollected}`,
    `BEST STREAK ${game.stats.longestStreak}`,
    `SHIELD SAVES ${game.stats.shieldsTriggered}`,
  ];

  drawHud();
  drawBalls();
  drawOverlay(0.46);
  drawPanel(layout.panel.x, layout.panel.y, layout.panel.w, layout.panel.h);
  drawCenteredText("GAME OVER", layout.panel.y + 30, 34, "#ff476f");
  drawCenteredText("FINAL SCORE: " + game.score, layout.panel.y + 78, 20, "#ffffff");
  drawCenteredText("BEST SCORE: " + game.best, layout.panel.y + 106, 18, "#f6dd7a", "600");

  let y = layout.panel.y + 136;
  for (const line of statLines) {
    drawCenteredText(line, y, 14, "#e8e1ff", "500");
    y += 20;
  }

  drawButton("PLAY AGAIN", layout.playAgain, "#cc2f56", "#ffd68a");
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

  updateEffects(now);
  updateStars(delta);
  updateParticles(delta);
  updatePaddle(delta, now);
  updatePowerUps(delta);

  drawBackground();
  drawArenaGlow();
  if (game.state !== "welcome") {
    drawPaddle();
    drawShield();
  }
  drawPowerUps();
  drawParticles();

  if (game.state === "playing") {
    updateBalls(delta);
    drawBalls();
    drawHud();
    drawPowerUpMessage();
  } else if (game.state === "countdown") {
    drawBalls();
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

canvas.addEventListener("pointerdown", () => {
  unlockSound();
});

canvas.addEventListener("click", (event) => {
  unlockSound();
  const rect = canvas.getBoundingClientRect();
  const clickX = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const clickY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  const menuLayout = getMenuLayout();
  const howLayout = getHowToLayout();
  const gameOverLayout = getGameOverLayout();

  if (game.state === "welcome") {
    for (const button of menuLayout.difficultyButtons) {
      if (pointInButton(button, clickX, clickY)) {
        playButtonSound();
        setDifficulty(button.key);
        return;
      }
    }

    if (pointInButton(menuLayout.play, clickX, clickY)) {
      playButtonSound();
      startCountdown(true);
      return;
    }

    if (pointInButton(menuLayout.how, clickX, clickY)) {
      playButtonSound();
      game.state = "how";
    }

    return;
  }

  if (game.state === "how" && pointInButton(howLayout.back, clickX, clickY)) {
    playButtonSound();
    game.state = "welcome";
    return;
  }

  if (game.state === "lost" && pointInButton(gameOverLayout.playAgain, clickX, clickY)) {
    playButtonSound();
    startCountdown(true);
  }
});

if (soundToggle) {
  soundToggle.addEventListener("click", async () => {
    await unlockSound();
    toggleSound();
  });
}

window.addEventListener("keydown", (event) => {
  unlockSound();
  const key = event.key.toLowerCase();

  if (["arrowleft", "arrowright", " ", "p", "r", "m"].includes(key)) {
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

  if (key === "m") {
    toggleSound();
  }

  if (game.state === "welcome") {
    if (key === "1") {
      setDifficulty("easy");
    } else if (key === "2") {
      setDifficulty("normal");
    } else if (key === "3") {
      setDifficulty("hard");
    }
  }

  if ((key === "enter" || key === " ") && game.state === "welcome") {
    playButtonSound();
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
