# AGENTS.md

Guía para quien mantenga este juego: persona o agente. Lo de aquí no son
sugerencias; son las reglas que hacen que minesweeper. sea minesweeper.

## Qué es esto

El buscaminas clásico dibujado en bloques blanco y negro, con el relato de La
Treinta: un recluta, treinta campos, una sola dirección. Comparte casa con
[snake](https://github.com/jaime-gaming/snake) —los mismos bloques, la misma
tinta, el mismo rojo— pero no código.

## Reglas de la casa

- Negro sobre tinta, blancos duros y **un solo rojo** (`#ff2b2b`): lo que
  estalla, tu posición en la operación y la puerta. Si dudas si un elemento
  merece rojo, la respuesta es no.
- Todo en bloques, sin suavizar. La monoespaciada es para cifras, rótulos y
  datos; el texto respira en sans.
- Sin mecánicas nuevas, sin modificadores, sin estrellas ni energía. El
  tablero no opina; el tablero espera.
- Menos, pero perfecto. Si una mejora añade una decisión al jugador, probablemente
  está de más.
- Ni una palabra de lo que hay detrás del código: ni en los comentarios (no
  hay), ni en los mensajes de commit, ni en la documentación. El juego habla
  por sí mismo.

## Cómo está hecho

- Sin dependencias y sin llamadas a la red. JavaScript plano en `js/`; el
  navegador carga `minesweeper.js`, que **viaja siempre actualizado en el
  commit**. Tras tocar `js/`, ejecuta `node tools/build.mjs` y commitea el
  bundle con el resto. La CI (`node tools/build.mjs --check`) rechaza el
  desfase.
- `index.html` + `styles.css` + `minesweeper.js` bastan para servir el juego.
  `_redirects` hace que cualquier ruta caiga en el juego (`/campaña/nivel-07`);
  `_headers` impide cachear el HTML. `DESPLIEGUE.md` manda en el dominio y las
  cachés.
- Rutas profundas generadas en cliente (`js/main.js`): jugar, campaña por
  nivel, ajustes, perfil. Si cambias el mapa de rutas, pasa el humo completo.

## Comandos

```sh
node tools/build.mjs     # empaqueta js/*.js → minesweeper.js
node tools/build.mjs --check
node tools/check.mjs     # lógica del tablero e i18n (25 pruebas)
node tools/smoke.mjs     # juega solo: partida, campaña, epílogo, mapa,
                         # ajustes, perfil; falla si algo se rompe
node serve.mjs 8123      # http://0.0.0.0:8123
```

## Español e inglés, siempre en paridad

`tools/check.mjs` exige las mismas claves en `es` y `en`. Las nuevas claves
entran en ambos bloques de `js/i18n.js`. Nada de HTML dentro de las cadenas
salvo los casos que ya existen y están medidos.

## Caché y sello de versión

Los assets llevan `?v=N`. Si tocas `styles.css`, `minesweeper.js` o los
módulos importados dentro del bundle, sube el sello en `index.html` y en los
imports de `js/main.js` del mismo golpe. Un despliegue sin sello nuevo es un
despliegue invisible.

## Prueba antes de empujar

1. `node tools/build.mjs --check`
2. `node tools/check.mjs`
3. `node tools/smoke.mjs`

Si tocas una pantalla, extiende primero el humo; si tocas el tablero, extiende
las pruebas de lógica. Una pantalla rota no se descubre mirando: se descubre
jugando contra ella en `tools/smoke.mjs`.

## Estilo de commits

Imperativo y en español, el porqué en el cuerpo, sin trailers ni firmas de
nada ni de nadie. El juego no lleva co-autores; cuando el PR se fusiona se hace
con **squash and merge**, y `main` recibe un único commit con la voz del juego.

## Lo que este archivo no es

No es un manifiesto ni un roadmap. Es la lista de cosas que, si se rompen,
rompen el juego. Cuando cambien estas reglas —y cambiarán—, cambia también
este archivo.
