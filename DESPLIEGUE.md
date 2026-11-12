# Despliegue

El juego se sirve en la **raíz** de `minesweeper.jaime-gaming.com`. La base del
HTML es `/` y los assets son `styles.css` y `minesweeper.js`; no hay ninguna
ruta de assets bajo `/minesweeper/`. (Si algún día el juego vive bajo otra ruta
origen, `serve.mjs` y `tools/build.mjs` siguen sirviendo tal cual: el HTML
produce su propia base con `<base>` y el servidor reescribe `/minesweeper/…` →
`/…`.)

> El dominio es una suposición razonable a partir de `snake.jaime-gaming.com`;
> ajústalo aquí y en `index.html` (`rel=canonical`) si el dominio real cambia.

## Cloudflare Pages (recomendado)

El repositorio es estático: no hay paso de build obligatorio porque
`minesweeper.js` viaja siempre actualizado en el commit (la CI falla si no).

1. En Cloudflare, **Workers & Pages → Create → Pages → Connect to Git** y elige
   `jaime-gaming/minesweeper`.
2. Configuración de build:
   - **Build command:** *(vacío)*
   - **Build output directory:** `/` (la raíz del repositorio)
3. En **Custom domains** asocia `minesweeper.jaime-gaming.com`.
4. Despliega. Cada push a `main` publica solo; cada PR genera su previsualización.

Para las rutas profundas del juego (`/campaña/nivel-07`, `/ajustes`…), Pages
necesita verlas todas como el `index.html` de la aplicación: de eso se encarga
`_redirects` (`/* → /index.html`, código 200). Los ficheros que existen de
verdad se sirven tal cual; todo lo demás cae al juego, que resuelve la ruta en
cliente.

`_headers` marca el HTML como `no-store` (un despliegue nuevo se ve al instante)
y activa `nosniff`. Los assets llevan sello `?v=N`; súbelo en `index.html`
cuando toques `styles.css` o `minesweeper.js`.

## Antes de publicar

```sh
node tools/build.mjs --check   # que el bundle coincide con js/
node tools/check.mjs           # que pasan las pruebas
node tools/smoke.mjs           # humo de arranque: juega una partida solo
```

Lo mismo corre la CI en cada push y cada pull request a `main`
(`.github/workflows/checks.yml`).

## Alternativa: Worker

Si prefieres un Worker en lugar de Pages (mismo dominio, mismos estáticos):

```sh
npx wrangler deploy
```

`wrangler.toml` publica el repositorio como estáticos en la raíz y usa
`single-page-application` para que cualquier ruta devuelva `index.html`. No
puedes servir el dominio a la vez desde Pages y desde el Worker: elige uno.

## Si el dominio enseña una versión antigua

1. En Cloudflare, abre **Workers & Pages** y comprueba que
   `minesweeper.jaime-gaming.com` está asociado a un único sitio.
2. Si hay un proyecto de Pages y un Worker con el mismo dominio, quita el
   dominio personalizado de uno de los dos; no pueden servirlo los dos a la vez.
3. Despliega de nuevo (push a `main` en Pages, o `npx wrangler deploy` en el Worker).
4. Purga la caché: **Caching → Configuration → Purge Everything** (o purga por
   URL de `/`, `/index.html`, `/styles.css` y `/minesweeper.js`).
5. Verifica que el HTML que llega es el actual y que `minesweeper.js?v=N` carga.

## Caché

El HTML no se cachea nunca: un despliegue nuevo debe verse al instante. Los
assets llevan `?v=N` para que un cambio de CSS/JS no reutilice la copia anterior.
Si alguna vez añades una regla de caché para todo el sitio, excluye `/` e
`/index.html`, o purga tras cada despliegue.
