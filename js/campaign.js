export const ACTOS = [
  { id: 1, inicio: 0, nombreEs: 'alistamiento', nombreEn: 'enlistment', subEs: 'la carta y el juramento', subEn: 'the letter and the oath' },
  { id: 2, inicio: 6, nombreEs: 'el frente', nombreEn: 'the front', subEs: 'la zona minada', subEn: 'the mined zone' },
  { id: 3, inicio: 12, nombreEs: 'la operación', nombreEn: 'the operation', subEs: 'operación puente', subEn: 'operation bridge' },
  { id: 4, inicio: 18, nombreEs: 'el final del campo', nombreEn: 'the end of the field', subEs: 'la vuelta', subEn: 'the way back' },
];

export const NIVELES = [

  { act: 1, nombreEs: 'la carta', nombreEn: 'the letter', filas: 6, columnas: 6, minas: 6, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Su nombre está en la carta. El expediente también.', en: 'Your name is on the letter. The file number too.' },
      { quien: 'recluta', es: 'No recuerdo haberme ofrecido.', en: "I don't remember volunteering." },
    ],
    historiaEs: 'La carta llega un martes. Tu nombre, un número de expediente y una hora. La guerra te ha elegido.',
    historiaEn: 'The letter arrives on a Tuesday. Your name, a file number and an hour. The war has picked you.' },
  { act: 1, nombreEs: 'el cuartel', nombreEn: 'the barracks', filas: 7, columnas: 7, minas: 9, escena: 'cuartel',
    dialogo: [
      { quien: 'sargento', es: 'Firme. Firmará su nombre mil veces.', en: 'At ease. You will sign your name a thousand times.' },
      { quien: 'sargento', es: 'Como si eso le hiciera dueño del fusil.', en: "As if that made the rifle yours." },
    ],
    historiaEs: 'El cuartel huele a lejía y a miedo nuevo. Firmas tu nombre mil veces, como si eso te hiciera dueño del fusil.',
    historiaEn: 'The barracks smells of bleach and fresh fear. You sign your name a thousand times, as if that made the rifle yours.' },
  { act: 1, nombreEs: 'la prueba', nombreEn: 'the test', filas: 8, columnas: 8, minas: 10, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'Cien hombres en fila. Diez minutos.', en: 'A hundred men in a row. Ten minutes.' },
      { quien: 'sargento', es: 'Aprenda otra manera de mirar el suelo.', en: 'Learn another way of looking at the ground.' },
    ],
    historiaEs: 'La prueba: cien hombres en fila y diez minutos para aprender otra manera de mirar el suelo.',
    historiaEn: 'The test: a hundred men in a row and ten minutes to learn another way of looking at the ground.' },
  { act: 1, nombreEs: 'el juramento', nombreEn: 'the oath', filas: 8, columnas: 8, minas: 14, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Juren sobre un campo de verdad.', en: 'Swear over a real field.' },
      { quien: 'comando', es: 'Prometan volver. O que al menos los cuenten.', en: 'Promise to return. Or at least to be counted.' },
    ],
    historiaEs: 'Juráis sobre un campo de verdad. Prometéis volver, o que al menos lo cuenten.',
    historiaEn: 'You swear over a real field. You promise to return, or at least to be counted.' },
  { act: 1, nombreEs: 'el polígono', nombreEn: 'the range', filas: 9, columnas: 9, minas: 12, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'En el polígono todo es de verdad.', en: 'Here everything is real.' },
      { quien: 'sargento', es: 'La saliva. El temblor. Las banderas.', en: 'The spit. The trembling. The flags.' },
    ],
    historiaEs: 'En el polígono todo es de verdad: la saliva, el temblor, las banderas.',
    historiaEn: 'At the range everything is real: the spit, the trembling, the flags.' },
  { act: 1, nombreEs: 'el ascenso', nombreEn: 'the commission', filas: 9, columnas: 9, minas: 16, escena: 'tren',
    dialogo: [
      { quien: 'comando', es: 'Ascenso por cumplir un trámite.', en: 'Commissioned for completing a formality.' },
      { quien: 'comando', es: 'El tren parte al amanecer.', en: 'The train leaves at dawn.' },
    ],
    historiaEs: 'Te ascienden a alférez por cumplir un trámite. El tren parte al amanecer.',
    historiaEn: 'You are commissioned for completing a formality. The train leaves at dawn.' },

  { act: 2, nombreEs: 'el convoy', nombreEn: 'the convoy', filas: 10, columnas: 10, minas: 18, escena: 'tren',
    dialogo: [
      { quien: 'telegrafista', es: 'Tres días de tren.', en: 'Three days by train.' },
      { quien: 'telegrafista', es: 'El puente está cortado. El enemigo vuela los puentes.', en: 'The bridge is cut. The enemy blows the bridges.' },
    ],
    historiaEs: 'Tres días de tren y un puente cortado. El enemigo vuela los puentes.',
    historiaEn: 'Three days of train and a cut bridge. The enemy blows the bridges.' },
  { act: 2, nombreEs: 'la zona', nombreEn: 'the zone', filas: 10, columnas: 10, minas: 22, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'Zona de operaciones.', en: 'Operations zone.' },
      { quien: 'sargento', es: 'El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.', en: 'The sign says DO NOT STEP. Underneath, someone wrote every name.' },
    ],
    historiaEs: 'Zona de operaciones. El cartel dice NO PISAR; debajo, alguien escribió todos los nombres.',
    historiaEn: 'Operations zone. The sign says DO NOT STEP; underneath, someone wrote every name.' },
  { act: 2, nombreEs: 'los mapas', nombreEn: 'the maps', filas: 12, columnas: 12, minas: 26, escena: 'brujula',
    dialogo: [
      { quien: 'telegrafista', es: 'Estos mapas pertenecen a otra guerra.', en: 'These maps belong to another war.' },
      { quien: 'telegrafista', es: 'Minas sin marcar. Memoria de quien no pudo dibujarlas.', en: 'Unmarked mines. The memory of those who could not draw them.' },
    ],
    historiaEs: 'Los mapas pertenecen a otra guerra: minas sin marcar, memoria de quien no pudo dibujarlas.',
    historiaEn: 'The maps belong to another war: unmarked mines, the memory of those who could not draw them.' },
  { act: 2, nombreEs: 'el sargento', nombreEn: 'the sergeant', filas: 12, columnas: 12, minas: 31, escena: 'cuartel',
    dialogo: [
      { quien: 'sargento', es: 'Le mira como a un trapo viejo.', en: 'He looks at you like an old rag.' },
      { quien: 'sargento', es: 'Aquí se pisa con la cabeza, no con los pies.', en: 'Here you step with your head, not your feet.' },
    ],
    historiaEs: 'El sargento te mira como a un trapo viejo. Aquí se pisa con la cabeza, no con los pies.',
    historiaEn: 'The sergeant looks at you like an old rag. Here you step with your head, not your feet.' },
  { act: 2, nombreEs: 'el primer paso', nombreEn: 'the first step', filas: 14, columnas: 14, minas: 34, escena: 'campo',
    dialogo: [
      { quien: 'recluta', es: 'Primer paso fuera de la trinchera.', en: 'First step out of the trench.' },
      { quien: 'recluta', es: 'El silencio pesa más que el acero.', en: 'Silence weighs more than steel.' },
    ],
    historiaEs: 'Das el primer paso fuera de la trinchera. El silencio pesa más que el acero.',
    historiaEn: 'You take the first step out of the trench. Silence weighs more than steel.' },
  { act: 2, nombreEs: 'la guardia', nombreEn: 'the watch', filas: 14, columnas: 14, minas: 40, escena: 'campamento',
    dialogo: [
      { quien: 'telegrafista', es: 'Noche de guardia.', en: 'The night watch.' },
      { quien: 'telegrafista', es: 'Minas nuevas bajo la luna; alguien las siembra cada noche.', en: 'New mines under the moon; someone lays them every night.' },
    ],
    historiaEs: 'La noche de guardia. Minas nuevas bajo la luna; alguien las siembra cada noche.',
    historiaEn: 'The night watch. New mines under the moon; someone lays them every night.' },

  { act: 3, nombreEs: 'el puente', nombreEn: 'the bridge', filas: 14, columnas: 14, minas: 44, escena: 'puente',
    dialogo: [
      { quien: 'comando', es: 'Operación Puente. Crucen al otro lado.', en: 'Operation Bridge. Cross to the other side.' },
      { quien: 'comando', es: 'Dos campos, un vado y una radio muerta.', en: 'Two fields, a ford and a dead radio.' },
    ],
    historiaEs: 'Operación Puente: cruzar al otro lado. Dos campos, un vado y una radio muerta.',
    historiaEn: 'Operation Bridge: cross to the other side. Two fields, a ford and a dead radio.' },
  { act: 3, nombreEs: 'la brecha', nombreEn: 'the breach', filas: 16, columnas: 16, minas: 40, escena: 'puente',
    dialogo: [
      { quien: 'sargento', es: 'La brecha es una raya de luz en la hierba.', en: 'The breach is a line of light in the grass.' },
      { quien: 'sargento', es: 'Más allá, el campo enemigo.', en: 'Beyond it, the enemy field.' },
    ],
    historiaEs: 'La brecha es una raya de luz en la hierba. Más allá, el campo enemigo.',
    historiaEn: 'The breach is a line of light in the grass. Beyond it, the enemy field.' },
  { act: 3, nombreEs: 'el silencio', nombreEn: 'the silence', filas: 16, columnas: 16, minas: 48, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Seis minutos de silencio.', en: 'Six minutes of silence.' },
      { quien: 'comando', es: 'Antes de que la artillería hable. Nadie traga.', en: 'Before the guns speak. Nobody swallows.' },
    ],
    historiaEs: 'Seis minutos de silencio antes de que la artillería hable. Nadie traga.',
    historiaEn: 'Six minutes of silence before the guns speak. Nobody swallows.' },
  { act: 3, nombreEs: 'el asalto', nombreEn: 'the assault', filas: 16, columnas: 16, minas: 55, escena: 'campo',
    dialogo: [
      { quien: 'sargento', es: 'El asalto.', en: 'The assault.' },
      { quien: 'sargento', es: 'Banderas, polvo y el mundo reducido a un metro cuadrado.', en: 'Flags, dust and the world reduced to one square metre.' },
    ],
    historiaEs: 'El asalto. Banderas, polvo y el mundo reducido a un metro cuadrado.',
    historiaEn: 'The assault. Flags, dust and the world reduced to one square metre.' },
  { act: 3, nombreEs: 'la retirada', nombreEn: 'the retreat', filas: 16, columnas: 16, minas: 61, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Retirada.', en: 'Retreat.' },
      { quien: 'comando', es: 'Un compañero se ha quedado dentro del campo. La guerra no espera.', en: 'A comrade stayed inside the field. War does not wait.' },
    ],
    historiaEs: 'Retirada. Un compañero se ha quedado dentro del campo. La guerra no espera.',
    historiaEn: 'Retreat. A comrade stayed inside the field. War does not wait.' },
  { act: 3, nombreEs: 'el recuento', nombreEn: 'the count', filas: 16, columnas: 16, minas: 66, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'De cuarenta volvemos nueve.', en: 'Of forty, nine return.' },
      { quien: 'comando', es: 'El parte dice «éxito».', en: "The report says 'success'." },
    ],
    historiaEs: 'El recuento: de cuarenta volvemos nueve. El parte dice «éxito».',
    historiaEn: "The count: of forty, nine return. The report says 'success'." },

  { act: 4, nombreEs: 'el corredor', nombreEn: 'the corridor', filas: 16, columnas: 16, minas: 69, escena: 'campo',
    dialogo: [
      { quien: 'telegrafista', es: 'El corredor. La única ruta hasta el depósito enemigo.', en: 'The corridor: the only route to the enemy depot.' },
      { quien: 'telegrafista', es: 'Un kilómetro de hierba y muerte.', en: 'A kilometre of grass and death.' },
    ],
    historiaEs: 'El corredor: la única ruta hasta el depósito enemigo. Un kilómetro de hierba y muerte.',
    historiaEn: 'The corridor: the only route to the enemy depot. A kilometre of grass and death.' },
  { act: 4, nombreEs: 'el búnker', nombreEn: 'the bunker', filas: 18, columnas: 18, minas: 72, escena: 'bunker',
    dialogo: [
      { quien: 'comando', es: 'Bajo el búnker, su sala de mandos.', en: 'Beneath the bunker, their command room.' },
      { quien: 'comando', es: 'Minada por dentro. Deliberadamente.', en: 'Mined from the inside. Deliberately.' },
    ],
    historiaEs: 'Bajo el búnker, su sala de mandos. Minada por dentro. Deliberadamente.',
    historiaEn: 'Beneath the bunker, their command room. Mined from the inside. Deliberately.' },
  { act: 4, nombreEs: 'el documento', nombreEn: 'the document', filas: 16, columnas: 20, minas: 70, escena: 'carta',
    dialogo: [
      { quien: 'comando', es: 'Un documento: sus órdenes.', en: 'A document: your orders.' },
      { quien: 'comando', es: 'Firmadas con su nombre. Por una mano que no es la suya.', en: 'Signed with your name by a hand that is not yours.' },
    ],
    historiaEs: 'Un documento: tus órdenes, firmadas con tu nombre por una mano que no es la tuya.',
    historiaEn: 'A document: your orders, signed with your name by a hand that is not yours.' },
  { act: 4, nombreEs: 'la traición', nombreEn: 'the betrayal', filas: 20, columnas: 20, minas: 78, escena: 'sello',
    dialogo: [
      { quien: 'comando', es: 'Nadie la envió.', en: 'Nobody sent you.' },
      { quien: 'comando', es: 'Un castigo disfrazado de papeleo. Pero ya está aquí.', en: 'A punishment dressed as paperwork. But you are here now.' },
    ],
    historiaEs: 'Nadie te envió. Esto era un castigo disfrazado de papeleo. Pero ya estás aquí.',
    historiaEn: 'Nobody sent you. This was a punishment dressed as paperwork. But you are here now.' },
  { act: 4, nombreEs: 'el último campo', nombreEn: 'the last field', filas: 16, columnas: 22, minas: 70, escena: 'radio',
    dialogo: [
      { quien: 'telegrafista', es: 'Su clave por última vez.', en: 'Your callsign for the last time.' },
      { quien: 'telegrafista', es: 'Que el silencio le sea propicio.', en: 'May the silence be kind to you.' },
    ],
    historiaEs: 'El telegrafista escucha tu clave por última vez. Que el silencio te sea propicio.',
    historiaEn: 'The radio operator hears your callsign for the last time. May the silence be kind to you.' },
  { act: 4, nombreEs: 'el desierto', nombreEn: 'the desert', filas: 22, columnas: 22, minas: 84, escena: 'sol',
    dialogo: [
      { quien: 'sargento', es: 'El calor rebota en la arena.', en: 'The heat bounces off the sand.' },
      { quien: 'sargento', es: 'Cada paso es una conjetura.', en: 'Every step is a guess.' },
    ],
    historiaEs: 'El calor rebota en la arena; cada paso es una conjetura.',
    historiaEn: 'The heat bounces off the sand; every step is a guess.' },
  { act: 4, nombreEs: 'la ciudad', nombreEn: 'the city', filas: 20, columnas: 24, minas: 88, escena: 'ciudad',
    dialogo: [
      { quien: 'recluta', es: 'La ciudad tomada.', en: 'The city taken.' },
      { quien: 'recluta', es: 'Mercado nuevo. Pólvora y pan fresco. Nadie la reconoce.', en: 'A new market, gunpowder and fresh bread. Nobody recognises you.' },
    ],
    historiaEs: 'La ciudad tomada. Mercado nuevo, olor a pólvora y pan fresco. Nadie te reconoce.',
    historiaEn: 'The city taken. A new market, the smell of gunpowder and fresh bread. Nobody recognises you.' },
  { act: 4, nombreEs: 'el almacén', nombreEn: 'the warehouse', filas: 22, columnas: 24, minas: 96, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'Su expediente, quemado por orden del mando.', en: 'Your file, burned by order of the command.' },
      { quien: 'comando', es: 'Usted sabe caminar.', en: 'You know how to walk.' },
    ],
    historiaEs: 'El almacén. Tu expediente, quemado por orden del mando. Tú sabes caminar.',
    historiaEn: 'The warehouse. Your file, burned by order of the command. You know how to walk.' },
  { act: 4, nombreEs: 'el expediente', nombreEn: 'the file', filas: 24, columnas: 24, minas: 104, escena: 'archivo',
    dialogo: [
      { quien: 'comando', es: 'El expediente sobre la mesa.', en: 'The file on the table.' },
      { quien: 'comando', es: 'El nombre tachado. El sello roto. Te deben el nombre.', en: 'The name struck through, the seal broken. They owe you your name.' },
    ],
    historiaEs: 'El expediente sobre la mesa. El nombre tachado, el sello roto. Te deben el nombre.',
    historiaEn: 'The file on the table. The name struck through, the seal broken. They owe you your name.' },
  { act: 4, nombreEs: 'la vuelta', nombreEn: 'the way back', filas: 26, columnas: 24, minas: 112, escena: 'tren',
    dialogo: [
      { quien: 'telegrafista', es: 'El tren de vuelta.', en: 'The train home.' },
      { quien: 'telegrafista', es: 'Los campos se alejan por la ventanilla. Nadie dice nada.', en: 'The fields slide past the window. Nobody says a word.' },
    ],
    historiaEs: 'El tren de vuelta. Los campos se alejan por la ventanilla. Nadie dice nada.',
    historiaEn: 'The train home. The fields slide past the window. Nobody says a word.' },
  { act: 4, nombreEs: 'la puerta', nombreEn: 'the doorway', filas: 26, columnas: 28, minas: 124, escena: 'puerta',
    dialogo: [
      { quien: 'comando', es: 'La puerta de casa.', en: 'The doorway of home.' },
      { quien: 'comando', es: 'Dos golpes. Nadie responde. La abre usted.', en: 'Two knocks. Nobody answers. You open it yourself.' },
    ],
    historiaEs: 'La puerta de casa. Dos golpes. Nadie responde. La abres tú.',
    historiaEn: 'The doorway of home. Two knocks. Nobody answers. You open it yourself.' },
  { act: 4, nombreEs: 'el final del campo', nombreEn: 'the end of the field', filas: 24, columnas: 30, minas: 132, escena: 'campo',
    dialogo: [
      { quien: 'comando', es: 'Limpie el último campo.', en: 'Clear the last field.' },
      { quien: 'comando', es: 'No volverá a pisar otro. El campo termina; usted, no.', en: 'You will never tread on another. The field ends; you don\'t.' },
    ],
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

export function configNivel(indice) {
  const nivel = NIVELES[indice];
  if (!nivel) return null;
  return { filas: nivel.filas, columnas: nivel.columnas, minas: nivel.minas };
}
