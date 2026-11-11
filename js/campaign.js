// campaña "La Treinta": treinta niveles dibujados a mano en cuatro actos.
// cada nivel fija tamaño, minas y modificadores. completar uno abre el siguiente.
//
// modificadores:
//   reloj  — segundos antes de que la galería se cierre (contratiempo)
//   señal  — casillas marcadas con bandera correcta al primer clic
//            ("alguien pasó por aquí antes que tú")

export const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'el exterior', nombreEn: 'the outside', subEs: 'sol a ras de suelo, primera roca', subEn: 'sun at ground level, first rock' },
  { id: 2, inicio: 6, nombreEs: 'las galerías', nombreEn: 'the galleries', subEs: 'a oscuras, siguiendo las vetas', subEn: 'in the dark, following the veins' },
  { id: 3, inicio: 12, nombreEs: 'el filón', nombreEn: 'the vein', subEs: 'el metal canta, la roca aguanta', subEn: 'the metal sings, the rock holds' },
  { id: 4, inicio: 18, nombreEs: 'el corazón', nombreEn: 'the heart', subEs: 'donde la mina no perdona', subEn: 'where the mine shows no mercy' },
];

export const NIVELES = [
  // acto I — el exterior
  { act: 1, nombreEs: 'la boca', nombreEn: 'the mouth', filas: 6, columnas: 6, minas: 6 },
  { act: 1, nombreEs: 'el sendero', nombreEn: 'the path', filas: 7, columnas: 7, minas: 9 },
  { act: 1, nombreEs: 'primer desmonte', nombreEn: 'first cut', filas: 8, columnas: 8, minas: 10 },
  { act: 1, nombreEs: 'el cargador', nombreEn: 'the loader', filas: 8, columnas: 8, minas: 14 },
  { act: 1, nombreEs: 'mina honda', nombreEn: 'the deep mine', filas: 9, columnas: 9, minas: 12, senal: 1 },
  { act: 1, nombreEs: 'el capataz', nombreEn: 'the foreman', filas: 9, columnas: 9, minas: 16 },
  // acto II — las galerías
  { act: 2, nombreEs: 'la galería norte', nombreEn: 'north gallery', filas: 10, columnas: 10, minas: 18 },
  { act: 2, nombreEs: 'el relevo', nombreEn: 'the relief', filas: 10, columnas: 10, minas: 22, senal: 1 },
  { act: 2, nombreEs: 'carbón y cal', nombreEn: 'coal and lime', filas: 12, columnas: 12, minas: 26 },
  { act: 2, nombreEs: 'el pozo ciego', nombreEn: 'the blind shaft', filas: 12, columnas: 12, minas: 31 },
  { act: 2, nombreEs: 'vía muerta', nombreEn: 'dead track', filas: 14, columnas: 14, minas: 34, senal: 2 },
  { act: 2, nombreEs: 'el ventilador', nombreEn: 'the fan', filas: 14, columnas: 14, minas: 40 },
  // acto III — el filón
  { act: 3, nombreEs: 'el óxido', nombreEn: 'the rust', filas: 14, columnas: 14, minas: 44 },
  { act: 3, nombreEs: 'la luz del farol', nombreEn: 'lantern light', filas: 16, columnas: 16, minas: 40, reloj: 150 },
  { act: 3, nombreEs: 'galería estrecha', nombreEn: 'narrow gallery', filas: 16, columnas: 16, minas: 48 },
  { act: 3, nombreEs: 'agua fría', nombreEn: 'cold water', filas: 16, columnas: 16, minas: 55, senal: 2 },
  { act: 3, nombreEs: 'el escurridor', nombreEn: 'the drain', filas: 16, columnas: 16, minas: 61 },
  { act: 3, nombreEs: 'vena gruesa', nombreEn: 'thick vein', filas: 16, columnas: 16, minas: 66, reloj: 240 },
  // acto IV — el corazón
  { act: 4, nombreEs: 'el corazón de la mina', nombreEn: 'heart of the mine', filas: 16, columnas: 16, minas: 69 },
  { act: 4, nombreEs: 'el guardián', nombreEn: 'the warden', filas: 18, columnas: 18, minas: 72 },
  { act: 4, nombreEs: 'polvo y pólvora', nombreEn: 'dust and powder', filas: 16, columnas: 20, minas: 70 },
  { act: 4, nombreEs: 'la sala de máquinas', nombreEn: 'the engine room', filas: 20, columnas: 20, minas: 78, reloj: 300 },
  { act: 4, nombreEs: 'tres picos', nombreEn: 'three peaks', filas: 18, columnas: 22, minas: 76 },
  { act: 4, nombreEs: 'el último rellano', nombreEn: 'the last landing', filas: 22, columnas: 22, minas: 84, senal: 3 },
  { act: 4, nombreEs: 'la veta maestra', nombreEn: 'the master seam', filas: 20, columnas: 24, minas: 88 },
  { act: 4, nombreEs: 'minas de agua', nombreEn: 'water mines', filas: 22, columnas: 24, minas: 96, reloj: 420 },
  { act: 4, nombreEs: 'el juicio del filón', nombreEn: "the seam's trial", filas: 24, columnas: 24, minas: 104 },
  { act: 4, nombreEs: 'la noche cerrada', nombreEn: 'the black night', filas: 26, columnas: 24, minas: 112 },
  { act: 4, nombreEs: 'el filón padre', nombreEn: 'the father lode', filas: 26, columnas: 28, minas: 124, senal: 3 },
  { act: 4, nombreEs: 'el corazón de piedra', nombreEn: 'the stone heart', filas: 24, columnas: 30, minas: 132, reloj: 600 },
];

export function nivelCampana(indice) {
  return NIVELES[indice] || null;
}

export function actoDe(indice) {
  const nivel = NIVELES[indice];
  return nivel ? ACTOS.find((a) => a.id === nivel.act) || null : null;
}

// configuración de motor para un nivel de campaña
export function configNivel(indice) {
  const nivel = NIVELES[indice];
  if (!nivel) return null;
  const cfg = { filas: nivel.filas, columnas: nivel.columnas, minas: nivel.minas };
  const mods = {};
  if (nivel.reloj) mods.relojMs = nivel.reloj * 1000;
  if (nivel.senal) mods.senal = nivel.senal;
  if (Object.keys(mods).length) cfg.mods = mods;
  return cfg;
}
