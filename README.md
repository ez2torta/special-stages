# Sonic 3 Special Stage — Demo

Pequeño demo 3D con Three.js inspirado en los Special Stages de Sonic 3.

## Características
- Mapa base finito (gridSize x gridSize) que se repite infinitamente (tiled) en el espacio.
- Corredor de inicio seguro (ancho 5, largo ~12) para evitar Game Over inmediato.
- Personaje se mueve automáticamente y giras con flechas izquierda/derecha.
- HUD con Puntaje, Azules restantes (del mapa base) y Temporizador (60s por defecto).
- Menú inicial (Iniciar, Salir) y pantalla de Game Over (Reintentar, Salir).
- Pausa automática al perder o completar todos los azules del mapa base.
- Rampa leve de velocidad al recoger azules.

## Requisitos
Solo un navegador moderno. Three.js se carga desde CDN.

## Ejecutar
Puedes abrir `index.html` directamente, pero se recomienda un servidor local para evitar problemas con rutas y módulos.

- macOS/Linux/Windows (con Python instalado):

```bash
./run_server.sh
```

Luego abre en el navegador:

```
http://localhost:8000/
```

Si prefieres sin script:

```bash
python3 -m http.server 8000
```

## Controles
- Flecha izquierda: girar 90° a la izquierda.
- Flecha derecha: girar 90° a la derecha.

## Estructura
- `index.html`: HTML con HUD, menús, y carga de scripts/CDN.
- `special-stage.js`: lógica del juego con Three.js.
- `run_server.sh`: servidor local simple con Python.
 - `GAME_LOOP.md`: explicación del game loop, el modelo de mundo y cómo se calcula todo.

## Notas
- El mapa base se regenera en cada reinicio para variar la partida, pero luego se repite infinitamente.
- Puedes ajustar la longitud/ancho del corredor seguro en `carveSafeStart()`.
- Puedes ajustar `gridSize`, `timeLimit` y la probabilidad de rojos en `resetGame()`.
- Si el tiempo llega a cero, es Game Over.

## Problemas comunes
- Error de importación de three: este proyecto usa THREE global desde CDN. Asegúrate de NO usar `type="module"` en el script del juego.
- Nada se ve al cargar: verifica que el navegador no esté bloqueando el canvas; revisa la consola por errores.

## Más info
Consulta `GAME_LOOP.md` para entender el ciclo de juego, cómo se reposicionan tiles y cómo se detectan colisiones.

## Licencia
Uso libre para fines educativos y de demostración.
