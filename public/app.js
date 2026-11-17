        const API_URL = "https://clasificacion-de-musica.onrender.com/api/canciones";
        const API_ARTISTAS = "https://clasificacion-de-musica.onrender.com/api/artistas";
        let paginaActualGlobal = 1;
        let totalPaginasGlobal = 1; // páginas del catálogo según la última lista (para irADuplicado)
        // La animación de entrada de las filas solo corre la primera vez
        // que se pinta el catálogo: si se repitiera en cada paginación o
        // filtro, la página se sentiría lenta.
        let animacionEntradaLista = false;
        // Al cambiar el ancho, los títulos envuelven distinto y la altura
        // de las filas cambia: se vuelven a igualar (con pausa).
        let temporizadorResize = null;
        window.addEventListener('resize', () => { clearTimeout(temporizadorResize); temporizadorResize = setTimeout(igualarFilas, 200); });
        let idSeleccionadoGlobal = null;
        let cancionesGlobal = []; 
        let modalResolve = null;
        let searchTimeout = null;
        let reqActual = 0, statsListas = false;

    
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

        // Artistas (tabla cancion_artistas): la fila muestra los principales
        // unidos con ", " y los invitados con "ft."; el productor NO va en
        // la fila (solo en el modal de Editar). Sin arreglo `artistas`
        // (datos viejos o export sin artistas), se usa el campo derivado.
        function textoArtistas(c) {
            const arr = Array.isArray(c.artistas) ? c.artistas : [];
            const principales = arr.filter(a => a.rol === 'principal').map(a => a.nombre);
            const invitados = arr.filter(a => a.rol === 'invitado').map(a => a.nombre);
            if (!principales.length) return c.artista || '';
            return principales.join(', ') + (invitados.length ? ' ft. ' + invitados.join(', ') : '');
        }
        // "Invitado1, Invitado2" -> ["Invitado1", "Invitado2"] (sin vacíos
        // ni repetidos, sin importar la capitalización; se queda el primero).
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
        // Arreglo artistas: [{nombre, rol}] para POST/PUT. El principal puede
        // ser una lista separada por coma: al editar la 531 o la 662 no debe
        // fusionar sus principales en un solo artista con comas.
        function construirArtistas(principal, invitados, productores) {
            const lista = parsearListaArtistas(principal).map(n => ({ nombre: n, rol: 'principal' }));
            for (const n of invitados) lista.push({ nombre: n, rol: 'invitado' });
            for (const n of productores) lista.push({ nombre: n, rol: 'productor' });
            return lista;
        }

        // Guarda/restaura los filtros de búsqueda en localStorage para que
        // no se pierdan al recargar la página.
        function guardarFiltros() {
            try {
                localStorage.setItem('musica_filtros', JSON.stringify({
                    buscar: document.getElementById('input-buscar').value,
                    orden: document.getElementById('select-orden').value,
                    genero: document.getElementById('filtro-genero').value
                }));
            } catch (e) { console.warn('[Evaluador] guardarFiltros:', e); }
        }

        function restaurarFiltros() {
            try {
                const guardado = JSON.parse(localStorage.getItem('musica_filtros'));
                if (guardado) {
                    document.getElementById('input-buscar').value = guardado.buscar || '';
                    document.getElementById('select-orden').value = guardado.orden || 'top';
                    // El filtro guardado puede ser un género viejo (Hip Hop, Otro, OST)
                    // que ya no está en la lista de agregar: se acepta mientras
                    // tenga canciones (auditoría G, ronda 1), porque esas canciones
                    // siguen existiendo hasta la fase DB; si no es válido, se
                    // vuelve a 'todos' para que pintarChips no se rompa buscando
                    // un género que no existe. Si un heredado queda en 0 canciones,
                    // cargarGeneros() lo resetea a 'todos' cuando llegan los conteos.
                    const genGuardado = guardado.genero || 'todos';
                    document.getElementById('filtro-genero').value = (genGuardado === 'todos' || GENEROS.some(([v]) => v === genGuardado) || GENEROS_HEREDADOS.some(([v]) => v === genGuardado)) ? genGuardado : 'todos';
                }
            } catch (e) {
                console.warn('[Evaluador] restaurarFiltros:', e);
                // JSON corrupto: se limpia la clave para no reintentarlo en cada carga.
                if (e instanceof SyntaxError) { try { localStorage.removeItem('musica_filtros'); } catch (e2) { console.warn('[Evaluador] restaurarFiltros (limpieza):', e2); } }
            }
        }

        function switchTab(tab) {
            if (window.innerWidth >= 768) return;
            const ids = { cat: 'section-catalogo', rub: 'section-rubrica', reg: 'section-registro', gra: 'section-graficas' };
            Object.entries(ids).forEach(([k, id]) => {
                document.getElementById(id).classList.toggle('hidden', k !== tab);
                const b = document.getElementById('tab-btn-' + k);
                const clsActiva = { cat: 'tab-top', rub: 'tab-rub', reg: 'tab-reg', gra: 'tab-gra' };
                b.className = 'flex-1 min-w-0 py-4 px-1 text-[11px] truncate text-center rounded-full shadow-[0_4px_14px_rgba(0,0,0,0.45)] ' + (k === tab ? clsActiva[k] : 'bg-[#0f1a36] text-gray-400');
                b.setAttribute('aria-selected', k === tab);
            });
            // Al volver al Top se re-igualan las alturas con el ancho actual:
            // si el tamaño cambió mientras el catálogo estaba oculto, las
            // alturas guardadas eran del ancho viejo (auditoría G, ronda 1).
            if (tab === 'cat') igualarFilas();
        }

        // Marca la pestaña activa de la nav de PC con el degradado Atardecer.
        function marcarNav(el) {
            const mapa = { 'section-catalogo': 'tab-top', 'section-rubrica': 'tab-rub', 'section-registro': 'tab-reg', 'section-graficas': 'tab-gra' };
            document.querySelectorAll('nav a').forEach(a => {
                a.classList.remove('tab-top', 'tab-rub', 'tab-reg', 'tab-gra');
                a.classList.add('text-gray-300', 'hover:bg-sky-950');
            });
            el.classList.add(mapa[el.getAttribute('href').slice(1)]);
            el.classList.remove('text-gray-300', 'hover:bg-sky-950');
        }

        // Rellena el riel hasta el valor (1) con el color de cada criterio.
        function pintarSlider(id) {
            const el = document.getElementById(id);
            const pct = (parseFloat(el.value) - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min)) * 100;
            const color = getComputedStyle(el).getPropertyValue('--sc').trim() || '#0e7490';
            el.style.background = `linear-gradient(90deg, ${color} ${pct}%, #0f1a36 ${pct}%)`;
            return pct;
        }
        function actualizarValores() {
            const r = parseFloat(document.getElementById('ritmo').value) || 0;
            const l = parseFloat(document.getElementById('letras').value) || 0;
            const c = parseFloat(document.getElementById('coro').value) || 0;
            const i = parseFloat(document.getElementById('importancia').value) || 0;

            document.getElementById('val_ritmo').innerText = r.toFixed(1);
            document.getElementById('val_letras').innerText = l.toFixed(1);
            document.getElementById('val_coro').innerText = c.toFixed(1);
            document.getElementById('val_importancia').innerText = i.toFixed(1);
            ['ritmo', 'letras', 'coro', 'importancia'].forEach(pintarSlider);
        }
        function vigilarSliders() {
            ['ritmo', 'letras', 'coro', 'importancia'].forEach(id => {
                const el = document.getElementById(id);
                el.addEventListener('pointerdown', () => { el.classList.add('dragging'); actualizarValores(); });
                ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => { el.classList.remove('dragging'); actualizarValores(); }));
            });
        }
        // (6) Siguiente sin calificar: usa el orden que ya existe en el backend.
        async function siguienteSinCalificar() {
            try {
                const res = await fetchConTimeout(`${API_URL}?orden=sin_calificar&pagina=1`);
                if (!res.ok) { await mostrarErrorHttp(res, MSG_SIN_CONEXION); return; }
                const data = await res.json();
                if (!data.canciones || !data.canciones.length) { showToast('NO HAY PENDIENTES'); return; }
                const song = data.canciones[0];
                // No se reemplaza cancionesGlobal: las filas del catalogo
                // que se ven seguirian sin datos y al tocarlas el formulario
                // quedaba vacio. Se fusionan las pendientes con las que hay.
                const ids = new Set(cancionesGlobal.map(c => c.id));
                for (const c of data.canciones) if (!ids.has(c.id)) cancionesGlobal.push(c);
                seleccionarTarget(song.id);
                if (window.innerWidth < 768) switchTab('rub');
                showToast('SIN CALIFICAR: ' + song.titulo);
            } catch (e) { console.error('[Evaluador] siguienteSinCalificar:', e); showToast(MSG_SIN_CONEXION, true); }
        }

        function limpiarFormulario(recargar = true) {
            document.querySelectorAll('.active-song').forEach(el => el.classList.remove('active-song'));
            idSeleccionadoGlobal = null;
            document.getElementById('id_cancion').value = ''; document.getElementById('cancion-activa').innerText = SIN_SELECCION; document.getElementById('cancion-contexto').innerText = '';
            document.getElementById('cancion-activa').style.borderColor = ''; document.getElementById('cancion-activa').style.boxShadow = '';
            document.getElementById('btn-editar-activa').classList.add('hidden');
            document.getElementById('ritmo').value = 5; 
            document.getElementById('letras').value = 5;
            document.getElementById('coro').value = 5; 
            document.getElementById('importancia').value = 2.5;
            ['antiguedad', 'nostalgia', 'complejidad', 'descubrimiento_unico', 'arte_visual'].forEach(id => document.getElementById(id).checked = false);
            actualizarValores();
            if (recargar) cargarCatalogo(paginaActualGlobal);
        }

        // Editar en Evaluar (decisión 2026-11-14, propuesta auditoría G):
        // solo el botón Editar, nunca Eliminar. Abre el mismo modal de
        // edición de la fila seleccionada; en el celular evita volver al Top.
        function editarActiva() { if (idSeleccionadoGlobal) openEditModal(idSeleccionadoGlobal); }

        // PRECARGA DE CALIFICACIONES PREVIAS
        function seleccionarTarget(id) {
            idSeleccionadoGlobal = id;
            document.getElementById('id_cancion').value = id;
            
            const song = cancionesGlobal.find(x => x.id === id);
            if(song) {
                document.getElementById('ritmo').value = song.ritmo ?? 5;
                document.getElementById('letras').value = song.letras ?? 5;
                document.getElementById('coro').value = song.coro ?? 5;
                document.getElementById('importancia').value = song.importancia ?? 2.5;
                document.getElementById('antiguedad').checked = song.antiguedad;
                document.getElementById('nostalgia').checked = song.nostalgia;
                document.getElementById('complejidad').checked = song.complejidad;
                document.getElementById('descubrimiento_unico').checked = song.descubrimiento;
                document.getElementById('arte_visual').checked = song.arte_visual > 0;
            }
            actualizarValores();
            const btnCal = document.getElementById('btn-calificar');
            if (btnCal) btnCal.innerText = (song && song.calificacion_final > 0) ? 'Actualizar calificación' : 'Guardar calificación';

            document.querySelectorAll('.cancion-row').forEach(el => el.classList.remove('active-song'));
            const activeRow = document.getElementById(`row-${id}`);
            if(activeRow) activeRow.classList.add('active-song');
            
            document.getElementById('cancion-activa').innerText = song ? `${song.titulo} — ${textoArtistas(song)}` : '';
            // (3) La caja se tine con el color de categoria de la cancion
            // elegida: se lee del borde de su fila (el estilo en linea guarda
            // el colorBase, aunque la clase active-song lo tape en la fila).
            const cajaActiva = document.getElementById('cancion-activa');
            const colorFila = activeRow ? activeRow.style.borderColor : '';
            if (colorFila) {
                cajaActiva.style.borderColor = colorFila;
                const mRgb = colorFila.match(/(\d+),\s*(\d+),\s*(\d+)/);
                const rgb = mRgb ? [mRgb[1], mRgb[2], mRgb[3]] : [parseInt(colorFila.slice(1,3),16), parseInt(colorFila.slice(3,5),16), parseInt(colorFila.slice(5,7),16)];
                cajaActiva.style.boxShadow = `0 0 14px rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.45)`;
            } else {
                // Sin fila en pantalla (canción recién agregada, aún sin nota):
                // no conservar el color de la canción anterior (auditoría G,
                // ronda 2).
                cajaActiva.style.borderColor = '';
                cajaActiva.style.boxShadow = '';
            }
            // Contexto (7): genero, tipo y nota guardada (no un total previsto).
            const ctx = document.getElementById('cancion-contexto');
            if (song) {
                const nombreGenero = MAP_GENEROS[song.genero] || song.genero;
                const nombreTipo = MAP_ETIQUETAS[song.etiqueta] || song.etiqueta;
                const nota = song.calificacion_final > 0 ? `Nota guardada: ${song.calificacion_final.toFixed(2)}` : 'Sin calificar';
                ctx.innerText = `${nombreGenero} · ${nombreTipo}${song.instrumental ? ' · Instrumental' : ''}${song.banda_sonora ? ' · Banda sonora' : ''} · ${nota}`;
            } else ctx.innerText = '';
            const btnEd = document.getElementById('btn-editar-activa');
            if (btnEd) btnEd.classList.toggle('hidden', !song); // Editar en Evaluar (decisión 2026-11-14): solo Editar, nunca Eliminar
            if (song) showToast('CANCIÓN SELECCIONADA'); // solo si existe: antes se mostraba incluso con un ID que no esta en el catalogo
            if (window.innerWidth < 768) switchTab('rub');
        }

        const GENEROS = [['Pop','Pop'],['Rock','Rock'],['Electronica','Electrónica'],['Rap','Rap'],['Trap','Trap'],['Reggaeton','Reguetón'],['R&B','R&B'],['Phonk','Phonk'],['Banda','Banda'],['Corridos','Corridos'],['Corridos Tumbados','Corridos Tumbados'],['Cumbia','Cumbia'],['Salsa','Salsa'],['Baladas','Baladas'],['Metal','Metal'],['Alternativo','Alternativo'],['Hardstyle','Hardstyle'],['Merengue','Merengue'],['Dembow','Dembow'],['Reggae','Reggae'],['Bachata','Bachata'],['Afrobeats','Afrobeats'],['Lofi','Lofi'],['Hardcore','Hardcore'],['Clasica','Clásica'],['Latino','Latino'],['Romanticas','Románticas'],['Asiatica','Asiática'],['Por clasificar','Por clasificar']];
        // Géneros heredados que TODAVÍA existen en la base (auditoría G, ronda 1):
        // Hip Hop 39, Otro 36, OST 4 = 79 canciones. La fase DB los unificará
        // (Hip Hop→Rap, Otro→Por clasificar, OST→banda_sonora + género real).
        // Solo se usan para FILTRAR (burbujas) y para EDITAR (mantener el género
        // actual de la canción, sin obligar a reclasificarla ya): NUNCA para
        // agregar canciones nuevas. Cuando la migración los deje en 0, las
        // burbujas desaparecen solas y el filtro guardado se resetea a 'todos'.
        const GENEROS_HEREDADOS = [['Hip Hop','Hip Hop'],['Otro','Otro'],['OST','OST']];
        // Una sola lista de tipos de version (valor guardado, nombre que se ve).
        // Antes estaba escrita a mano en el HTML y otra vez en el modal de editar.
        const ETIQUETAS = [["Original", "Original"], ["Remix", "Remix"], ["Slowed Reverb", "Slowed + Reverb"], ["Sped Up", "Sped Up"], ["Cover", "Cover"], ["Acustico", "Acústico"], ["En Vivo", "En Vivo"], ["Fragmento", "Fragmento"], ["Demo", "Demo"], ["Mashup", "Mashup"], ["Edit", "Edit"]];
        // L9 (auditoría ronda 1): los mapas se construyen una sola vez, no
        // con Object.fromEntries(GENEROS/ETIQUETAS) en cada fila o llamada.
        const MAP_GENEROS = Object.fromEntries(GENEROS);
        const MAP_ETIQUETAS = Object.fromEntries(ETIQUETAS);

        // Mezcla en HSL, no en RGB: en RGB el promedio de dos colores casi
        // opuestos (fuchsia->verde) cae en un gris de 24% de saturacion.
        // En HSL el tono viaja por el camino mas corto y la saturacion se
        // mantiene viva.
        function hexAHsl(x) {
            // Acepta hex (#rrggbb) y rgb(...) (la mezcla devuelve rgb(...)):
            // la mezcla del Top 11-20 parte ahora del propio color de la canción,
            // que puede venir de un degradado. Sin esto, mezcla() daría NaN.
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
// PALETA G (elegida por Nova 2026-11-16 23:36, "Excelente. Aplícala
// toda"; reemplaza la F): secuencia espectral Dorado → Verde →
// Turquesa → Azul → Violeta, tonos en orden alrededor de la rueda
// (47° → 150° → 180° → 220° → 270°), transiciones cortas.
// Top 10 dorado #facc15 (solo por puesto global, sin requisito de nota);
// GOD ≥19 verde; 18–19 turquesa; 17.8–18 azul;
// banda baja (<17.8) violeta. Umbrales absolutos, sin cambio.
// Tonos: violeta 270°, azul 220°, turquesa 180°, verde 150°. S fija 0.85.
// Brillo INVERTIDO (oscuro = nota alta) por BISECCIÓN: para cada nota se
// fija el tono por rampa (HSL, camino más corto, sin desaturar) y se busca
// por bisección la luz L (S fija 0.85) cuya luminancia relativa Y sea el
// objetivo lineal Y 0.48 (10.05) → 0.21 (19.60), pendiente −0.02827/nota
// (G oscurecida: Y0 0.48, pendiente 0.27; la F era 0.40 → 0.17).
// Rampas 0–90% con smoothstep, ventanas 17.5–17.8 (violeta→azul),
// 17.8–18 (azul→turquesa), 18.5–19 (turquesa→verde).
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
    return 0.48 - 0.27 * Math.max(0, Math.min(1, (nota - 10.05) / 9.55));
}
function tonoPorNota(nota) {
    if (nota < 17.5) return 270;
    if (nota < 17.8) return 270 + (220 - 270) * 0.9 * suave((nota - 17.5) / 0.3);
    if (nota < 18) return 220 - (220 - 180) * 0.9 * suave((nota - 17.8) / 0.2);
    if (nota < 18.5) return 180;
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
        const METRICAS = { ritmo: ['RITMO', 10], letras: ['LETRAS', 10], coro: ['CORO', 10], importancia: ['IMPORT.', 5] };
        const CHIP = 'flex-shrink-0 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap min-h-[44px] '; // min-h 44px: objetivo táctil (auditoría G, ronda 2; antes ~30px)
        const CHIP_ON = 'bg-sky-900 text-sky-100 border-sky-400', CHIP_OFF = 'bg-[#0f1a36] text-gray-300 border-sky-700 hover:border-sky-400 hover:shadow-[0_0_10px_rgba(56,189,248,0.4)]';
        let conteoGenero = {};
        let generosCargados = false; // true cuando /generos ya devolvió los conteos

        function poblarGeneros() {
            const s = document.getElementById('reg-genero');
            s.innerHTML = `<option value="" selected>Elige un género</option>` + GENEROS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('');
            document.getElementById('reg-etiqueta').innerHTML = ETIQUETAS.map(([v, n], i) => `<option value="${v}"${i === 0 ? ' selected' : ''}>${n}</option>`).join('');
        }
        let chipsExpandidos = false; // burbujas de género colapsadas: Todos + top 3 + Ver más
        function alternarChips() { chipsExpandidos = !chipsExpandidos; pintarChips(); }
        function pintarChips() {
            const act = document.getElementById('filtro-genero').value;
            // Solo géneros con canciones (y el activo, aunque quede vacío): 22 burbujas eran demasiadas.
            // Las burbujas incluyen también los géneros heredados con canciones
            // (Hip Hop, Otro, OST: auditoría G, ronda 1), porque si no, esas 79
            // canciones no se podrían filtrar por su género hasta la fase DB.
            const GENEROS_FILTRO = [...GENEROS, ...GENEROS_HEREDADOS];
            const base = generosCargados ? [['todos', 'Todos'], ...GENEROS_FILTRO.filter(([v]) => conteoGenero[v] > 0 || v === act)] : [['todos', 'Todos'], ...GENEROS_FILTRO];
            let lista = base, mas = null;
            if (generosCargados && !chipsExpandidos && base.length > 7) {
                const top3 = [...base.slice(1)].sort((a, b) => (conteoGenero[b[0]] || 0) - (conteoGenero[a[0]] || 0)).slice(0, 3);
                const visibles = [['todos', 'Todos'], ...top3];
                if (act !== 'todos' && !visibles.some(([v]) => v === act)) { const encontrado = base.find(([v]) => v === act); if (encontrado) visibles.push(encontrado); }
                lista = visibles;
                mas = base.length - visibles.length;
            }
            document.getElementById('chips-genero').innerHTML = lista.map(([v, n]) =>
                `<button onclick="elegirGenero('${v}')" aria-pressed="${v === act}" class="${CHIP}${v === act ? CHIP_ON : CHIP_OFF}">${n}${conteoGenero[v] ? ' · ' + conteoGenero[v] : ''}</button>`).join('')
                + (mas !== null ? `<button onclick="alternarChips()" class="${CHIP}${CHIP_OFF}">Ver más · ${mas}</button>` : (chipsExpandidos ? `<button onclick="alternarChips()" class="${CHIP}${CHIP_OFF}">Ver menos</button>` : ''));
        }
        function elegirGenero(v) { document.getElementById('filtro-genero').value = v; pintarChips(); cargarCatalogo(1); }
        const SIN_SELECCION = 'Selecciona una canción en el catálogo';
        async function cargarHistograma() {
            const el = document.getElementById('histograma');
            try {
                const res = await fetchConTimeout(`${API_URL}/histograma`);
                if (!res.ok) throw errorHttp(res, API_URL + '/histograma');
                const { histograma } = await res.json();
                const max = Math.max(1, ...histograma.map(h => h.total));
                const totalHist = histograma.reduce((a, h) => a + h.total, 0);
                const colorBarra = {'10-12': colorPorNota(11), '12-14': colorPorNota(13), '14-16': colorPorNota(15), '16-17.8': colorPorNota(16.9), '17.8-18': colorPorNota(17.9), '18-19': colorPorNota(18.5), '19-20': colorPorNota(19.5), 'sin_calificar': '#6b7280', 'menos-10': colorPorNota(9)};
                el.innerHTML = histograma.map(h => { const etiqueta = h.rango === 'sin_calificar' ? 'Sin calificar' : h.rango === 'menos-10' ? 'Menos de 10' : h.rango; const pct = totalHist ? Math.round(h.total / totalHist * 100) : 0; return `<button onclick="filtrarRango('${h.rango}')" class="w-full text-left min-h-[44px] flex flex-col justify-center ${h.rango === rangoActivo ? 'rango-activo' : ''}"><div class="flex justify-between gap-2 text-xs"><span class="text-gray-200">${etiqueta}</span><span class="text-gray-400">${h.total} canc. · ${pct}%</span></div><div class="h-3 bg-[#0f1a36] rounded mt-1"><div class="h-3 rounded" style="width:${Math.round(h.total / max * 100)}%;background:${colorBarra[h.rango] || '#22d3ee'}"></div></div></button>`; }).join('') || '<p class="text-gray-400 text-xs">Sin datos todavía.</p>';
            } catch (e) { console.error('[Evaluador] cargarHistograma:', e); toastLectura(e); el.innerHTML = '<p class="text-red-400 text-xs">No se pudo cargar el histograma.</p><button onclick="cargarHistograma()" class="text-xs text-sky-300 border border-sky-500 px-4 py-2 rounded-full hover:border-sky-300 min-h-[44px]">REINTENTAR</button>'; }
        }
        let rangoFiltro = null; // [min, max] o null = sin filtro
        let catalogoListo = false; // true tras la primera carga con exito (para el aviso de despertar)
        let rangoActivo = null; // rango del histograma que esta filtrando
        function filtrarRango(rango) {
            if (rango === rangoActivo) { quitarRango(); return; }
            rangoActivo = rango;
            if (rango === 'sin_calificar') rangoFiltro = [0, 0];
            else if (rango === 'menos-10') rangoFiltro = [0.01, 9.99];
            else { const [a, b] = rango.split('-').map(Number); rangoFiltro = [a, b >= 20 ? 20 : b - 0.01]; }
            cargarHistograma();
            showToast('RANGO ' + rango.toUpperCase()); const b = document.getElementById('quitar-rango'); if (b) b.classList.remove('hidden');
            cargarCatalogo(1);
        }
        function quitarRango() { rangoFiltro = null; rangoActivo = null; const b = document.getElementById('quitar-rango'); if (b) b.classList.add('hidden'); cargarCatalogo(1); cargarHistograma(); }
        async function cargarGeneros() {
            const ul = document.getElementById('generos-stats');
            try {
                const res = await fetchConTimeout(`${API_URL}/generos`);
                if (!res.ok) throw errorHttp(res, API_URL + '/generos');
                const { generos } = await res.json();
                const nombres = MAP_GENEROS;
                conteoGenero = Object.fromEntries(generos.map(g => [g.genero, g.total])); generosCargados = true; pintarChips();
                // Si el filtro activo es un género heredado que ya quedó en 0
                // canciones (migración DB aplicada), se vuelve a 'todos' solo:
                // su burbuja ya no existe y el catálogo quedaría vacío sin motivo.
                const actGen = document.getElementById('filtro-genero').value;
                if (actGen !== 'todos' && GENEROS_HEREDADOS.some(([v]) => v === actGen) && !(conteoGenero[actGen] > 0)) {
                    document.getElementById('filtro-genero').value = 'todos';
                    guardarFiltros(); pintarChips(); cargarCatalogo(1);
                }
                ul.innerHTML = generos.map((g, i) => `<li class="${i === 0 ? 'genero-top' : ''}"><div class="flex justify-between gap-2"><span class="text-gray-200">${escapeHtml(nombres[g.genero] || g.genero)}</span><span class="text-gray-400">${g.promedio.toFixed(1)}/20 · ${g.total} canc.</span></div><div class="h-1.5 bg-[#0f1a36] rounded mt-1"><div class="h-1.5 rounded" style="width:${Math.min(100, g.promedio / 20 * 100)}%;background:linear-gradient(90deg,#22d3ee,#ff2ea6,#ff7a18)"></div></div></li>`).join('') || '<li class="text-gray-400">Sin datos todavía.</li>';
            } catch (e) { console.error('[Evaluador] cargarGeneros:', e); toastLectura(e); ul.innerHTML = '<li class="text-red-400">No se pudo cargar.</li><li><button onclick="cargarGeneros()" class="text-xs text-sky-300 border border-sky-500 px-4 py-2 rounded-full hover:border-sky-300 min-h-[44px]">REINTENTAR</button></li>'; }
        }

        async function exportar(formato) {
            try {
                const res = await fetchConTimeout(`${API_URL}/exportar`);
                if (!res.ok) { await mostrarErrorHttp(res, 'NO SE PUDO EXPORTAR'); return; }
                const data = await res.json();
                const canciones = data.canciones || [];
                let contenido, tipo;
                if (formato === 'json') { contenido = JSON.stringify(canciones, null, 2); tipo = 'application/json'; }
                else {
                    const cols = Object.keys(canciones[0] || { id: 0 });
                    const cel = v => { let s = (v && typeof v === 'object') ? JSON.stringify(v) : String(v ?? ''); if (/^[=+\-@|%]/.test(s.trimStart())) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; }; // el trimStart importa: " =2+2" tambien es formula para Excel; el objeto (artistas: [{...}]) va como JSON, no "[object Object]" (ronda 3, oleada 2)
                    contenido = '\ufeff' + [cols.join(','), ...canciones.map(c => cols.map(k => cel(c[k])).join(','))].join('\r\n'); tipo = 'text/csv';
                }
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
                a.download = `canciones-${new Date().toISOString().slice(0, 10)}.${formato}`; a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                showToast('RESPALDO DESCARGADO');
            } catch (e) { console.error('[Evaluador] exportar (GET ' + API_URL + '/exportar):', e); showToast('NO SE PUDO EXPORTAR', true); }
        }

        // E9 (auditoría ronda 1): bloqueo POR ACCIÓN, no un flag global
        // compartido: agregar mientras se califica no debe bloquearse entre
        // sí. (Ronda 2: el toast GUARDANDO… ya no va aquí: se mostraba
        // también cuando la acción se rechazaba por validación local sin
        // haber enviado nada; cada acción lo muestra solo cuando su
        // petición realmente arranca.)
        const bloqueosAccion = new Set();
        async function conBloqueo(fn, clave = 'accion') {
            if (bloqueosAccion.has(clave)) return;
            bloqueosAccion.add(clave);
            try { await fn(); } finally { bloqueosAccion.delete(clave); }
        }
        async function irPagina(n) { await cargarCatalogo(n); document.getElementById('section-catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

        // El token vive en sessionStorage (decisión 2026-11-14, propuesta
        // auditoría G): sobrevive a recargar la página en la misma pestaña,
        // pero se borra al cerrar la pestaña/navegador. Los filtros siguen
        // en localStorage (no son sensibles).
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

        function debounceBuscar() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => cargarCatalogo(1), 300); }

        let timerReintentoStats = null; // reintento programado de estadísticas (E7)
        async function cargarEstadisticas() {
            try {
                const resStats = await fetchConTimeout(`${API_URL}/stats`);
                if (!resStats.ok) throw errorHttp(resStats, API_URL + '/stats');
                const data = await resStats.json();
                document.getElementById('stat-total').innerText = data.total; 
                document.getElementById('stat-promedio').innerText = data.promedio.toFixed(2);
                document.getElementById('stat-top').innerText = data.obras_maestras; 
                document.getElementById('stat-pending').innerText = data.sin_calificar;
                document.getElementById('stat-top-ctx').innerText = data.total ? Math.round(100 * data.obras_maestras / data.total) + '% del catálogo' : '—';
                document.getElementById('stat-pending-ctx').innerText = data.sin_calificar === 0 ? 'al día' : 'por calificar';
                // (5) Sin pendientes, el boton se oculta en vez de solo avisar con un toast.
                const bSiguiente = document.getElementById('btn-siguiente-sin-calificar');
                if (bSiguiente) bSiguiente.classList.toggle('hidden', data.sin_calificar === 0);
                ['stat-total','stat-promedio','stat-top','stat-pending'].forEach(id => document.getElementById(id).classList.remove('animate-pulse'));
                statsListas = true; // solo tras exito: si falla, se reintenta en la proxima carga
                if (timerReintentoStats) { clearTimeout(timerReintentoStats); timerReintentoStats = null; }
            } catch(e) {
                console.error('[Evaluador] cargarEstadisticas:', e);
                toastLectura(e);
                // E7: reintento programado (15 s) mientras no haya datos:
                // si no, los cuadros se quedan en "—" para siempre.
                if (!timerReintentoStats) timerReintentoStats = setTimeout(() => { timerReintentoStats = null; if (!statsListas) cargarEstadisticas(); }, 15000);
            }
        }

        // Igualar la altura mínima de las filas a la más alta de la
        // página (por ejemplo, la de "PRECAUCIÓN, ESTÁ CANCIÓN ES UN
        // HECHIZO", con el título en 3 líneas): así todos los
        // recuadros quedan del mismo tamaño. La fila seleccionada no
        // entra en la medida, porque su línea de acciones la hace más
        // alta; el mínimo no es un tope, esa fila puede crecer.
        function igualarFilas() {
            // Si el catálogo está oculto (móvil en otra pestaña: Evaluar,
            // Agregar o Gráficas), offsetHeight es 0 y el reseteo de abajo
            // BORRARÍA los min-height sin volver a ponerlos (auditoría G,
            // ronda 1: pasaba al agregar y al calificar en el celular, y al
            // cambiar el tamaño con otra pestaña activa). No tocar nada.
            const listaEl = document.getElementById('lista_canciones');
            if (!listaEl || !listaEl.offsetParent) return;
            const filas = [...document.querySelectorAll('.cancion-row')];
            filas.forEach(f => f.style.minHeight = '');
            const base = filas.filter(f => !f.classList.contains('active-song'));
            const lista = base.length ? base : filas;
            const max = Math.max(0, ...lista.map(f => f.offsetHeight));
            if (max > 0) filas.forEach(f => f.style.minHeight = max + 'px');
        }

        // Pantalla de carga (ronda 3): se oculta SOLO al terminar
        // cargarCatalogo, con exito o con error, para que la app nunca
        // quede tapada por el splash. Idempotente: las cargas siguientes
        // (paginacion, filtros) la vuelven a llamar sin efecto. No se
        // oculta en el return por respuesta obsoleta ni antes de la
        // recursion de pagina: en esos casos otra carga sigue en curso
        // y es ella la que la oculta al terminar.
        function ocultarSplash() {
            const s = document.getElementById('pantalla-carga');
            if (s) s.classList.add('oculta');
        }

        async function cargarCatalogo(pagina = 1) {
            try {
                paginaActualGlobal = pagina;
                const busqueda = document.getElementById('input-buscar').value;
                const orden = document.getElementById('select-orden').value;
                const generoFiltro = document.getElementById('filtro-genero').value;
                guardarFiltros();

                document.getElementById('barra-carga').classList.remove('hidden');
                document.getElementById('lista_canciones').innerHTML = (catalogoListo ? '' : `<p class="text-yellow-400 text-xs p-3 text-center border border-yellow-900 rounded mb-2">> Despertando el servidor, puede tardar hasta un minuto...</p>`) + Array.from({length: 8}, () => `<div class="p-3 border border-gray-800 rounded-xl"><div class="h-3 esqueleto rounded w-3/4 mb-2"></div><div class="h-3 esqueleto rounded w-1/2"></div></div>`).join('');

                const miReq = ++reqActual;
                // E4: timeout de 30 s (igual que en apiFetch).
                const ctrlCatalogo = new AbortController();
                const temporizadorCatalogo = setTimeout(() => ctrlCatalogo.abort(), 30000);
                const urlCatalogo = `${API_URL}?pagina=${pagina}&buscar=${encodeURIComponent(busqueda)}&orden=${orden}&genero=${encodeURIComponent(generoFiltro)}${rangoFiltro ? `&nota_min=${rangoFiltro[0]}&nota_max=${rangoFiltro[1]}` : ''}`;
                let res;
                try {
                    res = await fetch(urlCatalogo, { signal: ctrlCatalogo.signal });
                } finally { clearTimeout(temporizadorCatalogo); }
                if (!res.ok) throw errorHttp(res, urlCatalogo);
                const data = await res.json();
                if (!statsListas) cargarEstadisticas();

                // E6: ocultar la barra ANTES del return por respuesta obsoleta.
                if (miReq !== reqActual) { document.getElementById('barra-carga').classList.add('hidden'); return; }
                totalPaginasGlobal = data.total_paginas || 1;
                document.getElementById('barra-carga').classList.add('hidden'); catalogoListo = true;
                // E6: solo se retrocede si la última página es ANTERIOR a la
                // actual; sin esto, una última página vacía volvía a pedirse
                // a sí misma en bucle (y con total_paginas = 0 también).
                const paginaDestino = Math.max(1, data.total_paginas || 1);
                if (!data.canciones.length && pagina > 1 && paginaDestino < pagina) return cargarCatalogo(paginaDestino);
                cancionesGlobal = data.canciones;
                const dl = document.getElementById('lista-artistas');
                if (dl && !artistasCompletos) dl.innerHTML = [...new Set(cancionesGlobal.map(c => c.artista))].map(a => `<option value="${escapeHtml(a)}">`).join('');
                let rankingInicio = (pagina - 1) * 50;
                const metrica = METRICAS[orden]; const mostrarRank = orden === 'top'; // el "#" solo se muestra en orden Top; el dorado sigue el rank_global en cualquier orden (Top global)
                
                const htmlCanciones = cancionesGlobal.map((c, index) => {
                    const valor = metrica ? c[orden] : c.calificacion_final;
                    let p = c.calificacion_final > 0 ? (valor ?? 0).toFixed(2) : "N/A"; // ?? 0: si una metrica es null con nota > 0 (dato inconsistente), antes rompia todo el catalogo

                    // COLORES — PALETA G (elegida por Nova 2026-11-16 23:36,
                    // reemplaza la F): Top 10 dorado (solo por puesto
                    // global), GOD ≥19 verde, 18–19 turquesa, 17.8–18 azul,
                    // resto violeta. Brillo INVERTIDO (oscuro = nota alta)
                    // por bisección contra Y lineal 0.48→0.21; transiciones
                    // vívidas por HSL (nunca por el gris, nunca pálido).
                    // Rampas 0–90% con smoothstep: 17.5–17.8
                    // (violeta→azul), 17.8–18 (azul→turquesa), 18.5–19
                    // (turquesa→verde). El glow GOD varía POR CALIFICACIÓN
                    // (0.45 en 19.00 → 0.60 en 19.60), solo GOD; las demás
                    // bandas mantienen su glow FIJO (turquesa 0.40, azul
                    // 0.35, violeta 0.30), siempre por debajo del dorado
                    // (0.70, halo animado, intacto). TODA la fila se ilumina.
                    const nota = c.calificacion_final;
                    const rank = c.rank_global || (rankingInicio + index + 1); // TOP GLOBAL: el puesto es el del ranking de todas las canciones por calificacion, no el de la pagina, el filtro ni el orden actual
                    // INICIO-COLOR-G
                    let enTransicion = false; // la fila esta en una ventana de degradado
                    let colorBase = '#1d4ed8', glow = 'rgba(29,78,216,0.30)';
                    let alfaGlow = 0.30;
                    if (nota <= 0) colorBase = '#6b7280'; // P5: sin calificar, gris también en insignia y puntos
                    else {
                        colorBase = colorPorNota(nota);
                        if (nota >= 19) alfaGlow = alfaGlowGod(nota);
                        else if (nota >= 18) alfaGlow = 0.40;
                        else if (nota >= 17.8) alfaGlow = 0.35;
                        else alfaGlow = 0.30;
                        enTransicion = (nota >= 17.5 && nota < 18) || (nota >= 18.5 && nota < 19);
                    }
                    // Dorado por puesto GLOBAL, sin importar la nota (decisión del
                    // usuario 2026-11-13 19:19 CST): el Top es el de todas las
                    // canciones por calificacion. Una cancion es dorada si esta
                    // en el Top 10 global, aunque sea la #1 de su genero o del
                    // orden actual. Del 11 al 20 mezcla desde su propio color
                    // hacia el dorado con la misma rampa 0-90% y curva suave:
                    // Top 20 al 0% (color puro), Top 11 al 90%.
                    // P5: el dorado por puesto y la mezcla 11-20 solo valen
                    // con nota > 0; sin calificar, la fila queda gris.
                    if (nota > 0 && rank > 10 && rank <= 20) { colorBase = mezcla(0.9 * suave((20 - rank) / 9), colorBase, '#facc15'); enTransicion = true; }
                    // El brillo sigue al color final con el alfa de su banda
                    // (Top 10 mayor, luego GOD variable, turquesa, azul, violeta).
                    glow = rgbaDesde(colorBase, alfaGlow);
                    if (nota > 0 && rank <= 10) { colorBase = '#facc15'; glow = 'rgba(250,204,21,0.7)'; }
                    // El tinte de fondo es mas fuerte en transicion (0.33 en vez
                    // de 0.20) para que no se lave sobre el negro. Antes
                    // `${colorBase}33` era CSS invalido cuando colorBase venia
                    // como "rgb(...)" y la fila perdia el tinte por completo.
                    const cGlow = nota > 0
                        ? `border-color:${colorBase};background:linear-gradient(90deg, ${rgbaDesde(colorBase, enTransicion ? 0.33 : 0.2)}, #040b1a);box-shadow:0 0 18px ${glow}, inset 0 0 18px ${glow}`
                        : "border-color:#1f2937;opacity:0.6";
                    const cText = nota > 0 ? `color:${colorBase}` : "color:#6b7280";
                    const cBox = "bg-[#040b1a]/60 border-gray-800";
                    let isActive = (idSeleccionadoGlobal === c.id) ? "active-song" : "";
                    
                    // El tipo de versión se muestra siempre: "Original" en
                    // gris (es el valor por defecto, 592 canciones) y los
                    // demás tipos en índigo, para que se distingan.
                    const etiqueta = c.etiqueta || 'Original';
                    const nombreEtiqueta = MAP_ETIQUETAS[etiqueta] || etiqueta;
                    let tagBadge = etiqueta === 'Original'
                        ? `<span class="bg-gray-800 text-gray-300 text-[11px] px-1 py-0.5 rounded border border-gray-700 ml-1">${escapeHtml(nombreEtiqueta)}</span>`
                        : `<span class="bg-indigo-900 text-indigo-300 text-[11px] px-1 py-0.5 rounded border border-indigo-700 ml-1">${escapeHtml(nombreEtiqueta)}</span>`;
                    // Casillas aparte: Instrumental y Banda sonora se ven como
                    // insignias propias, porque no son genero ni tipo.
                    if (c.instrumental) tagBadge += ` <span class="bg-sky-900 text-sky-300 text-[11px] px-1 py-0.5 rounded border border-sky-700 ml-1">Instrumental</span>`;
                    if (c.banda_sonora) tagBadge += ` <span class="bg-amber-900 text-amber-300 text-[11px] px-1 py-0.5 rounded border border-amber-700 ml-1">Banda sonora</span>`;
                    const nombreGenero = MAP_GENEROS[c.genero] || c.genero;
                    let genBadge = `<span class="text-[11px] border px-1 rounded" style="color:${colorBase};border-color:${rgbaDesde(colorBase, 0.45)}">${escapeHtml(nombreGenero)}</span>`;

                    // Puntos de bonos, en orden: Antigüedad, Nostalgia,
                    // Complejidad, Descubrimiento único, Arte Visual.
                    // Encendido = color de la categoría; apagado = gris.
                    const NOMBRES_BONOS = ['Antigüedad', 'Nostalgia', 'Complejidad', 'Descubrimiento único', 'Arte Visual'];
                    const CAMPOS_BONOS = ['antiguedad', 'nostalgia', 'complejidad', 'descubrimiento', 'arte_visual'];
                    const puntosBonos = `<div class="flex items-center space-x-1">${CAMPOS_BONOS.map((k, i) => `<span class="w-[7px] h-[7px] rounded-full" title="${NOMBRES_BONOS[i]}" style="background:${c[k] ? colorBase : '#374151'}"></span>`).join('')}</div>`;
                    // Barra de progreso al pie de la fila: ancho = nota/20.
                    const barraProgreso = nota > 0 ? `<div class="absolute h-[3px]" style="bottom:6px;left:0;width:${(nota / 20 * 100).toFixed(1)}%;background:${colorBase};box-shadow:0 0 8px ${glow}"></div>` : '';

                    return `
                        <div id="row-${c.id}" onclick="seleccionarTarget(${c.id})" onkeydown="if(event.key==='Enter'&&event.target===this)seleccionarTarget(${c.id})" tabindex="0" class="cancion-row relative overflow-hidden flex flex-col justify-center p-3 border-2 ${isActive} ${nota > 0 && rank <= 10 ? 'halo-dorado' : ''} ${animacionEntradaLista ? 'sin-animacion' : ''} hover:brightness-125 hover:translate-x-1 transition group cursor-pointer rounded-xl" style="${cGlow};animation-delay:${animacionEntradaLista ? 0 : Math.min(index * 30, 450)}ms">
                            <div class="flex justify-between items-center w-full">
                            <div class="flex items-center space-x-2 min-w-0 pr-2">
                                <span class="text-xs font-bold w-6 flex-shrink-0" style="${nota > 0 ? `color:${colorBase}` : 'color:#6b7280'}">${mostrarRank ? "#" + rank : ""}</span>
                                <div class="min-w-0">
                                    <h3 class="font-bold text-xs uppercase text-gray-100 break-words leading-snug">${escapeHtml(c.titulo)} ${tagBadge}</h3>
                                    <p class="text-[13px] text-gray-300 uppercase truncate mt-0.5">${escapeHtml(textoArtistas(c))}</p>
                                    <div class="flex items-center space-x-2 mt-1">
                                        ${genBadge}
                                        ${puntosBonos}
                                    </div>
                                </div>
                            </div>
                                <div class="border ${cBox} px-2.5 py-1 text-right min-w-[55px] rounded flex-shrink-0">
                                    ${metrica ? `<span class="text-[11px] text-gray-400 block">${metrica[0]}</span>` : ''}
                                    <span class="font-bold text-lg" style="${cText}">${p}</span>${c.calificacion_final > 0 ? '<span class="text-gray-400 text-[11px]">/' + (metrica ? metrica[1] : 20) + '</span>' : ''}
                                </div>
                            </div>
                            <div class="row-acciones hidden focus-within:flex justify-end gap-2 mt-2">
                                <button onclick="event.stopPropagation(); openEditModal(${c.id})" aria-label="Editar ${escapeHtml(c.titulo)}" class="text-yellow-400 hover:text-yellow-300 text-xs font-bold uppercase px-3 py-3 min-h-[44px] min-w-[44px]">Editar</button>
                                <button onclick="event.stopPropagation(); eliminarCancion(${c.id})" aria-label="Eliminar ${escapeHtml(c.titulo)}" class="text-red-400 hover:text-red-300 text-xs font-bold uppercase px-3 py-3 min-h-[44px] min-w-[44px]">Eliminar</button>
                            </div>
                            ${barraProgreso}
                        </div>
                    `;
                }).join('');

                document.getElementById('lista_canciones').innerHTML = htmlCanciones || `<p class="text-gray-400 text-xs uppercase p-4 text-center">> SIN RESULTADOS</p>`;
                if(cancionesGlobal.length > 0) {
                    document.getElementById('lista_canciones').innerHTML += `
                        <div class="flex justify-between items-center mt-3 pt-3 border-t border-sky-900 text-xs text-sky-500 font-bold uppercase">
                            <button onclick="irPagina(${data.pagina_actual - 1})" ${data.pagina_actual <= 1 ? 'disabled' : ''} class="${data.pagina_actual <= 1 ? 'invisible' : ''} hover:text-sky-300 p-1 min-h-[44px] px-2 disabled:cursor-not-allowed"><< ANT</button>
                            <span>PÁG ${data.pagina_actual} / ${data.total_paginas || 1} · ${(data.pagina_actual - 1) * 50 + 1}-${Math.min(data.total_canciones, data.pagina_actual * 50)} DE ${data.total_canciones}</span>
                            <button onclick="irPagina(${data.pagina_actual + 1})" ${data.pagina_actual >= data.total_paginas ? 'disabled' : ''} class="${data.pagina_actual >= data.total_paginas ? 'invisible' : ''} hover:text-sky-300 p-1 min-h-[44px] px-2 disabled:cursor-not-allowed">SIG >></button>
                        </div>
                    `;
                }
                animacionEntradaLista = true;
                igualarFilas();
                ocultarSplash();
            } catch (e) { console.error('[Evaluador] cargarCatalogo:', e); document.getElementById('barra-carga').classList.add('hidden'); document.getElementById('lista_canciones').innerHTML = '<p class="text-red-400 text-xs p-4 text-center">> No se pudo cargar el catálogo. Revisa tu conexión y vuelve a intentarlo.</p><div class="text-center"><button onclick="cargarCatalogo(1)" class="text-xs text-sky-300 border border-sky-500 px-4 py-2 rounded-full hover:border-sky-300 min-h-[44px]">REINTENTAR</button></div>'; toastLectura(e); ocultarSplash(); }
        }

        // Quita espacios de los extremos y colapsa los dobles de en medio.
        function normalizarTexto(s) { return (s || '').trim().replace(/\s+/g, ' '); }
        function claveCancion(t, a) { return normalizarTexto(t).toLowerCase() + ' || ' + normalizarTexto(a).toLowerCase(); }

        let timerDuplicado = null, duplicadoId = null;
        let artistasCompletos = false, cargandoArtistas = false;
        // Autocompletado con TODOS los artistas (no solo la pagina visible):
        // se carga una sola vez, al enfocar el campo de artista. Usa
        // /api/artistas (principales e invitados); si el endpoint no existe
        // todavía (backend viejo), se usa el export, como antes.
        async function cargarArtistasCompletos() {
            if (artistasCompletos || cargandoArtistas) return;
            cargandoArtistas = true;
            try {
                const res = await fetchConTimeout(API_ARTISTAS);
                if (!res.ok) throw errorHttp(res, API_ARTISTAS);
                const { artistas } = await res.json();
                // E17: completo solo si la lista llegó con datos.
                if (!Array.isArray(artistas) || !artistas.length) throw new Error('lista de artistas vacía en GET ' + API_ARTISTAS);
                const dl = document.getElementById('lista-artistas');
                if (dl) dl.innerHTML = artistas.map(a => `<option value="${escapeHtml(a.nombre)}">`).join('');
                artistasCompletos = true;
            } catch (e) {
                try {
                    const res = await fetchConTimeout(`${API_URL}/exportar`);
                    if (!res.ok) { console.warn('[Evaluador] cargarArtistasCompletos: respaldo sin artistas (HTTP ' + res.status + ' en GET ' + API_URL + '/exportar)', e); return; }
                    const { canciones } = await res.json();
                    const lista = [...new Set((canciones || []).map(c => c.artista))].filter(Boolean);
                    if (!lista.length) { console.warn('[Evaluador] cargarArtistasCompletos: respaldo sin artistas (lista vacia en GET ' + API_URL + '/exportar)', e); return; }
                    const dl = document.getElementById('lista-artistas');
                    if (dl) dl.innerHTML = lista.map(a => `<option value="${escapeHtml(a)}">`).join('');
                    artistasCompletos = true;
                } catch (e2) { console.warn('[Evaluador] cargarArtistasCompletos: ambas fuentes fallaron (GET ' + API_ARTISTAS + ' + GET ' + API_URL + '/exportar; sin conexion: se queda la lista de la pagina actual)', e, e2); }
            }
            finally { cargandoArtistas = false; }
        }
        // Avisa mientras escribes si la cancion ya existe (1) y si el artista
        // ya existe escrito con otra capitalizacion (4). Busca en el catalogo
        // con el endpoint de busqueda, no solo en la pagina que se ve.
        function revisarDuplicado() {
            clearTimeout(timerDuplicado);
            document.getElementById('aviso-duplicado').classList.add('hidden');
            document.getElementById('aviso-artista').classList.add('hidden');
            duplicadoId = null;
            const titulo = normalizarTexto(document.getElementById('titulo').value);
            const artista = normalizarTexto(document.getElementById('artista').value);
            if (titulo.length < 2 || artista.length < 2) return;
            timerDuplicado = setTimeout(async () => {
                // Si el usuario siguió escribiendo, estos resultados ya son
                // de otro título/artista: no mostrar nada (auditoría G, ronda 1).
                const busquedaActual = titulo + '|' + artista;
                const sigueVigente = () => normalizarTexto(document.getElementById('titulo').value) + '|' + normalizarTexto(document.getElementById('artista').value) === busquedaActual;
                // Se busca por titulo Y por artista: con solo el titulo,
                // la sugerencia de capitalizacion no salia si la cancion
                // era nueva (el artista ya existe, el titulo no).
                // El backend ya busca en titulo o artista (?buscar=).
                // La búsqueda devuelve 50 por página y el duplicado puede
                // quedar más allá de la primera (antes solo se miraba la
                // página 1: con un título o artista común el aviso no salía
                // y el usuario solo se enteraba al enviar, con el 409).
                // Se recorren las páginas hasta encontrarlo, con tope para
                // no lanzar decenas de peticiones si no hay duplicado.
                const buscarPaginas = async (termino, maxPaginas, esDuplicado) => {
                    let canciones = [];
                    for (let p = 1; p <= maxPaginas; p++) {
                        if (!sigueVigente()) return null;
                        let r;
                        try { r = await fetchConTimeout(`${API_URL}?buscar=${encodeURIComponent(termino)}&pagina=${p}`); }
                        catch (e) { console.warn('[Evaluador] revisarDuplicado (buscarPaginas): sin conexion en GET ' + API_URL + '?buscar=' + encodeURIComponent(termino) + '&pagina=' + p, e); return canciones; }
                        if (!r.ok) return canciones;
                        let d;
                        try { d = await r.json(); }
                        catch (e) { console.warn('[Evaluador] revisarDuplicado (buscarPaginas): JSON inválido en GET ' + API_URL + '?buscar=' + encodeURIComponent(termino) + '&pagina=' + p, e); return canciones; }
                        canciones.push(...(d.canciones || []));
                        if (esDuplicado && canciones.some(esDuplicado)) break;
                        if (p >= (d.total_paginas || 1)) break;
                    }
                    return canciones;
                };
                try {
                    const clave = claveCancion(titulo, artista);
                    const esDup = c => claveCancion(c.titulo, c.artista) === clave;
                    const porTitulo = await buscarPaginas(titulo, 10, esDup);
                    if (porTitulo === null) return;
                    let dup = porTitulo.find(esDup);
                    let vistas = new Map(porTitulo.map(c => [c.id, c]));
                    if (!dup) {
                        const porArtista = await buscarPaginas(artista, 5, esDup);
                        if (porArtista === null) return;
                        for (const c of porArtista) vistas.set(c.id, c);
                        dup = [...vistas.values()].find(esDup);
                    }
                    if (!sigueVigente()) return;
                    if (dup) {
                        duplicadoId = dup.id;
                        document.getElementById('duplicado-nombre').textContent = `${dup.titulo} — ${textoArtistas(dup)}`;
                        document.getElementById('aviso-duplicado').classList.remove('hidden');
                        return;
                    }
                    const mismoArtista = [...vistas.values()].find(c => c.artista.toLowerCase() === artista.toLowerCase() && c.artista !== artista);
                    if (mismoArtista) {
                        document.getElementById('artista-sugerido').textContent = mismoArtista.artista;
                        document.getElementById('aviso-artista').classList.remove('hidden');
                    }
                } catch (e) { console.warn('[Evaluador] revisarDuplicado:', e); /* sin conexion: no se avisa con toast, el envio dira el error */ }
            }, 400);
        }
        function usarArtistaSugerido() {
            document.getElementById('artista').value = document.getElementById('artista-sugerido').textContent;
            document.getElementById('aviso-artista').classList.add('hidden');
            revisarDuplicado();
        }
        async function irADuplicado() {
            if (!duplicadoId) return;
            // La búsqueda del duplicado no debe heredar el filtro de género
            // ni el de rango: el duplicado puede ser de otro género o nota
            // y si no, no se encuentra aunque exista (auditoría G, ronda 2).
            document.getElementById('filtro-genero').value = 'todos';
            rangoFiltro = null; rangoActivo = null;
            const bQR = document.getElementById('quitar-rango'); if (bQR) bQR.classList.add('hidden');
            pintarChips();
            document.getElementById('input-buscar').value = normalizarTexto(document.getElementById('titulo').value);
            await cargarCatalogo(1);
            let song = cancionesGlobal.find(c => c.id === duplicadoId);
            // La búsqueda por título puede devolver más de 50 canciones y el
            // duplicado quedar en otra página: se recorren las páginas hasta
            // encontrarlo. Antes solo avisaba "NO SE ENCONTRÓ EN ESTA PÁGINA".
            for (let p = 2; !song && p <= totalPaginasGlobal; p++) {
                await cargarCatalogo(p);
                song = cancionesGlobal.find(c => c.id === duplicadoId);
            }
            if (song) { seleccionarTarget(duplicadoId); if (window.innerWidth < 768) switchTab('rub'); }
            else showToast("NO SE ENCONTRÓ EL DUPLICADO", true);
        }

        async function agregarCancion(seguir = false) {
            const titulo = normalizarTexto(document.getElementById('titulo').value);
            const artista = normalizarTexto(document.getElementById('artista').value);
            const genero = document.getElementById('reg-genero').value;
            const etiqueta = document.getElementById('reg-etiqueta').value;
            const instrumental = document.getElementById('reg-instrumental').checked;
            const banda_sonora = document.getElementById('reg-banda-sonora').checked;
            const invitados = parsearListaArtistas(document.getElementById('reg-invitados').value);
            const productores = parsearListaArtistas(document.getElementById('reg-productor').value);

            if(!titulo || !artista) { showToast("LLENA TÍTULO Y ARTISTA", true); return; }
            if(!genero) { showToast("ELIGE UN GÉNERO", true); return; }
            showToast('GUARDANDO…');

            const btn = document.getElementById('btn-agregar'), btnSeguir = document.getElementById('btn-agregar-seguir');
            btn.disabled = true; btnSeguir.disabled = true;
            const textoBtn = btn.innerText; btn.innerText = 'Guardando…';
            try {
                const res = await apiFetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({titulo, artista, genero, etiqueta, instrumental, banda_sonora, artistas: construirArtistas(artista, invitados, productores)}) });

                if (res.status === 409) {
                    await mostrarErrorHttp(res, "ERROR: LA CANCIÓN YA EXISTE");
                    revisarDuplicado();
                    return;
                }

                if(res.ok) {
                    // E10: si el JSON no trae un id numérico, la operación
                    // se trata como éxito con recarga del catálogo.
                    let data = null;
                    try { data = await res.json(); } catch (e) { console.warn('[Evaluador] agregarCancion (JSON en POST ' + API_URL + '):', e); }
                    document.getElementById('titulo').value = '';
                    document.getElementById('artista').value = '';
                    document.getElementById('reg-genero').value = ''; // la 3: NO se conserva el genero
                    document.getElementById('reg-invitados').value = '';
                    document.getElementById('reg-productor').value = '';
                    document.getElementById('reg-instrumental').checked = false;
                    document.getElementById('reg-banda-sonora').checked = false;
                    document.getElementById('aviso-duplicado').classList.add('hidden');
                    document.getElementById('aviso-artista').classList.add('hidden');
                    showToast("CANCIÓN REGISTRADA"); statsListas = false; cargarGeneros(); cargarHistograma();

                    if (seguir) { document.getElementById('titulo').focus(); cargarEstadisticas(); return; }
                    await cargarCatalogo(1);
                    if (!data || typeof data.id !== 'number') return; // sin id válido no se puede seleccionar
                    // La cancion nueva no tiene nota y con orden Top queda al
                    // final, fuera de la pagina 1: se mete en la lista local
                    // para que seleccionarTarget la encuentre y quede lista.
                    cancionesGlobal.unshift({ id: data.id, titulo, artista, artistas: construirArtistas(artista, invitados, productores), genero, etiqueta, calificacion_final: 0, ritmo: null, letras: null, coro: null, importancia: null, arte_visual: 0, antiguedad: false, nostalgia: false, descubrimiento: false, complejidad: false, instrumental, banda_sonora, rank_global: null });
                    seleccionarTarget(data.id);
                    if (window.innerWidth < 768) switchTab('rub');
                } else {
                    await mostrarErrorHttp(res, "ERROR AL REGISTRAR LA CANCIÓN");
                }
            } catch (e) {
                console.error('[Evaluador] agregarCancion: POST', API_URL, e);
                showToast(MSG_SIN_CONEXION, true);
            } finally {
                btn.disabled = false; btnSeguir.disabled = false; btn.innerText = textoBtn;
            }
        }

        async function calificarCancion() {
            const id = parseInt(document.getElementById('id_cancion').value);
            if(!id || id <= 0) { showToast("SELECCIONA UNA CANCIÓN PRIMERO", true); return; }
            showToast('GUARDANDO…');

            // E9: el botón se deshabilita durante su petición, como ya se
            // hace con los botones de agregar.
            const btnCalificar = document.getElementById('btn-calificar');
            if (btnCalificar) btnCalificar.disabled = true;

            try {
                // El cuerpo se construye DENTRO del try (ronda 4): antes
                // estaba entre el disabled y el try, y si leer un slider
                // lanzaba, el botón quedaba deshabilitado para siempre (el
                // finally no corría) sin ningún aviso.
                const body = {
                    ritmo: parseFloat(document.getElementById('ritmo').value),
                    letras: parseFloat(document.getElementById('letras').value),
                    coro: parseFloat(document.getElementById('coro').value),
                    importancia: parseFloat(document.getElementById('importancia').value),
                    arte_visual: document.getElementById('arte_visual').checked ? 1.0 : 0.0,
                    antiguedad: document.getElementById('antiguedad').checked,
                    nostalgia: document.getElementById('nostalgia').checked,
                    complejidad: document.getElementById('complejidad').checked,
                    descubrimiento_terceros: document.getElementById('descubrimiento_unico').checked
                };
                const res = await apiFetch(`${API_URL}/${id}/calificar`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
                if(res.ok) { 
                    showToast("EVALUACIÓN GUARDADA"); statsListas = false; cargarGeneros(); cargarHistograma(); 
                    limpiarFormulario(); 
                    if(window.innerWidth < 768) switchTab('cat');
                } else { 
                    await mostrarErrorHttp(res, "ERROR AL GUARDAR");
                }
            } catch (e) {
                console.error('[Evaluador] calificarCancion: PUT', API_URL + '/' + id + '/calificar', e);
                showToast(MSG_SIN_CONEXION, true);
            } finally {
                if (btnCalificar) btnCalificar.disabled = false;
            }
        }

        // Un solo punto para abrir el modal: titulo, clase del boton, contenido
        // y que hacer al confirmar. Antes editar y eliminar copiaban esto.
        function abrirModal({ titulo, claseBoton, contenido, alConfirmar }) {
            document.getElementById('modal-title').innerText = titulo;
            const btnConfirm = document.getElementById('modal-confirm-btn');
            // claseBoton reemplaza TODAS las clases: sin esto, el botón
            // perdía el min-h-[44px] que trae en el HTML (auditoría G, ronda 2).
            btnConfirm.className = claseBoton + ' min-h-[44px]';
            btnConfirm.innerText = 'CONFIRMAR';
            btnConfirm.disabled = false;
            document.getElementById('modal-content').innerHTML = contenido;
            document.getElementById('custom-modal').classList.remove('hidden');
            (document.querySelector('#modal-content input') || document.getElementById('modal-confirm-btn')).focus();
            // E8 (auditoría ronda 1): el modal solo se cierra si la
            // confirmación tuvo éxito; si la validación o el PUT fallan,
            // queda abierto con los valores del formulario para reintentar.
            modalResolve = async (result) => {
                if (result) {
                    let exito = false;
                    try { exito = await alConfirmar(); } catch (e) { console.error('[Evaluador] abrirModal (confirmar):', e); }
                    if (!exito) {
                        const b = document.getElementById('modal-confirm-btn');
                        if (b) { b.disabled = false; b.innerText = 'CONFIRMAR'; }
                        return;
                    }
                }
                modalResolve = null;
                document.getElementById('custom-modal').classList.add('hidden');
            };
        }

        function openEditModal(id) {
            const song = cancionesGlobal.find(c => c.id === id);
            if (!song) return;

            // Si la canción tiene un género heredado (Hip Hop, Otro, OST: 79
            // canciones hasta la fase DB), se ofrece como opción marcada
            // "(actual)" para que se vea y se pueda guardar sin cambiarlo
            // (auditoría G, ronda 1: antes no había opción seleccionada y
            // guardar devolvía 400 "Género inválido"). Nunca se ofrece para
            // cambiar A un heredado: solo se mantiene el que ya tiene.
            const genOpts = [...GENEROS, ...(GENEROS.some(([v]) => v === song.genero) ? [] : [[song.genero, song.genero + ' (actual)']])]
                .map(([v, n]) => `<option value="${escapeHtml(v)}" ${song.genero === v ? 'selected' : ''}>${escapeHtml(n)}</option>`).join('');
            const tagOpts = ETIQUETAS
                .map(([v, n]) => `<option value="${v}" ${song.etiqueta === v ? 'selected' : ''}>${n}</option>`).join('');

            const genNombre = (GENEROS.find(([v]) => v === song.genero) || [null, song.genero])[1];
            const notaTxt = song.calificacion_final > 0 ? `Nota guardada: ${song.calificacion_final.toFixed(2)} · ${escapeHtml(genNombre)}` : `Sin calificar · ${escapeHtml(genNombre)}`;
            // Invitados y productor actuales (el productor solo se ve aquí,
            // nunca en la fila): se editan como listas separadas por coma.
            const invitadosActuales = (song.artistas || []).filter(a => a.rol === 'invitado').map(a => a.nombre).join(', ');
            const productoresActuales = (song.artistas || []).filter(a => a.rol === 'productor').map(a => a.nombre).join(', ');
            abrirModal({
                titulo: `EDITAR CANCIÓN`,
                claseBoton: "btn-atardecer px-4 py-2 uppercase font-bold text-xs rounded",
                contenido: `
                <p class="text-[11px] text-gray-400">${notaTxt}</p>
                <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Título</label>
                <input id="mod-1" type="text" maxlength="200" value="${escapeHtml(song.titulo)}" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase" placeholder="TÍTULO"></div>
                <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Artista</label>
                <input id="mod-2" type="text" maxlength="200" value="${escapeHtml(song.artista)}" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase" placeholder="ARTISTA"></div>
                <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Artistas invitados (coma)</label>
                <input id="mod-7" type="text" maxlength="200" value="${escapeHtml(invitadosActuales)}" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase" placeholder="INVITADO1, INVITADO2"></div>
                <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Productor (opcional)</label>
                <input id="mod-8" type="text" maxlength="200" value="${escapeHtml(productoresActuales)}" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase" placeholder="PRODUCTOR"></div>
                <div class="grid grid-cols-2 gap-2">
                    <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Género</label>
                    <select id="mod-3" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase">${genOpts}</select></div>
                    <div><label class="block text-[11px] text-sky-500 uppercase tracking-widest mb-1">Tipo de versión</label>
                    <select id="mod-4" class="w-full p-2.5 bg-[#0f1a36] text-sky-300 border border-sky-900 text-xs rounded uppercase">${tagOpts}</select></div>
                </div>
                <div class="grid grid-cols-2 gap-2 mt-3">
                    <label class="flex items-center space-x-2 text-gray-300 text-xs py-1 cursor-pointer"><input type="checkbox" id="mod-5" class="w-4 h-4 accent-sky-500" ${song.instrumental ? 'checked' : ''}> <span>Instrumental</span></label>
                    <label class="flex items-center space-x-2 text-gray-300 text-xs py-1 cursor-pointer"><input type="checkbox" id="mod-6" class="w-4 h-4 accent-amber-500" ${song.banda_sonora ? 'checked' : ''}> <span>Banda sonora</span></label>
                </div>
            `,
                alConfirmar: async () => {
                    const data = {
                        titulo: document.getElementById('mod-1').value.trim(),
                        artista: document.getElementById('mod-2').value.trim(),
                        genero: document.getElementById('mod-3').value,
                        etiqueta: document.getElementById('mod-4').value,
                        instrumental: document.getElementById('mod-5').checked,
                        banda_sonora: document.getElementById('mod-6').checked,
                        artistas: construirArtistas(
                            document.getElementById('mod-2').value.trim(),
                            parsearListaArtistas(document.getElementById('mod-7').value),
                            parsearListaArtistas(document.getElementById('mod-8').value))
                    };
                    if (!data.titulo || !data.artista) {
                        showToast("TÍTULO Y ARTISTA NO PUEDEN QUEDAR VACÍOS", true);
                        return false;
                    }
                    const b = document.getElementById('modal-confirm-btn');
                    b.disabled = true; b.innerText = 'GUARDANDO…';
                    try {
                        const res = await apiFetch(`${API_URL}/${id}/info`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
                        if (res.ok) {
                            showToast("DATOS ACTUALIZADOS");
                            cargarGeneros(); // el cambio de genero mueve promedios y chips
                            cargarCatalogo(paginaActualGlobal);
                            // Si la cancion editada es la seleccionada en Evaluar, su caja
                            // y su contexto quedarian con los datos viejos: se actualizan
                            // sin re-seleccionar (seleccionarCancion mostraria otro toast
                            // y cambiaria de pestana en celular).
                            if (idSeleccionadoGlobal === id) {
                                document.getElementById('cancion-activa').innerText = `${data.titulo} — ${textoArtistas({ artista: data.artista, artistas: data.artistas })}`;
                                const nombreGenero = MAP_GENEROS[data.genero] || data.genero;
                                const nombreTipo = MAP_ETIQUETAS[data.etiqueta] || data.etiqueta;
                                const notaSel = song.calificacion_final > 0 ? `Nota guardada: ${song.calificacion_final.toFixed(2)}` : 'Sin calificar';
                                document.getElementById('cancion-contexto').innerText = `${nombreGenero} · ${nombreTipo}${data.instrumental ? ' · Instrumental' : ''}${data.banda_sonora ? ' · Banda sonora' : ''} · ${notaSel}`;
                            }
                            return true;
                        }
                        await mostrarErrorHttp(res, "ERROR AL ACTUALIZAR");
                        return false;
                    } catch (e) { console.error('[Evaluador] openEditModal: PUT', API_URL + '/' + id + '/info', e); showToast(MSG_SIN_CONEXION, true); return false; }
                }
            });
        }

        async function eliminarCancion(id) {
            const song = cancionesGlobal.find(c => c.id === id);
            if (!song) return;
            abrirModal({
                titulo: `¿ELIMINAR ESTA CANCIÓN?`,
                claseBoton: "bg-red-800 hover:bg-red-600 text-white px-4 py-2 uppercase text-xs font-bold rounded",
                contenido: `<p class="text-gray-300 text-xs mb-1">Vas a eliminar:</p>
                    <p class="text-white font-bold text-sm">${escapeHtml(song.titulo)}</p>
                    <p class="text-gray-400 text-xs mb-2">${escapeHtml(textoArtistas(song))}</p>
                    <p class="text-red-400 uppercase text-xs">¿Eliminarla permanentemente de la nube?</p>`,
                alConfirmar: async () => {
                    const b = document.getElementById('modal-confirm-btn');
                    b.disabled = true; b.innerText = 'ELIMINANDO…';
                    try {
                        const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            showToast("CANCIÓN ELIMINADA"); cargarGeneros(); cargarHistograma(); statsListas = false;
                            if(idSeleccionadoGlobal === id) limpiarFormulario();
                            else cargarCatalogo(paginaActualGlobal);
                            return true;
                        }
                        await mostrarErrorHttp(res, "ERROR AL ELIMINAR");
                        return false;
                    } catch (e) { console.error('[Evaluador] eliminarCancion: DELETE', API_URL + '/' + id, e); showToast(MSG_SIN_CONEXION, true); return false; }
                }
            });
        }

        function showToast(m, err=false) {
            const c = document.getElementById('toast-container'); const t = document.createElement('div');
            t.className = `bg-[#0f1a36] border-l-4 ${err ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'} p-3 shadow-lg toast-enter min-w-[200px] uppercase text-xs font-bold rounded`;
            t.innerHTML = `> ${escapeHtml(m)}`; c.appendChild(t);
            setTimeout(() => { t.classList.replace('toast-enter', 'toast-exit'); setTimeout(() => t.remove(), 500); }, 2500);
        }

        function closeModal(r) { if(modalResolve) modalResolve(r); }

        window.onload = () => {
            vigilarSliders();
            actualizarValores(); 
            poblarGeneros(); restaurarFiltros(); pintarChips(); cargarHistograma(); cargarGeneros(); document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(false); });
            if (window.innerWidth < 768) switchTab('cat');
            cargarCatalogo(1); 
        };
    

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(e => console.warn('[Evaluador] Service Worker:', e));
