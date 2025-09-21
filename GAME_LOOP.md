# Game Loop y Modelo de Mundo

Este documento explica cómo funciona el ciclo principal del juego (game loop), el modelo de mundo infinito basado en una grilla base finita, y cómo se calculan colisiones y HUD.

## Resumen del modelo
- Existe una grilla base finita de tamaño `gridSize x gridSize` (en `special-stage.js`), llamada `baseGrid`.
- Cada celda de `baseGrid` puede ser `blue`, `red` o `empty`.
- El mundo visible es una repetición infinita (tiled) de esa grilla base en ambos ejes X y Z. Es decir, cualquier posición entera `(ix, iz)` se mapea a índices de la grilla base por módulo.
- Los tiles visibles en pantalla son un "buffer" de tamaño `gridSize x gridSize` que se reposiciona alrededor del jugador (no se crean/destrozan cada frame).

## Ciclo de juego (game loop)
1. `animate()` corre en cada frame usando `requestAnimationFrame`.
2. Si el estado del juego es `RUNNING`:
   - Actualiza el temporizador usando el delta de tiempo real (`performance.now()`). Si llega a 0, dispara Game Over.
   - Avanza al jugador en dirección actual por `speed` unidades.
   - Calcula el tile central `centerIx, centerIz` redondeando la posición del jugador a múltiplos de `tileSize`.
   - Llama a `updateTilesAround(centerIx, centerIz)` para reposicionar y recolorear el buffer visible alrededor del jugador.
   - Actualiza la cámara (detrás del jugador) y ejecuta `checkCollision()`.
3. Renderiza la escena con Three.js (`renderer.render`).

## Reposicionamiento de tiles visibles
- `updateTilesAround(centerIx, centerIz)` recorre un rango desde `-half` hasta `< half` para `dx` y `dz` (donde `half = floor(gridSize/2)`) y:
  - Calcula el índice del mundo `ix = centerIx + dx` y `iz = centerIz + dz`.
  - Posiciona cada mesh del buffer en `worldX = ix * tileSize` y `worldZ = iz * tileSize`.
  - Determina el tipo de la celda visible con `tileTypeAt(ix, iz)`, que internamente hace `modIndex` hacia `baseGrid`.
  - Ajusta el color del material según `blue` (azul), `red` (rojo), o `empty` (gris).

## Colisiones y recogida
- `checkCollision()` toma los índices del tile bajo el jugador `ix, iz` redondeando su posición y los mapea a `bx, bz` dentro de `baseGrid`.
- Si `baseGrid[bz][bx]` es `blue`:
  - Se marca `empty` (recogido), se suma puntaje y se incrementa levemente la velocidad.
  - Se decrementa `blueRemaining`; si llega a 0, se dispara victoria.
  - Se fuerza un refresco visual cercano con `updateTilesAround(ix, iz, true)`.
- Si es `red`: Game Over inmediato.

## Generación del mapa
- En `resetGame()` se crea `baseGrid` aleatoriamente con ~10% rojos (ajustable) y el resto azules.
- Se define una "zona segura" 3x3 alrededor del origen para que la partida no termine al instante.
- Además, se llama a `carveSafeStart()` que genera un corredor inicial azul hacia adelante (dirección -Z) con ancho 5 y largo ~12 tiles. Esto da margen para reaccionar y girar antes de encontrar rojos.
- Luego se recalculan `totalBlue` y `blueRemaining` y se actualiza el HUD.

## Estados del juego
- `MENU` (pantalla de inicio), `RUNNING` (jugando), `OVER` (Game Over o completado).
- El loop solo actualiza física y lógica en `RUNNING`.
- `startGame()` reinicia la partida y arranca el loop, `triggerGameOver()` muestra la pantalla de fin, y `exitToBlank()` sale a `about:blank`.

## HUD
- Muestra `score`, `blueRemaining` y el `timer`.
- `updateHUD()` sincroniza los números con el estado interno en cada evento relevante y en el loop (para el timer).

## Configuraciones útiles
- `gridSize`: tamaño de la grilla base y del buffer visible (debe ser par para centrar bien). Por defecto 20.
- `tileSize`: tamaño de cada tile. Por defecto 1.
- `timeLimit`: tiempo total de la partida. Por defecto 60 segundos.
- Probabilidad de rojos: en `resetGame()` con `Math.random() < 0.1` (10%).
- Corredor seguro: `carveSafeStart()` controla ancho y longitud.

## Extensiones posibles
- Añadir ruido más estructurado (Perlin/Simplex) para patrones menos aleatorios.
- Efecto de curvatura de mundo (rotación de tiles o cámara) para emular un escenario esférico.
- Sonidos al recoger rojo/azul, partículas, y UI con mejor estilo.
- Guardado/restauración de `baseGrid` para partidas repetibles.
