# Evaluador musical

Hecho por Gémini y mejorado por Muse.

Calificador personal de canciones: Ritmo 35%, Letras 25%, Coro 40% (base, máximo 10),
Importancia aparte (máximo 5) y 5 bonos de 1 punto (Antigüedad, Nostalgia, Complejidad,
Descubrimiento único, Arte Visual). Nota máxima: 20.

## Arquitectura

- **Frontend (Vercel):** sitio estático en `public/` (`index.html` +
  `app.js` + módulos `js/colores.js` y `js/api.js`, cargados en ese
  orden con `defer`). PWA. Tailwind 3.4.17 compilado en local
  (`tailwind.config.js`, `public/css/tailwind.min.css`, fuentes woff2
  autoalojadas en `public/fonts/`); `npm run build` descarga las
  fuentes woff2 de Google Fonts y verifica su sha256
  (`scripts/descargar-fuentes.js`, no se guardan en el repo) y luego
  compila Tailwind; `npm run test` corre el harness. Sin CDN ni fuentes
  de Google en runtime.
  CSP completa en `vercel.json` (`script-src 'self'`, sin handlers
  inline: delegación `data-accion`).
- **Backend (Render):** C++ con Crow + libpqxx, en Docker (`Dockerfile`, `main.cpp`).
  Sirve la API en `https://clasificacion-de-musica.onrender.com/api/canciones`.
- **Base de datos (Supabase):** PostgreSQL, ver `schema.sql`.

## Variables de entorno (Render)

| Variable | Qué es |
|---|---|
| `DATABASE_URL` | URI de Supabase, **Session pooler, puerto 6543**. La Directa (5432, IPv6) no funciona en Render. |
| `ADMIN_TOKEN` | Clave para escribir (POST/PUT/DELETE), mínimo 24 caracteres. Sin ella (o si es más corta), las escrituras devuelven 401. |
| `ALLOWED_ORIGIN` | Dominio de Vercel para CORS. Si no se define, queda `https://musica-plum-psi.vercel.app`. |

Copia `.env.example` como `.env` para desarrollo local. El `.env` nunca se sube.

## Despliegue

1. Push a `main` en GitHub → Vercel despliega el frontend y Render recompila el backend. OJO: en PR #1 y PR #2 el auto-deploy de Render NO disparó; hubo que lanzar Manual Deploy → Deploy latest commit (revisar Auto-Deploy en Settings → Build & Deploy). PR #4 fusionado en `main` c63bfbc4 el 2026-11-16 y PR #5 (paleta G) fusionado en `main` ede53390 el 2026-11-17; la G está en vivo desde el 2026-11-17 00:31 CST (Vercel + Render, histograma de 9 bins).
2. Verificar: `/api/salud` responde JSON `{"status":"OK","admin_token_configurado":bool}` y `/api/canciones/stats` muestra el total (678).
3. Respaldo antes de tocar la base: `GET /api/canciones/exportar` → guardar el JSON.

## Endpoints

