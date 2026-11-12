import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = path.join(RAIZ, 'minesweeper.js');

const ORDEN = ['board', 'presets', 'audio', 'input', 'engine', 'i18n', 'campaign', 'main'];

const RE_IMPORT = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([a-z0-9]+)\.js[^']*';?$/gm;
const RE_EXPORT = /^export\s+(const|let|var|class|function)\s+([^\s(]+)/gm;

function transformar(id, fuente) {
  const exportados = [];

  let codigo = fuente.replace(RE_IMPORT, (linea, nombres, origen) => {
    if (!ORDEN.includes(origen)) throw new Error(`${id}: importa de un módulo desconocido (${origen})`);
    const lista = nombres.split(',').map((n) => n.trim()).filter(Boolean).join(', ');
    return `const { ${lista} } = modulos['${origen}'];`;
  });

  codigo = codigo.replace(RE_EXPORT, (linea, tipo, nombre) => {
    exportados.push(nombre);
    return `${tipo} ${nombre}`;
  });

  if (/^\s*(export|import)\s/m.test(codigo)) {
    throw new Error(`${id}: queda un import/export sin transformar`);
  }

  const entrega = exportados.length
    ? `\n  Object.assign(modulo, { ${exportados.join(', ')} });\n`
    : '';

  return `\n(function (modulo) {\n'use strict';\n${codigo}${entrega}})(modulos['${id}']);\n`;
}

function generar() {
  const partes = ORDEN.map((id) => {
    const ruta = path.join(RAIZ, 'js', `${id}.js`);
    if (!fs.existsSync(ruta)) throw new Error(`falta js/${id}.js`);
    return transformar(id, fs.readFileSync(ruta, 'utf8'));
  });

  const modulos = ORDEN.map((id) => `${id}: {}`).join(', ');

  return `(function () {\n'use strict';\nconst modulos = { ${modulos} };\n${partes.join('')}})();\n`;
}

const contenido = generar();
const modoCheck = process.argv.includes('--check');

if (modoCheck) {
  const actual = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8') : '';
  if (actual !== contenido) {
    process.stderr.write('minesweeper.js está desfasado: ejecuta node tools/build.mjs\n');
    process.exit(1);
  }
  process.stdout.write('minesweeper.js al día\n');
} else {
  fs.writeFileSync(SALIDA, contenido);
  const kb = (Buffer.byteLength(contenido) / 1024).toFixed(1);
  process.stdout.write(`minesweeper.js escrito · ${kb} kB\n`);
}
