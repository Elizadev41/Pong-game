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



/* DRAW LOOP REPEATS */
function draw() {
  background(224,224,224);

  //Move the paddle
  paddle.moveTowards(mouse.x, 380, 1);

  //When ball collides with paddle bounce off and increase score
  if (ball.collides(paddle)) {
    ball.speed = 8;
    score = score + 1;
    ball.direction = ball.direction + random (-10,10);
  }

  //When ball hits ground you lose
  if (ball.y > 390) {
    ball.y = 430
    ball.speed = 0;
    
    // Draw you lose to screen
    fill(0);
    textSize(20);
    text('You lose!', 160, 160); 
  }

  //Draw the score
  fill(0, 128, 128);
  textAlign(LEFT);
  textSize(20);
  text('Score = ' + score, 10, 30);
}	