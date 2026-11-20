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

function drawTree(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,.2)';
  ctx.beginPath();
  ctx.ellipse(0, 25, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#713f12';
  ctx.fillRect(-3, 5, 6, 22);
  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(0, -2, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath();
  ctx.arc(-5, -8, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoad() {
  const grass = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grass.addColorStop(0, '#166534');
  grass.addColorStop(.5, '#15803d');
  grass.addColorStop(1, '#14532d');
  ctx.fillStyle = grass;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Scrolling roadside trees and subtle grass flecks add depth to the map.
  for (let i = 0; i < 7; i++) {
    const y = ((i * 132 + roadOffset * 2.2) % (canvas.height + 160)) - 80;
    const scale = .72 + (i % 3) * .12;
    drawTree(20 + (i % 2) * 12, y, scale);
    drawTree(460 - (i % 2) * 12, y - 55, scale);
    ctx.fillStyle = 'rgba(187,247,208,.25)';
    ctx.fillRect(road.left - 20 - (i % 3) * 5, y + 46, 3, 10);
    ctx.fillRect(road.left + road.width + 15 + (i % 3) * 5, y - 20, 3, 10);
  }

  const asphalt = ctx.createLinearGradient(road.left, 0, road.left + road.width, 0);
  asphalt.addColorStop(0, '#263449');
  asphalt.addColorStop(.5, '#3b4656');
  asphalt.addColorStop(1, '#263449');
  ctx.fillStyle = asphalt;
  ctx.fillRect(road.left, 0, road.width, canvas.height);

  // Road shoulders, rumble strips and edge lines.
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(road.left - 9, 0, 9, canvas.height);
  ctx.fillRect(road.left + road.width, 0, 9, canvas.height);
  for (let y = roadOffset % 36 - 36; y < canvas.height; y += 36) {
    ctx.fillStyle = Math.floor((y + roadOffset) / 36) % 2 ? '#f8fafc' : '#ef4444';
    ctx.fillRect(road.left - 13, y, 4, 18);
    ctx.fillRect(road.left + road.width + 9, y, 4, 18);
  }
  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.fillRect(road.left + 5, 0, 3, canvas.height);
  ctx.fillRect(road.left + road.width - 8, 0, 3, canvas.height);

  // Dashed lane dividers.
  ctx.fillStyle = 'rgba(255,255,255,.72)';
  for (let y = roadOffset - 100; y < canvas.height + 100; y += 100) {
    for (let line = 1; line < 4; line++) {
      ctx.fillRect(road.left + line * (road.width / 4) - 2, y, 4, 48);
    }
  }
  // Small asphalt highlights provide texture without obscuring gameplay.
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let i = 0; i < 18; i++) {
    const x = road.left + 18 + ((i * 73) % (road.width - 36));
    const y = (i * 97 + roadOffset * .65) % canvas.height;
    ctx.fillRect(x, y, 2, 7);
  }
}

function drawCar(car, color, isPlayer = false, jumping = false) {
  ctx.save();
  ctx.translate(car.x, car.y);
  if (jumping) {
    ctx.shadowColor = 'rgba(0,0,0,.6)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 18;
  }

  // Soft ground shadow.
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(car.width / 2 + 3, car.height / 2 + 8, car.width / 2 + 5, car.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Wheels with highlights.
  ctx.fillStyle = '#090d14';
  roundedRect(-5, 13, 12, 22, 4); ctx.fill();
  roundedRect(car.width - 7, 13, 12, 22, 4); ctx.fill();
  roundedRect(-5, car.height - 35, 12, 22, 4); ctx.fill();
  roundedRect(car.width - 7, car.height - 35, 12, 22, 4); ctx.fill();
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-2, 17, 3, 13);
  ctx.fillRect(car.width - 4, 17, 3, 13);
  ctx.fillRect(-2, car.height - 31, 3, 13);
  ctx.fillRect(car.width - 4, car.height - 31, 3, 13);

  // Glossy body, side highlights and bumpers.
  const body = ctx.createLinearGradient(0, 0, car.width, 0);
  body.addColorStop(0, '#111827');
  body.addColorStop(.18, color);
  body.addColorStop(.78, color);
  body.addColorStop(1, '#111827');
  ctx.fillStyle = body;
  roundedRect(0, 0, car.width, car.height, 13);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.24)';
  roundedRect(5, 5, 4, car.height - 10, 3);
  ctx.fill();
  ctx.fillStyle = 'rgba(15,23,42,.75)';
  roundedRect(7, 10, car.width - 14, 24, 7);
  ctx.fill();
  const glass = ctx.createLinearGradient(8, 12, car.width - 8, 34);
  glass.addColorStop(0, isPlayer ? '#bae6fd' : '#cbd5e1');
  glass.addColorStop(.45, '#64748b');
  glass.addColorStop(1, '#1e293b');
  ctx.fillStyle = glass;
  roundedRect(9, 13, car.width - 18, 18, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.42)';
  ctx.fillRect(13, 15, 3, 12);
  ctx.fillStyle = '#0f172a';
  roundedRect(9, 38, car.width - 18, 23, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.fillRect(12, 42, car.width - 24, 2);

  // Headlights, tail lights and bumpers.
  ctx.fillStyle = '#fff7c2';
  roundedRect(6, 3, 11, 6, 2); ctx.fill();
  roundedRect(car.width - 17, 3, 11, 6, 2); ctx.fill();
  ctx.fillStyle = '#fb7185';
  roundedRect(6, car.height - 8, 11, 5, 2); ctx.fill();
  roundedRect(car.width - 17, car.height - 8, 11, 5, 2); ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  roundedRect(5, car.height - 3, car.width - 10, 3, 2); ctx.fill();
  ctx.restore();
}

function drawCoin(coin) {
  ctx.save();
  ctx.translate(coin.x + coin.size / 2, coin.y + coin.size / 2);
  ctx.rotate(coin.angle);
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 14;
  const gold = ctx.createRadialGradient(-4, -5, 2, 0, 0, coin.size / 2);
  gold.addColorStop(0, '#fff7c2');
  gold.addColorStop(.35, '#facc15');
  gold.addColorStop(1, '#b45309');
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 0, coin.size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff7c2';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, coin.size / 2 - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fff7c2';
  ctx.font = 'bold 14px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 1);
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
