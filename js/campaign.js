// la treinta — el modo historia del juego.
// treinta campos minados en cuatro actos, con un solo relato lineal:
// la guerra llamó a tu puerta. nadie pregunta por qué. nadie se ofrece.
// cada nivel guarda una línea del avance; las citas van en ES y EN.
//
// los niveles fijan tamaño y minas; completar uno abre el siguiente.

export const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'alistamiento', nombreEn: 'enlistment', subEs: 'la carta y el juramento', subEn: 'the letter and the oath' },
  { id: 2, inicio: 6, nombreEs: 'el frente', nombreEn: 'the front', subEs: 'la zona minada', subEn: 'the mined zone' },
  { id: 3, inicio: 12, nombreEs: 'la operación', nombreEn: 'the operation', subEs: 'operación puente', subEn: 'operation bridge' },
  { id: 4, inicio: 18, nombreEs: 'el final del campo', nombreEn: 'the end of the field', subEs: 'la vuelta', subEn: 'the way back' },
];

export const NIVELES = [
  // acto I — alistamiento
  { act: 1, nombreEs: 'la carta', nombreEn: 'the letter', filas: 6, columnas: 6, minas: 6,
    historiaEs: 'La carta llega un martes. Tu nombre, un número de expediente y una hora. La guerra te ha elegido.',
    historiaEn: 'The letter arrives on a Tuesday. Your name, a file number and an hour. The war has picked you.' },
  { act: 1, nombreEs: 'el cuartel', nombreEn: 'the barracks', filas: 7, columnas: 7, minas: 9,
    historiaEs: 'El cuartel huele a lejía y a miedo nuevo. Firmas tu nombre mil veces, como si eso te hiciera dueño del fusil.',
    historiaEn: 'The barracks smells of bleach and fresh fear. You sign your name a thousand times, as if that made the rifle yours.' },
  { act: 1, nombreEs: 'la prueba', nombreEn: 'the test', filas: 8, columnas: 8, minas: 10,
    historiaEs: 'La prueba: cien hombres en fila y diez minutos para aprender otra manera de mirar el suelo.',
    historiaEn: 'The test: a hundred men in a row and ten minutes to learn another way of looking at the ground.' },
  { act: 1, nombreEs: 'el juramento', nombreEn: 'the oath', filas: 8, columnas: 8, minas: 14,
    historiaEs: 'Juráis sobre un campo de verdad. Prometéis volver, o que al menos lo cuenten.',
    historiaEn: 'You swear over a real field. You promise to return, or at least to be counted.' },
  { act: 1, nombreEs: 'el polígono', nombreEn: 'the range', filas: 9, columnas: 9, minas: 12,
    historiaEs: 'En el polígono todo es de verdad: la saliva, el temblor, las banderas.',
    historiaEn: 'At the range everything is real: the spit, the trembling, the flags.' },
  { act: 1, nombreEs: 'el ascenso', nombreEn: 'the commission', filas: 9, columnas: 9, minas: 16,
    historiaEs: 'Te ascienden a alférez por cumplir un trámite. El tren parte al amanecer.',
    historiaEn: 'You are commissioned for completing a formality. The train leaves at dawn.' },
  // acto II — el frente
  { act: 2, nombreEs: 'el convoy', nombreEn: 'the convoy', filas: 10, columnas: 10, minas: 18,
    historiaEs: 'Tres días de tren y un puente cortado. El enemigo vuela los puentes.',
    historiaEn: 'Three days of train and a cut bridge. The enemy blows the bridges.' },
  { act: 2, nombreEs: 'la zona', nombreEn: 'the zone', filas: 10, columnas: 10, minas: 22,
    historiaEs: 'Zona de operaciones. El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.',
    historiaEn: 'Operations zone. The sign says DO NOT STEP; underneath, someone wrote every name.' },
  { act: 2, nombreEs: 'los mapas', nombreEn: 'the maps', filas: 12, columnas: 12, minas: 26,
    historiaEs: 'Los mapas pertenecen a otra guerra: minas sin marcar, memoria de quien no pudo dibujarlas.',
    historiaEn: 'The maps belong to another war: unmarked mines, the memory of those who could not draw them.' },
  { act: 2, nombreEs: 'el sargento', nombreEn: 'the sergeant', filas: 12, columnas: 12, minas: 31,
    historiaEs: 'El sargento te mira como a un trapo viejo. Aquí se pisa con la cabeza, no con los pies.',
    historiaEn: 'The sergeant looks at you like an old rag. Here you step with your head, not your feet.' },
  { act: 2, nombreEs: 'el primer paso', nombreEn: 'the first step', filas: 14, columnas: 14, minas: 34,
    historiaEs: 'Das el primer paso fuera de la trinchera. El silencio pesa más que el acero.',
    historiaEn: 'You take the first step out of the trench. Silence weighs more than steel.' },
  { act: 2, nombreEs: 'la guardia', nombreEn: 'the watch', filas: 14, columnas: 14, minas: 40,
    historiaEs: 'La noche de guardia. Minas nuevas bajo la luna; alguien las siembra cada noche.',
    historiaEn: 'The night watch. New mines under the moon; someone lays them every night.' },
  // acto III — la operación
  { act: 3, nombreEs: 'el puente', nombreEn: 'the bridge', filas: 14, columnas: 14, minas: 44,
    historiaEs: 'Operación Puente: cruzar al otro lado. Dos campos, un vado y una radio muerta.',
    historiaEn: 'Operation Bridge: cross to the other side. Two fields, a ford and a dead radio.' },
  { act: 3, nombreEs: 'la brecha', nombreEn: 'the breach', filas: 16, columnas: 16, minas: 40,
    historiaEs: 'La brecha es una raya de luz en la hierba. Más allá, el campo enemigo.',
    historiaEn: 'The breach is a line of light in the grass. Beyond it, the enemy field.' },
  { act: 3, nombreEs: 'el silencio', nombreEn: 'the silence', filas: 16, columnas: 16, minas: 48,
    historiaEs: 'Seis minutos de silencio antes de que la artillería hable. Nadie traga.',
    historiaEn: 'Six minutes of silence before the guns speak. Nobody swallows.' },
  { act: 3, nombreEs: 'el asalto', nombreEn: 'the assault', filas: 16, columnas: 16, minas: 55,
    historiaEs: 'El asalto. Banderas, polvo y el mundo reducido a un metro cuadrado.',
    historiaEn: 'The assault. Flags, dust and the world reduced to one square metre.' },
  { act: 3, nombreEs: 'la retirada', nombreEn: 'the retreat', filas: 16, columnas: 16, minas: 61,
    historiaEs: 'Retirada. Un compañero se ha quedado dentro del campo. La guerra no espera.',
    historiaEn: 'Retreat. A comrade stayed inside the field. War does not wait.' },
  { act: 3, nombreEs: 'el recuento', nombreEn: 'the count', filas: 16, columnas: 16, minas: 66,
    historiaEs: 'El recuento: de cuarenta volvemos nueve. El parte dice «éxito».',
    historiaEn: "The count: of forty, nine return. The report says 'success'." },
  // acto IV — el final del campo
  { act: 4, nombreEs: 'el corredor', nombreEn: 'the corridor', filas: 16, columnas: 16, minas: 69,
    historiaEs: 'El corredor: la única ruta hasta el depósito enemigo. Un kilómetro de hierba y muerte.',
    historiaEn: 'The corridor: the only route to the enemy depot. A kilometre of grass and death.' },
  { act: 4, nombreEs: 'el búnker', nombreEn: 'the bunker', filas: 18, columnas: 18, minas: 72,
    historiaEs: 'Bajo el búnker, su sala de mandos. Minada por dentro. Deliberadamente.',
    historiaEn: 'Beneath the bunker, their command room. Mined from the inside. Deliberately.' },
  { act: 4, nombreEs: 'el documento', nombreEn: 'the document', filas: 16, columnas: 20, minas: 70,
    historiaEs: 'Un documento: tus órdenes, firmadas con tu nombre por una mano que no es la tuya.',
    historiaEn: 'A document: your orders, signed with your name by a hand that is not yours.' },
  { act: 4, nombreEs: 'la traición', nombreEn: 'the betrayal', filas: 20, columnas: 20, minas: 78,
    historiaEs: 'Nadie te envió. Esto era un castigo disfrazado de papeleo. Pero ya estás aquí.',
    historiaEn: 'Nobody sent you. This was a punishment dressed as paperwork. But you are here now.' },
  { act: 4, nombreEs: 'el último campo', nombreEn: 'the last field', filas: 18, columnas: 22, minas: 76,
    historiaEs: 'El telegrafista escucha tu clave por última vez. Que el silencio te sea propicio.',
    historiaEn: 'The radio operator hears your callsign for the last time. May the silence be kind to you.' },
  { act: 4, nombreEs: 'el desierto', nombreEn: 'the desert', filas: 22, columnas: 22, minas: 84,
    historiaEs: 'El calor rebota en la arena; cada paso es una conjetura.',
    historiaEn: 'The heat bounces off the sand; every step is a guess.' },
  { act: 4, nombreEs: 'la ciudad', nombreEn: 'the city', filas: 20, columnas: 24, minas: 88,
    historiaEs: 'La ciudad tomada. Mercado nuevo, olor a pólvora y pan fresco. Nadie te reconoce.',
    historiaEn: 'The city taken. A new market, the smell of gunpowder and fresh bread. Nobody recognises you.' },
  { act: 4, nombreEs: 'el almacén', nombreEn: 'the warehouse', filas: 22, columnas: 24, minas: 96,
    historiaEs: 'El almacén. Tu expediente, quemado por orden del mando. Tú sabes caminar.',
    historiaEn: 'The warehouse. Your file, burned by order of the command. You know how to walk.' },
  { act: 4, nombreEs: 'el expediente', nombreEn: 'the file', filas: 24, columnas: 24, minas: 104,
    historiaEs: 'El expediente sobre la mesa. El nombre tachado, el sello roto. Te deben el nombre.',
    historiaEn: 'The file on the table. The name struck through, the seal broken. They owe you your name.' },
  { act: 4, nombreEs: 'la vuelta', nombreEn: 'the way back', filas: 26, columnas: 24, minas: 112,
    historiaEs: 'El tren de vuelta. Los campos se alejan por la ventanilla. Nadie dice nada.',
    historiaEn: 'The train home. The fields slide past the window. Nobody says a word.' },
  { act: 4, nombreEs: 'la puerta', nombreEn: 'the doorway', filas: 26, columnas: 28, minas: 124,
    historiaEs: 'La puerta de casa. Dos golpes. Nadie responde. La abres tú.',
    historiaEn: 'The doorway of home. Two knocks. Nobody answers. You open it yourself.' },
  { act: 4, nombreEs: 'el final del campo', nombreEn: 'the end of the field', filas: 24, columnas: 30, minas: 132,
    historiaEs: 'Limpias el último campo porque no volverás a pisar otro. El campo termina; tú, no.',
    historiaEn: "You clear the last field because you will never tread on another. The field ends; you don't." },
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
