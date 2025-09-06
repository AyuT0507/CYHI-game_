const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Game speed and score
let baseGamespeed = 2;
let score = 0;
const SCORE_PER_MS = 0.01;
const SPEED_GROWTH_FACTOR = 0.001;

// Background (parallax)
const layers = [];
for (let i = 1; i <= 5; i++) {
  const img = new Image();
  img.src = `layer-${i}.png`;
  layers.push(img);
}
const layerSpeeds = [0.2, 0.4, 0.6, 0.8, 1.0];
const xOffsets = new Array(5).fill(0);

// Player sprite
const playerImage = new Image();
playerImage.src = 'shadow_dog.png';

// Sprite details
let frameWidth, frameHeight;
const scale = 2.0;

// Animations
const animations = {
  run:   { row: 0, frames: 9 },
  jump:  { row: 1, frames: 7 },
  slide: { row: 2, frames: 7 }
};

let currentState = "run";
let frameX = 0;
let frameCount = 0;
const staggerFrames = 6;

// Physics
let dogY;
let groundY;
let groundBottomY;
let velocityY = 0;
const gravity = 0.7;
const jumpPower = -15;

// Obstacles
const obstacleImages = ["rock.png", "crate.png"].map(src => {
  const img = new Image();
  img.src = src;
  return img;
});
let obstacles = [];
let obstacleTimer = 0;
let obstacleInterval = 1600;

// Hitboxes
const HITBOX = {
  dog:  { top: 18, right: 30, bottom: 10, left: 30 },
  obst: { top: 6, right: 6, bottom: 6, left: 6 }
};

function shrinkRect(r, pad) {
  return {
    x: r.x + pad.left,
    y: r.y + pad.top,
    width: Math.max(0, r.width - pad.left - pad.right),
    height: Math.max(0, r.height - pad.top - pad.bottom)
  };
}

// Game state
let lastTimestamp = 0;
let gameOver = true; // start on menu
let showStartButton = true;

function resetGame() {
  score = 0;
  obstacles = [];
  obstacleTimer = 0;
  lastTimestamp = 0;
  gameOver = false;
  showStartButton = false;
  currentState = "run";
  dogY = groundY;
  velocityY = 0;
  frameX = 0;
  requestAnimationFrame(animate);
}

function spawnObstacle() {
  const img = obstacleImages[Math.floor(Math.random() * obstacleImages.length)];
  const size = 60 + Math.random() * 40;
  obstacles.push({
    img,
    x: CANVAS_WIDTH,
    y: groundBottomY - size,
    width: size,
    height: size
  });
}

function drawDog() {
  const anim = animations[currentState];
  if (frameCount % staggerFrames === 0) frameX = (frameX + 1) % anim.frames;

  const destWidth = frameWidth * scale;
  const destHeight = frameHeight * scale;
  const destX = (CANVAS_WIDTH - destWidth) / 4;
  const destY = dogY;

  ctx.drawImage(
    playerImage,
    frameX * frameWidth, anim.row * frameHeight, frameWidth, frameHeight,
    destX, destY, destWidth, destHeight
  );

  const dogRect = { x: destX, y: destY, width: destWidth, height: destHeight };
  const dogHit = shrinkRect(dogRect, HITBOX.dog);
  return { dogHit };
}

function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function animate(timestamp) {
  if (gameOver) return;

  const delta = lastTimestamp ? (timestamp - lastTimestamp) : 16;
  lastTimestamp = timestamp;

  score += SCORE_PER_MS * delta;
  const gamespeed = baseGamespeed + score * SPEED_GROWTH_FACTOR;

  // Parallax
  layers.forEach((layer, i) => {
    xOffsets[i] -= gamespeed * layerSpeeds[i];
    if (xOffsets[i] <= -CANVAS_WIDTH) xOffsets[i] += CANVAS_WIDTH;
  });

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw bg
  layers.forEach((layer, i) => {
    if (layer.complete && layer.naturalWidth) {
      ctx.drawImage(layer, xOffsets[i], 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.drawImage(layer, xOffsets[i] + CANVAS_WIDTH, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  });

  // Jump physics
  velocityY += gravity;
  dogY += velocityY;
  if (dogY > groundY) {
    dogY = groundY;
    velocityY = 0;
    if (currentState === "jump") currentState = "run";
  }

  // Dog
  const { dogHit } = drawDog();
  frameCount++;

  // Obstacles
  obstacleTimer += delta;
  if (obstacleTimer > obstacleInterval) {
    spawnObstacle();
    obstacleTimer = 0;
  }

  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= gamespeed * 3;
    ctx.drawImage(ob.img, ob.x, ob.y, ob.width, ob.height);

    const obRect = shrinkRect({ x: ob.x, y: ob.y, width: ob.width, height: ob.height }, HITBOX.obst);
    if (checkCollision(dogHit, obRect)) {
      gameOver = true;
      showStartButton = true;
      drawGameOver();
      return;
    }
    if (ob.x + ob.width < 0) obstacles.splice(i, 1);
  }

  // Score
  ctx.save();
  ctx.font = '24px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + Math.floor(score), CANVAS_WIDTH - 20, 40);
  ctx.restore();

  requestAnimationFrame(animate);
}

function drawGameOver() {
  ctx.save();
  ctx.font = "48px Arial";
  ctx.fillStyle = "red";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);

  ctx.font = "28px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Final Score: " + Math.floor(score), CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  // Draw start button
  const btnW = 200, btnH = 60;
  const btnX = CANVAS_WIDTH / 2 - btnW / 2;
  const btnY = CANVAS_HEIGHT / 2 + 40;
  ctx.fillStyle = "black";
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = "white";
  ctx.strokeRect(btnX, btnY, btnW, btnH);

  ctx.fillStyle = "white";
  ctx.font = "28px Arial";
  ctx.fillText("Restart", CANVAS_WIDTH / 2, btnY + 40);
  ctx.restore();

  // Save button area for click detection
  startButton = { x: btnX, y: btnY, w: btnW, h: btnH };
}


// Start button detection
let startButton = null;
canvas.addEventListener("click", e => {
  if (showStartButton && startButton) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (mx >= startButton.x && mx <= startButton.x + startButton.w &&
        my >= startButton.y && my <= startButton.y + startButton.h) {
      resetGame();
    }
  }
});

// Load & init
const allImages = [...layers, playerImage, ...obstacleImages];
let loadedCount = 0;
allImages.forEach(img => {
  img.onload = () => {
    loadedCount++;
    if (img === playerImage) {
      frameWidth = playerImage.width / animations.run.frames;
      frameHeight = playerImage.height / Object.keys(animations).length;

      groundY = CANVAS_HEIGHT - frameHeight * scale - 50;
      groundBottomY = groundY + frameHeight * scale;
      dogY = groundY;
    }
    if (loadedCount === allImages.length) {
      drawGameOver(); // show start screen
    }
  };
});

// Controls
window.addEventListener("keydown", e => {
  if (gameOver) return;
  if (e.code === "ArrowUp" && dogY === groundY) {
    currentState = "jump";
    frameX = 0;
    velocityY = jumpPower;
  } else if (e.code === "ArrowDown" && currentState !== "slide") {
    if (dogY === groundY) {
      currentState = "slide";
      frameX = 0;
    }
  }
});
window.addEventListener("keyup", e => {
  if (gameOver) return;
  if (e.code === "ArrowDown" && currentState === "slide") {
    currentState = "run";
    frameX = 0;
  }
});


