const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const shopScreen = document.getElementById('shopScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const shopButton = document.getElementById('shopButton');
const closeShopButton = document.getElementById('closeShopButton');
const menuButton = document.getElementById('menuButton');
const carList = document.getElementById('carList');
const coinBalanceElement = document.getElementById('coinBalance');
const shopBalanceElement = document.getElementById('shopBalance');
const scoreElement = document.getElementById('score');
const bestElement = document.getElementById('best');
const finalScoreElement = document.getElementById('finalScore');

const road = { left: 45, width: 390 };
const lanes = [82, 176, 270, 364].map(center => center - 24);
const player = { x: 216, y: 610, width: 48, height: 78, speed: 7 };
const jumpFrames = 42;
const cars = [
  { id: 'blue', name: 'الزرقاء', color: '#2563eb', cost: 0 },
  { id: 'red', name: 'الحمراء', color: '#ef4444', cost: 8 },
  { id: 'purple', name: 'البنفسجية', color: '#a855f7', cost: 18 },
  { id: 'green', name: 'الخضراء', color: '#14b8a6', cost: 30 },
  { id: 'gold', name: 'الذهبية', color: '#eab308', cost: 50 }
];

function loadJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value == null ? fallback : value;
  } catch {
    return fallback;
  }
}

let enemies = [];
let coins = [];
let particles = [];
let keys = {};
let score = 0;
let best = Number(localStorage.getItem('eliteRacingBest') || 0);
let wallet = Math.max(0, Number(localStorage.getItem('eliteRacingCoins') || 0));
let unlockedCars = loadJSON('eliteRacingCars', ['blue']);
if (!Array.isArray(unlockedCars)) unlockedCars = ['blue'];
if (!unlockedCars.includes('blue')) unlockedCars.unshift('blue');
let selectedCarId = localStorage.getItem('eliteRacingSelectedCar') || 'blue';
if (!unlockedCars.includes(selectedCarId)) selectedCarId = 'blue';
let roadOffset = 0;
let enemyTimer = 0;
let coinTimer = 0;
let jumpTimer = 0;
let speed = 4;
let running = false;
let animationId = 0;

function selectedCar() {
  return cars.find(car => car.id === selectedCarId) || cars[0];
}

function updateWalletDisplay() {
  coinBalanceElement.textContent = `${wallet} 🪙`;
  shopBalanceElement.textContent = `${wallet} 🪙`;
}

function renderShop() {
  updateWalletDisplay();
  carList.replaceChildren();
  for (const car of cars) {
    const card = document.createElement('div');
    card.className = 'car-card';
    const preview = document.createElement('div');
    preview.className = 'car-preview';
    preview.style.backgroundColor = car.color;
    const info = document.createElement('div');
    info.className = 'car-info';
    const name = document.createElement('strong');
    name.textContent = `السيارة ${car.name}`;
    const price = document.createElement('span');
    price.textContent = unlockedCars.includes(car.id) ? 'مفتوحة' : `السعر: ${car.cost} 🪙`;
    info.append(name, price);
    const action = document.createElement('button');
    if (selectedCarId === car.id) {
      action.textContent = 'مختارة';
      action.disabled = true;
    } else if (unlockedCars.includes(car.id)) {
      action.textContent = 'اختر';
      action.addEventListener('click', () => selectCar(car.id));
    } else {
      action.textContent = 'شراء';
      action.disabled = wallet < car.cost;
      action.addEventListener('click', () => buyCar(car.id));
    }
    card.append(preview, info, action);
    carList.append(card);
  }
}

function selectCar(carId) {
  if (!unlockedCars.includes(carId)) return;
  selectedCarId = carId;
  localStorage.setItem('eliteRacingSelectedCar', selectedCarId);
  renderShop();
}

function buyCar(carId) {
  const car = cars.find(item => item.id === carId);
  if (!car || unlockedCars.includes(carId) || wallet < car.cost) return;
  wallet -= car.cost;
  unlockedCars.push(carId);
  selectedCarId = carId;
  localStorage.setItem('eliteRacingCoins', String(wallet));
  localStorage.setItem('eliteRacingCars', JSON.stringify(unlockedCars));
  localStorage.setItem('eliteRacingSelectedCar', selectedCarId);
  renderShop();
}

bestElement.textContent = best;
updateWalletDisplay();

