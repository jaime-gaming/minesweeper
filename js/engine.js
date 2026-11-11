// motor del buscaminas: máquina de estados + dibujado en lienzo.
// la lógica del tablero vive en board.js; aquí se anima y se pinta.

import { Tablero } from './board.js?v=1';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ACENTO = '#ff2b2b';

// números: cada valor con su color, como manda el buscaminas de toda la vida,
// pero en versión neón sobre la hoja de tinta
const COLORES_NUMERO = ['', '#5aa2ff', '#3ddc84', '#ff5d5d', '#b78cff', '#ff8a3d', '#2dd4d4', '#f5d90a', '#ececec'];
const COLOR_NUMERO = (n) => COLORES_NUMERO[clamp(n, 1, 8)] || ACENTO;

export class Game {
  constructor(cfg, onEvent = () => {}) {
    this.cfg = { ...cfg };
    this.tablero = new Tablero(this.cfg);
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};

    // 'antes' = aún no hay primer clic · 'jugando' · 'ganado' · 'perdido'
    this.estado = 'antes';
    this.pausado = false;
    this.tiempoMs = 0;
    this.reloj = 0; // ms acumulados en esta partida, para las animaciones

    this.cursor = {
      x: Math.floor(this.cfg.columnas / 2),
      y: Math.floor(this.cfg.filas / 2),
    };
    this.cursorVisible = false; // se enciende con el teclado, se apaga con el ratón
    this.hover = null;

    this.flashes = []; // { indice, t0 } — destello al destapar, en oleada
    this.shake = 0; // sacudida del lienzo al estallar
    this.explosionT = -1;
    this.winT = -1;

