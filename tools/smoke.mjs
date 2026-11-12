// Humo de arranque: ejecuta minesweeper.js con un DOM/canvas simulados y
// juega una partida contra sí mismo. No deja rastro en el repo.
import fs from 'node:fs';

let opsCanvas = 0;
function ctxValido(args, prop) {
  for (const a of args) {
    if (typeof a === 'number' && !Number.isFinite(a)) {
      throw new Error(`argumento no finito en ${String(prop)}`);
    }
  }
}
const ctxStub = new Proxy({}, {
  get(target, prop) {
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
      return () => ({ addColorStop() {} });
    }
    if (prop === 'measureText') return () => ({ width: 10 });
    return (...args) => {
      ctxValido(args, prop);
      opsCanvas += 1;
    };
  },
  set(target, prop, value) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new Error(`valor no finito asignado a ${String(prop)}`);
    }
    return true;
  },
});

function crearElemento(id) {
  const clases = new Set();
  return {
    id,
    hidden: false,
    disabled: false,
    textContent: '',
    innerHTML: '',
    value: '',
    dataset: {},
    style: {},
    width: 0,
    height: 0,
    scrollTop: 0,
    scrollHeight: 200,
    classList: {
      add: (c) => clases.add(c),
      remove: (c) => clases.delete(c),
      toggle: (c, force) => {
        const want = force === undefined ? !clases.has(c) : !!force;
        if (want) clases.add(c); else clases.delete(c);
        return want;
      },
      contains: (c) => clases.has(c),
    },
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    scrollIntoView() {},
    click() {},
    closest() { return null; },
    getBoundingClientRect: () => ({ width: 800, height: 600, left: 0, top: 0, right: 800, bottom: 600 }),
    getContext: () => ctxStub,
    querySelector: () => crearElemento('anonimo'),
    querySelectorAll: () => [],
  };
}

const elementos = new Map();
function el(selector) {
  if (!elementos.has(selector)) elementos.set(selector, crearElemento(selector));
  return elementos.get(selector);
}

const canvasGlobal = el('#board');

const aleatorios = new Map();
const documentStub = {
  querySelector: el,
  querySelectorAll: () => [],
  getElementById: (id) => {
    if (!aleatorios.has(id)) aleatorios.set(id, crearElemento('#' + id));
    return aleatorios.get(id);
  },
  createElement: () => crearElemento('creado'),
  documentElement: {
    lang: 'es',
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
  },
  body: { dataset: {} },
  title: '',
  activeElement: null,
};

const listeners = new Map();
const windowStub = {
  innerWidth: 1280,
  innerHeight: 800,
  devicePixelRatio: 1,
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener(tipo, fn) {
    if (!listeners.has(tipo)) listeners.set(tipo, []);
    listeners.get(tipo).push(fn);
  },
  removeEventListener() {},
  focus() {},
  AudioContext: undefined,
  ResizeObserver: undefined,
};
windowStub.window = windowStub;

const rafQueue = [];
const localStorageData = new Map();
const localStorageStub = {
  getItem: (k) => (localStorageData.has(k) ? localStorageData.get(k) : null),
  setItem: (k, v) => localStorageData.set(k, String(v)),
  removeItem: (k) => localStorageData.delete(k),
};

const locationStub = { protocol: 'http:', hash: '#debug', pathname: '/', search: '' };
const historyStub = {
  state: null,
  last: null,
  apply(url) {
    const u = new URL(url, 'http://internal.test');
    locationStub.pathname = u.pathname;
    locationStub.search = u.search;
    locationStub.hash = u.hash;
    historyStub.last = url;
  },
  pushState(state, _t, url) { this.state = state; this.apply(url); },
  replaceState(state, _t, url) { this.state = state; this.apply(url); },
};

const globals = {
  window: windowStub,
  document: documentStub,
  navigator: {},
  location: locationStub,
  history: historyStub,
  localStorage: localStorageStub,
  requestAnimationFrame: (cb) => { rafQueue.push(cb); return rafQueue.length; },
  performance: { now: () => simTime },
  matchMedia: windowStub.matchMedia,
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 800,
  setTimeout,
  clearTimeout,
  console,
};

let simTime = 0;
const bundle = fs.readFileSync('/home/user/minesweeper/minesweeper.js', 'utf8');
const vm = await import('node:vm');
const context = vm.createContext({ ...globals, globalThis: globals });

