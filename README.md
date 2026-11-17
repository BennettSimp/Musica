# Evaluador musical

Hecho por Gémini y mejorado por Muse.

Calificador personal de canciones: Ritmo 35%, Letras 25%, Coro 40% (base, máximo 10),
Importancia aparte (máximo 5) y 5 bonos de 1 punto (Antigüedad, Nostalgia, Complejidad,
Descubrimiento único, Arte Visual). Nota máxima: 20.

## Arquitectura

- **Frontend (Vercel):** sitio estático en `public/` (`index.html` + `app.js`). PWA.
  Tailwind por CDN: no hay build real ni `tailwind.config.js` (se quitó, no se
  usaba); `npm run build` solo explica que no hay build.
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

1. Push a `main` en GitHub → Vercel despliega el frontend y Render recompila el backend. OJO: en PR #1 y PR #2 el auto-deploy de Render NO disparó; hubo que lanzar Manual Deploy → Deploy latest commit (revisar Auto-Deploy en Settings → Build & Deploy). PR #3 (botón `.btn-seguir` + iconos nota ♪) fusionado en `main` fb0f900d el 2026-11-16; su despliegue manual está pendiente.
2. Verificar: `/api/salud` responde JSON `{"status":"OK","admin_token_configurado":bool}` y `/api/canciones/stats` muestra el total (678).
3. Respaldo antes de tocar la base: `GET /api/canciones/exportar` → guardar el JSON.

## Endpoints

- `GET /api/salud` — responde JSON `{"status":"OK","admin_token_configurado":bool}` aunque la DB esté caída; solo despierta el proceso.
- `GET /api/salud/db` — monitoreo real: hace `SELECT 1`; 200 si la base responde, 503 si está caída.
- `GET /api/canciones` — lista paginada (50 por página), `buscar`, `genero`, `orden` (top, peores, ritmo, letras, coro, importancia, recientes, alfabetico, sin_calificar), `nota_min`, `nota_max`, `artista=<id>` (cualquier rol) y `rol=principal` opcional. Cada canción lleva `artistas: [{id, nombre, rol}]` y el campo `artista` derivado (principales unidos con ", "). La búsqueda coincide con TODOS los nombres de artista (principal, invitado, productor). El orden por defecto usa el desempate: total, base, Importancia, bonos, Descubrimiento único, Coro, Ritmo, Letra, ID más antiguo.
- `GET /api/artistas` — lista de artistas con conteos: `canciones` (apariciones como principal o invitado; el productor no cuenta) y `principales` (como principal).
- `GET /api/canciones/stats` — total, promedio, obras maestras (≥19), sin calificar, mediana, mínimo, máximo.
- `GET /api/canciones/histograma` — conteo por rango de nota (reemplaza al radar). Rangos: menos-10, 10-12, 12-14, 14-16, 16-18, 18-19, 19-20, sin calificar; se recarga tras agregar, calificar o eliminar.
- `GET /api/canciones/generos` — promedio por género.
- `GET /api/canciones/exportar` — catálogo completo (público; si se quiere restringir, hacerlo admin).
- `POST /api/canciones`, `PUT /api/canciones/<id>/calificar`, `PUT /api/canciones/<id>/info`, `DELETE /api/canciones/<id>` — requieren cabecera `X-Admin-Token`. POST y PUT /info aceptan `artistas: [{nombre, rol}]` (los artistas se crean por `nombre_norm` en la misma transacción; sin arreglo, el artista plano es un solo principal). PUT /info reemplaza las filas de artistas de la canción.

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
427 pruebas: la fórmula, el desempate y el Top 10, el rank global, la
mezcla HSL 0–90% y el degradado verde→dorado por puesto, el histograma
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
se extraen del app.js real en vez de copiarse, fixture sintético y
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
(mediana real y total_paginas con max(1, …)).

## Seguridad

- El contenedor del backend corre como usuario sin privilegios (`USER app`).
- El export (`GET /api/canciones/exportar`) es público por decisión del
  usuario (2026-11-13).
- El token de admin se pide con `prompt()` y se guarda en `sessionStorage` (se borra al cerrar la pestaña; antes era `localStorage`)
  en texto plano: es el punto más débil del frontend y solo es aceptable
  porque es de uso personal. No compartir el equipo ni el navegador.
- CORS por defecto al dominio de Vercel; `ALLOWED_ORIGIN` solo para
  cambiarlo (o `*` para pruebas locales).

## Colores (cerrados)

Top 10 dorado SOLO por puesto global (sin exigir nota ≥19; decisión
2026-11-13 19:19 CST), GOD ≥19 verde, ≥18 fuchsia, ≥17.8 violeta, resto cian.
Degradado 0–90% con curva suave (smoothstep): cada ventana empieza en el
color puro y sube hasta 90% en el umbral; ventanas 0.3 antes de 17.8
(17.5–17.8), 0.5 antes de 19 y 0.2 antes de 18. Del 11 al 20 mezcla desde
el propio color de la canción hacia el dorado con la misma rampa.
Toda la fila de la canción se ilumina con su color. Sin texto de distinción.
