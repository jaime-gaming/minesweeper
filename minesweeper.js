(function () {
'use strict';
const modulos = { board: {}, presets: {}, audio: {}, input: {}, engine: {}, i18n: {}, campaign: {}, scenes: {}, main: {} };

(function (modulo) {
'use strict';

class Tablero {

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
    this.estado = 'jugando';
    this.reveladas = 0;
    this.banderas = 0;
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

  sembrar(indiceSeguro) {
    if (this.sembradas) return;
    const zonaSegura = new Set([indiceSeguro, ...this.vecinos(indiceSeguro)]);

    let candidatas = [];
    for (let i = 0; i < this.total; i += 1) {
      if (!zonaSegura.has(i)) candidatas.push(i);
    }
    if (candidatas.length < this.minas) {

      candidatas = [];
      for (let i = 0; i < this.total; i += 1) {
        if (i !== indiceSeguro) candidatas.push(i);
      }
    }

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

      for (const celda of this.celdas) {
        if (celda.mina) celda.bandera = true;
      }
      this.banderas = this.minas;
      return true;
    }
    return false;
  }

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

  pulsar(indice) {
    const celda = Number.isInteger(indice) && this.celdas[indice];
    if (celda && celda.revelada) return this.acorde(indice);
    return this.revelar(indice);
  }

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

  revelarTodo() {
    this.despejadasPorJugador = this.celdas.filter((c) => c.revelada && !c.mina).length;
    for (const celda of this.celdas) {
      celda.revelada = true;
    }
  }

  alternarBandera(indice) {
    if (this.estado !== 'jugando') return null;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return null;
    const celda = this.celdas[indice];
    if (celda.revelada) return null;
    celda.bandera = !celda.bandera;
    this.banderas += celda.bandera ? 1 : -1;
    return celda.bandera ? 'bandera' : 'sin-bandera';
  }

  contarBanderas() {
    return this.banderas;
  }

  restantesMinas() {
    return this.minas - this.banderas;
  }

  minasOcultas() {
    const out = [];
    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].mina && !this.celdas[i].bandera) out.push(i);
    }
    return out;
  }

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

(function (modulo) {
'use strict';

const DIFICULTADES = [
  { id: 'beginner', filas: 9, columnas: 9, minas: 10 },
  { id: 'intermediate', filas: 16, columnas: 16, minas: 40 },
  { id: 'expert', filas: 16, columnas: 30, minas: 99 },
];

const DIFICULTAD_POR_DEFECTO = 'beginner';

const LIMITES_PERSONALIZADA = {
  filasMin: 5,
  filasMax: 24,
  columnasMin: 5,
  columnasMax: 30,
  minasMin: 1,

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

(function (modulo) {
'use strict';
let ctx = null;
let master = null;
let musicGain = null;
let pan = null;
let analyser = null;
let dataArray = null;
let noiseBuf = null;
let roto = false;
let nivelMusica = 1;
const GANANCIA_MUSICA = 1.3;

// Música procedural (modo Modificadores). No depende de archivos MP3.
let proc = null;
const ESCALA_MOD = [73.42, 82.41, 87.31, 98.0, 110, 116.54, 130.81, 146.83];

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
    musicGain.gain.value = GANANCIA_MUSICA * nivelMusica;
    pan = ctx.createStereoPanner();
    pan.pan.value = 0;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    musicGain.connect(analyser);
    analyser.connect(master);
    pan.connect(master);
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

    const len = Math.floor(ctx.sampleRate * 2);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    precargarEfectos();
    return ctx;
  } catch (err) {

    roto = true;
    ctx = null;
    master = null;
    pan = null;
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

  if (Number.isFinite(opts.pan) && pan) {
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), t0);
  }

  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  gan.gain.setValueAtTime(volumen, t0 + dur - salida);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  osc.connect(gan).connect(pan);
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
  const ataque = Math.max(0.001, opts.ataque ?? Math.min(0.008, dur * 0.2));

  src.buffer = noiseBuf;
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(opts.desde || 2400, t0);
  filtro.frequency.exponentialRampToValueAtTime(opts.hasta || 120, t0 + dur);

  if (Number.isFinite(opts.pan) && pan) {
    pan.pan.setValueAtTime(Math.max(-1, Math.min(1, opts.pan)), t0);
  }

  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filtro).connect(gan).connect(pan);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function boomSintetico(panValor = 0) {

  ruido(1.7, { desde: 1050, hasta: 52, vol: 0.5, ataque: 0.002, pan: panValor });

  tono(57, 1.25, { tipo: 'sine', vol: 0.42, fin: 29, release: 0.6, pan: panValor });

  tono(150, 0.2, { tipo: 'sawtooth', vol: 0.28, fin: 58, pan: panValor });
  tono(320, 0.09, { tipo: 'square', vol: 0.12, fin: 180, delay: 0.012, pan: panValor });

  ruido(0.42, { desde: 3400, hasta: 640, vol: 0.17, delay: 0.085, ataque: 0.004, pan: panValor });

  ruido(1.15, { desde: 320, hasta: 58, vol: 0.2, delay: 0.27, pan: panValor });
  tono(41, 0.9, { tipo: 'triangle', vol: 0.15, fin: 26, delay: 0.22, release: 0.5, pan: panValor });
}

const MUSICA = {
  ambience: { url: 'audio/Ambience.mp3', bucle: true, vol: 0.32 },
  win: { url: 'audio/Win.mp3', bucle: false, vol: 1 },
  death: { url: 'audio/Death.mp3', bucle: false, vol: 1 },
  introMod: { url: 'audio/IntroMod.ogg', bucle: false, vol: 1 },
  hardMod: { url: 'audio/HardMod.ogg', bucle: true, vol: 0.5 },
};

const EFECTOS = {
  boom: 'audio/Boom.mp3',
};

const buffersFx = new Map();
const fxListos = new Map();

function precargarEfectos() {
  if (!ctx || typeof fetch !== 'function') return;
  for (const nombre of Object.keys(EFECTOS)) {
    if (buffersFx.has(nombre)) continue;
    const peticion = fetch(EFECTOS[nombre])
      .then((r) => {
        if (!r.ok) throw new Error(`audio ${r.status}`);
        return r.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        fxListos.set(nombre, buf);
        return buf;
      });
    buffersFx.set(nombre, peticion);
    peticion.catch(() => buffersFx.delete(nombre));
  }
}

const buffersMusica = new Map();
let actual = null;
let solicitada = null;
let generacion = 0;

function cargarMusica(nombre) {
  if (buffersMusica.has(nombre)) return buffersMusica.get(nombre);
  const c = build();
  if (!c || typeof fetch !== 'function') return Promise.reject(new Error('audio listo'));
  const promesa = fetch(MUSICA[nombre].url)
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
  generacion += 1;
  solicitada = null;
  const c = ctx;
  const corriente = actual;
  actual = null;
  if (!c || !corriente) return;
  const { src, gan } = corriente;
  try {
    const t = c.currentTime;
    gan.gain.cancelScheduledValues(t);
    if (!(fade > 0)) {
      gan.gain.setValueAtTime(0.0001, t);
      src.stop(t + 0.03);
      return;
    }
    gan.gain.setValueAtTime(Math.max(0.0001, gan.gain.value), t);
    gan.gain.setTargetAtTime(0.0001, t, fade / 4);
    src.stop(t + fade + 0.25);
  } catch (err) {
    try { src.stop(); } catch (err2) {  }
  }
}

function iniciarProcedural(nombre) {
  if (nombre !== 'modifiers') return;
  detenerProcedural();
  const c = build();
  if (!c) return;
  const gan = c.createGain();
  gan.gain.setValueAtTime(0.0001, c.currentTime);
  gan.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 1.5);
  gan.connect(musicGain);

  const drone = c.createOscillator();
  drone.type = 'sine';
  drone.frequency.setValueAtTime(73.42, c.currentTime);
  drone.connect(gan);
  drone.start();

  proc = { c, gan, osciladores: [drone], activo: true, t: c.currentTime };
  procTick();
}

function procTick() {
  if (!proc || !proc.activo) return;
  const c = proc.c;
  const t0 = c.currentTime + 0.06;
  const freq = ESCALA_MOD[Math.floor(Math.random() * ESCALA_MOD.length)];
  const osc = c.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  const ganN = c.createGain();
  ganN.gain.setValueAtTime(0.0001, t0);
  ganN.gain.exponentialRampToValueAtTime(0.045, t0 + 0.15);
  ganN.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
  osc.connect(ganN).connect(musicGain);
  osc.start(t0);
  osc.stop(t0 + 2.7);
  proc.osciladores.push(osc);

  const ahora = c.currentTime;
  if (ahora - proc.t > 5) {
    proc.t = ahora;
    proc.gan.gain.setTargetAtTime(Math.random() * 0.04 + 0.015, ahora, 0.6);
  }

  proc.temporizador = setTimeout(procTick, 2000 + Math.random() * 1500);
}

function detenerProcedural() {
  if (!proc) return;
  proc.activo = false;
  if (proc.temporizador) clearTimeout(proc.temporizador);
  for (const osc of proc.osciladores) {
    try { osc.stop(); } catch (err) {  }
  }
  if (proc.gan) {
    try { proc.gan.gain.setTargetAtTime(0.0001, proc.c.currentTime, 0.4); } catch (err) {  }
  }
  proc = null;
}

let precargaHecha = false;
function precargarTodo() {
  if (precargaHecha) return;
  const c = build();
  if (!c || typeof fetch !== 'function') return;
  precargaHecha = true;
  for (const nombre of Object.keys(MUSICA)) cargarMusica(nombre);
  precargarEfectos();
}

const SONIDOS = {
  start() {
    tono(260, 0.085, { tipo: 'triangle', vol: 0.2, pan: 0, fin: 430 });
    tono(620, 0.08, { tipo: 'sine', vol: 0.1, delay: 0.045, pan: 0, fin: 760 });
  },

  reveal({ size = 1, pan = 0 } = {}) {
    const n = Math.min(8, Math.max(1, size | 0));
    const base = 340 + n * 28;
    tono(base, 0.035, { tipo: 'square', vol: 0.085, pan });
    if (n >= 4) tono(base * 1.5, 0.03, { tipo: 'sine', vol: 0.06, delay: 0.03, pan });
  },
  chord({ pan = 0 } = {}) {
    tono(430, 0.03, { tipo: 'square', vol: 0.075, pan });
    tono(560, 0.035, { tipo: 'square', vol: 0.08, delay: 0.035, pan });
  },
  flag({ pan = 0 } = {}) {
    tono(720, 0.04, { tipo: 'square', vol: 0.12, pan });
    tono(1080, 0.03, { tipo: 'sine', vol: 0.07, delay: 0.025, pan });
  },
  unflag({ pan = 0 } = {}) {
    tono(540, 0.035, { tipo: 'square', vol: 0.09, fin: 430, pan });
  },
  boom({ pan = 0 } = {}) {
    const c = ctx;
    const buf = fxListos.get('boom');
    if (c && buf) {
      try {
        if (pan) pan.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), c.currentTime + 0.001);
        const src = c.createBufferSource();
        const gan = c.createGain();
        gan.gain.value = 1.55;
        src.buffer = buf;
        src.connect(gan).connect(pan);
        src.start(c.currentTime + 0.001);
        return;
      } catch (err) {

      }
    }
    boomSintetico(pan);
  },
  ui() {
    tono(460, 0.028, { tipo: 'square', vol: 0.07, pan: 0 });
  },
  locked() {
    tono(120, 0.075, { tipo: 'triangle', vol: 0.12, fin: 95, pan: 0 });
  },
  screech({ pan = 0 } = {}) {
    const c = ctx;
    if (!c) return;
    const t0 = c.currentTime;
    const gan = c.createGain();
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.exponentialRampToValueAtTime(0.18, t0 + 0.05);
    gan.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
    const filt = c.createBiquadFilter();
    filt.type = 'highpass';
    filt.frequency.value = 3000;
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(2200, t0);
    osc.frequency.exponentialRampToValueAtTime(700, t0 + 0.35);
    osc.connect(filt).connect(gan).connect(pan);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  },
  eyes({ pan = 0 } = {}) {
    const c = ctx;
    if (!c) return;
    const t0 = c.currentTime;
    const gan = c.createGain();
    gan.gain.setValueAtTime(0.0001, t0);
    gan.gain.linearRampToValueAtTime(0.22, t0 + 0.15);
    gan.gain.linearRampToValueAtTime(0.0001, t0 + 1.2);
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.linearRampToValueAtTime(145, t0 + 1.2);
    osc.connect(gan).connect(pan);
    osc.start(t0);
    osc.stop(t0 + 1.3);
  },
};

const audio = {
  enabled: true,

  unlock() {
    try {
      const c = build();
      if (c && c.state === 'suspended') c.resume().catch(() => {});
    } catch (err) {

    }
    precargarTodo();
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

  setVolumen(porcentaje) {
    const v = Math.max(0, Math.min(100, Math.round(Number(porcentaje) || 0)));
    nivelMusica = v / 100;
    if (!musicGain || !ctx) return;
    try {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(GANANCIA_MUSICA * nivelMusica, ctx.currentTime, 0.05);
    } catch (err) {
      musicGain.gain.value = GANANCIA_MUSICA * nivelMusica;
    }
  },

  pan(valor) {
    if (!pan) return;
    const v = Math.max(-1, Math.min(1, Number(valor) || 0));
    pan.pan.cancelScheduledValues(ctx.currentTime);
    pan.pan.setValueAtTime(v, ctx.currentTime);
    return v;
  },

  obtenerFrecuencias() {
    if (!analyser || !dataArray) return null;
    analyser.getByteFrequencyData(dataArray);
    return dataArray;
  },

  // Dibuja un fondo rojo que late con la música (modo Hard).
  // ctx: contexto 2d de un canvas a pantalla completa.
  dibujarFondoRojo(ctx, ancho, alto) {
    if (!ctx) return;
    const datos = this.obtenerFrecuencias();
    if (!datos) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, ancho, alto);
      return;
    }

    // Bass (primeros bins) y energía general para el latido.
    let bass = 0;
    let energia = 0;
    const cuenta = datos.length;
    for (let i = 0; i < cuenta; i += 1) {
      const v = datos[i];
      energia += v;
      if (i < cuenta * 0.25) bass += v;
    }
    const bajo = bass / Math.max(1, cuenta * 0.25) / 255;
    const medio = energia / Math.max(1, cuenta) / 255;
    const latido = Math.max(bajo, medio * 0.6);

    // Fondo rojo oscuro con opacidad según la música.
    const opacidad = 0.15 + latido * 0.55;
    ctx.fillStyle = `rgba(120, 0, 0, ${Math.min(0.85, opacidad)})`;
    ctx.fillRect(0, 0, ancho, alto);

    // Barras de ecualizador rojo en la parte inferior.
    const barras = 48;
    const anchoBarra = ancho / barras;
    const altoMax = alto * 0.45;
    const yBase = alto - alto * 0.08;
    ctx.fillStyle = '#ff2b2b';
    for (let i = 0; i < barras; i += 1) {
      const idx = Math.floor((i / barras) * cuenta);
      const h = (datos[idx] / 255) * altoMax;
      ctx.fillRect(i * anchoBarra + 2, yBase - h, anchoBarra - 4, h);
    }

    // Vignette roja que late en los bordes.
    const gradiente = ctx.createRadialGradient(ancho / 2, alto / 2, alto * 0.2, ancho / 2, alto / 2, alto);
    gradiente.addColorStop(0, `rgba(255, 43, 43, ${latido * 0.35})`);
    gradiente.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, ancho, alto);
  },

  precargar: precargarTodo,

  musica(nombre, retardoMs = 0, fundido = 1.2) {
    if (!this.enabled) return;
    if (nombre === 'modifiers') {
      detenerProcedural();
      iniciarProcedural('modifiers');
      return;
    }
    if (!MUSICA[nombre]) return;
    detenerProcedural();
    if (actual && actual.nombre === nombre) return;
    if (solicitada === nombre) return;
    const c = build();
    if (!c) return;
    detenerMusicaActual(0.85);
    const gen = generacion;
    solicitada = nombre;
    const cfg = MUSICA[nombre];
    cargarMusica(nombre).then((buf) => {
      if (gen !== generacion) return;
      if (!this.enabled) {
        if (solicitada === nombre) solicitada = null;
        return;
      }
      const gan = c.createGain();
      gan.gain.setValueAtTime(0.0001, c.currentTime);
      gan.gain.exponentialRampToValueAtTime(Math.max(0.02, cfg.vol ?? 1), c.currentTime + Math.max(0.05, fundido));
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = !!cfg.bucle;
      src.connect(gan).connect(musicGain);
      src.addEventListener('ended', () => {
        if (actual && actual.src === src) actual = null;
      });
      src.start(c.currentTime + Math.max(0, retardoMs) / 1000);
      solicitada = null;
      actual = { src, gan, nombre };
    }).catch(() => {
      if (solicitada === nombre) solicitada = null;
    });
  },

  musicaProc(nombre) {
    if (!this.enabled) return;
    iniciarProcedural(nombre);
  },

  pararMusica(fade = 0.9) {
    detenerMusicaActual(fade);
    detenerProcedural();
  },

  pararAmbiente(fade = 0.8) {
    const enMarcha = Boolean(actual && actual.nombre === 'ambience');
    const arrancando = solicitada === 'ambience';
    if (enMarcha || arrancando) detenerMusicaActual(fade);
  },

  play(nombre, datos) {
    if (!this.enabled) return;
    try {
      if (!build()) return;
      const fn = SONIDOS[nombre];
      if (fn) {
        const d = datos || {};
        if (pan && Number.isFinite(d.pan)) {
          pan.pan.setValueAtTime(Math.max(-1, Math.min(1, d.pan)), ctx.currentTime);
        }
        fn(d);
      }
    } catch (err) {

    }
  },
};

