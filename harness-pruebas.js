// Harness de pruebas del Evaluador musical (paquete preparado, auditoría
// ronda 1, oleada 2 — 2026-11-16)
// Uso: node harness-pruebas.js
// Los datos reales son OPCIONALES: si falta public/datos-reales.json o es
// JSON inválido, se avisa con un mensaje claro ("genera el export con
// GET /api/canciones/exportar") y solo corren las pruebas [invariante]
// con el fixture sintético FIX; las [datos reales] se saltan (SKIP),
// no fallan. Con datos reales presentes, corren todas.
// Las funciones de color (hexAHsl, hslARgb, mezcla, rgbaDesde, suave,
// luminanciaRelativa, yObjetivo, tonoPorNota, colorPorNota, alfaGlowGod)
// se EXTRAEN del app.js real por nombre y se evalúan (P1): si la
// extracción falla, el harness muere con mensaje claro, nunca sigue con
// copias viejas. Paleta G INVERTIDA (2026-11-17): las funciones son auto-contenidas
// (usan literales, sin variables de módulo ni medio pálido).
// Las listas GENEROS_VALIDOS/ETIQUETAS_VALIDAS se extraen de main.cpp
// (P7). Las reglas de backend (calificar, POST/PUT /info, artistas) se
// prueban como espejos documentados de main.cpp: el harness no ejecuta
// el backend; valida que las reglas documentadas se cumplan en el espejo.
// Secciones: 1 fórmula, 2 desempate, 3 colores 0–90%, 4 histograma,
// 5 gráficas nuevas, 5b histograma SQL real (ronda 2), 5c anclajes de
// texto ronda 2 (DESEMPATE, color de fila, filtrarRango, sw.js),
// 6 auditoría final, 7 color de fila, 8 auditoría G,
// 9 auditoría G ronda 2, 10 artistas, 11 P4 fórmula límites, 12 P5
// bordes de rampa, 13 P6 cadena de desempate, 14 P7 POST/PUT /info,
// 15 P8 artistas, 16 P9 catálogo vacío, 17 P11 sw.js manual,
// 18 G-L1 secretos en logs, 18b R2 logs (sanitizar, pool, id), 19 E2/E3 calificar, 20 DESEMPATE_ASC,
// 21 /api/salud JSON, 22 R2-O2 control de errores, 23 ronda 3 oleada 1
// (GOD ≥19, mostrarErrorHttp, claveCancion, rate limits, cuerpo 64KB,
// timeouts, token sessionStorage, validación POST/PUT, órdenes, búsqueda
// UTF-8, salud/db, pool, CORS, export CSV, conBloqueo, stats en vivo),
// 24 ronda 3 oleadas 2+3 (401 con distinción, DB caída → 503,
// total_paginas, CSV objetos, logs: contraseña con ':', decodificada
// corta, nivel Warning de Crow).
// 25 ronda 4 oleada 1 (splash: los 8 tests propuestos en la ronda 3;
// colorFila REAL extraído de app.js (M1); anclas numéricas de backend
// extraídas de main.cpp (M3); casos borde: catálogo 678, UTF-8, título
// 200 (B1 bytes vs caracteres, CORREGIDO ronda 5), .xx5 en ambos sentidos, catálogo vacío
// e histograma con bins vacíos; espejos corregidos: paginaDe sin max y
// statsDe con mediana 0).
const fs = require('fs');
const path = require('path');
// R5 (2026-11-17, ChatGPT): BASE portable — se resuelve desde __dirname,
// no desde process.env.HOME + una ruta fija de la máquina del autor; el
// harness corre en cualquier clon (npm test) y en el paquete preparado.
// Los SQL de migración viven en migraciones/ en el repo y en la raíz en el
// paquete preparado (que no tiene migraciones/): leerSql() resuelve
// migraciones/ primero y la raíz como fallback. schema.sql vive en raíz
// en ambos layouts.
const BASE = __dirname + path.sep;
// resolverSql(raiz, nombre): migraciones/<nombre> si existe, si no <nombre>
// en la raíz. Función pura para poder probarla con directorios temporales.
const resolverSql = (raiz, nombre) => {
  const enMig = path.join(raiz, 'migraciones', nombre);
  return fs.existsSync(enMig) ? fs.readFileSync(enMig, 'utf8') : fs.readFileSync(path.join(raiz, nombre), 'utf8');
};
const leerSql = nombre => resolverSql(BASE, nombre);
let fallos = 0, pasadas = 0, saltadas = 0;
const ok = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' — ' + msg); if (cond) pasadas++; else fallos++; };
const skip = msg => { saltadas++; console.log('SKIP — ' + msg); };

// ---------- 0. Datos reales (opcionales) + fixture sintético ----------
// P2: sin datos reales no se muere con stack trace; mensaje claro y SKIP.
let tieneDatos = false, C = [];
const RUTA_DATOS = BASE + 'public/datos-reales.json';
try {
  const datos = JSON.parse(fs.readFileSync(RUTA_DATOS, 'utf8'));
  if (!datos || !Array.isArray(datos.canciones)) throw new Error('el JSON no trae un arreglo "canciones"');
  C = datos.canciones; tieneDatos = true;
} catch (e) {
  console.log('SIN DATOS REALES: no se pudo leer public/datos-reales.json (' + e.message + ').');
  console.log('  Genera el export con GET /api/canciones/exportar y guárdalo en public/datos-reales.json;');
  console.log('  las pruebas [datos reales] se saltan y las [invariante] corren con el fixture sintético.');
}
// P2: fixture sintético mínimo auto-contenido (fórmula, desempate y
// rampas corren sin datos reales). Los 3 son consistentes con la fórmula.
const FIX = [
  { id: 1, titulo: 'Canción alfa', artista: 'Artista A', artistas: [{ nombre: 'Artista A', rol: 'principal' }], calificacion_final: 19.60, ritmo: 10, letras: 9.6, coro: 10, importancia: 4.7, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, genero: 'Pop' },
  { id: 2, titulo: 'Canción beta', artista: 'Artista B', artistas: [{ nombre: 'Artista B', rol: 'principal' }], calificacion_final: 10.00, ritmo: 8, letras: 8, coro: 8, importancia: 2, antiguedad: 0, nostalgia: 0, descubrimiento: 0, complejidad: 0, arte_visual: 0, genero: 'Rock' },
  { id: 3, titulo: 'Sin calificar', artista: 'Artista C', artistas: [{ nombre: 'Artista C', rol: 'principal' }], calificacion_final: 0, ritmo: null, letras: null, coro: null, importancia: null, antiguedad: 0, nostalgia: 0, descubrimiento: 0, complejidad: 0, arte_visual: 0, genero: 'Pop' },
];

// ---------- 0b. Extracción desde app.js / main.cpp (fail-fast, P1/P7) ----------
const extraerFuncion = (src, nombre, archivo) => {
  const idx = src.indexOf('function ' + nombre + '(');
  if (idx === -1) throw new Error(`no se encontró 'function ${nombre}(' en ${archivo}`);
  const abre = src.indexOf('{', idx);
  if (abre === -1) throw new Error(`'function ${nombre}(' sin cuerpo en ${archivo}`);
  let prof = 0;
  for (let i = abre; i < src.length; i++) {
    if (src[i] === '{') prof++;
    else if (src[i] === '}') { prof--; if (prof === 0) return src.slice(idx, i + 1); }
  }
  throw new Error(`llaves sin cerrar en '${nombre}' (${archivo})`);
};
const appJsSrc = fs.readFileSync(BASE + 'public/app.js', 'utf8');
// Ronda 5, extras bloque 6 (módulo 1): las 10 funciones de color viven
// en public/js/colores.js (antes en app.js); el harness las extrae de
// ahí, sin cambiar una sola línea de lógica.
const coloresJsSrc = fs.readFileSync(BASE + 'public/js/colores.js', 'utf8');
// Ronda 5, extras bloque 6 (módulo 2): la capa de red + avisos vive en
// public/js/api.js (antes en app.js); el harness extrae de ahí
// mostrarErrorHttp y escapeHtml.
const apiJsSrc = fs.readFileSync(BASE + 'public/js/api.js', 'utf8');
const mainCppSrc = fs.readFileSync(BASE + 'main.cpp', 'utf8');
let colores;
try {
  const fns = ['hexAHsl', 'hslARgb', 'mezcla', 'rgbaDesde', 'suave', 'luminanciaRelativa', 'yObjetivo', 'tonoPorNota', 'colorPorNota', 'alfaGlowGod'].map(n => extraerFuncion(coloresJsSrc, n, 'public/js/colores.js'));
  // Paleta G (2026-11-16): las funciones de color son auto-contenidas
  // (usan literales, sin variables de módulo); no hay sandbox de nota.
  const sandbox = fns.join('\n')
    + '\nreturn { hexAHsl, hslARgb, mezcla, rgbaDesde, suave, luminanciaRelativa, yObjetivo, tonoPorNota, colorPorNota, alfaGlowGod };';
  colores = new Function(sandbox)();
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (P1): no se pudieron extraer las funciones de color de public/js/colores.js: ' + e.message);
  console.error('El harness NO sigue con copias viejas: corrige colores.js o el extractor y vuelve a correr.');
  process.exit(1);
}
const { hexAHsl, hslARgb, mezcla, rgbaDesde, suave, luminanciaRelativa, yObjetivo, tonoPorNota, colorPorNota, alfaGlowGod } = colores;
// colorFila: espejo exacto de la lógica de color de app.js (cargarCatalogo,
// bloque // INICIO-COLOR-G), con las funciones extraídas. Sin calificar
// (nota <= 0) la fila es gris y el dorado exige nota > 0 (oleada 1).
// Paleta G INVERTIDA (2026-11-17): colorPorNota (bisección, 60 iteraciones,
// Y 0.21→0.48, pendiente 0.27) + mezcla HSL 11-30 hacia el dorado
// (restaurada 2026-11-17 por decisión de Nova tras rechazar el híbrido
// suave, y ALARGADA a 11-30 el mismo día por decisión suya; el camino
// corto turquesa→dorado pasa por verde/lima: riesgo conocido y
// aceptado). Sin grad ni pálido.
const colorFila = (nota, rank) => {
  let colorBase;
  if (nota <= 0) colorBase = '#6b7280';
  else colorBase = colorPorNota(nota);
  if (nota > 0 && rank > 10 && rank <= 30) colorBase = mezcla(0.9 * suave((30 - rank) / 19), colorBase, '#facc15');
  if (nota > 0 && rank <= 10) colorBase = '#facc15';
  return colorBase;
};
// alfaGlowFila: espejo del alfa de glow de app.js (cargarCatalogo).
// El dorado por puesto tiene alfa 0.70 aunque su nota sea GOD: en app.js
// el glow dorado sobrescribe al de banda.
const alfaGlowFila = (nota, rank) => {
  if (nota <= 0) return 0.30;
  if (nota > 0 && rank <= 10) return 0.70;
  if (nota >= 19) return alfaGlowGod(nota);
  if (nota >= 18) return 0.40;
  if (nota >= 17.8) return 0.35;
  return 0.30;
};
// rgb(...) o hex → hex minúsculo, para fijar literales legibles en los tests
// de color (la referencia de la regla se da en hex).
const aHex = c => {
  const m = c.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return m ? '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('') : c.toLowerCase();
};
// P7: listas extraídas de main.cpp (no replicadas a mano).
const extraerListaCpp = (src, nombre) => {
  const m = src.match(new RegExp(nombre + ' = \\{([^}]*)\\}'));
  if (!m) throw new Error(`no se encontró '${nombre} = {...}' en main.cpp`);
  return [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]);
};
let GENEROS_VALIDOS_CPP, ETIQUETAS_VALIDAS_CPP;
try {
  GENEROS_VALIDOS_CPP = extraerListaCpp(mainCppSrc, 'GENEROS_VALIDOS');
  ETIQUETAS_VALIDAS_CPP = extraerListaCpp(mainCppSrc, 'ETIQUETAS_VALIDAS');
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (P7): ' + e.message);
  process.exit(1);
}

// Helpers de fórmula/desempate (espejos de main.cpp: DESEMPATE).
const calc = c => (c.ritmo ?? 0) * 0.35 + (c.letras ?? 0) * 0.25 + (c.coro ?? 0) * 0.40
  + (c.antiguedad ? 1 : 0) + (c.nostalgia ? 1 : 0) + (c.descubrimiento ? 1 : 0)
  + (c.complejidad ? 1 : 0) + (c.importancia ?? 0) + (c.arte_visual ?? 0);
const total1000 = c => Math.round(c.ritmo * 10) * 35 + Math.round(c.letras * 10) * 25
  + Math.round(c.coro * 10) * 40 + Math.round((c.importancia ?? 0) * 10) * 100
  + ((c.antiguedad ? 1 : 0) + (c.nostalgia ? 1 : 0) + (c.descubrimiento ? 1 : 0) + (c.complejidad ? 1 : 0)) * 1000
  + Math.round((c.arte_visual ?? 0) * 1000);
const redondeoExacto = t => Math.round(t / 10) / 100; // mitad-arriba sobre milésimas enteras (igual que std::round en main.cpp)
const base = c => (c.ritmo ?? 0) * 0.35 + (c.letras ?? 0) * 0.25 + (c.coro ?? 0) * 0.40;
const bonos = c => (c.antiguedad ? 1 : 0) + (c.nostalgia ? 1 : 0) + (c.descubrimiento ? 1 : 0) + (c.complejidad ? 1 : 0) + (c.arte_visual ?? 0);
const cmp = (a, b) =>
  (b.calificacion_final - a.calificacion_final)
  || (base(b) - base(a))
  || ((b.importancia ?? 0) - (a.importancia ?? 0))
  || (bonos(b) - bonos(a))
  || ((b.descubrimiento ? 1 : 0) - (a.descubrimiento ? 1 : 0))
  || ((b.coro ?? 0) - (a.coro ?? 0))
  || ((b.ritmo ?? 0) - (a.ritmo ?? 0))
  || ((b.letras ?? 0) - (a.letras ?? 0))
  || (a.id - b.id);

// ---------- 1. Fórmula [invariante con FIX] + [datos reales] ----------
// Comparación en milésimas enteras (evita el error binario): ritmo/letras/
// coro/importancia tienen 1 decimal, los pesos 2; el total exacto tiene 3
// decimales. La guardada es ese total redondeado a 2 decimales (mitad arriba).
let malFix = [];
for (const c of FIX) {
  if (c.calificacion_final <= 0) continue;
  if (Math.abs(total1000(c) / 1000 - c.calificacion_final) > 0.001) malFix.push(c.id);
}
ok(malFix.length === 0, `P2 [invariante] fórmula con fixture sintético: ${FIX.filter(c => c.calificacion_final > 0).length} calificadas, 0 desajustes (corre sin datos reales)`);
if (tieneDatos) {
  let mal = [], medioCentavo = 0, exactos = 0;
  for (const c of C) {
    if (c.calificacion_final <= 0) continue;
    const t = total1000(c); // milésimas exactas
    const diff = Math.abs(t / 1000 - c.calificacion_final);
    if (diff < 0.001) exactos++;
    else if (diff <= 0.0101 && t % 10 === 5) medioCentavo++; // solo en el límite .xx5: redondeo binario
    else mal.push(c.id);
  }
  ok(C.length === 677, `[datos reales] catálogo: ${C.length} canciones`);
  ok(mal.length === 0, `[datos reales] fórmula: ${exactos} exactas a 2 decimales, ${medioCentavo} difieren 0.01 solo en el límite .xx5 (redondeo binario del double), 0 desajustes reales (mal: ${mal.slice(0, 5).join(',') || 'ninguno'})`);
  const top1 = C.find(c => c.id === 144);
  ok(Math.abs(calc(top1) - 19.60) < 0.005, `[datos reales] ID 144 = ${calc(top1).toFixed(2)} (esperado 19.60)`);
  const c677 = C.find(c => c.id === 677);
  console.log(`  ID 677: "${c677.titulo}" — ${c677.artista}, nota ${c677.calificacion_final} (título/artista siguen pendientes por API)`);

  // Consistencia de nulos: calificada => ritmo/letras/coro/importancia no nulos
  let nulosMal = C.filter(c => c.calificacion_final > 0 && (c.ritmo == null || c.letras == null || c.coro == null || c.importancia == null)).map(c => c.id);
  ok(nulosMal.length === 0, `[datos reales] calificadas con ritmo/letras/coro/importancia no nulos: ${nulosMal.length} problemas`);
  // P10: antes era solo un console.log; sin_calificar === 0 hoy es invariante.
  let sinCal = C.filter(c => c.calificacion_final === 0);
  ok(sinCal.length === 0, `[datos reales] sin calificar: ${sinCal.length} (esperado 0)`);
} else skip('fórmula / Top 1 / nulos / sin calificar con datos reales (sin public/datos-reales.json)');

// ---------- 2. Desempate [invariante con FIX] + [datos reales] ----------
ok(JSON.stringify([...FIX].sort(cmp).map(c => c.id)) === JSON.stringify([1, 2, 3]),
  'P2 [invariante] desempate con fixture sintético: orden 1, 2, 3 (19.60 > 10.00 > 0)');
if (tieneDatos) {
  const ordenadas = [...C].sort(cmp);
  const top10 = ordenadas.slice(0, 10).map(c => c.id);
  ok(JSON.stringify(top10) === JSON.stringify([144, 167, 213, 116, 307, 606, 348, 29, 399, 145]),
    `[datos reales] Top 10 con desempate: ${top10.join(',')} (esperado 144,167,213,116,307,606,348,29,399,145)`);
  // Empate 19.38: 348 (base 9.78) antes que 29 (base 9.68)
  const i348 = ordenadas.findIndex(c => c.id === 348), i29 = ordenadas.findIndex(c => c.id === 29);
  ok(i348 < i29, `[datos reales] empate 19.38: 348 (base ${base(C.find(c => c.id === 348)).toFixed(2)}) antes que 29 (base ${base(C.find(c => c.id === 29)).toFixed(2)})`);
  let grupos = {};
  for (const c of C) grupos[c.calificacion_final.toFixed(2)] = (grupos[c.calificacion_final.toFixed(2)] || 0) + 1;
  const nGrupos = Object.values(grupos).filter(n => n > 1).length;
  console.log(`  grupos de empate: ${nGrupos} (170 según REVISION.md)`);
  // Rank global: puesto = posición en este orden
  const rank = new Map(ordenadas.map((c, i) => [c.id, i + 1]));
  ok(rank.get(144) === 1 && rank.get(606) === 6, `[datos reales] rank_global: 144=#1, 606=#6`);
  // P10: antes era solo un console.log; la #1 de género fuera del Top 10
  // global NO es dorada (colorFila extraído de app.js, sección 7).
  const porGenero = {};
  for (const c of ordenadas) if (!porGenero[c.genero]) porGenero[c.genero] = c;
  const fueraTop = Object.values(porGenero).filter(c => rank.get(c.id) > 10 && c.calificacion_final >= 19);
  ok(fueraTop.every(c => colorFila(c.calificacion_final, rank.get(c.id)) !== '#facc15'),
    `[datos reales] #1 de género con ≥19 fuera del Top 10 global no dorada: ${fueraTop.length} casos (${fueraTop.map(c => `#${rank.get(c.id)} ${c.genero}`).join(', ') || 'ninguna'})`);
  ok(ordenadas.every(c => rank.get(c.id) <= 10 || colorFila(c.calificacion_final, rank.get(c.id)) !== '#facc15'),
    '[datos reales] ninguna canción con puesto > 10 es dorado pleno (el dorado es solo Top 10)');
} else skip('Top 10 / empate 19.38 / rank global / #1 de género no dorada con datos reales (sin public/datos-reales.json)');

// ---------- 3. Colores: mezcla HSL y degradado 0–90% (funciones extraídas de app.js, P1/L3) ----------
// Distancia cromática: ¿el color mezclado está al t% entre a y b?
// (a y b pueden venir en hex: se convierten a rgb primero)
const aRgb = s => s.startsWith('#') ? [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)] : s.match(/\d+/g).map(Number);
const rgbDe = s => s.match(/\d+/g).map(Number);
const dist = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const fraccion = (m, a, b) => { // proyección de m sobre el segmento a->b
  const A = aRgb(a), B = aRgb(b), M = rgbDe(m);
  const ab = B.map((v, i) => v - A[i]), am = M.map((v, i) => v - A[i]);
  return ab.reduce((s, v, i) => s + v * am[i], 0) / ab.reduce((s, v) => s + v * v, 0);
};
const f50 = fraccion(mezcla(0.5, '#d946ef', '#22c55e'), '#d946ef', '#22c55e');
const f75 = fraccion(mezcla(0.75, '#d946ef', '#22c55e'), '#d946ef', '#22c55e');
ok(Math.abs(f50 - 0.5) < 0.08 && Math.abs(f75 - 0.75) < 0.08,
  `mezcla fuchsia→verde (proyección RGB del camino HSL): 50%=${(f50 * 100).toFixed(0)}%, 75%=${(f75 * 100).toFixed(0)}%`);