- `GET /api/salud` — responde JSON `{"status":"OK","admin_token_configurado":bool}` aunque la DB esté caída; solo despierta el proceso.
- `GET /api/salud/db` — monitoreo real: hace `SELECT 1`; 200 si la base responde, 503 si está caída.
- `GET /api/canciones` — lista paginada (50 por página), `buscar`, `genero`, `orden` (top, peores, ritmo, letras, coro, importancia, recientes, alfabetico, sin_calificar), `nota_min`, `nota_max`, `artista=<id>` (cualquier rol) y `rol=principal` opcional. Cada canción lleva `artistas: [{id, nombre, rol}]` y el campo `artista` derivado (principales unidos con ", "). La búsqueda coincide con TODOS los nombres de artista (principal, invitado, productor). El orden por defecto usa el desempate: total, base, Importancia, bonos, Descubrimiento único, Coro, Ritmo, Letra, ID más antiguo.
- `GET /api/artistas` — lista de artistas con conteos: `canciones` (apariciones como principal o invitado; el productor no cuenta) y `principales` (como principal).
- `GET /api/canciones/stats` — total, promedio, obras maestras (≥19), sin calificar, mediana, mínimo, máximo.
- `GET /api/canciones/histograma` — conteo por rango de nota (reemplaza al radar). Rangos (9 bins): menos-10, 10-12, 12-14, 14-16, 16-17.8, 17.8-18, 18-19, 19-20, sin calificar; se recarga tras agregar, calificar o eliminar.
- `GET /api/canciones/generos` — promedio por género.
- `GET /api/canciones/exportar` — catálogo completo (público; si se quiere restringir, hacerlo admin).
- `POST /api/canciones/importar` — restaura un respaldo JSON del export (`{"canciones": [...]}`, con `confirmar: true`); requiere `X-Admin-Token`. Valida todo antes de insertar, recalcula los totales con la fórmula, ignora los IDs del archivo y omite los duplicados (mismo título y artista). Límite de cuerpo 2 MB, máximo 2000 canciones por importación.
- `POST /api/canciones`, `PUT /api/canciones/<id>/calificar`, `PUT /api/canciones/<id>/info`, `DELETE /api/canciones/<id>` — requieren cabecera `X-Admin-Token`. POST y PUT /info aceptan `artistas: [{nombre, rol}]` (los artistas se crean por `nombre_norm` en la misma transacción; sin arreglo, el artista plano es un solo principal). PUT /info reemplaza las filas de artistas de la canción.

## Migraciones (orden de aplicación)

`schema.sql` es documentación del esquema (no-op en vivo: la tabla ya
existe); los SQL de migración viven en `migraciones/` en el repo. Orden:
1. `lote-1-aplicar.sql` → 2. `lote-2-3-aplicar.sql` →
3. `lote-4-aplicar.sql` → 4. `titulos-correcciones.sql` →
5. `artistas-aplicar.sql` → 6. `correccion-678.sql` →
7. `correccion-datos-ronda-4.sql` (DESPUÉS de la 678: fusiona artistas
541→419 'Tiësto', 317→358 'Nathy Peluso', 601→195 'The Living Tombstone'
y pone etiqueta 'Remix' en la 652). Ya aplicados en vivo; no volver a
correrlos. `schema.sql` documenta este orden completo.

## Logs y monitoreo

- Backend: todo error va a stderr con marca de tiempo UTC ISO-8601 y la
  ruta (`[2026-11-13T20:30:00Z] [ERROR] GET /api/canciones: ...`). En
  Render se ven en los logs del servicio. El arranque avisa si
  `ADMIN_TOKEN` falta o es corto (<24).
- Monitoreo: `/api/salud` solo dice que el proceso está vivo;
  `/api/salud/db` dice si la base responde. Un ping externo cada 10 min
  a `/api/salud` evita que Render duerma el servidor.
- Arranque con la base caída: el servidor arranca igual (conexiones
  perezosas, se crean bajo demanda) y se recupera solo cuando la base
  vuelve; `/api/salud` responde y `/api/salud/db` devuelve 503 mientras
  tanto. Solo la falta de `DATABASE_URL` sigue parando el arranque.
- Si el pool de conexiones se agota, el backend falla rápido a los 5 s
  (500) en vez de colgarse; el frontend muestra "SIN CONEXIÓN".
- Frontend: los fallos de red se registran con `console.error`
  (`[Evaluador] ...`) en la consola del navegador; al usuario solo le
  sale el aviso en pantalla. No se envía nada a ningún servicio externo.

## Pruebas