precargarTodo();

  Object.assign(modulo, { audio });
})(modulos['audio']);

(function (modulo) {
'use strict';

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
  Escape: 'back',
  PageUp: 'scrollUp',
  PageDown: 'scrollDown',
  Home: 'scrollTop',
  End: 'scrollBottom',
};

const BOTONES = { 12: 'up', 13: 'down', 14: 'left', 15: 'right', 0: 'confirm', 1: 'flag', 2: 'chord', 3: 'restart', 9: 'pause' };

const RETARDO_PULSACION_LARGA = 450;

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

    const repetible = ['up', 'down', 'left', 'right', 'scrollUp', 'scrollDown', 'scrollTop', 'scrollBottom'].includes(accion);
    if (e.repeat && !repetible) return;
    fire(accion, e.repeat);
  });

  stage.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const celda = puntoACasilla(e.clientX, e.clientY);
    if (celda) fire('flag', false, { ...celda, puntero: true });
  });

  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, #overlay')) return;

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

(function (modulo) {
'use strict';

const { Tablero } = modulos['board'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ACENTO = '#ff2b2b';
const FUENTE_MONO = 'ui-monospace, "SFMono-Regular", "SF Mono", "Roboto Mono", Menlo, Consolas, monospace';

const COLORES_NUMERO = ['', '#4aa3ff', '#35d07f', '#ff4d4d', '#8f7bff', '#ff7a1f', '#22c8c8', '#ffd60a', '#f2f2f2'];
const COLOR_NUMERO = (n) => COLORES_NUMERO[clamp(n, 1, 8)] || ACENTO;

class Game {
  constructor(cfg, onEvent = () => {}) {
    this.cfg = { ...cfg };
    this.mods = cfg.mods || null;
    this.tablero = new Tablero(this.cfg);
    this.onEvent = typeof onEvent === 'function' ? onEvent : () => {};

    this.estado = 'antes';
    this.pausado = false;
    this.tiempoMs = this.mods?.reloj ? Math.max(1, Math.floor(Number(this.mods.relojSegundos) || 0)) * 1000 : 0;
    this.reloj = 0;

    this.cursor = {
      x: Math.floor(this.cfg.columnas / 2),
      y: Math.floor(this.cfg.filas / 2),
    };
    this.cursorVisible = false;
    this.casillaArmada = null;
    this.hover = null;
    this.quietoDesde = 0;

    this.flashes = [];
    this.shake = 0;
    this.explosionT = -1;
    this.winT = -1;

    this.screechT = 0;
    this.eyesT = 0;
    this.glitchT = 0;
    this.rushT = 0;
  }

  emit(type, data) {
    this.onEvent(type, data);
  }

  get filas() { return this.tablero.filas; }
  get columnas() { return this.tablero.columnas; }
  get terminada() { return this.estado === 'ganado' || this.estado === 'perdido'; }
  get minasRestantes() { return this.tablero.restantesMinas(); }
  get tableroRevelado() {

    return this.estado === 'perdido' || this.estado === 'ganado';
  }

  indice(x, y) {
    return this.tablero.indice(x, y);
  }

  dentro(x, y) {
    return this.tablero.dentro(x, y);
  }

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
      if (this.mods && this.mods.panico) this.shake = Math.max(this.shake, 8);
    }
    if (resultado.explosion >= 0) {
      this.estado = 'perdido';
      this.explosionT = ahora;
      this.shake = 16;
      this.tablero.revelarTodo();
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
    if (this.mods && this.mods.sinBandera) return;
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
    let avanza = false;
    if (this.estado === 'jugando' && !this.pausado) avanza = true;
    else if (this.estado === 'antes' && !this.pausado && this.tablero.sembradas) avanza = true;
    if (avanza) {
      if (this.mods && this.mods.reloj) {
        this.tiempoMs = Math.max(0, this.tiempoMs - paso);
        if (this.tiempoMs <= 0 && this.estado !== 'perdido') {
          this.estado = 'perdido';
          this.explosionT = this.reloj;
          this.shake = 16;
          this.tablero.revelarTodo();
          this.emit('boom', { indice: this.indice(this.cursor.x, this.cursor.y) });
          return;
        }
      } else {
        this.tiempoMs += paso;
      }
    }

    if (this.mods && this.mods.rush) {
      this.rushT += paso;
      this.shake = Math.max(this.shake, 4 + Math.sin(this.reloj * 0.02) * 3);
    }

    if (this.mods && this.mods.screech) {
      this.screechT += paso;
      if (this.screechT > 3000 + Math.random() * 4000) {
        this.screechT = 0;
        this.emit('screech');
      }
    }

    if (this.mods && this.mods.eyes) {
      this.eyesT += paso;
      if (this.hover && this.hover.x === this.cursor.x && this.hover.y === this.cursor.y) {
        this.quietoDesde += paso;
      } else {
        this.quietoDesde = 0;
      }
      if (this.quietoDesde > 3000) {
        this.eyesT = 0;
        this.emit('eyes');
      }
    }

    if (this.mods && this.mods.glitch) {
      this.glitchT += paso;
    }

    this.shake = Math.max(0, this.shake - paso * 0.05);
    if (this.flashes.length) {
      const limite = this.reloj - 450;
      this.flashes = this.flashes.filter((f) => f.t0 > limite);
    }
  }

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

          this._celdaAbierta(ctx, X, Y, lado, gap, { mina: true, adj: 0 }, i, true);
        } else {
          this._celdaCerrada(ctx, X, Y, lado, gap, esHover);
          if (celda.bandera) {
            const pop = abrir ? this._popVictoria(x, y) : 1;
            this._bandera(ctx, X, Y, lado, pop);
          }
        }

        if (perdido && celda.bandera && !celda.mina) {

          this._equisMala(ctx, X, Y, lado, gap);
        }
      }
    }

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

    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    const W = columnas * cell;
    const H = filas * cell;
    const tramo = Math.max(6, Math.round(cell * 0.7));
    const b = 2;
    ctx.beginPath();
    ctx.moveTo(ox + b, oy + b + tramo); ctx.lineTo(ox + b, oy + b); ctx.lineTo(ox + b + tramo, oy + b);
    ctx.moveTo(ox + W - b - tramo, oy + b); ctx.lineTo(ox + W - b, oy + b); ctx.lineTo(ox + W - b, oy + b + tramo);
    ctx.moveTo(ox + b, oy + H - b - tramo); ctx.lineTo(ox + b, oy + H - b); ctx.lineTo(ox + b + tramo, oy + H - b);
    ctx.moveTo(ox + W - b - tramo, oy + H - b); ctx.lineTo(ox + W - b, oy + H - b); ctx.lineTo(ox + W - b, oy + H - b - tramo);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (this.casillaArmada && !this.terminada) {
      this._marcas(ctx, px(this.casillaArmada.x), py(this.casillaArmada.y), cell, '#ff2b2b');
    }
    if (this.cursorVisible && !this.terminada) {
      this._marcas(ctx, px(this.cursor.x), py(this.cursor.y), cell, '#fff');
    }

    // --- Niebla (The Minefields): solo se ve alrededor del cursor ---
    if (this.mods && this.mods.niebla && !this.terminada) {
      const cx = (this.hover || this.cursor).x;
      const cy = (this.hover || this.cursor).y;
      const radio = Math.min(columnas, filas) * cell * 0.55;
      const gradiente = ctx.createRadialGradient(
        px(cx), py(cy), 0,
        px(cx), py(cy), radio
      );
      gradiente.addColorStop(0, 'rgba(0,0,0,0)');
      gradiente.addColorStop(0.35, 'rgba(0,0,0,0.35)');
      gradiente.addColorStop(1, 'rgba(0,0,0,0.92)');
      ctx.fillStyle = gradiente;
      ctx.fillRect(0, 0, width, height);
    }

    // --- Eyes (DOORS): brillo púrpura si el cursor se queda quieto ---
    if (this.mods && this.mods.eyes && this.quietoDesde > 1500 && !this.terminada) {
      const progreso = Math.min(1, (this.quietoDesde - 1500) / 1500);
      const brillo = Math.abs(Math.sin(this.reloj * 0.03)) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(138, 43, 226, ${0.25 + progreso * 0.35 + brillo * 0.15})`;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = `rgba(138, 43, 226, ${0.4 + progreso * 0.4})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px(this.cursor.x), py(this.cursor.y), cell * 1.8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Glitch (DOORS): distorsión de bandas horizontales ---
    if (this.mods && this.mods.glitch && !this.terminada && this.glitchT > 0) {
      const ciclo = (this.glitchT % 2200) / 2200;
      if (ciclo > 0.85) {
        const intensidad = Math.sin(this.reloj * 0.05) * 8;
        for (let b = 0; b < height; b += Math.max(4, Math.round(cell * 0.6))) {
          if (Math.random() < 0.35) {
            const dx = (Math.random() - 0.5) * intensidad * 4;
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, b, width, Math.max(2, Math.round(cell * 0.4)));
            ctx.clip();
            ctx.drawImage(ctx.canvas, dx, 0);
            ctx.restore();
          }
        }
      }
    }

    ctx.restore();
  }

  _marcas(ctx, X, Y, cell, estilo) {
    const c = Math.max(5, Math.round(cell * 0.34));
    const i = 2;
    ctx.strokeStyle = estilo;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X + i, Y + i + c); ctx.lineTo(X + i, Y + i); ctx.lineTo(X + i + c, Y + i);
    ctx.moveTo(X + cell - i - c, Y + i); ctx.lineTo(X + cell - i, Y + i); ctx.lineTo(X + cell - i, Y + i + c);
    ctx.moveTo(X + i, Y + cell - i - c); ctx.lineTo(X + i, Y + cell - i); ctx.lineTo(X + i + c, Y + cell - i);
    ctx.moveTo(X + cell - i - c, Y + cell - i); ctx.lineTo(X + cell - i, Y + cell - i); ctx.lineTo(X + cell - i, Y + cell - i - c);
    ctx.stroke();
  }

  _celdaCerrada(ctx, X, Y, lado, gap, hover) {

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
    const u = Math.max(1, Math.round(lado / 16));
    const cx = X + lado / 2;
    const cy = Y + lado / 2;
    const tono = color === '#000' ? '#000' : null;

    ctx.fillStyle = tono || 'rgba(0,0,0,0.35)';
    ctx.fillRect(Math.round(cx - 4 * u), Math.round(cy - 2 * u) + 1, 8 * u, 5 * u);

    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx - 3 * u), Math.round(cy - 3 * u), 6 * u, 6 * u);
    ctx.fillRect(Math.round(cx - 4 * u), Math.round(cy - 2 * u), 8 * u, 4 * u);
    ctx.fillRect(Math.round(cx - 2 * u), Math.round(cy - 4 * u), 4 * u, 8 * u);

    ctx.fillRect(Math.round(cx - u), Math.round(cy - 6 * u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx - u), Math.round(cy + 4 * u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx - 6 * u), Math.round(cy - u), 2 * u, 2 * u);
    ctx.fillRect(Math.round(cx + 4 * u), Math.round(cy - u), 2 * u, 2 * u);

    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy - 5 * u), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx + 4 * u) - (u >> 1), Math.round(cy - 5 * u), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx - 5 * u), Math.round(cy + 4 * u) - (u >> 1), u + (u >> 1), u + (u >> 1));
    ctx.fillRect(Math.round(cx + 4 * u) - (u >> 1), Math.round(cy + 4 * u) - (u >> 1), u + (u >> 1), u + (u >> 1));
    if (!tono) {

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

    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(cx - u, cima, 2 * u, base - cima);
    ctx.fillStyle = '#8f8f8f';
    ctx.fillRect(cx + u - 1, cima, 1, base - cima);

    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(cx - u, cima - u, 2 * u, u);

    const px = cx + u;
    ctx.fillStyle = ACENTO;
    ctx.fillRect(px, cima + u, 5 * u, u);
    ctx.fillRect(px, cima + 2 * u, 6 * u, u);
    ctx.fillRect(px, cima + 3 * u, 5 * u, u);

    ctx.fillStyle = '#ff7a7a';
    ctx.fillRect(px, cima + u, 5 * u, 1);
    ctx.fillRect(px, cima + 2 * u, 6 * u, 1);

    ctx.fillStyle = '#a31212';
    ctx.fillRect(px, cima + 3 * u, 5 * u, 1);
    ctx.fillRect(px + 4 * u, cima + 2 * u, 2 * u, u);

    ctx.fillStyle = '#070707';
    ctx.fillRect(px + 5 * u, cima + 2 * u, u, u);

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

    if (t <= 0) return 0;
    const s = t < 0.6 ? 1.35 * (t / 0.6) : 1.35 - 0.35 * ((t - 0.6) / 0.4);
    return s;
  }
}

  Object.assign(modulo, { Game });
})(modulos['engine']);

