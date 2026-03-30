//Use the mouse to move the paddle from left to right. Keep the ball in the air. If it touches the ground, you lose.

/* VARIABLES */
let paddle, ball;
let score = 0;
let highScore = 0;
let lives = 3;
let countdown = 3;
let countdownTimer = 0;
let state = 'welcome'; // 'welcome', 'countdown', 'playing', 'lost'

/* PRELOAD */
function preload() {}

/* SETUP */
function setup() {
  createCanvas(400,400);
  textfont('Arial');

  //Create paddle 
  paddle = new Sprite(200,380,100,20);
  paddle.color = color(95,158,160);
  paddle.rotationLock = true;
  paddle.collider = "kinematic";
  
  //Create ball
  ball = new Sprite(200, 200, 20);
  ball.color = color(0,128,128);
  ball.speed = 0;
  ball.bounciness = 1;
  ball.friction = 0 ;
  ball.collider = "dynamic";

  //Create walls
  walls = new Group();
	walls.w = 10;
	walls.h = 400;
  walls.collider = "static";
  walls.visible = false;

  new walls.Sprite(0, height / 2);
  new walls.Sprite(width, height / 2);

  let wallTop = new walls.Sprite(width / 2, 0);
  wallTop.rotation = 90;
}

  /* HELPERS */
  function resetBall() {
    ball.x = 200;
    ball.y = 200;
    ball.vel.x = 0;
    ball.vel.y = 0;
    ball.speed = 0;
    ball.direction = 'down';
  }

  function startCountdown() {
    state = 'countdown';
    countdown = 3;
    countdownTimer = millis();
    resetBall();
  }

  function startGame() {
    score = 0;
    lives = 3;
    state = 'playing';
    resetBall();
    ball.direction = random(200, 340); //random downward angle
    ball.speed = 5;
  }

  function drawOverlay(alpha) {
  fill(0, 0, 0, alpha);
  noStroke();
  rect(0, 0, width, height);
}

function drawHUD() {
  // Score
  fill(0, 128, 128);
  textAlign(LEFT);
  textSize(18);
  text('Score: ' + score, 10, 28);

  // High score
  textAlign(CENTER);
  text('Best: ' + highScore, width / 2, 28);

  // Lives (hearts)
  textAlign(RIGHT);
  fill(220, 60, 60);
  let hearts = '';
  for (let i = 0; i < lives; i++) hearts += '♥ ';
  text(hearts.trim(), width - 10, 28);
}



/* DRAW LOOP */
function draw() {
  background(224,224,224);

  // Always move the paddle
  paddle.moveTowards(mouse.x, 380, 1);

 /* ── WELCOME SCREEN ── */
  if (state === 'welcome') {
    drawOverlay(160);

    fill(0,180,180);
    textAlign(CENTER);
    textSize(36);
    text`PONG GAME`, (width /2, height / 2, 130);

    fill(255);
    textSize(16);
    text('Keep the ball in the air.', width / 2, 180);
    text("Don't let it touch the ground!", width / 2, 205);

    fill(255, 220, 0);
    textSize(14);
    text('You start with ♥ ♥ ♥ 3 lives', width / 2, 250);
    text('Ball speeds up as your score grows.', width / 2, 272);
    text('Angle the ball with paddle edges!', width / 2, 294);

       // Pulsing button
    let pulse = sin(millis() / 300) * 10;
    fill(0, 180, 180);
    noStroke();
    rect(width / 2 - 80, 330, 160, 44, 22);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('▶  Play', width / 2, 352 + pulse * 0.05);

    if (mouseIsPressed && mouseX > width/2-80 && mouseX < width/2+80 &&
        mouseY > 330 && mouseY < 374) {
      startCountdown();
    }
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

    drawOverlay(100);
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

    // Angle control: offset based on hit position on paddle
    if (ball.collides(paddle)) {
      let offset = (ball.x - paddle.x) / (paddle.w / 2); // -1 to 1
      let angle = -90 + offset * 50; // upward, angled by hit position
      ball.direction = angle + random(-5, 5);
      ball.speed = 8 + floor(score / 5); // difficulty ramp
      score++;
      if (score > highScore) highScore = score;
    }

    // Ball fell
    if (ball.y > 395) {
      lives--;
      if (lives <= 0) {
        if (score > highScore) highScore = score;
        state = 'lost';
      } else {
        startCountdown();
      }
    }
    return;
  }

  /* ── GAME OVER ── */
  if (state === 'lost') {
    drawHUD();
    drawOverlay(170);

    fill(220, 60, 60);
    textAlign(CENTER);
    textSize(38);
    text('💀 You Lose!', width / 2, 140);

    fill(255);
    textSize(20);
    text('Score: ' + score, width / 2, 195);

    fill(255, 220, 0);
    textSize(18);
    text('🏆 Best: ' + highScore, width / 2, 230);

    fill(score >= highScore ? color(255,220,0) : color(180,180,180));
    textSize(14);
    text(score >= highScore ? '🎉 New high score!' : 'Can you beat ' + highScore + '?', width / 2, 265);

    // Play again button
    fill(0, 180, 180);
    noStroke();
    rect(width / 2 - 80, 300, 160, 44, 22);
    fill(255);
    textSize(18);
    textAlign(CENTER, CENTER);
    text('▶  Play Again', width / 2, 322);

    if (mouseIsPressed && mouseX > width/2-80 && mouseX < width/2+80 &&
        mouseY > 300 && mouseY < 344) {
      startCountdown();
    }
  }
}
