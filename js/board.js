// lógica pura del buscaminas: sin DOM, sin canvas y sin temporizador.
// el motor la usa para jugar; tools/check.mjs la prueba en node.

export class Tablero {
  // cfg: { filas, columnas, minas }. rng inyectable para las pruebas.
  constructor(cfg, rng = Math.random) {
    const filas = Math.floor(Number(cfg && cfg.filas));
    const columnas = Math.floor(Number(cfg && cfg.columnas));
    const minas = Math.floor(Number(cfg && cfg.minas));
    if (!Number.isFinite(filas) || filas < 2) throw new Error('filas inválidas');
    if (!Number.isFinite(columnas) || columnas < 2) throw new Error('columnas inválidas');
    const total = filas * columnas;
    if (!Number.isFinite(minas) || minas < 1) throw new Error('minas inválidas');
    if (minas > total - 1) throw new Error('demasiadas minas');

    this.filas = filas;
    this.columnas = columnas;
    this.total = total;
    this.minas = minas;
    this.rng = typeof rng === 'function' ? rng : Math.random;

    this.celdas = Array.from({ length: total }, () => ({
      mina: false,
      adj: 0,
      revelada: false,
      bandera: false,
    }));

    this.sembradas = false;
    this.estado = 'jugando'; // 'jugando' | 'ganado' | 'perdido'
    this.reveladas = 0;
    this.explosionIndice = -1;
  }

  indice(x, y) {
    return y * this.columnas + x;
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.columnas && y < this.filas;
  }

