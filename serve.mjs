
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = process.argv[3] ? path.resolve(process.argv[3]) : process.cwd();
const PUERTO = Number(process.argv[2] || 8123);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function responder(respuesta, codigo, destino, datos) {
  respuesta.writeHead(codigo, {
    'Content-Type': TIPOS[path.extname(destino)] || 'application/octet-stream',
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    Pragma: 'no-cache',
    Expires: '0',
    'Access-Control-Allow-Origin': '*',
    'X-Content-Type-Options': 'nosniff',
  });
  respuesta.end(datos);
}

const servidor = http.createServer((peticion, respuesta) => {
  if (peticion.method !== 'GET' && peticion.method !== 'HEAD') {
    respuesta.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  let url;
  let ruta;
  try {
    url = new URL(peticion.url, 'http://local');
    ruta = decodeURIComponent(url.pathname);
  } catch (error) {
    respuesta.writeHead(400).end('ruta no válida');
    return;
  }

  const rutaOriginal = ruta;
  if (ruta === '/minesweeper' || ruta === '/minesweeper/') ruta = '/';
  else if (ruta.startsWith('/minesweeper/')) ruta = ruta.slice('/minesweeper'.length);
  if (ruta === '/') ruta = '/index.html';
  if (ruta.endsWith('/')) ruta += 'index.html';

  const relativo = path.normalize(ruta).replace(/^[/\\]+/, '');
  let destino = path.resolve(RAIZ, relativo);
  if (destino !== RAIZ && !destino.startsWith(`${RAIZ}${path.sep}`)) {
    respuesta.writeHead(403).end('fuera de sitio');
    return;
  }

  fs.readFile(destino, (err, datos) => {
    const marca = new Date().toISOString().slice(11, 19);
    if (!err) {
      process.stdout.write(`${marca} 200 ${rutaOriginal}${url.search}\n`);
      responder(respuesta, 200, destino, peticion.method === 'HEAD' ? '' : datos);
      return;
    }

    const aceptaHtml = (peticion.headers.accept || '').includes('text/html');

    const pareceArchivo = /\.[a-z0-9]+$/i.test(rutaOriginal);
    if (aceptaHtml && !pareceArchivo) {
      const index = path.join(RAIZ, 'index.html');
      fs.readFile(index, (fallo, contenido) => {
        process.stdout.write(`${marca} ${fallo ? 404 : 200} ${rutaOriginal}${url.search} (fallback)\n`);
        if (fallo) respuesta.writeHead(404).end('no está');
        else responder(respuesta, 200, index, peticion.method === 'HEAD' ? '' : contenido);
      });
      return;
    }

    process.stdout.write(`${marca} 404 ${rutaOriginal}${url.search}\n`);
    respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('no está');
  });
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  process.stdout.write(`sirviendo ${RAIZ} en http://0.0.0.0:${PUERTO} (base /minesweeper/, sin caché)\n`);
});