(function (modulo) {
'use strict';

const KEY = 'minesweeper.language';
const STRINGS = {
  es: {
    documentTitle: 'minesweeper.',
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

    play: 'jugar',
    playTag: 'tres dificultades y una personalizada',
    profile: 'perfil',
    profileTag: 'récords, partidas y tasa de victorias',
    settings: 'ajustes',
    menuAria: 'menú principal',
    backToHub: 'volver al hub',

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

    custom: 'PERSONALIZADA',
    customRows: 'filas',
    customColumns: 'columnas',
    customMines: 'minas',
    density: 'densidad {pct} %',
    start: 'empezar',

    record: 'récord',

    pause: 'en pausa',
    resume: 'seguir',
    restart: 'reiniciar',
    quitToMenu: 'menú principal',

    youWon: 'despejado.',
    youLost: 'boom.',
    clearedTag: 'despejada',
    winWhisper: 'el campo queda en silencio.',
    deathWhisper: 'el campo no devuelve a nadie.',
    parcelTag: 'parcela',
    clearedIn: 'despejado en {time}',
    newRecord: 'nuevo récord',
    yourRecord: 'tu récord: {time}',
    again: 'otra vez',
    menu: 'menú',
    minesExploded: 'las minas eran {count}',

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

    settingsTitle: 'AJUSTES',
    settingSound: 'sonido',
    settingTrama: 'trama de fósforo',
    settingTramaTag: 'las líneas horizontales de la pantalla',
    settingDouble: 'doble clic para confirmar',
    settingDoubleTag: 'el primer clic arma la casilla; el segundo la destapa',
    on: 'sí',
    off: 'no',
    back: 'volver',

    hintHome: 'elige una ruta · M silencia',
    hintModes: 'elige dificultad · Esc vuelve',
    hintCustom: '− + ajustan · Enter empieza',
    hintGame: 'flechas mueven · espacio destapa · F bandera · X acorde · R reinicia',
    hintGameTouch: 'toca para destapar · mantén pulsado para la bandera',
    hintPaused: 'sigue la partida con P o Esc',
    hintDead: 'R reintenta · Esc vuelve al menú',
    hintWon: 'R otra vez · Esc vuelve al menú',
    hintProfile: 'récords y estadísticas · Esc vuelve',
    hintSettings: 'M silencia · Esc vuelve',
    hintCampaign: 'las flechas eligen · ↵ abre · Esc vuelve',
    hintStory: '↵ marchar · Esc vuelve',

    campaign: 'campaña',
    campaignTag: 'la treinta · una historia en treinta campos',
    campaignLocked: 'cierra primero el nivel anterior',
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
    statsCampaignTotal: 'suma de mejores tiempos',
    statsFieldTime: 'tiempo en el campo',
    groupAudio: 'audio',
    groupImage: 'imagen',
    groupGame: 'juego',
    groupData: 'datos',
    settingVolume: 'volumen de la música',
    settingVolumeTag: 'el ambiente del campo y las piezas de final; los efectos van aparte',
    mapStamp: 'no pisar',
    mapScroll: 'el mapa se desplaza a lo ancho',
    campaignHereShort: 'tu posición',
    lockedShort: 'cerrada',
    preview: 'vista previa',
    previewNote: 'jugando: nivel {n} · {name}',
    routePlay: 'jugar',
    routeCampaign: 'campaña',
    routeSettings: 'ajustes',
    routeProfile: 'perfil',
    routeBeginner: 'principiante',
    routeIntermediate: 'intermedio',
    routeExpert: 'experto',
    routeCustom: 'personalizada',

    modifiers: 'modificadores',
    modTagline: 'elige cómo arder el campo',
    modMinesExtra: 'minas extra',
    modMinesExtraTag: 'más minas repartidas por el campo',
    modReloj: 'reloj cuenta atrás',
    modRelojTag: 'el tiempo se agota antes de despejar',
    modSinBandera: 'sin banderas',
    modSinBanderaTag: 'no se pueden marcar minas',
    modPanico: 'pánico',
    modPanicoTag: 'el tablero tiembla al destapar',
    modNiebla: 'niebla',
    modNieblaTag: 'solo ves alrededor del cursor',
    modRush: 'rush',
    modRushTag: 'el tablero tiembla constantemente',
    modScreech: 'screech',
    modScreechTag: 'alertas de sonido aleatorias',
    modGlitch: 'glitch',
    modGlitchTag: 'la pantalla se distorsiona',
    modEyes: 'ojos',
    modEyesTag: 'no dejes quieto el cursor',
    modHard: 'modo difícil',
    modHardTag: 'música Hard y fondo rojo reaccionando',
    modActiva: '1 activa',
    modActivas: '{n} activas',
    hintModifiers: 'pulsa una fila para alternar · Enter juega',
    introMod: 'introducción',
    introModNota: 'El portal se abre… aguanta la señal.',
    dialogoSiguiente: 'siguiente',
    quienComando: 'Comando',
    quienSargento: 'Sargento',
    quienTelegrafista: 'Telegrafista',
    quienRecluta: 'Recluta',
  },
  en: {
    documentTitle: 'minesweeper.',
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

    play: 'play',
    playTag: 'three difficulties and a custom board',
    profile: 'profile',
    profileTag: 'records, games and win rate',
    settings: 'settings',
    menuAria: 'main menu',
    backToHub: 'back to hub',

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

    custom: 'CUSTOM',
    customRows: 'rows',
    customColumns: 'columns',
    customMines: 'mines',
    density: 'density {pct}%',
    start: 'start',

    record: 'best',

    pause: 'paused',
    resume: 'resume',
    restart: 'restart',
    quitToMenu: 'main menu',

    youWon: 'cleared.',
    youLost: 'boom.',
    clearedTag: 'cleared',
    winWhisper: 'the field goes quiet.',
    deathWhisper: 'the field gives no one back.',
    parcelTag: 'parcel',
    clearedIn: 'cleared in {time}',
    newRecord: 'new record',
    yourRecord: 'your record: {time}',
    again: 'again',
    menu: 'menu',
    minesExploded: 'there were {count} mines',

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

    settingsTitle: 'SETTINGS',
    settingSound: 'sound',
    settingTrama: 'phosphor scanlines',
    settingTramaTag: 'the horizontal lines on screen',
    settingDouble: 'double-click to confirm',
    settingDoubleTag: 'first click arms the cell; second one reveals it',
    on: 'on',
    off: 'off',
    back: 'back',

    hintHome: 'pick a route · M mutes',
    hintModes: 'pick a difficulty · Esc goes back',
    hintCustom: '− + adjust · Enter starts',
    hintGame: 'arrows move · space reveals · F flag · X chord · R restart',
    hintGameTouch: 'tap to reveal · hold to flag',
    hintPaused: 'resume with P or Esc',
    hintDead: 'R retries · Esc back to menu',
    hintWon: 'R again · Esc back to menu',
    hintProfile: 'records and stats · Esc goes back',
    hintSettings: 'M mutes · Esc goes back',
    hintCampaign: 'arrows pick · ↵ opens · Esc goes back',
    hintStory: '↵ march · Esc goes back',

    campaign: 'campaign',
    campaignTag: 'the thirty · a story in thirty fields',
    campaignLocked: 'beat the previous level first',
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
    statsCampaignTotal: 'sum of best times',
    statsFieldTime: 'time in the field',
    groupAudio: 'audio',
    groupImage: 'image',
    groupGame: 'game',
    groupData: 'data',
    settingVolume: 'music volume',
    settingVolumeTag: 'the field ambience and the end pieces; the effects stay as they are',
    mapStamp: 'do not step',
    mapScroll: 'the map scrolls sideways',
    campaignHereShort: 'your position',
    lockedShort: 'locked',
    preview: 'preview',
    previewNote: 'playing: level {n} · {name}',
    routePlay: 'play',
    routeCampaign: 'campaign',
    routeSettings: 'settings',
    routeProfile: 'profile',
    routeBeginner: 'beginner',
    routeIntermediate: 'intermediate',
    routeExpert: 'expert',
    routeCustom: 'custom',

    modifiers: 'modifiers',
    modTagline: 'choose how the field burns',
    modMinesExtra: 'extra mines',
    modMinesExtraTag: 'more mines spread across the field',
    modReloj: 'countdown clock',
    modRelojTag: 'time runs out before clearing',
    modSinBandera: 'no flags',
    modSinBanderaTag: 'mines cannot be marked',
    modPanico: 'panic',
    modPanicoTag: 'the board shakes on reveal',
    modNiebla: 'fog',
    modNieblaTag: 'you only see around the cursor',
    modRush: 'rush',
    modRushTag: 'the board shakes constantly',
    modScreech: 'screech',
    modScreechTag: 'random sound alerts',
    modGlitch: 'glitch',
    modGlitchTag: 'the screen distorts',
    modEyes: 'eyes',
    modEyesTag: "don't keep the cursor still",
    modHard: 'hard mode',
    modHardTag: 'Hard music and music-reactive red background',
    modActiva: '1 active',
    modActivas: '{n} active',
    hintModifiers: 'tap a row to toggle · Enter plays',
    introMod: 'intro',
    introModNota: 'The portal opens… hold the signal.',
    dialogoSiguiente: 'next',
    quienComando: 'Command',
    quienSargento: 'Sergeant',
    quienTelegrafista: 'Radio',
    quienRecluta: 'Conscript',
  },
};

let language = 'es';

try {
  const stored = localStorage.getItem(KEY);
  if (stored === 'es' || stored === 'en') language = stored;
} catch (error) {

}

function getLanguage() {
  return language;
}

function setLanguage(value) {
  language = value === 'en' ? 'en' : 'es';
  try {
    localStorage.setItem(KEY, language);
  } catch (error) {

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

(function (modulo) {
'use strict';
const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'alistamiento', nombreEn: 'enlistment', subEs: 'la carta y el juramento', subEn: 'the letter and the oath' },
  { id: 2, inicio: 6, nombreEs: 'el frente', nombreEn: 'the front', subEs: 'la zona minada', subEn: 'the mined zone' },
  { id: 3, inicio: 12, nombreEs: 'la operación', nombreEn: 'the operation', subEs: 'operación puente', subEn: 'operation bridge' },
  { id: 4, inicio: 18, nombreEs: 'el final del campo', nombreEn: 'the end of the field', subEs: 'la vuelta', subEn: 'the way back' },
];

const NIVELES = [

  { act: 1, nombreEs: 'la carta', nombreEn: 'the letter', filas: 6, columnas: 6, minas: 6, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Su nombre está en la carta. El expediente también.', en: 'Your name is on the letter. The file number too.' },
      { quien: 'recluta', es: 'No recuerdo haberme ofrecido.', en: "I don't remember volunteering." },
    ],
    historiaEs: 'La carta llega un martes. Tu nombre, un número de expediente y una hora. La guerra te ha elegido.',
    historiaEn: 'The letter arrives on a Tuesday. Your name, a file number and an hour. The war has picked you.' },
  { act: 1, nombreEs: 'el cuartel', nombreEn: 'the barracks', filas: 7, columnas: 7, minas: 9, escena: 'cuartel',
    dialogo: [
      { quien: 'sargento', es: 'Firme. Firmará su nombre mil veces.', en: 'At ease. You will sign your name a thousand times.' },
      { quien: 'sargento', es: 'Como si eso le hiciera dueño del fusil.', en: "As if that made the rifle yours." },
    ],
    historiaEs: 'El cuartel huele a lejía y a miedo nuevo. Firmas tu nombre mil veces, como si eso te hiciera dueño del fusil.',
    historiaEn: 'The barracks smells of bleach and fresh fear. You sign your name a thousand times, as if that made the rifle yours.' },
  { act: 1, nombreEs: 'la prueba', nombreEn: 'the test', filas: 8, columnas: 8, minas: 10, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'Cien hombres en fila. Diez minutos.', en: 'A hundred men in a row. Ten minutes.' },
      { quien: 'sargento', es: 'Aprenda otra manera de mirar el suelo.', en: 'Learn another way of looking at the ground.' },
    ],
    historiaEs: 'La prueba: cien hombres en fila y diez minutos para aprender otra manera de mirar el suelo.',
    historiaEn: 'The test: a hundred men in a row and ten minutes to learn another way of looking at the ground.' },
  { act: 1, nombreEs: 'el juramento', nombreEn: 'the oath', filas: 8, columnas: 8, minas: 14, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Juren sobre un campo de verdad.', en: 'Swear over a real field.' },
      { quien: 'comando', es: 'Prometan volver. O que al menos los cuenten.', en: 'Promise to return. Or at least to be counted.' },
    ],
    historiaEs: 'Juráis sobre un campo de verdad. Prometéis volver, o que al menos lo cuenten.',
    historiaEn: 'You swear over a real field. You promise to return, or at least to be counted.' },
  { act: 1, nombreEs: 'el polígono', nombreEn: 'the range', filas: 9, columnas: 9, minas: 12, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'En el polígono todo es de verdad.', en: 'Here everything is real.' },
      { quien: 'sargento', es: 'La saliva. El temblor. Las banderas.', en: 'The spit. The trembling. The flags.' },
    ],
    historiaEs: 'En el polígono todo es de verdad: la saliva, el temblor, las banderas.',
    historiaEn: 'At the range everything is real: the spit, the trembling, the flags.' },
  { act: 1, nombreEs: 'el ascenso', nombreEn: 'the commission', filas: 9, columnas: 9, minas: 16, escena: 'tren',
    dialogo: [
      { quien: 'comando', es: 'Ascenso por cumplir un trámite.', en: 'Commissioned for completing a formality.' },
      { quien: 'comando', es: 'El tren parte al amanecer.', en: 'The train leaves at dawn.' },
    ],
    historiaEs: 'Te ascienden a alférez por cumplir un trámite. El tren parte al amanecer.',
    historiaEn: 'You are commissioned for completing a formality. The train leaves at dawn.' },

  { act: 2, nombreEs: 'el convoy', nombreEn: 'the convoy', filas: 10, columnas: 10, minas: 18, escena: 'tren',
    dialogo: [
      { quien: 'telegrafista', es: 'Tres días de tren.', en: 'Three days by train.' },
      { quien: 'telegrafista', es: 'El puente está cortado. El enemigo vuela los puentes.', en: 'The bridge is cut. The enemy blows the bridges.' },
    ],
    historiaEs: 'Tres días de tren y un puente cortado. El enemigo vuela los puentes.',
    historiaEn: 'Three days of train and a cut bridge. The enemy blows the bridges.' },
  { act: 2, nombreEs: 'la zona', nombreEn: 'the zone', filas: 10, columnas: 10, minas: 22, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'Zona de operaciones.', en: 'Operations zone.' },
      { quien: 'sargento', es: 'El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.', en: 'The sign says DO NOT STEP. Underneath, someone wrote every name.' },
    ],
    historiaEs: 'Zona de operaciones. El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.',
    historiaEn: 'Operations zone. The sign says DO NOT STEP; underneath, someone wrote every name.' },
  { act: 2, nombreEs: 'los mapas', nombreEn: 'the maps', filas: 12, columnas: 12, minas: 26, escena: 'brujula',
    dialogo: [
      { quien: 'telegrafista', es: 'Estos mapas pertenecen a otra guerra.', en: 'These maps belong to another war.' },
      { quien: 'telegrafista', es: 'Minas sin marcar. Memoria de quien no pudo dibujarlas.', en: 'Unmarked mines. The memory of those who could not draw them.' },
    ],
    historiaEs: 'Los mapas pertenecen a otra guerra: minas sin marcar, memoria de quien no pudo dibujarlas.',
    historiaEn: 'The maps belong to another war: unmarked mines, the memory of those who could not draw them.' },
  { act: 2, nombreEs: 'el sargento', nombreEn: 'the sergeant', filas: 12, columnas: 12, minas: 31, escena: 'cuartel',
    dialogo: [
      { quien: 'sargento', es: 'Le mira como a un trapo viejo.', en: 'He looks at you like an old rag.' },
      { quien: 'sargento', es: 'Aquí se pisa con la cabeza, no con los pies.', en: 'Here you step with your head, not your feet.' },
    ],
    historiaEs: 'El sargento te mira como a un trapo viejo. Aquí se pisa con la cabeza, no con los pies.',
    historiaEn: 'The sergeant looks at you like an old rag. Here you step with your head, not your feet.' },
  { act: 2, nombreEs: 'el primer paso', nombreEn: 'the first step', filas: 14, columnas: 14, minas: 34, escena: 'campo',
    dialogo: [
      { quien: 'recluta', es: 'Primer paso fuera de la trinchera.', en: 'First step out of the trench.' },
      { quien: 'recluta', es: 'El silencio pesa más que el acero.', en: 'Silence weighs more than steel.' },
    ],
    historiaEs: 'Das el primer paso fuera de la trinchera. El silencio pesa más que el acero.',
    historiaEn: 'You take the first step out of the trench. Silence weighs more than steel.' },
  { act: 2, nombreEs: 'la guardia', nombreEn: 'the watch', filas: 14, columnas: 14, minas: 40, escena: 'campamento',
    dialogo: [
      { quien: 'telegrafista', es: 'Noche de guardia.', en: 'The night watch.' },
      { quien: 'telegrafista', es: 'Minas nuevas bajo la luna; alguien las siembra cada noche.', en: 'New mines under the moon; someone lays them every night.' },
    ],
    historiaEs: 'La noche de guardia. Minas nuevas bajo la luna; alguien las siembra cada noche.',
    historiaEn: 'The night watch. New mines under the moon; someone lays them every night.' },

  { act: 3, nombreEs: 'el puente', nombreEn: 'the bridge', filas: 14, columnas: 14, minas: 44, escena: 'puente',
    dialogo: [
      { quien: 'comando', es: 'Operación Puente. Crucen al otro lado.', en: 'Operation Bridge. Cross to the other side.' },
      { quien: 'comando', es: 'Dos campos, un vado y una radio muerta.', en: 'Two fields, a ford and a dead radio.' },
    ],
    historiaEs: 'Operación Puente: cruzar al otro lado. Dos campos, un vado y una radio muerta.',
    historiaEn: 'Operation Bridge: cross to the other side. Two fields, a ford and a dead radio.' },
  { act: 3, nombreEs: 'la brecha', nombreEn: 'the breach', filas: 16, columnas: 16, minas: 40, escena: 'puente',
    dialogo: [
      { quien: 'sargento', es: 'La brecha es una raya de luz en la hierba.', en: 'The breach is a line of light in the grass.' },
      { quien: 'sargento', es: 'Más allá, el campo enemigo.', en: 'Beyond it, the enemy field.' },
    ],
    historiaEs: 'La brecha es una raya de luz en la hierba. Más allá, el campo enemigo.',
    historiaEn: 'The breach is a line of light in the grass. Beyond it, the enemy field.' },
  { act: 3, nombreEs: 'el silencio', nombreEn: 'the silence', filas: 16, columnas: 16, minas: 48, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Seis minutos de silencio.', en: 'Six minutes of silence.' },
      { quien: 'comando', es: 'Antes de que la artillería hable. Nadie traga.', en: 'Before the guns speak. Nobody swallows.' },
    ],
    historiaEs: 'Seis minutos de silencio antes de que la artillería hable. Nadie traga.',
    historiaEn: 'Six minutes of silence before the guns speak. Nobody swallows.' },
  { act: 3, nombreEs: 'el asalto', nombreEn: 'the assault', filas: 16, columnas: 16, minas: 55, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'El asalto.', en: 'The assault.' },
      { quien: 'sargento', es: 'Banderas, polvo y el mundo reducido a un metro cuadrado.', en: 'Flags, dust and the world reduced to one square metre.' },
    ],
    historiaEs: 'El asalto. Banderas, polvo y el mundo reducido a un metro cuadrado.',
    historiaEn: 'The assault. Flags, dust and the world reduced to one square metre.' },
  { act: 3, nombreEs: 'la retirada', nombreEn: 'the retreat', filas: 16, columnas: 16, minas: 61, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Retirada.', en: 'Retreat.' },
      { quien: 'comando', es: 'Un compañero se ha quedado dentro del campo. La guerra no espera.', en: 'A comrade stayed inside the field. War does not wait.' },
    ],
    historiaEs: 'Retirada. Un compañero se ha quedado dentro del campo. La guerra no espera.',
    historiaEn: 'Retreat. A comrade stayed inside the field. War does not wait.' },
  { act: 3, nombreEs: 'el recuento', nombreEn: 'the count', filas: 16, columnas: 16, minas: 66, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'De cuarenta volvemos nueve.', en: 'Of forty, nine return.' },
      { quien: 'comando', es: 'El parte dice «éxito».', en: "The report says 'success'." },
    ],
    historiaEs: 'El recuento: de cuarenta volvemos nueve. El parte dice «éxito».',
    historiaEn: "The count: of forty, nine return. The report says 'success'." },

  { act: 4, nombreEs: 'el corredor', nombreEn: 'the corridor', filas: 16, columnas: 16, minas: 69, escena: 'campo',
    dialogo: [
      { quien: 'telegrafista', es: 'El corredor. La única ruta hasta el depósito enemigo.', en: 'The corridor: the only route to the enemy depot.' },
      { quien: 'telegrafista', es: 'Un kilómetro de hierba y muerte.', en: 'A kilometre of grass and death.' },
    ],
    historiaEs: 'El corredor: la única ruta hasta el depósito enemigo. Un kilómetro de hierba y muerte.',
    historiaEn: 'The corridor: the only route to the enemy depot. A kilometre of grass and death.' },
  { act: 4, nombreEs: 'el búnker', nombreEn: 'the bunker', filas: 18, columnas: 18, minas: 72, escena: 'bunker',
    dialogo: [
      { quien: 'comando', es: 'Bajo el búnker, su sala de mandos.', en: 'Beneath the bunker, their command room.' },
      { quien: 'comando', es: 'Minada por dentro. Deliberadamente.', en: 'Mined from the inside. Deliberately.' },
    ],
    historiaEs: 'Bajo el búnker, su sala de mandos. Minada por dentro. Deliberadamente.',
    historiaEn: 'Beneath the bunker, their command room. Mined from the inside. Deliberately.' },
  { act: 4, nombreEs: 'el documento', nombreEn: 'the document', filas: 16, columnas: 20, minas: 70, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Un documento: sus órdenes.', en: 'A document: your orders.' },
      { quien: 'comando', es: 'Firmadas con su nombre. Por una mano que no es la suya.', en: 'Signed with your name by a hand that is not yours.' },
    ],
    historiaEs: 'Un documento: tus órdenes, firmadas con tu nombre por una mano que no es la tuya.',
    historiaEn: 'A document: your orders, signed with your name by a hand that is not yours.' },
  { act: 4, nombreEs: 'la traición', nombreEn: 'the betrayal', filas: 20, columnas: 20, minas: 78, escena: 'sello',
    dialogo: [
      { quien: 'comando', es: 'Nadie la envió.', en: 'Nobody sent you.' },
      { quien: 'comando', es: 'Un castigo disfrazado de papeleo. Pero ya está aquí.', en: 'A punishment dressed as paperwork. But you are here now.' },
    ],
    historiaEs: 'Nadie te envió. Esto era un castigo disfrazado de papeleo. Pero ya estás aquí.',
    historiaEn: 'Nobody sent you. This was a punishment dressed as paperwork. But you are here now.' },
  { act: 4, nombreEs: 'el último campo', nombreEn: 'the last field', filas: 16, columnas: 22, minas: 70, escena: 'radio',
    dialogo: [
      { quien: 'telegrafista', es: 'Su clave por última vez.', en: 'Your callsign for the last time.' },
      { quien: 'telegrafista', es: 'Que el silencio le sea propicio.', en: 'May the silence be kind to you.' },
    ],
    historiaEs: 'El telegrafista escucha tu clave por última vez. Que el silencio te sea propicio.',
    historiaEn: 'The radio operator hears your callsign for the last time. May the silence be kind to you.' },
  { act: 4, nombreEs: 'el desierto', nombreEn: 'the desert', filas: 22, columnas: 22, minas: 84, escena: 'sol',
    dialogo: [
      { quien: 'sargento', es: 'El calor rebota en la arena.', en: 'The heat bounces off the sand.' },
      { quien: 'sargento', es: 'Cada paso es una conjetura.', en: 'Every step is a guess.' },
    ],
    historiaEs: 'El calor rebota en la arena; cada paso es una conjetura.',
    historiaEn: 'The heat bounces off the sand; every step is a guess.' },
  { act: 4, nombreEs: 'la ciudad', nombreEn: 'the city', filas: 20, columnas: 24, minas: 88, escena: 'ciudad',
    dialogo: [
      { quien: 'recluta', es: 'La ciudad tomada.', en: 'The city taken.' },
      { quien: 'recluta', es: 'Mercado nuevo. Pólvora y pan fresco. Nadie la reconoce.', en: 'A new market, gunpowder and fresh bread. Nobody recognises you.' },
    ],
    historiaEs: 'La ciudad tomada. Mercado nuevo, olor a pólvora y pan fresco. Nadie te reconoce.',
    historiaEn: 'The city taken. A new market, the smell of gunpowder and fresh bread. Nobody recognises you.' },
  { act: 4, nombreEs: 'el almacén', nombreEn: 'the warehouse', filas: 22, columnas: 24, minas: 96, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'Su expediente, quemado por orden del mando.', en: 'Your file, burned by order of the command.' },
      { quien: 'comando', es: 'Usted sabe caminar.', en: 'You know how to walk.' },
    ],
    historiaEs: 'El almacén. Tu expediente, quemado por orden del mando. Tú sabes caminar.',
    historiaEn: 'The warehouse. Your file, burned by order of the command. You know how to walk.' },
  { act: 4, nombreEs: 'el expediente', nombreEn: 'the file', filas: 24, columnas: 24, minas: 104, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'El expediente sobre la mesa.', en: 'The file on the table.' },
      { quien: 'comando', es: 'El nombre tachado. El sello roto. Te deben el nombre.', en: 'The name struck through, the seal broken. They owe you your name.' },
    ],
    historiaEs: 'El expediente sobre la mesa. El nombre tachado, el sello roto. Te deben el nombre.',
    historiaEn: 'The file on the table. The name struck through, the seal broken. They owe you your name.' },
  { act: 4, nombreEs: 'la vuelta', nombreEn: 'the way back', filas: 26, columnas: 24, minas: 112, escena: 'tren',
    dialogo: [
      { quien: 'telegrafista', es: 'El tren de vuelta.', en: 'The train home.' },
      { quien: 'telegrafista', es: 'Los campos se alejan por la ventanilla. Nadie dice nada.', en: 'The fields slide past the window. Nobody says a word.' },
    ],
    historiaEs: 'El tren de vuelta. Los campos se alejan por la ventanilla. Nadie dice nada.',
    historiaEn: 'The train home. The fields slide past the window. Nobody says a word.' },
  { act: 4, nombreEs: 'la puerta', nombreEn: 'the doorway', filas: 26, columnas: 28, minas: 124, escena: 'puerta',
    dialogo: [
      { quien: 'comando', es: 'La puerta de casa.', en: 'The doorway of home.' },
      { quien: 'comando', es: 'Dos golpes. Nadie responde. La abre usted.', en: 'Two knocks. Nobody answers. You open it yourself.' },
    ],
    historiaEs: 'La puerta de casa. Dos golpes. Nadie responde. La abres tú.',
    historiaEn: 'The doorway of home. Two knocks. Nobody answers. You open it yourself.' },
  { act: 4, nombreEs: 'el final del campo', nombreEn: 'the end of the field', filas: 24, columnas: 30, minas: 132, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Limpie el último campo.', en: 'Clear the last field.' },
      { quien: 'comando', es: 'No volverá a pisar otro. El campo termina; usted, no.', en: 'You will never tread on another. The field ends; you don\'t.' },
    ],
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

