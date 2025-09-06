const canvas = document.getElementById('canvas1');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// ===== UI state (declare before it's used anywhere)
let startButton = null;

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

// Sounds
const jumpSound = new Audio("jump.wav");       // replace with your jump sound file
const hitSound = new Audio("hit.wav");         // replace with your hit sound file

// Optional: prevent delay on replay by allowing overlap
jumpSound.preload = "auto";
hitSound.preload = "auto";
const bgMusic = new Audio("bgmusic.mp3");   // 🎵 your background music file

bgMusic.loop = true;       // make it loop forever
bgMusic.volume = 0.5;      // adjust volume (0 = mute, 1 = full)
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

// Coins & Buffs
const coinImage = new Image();
coinImage.src = "coin.jpeg";

const buffImage = new Image();
buffImage.src = "buff.webp";

let coins = [];
let buffs = [];

// Lives & Buff state
let lives = 2;
let nextLifeThreshold = 100;
let activeBuff = null;
let buffEndTime = 0;

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
  coins = [];
  buffs = [];
  obstacleTimer = 0;
  lastTimestamp = 0;
  gameOver = false;
  showStartButton = false;
  currentState = "run";
  dogY = groundY;
  velocityY = 0;
  frameX = 0;
  lives = 2;
  nextLifeThreshold = 100;
  activeBuff = null;
  bgMusic.currentTime = 0;
  bgMusic.play();
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

function spawnCoin() {
  const size = 30;
  coins.push({
    x: CANVAS_WIDTH,
    y: groundY - 100 - Math.random() * 80,
    width: size,
    height: size,
    img: coinImage
  });
}

function spawnBuff() {
  const size = 40;
  buffs.push({
    x: CANVAS_WIDTH,
    y: groundY - 120,
    width: size,
    height: size,
    img: buffImage
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

function activateBuff() {
  const buffsList = ["shield", "doubleScore", "slowObstacles"];
  activeBuff = buffsList[Math.floor(Math.random() * buffsList.length)];
  buffEndTime = performance.now() + 10000; // 10 sec
}

function animate(timestamp) {
  if (gameOver) return;

  const delta = lastTimestamp ? (timestamp - lastTimestamp) : 16;
  lastTimestamp = timestamp;

  // Buff check
  if (activeBuff && performance.now() > buffEndTime) {
    activeBuff = null;
  }

  // Score & speed
  let scoreGain = SCORE_PER_MS * delta;
  if (activeBuff === "doubleScore") scoreGain *= 2;
  score += scoreGain;
  let gamespeed = baseGamespeed + score * SPEED_GROWTH_FACTOR;
  if (activeBuff === "slowObstacles") gamespeed *= 0.6;

  // Extra life
  if (score >= nextLifeThreshold) {
    lives++;
    nextLifeThreshold += 100;
  }

  // Parallax
  layers.forEach((layer, i) => {
    xOffsets[i] -= gamespeed * layerSpeeds[i];
    if (xOffsets[i] <= -CANVAS_WIDTH) xOffsets[i] += CANVAS_WIDTH;
  });

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw bg (guard for missing images)
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
    if (ob.img.complete && ob.img.naturalWidth) {
      ctx.drawImage(ob.img, ob.x, ob.y, ob.width, ob.height);
    }
    const obRect = shrinkRect({ x: ob.x, y: ob.y, width: ob.width, height: ob.height }, HITBOX.obst);
    if (checkCollision(dogHit, obRect)) {
  hitSound.currentTime = 0;
  hitSound.play();
  bgMusic.pause();
  setTimeout(700,bgMusic.play);
  if (activeBuff === "shield") {
        activeBuff = null;
        obstacles.splice(i, 1);
        bgMusic.play();
        continue;
      } else if (lives > 0) {
        lives--;
        obstacles.splice(i, 1);
        bgMusic.play();
        continue;
      } else {
        gameOver = true;
        showStartButton = true;
        drawGameOver();
        return;
      }
  return;
}
    if (ob.x + ob.width < 0) obstacles.splice(i, 1);
  }

  // Coins
  if (Math.random() < 0.002) spawnCoin();
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.x -= gamespeed * 3;
    if (c.img.complete && c.img.naturalWidth) {
      ctx.drawImage(c.img, c.x, c.y, c.width, c.height);
    }
    if (checkCollision(dogHit, c)) {
      score += 5;
      coins.splice(i, 1);
      continue;
    }
    if (c.x + c.width < 0) coins.splice(i, 1);
  }

  // Buffs
  if (Math.random() < 0.0005) spawnBuff();
  for (let i = buffs.length - 1; i >= 0; i--) {
    const b = buffs[i];
    b.x -= gamespeed * 3;
    if (b.img.complete && b.img.naturalWidth) {
      ctx.drawImage(b.img, b.x, b.y, b.width, b.height);
    }
    if (checkCollision(dogHit, b)) {
      activateBuff();
      buffs.splice(i, 1);
      continue;
    }
    if (b.x + b.width < 0) buffs.splice(i, 1);
  }

  // HUD
  ctx.save();
  ctx.font = '24px Arial';
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText('Score: ' + Math.floor(score), CANVAS_WIDTH - 20, 40);
  ctx.textAlign = 'left';
  ctx.fillText('Lives: ' + lives, 20, 40);
  if (activeBuff) {
    ctx.fillText('Buff: ' + activeBuff, 20, 70);
  }
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

  startButton = { x: btnX, y: btnY, w: btnW, h: btnH };
}

// Start button detection
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

// ===== Robust Load & Init (fixes cached-image race + missing files)
const allImages = [...layers, playerImage, ...obstacleImages, coinImage, buffImage];
let loadedCount = 0;

function handleLoaded(img) {
  loadedCount++;
  if (img === playerImage) {
    frameWidth = playerImage.width / animations.run.frames;
    frameHeight = playerImage.height / Object.keys(animations).length;
    groundY = CANVAS_HEIGHT - frameHeight * scale - 50;
    groundBottomY = groundY + frameHeight * scale;
    dogY = groundY;
  }
  if (loadedCount === allImages.length) {
    drawGameOver(); // show start screen once everything attempted
  }
}

allImages.forEach(img => {
  if (img.complete && img.naturalWidth) {
    handleLoaded(img);
  } else {
    img.onload = () => handleLoaded(img);
    img.onerror = () => handleLoaded(img); // don't hang if an asset is missing
  }
});

// Controls
window.addEventListener("keydown", e => {
  if (gameOver) return;
  if (e.code === "ArrowUp" && dogY === groundY) {
  currentState = "jump";
  frameX = 0;
  velocityY = jumpPower;
  jumpSound.currentTime = 0;   // rewind so it plays every time
  jumpSound.play();
}
 else if (e.code === "ArrowDown" && currentState !== "slide") {
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