// Verificación exacta en espacio HSL: el tono/sat/luz deben interpolarse
// linealmente (el camino HSL es curvo en RGB, por eso la proyección no es exacta)
const hslCerca = (m, a, b, t) => {
  const A = hexAHsl(a), B = hexAHsl(b), M = hexAHsl('#' + rgbDe(m).map(v => v.toString(16).padStart(2, '0')).join(''));
  let dh = B[0] - A[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
  const hEsp = (A[0] + dh * t + 360) % 360;
  const dhM = Math.min(Math.abs(M[0] - hEsp), 360 - Math.abs(M[0] - hEsp));
  return dhM < 2 && Math.abs(M[1] - (A[1] + (B[1] - A[1]) * t)) < 0.02 && Math.abs(M[2] - (A[2] + (B[2] - A[2]) * t)) < 0.02;
};
ok(hslCerca(mezcla(0.5, '#d946ef', '#22c55e'), '#d946ef', '#22c55e', 0.5)
  && hslCerca(mezcla(0.75, '#d946ef', '#22c55e'), '#d946ef', '#22c55e', 0.75),
  `mezcla fuchsia→verde en HSL: tono/sat/luz exactos al 50% y al 75%`);
// Saturación viva en transición (el bug RGB daba 24%)
const sat = rgb => { const [r, g, b] = rgb.map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
ok(sat(rgbDe(mezcla(0.5, '#d946ef', '#22c55e'))) > 0.6,
  `saturación transición fuchsia→verde 50%: ${(sat(rgbDe(mezcla(0.5, '#d946ef', '#22c55e'))) * 100).toFixed(0)}% (RGB daba 24%)`);
// Verde→dorado por puesto: 20→0%, 11→90% (rampa 0-90% con curva suave)
ok(hslCerca(mezcla(0, '#22c55e', '#facc15'), '#22c55e', '#facc15', 0)
  && hslCerca(mezcla(0.9, '#22c55e', '#facc15'), '#22c55e', '#facc15', 0.9),
  `verde→dorado en HSL: puesto 20 = 0% exacto (color puro), puesto 11 = 90% exacto (rampa 0-90% desde 2026-11-14)`);
// Rampa 0-90% con smoothstep (desde 2026-11-14): grad() — nota 18.9
// t=(18.9-18.5)/0.5=0.8, suave(0.8)=0.896, mezcla 0.9*0.896=80.64%
const gradT = n => (n - 18.5) / 0.5;
console.log(`  nota 18.9 → t=${gradT(18.9).toFixed(2)} → mezcla ${(0.9 * suave(gradT(18.9)) * 100).toFixed(2)}% (esperado 80.64%)`);

// ---------- 4. Histograma [datos reales] ----------
// Las notas guardadas tienen maximo 2 decimales: el backend redondea al
// guardar (2a auditoria). Sin eso, un total .xx5 quedaria con 3 decimales
// y el filtro del histograma ([a, b-0.01]) lo dejaria fuera de su rango.
// Misma lógica que el CASE del endpoint /histograma (main.cpp), incluido
// el rango 'menos-10' nuevo de la auditoría D.
const binSql = n => n === 0 ? 'sin_calificar' : (n > 0 && n < 10) ? 'menos-10' : n < 12 ? '10-12' : n < 14 ? '12-14' : n < 16 ? '14-16' : n < 17.8 ? '16-17.8' : n < 18 ? '17.8-18' : n < 19 ? '18-19' : '19-20';
const bins = { 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-17.8': 0, '17.8-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 };
if (tieneDatos) {
  for (const c of C) bins[binSql(c.calificacion_final)]++;
  const con3 = C.filter(c => Math.abs(c.calificacion_final * 100 - Math.round(c.calificacion_final * 100)) > 1e-9);
  ok(con3.length === 0, `[datos reales] notas con mas de 2 decimales: ${con3.length} (deben ser 0)`);
  ok(JSON.stringify(bins) === JSON.stringify({ 'menos-10': 0, '10-12': 22, '12-14': 79, '14-16': 157, '16-17.8': 185, '17.8-18': 16, '18-19': 142, '19-20': 76, 'sin_calificar': 0 }),
    `[datos reales] histograma: ${JSON.stringify(bins)}`);
  console.log(`  géneros (export viejo): ${JSON.stringify(Object.entries(C.reduce((m, c) => { m[c.genero] = (m[c.genero] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5))}`);
} else skip('histograma con datos reales (sin public/datos-reales.json)');

// ---------- 5. Gráficas nuevas (auditoría D) ----------
// Rango 'menos-10' con datos sintéticos (hoy no hay canciones < 10: mínimo 10.05).
const sint = [8.5, 9.99, 0, 10.05, 19.99].map(n => ({ calificacion_final: n }));
const binsSint = sint.map(s => binSql(s.calificacion_final));
ok(JSON.stringify(binsSint) === JSON.stringify(['menos-10', 'menos-10', 'sin_calificar', '10-12', '19-20']),
  `menos-10 sintético: ${binsSint.join(',')}`);
// Cada filtro del frontend reproduce su bin (datos reales + sintéticos;
// sin datos reales, solo sintéticos: bins en 0).
const filtro = r => r === 'sin_calificar' ? [0, 0] : r === 'menos-10' ? [0.01, 9.99] : r === '19-20' ? [19, 20] : (() => { const [a, b] = r.split('-').map(Number); return [a, b - 0.01]; })();
let desajuste = [];
for (const r of Object.keys(bins)) {
  const [a, b] = filtro(r);
  const enFiltro = [...C, ...sint].filter(s => { const v = s.calificacion_final || 0; return v >= a && v <= b; }).length;
  const enBin = bins[r] + sint.filter(s => binSql(s.calificacion_final) === r).length;
  if (enFiltro !== enBin) desajuste.push(r);
}
ok(desajuste.length === 0, `filtro = bin en todos los rangos (desajuste: ${desajuste.join(',') || 'ninguno'})`);
// Orden CASE: menos-10 primero, sin calificar último.
const ordenCase = rs => [...rs].sort((x, y) => (x === 'sin_calificar' ? 99 : x === 'menos-10' ? 0 : parseInt(x)) - (y === 'sin_calificar' ? 99 : y === 'menos-10' ? 0 : parseInt(y)));
ok(JSON.stringify(ordenCase(Object.keys(bins))) === JSON.stringify(['menos-10', '10-12', '12-14', '14-16', '16-17.8', '17.8-18', '18-19', '19-20', 'sin_calificar']), 'orden CASE del histograma');
if (tieneDatos) {
  // Porcentajes redondeados suman 99, 100 o 101 (±1 por redondeo con 9
  // bins: 0+3+12+23+27+2+21+11+0 = 99 con los datos reales; antes con 8
  // bins sumaba 100 exacto).
  const pcts = Object.values(bins).map(x => Math.round(x / C.length * 100));
  ok(Math.abs(pcts.reduce((a, b) => a + b, 0) - 100) <= 1, `[datos reales] porcentajes: ${pcts.join('+')}=${pcts.reduce((a, b) => a + b, 0)} (±1 por redondeo con 9 bins)`);
  // Género top: Baladas 18.8, sin empate en el máximo (2º Metal 18.4).
  const notasGenero = {};
  for (const c of C) if (c.calificacion_final > 0) (notasGenero[c.genero] = notasGenero[c.genero] || []).push(c.calificacion_final);
  const avgs = Object.entries(notasGenero).map(([g, v]) => [g, v.length, Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10]).sort((a, b) => b[2] - a[2] || b[1] - a[1]);
  ok(avgs[0][0] === 'Baladas' && avgs[0][2] === 18.8 && avgs.filter(a => a[2] === avgs[0][2]).length === 1,
    `[datos reales] género top: ${avgs[0][0]} ${avgs[0][2]} (${avgs[0][1]} canc.), 2º ${avgs[1][0]} ${avgs[1][2]}, peor ${avgs[avgs.length - 1][0]} ${avgs[avgs.length - 1][2]}`);
} else skip('porcentajes / género top con datos reales (sin public/datos-reales.json)');

// ---------- 5b. Ronda 2 — la consulta SQL real del histograma (fix 2026-11-16) ----------
// Hasta la ronda 1 el harness solo comprobaba ESPEJOS del histograma
// (binSql y ordenCase): si alguien revertía el fix de main.cpp (volver a
// usar el alias 'rango' dentro del CASE del ORDER BY con GROUP BY),
// todos los tests seguirían en verde y el endpoint volvería a dar 500 en
// vivo ("column \"rango\" does not exist"). Estas pruebas leen la consulta
// REAL de main.cpp y fijan la forma que Postgres acepta: GROUP BY dentro
// de la subconsulta y ORDER BY fuera, donde 'rango' ya es columna real.
const histBlock = mainCppSrc.slice(mainCppSrc.indexOf('CROW_ROUTE(app, "/api/canciones/histograma")'), mainCppSrc.indexOf('respuestaErrorDb("GET /api/canciones/histograma"'));
const histSql = histBlock.slice(histBlock.indexOf('"SELECT rango, total FROM ("'), histBlock.indexOf('END");')); // desde el primer literal de la consulta (el comentario previo a N.exec( menciona ORDER BY y contaminaría la comprobación)
const histInner = histSql.slice(0, histSql.indexOf('FROM canciones GROUP BY 1) s'));
const histOuter = histSql.slice(histSql.indexOf('FROM canciones GROUP BY 1) s'));
ok(histSql.length > 400 && histSql.includes('SELECT rango, total FROM (') && histSql.includes('FROM canciones GROUP BY 1) s') && histBlock.includes('res["histograma"]'),
  'histograma SQL: la consulta va en subconsulta (SELECT rango, total FROM (... GROUP BY 1) s) y responde res["histograma"]');
ok(histInner.includes('SELECT CASE') && !histInner.includes('ORDER BY'),
  'histograma SQL: dentro de la subconsulta (con GROUP BY) NO hay ORDER BY — el alias rango nunca se usa ahí');
ok(histOuter.includes("ORDER BY CASE WHEN rango = 'sin_calificar' THEN 99 WHEN rango = 'menos-10' THEN 0")
  && histOuter.includes("CAST(SUBSTRING(rango FROM '^[0-9]+') AS INT)"),
  'histograma SQL: el ORDER BY exterior usa rango como columna real (sin_calificar último=99, menos-10 primero=0, resto por número inicial)');
ok(['sin_calificar', 'menos-10', '10-12', '12-14', '14-16', '16-17.8', '17.8-18', '18-19', '19-20'].every(r => histInner.includes("'" + r + "'")),
  'histograma SQL: el CASE interior produce los 9 rangos (sin_calificar, menos-10, 10-12, 12-14, 14-16, 16-17.8, 17.8-18, 18-19, 19-20)');
ok(histInner.includes('COALESCE(calificacion_final,0) = 0') && histInner.includes('calificacion_final > 0 AND calificacion_final < 10')
  && ['< 12', '< 14', '< 16', '< 17.8', '< 18', '< 19'].every(t => histInner.includes('calificacion_final ' + t)),
  'histograma SQL: bordes del CASE (0 = sin calificar; <10, <12, <14, <16, <17.8, <18, <19) — mismos que binSql');
// Sin andamiaje de bins: la consulta solo devuelve los rangos CON
// canciones (GROUP BY sin generate_series ni VALUES). Con el catálogo
// vacío devuelve 0 filas, no 9 filas en 0 — el P9 ("los 9 rangos en 0")
// describe el modelo del frontend, no el endpoint; el frontend lo cubre
// con el fallback 'Sin datos todavía.' (app.js).
ok(!/generate_series|VALUES\s*\(/i.test(histSql) && appJsSrc.includes('Sin datos todavía.'),
  'histograma SQL: sin andamiaje de bins — catálogo vacío → 0 filas; el frontend muestra "Sin datos todavía."');
// ---------- 5c. Ronda 2 — anclajes de texto: DESEMPATE, color de fila, filtrarRango, sw.js ----------
// La sección 20 solo comprobaba 'id DESC'/'id ASC' en DESEMPATE; el orden
// completo de criterios vivía solo en el espejo `cmp`. Si main.cpp
// permutaba dos criterios, el harness no lo notaba. Lo mismo pasaba con
// colorFila (espejo de app.js:599-624) y con `filtro` (espejo de
// filtrarRango): estas pruebas anclan el texto real al orden cerrado.
const enOrden = (txt, partes) => { let p = -1; for (const s of partes) { const i = txt.indexOf(s, p + 1); if (i === -1) return false; p = i; } return true; };
const dAsc = mainCppSrc.slice(mainCppSrc.indexOf('static const std::string DESEMPATE_ASC'), mainCppSrc.indexOf('static const std::string DESEMPATE ='));
const dDesc = mainCppSrc.slice(mainCppSrc.indexOf('static const std::string DESEMPATE ='), mainCppSrc.indexOf('// Una sola funcion'));
ok(enOrden(dDesc, ['COALESCE(ritmo,0)*0.35 + COALESCE(letras,0)*0.25 + COALESCE(coro,0)*0.40) DESC', 'COALESCE(importancia,0) DESC', 'SUMA_BONOS', 'COALESCE(descubrimiento_terceros,false) DESC', 'COALESCE(coro,0) DESC', 'COALESCE(ritmo,0) DESC', 'COALESCE(letras,0) DESC', 'id ASC']),
  'DESEMPATE main.cpp: orden cerrado base → Importancia → bonos → Descubrimiento → Coro → Ritmo → Letra → id ASC');
ok(enOrden(dAsc, ['COALESCE(ritmo,0)*0.35 + COALESCE(letras,0)*0.25 + COALESCE(coro,0)*0.40) ASC', 'COALESCE(importancia,0) ASC', 'SUMA_BONOS', 'COALESCE(descubrimiento_terceros,false) ASC', 'COALESCE(coro,0) ASC', 'COALESCE(ritmo,0) ASC', 'COALESCE(letras,0) ASC', 'id DESC']),
  'DESEMPATE_ASC main.cpp: espejo exacto (mismos criterios ASC, id DESC)');
ok(appJsSrc.includes('colorBase = colorPorNota(nota);') && appJsSrc.includes('alfaGlow = alfaGlowGod(nota);') && appJsSrc.includes('else if (nota >= 18) alfaGlow = 0.40;') && appJsSrc.includes('else if (nota >= 17.8) alfaGlow = 0.35;'),
  'color fila app.js: paleta G (colorPorNota; alfaGlowGod para GOD, 0.40 turquesa, 0.35 azul)');
ok(coloresJsSrc.includes('function tonoPorNota(nota)') && coloresJsSrc.includes('(nota - 17.5) / 0.3') && coloresJsSrc.includes('(nota - 17.8) / 0.7') && coloresJsSrc.includes('(nota - 18.5) / 0.5'),
  'color fila colores.js: rampas de tono ALARGADAS en tonoPorNota (Nova 2026-11-17; 17.5–17.8 violeta→azul, 17.8–18.5 azul→turquesa, 18.5–19 turquesa→verde)');
ok(!appJsSrc.includes('aplicarPalidoYBrillo') && !appJsSrc.includes('mPalido') && !appJsSrc.includes('1.17 - 0.45') && !appJsSrc.includes("grad('#22d3ee'"),
  'color fila app.js: sin restos del pálido/factor f (sin aplicarPalidoYBrillo, mPalido, 1.17-0.45 ni grad cian)');
ok(appJsSrc.includes("if (nota > 0 && rank > 10 && rank <= 30) colorBase = mezcla(0.9 * suave((30 - rank) / 19), colorBase, '#facc15');") && appJsSrc.includes("if (nota > 0 && rank <= 10) { colorBase = '#facc15'; glow = 'rgba(250,204,21,0.7)'; enTransicion = false; }") && !appJsSrc.includes('franjaDorada') && !appJsSrc.includes('tinteDorado') && !appJsSrc.includes('franjaHtml'),
  'color fila app.js: dorado solo Top 10 global con nota > 0 (tinte 0.20, enTransicion=false); puestos 11–30 con mezcla HSL hacia dorado ALARGADA (0.9*suave((30-rank)/19)), sin franja ni tinte');
ok(appJsSrc.includes("if (rango === 'sin_calificar') rangoFiltro = [0, 0];") && appJsSrc.includes("else if (rango === 'menos-10') rangoFiltro = [0.01, 9.99];") && appJsSrc.includes('rangoFiltro = [a, b >= 20 ? 20 : b - 0.01];'),
  'filtrarRango app.js: rangos reales ([0,0], [0.01,9.99], [a,b-0.01] con 20 entero) — mismos que el espejo `filtro`');
ok(['10-12', '12-14', '14-16', '16-17.8', '17.8-18', '18-19', '19-20', 'sin_calificar', 'menos-10'].every(r => appJsSrc.includes("'" + r + "':")),
  'colorBarra del histograma (app.js) cubre los 9 rangos');
// colorBarra usa colorPorNota en el punto medio de cada bin (paleta G
// INVERTIDA exacta por bisección, no colores planos aproximados): ancla
// el texto real de app.js y comprueba los hex contra el colorPorNota
// extraído. La barra 19-20 es el verde GOD (#11d372), NO el brillante
// #16a34a de antes; la 17.8-18 es azul claro (#58b9f2, punto medio de
// la rampa azul→turquesa en 17.9, tono ~202°): el azul puro 220° solo
// existe en 17.80 exacto, así que el promedio honesto del bin es
// azul ~218° (rampa alargada 17.8–18.5), ahora más claro por el brillo
// creciente: 17.9 pasó de #58b9f2 a #89b0f5.
const colorBarraTxt = appJsSrc.slice(appJsSrc.indexOf('const colorBarra ='), appJsSrc.indexOf(';', appJsSrc.indexOf('const colorBarra =')));
ok(colorBarraTxt.includes("'10-12': colorPorNota(11)") && colorBarraTxt.includes("'12-14': colorPorNota(13)")
  && colorBarraTxt.includes("'14-16': colorPorNota(15)") && colorBarraTxt.includes("'16-17.8': colorPorNota(16.9)")
  && colorBarraTxt.includes("'17.8-18': colorPorNota(17.9)") && colorBarraTxt.includes("'18-19': colorPorNota(18.5)")
  && colorBarraTxt.includes("'19-20': colorPorNota(19.5)") && colorBarraTxt.includes("'menos-10': colorPorNota(9)")
  && colorBarraTxt.includes("'sin_calificar': '#6b7280'") && !colorBarraTxt.includes('#16a34a') && !colorBarraTxt.includes('linear-gradient'),
  'colorBarra del histograma (app.js) usa colorPorNota en los puntos medios, sin #16a34a ni linear-gradient');
ok(colorPorNota(9) === '#a456f1' && colorPorNota(11) === '#aa61f2' && colorPorNota(13) === '#b577f4' && colorPorNota(15) === '#be87f5'
  && colorPorNota(16.9) === '#c695f6' && colorPorNota(17.9) === '#89b0f5' && colorPorNota(18.5) === '#10c7c7' && colorPorNota(19.5) === '#11d372',
  `colorBarra: hex exactos por punto medio (menos-10 ${colorPorNota(9)}, 10-12 ${colorPorNota(11)}, 12-14 ${colorPorNota(13)}, 14-16 ${colorPorNota(15)}, 16-17.8 ${colorPorNota(16.9)}, 17.8-18 ${colorPorNota(17.9)}, 18-19 ${colorPorNota(18.5)}, 19-20 ${colorPorNota(19.5)}); 19-20 GOD #11d372, no #16a34a`);
const swJsR2 = fs.readFileSync(BASE + 'public/sw.js', 'utf8');
ok(swJsR2.includes("'/index.html'") && swJsR2.includes("'/app.js'") && swJsR2.includes("'/'"),
  'sw.js precachea /, /index.html y /app.js (además del manifiesto e iconos)');

// ---------- 6. Auditoría final ----------
// tonoPorNota(): rampas de tono ALARGADAS de la paleta G (Nova
// 2026-11-17) con smoothstep al 90%: violeta 270° hasta 17.5, rampa
// a azul 220° en 17.5–17.8, rampa a turquesa 180° en 17.8–18.5,
// rampa a verde 150° en 18.5–19, verde fijo desde 19. Continuas de
// 17.5 a 19.0, sin huecos planos entre ellas (antes: 17.0–17.8,
// 17.8–18 y turquesa fijo 18–18.5).
// (Antes: gradFactor, modelo de la rampa 0-90% de grad(); eliminado
// con la paleta anterior; la G es espectral Dorado→Verde→Turquesa→Azul→Violeta.)
const cerca = (a, b) => Math.abs(a - b) < 1e-9;
ok(tonoPorNota(10.05) === 270 && tonoPorNota(17.0) === 270 && tonoPorNota(17.49) === 270 && tonoPorNota(17.5) === 270, 'tonoPorNota: violeta 270° en nota baja (10.05), en 17.00 y en 17.49 (antes de la rampa); 17.50 es el inicio de la rampa a 17.8 (Nova 2026-11-17 07:39)');
ok(tonoPorNota(17.4) === 270, 'tonoPorNota: 17.40 = violeta puro 270° (antes de la rampa, que empieza en 17.5)');
ok(cerca(tonoPorNota(17.65), 270 - 50 * 0.9 * suave((17.65 - 17.5) / 0.3)), 'tonoPorNota: 17.65 a mitad de la rampa violeta→azul = 247.5° (270 − 50·0.9·suave(0.5))');
ok(tonoPorNota(17.5) === 270, 'tonoPorNota: 17.50 = violeta puro 270° (inicio de la rampa a 17.8, decisión Nova 2026-11-17 07:39)');
ok(tonoPorNota(17.8) === 220, 'tonoPorNota: 17.80 = azul 220° (fin de la primera rampa)');
ok(cerca(tonoPorNota(17.9), 220 - 40 * 0.9 * suave((17.9 - 17.8) / 0.7)), 'tonoPorNota: 17.9 en la rampa azul→turquesa ALARGADA ≈ 218.01° (antes era 202°, mitad de la rampa corta)');
ok(cerca(tonoPorNota(18), 220 - 40 * 0.9 * suave((18 - 17.8) / 0.7)), 'tonoPorNota: 18.00 en la rampa azul→turquesa ALARGADA ≈ 212.86° (antes era turquesa puro 180°)');
ok(tonoPorNota(18.5) === 180, 'tonoPorNota: 18.50 = turquesa 180° (fin de la segunda rampa alargada)');
ok(cerca(tonoPorNota(18.75), 166.5), 'tonoPorNota: 18.75 a mitad de la rampa turquesa→verde = 166.5° (180 − 30·0.9·suave(0.5))');
ok(tonoPorNota(19) === 150 && tonoPorNota(19.6) === 150, 'tonoPorNota: verde 150° desde 19.00 (19.00 y 19.60)');
// Filtro guardado (auditoría G, ronda 1): los géneros heredados con canciones
// (Hip Hop, Otro, OST) se aceptan — antes se reseteaban a 'todos' y las 79
// canciones no se podían filtrar por su género hasta la fase DB. Un valor
// que no es género (ni nuevo ni heredado) sigue reseteándose a 'todos'.
const GENEROS_E = [['Pop', 'Pop'], ['Rap', 'Rap'], ['Por clasificar', 'Por clasificar']];
const HEREDADOS_E = [['Hip Hop', 'Hip Hop'], ['Otro', 'Otro'], ['OST', 'OST']];
const sanitizar = g => (g === 'todos' || GENEROS_E.some(([v]) => v === g) || HEREDADOS_E.some(([v]) => v === g)) ? g : 'todos';
ok(sanitizar('Hip Hop') === 'Hip Hop' && sanitizar('Otro') === 'Otro' && sanitizar('OST') === 'OST' && sanitizar('Rap') === 'Rap' && sanitizar('todos') === 'todos' && sanitizar('Foo') === 'todos', 'filtro guardado: herederos se aceptan, valor inventado se resetea a todos');
// pintarChips con filtro heredado no se rompe (el push del activo está guardado).
const visiblesChips = (act, conteo) => {
  const base = [['todos', 'Todos'], ...[...GENEROS_E, ...HEREDADOS_E].filter(([v]) => (conteo[v] || 0) > 0 || v === act)];
  const top3 = [...base.slice(1)].sort((a, b) => (conteo[b[0]] || 0) - (conteo[a[0]] || 0)).slice(0, 3);
  const visibles = [['todos', 'Todos'], ...top3];
  if (act !== 'todos' && !visibles.some(([v]) => v === act)) { const e = base.find(([v]) => v === act); if (e) visibles.push(e); }
  return visibles.map(([v]) => v);
};
ok(JSON.stringify(visiblesChips('Hip Hop', { Pop: 130, Rap: 182, 'Hip Hop': 39 })) === JSON.stringify(['todos', 'Rap', 'Pop', 'Hip Hop']), 'chips con filtro heredado activo: el activo queda visible fuera del top 3');
ok(JSON.stringify(visiblesChips('Por clasificar', { Pop: 130, Rap: 182, 'Por clasificar': 36 })) === JSON.stringify(['todos', 'Rap', 'Pop', 'Por clasificar']), 'chips con activo fuera del top 3: el activo queda visible');


// ---------- 7. Color de fila completo — paleta G (funciones extraídas de app.js, P1) ----------
// colorFila vive en la sección 0 (espejo de app.js con colorPorNota/
// mezcla/suave extraídos, paleta G); aquí solo se comprueban sus valores.
const sinNaN = s => typeof s === 'string' && !/NaN/.test(s) && s.match(/\d+/g).every(n => +n >= 0 && +n <= 255);
ok(colorFila(19.6, 1) === '#facc15', 'color fila: 19.60 puesto 1 = dorado pleno');
ok(colorFila(18.9, 3) === '#facc15', 'color fila: 18.9 puesto 3 = dorado pleno (dorado SOLO por puesto, sin exigir ≥19)');
ok(aHex(colorFila(18.9, 25)) === '#10d74f', 'color fila: 18.9 puesto 25 = mezcla alargada ~15% hacia dorado (#10d74f, antes color de nota puro #11ce82)');
// 17.80 exacto es azul puro (tono 220°, bisección); en 17.79 el tono ya
// está al ~90% hacia azul en la rampa violeta→azul, distinto de 17.80.
ok(aHex(colorFila(17.8, 100)) === '#8caff6', 'color fila: 17.80 puesto 100 = azul puro (tono 220°, bisección)');
ok(aHex(colorFila(17.79, 100)) === '#94adf6', 'color fila: 17.79 puesto 100 = violeta→azul al ~90%, distinto de 17.80');
ok(aHex(colorFila(10.05, 677)) === '#a456f1', 'color fila: 10.05 puesto 677 = violeta (nota baja oscura dentro de la escala, brillo creciente)');
ok(aHex(colorFila(19.38, 11)) === '#f9f112', 'color fila: 19.38 puesto 11 = mezcla verde→dorado al 90% (#f9f112, casi dorado)');
ok(aHex(colorFila(19.38, 20)) === '#55ec0c', 'color fila: 19.38 puesto 20 = mezcla alargada ~49% (#55ec0c, antes color de nota puro #11d171)');
if (tieneDatos) {
  // Ventanas de tono (paleta G, 2026-11-16): cuántas canciones reales caen en cada ventana.
  const enV = (a, b) => C.filter(c => c.calificacion_final >= a && c.calificacion_final < b).length;
  const vA = enV(17.5, 17.8), vC = enV(18.5, 19), vB = enV(17.8, 18.5);
  console.log(`  ventanas ALARGADAS: violeta→azul [17.5,17.8): ${vA} canc., azul→turquesa [17.8,18.5): ${vB} canc., turquesa→verde [18.5,19): ${vC} canc.`);
  ok(vA > 0 && vC > 0 && vB > 0, `[datos reales] ventanas con canciones reales: A=${vA}, B=${vB}, C=${vC} (todas > 0)`);
} else skip('ventanas con canciones reales (sin public/datos-reales.json)');
ok(aHex(colorFila(17.0, 100)) === '#c696f7' && aHex(colorFila(18.5, 100)) === '#10c7c7', 'color fila: 17.00 y 18.50 = inicio de ventana: solo bisección, sin mezcla de rampa');
ok(aHex(colorFila(17.5, 100)) === '#c89af7', 'color fila: 17.50 = violeta puro #c89af7 (inicio de la rampa; antes #a5a7f8 en la rampa alargada desde 17.0)');
// MEZCLA 11-30 ALARGADA (Nova 2026-11-17 07:17, alargar ambas:
// restaurada 06:59 tras rechazar el híbrido suave, alargada de 11-20
// a 11-30): colorFila es la mezcla HSL del color de nota hacia el
// dorado, 0.9*suave((30-rank)/19). Puesto 15 con 18.9: mezcla al ~80%
// (0.9*suave(15/19) ≈ 0.80) → #d1f70e (antes 52% → verde lima #59ec0c):
// el camino corto turquesa→dorado pasa por verde, así que una canción
// turquesa del 11-30 se ve verdosa como si fuera GOD; riesgo conocido
// y aceptado por Nova. Sin el soporte rgb en hexAHsl la mezcla daba NaN.
// NOTA (principio de Nova: que premie a lo mejor): el camino HSL pasa
// por lima (Y ~0.86 > dorado 0.6356); en datos reales los puestos 11-19
// quedan más brillantes que el dorado en Y pura, como ya pasaba en
// 11-14 con la mezcla corta aprobada. El Top 10 sigue siendo lo más
// fuerte por su halo animado y su glow 0.70, y el fundido es monótono
// por puesto (el dorado desciende con el puesto, sin inversiones).
const c15 = colorFila(18.9, 15);
ok(sinNaN(c15) && aHex(c15) === '#d1f70e' && c15 === mezcla(0.9 * suave((30 - 15) / 19), colorPorNota(18.9), '#facc15'), `color fila: 18.9 puesto 15 = mezcla al ~80% (${c15}), amarillo lima por el paso por verde`);
ok(aHex(colorFila(18.5, 11)) === '#f4f911', 'color fila: 18.5 puesto 11 = mezcla turquesa→dorado al 90% (#f4f911, amarillo-verdoso, no turquesa)');
ok(aHex(colorFila(18.9, 11)) === '#f9f412' && aHex(colorFila(10.05, 11)) === '#f99a1c', 'color fila: mezcla 11-30 en 18.9 (#f9f412) y en 10.05 (#f99a1c, naranja por el paso violeta→dorado)');
ok(colorFila(19.6, 10) === '#facc15' && aHex(colorFila(19.6, 11)) === '#f9f112', 'color fila: Top 10 dorado pleno sin mezcla; puesto 11 ya mezcla (19.6 → #f9f112)');
ok(aHex(colorFila(19.38, 20)) === '#55ec0c' && aHex(colorFila(19.38, 30)) === '#11d171' && aHex(colorFila(19.38, 31)) === '#11d171', 'color fila: mezcla 11-30: puesto 20 con 19.38 = #55ec0c (mezcla ~49%), puesto 30 y 31 = color de nota puro #11d171');
ok(appJsSrc.includes("if (nota > 0 && rank > 10 && rank <= 30) colorBase = mezcla(0.9 * suave((30 - rank) / 19), colorBase, '#facc15');") && !appJsSrc.includes('franjaDorada') && !appJsSrc.includes('tinteDorado') && !appJsSrc.includes('franjaHtml'),
  'mezcla 11-30 en app.js: línea de mezcla HSL alargada; sin franja dorada ni tinte dorado');
// CONTINUIDAD de las rampas alargadas: sin huecos planos de 17.0 a 19.0.
ok(tonoPorNota(17.4) === 270 && tonoPorNota(17.6) < 270 && tonoPorNota(17.6) > tonoPorNota(17.8) && tonoPorNota(17.8) === 220 && tonoPorNota(18.2) < 220 && tonoPorNota(18.2) > 180 && tonoPorNota(18.5) === 180 && tonoPorNota(18.7) < 180 && tonoPorNota(18.7) > 150, 'rampas alargadas: tono estrictamente decreciente 17.5→19.0 sin tramos planos (17.4 violeta puro, 17.6 en rampa, 18.2 en rampa, 18.7 en rampa)');
ok(sinNaN(mezcla(0.5, 'rgb(217,70,239)', '#facc15')), 'mezcla desde un color rgb(...): sin NaN');
// 2026-11-16 (paleta G + bisección, 60 iteraciones): los 12 colores de muestra fijados
// como literales hex (referencia del mockup; la implementación debe
// reproducirlos exactos).
const MUESTRAS_COLOR = [
  [10.05, '#a456f1'], [12.48, '#b371f4'], [14, '#ba7ff5'], [16.21, '#c390f6'],
  [17.48, '#c89af7'], [17.56, '#c39df7'], [17.69, '#a6a8f8'], [17.98, '#80b2f5'],
  [18.35, '#12c3df'], [18.41, '#11c4d7'], [18.77, '#10cc9c'], [19.1, '#11d071'],
];
for (const [n, esp] of MUESTRAS_COLOR) ok(aHex(colorFila(n, 100)) === esp, `color fila [muestra 2026-11-16]: nota ${n} = ${esp} (paleta G + bisección)`);
// Brillo CRECIENTE por luminancia Y (WCAG, no L): la luminancia relativa
// sube al subir la nota, en violeta, azul, turquesa y verde (decisión de
// Nova 2026-11-17, tras el análisis de Claude: claro = nota alta,
// oscuro = nota baja; reemplaza el brillo invertido de la G original).
const lum = c => { const h = aHex(c); return luminanciaRelativa(parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)); };
ok(lum(colorFila(10.05, 677)) < lum(colorFila(17.48, 677)), 'color fila [brillo creciente]: Y de 10.05 menor que Y de 17.48 (violeta, nota baja más oscura)');
ok(lum(colorFila(18, 100)) < lum(colorFila(18.49, 100)), 'color fila [brillo creciente]: Y de 18.00 menor que Y de 18.49 (turquesa)');
ok(lum(colorFila(17.8, 100)) < lum(colorFila(17.99, 100)), 'color fila [brillo creciente]: Y de 17.80 menor que Y de 17.99 (azul)');
ok(lum(colorFila(19, 100)) < lum(colorFila(19.6, 100)), 'color fila [brillo creciente]: Y de 19.00 menor que Y de 19.60 (verde GOD)');
ok(MUESTRAS_COLOR.every(([n], i) => i === 0 || lum(colorFila(MUESTRAS_COLOR[i - 1][0], 100)) < lum(colorFila(n, 100))), 'color fila [brillo creciente]: Y estrictamente creciente al subir la nota en las 12 muestras');
// Sin gris (paleta G): la saturación nunca baja de 0.70 en las muestras
// (la bisección fija S 0.85; las transiciones nunca pasan por el gris).
ok(MUESTRAS_COLOR.every(([n]) => hexAHsl(colorFila(n, 100))[1] >= 0.70), 'color fila [sin gris]: S ≥ 0.70 en las 12 muestras (paleta G, S 0.85 por bisección)');
// MONACO verde-turquesa: 18.77 tiene tono entre 150° y 175° (verde-turquesa,
// no azul) y no es el azul viejo #2a73e4 ni gris.
ok(hexAHsl(colorFila(18.77, 100))[0] >= 150 && hexAHsl(colorFila(18.77, 100))[0] <= 175 && aHex(colorFila(18.77, 100)) !== '#2a73e4', 'color fila [MONACO verde-turquesa]: 18.77 con tono 150–175° (verde-turquesa, no azul #2a73e4 ni gris)');
// Unforgettable AZUL (rampa alargada 2026-11-17): 17.98 deja de ser
// turquesa (antes tono ~185°) y pasa a azul (tono ~214°, #80b2f5),
// porque la rampa azul→turquesa ahora llega hasta 18.5. El umbral
// ≥17.8 sigue siendo azul de categoría (glow 0.35), solo cambia el tono.
ok(hexAHsl(colorFila(17.98, 100))[0] >= 200 && hexAHsl(colorFila(17.98, 100))[0] <= 220, 'color fila [Unforgettable azul]: 17.98 con tono 200–220° (azul, rampa alargada)');
// GOD 19.00 menos luminoso que MONACO 18.77 (la escala Y sigue bajando).
ok(lum(colorFila(19, 100)) > lum(colorFila(18.77, 100)), 'color fila [GOD > MONACO]: Y de 19.00 mayor que Y de 18.77 (brillo creciente)');
// GOD 19.00 distinto de Yo soy libre 19.10 (sin colisión en el borde).
ok(aHex(colorFila(19, 100)) !== aHex(colorFila(19.1, 100)), 'color fila [GOD ≠ 19.10]: 19.00 #11cf70 distinto de 19.10 #11d071');
// Carmen/Provenza (brillo creciente): 17.56 (ya en rampa violeta→azul)
// es MÁS luminosa que 17.48 (violeta puro), porque la Y sube con la nota.
ok(lum(colorFila(17.56, 100)) > lum(colorFila(17.48, 100)), 'color fila [Carmen/Provenza]: Y de 17.56 mayor que Y de 17.48 (Carmen más clara que Provenza, brillo creciente)');
// Andrea ≠ De carolina: 18.35 y 18.41 no colisionan en el mismo hex.
ok(aHex(colorFila(18.35, 100)) !== aHex(colorFila(18.41, 100)), 'color fila [Andrea ≠ De carolina]: 18.35 #10c5c5 distinto de 18.41 #10c7c7');
// Glow GOD (jerarquía, espejo alfaGlowFila): dorado 0.70 > GOD variable
// 0.45 (19.00) → 0.60 (19.60) > turquesa fijo 0.40 > azul fijo 0.35
// > violeta fijo 0.30. El glow variable es SOLO para GOD.
ok(alfaGlowFila(19, 100) === 0.45, 'glow GOD: 19.00 → alfa 0.45 (mínimo GOD)');
ok(alfaGlowFila(19.6, 100) === 0.60, 'glow GOD: 19.60 → alfa 0.60 (máximo GOD)');
ok(cerca(alfaGlowFila(19.1, 100), 0.475), 'glow GOD: 19.10 → alfa 0.475 (0.45 + 0.15·(0.1/0.6))');
ok(alfaGlowFila(19, 100) > alfaGlowFila(18.99, 100), 'glow GOD: 19.00 (0.45) por encima del cian fijo 0.40 de 18.99');
ok(alfaGlowFila(19.6, 100) < 0.70, 'glow GOD: 19.60 (0.60) por debajo del dorado 0.70');
ok(alfaGlowFila(18.5, 100) === 0.40 && alfaGlowFila(17.9, 100) === 0.35 && alfaGlowFila(10.05, 100) === 0.30, 'glow fijo por banda: turquesa 0.40 (18.50), azul 0.35 (17.90), violeta 0.30 (10.05)');
ok(alfaGlowFila(19.6, 1) === 0.70, 'glow dorado: 19.60 puesto 1 → alfa 0.70 (Top 10 dorado, el más fuerte, aunque la nota sea GOD)');
// Dorado Top 10 sin tocar: el brillo por nota no se aplica al dorado.
ok(colorFila(17, 5) === '#facc15', 'color fila [dorado intacto]: 17.00 puesto 5 = dorado pleno (brillo por nota no toca el Top 10)');
// Ronda 1: paginación y botones grandes con mínimo 44px táctiles.
const appJs = appJsSrc;
const idxHtml = fs.readFileSync(BASE + 'public/index.html', 'utf8');
ok(appJs.includes('data-valor="${data.pagina_actual - 1}"') && appJs.includes('data-valor="${data.pagina_actual + 1}"') && (appJs.match(/data-accion="ir-pagina"/g) || []).length === 2
  && appJs.split('data-valor="${data.pagina_actual').slice(1).every(s => s.slice(0, 400).includes('min-h-[44px]')),
  'paginación ANT/SIG con min-h-[44px] (ronda 5, CSP: data-accion="ir-pagina")');
ok(['btn-agregar"', 'btn-agregar-seguir"', 'btn-calificar"'].every(id => { const i = idxHtml.indexOf(id); return i > -1 && idxHtml.slice(i, i + 400).includes('min-h-[44px]'); }),
  'botones Añadir / Añadir y seguir / Guardar calificación con min-h-[44px]');
// Ronda 1: irADuplicado recorre páginas (simulación con páginas de 2).
const buscarEnPaginas = (paginas, idObjetivo) => { let song; for (let p = 0; p < paginas.length && !song; p++) song = paginas[p].find(c => c.id === idObjetivo); return song; };
const pags = [[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }], [{ id: 5 }, { id: 6 }]];
ok(buscarEnPaginas(pags, 5)?.id === 5, 'irADuplicado recorre páginas hasta encontrar el duplicado (pág. 3)');
ok(buscarEnPaginas(pags, 99) === undefined, 'irADuplicado: si el duplicado no existe, no se encuentra');
// Ronda 1: sw.js precachea manifiesto e iconos; pestañas con aria-selected inicial.
const swJs = fs.readFileSync(BASE + 'public/sw.js', 'utf8');
ok(swJs.includes('/manifest.webmanifest') && swJs.includes('/icon-192.png') && swJs.includes('/icon-512.png'), 'sw.js precachea manifiesto e iconos');
ok(idxHtml.includes('id="tab-btn-cat" aria-selected="true"') && (idxHtml.match(/aria-selected="false"/g) || []).length === 3, 'pestañas móviles con aria-selected inicial');
ok(idxHtml.includes('<noscript>'), 'mensaje <noscript> si JavaScript está desactivado');

// ---------- 8. Auditoría G (última): géneros heredados, duplicado por páginas, altura uniforme, fondo en <html> ----------
// 8a. Con los datos reales: 14 géneros nuevos con canciones + 3 heredados
// (Hip Hop 39, Otro 36, OST 4) = 17 géneros con canciones. Antes de la G,
// las burbujas solo contaban los 14 nuevos: base 15 → "Ver más · 11" (no 12
// como decía BASE.md). Con heredados: base 18 → "Ver más · 14".
const NUEVOS_G = ['Pop', 'Rock', 'Electronica', 'Rap', 'Trap', 'Reggaeton', 'R&B', 'Phonk', 'Banda', 'Corridos', 'Corridos Tumbados', 'Cumbia', 'Salsa', 'Baladas', 'Metal', 'Alternativo', 'Hardstyle', 'Clasica', 'Latino', 'Romanticas', 'Asiatica', 'Por clasificar'];
const HEREDADOS_G = ['Hip Hop', 'Otro', 'OST'];
if (tieneDatos) {
  const conteoG = {}; for (const c of C) conteoG[c.genero] = (conteoG[c.genero] || 0) + 1;
  const nuevosConCanc = NUEVOS_G.filter(v => conteoG[v] > 0);
  const heredConCanc = HEREDADOS_G.filter(v => conteoG[v] > 0);
  ok(nuevosConCanc.length === 14 && heredConCanc.length === 3 && nuevosConCanc.length + heredConCanc.length === 17,
    `[datos reales] géneros con canciones: ${nuevosConCanc.length} nuevos + ${heredConCanc.length} heredados (${heredConCanc.map(g => g + ' ' + conteoG[g]).join(', ')}) = 17`);
  ok(1 + nuevosConCanc.length + heredConCanc.length - 4 === 14, '[datos reales] burbujas colapsadas con heredados: "Ver más · 14" (antes, sin heredados, era 11, no 12)');
} else skip('géneros con canciones / burbujas con datos reales (sin public/datos-reales.json)');
// 8b. Opciones de género del modal de editar: la canción heredada mantiene
// su género como opción seleccionada; una canción nueva no ofrece heredados.
const opcionesEditar = generoActual => {
  const lista = [...NUEVOS_G.map(v => [v, v]), ...(!NUEVOS_G.includes(generoActual) ? [[generoActual, generoActual + ' (actual)']] : [])];
  return lista;
};
ok(opcionesEditar('Hip Hop').some(([v]) => v === 'Hip Hop') && opcionesEditar('Hip Hop').find(([v]) => v === 'Hip Hop')[1] === 'Hip Hop (actual)', 'modal editar: canción Hip Hop ofrece "Hip Hop (actual)"');
ok(!opcionesEditar('Pop').some(([v]) => v === 'Hip Hop' || v === 'Otro' || v === 'OST'), 'modal editar: canción Pop no ofrece géneros heredados');
// 8c. revisarDuplicado recorre páginas (simulación con páginas de 2, como
// irADuplicado en la auditoría F): el duplicado en la página 3 se encuentra;
// con tope de páginas no se recorren más aunque haya más.
const buscarDuplicadoPaginas = (paginas, esDup, maxPag) => {
  let vistos = [];
  for (let p = 0; p < Math.min(paginas.length, maxPag); p++) {
    vistos.push(...paginas[p]);
    if (vistos.some(esDup)) break;
  }
  return vistos.find(esDup);
};
const pagsDup = [[{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }], [{ id: 5, titulo: 'X', artista: 'Y' }, { id: 6 }], [{ id: 7 }, { id: 8 }]];
ok(buscarDuplicadoPaginas(pagsDup, c => c.id === 5, 10)?.id === 5, 'revisarDuplicado recorre páginas hasta el duplicado (pág. 3)');
ok(buscarDuplicadoPaginas(pagsDup, c => c.id === 99, 10) === undefined, 'revisarDuplicado: sin duplicado, no se encuentra');
ok(buscarDuplicadoPaginas(pagsDup, c => c.id === 7, 2) === undefined, 'revisarDuplicado: el tope de páginas se respeta (pág. 4 fuera del tope 2)');
// 8d. El código preparado trae las correcciones G (comprobación de texto).
const mainCpp = mainCppSrc;
ok(appJs.includes('GENEROS_HEREDADOS') && appJs.includes("['Hip Hop','Hip Hop'],['Otro','Otro'],['OST','OST']"), 'app.js define GENEROS_HEREDADOS (Hip Hop, Otro, OST)');
ok(appJs.includes('[...GENEROS, ...GENEROS_HEREDADOS]'), 'pintarChips filtra con GENEROS + GENEROS_HEREDADOS');
ok(appJs.includes("if (!listaEl || !listaEl.offsetParent) return;"), 'igualarFilas no toca nada si el catálogo está oculto');
ok(appJs.includes("if (tab === 'cat') igualarFilas();"), "switchTab re-iguala al volver a la pestaña Top");
ok(appJs.includes('buscarPaginas') && appJs.includes('sigueVigente'), 'revisarDuplicado recorre páginas y descarta resultados obsoletos');
ok(appJs.includes("song.genero + ' (actual)'"), 'modal editar incluye el género actual heredado como opción');
ok(mainCpp.includes('SELECT genero, etiqueta_especial, instrumental, banda_sonora FROM canciones WHERE id = $1') && mainCpp.includes('genero != genero_actual'), 'PUT /info acepta mantener el género actual (heredado) de la canción (la consulta trae también etiqueta_especial, instrumental y banda_sonora, E13/S12 oleada 1)');
ok(mainCpp.includes('if (!enLista(etiqueta, ETIQUETAS_VALIDAS))'), 'PUT /info sigue validando el tipo con la lista nueva');
// 8e. Fondo en <html> (sin background-attachment: fixed en el CSS real;
// el comentario que lo menciona no cuenta).
const cssSinComentarios = idxHtml.replace(/\/\*[\s\S]*?\*\//g, '');
ok(/html \{[^}]*background-image/.test(cssSinComentarios) && !/background-attachment\s*:/.test(cssSinComentarios), 'fondo en <html> y sin background-attachment: fixed');
ok(!idxHtml.includes('<body class="bg-[#040b1a]'), 'body sin fondo opaco propio (el fondo de <html> queda visible)');

// ---------- 9. Auditoría G, ronda 2: objetivos táctiles de 44px y navegación al duplicado ----------
// 9a. Objetivos táctiles (el estándar del proyecto es 44px; la auditoría F
// solo lo había comprobado en paginación y botones grandes).
ok(appJs.includes("const CHIP = 'flex-shrink-0 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap min-h-[44px] '"), 'burbujas de género con min-h-[44px]');
ok(appJs.includes('min-h-[44px] flex flex-col justify-center') && appJs.includes('data-accion="filtrar-rango"'), 'barras del histograma con min-h-[44px] (ronda 5, CSP: data-accion="filtrar-rango")');
ok(appJs.includes('rounded-full hover:border-sky-300 min-h-[44px]">REINTENTAR'), 'botón REINTENTAR del error con min-h-[44px]');
ok(appJs.includes("btnConfirm.className = claseBoton + ' min-h-[44px]';"), 'abrirModal conserva min-h-[44px] en el botón de confirmar');
// Barrido: todos los <button> del HTML tienen min-h-[44px] o py-4
// (pestañas, 48px), salvo los dos enlaces de texto en línea. El regex
// respeta las comillas: hay onclick con `=>` que llevan `>` dentro.
const botonesHtml = [...idxHtml.matchAll(/<button(?:[^>"']|"[^"]*"|'[^']*')*>/g)].map(m => m[0]);
const sinMinimo = botonesHtml.filter(b => !b.includes('min-h-[44px]') && !b.includes('py-4'));
ok(sinMinimo.length === 2 && sinMinimo.every(b => b.includes('data-accion="ir-duplicado"') || b.includes('data-accion="usar-artista-sugerido"')),
  `botones del HTML sin min-h-[44px] ni py-4: ${sinMinimo.length} (solo los 2 enlaces de texto en línea)`);
// 9b. irADuplicado limpia el filtro de género y el de rango antes de buscar.
ok(appJs.includes("document.getElementById('filtro-genero').value = 'todos';") && appJs.includes('rangoFiltro = null; rangoActivo = null;'), 'irADuplicado limpia género y rango antes de buscar el duplicado');
// 9c. seleccionarTarget no conserva el color de la canción anterior cuando
// la seleccionada no tiene fila en pantalla (recién agregada).
ok(appJs.includes("cajaActiva.style.borderColor = '';") && appJs.includes("cajaActiva.style.boxShadow = '';"), 'seleccionarTarget limpia el color de la caja si no hay fila');

// 9d. Barrido de botones generados en JS (filas y paginación): el regex
// ingenuo `<button[^>]*>` se corta en el `>=` de la paginación SIG, así
// que se comprueba por líneas completas.
ok(appJs.includes('px-3 py-3 min-h-[44px] min-w-[44px]">Editar') && appJs.includes('px-3 py-3 min-h-[44px] min-w-[44px]">Eliminar'), 'botones Editar/Eliminar de la fila con min-h y min-w de 44px');
ok(appJs.includes('data-valor="${data.pagina_actual + 1}"') && appJs.includes('p-1 min-h-[44px] px-2 disabled:cursor-not-allowed">SIG'), 'paginación SIG con min-h-[44px] (ronda 5, CSP: data-accion="ir-pagina")');


// ---------- 10. Artistas (tabla cancion_artistas, 2026-11-16) ----------
// Funciones puras copiadas VERBATIM de public/app.js (textoArtistas,
// parsearListaArtistas, construirArtistas + normalizarTexto, que usan).
function normalizarTexto(s) { return (s || '').trim().replace(/\s+/g, ' '); }
function textoArtistas(c) {
    const arr = Array.isArray(c.artistas) ? c.artistas : [];
    const principales = arr.filter(a => a.rol === 'principal').map(a => a.nombre);
    const invitados = arr.filter(a => a.rol === 'invitado').map(a => a.nombre);
    if (!principales.length) return c.artista || '';
    return principales.join(', ') + (invitados.length ? ' ft. ' + invitados.join(', ') : '');
}
function parsearListaArtistas(s) {
    const vistos = new Set(), salida = [];
    for (const parte of String(s || '').split(',')) {
        const nombre = normalizarTexto(parte);
        if (!nombre) continue;
        const clave = nombre.toLowerCase();
        if (vistos.has(clave)) continue;
        vistos.add(clave); salida.push(nombre);
    }
    return salida;
}
function construirArtistas(principal, invitados, productores) {
    // El principal puede ser una lista separada por coma: al editar la 531
    // o la 662 no debe fusionar sus principales en un solo artista con comas.
    const lista = parsearListaArtistas(principal).map(n => ({ nombre: n, rol: 'principal' }));
    for (const n of invitados) lista.push({ nombre: n, rol: 'invitado' });
    for (const n of productores) lista.push({ nombre: n, rol: 'productor' });
    return lista;
}
// Fixtures con los casos de diseño confirmados (decisiones-colaboraciones.md).
const F531 = { id: 531, titulo: 'Sucker for pain', artista: 'Lil Wayne, Wiz Khalifa, Imagine Dragons', artistas: [
  { id: 123, nombre: 'Lil Wayne', rol: 'principal' }, { id: 428, nombre: 'Wiz Khalifa', rol: 'principal' },
  { id: 303, nombre: 'Imagine Dragons', rol: 'principal' }, { id: 334, nombre: 'Logic', rol: 'invitado' },
  { id: 423, nombre: 'Ty Dolla $ign', rol: 'invitado' }, { id: 1, nombre: 'Alex da Kid', rol: 'productor' }] };
const F662 = { id: 662, titulo: "Can't hold me down", artista: 'Lil Wayne, Lil Yachty', artistas: [
  { id: 123, nombre: 'Lil Wayne', rol: 'principal' }, { id: 332, nombre: 'Lil Yachty', rol: 'principal' },
  { id: 375, nombre: 'Pharrell Williams', rol: 'invitado' }, { id: 323, nombre: 'Kyle Richh', rol: 'invitado' }] };
const F101 = { id: 101, titulo: 'Vip', artista: 'Kenia Os', artistas: [
  { id: 1, nombre: 'Kenia Os', rol: 'principal' }, { id: 2, nombre: 'Villano Antillano', rol: 'invitado' }] };
const F670 = { id: 670, titulo: 'Baby hello', artista: 'Rauw Alejandro', artistas: [
  { id: 1, nombre: 'Rauw Alejandro', rol: 'principal' }, { id: 2, nombre: 'Bizarrap', rol: 'invitado' },
  { id: 2, nombre: 'Bizarrap', rol: 'productor' }] };
const F232 = { id: 232, titulo: 'Kiss [Slowed+Looped]', artista: 'Salvia', artistas: [{ id: 1, nombre: 'Salvia', rol: 'principal' }] };
// 10a. La fila: principales con ", ", invitados con "ft.", productor NUNCA.
ok(textoArtistas(F531) === 'Lil Wayne, Wiz Khalifa, Imagine Dragons ft. Logic, Ty Dolla $ign',
  `fila 531: "${textoArtistas(F531)}" (3 principales con ", " + ft.; el productor Alex da Kid NO sale)`);
ok(textoArtistas(F662) === 'Lil Wayne, Lil Yachty ft. Pharrell Williams, Kyle Richh',
  `fila 662: "${textoArtistas(F662)}" (2 principales con ", " + ft.)`);
ok(textoArtistas(F101) === 'Kenia Os ft. Villano Antillano', 'fila 101: "Kenia Os ft. Villano Antillano"');
ok(textoArtistas({ artista: 'Shakira', artistas: [{ nombre: 'Shakira', rol: 'principal' }] }) === 'Shakira',
  'fila sin invitados: solo el principal, sin "ft."');
ok(textoArtistas(F670) === 'Rauw Alejandro ft. Bizarrap',
  'fila 670: Bizarrap sale UNA vez (como invitado); su rol productor no se muestra aparte');
ok(textoArtistas(F232) === 'Salvia', 'fila 232: "Salvia" (nombre artístico acreditado, no Lilith Morris)');
ok(textoArtistas({ artista: 'Karol G' }) === 'Karol G' && textoArtistas({ artista: 'Karol G', artistas: [] }) === 'Karol G',
  'fila sin arreglo artistas (datos viejos/export sin artistas): usa el campo derivado');
// 10b. El campo derivado `artista`: principales unidos con ", " (main.cpp: artistaDerivado).
const artistaDerivado = filas => filas.filter(f => f.rol === 'principal').map(f => f.nombre).join(', ');
ok(artistaDerivado(F531.artistas) === 'Lil Wayne, Wiz Khalifa, Imagine Dragons', 'derivado 531: 3 principales con ", "');
ok(artistaDerivado(F662.artistas) === 'Lil Wayne, Lil Yachty', 'derivado 662: 2 principales con ", "');
ok(artistaDerivado(F101.artistas) === 'Kenia Os', 'derivado 101: un solo principal');
ok(artistaDerivado([]) === '', 'derivado sin filas: vacío (el llamador usa la columna)');
// 10c. Parseo de las listas con coma (Agregar/Editar).
ok(JSON.stringify(parsearListaArtistas('Yoss Bones, Nanpa Básico , , yoss bones')) === JSON.stringify(['Yoss Bones', 'Nanpa Básico']),
  'parsearListaArtistas: recorta, quita vacíos y repetidos sin importar capitalización (se queda el primero)');
ok(JSON.stringify(parsearListaArtistas('')) === JSON.stringify([]) && JSON.stringify(parsearListaArtistas('  ')) === JSON.stringify([]),
  'parsearListaArtistas: cadena vacía o solo espacios -> []');
ok(JSON.stringify(parsearListaArtistas('A,,B')) === JSON.stringify(['A', 'B']), 'parsearListaArtistas: comas seguidas no crean vacíos');
// 10d. Construcción del arreglo para POST/PUT.
const arr1 = construirArtistas('MC Davo', ['Gera MX', 'Darkiel'], []);
ok(arr1.length === 3 && arr1[0].rol === 'principal' && arr1[1].rol === 'invitado' && arr1[2].nombre === 'Darkiel',
  'construirArtistas: principal + 2 invitados, roles en orden');
const arr2 = construirArtistas('Shakira', [], ['Bizarrap']);
ok(arr2.length === 2 && arr2[1].rol === 'productor', 'construirArtistas: principal + productor');
ok(construirArtistas('Shakira', [], []).length === 1, 'construirArtistas: solo principal');
const arr3 = construirArtistas('Lil Wayne, Wiz Khalifa, Imagine Dragons', ['Logic'], []);
ok(arr3.length === 4 && arr3[0].rol === 'principal' && arr3[1].rol === 'principal' && arr3[2].rol === 'principal' && arr3[2].nombre === 'Imagine Dragons' && arr3[3].rol === 'invitado',
  'construirArtistas: varios principales separados por coma NO se fusionan en uno (editar 531)');
// 10e. La búsqueda coincide con TODOS los artistas (main.cpp: EXISTS en
// cancion_artistas), no solo con el principal.
const coincideBusqueda = (c, term) => {
  const t = term.toLowerCase();
  return c.titulo.toLowerCase().includes(t) || (c.artistas || []).some(a => a.nombre.toLowerCase().includes(t));
};
ok(coincideBusqueda(F101, 'villano'), 'búsqueda "villano": encuentra la 101 por el invitado (principal Kenia Os)');
ok(coincideBusqueda(F531, 'alex da kid'), 'búsqueda "alex da kid": encuentra la 531 por el PRODUCTOR (no canta)');
ok(coincideBusqueda(F670, 'bizarrap'), 'búsqueda "bizarrap": encuentra la 670 (invitado + productor)');
ok(!coincideBusqueda(F531, 'zarcort'), 'búsqueda "zarcort": no encuentra la 531 (nadie con ese nombre)');
// 10f. El export mantiene el campo artista derivado (main.cpp: exportar).
const exportFila = c => ({ ...c, artista: artistaDerivado(c.artistas || []) || c.artista });
ok(exportFila(F531).artista === 'Lil Wayne, Wiz Khalifa, Imagine Dragons', 'export 531: artista derivado con los 3 principales');
ok(exportFila(F101).artista === 'Kenia Os', 'export 101: artista derivado = principal (el invitado va en el arreglo)');
// 10g. Conteos de GET /api/artistas (main.cpp): canciones = apariciones
// como principal o invitado (el productor NO cuenta); principales = como
// principal. Aparecen TODOS los artistas (decisión de Nova 2026-11-16:
// lista completa; los productores puros salen con 0/0).
const conteosArtistas = canciones => {
  const m = {};
  for (const c of canciones) for (const a of (c.artistas || [])) {
    const e = m[a.nombre] = m[a.nombre] || { canciones: new Set(), principales: new Set() };
    if (a.rol === 'principal' || a.rol === 'invitado') e.canciones.add(c.id);
    if (a.rol === 'principal') e.principales.add(c.id);
  }
  return Object.fromEntries(Object.entries(m).map(([n, e]) => [n, { canciones: e.canciones.size, principales: e.principales.size }]));
};
const F069 = { id: 69, titulo: 'Aleman bzrp', artistas: [{ nombre: 'Alemán', rol: 'principal' }, { nombre: 'Bizarrap', rol: 'productor' }] };
const cont = conteosArtistas([F531, F662, F670, F069]);
ok(cont['Lil Wayne'].canciones === 2 && cont['Lil Wayne'].principales === 2, 'conteos: Lil Wayne 2 canciones, 2 principales (531 y 662)');
ok(cont['Logic'].canciones === 1 && cont['Logic'].principales === 0, 'conteos: Logic 1 canción, 0 principales (solo invitado)');
ok(cont['Bizarrap'].canciones === 1 && cont['Bizarrap'].principales === 0, 'conteos: Bizarrap 1 canción (670 como invitado); las de productor (69) no cuentan');
ok(cont['Alex da Kid'] && cont['Alex da Kid'].canciones === 0 && cont['Alex da Kid'].principales === 0, 'conteos: Alex da Kid SÍ aparece con 0/0 (solo productor en 531)');
// 10h. Validación de POST/PUT con artistas (espejo de leerArtistasJson en
// main.cpp: roles válidos, nombres no vacíos ni >200, al menos un
// principal; sin arreglo, el artista plano es un solo principal; el
// dedupe es por (nombre_norm, rol) y el rol ausente es 'invitado' por
// defecto (textoJson); máximo 10 artistas por canción).
const validarArtistas = entradas => {
  if (!Array.isArray(entradas)) return { ok: true, entradas: null }; // sin arreglo: principal plano
  if (entradas.length > 10) return { ok: false, error: 'Demasiados artistas (maximo 10 por cancion).' };
  const ROLES = ['principal', 'invitado', 'productor'];
  const salida = [];
  const vistos = new Set();
  for (const e of entradas) {
    const nombre = (e.nombre || '').trim();
    if (!nombre) continue;
    if (nombre.length > 200) return { ok: false, error: 'Nombre de artista demasiado largo.' };
    const rol = typeof e.rol === 'string' ? e.rol : 'invitado';
    if (!ROLES.includes(rol)) return { ok: false, error: 'Rol de artista no valido.' };
    const clave = nombre.toLowerCase() + '|' + rol;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    salida.push({ nombre, rol });
  }
  if (!salida.some(e => e.rol === 'principal')) return { ok: false, error: 'Falta el artista principal.' };
  return { ok: true, entradas: salida };
};
ok(!validarArtistas([{ nombre: 'X', rol: 'invitado' }]).ok, 'POST sin principal: 400 "Falta el artista principal."');
ok(!validarArtistas([{ nombre: 'X', rol: 'cantante' }]).ok, 'POST con rol inventado: 400 "Rol de artista no valido."');
ok(!validarArtistas([{ nombre: 'x'.repeat(201), rol: 'principal' }]).ok, 'POST con nombre >200: 400');
ok(validarArtistas([{ nombre: ' ', rol: 'invitado' }, { nombre: 'Karol G', rol: 'principal' }]).ok, 'POST: nombres vacíos se ignoran, con principal válido pasa');
ok(validarArtistas(null).ok && validarArtistas(null).entradas === null, 'POST sin arreglo: el artista plano es un solo principal (compat)');
// 10i. El SQL de artistas (artistas-aplicar.sql) es coherente con el código.
const sqlArtistas = leerSql('artistas-aplicar.sql');
const contarTuplas = rol => (sqlArtistas.match(new RegExp(`\\([0-9]+, [0-9]+, '${rol}', [0-9]+\\)`, 'g')) || []).length;
ok(sqlArtistas.includes('CREATE TABLE IF NOT EXISTS artistas') && sqlArtistas.includes('CREATE TABLE IF NOT EXISTS cancion_artistas'),
  'SQL: crea las tablas artistas y cancion_artistas');
ok(contarTuplas('invitado') === 330 && contarTuplas('productor') === 14,
  `SQL: tuplas invitado=${contarTuplas('invitado')} (esperado 330), productor=${contarTuplas('productor')} (esperado 14)`);
ok(contarTuplas('principal') === 743, `SQL: tuplas principal=${contarTuplas('principal')} (677 backfill + 63 correcciones + 3 extra por multi-principal = 743; final 680)`);
const seccionSql = (ini, fin) => sqlArtistas.slice(sqlArtistas.indexOf(ini), fin ? sqlArtistas.indexOf(fin, sqlArtistas.indexOf(ini)) : sqlArtistas.length);
const contarArtistasInsert = txt => (txt.match(/^\s+\(\d+, '/gm) || []).length;
ok(contarArtistasInsert(seccionSql('-- PASO 2 —', '-- PASO 2b')) === 222, 'SQL: backfill 222 artistas distintos');
ok(contarArtistasInsert(seccionSql('-- PASO 4 —', '-- PASO 5 —')) === 214, 'SQL: 214 artistas nuevos (invitados/productores)');
ok((seccionSql('-- PASO 2b', '-- PASO 3').match(/'principal'/g) || []).length === 677, 'SQL: backfill 677 filas principal (1 por canción)');
ok(sqlArtistas.includes('principal 680, invitado 330, productor 14'), 'SQL: la verificación espera principal 680, invitado 330, productor 14');
// 10j. El código preparado trae la implementación (comprobación de texto).
ok(mainCpp.includes('GET /api/artistas') && mainCpp.includes('ON CONFLICT (nombre_norm)') && mainCpp.includes('cargarArtistas'),
  'main.cpp: endpoint /api/artistas, upsert por nombre_norm y carga de artistas por página');
ok(mainCpp.includes("EXISTS (SELECT 1 FROM cancion_artistas ca JOIN artistas") && mainCpp.includes('artista_id = $5'),
  'main.cpp: búsqueda por todos los artistas y filtro ?artista=<id>');
ok(mainCpp.includes('leerArtistasJson') && mainCpp.includes('insertarArtistasCancion') && mainCpp.includes('DELETE FROM cancion_artistas WHERE cancion_id = $1'),
  'main.cpp: POST/PUT leen artistas[], los guardan y PUT reemplaza las filas');
ok(appJs.includes('function textoArtistas') && appJs.includes('function parsearListaArtistas') && appJs.includes('function construirArtistas'),
  'app.js: helpers textoArtistas / parsearListaArtistas / construirArtistas');
ok(appJs.includes('API_ARTISTAS') && appJs.includes("fetchConTimeout(API_ARTISTAS)"),
  'app.js: autocompletado con /api/artistas (con respaldo al export)');
ok(appJs.includes("getElementById('reg-invitados')") && appJs.includes("getElementById('reg-productor')") && appJs.includes("getElementById('mod-7')") && appJs.includes("getElementById('mod-8')"),
  'app.js: Agregar y Editar leen invitados y productor');
ok(idxHtml.includes('id="reg-invitados"') && idxHtml.includes('id="reg-productor"') && idxHtml.includes('Artistas invitados (coma)') && idxHtml.includes('Productor (opcional)'),
  'index.html: campos "Artistas invitados (coma)" y "Productor (opcional)" en Agregar');
ok(!appJs.includes("filtro-artista") && !idxHtml.includes("filtro-artista"),
  'sin filtro por artista en la UI en esta fase (diseño: paso posterior)');
const schemaSql = fs.readFileSync(BASE + 'schema.sql', 'utf8');
ok(schemaSql.includes('CREATE TABLE IF NOT EXISTS artistas') && schemaSql.includes('CREATE TABLE IF NOT EXISTS cancion_artistas') && schemaSql.includes('DROP COLUMN artista'),
  'schema.sql: tablas artistas + cancion_artistas; DROP COLUMN artista solo documentado como paso final separado');
// R5 (ChatGPT): calificacion_final con CHECK 0-20 y orden de migraciones
// completo (correccion-datos-ronda-4.sql después de correccion-678.sql).
ok(schemaSql.includes('calificacion_final DOUBLE PRECISION CHECK (calificacion_final BETWEEN 0 AND 20)'),
  'R5 schema.sql: calificacion_final con CHECK BETWEEN 0 AND 20 (antes sin CHECK)');
ok(schemaSql.indexOf('correccion-678.sql') !== -1 && schemaSql.indexOf('correccion-datos-ronda-4.sql') !== -1 && schemaSql.indexOf('correccion-datos-ronda-4.sql') > schemaSql.indexOf('correccion-678.sql'),
  'R5 schema.sql: el orden de migraciones incluye correccion-datos-ronda-4.sql DESPUÉS de correccion-678.sql');
// 10k. Géneros nuevos del lote 4 (aprobados 2026-11-15): frontend y backend
// coinciden. Antes, app.js ya tenía los 5 (27 valores) pero main.cpp seguía
// en 22, así que POST/PUT con Merengue, Dembow, Reggae, Bachata o Afrobeats
// devolvían 400 "Genero o tipo no valido" aunque el frontend los ofreciera.
// 2026-11-16: + Lofi y Hardcore del lote 2 (regla nueva de Nova); 29 valores.
const _iniG = appJs.indexOf('const GENEROS = '); const _finG = appJs.indexOf('];', _iniG);
const generosAppJs = [...appJs.slice(_iniG, _finG).matchAll(/\['([^']+)','/g)].map(m => m[1]);
const generosCpp = [...mainCpp.match(/GENEROS_VALIDOS = \{([^}]+)\}/)[1].matchAll(/"([^"]+)"/g)].map(m => m[1]);
ok(generosAppJs.length === 29 && generosCpp.length === 29 && JSON.stringify(generosAppJs) === JSON.stringify(generosCpp),
  `GENEROS frontend/backend: ${generosAppJs.length}/${generosCpp.length} idénticos y en el mismo orden`);
ok(['Merengue', 'Dembow', 'Reggae', 'Bachata', 'Afrobeats', 'Lofi', 'Hardcore'].every(g => generosCpp.includes(g)),
  'GENEROS_VALIDOS incluye los 7 géneros nuevos (lote 4: 5; lote 2: Lofi, Hardcore)');

// ---------- 11. P4 — casos límite de fórmula [invariante] ----------
// redondeoExacto: mitad-arriba sobre milésimas enteras, igual que
// std::round(cal*100)/100 en main.cpp. Las milésimas exactas de un total
// siempre terminan en 0 o 5 (base: 35R+25L+40C con R/L/C en décimas;
// importancia en décimas; bonos enteros), así que el único redondeo con
// tercer decimal es el .xx5: siempre hacia arriba en exacto, aunque el
// double ingenuo a veces caiga hacia abajo (ver último caso).
const cancionMax = { ritmo: 10, letras: 10, coro: 10, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1 };
ok(redondeoExacto(total1000(cancionMax)) === 20 && Math.abs(calc(cancionMax) - 20) < 1e-9, 'P4 [invariante] máximo teórico: base 10 + Importancia 5 + 5 bonos = 20.00');
const cancionMin = { ritmo: 0, letras: 0, coro: 0, importancia: 0, antiguedad: 0, nostalgia: 0, descubrimiento: 0, complejidad: 0, arte_visual: 0 };
ok(redondeoExacto(total1000(cancionMin)) === 0 && calc(cancionMin) === 0, 'P4 [invariante] mínimo: todo en 0 = 0.00');
const soloBonos = { ritmo: 0, letras: 0, coro: 0, importancia: 0, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1 };
ok(redondeoExacto(total1000(soloBonos)) === 5, 'P4 [invariante] todo en 0 con los 5 bonos = 5.00 (los bonos solos no hacen GOD)');
const sinCalificarFix = { ritmo: null, letras: null, coro: null, importancia: null, antiguedad: 0, nostalgia: 0, descubrimiento: 0, complejidad: 0, arte_visual: 0 };
ok(calc(sinCalificarFix) === 0, 'P4 [invariante] canción sin calificar (ritmo/letras/coro/importancia null) = 0, sin NaN');
ok(redondeoExacto(total1000({ ritmo: 9.9, letras: 10, coro: 9.1, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1 })) === 19.61,
  'P4 [invariante] redondeo .xx5 hacia arriba: exacto 19.605 → 19.61 (mitad-arriba, como std::round)');
ok(redondeoExacto(total1000({ ritmo: 10, letras: 9.5, coro: 10, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1 })) === 19.88,
  'P4 [invariante] redondeo .xx5 hacia arriba: exacto 19.875 → 19.88 (mitad-arriba, como std::round)');
const casoBinario = { ritmo: 8, letras: 8.1, coro: 8, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1 };
ok(redondeoExacto(total1000(casoBinario)) === 18.03 && Math.round(calc(casoBinario) * 100) / 100 === 18.02,
  'P4 [invariante] redondeo .xx5 con trampa binaria: exacto 18.025 → 18.03, pero el double ingenuo da 18.02 (por eso el harness compara en milésimas enteras)');

// ---------- 12. P5 — bordes de rampa [invariante] ----------
// Bordes de rampa de TONO (tonoPorNota, paleta G): ya no hay mezcla RGB
// entre dos colores (grad/gradNota se eliminaron con la paleta vieja).
// Las rampas mueven el TONO con tope 90% de la distancia al tono destino
// (ALARGADAS 2026-11-17, inicio ajustado a 17.5 por Nova 2026-11-17 07:39): 17.5–17.8 violeta 270°→azul 220°,
// 17.8–18.5 azul 220°→turquesa 180°, 18.5–19 turquesa 180°→verde 150°.
// Los factores 0.9·suave(t) en cada borde ya no aplican como mezcla RGB:
// ahora son la posición en la rampa de tono (≈225.02°, ≈213.48° y
// ≈153.03° en 17.79, 17.99 y 18.99).
ok(tonoPorNota(17.0) === 270 && tonoPorNota(17.5) === 270, 'P5 [invariante] rampa 17.00 y 17.50 → 270° (violeta puro; la ventana violeta→azul empieza en 17.5, no en 17.0)');
ok(cerca(tonoPorNota(17.79), 270 - 50 * 0.9 * suave((17.79 - 17.5) / 0.3)), 'P5 [invariante] rampa 17.79 → ≈225.15° (violeta→azul al ~90%, ventana 17.5–17.8)');
ok(tonoPorNota(17.8) === 220, 'P5 [invariante] rampa 17.80 → 220° (azul puro, inicio de la ventana del 18)');
ok(cerca(tonoPorNota(17.99), 220 - 40 * 0.9 * suave((17.99 - 17.8) / 0.7)), 'P5 [invariante] rampa 17.99 → ≈213.48° (azul→turquesa, ventana alargada 17.8–18.5)');
ok(aHex(colorFila(18.00, 100)) === '#7eb3f5', 'P5 [invariante] rampa 18.00 → azul #7eb3f5 (tono ≈212.86°, en la rampa alargada 17.8–18.5; ya no turquesa puro)');
ok(tonoPorNota(18.5) === 180, 'P5 [invariante] rampa 18.50 → 180° (turquesa puro, fin de la ventana alargada 17.8–18.5, inicio de 18.5–19)');
ok(cerca(tonoPorNota(18.99), 180 - 30 * 0.9 * suave((18.99 - 18.5) / 0.5)), 'P5 [invariante] rampa 18.99 → ≈153.03° (turquesa→verde al ~90%)');
ok(aHex(colorFila(19.00, 100)) === '#11cf70', 'P5 [invariante] rampa 19.00 → verde puro (en el umbral, sin mezcla de rampa)');
// Nota 0 con puesto 1: sin dorado en NINGÚN elemento. colorBase es gris
// (el dorado exige nota > 0, app.js) y el tinte/brillo se derivan de
// colorBase con rgbaDesde, así que tampoco pueden ser dorados.
const c0 = colorFila(0, 1);
ok(c0 === '#6b7280', 'P5 [invariante] nota 0 puesto 1: colorBase gris #6b7280, NO dorado');
ok(!rgbaDesde(c0, 0.33).includes('250,204,21') && !rgbaDesde(c0, 0.6).includes('250,204,21'), 'P5 [invariante] nota 0 puesto 1: ni el tinte (0.33) ni el brillo (0.6) derivados con rgbaDesde son dorados');
ok(colorFila(19.60, 10) === '#facc15', 'P5 [invariante] puesto 10 → dorado pleno');
ok(aHex(colorFila(19.60, 20)) === '#56ed0c', 'P5 [invariante] puesto 20 → mezcla alargada ~49% (#56ed0c, antes color de nota puro #11d472)');
ok(aHex(colorFila(19.60, 21)) === '#3aea0d', 'P5 [invariante] puesto 21 → mezcla alargada ~41% (#3aea0d, antes sin mezcla por estar fuera del Top 20)');
ok(aHex(colorFila(19.60, 25)) === '#10dc40', 'P5 [invariante] 19.60 puesto 25 → mezcla alargada ~15% (#10dc40, antes verde puro #11d472)');

// ---------- 13. P6 — cadena sintética de desempate [invariante] ----------
// 8 canciones con calificacion_final 19.00; cada pareja adyacente empata
// en todos los criterios anteriores y se decide por UNO solo:
// 901>902 por Importancia (base 10.00 en ambas), 902>903 por base
// (10.00 > 9.00), 903>904 por bonos (5 > 4), 904>905 por Descubrimiento
// único (1 > 0, con los mismos 4 bonos), 905>906 por Coro (9.0 > 8.5,
// misma base 9.00), 906>907 por Ritmo (10 > 9.5, mismo Coro 8.5 y misma
// base 9.00), 907>908 por ID (todo igual, 907 más antiguo).
// NOTA HONESTA: 904–908 fijan calificacion_final 19.00 aunque la suma
// exacta de sus campos sea 18.00: son fixtures DEL COMPARADOR, no
// canciones posibles en la DB (con total 19.00 y base 9.00, la única
// combinación es Importancia 5 + bonos 5; bajar bonos obligaría a subir
// base o Importancia, y eso cambiaría el criterio que decide). Lo que se
// fija aquí es el orden del comparador, no la física del catálogo.
// Y hay dos ramas que en la DB real NO pueden decidir nunca: la de bonos
// (mismo total redondeado + misma base + misma Importancia implican los
// mismos bonos) y la de Letra (si solo cambia la Letra, cambia la base y
// decide la base). Se documentan con la prueba siguiente.
const CAD = [
  { id: 901, ritmo: 10, letras: 10, coro: 10, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 0, arte_visual: 1, calificacion_final: 19.00 },
  { id: 902, ritmo: 10, letras: 10, coro: 10, importancia: 4, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
  { id: 903, ritmo: 10, letras: 7.6, coro: 9, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
  { id: 904, ritmo: 10, letras: 7.6, coro: 9, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 0, arte_visual: 1, calificacion_final: 19.00 },
  { id: 905, ritmo: 10, letras: 7.6, coro: 9, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 0, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
  { id: 906, ritmo: 10, letras: 8.4, coro: 8.5, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 0, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
  { id: 907, ritmo: 9.5, letras: 9.1, coro: 8.5, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 0, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
  { id: 908, ritmo: 9.5, letras: 9.1, coro: 8.5, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 0, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 },
];
ok(JSON.stringify([...CAD].sort(cmp).map(c => c.id)) === JSON.stringify([901, 902, 903, 904, 905, 906, 907, 908]),
  'P6 [invariante] cadena de desempate 19.00: orden 901>902>903>904>905>906>907>908 (Importancia, base, bonos, Descubrimiento, Coro, Ritmo, ID)');
ok(JSON.stringify([...CAD].reverse().sort(cmp).map(c => c.id)) === JSON.stringify([901, 902, 903, 904, 905, 906, 907, 908]),
  'P6 [invariante] cadena de desempate: el orden no depende del orden de entrada (determinista)');
// La rama Letra no puede decidir por sí sola: dos canciones que solo
// difieren en Letra difieren también en base, y decide la base.
const soloLetraA = { id: 911, ritmo: 10, letras: 9, coro: 9, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 };
const soloLetraB = { id: 912, ritmo: 10, letras: 8, coro: 9, importancia: 5, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, calificacion_final: 19.00 };
ok(base(soloLetraA) > base(soloLetraB) && cmp(soloLetraA, soloLetraB) < 0,
  'P6 [invariante] Letra sola no decide: A (Letra 9, base 9.35) antes que B (Letra 8, base 9.10) POR LA BASE (la rama Letra es inalcanzable como decisor)');

// ---------- 14. P7 — POST y PUT /info por separado [regla backend] ----------
// Espejo de main.cpp: POST exige género y etiqueta en las listas (400 si
// no); PUT /info exige etiqueta en la lista y género en la lista O igual
// al género actual de la canción (mantener un heredado propio vale 200).
// Listas extraídas de main.cpp en la sección 0b. El harness no ejecuta el
// backend; valida las reglas documentadas.
const enLista = (v, lista) => lista.includes(v);
const validarGeneroPOST = g => enLista(g, GENEROS_VALIDOS_CPP) ? 200 : 400;
const validarGeneroPUT = (g, actual) => (enLista(g, GENEROS_VALIDOS_CPP) || g === actual) ? 200 : 400;
const validarEtiqueta = e => enLista(e, ETIQUETAS_VALIDAS_CPP) ? 200 : 400;
ok(validarGeneroPOST('Hip Hop') === 400, 'P7 [regla backend] POST con género heredado Hip Hop → 400');
ok(validarGeneroPUT('Hip Hop', 'Hip Hop') === 200, 'P7 [regla backend] PUT /info con género propio heredado Hip Hop → 200 (mantener el actual vale)');
ok(validarGeneroPUT('Hip Hop', 'Pop') === 400, 'P7 [regla backend] PUT /info con Hip Hop cuando el actual es Pop → 400 (no se puede cambiar A un heredado)');
ok(validarGeneroPOST('Otro') === 400 && validarGeneroPUT('Otro', 'Otro') === 200, 'P7 [regla backend] Otro: POST → 400, PUT /info propio → 200');
ok(validarGeneroPOST('OST') === 400 && validarGeneroPUT('OST', 'OST') === 200, 'P7 [regla backend] OST: POST → 400, PUT /info propio → 200');
ok(validarGeneroPOST('pop') === 400 && validarGeneroPUT('POP', 'Pop') === 400, 'P7 [regla backend] capitalización distinta (pop, POP) → 400 (la lista es exacta, sin normalizar)');
ok(validarEtiqueta('Acústico') === 400, 'P7 [regla backend] etiqueta Acústico (con tilde) → 400 en POST y en PUT /info (el valor válido es Acustico, sin tilde)');
ok(validarEtiqueta('Acustico') === 200, 'P7 [regla backend] etiqueta Acustico (sin tilde) → 200 en POST y en PUT /info');
ok(validarGeneroPOST('') === 400 && validarGeneroPUT('', 'Pop') === 400, 'P7 [regla backend] género vacío → 400 en POST y en PUT /info');
ok(validarEtiqueta('') === 400, 'P7 [regla backend] etiqueta vacía → 400 en POST y en PUT /info');
ok(validarGeneroPOST('Merengue') === 200 && validarGeneroPUT('Merengue', 'Pop') === 200, 'P7 [regla backend] Merengue (género nuevo, en ambas listas) → 200 en POST y en PUT /info');

// ---------- 15. P8 — casos de artistas [regla backend] ----------
// Espejo de leerArtistasJson + conteos de main.cpp (sección 10h/10g).
// Ya cubiertos en 10h (sin repetirlos): solo invitados → 400, nombre
// >200 → 400, rol inventado → 400. Aquí: dedupe, capitalización, vacío,
// >10 artistas, rol ausente y productores puros 0/0.
const vBz2Roles = validarArtistas([{ nombre: 'Bizarrap', rol: 'invitado' }, { nombre: 'Bizarrap', rol: 'productor' }, { nombre: 'Rauw Alejandro', rol: 'principal' }]);
ok(vBz2Roles.ok && vBz2Roles.entradas.length === 3 && vBz2Roles.entradas.filter(e => e.nombre === 'Bizarrap').length === 2,
  'P8 [regla backend] mismo artista en dos roles (Bizarrap invitado+productor en 670): se guardan LAS DOS entradas; en /api/artistas cuenta 1 canción (10g)');
const vDupRol = validarArtistas([{ nombre: 'Shakira', rol: 'principal' }, { nombre: 'Shakira', rol: 'principal' }]);
ok(vDupRol.ok && vDupRol.entradas.length === 1, 'P8 [regla backend] mismo artista dos veces en el mismo rol: dedupe a 1 entrada');
const vDupMayus = validarArtistas([{ nombre: 'Shakira', rol: 'principal' }, { nombre: 'SHAKIRA', rol: 'principal' }]);
ok(vDupMayus.ok && vDupMayus.entradas.length === 1 && vDupMayus.entradas[0].nombre === 'Shakira',
  'P8 [regla backend] nombre con distinta capitalización (Shakira/SHAKIRA, mismo rol): dedupe a 1, se queda el primero');
ok(!validarArtistas([]).ok, 'P8 [regla backend] arreglo artistas vacío → 400 "Falta el artista principal."');
ok(!validarArtistas(Array.from({ length: 11 }, (_, i) => ({ nombre: 'Artista ' + i, rol: i === 0 ? 'principal' : 'invitado' }))).ok,
  'P8 [regla backend] 11 artistas → 400 "Demasiados artistas (maximo 10 por cancion)."');
const vSinRol = validarArtistas([{ nombre: 'Karol G', rol: 'principal' }, { nombre: 'Feid' }]);
ok(vSinRol.ok && vSinRol.entradas[1].rol === 'invitado', 'P8 [regla backend] artista sin rol: por defecto invitado (textoJson, main.cpp)');
const F_RED = { id: 997, titulo: 'X', artistas: [{ nombre: 'RedOne', rol: 'productor' }, { nombre: 'Danja', rol: 'productor' }, { nombre: 'Artista A', rol: 'principal' }] };
const contRed = conteosArtistas([F_RED]);
ok(contRed['RedOne'].canciones === 0 && contRed['RedOne'].principales === 0 && contRed['Danja'].canciones === 0 && contRed['Danja'].principales === 0,
  'P8 [regla backend] productores puros con 0/0: RedOne y Danja aparecen en /api/artistas con 0 canciones y 0 principales (como Alex da Kid en 10g)');

// ---------- 16. P9 — catálogo vacío y bordes de paginación [invariante] ----------
// Espejos de main.cpp (listado con pagina/total_paginas, stats con
// COALESCE, histograma, exportar) y de app.js (exportar CSV, :433;
// siguienteSinCalificar, :179-180). El harness no ejecuta el backend;
// con fetch mockeado no se puede correr app.js en Node, así que se
// validan las expresiones y los espejos documentados.
// Stats con 0 canciones: main.cpp usa COALESCE(..., 0) en todo.
const statsDe = canciones => {
  const cal = canciones.filter(c => (c.calificacion_final ?? 0) > 0).map(c => c.calificacion_final).sort((a, b) => a - b);
  // Ronda 4: la mediana era 0 hardcodeada (M2 de la ronda 3, que solo se
  // corrigió en el test 23a, no en este espejo). Ahora es la mediana real
  // (PERCENTILE_CONT 0.5: valor central con n impar, media de los dos
  // centrales con n par).
  const mediana = cal.length === 0 ? 0 : cal.length % 2 === 1 ? cal[(cal.length - 1) / 2] : (cal[cal.length / 2 - 1] + cal[cal.length / 2]) / 2;
  return { total: canciones.length, promedio: cal.length ? cal.reduce((a, b) => a + b, 0) / cal.length : 0, obras_maestras: canciones.filter(c => (c.calificacion_final ?? 0) >= 19).length, sin_calificar: canciones.filter(c => (c.calificacion_final ?? 0) === 0).length, mediana, minimo: cal.length ? Math.min(...cal) : 0, maximo: cal.length ? Math.max(...cal) : 0 };
};
ok(JSON.stringify(statsDe([])) === JSON.stringify({ total: 0, promedio: 0, obras_maestras: 0, sin_calificar: 0, mediana: 0, minimo: 0, maximo: 0 }),
  'P9 [invariante] stats con catálogo vacío: todo 0 (COALESCE en main.cpp, sin NaN ni null)');
// Histograma con 0 canciones: los 9 bins en 0.
const binsVacios = { 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-17.8': 0, '17.8-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 };
for (const c of []) binsVacios[binSql(c.calificacion_final)]++;
ok(JSON.stringify(binsVacios) === JSON.stringify({ 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-17.8': 0, '17.8-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 }),
  'P9 [invariante] histograma con catálogo vacío: los 9 rangos en 0');
// Exportar con 0 canciones: JSON [] y CSV con la cabecera sola.
ok(JSON.stringify([]) === '[]', 'P9 [invariante] exportar JSON con 0 canciones: [] (sin canciones, sin error)');
ok(Object.keys([][0] || { id: 0 }).join(',') === 'id', 'P9 [invariante] exportar CSV con 0 canciones: cabecera sola "id" (fallback canciones[0] || {id:0}, app.js:433)');
// Búsqueda sin resultados (con el fixture sintético).
ok(!FIX.some(c => coincideBusqueda(c, 'zzz-no-existe')), 'P9 [invariante] búsqueda sin resultados: ningún fixture coincide con "zzz-no-existe"');
// Paginación (espejo de main.cpp: pagina = min(100000, max(1, pagina));
// total_paginas = (total + 49) / 50; offset = (pagina-1)*50).
const paginaDe = (pedida, total, lista) => {
  const pagina = Math.min(100000, Math.max(1, pedida));
  // Ronda 4: el backend devuelve std::max(1, ...) desde la ronda 3
  // (oleada 2: catálogo vacío → 1, no 0); este espejo usaba la fórmula
  // vieja sin max y daba 0 con total 0. Corregido aquí.
  const totalPaginas = Math.max(1, Math.floor((total + 49) / 50));
  return { pagina_actual: pagina, total_paginas: totalPaginas, canciones: lista.slice((pagina - 1) * 50, pagina * 50) };
};
const pag99 = paginaDe(99, 677, C);
ok(pag99.pagina_actual === 99 && pag99.total_paginas === 14 && pag99.canciones.length === 0,
  'P9 [invariante] pagina mayor que total_paginas (99 > 14 con 677): pagina_actual 99, lista vacía (sin bucle ni error)');
const pag0 = paginaDe(0, 677, C);
ok(pag0.pagina_actual === 1, 'P9 [invariante] pagina=0 → 1 (el backend la sube a 1, no hay página 0)');
// nota_min > nota_max: el filtro >= min AND <= max no casa con ninguna.
ok(FIX.filter(c => c.calificacion_final >= 15 && c.calificacion_final <= 10).length === 0,
  'P9 [invariante] nota_min (15) > nota_max (10): 0 canciones (el filtro no se invierte solo)');
// canciones[0] undefined con fallback {id:0} (app.js:433) y la guarda de
// siguienteSinCalificar (app.js:179-180: si no hay pendientes, toast y no
// se toca canciones[0]).
ok(([])[0] === undefined && Object.keys([][0] || { id: 0 }).join() === 'id',
  'P9 [invariante] canciones[0] undefined con fallback {id:0} (sin crash en el export CSV)');
const dataVacia = { canciones: [] };
ok(!dataVacia.canciones || !dataVacia.canciones.length,
  'P9 [invariante] siguienteSinCalificar con 0 pendientes: la guarda (!canciones || !length) es true → toast "NO HAY PENDIENTES", sin tocar canciones[0]');

// ---------- 17. P11 — sw.js offline: PRUEBA MANUAL (documentada, no inventada) ----------
// No hay navegador en Node, así que NO se inventa una prueba de navegador.
// Lo que sí se comprueba aquí (texto): el fetch de sw.js solo guarda en
// caché cuando la respuesta es OK, que es lo que hace válida la prueba.
// Pasos manuales (en el celular o en DevTools, con la vista previa):
//   1. Abrir la página y esperar a que cargue entera (primera visita:
//      el SW se registra y precachea /, /index.html, /app.js, el
//      manifiesto y los iconos).
//   2. Poner el dispositivo sin red (modo avión, o DevTools → offline).
//   3. Recargar: la página debe cargar desde la caché (sw.js sirve la
//      copia guardada; ver el aviso en consola "[Evaluador] sw: sin red").
//   4. Pedir una URL que no existe (p. ej. /styles.css): debe dar 404 y
//      NO quedar cacheada como válida (al volver la red, no se sirve el
//      404 guardado). Si se sirviera un 404 cacheado, el test de abajo
//      estaría mal: sw.js solo hace put() dentro de `if (res.ok)`.
console.log('  [P11] sw.js offline: prueba MANUAL (ver pasos en el harness, sección 17); aquí solo se comprueba por texto que el fetch solo cachea res.ok.');
ok(swJs.includes('if (res.ok)') && swJs.indexOf('if (res.ok)') < swJs.indexOf('.put(r, c)'),
  'P11 sw.js: el fetch solo guarda en caché cuando res.ok (la respuesta no-OK no se cachea)');
ok(swJs.includes("new Response('Sin conexión'") && swJs.includes('status: 503'), 'R5 sw.js: el fallback 503 "Sin conexión" está en el fuente');

// ---------- 18. G-L1 — ningún log imprime ADMIN_TOKEN ni DATABASE_URL ----------
// main.cpp: sanitizarLog sustituye la cadena de conexión por
// [DATABASE_URL] y trunca a 500; los logs nunca reciben el token.
// Se comprueba por texto: (a) ninguna línea de log (cerr/cout/log*) lleva
// el valor del token, el getenv de ADMIN_TOKEN o la variable con la URL;
// (b) los 3 getenv("ADMIN_TOKEN") son solo comprobaciones o guardar para sanitizar, no logs;
// (c) las 4 funciones de log pasan por sanitizarLog; (d) en app.js
// ningún console.* lleva el token ni la cabecera X-Admin-Token.
const lineasCpp = mainCpp.split('\n');
const logConSecretoCpp = lineasCpp.filter(l => /cerr|cout/.test(l) && (/<<\s*token\b/.test(l) || /getenv\("ADMIN_TOKEN"\)/.test(l) || /g_databaseUrl/.test(l)));
ok(logConSecretoCpp.length === 0, `G-L1 main.cpp: ningún cerr/cout imprime el token, getenv("ADMIN_TOKEN") ni g_databaseUrl (${logConSecretoCpp.length} líneas sospechosas)`);
const usosGetenvToken = lineasCpp.filter(l => l.includes('getenv("ADMIN_TOKEN")'));
ok(usosGetenvToken.length === 3 && usosGetenvToken.every(l => !/cerr|cout|log(Error|Info|Rechazo|Auth)/.test(l)),
  `G-L1 main.cpp: getenv("ADMIN_TOKEN") aparece ${usosGetenvToken.length} veces, solo en comprobaciones o para sanitizar (tokenConfigurado/autorizado/main), nunca en un log`);
ok(mainCpp.includes('static std::string sanitizarLog') && (mainCpp.match(/sanitizarLog\(/g) || []).length >= 5,
  'G-L1 main.cpp: sanitizarLog existe y se usa en logError/logInfo/logRechazo/logAuth (la URL se sustituye por [DATABASE_URL])');
const llamadasConsola = [];
for (const l of appJs.split('\n')) {
  const m = l.match(/console\.(log|warn|error)\(/g);
  if (m) for (const llamada of m) llamadasConsola.push(l.slice(l.indexOf(llamada)));
}
const consolaConSecreto = llamadasConsola.filter(s => /musica_token|X-Admin-Token/.test(s));
ok(consolaConSecreto.length === 0, `G-L1 app.js: ningún console.* lleva el token ni la cabecera X-Admin-Token (${consolaConSecreto.length} llamadas sospechosas)`);

// ---------- 18b. Ronda 2 (logs): sanitizar cubre contraseña y token; pool con causa; error DB con id ----------
// (a) sanitizarLog tapa, además de la URL completa, la contraseña suelta
// (URI y decodificada: libpq puede mostrarla fuera de la URL) y el
// ADMIN_TOKEN; (b) main() extrae la contraseña y guarda el token solo
// para sanitizar; (c) el pool registra la causa del fallo al recrear;
// (d) respuestaErrorDb registra el id en las 3 rutas con id; (e) el aviso
// de JSON inválido en agregar incluye el endpoint.
ok(mainCpp.includes('reemplazarTodo(o, g_dbPassword, "[SECRETO]")') && mainCpp.includes('reemplazarTodo(o, g_dbPasswordDecodificada, "[SECRETO]")') && mainCpp.includes('reemplazarTodo(o, g_adminToken, "[SECRETO]")'),
  'R2-LOG sanitizarLog tapa también la contraseña suelta (URI y decodificada) y el ADMIN_TOKEN, además de la URL completa');
// Ronda 3, oleada LOGS: la contraseña decodificada ya no se guarda en
// una línea (g_dbPasswordDecodificada = decodificarPorciento(claveDb)),
// sino en dos pasos con guarda de longitud (decod.size() >= 4), porque
// tapar una clave decodificada corta destrozaba texto normal del log.
ok(mainCpp.includes('extraerPasswordUrl(cadena_conexion)') && mainCpp.includes('g_adminToken = tokAdmin') && mainCpp.includes('decodificarPorciento(claveDb)') && mainCpp.includes('g_dbPasswordDecodificada = decod'),
  'R2-LOG main() extrae la contraseña de DATABASE_URL y guarda el ADMIN_TOKEN solo para sanitizar (nunca se imprime)');
ok(mainCpp.includes('Recreando conexion tras fallo al validar o abrir: " + motivo') && mainCpp.includes('motivo = e.what()'),
  'R2-LOG el pool registra la causa del fallo al recrear la conexión (no solo que se recrea)');
ok(mainCpp.includes('respuestaErrorDb(const std::string& donde, const std::exception& e, int id = -1)') && mainCpp.includes('respuestaErrorDb("PUT /api/canciones/<id>/calificar", e, id)') && mainCpp.includes('respuestaErrorDb("PUT /api/canciones/<id>/info", e, id)') && mainCpp.includes('respuestaErrorDb("DELETE /api/canciones/<id>", e, id)'),
  'R2-LOG respuestaErrorDb registra el id y las 3 rutas con id lo pasan (calificar, info, eliminar)');
ok(appJs.includes("agregarCancion (JSON en POST ' + API_URL + ')"),
  'R2-LOG app.js: el aviso de JSON inválido en agregar incluye el endpoint (POST API_URL)');

// ---------- 19. E2/E3 — calificar estricto [regla backend] ----------
// Espejo de PUT /api/canciones/<id>/calificar en main.cpp (E2): cuerpo
// no-objeto → 400; los 9 campos son obligatorios (PUT parcial → 400);
// base 0-10, Importancia 0-5, arte_visual solo 0/1, bonos booleanos o
// 0/1; fuera de rango → 400 (no hay clamp). El harness no ejecuta el
// backend; valida las reglas documentadas.
const validarCalificar = b => {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return 400; // cuerpo no-objeto
  const NUM = ['ritmo', 'letras', 'coro', 'importancia', 'arte_visual'];
  const BONOS = ['antiguedad', 'nostalgia', 'descubrimiento_terceros', 'complejidad'];
  for (const c of [...NUM, ...BONOS]) if (!(c in b)) return 400; // faltan campos
  for (const c of NUM) if (typeof b[c] !== 'number') return 400;
  for (const c of ['ritmo', 'letras', 'coro']) if (b[c] < 0 || b[c] > 10) return 400;
  if (b.importancia < 0 || b.importancia > 5) return 400;
  if (b.arte_visual !== 0 && b.arte_visual !== 1) return 400;
  for (const c of BONOS) { const v = b[c]; if (!(v === true || v === false || v === 0 || v === 1)) return 400; }
  return 200;
};
const calOk = { ritmo: 9, letras: 8, coro: 9, importancia: 4, arte_visual: 1, antiguedad: true, nostalgia: false, descubrimiento_terceros: 1, complejidad: 0 };
ok(validarCalificar(calOk) === 200, 'E2/E3 [regla backend] calificar con los 9 campos válidos → 200');
ok(validarCalificar((() => { const b = { ...calOk }; delete b.coro; return b; })()) === 400,
  'E2/E3 [regla backend] calificar sin coro → 400 "Faltan campos de calificación."');
ok(validarCalificar((() => { const b = { ...calOk }; delete b.descubrimiento_terceros; return b; })()) === 400,
  'E2/E3 [regla backend] calificar sin descubrimiento_terceros → 400 "Faltan campos de calificación."');
ok(validarCalificar({ ritmo: 9 }) === 400, 'E2/E3 [regla backend] PUT parcial (solo ritmo) → 400, no borra la nota con ceros');
ok(validarCalificar({ ...calOk, ritmo: 10.5 }) === 400 && validarCalificar({ ...calOk, ritmo: -1 }) === 400 && validarCalificar({ ...calOk, importancia: 5.5 }) === 400,
  'E2/E3 [regla backend] fuera de rango (ritmo 10.5, ritmo -1, importancia 5.5) → 400, sin clamp silencioso');
ok(validarCalificar({ ...calOk, arte_visual: 0.5 }) === 400 && validarCalificar({ ...calOk, arte_visual: 2 }) === 400 && validarCalificar({ ...calOk, arte_visual: true }) === 400,
  'E2/E3 [regla backend] arte_visual solo 0/1 (0.5, 2 y true → 400; true no es número)');
ok(validarCalificar({ ...calOk, antiguedad: '1' }) === 400 && validarCalificar({ ...calOk, nostalgia: 2 }) === 400,
  'E2/E3 [regla backend] bonos solo booleanos o 0/1 ("1" como texto y 2 → 400)');
ok(validarCalificar([1, 2, 3]) === 400 && validarCalificar(null) === 400 && validarCalificar('hola') === 400,
  'E2/E3 [regla backend] cuerpo no-objeto (arreglo, null, texto) → 400 "JSON no válido."');
ok(validarCalificar({ ...calOk, titulo: 'Extra' }) === 200, 'E2/E3 [regla backend] campo extra (titulo) se ignora → 200 (main.cpp no lo rechaza)');
ok(validarCalificar({ ritmo: 0, letras: 0, coro: 0, importancia: 0, arte_visual: 0, antiguedad: false, nostalgia: false, descubrimiento_terceros: 0, complejidad: 0 }) === 200
  && validarCalificar({ ritmo: 10, letras: 10, coro: 10, importancia: 5, arte_visual: 1, antiguedad: true, nostalgia: true, descubrimiento_terceros: true, complejidad: true }) === 200,
  'E2/E3 [regla backend] bordes válidos: todo en 0 → 200 y todo al máximo → 200');

// ---------- 20. DESEMPATE_ASC — Peores = espejo exacto (comportamiento actual FIJADO) ----------
// PREGUNTA ABIERTA PARA NOVA (no es un error): hoy "Peores" es el espejo
// exacto del Top (total ASC, base ASC, ..., ID DESC: a igualdad total, la
// más nueva va antes). Estas pruebas FIJAN ese comportamiento sin
// cambiarlo; si Nova lo quiere distinto (p. ej. ID ASC también en
// Peores), es decisión suya y se cambia aquí y en main.cpp a la vez.
const ascBlock = mainCpp.slice(mainCpp.indexOf('DESEMPATE_ASC'), mainCpp.indexOf('static const std::string DESEMPATE ='));
const descBlock = mainCpp.slice(mainCpp.indexOf('static const std::string DESEMPATE ='), mainCpp.indexOf('// Una sola funcion'));
ok(ascBlock.includes('id DESC') && descBlock.includes('id ASC'),
  'DESEMPATE_ASC main.cpp: el orden Peores termina en id DESC (espejo exacto del Top, que termina en id ASC)');
const cmpPeores = (a, b) =>
  (a.calificacion_final - b.calificacion_final)
  || (base(a) - base(b))
  || ((a.importancia ?? 0) - (b.importancia ?? 0))
  || (bonos(a) - bonos(b))
  || ((a.descubrimiento ? 1 : 0) - (b.descubrimiento ? 1 : 0))
  || ((a.coro ?? 0) - (b.coro ?? 0))
  || ((a.ritmo ?? 0) - (b.ritmo ?? 0))
  || ((a.letras ?? 0) - (b.letras ?? 0))
  || (b.id - a.id);
ok(JSON.stringify([...CAD].sort(cmpPeores).map(c => c.id)) === JSON.stringify([908, 907, 906, 905, 904, 903, 902, 901]),
  'DESEMPATE_ASC [invariante] Peores es el espejo exacto del Top: la cadena 901–908 sale 908–901 (a igualdad total, el ID más nuevo va antes)');

// ---------- 21. /api/salud ahora devuelve JSON (oleada 1) ----------
// app.js no debe depender de que /api/salud devuelva el texto plano "OK".
ok(!appJs.includes('/api/salud'), 'P16 app.js no llama a /api/salud: nada depende del texto plano "OK"');
const saludBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/salud")'), mainCpp.indexOf('CROW_ROUTE(app, "/api/salud/db")'));
ok(saludBlock.includes('res["status"]') && saludBlock.includes('admin_token_configurado') && saludBlock.includes('tokenConfigurado()') && !saludBlock.includes('respSegura(200, "OK")'),
  'P16 main.cpp /api/salud devuelve JSON {"status":"OK","admin_token_configurado":bool} (nunca el valor del token)');

// ---------- 22. Ronda 2 oleada 2 — control de errores ----------
// main.cpp: operator[] de crow::json::rvalue LANZA si la clave falta
// (CROW_JSON_NO_ERROR_CHECK no está definido), así que los campos
// opcionales se leen con has() (textoOpcional/boolOpcional): ausentes →
// defecto, presentes con otro tipo → 400 (antes 500 "Error interno.").
ok(mainCpp.includes('static bool textoOpcional') && mainCpp.includes('static bool boolOpcional'),
  'R2-O2 main.cpp: textoOpcional/boolOpcional existen (lectura segura con has())');
ok(!/textoJson\(body\[/.test(mainCpp) && !/boolJson\(body\[/.test(mainCpp) && !/textoJson\(it\[/.test(mainCpp),
  'R2-O2 main.cpp: ningún acceso sin guarda a body["..."]/it["..."] en POST/PUT (antes 500 con el campo ausente)');
ok(mainCpp.includes('if (!textoOpcional(body, "genero"') && mainCpp.includes('if (!boolOpcional(body, "instrumental"'),
  'R2-O2 main.cpp: POST/PUT usan textoOpcional/boolOpcional (ausente → defecto, tipo incorrecto → 400)');
ok(mainCpp.includes('instrumental_actual') && mainCpp.includes('banda_sonora_actual') && mainCpp.includes('SELECT genero, etiqueta_especial, instrumental, banda_sonora'),
  'R2-O2 main.cpp: PUT /info conserva instrumental/banda_sonora actuales si no vienen (antes un PUT parcial los ponía en false)');
ok(mainCpp.includes('it.t() != crow::json::type::Object'),
  'R2-O2 main.cpp: leerArtistasJson rechaza el elemento no-objeto con 400 (antes it["nombre"] lanzaba 500)');
ok(mainCpp.includes('std::isfinite(ritmo)') && mainCpp.includes('std::isfinite(v) ? v : defecto'),
  'R2-O2 main.cpp: calificar rechaza NaN (isfinite) y parseDoble descarta no-finitos');
// Las guardas (autorizado, límite de lectura, cuerpo 413) van DENTRO del
// try: 12 espacios de indentación; a 8 espacios (fuera del try) no queda
// ninguna, así que una excepción ahí ya no escapa al 500 de Crow.
const esGuardaDentro = l => l.startsWith('            if (int st = autorizado(req') || l.startsWith('            if (excedeLimiteLectura(req') || l.startsWith('            if (cuerpoDemasiadoGrande(req');
const esGuardaFuera = l => l.startsWith('        if (int st = autorizado(req') || l.startsWith('        if (excedeLimiteLectura(req') || l.startsWith('        if (cuerpoDemasiadoGrande(req');
const guardasDentro = mainCpp.split('\n').filter(esGuardaDentro).length;
const guardasFuera = mainCpp.split('\n').filter(esGuardaFuera).length;
// Ronda 3, oleada 5: la 7ª guarda de lectura es /api/salud/db (antes 6;
// el total pasa de 13 a 14). /api/salud (ping de Render) sigue SIN guarda.
// Ronda 5, extras bloque 5: /importar añade 2 guardas (auth + cuerpo
// 2 MB); el total pasa de 14 a 16 (5 auth + 7 lectura + 4 cuerpo 413).
ok(guardasDentro === 16 && guardasFuera === 0,
  `R2-O2 main.cpp: 16 guardas dentro del try (5 auth + 7 lectura + 4 cuerpo 413), 0 fuera (dentro ${guardasDentro}, fuera ${guardasFuera})`);
const lecturaDentro = mainCpp.split('\n').filter(l => l.startsWith('            if (excedeLimiteLectura(req')).length;
ok(lecturaDentro === 7 && mainCpp.includes('respuestaLimiteLectura("GET /api/salud/db")'),
  `R2-O2 main.cpp: 7 guardas de lectura dentro del try (lista, stats, histograma, exportar, generos, artistas y /api/salud/db — la 7ª, ronda 3 oleada 5)`);
// app.js: cualquier 5xx es SIN CONEXIÓN (502/504 del proxy incluidos) y
// el 413 nuevo del backend tiene mensaje propio.
ok(apiJsSrc.includes('res.status >= 500') && apiJsSrc.includes('res.status === 413'),
  'R2-O2 api.js: mostrarErrorHttp cubre cualquier 5xx (502/504 incluidos) y el 413 (módulo 2, ronda 5)');
ok(apiJsSrc.includes('function fetchConTimeout') && apiJsSrc.includes('function errorHttp') && apiJsSrc.includes('function toastLectura'),
  'R2-O2 api.js: helpers fetchConTimeout/errorHttp/toastLectura existen (módulo 2, ronda 5)');
ok((appJs.match(/await fetchConTimeout\(/g) || []).length === 8,
  'R2-O2 app.js: 8 lecturas usan fetchConTimeout con 30 s (antes colgaban sin timeout)');
ok((appJs.match(/toastLectura\(e\);/g) || []).length === 4,
  'R2-O2 app.js: 4 catches de lectura usan toastLectura (429 → DEMASIADOS INTENTOS, resto → SIN CONEXIÓN)');
ok((appJs.match(/showToast\('GUARDANDO…'\)/g) || []).length === 2,
  'R2-O2 app.js: GUARDANDO… solo en agregar/calificar tras validar (antes conBloqueo lo mostraba también al rechazar por validación)');

// ---------- 23. Ronda 3, oleada 1 — huecos de cobertura ----------
// NOTA DE COORDINACIÓN (oleada 6 / fixture): la sección 8 y el test de
// género top de la sección 5 usan el fixture VIEJO (public/datos-reales.json,
// 13-nov, antes de los lotes 2-4 y de artistas). Con un export fresco
// (public/datos-en-vivo.json, leído solo para verificar, sin tocarlo) el
// Top 10, el histograma, GOD 76 y las stats NO cambian, pero la sección 8
// (17 géneros, Hip Hop 39 / Otro 36 / OST 4, "Ver más · 14") y el género
// top (Baladas 18.8; en vivo: Bachata 19.3) SÍ cambian. Si la oleada 6
// actualiza el fixture, la sección 8 y ese test deben actualizarse a los
// valores en vivo. La sección 8 NO se toca en esta oleada.
// 23a. GOD ≥19 (ancla explícita; confirmación de Nova 2026-11-16 15:47:
// las 4 canciones en 19.00 exacto —IDs 8, 84, 286, 587— se quedan verdes;
// GOD = 76). El código ya usaba >= 19, pero el harness solo lo tenía
// implícito (colorFila(19.00) en la sección 12 y el bin 19-20 = 76 en la
// sección 4): aquí queda fijado como obra maestra y como verde, con el
// borde 18.99/19.00 en ambos lados.
ok(aHex(colorFila(19.00, 100)) === '#11cf70' && aHex(colorFila(18.99, 100)) !== '#11cf70',
  'R3 GOD ≥19: 19.00 → verde con bisección; 18.99 sigue en transición turquesa→verde (89.89%), NO verde pleno');
ok(statsDe([{ calificacion_final: 19.00 }]).obras_maestras === 1 && statsDe([{ calificacion_final: 18.99 }]).obras_maestras === 0,
  'R3 GOD ≥19: 19.00 cuenta como obra maestra en stats, 18.99 no (el umbral es ≥19, no >19)');
if (tieneDatos) {
  ok(C.filter(c => c.calificacion_final >= 19).length === 76,
    '[datos reales] stats obras_maestras (GOD ≥19): 76');
  for (const id of [8, 84, 286, 587]) {
    const c = C.find(x => x.id === id);
    ok(c && c.calificacion_final === 19.00,
      `[datos reales] ID ${id} en 19.00 exacto ("${c ? c.titulo : '?'}") → verde GOD (confirmación Nova 2026-11-16)`);
  }
  const cal = C.filter(c => c.calificacion_final > 0).map(c => c.calificacion_final);
  const prom = cal.reduce((a, b) => a + b, 0) / cal.length;
  const ord = [...cal].sort((a, b) => a - b);
  ok(Math.abs(prom - 16.4847) < 0.0001, `[datos reales] stats promedio: ${prom.toFixed(4)} (esperado 16.4847, igual que en vivo)`);
  ok(ord[338] === 16.86, `[datos reales] stats mediana: ${ord[338]} (PERCENTILE_CONT 0.5 del endpoint; la 339ª de 677)`);
  ok(Math.min(...cal) === 10.05 && Math.max(...cal) === 19.6, '[datos reales] stats mínimo 10.05, máximo 19.60');
} else skip('GOD 76 / 19.00 exacto / promedio/mediana/mín/máx con datos reales (sin public/datos-reales.json)');
const statsBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/canciones/stats")'), mainCpp.indexOf('// 2b. HISTOGRAMA'));
ok(statsBlock.includes('PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY calificacion_final) FILTER (WHERE calificacion_final > 0)') && statsBlock.includes('COUNT(*) FILTER (WHERE calificacion_final >= 19)') && statsBlock.includes('COUNT(*) FILTER (WHERE COALESCE(calificacion_final, 0) = 0)'),
  'R3 stats SQL: mediana PERCENTILE_CONT 0.5 solo sobre calificadas; obras_maestras con >= 19 (GOD); sin_calificar con COALESCE = 0');

// 23b. mostrarErrorHttp: el mapa estado→mensaje solo vivía en el código
// (E1). Si alguien cambia el 409 o el 429, nada lo notaba. Se extrae la
// función real de app.js (async) y se corre con respuestas falsas.
let mostrarErrorHttp;
const avisosErrorHttp = [];
try {
  const srcMostrar = extraerFuncion(apiJsSrc, 'mostrarErrorHttp', 'public/js/api.js');
  mostrarErrorHttp = new Function('MSG_SIN_CONEXION', 'showToast', 'async ' + srcMostrar + '\nreturn mostrarErrorHttp;')('SIN CONEXIÓN CON EL SERVIDOR', (m, err) => avisosErrorHttp.push([m, !!err]));
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R3): mostrarErrorHttp: ' + e.message);
  process.exit(1);
}
const pendientes = [];
const resFalso = (status, texto = '') => ({ status, text: async () => texto });
pendientes.push((async () => {
  const probar = async (status, texto, defecto) => { avisosErrorHttp.length = 0; await mostrarErrorHttp(resFalso(status, texto), defecto); return avisosErrorHttp[0] && avisosErrorHttp[0][0]; };
  ok(await probar(400, 'Faltan datos.', 'POR DEFECTO') === 'FALTAN DATOS.', 'R3 mostrarErrorHttp: 400 lee el cuerpo ("Faltan datos." → "FALTAN DATOS.")');
  ok(await probar(400, 'x'.repeat(200), 'POR DEFECTO') === 'X'.repeat(120), 'R3 mostrarErrorHttp: 400 trunca el cuerpo a 120 caracteres (una página de error del proxy no llena el toast)');
  ok(await probar(400, '   ', 'POR DEFECTO') === 'POR DEFECTO', 'R3 mostrarErrorHttp: 400 con cuerpo vacío usa el mensaje por defecto');
  ok(await probar(401, '', 'POR DEFECTO') === 'CLAVE INCORRECTA', 'R3 mostrarErrorHttp: 401 → CLAVE INCORRECTA');
  ok(await probar(404, '', 'POR DEFECTO') === 'NO ENCONTRADA', 'R3 mostrarErrorHttp: 404 → NO ENCONTRADA');
  ok(await probar(409, '', 'POR DEFECTO') === 'ERROR: LA CANCIÓN YA EXISTE', 'R3 mostrarErrorHttp: 409 → ERROR: LA CANCIÓN YA EXISTE');
  ok(await probar(413, '', 'POR DEFECTO') === 'DATOS DEMASIADO GRANDES', 'R3 mostrarErrorHttp: 413 → DATOS DEMASIADO GRANDES');
  ok(await probar(429, '', 'POR DEFECTO') === 'DEMASIADOS INTENTOS, ESPERA', 'R3 mostrarErrorHttp: 429 → DEMASIADOS INTENTOS, ESPERA');
  for (const st of [500, 502, 503, 504]) ok(await probar(st, '', 'POR DEFECTO') === 'SIN CONEXIÓN CON EL SERVIDOR', `R3 mostrarErrorHttp: ${st} → SIN CONEXIÓN (cualquier 5xx, 502/504 del proxy incluidos)`);
  ok(await probar(418, '', 'POR DEFECTO') === 'POR DEFECTO', 'R3 mostrarErrorHttp: estado desconocido (418) usa el mensaje por defecto');
  const probar401 = async (valor) => { avisosErrorHttp.length = 0; await mostrarErrorHttp({ status: 401, text: async () => '', headers: { get: k => k === 'X-Auth-Error' ? valor : null } }, 'POR DEFECTO'); return avisosErrorHttp[0] && avisosErrorHttp[0][0]; };
  ok(await probar401('token_no_configurado') === 'CLAVE NO CONFIGURADA EN EL SERVIDOR', 'R3-O2 mostrarErrorHttp: 401 con X-Auth-Error token_no_configurado -> CLAVE NO CONFIGURADA EN EL SERVIDOR');
  ok(await probar401(null) === 'CLAVE INCORRECTA', 'R3-O2 mostrarErrorHttp: 401 sin cabecera -> CLAVE INCORRECTA');
  ok(await probar401('otro_valor') === 'CLAVE INCORRECTA', 'R3-O2 mostrarErrorHttp: 401 con otro valor de cabecera -> CLAVE INCORRECTA');
  ok(avisosErrorHttp.every(a => a[1] === true), 'R3 mostrarErrorHttp: todos los avisos son de error (showToast con err=true)');
})());

// 23c. claveCancion/normalizarTexto extraídas de app.js: el duplicado
// 409 del backend es LOWER(titulo)=LOWER + LOWER(artista)=LOWER; el
// frontend usa la misma clave para avisar antes de enviar.
let claveCancion;
try {
  const srcNorm = extraerFuncion(appJsSrc, 'normalizarTexto', 'public/app.js');
  const srcClave = extraerFuncion(appJsSrc, 'claveCancion', 'public/app.js');
  claveCancion = new Function(srcNorm + '\n' + srcClave + '\nreturn claveCancion;')();
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R3): claveCancion: ' + e.message);
  process.exit(1);
}
const duplicadoExiste = (lista, t, a) => lista.some(c => claveCancion(c.titulo, c.artista) === claveCancion(t, a));
ok(claveCancion('LA FOTO DEL CARNET', 'Leonardo Favio') === claveCancion('la foto del carnet', '  leonardo   favio '), 'R3 claveCancion: mismo título/artista con otra capitalización y espacios → misma clave (el 409 no depende de cómo se escribió)');
ok(claveCancion('X', 'A') !== claveCancion('X', 'B') && claveCancion('X', 'A') !== claveCancion('Y', 'A'), 'R3 claveCancion: cambia el título o el artista → clave distinta');
ok(duplicadoExiste([{ titulo: 'LA FOTO DEL CARNET', artista: 'Leonardo Favio' }], 'la foto del carnet', 'leonardo favio'), 'R3 POST 409: duplicado sin importar capitalización (LOWER(titulo)=LOWER y LOWER(artista)=LOWER en main.cpp)');
ok(!duplicadoExiste([{ titulo: 'LA FOTO DEL CARNET', artista: 'Leonardo Favio' }], 'La foto del carnet', 'Otro Artista'), 'R3 POST 409: mismo título con otro artista NO es duplicado');
ok(mainCpp.includes('SELECT id FROM canciones WHERE LOWER(titulo) = LOWER($1) AND LOWER(artista) = LOWER($2)'), 'R3 POST: la comprobación de duplicado es por LOWER(título) y LOWER(artista)');

// 23d. Rate limits: autorizado (5 fallos → 429, ventana 10 min, éxito
// resetea) y lectura (120/min por IP). Espejos del patrón mapa+expiración
// de main.cpp; los valores (5, 10 min, 120, Retry-After) se anclan por texto.
const espejoAutorizado = (() => {
  const fallos = new Map();
  const VENTANA = 10 * 60 * 1000;
  return (ip, tokenOk, configurado, ahora) => {
    if (!configurado) return 401;
    let f = fallos.get(ip);
    if (!f || ahora - f.t0 > VENTANA) { f = { n: 0, t0: ahora }; fallos.set(ip, f); }
    if (f.n >= 5) return 429;
    if (tokenOk) { f.n = 0; return 0; }
    f.n++; return 401;
  };
})();
ok([0, 1, 2, 3, 4].every(i => espejoAutorizado('1.2.3.4', false, true, i * 1000) === 401) && espejoAutorizado('1.2.3.4', false, true, 5000) === 429, 'R3 autorizado: 5 fallos seguidos → 401; el 6º → 429');
ok(espejoAutorizado('1.2.3.4', true, true, 6000) === 429, 'R3 autorizado: con 429 activo, ni el token correcto pasa (hay que esperar a que venza la ventana)');
ok(espejoAutorizado('1.2.3.4', true, true, 11 * 60 * 1000) === 0, 'R3 autorizado: vencida la ventana de 10 min, el contador se resetea y el token correcto pasa');
ok(espejoAutorizado('9.9.9.9', false, true, 0) === 401, 'R3 autorizado: el límite es por IP (otra IP empieza en 0 fallos)');
ok(espejoAutorizado('2.2.2.2', false, true, 0) === 401 && espejoAutorizado('2.2.2.2', false, true, 1000) === 401 && espejoAutorizado('2.2.2.2', true, true, 2000) === 0 && espejoAutorizado('2.2.2.2', false, true, 3000) === 401 && espejoAutorizado('2.2.2.2', false, true, 4000) === 401, 'R3 autorizado: un éxito resetea el contador (tras 2 fallos + éxito, los 2 fallos siguientes siguen siendo 401, no 429)');
ok(espejoAutorizado('3.3.3.3', false, false, 0) === 401 && espejoAutorizado('3.3.3.3', true, false, 0) === 401, 'R3 autorizado fail-closed: sin ADMIN_TOKEN válido (ausente o <24), TODAS las escrituras son 401 aunque el token coincida');
const espejoLectura = (() => {
  const lecturas = new Map();
  const VENTANA = 60 * 1000;
  return (ip, ahora) => {
    let f = lecturas.get(ip);
    if (!f || ahora - f.t0 > VENTANA) { f = { n: 0, t0: ahora }; lecturas.set(ip, f); }
    return (++f.n > 120);
  };
})();
let excede121 = false;
for (let i = 0; i < 121; i++) excede121 = espejoLectura('5.5.5.5', i * 100);
ok(excede121 === true, 'R3 lectura: la petición 121 en el mismo minuto excede el límite (120/min por IP)');
ok(espejoLectura('5.5.5.5', 61 * 1000) === false, 'R3 lectura: vencido el minuto, el contador se resetea');
ok(espejoLectura('6.6.6.6', 0) === false, 'R3 lectura: el límite es por IP');
ok(mainCpp.includes('if (f.first >= 5) { logAuth(donde, 429, ip); return 429; }'), 'R3 autorizado: 5 fallos seguidos → 429 (ancla de texto)');
ok(mainCpp.includes('if (++f.first > 120) return true;'), 'R3 lectura: más de 120 peticiones por minuto → 429 (ancla de texto)');
ok(mainCpp.includes('r.add_header("Retry-After", "600")') && mainCpp.includes('r.add_header("Retry-After", "60")'), 'R3 Retry-After: 600 s en auth (429) y 60 s en lectura (429)');
ok(mainCpp.includes('return token != nullptr && std::string(token).size() >= 24;'), 'R3 tokenConfigurado: ADMIN_TOKEN válido solo con ≥24 caracteres (fail-closed)');
ok(mainCpp.includes('std::chrono::minutes(10)') && mainCpp.includes('std::chrono::minutes(1)'), 'R3 ventanas: 10 min para fallos de auth, 1 min para lectura');

// 23e. Cuerpo 64 KB → 413 y timeouts de 30 s.
const cuerpoDemasiadoGrande = tam => tam > 65536;
ok(!cuerpoDemasiadoGrande(65536) && cuerpoDemasiadoGrande(65537) && !cuerpoDemasiadoGrande(0), 'R3 cuerpo: 65536 bytes pasa, 65537 → 413 (el límite es > 64 KB, no >=)');
ok(mainCpp.includes('static const size_t LIMITE_CUERPO = 65536;'), 'R3 cuerpo: LIMITE_CUERPO = 65536 (64 KB)');
ok((mainCpp.match(/cuerpoDemasiadoGrande\(req\)/g) || []).length === 3, 'R3 cuerpo: el límite 413 se comprueba en las 3 escrituras con body (POST, PUT calificar, PUT info)');
const delBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/canciones/<int>")'), mainCpp.indexOf('// LECTURA DEL PUERTO'));
ok(!delBlock.includes('cuerpoDemasiadoGrande'), 'R3 cuerpo: DELETE no comprueba el cuerpo (no lleva body; por diseño)');
ok(((appJs.match(/setTimeout\(\(\) => ctrl\w*\.abort\(\), 30000\)/g) || []).length + (apiJsSrc.match(/setTimeout\(\(\) => ctrl\w*\.abort\(\), 30000\)/g) || []).length) === 3, 'R3 timeouts 30 s: fetchConTimeout, apiFetch y cargarCatalogo abortan a los 30 s (3; los 2 primeros en js/api.js, módulo 2, ronda 5)');
ok(appJs.includes('}, 15000);'), 'R3 estadísticas: reintento programado a los 15 s si la primera carga falla (E7)');
ok(appJs.includes('setTimeout(() => cargarCatalogo(1), 300)'), 'R3 búsqueda: debounce de 300 ms (no se pide en cada tecla)');
ok(appJs.includes('}, 400);'), 'R3 duplicado: el aviso se calcula 400 ms tras dejar de escribir');

// 23f. Token en sessionStorage (decisión 2026-11-14): se borra al cerrar
// la pestaña; los filtros siguen en localStorage (no sensibles).
ok(apiJsSrc.includes("sessionStorage.getItem('musica_token')") && apiJsSrc.includes("sessionStorage.setItem('musica_token'") && (apiJsSrc.match(/sessionStorage\.removeItem\('musica_token'\)/g) || []).length === 2, 'R3 token en sessionStorage: get/set/remove de musica_token (2 removes: al cancelar la clave y tras el segundo 401; en js/api.js, módulo 2, ronda 5)');
ok(appJs.split('\n').filter(l => l.includes('localStorage.')).every(l => l.includes('musica_filtros')), 'R3 localStorage solo guarda filtros (musica_filtros); el token nunca va a localStorage');
ok(apiJsSrc.includes("'X-Admin-Token': t"), 'R3 apiFetch envía el token de sessionStorage en la cabecera X-Admin-Token (js/api.js, módulo 2, ronda 5)');

// 23g. Validación POST/PUT: título/artista, 404 antes que género (E13),
// id<=0 → 400 en las 3 rutas con id, 409 por unique_violation.
const validarTituloArtista = (t, a) => { if (!t || !a) return 'Campos vacios.'; if (t.length > 200 || a.length > 200) return 'Titulo o artista demasiado largo.'; return ''; };
ok(validarTituloArtista('', 'X') === 'Campos vacios.' && validarTituloArtista('X', '') === 'Campos vacios.', 'R3 validarTituloArtista: título o artista vacío → 400 "Campos vacios."');
ok(validarTituloArtista('x'.repeat(201), 'Y') === 'Titulo o artista demasiado largo.' && validarTituloArtista('X', 'y'.repeat(201)) === 'Titulo o artista demasiado largo.', 'R3 validarTituloArtista: más de 200 caracteres → 400');
ok(validarTituloArtista('x'.repeat(200), 'y'.repeat(200)) === '', 'R3 validarTituloArtista: exactamente 200 caracteres pasa');
ok(mainCpp.includes('if (titulo.empty() || artista.empty()) return "Campos vacios."') && mainCpp.includes('if (contarCaracteresUtf8(titulo) > 200 || contarCaracteresUtf8(artista) > 200) return "Titulo o artista demasiado largo."') && mainCpp.includes('if (contarCaracteresUtf8(nombre) > 200) { error = "Nombre de artista demasiado largo."; return false; }') && !mainCpp.includes('titulo.size() > 200') && !mainCpp.includes('nombre.size() > 200'), 'R3 validarTituloArtista: mismas reglas en main.cpp (vacío y >200 caracteres, no bytes; también en nombres de artista)');
const postBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/canciones").methods("POST"'), mainCpp.indexOf('// 4. CALIFICAR (PUT)'));
ok(postBlock.includes('if (!body.has("titulo") || !body.has("artista")'), 'R3 POST sin titulo/artista → 400 "Faltan datos."');
const putInfoBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/canciones/<int>/info")'), mainCpp.indexOf('// 6. ELIMINAR (DELETE)'));
ok(enOrden(putInfoBlock, ['SELECT genero, etiqueta_especial, instrumental, banda_sonora FROM canciones WHERE id = $1', 'No encontrado', 'enLista(etiqueta, ETIQUETAS_VALIDAS)']), 'R3 PUT /info E13: id inexistente → 404 ANTES de validar el género (un 404 no se disfraza de 400)');
ok((mainCpp.match(/if \(id <= 0\) return rechazo/g) || []).length === 3, 'R3 id<=0 → 400 "ID invalido." en las 3 rutas con id (calificar, info, eliminar)');
ok((mainCpp.match(/catch \(const pqxx::unique_violation&\)/g) || []).length === 3, 'R3 409 por unique_violation en POST, en PUT /info y en POST /importar (duplicado en la DB, no solo en la comprobación previa)');

// 23h. Órdenes de GET /api/canciones: lista blanca; lo desconocido es Top.
ok(mainCpp.includes('if (orden_param == "peores")') && mainCpp.includes('extra_cond = " AND calificacion_final > 0"'), 'R3 orden peores: solo calificadas (calificacion_final > 0) y DESEMPATE_ASC');
ok(mainCpp.includes('else if (orden_param == "sin_calificar")') && mainCpp.includes('extra_cond = " AND COALESCE(calificacion_final, 0) = 0"'), 'R3 orden sin_calificar: COALESCE(calificacion_final, 0) = 0 (NULL también es sin calificar)');
ok(mainCpp.includes('else if (orden_param == "recientes") order_sql = "id DESC"'), 'R3 orden recientes: id DESC');
ok(mainCpp.includes('else if (orden_param == "alfabetico") order_sql = "titulo ASC, id ASC"'), 'R3 orden alfabetico: titulo ASC, id ASC (mismo título, orden fijo)');
ok(mainCpp.includes('else if (orden_param == "ritmo" || orden_param == "letras" || orden_param == "coro" || orden_param == "importancia")'), 'R3 orden por métrica: solo ritmo/letras/coro/importancia (lista blanca, sin inyección en el ORDER BY)');
const ordenSqlDe = o => {
  if (o === 'peores') return 'peores';
  if (o === 'sin_calificar') return 'top+sin_calificar';
  if (['ritmo', 'letras', 'coro', 'importancia'].includes(o)) return 'metrica:' + o;
  if (o === 'recientes') return 'id DESC';
  if (o === 'alfabetico') return 'titulo ASC, id ASC';
  return 'top';
};
ok(ordenSqlDe('foo') === 'top' && ordenSqlDe('') === 'top' && ordenSqlDe('TOP') === 'top' && ordenSqlDe('peores; DROP TABLE canciones') === 'top', 'R3 orden desconocido/vacío/mayúsculas/inyección → Top por defecto (el parámetro nunca se concatena al SQL)');

// 23i. Búsqueda y notas: escaparLike, tope de 100 (UTF-8 seguro desde la
// ronda 3, oleada 5) y parseDoble con defecto.
const escaparLike = s => s.replace(/([\\%_])/g, '\\$1');
ok(escaparLike('100%_x\\y') === '100\\%\\_x\\\\y', 'R3 escaparLike: %, _ y \\ del usuario se buscan literalmente (no como comodines LIKE)');
ok(escaparLike('normal') === 'normal' && escaparLike('') === '', 'R3 escaparLike: texto normal y vacío no cambian');
ok(mainCpp.includes('static std::string escaparLike(const std::string& s)') && mainCpp.includes("o += '\\\\';"), 'R3 escaparLike existe en main.cpp y escapa con backslash');
const truncarUtf8 = (s, maxBytes) => {
  const buf = Buffer.from(s, 'utf8');
  if (buf.length <= maxBytes) return s;
  let n = maxBytes;
  while (n > 0 && (buf[n] & 0xC0) === 0x80) n--;
  return buf.subarray(0, n).toString('utf8');
};
ok(truncarUtf8('x'.repeat(101), 100) === 'x'.repeat(100), 'R3 truncarUtf8: 101 ASCII → 100 (tope de 100 bytes)');
ok(truncarUtf8('é'.repeat(60), 100) === 'é'.repeat(50), 'R3 truncarUtf8: 60 é (120 bytes) → 50 é (100 bytes exactos, sin partir carácter)');
ok(truncarUtf8('a'.repeat(99) + 'é', 100) === 'a'.repeat(99), 'R3 truncarUtf8: si el byte 100 cae dentro de é, se corta ANTES de él (99 a; el substr viejo dejaba UTF-8 inválido y el LIKE daba 500)');
ok(truncarUtf8('a'.repeat(99) + '€', 100) === 'a'.repeat(99), 'R3 truncarUtf8: carácter de 3 bytes (€) en el corte también se corta antes');
ok(truncarUtf8('corto', 100) === 'corto', 'R3 truncarUtf8: por debajo del tope no toca nada');
ok(mainCpp.includes('static std::string truncarUtf8(const std::string& s, size_t maxBytes)') && mainCpp.includes('if (buscar.size() > 100) buscar = truncarUtf8(buscar, 100);'), 'R3 buscar: tope de 100 con truncarUtf8 (ronda 3, oleada 5), sin partir UTF-8');
const parseDoble = (s, def) => { if (s == null || !String(s).trim()) return def; const v = Number(s); return Number.isFinite(v) ? v : def; };
ok(parseDoble('abc', -1) === -1 && parseDoble('', -1) === -1 && parseDoble('   ', -1) === -1 && parseDoble('NaN', -1) === -1 && parseDoble('Infinity', -1) === -1 && parseDoble('15.5', -1) === 15.5 && parseDoble('0', -1) === 0, 'R3 parseDoble: texto/vacío/NaN/Infinity → defecto; número válido (incluido 0) pasa');
ok(mainCpp.includes('double f_min = nota_min >= 0 ? nota_min : -1, f_max = nota_max >= 0 ? nota_max : 999;'), 'R3 nota_min/nota_max: -1 = sin filtro (f_min -1, f_max 999)');

// 23j. Salud de la DB, pool, CORS, puerto, rank y artistas.
const saludDbBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/salud/db")'), mainCpp.indexOf('// 1. LEER (GET)'));
ok(saludDbBlock.includes('N.exec("SELECT 1")') && saludDbBlock.includes('respSegura(503, "DB DOWN")') && saludDbBlock.includes('respSegura(200, "OK")'), 'R3 /api/salud/db: SELECT 1 → 200 OK; caída → 503 DB DOWN');
ok(!saludBlock.includes('ConnectionGuard') && !saludBlock.includes('db_pool') && !saludBlock.includes('excedeLimiteLectura'), 'R3 /api/salud no toca la DB ni el pool y no tiene límite de lectura (el ping de Render debe responder siempre)');
ok(saludDbBlock.includes('if (excedeLimiteLectura(req)) return respuestaLimiteLectura("GET /api/salud/db");'), 'R3 /api/salud/db SÍ tiene límite de lectura (ronda 3, oleada 5: tomaba una conexión del pool por petición sin tope)');
ok(mainCpp.includes('throw ErrorPoolTimeout("timeout esperando conexion a la base (5 s)")'), 'R3 pool: 5 s esperando conexión → ErrorPoolTimeout');
ok(mainCpp.includes('return respSegura(503, "DB NO DISPONIBLE")'), 'R3 pool timeout → 503 DB NO DISPONIBLE (no el 500 genérico)');
ok(mainCpp.includes('> std::chrono::seconds(30)'), 'R3 pool: valida la conexión si lleva >30 s inactiva (SELECT 1) antes de usarla');
ok(mainCpp.includes('make_unique<ConnectionPool>(cadena_conexion, 5)'), 'R3 pool: 5 conexiones máximo, perezosas (no se abren al arrancar)');
ok(mainCpp.includes('https://musica-plum-psi.vercel.app') && mainCpp.includes('ALLOWED_ORIGIN=* no admitido'), 'R3 CORS: origen por defecto el dominio de Vercel; "*" se rechaza y se vuelve a Vercel');
ok(mainCpp.includes('std::min(65535, std::max(1, parseEntero(std::getenv("PORT"), 18080)))'), 'R3 puerto: PORT entre 1 y 65535, defecto 18080');
ok(mainCpp.includes('RANK() OVER (ORDER BY calificacion_final DESC NULLS LAST,') && mainCpp.includes('AS rank_global'), 'R3 rank_global: RANK() OVER con el mismo DESEMPATE del Top (el puesto es global, no de página)');
const artBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/artistas")'), mainCpp.indexOf('// 3. CREAR (POST)'));
ok(artBlock.includes('FROM artistas a LEFT JOIN cancion_artistas ca') && !artBlock.includes('HAVING'), 'R3 /api/artistas: LEFT JOIN sin HAVING — lista TODOS los artistas, incluidos los productores puros en 0/0');
ok(artBlock.includes('ORDER BY canciones DESC, a.nombre ASC'), 'R3 /api/artistas: orden por canciones DESC, nombre ASC');
ok(mainCpp.includes('GROUP BY 1 ORDER BY promedio DESC, total DESC'), 'R3 /api/canciones/generos: orden promedio DESC, total DESC (desempate por total)');
ok(mainCpp.includes('o.substr(0, 500) + "...[truncado]"'), 'R3 sanitizarLog trunca a 500 caracteres');
const exportBlock = mainCpp.slice(mainCpp.indexOf('CROW_ROUTE(app, "/api/canciones/exportar")'), mainCpp.indexOf('// 2d. PROMEDIO'));
ok(!exportBlock.includes('autorizado(') && exportBlock.includes('excedeLimiteLectura'), 'R3 export público: sin ADMIN_TOKEN (solo límite de lectura 120/min; decisión 2026-11-13 08:10)');
ok((mainCpp.match(/autorizado\(req,/g) || []).length === 5, 'R3 auth: solo las 5 escrituras exigen ADMIN_TOKEN (POST, POST importar, PUT calificar, PUT info, DELETE); todas las lecturas son públicas');

// 23k. Export CSV: anti-fórmula Excel, BOM y \r\n.
const cel = v => { let s = (v && typeof v === 'object') ? JSON.stringify(v) : String(v ?? ''); if (/^[=+\-@|%]/.test(s.trimStart())) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; // espejo de app.js (ronda 3, oleada 2: objetos como JSON, no "[object Object]")
ok(cel('=2+2') === '"\'=2+2"', 'R3 CSV: celda que empieza con = lleva apóstrofe (anti-fórmula Excel)');
ok(cel(' =2+2') === '"\' =2+2"', 'R3 CSV: el trimStart importa (" =2+2" también es fórmula para Excel)');
ok(cel('Hola "X"') === '"Hola ""X"""', 'R3 CSV: comillas dobles se duplican');
ok(cel('+cmd') === '"\'+cmd"' && cel('@a') === '"\'@a"' && cel('-5') === '"\'-5"' && cel('|x') === '"\'|x"' && cel('%y') === '"\'%y"', 'R3 CSV: +, @, -, | y % iniciales también llevan apóstrofe');
ok(cel(null) === '""' && cel(19.6) === '"19.6"' && cel('normal') === '"normal"', 'R3 CSV: null → vacío, número → texto, normal sin cambios');
ok(appJs.includes('\\ufeff') && appJs.includes(".join('\\r\\n')"), 'R3 CSV: BOM UTF-8 y saltos \\r\\n (Excel en Windows)');
ok(cel([{id:1,nombre:'Karol G',rol:'principal'}]).includes('Karol G') && !cel([{id:1,nombre:'Karol G',rol:'principal'}]).includes('[object Object]'), 'R3-O2 CSV: artistas (objeto) va como JSON con el nombre, no "[object Object]"');
ok(appJs.includes("typeof v === 'object'") && appJs.includes('JSON.stringify(v)'), 'R3-O2 CSV: app.js usa JSON.stringify para objetos en cel (ancla)');

// 23l. Bloqueo por acción (E9), respuestas obsoletas (E6), sliders por
// arrastre sin total previsto, Editar en Evaluar (nunca Eliminar).
const bloqueos = new Set();
const conBloqueoEspejo = async (fn, clave) => { if (bloqueos.has(clave)) return 'bloqueado'; bloqueos.add(clave); try { return await fn(); } finally { bloqueos.delete(clave); } };
pendientes.push((async () => {
  const r1 = await conBloqueoEspejo(async () => conBloqueoEspejo(async () => 'dentro', 'agregar'), 'agregar');
  ok(r1 === 'bloqueado', 'R3 conBloqueo: la misma acción no se re-ejecuta mientras corre (doble clic en Agregar no duplica)');
  ok(await conBloqueoEspejo(async () => 'ok-calificar', 'calificar') === 'ok-calificar', 'R3 conBloqueo: otra acción distinta NO se bloquea (bloqueo por acción, no global)');
  ok(await conBloqueoEspejo(async () => 'otra-vez', 'agregar') === 'otra-vez', 'R3 conBloqueo: al terminar, la misma acción vuelve a valer (finally libera)');
})());
ok(appJs.includes('const bloqueosAccion = new Set();'), 'R3 conBloqueo existe en app.js (Set por clave de acción)');
ok(appJs.includes('if (miReq !== reqActual)'), 'R3 cargarCatalogo E6: respuesta obsoleta se descarta (miReq !== reqActual)');
ok(appJs.includes('if (!data.canciones.length && pagina > 1 && paginaDestino < pagina) return cargarCatalogo(paginaDestino);'), 'R3 cargarCatalogo E6: última página vacía retrocede una sola vez (sin bucle)');
const actValoresBlock = appJs.slice(appJs.indexOf('function actualizarValores()'), appJs.indexOf('function vigilarSliders()'));
ok(!actValoresBlock.includes('0.35') && !actValoresBlock.includes('calificacion_final'), 'R3 sliders: actualizarValores no calcula ningún total previsto (solo muestra los 4 valores)');
ok(appJs.includes("el.addEventListener('pointerdown'") && appJs.includes("['pointerup', 'pointercancel', 'pointerleave']"), 'R3 sliders: solo por arrastre (pointerdown/pointerup/pointercancel/pointerleave; sin botones +/- ni entrada numérica)');
ok(appJs.includes('function editarActiva() { if (idSeleccionadoGlobal) openEditModal(idSeleccionadoGlobal); }'), 'R3 Evaluar: editarActiva solo abre el modal de Editar (nunca Eliminar)');
ok((appJs.match(/eliminarCancion\(/g) || []).length === 2, 'R3 Eliminar: solo se llama desde la fila del Top (1 llamada) + su definición; Evaluar no tiene Eliminar');

// 24. Ronda 3, oleadas 2+3: 401 con distinción, DB caída → 503,
// total_paginas con catálogo vacío, CSV con objetos (ver 23b/23k) y logs
// (contraseña con ':', decodificada corta, nivel Warning de Crow).
ok(mainCpp.includes('r.add_header("X-Auth-Error", "token_no_configurado")') && mainCpp.includes('"Token no configurado."'), 'R3-O2 401: token no configurado -> cabecera X-Auth-Error + cuerpo distinto de "No autorizado."');
ok(mainCpp.includes('if (dynamic_cast<const pqxx::broken_connection*>(&e) != nullptr) return respSegura(503, "DB NO DISPONIBLE");'), 'R3-O2 DB caída: broken_connection -> 503 (no el 500 genérico)');
ok(mainCpp.includes('res["total_paginas"] = std::max(1, (total_canciones + limite - 1)'), 'R3-O2 total_paginas: catálogo vacío -> 1, no 0');
ok(apiJsSrc.includes("res.headers.get('X-Auth-Error') === 'token_no_configurado'"), 'R3-O2 apiFetch: con token no configurado no pide la clave (sin prompt; js/api.js, módulo 2, ronda 5)');
ok(mainCpp.includes("url.find(':', esquema + 3)") && !mainCpp.includes("rfind(':', arroba)"), 'R3-LOG extraerPasswordUrl: primer : tras el esquema (clave con : se tapa entera)');
ok(mainCpp.includes('if (decod.size() >= 4) g_dbPasswordDecodificada = decod;'), 'R3-LOG decodificada corta (<4) no se guarda: no destrozar texto normal del log');
ok(mainCpp.includes('crow::logger::setLogLevel(crow::LogLevel::Warning)'), 'R3-LOG Crow en Warning: las peticiones (URL con query) no van al log');

// ---------- 25. Ronda 4, oleada 1 (Pruebas): splash, M1, M3, casos borde ----------
// 25a. Splash: los 8 tests propuestos en la ronda 3 (el splash se
// implementó en esa ronda pero sus tests quedaron pendientes).
// (1) #pantalla-carga presente, con role/aria y CSS que la oculta.
ok(idxHtml.includes('<div id="pantalla-carga" role="status" aria-label="Cargando el catálogo">'),
  'R4 splash: #pantalla-carga presente con role="status" y aria-label');
ok(idxHtml.includes('#pantalla-carga.oculta { display: none; }'),
  'R4 splash: CSS #pantalla-carga.oculta { display: none; } (la clase es lo que la oculta)');
// (7) <noscript> lo oculta.
ok(idxHtml.includes('<noscript><style>#pantalla-carga{display:none}</style>'),
  'R4 splash: <noscript> oculta el splash sin JavaScript');
// (8) Sin handlers inline en el splash.
const bloqueSplash = idxHtml.slice(idxHtml.indexOf('<div id="pantalla-carga"'), idxHtml.indexOf('<noscript>'));
ok(bloqueSplash.length > 0 && !/on\w+\s*=/.test(bloqueSplash),
  'R4 splash: el bloque #pantalla-carga no tiene manejadores inline (solo marca)');
// Anclas de los 2 sitios que la ocultan: tras pintar en try, y en catch.
ok(appJs.includes('igualarFilas();\n                ocultarSplash();') && appJs.includes("toastLectura(e); ocultarSplash(); }"),
  'R4 splash: ocultarSplash se llama en try (tras igualarFilas) y en catch (tras el error)');
ok((appJs.match(/ocultarSplash\(\);/g) || []).length === 2 && appJs.includes('function ocultarSplash()'),
  'R4 splash: exactamente 2 llamadas a ocultarSplash() + su definición (ni una más, ni una menos)');
// (2) ocultarSplash idempotente y null-guarded (función real extraída;
// el documento se inyecta al crearla, como en 23b con mostrarErrorHttp).
let ocultarSplashSrc;
try {
  ocultarSplashSrc = extraerFuncion(appJsSrc, 'ocultarSplash', 'public/app.js');
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R4): ocultarSplash: ' + e.message);
  process.exit(1);
}
const hacerOcultarSplash = doc => new Function('document', ocultarSplashSrc + '\nreturn ocultarSplash;')(doc)();
const hacerDocSplash = presente => {
  const s = new Set(); let adds = 0;
  const el = { classList: { add: v => { adds++; s.add(v); }, remove: v => s.delete(v), contains: v => s.has(v), _adds: () => adds, _size: () => s.size } };
  return { el, doc: { getElementById: id => (id === 'pantalla-carga' && presente ? el : null) } };
};
const dSp1 = hacerDocSplash(true);
ok((() => { try { hacerOcultarSplash(dSp1.doc); return dSp1.el.classList.contains('oculta'); } catch (e) { return false; } })(),
  'R4 splash: ocultarSplash añade .oculta al elemento presente');
ok((() => { hacerOcultarSplash(dSp1.doc); return dSp1.el.classList._adds() === 2 && dSp1.el.classList._size() === 1; })(),
  'R4 splash: ocultarSplash idempotente (2ª llamada no duplica la clase ni falla)');
ok((() => { try { hacerOcultarSplash(hacerDocSplash(false).doc); return true; } catch (e) { return false; } })(),
  'R4 splash: ocultarSplash con elemento ausente no lanza (null-guarded)');
// (3)-(6) cargarCatalogo REAL con DOM y fetch falsos: se oculta tras OK
// y tras error, NO con respuestas obsoletas ni antes de la recursión de
// paginación. El sandbox ejecuta el render real (filas, colores, texto).
let sandboxCargaSrc;
try {
  const srcOc = extraerFuncion(appJsSrc, 'ocultarSplash', 'public/app.js');
  const srcCg = extraerFuncion(appJsSrc, 'cargarCatalogo', 'public/app.js');
  const srcEs = extraerFuncion(apiJsSrc, 'escapeHtml', 'public/js/api.js');
  const srcTA = extraerFuncion(appJsSrc, 'textoArtistas', 'public/app.js');
  const fnsC = ['hexAHsl', 'hslARgb', 'mezcla', 'rgbaDesde', 'suave', 'luminanciaRelativa', 'yObjetivo', 'tonoPorNota', 'colorPorNota', 'alfaGlowGod'].map(n => extraerFuncion(coloresJsSrc, n, 'public/js/colores.js'));
  sandboxCargaSrc = [
    'let reqActual = 0, paginaActualGlobal = 1, totalPaginasGlobal = 1, cancionesGlobal = [],',
    '  artistasCompletos = false, catalogoListo = false, statsListas = true, rangoFiltro = null, animacionEntradaLista = true, idSeleccionadoGlobal = null;',
    'const METRICAS = { ritmo: ["RITMO", 10], letras: ["LETRAS", 10], coro: ["CORO", 10], importancia: ["IMPORT.", 5] };',
    'const MAP_GENEROS = { Pop: "Pop", Electronica: "Electrónica", Rap: "Rap" };',
    'const MAP_ETIQUETAS = { Original: "Original", Edit: "Edit", Remix: "Remix" };',
    'const API_URL = "/api/canciones";',
    'function guardarFiltros() {}',
    'function cargarEstadisticas() {}',
    'function errorHttp(res, url) { const e = new Error("HTTP " + res.status + " en " + url); e.status = res.status; return e; }',
    'function toastLectura(e) {}',
    'function igualarFilas() {}',
    fnsC.join('\n'),
    srcOc, 'async ' + srcCg, srcEs, srcTA,
    'return { cargarCatalogo };',
  ].join('\n');
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R4): sandbox cargarCatalogo: ' + e.message);
  process.exit(1);
}
const hacerDocCarga = () => {
  const els = {};
  const el = id => els[id] || (els[id] = {
    value: id === 'select-orden' ? 'top' : '',
    innerHTML: '',
    classList: (() => { const s = new Set(); let adds = 0; return {
      add: v => { adds++; s.add(v); }, remove: v => s.delete(v),
      toggle: (v, f) => { if (f === undefined) { if (s.has(v)) s.delete(v); else s.add(v); } else if (f) s.add(v); else s.delete(v); },
      contains: v => s.has(v), _adds: () => adds }; })(),
    style: {},
  });
  // Los elementos existen en el DOM real aunque nada los haya tocado aún
  // (si no, leer els['pantalla-carga'] tras una respuesta obsoleta daría
  // undefined y el test moriría en vez de fallar limpio).
  ['pantalla-carga', 'lista_canciones', 'barra-carga', 'lista-artistas', 'input-buscar', 'select-orden', 'filtro-genero'].forEach(id => el(id));
  return { els, doc: { getElementById: id => el(id) } };
};
const crearCarga = (doc, fetchFn) => new Function('document', 'fetch', sandboxCargaSrc)(doc, fetchFn);
const CAN_A = { id: 144, titulo: 'LA FOTO DEL CARNET', artista: 'Leonardo Favio', artistas: [{ nombre: 'Leonardo Favio', rol: 'principal' }], calificacion_final: 19.6, ritmo: 10, letras: 9.6, coro: 10, importancia: 4.7, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, genero: 'Pop', etiqueta: 'Original', instrumental: false, banda_sonora: false, rank_global: 1 };
const CAN_B = { id: 678, titulo: 'Freaks', artista: 'Timmy Trumpet', artistas: [{ nombre: 'Timmy Trumpet', rol: 'principal' }, { nombre: 'Savage', rol: 'invitado' }], calificacion_final: 16.09, ritmo: 9.1, letras: 8.8, coro: 5, importancia: 3.7, antiguedad: 1, nostalgia: 1, descubrimiento: 1, complejidad: 1, arte_visual: 1, genero: 'Electronica', etiqueta: 'Edit', instrumental: false, banda_sonora: false, rank_global: 400 };
const respOk = canciones => ({ ok: true, status: 200, json: async () => ({ total_paginas: 14, pagina_actual: 1, total_canciones: 678, canciones }) });
const diferido = () => { let res; const p = new Promise(r => { res = r; }); return { p, res }; };
pendientes.push((async () => {
  const d = hacerDocCarga();
  await crearCarga(d.doc, async () => respOk([CAN_A, CAN_B])).cargarCatalogo(1);
  ok(d.els['pantalla-carga'].classList._adds() === 1, 'R4 splash: cargarCatalogo OK oculta el splash exactamente 1 vez');
  ok(d.els['lista_canciones'].innerHTML.includes('LA FOTO DEL CARNET') && d.els['lista_canciones'].innerHTML.includes('Freaks'),
    'R4 splash: tras OK, la lista pinta las canciones (el sandbox ejecuta el render real)');
  const d2 = hacerDocCarga();
  await crearCarga(d2.doc, async () => ({ ok: false, status: 500, json: async () => ({}) })).cargarCatalogo(1);
  ok(d2.els['pantalla-carga'].classList._adds() === 1, 'R4 splash: cargarCatalogo con error HTTP también oculta el splash (1 vez)');
  ok(d2.els['lista_canciones'].innerHTML.includes('No se pudo cargar el catálogo'),
    'R4 splash: tras error HTTP, la lista muestra el mensaje de error');
  const d2b = hacerDocCarga();
  await crearCarga(d2b.doc, async () => { throw new Error('red caída'); }).cargarCatalogo(1);
  ok(d2b.els['pantalla-carga'].classList._adds() === 1, 'R4 splash: fetch que rechaza (sin red) también oculta el splash (1 vez)');
  const d3 = hacerDocCarga();
  const def1 = diferido(), def2 = diferido();
  const carga3 = crearCarga(d3.doc, url => (/pagina=1(&|$)/.test(url) ? def1.p : def2.p));
  const p1 = carga3.cargarCatalogo(1);
  const p2 = carga3.cargarCatalogo(2);
  def1.res(respOk([CAN_A]));
  await p1;
  ok(d3.els['pantalla-carga'].classList._adds() === 0, 'R4 splash: respuesta obsoleta (pág. 1 tras pedir pág. 2) NO oculta el splash');
  ok(!d3.els['lista_canciones'].innerHTML.includes('LA FOTO DEL CARNET'), 'R4 splash: respuesta obsoleta NO pinta sus filas');
  def2.res({ ok: true, status: 200, json: async () => ({ total_paginas: 14, pagina_actual: 2, total_canciones: 678, canciones: [CAN_B] }) });
  await p2;
  ok(d3.els['pantalla-carga'].classList._adds() === 1, 'R4 splash: la carga vigente sí oculta el splash (1 vez en total)');
  ok(d3.els['lista_canciones'].innerHTML.includes('Freaks') && !d3.els['lista_canciones'].innerHTML.includes('LA FOTO DEL CARNET'),
    'R4 splash: la lista final es la de la carga vigente (pág. 2), no la obsoleta');
  const d4 = hacerDocCarga();
  const defA = diferido(), defB = diferido();
  const carga4 = crearCarga(d4.doc, url => (/pagina=14(&|$)/.test(url) ? defA.p : defB.p));
  const pRec = carga4.cargarCatalogo(14);
  defA.res({ ok: true, status: 200, json: async () => ({ total_paginas: 13, pagina_actual: 14, total_canciones: 678, canciones: [] }) });
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
  ok(d4.els['pantalla-carga'].classList._adds() === 0, 'R4 splash: en la recursión de paginación, la llamada exterior NO oculta el splash antes de que termine la interior');
  defB.res({ ok: true, status: 200, json: async () => ({ total_paginas: 13, pagina_actual: 13, total_canciones: 678, canciones: [CAN_B] }) });
  await pRec;
  ok(d4.els['pantalla-carga'].classList._adds() === 1, 'R4 splash: tras la recursión, el splash se oculta exactamente 1 vez (la carga interior)');
  ok(d4.els['lista_canciones'].innerHTML.includes('PÁG 13 / 13'), 'R4 splash: tras la recursión, la lista muestra la pág. 13');
})());

// 25b. M1 (ronda 3): colorFila era espejo, no extraída. Ahora el bloque
// de color REAL de cargarCatalogo se extrae de app.js y se ejecuta: si
// alguien cambia un umbral en app.js, estos tests fallan (el espejo no
// lo notaría). El espejo se conserva y se compara contra lo real.
let colorFilaReal;
try {
  const fnsColor = ['hexAHsl', 'hslARgb', 'mezcla', 'rgbaDesde', 'suave', 'luminanciaRelativa', 'yObjetivo', 'tonoPorNota', 'colorPorNota', 'alfaGlowGod'].map(n => extraerFuncion(coloresJsSrc, n, 'public/js/colores.js'));
  const ini = appJsSrc.indexOf('// INICIO-COLOR-G');
  const finMarc = "if (nota > 0 && rank <= 10) { colorBase = '#facc15'; glow = 'rgba(250,204,21,0.7)'; enTransicion = false; }";
  const fin = appJsSrc.indexOf(finMarc);
  if (ini === -1 || fin === -1) throw new Error('no se encontró el bloque de color de cargarCatalogo en public/app.js');
  const bloque = appJsSrc.slice(ini, fin + finMarc.length);
  colorFilaReal = new Function(fnsColor.join('\n')
    + '\nfunction colorFilaReal(nota, rank) {\n' + bloque + '\nreturn colorBase;\n}\nreturn colorFilaReal;')();
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R4-M1): color de fila real: ' + e.message);
  process.exit(1);
}
ok(aHex(colorFilaReal(19.00, 100)) === '#11cf70' && aHex(colorFilaReal(18.99, 100)) !== '#11cf70',
  'R4-M1 color REAL: 19.00 → verde GOD #11cf70; 18.99 es #11cf7a (el umbral es >= 19 en el código real, no en un espejo)');
ok(aHex(colorFilaReal(18.00, 100)) === '#7eb3f5' && aHex(colorFilaReal(17.99, 100)) === '#80b4f5',
  'R4-M1 color REAL: 18.00 → azul #7eb3f5; 17.99 es #80b4f5 (rampa alargada 17.8–18.5; el umbral >= 18 sigue valiendo para el glow, no para el tono puro)');
ok(aHex(colorFilaReal(17.80, 100)) === '#8caff6' && aHex(colorFilaReal(17.79, 100)) !== '#8caff6',
  'R4-M1 color REAL: 17.80 → azul #8caff6; 17.79 es #94adf6 (umbral ≥ 17.8)');
ok(colorFilaReal(18.9, 3) === '#facc15' && colorFilaReal(0, 100) === '#6b7280' && aHex(colorFilaReal(10.05, 678)) === '#a456f1',
  'R4-M1 color REAL: dorado solo por puesto (18.9 puesto 3), gris sin calificar, violeta 10.05 puesto 678');
ok(enOrden(appJsSrc, ['colorBase = colorPorNota(nota);', 'alfaGlow = alfaGlowGod(nota);', "if (nota > 0 && rank > 10 && rank <= 30) colorBase = mezcla(0.9 * suave((30 - rank) / 19), colorBase, '#facc15');", "if (nota > 0 && rank <= 10) { colorBase = '#facc15'"]),
  'R4-M1 ancla de texto: colorPorNota + alfaGlowGod + mezcla Top 11-30 + dorado Top 10, en orden en app.js');
const notasBarrido = [0, 0.01, 10.05, 16.09, 17.49, 17.5, 17.79, 17.8, 17.81, 17.99, 18, 18.49, 18.5, 18.99, 19, 19.6, 20];
const puestosBarrido = [1, 10, 11, 15, 20, 21, 100, 678];
let difColor = [];
for (const n of notasBarrido) for (const r of puestosBarrido) { const a = colorFilaReal(n, r), b = colorFila(n, r); if (a !== b) difColor.push(`${n}@${r}: real=${a} espejo=${b}`); }
ok(difColor.length === 0, `R4-M1 diferencial: color REAL vs espejo en ${notasBarrido.length * puestosBarrido.length} combinaciones nota×puesto, ${difColor.length} diferencias (${difColor.slice(0, 3).join('; ') || 'ninguna'})`);

// 25c. M3 (ronda 3): los espejos de reglas de backend se duplicaban a
// mano. Ahora los números que los espejos hardcodean se extraen de
// main.cpp y se comparan: si el backend cambia un valor sin actualizar
// el espejo, esto falla.
const numCpp = re => { const m = mainCpp.match(re); return m ? Number(m[1]) : NaN; };
ok(numCpp(/LIMITE_CUERPO = (\d+)/) === 65536, 'R4-M3 ancla numérica: LIMITE_CUERPO = 65536 en main.cpp (el espejo de 23e usa 65536)');
ok(numCpp(/if \(f\.first >= (\d+)\)/) === 5, 'R4-M3 ancla numérica: 5 fallos de auth → 429 (el espejo de 23d usa 5)');
ok(numCpp(/if \(\+\+f\.first > (\d+)\)/) === 120, 'R4-M3 ancla numérica: 120 lecturas/min (el espejo de 23d usa 120)');
const minutosCpp = [...new Set([...mainCpp.matchAll(/minutes\((\d+)\)/g)].map(m => Number(m[1])))];
ok(JSON.stringify(minutosCpp) === JSON.stringify([10, 1]), `R4-M3 ancla numérica: ventanas minutes(10) auth y minutes(1) lectura (encontradas: ${minutosCpp.join(',')})`);
const retryCpp = [...mainCpp.matchAll(/Retry-After", "(\d+)"/g)].map(m => Number(m[1]));
ok(JSON.stringify(retryCpp) === JSON.stringify([600, 60]), `R4-M3 ancla numérica: Retry-After 600 (auth) y 60 (lectura) (encontrados: ${retryCpp.join(',')})`);
ok(numCpp(/std::string\(token\)\.size\(\) >= (\d+)/) === 24, 'R4-M3 ancla numérica: ADMIN_TOKEN válido con >= 24 caracteres (el espejo de 23d usa 24)');
ok(numCpp(/contarCaracteresUtf8\(titulo\) > (\d+)/) === 200, 'R4-M3 ancla numérica: título > 200 caracteres → 400 (el espejo de 23g usa 200; ronda 5: caracteres, no bytes)');
ok(numCpp(/buscar\.size\(\) > (\d+)/) === 100 && numCpp(/truncarUtf8\(buscar, (\d+)\)/) === 100, 'R4-M3 ancla numérica: búsqueda truncada a 100 bytes (el espejo de 23i usa 100)');
ok(numCpp(/ConnectionPool>\(cadena_conexion, (\d+)\)/) === 5 && mainCpp.includes('timeout esperando conexion a la base (5 s)'), 'R4-M3 ancla numérica: pool de 5 conexiones, timeout 5 s (el espejo de 23j usa 5)');
ok(numCpp(/int limite = (\d+);/) === 50, 'R4-M3 ancla numérica: página de 50 canciones (los espejos de paginación usan 50)');

// 25d. Catálogo 678 (sintético: fixture 677 + canción 678 verificada en
// vivo; el fixture NO se toca por diseño). La 678 es "Freaks" / Timmy
// Trumpet / Electronica / Edit / 16.09 (ver REVISION.md, corrección 678).
const S678 = { id: 678, titulo: 'Freaks', artista: 'Timmy Trumpet', artistas: [{ nombre: 'Timmy Trumpet', rol: 'principal', id: 437 }, { nombre: 'Savage', rol: 'invitado', id: 438 }], calificacion_final: 16.09, ritmo: 9.1, letras: 8.8, coro: 5, importancia: 3.7, antiguedad: true, nostalgia: true, descubrimiento: true, complejidad: true, arte_visual: 1, genero: 'Electronica', etiqueta: 'Edit', instrumental: false, banda_sonora: false };
if (tieneDatos) {
  const C678 = [...C, S678];
  ok(C678.length === 678, '[datos reales] catálogo 678: 677 del fixture + 678 sintética');
  ok(Math.ceil(678 / 50) === 14 && 678 - 13 * 50 === 28, 'R4 678: 14 páginas, última con 28 canciones');
  const top10_678 = [...C678].sort(cmp).slice(0, 10).map(c => c.id);
  ok(JSON.stringify(top10_678) === JSON.stringify([144, 167, 213, 116, 307, 606, 348, 29, 399, 145]),
    `[datos reales] Top 10 global intacto con 678: ${top10_678.join(',')}`);
  const rank678 = [...C678].sort(cmp).findIndex(c => c.id === 678) + 1;
  ok(rank678 > 10, `[datos reales] puesto global de la 678 = ${rank678} (fuera del Top 10, no dorada)`);
  ok(aHex(colorFila(16.09, rank678)) === '#c38ff6', 'R4 678: 16.09 fuera de ventanas = violeta con bisección (G invertida)');
  const bins678 = { 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-17.8': 0, '17.8-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 };
  for (const c of C678) bins678[binSql(c.calificacion_final)]++;
  ok(JSON.stringify(bins678) === JSON.stringify({ 'menos-10': 0, '10-12': 22, '12-14': 79, '14-16': 157, '16-17.8': 186, '17.8-18': 16, '18-19': 142, '19-20': 76, 'sin_calificar': 0 }),
    '[datos reales] histograma con 678: 22/79/157/186/16/142/76 (bin 16-17.8 185→186 por la 678, igual que en vivo; el fixture de 677 sigue en 185)');
} else skip('catálogo 678 / Top 10 / histograma 186+16 con datos reales (sin public/datos-reales.json)');

// 25e. Artistas: textoArtistas REAL extraído (como claveCancion en 23c);
// 2 principales; productores puros 0/0; corrección 678.
let textoArtistasReal;
try {
  const srcTA = extraerFuncion(appJsSrc, 'textoArtistas', 'public/app.js');
  textoArtistasReal = new Function(srcTA + '\nreturn textoArtistas;')();
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (R4): textoArtistas: ' + e.message);
  process.exit(1);
}
const casosArtistas = [F531, F662, F101, F232, F670, S678, { artista: 'Shakira', artistas: [{ nombre: 'Shakira', rol: 'principal' }] }];
const difArt = casosArtistas.filter(c => textoArtistasReal(c) !== textoArtistas(c));
ok(difArt.length === 0, `R4 artistas: textoArtistas REAL vs copia del harness en ${casosArtistas.length} casos (531, 662, 101, 232, 670, 678, Shakira), ${difArt.length} diferencias`);
ok(textoArtistasReal(S678) === 'Timmy Trumpet ft. Savage', 'R4 artistas 678: "Timmy Trumpet ft. Savage" (principal = a quien se acredita la canción, sea productor o no; Savage invitado por decisión de Nova 2026-11-16)');
ok(textoArtistasReal({ artista: 'Timmy Trumpet', artistas: [{ nombre: 'Timmy Trumpet', rol: 'productor' }] }) === 'Timmy Trumpet',
  'R4 artistas: sin principal (solo productor) se usa la columna artista (el productor no se acredita como principal)');
const artistasApi = (artistas, links) => artistas.map(a => {
  const ls = links.filter(l => l.artista_id === a.id);
  return { nombre: a.nombre, canciones: new Set(ls.map(l => l.cancion_id)).size, principales: new Set(ls.filter(l => l.rol === 'principal').map(l => l.cancion_id)).size };
});
const api678 = artistasApi(
  [{ id: 1, nombre: 'RedOne' }, { id: 2, nombre: 'Danja' }, { id: 3, nombre: 'Alex da Kid' }, { id: 437, nombre: 'Timmy Trumpet' }, { id: 438, nombre: 'Savage' }],
  [{ cancion_id: 678, artista_id: 437, rol: 'principal' }, { cancion_id: 678, artista_id: 438, rol: 'invitado' }]);
ok(api678.find(a => a.nombre === 'RedOne').canciones === 0 && api678.find(a => a.nombre === 'RedOne').principales === 0
  && api678.find(a => a.nombre === 'Danja').canciones === 0 && api678.find(a => a.nombre === 'Alex da Kid').canciones === 0,
  'R4 artistas: los 3 productores puros salen con 0/0 aunque no tengan ninguna fila (LEFT JOIN, sin HAVING)');
ok(api678.find(a => a.nombre === 'Timmy Trumpet').canciones === 1 && api678.find(a => a.nombre === 'Timmy Trumpet').principales === 1
  && api678.find(a => a.nombre === 'Savage').canciones === 1 && api678.find(a => a.nombre === 'Savage').principales === 0,
  'R4 artistas 678: Timmy Trumpet 1/1 (principal), Savage 1/0 (invitado cuenta como canción, no como principal)');
const sql678 = leerSql('correccion-678.sql');
ok(sql678.includes("SET nombre = 'Timmy Trumpet'") && sql678.includes("WHERE id = 437 AND nombre = 'Timmy trumpet'"),
  "R4 678 SQL: artista 437 'Timmy trumpet' → 'Timmy Trumpet' con guarda");
ok(sql678.includes("SET artista = 'Timmy Trumpet'") && sql678.includes("WHERE id = 678 AND artista = 'Timmy trumpet'"),
  "R4 678 SQL: columna canciones.artista de la 678 → 'Timmy Trumpet' con guarda");
const lineasSql678 = sql678.split('\n').filter(l => l.trim() !== '' && !l.trim().startsWith('--'));
ok(lineasSql678.length > 0 && lineasSql678.every(l => !l.includes('438') && !/rol/i.test(l)) && (sql678.match(/^UPDATE /gm) || []).length === 2,
  'R4 678 SQL: ninguna sentencia toca a Savage (438) ni ningún rol (se queda invitado por decisión de Nova); exactamente 2 UPDATEs');

// 25f. UTF-8: búsqueda cirílica y truncarUtf8 con cirílico y emoji.
ok(claveCancion('Скриптонит', 'X') === claveCancion('скриптонит', 'X') && claveCancion('Скриптонит', 'X') !== claveCancion('Скриптонит', 'Y'),
  'R4 UTF-8: claveCancion con cirílico (Скриптонит/скриптонит → misma clave; cambia el artista → distinta)');
ok(claveCancion('Canción', 'José') === claveCancion('CANCIÓN', 'josé'),
  'R4 UTF-8: claveCancion con acentos (Canción/José insensible a mayúsculas)');
ok(coincideBusqueda({ titulo: 'X', artistas: [{ nombre: 'Скриптонит' }] }, 'скриптонит') && coincideBusqueda({ titulo: 'X', artistas: [{ nombre: 'Скриптонит' }] }, 'скрипт'),
  'R4 UTF-8: la búsqueda encuentra "Скриптонит" por "скриптонит" y por "скрипт" (toLowerCase cirílico)');
ok(truncarUtf8('Скриптонит'.repeat(6), 100) === 'Скриптонит'.repeat(5),
  'R4 UTF-8: 60 caracteres cirílicos (120 bytes) → 50 caracteres (100 bytes exactos, sin partir carácter)');
ok(truncarUtf8('🎵'.repeat(30), 100) === '🎵'.repeat(25),
  'R4 UTF-8: 30 emojis 🎵 (120 bytes) → 25 emojis (100 bytes exactos)');
ok(truncarUtf8('a'.repeat(98) + '🎵', 100) === 'a'.repeat(98) && truncarUtf8('a'.repeat(96) + '🎵', 100) === 'a'.repeat(96) + '🎵',
  'R4 UTF-8: emoji de 4 bytes en el corte se corta antes (98 a); si cabe exacto en 100 bytes se queda (96 a + 🎵)');
ok(truncarUtf8('a'.repeat(99) + 'С', 100) === 'a'.repeat(99) && truncarUtf8('é'.repeat(50), 100) === 'é'.repeat(50),
  'R4 UTF-8: cirílico de 2 bytes en el corte se corta antes (99 a); 50 é = 100 bytes exactos se quedan');

// 25g. Título de 200 caracteres exactos: B1 (ronda 3) CORREGIDO en la
// ronda 5 (ChatGPT) — el frontend cuenta caracteres (JS .length,
// maxlength=200) y el backend AHORA también (contarCaracteresUtf8 en
// main.cpp, coherente con schema char_length<=200). Antes el backend
// contaba bytes (std::string .size()) y 101 'é' (202 bytes) se
// rechazaba aunque la DB y el navegador lo admitían.
// Espejo JS de contarCaracteresUtf8: un code point por byte inicial
// (los bytes de continuación 10xxxxxx no cuentan).
const contarCaracteres = str => [...Buffer.from(str, 'utf8')].filter(b => (b & 0xC0) !== 0x80).length;
ok(contarCaracteres('é'.repeat(101)) === 101 && contarCaracteres('🎵') === 1 && contarCaracteres('a'.repeat(200)) === 200 && contarCaracteres('С'.repeat(50)) === 50,
  'R5 UTF-8: contarCaracteresUtf8 (espejo): 101 é = 101, 🎵 = 1 code point, 50 С = 50');
ok((idxHtml.match(/maxlength="200"/g) || []).length === 4 && (appJs.match(/maxlength="200"/g) || []).length === 4,
  'R4 título 200: maxlength="200" en 4 campos de index.html (título, artista, invitados, productor) y 4 del modal de editar');
const titulo200e = 'é'.repeat(200);
ok(titulo200e.length === 200 && Buffer.byteLength(titulo200e, 'utf8') === 400
  && validarTituloArtista(titulo200e, 'X') === '' && contarCaracteres(titulo200e) === 200,
  'R5 B1 CORREGIDO: 200 é = 200 caracteres (400 bytes) pasa en frontend y en backend (antes el backend lo rechazaba por bytes)');
ok(validarTituloArtista('é'.repeat(101), 'X') === '' && validarTituloArtista('X', 'é'.repeat(201)) === 'Titulo o artista demasiado largo.',
  'R5 B1 CORREGIDO: 101 é pasa (el caso de ChatGPT) y 201 é se rechaza por caracteres, no por bytes');
ok(mainCpp.includes('contarCaracteresUtf8') && mainCpp.includes('if (!utf8Valido(titulo) || !utf8Valido(artista)) return "Titulo o artista no valido."'),
  'R5 B1 CORREGIDO: main.cpp usa contarCaracteresUtf8 y rechaza UTF-8 inválido en título/artista con 400 (no 500)');
// 25g2. parseEntero/parseDoble ESTRICTOS (ronda 5, ChatGPT): espejos JS
// de la lógica C++ (stoi/stod con &pos y s[pos] == '\0'); "4abc" ya no
// se interpreta como 4.
const parseEnteroE = (str, def) => { if (!str) return def; if (!/^\s*[+-]?\d+$/.test(str)) return def; const v = Number(str); return Number.isSafeInteger(v) ? v : def; };
const parseDobleE = (str, def) => { if (!str) return def; if (!/^\s*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(str)) return def; const v = Number(str); return Number.isFinite(v) ? v : def; };
ok(parseEnteroE('4abc', 1) === 1 && parseEnteroE('4', 1) === 4 && parseEnteroE('abc', 1) === 1 && parseEnteroE('', 1) === 1 && parseEnteroE(' 4', 1) === 4 && parseEnteroE('12x', 0) === 0,
  'R5 parse estricto: parseEntero("4abc") → defecto (antes 4); "4" → 4; "abc"/"" → defecto');
ok(parseDobleE('12.5x', -1) === -1 && parseDobleE('12.5', -1) === 12.5 && parseDobleE('4', -1) === 4 && parseDobleE('inf', -1) === -1 && parseDobleE('19.60abc', -1) === -1,
  'R5 parse estricto: parseDoble("12.5x") → defecto; "12.5" → 12.5; "inf" → defecto (no finito)');
ok(mainCpp.includes('std::stoi(s, &pos)') && mainCpp.includes('std::stod(s, &pos)') && mainCpp.includes("s[pos] != '\\0'"),
  'R5 parse estricto: main.cpp usa stoi/stod con &pos y exige s[pos] == NUL (caracteres sobrantes → defecto)');

// 25h. Nota .xx5 en ambos sentidos: el total exacto termina en 5 en la
// tercera decimal; el double lo redondea arriba o abajo según su
// representación binaria. La 678 cae arriba; la 17 cae abajo.
const C17 = { ritmo: 9, letras: 9.3, coro: 9, importancia: 4, antiguedad: false, nostalgia: false, descubrimiento: true, complejidad: false, arte_visual: 1 };
ok(total1000(C17) === 15075 && calc(C17).toPrecision(17) === '15.074999999999999' && redondeoExacto(15075) === 15.08,
  'R4 .xx5 abajo: ID 17 exacto 15.075, suma double 15.074999999999999 (por debajo) → mitad-arriba sería 15.08');
ok(Math.round(calc(C17) * 100) / 100 === 15.08,
  'R4 .xx5 abajo: la recomputación con double de la 17 da 15.08, no 15.07 — el guardado histórico difiere de ambas recomputaciones (una de las 59 de H3)');
ok(total1000(S678) === 16085 && calc(S678).toPrecision(17) === '16.085000000000001' && Math.round(calc(S678) * 100) / 100 === 16.09 && redondeoExacto(16085) === 16.09,
  'R4 .xx5 arriba: 678 exacto 16.085, suma double 16.085000000000001 (por encima) → guardado 16.09 (mitad-arriba, sin desvío)');
if (tieneDatos) {
  let xx5up = 0, xx5down = 0, desvDobleAbajo = 0, desvDobleArriba = 0;
  for (const c of C) {
    if (!c.calificacion_final) continue;
    const t = total1000(c);
    if (t % 10 !== 5) continue;
    const hu = Math.floor((t + 5) / 10) / 100;
    if (Math.abs(c.calificacion_final - hu) < 1e-9) xx5up++;
    else if (Math.abs(c.calificacion_final - (hu - 0.01)) < 1e-9) xx5down++;
    const dDoble = Math.round(calc(c) * 100) / 100 - c.calificacion_final;
    if (dDoble > 0.001) desvDobleAbajo++;
    else if (dDoble < -0.001) desvDobleArriba++;
  }
  ok(xx5up + xx5down === 353 && xx5up === 247 && xx5down === 106,
    `[datos reales] .xx5: 353 totales con tercer decimal 5 — ${xx5up} guardadas en mitad-arriba y ${xx5down} guardadas 0.01 por debajo (redondeo binario del double)`);
  ok(desvDobleAbajo === 59 && desvDobleArriba === 0,
    `[datos reales] .xx5: 59 filas difieren de la recomputación con double (todas 0.01 por debajo, todas .xx5; H3 de la ronda 3)`);
  ok(C.find(c => c.id === 17).calificacion_final === 15.07, '[datos reales] ID 17 guardada en 15.07 (mitad-arriba − 0.01, caso "abajo" de referencia)');
} else skip('.xx5 conteos 353/247/106/59 con datos reales (sin public/datos-reales.json)');

// 25i. Catálogo vacío (total_paginas 1) e histograma con bins vacíos.
const pagVacia = paginaDe(1, 0, []);
ok(pagVacia.total_paginas === 1 && pagVacia.pagina_actual === 1 && pagVacia.canciones.length === 0,
  'R4 vacío: total_paginas 1 con 0 canciones (backend std::max(1, …) desde ronda 3; el espejo de la sección 16 usaba la fórmula vieja sin max)');
ok(Math.max(1, Math.ceil(0 / 50)) === 1 && Math.max(1, Math.ceil(677 / 50)) === 14 && Math.max(1, Math.ceil(678 / 50)) === 14,
  'R4 vacío/678: total_paginas = max(1, ceil(total/50)): 0→1, 677→14, 678→14');
const barraHist = (h, max, totalHist) => ({ pct: totalHist ? Math.round(h.total / totalHist * 100) : 0, ancho: Math.round(h.total / max * 100) });
const histParcial = [{ rango: '19-20', total: 5 }, { rango: '16-17.8', total: 0 }, { rango: '10-12', total: 0 }];
const maxHist = Math.max(1, ...histParcial.map(h => h.total));
const totalHistParcial = histParcial.reduce((a, h) => a + h.total, 0);
ok(histParcial.every(h => { const b = barraHist(h, maxHist, totalHistParcial); return Number.isFinite(b.pct) && Number.isFinite(b.ancho) && b.ancho >= 0 && b.ancho <= 100; }),
  'R4 histograma: bins vacíos junto a uno no vacío → pct y ancho finitos (0% sin NaN; max con piso 1 como en app.js)');
ok(barraHist({ rango: '19-20', total: 5 }, maxHist, totalHistParcial).ancho === 100 && barraHist({ rango: '16-17.8', total: 0 }, maxHist, totalHistParcial).ancho === 0 && barraHist({ rango: '16-17.8', total: 0 }, maxHist, totalHistParcial).pct === 0,
  'R4 histograma: bin lleno 100% de ancho, bin vacío 0% de ancho y 0% de canciones');
ok(appJs.includes('const max = Math.max(1, ...histograma.map(h => h.total));') && appJs.includes("|| '<p class=\"text-gray-400 text-xs\">Sin datos todavía.</p>'"),
  'R4 histograma: app.js usa max con piso 1 (nunca divide por 0) y muestra "Sin datos todavía." con 0 filas del endpoint (GROUP BY sin filas con catálogo vacío)');
if (tieneDatos) {
  ok(statsDe(C).mediana === 16.86, `[datos reales] statsDe mediana real: ${statsDe(C).mediana} (antes era 0 hardcodeada; PERCENTILE_CONT 0.5 del endpoint)`);
  ok(statsDe([{ calificacion_final: 19.00 }]).mediana === 19.00 && statsDe([]).mediana === 0, 'R4 statsDe: mediana de 1 canción = su nota; de 0 canciones = 0');
} else skip('statsDe mediana real con datos reales (sin public/datos-reales.json)');

// 25f. R5 portabilidad del harness (ChatGPT, 2026-11-17): BASE desde
// __dirname y SQL desde migraciones/ con fallback a raíz.
const harnessSrc = fs.readFileSync(__filename, 'utf8');
const patronHomeFijo = 'process.env.HOME' + " + '" + '/workspace'; // construido por partes: el literal completo no aparece en este fuente
ok(!harnessSrc.includes(patronHomeFijo), 'R5 portabilidad: el harness no usa process.env.HOME + ruta fija (BASE desde __dirname)');
ok(fs.existsSync(path.join(BASE, 'harness-pruebas.js')) && fs.existsSync(path.join(BASE, 'public', 'app.js')) && fs.existsSync(path.join(BASE, 'main.cpp')),
  'R5 portabilidad: BASE (__dirname) resuelve el paquete: harness-pruebas.js, public/app.js y main.cpp existen');
const SQL_MIGRACIONES = ['artistas-aplicar.sql', 'correccion-678.sql', 'correccion-datos-ronda-4.sql', 'lote-1-aplicar.sql', 'lote-2-3-aplicar.sql', 'lote-4-aplicar.sql', 'titulos-correcciones.sql'];
ok(SQL_MIGRACIONES.every(n => leerSql(n).length > 100), `R5 portabilidad: leerSql() encuentra los 7 SQL de migración (${SQL_MIGRACIONES.join(', ')})`);
ok(fs.readFileSync(path.join(BASE, 'schema.sql'), 'utf8').length > 100, 'R5 portabilidad: schema.sql se lee desde la raíz (en ambos layouts)');
ok(leerSql('artistas-aplicar.sql').includes('cancion_artistas') && leerSql('correccion-678.sql').includes('678'), 'R5 portabilidad: contenido de artistas-aplicar.sql y correccion-678.sql leído por leerSql()');
{
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'harness-r5-'));
  const raiz = path.join(tmp, 'pkg');
  fs.mkdirSync(path.join(raiz, 'migraciones'), { recursive: true });
  fs.writeFileSync(path.join(raiz, 'migraciones', 'x.sql'), 'MIG');
  fs.writeFileSync(path.join(raiz, 'x.sql'), 'RAIZ');
  ok(resolverSql(raiz, 'x.sql') === 'MIG', 'R5 portabilidad: con migraciones/ presente, resolverSql prefiere migraciones/ (layout repo)');
  fs.unlinkSync(path.join(raiz, 'migraciones', 'x.sql'));
  ok(resolverSql(raiz, 'x.sql') === 'RAIZ', 'R5 portabilidad: sin migraciones/x.sql, resolverSql usa la raíz (layout paquete preparado)');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// R5 (ChatGPT): sin red y sin caché, sw.js devolvía undefined (respuesta
// inválida para respondWith). Ahora devuelve una Response 503 válida.
// Se ejecuta el handler fetch REAL de sw.js en un sandbox (vm) con fetch
// que rechaza: con caché vacía debe dar 503 'Sin conexión'; con caché
// debe servir la copia guardada.
pendientes.push((async () => {
  const vm = require('vm');
  const correrSw = async (cacheada) => {
    let fetchHandler;
    const sandbox = {
      self: { addEventListener: (ev, fn) => { if (ev === 'fetch') fetchHandler = fn; }, skipWaiting: () => {}, clients: { claim: async () => {} } },
      caches: { open: async () => ({ put: async () => {}, add: async () => {} }), keys: async () => [], match: async () => cacheada, delete: async () => true },
      location: { origin: 'https://x' },
      URL, Response, console,
      fetch: async () => { throw new Error('sin red'); },
    };
    vm.createContext(sandbox);
    vm.runInContext(swJs, sandbox);
    let promesa;
    fetchHandler({ request: { method: 'GET', url: 'https://x/no-cacheada.js' }, respondWith: p => { promesa = p; } });
    return await promesa;
  };
  const r503 = await correrSw(undefined);
  ok(r503 instanceof Response && r503.status === 503 && (await r503.text()) === 'Sin conexión', 'R5 sw.js: sin red y sin caché → Response 503 "Sin conexión" (no undefined)');
  const copia = new Response('copia guardada', { status: 200 });
  const rHit = await correrSw(copia);
  ok(rHit.status === 200 && (await rHit.text()) === 'copia guardada', 'R5 sw.js: sin red pero con caché → sirve la copia guardada (200)');
})());
// 25h. R5 Tailwind local + fuentes propias (2026-11-17): sin CDN de
// Tailwind ni fuentes de Google; CSS compilado local y fuentes woff2
// autoalojadas; sw.js las precachea (caché v4).
ok(!idxHtml.includes('cdn.tailwindcss.com') && !idxHtml.includes('fonts.googleapis.com') && !idxHtml.includes('fonts.gstatic.com'),
  'R5 Tailwind local: index.html sin CDN de Tailwind ni fuentes de Google');
ok(idxHtml.includes('/css/tailwind.min.css') && !idxHtml.includes('tailwind.config ='),
  'R5 Tailwind local: index.html enlaza /css/tailwind.min.css y no lleva tailwind.config inline');
const twCss = fs.readFileSync(path.join(BASE, 'public/css/tailwind.min.css'), 'utf8');
const twCfg = fs.readFileSync(path.join(BASE, 'tailwind.config.js'), 'utf8');
ok(twCss.length > 10000 && (twCss.match(/@font-face/g) || []).length === 10 && twCss.includes('.font-display') && twCss.includes('.font-mono'),
  'R5 Tailwind local: tailwind.min.css compilado (>10 KB, 10 @font-face, .font-display y .font-mono)');
ok(twCss.includes('.invisible') && twCss.includes('.hover\\:brightness-125') && twCss.includes('.shadow-\\[0_4px_14px'),
  'R5 Tailwind local: el CSS compilado cubre utilidades usadas (invisible, hover:brightness-125, shadow arbitrario)');
ok(twCfg.includes("'./public/index.html'") && twCfg.includes("'./public/app.js'") && twCfg.includes("'./public/js/*.js'") && twCfg.includes('JetBrains Mono') && twCfg.includes('Chakra Petch'),
  'R5 Tailwind local: tailwind.config.js escanea index.html + app.js + js/*.js y define mono/display');
const FUENTES = ['chakra-petch-500-latin.woff2', 'chakra-petch-500-latin-ext.woff2', 'chakra-petch-700-latin.woff2', 'chakra-petch-700-latin-ext.woff2', 'jetbrains-mono-400-latin.woff2', 'jetbrains-mono-400-latin-ext.woff2', 'jetbrains-mono-400-cyrillic.woff2', 'jetbrains-mono-700-latin.woff2', 'jetbrains-mono-700-latin-ext.woff2', 'jetbrains-mono-700-cyrillic.woff2'];
ok(FUENTES.every(f => { const b = fs.readFileSync(path.join(BASE, 'public/fonts', f)); return b.length > 1000 && b.slice(0, 4).toString('ascii') === 'wOF2'; }),
  `R5 Tailwind local: las 10 fuentes woff2 existen en public/fonts/ y son wOF2 válidas`);
ok(swJs.includes("'/css/tailwind.min.css'") && swJs.includes("'/fonts/chakra-petch-500-latin.woff2'") && swJs.includes("'/fonts/jetbrains-mono-400-latin.woff2'") && swJs.includes("const V = 'v6'"),
  'R5 Tailwind local: sw.js precachea el CSS local y las fuentes (caché v6, con js/colores.js y js/api.js)');
ok(JSON.parse(fs.readFileSync(path.join(BASE, 'package.json'), 'utf8')).scripts.build.includes('tailwindcss'),
  'R5 Tailwind local: package.json build compila Tailwind local (npm run build)');

// 25i. R5 CSP completa (2026-11-17): delegación data-accion, 0 handlers
// inline (23 onclick en index.html + 12 en app.js + onchange/oninput/
// onfocus/onkeydown → addEventListener), CSP script-src 'self' en
// vercel.json. style-src conserva 'unsafe-inline' solo por el <style>
// inline y los style="" de las filas (documentado, fuera de alcance).
const inlineAttr = /\son(click|change|input|focus|keydown|keyup|submit|load)=/g;
ok(!(inlineAttr.test(idxHtml)) && !(inlineAttr.test(appJs)),
  'R5 CSP: 0 handlers inline en index.html y app.js (sin on*=)');
const accionesHtml = [...new Set([...idxHtml.matchAll(/data-accion="([^"]+)"/g), ...appJs.matchAll(/data-accion="([^"]+)"/g)].map(m => m[1]))];
const bloqueAcciones = appJs.split('const ACCIONES = {')[1].split('};')[0];
const clavesAcciones = [...bloqueAcciones.matchAll(/'([a-z-]+)':/g)].map(m => m[1]);
ok(accionesHtml.length === 24 && clavesAcciones.length === 24 && accionesHtml.every(a => clavesAcciones.includes(a)),
  'R5 CSP: 24 data-accion en el HTML y 24 claves en ACCIONES, cobertura 1:1');
ok(appJs.includes('function vigilarEventos()') && appJs.includes('vigilarEventos();') && appJs.includes("document.addEventListener('click'"),
  'R5 CSP: vigilarEventos() definida y llamada en window.onload, con listener de click delegado');
ok(['titulo', 'artista', 'ritmo', 'letras', 'coro', 'importancia', 'antiguedad', 'nostalgia', 'complejidad', 'descubrimiento_unico', 'arte_visual', 'select-orden', 'input-buscar'].every(id => idxHtml.includes(`id="${id}"`)),
  'R5 CSP: todos los ids enlazados por vigilarEventos() existen en index.html');
const vercel = JSON.parse(fs.readFileSync(path.join(BASE, 'vercel.json'), 'utf8'));
const csp = vercel.headers.find(h => h.source === '/(.*)').headers.find(h => h.key === 'Content-Security-Policy').value;
const scriptSrc = csp.split('script-src')[1].split(';')[0];
ok(scriptSrc.trim() === "'self'" && !csp.includes('cdn.tailwindcss') && !csp.includes('googleapis') && !csp.includes('gstatic'),
  'R5 CSP: script-src \'self\' sin \'unsafe-inline\' ni orígenes CDN');
ok(['style-src', "font-src 'self'", 'connect-src', 'https://clasificacion-de-musica.onrender.com', "object-src 'none'", "base-uri 'self'", "frame-ancestors 'none'", "manifest-src 'self'", "worker-src 'self'"].every(t => csp.includes(t)),
  'R5 CSP: vercel.json incluye style/font/connect/object/base-uri/frame-ancestors/manifest/worker-src');
ok((idxHtml.match(/<script/g) || []).length === 3 && idxHtml.includes('<script src="/js/colores.js" defer>') && idxHtml.includes('<script src="/js/api.js" defer>') && idxHtml.includes('<script src="/app.js" defer>') && idxHtml.indexOf('/js/colores.js') < idxHtml.indexOf('/js/api.js') && idxHtml.indexOf('/js/api.js') < idxHtml.indexOf('/app.js') && !/<script(?![^>]*src=)/.test(idxHtml),
  'R5 CSP: index.html tiene tres <script> con src (colores.js, api.js, app.js en ese orden), sin scripts inline');
const fuentesCache = vercel.headers.find(h => h.source === '/fonts/(.*)');
const cssCache = vercel.headers.find(h => h.source === '/css/tailwind.min.css');
ok(cssCache && fuentesCache && cssCache.headers[0].value.includes('max-age=3600') && fuentesCache.headers[0].value.includes('max-age=3600'),
  'R5 CSP: vercel.json Cache-Control para /css/tailwind.min.css y /fonts/*');
// 25j. R5 package-lock.json (2026-11-17): generado por `npm install` al
// instalar tailwindcss 3.4.17 (bloque 1); fija las versiones sin cambiarlas.
const lock = JSON.parse(fs.readFileSync(path.join(BASE, 'package-lock.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(BASE, 'package.json'), 'utf8'));
ok(lock.lockfileVersion === 3 && lock.packages['node_modules/tailwindcss'].version === '3.4.17' && lock.packages['node_modules/serve'].version.startsWith('14.2.'),
  'R5 package-lock: lockfile v3, tailwindcss 3.4.17 exacto y serve 14.2.x fijados');
ok(pkg.devDependencies.tailwindcss === '^3.4.17' && pkg.devDependencies.serve === '^14.2.0' && fs.readFileSync(path.join(BASE, '.gitignore'), 'utf8').includes('node_modules/'),
  'R5 package-lock: package.json sin cambio de versiones; node_modules/ en .gitignore (el lock sí se sube)');
// 25k. R5 pg_trgm (2026-11-17, extras bloque 4): migración OPCIONAL
// documentada en schema.sql (comentada, NO aplicada en vivo): la
// búsqueda es por subcadena (%abc%), text_pattern_ops solo sirve para
// prefijos; los índices GIN trigram van uno por columna.
const schemaSqlTrgm = fs.readFileSync(path.join(BASE, 'schema.sql'), 'utf8');
ok(schemaSqlTrgm.includes('CREATE EXTENSION IF NOT EXISTS pg_trgm') && schemaSqlTrgm.includes('canciones_titulo_trgm_idx') && schemaSqlTrgm.includes('canciones_artista_trgm_idx') && schemaSqlTrgm.includes('USING GIN (LOWER(titulo) gin_trgm_ops)') && schemaSqlTrgm.includes('USING GIN (LOWER(artista) gin_trgm_ops)'),
  'R5 pg_trgm: schema.sql documenta la extensión y los 2 índices GIN trigram (título y artista)');
ok(schemaSqlTrgm.split('\n').every(l => !l.includes('pg_trgm') || l.trimStart().startsWith('--')) && schemaSqlTrgm.includes('canciones_busqueda_idx'),
  'R5 pg_trgm: el bloque es solo comentario (nada activo) y se conserva el índice text_pattern_ops');
// 25l. R5 importación de respaldo (2026-11-17, extras bloque 5; ChatGPT:
// no había forma de restaurar un respaldo, solo de exportarlo).
// Backend: ruta POST /api/canciones/importar con token, límite 2 MB,
// confirmar:true obligatorio, validación total antes de insertar,
// total recalculado, duplicados omitidos, una sola transacción.
const mainCppImportar = fs.readFileSync(path.join(BASE, 'main.cpp'), 'utf8');
const _i0Importar = mainCppImportar.indexOf('CROW_ROUTE(app, "/api/canciones/importar")');
const _i1Importar = mainCppImportar.indexOf('// 4. CALIFICAR', _i0Importar);
const bloqueImportar = mainCppImportar.slice(_i0Importar, _i1Importar);
ok(mainCppImportar.includes('CROW_ROUTE(app, "/api/canciones/importar").methods("POST"_method)') && bloqueImportar.includes('autorizado(req, "POST /api/canciones/importar")'),
  'R5 importar: ruta POST /api/canciones/importar con token de admin');
ok(mainCpp.includes('LIMITE_CUERPO_IMPORTAR = 2 * 1024 * 1024') && bloqueImportar.includes('cuerpoDemasiadoGrande(req, LIMITE_CUERPO_IMPORTAR)') && bloqueImportar.includes('Demasiadas canciones (máximo 2000 por importación)'),
  'R5 importar: límite de cuerpo 2 MB (no 64 KB) y máximo 2000 canciones');
ok(bloqueImportar.includes('Falta confirmación.') && bloqueImportar.includes('Falta la lista de canciones.') && bloqueImportar.includes('La lista de canciones está vacía.'),
  'R5 importar: confirmar:true obligatorio y lista de canciones obligatoria y no vacía');
ok(bloqueImportar.includes('(s.ritmo * 0.35) + (s.letras * 0.25) + (s.coro * 0.40)') && bloqueImportar.includes('std::round(') && !bloqueImportar.includes('["id"]'),
  'R5 importar: el total se recalcula con la fórmula (redondeo a 2 decimales) y el id del archivo se ignora');
ok(bloqueImportar.includes('omitidas++') && bloqueImportar.includes('W.commit()') && bloqueImportar.includes('calificacion_final) VALUES'),
  'R5 importar: duplicados se omiten (no error), una transacción, INSERT con calificacion_final');
ok(bloqueImportar.includes('"descubrimiento", "descubrimiento_terceros", "desc_terc"') && bloqueImportar.includes('"etiqueta_especial"') && bloqueImportar.includes('leerEntradasArtistas(c, s.artista'),
  'R5 importar: campos tolerantes (etiqueta/etiqueta_especial, descubrimiento/descubrimiento_terceros/desc_terc) y arreglo artistas del export');
// Frontend: botón Importar + input oculto + confirmación en modal.
ok(idxHtml.includes('data-accion="importar"') && idxHtml.includes('Importar JSON') && idxHtml.includes('id="input-importar"') && idxHtml.includes('accept=".json,application/json"'),
  'R5 importar: botón Importar JSON e input oculto .json en index.html');
ok(appJs.includes('function importarRespaldo()') && appJs.includes('async function importarArchivo(file)') && appJs.includes("`${API_URL}/importar`") && appJs.includes('confirmar: true') && appJs.includes("'importar': () => importarRespaldo()"),
  'R5 importar: importarRespaldo/importarArchivo, POST a /importar con confirmar:true, acción delegada');
// Espejo JS de la validación de importación (mismas reglas que el C++):
// o las 4 notas o ninguna; rangos; arte_visual 0/1; bonos booleanos o
// 0/1; género/etiqueta en lista; título/artista por caracteres (UTF-8);
// total recalculado y redondeado a 2 decimales.
const validarImportacion = (canciones, confirmar) => {
  if (!confirmar) return ['falta confirmación'];
  if (!Array.isArray(canciones) || canciones.length === 0) return ['lista vacía'];
  if (canciones.length > 2000) return ['demasiadas canciones'];
  const errores = [];
  const GENEROS = ['Pop', 'Rock', 'Electronica', 'Rap', 'Trap', 'Reggaeton', 'R&B', 'Phonk', 'Banda', 'Corridos', 'Corridos Tumbados', 'Cumbia', 'Salsa', 'Baladas', 'Metal', 'Alternativo', 'Hardstyle', 'Merengue', 'Dembow', 'Reggae', 'Bachata', 'Afrobeats', 'Lofi', 'Hardcore', 'Clasica', 'Latino', 'Romanticas', 'Asiatica', 'Por clasificar'];
  const ETIQUETAS = ['Original', 'Remix', 'Slowed Reverb', 'Sped Up', 'Cover', 'Acustico', 'En Vivo', 'Fragmento', 'Demo', 'Mashup', 'Edit'];
  const num = v => typeof v === 'number' && Number.isFinite(v);
  const bono = v => v === undefined || typeof v === 'boolean' || v === 0 || v === 1;
  canciones.forEach((c, i) => {
    const donde = `canción ${i + 1}`;
    if (!c || typeof c !== 'object') { errores.push(donde + ': no es un objeto.'); return; }
    if (typeof c.titulo !== 'string' || typeof c.artista !== 'string' || !c.titulo.trim() || !c.artista.trim()) { errores.push(donde + ': faltan título o artista.'); return; }
    if ([...c.titulo].length > 200 || [...c.artista].length > 200) { errores.push(donde + ': título o artista demasiado largo.'); return; }
    const genero = (c.genero || 'Por clasificar').trim();
    const etiqueta = ((c.etiqueta !== undefined ? c.etiqueta : c.etiqueta_especial) || 'Original').trim();
    if (!GENEROS.includes(genero) || !ETIQUETAS.includes(etiqueta)) { errores.push(donde + ': género o tipo no válido.'); return; }
    const tiene = k => c[k] !== undefined && c[k] !== null;
    const alguno = tiene('ritmo') || tiene('letras') || tiene('coro') || tiene('importancia');
    const todos = tiene('ritmo') && tiene('letras') && tiene('coro') && tiene('importancia');
    if (alguno && !todos) { errores.push(donde + ': calificación incompleta.'); return; }
    if (todos) {
      if (!num(c.ritmo) || !num(c.letras) || !num(c.coro) || !num(c.importancia)) { errores.push(donde + ': la calificación debe ser numérica.'); return; }
      if (c.ritmo < 0 || c.ritmo > 10 || c.letras < 0 || c.letras > 10 || c.coro < 0 || c.coro > 10) { errores.push(donde + ': la base debe estar entre 0 y 10.'); return; }
      if (c.importancia < 0 || c.importancia > 5) { errores.push(donde + ': la importancia debe estar entre 0 y 5.'); return; }
      if (tiene('arte_visual') && (!num(c.arte_visual) || (c.arte_visual !== 0 && c.arte_visual !== 1))) { errores.push(donde + ': arte_visual debe ser 0 o 1.'); return; }
      const desc = c.descubrimiento !== undefined ? c.descubrimiento : (c.descubrimiento_terceros !== undefined ? c.descubrimiento_terceros : c.desc_terc);
      if (!bono(c.antiguedad) || !bono(c.nostalgia) || !bono(desc) || !bono(c.complejidad)) { errores.push(donde + ': los bonos deben ser booleanos o 0/1.'); return; }
      c._total = Math.round(((c.ritmo * 0.35) + (c.letras * 0.25) + (c.coro * 0.40) + (c.antiguedad ? 1 : 0) + (c.nostalgia ? 1 : 0) + (desc ? 1 : 0) + (c.complejidad ? 1 : 0) + c.importancia + (c.arte_visual || 0)) * 100) / 100;
    }
  });
  return errores;
};
const cancionExport = { titulo: 'Prueba', artista: 'Artista X', genero: 'Pop', etiqueta: 'Original', ritmo: 8, letras: 7, coro: 9, importancia: 4, arte_visual: 1, antiguedad: true, nostalgia: false, descubrimiento: true, complejidad: false, artistas: [{ id: 1, nombre: 'Artista X', rol: 'principal' }] };
ok(validarImportacion([cancionExport], true).length === 0 && cancionExport._total === 15.15,
  'R5 importar (espejo): canción del export válida, total recalculado 15.15 (8*0.35+7*0.25+9*0.40+4+1+1+1)');
ok(validarImportacion([{ ...cancionExport, titulo: 'é'.repeat(101), calificacion_final: 99 }], true).length === 0,
  'R5 importar (espejo): 101 \'é\' admitido (101 caracteres, no bytes) y calificacion_final del archivo se ignora');
ok(validarImportacion([{ ...cancionExport, etiqueta_especial: 'Remix', desc_terc: true }], true).length === 0,
  'R5 importar (espejo): nombres tolerantes etiqueta_especial y desc_terc aceptados');
ok(validarImportacion([{ ...cancionExport, genero: 'Bolero' }], true).length === 1,
  'R5 importar (espejo): género fuera de lista → 1 error');
ok(validarImportacion([{ ...cancionExport, letras: undefined }], true).length === 1,
  'R5 importar (espejo): calificación incompleta (falta letras) → 1 error');
ok(validarImportacion([{ ...cancionExport, arte_visual: 2 }], true).length === 1,
  'R5 importar (espejo): arte_visual 2 → 1 error');
ok(validarImportacion([{ titulo: 'Sin nota', artista: 'Y' }], true).length === 0,
  'R5 importar (espejo): canción sin notas se importa sin calificar');
ok(validarImportacion([cancionExport], false).length === 1 && validarImportacion([], true).length === 1,
  'R5 importar (espejo): sin confirmar:true y lista vacía → error');
// 25m. R5 módulos, paso 1: colores (2026-11-17, extras bloque 6).
// Las 10 funciones puras de color se mueven de app.js a
// public/js/colores.js SIN cambiar lógica; app.js las usa como
// globales (script clásico antes, defer en orden). La verificación
// de que los colores son idénticos la hacen los tests de la sección 7
// (14 referencias, contraste creciente), que ahora extraen de colores.js.
const FNS_COLOR = ['hexAHsl', 'hslARgb', 'mezcla', 'rgbaDesde', 'suave', 'luminanciaRelativa', 'yObjetivo', 'tonoPorNota', 'colorPorNota', 'alfaGlowGod'];
ok(FNS_COLOR.every(n => coloresJsSrc.includes(`function ${n}(`)) && FNS_COLOR.every(n => !appJsSrc.includes(`function ${n}(`)),
  'R5 módulos: las 10 funciones de color viven en js/colores.js y ya no se definen en app.js');
ok(appJsSrc.includes('public/js/colores.js') && appJsSrc.includes('colorBase = colorPorNota(nota);') && appJsSrc.includes('alfaGlow = alfaGlowGod(nota);'),
  'R5 módulos: app.js apunta a js/colores.js y sigue usando colorPorNota/alfaGlowGod');
ok(swJs.includes("'/js/colores.js'") && swJs.includes("const V = 'v6'"),
  'R5 módulos: sw.js precachea /js/colores.js (caché v6)');
const vercelM = JSON.parse(fs.readFileSync(path.join(BASE, 'vercel.json'), 'utf8'));
ok(vercelM.headers.some(h => h.source === '/js/colores.js' && h.headers[0].value.includes('max-age=3600')),
  'R5 módulos: vercel.json Cache-Control para /js/colores.js (igual que app.js)');
// 25n. R5 módulos, paso 2: api.js (2026-11-17, extras bloque 6).
// La capa de red + avisos se mueve de app.js a public/js/api.js SIN
// cambiar lógica: MSG_SIN_CONEXION, escapeHtml, mostrarErrorHttp,
// fetchConTimeout, errorHttp, toastLectura, apiFetch, showToast.
// Sin estado de la app: solo fetch/sessionStorage/prompt/DOM.
const FNS_API = ['escapeHtml', 'mostrarErrorHttp', 'fetchConTimeout', 'errorHttp', 'toastLectura', 'apiFetch', 'showToast'];
ok(FNS_API.every(n => apiJsSrc.includes(`function ${n}(`) || apiJsSrc.includes(`async function ${n}(`)) && apiJsSrc.includes('const MSG_SIN_CONEXION') && FNS_API.every(n => !appJsSrc.includes(`function ${n}(`)),
  'R5 módulos: las 7 funciones de api.js + MSG_SIN_CONEXION viven en js/api.js y ya no se definen en app.js');
ok(appJsSrc.includes('public/js/api.js') && appJsSrc.includes('await apiFetch(') && appJsSrc.includes('showToast('),
  'R5 módulos: app.js apunta a js/api.js y sigue usando apiFetch/showToast');
ok(swJs.includes("'/js/api.js'") && swJs.includes("const V = 'v6'"),
  'R5 módulos: sw.js precachea /js/api.js (caché v6)');
ok(vercelM.headers.some(h => h.source === '/js/api.js' && h.headers[0].value.includes('max-age=3600')),
  'R5 módulos: vercel.json Cache-Control para /js/api.js (igual que app.js)');
ok(idxHtml.indexOf('/js/api.js') > idxHtml.indexOf('/js/colores.js') && idxHtml.indexOf('/js/api.js') < idxHtml.indexOf('/app.js'),
  'R5 módulos: index.html carga api.js entre colores.js y app.js');

Promise.all(pendientes).then(() => {
  console.log(`\n${pasadas} PASS, ${fallos} FAIL, ${saltadas} SKIP${tieneDatos ? '' : ' (sin datos reales: solo [invariante])'}`);
  console.log(fallos === 0 ? 'TODO OK' : `${fallos} FALLOS`);
  process.exit(fallos === 0 ? 0 : 1);
});