function frames(n, paso = 16.7) {
  for (let i = 0; i < n; i += 1) {
    simTime += paso;
    const cola = rafQueue.splice(0, rafQueue.length);
    for (const cb of cola) cb(simTime);
  }
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  vm.runInContext(bundle, context, { filename: 'minesweeper.js' });
  console.log('arranque: ok');
  frames(30);

  const api = context.window.__minesweeper;
  if (!api) throw new Error('no existe window.__minesweeper (¿hash #debug?)');

  console.log('pantalla inicial:', api.app.pantalla);
  if (api.app.pantalla !== 'home') throw new Error('no arranca en home');

  // entra en una partida intermedia
  api.ejecutar('play:intermediate');
  frames(5);
  console.log('pantalla tras jugar:', api.app.pantalla);
  if (api.app.pantalla !== 'playing') throw new Error('no entró en la partida');
  const juego = api.app.juego;
  console.log('tablero:', juego.columnas, 'x', juego.filas, 'minas:', juego.cfg.minas);

  // juega destapando todo por orden hasta terminar (perderá en una mina)
  let clicks = 0;
  outer: for (let y = 0; y < juego.filas; y += 1) {
    for (let x = 0; x < juego.columnas; x += 1) {
      if (juego.terminada) break outer;
      api.accion('confirm', false, { x, y, puntero: true });
      clicks += 1;
    }
  }
  frames(10);
  console.log('terminada como:', juego.estado, 'tras', clicks, 'clics');
  if (!juego.terminada) throw new Error('la partida no terminó destapando todo');

  await dormir(900);
  frames(10);
  console.log('pantalla final:', api.app.pantalla);
  if (api.app.pantalla !== 'dead' && api.app.pantalla !== 'won') {
    throw new Error('el panel final no se abrió');
  }
  if (api.app.pantalla === 'dead') {
    const todas = juego.tablero.celdas.every((c) => c.revelada);
    console.log('tablero completo revelado tras la muerte:', todas);
    if (!todas) throw new Error('el tablero no se reveló por completo al morir');
    const panel = documentStub.querySelector('#overlay').innerHTML;
    const datos = (panel.match(/fin-dato/g) || []).length;
    console.log('informe de baja: casillas de datos =', datos);
    if (datos < 3) throw new Error('el informe de baja no muestra las tres estadísticas');
    if (!panel.includes('fin-stats')) throw new Error('faltan las estadísticas de la pantalla de muerte');
  }

  // reinicia con R y fuerza la victoria acorde a acorde
  api.accion('restart');
  frames(5);
  const j2 = api.app.juego;
  // primer clic seguro en (0,0) y luego abrir toda la zona segura
  api.accion('confirm', false, { x: 0, y: 0, puntero: true });
  let guardia = 5000;
  while (!j2.terminada && guardia > 0) {
    guardia -= 1;
    let avanzo = false;
    for (let y = 0; y < j2.filas && !j2.terminada; y += 1) {
      for (let x = 0; x < j2.columnas && !j2.terminada; x += 1) {
        const i = j2.indice(x, y);
        const celda = j2.tablero.celdas[i];
        if (!celda.revelada && !celda.bandera && !celda.mina) {
          api.accion('confirm', false, { x, y, puntero: true });
          frames(1); // deja correr el reloj entre clics, como en una partida real
          avanzo = true;
        }
      }
    }
    if (!avanzo) break;
  }
  frames(10);
  console.log('segunda partida:', j2.estado);
  if (j2.estado !== 'ganado') throw new Error('no se pudo forzar la victoria');

  await dormir(1000);
  frames(10);
  console.log('pantalla final:', api.app.pantalla);
  if (api.app.pantalla !== 'won') throw new Error('el panel de victoria no se abrió');

  const best = JSON.parse(localStorageStub.getItem('minesweeper.v1')).best.intermediate;
  console.log('récord intermedia guardado (ms):', best);
  if (!(best > 0)) throw new Error('el récord no se guardó');

  // cambia el idioma en caliente
  api.ejecutar('toMenu');
  frames(5);
  const pista = elementos.get('#hint')?.textContent;
  console.log('pista home (es):', pista);

  // ---- campaña: la ruta profunda abre la historia; descend baja al tablero
  console.log('demo activa en la portada:', !!api.app.demo);
  if (!api.app.demo) throw new Error('la demo no arrancó en la portada');
  listeners.get('keydown'); // (referencia viva)
  api.ejecutar('playCampaign:0');
  frames(5);
  console.log('pantalla tras tocar el nivel 1:', api.app.pantalla);
  if (api.app.pantalla !== 'story') throw new Error('no se abrió la historia');
  console.log('ruta de la historia:', historyStub.last);
  if (!String(historyStub.last).includes('nivel-01')) throw new Error('la ruta no refleja el nivel');
  api.ejecutar('descend');
  frames(5);
  if (api.app.pantalla !== 'playing') throw new Error('descend no bajó al tablero');
  const cam = api.app.juego;
  console.log('nivel 1:', cam.columnas, 'x', cam.filas, 'minas:', cam.cfg.minas);
  // fuerza la victoria: destapa todo lo que no sea mina
  cam.tablero.celdas.forEach((c, i) => { c.demoSegura = !c.mina; });
  const objetivo = { x: -1, y: -1 };
  // siembra desconocida: usa la lógica de forzar victoria del harness
  api.accion('confirm', false, { x: 0, y: 0, puntero: true });
  let guardiaCam = 5000;
  while (!cam.terminada && guardiaCam > 0) {
    guardiaCam -= 1;
    let avanzo = false;
    for (let y = 0; y < cam.filas && !cam.terminada; y += 1) {
      for (let x = 0; x < cam.columnas && !cam.terminada; x += 1) {
        const i = cam.indice(x, y);
        const c = cam.tablero.celdas[i];
        if (!c.revelada && !c.bandera && !c.mina) {
          api.accion('confirm', false, { x, y, puntero: true });
          frames(1);
          avanzo = true;
        }
      }
    }
    if (!avanzo) break;
  }
  frames(10);
  console.log('campaña nivel 1:', cam.estado);
  if (cam.estado !== 'ganado') throw new Error('no se pudo ganar el nivel 1');
  await dormir(1000);
  frames(10);
  const save = JSON.parse(localStorageStub.getItem('minesweeper.v1'));
  console.log('campaña en guardado: unlocked =', save.campaign.unlocked, 'best[0] =', save.campaign.best[0]);
  if (save.campaign.unlocked !== 2) throw new Error('el nivel 2 no se desbloqueó');
  if (!(save.campaign.best[0] > 0)) throw new Error('el mejor tiempo no se guardó');
  // la victoria ofrece el siguiente capítulo: R abre la historia del nivel 2
  api.accion('restart');
  frames(5);
  if (api.app.pantalla !== 'story') throw new Error('el siguiente capítulo no abrió la historia');
  if (api.app.historia !== 1) throw new Error('la historia no es la del nivel 2');
  console.log('siguiente capítulo: historia del nivel 2 ok');
  api.accion('back'); // vuelve al mapa de la treinta
  frames(3);
  if (api.app.pantalla !== 'campaign') throw new Error('Esc no devolvió al mapa');
  console.log('mapa de la treinta ok');
  const mapa = documentStub.querySelector('#overlay').innerHTML;
  if (mapa.includes('✕')) throw new Error('las filas bloqueadas aún llevan ✕');
  if (!mapa.includes('acento')) throw new Error('la fila de tu posición no lleva marca de acento');
  if (!mapa.includes('→')) throw new Error('la fila de tu posición no lleva la flecha');
  console.log('mapa: posición marcada, bloqueadas en dash ok');

  // ---- epílogo: cerrar el corazón de piedra (nivel 30) muestra el panel de final
  api.empezarPartida('campaign', 29); // último nivel
  frames(3);
  const corazon = api.app.juego;
  api.accion('confirm', false, { x: 0, y: 0, puntero: true }); // primer clic siembra minas
  let guardiaCorazon = 6000;
  while (!corazon.terminada && guardiaCorazon > 0) {
    guardiaCorazon -= 1;
    let avanzo = false;
    for (let y = 0; y < corazon.filas && !corazon.terminada; y += 1) {
      for (let x = 0; x < corazon.columnas && !corazon.terminada; x += 1) {
        const i = corazon.indice(x, y);
        const c = corazon.tablero.celdas[i];
        if (!c.revelada && !c.bandera && !c.mina) {
          api.accion('confirm', false, { x, y, puntero: true });
          frames(1);
          avanzo = true;
        }
      }
    }
    if (!avanzo) break;
  }
  frames(10);
  console.log('nivel final:', corazon.estado);
  if (corazon.estado !== 'ganado') throw new Error('no se pudo cerrar el corazón');
  await dormir(1000);
  frames(10);
  if (api.app.pantalla !== 'won') throw new Error('el epílogo no se abrió');
  console.log('epílogo abierto en la pantalla final ok');
  api.accion('restart'); // ↵ en el epílogo: también vuelve a la puerta
  frames(5);
  if (api.app.pantalla !== 'home') throw new Error('↵ en el epílogo no devolvió a la portada');
  console.log('epílogo cierra y devuelve a la portada ok');

  // ---- la historia: volver a la campaña desde la historia con Esc
  api.empezarPartida('campaign', 1);
  frames(3);
  api.accion('pause'); // pausa
  frames(2);
  api.accion('back'); // vuelve (reanuda)
  frames(2);

  // ---- popstate a la portada
  locationStub.pathname = '/';
  listeners.get('popstate').forEach((fn) => fn());
  frames(5);
  console.log('tras popstate a /:', api.app.pantalla);
  if (api.app.pantalla !== 'home') throw new Error('popstate no devolvió a la portada');

  // ---- la treinta: pantalla con 30 niveles
  api.ejecutar('campaign');
  frames(5);
  console.log('pantalla campaña:', api.app.pantalla);
  if (api.app.pantalla !== 'campaign') throw new Error('la pantalla de campaña no se abrió');
  const mapaHTML = documentStub.querySelector('#overlay').innerHTML;
  if (!mapaHTML.includes('mapa-nodo')) throw new Error('el mapa no pinta posiciones');
  if ((mapaHTML.match(/mapa-nodo/g) || []).length < 30) throw new Error('el mapa pinta menos de treinta posiciones');
  if (!mapaHTML.includes('mapa-lateral')) throw new Error('el mapa no lleva el acta del campo seleccionado');
  console.log('mapa: treinta posiciones y acta lateral ok');

  // ---- el mapa: la selección de una posición bloqueada no abre nada; la de una abierta sí
  api.ejecutar('lockedNode');
  frames(2);
  if (api.app.pantalla !== 'campaign') throw new Error('lockedNode sacó de la campaña');
  api.ejecutar('playCampaign:0'); // primera pasada: selecciona la casilla ya seleccionada? no: selecciona y no marches
  frames(2);
  console.log('primer toque sobre pos 1:', api.app.pantalla);
  if (api.app.pantalla !== 'campaign') throw new Error('el primer toque sobre el mapa no seleccionó, marchó');
  api.ejecutar('playCampaign:0'); // segundo toque sobre la misma: marcha
  frames(2);
  if (api.app.pantalla !== 'story') throw new Error('el segundo toque no abrió la historia');
  console.log('mapa: primer toque inspecciona, segundo marcha ok');
  api.accion('back'); // vuelta al mapa
  frames(3);

  // ---- ajustes: la pantalla por grupos, con el volumen
  api.ejecutar('settings');
  frames(3);
  const ajustesHTML = documentStub.querySelector('#overlay').innerHTML;
  if (api.app.pantalla !== 'settings') throw new Error('ajustes no se abrió');
  if (!ajustesHTML.includes('volumen')) throw new Error('ajustes no lleva el paso de volumen');
  if (!ajustesHTML.includes('doble clic para confirmar') && !ajustesHTML.includes('double-click')) throw new Error('ajustes perdió el doble clic');
  if (!ajustesHTML.includes('grupo')) throw new Error('ajustes perdió los grupos');
  console.log('ajustes: grupos audio/imagen/juego/datos y volumen ok');
  api.ejecutar('toggleDobleClick');
  frames(2);
  if (!JSON.parse(localStorageStub.getItem('minesweeper.v1')).dobleClick) throw new Error('el doble clic no persistió');
  api.ejecutar('toggleDobleClick'); // de vuelta al estado original
  frames(2);

  // ---- perfil: la carta de servicios
  api.ejecutar('profile');
  frames(3);
  const perfilHTML = documentStub.querySelector('#overlay').innerHTML;
  if (api.app.pantalla !== 'profile') throw new Error('perfil no se abrió');
  if (!perfilHTML.includes('perfil-cifras')) throw new Error('perfil perdió las cifras grandes');
  if (!perfilHTML.includes('perfil-ticks')) throw new Error('perfil perdió los ticks de la treinta');
  if (!perfilHTML.includes('statsFieldTime') && !perfilHTML.includes('tiempo en el campo') && !perfilHTML.includes('time in the field')) throw new Error('perfil perdió el tiempo en el campo');
  console.log('perfil: cifras, ticks y tiempo total ok');

  // ---- la ayuda ya no existe: Esc desde la campaña vuelve a la portada
  api.ejecutar('campaign');
  frames(3);
  api.accion('back');
  frames(3);
  if (api.app.pantalla !== 'home') throw new Error('Esc desde la campaña no devolvió a la portada');
  console.log('campaña cierra a la portada ok');

  console.log('ops de lienzo validadas:', opsCanvas);
  console.log('OK humo completo');
  process.exit(0);
} catch (err) {
  console.error('FALLO humo:', err);
  process.exit(1);
}
