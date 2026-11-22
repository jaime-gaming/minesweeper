let ctx = null;
let master = null;
let musicGain = null;
let pan = null;
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

    musicGain.connect(master);
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
};

export const audio = {
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
