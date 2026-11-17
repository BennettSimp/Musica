// Evaluador musical — colores (módulo 1 de la división de app.js,
// ronda 5, extras bloque 6, 2026-11-17).
// Funciones PURAS de color (sin DOM, sin estado): antes vivían en
// public/app.js; se mueven aquí sin cambiar una sola línea de lógica.
// Se carga como script clásico ANTES de app.js (defer, mismo orden),
// así que app.js las ve como globales, igual que antes. CSP:
// script-src 'self' lo cubre (mismo origen). sw.js lo precachea (v5).
// El harness las extrae de ESTE archivo (antes de app.js).
'use strict';

// Mezcla en HSL, no en RGB: en RGB el promedio de dos colores casi
// opuestos (fuchsia->verde) cae en un gris de 24% de saturacion.
// En HSL el tono viaja por el camino mas corto y la saturacion se
// mantiene viva.
function hexAHsl(x) {
    // Acepta hex (#rrggbb) y rgb(...) (la mezcla devuelve rgb(...)).
    // mezcla(): la usan las filas 11-30 (mezcla del color de nota
    // hacia el dorado, restaurada 2026-11-17 por decisión de Nova
    // tras rechazar el híbrido suave); el harness también la prueba.
    let r, g, b;
    const m = x.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) { r = +m[1]/255; g = +m[2]/255; b = +m[3]/255; }
    else { r = parseInt(x.slice(1,3),16)/255; g = parseInt(x.slice(3,5),16)/255; b = parseInt(x.slice(5,7),16)/255; }
    const mx = Math.max(r,g,b), mn = Math.min(r,g,b), l = (mx+mn)/2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d/(2-mx-mn) : d/(mx+mn);
    let h = mx === r ? (g-b)/d + (g < b ? 6 : 0) : mx === g ? (b-r)/d + 2 : (r-g)/d + 4;
    return [h*60, s, l];
}
function hslARgb(h, s, l) {
    const c = (1 - Math.abs(2*l-1)) * s, x = c * (1 - Math.abs((h/60)%2 - 1)), m = l - c/2;
    const [r,g,b] = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return [r,g,b].map(v => Math.round((v+m)*255));
}
function mezcla(v, a, b) { // mezcla en HSL a->b con t en [0,1]
    const A = hexAHsl(a), B = hexAHsl(b);
    let dh = B[0] - A[0];
    if (dh > 180) dh -= 360; if (dh < -180) dh += 360; // camino mas corto del tono
    const h = (A[0] + dh*v + 360) % 360;
    const s = A[1] + (B[1]-A[1])*v, l = A[2] + (B[2]-A[2])*v;
    return `rgb(${hslARgb(h, s, l).join(',')})`;
}
// rgba desde un color hex o "rgb(...)", para el brillo y el tinte.
function rgbaDesde(color, alpha) {
    const m = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}
