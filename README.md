# minesweeper

El buscaminas clásico, de bloques en blanco y negro y muy poco más: la rejilla, las minas, los números en su color de siempre y el rojo reservado para lo que estalla. Sin dependencias y sin llamadas a la red. La interfaz está en español y en inglés, y se puede jugar con ratón, teclado, táctil o mando. Comparte casa y estética con [snake](https://github.com/jaime-gaming/snake).

## Idea visual

La pantalla es una hoja de tinta: negro profundo, blancos duros y un rojo para la bandera, las minas y la casilla que estalla. Las celdas son bloques planos separados por la rejilla de un píxel, como en snake; las descubiertas se funden con el fondo y dejan su número plano, en la monoespaciada de la casa, con el color clásico del buscaminas (1 azul, 2 verde, 3 rojo, 4 violeta, 5 naranja, 6 cian, 7 amarillo, 8 blanco). Las banderas de paño rojo se izan con su pliegue y su muesca; las minas son bloques de ocho púas con su destello. Al estallar hay un **destello seco** y la hoja se va a negro; el campo queda al descubierto por completo y la pantalla de muerte se abre como una barra baja, con el tablero entero a la vista —kicker, golpe, estadísticas y parcela, en capas—. Al ganar, las banderas se izan en oleada y la misma barra se abre diciendo «despejado.»: reparto idéntico, el borde superior en blanco y solo la pieza de victoria sonando.

La portada juega sola: una partida automática del siguiente nivel de la Treinta se despeja en la vista previa mientras decides qué jugar. El logotipo «minesweeper.» es tipografía pura y su punto es la mina del juego, el bloque blanco de ocho púas, la misma que pinta el lienzo, la pestaña y la barra superior; como en snake el punto rojo era la manzana.

## Sonido

Los efectos van sintetizados en tiempo real, salvo el estallido, que usa `audio/Boom.mp3` (recortado a cuatro décimas de segundo). La victoria y la derrota llevan su propia pieza, `audio/Win.mp3` y `audio/Death.mp3`, que entran y salen con fundidos: suenan sobre el estallido o la oleada de banderas y se apagan solas al empezar otra partida o volver a la portada. El interruptor de sonido (y la tecla `M`) las silencia con lo demás.

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
| Menús | Flechas + Enter | Elegir una opción |

El **acorde** destapa los vecinos de un número cuando ya tienes a su alrededor tantas banderas como indica el número; si una bandera estaba mal puesta, la mina que queda destapada estalla. Tocar sobre un número descubierto hace el acorde automáticamente. En pantallas táctiles aparece una bandera grande abajo a la derecha para jugar en modo marcar.

El primer clic nunca estalla y siempre abre hueco (la zona del clic y sus vecinas queda libre de minas). Antes del primer clic el cronómetro no corre. La barra superior solo pinta el marcador —nivel, minas restantes y tiempo— mientras hay una partida en marcha; en el resto de pantallas se queda en negro con la marca y el idioma.

## Dificultades

| Dificultad | Tablero | Minas |
| --- | --- | --- |
| Principiante | 9 × 9 | 10 |
| Intermedio | 16 × 16 | 40 |
| Experto | 30 × 16 | 99 |
| Personalizada | desde 5 × 5, hasta 24 × 30 | 1 – 85 % de las casillas |

Las tres dificultades fijas tienen **récord de tiempo** independiente y estadísticas; la personalizada sólo cuenta partidas, victorias y racha.

## La Treinta — el modo historia

Treinta campos minados dibujados a mano en cuatro actos, con un único relato lineal: **la guerra te ha reclutado.** Nadie pregunta por qué. Nadie se ofrece. El modo campaña es un **mapa militar**: la ruta de la operación trazada a mano sobre la rejilla, con sello de «no pisar», divisorias de acto y tu posición marcada en rojo. Cada nivel cuenta una línea del avance, antes de marchar:

| Acto | Nivel | Tableros |
| --- | --- | --- |
| I · alistamiento | 1 – 6 | de 6×6/6 a 9×9/16 — la carta, el cuartel, el juramento |
| II · el frente | 7 – 12 | de 10×10/18 a 14×14/40 — el convoy, la zona, la guardia |
| III · la operación | 13 – 18 | de 14×14/44 a 16×16/66 — operación puente, el asalto |
| IV · el final del campo | 19 – 30 | de 16×16/69 a 24×30/132 — la traición, el expediente, la vuelta |

El relato es lineal y acompaña hasta el final: al cerrar el último campo, un epílogo cierra el viaje. Completar un nivel abre el siguiente y guarda tu **mejor tiempo** en su casilla; no hay estrellas, sólo tu marca. La campaña se juega desde **el mapa de la operación**: un parte dibujado a mano y **desplazable a lo ancho** —más allá del borde de la pantalla, como un mapa de verdad sobre la mesa—. La ruta hecha va en blanco sólido, la que falta en puntos, tu frontera late en rojo y cada acto lleva sus dibujos: la brújula y el sello de «no pisar», la carta y el cuartel del alistamiento, el torreón y los sacos terreros del frente, el puente del vado y la antena de la operación, el tren y la casa con la puerta en rojo. Se elige con las flechas o con el ratón; el primer toque inspecciona y el segundo marcha; el mapa se abre centrado en tu posición. A la derecha, el acta de cada campo (acto, tamaño, minas, tu mejor marca o su estado). Cada nivel tiene su ruta profunda (`/campaña/nivel-07`) y el botón atrás navega como en cualquier web.

## Perfil

La portada enlaza con el perfil, la **carta de servicios** del expediente 0042-a: cuatro cifras grandes (partidas, victorias, tasa de victorias y mejor racha), la Treinta en **treinta trazos** —blanco para los campos despejados y rojo para tu frontera—, la suma de tus mejores tiempos en campaña, el total del tiempo en el campo, los tres mejores tiempos fijos y un botón para **borrar todo el progreso** —récords, estadísticas y ajustes— con confirmación. Los ajustes viven en el pie de la portada, no como botón principal: **sonido** y su volumen (solo las piezas de final; el estallido y los efectos no se tocan), **trama de fósforo**, **doble clic para confirmar** —un primer clic arma la casilla, el segundo la destapa— y el borrado de progreso, todo agrupado por secciones.

## Idioma

El selector **EN / ES** cambia todos los textos y recuerda la elección. La estética no cambia con el idioma: los mismos bloques, los mismos silencios y el mismo rojo. 

## Desarrollo

Sin dependencias ni pasos de compilación obligatorios. El JavaScript vive en `js/` y se empaqueta en un único `minesweeper.js` para que la página funcione también abriendo `index.html` a doble clic.

```sh
node tools/build.mjs     # empaqueta js/*.js → minesweeper.js
node tools/check.mjs     # pruebas de la lógica del tablero e i18n
node tools/smoke.mjs     # humo de arranque con DOM simulado
node serve.mjs 8123      # sirve el sitio en http://0.0.0.0:8123
```

`minesweeper.js` está generado: no se edita a mano. Cambia `js/*.js` y vuelve a ejecutar el empaquetador; la CI comprueba que el bundle está al día y que pasan las pruebas.

### Estructura

```
index.html        esqueleto: barra superior, lienzo, capas de menú y arranque roto
styles.css        la casa: tinta negra, monoespaciada, un rojo y un verde
audio/            Win.mp3 · Death.mp3 · Boom.mp3 (el estallido, cuatro décimas de segundo)
js/board.js       reglas puras del buscaminas (sembrar, destapar, acorde); sin DOM
js/presets.js     las tres dificultades fijas y los límites de la personalizada
js/engine.js      máquina de estados y dibujado en lienzo (bloques, no suavizado)
js/input.js       teclado, gestos táctiles y mando; habla en acciones
js/audio.js       efectos por Web Audio; música y estallido desde audio/, con fundidos
js/i18n.js        textos en ES/EN y slugs de ruta (jugar, campaña, …)
js/campaign.js    la Treinta: el relato, los actos, los treinta niveles y sus líneas de historia
js/main.js        pantallas, HUD, récords en localStorage, demo de portada, rutas y arranque
serve.mjs         servidor estático local (node serve.mjs 8123)
AGENTS.md         la casa, sus reglas y cómo se comprueba todo antes de empujar
tools/build.mjs   empaquetador sin dependencias
tools/check.mjs   pruebas de lógica, sin navegador
tools/smoke.mjs   humo de arranque: juega una partida con un DOM simulado
```

## Despliegue

Preparado para **Cloudflare Pages**: el repositorio es estático, sin paso de build (el bundle viaja siempre al día y la CI lo comprueba), con `_redirects` para las rutas profundas del juego y `_headers` para que el HTML no se cachee nunca. Conecta el repo en *Workers & Pages → Create → Pages*, deja el comando de build vacío, la salida en la raíz y asocia `minesweeper.jaime-gaming.com`. La publicación, la caché y la comprobación posterior —incluida la alternativa con Worker— están en [DESPLIEGUE.md](DESPLIEGUE.md).

## Creditos de assets
Musica: LSplash
