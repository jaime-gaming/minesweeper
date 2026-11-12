import { Game } from './engine.js?v=9';
import {
  DIFICULTADES,
  DIFICULTAD_POR_DEFECTO,
  normalizarPersonalizada,
  dificultadPorId,
  esDificultadFija,
  limitesMinas,
} from './presets.js?v=1';
import { audio } from './audio.js?v=9';
import { attachInput, registrarConversorPunto } from './input.js?v=1';
import { t, getLanguage, setLanguage, unitMinas, routeSlug, routeWords } from './i18n.js?v=19';
import { NIVELES, ACTOS, configNivel, nivelCampana, actoDe } from './campaign.js?v=7';

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
  resetDesde: 'profile',
  hud: { meta: '', score: '', timer: '', best: '' },
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

const FOCO_SEL = '.row:not(.stat), .acciones button, .mapa-nodo';
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
    if (app.juego && !app.juego.terminada) audio.musica('ambience', 200, 1.4);
    return;
  }
  audio.pararAmbiente();
}

function pantalla(nombre) {
  const antes = app.pantalla;
  app.pantalla = nombre;
  document.body.dataset.screen = nombre;
  el.flagToggle.hidden = !(nombre === 'playing' && esTactil());
  if (nombre !== 'playing') el.senal.classList.remove('visible');
  if (antes !== nombre) taparPantalla();
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
  } else {
    meta = nombreDificultad(app.modo);
    const bestMs = esDificultadFija(app.modo) ? guardado.best[app.modo] : 0;
    bestTxt = esDificultadFija(app.modo)
      ? (bestMs > 0 ? `${t('record')} ${formatoTiempo(bestMs)}` : t('noRecord'))
      : t('diffCustom');
  }
  escribirHud(meta, String(j.minasRestantes), formatoTiempo(j.tiempoMs), bestTxt);
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

function mostrarPortada() {
  audio.pararMusica(1.0);
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
        <button class="link" type="button" data-accion="settings">${t('settings')}</button>
      </p>
    </div>
    <aside class="inicio-demo">
      <p class="kicker" id="demo-titulo">${t('preview')}</p>
      <canvas id="demo" aria-label="${t('preview')}"></canvas>
      <p class="nota" id="demo-nota"></p>
    </aside>
  </div>`);
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
  hudMenu(t('campaignHud', { n: dosDigitos(indice + 1), name: nombre }));
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

function empezarPartida(modo, nivel = null) {
  app.demo = null;
  app.modo = modo;
  app.nivel = modo === 'campaign' ? nivel : null;
  const cfg = modo === 'campaign' ? configNivel(nivel) : configDeModo(modo);
  if (!cfg) {
    mostrarCampaña();
    return;
  }
  app.juego = new Game(cfg, eventosJuego);
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
