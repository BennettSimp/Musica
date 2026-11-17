// Evaluador musical — API y avisos (módulo 2 de la división de app.js,
// ronda 5, extras bloque 6, 2026-11-17).
// Capa de red + avisos: antes vivían en public/app.js; se mueven aquí
// sin cambiar una sola línea de lógica. Sin estado de la app: solo
// fetch/sessionStorage/prompt/DOM. Se carga como script clásico DESPUÉS
// de colores.js y ANTES de app.js (defer, mismo orden), así que app.js
// las ve como globales, igual que antes. CSP: script-src 'self' lo
// cubre (mismo origen). sw.js lo precachea (v6). El harness extrae
// mostrarErrorHttp y escapeHtml de ESTE archivo (antes de app.js).
'use strict';

const MSG_SIN_CONEXION = "SIN CONEXIÓN CON EL SERVIDOR";
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// E1 (auditoría ronda 1): un solo punto para traducir el estado HTTP
// a mensaje. El backend devuelve texto plano en los errores (p. ej.
// 400 "Faltan datos.", 409 "La cancion ya existe en el catalogo."),
// así que el 400 se lee con res.text(). El 401 lo muestra aquí y
// apiFetch ya no hace toast: cada fallo enseña UN solo aviso.
async function mostrarErrorHttp(res, porDefecto) {
    let msg = porDefecto;
    if (res.status === 400) {
        // El cuerpo se trunca a 120: un 400 con cuerpo largo (p. ej.
        // una página de error del proxy) no debe llenar el toast.
        try { const t = (await res.text()).trim(); if (t) msg = t.slice(0, 120).toUpperCase(); }
        catch (e) { console.warn('[Evaluador] mostrarErrorHttp (400):', e); }
    }
    // 401 con token no configurado en el servidor (ronda 3, oleada 2):
    // el backend lo marca con la cabecera X-Auth-Error. Sin cabecera
    // (mock del harness, proxy viejo) sigue siendo CLAVE INCORRECTA.
    else if (res.status === 401) msg = (res.headers && res.headers.get('X-Auth-Error') === 'token_no_configurado') ? 'CLAVE NO CONFIGURADA EN EL SERVIDOR' : 'CLAVE INCORRECTA';
    // 403 (B3, ronda 4): el backend nunca lo emite, pero un proxy o
    // Render sí pueden (WAF, IP bloqueada): antes caía en el mensaje
    // genérico de la acción y no se sabía que era un rechazo.
    else if (res.status === 403) msg = 'ACCESO DENEGADO';
    else if (res.status === 404) msg = 'NO ENCONTRADA';
    else if (res.status === 409) msg = 'ERROR: LA CANCIÓN YA EXISTE';
    else if (res.status === 413) msg = 'DATOS DEMASIADO GRANDES';
    else if (res.status === 429) msg = 'DEMASIADOS INTENTOS, ESPERA';
    // Cualquier 5xx es "sin conexión": 502/504 del proxy o de
    // Render al despertar también (antes solo 500/503 caían aquí
    // y el resto mostraba el mensaje genérico de la acción).
    else if (res.status >= 500) msg = MSG_SIN_CONEXION;
    showToast(msg, true);
}

// Lecturas con timeout (ronda 2, oleada 2): solo apiFetch y
// cargarCatalogo tenían los 30 s (E4); el resto de fetch() colgaba
// sin aviso si el servidor no respondía. Un solo helper para todas.
async function fetchConTimeout(url, opciones = {}) {
    const ctrl = new AbortController();
    const temporizador = setTimeout(() => ctrl.abort(), 30000);
    try { return await fetch(url, { ...opciones, signal: ctrl.signal }); }
    finally { clearTimeout(temporizador); }
}
// Error HTTP con el estado pegado, para que el catch distinga el
// 429 (rate limit) del fallo de conexión: antes todo era
// SIN CONEXIÓN, también el 429.
function errorHttp(res, url) {
    // La query no va en el mensaje (ronda 4, oleada LOGS): la URL
    // del catálogo lleva ?buscar= con el término del usuario y ese
    // Error se registra con console.error en los catch; la ruta y
    // el estado bastan para diagnosticar el fallo.
    const ruta = String(url).split('?')[0];
    const e = new Error('HTTP ' + res.status + ' en GET ' + ruta);
    e.status = res.status;
    return e;
}
function toastLectura(e) {
    showToast(e && e.status === 429 ? 'DEMASIADOS INTENTOS, ESPERA' : MSG_SIN_CONEXION, true);
}

async function apiFetch(url, opts = {}, reintento = true) {
    let t = '';
    try { t = sessionStorage.getItem('musica_token') || ''; } catch (e) { console.warn('[Evaluador] apiFetch (sessionStorage lectura):', e); }
    // E4 (auditoría ronda 1): timeout de 30 s; sin él, un servidor
    // dormido deja la petición colgada sin aviso.
    const ctrl = new AbortController();
    const temporizador = setTimeout(() => ctrl.abort(), 30000);
    let res;
    try {
        res = await fetch(url, { ...opts, signal: ctrl.signal, headers: { ...(opts.headers || {}), 'X-Admin-Token': t } });
    } finally { clearTimeout(temporizador); }
    // 429: demasiados intentos (el backend lo devuelve tras 5 fallos
    // seguidos desde la misma IP): no se pide la clave; el aviso
    // DEMASIADOS INTENTOS, ESPERA lo pone mostrarErrorHttp.
    if (res.status === 429) return res;
    // 401 con token no configurado en el servidor (ronda 3, oleada 2):
    // pedir la clave es inútil (ningún valor pasaría); se devuelve
    // tal cual y mostrarErrorHttp avisa CLAVE NO CONFIGURADA.
    if (res.status === 401 && res.headers && res.headers.get('X-Auth-Error') === 'token_no_configurado') return res;
    if (res.status === 401 && reintento) {
        // B11 (ronda 4): la clave pegada con un espacio o salto de
        // línea al final fallaba siempre (401 en bucle): se recorta.
        const n = (prompt('Clave de administrador:') || '').trim();
        if (n) { try { sessionStorage.setItem('musica_token', n); } catch (e) { console.warn('[Evaluador] apiFetch (sessionStorage guardar):', e); } return apiFetch(url, opts, false); }
        // Cancelado o vacío: no reintentar en bucle; se limpia el
        // token y el aviso CLAVE INCORRECTA lo muestra mostrarErrorHttp
        // en el llamador (un solo aviso por fallo).
        try { sessionStorage.removeItem('musica_token'); } catch (e) { console.warn('[Evaluador] apiFetch (sessionStorage limpiar tras cancelar):', e); }
    }
    if (res.status === 401 && !reintento) { try { sessionStorage.removeItem('musica_token'); } catch (e) { console.warn('[Evaluador] apiFetch (sessionStorage limpiar 401):', e); } }
    return res;
}

function showToast(m, err=false) {
    const c = document.getElementById('toast-container'); const t = document.createElement('div');
    t.className = `bg-[#0f1a36] border-l-4 ${err ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'} p-3 shadow-lg toast-enter min-w-[200px] uppercase text-xs font-bold rounded`;
    t.innerHTML = `> ${escapeHtml(m)}`; c.appendChild(t);
    setTimeout(() => { t.classList.replace('toast-enter', 'toast-exit'); setTimeout(() => t.remove(), 500); }, 2500);
}
