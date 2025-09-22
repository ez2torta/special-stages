// Acceso a THREE como global (cargado por CDN en index.html)

// --- Estado del juego & helpers UI ---
const MenuState = {
  MENU: 'menu',
  RUNNING: 'running',
  OVER: 'over',
};

let gameState = MenuState.MENU;
let rafId = null;

// UI elements (exist in index.html)
const menuScreen = document.getElementById('menu-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const btnStart = document.getElementById('btn-start');
const btnQuit = document.getElementById('btn-quit');
const btnRetry = document.getElementById('btn-retry');
const btnQuit2 = document.getElementById('btn-quit-2');
const scoreEl = document.getElementById('score');
const blueLeftEl = document.getElementById('blue-left');
const timerEl = document.getElementById('timer');

function show(el) { el?.classList.remove('hidden'); }
function hide(el) { el?.classList.add('hidden'); }

// --- Escena, cámara, render ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Luz básica ---
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 5, 5);
scene.add(light);

// --- Suelo curvado (ilusión de esfera) ---
const tileSize = 1;
const gridSize = 20; // 20x20 visible
const tiles = [];
let score = 0;
let timeLimit = 60; // seconds
let timeRemaining = timeLimit;
let lastTime = performance.now();

// Base grid (finite) repeated infinitely by modulo mapping
let baseGrid = []; // 2D array [z][x] -> 'blue' | 'red' | 'empty'
let totalBlue = 0;
let blueRemaining = 0;
let lastCenterIx = NaN;
let lastCenterIz = NaN;

function modIndex(n, size) { return ((n % size) + size) % size; }
function tileTypeAt(ix, iz) {
  const bx = modIndex(ix, gridSize);
  const bz = modIndex(iz, gridSize);
  return baseGrid[bz][bx];
}

function carveSafeStart() {
  // Genera un corredor seguro inicial en la dirección -Z
  const half = Math.floor(gridSize / 2);
  const corridorLength = Math.min(12, Math.floor(gridSize / 2) - 1); // evita cubrir toda la grilla
  const halfWidth = 5; // ancho lateral (2 => total 5)
  for (let dz = 0; dz >= -corridorLength; dz--) {
    for (let dx = -halfWidth; dx <= halfWidth; dx++) {
      const wx = dx; // centrado en x=0
      const wz = dz; // hacia -Z
      const bx = modIndex(wx + half, gridSize);
      const bz = modIndex(wz + half, gridSize);
      baseGrid[bz][bx] = 'blue';
    }
  }
}

const tileGeometry = new THREE.PlaneGeometry(tileSize, tileSize);

// Función para crear un tile con un color
function createTile(x, z, color) {
  const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide });
  const tile = new THREE.Mesh(tileGeometry, material);
  tile.rotation.x = -Math.PI / 2;
  tile.position.set(x, 0, z);
  scene.add(tile);
  return tile;
}

// Creamos un buffer de tiles visibles (se reposicionan alrededor del player)
for (let i = 0; i < gridSize * gridSize; i++) {
  const tile = createTile(0, 0, 0x0000ff);
  tiles.push({ mesh: tile });
}
updateHUD();

// --- Player (placeholder Sonic = cubo) ---
const playerGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 0.5, 0);
scene.add(player);

// --- Variables de control ---
let direction = new THREE.Vector3(0, 0, -1); // adelante
let speed = 0.02; // más lento para dar reacción

// Input para girar
window.addEventListener('keydown', (e) => {
  if (gameState !== MenuState.RUNNING) return;
  if (e.key === 'ArrowLeft') {
    direction.applyAxisAngle(new THREE.Vector3(0,1,0), Math.PI/2);
  }
  if (e.key === 'ArrowRight') {
    direction.applyAxisAngle(new THREE.Vector3(0,1,0), -Math.PI/2);
  }
});

// --- Lógica de colisiones simples ---
function checkCollision() {
  // Determina el tile bajo el player por índice entero
  const ix = Math.round(player.position.x / tileSize);
  const iz = Math.round(player.position.z / tileSize);
  const bx = modIndex(ix, gridSize);
  const bz = modIndex(iz, gridSize);
  const ttype = baseGrid[bz][bx];
  if (ttype === 'blue') {
    baseGrid[bz][bx] = 'empty';
    score += 10;
    speed = Math.min(0.06, speed + 0.0015); // rampa de velocidad
    blueRemaining = Math.max(0, blueRemaining - 1);
    updateHUD();
    // Actualiza colores visibles para reflejar el tile recogido
    updateTilesAround(ix, iz, true);
    if (blueRemaining === 0) {
      triggerGameOver(true);
    }
  } else if (ttype === 'red') {
    triggerGameOver(false);
  }
}