    // modificadores de campaña: reloj (contratiempo) y señalización inicial
    const mods = this.cfg.mods || {};
    this.relojMax = Number(mods.relojMs) > 0 ? Math.floor(Number(mods.relojMs)) : 0;
    this.restanteMs = this.relojMax;
    this.senal = Number(mods.senal) > 0 ? Math.floor(Number(mods.senal)) : 0;
    this.senalAplicada = false;
  }

  get tieneReloj() { return this.relojMax > 0; }
  get tiempoRestante() { return this.restanteMs; }

  emit(type, data) {
    this.onEvent(type, data);
  }

  get filas() { return this.tablero.filas; }
  get columnas() { return this.tablero.columnas; }
  get terminada() { return this.estado === 'ganado' || this.estado === 'perdido'; }
  get minasRestantes() { return this.tablero.restantesMinas(); }
  get tableroRevelado() {
    // al perder se muestran las minas; al ganar ya está todo abierto salvo las minas
    return this.estado === 'perdido' || this.estado === 'ganado';
  }

  indice(x, y) {
    return this.tablero.indice(x, y);
  }

  dentro(x, y) {
    return this.tablero.dentro(x, y);
  }

  // ------------------------------------------------------------------ acciones

  moverCursor(dx, dy) {
    this.cursorVisible = true;
    this.cursor.x = clamp(this.cursor.x + dx, 0, this.columnas - 1);
    this.cursor.y = clamp(this.cursor.y + dy, 0, this.filas - 1);
  }

  _aplicarResultado(resultado, origen) {
    const ahora = this.reloj;
    if (resultado.reveladas && resultado.reveladas.length) {
      const oleada = new Map();
      for (const { indice, distancia } of resultado.reveladas) {
        oleada.set(indice, distancia);
        this.flashes.push({ indice, t0: ahora + distancia * 38 });
      }
      if (this.flashes.length > 900) this.flashes = this.flashes.slice(-500);
      if (origen === 'acorde') this.emit('chord', { size: resultado.reveladas.length });
      this.emit('reveal', { size: resultado.reveladas.length });
    }
    if (resultado.explosion >= 0) {
      this.estado = 'perdido';
      this.explosionT = ahora;
      this.shake = 16;
      this.emit('boom', { indice: resultado.explosion });
      return;
    }
    if (resultado.victoria) {
      this.estado = 'ganado';
      this.winT = ahora;
      this.emit('win', { tiempoMs: this.tiempoMs });
      return;
    }
    if (this.estado === 'antes' && this.tablero.sembradas) {
      this.estado = 'jugando';
      if (this.senal > 0 && !this.senalAplicada) {
        this.senalAplicada = true;
        this.tablero.marcarSenal(this.senal);
      }
    }
  }

  // destapa la casilla (x, y): si está cerrada la revela; si ya estaba abierta,
  // hace el acorde. Es el comportamiento de los buscaminas modernos.
  pulsar(x, y) {
    if (this.pausado || this.terminada) return;
    if (!this.dentro(x, y)) return;
    const indice = this.indice(x, y);
    const celda = this.tablero.celdas[indice];
    if (celda.revelada) {
      this._aplicarResultado(this.tablero.acorde(indice), 'acorde');
      return;
    }
    this._aplicarResultado(this.tablero.revelar(indice), 'revelar');
  }

  acordeEn(x, y) {
    if (this.pausado || this.terminada) return;
    if (!this.dentro(x, y)) return;
    this._aplicarResultado(this.tablero.acorde(this.indice(x, y)), 'acorde');
  }

  alternarBanderaEn(x, y) {
    if (this.pausado || this.terminada) return;
    if (!this.dentro(x, y)) return;
    const resultado = this.tablero.alternarBandera(this.indice(x, y));
    if (resultado === 'bandera') this.emit('flag', { on: true });
    else if (resultado === 'sin-bandera') this.emit('unflag', {});
  }

  confirmarCursor() {
    this.pulsar(this.cursor.x, this.cursor.y);
  }

  alternarBanderaCursor() {
    this.alternarBanderaEn(this.cursor.x, this.cursor.y);
  }

  acordeCursor() {
    this.acordeEn(this.cursor.x, this.cursor.y);
  }

  update(dt) {
    const paso = clamp(Number(dt) || 0, 0, 100);
    this.reloj += paso;
    if (this.estado === 'jugando' && !this.pausado) this.tiempoMs += paso;
    else if (this.estado === 'antes' && !this.pausado && this.tablero.sembradas) this.tiempoMs += paso;
    // modificador «reloj»: si la galería se cierra, se acabó
    if (this.estado === 'jugando' && !this.pausado && this.relojMax > 0) {
      this.restanteMs = Math.max(0, this.restanteMs - paso);
      if (this.restanteMs === 0) {
        this.estado = 'perdido';
        this.explosionT = -1;
        this.emit('timeOut', {});
      }
    }
    this.shake = Math.max(0, this.shake - paso * 0.05);
    if (this.flashes.length) {
      const limite = this.reloj - 450;
      this.flashes = this.flashes.filter((f) => f.t0 > limite);
    }
  }

  // ------------------------------------------------------------------ dibujado

  draw(ctx, view) {
    const { cell, ox, oy, width, height, dpr } = view;
    const filas = this.filas;
    const columnas = this.columnas;
    const lado = Math.round(cell);
    const abrir = this.estado === 'ganado';
    const perdido = this.estado === 'perdido';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    if (this.shake > 0.25) {
      ctx.translate(
        Math.round((Math.random() - 0.5) * this.shake),
        Math.round((Math.random() - 0.5) * this.shake),
      );
    }

    const px = (x) => Math.round(ox + x * cell);
    const py = (y) => Math.round(oy + y * cell);
    const gap = lado >= 17 ? 1 : 0;

    for (let y = 0; y < filas; y += 1) {
      for (let x = 0; x < columnas; x += 1) {
        const i = this.indice(x, y);
        const celda = this.tablero.celdas[i];
        const X = px(x);
        const Y = py(y);
        const esHover = this.hover && this.hover.x === x && this.hover.y === y
          && !celda.revelada && !this.terminada;

        if (celda.revelada) {
          this._celdaAbierta(ctx, X, Y, lado, gap, celda, i);
        } else if (perdido && celda.mina && !celda.bandera) {
          // mina descubierta al perder: celda negra con la mina en blanco
          this._celdaAbierta(ctx, X, Y, lado, gap, { mina: true, adj: 0 }, i, true);
        } else {
          this._celdaCerrada(ctx, X, Y, lado, gap, esHover);
          if (celda.bandera) {
            const pop = abrir ? this._popVictoria(x, y) : 1;
            this._bandera(ctx, X, Y, lado, pop);
          }
        }

        if (perdido && celda.bandera && !celda.mina) {
          // bandera mal puesta: bloque con la equis roja
          this._equisMala(ctx, X, Y, lado, gap);
        }
      }
    }

    // la casilla que estalló: rojo entero, la mina en negro
    if (perdido && this.explosionT >= 0 && this.tablero.explosionIndice >= 0) {
      const i = this.tablero.explosionIndice;
      const ex = i % columnas;
      const ey = Math.floor(i / columnas);
      const edad = this.reloj - this.explosionT;
      const X = px(ex);
      const Y = py(ey);
      ctx.fillStyle = ACENTO;
      ctx.fillRect(X, Y, lado, lado);
      this._mina(ctx, X, Y, lado, '#000');
      if (edad < 220) {
        ctx.fillStyle = `rgba(255,255,255,${(1 - edad / 220).toFixed(3)})`;
        ctx.fillRect(X, Y, lado, lado);
      }
    }

    // oleada al ganar: una franja de luz diagonal cruza el tablero una vez
    if (abrir && this.winT >= 0) {
      const dur = 950;
      const t = clamp((this.reloj - this.winT - 120) / dur, 0, 1);
      if (t > 0 && t < 1) {
        const diag = Math.hypot(columnas * cell, filas * cell);
        const pasada = (t - 0.5) * (diag * 1.4);
        ctx.save();
        ctx.beginPath();
        ctx.rect(ox, oy, columnas * cell, filas * cell);
        ctx.clip();
        ctx.translate(ox + (columnas * cell) / 2, oy + (filas * cell) / 2);
        ctx.rotate(-Math.PI / 4);
        const ancho = diag * 0.36;
        const gradiente = ctx.createLinearGradient(pasada - ancho / 2, 0, pasada + ancho / 2, 0);
        gradiente.addColorStop(0, 'rgba(255,255,255,0)');
        gradiente.addColorStop(0.5, 'rgba(255,255,255,0.16)');
        gradiente.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradiente;
        ctx.fillRect(pasada - ancho / 2, -diag, ancho, diag * 2);
        ctx.restore();
      }
    }

    // destellos de oleada al destapar
    for (const f of this.flashes) {
      const edad = this.reloj - f.t0;
      if (edad < 0 || edad > 210) continue;
      const i = f.indice;
      const fx = i % columnas;
      const fy = Math.floor(i / columnas);
      const alfa = edad < 70 ? 0.75 * (1 - edad / 70) : 0;
      if (alfa > 0.01) {
        ctx.fillStyle = `rgba(255,255,255,${alfa.toFixed(3)})`;
        ctx.fillRect(px(fx), py(fy), lado, lado);
      }
    }

    // marco exterior: dos trazos en las esquinas, como el resto de la casa.
    // con el modificador reloj, por debajo de los 10 s las esquinas laten en rojo
    const urgente = this.tieneReloj && this.estado === 'jugando' && this.restanteMs < 10000;
    ctx.strokeStyle = urgente ? ACENTO : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    if (urgente) ctx.globalAlpha = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(this.reloj / 160));
    const W = columnas * cell;
    const H = filas * cell;
    const tramo = Math.max(6, Math.round(cell * 0.7));
    const b = 2; // el trazo va por dentro: en el borde se recortaría
    ctx.beginPath();
    ctx.moveTo(ox + b, oy + b + tramo); ctx.lineTo(ox + b, oy + b); ctx.lineTo(ox + b + tramo, oy + b);
    ctx.moveTo(ox + W - b - tramo, oy + b); ctx.lineTo(ox + W - b, oy + b); ctx.lineTo(ox + W - b, oy + b + tramo);
    ctx.moveTo(ox + b, oy + H - b - tramo); ctx.lineTo(ox + b, oy + H - b); ctx.lineTo(ox + b + tramo, oy + H - b);
    ctx.moveTo(ox + W - b - tramo, oy + H - b); ctx.lineTo(ox + W - b, oy + H - b); ctx.lineTo(ox + W - b, oy + H - b - tramo);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // cursor del teclado: cuatro marcas de esquina sobre cualquier casilla,
    // abierta o cerrada, para no perderlo de vista al destapar
    if (this.cursorVisible && !this.terminada) {
      const X = px(this.cursor.x);
      const Y = py(this.cursor.y);
      const c = Math.max(5, Math.round(cell * 0.34));
      const i = 2;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X + i, Y + i + c); ctx.lineTo(X + i, Y + i); ctx.lineTo(X + i + c, Y + i);
      ctx.moveTo(X + cell - i - c, Y + i); ctx.lineTo(X + cell - i, Y + i); ctx.lineTo(X + cell - i, Y + i + c);
      ctx.moveTo(X + i, Y + cell - i - c); ctx.lineTo(X + i, Y + cell - i); ctx.lineTo(X + i + c, Y + cell - i);
      ctx.moveTo(X + cell - i - c, Y + cell - i); ctx.lineTo(X + cell - i, Y + cell - i); ctx.lineTo(X + cell - i, Y + cell - i - c);
      ctx.stroke();
    }

    ctx.restore();
  }

  _celdaCerrada(ctx, X, Y, lado, gap, hover) {
    ctx.fillStyle = hover ? '#1d1d1d' : '#141414';
    ctx.fillRect(X + gap, Y + gap, lado - gap * 2, lado - gap * 2);
    // bisel: un trazo de luz arriba-izquierda y uno de sombra abajo-derecha
    ctx.fillStyle = hover ? '#333' : '#2a2a2a';
    ctx.fillRect(X + gap, Y + gap, lado - gap * 2, 1);
    ctx.fillRect(X + gap, Y + gap, 1, lado - gap * 2);
    ctx.fillStyle = '#080808';
    ctx.fillRect(X + gap, Y + lado - gap - 1, lado - gap * 2, 1);
    ctx.fillRect(X + lado - gap - 1, Y + gap, 1, lado - gap * 2);
  }

  _celdaAbierta(ctx, X, Y, lado, gap, celda, i, forzada = false) {
    ctx.fillStyle = '#060606';
    ctx.fillRect(X + gap, Y + gap, lado - gap * 2, lado - gap * 2);

    if (celda.mina) {
      this._mina(ctx, X, Y, lado, '#f2f2f2');
      return;
    }
    const n = celda.adj;
    if (n > 0) {
      const fuente = Math.round(lado * 0.56);
      const color = COLOR_NUMERO(n);
      ctx.fillStyle = color;
      ctx.font = `700 ${fuente}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // neón suave: el halo respira con el propio color del número
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = Math.round(lado * 0.22);
      ctx.fillText(String(n), X + lado / 2, Y + lado / 2 + Math.round(lado * 0.04));
      ctx.restore();
      ctx.fillText(String(n), X + lado / 2, Y + lado / 2 + Math.round(lado * 0.04));
    }
  }

  _mina(ctx, X, Y, lado, color) {
    const u = Math.max(1, Math.round(lado / 16)); // unidad base de la mina
    const cx = X + lado / 2;
    const cy = Y + lado / 2;
    ctx.fillStyle = color;
    // cuerpo: un bloque central grueso
    ctx.fillRect(Math.round(cx - 3 * u), Math.round(cy - 3 * u), 6 * u, 6 * u);
    ctx.fillRect(Math.round(cx - 4 * u), Math.round(cy - 2 * u), 8 * u, 4 * u);
    ctx.fillRect(Math.round(cx - 2 * u), Math.round(cy - 4 * u), 4 * u, 8 * u);
    // púas cardinales
    ctx.fillRect(Math.round(cx - u / 2), Math.round(cy - 6 * u), u, 2 * u);
    ctx.fillRect(Math.round(cx - u / 2), Math.round(cy + 4 * u), u, 2 * u);
    ctx.fillRect(Math.round(cx - 6 * u), Math.round(cy - u / 2), 2 * u, u);
    ctx.fillRect(Math.round(cx + 4 * u), Math.round(cy - u / 2), 2 * u, u);
    // púas diagonales: un píxel de bloque
    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy - 5 * u), u, u);
    ctx.fillRect(Math.round(cx + 4 * u), Math.round(cy - 5 * u), u, u);
    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy + 4 * u), u, u);
    ctx.fillRect(Math.round(cx + 4 * u), Math.round(cy + 4 * u), u, u);
  }

  _bandera(ctx, X, Y, lado, escala = 1) {
    if (escala <= 0.02) return;
    const u = Math.max(1, Math.round(lado / 16));
    const cx = Math.round(X + lado / 2);
    const base = Math.round(Y + lado - 4 * u);
    const cima = Math.round(Y + 3.5 * u);
    ctx.save();
    if (escala < 1) {
      ctx.translate(cx, (base + cima) / 2);
      ctx.scale(escala, escala);
      ctx.translate(-cx, -(base + cima) / 2);
    }
    // asta
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cx - u, cima, 2 * u > 1 ? 2 : 1, base - cima);
    // base del asta
    ctx.fillRect(cx - 3 * u, base, 6 * u, u);
    // paño rojo: escalones que estrechan hacia la izquierda
    ctx.fillStyle = ACENTO;
    ctx.fillRect(cx - 6 * u, cima, 5 * u, u);
    ctx.fillRect(cx - 6 * u, cima + u, 4 * u, u);
    ctx.fillRect(cx - 6 * u, cima + 2 * u, 3 * u, u);
    ctx.fillRect(cx - 6 * u, cima + 3 * u, 2 * u, u);
    ctx.restore();
  }

  _equisMala(ctx, X, Y, lado, gap) {
    const m = Math.round(lado * 0.22);
    ctx.strokeStyle = ACENTO;
    ctx.lineWidth = Math.max(2, Math.round(lado * 0.09));
    ctx.beginPath();
    ctx.moveTo(X + m, Y + m);
    ctx.lineTo(X + lado - m, Y + lado - m);
    ctx.moveTo(X + lado - m, Y + m);
    ctx.lineTo(X + m, Y + lado - m);
    ctx.stroke();
  }

  _popVictoria(x, y) {
    if (this.winT < 0) return 1;
    const retraso = (x + y) * 24;
    const t = clamp((this.reloj - this.winT - retraso) / 150, 0, 1);
    // rebote corto: crece un poco de más y se asienta
    if (t <= 0) return 0;
    const s = t < 0.6 ? 1.35 * (t / 0.6) : 1.35 - 0.35 * ((t - 0.6) / 0.4);
    return s;
  }
}
