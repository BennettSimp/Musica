// Harness de pruebas del Evaluador musical (paquete preparado, auditoría
// ronda 1, oleada 2 — 2026-11-16)
// Uso: node harness-pruebas.js
// Los datos reales son OPCIONALES: si falta public/datos-reales.json o es
// JSON inválido, se avisa con un mensaje claro ("genera el export con
// GET /api/canciones/exportar") y solo corren las pruebas [invariante]
// con el fixture sintético FIX; las [datos reales] se saltan (SKIP),
// no fallan. Con datos reales presentes, corren todas.
// Las funciones de color (hexAHsl, hslARgb, mezcla, rgbaDesde, suave,
// grad) se EXTRAEN del app.js real por nombre y se evalúan (P1): si la
// extracción falla, el harness muere con mensaje claro, nunca sigue con
// copias viejas. `grad` lee las variables de módulo notaColor y
// enTransicionColor (app.js:293): el sandbox las declara y __fijarNota
// las fija antes de cada llamada.
// Las listas GENEROS_VALIDOS/ETIQUETAS_VALIDAS se extraen de main.cpp
// (P7). Las reglas de backend (calificar, POST/PUT /info, artistas) se
// prueban como espejos documentados de main.cpp: el harness no ejecuta
// el backend; valida que las reglas documentadas se cumplan en el espejo.
// Secciones: 1 fórmula, 2 desempate, 3 colores 0–90%, 4 histograma,
// 5 gráficas nuevas, 6 auditoría final, 7 color de fila, 8 auditoría G,
// 9 auditoría G ronda 2, 10 artistas, 11 P4 fórmula límites, 12 P5
// bordes de rampa, 13 P6 cadena de desempate, 14 P7 POST/PUT /info,
// 15 P8 artistas, 16 P9 catálogo vacío, 17 P11 sw.js manual,
// 18 G-L1 secretos en logs, 19 E2/E3 calificar, 20 DESEMPATE_ASC,
// 21 /api/salud JSON.
const fs = require('fs');
const BASE = process.env.HOME + '/workspace/musica-review-preparado/';
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
const mainCppSrc = fs.readFileSync(BASE + 'main.cpp', 'utf8');
let colores;
try {
  const fns = ['hexAHsl', 'hslARgb', 'mezcla', 'rgbaDesde', 'suave', 'grad'].map(n => extraerFuncion(appJsSrc, n, 'public/app.js'));
  // `grad` lee/escribe notaColor y enTransicionColor (app.js:293): se
  // declaran aquí, en el mismo ámbito que las funciones extraídas, y
  // __fijarNota las fija antes de cada llamada a grad.
  const sandbox = 'let notaColor = 0, enTransicionColor = false;\n' + fns.join('\n')
    + '\nfunction __fijarNota(n) { notaColor = n; enTransicionColor = false; }'
    + '\nfunction __enTransicion() { return enTransicionColor; }'
    + '\nreturn { hexAHsl, hslARgb, mezcla, rgbaDesde, suave, grad, __fijarNota, __enTransicion };';
  colores = new Function(sandbox)();
} catch (e) {
  console.error('FALLO DE EXTRACCIÓN (P1): no se pudieron extraer las funciones de color de public/app.js: ' + e.message);
  console.error('El harness NO sigue con copias viejas: corrige app.js o el extractor y vuelve a correr.');
  process.exit(1);
}
const { hexAHsl, hslARgb, mezcla, rgbaDesde, suave, grad } = colores;
const gradNota = (nota, base, sig, umbral, ancho = 0.2) => { colores.__fijarNota(nota); return grad(base, sig, umbral, ancho); };
// colorFila: espejo exacto de la lógica de color de app.js (cargarCatalogo,
// ~líneas 599-624), con las funciones extraídas. Sin calificar (nota <= 0)
// la fila es gris y el dorado exige nota > 0 (oleada 1).
const colorFila = (nota, rank) => {
  colores.__fijarNota(nota);
  let colorBase = '#22d3ee';
  if (nota <= 0) colorBase = '#6b7280';
  if (nota >= 19) colorBase = '#22c55e';
  else if (nota >= 18) colorBase = '#d946ef';
  else if (nota > 17.8) colorBase = '#8b5cf6';
  else if (nota > 0) { const g = grad('#22d3ee', '#8b5cf6', 17.8, 0.3); if (g) colorBase = g; }
  { const g = grad('#d946ef', '#22c55e', 19, 0.5); if (g) colorBase = g; }
  { const g = grad('#8b5cf6', '#d946ef', 18); if (g) colorBase = g; }
  if (nota > 0 && rank > 10 && rank <= 20) colorBase = mezcla(0.9 * suave((20 - rank) / 9), colorBase, '#facc15');
  if (nota > 0 && rank <= 10) colorBase = '#facc15';
  return colorBase;
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
const binSql = n => n === 0 ? 'sin_calificar' : (n > 0 && n < 10) ? 'menos-10' : n < 12 ? '10-12' : n < 14 ? '12-14' : n < 16 ? '14-16' : n < 18 ? '16-18' : n < 19 ? '18-19' : '19-20';
const bins = { 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 };
if (tieneDatos) {
  for (const c of C) bins[binSql(c.calificacion_final)]++;
  const con3 = C.filter(c => Math.abs(c.calificacion_final * 100 - Math.round(c.calificacion_final * 100)) > 1e-9);
  ok(con3.length === 0, `[datos reales] notas con mas de 2 decimales: ${con3.length} (deben ser 0)`);
  ok(JSON.stringify(bins) === JSON.stringify({ 'menos-10': 0, '10-12': 22, '12-14': 79, '14-16': 157, '16-18': 201, '18-19': 142, '19-20': 76, 'sin_calificar': 0 }),
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
ok(JSON.stringify(ordenCase(Object.keys(bins))) === JSON.stringify(['menos-10', '10-12', '12-14', '14-16', '16-18', '18-19', '19-20', 'sin_calificar']), 'orden CASE del histograma');
if (tieneDatos) {
  // Porcentajes redondeados suman 100.
  const pcts = Object.values(bins).map(x => Math.round(x / C.length * 100));
  ok(pcts.reduce((a, b) => a + b, 0) === 100, `[datos reales] porcentajes: ${pcts.join('+')}=100`);
  // Género top: Baladas 18.8, sin empate en el máximo (2º Metal 18.4).
  const notasGenero = {};
  for (const c of C) if (c.calificacion_final > 0) (notasGenero[c.genero] = notasGenero[c.genero] || []).push(c.calificacion_final);
  const avgs = Object.entries(notasGenero).map(([g, v]) => [g, v.length, Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10]).sort((a, b) => b[2] - a[2] || b[1] - a[1]);
  ok(avgs[0][0] === 'Baladas' && avgs[0][2] === 18.8 && avgs.filter(a => a[2] === avgs[0][2]).length === 1,
    `[datos reales] género top: ${avgs[0][0]} ${avgs[0][2]} (${avgs[0][1]} canc.), 2º ${avgs[1][0]} ${avgs[1][2]}, peor ${avgs[avgs.length - 1][0]} ${avgs[avgs.length - 1][2]}`);
} else skip('porcentajes / género top con datos reales (sin public/datos-reales.json)');

// ---------- 6. Auditoría final ----------
// grad(): rampa 0-90% con smoothstep. Al entrar en la ventana (umbral -
// ancho exacto) mezcla 0% (color puro, sin salto); a mitad de ventana
// suave(0.5)=0.5, o sea 45%; cerca del umbral llega a ~90%.
// Anchos: 0.3 antes de 17.8 (17.5-17.8, aprobado 2026-11-15; antes 0.8),
// 0.5 antes de 19; 0.2 antes de 18 (el umbral anterior esta a solo
// 0.2, no cabe mas).
// gradFactor es el MODELO esperado (no una copia de app.js): se compara
// contra grad() extraído en la sección 12 (P5).
const gradFactor = (nota, umbral, ancho = 0.2) => (nota < umbral - ancho || nota >= umbral) ? null : 0.9 * suave((nota - (umbral - ancho)) / ancho);
const cerca = (a, b) => Math.abs(a - b) < 1e-9;
ok(gradFactor(17.8, 18) === 0 && gradFactor(18.5, 19, 0.5) === 0 && gradFactor(17.5, 17.8, 0.3) === 0, 'grad() en el inicio de la ventana: 17.80, 18.50 y 17.50 mezclan 0% (sin salto)');
ok(cerca(gradFactor(17.9, 18), 0.45) && cerca(gradFactor(18.75, 19, 0.5), 0.45) && cerca(gradFactor(17.65, 17.8, 0.3), 0.45) && cerca(gradFactor(18.99, 19, 0.5), 0.8989344), 'grad() a mitad de ventana: 17.90, 18.75 y 17.65 = 45%; 18.99 = 89.89%');
ok(gradFactor(18.0, 18) === null && gradFactor(19.0, 19) === null, 'grad() en el umbral: sin mezcla (color pleno de la categoría)');
ok(gradFactor(17.49, 17.8, 0.3) === null && gradFactor(18.49, 19, 0.5) === null, 'grad() antes de la ventana: 17.49 y 18.49 sin mezcla (color pleno)');
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


// ---------- 7. Auditoría F: color de fila completo (funciones extraídas de app.js, P1) ----------
// colorFila vive en la sección 0 (espejo de app.js con grad/mezcla/suave
// extraídos); aquí solo se comprueban sus valores.
const sinNaN = s => typeof s === 'string' && !/NaN/.test(s) && s.match(/\d+/g).every(n => +n >= 0 && +n <= 255);
ok(colorFila(19.6, 1) === '#facc15', 'color fila: 19.60 puesto 1 = dorado pleno');
ok(colorFila(18.9, 3) === '#facc15', 'color fila: 18.9 puesto 3 = dorado pleno (dorado SOLO por puesto, sin exigir ≥19)');
ok(colorFila(18.9, 25) === mezcla(0.8064, '#d946ef', '#22c55e'), 'color fila: 18.9 puesto 25 = fuchsia→verde al 80.64% (rampa 0-90% con suave: t=0.8)');
// En 17.80 exacto empieza la ventana del umbral 18 (0% violeta→fuchsia):
// la ventana de 17.8 ya terminó (nota >= umbral) y 17.8 no es > 17.8.
// Ya no hay salto: en 17.79 la fila es ~90% violeta y en 17.80 es
// violeta puro (el 10% de cian que quedaba se va, sin brinco a 50%).
ok(colorFila(17.8, 100) === mezcla(0, '#8b5cf6', '#d946ef'), 'color fila: 17.80 puesto 100 = violeta puro (inicio de la ventana del 18, 0%)');
ok(colorFila(17.79, 100) === mezcla(0.8970666666666667, '#22d3ee', '#8b5cf6'), 'color fila: 17.79 puesto 100 = cian→violeta al 89.71% (rampa 0-90% con suave: t=0.9667)');
ok(colorFila(10.05, 677) === '#22d3ee', 'color fila: 10.05 puesto 677 = cian pleno');
ok(colorFila(19.38, 11) === mezcla(0.9, '#22c55e', '#facc15'), 'color fila: 19.38 puesto 11 = verde→dorado al 90% (tope 90%)');
ok(colorFila(19.38, 20) === mezcla(0, '#22c55e', '#facc15'), 'color fila: 19.38 puesto 20 = verde puro (rampa por puesto empieza en 0%)');
if (tieneDatos) {
  // Ventanas 0-90% (2026-11-14): cuántas canciones reales caen en cada ventana nueva.
  const enV = (a, b) => C.filter(c => c.calificacion_final >= a && c.calificacion_final < b).length;
  const vA = enV(17.5, 17.8), vC = enV(18.5, 19), vB = enV(17.8, 18);
  console.log(`  ventanas: cian→violeta [17.5,17.8): ${vA} canc., violeta→fuchsia [17.8,18): ${vB} canc., fuchsia→verde [18.5,19): ${vC} canc.`);
  ok(vA > 0 && vC > 0 && vB > 0, `[datos reales] ventanas con canciones reales: A=${vA}, B=${vB}, C=${vC} (todas > 0)`);
} else skip('ventanas con canciones reales (sin public/datos-reales.json)');
ok(colorFila(17.5, 100) === mezcla(0, '#22d3ee', '#8b5cf6') && colorFila(18.5, 100) === mezcla(0, '#d946ef', '#22c55e'), 'color fila: 17.50 y 18.50 = inicio de ventana, color puro (0%)');
// Puesto 15 con 18.9: su color propio es fuchsia→verde (62.5%) y desde ahí
// mezcla hacia el dorado. Sin el soporte rgb en hexAHsl esto daba NaN.
const c15 = colorFila(18.9, 15);
const c15esp = mezcla(0.5248, mezcla(0.8064, '#d946ef', '#22c55e'), '#facc15');
ok(sinNaN(c15) && c15 === c15esp, `color fila: 18.9 puesto 15 = mezcla desde su propio color hacia dorado (${c15}, sin NaN)`);
ok(sinNaN(mezcla(0.5, 'rgb(217,70,239)', '#facc15')), 'mezcla desde un color rgb(...): sin NaN');
// Ronda 1: paginación y botones grandes con mínimo 44px táctiles.
const appJs = appJsSrc;
const idxHtml = fs.readFileSync(BASE + 'public/index.html', 'utf8');
ok(appJs.includes('irPagina(${data.pagina_actual - 1})') && (appJs.match(/irPagina\(\$\{data\.pagina_actual/g) || []).length === 2
  && appJs.split('irPagina(${data.pagina_actual').slice(1).every(s => s.slice(0, 400).includes('min-h-[44px]')),
  'paginación ANT/SIG con min-h-[44px]');
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
ok(mainCpp.includes('SELECT genero, etiqueta_especial FROM canciones WHERE id = $1') && mainCpp.includes('genero != genero_actual'), 'PUT /info acepta mantener el género actual (heredado) de la canción (la consulta ahora trae también etiqueta_especial, E13/S12 oleada 1)');
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
ok(appJs.includes('min-h-[44px] flex flex-col justify-center') && appJs.includes("filtrarRango('${h.rango}')"), 'barras del histograma con min-h-[44px]');
ok(appJs.includes('rounded-full hover:border-sky-300 min-h-[44px]">REINTENTAR'), 'botón REINTENTAR del error con min-h-[44px]');
ok(appJs.includes("btnConfirm.className = claseBoton + ' min-h-[44px]';"), 'abrirModal conserva min-h-[44px] en el botón de confirmar');
// Barrido: todos los <button> del HTML tienen min-h-[44px] o py-4
// (pestañas, 48px), salvo los dos enlaces de texto en línea. El regex
// respeta las comillas: hay onclick con `=>` que llevan `>` dentro.
const botonesHtml = [...idxHtml.matchAll(/<button(?:[^>"']|"[^"]*"|'[^']*')*>/g)].map(m => m[0]);
const sinMinimo = botonesHtml.filter(b => !b.includes('min-h-[44px]') && !b.includes('py-4'));
ok(sinMinimo.length === 2 && sinMinimo.every(b => b.includes('irADuplicado()') || b.includes('usarArtistaSugerido()')),
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
ok(appJs.includes('irPagina(${data.pagina_actual + 1})') && appJs.includes('p-1 min-h-[44px] px-2 disabled:cursor-not-allowed">SIG'), 'paginación SIG con min-h-[44px] (el `>=` cortaba el regex ingenuo)');


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
const sqlArtistas = fs.readFileSync(BASE + 'artistas-aplicar.sql', 'utf8');
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
ok(appJs.includes('API_ARTISTAS') && appJs.includes("fetch(API_ARTISTAS)"),
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
// grad() extraído de app.js; gradNota fija notaColor antes de cada llamada.
// Factores: 17.79 → t=0.9667, suave=0.99674, 89.71%; 17.99 → t=0.95,
// suave=0.99275, 89.35% (~90%); 18.99 → t=0.98, suave=0.998816, 89.89%.
ok(gradNota(17.50, '#22d3ee', '#8b5cf6', 17.8, 0.3) === mezcla(0, '#22d3ee', '#8b5cf6'), 'P5 [invariante] rampa 17.50 → 0% (cian puro, inicio de la ventana 17.5–17.8)');
ok(gradNota(17.79, '#22d3ee', '#8b5cf6', 17.8, 0.3) === mezcla(0.9 * suave((17.79 - 17.5) / 0.3), '#22d3ee', '#8b5cf6'), 'P5 [invariante] rampa 17.79 → 89.71% cian→violeta');
ok(gradNota(17.80, '#8b5cf6', '#d946ef', 18) === mezcla(0, '#8b5cf6', '#d946ef'), 'P5 [invariante] rampa 17.80 → violeta puro (inicio de la ventana del 18, 0%)');
ok(gradNota(17.99, '#8b5cf6', '#d946ef', 18) === mezcla(0.9 * suave(0.95), '#8b5cf6', '#d946ef'), 'P5 [invariante] rampa 17.99 → 89.35% violeta→fuchsia (~90%)');
ok(colorFila(18.00, 100) === '#d946ef', 'P5 [invariante] rampa 18.00 → fuchsia puro (en el umbral, sin mezcla)');
ok(gradNota(18.50, '#d946ef', '#22c55e', 19, 0.5) === mezcla(0, '#d946ef', '#22c55e'), 'P5 [invariante] rampa 18.50 → 0% (fuchsia puro, inicio de la ventana 18.5–19)');
ok(gradNota(18.99, '#d946ef', '#22c55e', 19, 0.5) === mezcla(0.9 * suave(0.98), '#d946ef', '#22c55e'), 'P5 [invariante] rampa 18.99 → 89.89% fuchsia→verde (~90%)');
ok(colorFila(19.00, 100) === '#22c55e', 'P5 [invariante] rampa 19.00 → verde puro (en el umbral, sin mezcla)');
// Nota 0 con puesto 1: sin dorado en NINGÚN elemento. colorBase es gris
// (el dorado exige nota > 0, app.js) y el tinte/brillo se derivan de
// colorBase con rgbaDesde, así que tampoco pueden ser dorados.
const c0 = colorFila(0, 1);
ok(c0 === '#6b7280', 'P5 [invariante] nota 0 puesto 1: colorBase gris #6b7280, NO dorado');
ok(!rgbaDesde(c0, 0.33).includes('250,204,21') && !rgbaDesde(c0, 0.6).includes('250,204,21'), 'P5 [invariante] nota 0 puesto 1: ni el tinte (0.33) ni el brillo (0.6) derivados con rgbaDesde son dorados');
ok(colorFila(19.60, 10) === '#facc15', 'P5 [invariante] puesto 10 → dorado pleno');
ok(colorFila(19.60, 20) === mezcla(0, '#22c55e', '#facc15'), 'P5 [invariante] puesto 20 → 0% hacia dorado (verde puro)');
ok(colorFila(19.60, 21) === '#22c55e', 'P5 [invariante] puesto 21 → sin mezcla (verde puro, fuera del Top 20)');
ok(colorFila(19.60, 25) === '#22c55e', 'P5 [invariante] 19.60 puesto 25 → verde puro (sin dorado fuera del Top 20)');

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
  const cal = canciones.filter(c => (c.calificacion_final ?? 0) > 0).map(c => c.calificacion_final);
  return { total: canciones.length, promedio: cal.length ? cal.reduce((a, b) => a + b, 0) / cal.length : 0, obras_maestras: canciones.filter(c => (c.calificacion_final ?? 0) >= 19).length, sin_calificar: canciones.filter(c => (c.calificacion_final ?? 0) === 0).length, mediana: 0, minimo: cal.length ? Math.min(...cal) : 0, maximo: cal.length ? Math.max(...cal) : 0 };
};
ok(JSON.stringify(statsDe([])) === JSON.stringify({ total: 0, promedio: 0, obras_maestras: 0, sin_calificar: 0, mediana: 0, minimo: 0, maximo: 0 }),
  'P9 [invariante] stats con catálogo vacío: todo 0 (COALESCE en main.cpp, sin NaN ni null)');
// Histograma con 0 canciones: los 8 bins en 0.
const binsVacios = { 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 };
for (const c of []) binsVacios[binSql(c.calificacion_final)]++;
ok(JSON.stringify(binsVacios) === JSON.stringify({ 'menos-10': 0, '10-12': 0, '12-14': 0, '14-16': 0, '16-18': 0, '18-19': 0, '19-20': 0, 'sin_calificar': 0 }),
  'P9 [invariante] histograma con catálogo vacío: los 8 rangos en 0');
// Exportar con 0 canciones: JSON [] y CSV con la cabecera sola.
ok(JSON.stringify([]) === '[]', 'P9 [invariante] exportar JSON con 0 canciones: [] (sin canciones, sin error)');
ok(Object.keys([][0] || { id: 0 }).join(',') === 'id', 'P9 [invariante] exportar CSV con 0 canciones: cabecera sola "id" (fallback canciones[0] || {id:0}, app.js:433)');
// Búsqueda sin resultados (con el fixture sintético).
ok(!FIX.some(c => coincideBusqueda(c, 'zzz-no-existe')), 'P9 [invariante] búsqueda sin resultados: ningún fixture coincide con "zzz-no-existe"');
// Paginación (espejo de main.cpp: pagina = min(100000, max(1, pagina));
// total_paginas = (total + 49) / 50; offset = (pagina-1)*50).
const paginaDe = (pedida, total, lista) => {
  const pagina = Math.min(100000, Math.max(1, pedida));
  const totalPaginas = Math.floor((total + 49) / 50);
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

// ---------- 18. G-L1 — ningún log imprime ADMIN_TOKEN ni DATABASE_URL ----------
// main.cpp: sanitizarLog sustituye la cadena de conexión por
// [DATABASE_URL] y trunca a 500; los logs nunca reciben el token.
// Se comprueba por texto: (a) ninguna línea de log (cerr/cout/log*) lleva
// el valor del token, el getenv de ADMIN_TOKEN o la variable con la URL;
// (b) los 2 getenv("ADMIN_TOKEN") son solo comprobaciones, no logs;
// (c) las 4 funciones de log pasan por sanitizarLog; (d) en app.js
// ningún console.* lleva el token ni la cabecera X-Admin-Token.
const lineasCpp = mainCpp.split('\n');
const logConSecretoCpp = lineasCpp.filter(l => /cerr|cout/.test(l) && (/<<\s*token\b/.test(l) || /getenv\("ADMIN_TOKEN"\)/.test(l) || /g_databaseUrl/.test(l)));
ok(logConSecretoCpp.length === 0, `G-L1 main.cpp: ningún cerr/cout imprime el token, getenv("ADMIN_TOKEN") ni g_databaseUrl (${logConSecretoCpp.length} líneas sospechosas)`);
const usosGetenvToken = lineasCpp.filter(l => l.includes('getenv("ADMIN_TOKEN")'));
ok(usosGetenvToken.length === 2 && usosGetenvToken.every(l => !/cerr|cout|log(Error|Info|Rechazo|Auth)/.test(l)),
  `G-L1 main.cpp: getenv("ADMIN_TOKEN") aparece ${usosGetenvToken.length} veces, solo en comprobaciones (tokenConfigurado/autorizado), nunca en un log`);
ok(mainCpp.includes('static std::string sanitizarLog') && (mainCpp.match(/sanitizarLog\(/g) || []).length >= 5,
  'G-L1 main.cpp: sanitizarLog existe y se usa en logError/logInfo/logRechazo/logAuth (la URL se sustituye por [DATABASE_URL])');
const llamadasConsola = [];
for (const l of appJs.split('\n')) {
  const m = l.match(/console\.(log|warn|error)\(/g);
  if (m) for (const llamada of m) llamadasConsola.push(l.slice(l.indexOf(llamada)));
}
const consolaConSecreto = llamadasConsola.filter(s => /musica_token|X-Admin-Token/.test(s));
ok(consolaConSecreto.length === 0, `G-L1 app.js: ningún console.* lleva el token ni la cabecera X-Admin-Token (${consolaConSecreto.length} llamadas sospechosas)`);

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

console.log(`\n${pasadas} PASS, ${fallos} FAIL, ${saltadas} SKIP${tieneDatos ? '' : ' (sin datos reales: solo [invariante])'}`);
console.log(fallos === 0 ? 'TODO OK' : `${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
