/* minesweeper — un solo fichero, sin módulos. generado por tools/build.mjs (2026-11-11 · v1).
   no lo edites a mano: cambia js/*.js y vuelve a ejecutar node tools/build.mjs */
(function () {
'use strict';
const modulos = { board: {}, presets: {}, audio: {}, input: {}, engine: {}, i18n: {}, main: {} };

// ---- board ----
(function (modulo) {
'use strict';
// lógica pura del buscaminas: sin DOM, sin canvas y sin temporizador.
// el motor la usa para jugar; tools/check.mjs la prueba en node.

class Tablero {
  // cfg: { filas, columnas, minas }. rng inyectable para las pruebas.
  constructor(cfg, rng = Math.random) {
    const filas = Math.floor(Number(cfg && cfg.filas));
    const columnas = Math.floor(Number(cfg && cfg.columnas));
    const minas = Math.floor(Number(cfg && cfg.minas));
    if (!Number.isFinite(filas) || filas < 2) throw new Error('filas inválidas');
    if (!Number.isFinite(columnas) || columnas < 2) throw new Error('columnas inválidas');
    const total = filas * columnas;
    if (!Number.isFinite(minas) || minas < 1) throw new Error('minas inválidas');
    if (minas > total - 1) throw new Error('demasiadas minas');

    this.filas = filas;
    this.columnas = columnas;
    this.total = total;
    this.minas = minas;
    this.rng = typeof rng === 'function' ? rng : Math.random;

    this.celdas = Array.from({ length: total }, () => ({
      mina: false,
      adj: 0,
      revelada: false,
      bandera: false,
    }));

    this.sembradas = false;
    this.estado = 'jugando'; // 'jugando' | 'ganado' | 'perdido'
    this.reveladas = 0;
    this.explosionIndice = -1;
  }

  indice(x, y) {
    return y * this.columnas + x;
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.columnas && y < this.filas;
  }

  vecinos(indice) {
    const x = indice % this.columnas;
    const y = Math.floor(indice / this.columnas);
    const out = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.dentro(nx, ny)) out.push(this.indice(nx, ny));
      }
    }
    return out;
  }

  // coloca las minas después del primer clic, lejos de la casilla elegida
  // (y de sus vecinas): el primer clic nunca explota y suele abrir hueco.
  sembrar(indiceSeguro) {
    if (this.sembradas) return;
    const zonaSegura = new Set([indiceSeguro, ...this.vecinos(indiceSeguro)]);

    let candidatas = [];
    for (let i = 0; i < this.total; i += 1) {
      if (!zonaSegura.has(i)) candidatas.push(i);
    }
    if (candidatas.length < this.minas) {
      // tableros diminutos: al menos la casilla del clic queda a salvo
      candidatas = [];
      for (let i = 0; i < this.total; i += 1) {
        if (i !== indiceSeguro) candidatas.push(i);
      }
    }

    // mezcla de Fisher–Yates con el rng inyectable
    for (let i = candidatas.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = candidatas[i];
      candidatas[i] = candidatas[j];
      candidatas[j] = tmp;
    }
    for (let i = 0; i < this.minas; i += 1) {
      this.celdas[candidatas[i]].mina = true;
    }

    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].mina) continue;
      let n = 0;
      for (const v of this.vecinos(i)) {
        if (this.celdas[v].mina) n += 1;
      }
      this.celdas[i].adj = n;
    }
    this.sembradas = true;
  }

  // revelado en cadena desde indice. cosecha: lista de { indice, distancia }.
  // la distancia sirve para animar la apertura en oleada.
  _revelarZona(indice, cosecha, distanciaBase = 0) {
    const inicio = this.celdas[indice];
    if (inicio.revelada || inicio.bandera) return;

    const cola = [{ i: indice, distancia: distanciaBase }];
    const visto = new Set([indice]);
    let cabeza = 0;
    while (cabeza < cola.length) {
      const { i, distancia } = cola[cabeza];
      cabeza += 1;
      const celda = this.celdas[i];
      if (celda.revelada || celda.bandera) continue;
      celda.revelada = true;
      this.reveladas += 1;
      cosecha.push({ indice: i, distancia });
      if (celda.adj !== 0) continue;
      for (const v of this.vecinos(i)) {
        if (visto.has(v)) continue;
        const vecina = this.celdas[v];
        if (vecina.mina || vecina.revelada || vecina.bandera) continue;
        visto.add(v);
        cola.push({ i: v, distancia: distancia + 1 });
      }
    }
  }

  _comprobarVictoria() {
    if (this.estado !== 'jugando') return false;
    if (this.reveladas === this.total - this.minas) {
      this.estado = 'ganado';
      // al ganar se izan las banderas que falten sobre las minas restantes
      for (const celda of this.celdas) {
        if (celda.mina) celda.bandera = true;
      }
      return true;
    }
    return false;
  }

  // revela una casilla cubierta. devuelve { reveladas, explosion }.
  revelar(indice) {
    const vacio = { reveladas: [], explosion: -1 };
    if (this.estado !== 'jugando') return vacio;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return vacio;
    const celda = this.celdas[indice];
    if (celda.revelada || celda.bandera) return vacio;

    if (!this.sembradas) this.sembrar(indice);

    if (celda.mina) {
      celda.revelada = true;
      this.reveladas += 1;
      this.estado = 'perdido';
      this.explosionIndice = indice;
      return { reveladas: [{ indice, distancia: 0 }], explosion: indice };
    }

    const cosecha = [];
    this._revelarZona(indice, cosecha, 0);
    const gano = this._comprobarVictoria();
    if (gano) {
      return { reveladas: cosecha, explosion: -1, victoria: true };
    }
    return { reveladas: cosecha, explosion: -1 };
  }

  // pulsación sobre una casilla: revela si está cubierta y hace el acorde
  // (chord) si ya está abierta. Es el comportamiento de los buscaminas modernos.
  pulsar(indice) {
    const celda = Number.isInteger(indice) && this.celdas[indice];
    if (celda && celda.revelada) return this.acorde(indice);
    return this.revelar(indice);
  }

  // acorde: con tantas banderas alrededor como indica el número, abre el resto.
  // si alguna bandera estaba mal puesta, la mina que quede a la vista explota.
  acorde(indice) {
    const vacio = { reveladas: [], explosion: -1 };
    if (this.estado !== 'jugando') return vacio;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return vacio;
    const celda = this.celdas[indice];
    if (!celda.revelada || celda.adj === 0) return vacio;

    const vs = this.vecinos(indice);
    const banderas = vs.reduce((acc, v) => acc + (this.celdas[v].bandera ? 1 : 0), 0);
    if (banderas !== celda.adj) return vacio;

    const cosecha = [];
    let explosion = -1;
    for (const v of vs) {
      const vecina = this.celdas[v];
      if (vecina.bandera || vecina.revelada) continue;
      if (vecina.mina) {
        vecina.revelada = true;
        this.reveladas += 1;
        cosecha.push({ indice: v, distancia: 0 });
        if (explosion === -1) explosion = v;
        continue;
      }
      this._revelarZona(v, cosecha, 0);
    }

    if (explosion !== -1) {
      this.estado = 'perdido';
      this.explosionIndice = explosion;
      return { reveladas: cosecha, explosion };
    }

    const gano = this._comprobarVictoria();
    return { reveladas: cosecha, explosion: -1, victoria: gano };
  }

  // pone o quita la bandera. devuelve 'bandera' | 'sin-bandera' | null.
  alternarBandera(indice) {
    if (this.estado !== 'jugando') return null;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return null;
    const celda = this.celdas[indice];
    if (celda.revelada) return null;
    celda.bandera = !celda.bandera;
    return celda.bandera ? 'bandera' : 'sin-bandera';
  }

  contarBanderas() {
    let n = 0;
    for (const celda of this.celdas) {
      if (celda.bandera) n += 1;
    }
    return n;
  }

  restantesMinas() {
    return this.minas - this.contarBanderas();
  }

  // minas que quedan por descubrir/marcar al perder: para el motor
  minasOcultas() {
    const out = [];
    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].mina && !this.celdas[i].bandera) out.push(i);
    }
    return out;
  }

  // banderas mal puestas (sobre una casilla sin mina) para el resumen final
  banderasErroneas() {
    const out = [];
    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].bandera && !this.celdas[i].mina) out.push(i);
    }
    return out;
  }
}

  Object.assign(modulo, { Tablero });
})(modulos['board']);

