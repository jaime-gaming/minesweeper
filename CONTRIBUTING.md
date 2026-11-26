# Contribuir a minesweeper

Gracias por tu interés en contribuir. Este es un proyecto pequeño y sin dependencias, así que el proceso es intencionalmente sencillo.

## Cómo empezar

1. Haz un fork del repositorio y clónalo:
   ```sh
   git clone https://github.com/jaime-gaming/minesweeper.git
   cd minesweeper
   ```

2. Instala las dependencias (no hay ninguna, solo Node.js):
   ```sh
   node --version
   ```

3. Ejecuta el servidor de desarrollo:
   ```sh
   node serve.mjs 8123
   ```
   Luego abre `http://localhost:8123/`.

## Flujo de trabajo

1. Crea una rama a partir de `main`:
   ```sh
   git checkout -b mi-mejora
   ```

2. Haz tus cambios en `js/*.js`, `styles.css`, o `index.html`.

3. Empaqueta el bundle y verifica que todo pasa:
   ```sh
   node tools/build.mjs
   node tools/build.mjs --check
   node tools/check.mjs
   node tools/smoke.mjs
   ```

4. Commitea y sube:
   ```sh
   git add -A
   git commit -m "Describe tu cambio"
   git push origin mi-mejora
   ```

5. Abre un pull request en GitHub.

## Reglas de estilo

- No uses frameworks ni librerías externas. Todo el código es vanilla JavaScript.
- El bundle `minesweeper.js` se genera con `tools/build.mjs` y no se edita a mano.
- Mantén los textos de usuario en `js/i18n.js` con claves ES y EN.
- Las escenas de campaña se dibujan en `js/scenes.js` con canvas puro.
- Las pruebas en `tools/check.mjs` y el humo en `tools/smoke.mjs` deben pasar siempre.

## Reportar problemas

Si encuentras un error, abre un issue en GitHub describiendo:
- Qué esperabas que pasara
- Qué pasó en realidad
- Pasos para reproducirlo
- Navegador y sistema operativo
