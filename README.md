# minesweeper

El buscaminas clásico, de bloques en blanco y negro. Sin adornos, sin dependencias y sin llamadas a la red: la rejilla, las minas, el número de cada casilla y el rojo reservado para lo que estalla. La interfaz está en español y en inglés, y se puede jugar con ratón, teclado, táctil o mando. Comparte casa y estética con [snake](https://github.com/jaime-gaming/snake).

## Idea visual

La pantalla es una hoja de tinta: negro profundo, blancos duros y un rojo para la bandera, las minas y la casilla que estalla. Las celdas cerradas son bloques con un bisel mínimo; las descubiertas se funden con el fondo y dejan su número en monoespaciada, con un ramp de luz que solivian solo al 7 y al 8, que avisan en rojo. Al estallar, el lienzo se sacude y la casilla asesina queda entera en rojo con la mina en negro. Al ganar, las banderas se izan en oleada desde la esquina y una franja de luz cruza el tablero una sola vez.

## Controles

| Acción | Teclado | Ratón / táctil / mando |
| --- | --- | --- |
| Mover el cursor | Flechas o WASD | — / cruceta o stick |
| Destapar | Espacio o Enter | Clic izq. / tocar / A |
| Bandera | F | Clic der. / mantener pulsado / B |
| Acorde (abrir vecinos) | X | Clic central / tocar sobre un número servido / X |
| Reiniciar | R | — / Y |
| Pausa | P o Esc | Start |
| Sonido | M | — |
| Ayuda | H | — |
| Menús | Flechas + Enter | Elegir una opción |

El **acorde** destapa los vecinos de un número cuando ya tienes a su alrededor tantas banderas como indica el número; si una bandera estaba mal puesta, la mina que queda destapada estalla. Tocar sobre un número descubierto hace el acorde automáticamente. En pantallas táctiles aparece una bandera grande abajo a la derecha para jugar en modo marcar.

El primer clic nunca estalla y siempre abre hueco (la zona del clic y sus vecinas queda libre de minas). Antes del primer clic el cronómetro no corre.

## Dificultades

| Dificultad | Tablero | Minas |
| --- | --- | --- |
| Principiante | 9 × 9 | 10 |
| Intermedio | 16 × 16 | 40 |
| Experto | 30 × 16 | 99 |
| Personalizada | desde 5 × 5, hasta 24 × 30 | 1 – 85 % de las casillas |

Las tres dificultades fijas tienen **récord de tiempo** independiente y estadísticas; la personalizada sólo cuenta partidas, victorias y racha.

## Perfil

La portada enlaza con el perfil: partidas, victorias, tasa de victorias, mejor racha, los tres mejores tiempos y un botón para **borrar todo el progreso** —récords, estadísticas y ajustes— con confirmación.

## Idioma

El selector **EN / ES** cambia todos los textos y recuerda la elección. La estética no cambia con el idioma: los mismos bloques, los mismos silencios y el mismo rojo.

## Desarrollo

Sin dependencias ni pasos de compilación obligatorios. El JavaScript vive en `js/` y se empaqueta en un único `minesweeper.js` para que la página funcione también abriendo `index.html` a doble clic.

```sh
node tools/build.mjs     # empaqueta js/*.js → minesweeper.js
node tools/check.mjs     # pruebas de la lógica del tablero e i18n
node serve.mjs 8123      # sirve el sitio en http://0.0.0.0:8123
```

`minesweeper.js` está generado: no se edita a mano. Cambia `js/*.js` y vuelve a ejecutar el empaquetador; la CI comprueba que el bundle está al día y que pasan las pruebas.

### Estructura

```
index.html        esqueleto: barra superior, lienzo, capas de menú y arranque roto
styles.css        la casa: tinta negra, monoespaciada y un único rojo
js/board.js       reglas puras del buscaminas (sembrar, destapar, acorde); sin DOM
js/presets.js     las tres dificultades fijas y los límites de la personalizada
js/engine.js      máquina de estados y dibujado en lienzo (bloques, no suavizado)
js/input.js       teclado, gestos táctiles y mando; habla en acciones
js/audio.js       sonido sintetizado por Web Audio: sin ficheros externos
js/i18n.js        textos en ES/EN
js/main.js        pantallas, HUD, récords en localStorage y arranque
tools/build.mjs   empaquetador sin dependencias
tools/check.mjs   pruebas de lógica, sin navegador
```

## Despliegue

La publicación en el dominio, la caché y la comprobación posterior están en [DESPLIEGUE.md](DESPLIEGUE.md).
