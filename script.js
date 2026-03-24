const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');

const bestKey = 'minigame-space-dodger-best';
let bestScore = Number(localStorage.getItem(bestKey) || 0);
bestEl.textContent = bestScore;

const state = {
  running: false,
  score: 0,
  lives: 3,
  player: {
    x: 100,
    y: 240,
    radius: 16,
    speed: 4.6,
    shield: 0,
    glow: 0,
    tilt: 0,
    trail: [],
  },
  energy: null,
  asteroids: [],
  stars: [],
  particles: [],
  keys: new Set(),
  spawnTimer: 0,
  energyTimer: 0,
  flashTimer: 0,
  shake: 0,
  lastTime: 0,
};

for (let i = 0; i < 110; i += 1) {
  state.stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.2 + 0.4,
    speed: Math.random() * 0.8 + 0.18,
    depth: Math.random() * 0.9 + 0.4,
    twinkle: Math.random() * Math.PI * 2,
  });
}

function resetGame() {
  state.running = false;
  state.score = 0;
  state.lives = 3;
  state.player.x = 100;
  state.player.y = canvas.height / 2;
  state.player.shield = 0;
  state.player.glow = 0;
  state.player.tilt = 0;
  state.player.trail = [];
  state.asteroids = [];
  state.energy = null;
  state.particles = [];
  state.spawnTimer = 0;
  state.energyTimer = 0;
  state.flashTimer = 0;
  state.shake = 0;
  updateHud();
  showOverlay('准备起飞', '点击“开始游戏”，启动引擎，进入闪避航线。');
}

function startGame() {
  resetGame();
  state.running = true;
  hideOverlay();
}

function restartGame() {
  startGame();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.lives;
  bestEl.textContent = bestScore;
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add('show');
}

function hideOverlay() {
  overlay.classList.remove('show');
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function spawnAsteroid() {
  const radius = randomBetween(14, 34);
  state.asteroids.push({
    x: canvas.width + radius + randomBetween(0, 140),
    y: randomBetween(radius, canvas.height - radius),
    radius,
    speed: randomBetween(2.4, 5.4) + state.score * 0.015,
    spin: randomBetween(-0.03, 0.03),
    angle: randomBetween(0, Math.PI * 2),
    wobble: randomBetween(0.2, 1.2),
  });
}

function spawnEnergy() {
  state.energy = {
    x: randomBetween(180, canvas.width - 80),
    y: randomBetween(50, canvas.height - 50),
    radius: 11,
    pulse: 0,
  };
}

function circleHit(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.hypot(dx, dy);
  return dist < a.radius + b.radius;
}

function emitBurst(x, y, count, color, speedMin, speedMax, sizeMin, sizeMax) {
  for (let i = 0; i < count; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = randomBetween(speedMin, speedMax);
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: randomBetween(sizeMin, sizeMax),
      life: randomBetween(260, 720),
      maxLife: 720,
      color,
      glow: true,
    });
  }
}

function emitTrail() {
  const { player } = state;
  const jitter = player.shield > 0 ? 1.4 : 0.7;
  state.particles.push({
    x: player.x - 15 + randomBetween(-2, 2),
    y: player.y + randomBetween(-jitter, jitter),
    vx: randomBetween(-2.8, -1.4),
    vy: randomBetween(-0.5, 0.5),
    size: randomBetween(3, 7),
    life: randomBetween(180, 360),
    maxLife: 360,
    color: player.shield > 0 ? '105, 244, 255' : '255, 151, 104',
    glow: true,
  });
}

function handleInput() {
  const { player, keys } = state;
  let moveX = 0;
  let moveY = 0;

  if (keys.has('arrowup') || keys.has('w')) moveY -= 1;
  if (keys.has('arrowdown') || keys.has('s')) moveY += 1;
  if (keys.has('arrowleft') || keys.has('a')) moveX -= 1;
  if (keys.has('arrowright') || keys.has('d')) moveX += 1;

  if (moveX !== 0 && moveY !== 0) {
    moveX *= 0.7071;
    moveY *= 0.7071;
  }

  player.x += moveX * player.speed;
  player.y += moveY * player.speed;
  player.tilt += (moveY * 0.16 - player.tilt) * 0.18;

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);

  if (state.running) {
    player.trail.push({ x: player.x - 8, y: player.y, life: 1 });
    if (player.trail.length > 14) player.trail.shift();
    emitTrail();
  }
}

