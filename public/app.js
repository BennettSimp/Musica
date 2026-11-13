        const API_URL = "https://clasificacion-de-musica.onrender.com/api/canciones";
        let paginaActualGlobal = 1;
        let idSeleccionadoGlobal = null;
        let cancionesGlobal = []; 
        let modalResolve = null;
        let searchTimeout = null;
        let reqActual = 0, avisoTimer = null, statsListas = false;

    
        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
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
            } catch (e) {}
        }

        function restaurarFiltros() {
            try {
                const guardado = JSON.parse(localStorage.getItem('musica_filtros'));
                if (guardado) {
                    document.getElementById('input-buscar').value = guardado.buscar || '';
                    document.getElementById('select-orden').value = guardado.orden || 'top';
                    document.getElementById('filtro-genero').value = guardado.genero || 'todos';
                }
            } catch (e) {}
        }

        function switchTab(tab) {
            if (window.innerWidth >= 768) return;
            const ids = { cat: 'section-catalogo', rub: 'section-rubrica', reg: 'section-registro', rad: 'section-radar' };
            Object.entries(ids).forEach(([k, id]) => {
                document.getElementById(id).classList.toggle('hidden', k !== tab);
                const b = document.getElementById('tab-btn-' + k);
                b.className = 'flex-1 py-2.5 text-center border-r border-cyan-900 last:border-r-0 ' + (k === tab ? 'bg-cyan-950 text-cyan-300 font-bold' : 'bg-black text-gray-400');
                b.setAttribute('aria-selected', k === tab);
            });
            if (tab === 'rad') cargarRadar();
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
        }

        function limpiarFormulario(recargar = true) {
            document.querySelectorAll('.active-song').forEach(el => el.classList.remove('active-song'));
            idSeleccionadoGlobal = null;
            document.getElementById('id_cancion').value = ''; document.getElementById('cancion-activa').innerText = SIN_SELECCION;
            document.getElementById('ritmo').value = 5; 
            document.getElementById('letras').value = 5;
            document.getElementById('coro').value = 5; 
            document.getElementById('importancia').value = 2.5;
            ['antiguedad', 'nostalgia', 'complejidad', 'recomendacion', 'arte_visual'].forEach(id => document.getElementById(id).checked = false);
            actualizarValores();
            if (recargar) cargarCatalogo(paginaActualGlobal);
        }

        // PRECARGA DE CALIFICACIONES PREVIAS
        function seleccionarTarget(id) {
            idSeleccionadoGlobal = id;
            document.getElementById('id_cancion').value = id;
            
            const song = cancionesGlobal.find(x => x.id === id);
            if(song) {
                document.getElementById('ritmo').value = song.ritmo;
                document.getElementById('letras').value = song.letras;
                document.getElementById('coro').value = song.coro;
                document.getElementById('importancia').value = song.importancia;
                document.getElementById('antiguedad').checked = song.antiguedad;
                document.getElementById('nostalgia').checked = song.nostalgia;
                document.getElementById('complejidad').checked = song.complejidad;
                document.getElementById('recomendacion').checked = song.descubrimiento;
                document.getElementById('arte_visual').checked = song.arte_visual > 0;
            }
            actualizarValores();

            document.querySelectorAll('.cancion-row').forEach(el => el.classList.remove('active-song'));
            const activeRow = document.getElementById(`row-${id}`);
            if(activeRow) activeRow.classList.add('active-song');
            
            document.getElementById('cancion-activa').innerText = song ? `${song.titulo} — ${song.artista}` : '';
            showToast('CANCIÓN SELECCIONADA');
            if (window.innerWidth < 768) switchTab('rub');
        }

        const GENEROS = [['Pop','Pop'],['Rock','Rock'],['Electronica','Electrónica'],['Hip Hop','Hip Hop'],['Rap','Rap'],['Trap','Trap'],['Metal','Metal'],['Clasica','Clásica'],['Latino','Latino'],['Salsa','Salsa'],['Cumbia','Cumbia'],['Corridos','Corridos'],['Banda','Banda'],['Romanticas','Románticas'],['Baladas','Baladas'],['Reggaeton','Reguetón'],['Phonk','Phonk'],['Instrumental','Instrumental'],['Alternativo','Alternativo'],['Asiatica','Música asiática'],['OST','Banda sonora'],['Otro','Otro']];
        const METRICAS = { ritmo: ['RITMO', 10], letras: ['LETRAS', 10], coro: ['CORO', 10], importancia: ['IMPORT.', 5] };
        const CHIP = 'flex-shrink-0 px-3 py-1.5 rounded-full border text-xs whitespace-nowrap ';
        const CHIP_ON = 'bg-cyan-900 text-cyan-100 border-cyan-400', CHIP_OFF = 'bg-black text-gray-300 border-cyan-900 hover:border-cyan-600';
        let radarPor = 'general';

        function poblarGeneros() {
            const s = document.getElementById('reg-genero');
            s.innerHTML = GENEROS.map(([v, n]) => `<option value="${v}">${n}</option>`).join(''); s.value = 'Otro';
        }
        function pintarChips() {
            const act = document.getElementById('filtro-genero').value;
            document.getElementById('chips-genero').innerHTML = [['todos', 'Todos'], ...GENEROS].map(([v, n]) =>
                `<button onclick="elegirGenero('${v}')" aria-pressed="${v === act}" class="${CHIP}${v === act ? CHIP_ON : CHIP_OFF}">${n}</button>`).join('');
        }
        function elegirGenero(v) { document.getElementById('filtro-genero').value = v; pintarChips(); cargarCatalogo(1); }
        function puntaje(c) { return (radarPor === 'general' || radarPor === 'comparar') ? c.calificacion_final : c[radarPor]; }
        function escalaRadar() { return (radarPor === 'general' || radarPor === 'comparar') ? 20 : radarPor === 'importancia' ? 5 : 10; }
        function pintarRadarBtns() {
            document.getElementById('radar-criterio').innerHTML = [['general', 'General'], ['ritmo', 'Ritmo'], ['letras', 'Letras'], ['coro', 'Coro'], ['importancia', 'Importancia'], ['comparar', 'Comparar']].map(([v, n]) =>
                `<button onclick="setRadar('${v}')" aria-pressed="${v === radarPor}" class="${CHIP}${v === radarPor ? CHIP_ON : CHIP_OFF}">${n}</button>`).join('');
        }
        function setRadar(p) { radarPor = p; pintarRadarBtns(); cargarRadar(); }

        const SIN_SELECCION = 'Selecciona una canción en el catálogo';
        const comparadas = new Map(); // id -> canción marcada para el radar comparativo (máx. 3)
        function alternarComparar(id, el) {
            if (comparadas.has(id)) comparadas.delete(id);
            else {
                const s = cancionesGlobal.find(x => x.id === id);
                if (!s) return;
                if (comparadas.size >= 3) { el.checked = false; showToast('MÁXIMO 3 CANCIONES EN EL RADAR', true); return; }
                comparadas.set(id, s);
            }
            showToast(`COMPARANDO ${comparadas.size}/3`);
            radarPor = 'comparar'; pintarRadarBtns(); cargarRadar();
        }

        async function cargarGeneros() {
            const ul = document.getElementById('generos-stats');
            try {
                const res = await fetch(`${API_URL}/generos`);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const { generos } = await res.json();
                const nombres = Object.fromEntries(GENEROS);
                ul.innerHTML = generos.map(g => `<li><div class="flex justify-between gap-2"><span class="text-gray-200">${escapeHtml(nombres[g.genero] || g.genero)}</span><span class="text-gray-400">${g.promedio.toFixed(1)}/20 · ${g.total} canc.</span></div><div class="h-1.5 bg-gray-900 rounded mt-1"><div class="h-1.5 bg-cyan-500 rounded" style="width:${Math.min(100, g.promedio / 20 * 100)}%"></div></div></li>`).join('') || '<li class="text-gray-400">Sin datos todavía.</li>';
            } catch (e) { ul.innerHTML = '<li class="text-red-400">No se pudo cargar.</li>'; }
        }

        async function exportar(formato) {
            try {
                const res = await fetch(`${API_URL}/exportar`);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const { canciones } = await res.json();
                let contenido, tipo;
                if (formato === 'json') { contenido = JSON.stringify(canciones, null, 2); tipo = 'application/json'; }
                else {
                    const cols = Object.keys(canciones[0] || { id: 0 });
                    const cel = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"'; };
                    contenido = '\ufeff' + [cols.join(','), ...canciones.map(c => cols.map(k => cel(c[k])).join(','))].join('\r\n'); tipo = 'text/csv';
                }
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([contenido], { type: tipo + ';charset=utf-8' }));
                a.download = `canciones-${new Date().toISOString().slice(0, 10)}.${formato}`; a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                showToast('RESPALDO DESCARGADO');
            } catch (e) { showToast('NO SE PUDO EXPORTAR', true); }
        }

        let ocupado = false; // evita doble clic mientras se guarda
        async function conBloqueo(fn) { if (ocupado) return; ocupado = true; try { await fn(); } finally { ocupado = false; } }
        async function irPagina(n) { await cargarCatalogo(n); document.getElementById('section-catalogo').scrollIntoView({ behavior: 'smooth', block: 'start' }); }

        async function apiFetch(url, opts = {}, reintento = true) {
            let t = ''; try { t = localStorage.getItem('musica_token') || ''; } catch (e) {}
            const res = await fetch(url, { ...opts, headers: { ...(opts.headers || {}), 'X-Admin-Token': t } });
            if (res.status === 401 && !reintento) { try { localStorage.removeItem('musica_token'); } catch (e) {} showToast('CLAVE INCORRECTA', true); }
            if (res.status === 401 && reintento) {
                const n = prompt('Clave de administrador:');
                if (n) { try { localStorage.setItem('musica_token', n); } catch (e) {} return apiFetch(url, opts, false); }
            }
            return res;
        }

        // RADAR: ejes en escala 0-10 (importancia va de 0 a 5, se duplica)
        const RADAR_EJES = [['Ritmo', 'ritmo', 1], ['Letras', 'letras', 1], ['Coro', 'coro', 1], ['Importancia', 'importancia', 2]];
        const RADAR_COLORES = ['#facc15', '#d946ef', '#22d3ee', '#4ade80', '#fb923c'];
        async function cargarRadar() {
            const svg = document.getElementById('radar'), ley = document.getElementById('radar-leyenda');
            try {
                let canciones;
                if (radarPor === 'comparar') canciones = [...comparadas.values()];
                else {
                    const res = await fetch(`${API_URL}/top?n=5&por=${radarPor}`);
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    canciones = (await res.json()).canciones;
                }
                if (!canciones.length) { svg.innerHTML = ''; ley.innerHTML = `<li class="text-gray-400">${radarPor === 'comparar' ? 'Marca hasta 3 canciones con la casilla de cada fila.' : 'Califica canciones para ver el radar.'}</li>`; return; }
                const cx = 170, cy = 160, R = 105, n = RADAR_EJES.length;
                const ang = i => -Math.PI / 2 + i * 2 * Math.PI / n;
                const pt = (i, v) => [cx + R * v / 10 * Math.cos(ang(i)), cy + R * v / 10 * Math.sin(ang(i))];
                let g = '';
                [2, 4, 6, 8, 10].forEach(nv => { g += `<polygon points="${RADAR_EJES.map((_, i) => pt(i, nv).join(',')).join(' ')}" fill="none" stroke="#164e63"/>`; });
                RADAR_EJES.forEach(([nom], i) => {
                    const [x, y] = pt(i, 10), [lx, ly] = pt(i, 12.4);
                    g += `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#164e63"/><text x="${lx}" y="${ly}" fill="#a5f3fc" font-size="12" text-anchor="middle" dominant-baseline="middle">${nom}</text>`;
                });
                canciones.forEach((c, k) => {
                    const col = RADAR_COLORES[k % 5];
                    g += `<polygon points="${RADAR_EJES.map(([, key, f], i) => pt(i, Math.min(10, c[key] * f)).join(',')).join(' ')}" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>`;
                });
                svg.innerHTML = g;
                ley.innerHTML = canciones.map((c, k) => `<li class="flex items-start gap-2"><span class="mt-1 w-3 h-3 rounded-sm flex-shrink-0" style="background:${RADAR_COLORES[k % 5]}"></span><span class="text-gray-200 break-words">${escapeHtml(c.titulo)} <span class="text-gray-400">— ${escapeHtml(c.artista)}</span> <b class="text-yellow-400">${puntaje(c).toFixed(2)}</b><span class="text-gray-400">/${escalaRadar()}</span><br><span class="text-gray-400">Ritmo ${c.ritmo.toFixed(1)} · Letras ${c.letras.toFixed(1)} · Coro ${c.coro.toFixed(1)} · Importancia ${c.importancia.toFixed(1)}/5</span></span></li>`).join('');
            } catch (e) { ley.innerHTML = '<li class="text-red-400">No se pudo cargar el radar.</li>'; }
        }

        function debounceBuscar() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => cargarCatalogo(1), 300); }

        async function cargarEstadisticas() {
            try {
                const data = await (await fetch(`${API_URL}/stats`)).json();
                document.getElementById('stat-total').innerText = data.total; 
                document.getElementById('stat-promedio').innerText = data.promedio.toFixed(2);
                document.getElementById('stat-top').innerText = data.obras_maestras; 
                document.getElementById('stat-pending').innerText = data.sin_calificar;
            } catch(e) {}
        }

        async function cargarCatalogo(pagina = 1) {
            try {
                paginaActualGlobal = pagina;
                const busqueda = document.getElementById('input-buscar').value;
                const orden = document.getElementById('select-orden').value;
                const generoFiltro = document.getElementById('filtro-genero').value;
                guardarFiltros();

                document.getElementById('lista_canciones').innerHTML = `<p class="text-gray-400 text-xs uppercase p-4 text-center animate-pulse">> Cargando...</p>`;

                const miReq = ++reqActual; clearTimeout(avisoTimer);
                avisoTimer = setTimeout(() => { if (miReq === reqActual) document.getElementById('lista_canciones').innerHTML = '<p class="text-yellow-400 text-xs p-4 text-center">> Despertando el servidor, puede tardar hasta un minuto...</p>'; }, 4000);
                const res = await fetch(`${API_URL}?pagina=${pagina}&buscar=${encodeURIComponent(busqueda)}&orden=${orden}&genero=${encodeURIComponent(generoFiltro)}`);
                clearTimeout(avisoTimer);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                if (!statsListas) { statsListas = true; cargarEstadisticas(); }

                if (miReq !== reqActual) return;
                if (!data.canciones.length && pagina > 1) return cargarCatalogo(Math.max(1, data.total_paginas || 1));
                cancionesGlobal = data.canciones;
                let rankingInicio = (pagina - 1) * 50;
                const metrica = METRICAS[orden]; const mostrarRank = orden === 'top' || !!metrica;
                
                const htmlCanciones = cancionesGlobal.map((c, index) => {
                    const valor = metrica ? c[orden] : c.calificacion_final;
                    let p = c.calificacion_final > 0 ? valor.toFixed(2) : "N/A";
                    let cGlow, cText, cBox = "bg-gray-950 border-gray-800", cTitle = "text-gray-100";

                    // NUEVA CLASIFICACIÓN POR COLORES
                    if (c.calificacion_final >= 19.0) {
                        cGlow = "!border-l-8 ring-1 ring-yellow-400/70 shadow-[0_0_18px_rgba(250,204,21,0.55)] border-yellow-400 bg-gradient-to-r from-yellow-950/50 to-black";
                        cText = "text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.8)]"; cBox = "bg-yellow-950/40 border-yellow-500"; cTitle = "text-yellow-200";
                    } else if (c.calificacion_final >= 18.0) {
                        cGlow = "ring-1 ring-fuchsia-500/50 shadow-[0_0_12px_rgba(192,38,211,0.45)] border-fuchsia-500 bg-gradient-to-r from-fuchsia-950/40 to-black";
                        cText = "text-fuchsia-400"; cBox = "bg-fuchsia-950/40 border-fuchsia-500"; cTitle = "text-fuchsia-100";
                    } else if (c.calificacion_final > 0) {
                        cGlow = "border-cyan-700";
                        cText = "text-cyan-400";
                    } else {
                        cGlow = "border-gray-800 opacity-60";
                        cText = "text-gray-500";
                    }

                    let isActive = (idSeleccionadoGlobal === c.id) ? "active-song" : "";
                    
                    let tagBadge = c.etiqueta !== 'Original' ? `<span class="bg-indigo-900 text-indigo-300 text-[11px] px-1 py-0.5 rounded border border-indigo-700 ml-1">${escapeHtml(c.etiqueta)}</span>` : "";
                    let genBadge = `<span class="text-[11px] text-gray-500 border border-gray-800 px-1 rounded">${escapeHtml(c.genero)}</span>`;

                    return `
                        <div id="row-${c.id}" onclick="seleccionarTarget(${c.id})" onkeydown="if(event.key==='Enter'&&event.target===this)seleccionarTarget(${c.id})" tabindex="0" class="cancion-row bg-black p-3 border-l-4 ${cGlow} ${isActive} hover:bg-gray-900 transition flex justify-between items-center group cursor-pointer rounded-r">
                            <div class="flex items-center space-x-2 min-w-0 pr-2">
                                <input type="checkbox" ${comparadas.has(c.id) ? 'checked' : ''} onclick="event.stopPropagation()" onchange="alternarComparar(${c.id}, this)" aria-label="Comparar ${escapeHtml(c.titulo)} en el radar" class="w-4 h-4 accent-yellow-400 flex-shrink-0">
                                <span class="text-xs font-bold text-gray-400 w-6 flex-shrink-0">${mostrarRank ? "#" + (rankingInicio + index + 1) : ""}</span>
                                <div class="min-w-0">
                                    <div class="flex items-center space-x-2 mb-0.5">
                                        <span class="text-[11px] text-cyan-500 tracking-widest block">ID ${c.id}</span>
                                        ${genBadge}
                                    </div>
                                    <h3 class="font-bold text-xs uppercase ${cTitle} break-words leading-snug">${escapeHtml(c.titulo)} ${tagBadge}</h3>
                                    <p class="text-xs text-gray-400 uppercase truncate">${escapeHtml(c.artista)}</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 flex-shrink-0">
                                <div class="opacity-100 md:opacity-0 group-hover:opacity-100 focus-within:opacity-100 flex flex-col md:flex-row md:space-x-2 transition-opacity">
                                    <button onclick="event.stopPropagation(); openEditModal(${c.id})" aria-label="Editar ${escapeHtml(c.titulo)}" class="text-yellow-600 hover:text-yellow-400 text-xs font-bold uppercase p-1">Editar</button>
                                    <button onclick="event.stopPropagation(); eliminarCancion(${c.id})" aria-label="Eliminar ${escapeHtml(c.titulo)}" class="text-red-400 hover:text-red-300 text-xs font-bold uppercase p-1">Eliminar</button>
                                </div>
                                <div class="border ${cBox} px-2.5 py-1 text-right min-w-[55px] rounded">
                                    <span class="text-[11px] text-gray-400 block">${metrica ? metrica[0] : "NOTA"}</span>
                                    <span class="${cText} font-bold text-sm">${p}</span>${c.calificacion_final > 0 ? '<span class="text-gray-400 text-[11px]">/' + (metrica ? metrica[1] : 20) + '</span>' : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                document.getElementById('lista_canciones').innerHTML = htmlCanciones || `<p class="text-gray-400 text-xs uppercase p-4 text-center">> SIN RESULTADOS</p>`;
                if(cancionesGlobal.length > 0) {
                    document.getElementById('lista_canciones').innerHTML += `
                        <div class="flex justify-between items-center mt-3 pt-3 border-t border-cyan-900 text-xs text-cyan-500 font-bold uppercase">
                            <button onclick="irPagina(${data.pagina_actual - 1})" ${data.pagina_actual <= 1 ? 'disabled' : ''} class="${data.pagina_actual <= 1 ? 'invisible' : ''} hover:text-cyan-300 p-1 disabled:cursor-not-allowed"><< ANT</button>
                            <span>PÁG ${data.pagina_actual} / ${data.total_paginas || 1}</span>
                            <button onclick="irPagina(${data.pagina_actual + 1})" ${data.pagina_actual >= data.total_paginas ? 'disabled' : ''} class="${data.pagina_actual >= data.total_paginas ? 'invisible' : ''} hover:text-cyan-300 p-1 disabled:cursor-not-allowed">SIG >></button>
                        </div>
                    `;
                }
            } catch (e) { clearTimeout(avisoTimer); document.getElementById('lista_canciones').innerHTML = '<p class="text-red-400 text-xs p-4 text-center">> No se pudo cargar el catálogo. Revisa tu conexión y vuelve a intentarlo.</p>'; showToast("SIN CONEXIÓN CON EL SERVIDOR", true); }
        }

        async function agregarCancion() {
            const titulo = document.getElementById('titulo').value.trim(); 
            const artista = document.getElementById('artista').value.trim();
            const genero = document.getElementById('reg-genero').value;
            const etiqueta = document.getElementById('reg-etiqueta').value;
            
            if(!titulo || !artista) { showToast("LLENA TÍTULO Y ARTISTA", true); return; }
            
            try {
                const res = await apiFetch(API_URL, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({titulo, artista, genero, etiqueta}) });

                if (res.status === 409) {
                    showToast("ERROR: LA CANCIÓN YA EXISTE", true);
                    return;
                }

                if(res.ok) { 
                    const data = await res.json(); 
                    document.getElementById('titulo').value = ''; 
                    document.getElementById('artista').value = ''; 
                    showToast("CANCIÓN REGISTRADA"); statsListas = false; cargarGeneros(); 
                    
                    await cargarCatalogo(1); 
                    seleccionarTarget(data.id); 
                } else {
                    showToast("ERROR AL REGISTRAR LA CANCIÓN", true);
                }
            } catch (e) {
                showToast("SIN CONEXIÓN CON EL SERVIDOR", true);
            }
        }

        async function calificarCancion() {
            const id = parseInt(document.getElementById('id_cancion').value);
            if(!id || id <= 0) { showToast("SELECCIONA UNA CANCIÓN PRIMERO", true); return; }

            const body = {
                ritmo: parseFloat(document.getElementById('ritmo').value), 
                letras: parseFloat(document.getElementById('letras').value),
                coro: parseFloat(document.getElementById('coro').value), 
                importancia: parseFloat(document.getElementById('importancia').value), 
                arte_visual: document.getElementById('arte_visual').checked ? 1.0 : 0.0, 
                antiguedad: document.getElementById('antiguedad').checked,
                nostalgia: document.getElementById('nostalgia').checked, 
                complejidad: document.getElementById('complejidad').checked,
                descubrimiento_terceros: document.getElementById('recomendacion').checked
            };
            
            try {
                const res = await apiFetch(`${API_URL}/${id}/calificar`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body) });
                if(res.ok) { 
                    showToast("EVALUACIÓN GUARDADA"); comparadas.delete(id); statsListas = false; cargarRadar(); cargarGeneros(); 
                    limpiarFormulario(); 
                    if(window.innerWidth < 768) switchTab('cat');
                } else { 
                    showToast("ERROR AL GUARDAR", true); 
                }
            } catch (e) {
                showToast("SIN CONEXIÓN CON EL SERVIDOR", true);
            }
        }

        function openEditModal(id) {
            const song = cancionesGlobal.find(c => c.id === id);
            if (!song) return;

            document.getElementById('modal-title').innerText = `EDITAR CANCIÓN`;
            document.getElementById('modal-confirm-btn').className = "bg-yellow-600 hover:bg-yellow-500 text-black px-4 py-2 uppercase font-bold text-xs rounded";
            
            const genOpts = GENEROS.map(([v, n]) => `<option value="${v}" ${song.genero === v ? 'selected' : ''}>${n}</option>`).join('');
                
            const tagOpts = ["Original", "Remix", "Slowed Reverb", "Cover", "Fragmento"]
                .map(t => `<option value="${t}" ${song.etiqueta === t ? 'selected' : ''}>${t}</option>`).join('');

            document.getElementById('modal-content').innerHTML = `
                <input id="mod-1" type="text" maxlength="80" value="${escapeHtml(song.titulo)}" class="w-full mb-3 p-2.5 bg-black text-cyan-300 border border-cyan-900 text-xs rounded uppercase" placeholder="TÍTULO">
                <input id="mod-2" type="text" maxlength="80" value="${escapeHtml(song.artista)}" class="w-full mb-3 p-2.5 bg-black text-cyan-300 border border-cyan-900 text-xs rounded uppercase" placeholder="ARTISTA">
                <div class="grid grid-cols-2 gap-2">
                    <select id="mod-3" class="w-full p-2.5 bg-black text-cyan-300 border border-cyan-900 text-xs rounded uppercase">${genOpts}</select>
                    <select id="mod-4" class="w-full p-2.5 bg-black text-cyan-300 border border-cyan-900 text-xs rounded uppercase">${tagOpts}</select>
                </div>
            `;
            
            document.getElementById('custom-modal').classList.remove('hidden');
            (document.querySelector('#modal-content input') || document.getElementById('modal-confirm-btn')).focus();
            
            modalResolve = async (result) => {
                if (result) {
                    const data = {
                        titulo: document.getElementById('mod-1').value.trim(),
                        artista: document.getElementById('mod-2').value.trim(),
                        genero: document.getElementById('mod-3').value,
                        etiqueta: document.getElementById('mod-4').value
                    };
                    if (!data.titulo || !data.artista) {
                        showToast("TÍTULO Y ARTISTA NO PUEDEN QUEDAR VACÍOS", true);
                        document.getElementById('custom-modal').classList.add('hidden');
                        return;
                    }
                    try {
                        const res = await apiFetch(`${API_URL}/${id}/info`, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
                        if (res.ok) {
                            showToast("DATOS ACTUALIZADOS");
                            cargarCatalogo(paginaActualGlobal);
                        } else {
                            showToast("ERROR AL ACTUALIZAR", true);
                        }
                    } catch (e) {
                        showToast("SIN CONEXIÓN CON EL SERVIDOR", true);
                    }
                }
                document.getElementById('custom-modal').classList.add('hidden');
            };
        }

        async function eliminarCancion(id) {
            document.getElementById('modal-title').innerText = `¿ELIMINAR ESTA CANCIÓN?`;
            document.getElementById('modal-content').innerHTML = `<p class="text-red-400 uppercase text-xs">¿ELIMINAR ESTA CANCIÓN PERMANENTEMENTE DE LA NUBE?</p>`;
            document.getElementById('modal-confirm-btn').className = "bg-red-800 hover:bg-red-600 text-white px-4 py-2 uppercase text-xs font-bold rounded";
            document.getElementById('custom-modal').classList.remove('hidden');
            (document.querySelector('#modal-content input') || document.getElementById('modal-confirm-btn')).focus();
            
            modalResolve = async (result) => {
                if (result) {
                    try {
                        const res = await apiFetch(`${API_URL}/${id}`, { method: 'DELETE' });
                        if (res.ok) {
                            showToast("CANCIÓN ELIMINADA", true); comparadas.delete(id); cargarGeneros(); statsListas = false; cargarRadar();
                            if(idSeleccionadoGlobal === id) limpiarFormulario();
                            else cargarCatalogo(paginaActualGlobal);
                        } else {
                            showToast("ERROR AL ELIMINAR", true);
                        }
                    } catch (e) {
                        showToast("SIN CONEXIÓN CON EL SERVIDOR", true);
                    }
                }
                document.getElementById('custom-modal').classList.add('hidden');
            };
        }

        function showToast(m, err=false) {
            const c = document.getElementById('toast-container'); const t = document.createElement('div');
            t.className = `bg-gray-900 border-l-4 ${err ? 'border-red-500 text-red-400' : 'border-green-500 text-green-400'} p-3 shadow-lg toast-enter min-w-[200px] uppercase text-xs font-bold rounded`;
            t.innerHTML = `> ${m}`; c.appendChild(t);
            setTimeout(() => { t.classList.replace('toast-enter', 'toast-exit'); setTimeout(() => t.remove(), 500); }, 2500);
        }

        function closeModal(r) { if(modalResolve) modalResolve(r); }

        window.onload = () => { 
            actualizarValores(); 
            poblarGeneros(); restaurarFiltros(); pintarChips(); pintarRadarBtns(); cargarRadar(); cargarGeneros(); document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(false); });
            if (window.innerWidth < 768) switchTab('cat');
            cargarCatalogo(1); 
        };
    

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
