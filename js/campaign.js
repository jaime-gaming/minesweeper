// la treinta — el modo historia del juego.
// treinta niveles en cuatro actos, con su pequeña historia:
// tu padre bajó a la mina antes que tú. tú bajas a buscarlo.
// cada nivel guarda una línea del relato; las citas van en ES y EN.
//
// los niveles fijan tamaño y minas; completar uno abre el siguiente.

export const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'el exterior', nombreEn: 'the outside', subEs: 'la puerta de madera y los tres que no volvieron', subEn: 'the wooden door and the three who never came back' },
  { id: 2, inicio: 6, nombreEs: 'las galerías', nombreEn: 'the galleries', subEs: 'los relevos, los raíles y el recado', subEn: 'the shifts, the rails and the note' },
  { id: 3, inicio: 12, nombreEs: 'el filón', nombreEn: 'the vein', subEs: 'la veta empieza a cantar', subEn: 'the seam begins to sing' },
  { id: 4, inicio: 18, nombreEs: 'el corazón', nombreEn: 'the heart', subEs: 'el corazón late bajo la piedra', subEn: 'the heart beats beneath the stone' },
];

export const NIVELES = [
  // acto I — el exterior
  { act: 1, nombreEs: 'la boca', nombreEn: 'the mouth', filas: 6, columnas: 6, minas: 6,
    historiaEs: 'El viento empuja la puerta de madera y el cerro se traga la luz. Tu padre bajó hace tres días. Sus botas siguen en el barro.',
    historiaEn: 'The wind pushes the wooden door and the hill swallows the light. Your father went down three days ago. His boots are still in the mud.' },
  { act: 1, nombreEs: 'el sendero', nombreEn: 'the path', filas: 7, columnas: 7, minas: 9,
    historiaEs: 'El camino de grava baja en espiral. Alguien clavó clavos en la corteza de los castaños para marcar la dirección.',
    historiaEn: 'The gravel path spirals downward. Someone nailed spikes into the chestnut bark to mark the way.' },
  { act: 1, nombreEs: 'primer desmonte', nombreEn: 'first cut', filas: 8, columnas: 8, minas: 10,
    historiaEs: 'La cuadrilla de siete. Los nombres de la tabla todavía huelen a aceite. Tres no volvieron del talud.',
    historiaEn: 'The crew of seven. The names on the board still smell of oil. Three never came back from the scree.' },
  { act: 1, nombreEs: 'el cargador', nombreEn: 'the loader', filas: 8, columnas: 8, minas: 14,
    historiaEs: 'El cargador tiene las palas abiertas, como una boca esperando. Te quedas quieta y escuchas el hueco.',
    historiaEn: 'The loader sits with its bucket open, like a mouth that expects something. You stay still and listen to the hollow.' },
  { act: 1, nombreEs: 'mina honda', nombreEn: 'the deep mine', filas: 9, columnas: 9, minas: 12,
    historiaEs: 'El primer pozo propiamente dicho. La guía del sindicato marcaba aquí con pintura blanca. La pintura sigue fresca.',
    historiaEn: 'The first proper shaft. The union guide marked it here with white paint. The paint is still fresh.' },
  { act: 1, nombreEs: 'el capataz', nombreEn: 'the foreman', filas: 9, columnas: 9, minas: 16,
    historiaEs: 'La cabaña del capataz, tu padre: recibos, órdenes y una carta a medio escribir. La última línea dice tu nombre.',
    historiaEn: "The foreman's cabin — your father's: receipts, orders, and a half-written letter. The last line says your name." },
  // acto II — las galerías
  { act: 2, nombreEs: 'la galería norte', nombreEn: 'north gallery', filas: 10, columnas: 10, minas: 18,
    historiaEs: 'El aire se vuelve mecha. Un raíl torcido apunta hacia adentro como un dedo índice.',
    historiaEn: 'The air turns to wick. A twisted rail points inward like an index finger.' },
  { act: 2, nombreEs: 'el relevo', nombreEn: 'the relief', filas: 10, columnas: 10, minas: 22,
    historiaEs: 'Aquí la cuadrilla se partía en relevos. Uno dejó marcadas dos minas y un recado: «vuelve por el camino de las banderas».',
    historiaEn: 'This is where the crew split into shifts. One of them marked two mines and left a note: “come back by the flags.”' },
  { act: 2, nombreEs: 'carbón y cal', nombreEn: 'coal and lime', filas: 12, columnas: 12, minas: 26,
    historiaEs: 'El carbón mancha la cal de las paredes. Entre las huellas grandes, otras pequeñas: ¿una cabra? No hay cabras ahí abajo.',
    historiaEn: 'The coal stains the lime on the walls. Among the big footprints, small ones: a goat? There are no goats down there.' },
  { act: 2, nombreEs: 'el pozo ciego', nombreEn: 'the blind shaft', filas: 12, columnas: 12, minas: 31,
    historiaEs: 'Bajada a pico y sin mapa oficial. En los cuadernos el pozo ciego nunca figura como «explorado», pero nombra minas ahí abajo.',
    historiaEn: 'Picked out by hand, no official map. The notebooks never list the blind shaft as “explored”, yet the mines down there have names.' },
  { act: 2, nombreEs: 'vía muerta', nombreEn: 'dead track', filas: 14, columnas: 14, minas: 34,
    historiaEs: 'Vagones parados con la carga a medio camino. El metal conserva el calor de otra época.',
    historiaEn: 'Wagons stalled mid-track with their loads. The metal still keeps the warmth of another era.' },
  { act: 2, nombreEs: 'el ventilador', nombreEn: 'the fan', filas: 14, columnas: 14, minas: 40,
    historiaEs: 'El ventilador de hierro sigue girando. Alguien lo engrasó. Alguien quería que no se detuviera nunca.',
    historiaEn: 'The iron fan is still turning. Someone oiled it. Someone wanted it never to stop.' },
  // acto III — el filón
  { act: 3, nombreEs: 'el óxido', nombreEn: 'the rust', filas: 14, columnas: 14, minas: 44,
    historiaEs: 'El óxido pinta la roca de sangre seca. Las primeras vetas asoman como vértebras.',
    historiaEn: 'Rust paints the rock with dry blood. The first veins show through like vertebrae.' },
  { act: 3, nombreEs: 'la luz del farol', nombreEn: 'lantern light', filas: 16, columnas: 16, minas: 40,
    historiaEs: 'La veta empieza aquí, sangrando luz. A partir de este punto, la montaña manda en las luces.',
    historiaEn: 'The seam begins here, bleeding light. From this point on, the mountain rules the lanterns.' },
  { act: 3, nombreEs: 'galería estrecha', nombreEn: 'narrow gallery', filas: 16, columnas: 16, minas: 48,
    historiaEs: 'Un metro de techo. Gateas. La mochila roza y algo se derrama: tu padre llevaba sal. Para la sed o para el susto.',
    historiaEn: 'A metre of ceiling. You crawl. The pack scrapes and something spills: your father carried salt. For thirst, or for courage.' },
  { act: 3, nombreEs: 'agua fría', nombreEn: 'cold water', filas: 16, columnas: 16, minas: 55,
    historiaEs: 'El agua te sube por los tobillos, fría como una deuda. La corriente empuja hacia afuera. La montaña te echa.',
    historiaEn: 'The water climbs your ankles, cold as a debt. The current pushes outward. The mountain is telling you to leave.' },
  { act: 3, nombreEs: 'el escurridor', nombreEn: 'the drain', filas: 16, columnas: 16, minas: 61,
    historiaEs: 'El agua se traga por los escurridores cantando bajo tus pies. No miras abajo.',
    historiaEn: 'The water swallows itself through the drains, singing beneath your boots. You do not look down.' },
  { act: 3, nombreEs: 'vena gruesa', nombreEn: 'thick vein', filas: 16, columnas: 16, minas: 66,
    historiaEs: 'La veta entera, desnuda. Tu padre dibujó este mismo mapa hace años. Las minas están donde él las dejó anotadas.',
    historiaEn: 'The whole seam, naked. Your father drew this very map years ago. The mines are where he wrote them down.' },
  // acto IV — el corazón
  { act: 4, nombreEs: 'el corazón de la mina', nombreEn: 'heart of the mine', filas: 16, columnas: 16, minas: 69,
    historiaEs: 'A partir de aquí todo late: el aire, el metal, tu pulso. La roca hierve en silencio.',
    historiaEn: 'From here on everything beats: the air, the metal, your pulse. The rock boils in silence.' },
  { act: 4, nombreEs: 'el guardián', nombreEn: 'the warden', filas: 18, columnas: 18, minas: 72,
    historiaEs: 'El guardián de la boca, una estatua de sal en la oscuridad. La cuadrilla decía que señaliza el camino.',
    historiaEn: 'The warden of the mouth — a salt statue in the dark. The crew said it marks the path.' },
  { act: 4, nombreEs: 'polvo y pólvora', nombreEn: 'dust and powder', filas: 16, columnas: 20, minas: 70,
    historiaEs: 'El polvo se alza como nieve negra con cada respiración. Aquí la pólvora decidió no estallar. No para ti.',
    historiaEn: 'The dust rises like black snow with every breath. Here the powder decided not to explode. Not for you.' },
  { act: 4, nombreEs: 'la sala de máquinas', nombreEn: 'the engine room', filas: 20, columnas: 20, minas: 78,
    historiaEs: 'El corazón mecánico. Las máquinas paran una a una a tu paso, como queriendo escuchar.',
    historiaEn: 'The mechanical heart. The machines stop one by one as you pass, as if trying to listen.' },
  { act: 4, nombreEs: 'tres picos', nombreEn: 'three peaks', filas: 18, columnas: 22, minas: 76,
    historiaEs: 'Tres picos clavados en el muro: los tres de los que se fueron. El tuyo espera su sitio.',
    historiaEn: 'Three picks nailed to the wall — the three of them, gone. Yours waits for its place.' },
  { act: 4, nombreEs: 'el último rellano', nombreEn: 'the last landing', filas: 22, columnas: 22, minas: 84,
    historiaEs: 'El último rellano antes del filón padre. Desde aquí se oye el corazón. Tu padre escuchó este mismo sonido.',
    historiaEn: 'The last landing before the father lode. From here you can hear the heart. Your father heard this same sound.' },
  { act: 4, nombreEs: 'la veta maestra', nombreEn: 'the master seam', filas: 20, columnas: 24, minas: 88,
    historiaEs: 'La veta maestra late con tu pulso. Una sola capa de piedra te separa de todo lo que dejaste atrás.',
    historiaEn: 'The master seam beats with your pulse. A single layer of stone stands between you and everything you left behind.' },
  { act: 4, nombreEs: 'minas de agua', nombreEn: 'water mines', filas: 22, columnas: 24, minas: 96,
    historiaEs: 'El agua sube. La mina entera respira contra ti. Corre.',
    historiaEn: 'The water rises. The whole mine breathes against you. Run.' },
  { act: 4, nombreEs: 'el juicio del filón', nombreEn: "the seam's trial", filas: 24, columnas: 24, minas: 104,
    historiaEs: 'El juicio. La montaña pesa el motivo de tu bajada. Aún no sabe que ya has ganado.',
    historiaEn: 'The trial. The mountain weighs the reason for your descent. It does not yet know you have already won.' },
  { act: 4, nombreEs: 'la noche cerrada', nombreEn: 'the black night', filas: 26, columnas: 24, minas: 112,
    historiaEs: 'Oscuridad entera. Lo único encendido es tu farol y tu nombre en la carta del capataz.',
    historiaEn: "Total darkness. The only lights left are your lantern and your name in the foreman's letter." },
  { act: 4, nombreEs: 'el filón padre', nombreEn: 'the father lode', filas: 26, columnas: 28, minas: 124,
    historiaEs: 'El filón padre. Lo que el valle soñó. El metal canta en voz baja, como acunando lo que tu padre guardó aquí.',
    historiaEn: 'The father lode. What the valley dreamed of. The metal sings low, like a lullaby for what your father kept here.' },
  { act: 4, nombreEs: 'el corazón de piedra', nombreEn: 'the stone heart', filas: 24, columnas: 30, minas: 132,
    historiaEs: 'El corazón de piedra abre, y dentro late tu padre, esperando. Treinta niveles no son nada cuando se baja por alguien.',
    historiaEn: 'The stone heart opens, and inside your father waits, still beating. Thirty levels are nothing when you descend for someone.' },
];

export function nivelCampana(indice) {
  return NIVELES[indice] || null;
}

export function actoDe(indice) {
  const nivel = NIVELES[indice];
  return nivel ? ACTOS.find((a) => a.id === nivel.act) || null : null;
}

export function nombreNivel(indice, idioma) {
  const nivel = NIVELES[indice];
  if (!nivel) return '';
  return idioma === 'en' ? nivel.nombreEn : nivel.nombreEs;
}

export function historiaNivel(indice, idioma) {
  const nivel = NIVELES[indice];
  if (!nivel) return '';
  return idioma === 'en' ? nivel.historiaEn : nivel.historiaEs;
}

// configuración de motor para un nivel de campaña
export function configNivel(indice) {
  const nivel = NIVELES[indice];
  if (!nivel) return null;
  return { filas: nivel.filas, columnas: nivel.columnas, minas: nivel.minas };
}