function configNivel(indice) {
  const nivel = NIVELES[indice];
  if (!nivel) return null;
  return { filas: nivel.filas, columnas: nivel.columnas, minas: nivel.minas };
}

  Object.assign(modulo, { ACTOS, NIVELES, nivelCampana, actoDe, nombreNivel, historiaNivel, configNivel });
})(modulos['campaign']);

(function (modulo) {
'use strict';
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

function dibujarEscena(lienzo, clave) {
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

  Object.assign(modulo, { dibujarEscena });
})(modulos['scenes']);

(function (modulo) {
'use strict';
const { Game } = modulos['engine'];
const { DIFICULTADES, DIFICULTAD_POR_DEFECTO, normalizarPersonalizada, dificultadPorId, esDificultadFija, limitesMinas } = modulos['presets'];
const { audio } = modulos['audio'];
const { attachInput, registrarConversorPunto } = modulos['input'];
const { t, getLanguage, setLanguage, unitMinas, routeSlug, routeWords } = modulos['i18n'];
const { NIVELES, ACTOS, configNivel, nivelCampana, actoDe } = modulos['campaign'];
const { dibujarEscena } = modulos['scenes'];

const $ = (sel) => document.querySelector(sel);

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

const CLAVE = 'minesweeper.v1';

function nuevoRegistro() {
  return {
    best: { beginner: 0, intermediate: 0, expert: 0 },
    stats: { games: 0, wins: 0, streak: 0, bestStreak: 0, timeMs: 0 },
    sound: true,
    trama: true,
    dobleClick: false,
    volumen: 100,
    custom: { filas: 9, columnas: 16, minas: 40 },
    campaign: { unlocked: 1, best: {} },
    modificadores: { minasExtra: false, reloj: false, sinBandera: false, panico: false, hard: false, niebla: false, rush: false, screech: false, glitch: false, eyes: false },
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
  for (const campo of ['games', 'wins', 'streak', 'bestStreak', 'timeMs']) {
    datos.stats[campo] = Math.max(0, Math.floor(Number(st[campo])) || 0);
  }
  const volumen = Math.floor(Number(bruto.volumen));
  datos.volumen = Number.isFinite(volumen) ? Math.max(0, Math.min(100, volumen)) : 100;
  if (typeof bruto.sound === 'boolean') datos.sound = bruto.sound;
  if (typeof bruto.trama === 'boolean') datos.trama = bruto.trama;
  if (typeof bruto.dobleClick === 'boolean') datos.dobleClick = bruto.dobleClick;
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
    const mods = bruto.modificadores && typeof bruto.modificadores === 'object' ? bruto.modificadores : {};
    for (const clave of Object.keys(datos.modificadores)) {
      if (typeof mods[clave] === 'boolean') datos.modificadores[clave] = mods[clave];
    }
  }
  return datos;
}

const guardado = leerGuardado();

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(guardado));
  } catch (err) {
    
  }
}

const app = {
  pantalla: 'home',
  juego: null,
  modo: DIFICULTAD_POR_DEFECTO,
  nivel: null,
  historia: null,
  record: false,
  flagMode: false,
  demo: null,
  demoAcum: 0,
  mapaSel: null,
  modHard: false,
  resetDesde: 'profile',
  hud: { meta: '', score: '', timer: '', best: '' },
};

const BASE_PATH = (typeof location !== 'undefined' && location.protocol === 'file:') ? './' : '/';

const HUB_URL = 'https://classic.jaime-gaming.com/?from=minesweeper';
const CLAVE_ORIGEN = 'minesweeper.from';

function llegaDelHub() {
  let origen = '';
  try {
    origen = new URLSearchParams(location.search).get('from') || '';
  } catch (err) {
    origen = '';
  }
  if (origen === 'hub') {
    try {
      sessionStorage.setItem(CLAVE_ORIGEN, 'hub');
    } catch (err) {

    }
    return true;
  }
  try {
    return sessionStorage.getItem(CLAVE_ORIGEN) === 'hub';
  } catch (err) {
    return false;
  }
}

const vieneDelHub = llegaDelHub();
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
  timer: $('#hud-timer'),
  best: $('#hud-best'),
  langSwitch: $('#lang-switch'),
  avisoFoco: $('#aviso-foco'),
  flagToggle: $('#flag-toggle'),
  app: $('#app'),
  luto: $('#luto'),
  barrido: $('#barrido'),
  ruido: $('#ruido'),
  lupa: $('#lupa'),
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

const FOCO_SEL = '.row:not(.stat), .acciones button, .mapa-nodo, .hub-volver';
let focoIndice = -1;

function ponerOverlay(html, variante) {
  const esBarra = Boolean(html) && (variante === 'muerte' || variante === 'victoria');
  if (!esBarra && huecoFin) {
    huecoFin = 0;
    el.stage.style.paddingBottom = '';
    ajustarLienzo();
  }
  el.overlay.classList.toggle('muerte', Boolean(html) && variante === 'muerte');
  el.overlay.classList.toggle('victoria', Boolean(html) && variante === 'victoria');
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
  const activo = document.activeElement;
  if (activo && activo.classList && activo.classList.contains('hub-volver')) {
    activo.click();
    return;
  }
  const filas = filasDelOverlay();
  const sel = filas[focoIndice];
  if (sel && typeof sel.click === 'function') sel.click();
}

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
    if (d < barridoPos - 1.3) continue;
    if (d > barridoPos + 1.3) continue;
    ctx.fillRect(celda.x * lado, celda.y * lado, lado + 0.5, lado + 0.5);
  }
}

