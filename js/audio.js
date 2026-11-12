// Sonido sintetizado en tiempo real para los efectos; la victoria y la
// derrota llevan su propia pieza (audio/Win.mp3 / audio/Death.mp3), y el
// estallido usa audio/Boom.mp3 (recortado a seis décimas de segundo).

let ctx = null;
let master = null;
let musicGain = null;
let noiseBuf = null;
let roto = false;
let nivelMusica = 1; // 0..1; las piezas del final van del archivo, más bajas

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
    musicGain.gain.value = 1.5 * nivelMusica; // las piezas llegan bajas del archivo: aquí se equilibran

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

    const len = Math.floor(ctx.sampleRate * 2); // 2 s: la explosión respira
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    precargarEfectos();
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
  const ataque = Math.max(0.001, opts.ataque ?? Math.min(0.008, dur * 0.2));

  src.buffer = noiseBuf;
  filtro.type = 'lowpass';
  filtro.frequency.setValueAtTime(opts.desde || 2400, t0);
  filtro.frequency.exponentialRampToValueAtTime(opts.hasta || 120, t0 + dur);
  gan.gain.setValueAtTime(0.0001, t0);
  gan.gain.exponentialRampToValueAtTime(volumen, t0 + ataque);
  gan.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filtro).connect(gan).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function boomSintetico() {
    // capa 1 — el estruendo: ruido ancho que cae en barrido largo
    ruido(1.7, { desde: 1050, hasta: 52, vol: 0.5, ataque: 0.002 });
    // capa 2 — el cuerpo: un sub que muere muy abajo, como la onda de presión
    tono(57, 1.25, { tipo: 'sine', vol: 0.42, fin: 29, release: 0.6 });
    // capa 3 — el crack metálico: el chasquido que rompe el aire
    tono(150, 0.2, { tipo: 'sawtooth', vol: 0.28, fin: 58 });
    tono(320, 0.09, { tipo: 'square', vol: 0.12, fin: 180, delay: 0.012 });
    // capa 4 — los escombros: metralla breve justo por encima, con retardo
    ruido(0.42, { desde: 3400, hasta: 640, vol: 0.17, delay: 0.085, ataque: 0.004 });
    // capa 5 — el eco en el valle: casi nada, pero sigue vivo un segundo
    ruido(1.15, { desde: 320, hasta: 58, vol: 0.2, delay: 0.27 });
    tono(41, 0.9, { tipo: 'triangle', vol: 0.15, fin: 26, delay: 0.22, release: 0.5 });
}

const MUSICA = {
  win: 'audio/Win.mp3',
  death: 'audio/Death.mp3',
};

// el estallido real del jugador; si no carga, la explosión sintética lo sustituye
const EFECTOS = {
  boom: 'audio/Boom.mp3',
};

const buffersFx = new Map(); // nombre -> Promise<AudioBuffer>
const fxListos = new Map();  // nombre -> AudioBuffer ya decodificado

function precargarEfectos() {
  if (!ctx) return;
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
    gan.gain.setTargetAtTime(0.0001, t, fade / 4);
    src.stop(t + fade + 0.25);
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
    const c = ctx;
    const buf = fxListos.get('boom');
    if (c && buf) {
      try {
        const src = c.createBufferSource();
        const gan = c.createGain();
        gan.gain.value = 1.8; // la bomba es el suceso del juego: que se oiga desde la calle
        src.buffer = buf;
        src.connect(gan).connect(master);
        src.start(c.currentTime + 0.001);
        return;
      } catch (err) {
        /* si el estallido del archivo falla, suena la síntesis */
      }
    }
    boomSintetico();
  },
  ui() {
    tono(460, 0.028, { tipo: 'square', vol: 0.045 });
  },
  locked() {
    tono(120, 0.075, { tipo: 'triangle', vol: 0.09, fin: 95 });
  },
};

export const audio = {
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

  // volumen de las piezas (0–100). los efectos no lo tocan: la bomba manda
  setVolumen(porcentaje) {
    const v = Math.max(0, Math.min(100, Math.round(Number(porcentaje) || 0)));
    nivelMusica = v / 100;
    if (!musicGain || !ctx) return;
    try {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(1.5 * nivelMusica, ctx.currentTime, 0.05);
    } catch (err) {
      musicGain.gain.value = 1.5 * nivelMusica;
    }
  },

  // fanfarria de victoria o derrota: entra con fade, sale al siguiente paso
  musica(nombre, retardoMs = 0, fundido = 1.2) {
    if (!this.enabled || !MUSICA[nombre]) return;
    const c = build();
    if (!c) return;
    detenerMusicaActual(0.85);
    const gen = generacion;
    cargarMusica(nombre).then((buf) => {
      if (gen !== generacion || !this.enabled) return; // se pidió otra cosa entretanto
      const gan = c.createGain();
      gan.gain.setValueAtTime(0.0001, c.currentTime);
      gan.gain.exponentialRampToValueAtTime(1, c.currentTime + Math.max(0.05, fundido));
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
  pararMusica(fade = 0.9) {
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
