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

export function getLanguage() {
  return language;
}

export function setLanguage(value) {
  language = value === 'en' ? 'en' : 'es';
  try {
    localStorage.setItem(KEY, language);
  } catch (error) {
    // El idioma se mantiene en memoria durante esta sesión.
  }
  return language;
}

export function t(key, values = {}) {
  let text = STRINGS[language][key] ?? STRINGS.es[key] ?? key;
  if (typeof text !== 'string') return text;
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match,
  );
}

export function unitMinas(count) {
  const n = Number(count);
  if (language === 'en') return n === 1 ? 'mine' : 'mines';
  return n === 1 ? 'mina' : 'minas';
}

// para tools/check.mjs: las claves de cada idioma, sin duplicar la lista
export function __testClaves() {
  return {
    es: Object.keys(STRINGS.es),
    en: Object.keys(STRINGS.en),
    esValores: STRINGS.es,
    enValores: STRINGS.en,
  };
}