function randomLane() {
  return lanes[Math.floor(Math.random() * lanes.length)];
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

function drawCar(car, color, isPlayer = false, jumping = false) {
  ctx.save();
  ctx.translate(car.x, car.y);
  if (jumping) {
    ctx.shadowColor = 'rgba(0,0,0,.65)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 18;
  }
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
  return a.x < b.x + b.width && a.x + a.width > b.x &&
    a.y < b.y + b.height && a.y + a.height > b.y;
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

function spawnEnemyWave() {
  const carCount = score > 1800 ? 3 : (score > 500 ? 2 : 1);
  const openLane = Math.floor(Math.random() * lanes.length);
  const availableLanes = lanes.filter((_, index) => index !== openLane);
  for (let i = availableLanes.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [availableLanes[i], availableLanes[j]] = [availableLanes[j], availableLanes[i]];
  }
  const colors = ['#ef4444', '#a855f7', '#14b8a6', '#f97316', '#e11d48', '#0ea5e9'];
  for (let i = 0; i < carCount; i++) {
    enemies.push({
      x: availableLanes[i], y: -90 - (i % 2) * 35, width: 48, height: 78,
      color: colors[Math.floor(Math.random() * colors.length)]
    });
  }
}

function spawnCoin() {
  coins.push({ x: randomLane() + 4, y: -35, size: 24, angle: 0, width: 24, height: 24 });
}

function update() {
  roadOffset = (roadOffset + speed) % 100;
  if (keys.ArrowLeft || keys.KeyA) player.x -= player.speed;
  if (keys.ArrowRight || keys.KeyD) player.x += player.speed;
  player.x = Math.max(road.left + 8, Math.min(road.left + road.width - player.width - 8, player.x));

  if (jumpTimer > 0) jumpTimer--;
  enemyTimer++;
  coinTimer++;
  const spawnInterval = Math.max(22, 62 - speed * 3.2);
  if (enemyTimer > spawnInterval) {
    spawnEnemyWave();
    enemyTimer = 0;
  }
  if (coinTimer > 105) {
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

  const jumpProgress = jumpTimer / jumpFrames;
  const jumpHeight = jumpTimer > 0 ? Math.sin(jumpProgress * Math.PI) * 62 : 0;
  const playerHitbox = { x: player.x, y: player.y - jumpHeight, width: player.width, height: player.height };
  for (const enemy of enemies) {
    if (collision(playerHitbox, enemy)) {
      burst(player.x + player.width / 2, player.y + player.height / 2, '#ef4444');
      endGame();
      return;
    }
  }

  coins = coins.filter(coin => {
    if (collision(playerHitbox, coin)) {
      wallet++;
      localStorage.setItem('eliteRacingCoins', String(wallet));
      updateWalletDisplay();
      score += 25;
      burst(coin.x + 12, coin.y + 12, '#facc15');
      return false;
    }
    return true;
  });
  score++;
  speed = Math.min(12, 4 + score / 360);
  scoreElement.textContent = score;
}

function draw() {
  drawRoad();
  enemies.forEach(enemy => drawCar(enemy, enemy.color));
  coins.forEach(drawCoin);
  particles.forEach(drawParticle);
  const jumpProgress = jumpTimer / jumpFrames;
  const jumpHeight = jumpTimer > 0 ? Math.sin(jumpProgress * Math.PI) * 62 : 0;
  drawCar({ ...player, y: player.y - jumpHeight }, selectedCar().color, true, jumpTimer > 0);
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
  jumpTimer = 0;
  roadOffset = 0;
  player.x = 216;
  scoreElement.textContent = '0';
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  shopScreen.classList.add('hidden');
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

function openShop() {
  renderShop();
  startScreen.classList.add('hidden');
  shopScreen.classList.remove('hidden');
}

function returnToMenu() {
  running = false;
  cancelAnimationFrame(animationId);
  gameOverScreen.classList.add('hidden');
  shopScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  draw();
}

window.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'KeyA', 'KeyD', ' '].includes(event.code)) event.preventDefault();
  if (event.code === 'ArrowUp' && running && jumpTimer === 0) jumpTimer = jumpFrames;
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
shopButton.addEventListener('click', openShop);
closeShopButton.addEventListener('click', () => {
  shopScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
});
menuButton.addEventListener('click', returnToMenu);
draw();
