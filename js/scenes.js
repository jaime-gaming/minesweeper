'use strict';

// Ilustraciones de escena para el modo campaña. Tinta militar sobre negro:
// bloques planos, blanco duro y rojo reserva, sin dependencias externas.
// Cada función dibuja dentro del área (0, 0) → (w, h) en píxeles CSS.

const TINTA = '#f2f2f2';
const TINTA_LEVE = '#7a7a7a';
const ROJO = '#ff2b2b';

function recta(ctx, x, y, w, h, color = TINTA) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function linea(ctx, x1, y1, x2, y2, color = TINTA, grosor = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function marco(ctx, x, y, w, h, color = TINTA, grosor = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth = grosor;
  ctx.strokeRect(x, y, w, h);
}

function mina(ctx, cx, cy, u, color = ROJO) {
  const u2 = Math.max(1, Math.round(u / 16));
  ctx.fillStyle = color;
  recta(ctx, cx - 3 * u2, cy - 3 * u2, 6 * u2, 6 * u2);
  recta(ctx, cx - 4 * u2, cy - 2 * u2, 8 * u2, 4 * u2);
  recta(ctx, cx - 2 * u2, cy - 4 * u2, 4 * u2, 8 * u2);
  recta(ctx, cx - u2, cy - 6 * u2, 2 * u2, 2 * u2);
  recta(ctx, cx - u2, cy + 4 * u2, 2 * u2, 2 * u2);
  recta(ctx, cx - 6 * u2, cy - u2, 2 * u2, 2 * u2);
  recta(ctx, cx + 4 * u2, cy - u2, 2 * u2, 2 * u2);
  recta(ctx, cx - 5 * u2, cy - 5 * u2, u2 + (u2 >> 1), u2 + (u2 >> 1));
  recta(ctx, cx + 4 * u2 - (u2 >> 1), cy - 5 * u2, u2 + (u2 >> 1), u2 + (u2 >> 1));
  recta(ctx, cx - 5 * u2, cy + 4 * u2 - (u2 >> 1), u2 + (u2 >> 1), u2 + (u2 >> 1));
  recta(ctx, cx + 4 * u2 - (u2 >> 1), cy + 4 * u2 - (u2 >> 1), u2 + (u2 >> 1), u2 + (u2 >> 1));
}

function texto(ctx, s, x, y, size, color = TINTA, fuente = 'ui-monospace, monospace') {
  ctx.fillStyle = color;
  ctx.font = `700 ${size}px ${fuente}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function escenaCampo(ctx, w, h) {
  const filas = 5;
  const columnas = 6;
  const lado = Math.min(w / (columnas + 1), h / (filas + 1)) * 0.72;
  const ox = (w - columnas * lado) / 2;
  const oy = (h - filas * lado) / 2;
  recta(ctx, 0, 0, w, h, '#000');
  for (let y = 0; y < filas; y += 1) {
    for (let x = 0; x < columnas; x += 1) {
      recta(ctx, ox + x * lado, oy + y * lado, lado * 0.78, lado * 0.78, '#111');
      linea(ctx, ox + x * lado, oy + y * lado, ox + (x + 1) * lado, oy + (y + 1) * lado, TINTA_LEVE, 0.6);
    }
  }
  mina(ctx, ox + 2.5 * lado, oy + 2 * lado, lado * 0.6);
}

function escenaCarta(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const x = w * 0.22;
  const y = h * 0.26;
  const an = w * 0.56;
  const al = h * 0.48;
  recta(ctx, x, y, an, al, TINTA);
  recta(ctx, x + an * 0.55, y, an * 0.45, al * 0.34, '#111'); // solapa
  recta(ctx, x + an * 0.1, y + al * 0.42, an * 0.3, al * 0.05, TINTA_LEVE);
  recta(ctx, x + an * 0.1, y + al * 0.52, an * 0.3, al * 0.05, TINTA_LEVE);
  const s = Math.min(an, al) * 0.14;
  recta(ctx, x + an - s * 1.6, y + al - s * 1.6, s, s, ROJO);
  recta(ctx, x + an - s * 1.4, y + al - s * 1.4, s * 0.6, s * 0.6, TINTA);
  texto(ctx, '«»', w / 2, h * 0.82, h * 0.07, TINTA_LEVE);
}

function escenaCuartel(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const x = w * 0.28;
  const y = h * 0.34;
  const an = w * 0.44;
  const al = h * 0.42;
  recta(ctx, x, y, an, al, '#111');
  marco(ctx, x, y, an, al, TINTA, 1.4);
  recta(ctx, x + an * 0.38, y + al * 0.62, an * 0.24, al * 0.36, TINTA); // puerta
  recta(ctx, x + an * 0.12, y + al * 0.16, an * 0.16, an * 0.16, TINTA); // ventana
  recta(ctx, x + an * 0.72, y + al * 0.16, an * 0.16, an * 0.16, TINTA);
  recta(ctx, x + an * 0.42, y - h * 0.06, an * 0.16, h * 0.06, ROJO); // bandera
  linea(ctx, x + an * 0.5, y - h * 0.06, x + an * 0.5, y, ROJO, 1.2);
}

function escenaPuente(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const aguaY = h * 0.56;
  for (let i = 0; i < 5; i += 1) {
    linea(ctx, w * 0.12 + i * w * 0.16, aguaY + 8, w * 0.2 + i * w * 0.16, aguaY - 6, TINTA_LEVE, 0.8);
  }
  recta(ctx, w * 0.15, h * 0.42, w * 0.7, h * 0.16, '#111');
  marco(ctx, w * 0.15, h * 0.42, w * 0.7, h * 0.16, TINTA, 1.4);
  for (let i = 0; i < 5; i += 1) {
    const px = w * 0.18 + i * w * 0.135;
    linea(ctx, px, h * 0.42, px, h * 0.58, TINTA, 0.9);
  }
  texto(ctx, '—', w / 2, aguaY + h * 0.04, h * 0.1, TINTA_LEVE);
}

function escenaTren(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const y = h * 0.52;
  const locoAn = w * 0.22;
  const locoAl = h * 0.18;
  recta(ctx, w * 0.12, y, locoAn, locoAl, TINTA);
  recta(ctx, w * 0.12 + locoAn * 0.55, y - h * 0.05, locoAn * 0.3, locoAl * 0.55, '#111'); // cabina
  recta(ctx, w * 0.18, y + locoAl * 0.72, w * 0.03, h * 0.06, '#000'); // rueda
  recta(ctx, w * 0.27, y + locoAl * 0.72, w * 0.03, h * 0.06, '#000');
  recta(ctx, w * 0.36, y, locoAn * 0.75, locoAl, TINTA); // vagon
  recta(ctx, w * 0.36 + locoAn * 0.62, y, locoAn * 0.13, locoAl, '#111');
  recta(ctx, w * 0.46, y + locoAl * 0.72, w * 0.03, h * 0.06, '#000');
  recta(ctx, w * 0.55, y + locoAl * 0.72, w * 0.03, h * 0.06, '#000');
  for (let i = 0; i < 3; i += 1) {
    linea(ctx, w * 0.1 + i * w * 0.05, y - h * 0.12 - i * h * 0.04, w * 0.05 + i * w * 0.03, y - h * 0.04, TINTA_LEVE, 1);
  }
  texto(ctx, 'chuu chuu', w / 2, h * 0.78, h * 0.06, TINTA_LEVE);
}

function escenaCampamento(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const fogataY = h * 0.66;
  recta(ctx, w * 0.42, fogataY, w * 0.04, h * 0.05, TINTA_LEVE);
  recta(ctx, w * 0.44, fogataY - h * 0.035, w * 0.02, h * 0.035, ROJO);
  recta(ctx, w * 0.46, fogataY - h * 0.028, w * 0.02, h * 0.028, '#ffd60a');
  const tienday = h * 0.42;
  const tiendaAl = h * 0.24;
  const tiendaAn = w * 0.16;
  for (const cx of [w * 0.3, w * 0.62]) {
    ctx.beginPath();
    ctx.moveTo(cx, tienday + tiendaAl);
    ctx.lineTo(cx - tiendaAn / 2, tienday);
    ctx.lineTo(cx + tiendaAn / 2, tienday);
    ctx.closePath();
    ctx.fillStyle = '#111';
    ctx.fill();
    ctx.strokeStyle = TINTA;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    recta(ctx, cx - tiendaAn * 0.12, tienday, tiendaAn * 0.24, tiendaAl * 0.18, TINTA);
  }
}

function escenaBrujula(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const cx = w / 2;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.22;
  linea(ctx, cx - r, cy, cx + r, cy, TINTA_LEVE, 0.8);
  linea(ctx, cx, cy - r, cx, cy + r, TINTA_LEVE, 0.8);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = TINTA;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  linea(ctx, cx, cy - r * 0.62, cx, cy - r * 0.92, TINTA, 2);
  linea(ctx, cx, cy + r * 0.62, cx, cy + r * 0.92, TINTA, 1);
  linea(ctx, cx - r * 0.62, cy, cx - r * 0.92, cy, TINTA, 1);
  linea(ctx, cx + r * 0.62, cy, cx + r * 0.92, cy, TINTA, 1);
  texto(ctx, 'N', cx, cy - r * 1.18, h * 0.09, TINTA);
  texto(ctx, 'S', cx, cy + r * 1.18, h * 0.09, TINTA);
  texto(ctx, 'E', cx + r * 1.18, cy, h * 0.09, TINTA);
  texto(ctx, 'O', cx - r * 1.18, cy, h * 0.09, TINTA);
}

function escenaArchivo(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const y = h * 0.42;
  for (let i = 0; i < 5; i += 1) {
    recta(ctx, w * 0.18 + i * w * 0.05, y + i * h * 0.035, w * 0.22, h * 0.14, '#111');
    marco(ctx, w * 0.18 + i * w * 0.05, y + i * h * 0.035, w * 0.22, h * 0.14, TINTA, 0.8);
    recta(ctx, w * 0.2 + i * w * 0.05, y + i * h * 0.035 + h * 0.045, w * 0.05, h * 0.02, TINTA_LEVE);
  }
  const s = Math.min(w, h) * 0.12;
  recta(ctx, w * 0.72 - s / 2, h * 0.78 - s / 2, s, s, ROJO);
  recta(ctx, w * 0.72 - s / 2 + s * 0.2, h * 0.78 - s / 2 + s * 0.2, s * 0.6, s * 0.6, TINTA);
  texto(ctx, 'NP', w * 0.72, h * 0.78, h * 0.07, TINTA);
}

function escenaSello(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const cx = w / 2;
  const cy = h * 0.44;
  const r = Math.min(w, h) * 0.3;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = ROJO;
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.82, 0, Math.PI * 2);
  ctx.strokeStyle = ROJO;
  ctx.lineWidth = 1;
  ctx.stroke();
  linea(ctx, cx - r * 0.55, cy - r * 0.3, cx + r * 0.55, cy + r * 0.3, ROJO, 1.4);
  linea(ctx, cx + r * 0.55, cy - r * 0.3, cx - r * 0.55, cy + r * 0.3, ROJO, 1.4);
  texto(ctx, 'NO', cx, cy - h * 0.06, h * 0.11, ROJO);
  texto(ctx, 'PISAR', cx, cy + h * 0.09, h * 0.09, ROJO);
}

function escenaRadio(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const x = w * 0.3;
  const y = h * 0.4;
  const an = w * 0.4;
  const al = h * 0.24;
  recta(ctx, x, y, an, al, '#111');
  marco(ctx, x, y, an, al, TINTA, 1.2);
  recta(ctx, x + an * 0.14, y + al * 0.3, an * 0.08, al * 0.35, TINTA_LEVE);
  recta(ctx, x + an * 0.28, y + al * 0.3, an * 0.08, al * 0.35, TINTA_LEVE);
  recta(ctx, x + an * 0.64, y + al * 0.34, an * 0.05, al * 0.28, ROJO); // indicador
  linea(ctx, x + an * 0.78, y - h * 0.02, x + an * 0.82, y - h * 0.16, TINTA, 1.4);
  linea(ctx, x + an * 0.8, y - h * 0.16, x + an * 0.92, y - h * 0.24, TINTA, 1.4);
  linea(ctx, x + an * 0.82, y - h * 0.02, x + an * 0.86, y - h * 0.16, TINTA, 1.4);
  texto(ctx, '─ ▩ ─', w / 2, h * 0.72, h * 0.06, TINTA_LEVE);
}

function escenaSol(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const cx = w * 0.72;
  const cy = h * 0.3;
  const r = Math.min(w, h) * 0.09;
  recta(ctx, cx - r, cy - r, r * 2, r * 2, ROJO);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    linea(ctx, cx + Math.cos(a) * r * 1.35, cy + Math.sin(a) * r * 1.35, cx + Math.cos(a) * r * 1.95, cy + Math.sin(a) * r * 1.95, ROJO, 1.6);
  }
  for (let i = 0; i < 3; i += 1) {
    const ry = h * 0.72 + i * h * 0.07;
    ctx.beginPath();
    ctx.arc(w / 2, ry, w * 0.45 - i * w * 0.12, 0, Math.PI);
    ctx.strokeStyle = TINTA_LEVE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}

function escenaCiudad(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const base = h * 0.78;
  const alturas = [0.34, 0.52, 0.44, 0.68, 0.4, 0.6, 0.3];
  const an = w / alturas.length;
  alturas.forEach((alt, i) => {
    recta(ctx, i * an + 2, base - h * alt, an - 4, h * alt, '#111');
    marco(ctx, i * an + 2, base - h * alt, an - 4, h * alt, TINTA, 0.8);
    recta(ctx, i * an + an * 0.22, base - h * alt * 0.35, an * 0.12, an * 0.12, '#0a0a0a');
    recta(ctx, i * an + an * 0.66, base - h * alt * 0.62, an * 0.12, an * 0.12, '#0a0a0a');
  });
  recta(ctx, 0, base, w, h * 0.04, TINTA_LEVE);
}

function escenaBunker(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const x = w * 0.3;
  const y = h * 0.38;
  const an = w * 0.4;
  const al = h * 0.4;
  recta(ctx, x, y, an, al, '#0a0a0a');
  marco(ctx, x, y, an, al, TINTA, 1.6);
  recta(ctx, x + an * 0.34, y + al * 0.55, an * 0.32, al * 0.22, '#000'); // ranura puerta
  recta(ctx, x + an * 0.1, y + al * 0.14, an * 0.07, an * 0.07, TINTA_LEVE); // rejilla
  recta(ctx, x + an * 0.22, y + al * 0.14, an * 0.07, an * 0.07, TINTA_LEVE);
  recta(ctx, x + an * 0.71, y + al * 0.14, an * 0.07, an * 0.07, TINTA_LEVE);
  recta(ctx, x + an * 0.83, y + al * 0.14, an * 0.07, an * 0.07, TINTA_LEVE);
  linea(ctx, x + an * 0.5, y - h * 0.05, x + an * 0.5, y + al + h * 0.08, ROJO, 1.6); // antena
}

function escenaPuerta(ctx, w, h) {
  recta(ctx, 0, 0, w, h, '#000');
  const cx = w / 2;
  const base = h * 0.8;
  const dAn = w * 0.22;
  const dAl = h * 0.5;
  recta(ctx, cx - dAn / 2, base - dAl, dAn, dAl, '#111');
  marco(ctx, cx - dAn / 2, base - dAl, dAn, dAl, TINTA, 1.4);
  recta(ctx, cx - dAn * 0.06, base - dAl * 0.42, dAn * 0.12, dAl * 0.06, TINTA); // marco superior
  recta(ctx, cx - dAn * 0.09, base - dAl * 0.32, dAn * 0.18, dAl * 0.04, ROJO); // aldaba
  recta(ctx, cx - dAn * 0.02, base - dAl * 0.3, dAn * 0.04, dAl * 0.04, '#000');
  recta(ctx, cx - dAn * 0.07, base - dAl * 0.12, dAn * 0.14, dAl * 0.03, ROJO); // fechadura
  recta(ctx, 0, base, w, h * 0.05, TINTA_LEVE);
  texto(ctx, '··', cx, base - dAl * 0.72, h * 0.08, TINTA_LEVE);
}

const ESCENAS = {
  campo: escenaCampo,
  carta: escenaCarta,
  cuartel: escenaCuartel,
  puente: escenaPuente,
  tren: escenaTren,
  campamento: escenaCampamento,
  brujula: escenaBrujula,
  archivo: escenaArchivo,
  sello: escenaSello,
  radio: escenaRadio,
  sol: escenaSol,
  ciudad: escenaCiudad,
  bunker: escenaBunker,
  puerta: escenaPuerta,
};

export function dibujarEscena(lienzo, clave) {
  const ctx = lienzo.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ancho = Math.round((lienzo.clientWidth || 360) * dpr);
  const alto = Math.round((lienzo.clientHeight || 240) * dpr);
  if (lienzo.width !== ancho) lienzo.width = ancho;
  if (lienzo.height !== alto) lienzo.height = alto;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = ancho / dpr;
  const h = alto / dpr;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const fn = ESCENAS[clave] || ESCENAS.campo;
  fn(ctx, w, h);
}
