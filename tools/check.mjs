// comprobaciones del juego, sin navegador.
//   node tools/check.mjs
// prueba las reglas del tablero, los topes de las dificultades y que los
// dos idiomas digan lo mismo. sale con código 1 si algo falla.

import { Tablero } from '../js/board.js';
import {
  DIFICULTADES,
  LIMITES_PERSONALIZADA,
  dificultadPorId,
  esDificultadFija,
  limitesMinas,
  normalizarPersonalizada,
} from '../js/presets.js';
import { __testClaves, t, unitMinas } from '../js/i18n.js';
import { ACTOS, NIVELES, configNivel, nivelCampana, actoDe } from '../js/campaign.js';

let fallos = 0;
let pruebas = 0;

function prueba(nombre, fn) {
  pruebas += 1;
  try {
    fn();
    process.stdout.write(`  ✓ ${nombre}\n`);
  } catch (err) {
    fallos += 1;
    process.stderr.write(`  ✗ ${nombre}: ${err && err.message ? err.message : err}\n`);
  }
}

function afirma(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje || 'condición falsa');
}

function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function next() {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// monta un tablero con minas conocidas y el contador de adyacencia calculado
function tableroConMinas(filas, columnas, minasIdx) {
  const tablero = new Tablero({ filas, columnas, minas: minasIdx.length });
  for (const i of minasIdx) tablero.celdas[i].mina = true;
  tablero.sembradas = true;
  for (let i = 0; i < tablero.total; i += 1) {
    if (tablero.celdas[i].mina) continue;
    let n = 0;
    for (const v of tablero.vecinos(i)) if (tablero.celdas[v].mina) n += 1;
    tablero.celdas[i].adj = n;
  }
  return tablero;
}

process.stdout.write('dificultades\n');

prueba('hay exactamente tres dificultades', () => {
  afirma(DIFICULTADES.length === 3, 'deben ser tres');
  afirma(esDificultadFija('beginner') && esDificultadFija('intermediate') && esDificultadFija('expert'), 'ids fijos');
});

prueba('los tableros fijos son coherentes', () => {
  for (const d of DIFICULTADES) {
    afirma(d.filas >= 2 && d.columnas >= 2, `${d.id} dimensiones`);
    afirma(d.minas >= 1, `${d.id} minas`);
    afirma(d.minas < d.filas * d.columnas, `${d.id} demasiadas minas`);
  }
  const expert = dificultadPorId('expert');
  afirma(expert.filas === 16 && expert.columnas === 30 && expert.minas === 99, 'experto clásico');
});

prueba('la personalizada respeta los límites', () => {
  const c = normalizarPersonalizada({ filas: 999, columnas: 999, minas: 99999 });
  afirma(c.filas === LIMITES_PERSONALIZADA.filasMax, 'filas al máximo');
  afirma(c.columnas === LIMITES_PERSONALIZADA.columnasMax, 'columnas al máximo');
  const { max } = limitesMinas(c.filas, c.columnas);
  afirma(c.minas === max, 'minas al máximo permitido');
  const chico = normalizarPersonalizada({ filas: 1, columnas: 1, minas: 0 });
  afirma(chico.filas === LIMITES_PERSONALIZADA.filasMin, 'filas al mínimo');
  afirma(chico.minas >= 1, 'al menos una mina');
});

process.stdout.write('tablero: creación\n');

prueba('rechaza configuraciones imposibles', () => {
  for (const cfg of [
    { filas: 0, columnas: 9, minas: 1 },
    { filas: 9, columnas: 0, minas: 1 },
    { filas: 9, columnas: 9, minas: 0 },
    { filas: 3, columnas: 3, minas: 9 },
  ]) {
    let lanzo = false;
    try {
      new Tablero(cfg);
    } catch (err) {
      lanzo = true;
    }
    afirma(lanzo, `debía fallar ${JSON.stringify(cfg)}`);
  }
});

prueba('siembra exactamente las minas pedidas', () => {
  const rng = mulberry32(42);
  const tablero = new Tablero({ filas: 16, columnas: 30, minas: 99 }, rng);
  tablero.revelar(tablero.indice(0, 0));
  const minas = tablero.celdas.filter((c) => c.mina).length;
  afirma(minas === 99, `esperaba 99 minas y hay ${minas}`);
});

prueba('la adyacencia está bien calculada', () => {
  for (let semilla = 1; semilla <= 120; semilla += 1) {
    const rng = mulberry32(semilla);
    const tablero = new Tablero({ filas: 12, columnas: 14, minas: 24 }, rng);
    tablero.revelar(tablero.indice(0, 0));
    for (let i = 0; i < tablero.total; i += 1) {
      if (tablero.celdas[i].mina) continue;
      let n = 0;
      for (const v of tablero.vecinos(i)) if (tablero.celdas[v].mina) n += 1;
      afirma(tablero.celdas[i].adj === n, `adyacencia incorrecta en ${i} (semilla ${semilla})`);
    }
  }
});

prueba('el primer clic nunca estalla', () => {
  for (let semilla = 1; semilla <= 250; semilla += 1) {
    const rng = mulberry32(semilla * 7919);
    const tablero = new Tablero({ filas: 9, columnas: 9, minas: 10 }, rng);
    const destino = Math.floor(rng() * tablero.total);
    const resultado = tablero.revelar(destino);
    afirma(resultado.explosion === -1, `estalló en la primera jugada (semilla ${semilla})`);
    afirma(tablero.estado === 'jugando' || tablero.estado === 'ganado', `estado ${tablero.estado}`);
  }
});

prueba('la zona segura evita las vecinas del primer clic', () => {
  // con 99 minas en experto el clic y sus vecinas no pueden ser minas
  for (let semilla = 1; semilla <= 40; semilla += 1) {
    const rng = mulberry32(semilla * 31337);
    const tablero = new Tablero({ filas: 16, columnas: 30, minas: 99 }, rng);
    const x = 5 + Math.floor(rng() * 20);
    const y = 5 + Math.floor(rng() * 6);
    tablero.revelar(tablero.indice(x, y));
    const zona = [tablero.indice(x, y), ...tablero.vecinos(tablero.indice(x, y))];
    for (const i of zona) afirma(!tablero.celdas[i].mina, 'mina dentro de la zona segura');
  }
});

process.stdout.write('tablero: reglas\n');

prueba('destapar una región vacía abre en oleada sin minas', () => {
  const tablero = tableroConMinas(5, 5, [24]);
  const resultado = tablero.revelar(0);
  afirma(resultado.explosion === -1, 'no puede estallar');
  afirma(resultado.reveladas.length === 24, `debía abrir 24 casillas y abrió ${resultado.reveladas.length}`);
  afirma(tablero.estado === 'ganado', 'un clic resuelve el tablero vacío');
  afirma(tablero.celdas[24].bandera, 'al ganar se izan las banderas');
});

prueba('revelar una mina pierde la partida', () => {
  const tablero = tableroConMinas(3, 3, [0, 4]);
  const resultado = tablero.revelar(0);
  afirma(resultado.explosion === 0, 'devuelve la mina que estalló');
  afirma(tablero.estado === 'perdido', 'estado perdido');
  afirma(tablero.explosionIndice === 0, 'guarda la casilla de la explosión');
  const despues = tablero.revelar(1);
  afirma(despues.reveladas.length === 0, 'no se puede jugar tras perder');
});

prueba('las banderas no se destapan y se cuentan', () => {
  const tablero = tableroConMinas(4, 4, [0]);
  afirma(tablero.alternarBandera(1) === 'bandera', 'pone bandera');
  afirma(tablero.restantesMinas() === 0, 'quedan cero minas aparentes');
  const r = tablero.revelar(1);
  afirma(r.reveladas.length === 0, 'una bandera no se puede destapar');
  afirma(tablero.alternarBandera(1) === 'sin-bandera', 'quita la bandera');
  afirma(tablero.alternarBandera(1) === 'bandera', 'y la vuelve a poner');
});

prueba('se pueden agotar las minas en negativo', () => {
  const tablero = tableroConMinas(3, 3, [0]);
  tablero.alternarBandera(1);
  tablero.alternarBandera(2);
  tablero.alternarBandera(3);
  afirma(tablero.restantesMinas() === -2, 'el contador baja de cero');
});

prueba('el acorde sin banderas suficientes no abre nada', () => {
  const tablero = tableroConMinas(3, 3, [0]);
  tablero.revelar(4); // número 1
  const r = tablero.acorde(4);
  afirma(r.reveladas.length === 0, 'acorde sin marcar no hace nada');
  afirma(tablero.celdas[1].revelada === false, 'las vecinas siguen cerradas');
});

prueba('el acorde correcto abre lo que queda sin minas ni banderas', () => {
  const tablero = tableroConMinas(3, 3, [0]);
  tablero.revelar(4); // centro, adj 1
  tablero.alternarBandera(0); // la mina
  const r = tablero.acorde(4);
  afirma(r.explosion === -1, 'sin explosión');
  afirma(tablero.estado === 'ganado', 'acorde cierra la partida');
  afirma(tablero.celdas[2].revelada && tablero.celdas[6].revelada, 'abre las vecinas lejanas');
  afirma(tablero.celdas[0].revelada === false, 'la mina sigue tapada');
});

prueba('el acorde con una bandera mal puesta destapa la mina', () => {
  const tablero = tableroConMinas(3, 3, [0]);
  tablero.revelar(4);
  tablero.alternarBandera(1); // bandera equivocada: 1 no tiene mina
  const r = tablero.acorde(4);
  afirma(r.explosion === 0, 'estalla la mina sin marcar');
  afirma(tablero.estado === 'perdido', 'estado perdido');
});

prueba('la victoria exige destapar todas las casillas sin minas', () => {
  const tablero = tableroConMinas(2, 2, [0]);
  tablero.revelar(1);
  tablero.revelar(2);
  afirma(tablero.estado === 'jugando', 'aún queda una');
  tablero.revelar(3);
  afirma(tablero.estado === 'ganado', 'victoria exacta');
  afirma(tablero.celdas[0].bandera, 'la mina queda marcada');
  const despues = tablero.revelar(0);
  afirma(despues.reveladas.length === 0, 'no se juega tras ganar');
});

prueba('pulsar abre o hace acorde según el estado de la casilla', () => {
  const tablero = tableroConMinas(3, 3, [0]);
  const r1 = tablero.pulsar(4);
  afirma(r1.reveladas.length === 1, 'pulsar abre la casilla cerrada');
  tablero.alternarBandera(0);
  const r2 = tablero.pulsar(4);
  afirma(r2.reveladas.length > 0, 'pulsar sobre número abierto hace acorde');
  afirma(tablero.estado === 'ganado', 'y cierra la partida');
});

process.stdout.write('campaña\n');

prueba('la treinta son 30 niveles en 4 actos', () => {
  afirma(NIVELES.length === 30, `esperaba 30 niveles y hay ${NIVELES.length}`);
  afirma(ACTOS.length === 4, 'cuatro actos');
  const total = ACTOS.reduce((n, a) => n + NIVELES.filter((niv) => niv.act === a.id).length, 0);
  afirma(total === 30, 'todos los niveles caen en un acto');
  afirma(nivelCampana(0) && nivelCampana(29) && !nivelCampana(30), 'nivelCampana acota');
  afirma(actoDe(0).id === 1 && actoDe(29).id === 4, 'actoDe reparte bien');
  for (const a of ACTOS) {
    for (const niv of NIVELES.filter((x) => x.act === a.id)) afirma(niv.act === a.id, 'acto coherente');
  }
});

prueba('cada nivel de campaña es jugable y progresivo en actos', () => {
  for (const n of NIVELES) {
    afirma(n.filas >= 5 && n.filas <= 30, `filas ${n.filas}`);
    afirma(n.columnas >= 5 && n.columnas <= 30, `columnas ${n.columnas}`);
    afirma(n.minas >= 1 && n.minas < n.filas * n.columnas * 0.6, `minas ${n.minas}`);
    afirma(n.nombreEs.trim() && n.nombreEn.trim(), 'nombre en ambos idiomas');
    if (n.reloj) afirma(n.reloj >= 60 && n.reloj <= 900, `reloj ${n.reloj}s razonable`);
    if (n.senal) afirma(n.senal >= 1 && n.senal < n.minas, `señal ${n.senal} < minas`);
  }
  // el acto IV es más duro que el acto I, y no por poco
  const maxMinas = (act) => Math.max(...NIVELES.filter((n) => n.act === act).map((n) => n.minas));
  afirma(maxMinas(4) > maxMinas(1), 'el corazón muerde más que el exterior');
});

prueba('configNivel mapea modificadores al motor', () => {
  const plano = configNivel(0);
  afirma(plano.filas === 6 && plano.columnas === 6 && plano.minas === 6, 'nivel 1 sin mods');
  afirma(!plano.mods, 'sin modificadores donde no tocan');
  const conReloj = NIVELES.findIndex((n) => n.reloj);
  const cfgReloj = configNivel(conReloj);
  afirma(cfgReloj.mods && cfgReloj.mods.relojMs === NIVELES[conReloj].reloj * 1000, 'reloj en ms');
  const conSenal = NIVELES.findIndex((n) => n.senal);
  const cfgSenal = configNivel(conSenal);
  afirma(cfgSenal.mods && cfgSenal.mods.senal === NIVELES[conSenal].senal, 'señal al vuelo');
  afirma(configNivel(99) === null, 'índice fuera de rango devuelve null');
});

prueba('la señal pre-marca exactamente N minas reales', () => {
  const tablero = tableroConMinas(8, 8, [0, 1, 2, 9, 17]);
  const marcadas = tablero.marcarSenal(2);
  afirma(marcadas === 2, `marcó ${marcadas}`);
  const banderas = tablero.celdas.filter((c) => c.bandera);
  afirma(banderas.length === 2, 'dos banderas');
  afirma(banderas.every((c) => c.mina), 'siempre sobre minas');
  afirma(tablero.restantesMinas() === tablero.minas - 2, 'el contador descuenta las señales');
  const cero = tablero.marcarSenal(0);
  afirma(cero === 0, 'señal cero no marca nada');
});

process.stdout.write('idiomas\n');

prueba('español e inglés tienen las mismas claves', () => {
  const { es, en } = __testClaves();
  const soloEs = es.filter((k) => !en.includes(k));
  const soloEn = en.filter((k) => !es.includes(k));
  afirma(soloEs.length === 0, `faltan en inglés: ${soloEs.join(', ')}`);
  afirma(soloEn.length === 0, `faltan en español: ${soloEn.join(', ')}`);
});

prueba('ningún texto está vacío y los placeholders coinciden', () => {
  const { esValores, enValores } = __testClaves();
  const placeholders = (s) => (String(s).match(/\{[a-zA-Z0-9_]+\}/g) || []).sort().join(',');
  for (const clave of Object.keys(esValores)) {
    afirma(String(esValores[clave]).trim().length > 0, `es.${clave} vacío`);
    afirma(String(enValores[clave]).trim().length > 0, `en.${clave} vacío`);
    afirma(
      placeholders(esValores[clave]) === placeholders(enValores[clave]),
      `placeholders distintos en ${clave}`,
    );
  }
});

prueba('las unidades de mina concuerdan', () => {
  afirma(unitMinas(1) === 'mina', 'singular en español');
  afirma(unitMinas(5) === 'minas', 'plural en español');
});

prueba('t() interpola y sobrevive a claves desconocidas', () => {
  afirma(typeof t('play') === 'string' && t('play').length > 0, 'clave conocida');
  afirma(t('__no_existe__') === '__no_existe__', 'clave desconocida se devuelve tal cual');
});

process.stdout.write(`\n${pruebas} pruebas · ${fallos} fallos\n`);
process.exit(fallos === 0 ? 0 : 1);
