const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const finalScoreElement = document.getElementById('finalScore');

const road = { left: 45, width: 390 };
const player = { x: 216, y: 610, width: 48, height: 78, speed: 7 };

let enemies = [];
let coins = [];
let particles = [];
let keys = {};
let score = 0;
let best = Number(localStorage.getItem('eliteRacingBest') || 0);
let roadOffset = 0;
let enemyTimer = 0;
let coinTimer = 0;
let speed = 4;
let running = false;
let animationId = 0;

bestElement.textContent = best;

function randomLane() {
  const lanes = [82, 176, 270, 364];
  return lanes[Math.floor(Math.random() * lanes.length)] - 24;
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawRoad() {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#334155';
  ctx.fillRect(road.left, 0, road.width, canvas.height);

  ctx.fillStyle = '#22c55e';
  ctx.fillRect(0, 0, road.left, canvas.height);
  ctx.fillRect(road.left + road.width, 0, canvas.width - road.left - road.width, canvas.height);

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(road.left - 8, 0, 8, canvas.height);
  ctx.fillRect(road.left + road.width, 0, 8, canvas.height);

  ctx.fillStyle = '#facc15';
  for (let y = roadOffset - 100; y < canvas.height + 100; y += 100) {
    for (let line = 1; line < 4; line++) {
      ctx.fillRect(road.left + line * (road.width / 4) - 3, y, 6, 48);
    }
  }
}

function drawCar(car, color, isPlayer = false) {
  ctx.save();
  ctx.translate(car.x, car.y);

  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.fillRect(5, 8, car.width - 2, car.height);

  ctx.fillStyle = '#050505';
  ctx.fillRect(-5, 12, 12, 22);
  ctx.fillRect(car.width - 7, 12, 12, 22);
  ctx.fillRect(-5, car.height - 34, 12, 22);
  ctx.fillRect(car.width - 7, car.height - 34, 12, 22);

  ctx.fillStyle = color;
  roundedRect(0, 0, car.width, car.height, 12);
  ctx.fill();

  ctx.fillStyle = isPlayer ? '#bae6fd' : '#94a3b8';
  roundedRect(7, 12, car.width - 14, 21, 5);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  roundedRect(9, 39, car.width - 18, 23, 5);
  ctx.fill();

  ctx.fillStyle = '#fde68a';
  ctx.fillRect(7, 5, 8, 5);
  ctx.fillRect(car.width - 15, 5, 8, 5);

  ctx.restore();
}

function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x + coin.size / 2, coin.y + coin.size / 2);
  ctx.rotate(coin.angle);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff7c2';
  ctx.beginPath();
  ctx.arc(-3, -3, coin.size / 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawParticle(particle) {
  ctx.globalAlpha = particle.life;
  ctx.fillStyle = particle.color;
  ctx.beginPath();
  ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function collision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

function burst(x, y, color) {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 5,
      vy: (Math.random() - .5) * 5,
      size: 3 + Math.random() * 4,
      life: 1,
      color
    });
  }
}

function spawnEnemy() {
  enemies.push({
    x: randomLane(),
    y: -90,
    width: 48,
    height: 78,
    color: ['#ef4444', '#a855f7', '#14b8a6', '#f97316'][Math.floor(Math.random() * 4)]
  });
}

function spawnCoin() {
  const x = randomLane() + 4;
  coins.push({ x, y: -35, size: 24, angle: 0, width: 24, height: 24 });
}

function update() {
  roadOffset = (roadOffset + speed) % 100;

  if (keys.ArrowLeft || keys.KeyA) player.x -= player.speed;
  if (keys.ArrowRight || keys.KeyD) player.x += player.speed;
  player.x = Math.max(road.left + 8, Math.min(road.left + road.width - player.width - 8, player.x));

  enemyTimer++;
  coinTimer++;
  if (enemyTimer > Math.max(28, 70 - speed * 3)) {
    spawnEnemy();
    enemyTimer = 0;
  }
  if (coinTimer > 115) {
    spawnCoin();
    coinTimer = 0;
  }

  enemies.forEach(enemy => enemy.y += speed);
  coins.forEach(coin => { coin.y += speed; coin.angle += .08; });
  enemies = enemies.filter(enemy => enemy.y < canvas.height + 100);
  coins = coins.filter(coin => coin.y < canvas.height + 100);

  particles.forEach(particle => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= .025;
  });
  particles = particles.filter(particle => particle.life > 0);

  for (const enemy of enemies) {
    if (collision(player, enemy)) {
      burst(player.x + player.width / 2, player.y + player.height / 2, '#ef4444');
      endGame();
      return;
    }
  }

  coins = coins.filter(coin => {
    if (collision(player, coin)) {
      score += 25;
      burst(coin.x + 12, coin.y + 12, '#facc15');
      return false;
    }
    return true;
  });

  score++;
  speed = Math.min(10, 4 + score / 500);
  scoreElement.textContent = score;
}

function draw() {
  drawRoad();
  enemies.forEach(enemy => drawCar(enemy, enemy.color));
  coins.forEach(drawCoin);
  particles.forEach(drawParticle);
  drawCar(player, '#2563eb', true);
}

function loop() {
  if (!running) return;
  update();
  draw();
  if (running) animationId = requestAnimationFrame(loop);
}

function startGame() {
  cancelAnimationFrame(animationId);
  enemies = [];
  coins = [];
  particles = [];
  keys = {};
  score = 0;
  speed = 4;
  enemyTimer = 0;
  coinTimer = 0;
  roadOffset = 0;
  player.x = 216;
  scoreElement.textContent = '0';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  running = true;
  loop();
}

function endGame() {
  running = false;
  cancelAnimationFrame(animationId);
  draw();

  if (score > best) {
    best = score;
    localStorage.setItem('eliteRacingBest', String(best));
  }
  bestElement.textContent = best;
  finalScoreElement.textContent = score;
  setTimeout(() => gameOverScreen.classList.remove('hidden'), 350);
}

window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', ' '].includes(event.code)) event.preventState?.;
  keys[event.code] = true;
});
window.addEventListener('keyup', event => { keys[event.code] = false; });

function bindTouch(buttonId, keyCode) {
  const button = document.getElementById(buttonId);
  const press = event => { event.preventDefault(); keys[keyCode] = true; };
  const release = event => { event.preventDefault(); keys[keyCode] = false; };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('pointercancel', release);
}

bindTouch('leftButton', 'ArrowLeft');
bindTouch('rightButton', 'ArrowRight');
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);

draw();