`node harness-pruebas.js` (los datos reales son opcionales: si falta
`public/datos-reales.json`, el export en local, las pruebas con datos
reales se saltan y las invariantes corren con un fixture sintético).
542 pruebas: la fórmula, el desempate y el Top 10, el rank global, la
mezcla HSL 0–90% hacia el dorado en los puestos 11–30, el histograma
(incluidos el rango 'menos-10', los filtros y los porcentajes), las
fronteras del degradado 0–90% y el reseteo del filtro de género guardado
viejo; además el color de fila completo (dorado solo por puesto, mezcla
desde rgb sin NaN), el mínimo táctil de 44px en paginación y botones
grandes, la búsqueda del duplicado en varias páginas y el precache del
manifiesto e iconos. La auditoría G añadió 26: géneros heredados con
canciones (Hip Hop 39, Otro 36, OST 4), opciones del modal de editar
para canciones heredadas, búsqueda del duplicado por páginas con tope,
altura uniforme con el catálogo oculto, fondo en `<html>` sin
`background-attachment: fixed`, objetivos táctiles de 44px en burbujas,
histograma, modal, filas y REINTENTAR, y navegación al duplicado sin
filtros heredados. La tabla de artistas añadió 48: fila "Principal ft.
Invitados" (531 con 3 principales, 662 con 2, 232 como "Salvia"),
artista derivado, parseo de listas con coma, búsqueda por invitado y
por productor, export con artista derivado, conteos de `/api/artistas`,
validación de POST/PUT con `artistas`, coherencia con
`artistas-aplicar.sql` (680/330/14) y presencia del código en main.cpp,
app.js, index.html y schema.sql. La corrección de coma al editar (el
campo Artista se interpreta como lista de principales separados por
coma) añadió 3 pruebas de parseo con coma (118→121). La auditoría
ronda 1 (2026-11-16) añadió 76 más (121→197): las funciones de color
se extraen del `js/colores.js` real en vez de copiarse, fixture sintético y
SKIP sin datos reales, casos límite de fórmula (20.00, 0, bonos solos,
nulls, redondeo .xx5), bordes de rampa (17.50–19.00, nota 0 sin dorado),
cadena sintética de desempate de 8 canciones, tablas POST/PUT /info y
de calificar estricto, casos de artistas (dedupe, >10, productores
puros 0/0), catálogo vacío y bordes de paginación, grep de secretos en
logs, DESEMPATE_ASC fijado como espejo exacto y /api/salud JSON. La
auditoría ronda 2 (2026-11-16) añadió 31 más (197→228): sección 5b con
la consulta SQL real del histograma (subconsulta por el alias 'rango',
bordes y contrato sin andamiaje de bins), sección 5c con anclajes de
texto del orden completo de DESEMPATE, umbrales/ventanas de color de
fila, rangos de filtrarRango, colorBarra y precache de sw.js; sección
22 (R2-O2) de control de errores (helpers textoOpcional/boolOpcional,
PUT /info conserva casillas, isfinite, guardas dentro del try, 5xx+413,
timeout en las 8 lecturas, toastLectura); sección 18b (R2-LOG) de logs
(sanitizar tapa URL, contraseña suelta y token, causa del pool, id en
errores 500). La auditoría final absoluta, ronda 3 (2026-11-16), añadió
125 más (228→353): sección 23 con 113 pruebas (GOD ≥19 anclado,
mostrarErrorHttp extraído y ejecutado con respuestas falsas,
claveCancion/normalizarTexto, límites de lectura y de cuerpo, timeouts,
token en sessionStorage, validación POST/PUT, órdenes de listado,
búsqueda con truncado UTF-8, /api/salud y /api/salud/db con límite,
pool, CORS, export CSV, bloqueo por acción, respuestas obsoletas,
sliders solo por arrastre y Editar en Evaluar); sección 24 con 12
pruebas (401 con distinción token-no-configurado vs clave incorrecta,
DB caída → 503, total_paginas con catálogo vacío, CSV con objetos y
los 3 fixes de logs de la ronda 3). La mega-auditoría, ronda 4
(2026-11-16), añadió 74 más (353→427): sección 25 con 74 pruebas
(splash con sandbox real de cargarCatalogo, color de fila real
extraído de app.js con diferencial de 136 combinaciones nota×puesto,
10 anclas numéricas de backend extraídas de main.cpp, catálogo
sintético de 678 canciones, artistas reales extraídos, UTF-8 con
cirílico y emoji, título de 200 caracteres, .xx5 en ambos sentidos,
catálogo vacío e histograma); espejos paginaDe y statsDe corregidos
(mediana real y total_paginas con max(1, …)). La paleta G
(2026-11-16) añadió 38 más (427→465): 12 colores de muestra fijados
como literales con bisección de 60 iteraciones, brillo invertido por Y,
color de fila real extraído con diferencial de 136 combinaciones y
anclas de tono/contraste. La paleta G INVERTIDA y la ronda 5
(2026-11-17) añadieron 20 más (465→485): Y 0.21→0.48 con pendiente
0.27 (14/14 colores distintos, contraste creciente 4.85→10.00),
mezcla HSL 11–30 hacia el dorado (0.9*suave((30-rank)/19), restaurada
2026-11-17 tras rechazar Nova el híbrido suave y alargada el mismo día;
el paso por verde es un riesgo aceptado), tinte Top 10 en 0.20, harness portable (`__dirname`, SQL desde `migraciones/` con
fallback a raíz), conteo de caracteres UTF-8 (101 'é' admitido),
parseEntero/parseDoble estrictos ("4abc" → defecto), fallback 503 de
sw.js (probado con el handler real en sandbox), CHECK
`calificacion_final BETWEEN 0 AND 20` y orden de migraciones completo
en `schema.sql`. La reversión del híbrido (2026-11-17) quitó 4 pruebas
netas (535→531): salieron 9 de franja/híbrido y entraron 5 de mezcla.
El alargamiento de transiciones (2026-11-17) añadió 5 netas (531→536):
rampas continuas 17.0–19.0 y mezcla 11–30. El ajuste del inicio a 17.5
(2026-11-17, Nova) añadió 1 neta (536→537): la transición a 17.8
empieza en 17.5, no en 17.0. Las fuentes en build (2026-11-17, PR #7)
añadieron 5 netas (537→542): `scripts/descargar-fuentes.js` descarga las
10 woff2 con sha256 verificado. Los extras de la ronda 5 (2026-11-17) añadieron 45
más (485→530): Tailwind local + fuentes propias (8, 485→493), CSP
completa con delegación `data-accion` (8, 493→501), `package-lock.json`
(2, 501→503), `pg_trgm` documentado en `schema.sql` (2, 503→505),
importación de respaldo (16, 505→521: ruta POST /importar, espejo JS
de validación) y división de `app.js` en módulos, con calma, uno a la
vez (colores en `js/colores.js`, 4, 521→525; API y avisos en
`js/api.js`, 5, 525→530). La lógica de evaluación (sliders,
`actualizarValores`, `calificarCancion`) queda pendiente de dividir:
está acoplada a DOM y estado de la app; moverla sería reescribir, no
mover (ver REVISION.md).

## Seguridad

- El contenedor del backend corre como usuario sin privilegios (`USER app`).
- El export (`GET /api/canciones/exportar`) es público por decisión del
  usuario (2026-11-13).
- El token de admin se pide con `prompt()` y se guarda en `sessionStorage` (se borra al cerrar la pestaña; antes era `localStorage`)
  en texto plano: es el punto más débil del frontend y solo es aceptable
  porque es de uso personal. No compartir el equipo ni el navegador.
- CORS por defecto al dominio de Vercel; `ALLOWED_ORIGIN` solo para
  cambiarlo (o `*` para pruebas locales).
- CSP completa (`vercel.json`): `script-src 'self'` sin
  `'unsafe-inline'` ni CDN; 0 handlers inline en el HTML (delegación
  `data-accion` + `addEventListener`). `style-src` conserva
  `'unsafe-inline'` solo por el `<style>` inline y los `style=""` de
  las filas.

## Colores (cerrados)

Top 10 dorado SOLO por puesto global (sin exigir nota ≥19; decisión
2026-11-13 19:19 CST), GOD ≥19 verde, 18–19 turquesa, 17.8–18 azul,
resto violeta. Degradado 0–90% con curva suave (smoothstep): cada
ventana empieza en el color puro y sube hasta 90% en el umbral; rampas
continuas 17.5–19.0 (violeta→azul 17.5–17.8, azul→turquesa 17.8–18.5,
turquesa→verde 18.5–19.0), alargadas 2026-11-17 por decisión de Nova
y con inicio ajustado a 17.5 por Nova el 2026-11-17 07:39.
Del 11 al 30 el color de la fila es la mezcla HSL de su color de nota
hacia el dorado #facc15 (rampa 0.90 en el puesto 11 → 0 en el 30); el
camino corto turquesa→dorado pasa por verde/lima, así que una canción
turquesa del 11-30 puede verse verdosa como si fuera GOD (riesgo
conocido y aceptado por Nova, que rechazó la franja y el híbrido suave
en la vista previa el 2026-11-17). El camino pasa por lima (Y ~0.86 >
dorado 0.6356): en datos reales los puestos 11-19 quedan más
brillantes que el dorado en Y pura, como ya pasaba en 11-14 con la
mezcla corta aprobada; el Top 10 sigue siendo lo más fuerte por su
halo animado y su glow 0.70. Toda la fila de la canción se
ilumina con su color. Sin texto de distinción.

Paleta G INVERTIDA (decisión de Nova 2026-11-17, tras el análisis de
Claude; reemplaza el brillo invertido de la G original): brillo
CRECIENTE (claro = nota alta) por BISECCIÓN — para cada nota se fija el
tono por rampa (HSL, camino más corto, sin desaturar, S fija 0.85) y se
busca la luz L cuya luminancia relativa Y sea el objetivo lineal 0.21
(10.05) → 0.48 (19.60), pendiente 0.27. El glow GOD varía POR
CALIFICACIÓN (0.45 en 19.00 → 0.60 en 19.60), solo GOD; las demás bandas
mantienen su glow FIJO (turquesa 0.40, azul 0.35, violeta 0.30), siempre
por debajo del dorado (0.70, halo animado intacto). Muestras verificadas
(G INVERTIDA + bisección, 60 iteraciones, 14/14 distintas, contraste
creciente 4.85→10.00): 10.05 #a456f1, 12.48 #b371f4, 14.00 #ba7ff5,
16.21 #c390f6, 17.48 #a7a6f8, 17.56 #a1a8f7, 17.69 #97abf7,
17.98 #80b2f5, 18.35 #12c3df, 18.41 #11c4d7, 18.77 #10cc9c,
19.00 #11cf70, 19.10 #11d071, 19.60 #11d472. Histograma (9 bins, por
punto medio): menos-10 #a456f1, 10-12 #aa61f2, 12-14 #b577f4,
14-16 #be87f5, 16-17.8 #c695f6, 17.8-18 #89b0f5, 18-19 #10c7c7,
19-20 #11d372, sin calificar #6b7280.

DESVIACIÓN DOCUMENTADA (RESUELTA: Nova aceptó la 0.27 el 2026-11-17
06:48, "el verde más brillante"): la tarea pedía pendiente 0.21 (Y 0.21
→ 0.42, GOD 19.00 #10c46a / 19.60 #10c76b, el verde poderoso elegido
por Nova en el mockup). Verificado con las funciones reales de
`js/colores.js`: con 0.21 solo 12/14 colores son distintos (18.35 y
18.41 colisionan en #0fbbbb; 19.00 y 19.10 en #10c46a) y 0.22–0.26
tampoco llegan a 14/14; 0.27 es la mínima que da 14/14 y es el espejo
exacto de la pendiente de la G original. Por eso se aplica 0.27.
