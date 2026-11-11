# Despliegue

El juego se sirve en la **raíz** de `minesweeper.jaime-gaming.com`. La base del
HTML es `/` y los assets son `styles.css` y `minesweeper.js`; no hay ninguna
ruta de assets bajo `/minesweeper/`. (Si algún día el juego vive bajo otra ruta
origen, `serve.mjs` y `tools/build.mjs` siguen sirviendo tal cual: el HTML
produce su propia base con `<base>` y el servidor reescribe `/minesweeper/…` →
`/…`.)

> El dominio es una suposición razonable a partir de `snake.jaime-gaming.com`;
> ajústalo aquí y en `index.html` (`rel=canonical`) si el dominio real cambia.

## Worker (recomendado)

```sh
npx wrangler deploy
```

`wrangler.toml` publica el repositorio como estáticos en la raíz y usa
`single-page-application` para que cualquier ruta devuelva `index.html`.

## Si el dominio enseña una versión antigua

1. En Cloudflare, abre **Workers & Pages** y comprueba que
   `minesweeper.jaime-gaming.com` está asociado al Worker `minesweeper`.
2. Si hay un proyecto de Pages antiguo con el mismo dominio, quita el dominio
   personalizado de Pages; no pueden servirlo los dos a la vez.
3. Despliega de nuevo con `npx wrangler deploy`.
4. Purga la caché: **Caching → Configuration → Purge Everything** (o purga por
   URL de `/`, `/index.html`, `/styles.css` y `/minesweeper.js`).
5. Verifica que el HTML que llega es el actual y que `minesweeper.js?v=N` carga
   con `npx wrangler deploy` ya aplicado.

## Caché

`_headers` (Pages) marca el HTML como `no-store`. En Workers, el HTML se sirve
sin caché por defecto; si tienes una regla de caché para todo el sitio, excluye
`/` y `/index.html`, o purga tras cada despliegue. Los assets llevan sello
`?v=N` para que un cambio de CSS/JS no reutilice la copia anterior: súbelo en
`index.html` cuando toques `styles.css` o `minesweeper.js`.

## Antes de publicar

```sh
node tools/build.mjs --check   # que el bundle coincide con js/
node tools/check.mjs           # que pasan las pruebas
```

Lo mismo corre la CI en cada push y pull request a `main`
(`.github/workflows/checks.yml`).