// Curva suave (smoothstep): el cambio avanza despacio al entrar en
// la ventana, mas rapido en medio y despacio al llegar al umbral.
// Sin ella la rampa lineal se siente mecanica; con ella el fundido
// se ve natural.
function suave(t) { return t * t * (3 - 2 * t); }
// PALETA G INVERTIDA (decisión de Nova 2026-11-17, tras el análisis de
// Claude: brillo CRECIENTE con la nota, claro = nota alta; reemplaza el
// brillo invertido de la G original). Secuencia espectral Dorado → Verde
// → Turquesa → Azul → Violeta, tonos en orden alrededor de la rueda
// (47° → 150° → 180° → 220° → 270°), transiciones cortas.
// Top 10 dorado #facc15 (solo por puesto global, sin requisito de nota);
// GOD ≥19 verde; 18–19 turquesa; 17.8–18 azul;
// banda baja (<17.8) violeta. Umbrales absolutos, sin cambio.
// Tonos: violeta 270°, azul 220°, turquesa 180°, verde 150°. S fija 0.85.
// Brillo CRECIENTE por BISECCIÓN: para cada nota se fija el tono por
// rampa (HSL, camino más corto, sin desaturar) y se busca por bisección
// la luz L (S fija 0.85) cuya luminancia relativa Y sea el objetivo
// lineal Y 0.21 (10.05) → 0.48 (19.60), pendiente +0.02827/nota.
// DESVIACIÓN RESPECTO A LA TAREA (documentada; ACEPTADA por Nova
// 2026-11-17 06:48, "el verde más brillante"): la tarea pedía
// pendiente 0.21 (Y 0.21 → 0.42, GOD 19.00
// #10c46a / 19.60 #10c76b, el verde elegido en el mockup). Verificado
// con las funciones reales de app.js: con 0.21 solo 12/14 colores de
// referencia son distintos (18.35 y 18.41 colisionan en #0fbbbb, y
// 19.00 y 19.10 colisionan en #10c46a); 0.22–0.26 tampoco llegan a
// 14/14 (13/14); 0.27 es la mínima que da 14/14 y es el espejo exacto
// de la pendiente de la G original. Por eso se aplica 0.27: GOD 19.00
// #11cf70 (Y 0.4591, contraste 9.54) y GOD 19.60 #11d472 (Y 0.4842,
// contraste 10.00), siempre por debajo del dorado (12.84).
// Rampas ALARGADAS 2026-11-17 (decisión de Nova: alargar AMBAS
// transiciones para que se vean mejor), con inicio ajustado
// 2026-11-17 07:39 por Nova: la transición a 17.8 empieza en 17.5,
// no en 17.0 — violeta→azul 17.5–17.8, azul→turquesa 17.8–18.5,
// turquesa→verde 18.5–19.0, siempre 0–90% con smoothstep. Las
// canciones de 17.0–17.5 vuelven a violeta puro (tono 270°).
// Los umbrales de categoría NO cambian (GOD ≥19, ≥18, ≥17.8) y el
// color puro de cada banda fuera de su rampa no cambia; lo que cambia
// es el tono dentro de 17.5–18.5 (las 51 canciones en [17,17.5) ya no
// entran en rampa; 67 en [18,18.5) siguen en rampa).
// NOTA (principio de Nova: que premie a lo mejor): el tono decrece
// estrictamente con la nota y la Y crece en las 12 muestras de
// referencia; en barrido fino de 0.01 el jitter de Y es solo el
// artefacto de cuantización 8-bit ya documentado (máx. 0.0062, igual
// que en la paleta anterior, 0.0063).
// Glow GOD variable POR CALIFICACIÓN (decisión Nova 20:40, solo GOD; las
// demás bandas mantienen su glow FIJO por banda): alfa 0.45 en 19.00 →
// 0.60 en 19.60, lineal; siempre por debajo del dorado (0.70).
// Jerarquía de glow: dorado 0.70 (halo animado, el más fuerte, intacto) >
// GOD 0.45–0.60 > turquesa 0.40 > azul 0.35 > violeta 0.30.
// El dorado Top 10 MANTIENE su gran brillo característico; no se toca.
function luminanciaRelativa(r, g, b) {
    const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function yObjetivo(nota) {
    return 0.21 + 0.27 * Math.max(0, Math.min(1, (nota - 10.05) / 9.55));
}
function tonoPorNota(nota) {
    if (nota < 17.5) return 270;
    if (nota < 17.8) return 270 + (220 - 270) * 0.9 * suave((nota - 17.5) / 0.3);
    if (nota < 18.5) return 220 - (220 - 180) * 0.9 * suave((nota - 17.8) / 0.7);
    if (nota < 19) return 180 - (180 - 150) * 0.9 * suave((nota - 18.5) / 0.5);
    return 150;
}
function colorPorNota(nota) {
    const h = tonoPorNota(nota), y = yObjetivo(nota);
    let lo = 0.02, hi = 0.98;
    // 60 iteraciones (la F usaba 50): con 50 el intervalo final
    // (8.5e-16, ~15 ulp en L≈0.3) NO converge del todo y el punto medio
    // cae del lado equivocado de un borde de redondeo de canal que está
    // a <1e-15 del cruce real — 11 de 14 muestras salen 1 punto bajas
    // (p. ej. GOD 19.00 #0c9651 en vez de #0c9751, y 19.00/19.10
    // colisionan). Con 60 el intervalo es <1 ulp (convergencia total)
    // y el resultado es estable: verificado 14/14 para 54–200 iteraciones.
    for (let i = 0; i < 60; i++) {
const mid = (lo + hi) / 2;
const [r, g, b] = hslARgb(h, 0.85, mid);
if (luminanciaRelativa(r, g, b) < y) lo = mid; else hi = mid;
    }
    return '#' + hslARgb(h, 0.85, (lo + hi) / 2).map(v => v.toString(16).padStart(2, '0')).join('');
}
function alfaGlowGod(nota) {
    return 0.45 + (0.60 - 0.45) * Math.max(0, Math.min(1, (nota - 19) / 0.6));
}
