/* minesweeper — un solo fichero, sin módulos. generado por tools/build.mjs (2026-11-11 · v6).
   no lo edites a mano: cambia js/*.js y vuelve a ejecutar node tools/build.mjs */
(function () {
'use strict';
const modulos = { board: {}, presets: {}, audio: {}, input: {}, engine: {}, i18n: {}, campaign: {}, main: {} };

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

  // al perder, destapa el tablero entero: la partida ha terminado y el
  // campo queda a la vista, como un mapa que ya no sirve a nadie.
  // de paso anota cuántas casillas seguras destapó el jugador.
  revelarTodo() {
    this.despejadasPorJugador = this.celdas.filter((c) => c.revelada && !c.mina).length;
    for (const celda of this.celdas) {
      celda.revelada = true;
    }
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
// Sonido sintetizado en tiempo real para los efectos; la victoria y la
// derrota llevan su propia pieza (Win.mp3 / Death.mp3, en la raíz del repo).

let ctx = null;
let master = null;
let musicGain = null;
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
    musicGain = ctx.createGain();
    musicGain.gain.value = 1.5; // las piezas llegan bajas del archivo: aquí se equilibran

    musicGain.connect(master);
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

const MUSICA = {
  win: 'Win.mp3',
  death: 'Death.mp3',
};

const buffersMusica = new Map();
let actual = null; // { src, gan, nombre }
let generacion = 0;

function cargarMusica(nombre) {
  if (buffersMusica.has(nombre)) return buffersMusica.get(nombre);
  const c = build();
  const promesa = fetch(MUSICA[nombre])
    .then((r) => {
      if (!r.ok) throw new Error(`audio ${r.status}`);
      return r.arrayBuffer();
    })
    .then((ab) => c.decodeAudioData(ab));
  buffersMusica.set(nombre, promesa);
  promesa.catch(() => buffersMusica.delete(nombre));
  return promesa;
}

function detenerMusicaActual(fade = 0.35) {
  generacion += 1; // invalida cualquier carga en vuelo
  const c = ctx;
  const corriente = actual;
  actual = null;
  if (!c || !corriente) return;
  const { src, gan } = corriente;
  try {
    const t = c.currentTime;
    gan.gain.cancelScheduledValues(t);
    gan.gain.setValueAtTime(Math.max(0.0001, gan.gain.value), t);
    gan.gain.setTargetAtTime(0.0001, t, fade / 3);
    src.stop(t + fade + 0.1);
  } catch (err) {
    try { src.stop(); } catch (err2) { /* silencio */ }
  }
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

  // fanfarria de victoria o derrota: entra con fade, sale al siguiente paso
  musica(nombre, retardoMs = 0) {
    if (!this.enabled || !MUSICA[nombre]) return;
    const c = build();
    if (!c) return;
    detenerMusicaActual(0.3);
    const gen = generacion;
    cargarMusica(nombre).then((buf) => {
      if (gen !== generacion || !this.enabled) return; // se pidió otra cosa entretanto
      const gan = c.createGain();
      gan.gain.setValueAtTime(0.0001, c.currentTime);
      gan.gain.exponentialRampToValueAtTime(1, c.currentTime + 0.45);
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(gan).connect(musicGain);
      src.addEventListener('ended', () => {
        if (actual && actual.src === src) actual = null;
      });
      src.start(c.currentTime + Math.max(0, retardoMs) / 1000);
      actual = { src, gan, nombre };
    }).catch(() => {
      /* sin música no se rompe nada */
    });
  },

  // transición fuera de la fanfarria: al empezar una partida o volver al menú
  pararMusica(fade = 0.35) {
    detenerMusicaActual(fade);
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
// la monoespaciada de la casa (var(--mono) en styles.css)
const FUENTE_MONO = 'ui-monospace, "SFMono-Regular", "SF Mono", "Roboto Mono", Menlo, Consolas, monospace';

// números: el color clásico del buscaminas sobre la tinta, planos, en la
// monoespaciada de la casa — sin halos
const COLORES_NUMERO = ['', '#4aa3ff', '#35d07f', '#ff4d4d', '#8f7bff', '#ff7a1f', '#22c8c8', '#ffd60a', '#f2f2f2'];
const COLOR_NUMERO = (n) => COLORES_NUMERO[clamp(n, 1, 8)] || ACENTO;

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
      this.tablero.revelarTodo(); // el campo queda al descubierto
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
    // bloque plano: la rejilla la marcan los huecos negros, como en snake
    const ix = X + gap;
    const iy = Y + gap;
    const w = lado - gap * 2;
    ctx.fillStyle = hover ? '#1d1d1d' : '#111111';
    ctx.fillRect(ix, iy, w, w);
  }

  _celdaAbierta(ctx, X, Y, lado, gap, celda, i, forzada = false) {
    ctx.fillStyle = '#070707';
    ctx.fillRect(X + gap, Y + gap, lado - gap * 2, lado - gap * 2);

    if (celda.mina) {
      this._mina(ctx, X, Y, lado, '#f2f2f2');
      return;
    }
    const n = celda.adj;
    if (n > 0) {
      const fuente = Math.round(lado * 0.58);
      ctx.fillStyle = COLOR_NUMERO(n);
      ctx.font = `700 ${fuente}px ${FUENTE_MONO}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(n), X + lado / 2, Y + lado / 2 + Math.round(lado * 0.05));
    }
  }

  _mina(ctx, X, Y, lado, color) {
    const u = Math.max(1, Math.round(lado / 16)); // unidad base de la mina
    const cx = X + lado / 2;
    const cy = Y + lado / 2;
    const tono = color === '#000' ? '#000' : null; // cuerpo plano cuando se pinta sobre rojo
    // halo de profundidad bajo el cuerpo
    ctx.fillStyle = tono || 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(cx - 4 * u), Math.round(cy - 2 * u) + 1, 8 * u, 5 * u);
    // cuerpo: bloque grueso con cruz ampliada
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx - 3 * u), Math.round(cy - 3 * u), 6 * u, 6 * u);
    ctx.fillRect(Math.round(cx - 4 * u), Math.round(cy - 2 * u), 8 * u, 4 * u);
    ctx.fillRect(Math.round(cx - 2 * u), Math.round(cy - 4 * u), 4 * u, 8 * u);
    // púas cardinales, más anchas que un píxel de bloque
    ctx.fillRect(Math.round(cx - u), Math.round(cy - 6 * u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx - u), Math.round(cy + 4 * u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx - 6 * u), Math.round(cy - u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx + 4 * u), Math.round(cy - u), 2 * u, 2 * u);
    // púas diagonales
    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy - 5 * u), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx + 4 * u) - (u >> 1), Math.round(cy - 5 * u), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy + 4 * u) - (u >> 1), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx + 4 * u) - (u >> 1), Math.round(cy + 4 * u) - (u >> 1), u + (u >> 1), u + (u >> 1));
    if (!tono) {
      // destello especular arriba-izquierda y sombra abajo-derecha
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(Math.round(cx - 2 * u), Math.round(cy - 2 * u), 2 * u, u);
      ctx.fillRect(Math.round(cx - 3 * u), Math.round(cy - u), u, u);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(Math.round(cx + u), Math.round(cy + u), 2 * u, 2 * u);
    }
  }

  _bandera(ctx, X, Y, lado, escala = 1) {
    if (escala <= 0.02) return;
    const u = Math.max(1, Math.round(lado / 16));
    const cx = Math.round(X + lado / 2);
    const base = Math.round(Y + lado - 3 * u);
    const cima = Math.round(Y + 3.5 * u);
    ctx.save();
    if (escala < 1) {
      ctx.translate(cx, (base + cima) / 2);
      ctx.scale(escala, escala);
      ctx.translate(-cx, -(base + cima) / 2);
    }
    // asta: cuerpo claro con filo de sombra a la derecha
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(cx - u, cima, 2 * u, base - cima);
    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(cx + u - 1, cima, 1, base - cima);
    // remate del asta
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cx - u, cima - u, 2 * u, u);
    // paño rojo con pliegue y luz: tres tramos escalonados hacia el asta
    const px = cx + u; // el paño cuelga a la derecha del asta
    ctx.fillStyle = ACENTO;
    ctx.fillRect(px, cima + u, 5 * u, u);
    ctx.fillRect(px, cima + 2 * u, 6 * u, u);
    ctx.fillRect(px, cima + 3 * u, 5 * u, u);
    // luz del paño
    ctx.fillStyle = '#ff7a7a';
    ctx.fillRect(px, cima + u, 5 * u, 1);
    ctx.fillRect(px, cima + 2 * u, 6 * u, 1);
    // pliegue en sombra
    ctx.fillStyle = '#a31212';
    ctx.fillRect(px, cima + 3 * u, 5 * u, 1);
    ctx.fillRect(px + 4 * u, cima + 2 * u, 2 * u, u);
    // muesca de golondrina en el vuelo del paño
    ctx.fillStyle = '#070707';
    ctx.fillRect(px + 5 * u, cima + 2 * u, u, u);
    // base del asta: zócalo claro con sombra
    ctx.fillStyle = '#d8d8d8';
    ctx.fillRect(cx - 3 * u, base, 6 * u, u);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(cx - 3 * u, base + u - 1, 6 * u, 1);
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
    description: 'Buscaminas de bloques en blanco y negro: la historia de un recluta en treinta campos minados. Tres dificultades, banderas y récords locales.',
    language: 'Idioma',
    brandTagline: 'treinta campos entre tú y tu casa.',
    sound: 'sonido',
    soundOn: 'activado',
    soundOff: 'silenciado',
    board: 'tablero',
    flag: 'bandera',
    flagMode: 'poner banderas al tocar',
    startSignal: 'despeja el campo',
    focusHint: 'toca el tablero para despertar el teclado',
    fatalTitle: 'el juego no ha arrancado',
    fatalReload: 'recargar limpio',
    noScript: 'este juego necesita su motor en marcha.',
    missingPieces: 'faltan piezas del tablero ({pieces}). vuelve a barajar.',
    // portada
    play: 'jugar',
    playTag: 'tres dificultades y una personalizada',
    profile: 'perfil',
    profileTag: 'récords, partidas y tasa de victorias',
    help: 'ayuda',
    settings: 'ajustes',
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
    hintCampaign: 'elige nivel · ↵ ve la historia · Esc vuelve',
    hintStory: '↵ marchar · Esc vuelve',
    // campaña · la treinta
    campaign: 'campaña',
    campaignTag: 'la treinta · una historia en treinta campos',
    campaignLocked: 'cierra primero el nivel anterior',
    campaignCleared: 'nivel despejado',
    campaignNext: 'siguiente capítulo',
    campaignHud: 'nivel {n} · {name}',
    campaignTagShort: 'op. treinta',
    campaignPrologue: 'la guerra empezó lejos y despacio. ahora ha llamado a tu puerta: una carta con tu nombre y un número de expediente. nadie recuerda haberse ofrecido. nadie pregunta. treinta campos te separan de la vuelta a casa; esta es la historia de los que caminaron antes que tú.',
    actLabel: 'acto {n} · {name}',
    levelCell: 'nivel {n}',
    descend: 'marchar',
    storyDossier: 'exp. nº 0042-a',
    casualtyTag: 'baja',
    statTime: 'tiempo',
    statCleared: 'despejadas',
    statBest: 'mejor',
    statMines: 'minas',
    campaignHere: 'tu posición en la operación',
    campaignComplete: 'operación completada. descanse el que la cruzó.',
    descendAgain: 'volver a marchar',
    epilogueKicker: 'el final del campo',
    epilogueTitle: 'has vuelto.',
    epilogueText: 'el último campo es el más silencioso. nadie aplaude; alguien anota tu nombre en un parte que nadie leerá. en algún sitio suena un tren, y esta vez es para ti. treinta campos quedan atrás; una parte de ti se queda en ellos. bienvenido a casa.',
    epilogueCta: 'volver a la puerta',
    statsCampaign: 'campaña',
    statsCampaignTag: 'niveles despejados',
    preview: 'vista previa',
    previewNote: 'jugando: nivel {n} · {name}',
    // ayuda completa
    modesTitle: 'modos',
    modeRule1: 'jugar: principiante, intermedio, experto y una personalizada. las tres fijas guardan su récord.',
    modeRule2: 'campaña · la treinta: una historia en treinta campos minados, del alistamiento a la vuelta. completar uno abre el siguiente.',
    modeRule3: 'cada nivel cuenta una línea del relato. el perfil guarda tu mejor tiempo en cada uno y cuenta tus victorias y rachas.',
    campaignRulesTitle: 'la treinta',
    campaignRule1: 'avanza acto a acto: el alistamiento, el frente, la operación y el final del campo. de seis por seis a veinticuatro por treinta.',
    campaignRule2: 'completar un nivel abre el siguiente; no hay estrellas, sólo tu mejor tiempo en cada casilla.',
    campaignRule3: 'te reclutaron y marchaste. en cada nivel hay una línea del relato; léetela antes de picar.',
    ctrlNavigate: 'moverse por los menús y ajustar los pasos',
    ctrlHelp: 'abrir y cerrar la ayuda',
    ctrlScroll: 'desplazar los paneles largos',
    ctrlConfirm: 'confirmar, destapar, activar',
    routePlay: 'jugar',
    routeCampaign: 'campaña',
    routeHelp: 'ayuda',
    routeSettings: 'ajustes',
    routeProfile: 'perfil',
    routeBeginner: 'principiante',
    routeIntermediate: 'intermedio',
    routeExpert: 'experto',
    routeCustom: 'personalizada',
  },
  en: {
    documentTitle: 'Minesweeper',
    description: 'A black-and-white block minesweeper: the story of a conscript across thirty mined fields. Three difficulties, flags and local records.',
    language: 'Language',
    brandTagline: 'thirty fields between you and home.',
    sound: 'sound',
    soundOn: 'on',
    soundOff: 'muted',
    board: 'board',
    flag: 'flag',
    flagMode: 'tap to place flags',
    startSignal: 'clear the field',
    focusHint: 'tap the board to wake the keyboard',
    fatalTitle: 'the game did not boot',
    fatalReload: 'reload clean',
    noScript: 'this game needs its engine running.',
    missingPieces: 'board pieces are missing ({pieces}). reload.',
    // home
    play: 'play',
    playTag: 'three difficulties and a custom board',
    profile: 'profile',
    profileTag: 'records, games and win rate',
    help: 'help',
    settings: 'settings',
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
    hintCampaign: 'pick a level · ↵ reads the story · Esc goes back',
    hintStory: '↵ march · Esc goes back',
    // campaign · the thirty
    campaign: 'campaign',
    campaignTag: 'the thirty · a story in thirty fields',
    campaignLocked: 'beat the previous level first',
    campaignCleared: 'level cleared',
    campaignNext: 'next chapter',
    campaignHud: 'level {n} · {name}',
    campaignTagShort: 'op. thirty',
    campaignPrologue: 'the war began far away and slowly. now it has knocked on your door: a letter with your name and a file number. nobody remembers volunteering. nobody asks. thirty fields stand between you and home; this is the story of those who walked before you.',
    actLabel: 'act {n} · {name}',
    levelCell: 'level {n}',
    descend: 'march',
    storyDossier: 'file № 0042-a',
    casualtyTag: 'casualty',
    statTime: 'time',
    statCleared: 'cleared',
    statBest: 'best',
    statMines: 'mines',
    campaignHere: 'your position in the operation',
    campaignComplete: 'operation complete. rest to those who crossed it.',
    descendAgain: 'march again',
    epilogueKicker: 'the end of the field',
    epilogueTitle: 'you made it home.',
    epilogueText: 'the last field is the quietest. nobody applauds; someone writes your name in a report nobody will read. somewhere a train sounds, and this time it is for you. thirty fields lie behind you; a part of you stays in them. welcome home.',
    epilogueCta: 'back to the doorway',
    statsCampaign: 'campaign',
    statsCampaignTag: 'levels cleared',
    preview: 'preview',
    previewNote: 'playing: level {n} · {name}',
    // full help
    modesTitle: 'modes',
    modeRule1: 'play: beginner, intermediate, expert and a custom board. the three fixed ones keep their records.',
    modeRule2: 'campaign · the thirty: a story in thirty mined fields, from enlistment to homecoming. clearing one opens the next.',
    modeRule3: 'each level tells one line of the tale. the profile keeps your best time on each and counts your wins and streaks.',
    campaignRulesTitle: 'the thirty',
    campaignRule1: 'advance act by act: enlistment, the front, the operation and the end of the field — from six by six to twenty-four by thirty.',
    campaignRule2: 'clearing a level unlocks the next one; no stars, just your best time on every tile.',
    campaignRule3: 'you were recruited and you marched. each level holds a line of the story; read it before you dig.',
    ctrlNavigate: 'move through menus and adjust steps',
    ctrlHelp: 'open and close help',
    ctrlScroll: 'scroll the long panels',
    ctrlConfirm: 'confirm, reveal, activate',
    routePlay: 'play',
    routeCampaign: 'campaign',
    routeHelp: 'help',
    routeSettings: 'settings',
    routeProfile: 'profile',
    routeBeginner: 'beginner',
    routeIntermediate: 'intermediate',
    routeExpert: 'expert',
    routeCustom: 'custom',
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

function routeSlug(name) {
  const key = `route${name[0].toUpperCase()}${name.slice(1)}`;
  return t(key);
}

function routeWords() {
  return {
    play: [STRINGS.es.routePlay, STRINGS.en.routePlay],
    campaign: [STRINGS.es.routeCampaign, STRINGS.en.routeCampaign],
    help: [STRINGS.es.routeHelp, STRINGS.en.routeHelp],
    settings: [STRINGS.es.routeSettings, STRINGS.en.routeSettings],
    profile: [STRINGS.es.routeProfile, STRINGS.en.routeProfile],
    beginner: [STRINGS.es.routeBeginner, STRINGS.en.routeBeginner],
    intermediate: [STRINGS.es.routeIntermediate, STRINGS.en.routeIntermediate],
    expert: [STRINGS.es.routeExpert, STRINGS.en.routeExpert],
    custom: [STRINGS.es.routeCustom, STRINGS.en.routeCustom],
  };
}

  Object.assign(modulo, { getLanguage, setLanguage, t, unitMinas, __testClaves, routeSlug, routeWords });
})(modulos['i18n']);

// ---- campaign ----
(function (modulo) {
'use strict';
// la treinta — el modo historia del juego.
// treinta campos minados en cuatro actos, con un solo relato lineal:
// la guerra llamó a tu puerta. nadie pregunta por qué. nadie se ofrece.
// cada nivel guarda una línea del avance; las citas van en ES y EN.
//
// los niveles fijan tamaño y minas; completar uno abre el siguiente.

const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'alistamiento', nombreEn: 'enlistment', subEs: 'la carta y el juramento', subEn: 'the letter and the oath' },
  { id: 2, inicio: 6, nombreEs: 'el frente', nombreEn: 'the front', subEs: 'la zona minada', subEn: 'the mined zone' },
  { id: 3, inicio: 12, nombreEs: 'la operación', nombreEn: 'the operation', subEs: 'operación puente', subEn: 'operation bridge' },
  { id: 4, inicio: 18, nombreEs: 'el final del campo', nombreEn: 'the end of the field', subEs: 'la vuelta', subEn: 'the way back' },
];

const NIVELES = [
  // acto I — alistamiento
  { act: 1, nombreEs: 'la carta', nombreEn: 'the letter', filas: 6, columnas: 6, minas: 6,
    historiaEs: 'La carta llega un martes. Tu nombre, un número de expediente y una hora. La guerra te ha elegido.',
    historiaEn: 'The letter arrives on a Tuesday. Your name, a file number and an hour. The war has picked you.' },
  { act: 1, nombreEs: 'el cuartel', nombreEn: 'the barracks', filas: 7, columnas: 7, minas: 9,
    historiaEs: 'El cuartel huele a lejía y a miedo nuevo. Firmas tu nombre mil veces, como si eso te hiciera dueño del fusil.',
    historiaEn: 'The barracks smells of bleach and fresh fear. You sign your name a thousand times, as if that made the rifle yours.' },
  { act: 1, nombreEs: 'la prueba', nombreEn: 'the test', filas: 8, columnas: 8, minas: 10,
    historiaEs: 'La prueba: cien hombres en fila y diez minutos para aprender otra manera de mirar el suelo.',
    historiaEn: 'The test: a hundred men in a row and ten minutes to learn another way of looking at the ground.' },
  { act: 1, nombreEs: 'el juramento', nombreEn: 'the oath', filas: 8, columnas: 8, minas: 14,
    historiaEs: 'Juráis sobre un campo de verdad. Prometéis volver, o que al menos lo cuenten.',
    historiaEn: 'You swear over a real field. You promise to return, or at least to be counted.' },
  { act: 1, nombreEs: 'el polígono', nombreEn: 'the range', filas: 9, columnas: 9, minas: 12,
    historiaEs: 'En el polígono todo es de verdad: la saliva, el temblor, las banderas.',
    historiaEn: 'At the range everything is real: the spit, the trembling, the flags.' },
  { act: 1, nombreEs: 'el ascenso', nombreEn: 'the commission', filas: 9, columnas: 9, minas: 16,
    historiaEs: 'Te ascienden a alférez por cumplir un trámite. El tren parte al amanecer.',
    historiaEn: 'You are commissioned for completing a formality. The train leaves at dawn.' },
  // acto II — el frente
  { act: 2, nombreEs: 'el convoy', nombreEn: 'the convoy', filas: 10, columnas: 10, minas: 18,
    historiaEs: 'Tres días de tren y un puente cortado. El enemigo vuela los puentes.',
    historiaEn: 'Three days of train and a cut bridge. The enemy blows the bridges.' },
  { act: 2, nombreEs: 'la zona', nombreEn: 'the zone', filas: 10, columnas: 10, minas: 22,
    historiaEs: 'Zona de operaciones. El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.',
    historiaEn: 'Operations zone. The sign says DO NOT STEP; underneath, someone wrote every name.' },
  { act: 2, nombreEs: 'los mapas', nombreEn: 'the maps', filas: 12, columnas: 12, minas: 26,
    historiaEs: 'Los mapas pertenecen a otra guerra: minas sin marcar, memoria de quien no pudo dibujarlas.',
    historiaEn: 'The maps belong to another war: unmarked mines, the memory of those who could not draw them.' },
  { act: 2, nombreEs: 'el sargento', nombreEn: 'the sergeant', filas: 12, columnas: 12, minas: 31,
    historiaEs: 'El sargento te mira como a un trapo viejo. Aquí se pisa con la cabeza, no con los pies.',
    historiaEn: 'The sergeant looks at you like an old rag. Here you step with your head, not your feet.' },
  { act: 2, nombreEs: 'el primer paso', nombreEn: 'the first step', filas: 14, columnas: 14, minas: 34,
    historiaEs: 'Das el primer paso fuera de la trinchera. El silencio pesa más que el acero.',
    historiaEn: 'You take the first step out of the trench. Silence weighs more than steel.' },
  { act: 2, nombreEs: 'la guardia', nombreEn: 'the watch', filas: 14, columnas: 14, minas: 40,
    historiaEs: 'La noche de guardia. Minas nuevas bajo la luna; alguien las siembra cada noche.',
    historiaEn: 'The night watch. New mines under the moon; someone lays them every night.' },
  // acto III — la operación
  { act: 3, nombreEs: 'el puente', nombreEn: 'the bridge', filas: 14, columnas: 14, minas: 44,
    historiaEs: 'Operación Puente: cruzar al otro lado. Dos campos, un vado y una radio muerta.',
    historiaEn: 'Operation Bridge: cross to the other side. Two fields, a ford and a dead radio.' },
  { act: 3, nombreEs: 'la brecha', nombreEn: 'the breach', filas: 16, columnas: 16, minas: 40,
    historiaEs: 'La brecha es una raya de luz en la hierba. Más allá, el campo enemigo.',
    historiaEn: 'The breach is a line of light in the grass. Beyond it, the enemy field.' },
  { act: 3, nombreEs: 'el silencio', nombreEn: 'the silence', filas: 16, columnas: 16, minas: 48,
    historiaEs: 'Seis minutos de silencio antes de que la artillería hable. Nadie traga.',
    historiaEn: 'Six minutes of silence before the guns speak. Nobody swallows.' },
  { act: 3, nombreEs: 'el asalto', nombreEn: 'the assault', filas: 16, columnas: 16, minas: 55,
    historiaEs: 'El asalto. Banderas, polvo y el mundo reducido a un metro cuadrado.',
    historiaEn: 'The assault. Flags, dust and the world reduced to one square metre.' },
  { act: 3, nombreEs: 'la retirada', nombreEn: 'the retreat', filas: 16, columnas: 16, minas: 61,
    historiaEs: 'Retirada. Un compañero se ha quedado dentro del campo. La guerra no espera.',
    historiaEn: 'Retreat. A comrade stayed inside the field. War does not wait.' },
  { act: 3, nombreEs: 'el recuento', nombreEn: 'the count', filas: 16, columnas: 16, minas: 66,
    historiaEs: 'El recuento: de cuarenta volvemos nueve. El parte dice «éxito».',
    historiaEn: "The count: of forty, nine return. The report says 'success'." },
  // acto IV — el final del campo
  { act: 4, nombreEs: 'el corredor', nombreEn: 'the corridor', filas: 16, columnas: 16, minas: 69,
    historiaEs: 'El corredor: la única ruta hasta el depósito enemigo. Un kilómetro de hierba y muerte.',
    historiaEn: 'The corridor: the only route to the enemy depot. A kilometre of grass and death.' },
  { act: 4, nombreEs: 'el búnker', nombreEn: 'the bunker', filas: 18, columnas: 18, minas: 72,
    historiaEs: 'Bajo el búnker, su sala de mandos. Minada por dentro. Deliberadamente.',
    historiaEn: 'Beneath the bunker, their command room. Mined from the inside. Deliberately.' },
  { act: 4, nombreEs: 'el documento', nombreEn: 'the document', filas: 16, columnas: 20, minas: 70,
    historiaEs: 'Un documento: tus órdenes, firmadas con tu nombre por una mano que no es la tuya.',
    historiaEn: 'A document: your orders, signed with your name by a hand that is not yours.' },
  { act: 4, nombreEs: 'la traición', nombreEn: 'the betrayal', filas: 20, columnas: 20, minas: 78,
    historiaEs: 'Nadie te envió. Esto era un castigo disfrazado de papeleo. Pero ya estás aquí.',
    historiaEn: 'Nobody sent you. This was a punishment dressed as paperwork. But you are here now.' },
  { act: 4, nombreEs: 'el último campo', nombreEn: 'the last field', filas: 18, columnas: 22, minas: 76,
    historiaEs: 'El telegrafista escucha tu clave por última vez. Que el silencio te sea propicio.',
    historiaEn: 'The radio operator hears your callsign for the last time. May the silence be kind to you.' },
  { act: 4, nombreEs: 'el desierto', nombreEn: 'the desert', filas: 22, columnas: 22, minas: 84,
    historiaEs: 'El calor rebota en la arena; cada paso es una conjetura.',
    historiaEn: 'The heat bounces off the sand; every step is a guess.' },
  { act: 4, nombreEs: 'la ciudad', nombreEn: 'the city', filas: 20, columnas: 24, minas: 88,
    historiaEs: 'La ciudad tomada. Mercado nuevo, olor a pólvora y pan fresco. Nadie te reconoce.',
    historiaEn: 'The city taken. A new market, the smell of gunpowder and fresh bread. Nobody recognises you.' },
  { act: 4, nombreEs: 'el almacén', nombreEn: 'the warehouse', filas: 22, columnas: 24, minas: 96,
    historiaEs: 'El almacén. Tu expediente, quemado por orden del mando. Tú sabes caminar.',
    historiaEn: 'The warehouse. Your file, burned by order of the command. You know how to walk.' },
  { act: 4, nombreEs: 'el expediente', nombreEn: 'the file', filas: 24, columnas: 24, minas: 104,
    historiaEs: 'El expediente sobre la mesa. El nombre tachado, el sello roto. Te deben el nombre.',
    historiaEn: 'The file on the table. The name struck through, the seal broken. They owe you your name.' },
  { act: 4, nombreEs: 'la vuelta', nombreEn: 'the way back', filas: 26, columnas: 24, minas: 112,
    historiaEs: 'El tren de vuelta. Los campos se alejan por la ventanilla. Nadie dice nada.',
    historiaEn: 'The train home. The fields slide past the window. Nobody says a word.' },
  { act: 4, nombreEs: 'la puerta', nombreEn: 'the doorway', filas: 26, columnas: 28, minas: 124,
    historiaEs: 'La puerta de casa. Dos golpes. Nadie responde. La abres tú.',
    historiaEn: 'The doorway of home. Two knocks. Nobody answers. You open it yourself.' },
  { act: 4, nombreEs: 'el final del campo', nombreEn: 'the end of the field', filas: 24, columnas: 30, minas: 132,
    historiaEs: 'Limpias el último campo porque no volverás a pisar otro. El campo termina; tú, no.',
    historiaEn: "You clear the last field because you will never tread on another. The field ends; you don't." },
];

function nivelCampana(indice) {
  return NIVELES[indice] || null;
}

function actoDe(indice) {
  const nivel = NIVELES[indice];
  return nivel ? ACTOS.find((a) => a.id === nivel.act) || null : null;
}

function nombreNivel(indice, idioma) {
  const nivel = NIVELES[indice];
  if (!nivel) return '';
  return idioma === 'en' ? nivel.nombreEn : nivel.nombreEs;
}

function historiaNivel(indice, idioma) {
  const nivel = NIVELES[indice];
  if (!nivel) return '';
  return idioma === 'en' ? nivel.historiaEn : nivel.historiaEs;
}

// configuración de motor para un nivel de campaña
function configNivel(indice) {
  const nivel = NIVELES[indice];
  if (!nivel) return null;
  return { filas: nivel.filas, columnas: nivel.columnas, minas: nivel.minas };
}

  Object.assign(modulo, { ACTOS, NIVELES, nivelCampana, actoDe, nombreNivel, historiaNivel, configNivel });
})(modulos['campaign']);

// ---- main ----
(function (modulo) {
'use strict';
const { Game } = modulos['engine'];
const { DIFICULTADES, DIFICULTAD_POR_DEFECTO, normalizarPersonalizada, dificultadPorId, esDificultadFija, limitesMinas } = modulos['presets'];
const { audio } = modulos['audio'];
const { attachInput, registrarConversorPunto } = modulos['input'];
const { t, getLanguage, setLanguage, unitMinas, routeSlug, routeWords } = modulos['i18n'];
const { NIVELES, ACTOS, configNivel, nivelCampana, actoDe } = modulos['campaign'];

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
const ACENTO_LOGO = '#ff2b2b';

function nuevoRegistro() {
  return {
    best: { beginner: 0, intermediate: 0, expert: 0 }, // ms; 0 = sin récord
    stats: { games: 0, wins: 0, streak: 0, bestStreak: 0 },
    sound: true,
    trama: true,
    custom: { filas: 9, columnas: 16, minas: 40 },
    campaign: { unlocked: 1, best: {} }, // unlocked: niveles alcanzables; best: ms por nivel
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
  const camp = bruto.campaign || {};
  if (camp && typeof camp === 'object') {
    const unlocked = Math.floor(Number(camp.unlocked));
    datos.campaign.unlocked = Number.isFinite(unlocked)
      ? Math.min(NIVELES.length, Math.max(1, unlocked))
      : 1;
    const mejores = camp.best && typeof camp.best === 'object' ? camp.best : {};
    for (const clave of Object.keys(mejores)) {
      const i = Number(clave);
      const valor = Math.floor(Number(mejores[clave]));
      if (Number.isInteger(i) && i >= 0 && i < NIVELES.length && Number.isFinite(valor) && valor > 0) {
        datos.campaign.best[i] = valor;
      }
    }
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
  nivel: null, // índice del nivel de campaña cuando modo === 'campaign'
  historia: null, // índice del nivel cuya historia se está contando
  record: false, // la última partida ganada fue récord
  flagMode: false,
  demo: null, // partida automática de fondo en la portada
  demoAcum: 0,
  hud: { meta: '', score: '', mult: '', best: '' },
};

const BASE_PATH = (typeof location !== 'undefined' && location.protocol === 'file:') ? './' : '/';
const RUTAS = { listas: false, restaurando: false };
const ALIAS_RUTA = routeWords();

const vista = { cell: 24, ox: 0, oy: 0, width: 480, height: 480, dpr: 1 };
const vistaDemo = { cell: 10, ox: 0, oy: 0, width: 232, height: 150, dpr: 2 };

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
  demoCtx: null,
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

function nombreNivel(indice) {
  const nivel = nivelCampana(indice);
  if (!nivel) return '';
  return getLanguage() === 'en' ? nivel.nombreEn : nivel.nombreEs;
}

function nombreActo(acto) {
  return getLanguage() === 'en' ? acto.nombreEn : acto.nombreEs;
}

function campañaHechos() {
  return Object.keys(guardado.campaign.best).length;
}

function campañaSiguiente() {
  for (let i = 0; i < NIVELES.length; i += 1) {
    if (!guardado.campaign.best[i]) return i;
  }
  return NIVELES.length - 1;
}

function esTactil() {
  return window.matchMedia('(pointer: coarse)').matches;
}

/* --------------------------------------------------------- overlay/pantallas */

const FOCO_SEL = '.row:not(.stat), .acciones button';
let focoIndice = -1;

function ponerOverlay(html, variante) {
  const esMuerte = Boolean(html) && variante === 'muerte';
  if (!esMuerte && huecoMuerte) {
    huecoMuerte = 0;
    el.stage.style.paddingBottom = '';
    ajustarLienzo();
  }
  el.overlay.classList.toggle('muerte', esMuerte);
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
  campaign: 'hintCampaign',
  story: 'hintStory',
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
  if (RUTAS.listas && !RUTAS.restaurando) sincronizarRuta(false);
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
  let meta;
  let bestTxt;
  if (app.modo === 'campaign') {
    meta = t('campaignHud', { n: dosDigitos((app.nivel || 0) + 1), name: nombreNivel(app.nivel || 0) });
    const bestNivel = guardado.campaign.best[app.nivel] || 0;
    bestTxt = bestNivel > 0 ? `${t('record')} ${formatoTiempo(bestNivel)}` : t('noRecord');
  } else {
    meta = nombreDificultad(app.modo);
    const bestMs = esDificultadFija(app.modo) ? guardado.best[app.modo] : 0;
    bestTxt = esDificultadFija(app.modo)
      ? (bestMs > 0 ? `${t('record')} ${formatoTiempo(bestMs)}` : t('noRecord'))
      : t('diffCustom');
  }
  escribirHud(meta, String(j.minasRestantes), formatoTiempo(j.tiempoMs), bestTxt);
}

/* -------------------------------------------------------- ajustar lienzo */

let huecoMuerte = 0; // alto reservado bajo el tablero en la pantalla de muerte

function ajustarLienzo() {
  const j = app.juego;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const banda = el.stage.getBoundingClientRect();
  const columnas = j ? j.columnas : 9;
  const filas = j ? j.filas : 9;
  const margen = 4;
  const availW = Math.max(80, banda.width - margen);
  const availH = Math.max(80, banda.height - margen - huecoMuerte);
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

/* --------------------------------------------------------- la demo */
// la portada juega sola tu siguiente nivel de la treinta:
// la mina se despeja sola mientras decides qué jugar

function nivelDemo() {
  return campañaSiguiente(); // primer nivel sin superar; el último campo si ya los tienes todos
}

function crearDemo() {
  el.demoCtx = null; // la portada puede haberse reconstruido: canvas nuevo
  const cfg = configNivel(nivelDemo());
  app.demo = new Game(cfg, () => {});
  app.demoAcum = 0;
  ajustarLienzoDemo();
  pintarTituloDemo();
}

function ajustarLienzoDemo() {
  const lienzo = document.getElementById('demo');
  const j = app.demo;
  if (!lienzo || !j) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cell = Math.max(4, Math.floor(232 / j.columnas));
  vistaDemo.cell = cell;
  vistaDemo.width = cell * j.columnas;
  vistaDemo.height = cell * j.filas;
  vistaDemo.ox = 0;
  vistaDemo.oy = 0;
  vistaDemo.dpr = dpr;
  lienzo.width = Math.round(vistaDemo.width * dpr);
  lienzo.height = Math.round(vistaDemo.height * dpr);
  lienzo.style.width = `${vistaDemo.width}px`;
  lienzo.style.height = `${vistaDemo.height}px`;
}

function pintarTituloDemo() {
  const titulo = document.getElementById('demo-titulo');
  const nota = document.getElementById('demo-nota');
  if (!titulo || !nota) return;
  const i = nivelDemo();
  titulo.textContent = t('preview');
  nota.textContent = t('previewNote', { n: dosDigitos(i + 1), name: nombreNivel(i) });
}

// elige la siguiente jugada: primero lo lógico seguro, luego frontera segura
function demoElegirJugada(j) {
  const t = j.tablero;
  if (!t.sembradas) {
    return { x: Math.floor(j.columnas / 2), y: Math.floor(j.filas / 2) };
  }
  const indice = (x, y) => y * j.columnas + x;
  const vecinos = (x, y, fn) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (!dx && !dy) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= j.columnas || ny >= j.filas) continue;
        fn(nx, ny);
      }
    }
  };
  for (let y = 0; y < j.filas; y += 1) {
    for (let x = 0; x < j.columnas; x += 1) {
      const c = t.celdas[indice(x, y)];
      if (!c.revelada || c.adj === 0) continue;
      const ocultas = [];
      let banderas = 0;
      vecinos(x, y, (nx, ny) => {
        const v = t.celdas[indice(nx, ny)];
        if (v.revelada) return;
        if (v.bandera) banderas += 1;
        else ocultas.push([nx, ny]);
      });
      if (!ocultas.length) continue;
      const restantes = c.adj - banderas;
      if (restantes === ocultas.length) return { bandera: true, x: ocultas[0][0], y: ocultas[0][1] };
      if (restantes === 0) return { x: ocultas[0][0], y: ocultas[0][1] };
    }
  }
  // sin jugada lógica: frontera segura (casillas cerradas no minadas junto a lo abierto)
  const frontera = [];
  const lejos = [];
  for (let y = 0; y < j.filas; y += 1) {
    for (let x = 0; x < j.columnas; x += 1) {
      const c = t.celdas[indice(x, y)];
      if (c.revelada || c.bandera || c.mina) continue;
      let tocaRevelada = false;
      vecinos(x, y, (nx, ny) => {
        if (t.celdas[indice(nx, ny)].revelada) tocaRevelada = true;
      });
      (tocaRevelada ? frontera : lejos).push([x, y]);
    }
  }
  const candidatas = frontera.length ? frontera : lejos;
  if (!candidatas.length) return null; // tablero resuelto o imposible: renacer
  return ((pick) => ({ x: pick[0], y: pick[1] }))(candidatas[Math.floor(Math.random() * candidatas.length)]);
}

function demoJugarUnPaso(j) {
  if (j.terminada) {
    crearDemo();
    return;
  }
  const jugada = demoElegirJugada(j);
  if (!jugada) {
    crearDemo();
    return;
  }
  if (jugada.bandera) j.alternarBanderaEn(jugada.x, jugada.y);
  else j.pulsar(jugada.x, jugada.y);
}

function renderDemo() {
  const lienzo = document.getElementById('demo');
  const j = app.demo;
  if (!lienzo || !j) return;
  if (!el.demoCtx) el.demoCtx = lienzo.getContext('2d');
  j.draw(el.demoCtx, vistaDemo);
}
/* ------------------------------------------------------------ pantallas */

function filaHTML({ accion = null, campo = null, idx, nombre, detalle = '', derecha = '', peligro = false, stat = false, dim = false, acento = false, titulo = '' }) {
  const clases = ['row'];
  if (peligro) clases.push('peligro');
  if (stat) clases.push('stat');
  if (dim) clases.push('dim');
  if (acento) clases.push('acento');
  const attrs = ['type="button"', `class="${clases.join(' ')}"`];
  if (accion) attrs.push(`data-accion="${accion}"`);
  if (campo) attrs.push(`data-campo="${campo}"`);
  if (titulo) attrs.push(`title="${titulo}"`);
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
  audio.pararMusica(0.4); // transición: adiós a la fanfarria
  app.juego = null;
  app.contado = false;
  const hechos = campañaHechos();
  const filas = [
    filaHTML({ accion: 'play', idx: 0, nombre: t('play'), detalle: t('playTag'), derecha: '↵' }),
    filaHTML({ accion: 'campaign', idx: 1, nombre: t('campaign'), detalle: t('campaignTag'), derecha: `${dosDigitos(hechos)}/30` }),
    filaHTML({ accion: 'profile', idx: 2, nombre: t('profile'), detalle: t('profileTag') }),
  ].join('');
  ponerOverlay(`<div class="panel inicio portada">
    <div class="inicio-texto">
      <header class="inicio-cabeza">
        <canvas id="logo-mine" class="logo-canvas" width="440" height="180" role="img" aria-label="minesweeper."></canvas>
        <p class="tagline">${t('brandTagline')}</p>
      </header>
      <nav class="filas" aria-label="${t('menuAria')}">${filas}</nav>
      <p class="pie">
        <span>minesweeper · v1</span>
        <button class="link" type="button" data-accion="help">${t('help')}</button>
        <button class="link" type="button" data-accion="settings">${t('settings')}</button>
      </p>
    </div>
    <aside class="inicio-demo">
      <p class="kicker" id="demo-titulo">${t('preview')}</p>
      <canvas id="demo" aria-label="${t('preview')}"></canvas>
      <p class="nota" id="demo-nota"></p>
    </aside>
  </div>`);
  escribirHud('—', '—', '', '');
  pantalla('home');
  pintarLienzoVacio();
  const logo = document.getElementById('logo-mine');
  if (logo) dibujarLogo(logo);
  crearDemo();
  enfocarPrimero();
}

// logotipo «minesweeper.» pintado en canvas, como la casa de snake: estático
function dibujarLogo(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const DPR = 2; // rótulo a doble densidad: nítido en pantallas con mucha luz de píxel
  const texto = 'minesweeper';
  const alto = 104;
  ctx.font = '900 88px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  // medir antes de pintar: el lienzo se ajusta al rótulo, nunca lo recorta
  const anchoTexto = Math.ceil(ctx.measureText(texto).width);
  const radio = 13;
  const ancho = anchoTexto + 5 + radio * 2;
  canvas.width = ancho * DPR;
  canvas.height = alto * DPR;
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = '#f5f5f0';
  ctx.font = '900 88px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const y = alto / 2 + 2;
  ctx.fillText(texto, 0, y);
  // el único color de la casa es este punto
  ctx.fillStyle = ACENTO_LOGO;
  ctx.fillRect(Math.round(anchoTexto + 5), Math.round(y - radio), radio * 2, radio * 2);
}

function detalleCustom() {
  const c = guardado.custom;
  return t('diffCustomTag', { filas: c.filas, columnas: c.columnas, minas: c.minas, unit: unitMinas(c.minas) });
}

function densidadCustom() {
  const c = guardado.custom;
  return Math.round((c.minas / (c.filas * c.columnas)) * 100);
}

function mostrarCampaña() {
  app.juego = null;
  const hechos = campañaHechos();
  const secciones = ACTOS.map((acto) => {
    const rows = [];
    for (let i = 0; i < NIVELES.length; i += 1) {
      const nivel = NIVELES[i];
      if (nivel.act !== acto.id) continue;
      const desbloqueado = i < guardado.campaign.unlocked;
      const mejor = guardado.campaign.best[i] || 0;
      const nombre = getLanguage() === 'en' ? nivel.nombreEn : nivel.nombreEs;
      const detalle = `${nivel.filas}×${nivel.columnas} · ${nivel.minas} ${unitMinas(nivel.minas)}`;
      const esSiguiente = i === guardado.campaign.unlocked - 1;
      if (desbloqueado) {
        const derecha = mejor > 0 ? formatoTiempo(mejor) : (esSiguiente ? '→' : '↵');
        rows.push(filaHTML({
          accion: `playCampaign:${i}`,
          idx: i,
          nombre,
          detalle,
          derecha,
          acento: esSiguiente && mejor === 0,
          titulo: esSiguiente && mejor === 0 ? t('campaignHere') : '',
        }));
      } else {
        rows.push(filaHTML({ idx: i, nombre: '· · ·', detalle, derecha: '—', stat: true, dim: true, titulo: t('campaignLocked') }));
      }
    }
    const nombreActoTxt = getLanguage() === 'en' ? acto.nombreEn : acto.nombreEs;
    const lore = getLanguage() === 'en' ? acto.subEn : acto.subEs;
    return `<div class="acto">
      <p class="grupo acto-grupo">${t('actLabel', { n: acto.id, name: nombreActoTxt })}</p>
      <p class="acto-lore">${lore}</p>
      <div class="filas">${rows.join('')}</div>
    </div>`;
  }).join('');
  ponerOverlay(`<div class="panel campana">
    <div class="niveles-cabeza">
      <div>
        <p class="kicker">${t('campaign')} · <b id="campana-cifra">00</b>/30</p>
        <h2 class="campana-titulo">${t('campaignTagShort')}</h2>
      </div>
      ${botonVolver()}
    </div>
    <p class="prologo">${hechos >= NIVELES.length ? t('campaignComplete') : t('campaignPrologue')}</p>
    ${secciones}
  </div>`);
  pantalla('campaign');
  animarCifra(document.getElementById('campana-cifra'), hechos, (v) => dosDigitos(Math.round(v)));
  enfocarPrimero();
}

function mostrarHistoria(indice) {
  const nivel = nivelCampana(indice);
  if (!nivel || indice >= guardado.campaign.unlocked) {
    mostrarCampaña();
    return;
  }
  app.historia = indice;
  const nombre = getLanguage() === 'en' ? nivel.nombreEn : nivel.nombreEs;
  const texto = getLanguage() === 'en' ? nivel.historiaEn : nivel.historiaEs;
  const acto = actoDe(indice);
  const nombreActoTxt = getLanguage() === 'en' ? acto.nombreEn : acto.nombreEs;
  const completado = (guardado.campaign.best[indice] || 0) > 0;
  ponerOverlay(`<div class="panel historia">
    <p class="kicker">${t('actLabel', { n: acto.id, name: nombreActoTxt })} · ${t('levelCell', { n: indice + 1 })}</p>
    <h2 class="historia-titulo">${nombre}</h2>
    <p class="historia-dossier">${t('storyDossier')}</p>
    <p class="historia-texto">${texto}</p>
    <div class="acciones">
      <button class="principal" type="button" data-accion="descend"><span>${completado ? t('descendAgain') : t('descend')}</span><kbd>↵</kbd></button>
      <button type="button" data-accion="back"><span>${t('back')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('story');
  enfocarPrimero();
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

function empezarPartida(modo, nivel = null) {
  app.demo = null; // la portada se cierra: la demo descansa
  app.modo = modo;
  app.nivel = modo === 'campaign' ? nivel : null;
  const cfg = modo === 'campaign' ? configNivel(nivel) : configDeModo(modo);
  if (!cfg) { // nivel bloqueado o inexistente: de vuelta a la campaña
    mostrarCampaña();
    return;
  }
  audio.pararMusica(0.3); // transición: la fanfarria anterior se apaga sola
  app.juego = new Game(cfg, eventosJuego);
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
  if (app.modo === 'campaign' && app.nivel !== null) empezarPartida('campaign', app.nivel);
  else empezarPartida(app.modo);
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
  if (gano && app.modo === 'campaign' && app.nivel !== null) {
    const prev = guardado.campaign.best[app.nivel] || 0;
    if (prev === 0 || app.juego.tiempoMs < prev) {
      guardado.campaign.best[app.nivel] = Math.max(1, Math.floor(app.juego.tiempoMs));
      app.record = true;
    }
    // completar un nivel desbloquea el siguiente
    const siguiente = Math.min(NIVELES.length, app.nivel + 2);
    if (guardado.campaign.unlocked < siguiente) guardado.campaign.unlocked = siguiente;
  } else if (gano && esDificultadFija(app.modo)) {
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
    case 'boom': {
      contabilizarFin(false);
      audio.play('boom');
      if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 40, 90]);
      audio.musica('death', 120);
      const destello = document.getElementById('flash');
      if (destello) {
        destello.classList.remove('activo');
        void destello.offsetWidth; // reinicia la animación si quedaba a medias
        destello.classList.add('activo');
      }
      setTimeout(() => {
        if (app.juego === j && j.estado === 'perdido') mostrarFinPerdida();
      }, 480);
      break;
    }
    case 'win':
      contabilizarFin(true);
      audio.play('win');
      audio.musica('win', 100);
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

function etiquetaPartida() {
  if (app.modo === 'campaign') {
    return t('campaignHud', { n: dosDigitos((app.nivel || 0) + 1), name: nombreNivel(app.nivel || 0) });
  }
  return nombreDificultad(app.modo);
}

function haySiguienteNivel() {
  return app.modo === 'campaign' && app.nivel !== null && app.nivel + 1 < NIVELES.length;
}

function accionesFin({ hayMas }) {
  // en campaña, al ganar, el atajo es el siguiente capítulo; al perder, reintentar
  if (app.modo === 'campaign') {
    const siguiente = hayMas && haySiguienteNivel()
      ? `<button class="principal" type="button" data-accion="nextLevel"><span>${t('campaignNext')}</span><kbd>↵</kbd></button>`
      : `<button class="principal" type="button" data-accion="restart"><span>${t('again')}</span><kbd>R</kbd></button>`;
    return `${siguiente}
      <button type="button" data-accion="campaign"><span>${t('campaign')}</span><kbd>Esc</kbd></button>`;
  }
  return `<button class="principal" type="button" data-accion="restart"><span>${t('again')}</span><kbd>R</kbd></button>
      <button type="button" data-accion="toMenu"><span>${t('menu')}</span><kbd>Esc</kbd></button>`;
}

function mostrarFinGanada() {
  const j = app.juego;
  if (!j) return;
  const fija = esDificultadFija(app.modo);
  const enCampaña = app.modo === 'campaign';
  const bestMs = enCampaña ? (guardado.campaign.best[app.nivel] || 0) : (fija ? guardado.best[app.modo] : 0);
  const aplicaRecord = enCampaña || fija;
  const notaRecord = !aplicaRecord
    ? ''
    : app.record
      ? `<span class="record-tag">${t('newRecord')}</span>`
      : `<span>${t('yourRecord', { time: formatoTiempo(bestMs) })}</span>`;
  if (enCampaña && app.nivel === NIVELES.length - 1) {
    // se cerró el último campo: epílogo del viaje
    ponerOverlay(`<div class="panel fin">
      <header class="fin-cabeza">
        <p class="kicker">${t('epilogueKicker')}</p>
        <h2 class="historia-titulo">${t('epilogueTitle')}</h2>
      </header>
      <p class="historia-texto">${t('epilogueText')}</p>
      <p class="nota">${t('clearedIn', { time: formatoTiempo(j.tiempoMs) })}${notaRecord ? `<br>${notaRecord}` : ''}</p>
      <div class="acciones">
        <button class="principal" type="button" data-accion="toMenu"><span>${t('epilogueCta')}</span><kbd>↵</kbd></button>
      </div>
    </div>`);
    pantalla('won');
    enfocarPrimero();
    return;
  }
  ponerOverlay(`<div class="panel fin">
    <header class="fin-cabeza">
      <p class="kicker">${etiquetaPartida()}</p>
      <h2 class="cifra superado">${t('youWon')}</h2>
    </header>
    <p class="nota">${t('clearedIn', { time: formatoTiempo(j.tiempoMs) })}${notaRecord ? `<br>${notaRecord}` : ''}</p>
    <div class="acciones">
      ${accionesFin({ hayMas: true })}
    </div>
  </div>`);
  pantalla('won');
  enfocarPrimero();
}

function mostrarFinPerdida() {
  const j = app.juego;
  if (!j) return;
  const totalSeguras = j.cfg.filas * j.cfg.columnas - j.cfg.minas;
  const despejadas = typeof j.tablero.despejadasPorJugador === 'number' ? j.tablero.despejadasPorJugador : 0;
  const enCampaña = app.modo === 'campaign';
  const mejor = enCampaña ? (guardado.campaign.best[app.nivel] || 0) : 0;
  const kicker = `${etiquetaPartida()} · ${t('casualtyTag')}`;
  const tercera = enCampaña
    ? `<div class="muerte-dato"><b>${mejor > 0 ? formatoTiempo(mejor) : '—'}</b><span>${t('statBest')}</span></div>`
    : `<div class="muerte-dato"><b>${j.cfg.minas}</b><span>${t('statMines')}</span></div>`;
  ponerOverlay(`<div class="panel fin-muerte">
    <header class="fin-cabeza">
      <p class="kicker">${kicker}</p>
      <h2 class="cifra derrota">${t('youLost')}</h2>
      <div class="muerte-stats">
        <div class="muerte-dato"><b>${formatoTiempo(j.tiempoMs)}</b><span>${t('statTime')}</span></div>
        <div class="muerte-dato"><b>${despejadas}/${totalSeguras}</b><span>${t('statCleared')}</span></div>
        ${tercera}
      </div>
    </header>
    <div class="acciones">
      ${accionesFin({ hayMas: false })}
    </div>
  </div>`, 'muerte');
  pantalla('dead');
  enfocarPrimero();
  // el tablero completo queda por encima de la barra: se reserva el alto real
  const panel = el.overlay.querySelector('.fin-muerte');
  const alto = panel ? Math.ceil(panel.getBoundingClientRect().height) : 0;
  if (alto > 0) {
    huecoMuerte = alto;
    el.stage.style.paddingBottom = `${alto}px`;
    ajustarLienzo();
  }
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
  const hechos = campañaHechos();
  const filas = [
    filaStat(0, t('statsGames'), String(s.games)),
    filaStat(1, t('statsWins'), String(s.wins)),
    filaStat(2, t('statsWinRate'), tasa),
    filaStat(3, t('statsBestStreak'), String(s.bestStreak)),
    filaStat(4, t('statsCampaign'), `${dosDigitos(hechos)}/30 · ${t('statsCampaignTag')}`),
  ].join('');
  const records = [
    filaStat(6, t('statsBeginner'), tiempo('beginner')),
    filaStat(7, t('statsIntermediate'), tiempo('intermediate')),
    filaStat(8, t('statsExpert'), tiempo('expert')),
  ].join('');
  const peligro = filaHTML({
    accion: 'resetProgress',
    idx: 9,
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
  const modos = ['modeRule1', 'modeRule2', 'modeRule3']
    .map((clave) => `<li>${t(clave)}</li>`)
    .join('');
  const campana = ['campaignRule1', 'campaignRule2', 'campaignRule3']
    .map((clave) => `<li>${t(clave)}</li>`)
    .join('');
  const controles = [
    ['↑↓←→ / WASD', t('ctrlMove')],
    ['↑↓ / W S', t('ctrlNavigate')],
    ['Espacio / Enter', t('ctrlConfirm')],
    ['F', t('ctrlFlag')],
    ['X', t('ctrlChord')],
    ['R', t('ctrlRestart')],
    ['P / Esc', t('ctrlPause')],
    ['M', t('ctrlMute')],
    ['H', t('ctrlHelp')],
    ['PgUp / PgDn', t('ctrlScroll')],
  ].map(([tecla, desc]) => `<tr><th>${tecla}</th><td>${desc}</td></tr>`).join('');
  ponerOverlay(`<div class="panel ayuda">
    ${cabeceraPanel(t('helpTitle'), botonVolver())}
    <h2>${t('rulesTitle')}</h2>
    <ul class="reglas">${reglas}</ul>
    <h2>${t('modesTitle')}</h2>
    <ul class="reglas">${modos}</ul>
    <h2>${t('campaignRulesTitle')}</h2>
    <ul class="reglas">${campana}</ul>
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
  if (nombre.startsWith('playCampaign:')) {
    const i = Number(nombre.slice(13));
    if (Number.isInteger(i) && i >= 0 && i < guardado.campaign.unlocked && i < NIVELES.length) {
      mostrarHistoria(i);
    }
    return;
  }
  switch (nombre) {
    case 'play': mostrarDificultades(); return;
    case 'campaign': mostrarCampaña(); return;
    case 'descend':
      if (app.historia !== null && app.historia !== undefined) empezarPartida('campaign', app.historia);
      return;
    case 'nextLevel':
      if (haySiguienteNivel()) mostrarHistoria(app.nivel + 1);
      return;
    case 'profile': mostrarPerfil(); return;
    case 'help': mostrarAyuda(); return;
    case 'settings': mostrarAjustes(); return;
    case 'playCustom': mostrarPersonalizada(); return;
    case 'customStart': empezarPartida('custom'); return;
    case 'resume': reanudar(); return;
    case 'restart': reiniciarPartida(); return;
    case 'toMenu': {
      const epilogo = app.modo === 'campaign' && app.nivel === NIVELES.length - 1 && app.pantalla === 'won';
      if (epilogo) mostrarPortada();
      else if (app.modo === 'campaign') mostrarCampaña();
      else mostrarPortada();
      return;
    }
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
    case 'campaign': mostrarPortada(); return;
    case 'story': mostrarCampaña(); return;
    case 'profile':
    case 'help':
    case 'settings':
      mostrarPortada();
      return;
    case 'reset': mostrarPerfil(); return;
    case 'dead':
    case 'won':
      if (app.modo === 'campaign') mostrarCampaña();
      else mostrarPortada();
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
      if (app.pantalla === 'won' && haySiguienteNivel()) {
        mostrarHistoria(app.nivel + 1);
        return;
      }
      // el epílogo: ↵ hace lo que promete su botón — cerrar y volver a la puerta
      if (app.pantalla === 'won' && app.modo === 'campaign' && app.nivel === NIVELES.length - 1) {
        mostrarPortada();
        return;
      }
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

function animarCifra(nodo, total, formato = (v) => String(Math.round(v))) {
  if (!nodo) return;
  const objetivo = Math.max(0, Math.round(total || 0));
  const inicio = performance.now();
  const duracion = 520;
  const paso = (ahora) => {
    const t = Math.min(1, (ahora - inicio) / duracion);
    const suave = 1 - Math.pow(1 - t, 3);
    nodo.textContent = formato(objetivo * suave);
    if (t < 1 && nodo.isConnected) requestAnimationFrame(paso);
  };
  nodo.textContent = formato(0);
  requestAnimationFrame(paso);
  setTimeout(() => {
    if (nodo.isConnected) nodo.textContent = formato(objetivo);
  }, duracion + 80);
}

/* ------------------------------------------------------------- rutas */

function coincideRuta(segmento, clave) {
  return (ALIAS_RUTA[clave] || []).includes(segmento);
}

function rutaActual() {
  let camino = location.pathname;
  try {
    camino = decodeURIComponent(camino);
  } catch (error) {
    // sin decodificar si el escape no es válido
  }
  camino = camino.replace(/\/+$/, '');
  if (camino === '/' || camino === '') return [];
  if (camino.startsWith('/minesweeper/')) camino = camino.slice('/minesweeper'.length);
  else if (camino.startsWith('/')) camino = camino.slice(1);
  return camino.split('/').filter(Boolean).map((parte) => parte.toLowerCase());
}

function pantallaDeRuta() {
  const partes = rutaActual();
  const [primera, segunda] = partes;
  if (!primera) return { tipo: 'home' };
  if (coincideRuta(primera, 'play')) return { tipo: 'play' };
  if (coincideRuta(primera, 'custom')) return { tipo: 'custom' };
  if (coincideRuta(primera, 'campaign')) {
    const nivel = /^(?:nivel|level)-?(\d{1,2})$/.exec(segunda || '');
    return nivel
      ? { tipo: 'campaign-level', nivel: Number(nivel[1]) - 1 }
      : { tipo: 'campaign' };
  }
  if (coincideRuta(primera, 'help')) return { tipo: 'help' };
  if (coincideRuta(primera, 'settings')) return { tipo: 'settings' };
  if (coincideRuta(primera, 'profile')) return { tipo: 'profile' };
  for (const modo of ['beginner', 'intermediate', 'expert']) {
    if (coincideRuta(primera, modo)) return { tipo: 'game', modo };
  }
  return { tipo: 'home' };
}

function rutaDeEstado() {
  const slug = (nombre) => `${BASE_PATH}${routeSlug(nombre)}`;
  if (app.pantalla === 'home') return BASE_PATH;
  if (app.pantalla === 'modes') return slug('play');
  if (app.pantalla === 'custom') return slug('custom');
  if (app.pantalla === 'campaign') return slug('campaign');
  if (app.pantalla === 'story' && app.historia !== null) {
    return `${slug('campaign')}/nivel-${dosDigitos(app.historia + 1)}`;
  }
  if (app.pantalla === 'help') return slug('help');
  if (app.pantalla === 'settings') return slug('settings');
  if (app.pantalla === 'profile') return slug('profile');
  if (app.modo === 'campaign' && app.nivel !== null) {
    return `${slug('campaign')}/nivel-${dosDigitos(app.nivel + 1)}`;
  }
  if (app.modo === 'custom') return slug('custom');
  return slug(app.modo);
}

function sincronizarRuta(reemplazar = false) {
  if (location.protocol === 'file:') return;
  if (typeof history === 'undefined' || history == null) return;
  const destino = `${rutaDeEstado()}${location.hash}`;
  const actual = `${location.pathname}${location.search}${location.hash}`;
  if (actual === destino) return;
  const metodo = reemplazar ? 'replaceState' : 'pushState';
  history[metodo]({ minesweeper: true }, '', destino);
}

function mostrarRuta(ruta) {
  if (ruta.tipo === 'play') { mostrarDificultades(); return; }
  if (ruta.tipo === 'custom') { mostrarPersonalizada(); return; }
  if (ruta.tipo === 'campaign') { mostrarCampaña(); return; }
  if (ruta.tipo === 'help') { mostrarAyuda(); return; }
  if (ruta.tipo === 'settings') { mostrarAjustes(); return; }
  if (ruta.tipo === 'profile') { mostrarPerfil(); return; }
  if (ruta.tipo === 'game') { empezarPartida(ruta.modo); return; }
  if (ruta.tipo === 'campaign-level') {
    const i = ruta.nivel;
    if (Number.isInteger(i) && i >= 0 && i < NIVELES.length) {
      if (i < guardado.campaign.unlocked) { mostrarHistoria(i); return; }
      mostrarCampaña();
      return;
    }
    mostrarPortada();
    return;
  }
  mostrarPortada();
}

function restaurarRuta() {
  RUTAS.restaurando = true;
  mostrarRuta(pantallaDeRuta());
  RUTAS.restaurando = false;
  RUTAS.listas = true;
  sincronizarRuta(true);
}

window.addEventListener('popstate', () => {
  RUTAS.restaurando = true;
  mostrarRuta(pantallaDeRuta());
  RUTAS.restaurando = false;
  sincronizarRuta(true);
});

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
  if (app.pantalla === 'home') {
    const demo = app.demo;
    if (demo && document.getElementById('demo')) {
      demo.update(dt);
      app.demoAcum += dt;
      if (app.demoAcum >= 240) {
        app.demoAcum = 0;
        demoJugarUnPaso(demo);
      }
      renderDemo();
    }
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
  campaign: mostrarCampaña,
  story: () => mostrarHistoria(app.historia === null ? 0 : app.historia),
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
  restaurarRuta();
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
    mostrarCampaña,
    mostrarFinGanada,
    mostrarFinPerdida,
  };
}
})(modulos['main']);
})();
