# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

## [Unreleased]

### Añadido
- Seis dificultades fijas: principiante, fácil, intermedio, difícil, experto y deadly (-)
- Modificadores (minas extra, reloj, sin banderas, pánico, modo difícil) aplicables a cualquier dificultad excepto deadly
- Animación de entrada que revela el tablero real antes de jugar (solo con modificadores activos)
- Fondo rojo sólido en el modo difícil
- Efectos de TV al morir y estática en pantalla de fin
- Archivo LICENSE, CHANGELOG, CONTRIBUTING y SECURITY.md

### Cambiado
- La música se corta con fundido más rápido (0.15 s) antes del drop
- Las pantallas de fin (muerte/victoria) ya no cortan la música de final
- `comprobarPiezas` acepta cualquier cantidad de dificultades (no solo 3)
- `nombreDificultad` usa claves de i18n dinámicas (`diffBeginner`, `diffFacile`, etc.)

### Eliminado
- Música procedural (`iniciarProcedural`, `detenerProcedural`, `procTick`, `ESCALA_MOD`)
- `dibujarPuerta`, `prepararFondoRojo`, `limpiarFondoRojo`, `ajustarFondoRojo`
- Barras de ecualizador del fondo rojo (solo rojo sólido)
- Efecto de escritura (máquina de escribir) en diálogos de campaña

## [2.0.0] - 2026-11-22

### Añadido
- Modo campaña: "la Treinta", treinta niveles en cuatro actos con diálogos y escenas dibujadas a mano
- Selector de idiomas ES/EN
- Modificadores tipo The Minefields (un solo activo a la vez, UI tipo snake)
- Animación de entrada estilo estática de TV con fondo negro
- Audio real (.ogg/.mp3) sin música procedural simulada
- HUD con récord y mejor tiempo por dificultad
- Mapa de campaña desplazable a lo ancho con rutas profundas
- Partida personalizada (filas, columnas, minas ajustables)

### Cambiado
- Reemplazo de la animación de puerta por estática de TV
- Selector de modificadores de selección única a toggle múltiple

### Eliminado
- Música de fondo procedural
- Fondo rojo reactivo al audio (se restauró como rojo sólido en la v2.0.x)
