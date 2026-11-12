// Textos del juego y nombre localizados. Sin dependencias ni llamadas externas.

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
    // portada
    play: 'jugar',
    playTag: 'tres dificultades y una personalizada',
    profile: 'perfil',
    profileTag: 'récords, partidas y tasa de victorias',
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
    settingDouble: 'doble clic para confirmar',
    settingDoubleTag: 'el primer clic arma la casilla; el segundo la destapa',
    on: 'sí',
    off: 'no',
    back: 'volver',
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
    hintSettings: 'M silencia · Esc vuelve',
    hintCampaign: 'las flechas eligen · ↵ abre · Esc vuelve',
    hintStory: '↵ marchar · Esc vuelve',
    // campaña · la treinta
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
    settingVolumeTag: 'las piezas de final; los efectos van aparte',
    mapStamp: 'no pisar',
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
    // home
    play: 'play',
    playTag: 'three difficulties and a custom board',
    profile: 'profile',
    profileTag: 'records, games and win rate',
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
    settingDouble: 'double-click to confirm',
    settingDoubleTag: 'first click arms the cell; second one reveals it',
    on: 'on',
    off: 'off',
    back: 'back',
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
    hintSettings: 'M mutes · Esc goes back',
    hintCampaign: 'arrows pick · ↵ opens · Esc goes back',
    hintStory: '↵ march · Esc goes back',
    // campaign · the thirty
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
    settingVolumeTag: 'the end pieces; the effects stay as they are',
    mapStamp: 'do not step',
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

export function routeSlug(name) {
  const key = `route${name[0].toUpperCase()}${name.slice(1)}`;
  return t(key);
}

export function routeWords() {
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