function damagePlayer(asteroid) {
  state.lives -= 1;
  state.player.shield = 1400;
  state.player.glow = 1;
  state.flashTimer = 220;
  state.shake = 12;
  emitBurst(state.player.x, state.player.y, 18, '255, 111, 145', 1.6, 4.8, 2, 5);
  emitBurst(asteroid.x, asteroid.y, 10, '255, 177, 97', 1.2, 3.6, 2, 4);
}

function collectEnergy() {
  state.score += 120;
  state.player.shield = 2200;
  state.player.glow = 1;
  state.lives = Math.min(5, state.lives + 1);
  emitBurst(state.energy.x, state.energy.y, 22, '157, 248, 177', 1.2, 3.8, 2, 6);
  emitBurst(state.player.x, state.player.y, 14, '105, 244, 255', 1.2, 3.2, 2, 5);
  state.energy = null;
}

function update(delta) {
  const slowFactor = delta * 0.08;

  state.stars.forEach((star) => {
    star.x -= star.speed * star.depth * slowFactor;
    star.twinkle += delta * 0.002 * star.depth;
    if (star.x < -4) {
      star.x = canvas.width + 4;
      star.y = Math.random() * canvas.height;
    }
  });

  state.player.trail = state.player.trail
    .map((point) => ({ ...point, life: point.life - delta * 0.0038 }))
    .filter((point) => point.life > 0);

  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      x: particle.x + particle.vx * delta * 0.06,
      y: particle.y + particle.vy * delta * 0.06,
      life: particle.life - delta,
      size: Math.max(0.2, particle.size - delta * 0.003),
    }))
    .filter((particle) => particle.life > 0);

  state.player.glow = Math.max(0, state.player.glow - delta * 0.0022);
  state.flashTimer = Math.max(0, state.flashTimer - delta);
  state.shake = Math.max(0, state.shake - delta * 0.035);

  if (!state.running) return;

  handleInput();
  state.score += Math.max(1, Math.floor(delta * 0.02));
  state.spawnTimer += delta;
  state.energyTimer += delta;

  if (state.player.shield > 0) {
    state.player.shield = Math.max(0, state.player.shield - delta);
  }

  const spawnRate = Math.max(340, 900 - state.score * 2);
  if (state.spawnTimer >= spawnRate) {
    state.spawnTimer = 0;
    spawnAsteroid();
  }

  if (!state.energy && state.energyTimer >= 4200) {
    state.energyTimer = 0;
    spawnEnergy();
  }

  state.asteroids.forEach((asteroid) => {
    asteroid.x -= asteroid.speed * delta * 0.05;
    asteroid.y += Math.sin((asteroid.angle + asteroid.wobble) * 2) * 0.18;
    asteroid.angle += asteroid.spin * delta * 0.05;
  });

  state.asteroids = state.asteroids.filter((asteroid) => asteroid.x + asteroid.radius > -60);

  for (const asteroid of state.asteroids) {
    if (circleHit(state.player, asteroid)) {
      if (state.player.shield <= 0) {
        damagePlayer(asteroid);
        if (state.lives <= 0) {
          finishGame();
          return;
        }
      } else {
        emitBurst(asteroid.x, asteroid.y, 8, '105, 244, 255', 1.4, 3, 1.5, 4);
      }
      asteroid.x = -999;
    }
  }

  state.asteroids = state.asteroids.filter((asteroid) => asteroid.x > -500);

  if (state.energy) {
    state.energy.pulse += delta * 0.008;
    if (circleHit(state.player, state.energy)) {
      collectEnergy();
    }
  }

  if (state.score > bestScore) {
    bestScore = state.score;
    localStorage.setItem(bestKey, String(bestScore));
  }

  updateHud();
}