// --- Game control ---
function resetGame() {
  // Reset player position and direction
  player.position.set(0, 0.5, 0);
  direction.set(0, 0, -1);
  speed = 0.02;
  score = 0;
  timeRemaining = timeLimit;
  lastTime = performance.now();
  // Rebuild base grid
  baseGrid = [];
  totalBlue = 0;
  const safeRadius = 1;
  for (let j = 0; j < gridSize; j++) {
    const row = [];
    for (let i = 0; i < gridSize; i++) {
      // Map base grid indices to world indices centered at origin for safe zone check
      const ix = i - Math.floor(gridSize / 2);
      const iz = j - Math.floor(gridSize / 2);
      let type;
      if (Math.abs(ix) <= safeRadius && Math.abs(iz) <= safeRadius) {
        type = 'blue';
      } else {
        type = Math.random() < 0.1 ? 'red' : 'blue';
      }
      if (type === 'blue') totalBlue++;
      row.push(type);
    }
    baseGrid.push(row);
  }
  // Carve corredor seguro y recalcular conteos
  carveSafeStart();
  totalBlue = 0;
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i < gridSize; i++) {
      if (baseGrid[j][i] === 'blue') totalBlue++;
    }
  }
  blueRemaining = totalBlue;
  lastCenterIx = NaN; // forzar actualización visual al iniciar
  updateHUD();
  // Refrescar tiles visibles de inmediato
  updateTilesAround(0, 0, true);
}

function triggerGameOver(victory = false) {
  if (gameState === MenuState.OVER) return; // evitar loop
  gameState = MenuState.OVER;
  // Cambiar título según victoria/derrota
  const title = gameoverScreen?.querySelector('h1');
  const p = gameoverScreen?.querySelector('p');
  if (title) title.textContent = victory ? '¡Completado!' : '¡Game Over!';
  if (p) p.textContent = victory ? '¡Has recogido todos los azules!' : '¿Quieres intentarlo de nuevo?';
  show(gameoverScreen);
}

function startGame() {
  hide(menuScreen);
  hide(gameoverScreen);
  resetGame();
  gameState = MenuState.RUNNING;
  if (rafId == null) animate();
}

function quitGame() {
  // Pausar loop y mostrar menú principal
  gameState = MenuState.MENU;
  show(menuScreen);
  hide(gameoverScreen);
}

function exitToBlank() {
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // Navegar a una página en blanco (simple "salir")
  window.location.href = 'about:blank';
}

function updateHUD() {
  if (scoreEl) scoreEl.textContent = String(score);
  if (blueLeftEl) blueLeftEl.textContent = String(blueRemaining);
  if (timerEl) timerEl.textContent = `${timeRemaining.toFixed(1)}s`;
}

// Reposiciona y recolorea el buffer de tiles alrededor de un centro dado
function updateTilesAround(centerIx, centerIz, force = false) {
  if (!force && centerIx === lastCenterIx && centerIz === lastCenterIz) return;
  lastCenterIx = centerIx;
  lastCenterIz = centerIz;
  const half = Math.floor(gridSize / 2);
  let idx = 0;
  for (let dz = -half; dz < half; dz++) {
    for (let dx = -half; dx < half; dx++) {
      const t = tiles[idx++];
      const ix = centerIx + dx;
      const iz = centerIz + dz;
      const worldX = ix * tileSize;
      const worldZ = iz * tileSize;
      t.mesh.position.set(worldX, 0, worldZ);
      const type = tileTypeAt(ix, iz);
      if (type === 'red') t.mesh.material.color.set(0xff0000);
      else if (type === 'empty') t.mesh.material.color.set(0x808080);
      else t.mesh.material.color.set(0x0000ff);
    }
  }
}

// Bind UI buttons
btnStart?.addEventListener('click', startGame);
btnRetry?.addEventListener('click', startGame);
btnQuit?.addEventListener('click', exitToBlank);
btnQuit2?.addEventListener('click', exitToBlank);

// --- Animación ---
function animate() {
  rafId = requestAnimationFrame(animate);

  if (gameState === MenuState.RUNNING) {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    // Timer countdown
    timeRemaining = Math.max(0, timeRemaining - dt);
    if (timerEl) timerEl.textContent = `${timeRemaining.toFixed(1)}s`;
    if (timeRemaining <= 0) {
      triggerGameOver(false);
    }
    // Movimiento automático
    player.position.add(direction.clone().multiplyScalar(speed));

    // Actualiza los tiles visibles cuando cruzamos un límite de tile
    const centerIx = Math.round(player.position.x / tileSize);
    const centerIz = Math.round(player.position.z / tileSize);
    updateTilesAround(centerIx, centerIz);

    // Cámara detrás del player
    camera.position.copy(player.position.clone().add(new THREE.Vector3(0, 5, 8)));
    camera.lookAt(player.position);

    checkCollision();
  }

  renderer.render(scene, camera);
}

// Inicia en menú (no comenzamos animate hasta startGame para ahorrar recursos)
// Pero si prefieres ver el fondo animado, puedes llamar animate() aquí.