function taparPantalla() {
  if (sinMovimiento()) return;

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

function panDe(j, x) {
  if (!j || j.columnas <= 1 || x == null) return 0;
  return (x - (j.columnas - 1) / 2) / ((j.columnas - 1) / 2);
}

const DURACION_RUIDO = 800;
const ruidoFx = { t: 0, pintado: 0, activo: false, persistente: false, lienzoBase: null, img: null, ctxBase: null, ctxLienzo: null };

function ajustarRuido() {
  const lienzo = el.ruido;
  if (!lienzo) return;
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  lienzo.width = Math.round(window.innerWidth * dpr);
  lienzo.height = Math.round(window.innerHeight * dpr);
  lienzo.style.width = `${window.innerWidth}px`;
  lienzo.style.height = `${window.innerHeight}px`;

  const ladoX = 180, ladoY = 100;
  if (!ruidoFx.lienzoBase) {
    ruidoFx.lienzoBase = document.createElement('canvas');
  }
  ruidoFx.lienzoBase.width = ladoX;
  ruidoFx.lienzoBase.height = ladoY;
  ruidoFx.ctxBase = ruidoFx.lienzoBase.getContext('2d');
  ruidoFx.ctxLienzo = lienzo.getContext('2d');
  ruidoFx.img = ruidoFx.ctxBase.createImageData(ladoX, ladoY);
}

function activarEfectoTv() {
  if (sinMovimiento()) return;
  if (ruidoFx.persistente) return;
  ajustarRuido();
  const lienzo = el.ruido;
  if (lienzo && lienzo.hidden) lienzo.hidden = false;
  ruidoFx.t = 0;
  ruidoFx.activo = true;
  ruidoFx.persistente = true;
  if (el.app) {
    el.app.classList.add('tv-muerte');
    el.app.classList.add('tv-entrada');
    setTimeout(() => el.app && el.app.classList.remove('tv-entrada'), 950);
  }
}

function desactivarEfectoTv() {
  if (!ruidoFx.activo && !ruidoFx.persistente) return;
  ruidoFx.activo = false;
  ruidoFx.persistente = false;
  const lienzo = el.ruido;
  if (lienzo) {
    const c = lienzo.getContext('2d');
    if (c) c.clearRect(0, 0, lienzo.width, lienzo.height);
    lienzo.hidden = true;
  }
  if (el.app) el.app.classList.remove('tv-muerte', 'tv-entrada');
}

const RETARDO_REVELADO = 1000;
let lutoTemporizador = 0;

function activarLuto() {
  const l = el.luto;
  if (!l) return;
  if (l.classList.contains('revelado')) return;
  l.classList.add('activo');
}

function revelarTableroFin() {
  const l = el.luto;
  if (!l || !l.classList.contains('activo')) return;
  l.classList.add('revelado');
}

function ocultarLuto() {
  const l = el.luto;
  if (l) l.classList.remove('activo', 'revelado');
  if (lutoTemporizador) {
    clearTimeout(lutoTemporizador);
    lutoTemporizador = 0;
  }
}

function pasoRuido(dt) {
  if (!ruidoFx.activo) return;
  ruidoFx.t += dt;
  ruidoFx.pintado += dt;
  const cadencia = ruidoFx.persistente ? 33 : 16;
  if (ruidoFx.pintado < cadencia) return;
  ruidoFx.pintado = 0;
  const progreso = clamp01(ruidoFx.t / DURACION_RUIDO);
  const lienzo = el.ruido;
  const ctx = ruidoFx.ctxLienzo || (lienzo ? lienzo.getContext('2d') : null);
  const { img, lienzoBase } = ruidoFx;
  const ctxBase = ruidoFx.ctxBase || (lienzoBase ? lienzoBase.getContext('2d') : null);
  if (ctx && img && lienzoBase && ctxBase) {
    const datos = img.data;
    const intensidad = ruidoFx.persistente ? 0.3 + (1 - progreso) * 0.28 : 1 - progreso * 0.72;
    for (let i = 0; i < datos.length; i += 4) {
      const v = Math.random() < 0.42 ? Math.random() * 255 : 0;
      datos[i] = v;
      datos[i + 1] = v;
      datos[i + 2] = v;
      datos[i + 3] = 255 * intensidad * (Math.random() < 0.8 ? 1 : 0.25);
    }
    ctxBase.putImageData(img, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, lienzo.width, lienzo.height);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 0.7;
    ctx.drawImage(lienzoBase, 0, 0, lienzo.width, lienzo.height);

    for (const banda of [0.31, 0.68]) {
      if (Math.random() < 0.55) {
        const sy = Math.floor(lienzo.height * banda * Math.random());
        const alto = Math.max(4, Math.floor(lienzo.height * (0.015 + Math.random() * 0.05)));
        const desplaz = (Math.random() - 0.5) * lienzo.width * 0.09;
        ctx.drawImage(lienzo, 0, sy, lienzo.width, alto, desplaz, sy, lienzo.width, alto);
      }
    }
    ctx.globalAlpha = 1;
  }
  if (progreso >= 1 && !ruidoFx.persistente) {
    ruidoFx.activo = false;
    if (el.ruido) {
      const c = el.ruido.getContext('2d');
      if (c) c.clearRect(0, 0, el.ruido.width, el.ruido.height);
      el.ruido.hidden = true;
    }
    if (el.app) el.app.classList.remove('tv-muerte', 'tv-entrada');
  }
}

const LUPA_LADO = 190;
const LUPA_ZOOM = 3;

function pintarLupa(evento) {
  const lienzo = el.lupa;
  const origen = el.canvas;
  if (!lienzo || !origen) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (lienzo.width !== LUPA_LADO * dpr) {
    lienzo.width = LUPA_LADO * dpr;
    lienzo.height = LUPA_LADO * dpr;
  }
  const rect = origen.getBoundingClientRect();

  const mx = (evento.clientX - rect.left) * (origen.width / rect.width);
  const my = (evento.clientY - rect.top) * (origen.height / rect.height);
  const lado = (LUPA_LADO * (origen.width / rect.width)) / LUPA_ZOOM;
  const sx = mx - lado / 2;
  const sy = my - lado / 2;
  const ctx = lienzo.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, lienzo.width, lienzo.height);

  const recorteX = Math.max(0, sx);
  const recorteY = Math.max(0, sy);
  const solapeX = Math.min(origen.width, sx + lado) - recorteX;
  const solapeY = Math.min(origen.height, sy + lado) - recorteY;
  if (solapeX > 0 && solapeY > 0) {
    ctx.drawImage(
      origen,
      recorteX, recorteY, solapeX, solapeY,
      (recorteX - sx) * (lienzo.width / lado), (recorteY - sy) * (lienzo.height / lado),
      solapeX * (lienzo.width / lado), solapeY * (lienzo.height / lado),
    );
  }

  const m = Math.round(9 * dpr);
  const largo = Math.round(16 * dpr);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1, Math.round(dpr));
  ctx.beginPath();
  ctx.moveTo(m, m + largo); ctx.lineTo(m, m); ctx.lineTo(m + largo, m);
  ctx.moveTo(lienzo.width - m - largo, m); ctx.lineTo(lienzo.width - m, m); ctx.lineTo(lienzo.width - m, m + largo);
  ctx.moveTo(m, lienzo.height - m - largo); ctx.lineTo(m, lienzo.height - m); ctx.lineTo(m + largo, lienzo.height - m);
  ctx.moveTo(lienzo.width - m - largo, lienzo.height - m); ctx.lineTo(lienzo.width - m, lienzo.height - m); ctx.lineTo(lienzo.width - m, lienzo.height - m - largo);
  ctx.stroke();

  const margen = 14;
  const ancho = LUPA_LADO;
  let x = evento.clientX + margen;
  let y = evento.clientY + margen;
  if (x + ancho > window.innerWidth - 8) x = evento.clientX - ancho - margen;
  if (y + ancho > window.innerHeight - 8) y = evento.clientY - ancho - margen;
  lienzo.style.left = `${Math.max(8, x)}px`;
  lienzo.style.top = `${Math.max(8, y)}px`;
  if (lienzo.hidden) lienzo.hidden = false;
}

function ocultarLupa() {
  if (el.lupa) el.lupa.hidden = true;
}

const PISTAS = {
  home: 'hintHome',
  modes: 'hintModes',
  custom: 'hintCustom',
  playing: 'hintGame',
  paused: 'hintPaused',
  dead: 'hintDead',
  won: 'hintWon',
  profile: 'hintProfile',
  settings: 'hintSettings',
  campaign: 'hintCampaign',
  story: 'hintStory',
  modifiers: 'hintModifiers',
};

function actualizarPista() {
  if (app.pantalla === 'playing') {
    el.hint.textContent = esTactil() ? t('hintGameTouch') : t('hintGame');
    return;
  }
  const clave = PISTAS[app.pantalla];
  el.hint.textContent = clave ? t(clave) : '';
}

function gestionarMusicaPantalla(nombre) {
  if (nombre === 'playing' || nombre === 'paused') {
    if (app.juego && !app.juego.terminada) {
      if (app.modo === 'modifiers' && app.modHard) {
        audio.musica('hardMod', 0, 1);
      } else if (app.modo === 'modifiers') {
        audio.musicaProc('modifiers');
      } else {
        audio.musica('ambience', 200, 1.4);
      }
    }
    return;
  }
  audio.pararMusica();
  audio.pararAmbiente();
}

function pantalla(nombre) {
  const antes = app.pantalla;
  app.pantalla = nombre;
  document.body.dataset.screen = nombre;
  el.flagToggle.hidden = !(nombre === 'playing' && esTactil());
  if (nombre !== 'playing') el.senal.classList.remove('visible');
  if (antes !== nombre) taparPantalla();
  if (antes === 'playing' && nombre !== 'playing') limpiarFondoRojo();
  if (nombre === 'intro') limpiarFondoRojo();
  gestionarMusicaPantalla(nombre);
  if (nombre === 'dead') activarEfectoTv();
  else {
    desactivarEfectoTv();
    ocultarLuto();
  }
  actualizarPista();
  if (RUTAS.listas && !RUTAS.restaurando) sincronizarRuta(false);
}

function escribirHud(meta, score, timer, best) {
  const hud = app.hud;
  if (hud.meta !== meta) { el.meta.textContent = meta; hud.meta = meta; }
  if (hud.score !== score) { el.score.textContent = score; hud.score = score; }
  if (hud.timer !== timer) { el.timer.textContent = timer; hud.timer = timer; }
  if (hud.best !== best) { el.best.textContent = best; hud.best = best; }
}

function hudMenu(meta) {
  escribirHud(meta, '—', '', '');
}

function actualizarMarcador() {
  const j = app.juego;
  if (!j) return;
  let meta;
  let bestTxt;
  if (app.modo === 'campaign') {
    meta = t('campaignHud', { n: dosDigitos((app.nivel || 0) + 1), name: nombreNivel(app.nivel || 0) });
    const bestNivel = guardado.campaign.best[app.nivel] || 0;
    bestTxt = bestNivel > 0 ? `${t('record')} ${formatoTiempo(bestNivel)}` : t('noRecord');
  } else if (app.modo === 'modifiers') {
    meta = t('modifiers');
    const activos = Object.keys(guardado.modificadores).filter((k) => guardado.modificadores[k]);
    if (activos.length) meta += ` · ${t(activos.length === 1 ? 'modActiva' : 'modActivas', { n: activos.length })}`;
    bestTxt = '';
  } else {
    meta = nombreDificultad(app.modo);
    const bestMs = esDificultadFija(app.modo) ? guardado.best[app.modo] : 0;
    bestTxt = esDificultadFija(app.modo)
      ? (bestMs > 0 ? `${t('record')} ${formatoTiempo(bestMs)}` : t('noRecord'))
      : t('diffCustom');
  }
  escribirHud(meta, String(j.minasRestantes), formatoTiempo(j.tiempoMs), bestTxt);
  if (el.timer) {
    const cuentaAtras = app.modo === 'modifiers' && guardado.modificadores.reloj && j.tiempoMs < 10000;
    el.timer.style.color = cuentaAtras ? '#ff2b2b' : '';
  }
}

let huecoFin = 0;
let casillaArmada = null;
const RETARDO_DOBLE = 400;
const RETARDO_INFORME = 1500;