  vecinos(indice) {
    const x = indice % this.columnas;
    const y = Math.floor(indice / this.columnas);
    const out = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (this.dentro(nx, ny)) out.push(this.indice(nx, ny));
      }
    }
    return out;
  }

  // coloca las minas después del primer clic, lejos de la casilla elegida
  // (y de sus vecinas): el primer clic nunca explota y suele abrir hueco.
  sembrar(indiceSeguro) {
    if (this.sembradas) return;
    const zonaSegura = new Set([indiceSeguro, ...this.vecinos(indiceSeguro)]);

    let candidatas = [];
    for (let i = 0; i < this.total; i += 1) {
      if (!zonaSegura.has(i)) candidatas.push(i);
    }
    if (candidatas.length < this.minas) {
      // tableros diminutos: al menos la casilla del clic queda a salvo
      candidatas = [];
      for (let i = 0; i < this.total; i += 1) {
        if (i !== indiceSeguro) candidatas.push(i);
      }
    }

    // mezcla de Fisher–Yates con el rng inyectable
    for (let i = candidatas.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.rng() * (i + 1));
      const tmp = candidatas[i];
      candidatas[i] = candidatas[j];
      candidatas[j] = tmp;
    }
    for (let i = 0; i < this.minas; i += 1) {
      this.celdas[candidatas[i]].mina = true;
    }

    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].mina) continue;
      let n = 0;
      for (const v of this.vecinos(i)) {
        if (this.celdas[v].mina) n += 1;
      }
      this.celdas[i].adj = n;
    }
    this.sembradas = true;
  }

  // revelado en cadena desde indice. cosecha: lista de { indice, distancia }.
  // la distancia sirve para animar la apertura en oleada.
  _revelarZona(indice, cosecha, distanciaBase = 0) {
    const inicio = this.celdas[indice];
    if (inicio.revelada || inicio.bandera) return;

    const cola = [{ i: indice, distancia: distanciaBase }];
    const visto = new Set([indice]);
    let cabeza = 0;
    while (cabeza < cola.length) {
      const { i, distancia } = cola[cabeza];
      cabeza += 1;
      const celda = this.celdas[i];
      if (celda.revelada || celda.bandera) continue;
      celda.revelada = true;
      this.reveladas += 1;
      cosecha.push({ indice: i, distancia });
      if (celda.adj !== 0) continue;
      for (const v of this.vecinos(i)) {
        if (visto.has(v)) continue;
        const vecina = this.celdas[v];
        if (vecina.mina || vecina.revelada || vecina.bandera) continue;
        visto.add(v);
        cola.push({ i: v, distancia: distancia + 1 });
      }
    }
  }

  _comprobarVictoria() {
    if (this.estado !== 'jugando') return false;
    if (this.reveladas === this.total - this.minas) {
      this.estado = 'ganado';
      // al ganar se izan las banderas que falten sobre las minas restantes
      for (const celda of this.celdas) {
        if (celda.mina) celda.bandera = true;
      }
      return true;
    }
    return false;
  }

  // revela una casilla cubierta. devuelve { reveladas, explosion }.
  revelar(indice) {
    const vacio = { reveladas: [], explosion: -1 };
    if (this.estado !== 'jugando') return vacio;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return vacio;
    const celda = this.celdas[indice];
    if (celda.revelada || celda.bandera) return vacio;

    if (!this.sembradas) this.sembrar(indice);

    if (celda.mina) {
      celda.revelada = true;
      this.reveladas += 1;
      this.estado = 'perdido';
      this.explosionIndice = indice;
      return { reveladas: [{ indice, distancia: 0 }], explosion: indice };
    }

    const cosecha = [];
    this._revelarZona(indice, cosecha, 0);
    const gano = this._comprobarVictoria();
    if (gano) {
      return { reveladas: cosecha, explosion: -1, victoria: true };
    }
    return { reveladas: cosecha, explosion: -1 };
  }

  // pulsación sobre una casilla: revela si está cubierta y hace el acorde
  // (chord) si ya está abierta. Es el comportamiento de los buscaminas modernos.
  pulsar(indice) {
    const celda = Number.isInteger(indice) && this.celdas[indice];
    if (celda && celda.revelada) return this.acorde(indice);
    return this.revelar(indice);
  }

  // acorde: con tantas banderas alrededor como indica el número, abre el resto.
  // si alguna bandera estaba mal puesta, la mina que quede a la vista explota.
  acorde(indice) {
    const vacio = { reveladas: [], explosion: -1 };
    if (this.estado !== 'jugando') return vacio;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return vacio;
    const celda = this.celdas[indice];
    if (!celda.revelada || celda.adj === 0) return vacio;

    const vs = this.vecinos(indice);
    const banderas = vs.reduce((acc, v) => acc + (this.celdas[v].bandera ? 1 : 0), 0);
    if (banderas !== celda.adj) return vacio;

    const cosecha = [];
    let explosion = -1;
    for (const v of vs) {
      const vecina = this.celdas[v];
      if (vecina.bandera || vecina.revelada) continue;
      if (vecina.mina) {
        vecina.revelada = true;
        this.reveladas += 1;
        cosecha.push({ indice: v, distancia: 0 });
        if (explosion === -1) explosion = v;
        continue;
      }
      this._revelarZona(v, cosecha, 0);
    }

    if (explosion !== -1) {
      this.estado = 'perdido';
      this.explosionIndice = explosion;
      return { reveladas: cosecha, explosion };
    }

    const gano = this._comprobarVictoria();
    return { reveladas: cosecha, explosion: -1, victoria: gano };
  }

  // al perder, destapa el tablero entero: la partida ha terminado y el
  // campo queda a la vista, como un mapa que ya no sirve a nadie.
  // de paso anota cuántas casillas seguras destapó el jugador.
  revelarTodo() {
    this.despejadasPorJugador = this.celdas.filter((c) => c.revelada && !c.mina).length;
    for (const celda of this.celdas) {
      celda.revelada = true;
    }
  }

  // pone o quita la bandera. devuelve 'bandera' | 'sin-bandera' | null.
  alternarBandera(indice) {
    if (this.estado !== 'jugando') return null;
    if (!Number.isInteger(indice) || indice < 0 || indice >= this.total) return null;
    const celda = this.celdas[indice];
    if (celda.revelada) return null;
    celda.bandera = !celda.bandera;
    return celda.bandera ? 'bandera' : 'sin-bandera';
  }

  contarBanderas() {
    let n = 0;
    for (const celda of this.celdas) {
      if (celda.bandera) n += 1;
    }
    return n;
  }

  restantesMinas() {
    return this.minas - this.contarBanderas();
  }

  // minas que quedan por descubrir/marcar al perder: para el motor
  minasOcultas() {
    const out = [];
    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].mina && !this.celdas[i].bandera) out.push(i);
    }
    return out;
  }

  // banderas mal puestas (sobre una casilla sin mina) para el resumen final
  banderasErroneas() {
    const out = [];
    for (let i = 0; i < this.total; i += 1) {
      if (this.celdas[i].bandera && !this.celdas[i].mina) out.push(i);
    }
    return out;
  }
}
