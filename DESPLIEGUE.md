# Despliegue

El juego se sirve en la **raíz** de `minesweeper.jaime-gaming.com` como
**assets estáticos de un Worker** (`wrangler.toml`). No hay paso de build:
`minesweeper.js` viaja siempre al día en el repo y la CI falla si no.

## Qué se publica

`npx wrangler deploy` sube **solo el juego**: `index.html`, `styles.css`,
`minesweeper.js` y `audio/{Boom,Death,Win}.mp3`. `.assetsignore` deja fuera
`.git`, `.github`, `js/`, `tools/`, `serve.mjs`, `wrangler.toml`, la
documentación y los propios metaficheros: nada de eso es alcanzable por URL.

## Antes de publicar

```sh
node tools/build.mjs --check   # el bundle coincide con js/
node tools/check.mjs           # que pasan las pruebas
node tools/smoke.mjs           # humo de arranque: juega una partida solo
```

La CI (`.github/workflows/checks.yml`) corre lo mismo en cada push y PR a `main`.

## Publicar

Manual, desde el repo:

```sh
npx wrangler deploy
```

La primera vez pide autenticación (`npx wrangler login`, o `CLOUDFLARE_API_TOKEN`
en el entorno). El Worker no ejecuta código: solo sirve los assets.

Automático con cada push: en el panel, **Workers & Pages → minesweeper →
Settings → Builds**, conecta el repo (rama `main`, sin comando de build) o
comprueba la conexión existente. Cada push publica solo.

`npx wrangler deploy --dry-run` valida la configuración y el inventario de
assets sin publicar nada; úsalo ante cualquier duda.

## Dominio propio

`minesweeper.jaime-gaming.com` se asocia como **custom domain** del Worker:
**Workers & Pages → minesweeper → Settings → Domains & routes → Add → Custom
domain**. La zona `jaime-gaming.com` tiene que estar en la misma cuenta de
Cloudflare (el DNS lo crea Cloudflare solo). Si el mismo nombre lo intenta
servir otro sitio —un proyecto de Pages previo o un Worker distinto—, retíalo
de ese sitio: dos orígenes para el mismo dominio no se reparten el tráfico,
se pisan.

## Rutas profundas

El juego resuelve sus rutas en cliente (`/campaña/nivel-07`, `/ajustes`…).
`wrangler.toml` activa `not_found_handling = "single-page-application"`:
cualquier ruta que no sea un asset devuelve `index.html` con código 200. No
hay `_redirects` ni hace falta: en un Worker lo hace el propio router de
assets.

## Caché

`_headers` viaja en la subida y lo aplica el router: HTML `no-store` (un
despliegue nuevo se ve al instante) y `X-Content-Type-Options: nosniff`. Los
assets llevan sello `?v=N`; súbelo en `index.html` cuando toques CSS o JS.

Si el dominio enseña una versión antigua:

1. En el panel, comprueba que `minesweeper.jaime-gaming.com` responde desde
   este Worker y no desde otro sitio.
2. Despliega de nuevo (`npx wrangler deploy`, o push a `main` con los Builds
   conectados).
3. Purga la caché: **Caching → Configuration → Purge Everything** (o por URL
   de `/`, `/index.html`, `/styles.css`, `/minesweeper.js`).
4. Verifica que el HTML que llega es el actual y que `minesweeper.js?v=N` carga.