function ajustarLienzo() {
  const j = app.juego;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const banda = el.stage.getBoundingClientRect();
  const bandaAncho = el.stage.clientWidth || banda.width;
  const bandaAlto = el.stage.clientHeight || banda.height;
  const columnas = j ? j.columnas : 9;
  const filas = j ? j.filas : 9;
  const margen = 4;
  const availW = Math.max(80, bandaAncho - margen);
  const availH = Math.max(80, bandaAlto - margen - huecoFin);
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

function nivelDemo() {
  return campañaSiguiente();
}

function crearDemo() {
  el.demoCtx = null;
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
  if (!candidatas.length) return null;
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

function filaHTML({ accion = null, campo = null, idx, nombre, detalle = '', derecha = '', peligro = false, stat = false, dim = false, acento = false, hecho = false, titulo = '' }) {
  const clases = ['row'];
  if (peligro) clases.push('peligro');
  if (stat) clases.push('stat');
  if (dim) clases.push('dim');
  if (acento) clases.push('acento');
  if (hecho) clases.push('hecho');
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

const botonHub = () => (vieneDelHub
  ? `<div class="hub-barra"><a class="hub-volver" href="${HUB_URL}"><span aria-hidden="true">←</span>${t('backToHub')}</a></div>`
  : '');

function mostrarPortada() {
  audio.pararMusica(1.0);
  app.juego = null;
  app.contado = false;
  const hechos = campañaHechos();
    const filas = [
      filaHTML({ accion: 'play', idx: 0, nombre: t('play'), detalle: t('playTag'), derecha: '↵' }),
      filaHTML({ accion: 'campaign', idx: 1, nombre: t('campaign'), detalle: t('campaignTag'), derecha: `${dosDigitos(hechos)}/30` }),
      filaHTML({ accion: 'playModifiers', idx: 2, nombre: t('modifiers'), detalle: t('modTagline'), derecha: '↵' }),
      filaHTML({ accion: 'profile', idx: 3, nombre: t('profile'), detalle: t('profileTag') }),
    ].join('');
  ponerOverlay(`<div class="panel inicio portada">
    <div class="inicio-texto">
      <header class="inicio-cabeza">
        <canvas id="logo-mine" class="logo-canvas" width="440" height="180" role="img" aria-label="minesweeper."></canvas>
        <p class="tagline">${t('brandTagline')}</p>
      </header>
      <nav class="filas" aria-label="${t('menuAria')}">${filas}</nav>
      <p class="pie">
        <button class="link" type="button" data-accion="settings">${t('settings')}</button>
      </p>
    </div>
    <aside class="inicio-demo">
      <p class="kicker" id="demo-titulo">${t('preview')}</p>
      <canvas id="demo" aria-label="${t('preview')}"></canvas>
      <p class="nota" id="demo-nota"></p>
    </aside>
  </div>${botonHub()}`);
  hudMenu('v1');
  pantalla('home');
  pintarLienzoVacio();
  const logo = document.getElementById('logo-mine');
  if (logo) dibujarLogo(logo);
  crearDemo();
  enfocarPrimero();
}

function dibujarLogo(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const DPR = 2;
  const texto = 'minesweeper';
  const alto = 104;
  ctx.font = '900 88px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const anchoTexto = Math.ceil(ctx.measureText(texto).width);

  const u = 2.6;
  const centroX = anchoTexto + 8 + 6 * u;
  const ancho = Math.ceil(centroX + 6 * u + 5);
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

  ctx.save();
  ctx.translate(centroX, y);
  ctx.scale(u, u);
  ctx.translate(-8, -8);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillRect(4, 6, 8, 4);
  ctx.fillRect(6, 4, 4, 8);
  ctx.fillRect(7, 2, 2, 2);
  ctx.fillRect(7, 12, 2, 2);
  ctx.fillRect(2, 7, 2, 2);
  ctx.fillRect(12, 7, 2, 2);
  ctx.fillRect(3, 3, 1.5, 1.5);
  ctx.fillRect(11.5, 3, 1.5, 1.5);
  ctx.fillRect(3, 11.5, 1.5, 1.5);
  ctx.fillRect(11.5, 11.5, 1.5, 1.5);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 6, 2, 1);
  ctx.fillRect(5, 7, 1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(9, 9, 2, 2);
  ctx.restore();
}

function detalleCustom() {
  const c = guardado.custom;
  return t('diffCustomTag', { filas: c.filas, columnas: c.columnas, minas: c.minas, unit: unitMinas(c.minas) });
}

function densidadCustom() {
  const c = guardado.custom;
  return Math.round((c.minas / (c.filas * c.columnas)) * 100);
}

const MAPA_ANCHO = 2400;
const MAPA_ALTO = 650;
const MAPA_RUTA = [
  [72, 505], [150, 390], [240, 465], [290, 330], [380, 400], [425, 250],
  [610, 505], [675, 380], [770, 445], [815, 295], [905, 360], [900, 220],
  [1180, 500], [1245, 375], [1335, 440], [1375, 290], [1465, 355], [1460, 210],
  [1750, 505], [1805, 410], [1865, 470], [1895, 350], [1955, 410], [1975, 290],
  [2035, 350], [2055, 230], [2115, 290], [2130, 170], [2195, 230], [2290, 105],
];
const MAPA_DIVISORES = [520, 1040, 1660];
const MAPA_ACTOS_X = [245, 780, 1340, 2005];
const MAPA_ROMANOS = ['I', 'II', 'III', 'IV'];

const TINTA = '#4a4a4a';
const TINTA_LEVE = '#2c2c2c';

const DIBUJOS = [

  `<g class="mapa-tinta" fill="none" stroke="${TINTA}" stroke-width="2.4">
    <circle cx="110" cy="86" r="27"/>
    <path d="M110 47v12M110 113v12M71 86h12M137 86h12"/>
    <path d="M110 66 L117 92 L110 86 L103 92 Z" fill="${TINTA}" stroke="none"/>
  </g>
  <text class="mapa-brujula" x="110" y="36" text-anchor="middle">N</text>`,

  `<g fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round">
    <rect x="55" y="190" width="104" height="64"/>
    <path d="M55 194 L107 236 L159 194"/>
  </g>`,
  `<g fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round">
    <path d="M300 158 L368 108 L436 158"/>
    <path d="M312 158 V208 H424 V158"/>
    <path d="M352 208 V170 H384 V208"/>
    <path d="M368 108 V72"/>
    <path d="M368 72 L404 80 L368 92" fill="${TINTA}" stroke="none"/>
  </g>`,

  `<path fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linejoin="round"
    d="M470 122 L477.6 138.6 L496.3 139.9 L482.7 152.4 L487.5 170.6 L470 160.6 L452.5 170.6 L457.3 152.4 L443.7 139.9 L462.4 138.6 Z"/>`,

  `<g fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round">
    <path d="M946 118 H1066 L1044 190 H968 Z"/>
    <path d="M936 118 L1006 66 L1076 118"/>
    <path d="M976 190 V252 M1036 190 V252 M1006 190 V236"/>
    <path d="M968 208 H1044"/>
  </g>`,
  `<g fill="none" stroke="${TINTA}" stroke-width="2.4">
    <path d="M652 592 a 38 14 0 0 1 76 0"/>
    <path d="M714 592 a 38 14 0 0 1 76 0"/>
    <path d="M776 592 a 38 14 0 0 1 76 0"/>
  </g>`,

  `<g fill="none" stroke="${TINTA}" stroke-width="2.6">
    <path d="M1236 158 L1312 108 L1388 158" stroke-linejoin="round"/>
    <path d="M1252 158 V132 M1300 158 V122 M1350 158 V122 M1368 158 V132"/>
    <line x1="1180" y1="150" x2="1440" y2="150" stroke-dasharray="3 10"/>
    <line x1="1180" y1="196" x2="1440" y2="196" stroke-dasharray="3 10"/>
  </g>`,
  `<g fill="none" stroke="${TINTA}" stroke-width="2.6" stroke-linecap="round">
    <path d="M1604 210 V96"/>
    <path d="M1572 128 H1636 M1580 168 H1628"/>
    <path d="M1622 78 a 40 40 0 0 1 44 26 M1622 106 a 66 66 0 0 1 72 44"/>
    <path d="M1586 78 a 40 40 0 0 0 -44 26 M1586 106 a 66 66 0 0 0 -72 44"/>
  </g>`,

  `<g fill="none" stroke="${TINTA}" stroke-width="2.4" stroke-linejoin="round">
    <path d="M1722 148 h72 v44 h-72 Z"/>
    <path d="M1794 160 h26 v32 h-26"/>
    <path d="M1734 148 v-20 h16 v20"/>
    <circle cx="1738" cy="204" r="7"/><circle cx="1772" cy="204" r="7"/><circle cx="1808" cy="204" r="7"/>
    <path d="M1710 214 H1844"/>
  </g>`,
  `<g stroke="${TINTA}" stroke-width="2.6" stroke-linejoin="round">
    <path d="M2282 268 L2346 218 L2410 268" fill="none"/>
    <path d="M2296 268 V342 H2396 V268" fill="#050505"/>
    <path d="M2332 342 V296 H2360 V342" fill="#ff2b2b" stroke="none"/>
  </g>`,

  `<g stroke="${TINTA_LEVE}" stroke-width="2.4" stroke-linecap="round">
    <path d="M540 84 v26 M530 94 h20"/>
    <path d="M1122 556 v22 M1114 564 h16"/>
    <path d="M2276 520 v22 M2268 528 h16"/>
  </g>`,

  `<text class="mapa-marca" x="245" y="428" text-anchor="middle">I</text>
   <text class="mapa-marca" x="780" y="438" text-anchor="middle">II</text>
   <text class="mapa-marca" x="1340" y="432" text-anchor="middle">III</text>
   <text class="mapa-marca" x="2005" y="442" text-anchor="middle">IV</text>`,
];

function curvaRuta(puntos) {
  if (!puntos.length) return '';
  if (puntos.length === 1) return `M ${puntos[0][0]} ${puntos[0][1]}`;
  let d = `M ${puntos[0][0]} ${puntos[0][1]}`;
  for (let i = 0; i < puntos.length - 1; i += 1) {
    const p0 = puntos[Math.max(0, i - 1)];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[Math.min(puntos.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function mapaSVG() {
  const total = NIVELES.length;
  const frontera = Math.min(Math.max(guardado.campaign.unlocked - 1, 0), total - 1);
  const recorrido = curvaRuta(MAPA_RUTA.slice(0, frontera + 1));
  const pendiente = frontera + 1 < total ? curvaRuta(MAPA_RUTA.slice(frontera)) : '';
  const divisores = MAPA_DIVISORES
    .map((x) => `<line x1="${x}" y1="30" x2="${x}" y2="596" stroke="#232323" stroke-width="1" stroke-dasharray="6 9"/>`)
    .join('');
  const rotulos = ACTOS.map((acto, i) => {
    const nombre = getLanguage() === 'en' ? acto.nombreEn : acto.nombreEs;
    return `<text class="mapa-acto" x="${MAPA_ACTOS_X[i]}" y="630" text-anchor="middle">${MAPA_ROMANOS[i]} · ${nombre}</text>`;
  }).join('');
  const dibujos = DIBUJOS.join('\n    ');
  return `<svg class="mapa-svg" viewBox="0 0 ${MAPA_ANCHO} ${MAPA_ALTO}" role="img" aria-label="${t('campaign')}">
    <defs>
      <pattern id="mapa-puntos" width="38" height="38" patternUnits="userSpaceOnUse">
        <circle cx="1.4" cy="1.4" r="1.4" fill="#161616"/>
      </pattern>
    </defs>
    <rect x="0" y="0" width="${MAPA_ANCHO}" height="${MAPA_ALTO}" fill="#040404"/>
    <rect x="0" y="0" width="${MAPA_ANCHO}" height="${MAPA_ALTO}" fill="url(#mapa-puntos)"/>
    <path d="M -20 152 Q 300 96 620 160 T 1240 138 T 1860 158 T 2460 120" fill="none" stroke="${TINTA_LEVE}" stroke-width="1.5" stroke-dasharray="2 10"/>
    <path d="M -20 372 Q 340 312 700 384 T 1330 356 T 1960 382 T 2460 330" fill="none" stroke="${TINTA_LEVE}" stroke-width="1.5" stroke-dasharray="2 10"/>
    ${dibujos}
    ${divisores}
    ${pendiente ? `<path d="${pendiente}" fill="none" stroke="#3d3d3d" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.1 14"/>` : ''}
    <path d="${recorrido}" fill="none" stroke="#f2f2f2" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <g class="mapa-escala">
      <line x1="2200" y1="560" x2="2372" y2="560" stroke="#3a3a3a" stroke-width="2"/>
      <line x1="2200" y1="553" x2="2200" y2="567" stroke="#3a3a3a" stroke-width="2"/>
      <line x1="2372" y1="553" x2="2372" y2="567" stroke="#3a3a3a" stroke-width="2"/>
      <text x="2286" y="545" text-anchor="middle">1 km</text>
    </g>
    <text class="mapa-sello" x="2382" y="48" text-anchor="end" transform="rotate(-6 2382 48)">${t('mapStamp')}</text>
    ${rotulos}
  </svg>`;
}

function mapaNodosHTML() {
  return NIVELES.map((nivel, i) => {
    const desbloqueado = i < guardado.campaign.unlocked;
    const mejor = guardado.campaign.best[i] || 0;
    const hecha = mejor > 0;
    const frontera = i === guardado.campaign.unlocked - 1 && !hecha;
    const clases = ['mapa-nodo'];
    if (!desbloqueado) clases.push('cerrada');
    else if (hecha) clases.push('hecha');
    else clases.push('actual', 'acento');
    const nombre = getLanguage() === 'en' ? nivel.nombreEn : nivel.nombreEs;
    const etiqueta = desbloqueado
      ? `${t('levelCell', { n: i + 1 })} · ${nombre}`
      : `${t('levelCell', { n: i + 1 })} · ${t('lockedShort')}`;
    const left = ((MAPA_RUTA[i][0] / MAPA_ANCHO) * 100).toFixed(3);
    const top = ((MAPA_RUTA[i][1] / MAPA_ALTO) * 100).toFixed(3);
    return `<button type="button" class="${clases.join(' ')}" data-mapa="${i}" data-accion="${desbloqueado ? `playCampaign:${i}` : 'lockedNode'}" style="left:${left}%;top:${top}%" aria-label="${etiqueta}"><span>${desbloqueado ? i + 1 : '··'}</span></button>`;
  }).join('');
}

function lateralMapaHTML(i) {
  const nivel = nivelCampana(i);
  const desbloqueado = i < guardado.campaign.unlocked;
  const mejor = guardado.campaign.best[i] || 0;
  const acto = actoDe(i);
  const nombreActoTxt = acto ? (getLanguage() === 'en' ? acto.nombreEn : acto.nombreEs) : '';
  const nombre = desbloqueado
    ? (getLanguage() === 'en' ? nivel.nombreEn : nivel.nombreEs)
    : '· · ·';
  const kicker = acto
    ? `${t('actLabel', { n: acto.id, name: nombreActoTxt })} · ${t('levelCell', { n: i + 1 })}`
    : t('levelCell', { n: i + 1 });
  let estado;
  if (!desbloqueado) estado = `<p class="mapa-estado cerrada">${t('campaignLocked')}</p>`;
  else if (mejor > 0) estado = `<p class="mapa-estado hecho">✓ ${t('clearedTag')} · ${formatoTiempo(mejor)}</p>`;
  else estado = `<p class="mapa-estado actual">→ ${t('campaignHere')}</p>`;
  const accion = desbloqueado
    ? `<button class="mapa-accion principal" id="mapa-accion" type="button" data-accion="mapDescend"><span>${mejor > 0 ? t('descendAgain') : t('descend')}</span><kbd>↵</kbd></button>`
    : `<button class="mapa-accion principal" id="mapa-accion" type="button" disabled><span>${t('lockedShort')}</span></button>`;
  return `<p class="kicker">${kicker}</p>
    <h3 class="mapa-nombre">${nombre}</h3>
    <p class="mapa-meta">${nivel.filas} × ${nivel.columnas} · ${nivel.minas} ${unitMinas(nivel.minas)}</p>
    ${estado}
    ${accion}
    <p class="nota">${t('storyDossier')}</p>`;
}

function seleccionarNodoMapa(i, silencioso = false) {
  const nivel = nivelCampana(i);
  if (!nivel) return;
  app.mapaSel = i;
  el.overlay.querySelectorAll('.mapa-nodo').forEach((nodo) => {
    nodo.classList.toggle('sel', Number(nodo.getAttribute('data-mapa')) === i);
  });
  const lateral = document.getElementById('mapa-lateral');
  if (lateral) lateral.innerHTML = lateralMapaHTML(i);
  const nodos = Array.from(el.overlay.querySelectorAll('.mapa-nodo'));
  const pos = nodos.findIndex((n) => Number(n.getAttribute('data-mapa')) === i);
  if (pos >= 0) focoIndice = pos;
  if (!silencioso) audio.play('ui');
}

function mostrarCampaña() {
  app.juego = null;
  const hechos = campañaHechos();
  const frontera = Math.min(Math.max(guardado.campaign.unlocked - 1, 0), NIVELES.length - 1);
  ponerOverlay(`<div class="panel campana mapa-panel">
    <div class="niveles-cabeza">
      <div>
        <p class="kicker">${t('campaign')} · <b id="campana-cifra">00</b>/${NIVELES.length}</p>
        <h2 class="campana-titulo">${t('campaignTagShort')}</h2>
      </div>
      ${botonVolver()}
    </div>
    <p class="mapa-nota">${hechos >= NIVELES.length ? t('campaignComplete') : t('campaignPrologue')}</p>
    <div class="mapa-cuerpo">
      <div class="mapa-marco">
        <div class="mapa">${mapaSVG()}${mapaNodosHTML()}</div>
        <p class="mapa-leyenda"><span class="lg lg-hecha"></span>${t('clearedTag')}<span class="punto">·</span><span class="lg lg-actual"></span>${t('campaignHereShort')}<span class="punto">·</span><span class="lg lg-cerrada"></span>${t('lockedShort')}<span class="punto">·</span><span class="leyenda-scroll">${t('mapScroll')}</span></p>
      </div>
      <aside class="mapa-lateral" id="mapa-lateral">${lateralMapaHTML(frontera)}</aside>
    </div>
  </div>`);
  pantalla('campaign');
  hudMenu(`${t('campaign')} · ${dosDigitos(hechos)}/${NIVELES.length}`);
  animarCifra(document.getElementById('campana-cifra'), hechos, (v) => dosDigitos(Math.round(v)));
  seleccionarNodoMapa(frontera, true);

  const nodos = el.overlay.querySelectorAll('.mapa-nodo');
  const nodo = nodos && nodos[frontera];
  if (nodo && typeof nodo.scrollIntoView === 'function') {
    nodo.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}

function mostrarHistoria(indice) {
  const nivel = nivelCampana(indice);
  if (!nivel || indice >= guardado.campaign.unlocked) {
    mostrarCampaña();
    return;
  }
  app.historia = indice;
  app.historiaLinea = 0;
  renderHistoria();
}

function renderHistoria() {
  const indice = app.historia;
  const linea = Math.max(0, Math.floor(Number(app.historiaLinea) || 0));
  const nivel = nivelCampana(indice);
  if (!nivel) return;
  const idioma = getLanguage();
  const dialogo = nivel.dialogo || [];
  const beat = dialogo[linea];
  const completo = linea >= dialogo.length;
  const nombre = idioma === 'en' ? nivel.nombreEn : nivel.nombreEs;
  const acto = actoDe(indice);
  const nombreActoTxt = idioma === 'en' ? acto.nombreEn : acto.nombreEs;
  const quienTxt = beat ? t(`quien${beat.quien[0].toUpperCase()}${beat.quien.slice(1)}`) : '';
  const texto = beat ? (idioma === 'en' ? beat.en : beat.es) : '';
  const completado = (guardado.campaign.best[indice] || 0) > 0;
  ponerOverlay(`<div class="panel historia">
    <p class="kicker">${t('actLabel', { n: acto.id, name: nombreActoTxt })} · ${t('levelCell', { n: indice + 1 })}</p>
    <h2 class="historia-titulo">${nombre}</h2>
    <div class="escena-bloque">
      <canvas id="escena" class="escena-canvas" width="360" height="240" aria-label="escena"></canvas>
    </div>
    ${beat ? `<div class="dialogo">
      <p class="dialogo-quien">${quienTxt}</p>
      <p class="dialogo-texto">${texto}</p>
    </div>
    <p class="dialogo-avance">${dosDigitos(linea + 1)} / ${dosDigitos(dialogo.length)}</p>` : ''}
    <div class="acciones">
      ${completo
        ? `<button class="principal" type="button" data-accion="descend"><span>${completado ? t('descendAgain') : t('descend')}</span><kbd>↵</kbd></button>`
        : `<button class="principal" type="button" data-accion="dialogNext"><span>${t('dialogoSiguiente')}</span><kbd>↵</kbd></button>`}
      <button type="button" data-accion="back"><span>${t('back')}</span><kbd>Esc</kbd></button>
    </div>
  </div>`);
  pantalla('story');
  hudMenu(t('campaignHud', { n: dosDigitos(indice + 1), name: nombre }));
  enfocarPrimero();
  const cv = document.getElementById('escena');
  if (cv) dibujarEscena(cv, nivel.escena || 'campo');
}

function pasarLineaHistoria() {
  const indice = app.historia;
  const nivel = nivelCampana(indice);
  if (!nivel) return;
  const total = (nivel.dialogo || []).length;
  if ((app.historiaLinea || 0) >= total) return;
  app.historiaLinea += 1;
  audio.unlock();
  audio.play('ui');
  renderHistoria();
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
  hudMenu(t('difficulty'));
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
  hudMenu(t('diffCustom'));
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

function pasoVolumen(delta) {
  guardado.volumen = Math.max(0, Math.min(100, (Number(guardado.volumen) || 0) + (Number(delta) || 0)));
  audio.setVolumen(guardado.volumen);
  guardar();
  audio.play('ui');
  const marca = el.overlay.querySelector('[data-ajuste^="volumen"]');
  const valor = marca && marca.closest('.paso') ? marca.closest('.paso').querySelector('b') : null;
  if (valor) valor.textContent = `${guardado.volumen} %`;
}

function pintarLienzoVacio() {
  if (!el.lienzoCtx) el.lienzoCtx = el.canvas.getContext('2d');
  ajustarLienzo();
  const ctx = el.lienzoCtx;
  ctx.setTransform(vista.dpr, 0, 0, vista.dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, vista.width, vista.height);
}

function empezarPartida(modo, nivel = null, datos = {}) {
  app.demo = null;
  app.modo = modo;
  app.nivel = modo === 'campaign' ? nivel : null;
  let cfg = modo === 'campaign' ? configNivel(nivel) : configDeModo(modo);
  if (!cfg) {
    mostrarCampaña();
    return;
  }
  if (modo === 'modifiers') {
    const c = { ...guardado.custom };
    const mods = { ...guardado.modificadores };
    let minas = c.minas;
    if (mods.minasExtra) minas = Math.floor(minas * 1.4);
    minas = Math.max(1, Math.min(minas, c.filas * c.columnas - 1));
    const segundos = Math.max(30, Math.floor((c.filas * c.columnas) / 3));
    cfg = { filas: c.filas, columnas: c.columnas, minas, mods, relojSegundos: mods.reloj ? segundos : 0 };
  }
  app.juego = new Game(cfg, eventosJuego);
  app.modHard = modo === 'modifiers' && guardado.modificadores.hard;
  app.modsActivos = Object.keys(guardado.modificadores).some((k) => guardado.modificadores[k]);
  if (!datos || !datos.saltarIntro) {
    if (app.modsActivos) {
      mostrarIntroMod();
      return;
    }
    if (app.modHard) {
      audio.musica('hardMod', 0, 1);
      prepararFondoRojo();
    } else {
      app.modHard = false;
      limpiarFondoRojo();
    }
  } else {
    if (app.modHard) {
      audio.musica('hardMod', 0, 1);
      prepararFondoRojo();
    } else {
      app.modHard = false;
      limpiarFondoRojo();
    }
  }
  casillaArmada = null;
  app.record = false;
  app.contado = false;
  app.flagMode = false;
  el.flagToggle.setAttribute('aria-pressed', 'false');
  el.flagToggle.classList.remove('activo');
  ponerOverlay(null);
  ocultarLupa();
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
  j.pausado = true;

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
  s.timeMs = (s.timeMs || 0) + Math.max(0, Math.floor((app.juego && app.juego.tiempoMs) || 0));
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
      audio.play('reveal', { size: datos && datos.size, pan: panDe(j, (datos && datos.x != null ? datos.x : (j.hover ? j.hover.x : j.cursor.x))) });
      el.senal.classList.remove('visible');
      break;
    case 'chord':
      audio.play('chord', { pan: panDe(j, datos && datos.x != null ? datos.x : j.cursor.x) });
      break;
    case 'flag':
      audio.play('flag', { pan: panDe(j, datos && datos.x != null ? datos.x : j.cursor.x) });
      break;
    case 'unflag':
      audio.play('unflag', { pan: panDe(j, datos && datos.x != null ? datos.x : j.cursor.x) });
      break;
    case 'boom': {
      contabilizarFin(false);
      audio.pararAmbiente(0);
      activarLuto();
      if (typeof navigator.vibrate === 'function') navigator.vibrate([50, 40, 90]);
      audio.play('boom');
      const destello = document.getElementById('flash');
      if (destello) {
        destello.classList.remove('activo');
        void destello.offsetWidth;
        destello.classList.add('activo');
      }
      setTimeout(() => {
        if (app.juego === j && j.estado === 'perdido') mostrarFinPerdida();
      }, RETARDO_INFORME);
      break;
    }
    case 'win':
      contabilizarFin(true);
      setTimeout(() => {
        if (app.juego === j && j.estado === 'ganado') mostrarFinGanada();
      }, 850);
      break;
    case 'screech':
      audio.play('screech', { pan: panDe(j, j.cursor.x) });
      break;
    case 'eyes':
      audio.play('eyes', { pan: panDe(j, j.cursor.x) });
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
  audio.musica('win', 0, 1.1);
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
  const totalSeguras = j.cfg.filas * j.cfg.columnas - j.cfg.minas;
  const despejadas = typeof j.tablero.despejadasPorJugador === 'number' ? j.tablero.despejadasPorJugador : totalSeguras;
  let tercera;
  if (enCampaña || fija) {
    const mejorMs = enCampaña ? (guardado.campaign.best[app.nivel] || 0) : (guardado.best[app.modo] || 0);
    tercera = datoFin(mejorMs > 0 ? formatoTiempo(mejorMs) : '—', t('statBest'));
  } else {
    tercera = datoFin(j.cfg.minas, t('statMines'));
  }
  const kicker = `${etiquetaPartida()} · ${t('clearedTag')}${app.record ? ` · ${t('newRecord')}` : ''}`;
  ponerBarraFin({
    variante: 'victoria',
    kicker,
    titulo: t('youWon'),
    susurro: t('winWhisper'),
    stats: `${datoFin(formatoTiempo(j.tiempoMs), t('statTime'))}${datoFin(`${despejadas}/${totalSeguras}`, t('statCleared'))}${tercera}`,
    parcela: parcelaPartida(j, enCampaña),
    acciones: accionesFin({ hayMas: true }),
    pantallaId: 'won',
  });
}

function datoFin(valor, etiqueta) {
  return `<div class="fin-dato"><b>${valor}</b><span>${etiqueta}</span></div>`;
}

function parcelaPartida(j, enCampaña) {
  return enCampaña
    ? `${t('parcelTag')} · ${nombreNivel(app.nivel || 0)}`
    : `${t('parcelTag')} · ${j.cfg.columnas} × ${j.cfg.filas} · ${j.cfg.minas} ${unitMinas(j.cfg.minas)}`;
}

function ponerBarraFin({ variante, kicker, titulo, susurro, stats, parcela, acciones, pantallaId }) {
  ponerOverlay(`<div class="panel fin-barra fin-${variante}">
    <header class="fin-cabeza">
      <p class="kicker">${kicker}</p>
      <h2 class="cifra ${variante === 'victoria' ? 'limpia' : 'derrota'}">${titulo}</h2>
      <p class="fin-susurro">${susurro}</p>
      <div class="fin-stats">${stats}</div>
      <p class="fin-parcela">${parcela}</p>
    </header>
    <div class="acciones">
      ${acciones}
    </div>
  </div>`, variante);
  pantalla(pantallaId);
  enfocarPrimero();

  const panel = el.overlay.querySelector('.fin-barra');
  const alto = panel ? Math.ceil(panel.offsetHeight || panel.getBoundingClientRect().height) : 0;
  if (alto > 0) {
    const banda = el.stage.getBoundingClientRect();
    const solape = Math.max(0, Math.round(banda.bottom - (window.innerHeight - alto)));
    huecoFin = solape;
    el.stage.style.paddingBottom = `${solape}px`;
    ajustarLienzo();
  }
}

function mostrarFinPerdida() {
  const j = app.juego;
  if (!j) return;
  audio.musica('death', 0, 1.2);
  const l = el.luto;
  if (!l || !l.classList.contains('revelado')) {
    activarLuto();
    if (lutoTemporizador) clearTimeout(lutoTemporizador);
    lutoTemporizador = setTimeout(() => {
      lutoTemporizador = 0;
      revelarTableroFin();
    }, RETARDO_REVELADO);
  }
  const totalSeguras = j.cfg.filas * j.cfg.columnas - j.cfg.minas;
  const despejadas = typeof j.tablero.despejadasPorJugador === 'number' ? j.tablero.despejadasPorJugador : 0;
  const enCampaña = app.modo === 'campaign';
  const mejor = enCampaña ? (guardado.campaign.best[app.nivel] || 0) : 0;
  const tercera = enCampaña
    ? datoFin(mejor > 0 ? formatoTiempo(mejor) : '—', t('statBest'))
    : datoFin(j.cfg.minas, t('statMines'));
  ponerBarraFin({
    variante: 'muerte',
    kicker: `${etiquetaPartida()} · ${t('casualtyTag')}`,
    titulo: t('youLost'),
    susurro: t('deathWhisper'),
    stats: `${datoFin(formatoTiempo(j.tiempoMs), t('statTime'))}${datoFin(`${despejadas}/${totalSeguras}`, t('statCleared'))}${tercera}`,
    parcela: parcelaPartida(j, enCampaña),
    acciones: accionesFin({ hayMas: false }),
    pantallaId: 'dead',
  });
}

function filaStat(idx, nombre, valor) {
  return filaHTML({ idx, nombre, derecha: valor, stat: true });
}

function datoCifra(valor, etiqueta, cuenta, formato) {
  const inner = cuenta === null
    ? `<b>${valor}</b>`
    : `<b data-cuenta="${cuenta}" data-formato="${formato}">0</b>`;
  return `<div class="dato-cifra">${inner}<span>${etiqueta}</span></div>`;
}

function mostrarModificadores() {
  app.juego = null;
  const mods = guardado.modificadores;
  const c = guardado.custom;
  const activos = Object.keys(mods).filter((k) => mods[k]).length;
  const filas = [
    filaHTML({ accion: 'toggleMod:minasExtra', idx: 0, nombre: t('modMinesExtra'), detalle: t('modMinesExtraTag'), derecha: mods.minasExtra ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:reloj', idx: 1, nombre: t('modReloj'), detalle: t('modRelojTag'), derecha: mods.reloj ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:sinBandera', idx: 2, nombre: t('modSinBandera'), detalle: t('modSinBanderaTag'), derecha: mods.sinBandera ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:panico', idx: 3, nombre: t('modPanico'), detalle: t('modPanicoTag'), derecha: mods.panico ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:hard', idx: 4, nombre: t('modHard'), detalle: t('modHardTag'), derecha: mods.hard ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:niebla', idx: 5, nombre: t('modNiebla'), detalle: t('modNieblaTag'), derecha: mods.niebla ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:rush', idx: 6, nombre: t('modRush'), detalle: t('modRushTag'), derecha: mods.rush ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:screech', idx: 7, nombre: t('modScreech'), detalle: t('modScreechTag'), derecha: mods.screech ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:glitch', idx: 8, nombre: t('modGlitch'), detalle: t('modGlitchTag'), derecha: mods.glitch ? t('on') : t('off') }),
    filaHTML({ accion: 'toggleMod:eyes', idx: 9, nombre: t('modEyes'), detalle: t('modEyesTag'), derecha: mods.eyes ? t('on') : t('off') }),
  ];
  filas.push(filaHTML({
    accion: 'modifiersStart',
    idx: 10,
    nombre: t('start'),
    detalle: `${c.filas} × ${c.columnas} · ${c.minas} ${unitMinas(c.minas)}`,
    derecha: activos > 0 ? `${activos} ${t(activos === 1 ? 'modActiva' : 'modActivas').replace('{n}', String(activos))} · ↵` : '↵',
  }));
  ponerOverlay(`<div class="panel">
    ${cabeceraPanel(t('modifiers'), botonVolver())}
    <p class="nota">${t('modTagline')}</p>
    <nav class="filas" aria-label="${t('modifiers')}">${filas.join('')}</nav>
  </div>`);
  pantalla('modifiers');
  hudMenu(t('modifiers'));
  enfocarPrimero();
}

function prepararFondoRojo() {
  if (el.fondoRojo) return;
  const fr = document.createElement('canvas');
  fr.id = 'fondoRojo';
  fr.style.position = 'fixed';
  fr.style.inset = '0';
  fr.style.zIndex = '5';
  fr.style.pointerEvents = 'none';
  fr.style.display = 'block';
  document.body.appendChild(fr);
  el.fondoRojo = fr;
  ajustarFondoRojo();
}

function limpiarFondoRojo() {
  if (el.fondoRojo) {
    el.fondoRojo.remove();
    el.fondoRojo = null;
  }
}

function ajustarFondoRojo() {
  const fr = el.fondoRojo;
  if (!fr) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  fr.width = Math.round(window.innerWidth * dpr);
  fr.height = Math.round(window.innerHeight * dpr);
  fr.style.width = `${window.innerWidth}px`;
  fr.style.height = `${window.innerHeight}px`;
}

function dibujarPuerta(ctx, w, h, segundos) {
  const t = segundos;
  const progreso = (t % 13) / 13;
  const cx = w / 2;
  const cy = h / 2;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  let escala = 1;
  let balanceo = 0;
  let brillo = 0;
  let glitch = 0;

  if (progreso < 0.30) {
    escala = 0.55 + progreso * 0.5;
    balanceo = Math.sin(t * 2.2) * 0.06;
    brillo = 0.25 + progreso * 0.35;
  } else if (progreso < 0.69) {
    escala = 2.0 + (progreso - 0.30) * 1.8;
    balanceo = Math.sin(t * 3.5) * 0.12;
    brillo = 0.6 + (progreso - 0.30) * 0.4;
  } else if (progreso < 0.92) {
    escala = 8.5 + (progreso - 0.69) * 3.5;
    balanceo = Math.sin(t * 8) * 0.35;
    brillo = 1.0;
  } else {
    escala = 13.5 + (progreso - 0.92) * 2;
    balanceo = Math.sin(t * 14) * 0.6;
    brillo = 1.0;
    glitch = (progreso - 0.92) * 6;
  }

  const brilloGrad = ctx.createRadialGradient(
    cx, cy - h * 0.35 + brillo * 120, 0,
    cx, cy - h * 0.35 + brillo * 120, w * (0.6 + brillo * 0.9)
  );
  brilloGrad.addColorStop(0, `rgba(255, 255, 255, ${Math.min(1, brillo * 0.55)})`);
  brilloGrad.addColorStop(0.45, `rgba(255, 43, 43, ${brillo * 0.25})`);
  brilloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = brilloGrad;
  ctx.fillRect(0, 0, w, h);

  const puertaAn = w * 0.28 * escala;
  const puertaAl = h * 0.72 * escala;
  const puertaX = cx - puertaAn / 2 + Math.sin(balanceo) * w * 0.12;
  const puertaY = cy - puertaAl / 2;

  ctx.save();
  ctx.translate(puertaX + puertaAn / 2, puertaY + puertaAl / 2);
  ctx.rotate(balanceo);
  ctx.translate(-puertaAn / 2, -puertaAl / 2);

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, puertaAn, puertaAl);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = Math.max(2, Math.round(puertaAn * 0.03));
  ctx.strokeRect(0, 0, puertaAn, puertaAl);

  ctx.fillStyle = '#222';
  ctx.fillRect(puertaAn * 0.08, puertaAl * 0.12, puertaAn * 0.42, puertaAl * 0.34);
  ctx.fillRect(puertaAn * 0.50, puertaAl * 0.12, puertaAn * 0.42, puertaAl * 0.34);
  ctx.fillRect(puertaAn * 0.08, puertaAl * 0.54, puertaAn * 0.42, puertaAl * 0.34);
  ctx.fillRect(puertaAn * 0.50, puertaAl * 0.54, puertaAn * 0.42, puertaAl * 0.34);

  ctx.fillStyle = '#8a2be2';
  ctx.beginPath();
  ctx.arc(puertaAn * 0.82, puertaAl * 0.5, puertaAn * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5b21b6';
  ctx.beginPath();
  ctx.arc(puertaAn * 0.82, puertaAl * 0.5, puertaAn * 0.018, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 + brillo * 0.25})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 6; i += 1) {
    const angulo = (i / 6) * Math.PI * 2 + t * 0.1;
    const largo = 500 + Math.sin(t + i) * 80;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angulo) * 40, cy + Math.sin(angulo) * 40);
    ctx.lineTo(cx + Math.cos(angulo) * largo, cy + Math.sin(angulo) * largo);
    ctx.stroke();
  }

  if (glitch > 0.05) {
    const intensidad = Math.min(1, glitch);
    ctx.save();
    ctx.globalAlpha = 0.35 * intensidad;
    for (let i = 0; i < 12; i += 1) {
      const y = Math.random() * h;
      const dh = Math.random() * h * 0.12 + 4;
      const dx = (Math.random() - 0.5) * w * 0.15 * intensidad;
      ctx.drawImage(ctx.canvas, dx, y, w, dh, dx, y, w, dh);
    }
    ctx.restore();

    ctx.fillStyle = `rgba(120, 0, 0, ${0.35 * intensidad})`;
    ctx.fillRect(0, 0, w, h);
  }
}

function mostrarIntroMod() {
  audio.unlock();
  app.juego = null;
  app.introT = 0;
  app.introDuracion = 13000; // 0 → 13 s, cuajado con IntroMod.ogg
  const html = '<div class="panel intro">' +
    '<canvas id="introCanvas" class="intro-canvas" aria-hidden="true"></canvas>' +
    '</div>';
  ponerOverlay(html);
  pantalla('intro');
  audio.musica('introMod', 0, 1);
  const cv = document.getElementById('introCanvas');
  if (cv) {
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    app.introCtx = cv.getContext('2d');
  }
  enfocarPrimero();
}

function finalizarIntro() {
  if (app.introCtx) app.introCtx = null;
  empezarPartida('modifiers', null, { saltarIntro: true });
}


function mostrarPerfil() {
  app.juego = null;
  const s = guardado.stats;
  const hechos = campañaHechos();
  const tasaCruda = s.games > 0 ? Math.round((s.wins / s.games) * 100) : null;
  const tiempo = (id) => (guardado.best[id] > 0 ? formatoTiempo(guardado.best[id]) : '—');
  const sumaMejores = Object.values(guardado.campaign.best)
    .reduce((acc, valor) => acc + (Number(valor) || 0), 0);
  const cifras = [
    datoCifra(String(s.games), t('statsGames'), s.games, 'int'),
    datoCifra(String(s.wins), t('statsWins'), s.wins, 'int'),
    tasaCruda === null
      ? datoCifra('—', t('statsWinRate'), null, 'int')
      : datoCifra('0%', t('statsWinRate'), tasaCruda, 'pct'),
    datoCifra(String(s.bestStreak), t('statsBestStreak'), s.bestStreak, 'int'),
  ].join('');
  const ticks = NIVELES.map((_, i) => {
    const clases = ['tick'];
    if ((guardado.campaign.best[i] || 0) > 0) clases.push('hecho');
    else if (i === guardado.campaign.unlocked - 1) clases.push('actual');
    return `<span class="${clases.join(' ')}"></span>`;
  }).join('');
  const records = [
    filaStat(6, t('statsBeginner'), tiempo('beginner')),
    filaStat(7, t('statsIntermediate'), tiempo('intermediate')),
    filaStat(8, t('statsExpert'), tiempo('expert')),
  ].join('');
  const campana = [
    filaStat(9, t('statsCampaign'), `${dosDigitos(hechos)}/${NIVELES.length} · ${t('statsCampaignTag')}`),
    filaStat(10, t('statsCampaignTotal'), sumaMejores > 0 ? formatoTiempo(sumaMejores) : '—'),
    filaStat(11, t('statsFieldTime'), s.timeMs > 0 ? formatoTiempo(s.timeMs) : '—'),
  ].join('');
  const peligro = filaHTML({
    accion: 'resetProgress',
    idx: 12,
    nombre: t('resetProgress'),
    detalle: t('resetProgressTag'),
    derecha: '⌫',
    peligro: true,
  });
  ponerOverlay(`<div class="panel perfil">
    <div class="niveles-cabeza">
      <div>
        <p class="kicker">${t('storyDossier')}</p>
        <h2 class="panel-titulo">${t('profileTitle')}</h2>
      </div>
      ${botonVolver()}
    </div>
    <div class="perfil-cifras">${cifras}</div>
    <p class="grupo">${t('campaign')} · ${dosDigitos(hechos)}/${NIVELES.length}</p>
    <div class="perfil-ticks" role="img" aria-label="${t('statsCampaign')} ${hechos}/${NIVELES.length}">${ticks}</div>
    <div class="filas">${campana}</div>
    <p class="grupo">${t('record')}</p>
    <div class="filas">${records}</div>
    <div class="filas">${peligro}</div>
  </div>`);
  pantalla('profile');
  hudMenu(t('profile'));
  enfocarPrimero();
  el.overlay.querySelectorAll('[data-cuenta]').forEach((nodo) => {
    const objetivo = Number(nodo.getAttribute('data-cuenta')) || 0;
    const formato = nodo.getAttribute('data-formato') === 'pct'
      ? (v) => `${Math.round(v)}%`
      : (v) => String(Math.round(v));
    animarCifra(nodo, objetivo, formato);
  });
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
  hudMenu(t('resetProgress'));
  enfocarPrimero();
}

function borrarTodo() {
  try {
    localStorage.removeItem(CLAVE);
  } catch (err) {
    
  }
  const limpio = nuevoRegistro();
  guardado.best = limpio.best;
  guardado.stats = limpio.stats;
  guardado.campaign = limpio.campaign;
  guardado.sound = limpio.sound;
  guardado.trama = limpio.trama;
  guardado.dobleClick = limpio.dobleClick;
  guardado.custom = limpio.custom;
  guardado.volumen = limpio.volumen;
  aplicarSonido();
  audio.setVolumen(100);
  document.documentElement.classList.toggle('trama', guardado.trama);
  guardar();
  if (app.resetDesde === 'settings') mostrarAjustes();
  else mostrarPerfil();
  el.hint.textContent = t('resetDone');
}

function mostrarAjustes() {
  const sonido = guardado.sound ? t('soundOn') : t('soundOff');
  const trama = guardado.trama ? t('on') : t('off');
  const doble = guardado.dobleClick ? t('on') : t('off');
  ponerOverlay(`<div class="panel ajustes">
    <div class="niveles-cabeza">
      <div>
        <p class="kicker">v1</p>
        <h2 class="panel-titulo">${t('settingsTitle')}</h2>
      </div>
      ${botonVolver()}
    </div>
    <p class="grupo">${t('groupAudio')}</p>
    <nav class="filas" aria-label="${t('groupAudio')}">
      ${filaHTML({ accion: 'toggleSound', idx: 0, nombre: t('settingSound'), detalle: 'M', derecha: sonido })}
      <div class="row paso-row" role="group" data-campo="volumen" aria-label="${t('settingVolume')}">
        <span class="row-idx">02</span>
        <span class="row-name">${t('settingVolume')}<small>${t('settingVolumeTag')}</small></span>
        <span class="paso">
          <button type="button" data-ajuste="volumen:-25" aria-label="− ${t('settingVolume')}">−</button>
          <b>${guardado.volumen} %</b>
          <button type="button" data-ajuste="volumen:25" aria-label="+ ${t('settingVolume')}">+</button>
        </span>
      </div>
    </nav>
    <p class="grupo">${t('groupImage')}</p>
    <nav class="filas" aria-label="${t('groupImage')}">
      ${filaHTML({ accion: 'toggleTrama', idx: 2, nombre: t('settingTrama'), detalle: t('settingTramaTag'), derecha: trama })}
    </nav>
    <p class="grupo">${t('groupGame')}</p>
    <nav class="filas" aria-label="${t('groupGame')}">
      ${filaHTML({ accion: 'toggleDobleClick', idx: 3, nombre: t('settingDouble'), detalle: t('settingDoubleTag'), derecha: doble })}
    </nav>
    <p class="grupo">${t('groupData')}</p>
    <nav class="filas" aria-label="${t('groupData')}">
      ${filaHTML({ accion: 'resetProgress', idx: 4, nombre: t('resetProgress'), detalle: t('resetProgressTag'), derecha: '⌫', peligro: true })}
    </nav>
  </div>`);
  pantalla('settings');
  hudMenu(t('settings'));
  enfocarPrimero();
}

function ejecutar(nombre) {
  audio.unlock();
  if (!nombre) return;
  if (nombre.startsWith('toggleMod:')) {
    const clave = nombre.slice('toggleMod:'.length);
    if (clave in guardado.modificadores) {
      guardado.modificadores[clave] = !guardado.modificadores[clave];
      guardar();
      audio.play('ui');
      mostrarModificadores();
    }
    return;
  }
  if (nombre.startsWith('play:')) {
    empezarPartida(nombre.slice(5));
    return;
  }
  if (nombre.startsWith('playCampaign:')) {
    const i = Number(nombre.slice(13));
    if (!Number.isInteger(i) || i < 0 || i >= NIVELES.length) return;
    if (i >= guardado.campaign.unlocked) {
      audio.play('locked');
      return;
    }
    if (app.pantalla === 'campaign') {

      if (app.mapaSel === i) mostrarHistoria(i);
      else seleccionarNodoMapa(i);
      return;
    }
    mostrarHistoria(i);
    return;
  }
  switch (nombre) {
    case 'play': mostrarDificultades(); return;
    case 'campaign': mostrarCampaña(); return;
    case 'playModifiers': mostrarModificadores(); return;
    case 'modifiersStart': {
      if (guardado.modificadores.hard) mostrarIntroMod();
      else empezarPartida('modifiers');
      return;
    }
    case 'lockedNode': audio.play('locked'); return;
    case 'mapDescend': {
      const i = app.mapaSel;
      if (Number.isInteger(i) && i >= 0 && i < guardado.campaign.unlocked && i < NIVELES.length) {
        mostrarHistoria(i);
      } else {
        audio.play('locked');
      }
      return;
    }
    case 'dialogNext': pasarLineaHistoria(); return;
    case 'descend':
      if (app.historia !== null && app.historia !== undefined) empezarPartida('campaign', app.historia);
      return;
    case 'nextLevel':
      if (haySiguienteNivel()) mostrarHistoria(app.nivel + 1);
      return;
    case 'profile': mostrarPerfil(); return;
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
    case 'toggleDobleClick':
      guardado.dobleClick = !guardado.dobleClick;
      casillaArmada = null;
      if (app.juego) app.juego.casillaArmada = null;
      guardar();
      mostrarAjustes();
      audio.play('ui');
      return;
    case 'back': volverAtras(); return;
    case 'resetProgress':
      app.resetDesde = app.pantalla === 'settings' ? 'settings' : 'profile';
      mostrarConfirmacionBorrado();
      return;
    case 'confirmResetWipe': borrarTodo(); return;
    case 'cancelReset':
      if (app.resetDesde === 'settings') mostrarAjustes();
      else mostrarPerfil();
      return;
    default: return;
  }
}

function fijarScroll(paso) {
  el.overlay.scrollTop += paso * 72;
}

function ajustarPasoFocused(delta) {
  if (app.pantalla !== 'custom' && app.pantalla !== 'settings') return;
  const filas = filasDelOverlay();
  const nodo = filas[focoIndice];
  if (!nodo) return;
  const campo = nodo.getAttribute('data-campo');
  if (campo === 'volumen') pasoVolumen(delta * 25);
  else if (campo) pasoPersonalizado(campo, delta);
}

function volverAtras() {
  switch (app.pantalla) {
    case 'paused': reanudar(); return;
    case 'modes': mostrarPortada(); return;
    case 'custom': mostrarDificultades(); return;
    case 'campaign': mostrarPortada(); return;
    case 'modifiers': mostrarPortada(); return;
    case 'story': mostrarCampaña(); return;
    case 'profile':
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
          if (app.flagMode) {
            casillaArmada = null;
            j.casillaArmada = null;
            j.alternarBanderaEn(datos.x, datos.y);
          } else if (guardado.dobleClick) {

            const ahora = Date.now();
            if (casillaArmada && casillaArmada.x === datos.x && casillaArmada.y === datos.y && ahora - casillaArmada.t <= RETARDO_DOBLE) {
              casillaArmada = null;
              j.casillaArmada = null;
              j.pulsar(datos.x, datos.y);
            } else {
              casillaArmada = { x: datos.x, y: datos.y, t: ahora };
              j.casillaArmada = { x: datos.x, y: datos.y };
            }
          } else {
            casillaArmada = null;
            j.casillaArmada = null;
            j.pulsar(datos.x, datos.y);
          }
        } else {
          j.confirmarCursor();
        }
        actualizarMarcador();
        return;
      case 'flag':
        if (datos && datos.puntero) {
          casillaArmada = null;
          j.casillaArmada = null;
          j.alternarBanderaEn(datos.x, datos.y);
        } else {
          j.alternarBanderaCursor();
        }
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
      default: return;
    }
  }

  if (app.pantalla === 'campaign'
    && (nombre === 'up' || nombre === 'down' || nombre === 'left' || nombre === 'right')) {
    const delta = (nombre === 'up' || nombre === 'left') ? -1 : 1;
    const actual = Number.isInteger(app.mapaSel) ? app.mapaSel : 0;
    seleccionarNodoMapa((actual + delta + NIVELES.length) % NIVELES.length, false);
    const nodos = filasDelOverlay();
    if (nodos[focoIndice] && typeof nodos[focoIndice].scrollIntoView === 'function') {
      nodos[focoIndice].scrollIntoView({ block: 'nearest', inline: 'center' });
    }
    return;
  }
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

function coincideRuta(segmento, clave) {
  return (ALIAS_RUTA[clave] || []).includes(segmento);
}

function rutaActual() {
  let camino = location.pathname;
  try {
    camino = decodeURIComponent(camino);
  } catch (error) {

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
  pasoRuido(dt);
  const j = app.juego;
  if (j) {
    if (casillaArmada && Date.now() - casillaArmada.t > RETARDO_DOBLE) {
      casillaArmada = null;
      j.casillaArmada = null;
    }
    j.update(dt);
    renderJuego();
    actualizarMarcador();
  }

  // Intro del modo Modificadores (Hard): animación de portal 0 → 13 s.
  if (app.pantalla === 'intro' && app.introCtx) {
    const cv = document.getElementById('introCanvas');
    if (cv) {
      app.introT += dt;
      dibujarPortal(app.introCtx, cv.width, cv.height, app.introT / 1000);
      if (app.introT >= app.introDuracion) {
        app.introCtx = null;
        finalizarIntro();
      }
    }
  }

  // Fondo rojo reaccionando a la música en el modo Hard.
  if (app.pantalla === 'playing' && app.modHard && el.fondoRojo) {
    const fr = el.fondoRojo;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    fr.width = Math.round(window.innerWidth * dpr);
    fr.height = Math.round(window.innerHeight * dpr);
    fr.style.width = `${window.innerWidth}px`;
    fr.style.height = `${window.innerHeight}px`;
    const ctx = fr.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    audio.dibujarFondoRojo(ctx, window.innerWidth, window.innerHeight);
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

function aplicarSonido() {
  audio.enabled = guardado.sound;
  audio.set(guardado.sound);
  gestionarMusicaPantalla(app.pantalla);
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
  modifiers: mostrarModificadores,
  modes: mostrarDificultades,
  custom: () => mostrarPersonalizada(),
  profile: mostrarPerfil,
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
  audio.setVolumen(guardado.volumen);
  aplicarIdiomaBase();

  el.langSwitch.value = getLanguage();
  el.langSwitch.addEventListener('change', cambiarIdioma);

  registrarConversorPunto(conversorDePuntos);
  attachInput({ stage: el.stage, actions: (nombre, repetido, datos) => accion(nombre, repetido, datos) });

  el.overlay.addEventListener('click', (evento) => {
    const ajuste = evento.target && evento.target.closest ? evento.target.closest('[data-ajuste]') : null;
    if (ajuste) {
      const [campo, delta] = ajuste.getAttribute('data-ajuste').split(':');
      if (campo === 'volumen') pasoVolumen(Number(delta));
      return;
    }
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
    if (app.pantalla === 'dead' && evento.pointerType !== 'touch') pintarLupa(evento);
    else ocultarLupa();
  });
  el.canvas.addEventListener('pointerleave', () => {
    const j = app.juego;
    if (j) j.hover = null;
    ocultarLupa();
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

  const alRedimensionar = () => {
    ajustarLienzo();
    ajustarBarrido();
    if (ruidoFx.activo) ajustarRuido();
  };
  if (window.ResizeObserver) {
    try {
      new ResizeObserver(alRedimensionar).observe(el.stage);
    } catch (err) {
      window.addEventListener('resize', alRedimensionar);
    }
  } else {
    window.addEventListener('resize', alRedimensionar);
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