// ---- presets ----
(function (modulo) {
'use strict';
// dificultades del buscaminas y límites del tablero personalizado

const DIFICULTADES = [
  { id: 'beginner', filas: 9, columnas: 9, minas: 10 },
  { id: 'intermediate', filas: 16, columnas: 16, minas: 40 },
  { id: 'expert', filas: 16, columnas: 30, minas: 99 },
];

const DIFICULTAD_POR_DEFECTO = 'beginner';

// límites del tablero personalizado (los clásicos de Windows: 8–24 x 8–30,
// densidades razonables). aquí se relaja un poco por ambos lados.
const LIMITES_PERSONALIZADA = {
  filasMin: 5,
  filasMax: 24,
  columnasMin: 5,
  columnasMax: 30,
  minasMin: 1,
  // nunca más del 85 % de las casillas: siempre queda algo que descubrir
  densidadMax: 0.85,
};

function limitesMinas(filas, columnas) {
  const total = Math.max(1, Math.floor(filas) * Math.floor(columnas));
  return {
    min: LIMITES_PERSONALIZADA.minasMin,
    max: Math.max(LIMITES_PERSONALIZADA.minasMin, Math.floor(total * LIMITES_PERSONALIZADA.densidadMax)),
  };
}

function normalizarPersonalizada(cfg) {
  const L = LIMITES_PERSONALIZADA;
  const filas = clampEntero(cfg && cfg.filas, L.filasMin, L.filasMax, 9);
  const columnas = clampEntero(cfg && cfg.columnas, L.columnasMin, L.columnasMax, 9);
  const { min, max } = limitesMinas(filas, columnas);
  const minas = clampEntero(cfg && cfg.minas, min, max, Math.min(max, 10));
  return { filas, columnas, minas };
}

function clampEntero(valor, min, max, defecto) {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n)) return defecto;
  return Math.min(max, Math.max(min, n));
}

function dificultadPorId(id) {
  return DIFICULTADES.find((d) => d.id === id) || null;
}

function esDificultadFija(id) {
  return DIFICULTADES.some((d) => d.id === id);
}

  Object.assign(modulo, { DIFICULTADES, DIFICULTAD_POR_DEFECTO, LIMITES_PERSONALIZADA, limitesMinas, normalizarPersonalizada, dificultadPorId, esDificultadFija });
})(modulos['presets']);

// ---- audio ----
(function (modulo) {
'use strict';
// Sonido sintetizado en tiempo real: sin ficheros externos ni música de fondo.

let ctx = null;
let master = null;
let noiseBuf = null;
let roto = false;

function build() {
  if (ctx) return ctx;
  if (roto) return null;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) {
      roto = true;
      return null;
    }

    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = audio.enabled ? 0.15 : 0;

    if (typeof ctx.createDynamicsCompressor === 'function') {
      const compresor = ctx.createDynamicsCompressor();
      compresor.threshold.value = -20;
      compresor.knee.value = 16;
      compresor.ratio.value = 4;
      compresor.attack.value = 0.004;
      compresor.release.value = 0.16;
      master.connect(compresor).connect(ctx.destination);
    } else {
      master.connect(ctx.destination);
    }

    const len = Math.floor(ctx.sampleRate * 0.3);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  } catch (err) {
    // Sin audio se puede jugar con normalidad.
    roto = true;
    ctx = null;
    master = null;
    return null;
  }
}

function tono(freq, dur, opts = {}) {
  const c = build();
  if (!c || !(freq > 0) || !(dur > 0)) return;

  const t0 = c.currentTime + (opts.delay || 0);
  const ataque = Math.min(0.012, dur * 0.24);
  const salida = Math.min(opts.release || 0.04, dur * 0.44);
  const volumen = Math.max(0.0001, opts.vol ?? 0.2);
  const osc = c.createOscillator();
  const gan = c.createGain();

  osc.type = opts.tipo || 'square';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.fin > 0) osc.frequency.exponentialRampToValueAtTime(opts.fin, t0 + dur);

  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  gan.gain.setValueAtTime(volumen, t0 + dur - salida);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gan).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function ruido(dur, opts = {}) {
  const c = build();
  if (!c || !noiseBuf || !(dur > 0)) return;

  const t0 = c.currentTime + (opts.delay || 0);
  const src = c.createBufferSource();
  const filtro = c.createBiquadFilter();
  const gan = c.createGain();
  const volumen = Math.max(0.0001, opts.vol ?? 0.28);

  src.buffer = noiseBuf;
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(opts.desde || 2400, t0);
  filtro.frequency.exponentialRampToValueAtTime(opts.hasta || 120, t0 + dur);
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + Math.min(0.008, dur * 0.2));
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filtro).connect(gan).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function secuencia(frecuencias, opts = {}) {
  const { tipo = 'triangle', dur = 0.075, vol = 0.12, salto = 0.045 } = opts;
  frecuencias.forEach((freq, i) => tono(freq, dur, {
    tipo,
    vol,
    delay: i * salto,
  }));
}

const SONIDOS = {
  start() {
    tono(260, 0.085, { tipo: 'triangle', vol: 0.16, fin: 430 });
    tono(620, 0.08, { tipo: 'sine', vol: 0.08, delay: 0.045, fin: 760 });
  },
  // el tic de destapar: sube un poco el tono cuantas más casillas caen de golpe
  reveal({ size = 1 } = {}) {
    const n = Math.min(8, Math.max(1, size | 0));
    const base = 340 + n * 28;
    tono(base, 0.035, { tipo: 'square', vol: 0.055 });
    if (n >= 4) tono(base * 1.5, 0.03, { tipo: 'sine', vol: 0.04, delay: 0.03 });
  },
  chord() {
    tono(430, 0.03, { tipo: 'square', vol: 0.05 });
    tono(560, 0.035, { tipo: 'square', vol: 0.055, delay: 0.035 });
  },
  flag() {
    tono(720, 0.04, { tipo: 'square', vol: 0.085 });
    tono(1080, 0.03, { tipo: 'sine', vol: 0.05, delay: 0.025 });
  },
  unflag() {
    tono(540, 0.035, { tipo: 'square', vol: 0.06, fin: 430 });
  },
  boom() {
    ruido(0.34, { desde: 2600, hasta: 80, vol: 0.3 });
    tono(190, 0.34, { tipo: 'sawtooth', vol: 0.17, fin: 48 });
    tono(120, 0.3, { tipo: 'triangle', vol: 0.12, fin: 40, delay: 0.03 });
  },
  win() {
    secuencia([523, 659, 784, 1047, 1319], { dur: 0.13, vol: 0.13, salto: 0.075 });
  },
  record() {
    secuencia([784, 988, 1175, 1568], { tipo: 'sine', dur: 0.16, vol: 0.12, salto: 0.09 });
  },
  ui() {
    tono(460, 0.028, { tipo: 'square', vol: 0.045 });
  },
  locked() {
    tono(120, 0.075, { tipo: 'triangle', vol: 0.09, fin: 95 });
  },
};

const audio = {
  enabled: true,

  unlock() {
    try {
      const c = build();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    } catch (err) {
      /* El juego continúa en silencio. */
    }
  },

  set(on) {
    this.enabled = !!on;
    if (!master || !ctx) return;
    const valor = this.enabled ? 0.15 : 0;
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(valor, ctx.currentTime, 0.025);
    } catch (err) {
      master.gain.value = valor;
    }
  },

  toggle() {
    this.set(!this.enabled);
    return this.enabled;
  },

  play(nombre, datos) {
    if (!this.enabled) return;
    try {
      if (!build()) return;
      const fn = SONIDOS[nombre];
      if (fn) fn(datos || {});
    } catch (err) {
      /* Un sonido que falla no puede detener la partida. */
    }
  },
};

  Object.assign(modulo, { audio });
})(modulos['audio']);

// ---- input ----
(function (modulo) {
'use strict';
// teclado, gestos y mando. habla en acciones, no en teclas

const TECLAS = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  Enter: 'confirm',
  NumpadEnter: 'confirm',
  Space: 'confirm',
  KeyF: 'flag',
  KeyX: 'chord',
  KeyP: 'pause',
  KeyR: 'restart',
  KeyM: 'mute',
  KeyH: 'help',
  Escape: 'back',
  PageUp: 'scrollUp',
  PageDown: 'scrollDown',
  Home: 'scrollTop',
  End: 'scrollBottom',
};

const BOTONES = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'confirm', 1: 'flag', 2: 'chord', 3: 'restart', 9: 'pause' };

const RETARDO_PULSACION_LARGA = 450;

// main.js registra el conversor real: píxeles CSS → casilla { x, y } del tablero.
// sin él no hay gestos sobre el tablero, solo teclado y menús.
let conversorPunto = null;
function registrarConversorPunto(fn) {
  conversorPunto = typeof fn === 'function' ? fn : null;
}

function puntoACasilla(clientX, clientY) {
  return conversorPunto ? conversorPunto(clientX, clientY) : null;
}

const toque = { id: -1, x: 0, y: 0, activo: false, marcado: false, temporizador: 0 };


