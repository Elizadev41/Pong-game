// Use the mouse to move the paddle. Keep the ball in the air!

/* VARIABLES */
let paddle, ball, walls;
let score = 0;
let highScore = 0;
let lives = 3;
let countdownTimer = 0;
let state = 'welcome'; // 'welcome', 'countdown', 'playing', 'lost'
let isNewGame = true;

/* PRELOAD */
function preload() {}

/* SETUP */
function setup() {
  let canvas = createCanvas(400, 400);
  canvas.parent('game');
  textFont('Arial');
  
  // Create paddle
  paddle = new Sprite(200, 380, 100, 20);
  paddle.color = color(95, 158, 160);
  paddle.rotationLock = true;
  paddle.collider = 'kinematic';
  
  // Create ball
  ball = new Sprite(200, 200, 20);
  ball.color = color(0, 128, 128);
  ball.speed = 0;
  ball.bounciness = 1;
  ball.friction = 0;
  ball.collider = 'dynamic';
  
  // Create walls
  walls = new Group();
  walls.w = 10;
  walls.h = 400;
  walls.collider = 'static';
  walls.visible = false;
  
  new walls.Sprite(0, height / 2);
  new walls.Sprite(width, height / 2);
  
  let wallTop = new walls.Sprite(width / 2, 0);
  wallTop.rotation = 90;
}

/* HELPERS */
function inButton(bx, by, bw, bh) {
  return mouseX > bx && mouseX < bx + bw && mouseY > by && mouseY < by + bh;
}

function resetBall() {
  ball.x = 200;
  ball.y = 180;
  ball.vel.x = 0;
  ball.vel.y = 0;
  ball.speed = 0;
}

function startCountdown(newGame) {
  isNewGame = newGame;
  state = 'countdown';
  countdownTimer = millis();
  resetBall();
}

function startGame() {
  if (isNewGame) {
    score = 0;
    lives = 3;
  }
  state = 'playing';
  resetBall();
  ball.direction = random(200, 340);
  ball.speed = 5;
}

function drawOverlay(alpha) {
  noStroke();
  fill(0, 0, 0, alpha);
  rect(0, 0, width, height);
}

function drawHUD() {
  noStroke();
  fill(0, 128, 128);
  textAlign(LEFT);
  textSize(18);
  text('Score: ' + score, 10, 28);
  
  textAlign(CENTER);
  text('Best: ' + highScore, width / 2, 28);
  
  fill(220, 60, 60);
  textAlign(RIGHT);
  text('Lives: ' + lives, width - 10, 28);
}

/* CLICK HANDLER */
function mousePressed() {
  if (state === 'welcome') {
    if (inButton(width / 2 - 80, 330, 160, 44)) {
      startCountdown(true);
    }
  }
  if (state === 'lost') {
    if (inButton(width / 2 - 80, 300, 160, 44)) {
      startCountdown(true);
    }
  }
}

/* DRAW LOOP */
function draw() {
  background(224, 224, 224);
  paddle.moveTowards(mouse.x, 380, 1);
  
  /* ── WELCOME ── */
  if (state === 'welcome') {
    drawOverlay(160);
    
    noStroke();
    fill(0, 180, 180);
    textAlign(CENTER);
    textSize(36);
    text('Paddle Ball', width / 2, 130);
    
    fill(255);
    textSize(16);
    text('Keep the ball in the air.', width / 2, 180);
    text("Don't let it touch the ground!", width / 2, 205);
    
    fill(255, 220, 0);
    textSize(14);
    text('You start with 3 lives', width / 2, 250);
    text('Ball speeds up as your score grows.', width / 2, 272);
    text('Angle the ball with paddle edges!', width / 2, 294);
    
    // Pulsing button
    let pulse = sin(millis() / 300) * 0.5 + 0.5;
    fill(lerpColor(color(0, 160, 160), color(0, 200, 200), pulse));
    noStroke();
    rect(width / 2 - 80, 330, 160, 44, 22);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('PLAY', width / 2, 352);
    return;
  }
  
  /* ── COUNTDOWN ── */
  if (state === 'countdown') {
    drawHUD();
    
    let elapsed = (millis() - countdownTimer) / 1000;
    let num = 3 - floor(elapsed);
    
    if (num <= 0) {
      startGame();
      return;
    }
    
    drawOverlay(120);
    noStroke();
    fill(255, 220, 0);
    textAlign(CENTER);
    textSize(90);
    text(num, width / 2, height / 2 + 30);
    
    fill(255);
    textSize(20);
    text('Get ready!', width / 2, height / 2 - 50);
    return;
  }
  
  /* ── PLAYING ── */
  if (state === 'playing') {
    drawHUD();
    
    if (ball.collides(paddle)) {
      let offset = (ball.x - paddle.x) / (paddle.w / 2);
      let angle = -90 + offset * 50;
      ball.direction = angle + random(-5, 5);
      ball.speed = 8 + floor(score / 5);
      score++;
      if (score > highScore) highScore = score;
    }
    
    if (ball.y > 410) {
      lives--;
      if (lives <= 0) {
        if (score > highScore) highScore = score;
        state = 'lost';
      } else {
        startCountdown(false); // resume — don't reset score/lives
      }
    }
    return;
  }
  
  /* ── GAME OVER ── */
  if (state === 'lost') {
    drawHUD();
    drawOverlay(170);
    
    noStroke();
    fill(220, 60, 60);
    textAlign(CENTER);
    textSize(38);
    text('You Lose!', width / 2, 140);
    
    fill(255);
    textSize(20);
    text('Final Score: ' + score, width / 2, 195);
    
    fill(255, 220, 0);
    textSize(18);
    text('Best: ' + highScore, width / 2, 230);
    
    fill(score >= highScore ? color(255, 220, 0) : color(180, 180, 180));
    textSize(14);
    text(score >= highScore ? 'New high score!' : 'Can you beat ' + highScore + '?', width / 2, 265);
    
    fill(0, 180, 180);
    noStroke();
    rect(width / 2 - 80, 300, 160, 44, 22);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('PLAY AGAIN', width / 2, 322);
  }
}