function finishGame() {
  state.running = false;
  updateHud();
  showOverlay('游戏结束', `你拿到了 ${state.score} 分。点“重新开始”再冲一次。`);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#040913');
  grad.addColorStop(0.48, '#0a1627');
  grad.addColorStop(1, '#102746');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const nebula = ctx.createRadialGradient(canvas.width * 0.72, canvas.height * 0.2, 20, canvas.width * 0.72, canvas.height * 0.2, 220);
  nebula.addColorStop(0, 'rgba(110, 118, 255, 0.15)');
  nebula.addColorStop(1, 'rgba(110, 118, 255, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const lane = ctx.createLinearGradient(0, 0, canvas.width, 0);
  lane.addColorStop(0, 'rgba(255,255,255,0)');
  lane.addColorStop(0.4, 'rgba(105, 244, 255, 0.03)');
  lane.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = lane;
  ctx.fillRect(0, canvas.height * 0.18, canvas.width, canvas.height * 0.64);

  state.stars.forEach((star) => {
    const alpha = 0.3 + (Math.sin(star.twinkle) + 1) * 0.18 + star.size * 0.08;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();

    if (star.size > 1.7) {
      ctx.strokeStyle = `rgba(105,244,255,${alpha * 0.35})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(star.x - star.size * 3, star.y);
      ctx.lineTo(star.x + star.size * 3, star.y);
      ctx.moveTo(star.x, star.y - star.size * 3);
      ctx.lineTo(star.x, star.y + star.size * 3);
      ctx.stroke();
    }
  });
}

function drawPlayer() {
  const { x, y, radius, shield, tilt, trail } = state.player;

  trail.forEach((point, index) => {
    const alpha = point.life * (0.16 + index / trail.length * 0.12);
    ctx.fillStyle = `rgba(105, 244, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(point.x - index * 1.2, point.y, 3 + point.life * 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);

  const hullGlow = ctx.createRadialGradient(0, 0, 3, 0, 0, 26);
  hullGlow.addColorStop(0, `rgba(122, 124, 255, ${0.55 + state.player.glow * 0.2})`);
  hullGlow.addColorStop(1, 'rgba(122, 124, 255, 0)');
  ctx.fillStyle = hullGlow;
  ctx.beginPath();
  ctx.arc(0, 0, 26, 0, Math.PI * 2);
  ctx.fill();

  if (shield > 0) {
    ctx.strokeStyle = `rgba(105, 244, 255, ${0.45 + Math.sin(Date.now() * 0.01) * 0.12})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8 + Math.sin(Date.now() * 0.015) * 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(157, 248, 177, 0.26)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 13, -Math.PI * 0.2, Math.PI * 1.1);
    ctx.stroke();
  }

  ctx.fillStyle = '#ff9768';
  ctx.beginPath();
  ctx.moveTo(-12, -5);
  ctx.lineTo(-23, 0);
  ctx.lineTo(-12, 5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ffcf83';
  ctx.beginPath();
  ctx.moveTo(-11, -3);
  ctx.lineTo(-20, 0);
  ctx.lineTo(-11, 3);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#d9e7ff';
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-5, -13);
  ctx.lineTo(-2, -5);
  ctx.lineTo(-17, -2);
  ctx.lineTo(-17, 2);
  ctx.lineTo(-2, 5);
  ctx.lineTo(-5, 13);
  ctx.closePath();
  ctx.fill();

  const hull = ctx.createLinearGradient(-10, -8, 18, 8);
  hull.addColorStop(0, '#5ef1ff');
  hull.addColorStop(1, '#7a7cff');
  ctx.fillStyle = hull;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(-4, -10);
  ctx.lineTo(2, 0);
  ctx.lineTo(-4, 10);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#06111b';
  ctx.beginPath();
  ctx.arc(1, 0, 4.6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8ff9ff';
  ctx.beginPath();
  ctx.arc(1, 0, 2.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawAsteroids() {
  state.asteroids.forEach((asteroid) => {
    ctx.save();
    ctx.translate(asteroid.x, asteroid.y);
    ctx.rotate(asteroid.angle);

    ctx.fillStyle = 'rgba(255, 170, 110, 0.08)';
    ctx.beginPath();
    ctx.arc(0, 0, asteroid.radius + 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8;
      const r = asteroid.radius + Math.sin(i * 1.6 + asteroid.wobble) * 4.5;
      const px = Math.cos(angle) * r;
      const py = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    const asteroidGrad = ctx.createLinearGradient(-asteroid.radius, -asteroid.radius, asteroid.radius, asteroid.radius);
    asteroidGrad.addColorStop(0, '#d5d9e4');
    asteroidGrad.addColorStop(0.55, '#7f8ba1');
    asteroidGrad.addColorStop(1, '#475264');
    ctx.fillStyle = asteroidGrad;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 199, 135, 0.24)';
    ctx.beginPath();
    ctx.arc(-asteroid.radius * 0.12, -asteroid.radius * 0.15, asteroid.radius * 0.42, 0.8, 2.8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(26, 34, 46, 0.45)';
    ctx.beginPath();
    ctx.arc(asteroid.radius * 0.18, -asteroid.radius * 0.08, asteroid.radius * 0.22, 0, Math.PI * 2);
    ctx.arc(-asteroid.radius * 0.24, asteroid.radius * 0.22, asteroid.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });
}

function drawEnergy() {
  if (!state.energy) return;
  const { x, y, radius, pulse } = state.energy;
  const pulseSize = radius + Math.sin(pulse) * 3;

  ctx.fillStyle = 'rgba(157, 248, 177, 0.1)';
  ctx.beginPath();
  ctx.arc(x, y, pulseSize + 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(157, 248, 177, ${0.28 + Math.sin(pulse) * 0.08})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, pulseSize + 10, 0, Math.PI * 2);
  ctx.stroke();

  const core = ctx.createRadialGradient(x, y, 2, x, y, pulseSize + 2);
  core.addColorStop(0, '#f5fff7');
  core.addColorStop(0.45, '#9df8b1');
  core.addColorStop(1, '#3dcf86');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - pulseSize - 8, y);
  ctx.lineTo(x + pulseSize + 8, y);
  ctx.moveTo(x, y - pulseSize - 8);
  ctx.lineTo(x, y + pulseSize + 8);
  ctx.stroke();
}

function drawParticles() {
  state.particles.forEach((particle) => {
    const alpha = Math.min(1, particle.life / particle.maxLife);
    ctx.fillStyle = `rgba(${particle.color}, ${alpha * (particle.glow ? 0.9 : 0.6)})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHudHint() {
  ctx.save();
  ctx.fillStyle = 'rgba(212, 230, 255, 0.86)';
  ctx.font = '600 15px "Segoe UI", "PingFang SC", sans-serif';
  ctx.fillText('回收绿色能量核心可回血并获得护盾', 20, 30);

  ctx.fillStyle = 'rgba(151, 170, 201, 0.88)';
  ctx.font = '12px "Segoe UI", "PingFang SC", sans-serif';
  ctx.fillText('WASD / 方向键移动', 20, 50);
  ctx.restore();
}

function drawVignette() {
  const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 130, canvas.width / 2, canvas.height / 2, canvas.width * 0.6);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1);
  }
}

function render() {
  ctx.save();

  if (state.shake > 0) {
    ctx.translate(randomBetween(-state.shake, state.shake), randomBetween(-state.shake, state.shake));
  }

  drawBackground();
  drawEnergy();
  drawAsteroids();
  drawParticles();
  drawPlayer();
  drawHudHint();
  drawVignette();

  if (state.flashTimer > 0) {
    ctx.fillStyle = `rgba(255, 111, 145, ${state.flashTimer / 440})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.restore();
}

function gameLoop(timestamp) {
  if (!state.lastTime) state.lastTime = timestamp;
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;

  update(delta);
  render();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
    event.preventDefault();
  }
  state.keys.add(key);

  if (key === ' ' && !state.running) {
    startGame();
  }
});

window.addEventListener('keyup', (event) => {
  state.keys.delete(event.key.toLowerCase());
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);

resetGame();
render();
requestAnimationFrame(gameLoop);