function attachInput({ stage, actions }) {
  const fire = (accion, repetido = false, datos) => actions(accion, repetido, datos);

  window.addEventListener('keydown', (e) => {
    if (e.target && typeof e.target.closest === 'function'
      && e.target.closest('input, select, textarea, [contenteditable="true"]')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const accion = TECLAS[e.code];
    if (!accion) return;
    if (e.code === 'Space' || e.code === 'Enter' || e.code.startsWith('Arrow')
      || e.code === 'PageUp' || e.code === 'PageDown' || e.code === 'Home' || e.code === 'End') e.preventDefault();
    // las direcciones y el scroll sí se repiten al mantener pulsado
    const repetible = ['up', 'down', 'left', 'right', 'scrollUp', 'scrollDown', 'scrollTop', 'scrollBottom'].includes(accion);
    if (e.repeat && !repetible) return;
    fire(accion, e.repeat);
  });

  // clic derecho: bandera. clic central: acorde (abre vecinos de un número servido)
  stage.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const celda = puntoACasilla(e.clientX, e.clientY);
    if (celda) fire('flag', false, { ...celda, puntero: true });
  });

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, #overlay')) return;
    // al tocar el tablero, el foco vuelve a la página: las teclas llegan siempre
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    if (typeof window.focus === 'function') window.focus();

    if (e.pointerType === 'mouse') {
      const celda = puntoACasilla(e.clientX, e.clientY);
      if (!celda) return;
      if (e.button === 0) fire('confirm', false, { ...celda, puntero: true });
      else if (e.button === 1) {
        e.preventDefault();
        fire('chord', false, { ...celda, puntero: true });
      }
      return;
    }

    // táctil: tocar revela, mantener pulsado pone la bandera
    toque.id = e.pointerId;
    toque.x = e.clientX;
    toque.y = e.clientY;
    toque.activo = true;
    toque.marcado = false;
    clearTimeout(toque.temporizador);
    toque.temporizador = setTimeout(() => {
      if (!toque.activo || toque.marcado) return;
      toque.marcado = true;
      const celda = puntoACasilla(toque.x, toque.y);
      if (celda) fire('flag', false, { ...celda, puntero: true });
      if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
    }, RETARDO_PULSACION_LARGA);
  });

  stage.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    if (!toque.activo || e.pointerId !== toque.id) return;
    toque.activo = false;
    clearTimeout(toque.temporizador);
    if (toque.marcado) return;
    const dx = e.clientX - toque.x;
    const dy = e.clientY - toque.y;
    if (Math.hypot(dx, dy) > 18) return;
    const celda = puntoACasilla(e.clientX, e.clientY);
    if (celda) fire('confirm', false, { ...celda, puntero: true });
  });

  stage.addEventListener('pointercancel', () => {
    toque.activo = false;
    clearTimeout(toque.temporizador);
  });

  // mando: estado por frame, sin eventos
  let previo = {};
  let conectado = false;

  function leerMando() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && pads[0];
    const actual = {};

    if (pad) {
      if (!conectado) {
        conectado = true;
        fire('padConectado');
      }
      const UMBRAL = 0.55;
      const ejeX = pad.axes[0] || 0;
      const ejeY = pad.axes[1] || 0;
      if (ejeX < -UMBRAL) actual.left = true;
      if (ejeX > UMBRAL) actual.right = true;
      if (ejeY < -UMBRAL) actual.up = true;
      if (ejeY > UMBRAL) actual.down = true;
      for (const [indice, nombre] of Object.entries(BOTONES)) {
        const boton = pad.buttons[indice];
        if (boton && (boton.pressed || boton.value > 0.5)) actual[nombre] = true;
      }
    } else if (conectado) {
      conectado = false;
    }

    for (const nombre of ['up', 'down', 'left', 'right', 'confirm', 'flag', 'chord', 'restart', 'pause']) {
      if (actual[nombre] && !previo[nombre]) fire(nombre);
    }

    previo = actual;
    requestAnimationFrame(leerMando);
  }

  if (navigator.getGamepads) requestAnimationFrame(leerMando);
}


  Object.assign(modulo, { registrarConversorPunto, attachInput });
})(modulos['input']);

// ---- engine ----
(function (modulo) {
'use strict';
// motor del buscaminas: máquina de estados + dibujado en lienzo.
// la lógica del tablero vive en board.js; aquí se anima y se pinta.

const { Tablero } = modulos['board'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ACENTO = '#ff2b2b';

// números: blanco con un ramp de luz; el 7 y el 8 avisan en rojo
const ALFA_NUMERO = [0, 0.56, 0.66, 0.76, 0.86, 0.93, 1, 1, 1];
const COLOR_NUMERO = (n) => (n >= 7 ? ACENTO : `rgba(255,255,255,${ALFA_NUMERO[clamp(n, 1, 8)].toFixed(2)})`);

class Game {
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
  }

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
    if (this.estado === 'antes' && this.tablero.sembradas) this.estado = 'jugando';
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

    // marco exterior: dos trazos en las esquinas, como el resto de la casa
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
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
      ctx.fillStyle = COLOR_NUMERO(n);
      ctx.font = `600 ${fuente}px ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
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

  Object.assign(modulo, { Game });
})(modulos['engine']);

// ---- i18n ----
(function (modulo) {
'use strict';
// Textos del juego y nombre localizados. Sin dependencias ni llamadas externas.

const KEY = 'minesweeper.language';
const STRINGS = {
  es: {
    documentTitle: 'Minesweeper',
    description: 'Buscaminas de bloques en blanco y negro: tres dificultades, banderas, récords locales y un cronómetro seco.',
    language: 'Idioma',
    brandTagline: 'el buscaminas de bloques en blanco y negro.',
    sound: 'sonido',
    soundOn: 'activado',
    soundOff: 'silenciado',
    soundTitleOn: 'sonido activo (M)',
    soundTitleOff: 'sonido apagado (M)',
    board: 'tablero',
    flag: 'bandera',
    flagMode: 'poner banderas al tocar',
    startSignal: 'despeja el campo',
    focusHint: 'toca el tablero para despertar el teclado',
    fatalTitle: 'el juego no ha arrancado',
    fatalReload: 'recargar limpio',
    fatalPieces: 'no se pudo colocar una pieza del tablero.',
    fatalMove: 'el tablero ha hecho un movimiento imposible.',
    fatalTimeout: 'el tablero no ha despertado en 4 s. vuelve a abrirlo.',
    fatalError: 'el tablero ha perdido el trazo.',
    noScript: 'este juego necesita su motor en marcha.',
    loading: 'cargando…',
    missingPieces: 'faltan piezas del tablero ({pieces}). vuelve a barajar.',
    // portada
    chooseAction: 'elige ruta',
    play: 'jugar',
    playTag: 'tres dificultades y una personalizada',
    profile: 'perfil',
    profileTag: 'récords, partidas y tasa de victorias',
    help: 'ayuda',
    helpTag: 'reglas y controles',
    settings: 'ajustes',
    settingsTag: 'sonido y trama de fósforo',
    menuAria: 'menú principal',
    // dificultad
    difficulty: 'DIFICULTAD',
    diffBeginner: 'principiante',
    diffBeginnerTag: '9 × 9 · 10 minas',
    diffIntermediate: 'intermedio',
    diffIntermediateTag: '16 × 16 · 40 minas',
    diffExpert: 'experto',
    diffExpertTag: '30 × 16 · 99 minas',
    diffCustom: 'personalizada',
    diffCustomTag: '{filas} × {columnas} · {minas} {unit}',
    best: 'mejor {time}',
    noRecord: 'sin récord',
    // personalizada
    custom: 'PERSONALIZADA',
    customRows: 'filas',
    customColumns: 'columnas',
    customMines: 'minas',
    density: 'densidad {pct} %',
    start: 'empezar',
    // hud
    minesLeft: 'minas',
    record: 'récord',
    // pausa
    pause: 'en pausa',
    resume: 'seguir',
    restart: 'reiniciar',
    quitToMenu: 'menú principal',
    // final de partida
    youWon: 'despejado.',
    youLost: 'boom.',
    clearedIn: 'despejado en {time}',
    newRecord: 'nuevo récord',
    yourRecord: 'tu récord: {time}',
    bestRecord: 'mejor récord: {time}',
    again: 'otra vez',
    menu: 'menú',
    minesExploded: 'las minas eran {count}',
    // perfil
    profileTitle: 'PERFIL',
    statsGames: 'partidas',
    statsWins: 'victorias',
    statsWinRate: 'tasa de victorias',
    statsBestStreak: 'mejor racha',
    statsBeginner: 'mejor · principiante',
    statsIntermediate: 'mejor · intermedio',
    statsExpert: 'mejor · experto',
    resetProgress: 'borrar progreso',
    resetProgressTag: 'récords, estadísticas y ajustes',
    resetDone: 'progreso borrado',
    confirmResetTitle: 'borrar progreso',
    confirmResetBody: 'se borran los récords, las partidas y los ajustes. no hay vuelta atrás.',
    confirmResetYes: 'borrar todo',
    cancel: 'cancelar',
    // ajustes
    settingsTitle: 'AJUSTES',
    settingSound: 'sonido',
    settingTrama: 'trama de fósforo',
    settingTramaTag: 'las líneas horizontales de la pantalla',
    on: 'sí',
    off: 'no',
    back: 'volver',
    // ayuda
    helpTitle: 'AYUDA',
    rulesTitle: 'reglas',
    rule1: 'destapa todas las casillas sin minas. al destapar una mina, la partida termina.',
    rule2: 'el número de cada casilla dice cuántas minas tocan sus ocho vecinas.',
    rule3: 'con el botón derecho (o tocando y manteniendo) pones una bandera sobre una sospecha.',
    rule4: 'con tantas banderas alrededor como dice el número, pulsa el número (o el botón central) para destapar el resto.',
    rule5: 'el primer clic nunca estalla y siempre abre hueco.',
    controlsTitle: 'controles',
    ctrlMove: 'mover el cursor',
    ctrlReveal: 'destapar',
    ctrlFlag: 'marcar con bandera',
    ctrlChord: 'acorde (abrir vecinos)',
    ctrlRestart: 'reiniciar',
    ctrlPause: 'pausa',
    ctrlMute: 'sonido',
    ctrlHelp: 'ayuda',
    ctrlMouse: 'clic izq. destapa · clic der. bandera · clic central acorde',
    ctrlTouch: 'tocar destapa · mantener pulsado bandera · modo bandera abajo a la derecha',
    // pistas del pie
    hintHome: 'elige una ruta · M silencia',
    hintModes: 'elige dificultad · Esc vuelve',
    hintCustom: '− + ajustan · Enter empieza',
    hintGame: 'flechas mueven · espacio destapa · F bandera · X acorde · R reinicia',
    hintGameTouch: 'toca para destapar · mantén pulsado para la bandera',
    hintPaused: 'sigue la partida con P o Esc',
    hintDead: 'R reintenta · Esc vuelve al menú',
    hintWon: 'R otra vez · Esc vuelve al menú',
    hintProfile: 'récords y estadísticas · Esc vuelve',
    hintHelp: 'Esc vuelve',
    hintSettings: 'M silencia · Esc vuelve',
  },
  en: {
    documentTitle: 'Minesweeper',
    description: 'A black-and-white block minesweeper: three difficulties, flags, local records and a dry timer.',
    language: 'Language',
    brandTagline: 'a block minesweeper in black and white.',
    sound: 'sound',
    soundOn: 'on',
    soundOff: 'muted',
    soundTitleOn: 'sound on (M)',
    soundTitleOff: 'sound off (M)',
    board: 'board',
    flag: 'flag',
    flagMode: 'tap to place flags',
    startSignal: 'clear the field',
    focusHint: 'tap the board to wake the keyboard',
    fatalTitle: 'the game did not boot',
    fatalReload: 'reload clean',
    fatalPieces: 'a board piece could not be placed.',
    fatalMove: 'the board made an impossible move.',
    fatalTimeout: 'the board did not wake in 4 s. reopen it.',
    fatalError: 'the board lost its stroke.',
    noScript: 'this game needs its engine running.',
    loading: 'loading…',
    missingPieces: 'board pieces are missing ({pieces}). reload.',
    // home
    chooseAction: 'pick a route',
    play: 'play',
    playTag: 'three difficulties and a custom board',
    profile: 'profile',
    profileTag: 'records, games and win rate',
    help: 'help',
    helpTag: 'rules and controls',
    settings: 'settings',
    settingsTag: 'sound and phosphor scanlines',
    menuAria: 'main menu',
    // difficulty
    difficulty: 'DIFFICULTY',
    diffBeginner: 'beginner',
    diffBeginnerTag: '9 × 9 · 10 mines',
    diffIntermediate: 'intermediate',
    diffIntermediateTag: '16 × 16 · 40 mines',
    diffExpert: 'expert',
    diffExpertTag: '30 × 16 · 99 mines',
    diffCustom: 'custom',
    diffCustomTag: '{filas} × {columnas} · {minas} {unit}',
    best: 'best {time}',
    noRecord: 'no record',
    // custom
    custom: 'CUSTOM',
    customRows: 'rows',
    customColumns: 'columns',
    customMines: 'mines',
    density: 'density {pct}%',
    start: 'start',
    // hud
    minesLeft: 'mines',
    record: 'best',
    // pause
    pause: 'paused',
    resume: 'resume',
    restart: 'restart',
    quitToMenu: 'main menu',
    // end of game
    youWon: 'cleared.',
    youLost: 'boom.',
    clearedIn: 'cleared in {time}',
    newRecord: 'new record',
    yourRecord: 'your record: {time}',
    bestRecord: 'best record: {time}',
    again: 'again',
    menu: 'menu',
    minesExploded: 'there were {count} mines',
    // profile
    profileTitle: 'PROFILE',
    statsGames: 'games',
    statsWins: 'wins',
    statsWinRate: 'win rate',
    statsBestStreak: 'best streak',
    statsBeginner: 'best · beginner',
    statsIntermediate: 'best · intermediate',
    statsExpert: 'best · expert',
    resetProgress: 'reset progress',
    resetProgressTag: 'records, stats and settings',
    resetDone: 'progress wiped',
    confirmResetTitle: 'reset progress',
    confirmResetBody: 'records, games and settings will be wiped. there is no undo.',
    confirmResetYes: 'wipe everything',
    cancel: 'cancel',
    // settings
    settingsTitle: 'SETTINGS',
    settingSound: 'sound',
    settingTrama: 'phosphor scanlines',
    settingTramaTag: 'the horizontal lines on screen',
    on: 'on',
    off: 'off',
    back: 'back',
    // help
    helpTitle: 'HELP',
    rulesTitle: 'rules',
    rule1: 'open every tile without a mine. open one mine and the run ends.',
    rule2: 'each tile number counts the mines touching its eight neighbours.',
    rule3: 'right click (or touch and hold) plants a flag on a suspect tile.',
    rule4: 'with as many flags around as the number says, press the number (or middle click) to open the rest.',
    rule5: 'the first click never blows up and always opens a space.',
    controlsTitle: 'controls',
    ctrlMove: 'move the cursor',
    ctrlReveal: 'reveal',
    ctrlFlag: 'flag',
    ctrlChord: 'chord (open neighbours)',
    ctrlRestart: 'restart',
    ctrlPause: 'pause',
    ctrlMute: 'sound',
    ctrlHelp: 'help',
    ctrlMouse: 'left click reveals · right click flags · middle click chords',
    ctrlTouch: 'tap reveals · touch and hold flags · flag mode bottom right',
    // footer hints
    hintHome: 'pick a route · M mutes',
    hintModes: 'pick a difficulty · Esc goes back',
    hintCustom: '− + adjust · Enter starts',
    hintGame: 'arrows move · space reveals · F flag · X chord · R restart',
    hintGameTouch: 'tap to reveal · hold to flag',
    hintPaused: 'resume with P or Esc',
    hintDead: 'R retries · Esc back to menu',
    hintWon: 'R again · Esc back to menu',
    hintProfile: 'records and stats · Esc goes back',
    hintHelp: 'Esc goes back',
    hintSettings: 'M mutes · Esc goes back',
  },
};

let language = 'es';

try {
  const stored = localStorage.getItem(KEY);
  if (stored === 'es' || stored === 'en') language = stored;
} catch (error) {
  // El idioma también funciona sin almacenamiento local.
}

function getLanguage() {
  return language;
}

function setLanguage(value) {
  language = value === 'en' ? 'en' : 'es';
  try {
    localStorage.setItem(KEY, language);
  } catch (error) {
    // El idioma se mantiene en memoria durante esta sesión.
  }
  return language;
}

function t(key, values = {}) {
  let text = STRINGS[language][key] ?? STRINGS.es[key] ?? key;
  if (typeof text !== 'string') return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

function unitMinas(count) {
  const n = Number(count);
  if (language === 'en') return n === 1 ? 'mine' : 'mines';
  return n === 1 ? 'mina' : 'minas';
}

// para tools/check.mjs: las claves de cada idioma, sin duplicar la lista
function __testClaves() {
  return {
    es: Object.keys(STRINGS.es),
    en: Object.keys(STRINGS.en),
    esValores: STRINGS.es,
    enValores: STRINGS.en,
  };
}

  Object.assign(modulo, { getLanguage, setLanguage, t, unitMinas, __testClaves });
})(modulos['i18n']);

// ---- main ----
(function (modulo) {
'use strict';
const { Game } = modulos['engine'];
const { DIFICULTADES, DIFICULTAD_POR_DEFECTO, normalizarPersonalizada, dificultadPorId, esDificultadFija, limitesMinas } = modulos['presets'];
const { audio } = modulos['audio'];
const { attachInput, registrarConversorPunto } = modulos['input'];
const { t, getLanguage, setLanguage, unitMinas } = modulos['i18n'];

const $ = (sel) => document.querySelector(sel);

// si algo se rompe, que se vea en pantalla en vez de quedarse en negro
function avisar(mensaje) {
  if (typeof window.__minesweeperFallo === 'function') window.__minesweeperFallo(mensaje);
}

function comprobarPiezas() {
  const faltan = [];
  if (!Array.isArray(DIFICULTADES) || DIFICULTADES.length !== 3) faltan.push('dificultades');
  if (typeof Game !== 'function') faltan.push('motor');
  if (typeof attachInput !== 'function') faltan.push('controles');
  if (faltan.length) {
    avisar(t('missingPieces', { pieces: faltan.join(', ') }));
    return false;
  }
  return true;
}

/* ------------------------------------------------------------- guardado */

const CLAVE = 'minesweeper.v1';

function nuevoRegistro() {
  return {
    best: { beginner: 0, intermediate: 0, expert: 0 }, // ms; 0 = sin récord
    stats: { games: 0, wins: 0, streak: 0, bestStreak: 0 },
    sound: true,
    trama: true,
    custom: { filas: 9, columnas: 16, minas: 40 },
  };
}

function leerGuardado() {
  const datos = nuevoRegistro();
  let bruto = null;
  try {
    bruto = JSON.parse(localStorage.getItem(CLAVE) || 'null');
  } catch (err) {
    return datos;
  }
  if (!bruto || typeof bruto !== 'object') return datos;

  for (const clave of Object.keys(datos.best)) {
    const valor = Number(bruto.best && bruto.best[clave]);
    datos.best[clave] = Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
  }
  const st = bruto.stats || {};
  for (const campo of ['games', 'wins', 'streak', 'bestStreak']) {
    datos.stats[campo] = Math.max(0, Math.floor(Number(st[campo])) || 0);
  }
  if (typeof bruto.sound === 'boolean') datos.sound = bruto.sound;
  if (typeof bruto.trama === 'boolean') datos.trama = bruto.trama;
  if (bruto.custom && typeof bruto.custom === 'object') {
    datos.custom = normalizarPersonalizada(bruto.custom);
  }
  return datos;
}

const guardado = leerGuardado();

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(guardado));
  } catch (err) {
    /* sin almacenamiento se juega igual */
  }
}

/* ---------------------------------------------------------------- estado */

const app = {
  pantalla: 'home',
  juego: null,
  modo: DIFICULTAD_POR_DEFECTO,
  record: false, // la última partida ganada fue récord
  flagMode: false,
  hud: { meta: '', score: '', mult: '', best: '' },
};

const vista = { cell: 24, ox: 0, oy: 0, width: 480, height: 480, dpr: 1 };

const el = {
  topbar: $('#topbar'),
  brand: $('.brand'),
  stage: $('#stage'),
  canvas: $('#board'),
  overlay: $('#overlay'),
  senal: $('#senal'),
  hint: $('#hint'),
  meta: $('#hud-meta'),
  score: $('#hud-score'),
  mult: $('#hud-mult'),
  best: $('#hud-best'),
  langSwitch: $('#lang-switch'),
  avisoFoco: $('#aviso-foco'),
  flagToggle: $('#flag-toggle'),
  barrido: $('#barrido'),
};

const dosDigitos = (n) => String(n).padStart(2, '0');

function formatoTiempo(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000));
  const minutos = Math.floor(total / 60);
  const segundos = total % 60;
  return `${minutos}:${dosDigitos(segundos)}`;
}

function nombreDificultad(id) {
  if (esDificultadFija(id)) return t(id === 'beginner' ? 'diffBeginner' : id === 'intermediate' ? 'diffIntermediate' : 'diffExpert');
  return t('diffCustom');
}

function configDeModo(id) {
  if (esDificultadFija(id)) {
    const d = dificultadPorId(id);
    return { filas: d.filas, columnas: d.columnas, minas: d.minas };
  }
  return { ...guardado.custom };
}

function esTactil() {
  return window.matchMedia('(pointer: coarse)').matches;
}

/* --------------------------------------------------------- overlay/pantallas */

const FOCO_SEL = '.row:not(.stat), .acciones button';
let focoIndice = -1;

function ponerOverlay(html) {
  if (!html) {
    el.overlay.classList.remove('abierto');
    el.overlay.innerHTML = '';
    focoIndice = -1;
    return;
  }
  el.overlay.innerHTML = html;
  el.overlay.classList.add('abierto');
  el.overlay.scrollTop = 0;
}

function filasDelOverlay() {
  return Array.from(el.overlay.querySelectorAll(FOCO_SEL));
}

function pintarFoco() {
  const filas = filasDelOverlay();
  filas.forEach((nodo, i) => nodo.classList.toggle('sel', i === focoIndice));
  const sel = filas[focoIndice];
  if (sel && typeof sel.scrollIntoView === 'function') {
    sel.scrollIntoView({ block: 'nearest' });
  }
}

function moverFoco(paso) {
  const filas = filasDelOverlay();
  if (!filas.length) return;
  focoIndice = ((focoIndice + paso) % filas.length + filas.length) % filas.length;
  pintarFoco();
  audio.play('ui');
}

function enfocarPrimero() {
  focoIndice = 0;
  pintarFoco();
}

function activarFoco() {
  const filas = filasDelOverlay();
  const sel = filas[focoIndice];
  if (sel && typeof sel.click === 'function') sel.click();
}

/* --------------------------------------------------- barrido de pantallas */

const barrido = { ctx: null, ancho: 0, alto: 0, dpr: 1, t: 0, activo: false, celdas: null };
const DURACION_BARRIDO = 260;

function sinMovimiento() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (err) {
    return false;
  }
}

function ajustarBarrido() {
  const lienzo = el.barrido;
  if (!lienzo) return false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  barrido.ancho = window.innerWidth;
  barrido.alto = window.innerHeight;
  barrido.dpr = dpr;
  lienzo.width = Math.round(barrido.ancho * dpr);
  lienzo.height = Math.round(barrido.alto * dpr);
  lienzo.style.width = `${barrido.ancho}px`;
  lienzo.style.height = `${barrido.alto}px`;
  barrido.ctx = lienzo.getContext('2d');
  const lado = Math.max(18, Math.round(Math.min(barrido.ancho, barrido.alto) / 18));
  barrido.lado = lado;
  barrido.celdas = [];
  for (let y = 0; y * lado < barrido.alto + lado; y += 1) {
    for (let x = 0; x * lado < barrido.ancho + lado; x += 1) {
      barrido.celdas.push({ x, y, orden: x + y, aleatorio: Math.random() });
    }
  }
  return true;
}

function pintarBarrido(progreso) {
  const { ctx } = barrido;
  if (!ctx) return;
  const { ancho, alto, dpr, lado } = barrido;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, ancho, alto);
  const maxOrden = Math.ceil(ancho / lado) + Math.ceil(alto / lado);
  const barridoPos = progreso * (maxOrden + 3) - 1.5;
  ctx.fillStyle = '#000';
  for (const celda of barrido.celdas) {
    const d = celda.orden + celda.aleatorio * 1.4;
    if (d < barridoPos - 1.3) continue; // ya descubierta
    if (d > barridoPos + 1.3) continue; // aún sin barrer
    ctx.fillRect(celda.x * lado, celda.y * lado, lado + 0.5, lado + 0.5);
  }
}

function taparPantalla() {
  if (sinMovimiento()) return;
  // se reajusta en cada cambio de pantalla: puede haber cambiado el tamaño
  if (!ajustarBarrido()) return;
  if (el.barrido.hidden) el.barrido.hidden = false;
  barrido.t = 0;
  barrido.activo = true;
}

function pasoBarrido(dt) {
  if (!barrido.activo) return;
  barrido.t += dt;
  const progreso = clamp01(barrido.t / DURACION_BARRIDO);
  pintarBarrido(progreso);
  if (progreso >= 1) {
    barrido.activo = false;
    el.barrido.hidden = true;
  }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* --------------------------------------------------------------- pistas */

const PISTAS = {
  home: 'hintHome',
  modes: 'hintModes',
  custom: 'hintCustom',
  playing: 'hintGame',
  paused: 'hintPaused',
  dead: 'hintDead',
  won: 'hintWon',
  profile: 'hintProfile',
  help: 'hintHelp',
  settings: 'hintSettings',
};

function actualizarPista() {
  if (app.pantalla === 'playing') {
    el.hint.textContent = esTactil() ? t('hintGameTouch') : t('hintGame');
    return;
  }
  const clave = PISTAS[app.pantalla];
  el.hint.textContent = clave ? t(clave) : '';
}

function pantalla(nombre) {
  const antes = app.pantalla;
  app.pantalla = nombre;
  document.body.dataset.screen = nombre;
  el.flagToggle.hidden = !(nombre === 'playing' && esTactil());
  if (nombre !== 'playing') el.senal.classList.remove('visible');
  if (antes !== nombre) taparPantalla();
  actualizarPista();
}

/* ------------------------------------------------------------------ HUD */

function escribirHud(meta, score, mult, best) {
  const hud = app.hud;
  if (hud.meta !== meta) { el.meta.textContent = meta; hud.meta = meta; }
  if (hud.score !== score) { el.score.textContent = score; hud.score = score; }
  if (hud.mult !== mult) { el.mult.textContent = mult; hud.mult = mult; }
  if (hud.best !== best) { el.best.textContent = best; hud.best = best; }
}

function actualizarMarcador() {
  const j = app.juego;
  if (!j) {
    escribirHud('—', '—', '', '');
    return;
  }
  const bestMs = esDificultadFija(app.modo) ? guardado.best[app.modo] : 0;
  const bestTxt = esDificultadFija(app.modo)
    ? (bestMs > 0 ? `${t('record')} ${formatoTiempo(bestMs)}` : t('noRecord'))
    : t('diffCustom');
  escribirHud(
    nombreDificultad(app.modo),
    String(j.minasRestantes),
    formatoTiempo(j.tiempoMs),
    bestTxt,
  );
}

/* -------------------------------------------------------- ajustar lienzo */

function ajustarLienzo() {
  const j = app.juego;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const banda = el.stage.getBoundingClientRect();
  const columnas = j ? j.columnas : 9;
  const filas = j ? j.filas : 9;
  const margen = 4;
  const availW = Math.max(80, banda.width - margen);
  const availH = Math.max(80, banda.height - margen);
  const cell = Math.max(8, Math.floor(Math.min(availW / columnas, availH / filas)));
  vista.cell = cell;
  vista.width = cell * columnas;
  vista.height = cell * filas;
  vista.ox = 0;
  vista.oy = 0;
  vista.dpr = dpr;

  const ancho = Math.round(vista.width * dpr);
  const alto = Math.round(vista.height * dpr);
  if (el.canvas.width !== ancho) el.canvas.width = ancho;
  if (el.canvas.height !== alto) el.canvas.height = alto;
  el.canvas.style.width = `${vista.width}px`;
  el.canvas.style.height = `${vista.height}px`;
}

function conversorDePuntos(clientX, clientY) {
  const j = app.juego;
  if (!j) return null;
  const rect = el.canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = Math.floor(((clientX - rect.left) / rect.width) * j.columnas);
  const y = Math.floor(((clientY - rect.top) / rect.height) * j.filas);
  if (x < 0 || y < 0 || x >= j.columnas || y >= j.filas) return null;
  return { x, y };
}

/* ------------------------------------------------------------ pantallas */

function filaHTML({ accion = null, campo = null, idx, nombre, detalle = '', derecha = '', peligro = false, stat = false }) {
  const clases = ['row'];
  if (peligro) clases.push('peligro');
  if (stat) clases.push('stat');
  const attrs = ['type="button"', `class="${clases.join(' ')}"`];
  if (accion) attrs.push(`data-accion="${accion}"`);
  if (campo) attrs.push(`data-campo="${campo}"`);
  return `<button ${attrs.join(' ')}>
    <span class="row-idx">${dosDigitos(idx + 1)}</span>
    <span class="row-name">${nombre}${detalle ? `<small>${detalle}</small>` : ''}</span>
    <span class="row-right">${derecha}</span>
  </button>`;
}

function cabeceraPanel(titulo, extra = '') {
  return `<div class="niveles-cabeza">
    <p class="kicker">${titulo}</p>
    ${extra}
  </div>`;
}

const botonVolver = () => `<button class="ghost" type="button" data-accion="back">${t('back')}<kbd>Esc</kbd></button>`;

function mostrarPortada() {
  app.juego = null;
  app.contado = false;
  const filas = [
    filaHTML({ accion: 'play', idx: 0, nombre: t('play'), detalle: t('playTag'), derecha: '↵' }),
    filaHTML({ accion: 'profile', idx: 1, nombre: t('profile'), detalle: t('profileTag') }),
    filaHTML({ accion: 'help', idx: 2, nombre: t('help'), detalle: t('helpTag'), derecha: 'H' }),
    filaHTML({ accion: 'settings', idx: 3, nombre: t('settings'), detalle: t('settingsTag'), derecha: 'M' }),
  ].join('');
  ponerOverlay(`<div class="panel inicio portada">
    <div class="inicio-texto">
      <header class="inicio-cabeza">
        <h1>minesweeper<span class="dot">.</span></h1>
        <p class="tagline">${t('brandTagline')}</p>
      </header>
      <nav class="filas" aria-label="${t('menuAria')}">${filas}</nav>
      <p class="pie">
        <span>minesweeper · v1</span>
        <button class="link" type="button" data-accion="help">${t('help')}</button>
        <button class="link" type="button" data-accion="profile">${t('profile')}</button>
      </p>
    </div>
  </div>`);
  escribirHud('—', '—', '', '');
  pantalla('home');
  pintarLienzoVacio();
  enfocarPrimero();
}

function detalleCustom() {
  const c = guardado.custom;
  return t('diffCustomTag', { filas: c.filas, columnas: c.columnas, minas: c.minas, unit: unitMinas(c.minas) });
}

function densidadCustom() {
  const c = guardado.custom;
  return Math.round((c.minas / (c.filas * c.columnas)) * 100);
}

function mostrarDificultades() {
  app.juego = null;
  const filas = DIFICULTADES.map((d, i) => {
    const best = guardado.best[d.id];
    const clave = d.id === 'beginner' ? 'Beginner' : d.id === 'intermediate' ? 'Intermediate' : 'Expert';
    return filaHTML({
      accion: `play:${d.id}`,
      idx: i,
      nombre: t(`diff${clave}`),
      detalle: t(`diff${clave}Tag`),
      derecha: best > 0 ? formatoTiempo(best) : '—',
    });
  });
  filas.push(filaHTML({
    accion: 'playCustom',
    idx: DIFICULTADES.length,
    nombre: t('diffCustom'),
    detalle: detalleCustom(),
    derecha: t('custom').toLowerCase(),
  }));
  ponerOverlay(`<div class="panel">
    ${cabeceraPanel(t('difficulty'), botonVolver())}
    <nav class="filas" aria-label="${t('difficulty')}">${filas.join('')}</nav>
  </div>`);
  pantalla('modes');
  enfocarPrimero();
}

function filaPasoHTML({ idx, nombre, campo, delta, valor }) {
  return `<div class="row paso-row" data-campo="${campo}" role="group" aria-label="${nombre}">
    <span class="row-idx">${dosDigitos(idx + 1)}</span>
    <span class="row-name">${nombre}</span>
    <span class="paso">
      <button type="button" data-paso="${campo}:-1" aria-label="− ${nombre}">−</button>
      <b>${valor}</b>
      <button type="button" data-paso="${campo}:1" aria-label="+ ${nombre}">+</button>
    </span>
  </div>`;
}

function mostrarPersonalizada(foco = 0) {
  const c = guardado.custom;
  const { min, max } = limitesMinas(c.filas, c.columnas);
  const filas = [
    filaPasoHTML({ idx: 0, nombre: t('customRows'), campo: 'filas', valor: c.filas }),
    filaPasoHTML({ idx: 1, nombre: t('customColumns'), campo: 'columnas', valor: c.columnas }),
    filaPasoHTML({ idx: 2, nombre: t('customMines'), campo: 'minas', valor: c.minas }),
  ];
  filas.push(filaHTML({
    accion: 'customStart',
    idx: 3,
    nombre: t('start'),
    detalle: t('density', { pct: densidadCustom() }),
    derecha: '↵',
  }));
  ponerOverlay(`<div class="panel">
    ${cabeceraPanel(t('custom'), botonVolver())}
    <div class="filas">${filas.join('')}</div>
    <p class="nota">${t('customMines')}: ${min}–${max} · ${c.filas} × ${c.columnas}</p>
  </div>`);
  pantalla('custom');
  const filasUi = filasDelOverlay();
  focoIndice = Math.min(foco, Math.max(0, filasUi.length - 1));
  pintarFoco();
}

function pasoPersonalizado(campo, delta) {
  const c = { ...guardado.custom };
  const limites = { filas: [5, 24], columnas: [5, 30], minas: [1, Math.floor(c.filas * c.columnas * 0.85)] };
  c[campo] = (Number(c[campo]) || 0) + delta;
  c.filas = Math.min(limites.filas[1], Math.max(limites.filas[0], c.filas));
  c.columnas = Math.min(limites.columnas[1], Math.max(limites.columnas[0], c.columnas));
  const minasMax = Math.max(1, Math.floor(c.filas * c.columnas * 0.85));
  c.minas = Math.min(minasMax, Math.max(1, c.minas));
  guardado.custom = c;
  guardar();
  audio.play('ui');
  mostrarPersonalizada(focoIndice);
}

function pintarLienzoVacio() {
  if (!el.lienzoCtx) el.lienzoCtx = el.canvas.getContext('2d');
  ajustarLienzo();
  const ctx = el.lienzoCtx;
  ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, vista.width, vista.height);
}

/* ---------------------------------------------------- ciclo de partida */

function empezarPartida(modo) {
  app.modo = modo;
  app.juego = new Game(configDeModo(modo), eventosJuego);
  app.record = false;
  app.contado = false;
  app.flagMode = false;
  el.flagToggle.setAttribute('aria-pressed', 'false');
  el.flagToggle.classList.remove('activo');
  ponerOverlay(null);
  pantalla('playing');
  el.senal.textContent = t('startSignal');
  el.senal.classList.add('visible');
  ajustarLienzo();
  actualizarMarcador();
  audio.play('start');
}

function reiniciarPartida() {
  empezarPartida(app.modo);
}

function pausarJuego() {
  const j = app.juego;
  if (!j || j.terminada) return;
  j.pausado = true; // también vale antes del primer clic: hay menú que abrir

  ponerOverlay(`<div class="panel fin">
    <header class="fin-cabeza">
      <p class="kicker">${nombreDificultad(app.modo)}</p>
      <h2 class="cifra">${t('pause')}</h2>
    </header>
    <div class="acciones">
      <button class="principal" type="button" data-accion="resume"><span>${t('resume')}</span><kbd>P</kbd></button>
      <button type="button" data-accion="restart"><span>${t('restart')}</span><kbd>R</kbd></button>
      <button type="button" data-accion="toMenu"><span>${t('quitToMenu')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('paused');
  enfocarPrimero();
}

function reanudar() {
  const j = app.juego;
  if (!j) return;
  j.pausado = false;
  ponerOverlay(null);
  pantalla('playing');
}

function contabilizarFin(gano) {
  if (app.contado) return;
  app.contado = true;
  const s = guardado.stats;
  s.games += 1;
  if (gano) {
    s.wins += 1;
    s.streak += 1;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else {
    s.streak = 0;
  }
  if (gano && esDificultadFija(app.modo)) {
    const prev = guardado.best[app.modo];
    if (prev === 0 || app.juego.tiempoMs < prev) {
      guardado.best[app.modo] = Math.max(1, Math.floor(app.juego.tiempoMs));
      app.record = true;
    }
  }
  guardar();
}

function eventosJuego(tipo, datos) {
  const j = app.juego;
  switch (tipo) {
    case 'reveal':
      audio.play('reveal', { size: datos && datos.size });
      el.senal.classList.remove('visible');
      break;
    case 'chord':
      audio.play('chord');
      break;
    case 'flag':
      audio.play('flag');
      break;
    case 'unflag':
      audio.play('unflag');
      break;
    case 'boom':
      contabilizarFin(false);
      audio.play('boom');
      if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 40, 90]);
      setTimeout(() => {
        if (app.juego === j && j.estado === 'perdido') mostrarFinPerdida();
      }, 750);
      break;
    case 'win':
      contabilizarFin(true);
      audio.play('win');
      if (app.record) setTimeout(() => audio.play('record'), 430);
      setTimeout(() => {
        if (app.juego === j && j.estado === 'ganado') mostrarFinGanada();
      }, 850);
      break;
    default:
      break;
  }
  actualizarMarcador();
}

function mostrarFinGanada() {
  const j = app.juego;
  if (!j) return;
  const fija = esDificultadFija(app.modo);
  const bestMs = fija ? guardado.best[app.modo] : 0;
  const notaRecord = !fija
    ? ''
    : app.record
      ? `<span class="record-tag">${t('newRecord')}</span>`
      : `<span>${t('yourRecord', { time: formatoTiempo(bestMs) })}</span>`;
  ponerOverlay(`<div class="panel fin">
    <header class="fin-cabeza">
      <p class="kicker">${nombreDificultad(app.modo)}</p>
      <h2 class="cifra superado">${t('youWon')}</h2>
    </header>
    <p class="nota">${t('clearedIn', { time: formatoTiempo(j.tiempoMs) })}${notaRecord ? `<br>${notaRecord}` : ''}</p>
    <div class="acciones">
      <button class="principal" type="button" data-accion="restart"><span>${t('again')}</span><kbd>R</kbd></button>
      <button type="button" data-accion="toMenu"><span>${t('menu')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('won');
  enfocarPrimero();
}

function mostrarFinPerdida() {
  const j = app.juego;
  if (!j) return;
  ponerOverlay(`<div class="panel fin">
    <header class="fin-cabeza">
      <p class="kicker">${nombreDificultad(app.modo)}</p>
      <h2 class="cifra derrota">${t('youLost')}</h2>
    </header>
    <p class="nota">${formatoTiempo(j.tiempoMs)} · ${t('minesExploded', { count: j.cfg.minas })}</p>
    <div class="acciones">
      <button class="principal" type="button" data-accion="restart"><span>${t('again')}</span><kbd>R</kbd></button>
      <button type="button" data-accion="toMenu"><span>${t('menu')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('dead');
  enfocarPrimero();
}

/* ------------------------------------------------------- perfil y ajustes */

function filaStat(idx, nombre, valor) {
  return filaHTML({ idx, nombre, derecha: valor, stat: true });
}

function mostrarPerfil() {
  app.juego = null;
  const s = guardado.stats;
  const tasa = s.games > 0 ? `${Math.round((s.wins / s.games) * 100)}%` : '—';
  const tiempo = (id) => (guardado.best[id] > 0 ? formatoTiempo(guardado.best[id]) : '—');
  const filas = [
    filaStat(0, t('statsGames'), String(s.games)),
    filaStat(1, t('statsWins'), String(s.wins)),
    filaStat(2, t('statsWinRate'), tasa),
    filaStat(3, t('statsBestStreak'), String(s.bestStreak)),
  ].join('');
  const records = [
    filaStat(5, t('statsBeginner'), tiempo('beginner')),
    filaStat(6, t('statsIntermediate'), tiempo('intermediate')),
    filaStat(7, t('statsExpert'), tiempo('expert')),
  ].join('');
  const peligro = filaHTML({
    accion: 'resetProgress',
    idx: 8,
    nombre: t('resetProgress'),
    detalle: t('resetProgressTag'),
    derecha: '⌫',
    peligro: true,
  });
  ponerOverlay(`<div class="panel">
    ${cabeceraPanel(t('profileTitle'), botonVolver())}
    <div class="filas">${filas}</div>
    <p class="grupo">${t('record')}</p>
    <div class="filas">${records}</div>
    <div class="filas">${peligro}</div>
  </div>`);
  pantalla('profile');
  enfocarPrimero();
}

function mostrarConfirmacionBorrado() {
  ponerOverlay(`<div class="panel fin">
    <header class="fin-cabeza">
      <p class="kicker">${t('confirmResetTitle')}</p>
      <h2 class="cifra derrota" style="font-size:clamp(22px,5vw,34px)">${t('confirmResetYes')}</h2>
    </header>
    <p class="nota">${t('confirmResetBody')}</p>
    <div class="acciones">
      <button type="button" data-accion="confirmResetWipe"><span>${t('confirmResetYes')}</span></button>
      <button class="principal" type="button" data-accion="cancelReset"><span>${t('cancel')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('reset');
  enfocarPrimero();
}

function borrarTodo() {
  try {
    localStorage.removeItem(CLAVE);
  } catch (err) {
    /* sin almacenamiento da igual */
  }
  const limpio = nuevoRegistro();
  guardado.best = limpio.best;
  guardado.stats = limpio.stats;
  guardado.sound = limpio.sound;
  guardado.trama = limpio.trama;
  guardado.custom = limpio.custom;
  aplicarSonido();
  document.documentElement.classList.toggle('trama', guardado.trama);
  guardar();
  mostrarPerfil();
  el.hint.textContent = t('resetDone');
}

function mostrarAjustes() {
  const sonido = guardado.sound ? t('soundOn') : t('soundOff');
  const trama = guardado.trama ? t('on') : t('off');
  const filas = [
    filaHTML({ accion: 'toggleSound', idx: 0, nombre: t('settingSound'), detalle: 'M', derecha: sonido }),
    filaHTML({ accion: 'toggleTrama', idx: 1, nombre: t('settingTrama'), detalle: t('settingTramaTag'), derecha: trama }),
  ].join('');
  ponerOverlay(`<div class="panel">
    ${cabeceraPanel(t('settingsTitle'), botonVolver())}
    <nav class="filas">${filas}</nav>
  </div>`);
  pantalla('settings');
  enfocarPrimero();
}

function mostrarAyuda() {
  app.juego = app.pantalla === 'playing' ? app.juego : null;
  const reglas = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5']
    .map((clave) => `<li>${t(clave)}</li>`)
    .join('');
  const controles = [
    ['↑↓←→ / WASD', t('ctrlMove')],
    ['Espacio / Enter', t('ctrlReveal')],
    ['F', t('ctrlFlag')],
    ['X', t('ctrlChord')],
    ['R', t('ctrlRestart')],
    ['P / Esc', t('ctrlPause')],
    ['M', t('ctrlMute')],
  ].map(([tecla, desc]) => `<tr><th>${tecla}</th><td>${desc}</td></tr>`).join('');
  ponerOverlay(`<div class="panel ayuda">
    ${cabeceraPanel(t('helpTitle'), botonVolver())}
    <h2>${t('rulesTitle')}</h2>
    <ul class="reglas">${reglas}</ul>
    <h2>${t('controlsTitle')}</h2>
    <table class="tabla"><tbody>${controles}</tbody></table>
    <p class="nota">${t('ctrlMouse')}</p>
    <p class="nota">${t('ctrlTouch')}</p>
  </div>`);
  pantalla('help');
  enfocarPrimero();
}

/* ------------------------------------------------------- ejecutar botones */

function ejecutar(nombre) {
  audio.unlock();
  if (!nombre) return;
  if (nombre.startsWith('play:')) {
    empezarPartida(nombre.slice(5));
    return;
  }
  switch (nombre) {
    case 'play': mostrarDificultades(); return;
    case 'profile': mostrarPerfil(); return;
    case 'help': mostrarAyuda(); return;
    case 'settings': mostrarAjustes(); return;
    case 'playCustom': mostrarPersonalizada(); return;
    case 'customStart': empezarPartida('custom'); return;
    case 'resume': reanudar(); return;
    case 'restart': reiniciarPartida(); return;
    case 'toMenu': mostrarPortada(); return;
    case 'toggleSound':
      guardado.sound = !guardado.sound;
      aplicarSonido();
      guardar();
      mostrarAjustes();
      audio.play('ui');
      return;
    case 'toggleTrama':
      guardado.trama = !guardado.trama;
      document.documentElement.classList.toggle('trama', guardado.trama);
      guardar();
      mostrarAjustes();
      audio.play('ui');
      return;
    case 'back': volverAtras(); return;
    case 'resetProgress': mostrarConfirmacionBorrado(); return;
    case 'confirmResetWipe': borrarTodo(); return;
    case 'cancelReset': mostrarPerfil(); return;
    default: return;
  }
}

function fijarScroll(paso) {
  el.overlay.scrollTop += paso * 72;
}

function ajustarPasoFocused(delta) {
  if (app.pantalla !== 'custom') return;
  const filas = filasDelOverlay();
  const nodo = filas[focoIndice];
  if (!nodo) return;
  const campo = nodo.getAttribute('data-campo');
  if (campo) pasoPersonalizado(campo, delta);
}

function volverAtras() {
  switch (app.pantalla) {
    case 'paused': reanudar(); return;
    case 'modes': mostrarPortada(); return;
    case 'custom': mostrarDificultades(); return;
    case 'profile':
    case 'help':
    case 'settings':
      mostrarPortada();
      return;
    case 'reset': mostrarPerfil(); return;
    case 'dead':
    case 'won':
      mostrarPortada();
      return;
    default: return;
  }
}

/* ---------------------------------------------------------------- teclado */

function accion(nombre, repetido = false, datos) {
  if (nombre === 'mute') {
    guardado.sound = !guardado.sound;
    aplicarSonido();
    guardar();
    if (app.pantalla === 'settings') mostrarAjustes();
    return;
  }

  audio.unlock();

  if (nombre === 'scrollUp') { fijarScroll(-1); return; }
  if (nombre === 'scrollDown') { fijarScroll(1); return; }
  if (nombre === 'scrollTop') { el.overlay.scrollTop = 0; return; }
  if (nombre === 'scrollBottom') { el.overlay.scrollTop = el.overlay.scrollHeight; return; }
  if (nombre === 'padConectado') return;

  const j = app.juego;

  if (app.pantalla === 'playing') {
    if (!j) return;
    switch (nombre) {
      case 'up': j.moverCursor(0, -1); return;
      case 'down': j.moverCursor(0, 1); return;
      case 'left': j.moverCursor(-1, 0); return;
      case 'right': j.moverCursor(1, 0); return;
      case 'confirm':
        if (datos && datos.puntero) {
          if (app.flagMode) j.alternarBanderaEn(datos.x, datos.y);
          else j.pulsar(datos.x, datos.y);
        } else {
          j.confirmarCursor();
        }
        actualizarMarcador();
        return;
      case 'flag':
        if (datos && datos.puntero) j.alternarBanderaEn(datos.x, datos.y);
        else j.alternarBanderaCursor();
        actualizarMarcador();
        return;
      case 'chord':
        if (datos && datos.puntero) j.acordeEn(datos.x, datos.y);
        else j.acordeCursor();
        actualizarMarcador();
        return;
      case 'restart': reiniciarPartida(); return;
      case 'pause':
      case 'back': pausarJuego(); return;
      case 'help': return;
      default: return;
    }
  }

  // menús y paneles
  switch (nombre) {
    case 'up': moverFoco(-1); return;
    case 'down': moverFoco(1); return;
    case 'left': ajustarPasoFocused(-1); return;
    case 'right': ajustarPasoFocused(1); return;
    case 'confirm': activarFoco(); return;
    case 'restart':
      if (app.pantalla === 'dead' || app.pantalla === 'won') reiniciarPartida();
      return;
    case 'pause':
      if (app.pantalla === 'paused') reanudar();
      return;
    case 'back': volverAtras(); return;
    case 'help':
      if (app.pantalla === 'help') volverAtras();
      else if (app.pantalla === 'home') mostrarAyuda();
      return;
    default: return;
  }
}

/* ----------------------------------------------------------------- bucle */

let ultimoT = 0;

function renderJuego() {
  if (!el.lienzoCtx) el.lienzoCtx = el.canvas.getContext('2d');
  app.juego.draw(el.lienzoCtx, vista);
}

function bucle(t) {
  requestAnimationFrame(bucle);
  if (!ultimoT) ultimoT = t;
  const dt = Math.min(100, Math.max(0, t - ultimoT));
  ultimoT = t;
  pasoBarrido(dt);
  const j = app.juego;
  if (j) {
    j.update(dt);
    renderJuego();
    actualizarMarcador();
  }
}

/* ------------------------------------------------------------------ boot */

function aplicarSonido() {
  audio.enabled = guardado.sound;
  audio.set(guardado.sound);
}

function aplicarIdiomaBase() {
  const idioma = getLanguage();
  document.documentElement.lang = idioma;
  document.title = t('documentTitle');
  const meta = document.querySelector('#meta-description');
  if (meta) meta.setAttribute('content', t('description'));
  document.querySelectorAll('[data-i18n]').forEach((nodo) => {
    nodo.textContent = t(nodo.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((nodo) => {
    nodo.setAttribute('aria-label', t(nodo.getAttribute('data-i18n-aria')));
  });
}

const REPINTAR = {
  home: mostrarPortada,
  modes: mostrarDificultades,
  custom: () => mostrarPersonalizada(),
  profile: mostrarPerfil,
  help: mostrarAyuda,
  settings: mostrarAjustes,
  reset: mostrarConfirmacionBorrado,
  paused: pausarJuego,
  dead: mostrarFinPerdida,
  won: mostrarFinGanada,
  playing: () => actualizarPista(),
};

function cambiarIdioma() {
  setLanguage(el.langSwitch.value);
  aplicarIdiomaBase();
  const repintar = REPINTAR[app.pantalla];
  if (repintar) repintar();
  actualizarMarcador();
}

function arrancar() {
  if (!comprobarPiezas()) return;

  document.documentElement.classList.toggle('trama', guardado.trama);
  aplicarSonido();
  aplicarIdiomaBase();

  el.langSwitch.value = getLanguage();
  el.langSwitch.addEventListener('change', cambiarIdioma);

  registrarConversorPunto(conversorDePuntos);
  attachInput({ stage: el.stage, actions: (nombre, repetido, datos) => accion(nombre, repetido, datos) });

  el.overlay.addEventListener('click', (evento) => {
    const paso = evento.target && evento.target.closest ? evento.target.closest('[data-paso]') : null;
    if (paso) {
      const [campo, delta] = paso.getAttribute('data-paso').split(':');
      pasoPersonalizado(campo, Number(delta));
      return;
    }
    const boton = evento.target && evento.target.closest ? evento.target.closest('[data-accion]') : null;
    if (boton) ejecutar(boton.getAttribute('data-accion'));
  });

  el.canvas.addEventListener('pointermove', (evento) => {
    const j = app.juego;
    if (!j) return;
    j.cursorVisible = false;
    j.hover = conversorDePuntos(evento.clientX, evento.clientY);
  });
  el.canvas.addEventListener('pointerleave', () => {
    const j = app.juego;
    if (j) j.hover = null;
  });

  el.flagToggle.addEventListener('click', () => {
    app.flagMode = !app.flagMode;
    el.flagToggle.classList.toggle('activo', app.flagMode);
    el.flagToggle.setAttribute('aria-pressed', String(app.flagMode));
    audio.play('ui');
  });

  if (esTactil() && el.avisoFoco) {
    el.avisoFoco.hidden = false;
    el.stage.addEventListener('pointerdown', () => {
      el.avisoFoco.hidden = true;
    }, { once: true });
  }

  if (window.ResizeObserver) {
    try {
      new ResizeObserver(() => {
        ajustarLienzo();
        ajustarBarrido();
      }).observe(el.stage);
    } catch (err) {
      window.addEventListener('resize', () => {
        ajustarLienzo();
        ajustarBarrido();
      });
    }
  } else {
    window.addEventListener('resize', () => {
      ajustarLienzo();
      ajustarBarrido();
    });
  }
  window.addEventListener('orientationchange', () => setTimeout(ajustarLienzo, 140));

  ajustarBarrido();
  mostrarPortada();
  requestAnimationFrame(bucle);
  if (typeof window.__minesweeperArrancado === 'function') window.__minesweeperArrancado();
}

try {
  arrancar();
} catch (err) {
  avisar('error al arrancar: ' + (err && err.message ? err.message : err));
  throw err;
}

if (location.hash === '#debug') {
  window.__minesweeper = {
    app,
    guardado,
    accion,
    ejecutar,
    empezarPartida,
    mostrarPortada,
    mostrarDificultades,
    mostrarFinGanada,
    mostrarFinPerdida,
  };
}
})(modulos['main']);
})();
