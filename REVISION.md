## Auditoría ronda 1 + lotes 2 y 3 aprobados — 2026-11-16

**Lotes 2 y 3 APROBADOS por Nova (sin vetos):** lote-2-3-aplicar.sql,
94 UPDATEs con guardas (lote 2: Hip Hop 39 → Rap con 3 excepciones y
Otro 36 resuelto, Otro queda en 0; lote 3: las 21 de Villano Antillano
en Pop repartidas en Trap 7, Reguetón 6, Rap 5, Electrónica 1 y 2 que
se quedan en Pop). Detalle por fila en lote-2-otro-verificacion.md y
lote-3-villano-verificacion.md. Nada aplicado en vivo.

**Corrección de coma al editar (2026-11-16):** al editar, el campo
Artista se interpreta como lista de principales separados por coma
(editar la 531 o la 662 ya no fusiona sus principales en un solo
artista); harness +3 pruebas de parseo con coma (118→121).

**titulos-correcciones.sql (2026-11-16):** 22 UPDATEs verificados
(21/21 títulos exactos contra el catálogo, 0 discrepancias). La 677
DECIDIDA por Nova ("pon los nombres de la canción como son"): título
oficial 'MONTERO (Call Me By Your Name)', artista 'Lil Nas X'. La 633
YA tiene etiqueta 'Remix' en vivo (la nota de
colaboraciones-reverificacion.md que decía "hoy está en None" era
incorrecta): sin acción. Debe correr ANTES que artistas-aplicar.sql
(el backfill lee canciones.artista). Nada aplicado en vivo.

**Auditoría ronda 1 (2026-11-16, oleadas 1 y 2; nada en vivo).**
Hallazgos por categoría y lo aplicado:
- Backend (oleada 1): calificar era permisivo (PUT parcial borraba la
  nota con ceros; clamp silencioso) → validación estricta E2/E3: los 9
  campos obligatorios, cuerpo no-objeto → 400, fuera de rango → 400
  (sin clamp), arte_visual solo 0/1. Fail-closed de token (S1/E11).
  `/api/salud` devolvía el texto plano "OK" → ahora JSON
  `{"status":"OK","admin_token_configurado":bool}` (nunca el valor).
- Frontend (oleada 1): el dorado por puesto se aplicaba también sin
  calificar → dorado solo con nota > 0 (sin calificar, gris). Los
  helpers de color vivían dentro de cargarCatalogo y el harness los
  copiaba verbatim → subieron a nivel de módulo con los MISMOS nombres
  y comportamiento. `maxlength` 200 en los campos de artista; el modal
  ya no se cierra si la confirmación falla.
- SQL (oleada 1): lotes 1 y 4 sin guardas ni transacción → guardas
  `AND genero` + BEGIN/COMMIT. Rename 'Lil Nas X' id 122.
- Harness y docs (oleada 2): el harness copiaba verbatim las funciones
  de color (P1) → se extraen del app.js real por nombre y se evalúan
  (si la extracción falla, el harness muere con mensaje claro); moría
  con stack trace sin datos reales (P2) → mensaje claro + fixture
  sintético + SKIP; no separaba invariantes de regresión (P3) →
  etiquetas [invariante]/[datos reales]; faltaba cobertura (P4–P10) →
  76 pruebas nuevas: límites de fórmula, bordes de rampa, cadena
  sintética de desempate de 8 canciones, tablas POST/PUT /info y de
  calificar, casos de artistas, catálogo vacío y paginación;
  sw.js offline sin documentar (P11) → pasos manuales en el harness;
  texto viejo "50-75" (L3) → "0–90%"; sin comprobar que los logs no
  filtren secretos (G-L1) → 4 pruebas de grep sobre main.cpp/app.js;
  DESEMPATE_ASC sin fijar → 2 pruebas fijan Peores como espejo exacto
  (id DESC; cambiarlo es decisión de Nova, ver pregunta abierta
  abajo); nada comprobaba que app.js no dependiera del "OK" plano de
  /api/salud (P16) → 2 pruebas. Harness 121→197 PASS, 0 FAIL
  (con datos reales; sin ellos, 180 PASS, 0 FAIL, 6 SKIP).
- Hallazgo documentado (no es un error, no se cambia sin Nova): las
  ramas de bonos y de Letra del desempate no pueden decidir nunca en
  la DB real (mismo total redondeado + misma base + misma Importancia
  implican los mismos bonos; si solo cambia la Letra, cambia la base).
  Quedan como ramas defensivas; el harness las fija con fixtures del
  comparador (sección 13).

**Índice de archivos de trabajo:** generar-artistas.py = generador de
artistas-aplicar.sql (vigente: regenera el SQL desde el catálogo);
validar-artistas.py = validador que simula artistas-aplicar.sql
sentencia por sentencia sin tocar ninguna DB (vigente);
generar-artistas.log = salida de la generación (vigente, registro);
revision-datos.json = datos del lote 4 (573 canciones, fuente
lote-4-correcciones.md; vigente como respaldo de la verificación);
lote-cazzu.md = sub-revisión de las 7 de Cazzu en Pop, SUPERADA por
el lote 4 (sus filas quedaron integradas en lote-4-correcciones.md y
en lote-4-aplicar.sql).

## Géneros Lofi y Hardcore — 2026-11-16 (lote 2)

Regla nueva de Nova (2026-11-16, refina la del 2026-11-15): se agrega un género nuevo si se cumple ALGUNA de las dos condiciones: (1) dos o más canciones, o (2) representación nula en otro género — la canción no se ve representada en ningún género de la lista, solo en uno que no está en ella y que es algo muy relevante. Aplicación: Lofi (526, 527 — condición 1) y Hardcore (618, 619 — condición 1) se agregan en todo (GENEROS en app.js, GENEROS_VALIDOS en main.cpp, schema.sql, docs); la lista pasa de 27 a 29 valores, idénticos y en el mismo orden en frontend y backend. Bolero NO se agrega (solo 307; Baladas la representa). Decisiones 526/527 → Lofi y 618/619 → Hardcore en lote-2-otro-verificacion.md. Nada aplicado en vivo.

## Tabla de artistas — 2026-11-16 (implementación en el código preparado)

Decisiones de Nova 2026-11-15/16 (decisiones-colaboraciones.md +
confirmaciones-pendientes.md): tabla completa many-to-many; solo
productores de pista y solo la lista corta de 7 demasiado relevantes;
631 SWOG + French Montana; 629 Override; 433 versión de Maluma; 12
versiones decididas (464 ft. Milan y Sasha, 93 remix ft. Gera MX y
Darkiel, 400 Zarcort ft. Kronno Zomber, 625 Reimagined ft. Andrea Storm
Kaden, 558 remix con 5 invitados); 232 queda "Salvia" (confirmado por
Nova 2026-11-16); 531 y 662 con varios principales.

**Cambios:** schema.sql: tablas artistas + cancion_artistas (rol CHECK,
PK compuesta, índice en artista_id) + notas de migración (backfill,
artistas-aplicar.sql; DROP COLUMN artista SOLO documentado como paso
final separado, no implementado). main.cpp: cada canción lleva
`artistas: [{id, nombre, rol}]` + `artista` derivado (principales con
", "); GET /api/artistas (`canciones` = apariciones principal/invitado,
`principales` = como principal; el productor no cuenta; TODOS los
artistas (decisión de Nova 2026-11-16: lista completa; los productores
puros salen con 0/0); GET /api/canciones?artista=<id> (&rol=principal
opcional); búsqueda por TODOS los nombres de artista (EXISTS en
cancion_artistas); POST/PUT aceptan `artistas: [{nombre, rol}]` (upsert
por nombre_norm en la misma transacción; sin arreglo, el artista plano
es un solo principal; PUT reemplaza las filas). app.js: fila "Principal
ft. Invitado1, Invitado2" (productor nunca en la fila), campos
"Artistas invitados (coma)" y "Productor (opcional)" en Agregar y en
Editar (mod-7/mod-8), autocompletado con /api/artistas (con respaldo al
export). Sin filtro por artista en la UI (diseño: paso posterior).
Colores, desempate, sliders, totales previstos y demás decisiones
cerradas sin tocar. README: sección Colores corregida (decía 50–75%,
la decisión cerrada es rampas 0–90%; era un texto viejo, no un cambio
de código).

**Verificado:** node --check OK (app.js, harness); sintaxis C++ OK con
Crow v1.2.0 real + asio 1.18.2 + stub pqxx recreado (/tmp se había
limpiado; el stub necesitó `operator[](int)` en row para no ser ambiguo
con `const char*`); harness **197 PASS, 0 FAIL** (70 previos + 48
nuevos de artistas + 3 de la corrección de coma + 76 de la auditoría
ronda 1, 2026-11-16); llaves main.cpp 154/154, app.js 362/362, divs
index.html 104/104. Nada en vivo: la sincronización de la vista previa
y la aplicación quedan para después, con la laptop.

## Géneros nuevos + lote 4 APROBADO — 2026-11-15 ~11:57 CST
Regla del usuario para agregar géneros: **se agrega un género si tiene al
menos 2 canciones, o si una sola canción queda demasiado mal representada
en un género que no es el suyo.**

Aplicación: **Merengue** (3: 189, 466, 467), **Dembow** (3: 529, 537, 538),
**Bachata** (1: 193; en Pop "tampoco describe su sonido"), **Reggae** (1:
364; su género real es reggae, Pop no lo describe), **Afrobeats** (1: 461;
la canción es Afro Beat). **Disco NO** se agrega (la 1 se queda en Pop,
que es uno de sus géneros reales) y **Bossa Nova NO** (la 193 va a Bachata).

**Cambios:** GENEROS en app.js pasa de 22 a **27 valores** (los 5 nuevos
tras Hardstyle); filtros, Agregar y Editar los toman solos de la lista
(no hay más lugares que enumeren géneros). schema.sql documenta la regla
y los 5 géneros en el paso 4 de la migración. Lote 4 aprobado completo
por Nova (105 claras + 24 dudosas resueltas; SQL 128 UPDATEs en
lote-4-aplicar.sql; decisiones por fila en revision-decisiones.md).

**Verificado:** node --check OK; harness 70 PASS, 0 FAIL (el harness no
afirma el conteo de GENEROS; usa sus propios fixtures).

## Ventana cian→violeta: 17.50 APROBADA — 2026-11-15 ~10:58 CST
El usuario aprobó la prueba: la ventana queda en **17.50 (ancho
0.3)** como decisión cerrada. 17.00 (ancho 0.8) queda superseded.
Se limpiaron los comentarios "A PRUEBA" en app.js y harness.

**Verificado:** harness 70 PASS, 0 FAIL (sin cambios de lógica,
solo comentarios).

## Ventana cian→violeta: 17.00 → 17.50 (A PRUEBA) — 2026-11-15 ~10:55 CST
El usuario pidió probar 17.50 para revisar y comparar con 17.00.
**NO es una decisión cerrada todavía:** 17.00 sigue siendo el
valor aprobado; 17.50 es solo una prueba. Si no le gusta, se vuelve
a 17.00 (ancho 0.8) sin más.

**Cambio (a prueba):** la ventana cian→violeta pasa de 0.8 a 0.3
(17.5–17.8). Canciones en transición: 42 en [17.5,17.8) + 16 + 75
= **133** (antes 184 con 17.00).

**Verificado:** harness 70 PASS, 0 FAIL.

## Ventana cian→violeta: 16.8 → 17.00 — 2026-11-15 ~10:51 CST
El usuario pidió subir el inicio de la ventana: "desde los 17.00,
considero que es lo mínimo, 17.50 si nos ponemos más técnicos, el
punto es premiar lo mejor". Se aplicó **17.00 (ancho 0.8)**; 17.50
(ancho 0.3, 42 canciones) queda como opción más técnica.

**Cambio:** solo la ventana cian→violeta pasa de 1.0 a 0.8
(17.0–17.8). Las demás no cambian (0.5 antes de 19, 0.2 antes de
18) ni la rampa 0–90% con smoothstep. Canciones en transición:
93 en [17.0,17.8) + 16 + 75 = **184** (antes 200 con 16.8).

**Verificado:** harness 70 PASS, 0 FAIL (se restauró además el
test "grad() en el umbral" que se había perdido en el cambio de
las rampas: el reemplazo de 9 líneas había dejado fuera la línea
del test y había quedado una línea vieja de "antes de la ventana"
con valores 0.5; ahora el bloque gradFactor está completo y con
los valores 0.8).

## Transiciones naturales: rampas 0-90% con curva suave — 2026-11-14 ~12:25 CST
El usuario eligió la opción A (rampas 0%→90%, lo más natural) y
autorizó usar la ventana que hiciera falta ("sin límites").

**Cambio (app.js):** nueva función `suave(t) = t*t*(3-2*t)`
(smoothstep). `grad()` ahora devuelve `mezcla(0.9 * suave(t), ...)`:
la ventana empieza en el color puro de la categoría (0% del
siguiente, sin salto al entrar) y sube hasta 90% en el umbral,
despacio al principio y al final y más rápido en medio. La mezcla
por puesto del Top 20→10 usa la misma rampa y curva: puesto 20 =
0% dorado (color puro), puesto 11 = 90%.

**Ventanas:** 1.0 antes de 17.8 (16.8–17.8), 0.5 antes de 19
(18.5–19) y 0.2 antes de 18 (17.8–18, el umbral anterior está a
solo 0.2). No se ensanchó la de 19 a 1.0 porque la banda fuchsia
solo mide 1.0 (18–19) y se quedaría sin canciones de color puro.

**Verificado con los datos reales (677):** canciones en transición:
109 en [16.8,17.8) + 16 en [17.8,18) + 75 en [18.5,19) = **200**
(antes 151 con ventanas 0.5 y tope 50-90%; al inicio 71 con 0.2).
El salto en 17.79→17.80 se achicó a solo el 10% de cian que
quedaba: en 17.79 la fila es ~90% violeta y en 17.80 violeta puro.

**Harness:** 69 PASS, 0 FAIL. Lecciones de esta ronda: (1) la
primera versión del script falló por copiar un `old` con valores
viejos (0.8/80% cuando el archivo ya tenía 0.9/90%) y la segunda
por un `old` con una diferencia invisible — se pasó a edición por
líneas con marcadores. (2) `mezcla(0, ...)` devuelve `"rgb(...)"`,
no el hex, así que las comparaciones de color puro deben ser
contra `mezcla(0, ...)` y no contra el literal hex. (3) 18.99 es
t=0.98 (suave 0.998816, 89.89%), no t=0.99 (89.97%).

## Tope del degradado: 80% → 90% — 2026-11-14 ~12:23 CST
El usuario pidió subirlo al 90% (había dejado la opción en un botón).
**Cambio:** la fórmula del degradado pasa de `0.5 + 0.3 * t` a
`0.5 + 0.4 * t` en `grad()` (ventanas de nota) y en la mezcla por
puesto del Top 20→10 (mismo tope en todas las transiciones). Las
ventanas no cambian (0.5 antes de 17.8 y de 19; 0.2 antes de 18).
En el umbral la canción conserva solo 10% de su propio color.

**Verificado:** harness 69 PASS, 0 FAIL (valores actualizados: mitad
de ventana 70%, 18.99 = 89.2%, 18.9 puesto 25 = 82%, puesto 11 = 90%).
`node --check` OK en app.js y harness.

**Pendiente (pregunta del usuario, sin aplicar):** hacer las
transiciones más naturales. El problema es que hoy cada ventana
EMPIEZA en 50% del color siguiente: al entrar en la ventana el color
salta de golpe (de cian puro a 50% violeta en 17.30), y en cada umbral
vuelve a saltar (de ~89% violeta en 17.79 a 50/50 violeta-fuchsia en
17.80). Opciones propuestas: (A) rampas 0%→90% (empiezan en el color
puro y suben suaves, sin saltos grandes); (B) rampas 25%→90% (punto
medio, salto de entrada a la mitad); (C) curva suave (ease) en vez de
lineal, combinable con A o B; (D) el azul del punto medio fuchsia→verde
(camino más corto del tono pasa por el azul; otro espacio de color lo
cambiaría). Esperando la decisión del usuario.

## Tope del degradado: 75% → 80% — 2026-11-14 ~11:59 CST
El usuario, sobre las ventanas 0.5: "Puedes aumentarla del 50% al 80%
o de 50% al 90% si se inicia desde antes para darse una mejor vista."
Decisión aplicada: **tope 80%** (se eligió 80% y no 90% porque con 90%
la canción conservaría solo 10% de su propio color en el umbral y la
frontera entre categorías se borraría; con 80% conserva 20% y el salto
17.79→17.80 no crece tanto. Si el usuario lo quiere más fuerte, queda
la opción de subirlo a 90%).

**Cambio:** la fórmula del degradado pasa de `0.5 + 0.25 * t` a
`0.5 + 0.3 * t` en `grad()` (ventanas de nota) y en la mezcla por
puesto del Top 20→10 (mismo tope en todas las transiciones). Las
ventanas no cambian (0.5 antes de 17.8 y de 19; 0.2 antes de 18).

**Verificado:** harness 69 PASS, 0 FAIL (se actualizaron los valores
esperados: mitad de ventana 65%, 18.99 = 79.4%, 18.9 puesto 25 = 74%,
puesto 11 = 80%). `node --check` OK en app.js y harness.

## Transiciones más notorias: ventanas de 0.5 — 2026-11-14 ~11:54 CST
El usuario mandó 3 capturas (puestos ~101-104, ~234-237 y ~262-265) y
dijo que las transiciones no se notan. Decisión: hacerlas más notorias
en todas, y si hace falta empezar desde antes de lo establecido.

**Cambio (app.js, `grad()`):** la ventana de degradado pasa de 0.2 a
**0.5 antes de 17.8 y antes de 19** (la mezcla sigue siendo 50% al
entrar en la ventana y 75% en el umbral; el tope de 75% NO cambia).
La ventana antes de **18 se queda en 0.2**: el umbral anterior (17.8)
está a solo 0.2, así que no cabe una ventana más ancha sin invadir la
ventana violeta. `grad()` ahora recibe el ancho como parámetro
(`ancho = 0.2` por defecto). El degradado por puesto del Top 20→10
NO cambia. La mezcla sigue en HSL (decisión del 10:06).

**Verificado con los datos reales (677):** canciones que muestran una
transición: antes 71 (29 en [17.6,17.8) + 26 en [18.8,19) + 16 en
[17.8,18)); ahora **151** (60 en [17.3,17.8) + 75 en [18.5,19) + 16
en [17.8,18)). Más del doble de filas con el degradado visible.

**Nota (no es un error):** en la ventana fuchsia→verde el punto medio
de la mezcla se ve azul. Es inherente: en HSL el camino más corto del
tono de fuchsia (290°) a verde (140°) pasa por el azul (215°). Magenta
y verde son casi opuestos, así que cualquier mezcla directa pasa por
azul o por gris; el azul es la transición, no una categoría nueva.

**Harness:** 69 PASS, 0 FAIL (antes 66). Se actualizaron las pruebas
de límites (17.30/18.50 = 50%, 17.55/18.75 = 62.5%, 18.99 = 74.5%,
18.9 puesto 25 = 70%) y se añadieron 3 nuevas (ventanas con canciones
reales, inicio de ventana 17.30/18.50, fuera de ventana 17.29/18.49).
`node --check` OK en app.js y harness.

## Editar en Evaluar + token en sessionStorage — 2026-11-14 ~09:42 CST
Decisiones del usuario sobre las 3 propuestas de la auditoría G:

1. **Editar en Evaluar (móvil), solo Editar, nunca Eliminar:** nuevo botón
   `#btn-editar-activa` en `#section-rubrica`, debajo de la caja de la
   canción activa y su contexto, a todo lo ancho, amarillo como los botones
   Editar de las filas, mínimo 44px. Solo se muestra cuando hay una canción
   seleccionada (`seleccionarTarget` lo muestra/oculta; `limpiarFormulario`
   lo oculta). `editarActiva()` abre el mismo modal de edición de la fila
   seleccionada. En el celular ya no hace falta volver al Top para editar.
   Eliminar NO se añadió: borrar una canción sigue siendo solo desde el Top.
2. **Token en sessionStorage (antes localStorage):** `apiFetch` ahora usa
   `sessionStorage` para `musica_token` (leer, guardar y borrar al 401).
   El token sobrevive a recargar la página en la misma pestaña, pero se
   borra al cerrar la pestaña o el navegador, así ya no queda guardado
   para siempre en el teléfono. Los filtros (`musica_filtros`) siguen en
   `localStorage` porque no son sensibles. README actualizado. Si al usuario
   le molesta volver a escribir la clave al abrir la página, se revierte.
3. **Salto de tono 17.79 → 17.80:** explicado al usuario, SIN cambio. No es
   un error: es la semántica aprobada de las ventanas 50–75. Una canción de
   17.79 está en la ventana antes del umbral 17.8 (mezcla cian→violeta, ya
   73.75% violeta); una de 17.80 ya ES violeta y empieza la ventana antes
   del umbral 18 (mezcla violeta→fuchsia, 50% fuchsia). Dos notas casi
   iguales se ven distintas (~36° de salto de tono). Quitar el salto
   exigiría cambiar la regla 50–75 acordada, así que queda como está salvo
   que el usuario lo pida.

# Revisión del Evaluador musical — paquete preparado (sin aplicar)

Fecha: 2026-11-13. Copia de trabajo en `~/workspace/musica-review-preparado/`.
Origen: repo BennettSimp/Musica, commit f3d68bd. **Nada de esto se subió a
GitHub, ni se desplegó en Vercel/Render, ni tocó Supabase.** Para aplicar
juntos, fase por fase, con verificación en vivo.

## Auditoría G (última) — 2026-11-13 ~21:54 CST (iterativa)

Regla del usuario: después de cada ronda de correcciones, re-auditar TODO
desde cero y repetir hasta que una ronda completa encuentre 0 errores.
**Rondas: 3. Ronda 1: 4 errores + 2 mejoras + 1 corrección de
documentación. Ronda 2: 2 errores + 4 mejoras de accesibilidad + 1 mejora
visual menor. Ronda 3 (confirmación final): 0 errores. Última ronda
limpia.** Harness: 40 → 57 (ronda 1) → 64 (ronda 2) → 66 (ronda 3),
TODO OK.

### Ronda 3 — confirmación final: 0 errores

- **Re-auditoría completa desde cero**: `app.js` leído entero por tercera
  vez (regiones que faltaban: líneas 1–90, `apiFetch`,
  `cargarEstadisticas`, `marcarNav`); `main.cpp` re-leído en su versión
  real (incluida la región editada de PUT /info); `index.html`, `sw.js`,
  `.gitignore`, `vercel.json` re-verificados; diff contra el original
  limpio sin cambios no esperados (solo `.git` y `.vscode` existen solo
  en el original; `tailwind.config.js` eliminado a propósito).
- **Verificación independiente de los datos, repetida**: Top 10 con
  desempate 144, 167, 213, 116, 307, 606, 348, 29, 399, 145; total 677;
  promedio 16.4847.
- **Barrido de botones generados en JS**: los 9 botones que crea `app.js`
  (burbujas por `CHIP`, histograma, Editar/Eliminar, paginación ANT/SIG,
  REINTENTAR) tienen `min-h-[44px]`; el modal lo conserva vía
  `abrirModal`. Un grep ingenuo (`<button[^>]*>`) marcó 4 sin mínimo,
  pero era un artefacto del regex: 3 usan la constante `CHIP` (que sí
  tiene el mínimo) y el 4º se cortaba en el `>=` de la paginación SIG.
  Se añadieron 2 pruebas al harness (sección 9d) que comprueban esos
  botones por líneas completas, para que el barrido no dependa del regex.
- **`.gitignore`** cubre `public/datos-reales.json`, `.env`, `build/` y
  `public/styles.css`. **`sw.js`**: red primero, solo cachea respuestas
  OK, precachea los 6 archivos (todos existen), borra cachés viejos al
  activar. **`vercel.json`**: cabeceras de seguridad, `app.js` con caché
  de 1 h + SWR, `sw.js` sin caché.
- **Pruebas finales**: `node harness-pruebas.js` → 66 PASS, 0 FAIL;
  `node --check` OK en `app.js`, `sw.js` y el harness; sintaxis C++ OK
  con Crow v1.2.0 real + asio 1.18.2 + stub pqxx; llaves CSS balanceadas;
  divs 104/104; tamaños finales `main.cpp` 555 líneas, `app.js` 894,
  `index.html` 317, `sw.js` 11, `harness-pruebas.js` 344.
- **Sin cambios de código en esta ronda** (solo 2 pruebas nuevas en el
  harness). La auditoría G termina aquí: 3 rondas, 6 errores corregidos,
  7 mejoras, 1 corrección de documentación.

### Ronda 2 — qué se verificó (con números)

- **Todo `app.js` leído entero de nuevo** (función por función, 809 líneas
  + ediciones de la ronda 1): `escapeHtml`, `guardarFiltros`,
  `restaurarFiltros`, `switchTab`, `marcarNav`, `pintarSlider`,
  `actualizarValores`, `vigilarSliders`, `siguienteSinCalificar`,
  `limpiarFormulario`, `seleccionarTarget`, `poblarGeneros`, `pintarChips`,
  `cargarHistograma`, `filtrarRango`, `quitarRango`, `cargarGeneros`,
  `exportar`, `conBloqueo`, `irPagina`, `apiFetch`, `debounceBuscar`,
  `cargarEstadisticas`, `igualarFilas`, `cargarCatalogo` (incluida la
  fila completa: colores, degradados, puntos, barra, insignias, acciones),
  `normalizarTexto`, `claveCancion`, `cargarArtistasCompletos`,
  `revisarDuplicado`, `usarArtistaSugerido`, `irADuplicado`,
  `agregarCancion`, `calificarCancion`, `abrirModal`, `openEditModal`,
  `eliminarCancion`, `showToast`, `closeModal`, `window.onload`.
- **Lotes de géneros verificados fila por fila contra los datos reales**:
  104 filas en `lote-ost-asiatica.md`, `lote-hiphop-otro.md` y
  `lote-villano.md` (título, artista y nota), 104 correctas, 0 diferencias.
  Los 4 de OST (274, 302, 376, 629) y los 4 de Asiática (270, 292, 483,
  664) existen con los datos del lote.
- **`.dockerignore`**: solo entran `main.cpp` y `CMakeLists.txt` al build
  (excluye `.git`, `public/`, `*.md`, `.env*`, `build/`); ningún secreto
  en la imagen.
- **Objetivos táctiles barridos en todo el HTML**: 17 botones en
  `index.html`; todos tienen `min-h-[44px]` o `py-4` (pestañas, 48px)
  salvo los 2 enlaces de texto en línea ("Ir a calificarla" y el nombre
  del artista sugerido, que son texto, no controles).
- **Pruebas**: `node harness-pruebas.js` → 64 PASS, 0 FAIL; `node --check`
  OK en `app.js`, `sw.js` y el harness; sintaxis C++ OK (sin cambios en
  `main.cpp` en esta ronda).

### Ronda 2 — errores encontrados y corregidos (2)

1. **`abrirModal()` borraba el mínimo táctil del botón de confirmar.**
   `btnConfirm.className = claseBoton` reemplazaba TODAS las clases, así
   que el `min-h-[44px]` que el botón trae en el HTML se perdía al abrir
   el modal (tanto en editar como en eliminar): el botón quedaba en
   ~34px. **Corrección:** `btnConfirm.className = claseBoton +
   ' min-h-[44px]'`. Harness: 1 prueba nueva (sección 9a).
2. **`irADuplicado()` no limpiaba los filtros activos.** Buscaba el
   duplicado con el filtro de género y el de rango que el usuario tuviera
   puestos en el Top: si el duplicado era de otro género o de otra nota,
   no se encontraba aunque existiera y salía "NO SE ENCONTRÓ EL
   DUPLICADO". **Corrección:** antes de buscar, pone el género en
   'todos', limpia `rangoFiltro`/`rangoActivo`, oculta la píldora de
   quitar filtro y repinta las burbujas. Harness: 1 prueba nueva
   (sección 9b).

### Ronda 2 — mejoras de accesibilidad (4, objetivo táctil de 44px)

La auditoría F solo había comprobado los 44px en paginación y botones
grandes. Esta ronda barrió todos los controles:

- **Burbujas de género (`CHIP`)**: ~30px → `min-h-[44px]`. Son el filtro
  principal en el celular. El texto se centra solo (es un `<button>`).
- **Barras del histograma**: ~32px → `min-h-[44px]` con `flex flex-col
  justify-center` (el texto y la barra quedan centrados como grupo).
- **Botón REINTENTAR del error de carga**: ~34px → `min-h-[44px]`.
- **Barrido en el harness** (sección 9a): comprueba que los 17 botones
  del HTML tengan `min-h-[44px]` o `py-4`, salvo los 2 enlaces de texto
  en línea. Ojo: el primer intento del barrido falló porque el regex
  `<button[^>]*>` se cortaba en el `>` del `=>` de los `onclick`
  (`conBloqueo(()=>...)`); se corrigió el regex para respetar las
  comillas. Los botones sí tenían el mínimo; era el test, no el código.

### Ronda 2 — mejora visual menor (1)

- **`seleccionarTarget()` conservaba el color de la caja de Evaluar de
  la canción anterior** cuando la seleccionada no tenía fila en pantalla
  (canción recién agregada, aún sin nota y fuera de la página 1).
  **Corrección:** si no hay fila, se limpian `borderColor` y `boxShadow`
  de la caja. Harness: 1 prueba nueva (sección 9c).

### Ronda 2 — verificado que NO es error (para no tocarlo)

- "Ir a calificarla" y el nombre del artista sugerido son enlaces de
  texto en línea (~16px de alto pero ~120px de ancho): se dejan así, no
  son controles independientes.
- Las casillas de bonos (16px) se activan tocando toda su etiqueta
  (texto incluido, ~24px de alto y a todo lo ancho): se dejan así.
- Los `<select>` nativos miden ~40px con su padding: se dejan así.
- `cargarCatalogo` redirige a la última página con canciones si la
  pedida queda vacía (p. ej. tras eliminar la última de la última
  página); con 0 canciones no hay bucle (la página 1 detiene la
  recursión).
- Tras editar, la fila re-pintada conserva `.active-song` (el id
  seleccionado no cambia) y `igualarFilas` la excluye de la medición.

### Ronda 1 — qué se verificó (con números)

- **Datos reales** (`public/datos-reales.json`, 677 canciones, verificación
  independiente con un script nuevo, no solo el harness): fórmula 0
  desajustes reales (324 exactas a 2 decimales; 353 difieren 0.01 solo en
  el límite .xx5 por redondeo binario del double). Top 10 con desempate:
  144, 167, 213, 116, 307, 606, 348, 29, 399, 145. Histograma: menos-10 0,
  10-12 22, 12-14 79, 14-16 157, 16-18 201, 18-19 142, 19-20 76, suma 677.
  Promedio 16.4847 (valores guardados). GOD 76. Sin calificar 0. Mínimo
  10.05. Mejor género Baladas 18.79 (21 canciones). IDs 478 ("Nada", Zoe)
  y 627 ("Carousel", Melanie Martínez) no cruzados. ID 677 sigue "Calle me
  by your name" / "Lil nas x" / 18.38 (pendiente por API, no por código).
  Campos JSON de los 5 puntos de bonos presentes y usados
  (antiguedad 640, nostalgia 405, complejidad 584, descubrimiento 581,
  arte_visual 565).
- **Código leído entero**: `main.cpp` (546 líneas, leído en su versión
  real: `GENEROS_VALIDOS`/`ETIQUETAS_VALIDAS`, `enLista`,
  `ConnectionGuard`/`db_pool`, `DESEMPATE`/`DESEMPATE_ASC`),
  `public/app.js` (809 líneas + ediciones), `public/index.html` (312
  líneas + ediciones), `public/sw.js`, `Dockerfile`, `schema.sql`,
  `README.md`, `.env.example`, `.gitignore`, `.dockerignore`,
  `CMakeLists.txt`, `vercel.json`, `manifest.webmanifest`,
  `package.json`, `BASE.md`, `REVISION.md`, `lote-ost-asiatica.md`,
  `harness-pruebas.js`. Diff contra el original limpio
  (`~/workspace/musica-review`, commit f3d68bd): solo los archivos
  esperados difieren; `tailwind.config.js` y `.vscode` solo existen en el
  original (eliminados a propósito); `datos-reales.json` solo en el
  preparado (gitignored, no se despliega).
- **Backend contra el código real**: `rank_global` por CTE `RANK()` sobre
  TODA la tabla antes de filtrar (el ORDER BY incluye el desempate completo
  + `id ASC`, así que el orden es total y `RANK()` no empata nunca);
  `DESEMPATE`/`DESEMPATE_ASC` en el orden documentado; histograma SQL con
  los 8 rangos y el orden CASE correcto; stats con mediana/mín/máx;
  `GENEROS_VALIDOS` 22/22 y `ETIQUETAS_VALIDAS` 11/11 idénticos a los del
  frontend; SQL 100% parametrizado (el `ORDER BY` solo se arma con
  constantes o con la lista blanca de criterios); búsqueda con
  `escaparLike` (`%`, `_`, `\` literales); `ADMIN_TOKEN` con 401 y 429
  tras 5 fallos por IP en 10 min; pool perezoso con timeout de 5 s y
  contabilidad de conexiones correcta; `gmtime_r` + mutex en los logs;
  `std::round` a 2 decimales al calificar; CORS por defecto al dominio de
  Vercel; `USER app` en el Dockerfile; arranque perezoso; `/api/salud/db`.
- **Frontend contra decisiones cerradas**: colores (Top 10 dorado SOLO por
  puesto global, GOD >19 verde, >18 fuchsia, >17.8 violeta, resto cian,
  degradado 50–75, verde→dorado desde el Top 20 partiendo del propio
  color, glow dorado > verde > fuchsia > violeta tenue, toda la fila
  iluminada, halo dorado animado); 7 animaciones (`slideIn`, `fadeOut`,
  `haloDorado`, `entradaFila`, `deslizarDegradado`, `entradaModal`,
  `deslizarEsqueleto`) + `prefers-reduced-motion`; sin totales previstos;
  arrastre solo; sin insignias de texto; `.env.example` con marcadores
  (sin valores realistas); `sw.js` precachea manifiesto e iconos
  (existen en `public/`); llaves CSS balanceadas; divs 104/104.
- **Piezas nuevas desde la auditoría F, verificadas sin contradicción**:
  el halo dorado es `box-shadow` propio de la fila, así que
  `overflow-hidden` no lo recorta; la barra absoluta (3px, a 6px del borde)
  cae dentro del padding inferior de 12px y no tapa contenido; la fila
  seleccionada queda fuera de la medición de `igualarFilas` (se excluye
  `.active-song`); `display:none` en las acciones no deja los botones
  fuera del teclado (se llega con Tab a la fila, Enter la activa y Tab
  llega a Editar/Eliminar; `focus-within:flex` es redundante pero
  inofensivo); la animación de entrada solo corre la primera vez
  (`animacionEntradaLista` + `.sin-animacion`); la barra de carga se
  oculta solo tras el chequeo de respuesta obsoleta (correcto).
- **Pruebas**: `node harness-pruebas.js` → 57 PASS, 0 FAIL (era 40 en la
  F); `node --check` OK en `app.js`, `sw.js` y el harness; sintaxis C++
  OK con Crow v1.2.0 real + asio 1.18.2 + stub pqxx recreado (`/tmp` se
  había limpiado otra vez; se volvió a descargar Crow — la primera URL
  devolvió "Not Found" de 9 bytes, funcionó el tarball del tag v1.2.0— y
  se recreó el stub desde el uso real de `main.cpp`).

### Ronda 1 — errores encontrados y corregidos (4)

1. **`revisarDuplicado()` solo buscaba la página 1.** El aviso de
   duplicado y la sugerencia de capitalización hacían `?buscar=` sin
   `pagina` (50 resultados). Con un título o artista común, el duplicado
   quedaba más allá de la página 1 y el aviso no salía nunca: el usuario
   solo se enteraba al enviar, con el 409. La auditoría F había arreglado
   `irADuplicado` (ir al duplicado), pero no este aviso. **Corrección:**
   `buscarPaginas()` recorre las páginas hasta encontrar el duplicado
   (tope 10 páginas para el título, 5 para el artista; se detiene en
   cuanto lo encuentra) y la sugerencia de capitalización se busca en
   todas las páginas recorridas. Además se añadió guarda de obsolescencia
   (`sigueVigente()`): antes, si el usuario seguía escribiendo mientras
   la búsqueda estaba en vuelo, los resultados viejos podían mostrar un
   aviso para otro título. Harness: 3 pruebas nuevas (sección 8c).
2. **`igualarFilas()` borraba las alturas uniformes cuando el catálogo
   estaba oculto.** Reseteaba todos los `min-height` y luego medía
   `offsetHeight` = 0 (móvil en otra pestaña), así que no volvía a poner
   nada. Pasaba en el celular al agregar (cargarCatalogo corre en la
   pestaña Agregar), al calificar (pestaña Evaluar) y al cambiar el tamaño
   con otra pestaña activa. **Corrección:** guarda de visibilidad al
   inicio (`if (!listaEl || !listaEl.offsetParent) return;`) y
   `switchTab` re-iguala al volver a la pestaña Top, con el ancho actual.
   Harness: 2 pruebas nuevas (sección 8d).
3. **Géneros heredados (79 canciones) sin filtro y con el modal de editar
   roto.** Hip Hop (39), Otro (36) y OST (4) no están en la lista nueva
   de géneros, pero sus canciones siguen en la base hasta la fase DB:
   - Las burbujas y el filtro solo usaban `GENEROS`, así que esas 79
     canciones (11,7% del catálogo) no se podían filtrar por su género.
   - El modal de editar armaba sus opciones solo con `GENEROS`: al editar
     una de esas canciones no había opción seleccionada y guardar enviaba
     `genero: ""` → el backend devolvía 400 "Género inválido". Editar
     cualquiera de las 79 fallaba.
   - El filtro guardado en `localStorage` con un género heredado se
     reseteaba a 'todos' al recargar (decisión defensiva de la auditoría
     E, ya innecesaria).
   **Corrección (frontend + backend, sin tocar decisiones cerradas):**
   nueva constante `GENEROS_HEREDADOS` (Hip Hop, Otro, OST) usada SOLO
   para filtrar y para editar; `pintarChips` filtra con
   `[...GENEROS, ...GENEROS_HEREDADOS]`; el modal de editar añade el
   género actual de la canción como opción "(actual)" cuando es heredado
   (nunca se ofrece cambiar A un heredado); `restaurarFiltros` acepta los
   heredados; `cargarGeneros` resetea a 'todos' un filtro heredado que
   quede en 0 canciones (autolimpieza tras la migración); en `main.cpp`,
   PUT /info consulta el género actual y acepta mantenerlo aunque no esté
   en `GENEROS_VALIDOS` (POST sigue rechazando agregar con género
   heredado). Cuando la migración los deje en 0, las burbujas desaparecen
   solas. Harness: 8 pruebas nuevas (secciones 6 y 8a/8b/8d). README
   actualizado (40 → 57 pruebas).
4. **Fondo con `background-attachment: fixed` en `body`.** Las 6 capas de
   fondo (4 radiales + rejilla 44px) se repintaban al desplazar en el
   celular: un sospechoso real del lag que reportó el usuario (el otro
   era el halo dorado, que se deja como está por ahora). **Corrección:**
   el fondo se movió a `html` (el fondo del elemento raíz se pinta sobre
   el lienzo y queda fijo al viewport por especificación, sin repintado al
   desplazar), con el mismo color, capas y tamaño de rejilla — aspecto
   idéntico. Ojo: hubo que quitar también `bg-[#040b1a]` de la etiqueta
   `<body>`, porque ese fondo opaco tapaba el de `<html>`. Harness: 2
   pruebas nuevas (sección 8e). **La vista previa debe sincronizarse con
   este cambio y comprobarse a ojo que el fondo se ve igual.**

### Ronda 1 — mejoras (2)

- **Fondo en `<html>`** (error 4 de arriba): además de quitar el repintado
  al desplazar, el fondo ya no depende de `background-attachment`.
- **`revisarDuplicado()` secuencial con parada temprana** (error 1): antes
  hacía las dos búsquedas en paralelo pero solo en la página 1; ahora
  busca por título primero y solo busca por artista si no encontró el
  duplicado, deteniéndose en cuanto lo encuentra. En el caso común (sin
  duplicado) hace hasta 15 peticiones pequeñas en vez de 2, pero con
  debounce de 400 ms y guarda de obsolescencia.

### Ronda 1 — corrección de documentación (1)

- **BASE.md decía "Ver más · 12"** (sección de la base 19:06 CST). Con los
  datos reales, las burbujas contaban 14 géneros nuevos con canciones:
  base 15 → "Ver más · 11". No es un error de código, es un número mal
  anotado. Con la corrección de géneros heredados de esta ronda, la base
  es 18 → "Ver más · 14". No se reescribió BASE.md (es el registro
  histórico de bases); el número correcto queda aquí y en el harness.

### Ronda 1 — verificado que NO es error (para no tocarlo)

- `focus-within:flex` en las acciones: redundante (el foco solo llega
  cuando la fila ya está activa), pero inofensivo; se deja.
- `#barra-carga` visible en el primer pintado (sin clase `hidden` en el
  HTML): en ese momento sí está cargando, así que es coherente; se deja.
- En móvil, tocar una fila salta a Evaluar y Editar/Eliminar solo se ven
  volviendo al Top: funciona (la fila sigue seleccionada), pero es
  indirecto. Ver "Propuestas pendientes" abajo.
- `irADuplicado` usa `totalPaginasGlobal`: es fresco, porque antes hace
  `cargarCatalogo(1)` con la búsqueda, que lo actualiza. Correcto.
- El `RANK()` de `rank_global` nunca empata: el ORDER BY incluye el
  desempate completo + `id ASC` (único), así que es un orden total.

### Ronda 1 — propuestas pendientes (decisión del usuario, no cambiadas)

- **Editar/Eliminar también en el panel de Evaluar (móvil).** Hoy, en el
  celular, tocar una canción salta a Evaluar para calificarla; para
  editarla o eliminarla hay que volver al Top, donde la fila sigue
  seleccionada y muestra los botones. Funciona, pero es indirecto. Si el
  usuario quiere, se pueden poner los botones también en la caja de
  Evaluar. No se hizo sin su decisión.
- El token de admin sigue en `localStorage` en texto plano (punto más
  débil, aceptado por ser de uso personal; documentado en README).
- El salto de tono en 17.79 → 17.80 (de cian→violeta 73.75% a
  violeta→fuchsia 50%) sigue como está: es la semántica de ventana
  aprobada, no un error.

### Ronda 1 — qué quedó sin verificar

- La compilación completa con libpqxx real (solo se puede probar en el
  Docker de Render al aplicar). La sintaxis sí se comprobó con las
  cabeceras reales de Crow v1.2.0 + asio 1.18.2 + stub pqxx.
- El comportamiento en un navegador real (las pruebas son de lógica y de
  texto; la vista previa se sincroniza después por separado): fondo en
  `<html>`, alturas uniformes al volver al Top en el celular, aviso de
  duplicado más allá de la página 1, burbujas con heredados, modal de
  editar de una canción Hip Hop/Otro/OST.
- Lo de siempre, pendiente para cuando se aplique con la laptop:
  confirmar ADMIN_TOKEN en Render (≥24), título/artista de la ID 677 por
  API, y la fase DB al final.

### Ronda 1 — cambios de frontend que necesitan sincronizarse con la vista previa

- Fondo movido de `body` a `html` (+ quitar `bg-[#040b1a]` de `<body>`).
- `GENEROS_HEREDADOS` + burbujas con heredados ("Ver más · 14" con los
  datos reales) + filtro guardado heredado + limpieza en `cargarGeneros`.
- `igualarFilas` con guarda de visibilidad + `switchTab` re-iguala al
  volver al Top.
- `revisarDuplicado` por páginas + guarda de obsolescencia.
- Modal de editar con el género actual heredado como opción "(actual)".

## Auditoría F — 2026-11-13 ~19:22 CST (iterativa, 3 rondas)

Regla del usuario: después de cada ronda de correcciones, re-auditar TODO
desde cero y repetir hasta que una ronda completa encuentre 0 errores.
**Rondas: 3. Ronda 1: 8 errores + 1 limpieza. Ronda 2: 0 errores.
Ronda 3 (confirmación final): 0 errores. Última ronda limpia.**

### Verificado en cada ronda (con números)
- **Datos reales** (`public/datos-reales.json`, 677 canciones): fórmula 0
  desajustes reales (324 exactas a 2 decimales; 353 difieren 0.01 solo en
  el límite .xx5 por redondeo binario del double, 286 de ellas coinciden
  con el redondeo mitad-arriba de JS y 67 quedan un céntimo abajo).
  Top 10 con desempate: 144, 167, 213, 116, 307, 606, 348, 29, 399, 145.
  170 grupos de empate. Promedio 16.4847 (de los valores guardados;
  16.4837 con totales exactos). GOD 76. Sin calificar 0. Mínimo 10.05.
  Histograma: menos-10 0, 10-12 22, 12-14 79, 14-16 157, 16-18 201,
  18-19 142, 19-20 76, suma 677, porcentajes suman 100. Baladas 18.8
  mejor género (sin empate; 2º Metal 18.4), Corridos 14.5 peor.
  IDs 478 ("NADA", Zoe, 19.15) y 627 ("CAROUSEL", Melanie Martínez,
  19.11) no cruzados. ID 677 sigue "Calle me by your name" / "Lil nas x" /
  18.38 (pendiente por API, no por código).
- **Código**: `main.cpp` (546 líneas) leído entero en la ronda 1 y
  re-leído en la ronda 2 (lista con `rank_global`, DESEMPATE/DESEMPATE_ASC,
  histograma, stats, export, POST/PUT/DELETE, arranque perezoso, CORS,
  ADMIN_TOKEN). `app.js` (758 líneas) e `index.html` (309 líneas) leídos
  enteros. `schema.sql`, README, `.env.example`, `.gitignore`,
  `.dockerignore`, `CMakeLists.txt`, `vercel.json`, manifest, `package.json`,
  BASE.md leídos.
- **Pruebas**: `node harness-pruebas.js` → **40 PASS, 0 FAIL** (24 de la
  auditoría E + 16 nuevas de la F). `node --check` OK en app.js, sw.js y
  el harness. **Sintaxis C++ OK** (`g++ -std=c++20 -fsyntax-only -include
  utility -I/tmp/crow-check/include -I/tmp/asio-check/asio/include
  -I/tmp/pqxx-stub main.cpp`, cabeceras reales de Crow v1.2.0 + asio
  1.18.2 + stub pqxx). Divs 104/104. Llaves: app.js 331/331, main.cpp
  96/96. `console.log` 0. TODO/FIXME 0 (solo "radar" en 2 comentarios
  que explican su eliminación y "recomendacion" 0).
- **Géneros/tipos**: GENEROS 22/22 y ETIQUETAS 11/11 idénticos
  frontend/backend (comparados por valor, no por etiqueta).
- **Colores**: fuchsia/violeta solo en los puntos protegidos (criterios
  de sliders, pestañas Evaluar/Gráficas, % de LETRAS/CORO, degradado
  Atardecer, título neón, borde de la canción activa, degradado del
  histograma). Grises solo en stat-gris, filas sin calificar y barra
  "Sin calificar". Dorado solo por puesto (ver R1-7).
- **Animaciones**: 7 `@keyframes` (toasts, halo dorado, entrada de filas,
  línea Atardecer, entrada del modal, esqueletos, transiciones) y regla
  global `prefers-reduced-motion` que desactiva todas.
- **Seguridad**: 0 secretos (`.env.example` solo con marcadores);
  CORS por defecto al dominio de Vercel; SQL 100% parametrizado
  (incluidos nota_min/nota_max); rate limiting con poda; escapeHtml en
  filas, toasts y modal; CSV anti-fórmulas con `trimStart()` y `|%`;
  export público por decisión del usuario (2026-11-13 08:10);
  Dockerfile `USER app`; arranque perezoso (el servidor responde
  `/api/salud` aunque la DB esté caída; `/api/salud/db` da 503).
- **Accesibilidad**: modal con `role="dialog"`, pestañas con
  `role="tab"` y `aria-selected` (inicial y al cambiar), focos visibles,
  mínimo táctil 44px (ver R1-1 y R1-2).

### Ronda 1 — 8 errores encontrados y corregidos
1. **R1-1 (BAJO) — paginación ANT/SIG sin mínimo táctil.** La auditoría E
   afirmó haber puesto `min-h-[44px]` en 8 botones de index.html, pero
   los botones ANT/SIG se generan en app.js con solo `p-1` (~24px de
   alto) y no estaban incluidos. Fix: `min-h-[44px] px-2` en ambos.
2. **R1-2 (BAJO) — botones grandes bajo 44px.** "Añadir canción",
   "Añadir y seguir agregando" y "Guardar calificación" usan `py-3`
   (~41px). Fix: `min-h-[44px]` en los tres (index.html).
3. **R1-3 (MEDIO) — `irADuplicado` fallaba más allá de la página 1.**
   Observación conocida desde la auditoría C: si el duplicado quedaba
   fuera de los primeros 50 resultados de la búsqueda por título, solo
   avisaba "NO SE ENCONTRÓ EN ESTA PÁGINA". Fix: nueva global
   `totalPaginasGlobal` (se actualiza en cada respuesta no obsoleta de
   `cargarCatalogo`) y bucle `for (p = 2; p <= totalPaginasGlobal; p++)`
   hasta encontrar el duplicado; el aviso ahora es "NO SE ENCONTRÓ EL
   DUPLICADO" y solo sale si no está en ninguna página.
4. **R1-4 (BAJO) — pestañas móviles sin `aria-selected` inicial.**
   `switchTab` lo pone al cambiar, pero el HTML inicial no tenía ninguno.
   Fix: `aria-selected="true"` en Top y `"false"` en las otras tres.
5. **R1-5 (BAJO) — sin mensaje `<noscript>`.** Con JS desactivado la
   página quedaba en blanco (todo el contenido se genera con JS).
   Fix: aviso corto tras `<body>`.
6. **R1-6 (BAJO) — sw.js no precacheaba manifiesto ni iconos.** BASE
   era `['/', '/index.html', '/app.js']`. Fix: se añaden
   `/manifest.webmanifest`, `/icon-192.png` e `/icon-512.png` (existen
   en `public/`; el instalador ignora errores por URL).
7. **R1-7 (DOC) — BASE.md y README no decían que el dorado es solo por
   puesto.** La decisión del 2026-11-13 19:19 CST (sin exigir nota ≥19;
   del 11 al 20 mezcla desde el propio color hacia el dorado) estaba
   aplicada en el código pero no escrita en los documentos cerrados.
   Fix: checklist de BASE.md y sección "Colores" de README actualizadas.
8. **R1-8 (PRUEBAS) — el harness tenía `hexAHsl` desactualizado.**
   Copiaba la versión solo-hex de app.js, así que no cubría el cambio
   más reciente (aceptar `rgb(...)`). Fix: sincronizado con app.js
   (verbatim) y 16 pruebas nuevas: color de fila completo (18.9 puesto 3
   = dorado pleno; 18.9 puesto 15 = mezcla fuchsia→dorado desde su propio
   color, sin NaN; 18.9 puesto 25 = fuchsia→verde 62.5%; 17.79 = cian→
   violeta 73.75%; 17.80 = violeta→fuchsia 50%, inicio de la ventana del
   18; 19.38 puesto 11 = verde→dorado 75%; 10.05 puesto 677 = cian),
   mezcla desde `rgb(...)` sin NaN, mínimo 44px en paginación y botones
   grandes (chequeo de fuente), búsqueda del duplicado en varias páginas
   (simulación), precache de manifiesto/iconos, `aria-selected` inicial
   y `<noscript>`.
- **Limpieza (sin error):** `revisarDuplicado()` pedía `?limit=50`, pero
  el backend ignora ese parámetro (límite fijo 50). Parámetro eliminado.
- **Falso positivo descartado:** el primer FAIL del harness nuevo
  (17.80 = cian→violeta 50%) era expectativa mía, no del código: en
  17.80 exacto empieza la ventana del umbral 18 (50% violeta→fuchsia),
  como verificó la auditoría E. Prueba corregida, no el código.

### Ronda 2 — 0 errores (re-auditoría completa desde cero)
Se re-verificó todo tras la ronda 1: `node --check` OK, harness 40 PASS,
sintaxis C++ OK, divs 104/104, llaves 331/331 y 96/96, GENEROS 22/22 y
ETIQUETAS 11/11, POST/PUT/lista/histograma/DESEMPATE re-leídos, CSV
anti-fórmulas, schema.sql, 7 keyframes, `prefers-reduced-motion` global,
`aria-selected` inicial y al cambiar, precache de sw.js, colores
protegidos. Única mejora: la sección "Pruebas" de README no mencionaba
la cobertura nueva (color de fila, rgb, 44px, duplicado en varias
páginas, precache); actualizada a 40 pruebas.

### Ronda 3 — 0 errores (confirmación final)
Tras actualizar README y escribir esta sección: `node --check` OK en
app.js, sw.js y harness; harness 40 PASS, 0 FAIL; sintaxis C++ OK;
divs 104/104; llaves 331/331 y 96/96. **La última ronda quedó limpia.**

### Observación (no es un error, no se cambia)
- En 17.79 la fila es cian→violeta al 73.75% y en 17.80 exacto pasa a
  violeta→fuchsia al 50% (salto de tono ~36°): es la semántica aprobada
  de las ventanas [umbral-0.2, umbral), verificada por la auditoría E.
  Si el usuario quisiera suavizarlo, sería una decisión de diseño nueva.

### Sin verificar (solo se puede probar al aplicar)
- Compilación y enlace completos con libpqxx real (solo sintaxis aquí;
  se prueba en el Docker de Render al aplicar).
- Comportamiento en vivo: `/api/salud/db` contra la DB real, arranque
  perezoso durante una caída de Supabase, timeout del pool bajo carga,
  sw.js v3 en el navegador, `irADuplicado` con un duplicado real más
  allá de la página 1, REINTENTAR sin conexión, histograma con una
  canción < 10 (hoy ninguna: mínimo 10.05).
- Confirmar ADMIN_TOKEN en Render (≥24 caracteres) y título/artista de
  la ID 677 por API: pendientes del usuario, no del código.
- Fase DB (corrección de géneros canción por canción): va al final,
  con aprobación por fila.

### Propuestas pendientes (necesitan decisión del usuario, no son errores)
- Token de admin en `localStorage` en texto plano: punto más débil del
  frontend, documentado, aceptable para uso personal. Mejorarlo (sesión
  en memoria) exigiría pedir la clave en cada recarga.

## Qué se hizo de nuevo en esta revisión

1. **Radar eliminado de verdad** (frontend + backend): se quitó `/api/canciones/top`,
   `cargarRadar`, `pintarRadarBtns`, `setRadar`, `comparadas`, `alternarComparar`,
   `puntaje`, `escalaRadar`, la pestaña Radar y la casilla de comparar de cada fila.
   Quedaban llamadas sueltas en guardar/eliminar/onload: también se quitaron.
2. **Histograma real**: nuevo endpoint `GET /api/canciones/histograma` (un solo
   `GROUP BY` en SQL, no baja las 677 canciones). En el frontend, barras con
   conteo real; al tocar una barra filtra el catálogo por ese rango
   (`nota_min`/`nota_max` nuevos en `GET /api/canciones`).
3. **Desempate final en el backend** (`DESEMPATE` en `main.cpp`): total, base
   (Ritmo+Letras+Coro ponderada), Importancia, bonos, Descubrimiento único,
   Coro, Ritmo, Letra, ID más antiguo. Se aplica al orden por defecto y a los
   órdenes por métrica. Verificado con datos sintéticos (empate 19.34: gana
   la de mejor base). La nota se sigue mostrando con 2 decimales.
4. **Colores 50–75 corregidos y verificados**: el degradado va del 50% al
   entrar en la ventana (últimas 0.2) al 75% en el umbral; la canción conserva
   el 25% de su color. Se encontró y se corrigió un error: el degradado hacia
   verde (18.8–19) y hacia fuchsia (17.8–18) nunca se aplicaba por una
   condición `>=` mal puesta. Verificado numéricamente con Node (50% al
   inicio, ~75% junto al umbral). Verde→dorado por puesto: puesto 20 = 50%,
   puesto 11 = 75%, Top 10 dorado pleno. Toda la fila se ilumina (fondo,
   borde y halo), no solo la cajita.
5. **Se encontró y se corrigió un error de sintaxis** que habría roto la página:
   `cGlow`/`cText`/`cBox` se declaraban dos veces en el mismo bloque
   (`let` + `const`). `node --check` ahora pasa en `app.js` y `sw.js`.
6. **Carga desde el segundo 0**: esqueletos (skeletons) en vez de "> Cargando...",
   stats en "—" hasta que llegan los datos (antes 0).
7. **Sliders más naturales, solo arrastrar**: thumb de 30px con rebote al
   agarrar, zona de 46px, `touch-action: none`. Sin botones +/-, sin entrada
   de número y **sin total previsto** (vetado: haría la calificación menos
   objetiva). Solo se ve el valor de cada slider.
8. **Importancia separada**: bloque propio "Importancia · aparte · máximo 5",
   con nota de que se suma aparte; base en su propio bloque "máximo 10".
   Bonos con las definiciones del usuario, en sus palabras.
9. **Interfaz**: crédito "Hecho por Gémini y mejorado por Muse", título más
   grande con glow, stats 2×2 en celular (Pendientes se queda), pestañas
   fijas abajo en celular, "Métricas" → "Evaluar", "Borrar" → "Limpiar",
   sin porcentajes en las etiquetas de los sliders, sin texto de descripción
   de fórmula, chips de género con conteo, paginación "1-50 DE 677",
   género obligatorio al agregar (ya no "Otro" por defecto), autocompletado
   de artista (datalist, se llena con los artistas del catálogo cargado).
10. **Backend, limpieza y seguridad**: `parseEntero`/`parseDoble` seguros
    (un PORT o página inválidos ya no tumban el servidor), validación de
    género/etiqueta contra lista blanca en POST y PUT /info (400 si no es
    válido), `W.abort()` explícito en los 404/409 dentro de transacciones,
    poda de entradas viejas en el mapa de fallos de `autorizado()` (antes
    crecía sin límite), stats con mediana/mínimo/máximo, comentario en
    `/api/salud` (responde OK aunque la DB esté caída), mensaje
    "SIN CONEXIÓN CON EL SERVIDOR" unificado en una constante.
11. **Archivos nuevos**: `schema.sql` (tabla, índice único
    lower(título, artista), índices de nota/género/búsqueda, `created_at` /
    `updated_at` con trigger), `README.md` (arquitectura, variables,
    despliegue, endpoints, colores), `.env.example` (solo nombres, sin
    claves reales; recuerda usar el pooler 6543 en Render).
12. **Archivos arreglados**: `.gitignore` reescrito limpio en UTF-8 (el
    anterior era UTF-16 con duplicados), `Dockerfile` con Crow fijado a
    v1.2.0 (antes `master`, que cambia sin aviso), `sw.js` sin `/styles.css`
    en precache (no existe, guardaba un 404) y versión de caché v2.

## Verificación hecha

- `node --check` OK en `app.js` y `sw.js`. Llaves de `main.cpp` balanceadas
  (118/118). Desempate verificado con datos sintéticos.
- Sin referencias a radar en el código preparado (salvo un comentario).
  Sin totales previstos. Sin secretos reales (`.env.example` solo tiene
  valores de ejemplo). Diff total contra el original: 709 líneas.
- **Verificado en vivo 2026-11-13 ~07:31 CST**: el backend despertó solo y
  responde bien: `/api/salud` 200 en 0.76 s, `/api/canciones/stats` total 677,
  promedio 16.4847, obras maestras 76, sin calificar 0. El export bajó bien
  (213,740 bytes, 677 canciones, 0 errores de fórmula). El desempate aplicado
  a los datos reales deja el Top 10 así: 144 (19.60), 167 (19.57), 213 (19.54),
  116 (19.52), 307 (19.50), 606 (19.44), 348 (19.38, base 9.78), 29 (19.38,
  base 9.68), 399 (19.34), 145 (19.34). Hay 170 grupos de empate con 428
  canciones involucradas, así que el desempate sí hace falta. Histograma real:
  10-12: 22, 12-14: 79, 14-16: 157, 16-18: 201, 18-19: 142, 19-20: 76.

## Reanálisis 2026-11-13 ~08:11 CST (a petición del usuario, antes de la vista previa)

- **Oro por puesto solo en orden Top**: el dorado del Top 10 y el degradado
  verde→dorado se aplicaban según el puesto de la página aunque se ordenara
  por "peores" o por métrica, donde el puesto 1 no es el Top 10. Corregido:
  solo se aplica cuando `orden === 'top'`.
- **Botón para quitar el filtro de rango**: el toast decía "toca para quitar
  el filtro" pero tocarlo no hacía nada. Ahora hay un botón visible
  "Quitar filtro de rango" junto al histograma, que aparece al filtrar.

- **Top GLOBAL (aclaración del usuario 2026-11-13 08:21 CST)**: el puesto y el
  dorado se calculan por el ranking global por calificación, no por la
  página, el filtro ni el orden actual. El backend ahora devuelve
  `rank_global` calculado con un CTE `ranking` (`RANK() OVER` con el mismo
  desempate) sobre TODA la tabla antes de filtrar: si se filtra por Rap,
  la #1 de Rap sigue teniendo su puesto global (p. ej. #50, no dorada).
  El frontend usa `c.rank_global` para el color y para el "#" que se
  muestra. Detalle importante: un `RANK()` directo en el SELECT se habría
  calculado solo sobre las filas filtradas, por eso se usa el CTE.

## Auditoría completa contra el plan — 2026-11-13 ~08:27 CST (a petición del usuario)

El usuario notó que se habían perdido cosas ya cambiadas. Se releyó el plan
completo y se comparó línea por línea con el código preparado. Errores
encontrados y corregidos (31 cambios en este pase):

1. **Navegación abajo en vez de arriba**: el plan dice barra fija bajo el
   título y que la barra inferior desaparece; yo la había dejado abajo
   (sticky bottom). Corregido: pestañas móviles arriba (sticky top) y barra
   de navegación superior en PC con los 4 espacios. Además `switchTab`
   volvía a poner `py-2.5` y borraba el `py-3`.
2. **Aviso de despertar a los 4 s**: el plan dice desde el segundo 0. Ahora
   el aviso sale al instante, junto con los esqueletos. Se eliminó el
   temporizador de 4 s.
3. **Número de puesto sin teñir**: el plan exige que el "#" lleve el color
   de su categoría. Ahora lleva `colorBase`.
4. **Sin halo animado en el Top 10**: el plan lo exige ("brillo más
   especial, con halo animado"). Añadida animación `haloDorado` (2.4 s) y
   clase en las filas del Top 10.
5. **"Peores" sin desempate**: el plan dice que el desempate se aplica en
   la lista principal Y en los ordenamientos por métrica; "peores" usaba
   solo `id ASC`. Añadido `DESEMPATE_ASC`.
6. **Género sin acentos en la fila**: se mostraba el valor crudo
   ("Electronica"). Ahora usa el nombre con acentos de GENEROS.
7. **Botón siempre "Actualizar calificación"**: el plan pide distinguir
   guardar nuevo de actualizar. Ahora dice "Guardar calificación" si la
   canción no tiene nota y "Actualizar calificación" si ya la tiene.
8. **Campo interno `recomendacion` sin renombrar**: el plan pide que
   coincida con "Descubrimiento único". Renombrado a
   `descubrimiento_unico` en HTML y JS.
9. **Editar/Eliminar pequeños**: ahora tienen mínimo 44×44 px táctiles.
10. **Promedio por género sin su propia tarjeta**: ahora es una tarjeta
    propia dentro de Gráficas.
11. **CORS en `*`**: por defecto ahora es el dominio de Vercel
    (si no hay ALLOWED_ORIGIN).
12. **Canciones sin calificar devolvían 5**: el backend devolvía ritmo 5,
    letras 5, coro 5, importancia 2.5, que parecen notas reales. Ahora
    devuelve nulos y el frontend pone los sliders en su valor neutro.
13. **Build falso en package.json**: ahora el script dice claro que no
    hay build (Tailwind por CDN).
14. **Avisos tapando la paginación en celular**: el contenedor de avisos
    ahora va arriba en móvil.

Pendientes que NO son errores de código y quedan para después: confirmar
ADMIN_TOKEN en Render (≥24), título/artista de la ID 677 por API, fase DB
al final, y unificar el código de los modales de editar/borrar (refactor
grande, sin cambio de comportamiento).

## Auditoría D — 2026-11-13 ~16:48 CST (encargo del usuario)

Cuarta vuelta completa, centrada en lo nuevo desde la auditoría C: las 8
mejoras del modal (~16:42 CST) y las correcciones y mejoras de Gráficas
(~16:48 CST). Se releyeron completos main.cpp, public/index.html,
public/app.js, public/sw.js, schema.sql, README.md, .env.example,
.gitignore, .dockerignore, Dockerfile, public/manifest.webmanifest,
vercel.json, package.json, CMakeLists.txt, harness-pruebas.js y BASE.md.
Diff contra el original limpio (commit f3d68bd): main.cpp 376 líneas,
app.js 609, index.html 274, sw.js 6. Nada en vivo, nada al repo real, nada
a la DB. Ninguna decisión cerrada cambió.

### Verificado, con números

- **Harness: 18 PASS, 0 FAIL** (13 previos + 5 nuevos, ver abajo).
- **Fórmula:** 324 exactas a 2 decimales, 353 difieren 0.01 solo en el
  límite .xx5 (redondeo binario del double), 0 desajustes reales. ID 144 =
  19.60. Notas con más de 2 decimales: 0.
- **Desempate y Top global:** Top 10 = 144, 167, 213, 116, 307, 606, 348,
  29, 399, 145. Empate 19.38: 348 (base 9.78) antes que 29 (base 9.68).
  170 grupos de empate. rank_global: 144 = #1, 606 = #6. Los #1 de género
  con ≥19 fuera del Top 10 global (#17 Metal, #33 Electronica, #38 Rock,
  #50 OST, #52 Trap, #53 Cumbia) no son dorados.
- **Histograma con menos-10:** menos-10 0, 10-12 22, 12-14 79, 14-16 157,
  16-18 201, 18-19 142, 19-20 76, sin calificar 0; suma 677. El ORDER BY
  CASE deja menos-10 primero y sin calificar último. Los 8 filtros del
  frontend reproducen sus bins exactamente (datos reales + sintéticos).
  Porcentajes redondeados: 0+3+12+23+30+21+11+0 = 100.
- **Género top:** Baladas 18.8 (21 canc.), sin empate en el máximo (2º
  Metal 18.4), peor Corridos 14.5. 17 géneros con canciones.
- **Colores:** mezcla HSL 50-75 exacta (puesto 20 = 50%, puesto 11 =
  75%), saturación en transición 82% (RGB daba 24%).
- **Sintaxis:** `g++ -std=c++20 -fsyntax-only` con las cabeceras reales de
  Crow v1.2.0 + asio + stub pqxx → exit 0. `node --check` OK en app.js,
  sw.js y el harness.
- **Modal (8 mejoras verificadas en código):** panel .panel-fondo +
  .panel-neon + rounded-3xl; etiquetas visibles (Título, Artista, Género,
  Tipo de versión); confirmar de editar con .btn-atardecer y de eliminar
  en rojo; eliminar muestra título y artista; animación entradaModal 0.2 s
  (la regla global de prefers-reduced-motion la desactiva); estados
  GUARDANDO… / ELIMINANDO… con restablecimiento a CONFIRMAR en cada
  apertura (abrirModal); cerrar tocando fuera del panel; nota guardada +
  género en el modal de editar.
- **Gráficas (7 mejoras verificadas en código):** el histograma se
  recarga tras agregar (app.js ~544), calificar (~584) y eliminar (~685);
  rango 'menos-10' en el SQL con ORDER BY CASE; filtro [0.01, 9.99] que
  excluye las sin calificar (COALESCE 0); porcentajes junto al conteo;
  .rango-activo (borde y glow sky, se limpia al quitar el filtro);
  "Quitar filtro de rango" sky y píldora; .genero-top en la primera fila
  (la lista viene ordenada por promedio DESC); barras con el color de su
  categoría (cian 10-16, degradado cian→violeta 16-18, fuchsia 18-19,
  verde 19-20, gris sin calificar).
- **Decisiones cerradas intactas:** colores y degradado 50-75, desempate,
  Top global, 4 espacios (Top, Evaluar, Agregar, Gráficas), sin totales
  previstos, sliders solo arrastre, export público (sin `autorizado()` en
  /exportar), GENEROS 22/22 y ETIQUETAS 11/11 idénticos frontend/backend.
  Las 11 correcciones de la auditoría B siguen intactas (COALESCE 'Por
  clasificar' ×6, `modalResolve = null` ×2, timeout del pool 5 s, sw.js v3
  solo cachea respuestas OK). Arranque perezoso y Dockerfile USER app
  intactos. Sin secretos; divs 42/42; llaves balanceadas (main.cpp 96/96,
  app.js 310/310); console.log 0; "radar" solo en 2 comentarios;
  "recomendacion" 0.

### 1 problema encontrado y corregido (medio-bajo)

1. **Editar dejaba obsoletos los promedios por género y el panel
   Evaluar.** Tras PUT /info con éxito solo se llamaba a
   `cargarCatalogo`: si se cambiaba el género, "Promedio por género" y
   los chips quedaban con los datos viejos hasta recargar; y si la
   canción editada era la seleccionada en Evaluar, su caja
   (`cancion-activa`) y su contexto seguían con título, artista y género
   viejos. Es la misma familia de obsolescencia que la corrección del
   histograma. **Corrección (app.js, `openEditModal`):** tras el éxito se
   llama a `cargarGeneros()` y, si la editada es la seleccionada, se
   actualizan `cancion-activa` y `cancion-contexto` con los datos nuevos
   (sin re-seleccionar, porque `seleccionarCancion` mostraría otro toast
   y cambiaría de pestaña en celular). El histograma no se toca: editar
   no cambia la nota. Verificado con `node --check`.

### Harness ampliado (5 pruebas nuevas, 18 en total)

- Binning con la lógica exacta del CASE SQL (incluye 'menos-10').
- 'menos-10' sintético: 8.5 y 9.99 → menos-10, 0 → sin_calificar, 10.05
  → 10-12, 19.99 → 19-20.
- Filtro = bin en los 8 rangos (datos reales + sintéticos).
- Orden CASE del histograma.
- Porcentajes redondeados suman 100.
- Género top: Baladas 18.8 sin empate en el máximo.
README: el endpoint /histograma ahora documenta sus 8 rangos y la
recarga tras agregar, calificar o eliminar.

### Sin verificar (pendiente de la aplicación en vivo)

- Compilación completa con libpqxx real y enlace: solo en el build de
  Docker en Render (la sintaxis se verificó aquí con stub).
- Pruebas en vivo al aplicar: endpoint /histograma real con una canción
  < 10 (hoy no existe ninguna: mínimo 10.05), /api/salud/db, arranque
  perezoso con la DB caída, sw.js v3.
- Confirmar ADMIN_TOKEN en Render (≥24) y título/artista de la ID 677
  por API: pendientes, necesitan al usuario.
- DB al final: fase de géneros por lotes con aprobación por fila.

### 1 propuesta que necesita decisión del usuario

- **Tocar de nuevo la barra activa para quitar el filtro:** hoy, tocar
  la barra de un rango que ya está filtrando vuelve a aplicar el mismo
  filtro; no hay forma de quitarlo desde el histograma (solo con el
  botón "Quitar filtro de rango"). Se puede hacer que el segundo toque
  quite el filtro. No aplicado sin preguntar: cambia el comportamiento
  del clic.

## Filas: acciones en segunda línea, sin lag, altura uniforme — 2026-11-13 ~20:21 CST (diagnóstico por capturas del usuario)

El usuario reportó 3 cosas: (1) la página se lagea demasiado;
(2) al seleccionar una canción la fila se rompía (título en
sílabas, "ORIGINAL" en vertical, artista "M…", fila gigante);
(3) el tamaño mínimo de los recuadros debe ser el de la canción
"PRECAUCIÓN, ESTÁ CANCIÓN ES UN HECHIZO" (título en 3 líneas).

Causa de (2): al aparecer, los botones Editar/Eliminar ocupaban
ancho dentro de la línea flexible de la fila y dejaban ~55px para
el título. Arreglo: la fila ya no es una sola línea flexible; el
contenido (puesto + título + artista + género/puntos + nota) va en
su propia línea y las acciones van en una **segunda línea** a todo
lo ancho, alineadas a la derecha, lado a lado. Solo aparecen en la
fila seleccionada (regla `.active-song .row-acciones`) o con foco;
ya no aparecen al pasar el mouse, para que el resto de las filas
no salten al crecer la fila. Tocar una canción ya no vuelve a
pintar la lista (seleccionarTarget solo cambia clases), así que
aparecer es instantáneo.

Lag (1): dos causas. (a) La animación de entrada escalonada se
repetía en cada paginación, filtro o búsqueda (50 filas
re-animándose con hasta 450ms de retraso): ahora solo corre la
primera vez (`animacionEntradaLista` + clase `.sin-animacion`).
(b) Las barras de navegación fijas usaban `backdrop-blur`, que
obliga al teléfono a desenfocar todo lo que pasa por detrás en
cada cuadro al desplazar: ahora usan fondo sólido (`bg-[#040b1a]`
en el celular, `bg-[#0f1a36]` en PC), visualmente igual. El halo
dorado animado se deja como está; si siguiera el lag, es el
siguiente sospechoso y se dejaría fijo.

Altura uniforme (3): nueva función `igualarFilas()`: tras pintar
el catálogo mide la fila más alta de la página (sin contar la
seleccionada, que es más alta por su línea de acciones) y pone
esa altura como `min-height` de todas. Se vuelve a medir al
cambiar el ancho de la ventana (con pausa de 200ms), porque los
títulos envuelven distinto. El mínimo no es un tope: la fila
seleccionada puede crecer por encima.

**Corrección 2026-11-13 ~20:36 CST (petición del usuario: con la
altura uniforme el contenido quedaba pegado arriba y se veía feo
el espacio vacío de abajo):** la fila ahora es `flex flex-col
justify-center`, así el contenido (y la línea de acciones cuando
aparece) queda centrado verticalmente dentro del recuadro. La
barra de progreso es absoluta y no le afecta.

## Filas: botones ocultos comían ancho + género a la línea de puntos — 2026-11-13 ~20:16 CST (diagnóstico por captura del usuario)

La captura del usuario mostró el problema real: el artista se
recortaba a "LEO…", "JENNI…", "KAR…" y las filas se veían altas y
vacías. Causa: el contenedor de Editar/Eliminar usaba solo
`opacity:0`, que no colapsa el ancho — los botones invisibles
seguían ocupando ~68px y apretaban la columna izquierda, y la
burbuja del género en la misma línea del artista lo recortaba aún
más. Arreglo: (1) `.row-acciones` ahora es `display:none` en reposo
y solo aparece (`display:flex`) en la fila seleccionada (regla
`.active-song .row-acciones`), al pasar el mouse o con foco — el
primer intento con `w-0 overflow-hidden` colapsaba el ancho pero
seguía reservando ~90px de alto en el celular (dos botones de 44px
en columna), y fue la propia revisión de la vista previa quien lo
señaló y lo corrigió; se aplicó igual en el código preparado; (2) el artista vuelve a tener su propia línea a
todo lo ancho y el género baja a la línea de los puntos de bonos
(burbuja + 5 puntos en una sola línea). La barra, los puntos y el
tipo siempre visible no cambian. La captura también mostraba la
barra gruesa y pegada abajo: era la versión anterior a la
corrección de las 20:11 (la app muestra a veces una copia vieja;
hay que abrir la vista previa desde la tarjeta nueva).

## Tipo de versión siempre visible — 2026-11-13 ~20:05 CST (decisión del usuario)

El género ya se veía (burbuja junto al artista) y el tipo también
(burbuja tras el título), pero el tipo se escondía cuando era
"Original", que son 592 de las 677 canciones. Ahora se muestra
siempre: "Original" en gris (bg-gray-800, texto gray-300, borde
gray-700) y los demás tipos en índigo como antes, para que el valor
por defecto no compita con las versiones especiales. Además la
burbuja muestra el nombre de la etiqueta como en el formulario
("Slowed + Reverb" en vez del valor guardado "Slowed Reverb") y
una etiqueta nula se trata como "Original".

## Filas del Top: ambos (barra + puntos) — 2026-11-13 ~20:02 CST (decisión del usuario)

El usuario vio las 3 variantes (artefacto "Variantes filas Top") y
eligió **AMBOS, definitivamente ambos**: (1) barra de progreso fina
de 3px al pie de cada fila, ancho = nota/20 (19.60 = 98%), en el
color de su categoría con su brillo; la fila es `relative
overflow-hidden` para que la barra respete sus esquinas redondeadas
(el halo dorado es box-shadow propio de la fila, no lo recorta el
overflow); sin barra en canciones sin calificar. (2) 5 puntos de
7px debajo de la línea artista + género, en orden Antigüedad,
Nostalgia, Complejidad, Descubrimiento único, Arte Visual; encendido
= color de la categoría, apagado = gris #374151; con `title` para
ver el nombre del bono al pasar el mouse.

**Corrección 2026-11-13 ~20:08 CST (petición del usuario: la barra
no se veía):** la barra pasó de 3px a 5px de alto, con brillo más
fuerte y una pista tenue de fondo.

**Corrección 2026-11-13 ~20:11 CST (petición del usuario: la barra
estaba demasiado baja y el cambio la había hecho demasiado gruesa):**
la barra vuelve a ser una línea fina de 3px, sin pista, pero
**levantada 6px** sobre el borde inferior de la fila. Campos del JSON:
`antiguedad`, `nostalgia`, `complejidad`, `descubrimiento`,
`arte_visual` (0/1). La barra siempre representa la nota final,
aunque se ordene por un criterio.

## Filas del Top rediseñadas — 2026-11-13 ~19:47 CST (recomendaciones de Muse, aprobadas por el usuario)

El usuario pidió modificar lo que muestra cada fila y aceptó las 5
recomendaciones de Muse: (1) se quitó el ID de la fila (dato interno,
no aportaba al navegar); (2) la nota es más grande (text-lg) y sin
etiqueta ni "/20" — la etiqueta solo queda cuando se ordena por un
criterio (RITMO, LETRAS, CORO, IMPORTANCIA), para no perder el
contexto; (3) el artista es más grande (13px) y más claro (gray-300);
(4) el género va junto al artista en la misma línea ("Artista ·
Género"), así la fila queda en dos líneas limpias; (5) Editar y
Eliminar solo aparecen en la fila seleccionada en el celular (clase
.row-acciones + regla .active-song .row-acciones; en PC siguen
apareciendo al pasar el mouse y con foco). El puesto #N, el título con
sus etiquetas y la caja de la nota no cambian.

**Corrección 2026-11-13 ~19:52 CST (petición del usuario):** el "/20"
vuelve a la caja de la nota (y "/10" o "/5" cuando se ordena por un
criterio), con el número grande (text-lg) como quedó en el rediseño.
Las filas se veían demasiado minimalistas y el usuario pidió qué más
agregar (ver propuestas en la conversación).

## Dorado solo por puesto — 2026-11-13 ~19:19 CST (decisión del usuario)

Propuesta de la auditoría final, aprobada por el usuario: el dorado del
Top 10 ya no exige nota >= 19; es dorado solo por puesto global. Si
algún día hubiera menos de 10 canciones con >= 19, una #3 con 18.9 será
dorada. Cambios en app.js: el Top 10 pinta '#facc15' con glow dorado y
halo si rank <= 10 (sin condición de nota); del 11 al 20 la mezcla va
desde el propio color de la canción hacia el dorado (antes siempre
desde verde, porque todas eran >= 19); la excepción del brillo en
transición ahora es solo por puesto. Hoy no cambia nada visible: los 10
primeros tienen >= 19.34 y los del 11 al 20 siguen siendo verdes.

## Auditoría final — 2026-11-13 ~19:07 CST (encargo del usuario)

Auditoría completa del paquete preparado contra el original limpio
(commit f3d68bd). Nada subido, nada desplegado, nada tocó la DB en vivo.
Diff final contra el original: main.cpp 376 líneas, app.js 636,
index.html 281, sw.js 6, Dockerfile 8, package.json 4, manifest 4,
.gitignore reescrito en UTF-8 limpio. Archivos nuevos: README.md,
.env.example, .dockerignore, schema.sql, harness-pruebas.js, BASE.md,
REVISION.md, 3 lotes de géneros (propuestas, nada en vivo).

### Qué se verificó (con números)

- **Harness: 24 PASS, 0 FAIL** (`node harness-pruebas.js` → TODO OK).
  Las 18 pruebas previas siguen pasando; se añadieron 6 nuevas
  (fronteras del degradado 50-75 y filtro guardado viejo).
- **Fórmula:** 0 desajustes reales en las 677 (353 difieren 0.01 solo en
  el límite .xx5, redondeo binario del double). ID 144 = 19.60.
  Promedio guardado 16.4847, GOD 76, sin calificar 0, mínimo 10.05.
- **Desempate y Top global:** Top 10 = 144, 167, 213, 116, 307, 606,
  348, 29, 399, 145. Empate 19.38: 348 (base 9.78) antes que 29 (base
  9.68). 170 grupos de empate. rank_global: 144 = #1, 606 = #6.
- **Histograma:** menos-10 0, 10-12 22, 12-14 79, 14-16 157, 16-18 201,
  18-19 142, 19-20 76, sin calificar 0; suma 677. Los 8 filtros del
  frontend reproducen sus bins exactamente. Porcentajes suman 100.
- **Géneros:** Baladas 18.8 (21 canc.) mejor, sin empate en el máximo
  (2º Metal 18.4), peor Corridos 14.5. Con la migración aplicada:
  Rap 182, Por clasificar 36. GENEROS 22/22 y ETIQUETAS 11/11 idénticos
  frontend/backend.
- **Colores:** fuchsia/violeta restantes solo en los protegidos
  (criterios de sliders, pestañas Evaluar/Gráficas, % de LETRAS/CORO).
  Grises solo en stat-gris, filas sin calificar y barra sin calificar.
  Mezcla HSL 50-75 exacta (puesto 20 = 50%, puesto 11 = 75%),
  saturación en transición 82%.
- **Cambios recientes verificados:** 6 mejoras de pantalla de carga
  (esqueletos en Gráficas, .esqueleto con barrido sky 1.4 s, stats con
  pulso que se quita al cargar, aviso de despertar solo antes de la
  primera carga con éxito vía catalogoListo, botón REINTENTAR,
  #barra-carga fija con degradado Atardecer), barra de pestañas móvil
  con fondo, burbujas filtradas y colapsables con top 3 (Todos + Rap,
  Pop, Reguetón + "Ver más · 12", activo siempre visible), corrección
  de editar de la auditoría D (cargarGeneros + caja/contexto de Evaluar).
- **Animaciones (7):** slideIn/fadeOut de toasts, halo dorado 2.4 s,
  entrada de filas 0.35 s escalonada, línea Atardecer 6 s, entrada del
  modal 0.2 s, esqueletos 1.4 s, transiciones de pestañas/botones
  0.25 s. La regla global `@media (prefers-reduced-motion: reduce)`
  las desactiva todas (`animation: none !important; transition: none
  !important`). Sin cambios de animación necesarios: la transición de
  ancho en las barras del histograma no aplica porque las barras se
  recrean en cada carga (innerHTML), así que nunca se vería.
- **Seguridad:** sin secretos reales en el paquete (escaneo de patrones:
  0; `.env.example` solo placeholders). CORS por defecto al dominio de
  Vercel (vacío también cae ahí). SQL 100% parametrizado (nota_min/
  nota_max como $3-$6, LIKE con `%`/`_`/`\` escapados, orden por
  lista blanca). Rate limiting 5 fallos/IP/10 min con purga de
  expirados. Validación de género/etiqueta contra las listas nuevas.
  escapeHtml en filas, toasts, modal y datalist. CSV con protección
  anti-fórmulas (trimStart + `= + - @ | %`). Export público por
  decisión del usuario. Dockerfile `USER app`. Arranque perezoso con
  DB caída (`/api/salud` responde, `/api/salud/db` 503). Token en
  localStorage en texto plano: punto más débil, documentado en README,
  aceptable por uso personal.
- **Base de datos:** schema.sql revisado: CREATE TABLE con columnas
  nuevas (instrumental, banda_sonora), índice único
  LOWER(titulo+artista), índices de nota/género/búsqueda (con la nota
  de que text_pattern_ops solo sirve con prefijos y pg_trgm si el
  catálogo crece a miles), trigger updated_at, migración comentada
  (Hip Hop→Rap, Otro→Por clasificar, OST/Asiática por canción con
  aprobación). Nada toca la DB en vivo.
- **Logs/monitoreo/mantenimiento:** logError con fecha UTC ISO-8601 y
  ruta en los 9 endpoints + `/api/salud/db`; avisos de arranque de
  ADMIN_TOKEN (falta o <24); pool con timeout 5 s; README con secciones
  de logs, pruebas y seguridad actualizadas (incluye los 8 rangos del
  histograma y las pruebas nuevas). Código muerto: 0 console.log;
  "radar" solo en 2 comentarios; "recomendacion" 0; TODO/FIXME 0.
  Los 10 catches del frontend registran console.error.
- **Rendimiento:** lista paginada a 50 (2 consultas, sin N+1);
  histograma un GROUP BY; stats y géneros una consulta cada uno; el
  CTE de rank_global recorre la tabla en cada lista (677 canciones,
  despreciable; con 1000+ sigue bien). Export 213 KB.
- **Accesibilidad:** modal con role=dialog + aria-modal + focus al
  primer campo + cerrar con Escape y tocando fuera; filas con
  tabindex=0 y Enter; chips con aria-pressed; pestañas con
  role=tablist/tab + aria-selected; toasts con role=status y
  aria-live=polite; :focus-visible con outline cian; 58 IDs usados
  en JS, todos presentes en el HTML, 0 duplicados; divs 104/104,
  llaves 0 en los 4 archivos; `node --check` OK en app.js, sw.js y
  harness; `g++ -std=c++20 -fsyntax-only` OK con cabeceras reales de
  Crow v1.2.0 + asio 1.18.2 + stub pqxx (el /tmp se había limpiado
  con el reinicio de la VM: se volvieron a descargar Crow y asio y
  se recreó el stub; la sintaxis pasa igual que antes).
- **IDs verificadas:** 478 "Nada" — Zoe — Rock — 19.15 y 627
  "Carousel" — Melanie Martínez — Pop — 19.11 (no cruzadas). ID 677
  sigue "Calle me by your name" — "Lil nas x" — 18.38 (pendiente por API).

### Qué se encontró y corrigió (7 problemas, todos en el código preparado)

1. **MEDIO — filtro guardado viejo rompía las burbujas y dejaba la
   página en esqueletos.** Si el localStorage guardaba un género que
   ya no existe (Hip Hop, Otro, OST, de antes de la migración),
   `pintarChips()` hacía `visibles.push(base.find(...))` con
   `undefined` y el `.map(([v, n]) => ...)` lanzaba TypeError en
   `window.onload`, así que ni el histograma, ni los géneros, ni el
   catálogo llegaban a cargar. Corrección: `restaurarFiltros()`
   resetea a 'todos' cualquier género guardado que no esté en
   GENEROS, y el push del activo quedó guardado (`if (encontrado)`).
   Harness: 3 pruebas nuevas (sanitizar + chips con filtro viejo).
2. **BAJO — la barra de carga se ocultaba con una respuesta vieja.**
   En `cargarCatalogo`, `#barra-carga` se ocultaba justo después de
   `res.json()`, antes de comprobar si la petición era la vigente
   (`miReq !== reqActual`): una respuesta vieja apagaba la barra
   mientras la petición nueva seguía cargando. Ahora se oculta
   después de esa comprobación.
3. **BAJO — el inicio exacto de la ventana de degradado no
   mezclaba.** `grad()` usaba `nota <= umbral - 0.2`, así que una
   nota exactamente en 17.80, 18.80 o 17.60 quedaba con su color
   pleno en vez de mezclar al 50%. Cambiado a `<`, como dice la
   decisión ("en las últimas 0.2 antes de cada umbral"). Harness:
   3 pruebas nuevas de fronteras (17.80/18.80/17.60 = 50%,
   17.90 = 62.5%, 18.99 = 73.75%, umbral = sin mezcla).
4. **BAJO — botones de acción con menos de 44px táctiles.**
   Paginación ANT/SIG (`p-1`), modal CANCELAR/CONFIRMAR, Limpiar,
   Exportar CSV/JSON, Buscar, Quitar filtro de rango y Siguiente sin
   calificar llevaban `min-h-[44px]` (8 en index.html; Editar/
   Eliminar ya lo tenían en app.js). Las burbujas de género se
   dejan como están: son controles compactos y el usuario aprobó
   su aspecto.
5. **BAJO — favicon con emoji.** El favicon era 🎧; por la regla
   del usuario (nada de emojis), ahora es la nota musical ♪ en
   cian (`%E2%99%AA`).
6. **BAJO — `.env.example` con valores de aspecto real.**
   Eran ejemplos falsos en español (usuario/contraseña de ejemplo),
   pero con forma de URI real. Ahora son placeholders
   inconfundibles (`postgres://USUARIO:CONTRASEÑA@TU-PROYECTO.pooler.supabase.com:6543/postgres`,
   `TU_CLAVE_ADMIN_DE_AL_MENOS_24_CARACTERES_ALEATORIOS`).
7. **BAJO — `#barra-carga` sin `aria-hidden`.** Es decorativa;
   ahora lleva `aria-hidden="true"`. README actualizado con la
   cobertura nueva del harness.

### Qué quedó sin verificar

- **Compilación completa con libpqxx real y enlace:** solo se puede
  probar en el build de Docker en Render al aplicar. Aquí solo se
  verificó sintaxis con el stub pqxx (Crow y asio reales).
- **Pruebas en vivo al aplicar:** endpoint /histograma real con una
  canción < 10 (hoy no existe ninguna: mínimo 10.05),
  `/api/salud/db`, arranque perezoso con la DB caída, pool bajo
  carga, sw.js v3, la barra de carga y el botón REINTENTAR sin
  conexión, y el reseteo del filtro guardado viejo en un navegador
  que lo tenga.
- **ADMIN_TOKEN en Render (≥24) y título/artista de la ID 677 por
  API:** pendientes, necesitan al usuario y la laptop.
- **DB al final:** fase de géneros por lotes con aprobación por fila
  (lotes 1-3 preparados: OST/Asiática, Hip Hop/Otro, Villano
  Antillano; nada en vivo).

### Propuestas que necesitan decisión del usuario

- **Dorado del Top 10 si la nota baja de 19 (latente, hoy imposible).**
  El código pinta dorado solo si `rank <= 10` Y `nota >= 19`, y la
  mezcla verde→dorado del Top 20 también exige `nota >= 19`. Hoy
  coincide con la decisión (los 10 primeros tienen ≥19.34 y hay 76
  GOD), pero si algún día hubiera menos de 10 canciones ≥19, una
  #3 con 18.9 quedaría fuchsia en vez de dorada. ¿Se hace el dorado
  solo por puesto, sin importar la nota? No se cambió sin preguntar:
  toca la jerarquía de colores.
- **`irADuplicado` si el duplicado está más allá de la página 1
  (>50 coincidencias):** avisa "NO SE ENCONTRÓ EN ESTA PÁGINA".
  Observación conocida desde auditorías anteriores; raro en la
  práctica.
- **Token en localStorage en texto plano:** punto más débil del
  frontend, documentado y aceptado por uso personal. Se puede
  mejorar después (sesión en memoria en vez de localStorage), pero
  obligaría a pedir la clave en cada recarga.

## Burbujas colapsables: top 3 — 2026-11-13 ~18:21 CST (decisión del usuario)

El usuario: en vez del top 5, el top 3 de géneros. Ahora se ven Todos +
Rap 182, Pop 130 y Reguetón 122 + "Ver más · 12". El resto igual.

## Burbujas colapsables — 2026-11-13 ~17:06 CST (decisión del usuario)

El usuario eligió la opción colapsable: se ven Todos + los géneros con
más canciones + "Ver más · N", y al tocarlo se despliegan todos con
"Ver menos". El top se calcula por conteo (con los datos reales: Rap
182, Pop 130, Reguetón 122, Electrónica 47, Banda 40), no fijo, así
cambia si agregan canciones. El 2026-11-13 ~18:21 CST el usuario lo
cambió de top 5 a top 3. El género activo siempre queda visible
aunque no esté en el top 5. Estado en chipsExpandidos, botón
alternarChips().

## Menos burbujas de género — 2026-11-13 ~17:02 CST (corrección por captura del usuario)

El usuario: el texto blanco del Top es innecesario y las burbujas de
género son demasiadas. (1) El texto explicativo del Top ("El # y el color
de cada canción salen de su puesto en el Top global...") NO está en el
código preparado: lo añadió el constructor de la vista previa por su
cuenta; se quita solo en la vista previa. (2) Las 22 burbujas se reducen
a 16 (Todos + 15 géneros con canciones): pintarChips() oculta los
géneros vacíos una vez que /generos devuelve los conteos (bandera
generosCargados; antes de eso se muestran todos para no dejar la zona
vacía). El género activo se mantiene visible aunque quede vacío, para
poder quitar el filtro. Los géneros vacíos SIGUEN en la lista GENEROS
para Agregar y Editar, solo se ocultan del filtro. Con los datos
reales (tras la migración Hip Hop→Rap y Otro→Por clasificar): se
ocultan R&B, Corridos Tumbados, Salsa, Hardstyle, Clásica,
Latino y Románticas (0 canciones).

## Pestañas móviles con fondo — 2026-11-13 ~17:01 CST (corrección por captura del usuario)

El usuario envió una captura: al bajar en el celular, la barra de
pestañas (Top / Evaluar / Agregar / Gráficas) tapaba el botón BUSCAR y
el texto de arriba, porque es sticky pero no tenía fondo — el contenido
se veía a través y por los lados. La navegación de PC sí tenía fondo.
Corrección: la barra móvil lleva el mismo fondo que la de PC
(bg #040b1a/95 con backdrop-blur, borde sky y forma de píldora), así el
contenido pasa por debajo limpio al bajar.

## Pantalla de carga — 2026-11-13 ~16:57 CST (decisión del usuario)

El usuario aprobó las 6 mejoras: (1) esqueletos en Gráficas (6 barras
de histograma y 5 filas de promedios) desde el segundo 0, reemplazados
al llegar los datos o por el mensaje de error; (2) esqueletos con brillo
neón (.esqueleto: degradado #16294d con barrido azul cielo, 1.4 s; la
regla global de prefers-reduced-motion lo desactiva) y esquinas
rounded-xl como las filas reales; (3) los valores "—" de las estadísticas
llevan animate-pulse hasta que cargarEstadisticas los llena; (4) el aviso
"Despertando el servidor" solo aparece antes de la primera carga con
éxito (bandera catalogoListo), ya no en cada paginación, búsqueda o
filtro; (5) botón REINTENTAR en el error de carga del catálogo (llama a
cargarCatalogo(1)); (6) barra fina de carga fija en la parte superior
(#barra-carga, degradado Atardecer animado), visible al empezar cada
carga y oculta al terminar o al fallar.

## Segundo toque quita el filtro — 2026-11-13 ~16:52 CST (decisión del usuario)

Propuesta de la auditoría D, aprobada por el usuario: tocar la barra de
un rango que ya está filtrando quita el filtro (antes volvía a aplicar
el mismo). En filtrarRango, si el rango es el activo, se llama a
quitarRango() y se sale.

## Gráficas: correcciones y mejoras — 2026-11-13 ~16:48 CST (decisión del usuario)

Análisis especializado de Gráficas contra las 677 canciones reales: bins
22/79/157/201/142/76 exactos, promedios por género exactos (Baladas 18.8
mejor, Corridos 14.5 peor). Aplicado todo: (1) el histograma se recarga
tras agregar, calificar y eliminar (antes solo se cargaba una vez al
abrir); (2) nuevo rango 'menos-10' en el endpoint /histograma (SQL) y
filtro [0.01, 9.99] en el frontend — hoy no hay canciones bajo 10 (mínimo
10.05), así que el rango no aparece hasta que exista una; el orden de los
rangos se fija con CASE (menos-10 primero, sin calificar último) porque
el ORDER BY alfabético lo dejaría mal colocado; (3) porcentajes junto al
conteo en cada barra; (4) la barra del rango activo se destaca con
.rango-activo (borde y glow sky) y se limpia al quitar el filtro;
(5) "Quitar filtro de rango" con el cromo sky y forma de píldora, ya no
amarillo; (6) el género con mejor promedio se destaca con .genero-top
(la lista viene ordenada por promedio DESC, así que es la primera fila);
(7) cada barra del histograma usa el color de su categoría: cian 10-16,
degradado cian→violeta 16-18, fuchsia 18-19, verde 19-20, gris sin
calificar. El filtro [0.01, 9.99] excluye las sin calificar (COALESCE 0)
porque el mínimo es 0.01.

## Mejoras del modal — 2026-11-13 ~16:42 CST (decisión del usuario)

El usuario eligió revisar el modal de editar/eliminar y aprobó las 8
mejoras: (1) panel con .panel-fondo + .panel-neon + rounded-3xl, como los
demás paneles; (2) etiquetas visibles (Título, Artista, Género, Tipo de
versión) en el modal de editar, como en Agregar; (3) confirmar de editar
con .btn-atardecer en vez de amarillo (eliminar sigue rojo); (4) el modal
de eliminar muestra el título y artista de la canción que se va a borrar;
(5) animación de entrada (fade + escala, 0.2 s; la regla global de
prefers-reduced-motion la desactiva); (6) estado GUARDANDO… /
ELIMINANDO… en el botón mientras se guarda, restablecido a CONFIRMAR en
cada apertura; (7) cerrar tocando fuera del panel (además de CANCELAR y
Escape); (8) el modal de editar muestra la nota guardada y el género
("Nota guardada: 19.60 · Pop" o "Sin calificar · Género").

## Las dos propuestas aplicadas — 2026-11-13 ~16:32 CST (decisión del usuario)

El usuario preguntó cuáles de los 3 pendientes sin aplicar podía arreglar
Muse solo, y aprobó aplicar las dos de código:

1. Arranque con la DB caída (main.cpp): el constructor del pool ya NO
   abre conexiones (conexiones perezosas, faltantes = 5); get() las crea
   bajo demanda y las recrea si fallan, así que el servidor se recupera
   solo cuando la base vuelve. main() ya no devuelve 1 si la base está
   caída: el proceso sigue vivo, /api/salud responde y /api/salud/db
   devuelve 503 mientras tanto. La falta de DATABASE_URL sigue parando
   el arranque en obtenerCadenaConexion() (error de configuración).
   README actualizado (Logs y monitoreo).
2. Dockerfile sin privilegios: el contenedor del backend ahora corre
   como usuario `app` (groupadd/useradd + USER app) en la etapa de
   runtime; no cambia el funcionamiento (solo escucha en el 18080 y
   conecta a la base). README actualizado (Seguridad).

El tercer pendiente (aviso de irADuplicado con >50 coincidencias) sigue
como observación, sin cambio. La compilación completa sigue pendiente
del build de Docker en Render; la sintaxis se verificó aquí (ver abajo).

## Segunda auditoría — 2026-11-13 ~16:19 CST (encargo del usuario)

Segunda vuelta completa sobre el segundo definitivo (14:19 CST) + las 11
correcciones de la primera auditoría + los dos grises a sky (16:17 CST).
El usuario pidió volver a hacer análisis, verificaciones, correcciones y
mejoras. Se releyeron completos main.cpp, public/index.html, public/app.js,
public/sw.js, schema.sql, README.md, .env.example, .gitignore, .dockerignore,
Dockerfile, public/manifest.webmanifest, vercel.json, package.json,
CMakeLists.txt, harness-pruebas.js y lote-ost-asiatica.md. Diff contra el
original limpio (commit f3d68bd): main.cpp 351 líneas, app.js 575,
index.html 268. Nada en vivo, nada al repo real, nada a la DB. Ninguna
decisión cerrada cambió (colores, desempate, Top global, sliders, sin
totales previstos, export público, 4 espacios, cromo sky).

### Las 11 correcciones de la primera auditoría siguen intactas (verificado)

1. Fusión en "Siguiente sin calificar" (merge por id, sin duplicar).
2. COALESCE 'Por clasificar' (6 ocurrencias, 0 'Otro').
3. `nota_min`/`nota_max` como parámetros $3/$4 y $5/$6, 0 concatenaciones.
4. Helpers numJson/boolJson (15 usos), tipos malos ya no dan 500.
5. Timeout del pool a 5 s (falla rápido, 500).
6. Orden alfabético con `titulo ASC, id ASC`.
7. ALLOWED_ORIGIN vacío → también cae al dominio de Vercel.
8. `modalResolve = null` al resolver (2 veces).
9. Código muerto eliminado (colorSig/cTitle: 0).
10. sw.js v3, solo cachea respuestas OK.
11. REVISION.md documenta que el export se queda público.
Además: los dos grises siguen en sky (Limpiar text-sky-300/border-sky-500;
Instrumental bg-sky-900/text-sky-300/border-sky-700) y no quedó ningún gris
fuera de lugar en el cromo; los fuchsia/violeta que quedan son solo los
protegidos (colores de criterio de slider, pestañas Evaluar/Gráficas,
categorías y degradado del histograma).

### Problemas NUEVOS encontrados y corregidos

1. **MEDIO — La nota se guardaba con 3 decimales (PUT /calificar, main.cpp).**
   La fórmula puede dar totales .xx5 (353 de 677, el 52 %): sin redondeo,
   `cal_final` se guardaba con 3 decimales (p. ej. 18.995). Pero TODAS las
   677 notas guardadas tienen máximo 2 decimales, y el promedio en vivo
   (16.4847) es el promedio de los valores guardados, no de los totales
   exactos (16.4837): la DB real se comporta como si redondeara. Con 3
   decimales, el filtro del histograma ([18, 18.99]) dejaría fuera de su
   propio rango a una canción de 18.995 que el histograma sí cuenta en
   18–19 (hoy pasa con 0 canciones; con valores exactos pasarían 2: ID 84
   18.995 e ID 423 17.995). También cambiaría el conteo GOD: la ID 84
   (exacto 18.995) hoy está guardada como 19 y cuenta como GOD (76 con
   valores guardados, 75 con exactos).
   Corrección: `cal_final = std::round(cal_final * 100.0) / 100.0;` al
   calcular, con `#include <cmath>`. El redondeo es monótono: nunca invierte
   el orden, solo puede crear empates que el desempate ya resuelve; y la
   respuesta del endpoint devuelve ya el valor redondeado. Verificación:
   nueva prueba en el harness ("notas con mas de 2 decimales: 0") y
   promedio GOD consistentes con los datos en vivo.

2. **BAJO — `std::gmtime` no es seguro en hilos (main.cpp).** `marcaTiempo()`
   lo usaba y el servidor atiende varias peticiones a la vez: dos hilos
   podían pisar el mismo buffer estático y el log salía con fecha mezclada.
   Corrección: `gmtime_r` con un `std::tm` local, y un `static std::mutex`
   dentro de `logError` para que dos hilos no mezclen sus líneas en stderr.
   (Las llamadas a `marcaTiempo()` en el arranque corren en el hilo
   principal, antes de atender peticiones.)

3. **BAJO — La fila activa quedaba más delgada que las demás (index.html).**
   `.active-song` ponía `border: 1px`, pero las filas usan `border-2`
   (2px) desde el cambio de contornos del 2026-11-13 13:33 CST.
   Corrección: `border: 2px solid #ff2e88 !important;`.

4. **BAJO — Inyección de fórmulas CSV por espacios al inicio (app.js).**
   La protección de `cel` (exportar CSV) revisaba `/^[=+\-@]/` sobre el
   texto tal cual: un título como `" =2+2"` la burlaba, y Excel sí lo
   evalúa como fórmula. Corrección: se revisa `s.trimStart()` y se añaden
   `|` y `%` a los caracteres protegidos.

5. **BAJO — Una métrica null rompía todo el catálogo (app.js).** En
   `cargarCatalogo`, con orden por métrica, `valor.toFixed(2)` lanzaba si
   `calificacion_final > 0` pero `c[orden]` era null (dato inconsistente);
   el catch externo dejaba la página en "No se pudo cargar el catálogo".
   Hoy hay 0 casos en los datos. Corrección: `(valor ?? 0).toFixed(2)`.

6. **BAJO — Toast engañoso (app.js).** `seleccionarTarget` mostraba
   "CANCIÓN SELECCIONADA" aunque el ID no existiera en el catálogo.
   Prácticamente inalcanzable (todos los llamados pasan IDs que existen),
   pero el mensaje mentía. Corrección: el toast solo se muestra si la
   canción existe (`if (song)`).

7. **DOC — Comentario inexacto en schema.sql.** El índice
   `text_pattern_ops` se presentaba como solución para la búsqueda por
   texto, pero solo sirve con prefijos (LIKE 'abc%'); la búsqueda real es
   por subcadena (%abc%), que sigue escaneando la tabla. Con 677 canciones
   no importa. Corrección: comentario corregido, con nota de usar pg_trgm
   si el catálogo crece a miles.

### Pruebas (todo OK)

- `node harness-pruebas.js`: **15 PASS, 0 FAIL** (14 de antes + 1 nueva:
  "notas con mas de 2 decimales: 0"). Fórmula: 324 exactas, 353 difieren
  0.01 solo en el límite .xx5, 0 desajustes reales. Top 10 con desempate:
  144, 167, 213, 116, 307, 606, 348, 29, 399, 145. Histograma:
  22, 79, 157, 201, 142, 76, sin calificar 0. Suma 677.
- `node --check`: app.js, sw.js y harness-pruebas.js OK.
- Sintaxis C++ verificada de nuevo con los headers reales de Crow v1.2.0
  + asio + stub mínimo de pqxx (`g++ -std=c++20 -fsyntax-only`): OK
  después de los cambios (nuevo `#include <cmath>` incluido).
- Estructura: divs 42/42, llaves app.js 298/298, main.cpp 98/98.
  "radar" solo en 2 comentarios; "recomendacion" 0; console.log 0;
  TODO/FIXME solo 2 falsos positivos ("TODOS", "TODO EL").
- IDs: 57 usados en JS, todos existen en el HTML salvo mod-1..mod-6, que
  se crean dinámicamente en el modal de editar (esperado).
- Listas idénticas frontend/backend: GENEROS 22/22, ETIQUETAS 11/11.
- Secretos: ninguno en el código; .env.example solo tiene un placeholder.
- `.env.example` sin secretos reales; el export sigue público (decisión
  del usuario 2026-11-13 08:10 CST).

### Propuestas que necesitan decisión del usuario (NO aplicadas)

- **Arranque con la DB caída.** El pool crea sus 5 conexiones al arrancar;
  si Supabase no responde en ese momento, `main` devuelve 1 y Render
  entra en ciclo de reinicios: `/api/salud` nunca responde durante la
  caída, así que ni siquiera se puede saber desde fuera que el contenedor
  está vivo. Arreglo posible: crear las conexiones de forma perezosa (la
  primera petición las abre) y que `/api/salud` responda aunque la DB esté
  abajo. No se aplicó porque cambia el comportamiento de arranque
  (hoy falla rápido si la configuración está mal, lo cual también es útil).
- **Dockerfile corre como root.** Añadir un usuario sin privilegios
  (`USER`) es un endurecimiento estándar; no cambia el funcionamiento.
  No se aplicó sin preguntar porque toca el despliegue.
- **Observación, sin cambio:** `irADuplicado` avisa "NO SE ENCONTRÓ EN
  ESTA PÁGINA" si el duplicado está más allá de la página 1 de resultados
  (más de 50 coincidencias con el texto buscado). Raro en la práctica.

### Pendiente (no se pudo verificar sin el servidor en vivo)

- La compilación y el enlace completos de C++ siguen pendientes del build
  de Docker en Render (los headers de Crow/libpqxx solo existen ahí); la
  sintaxis sí se verificó aquí con los headers reales de Crow v1.2.0.
- Confirmar ADMIN_TOKEN en Render (≥24) y el título/artista de la ID 677
  por API siguen pendientes (no son código).
- La fase DB va al final, como decidiste.

## Los dos grises a azul cielo — 2026-11-13 ~16:17 CST (decisión del usuario)

Cabo suelto del pedido "corrige los colores": el botón "Limpiar" y la
insignia "Instrumental" seguían grises tras el cambio del cromo a azul.
El usuario aprobó pasarlos a azul cielo: "Limpiar" ahora
text-sky-300 / hover:text-sky-100 / border-sky-500 (igual que Exportar
CSV/JSON) y la insignia "Instrumental" bg-sky-900 / text-sky-300 /
border-sky-700 (mismo patrón que "Banda sonora" ámbar y mismo sky que
su checkbox en Agregar). Sin tocar colores de categoría ni nada más.

## Auditoría del segundo definitivo — 2026-11-13 ~14:22 CST (encargo del usuario)

El usuario pidió revisar, analizar y corregir el código, hacer pruebas,
buenas prácticas, logs, monitoreo, mantenimiento, seguridad y fundamentos.
Se leyó en orden BASE.md, REVISION.md, el plan completo y el skill
verify_closed_decisions, y después COMPLETOS: public/index.html (302
líneas), public/app.js (679), main.cpp (479), public/sw.js, schema.sql,
README.md, .env.example, .gitignore, Dockerfile, public/manifest.webmanifest,
vercel.json, package.json, CMakeLists.txt y lote-ost-asiatica.md. Diff
contra el original limpio (~/workspace/musica-review/, commit f3d68bd):
1052 líneas de cambio. Ninguna decisión cerrada cambió: ni colores de
categoría, ni degradado 50-75, ni desempate, ni Top global, ni textos,
ni export público, ni géneros/tipos, ni casillas.

### Pruebas (harness nuevo: harness-pruebas.js, `node harness-pruebas.js`)

El harness prueba las funciones puras del frontend (copiadas verbatim de
app.js) y la fórmula/desempate con las 677 canciones reales de
public/datos-reales.json. Resultado: **TODO OK (14 PASS, 0 FAIL)**.

- Fórmula: 324 canciones exactas a 2 decimales; 353 difieren 0.01 solo en
  el límite .xx5 (el total exacto termina en medio centavo y el double
  guardado redondea arriba o abajo según su representación binaria);
  0 desajustes reales. ID 144 = 19.60. ID 677 = 18.38 ("Calle me by your
  name" / "Lil nas x": título y artista siguen pendientes por API).
- Desempate: Top 10 con desempate = 144, 167, 213, 116, 307, 606, 348, 29,
  399, 145. Empate 19.38: 348 (base 9.78) antes que 29 (base 9.68).
  170 grupos de empate. rank_global: 144=#1, 606=#6. Las #1 de género con
  ≥19 fuera del Top 10 global (#17 Metal, #33 Electrónica, #38 Rock,
  #50 OST, #52 Trap, #53 Cumbia) no son doradas, como debe ser.
- Colores: mezcla HSL fuchsia→verde exacta al 50% y al 75% en tono/sat/luz;
  saturación en transición 82% (en RGB era 24%); verde→dorado por puesto
  exacto: puesto 20 = 50%, puesto 11 = 75%. Nota 18.9 → t=0.50 → 62.5%.
- Histograma real: 10-12: 22, 12-14: 79, 14-16: 157, 16-18: 201, 18-19: 142,
  19-20: 76, sin calificar: 0. Suma 677.
- Calificadas con ritmo/letras/coro/importancia no nulos: 0 problemas.

Verificaciones mecánicas (todas pasaron): node --check OK en app.js, sw.js
y harness-pruebas.js; divs 42/42; llaves main.cpp 97/97 y app.js 298/298;
todos los IDs que usa el JS existen en el HTML (58); todos los handlers
inline están definidos (cargarTailwindCDN vive en el <script> del head;
"if" es un falso positivo del grep); sin referencias a radar, recomendacion,
stat-neon, tab-activa, avisoTimer ni totales previstos (solo un comentario
que dice que la burbuja se quitó); sin console.log; sin TODO/FIXME; sin
secretos reales; fuchsia/violeta solo en lo protegido (criterios de
sliders, pestañas Evaluar/Gráficas, % de LETRAS/CORO, colores de
categoría, histograma); listas GENEROS/ETIQUETAS idénticas en frontend y
backend (21 géneros, 11 tipos); .dockerignore excluye public/, *.md,
.env* y .git (datos-reales.json no se despliega).

### Bugs encontrados y corregidos

1. **MEDIO — "Siguiente sin calificar" dejaba el catálogo sin datos**
   (app.js): reemplazaba `cancionesGlobal` por solo las pendientes; las
   filas del catálogo que se veían en pantalla ya no tenían datos y al
   tocarlas el formulario quedaba vacío (con toast "CANCIÓN
   SELECCIONADA" y sin nombre). Ahora las pendientes se fusionan con las
   que ya hay (sin duplicar por id).
2. **MEDIO — el género por defecto seguía siendo 'Otro'** (main.cpp, 3
   sitios): los COALESCE de género en la lista, el export y el promedio
   por género devolvían 'Otro' si el valor era NULL, pero 'Otro' ya no
   existe en las listas nuevas. Ahora devuelven 'Por clasificar', como
   el DEFAULT de schema.sql.
3. **MEDIO — nota_min/nota_max se concatenaban en el SQL** (main.cpp):
   eran doubles parseados (sin riesgo de inyección), pero la regla es
   parametrizar todo. Ahora van como $3/$4 (count) y $5/$6 (lista), con
   -1/999 como "sin filtro" (la nota va de 0 a 20).
4. **BAJO — JSON con tipos incorrectos devolvía 500** (main.cpp): un
   `ritmo` como texto o un `titulo` como número hacían que .d()/.s()/.b()
   lanzaran. Nuevos helpers numJson/boolJson/esTexto/textoJson: los
   números y booleanos usan su valor por defecto y título/artista no
   texto dan 400 (POST, PUT /info, PUT /calificar).
5. **BAJO — el pool se colgaba sin conexiones libres** (main.cpp):
   `ConnectionPool::get()` esperaba para siempre si las 5 conexiones
   estaban ocupadas. Ahora falla rápido a los 5 s (500) y el frontend
   muestra "SIN CONEXIÓN". No se pierde ninguna conexión.
6. **BAJO — orden alfabético sin desempate final** (main.cpp): dos
   canciones con el mismo título quedaban en orden no garantizado. Ahora
   es `titulo ASC, id ASC`.
7. **BAJO — ALLOWED_ORIGIN vacío rompía el CORS** (main.cpp): si la
   variable existía pero vacía, se usaba "" como origen. Ahora vacío
   también vuelve al dominio de Vercel.
8. **BAJO — modalResolve no se limpiaba** (app.js): tras cerrar un modal,
   pulsar Escape volvía a llamar al modal viejo (sin efecto visible,
   porque solo re-ocultaba). Ahora se pone a null al resolver.
9. **BAJO — código muerto** (app.js): `colorSig` se asignaba en 3 sitios
   y nunca se leía; `cTitle` no se usaba (el h3 usa el literal).
   Eliminadas.
10. **BAJO — el service worker cacheaba errores** (sw.js): un 404 (p. ej.
    /styles.css, que no existe) se guardaba y se servía como válido.
    Ahora solo se cachean respuestas OK. Versión de caché v2 → v3.
11. **BAJO — REVISION.md desactualizado**: la sección "Pendiente de
    decisión" seguía pidiendo decidir si el export es público, pero el
    usuario ya decidió el 2026-11-13 08:10 CST que se queda público.
    Corregido y documentado.

### Logs, monitoreo y mantenimiento (añadidos)

- **Backend**: nuevo `logError(ruta, mensaje)` con marca de tiempo UTC
  ISO-8601 en los 9 catch de endpoints y en los avisos de arranque
  (conexión y ADMIN_TOKEN). Antes era solo `[ERROR] <qué>` sin fecha ni
  ruta; en los logs de Render no se podía saber cuándo ni dónde pasó.
- **Monitoreo real**: nuevo endpoint `GET /api/salud/db` (SELECT 1; 200
  si la base responde, 503 si está caída). `/api/salud` no se toca: el
  ping que despierta a Render debe seguir respondiendo aunque la base
  esté caída. Documentado en README.md.
- **Frontend**: los 10 catch que tragaban el error en silencio ahora
  registran `console.error('[Evaluador] <función>:', e)` (solo en la
  consola del navegador; al usuario no le sale nada). `cargarEstadisticas`
  ahora comprueba `res.ok` antes de `.json()`. Los catch de
  `revisarDuplicado` y `cargarArtistasCompletos` se dejan en silencio a
  propósito (son comprobaciones de fondo; sin conexión no hay nada que
  avisar).
- **README.md**: secciones nuevas "Logs y monitoreo", "Pruebas"
  (harness-pruebas.js) y "Seguridad" (export público por decisión del
  usuario; token en localStorage en texto plano, uso personal).
- **Harness guardado en el paquete** (`harness-pruebas.js`, con cabecera
  de uso): se corre con `node harness-pruebas.js` y necesita
  `public/datos-reales.json` (el export, gitignored).

### Lo revisado y que está bien (sin cambios)

- rank_global por CTE sobre TODA la tabla antes de filtrar; desempate en
  Top, Peores (DESEMPATE_ASC) y órdenes por métrica; histograma y stats
  con COALESCE para NULL; modal de editar con genOpts construido desde
  GENEROS; duplicado por título Y artista con sugerencia de
  capitalización; escapeHtml en filas, toasts y modal; CSV con protección
  anti-inyección de fórmulas (`'` antes de `=+-@`); LIKE con %, _ y \
  escapados; validación de género/tipo contra las listas nuevas;
  rate limiting (5 fallos/IP/10 min) con poda; W.abort() en 404/409;
  PORT con clamp; CORS por defecto al dominio de Vercel; Crow v1.2.0
  fijado en el Dockerfile; schema.sql con índice único lower(título,
  artista), índices y trigger updated_at; lote-ost-asiatica.md solo
  propuestas, nada en vivo.
- Nota sobre DESEMPATE_ASC: su último término es `id DESC` (espejo exacto
  del orden Top). Es determinista y coherente con invertir todo el orden
  en "Peores"; no se tocó.

### Pendiente (no se pudo verificar sin el servidor en vivo)

- **Probar en vivo los caminos corregidos**: "Siguiente sin calificar"
  con una canción nueva sin nota (que el catálogo siga con datos),
  /api/salud/db contra la base real, el timeout del pool bajo carga y el
  sw.js v3. Todo se verifica al aplicar, fase por fase.
- **Compilar main.cpp**: VERIFICADO en sintaxis en esta VM: `g++ -std=c++20
  -fsyntax-only` pasa (exit 0) con las cabeceras REALES de Crow v1.2.0
  (clonadas de GitHub) + asio 1.18.2 + un stub mínimo de pqxx en /tmp
  (solo declara la API que usa main.cpp; apt no pudo instalar libpqxx-dev
  porque `apt-get update` se quedó colgado >15 min y las listas estaban
  vacías). El original también pasa, así que el montaje es válido. OJO:
  esto verifica sintaxis y uso de la API de Crow, NO la vinculación con
  libpqxx real ni el comportamiento en runtime: la compilación completa
  sigue pendiente del build de Docker (Render) al aplicar. Detalle: asio
  1.18.2 necesita `<utility>` antes que crow.h (su awaitable.hpp usa
  std::exchange sin incluirlo); en el build de Docker va libasio-dev de
  Ubuntu 22.04 (1.18.1), que no tiene ese problema con el código actual.
  La comprobación usó `-include utility` solo para el chequeo, sin tocar
  main.cpp. El include `<stdexcept>` que faltaba para std::runtime_error
  se añadió en esta auditoría.
- Siguen pendientes (no son código): confirmar ADMIN_TOKEN en Render
  (≥24), título/artista de la ID 677 por API, y la fase DB al final.

## Cromo morado a azul — 2026-11-13 ~14:13 CST (corrección del usuario)

El usuario dijo que los morados ya no combinaban con el azul nuevo y
eligió "Solo el cromo". Cambiado fuchsia → sky en el cromo: bordes de
paneles (.panel-neon), brillo de títulos (.brillo-titulo), foco de
select/buscar, caja Total (stat-fuchsia/val-fuchsia → stat-sky/val-sky),
crédito, nav PC (borde + hover), títulos y etiquetas de sección, campos
y selects, botones (Añadir y seguir, Siguiente sin calificar, Buscar,
Exportar), chips (CHIP_ON/OFF), caja de bonos, caja de Gráficas, pie de
paginación, botones ANT/SIG, ID de fila y modal. SIN TOCAR: colores de
categoría de canciones (dorado/verde/fuchsia/violeta/cian), colores de
criterio de sliders (Ritmo cian, Letras fuchsia, Coro violeta,
Importancia ámbar), pestañas por sección (Evaluar fuchsia, Gráficas
violeta), degradado Atardecer (barra/botones), título principal, borde
de canción seleccionada (#ff2e88), histograma y promedio por género.

## Fondo de paneles azul, sin morado — 2026-11-13 ~14:05 CST (corrección del usuario)

El usuario dijo que el fondo morado no le convencía: el lavado fuchsia
+ el violeta lo dejaban morado. Nuevo .panel-fondo: lavado cian arriba
(0.12) + degradado azul puro (#0e2242 → #0b1a33 → #071026), sin nada
morado. Sigue oscuro y neón, ahora en azul.

## Fondo de paneles con neón — 2026-11-13 ~14:02 CST (corrección del usuario)

El usuario dijo que el fondo se veía demasiado feo y no combinaba con
el neón (captura de la zona del Top): el fondo plano #0f1a36 de los
paneles se veía apagado. Nuevo fondo de panel (.panel-fondo) en los 4
paneles de sección: lavado fuchsia suave arriba (radial, 0.14) +
degradado azul-violeta (#131e42 → #0f1a36 → #0a1129), con el borde
neón y el glow de .panel-neon intactos. Los campos, chips y demás
siguen con #0f1a36 plano para que destaquen sobre el panel.

## Contornos y zona del Top — 2026-11-13 ~13:33 CST (decisión del usuario)

Las 6 mejoras: paneles con borde vivo y glow sutil (.panel-neon,
border rgba(217,70,239,0.55) + sombra); panel del Top rounded-3xl
como los cuadros de estadísticas; controles del Top en píldora
(selector, buscador y Buscar) con borde más visible y glow al
enfocar; chips inactivas con borde fuchsia-700 y glow al pasar el
cursor; filas de canciones con borde completo de 2px en su color de
categoría y esquinas rounded-xl (antes solo borde izquierdo de 4px);
botones Exportar CSV/JSON como píldoras con borde fuchsia-500. Sin
tocar colores de categoría ni de canciones.

## Fondo azul todavía más oscuro — 2026-11-13 ~13:22 CST (corrección del usuario)

El usuario dijo que se seguía viendo el mismo azul: el paso a #071426
era demasiado pequeño para notarse en el celular. Corrección: fondo
#040b1a (azul marino casi negro, sigue siendo azul) y lavados
Atardecer un poco más suaves (cian 0.18→0.14, magenta 0.10→0.08,
naranja 0.07→0.06, inferior 0.08→0.06) para que la base oscura se
note. Paneles #0f1a36 sin tocar.

## Fondo azul más oscuro — 2026-11-13 ~13:20 CST (decisión del usuario)

El usuario pidió el fondo azul algunos tonos más oscuro, ya con el código
auditado: fondo #0a1e42 → #071426 (color de página, theme-color, final
del degradado de las filas, cajita de la nota y colores del manifest).
Los paneles #0f1a36 no se tocaron, así que ahora destacan un poco más
sobre el fondo. Sigue siendo azul, solo más oscuro.

## Auditoría completa y depuración — 2026-11-13 ~12:29 CST (encargo del usuario)

El usuario fijó la versión 12:29 CST como BASE DEFINITIVA TEMPORAL y pidió
depurar, analizar, corregir y completar todo el código respectivo. Se leyó
en orden BASE.md, REVISION.md, el plan completo y el skill
verify_closed_decisions, y después COMPLETOS: public/index.html (297
líneas), public/app.js (657), main.cpp (479), schema.sql, README.md,
.env.example, .gitignore, Dockerfile, public/sw.js, manifest.webmanifest,
vercel.json, package.json, CMakeLists.txt y lote-ost-asiatica.md. Se comparó
con el original limpio (~/workspace/musica-review/, commit f3d68bd): los
únicos archivos de public/ son los mismos del original (app.js, index.html,
manifest, sw.js, 2 iconos); no se perdió nada; tailwind.config.js se quitó
a propósito y .vscode no se copió (ajustes de editor). Diff total: 1508
líneas de cambio contra el original.

Verificaciones mecánicas (todas pasaron): node --check OK en app.js y
sw.js; llaves de main.cpp 88/88; divs de index.html 42/42; todos los IDs
que usa el JS existen en el HTML (los de las secciones y pestañas se
construyen por mapa en switchTab); todos los handlers inline del HTML
están definidos (switchTab, marcarNav, cargarCatalogo, etc.); sin
referencias a radar, `recomendacion`, stat-neon ni totales previstos;
sin secretos reales; sin TODO/FIXME ni console.log. Lógica nueva probada
con Node: rango 19-20 → [19, 20], 18-19 → [18, 18.99]; la canción recién
agregada se encuentra con unshift + find; genOpts genera el option con
selected. Ninguna decisión cerrada cambió: ni colores, ni degradado 50-75,
ni desempate, ni Top global, ni textos, ni comportamiento aprobado.

### Bugs encontrados y corregidos (12 en código + 4 en docs/config)

1. **CRÍTICO — el modal de editar rompía siempre** (app.js, openEditModal):
   la plantilla usaba `${genOpts}` pero esa variable no existía en ningún
   lado → `ReferenceError` al tocar "Editar". Ahora se construye desde
   GENEROS igual que tagOpts, con la opción actual marcada.
2. **"Siguiente sin calificar" no encontraba nada** (main.cpp, orden
   sin_calificar): usaba `calificacion_final = 0`, pero las canciones sin
   calificar guardan NULL (el POST no pone nota). Stats e histograma ya
   usaban COALESCE. Corregido a `COALESCE(calificacion_final, 0) = 0`.
3. **El filtro "Sin calificar" del histograma tampoco** (main.cpp,
   nota_min/nota_max): `calificacion_final >= 0 AND <= 0` también dejaba
   fuera los NULL. Corregido con COALESCE en ambas condiciones; los demás
   rangos no cambian (un NULL no llega a 10 ni a 19).
4. **Tras agregar, el formulario quedaba con el nombre vacío**
   (app.js, agregarCancion): la canción nueva, sin nota, queda al final
   con orden Top, fuera de la página 1, así que seleccionarTarget no la
   encontraba (aunque id_cancion sí quedaba puesto). Ahora la canción se
   mete en cancionesGlobal (unshift) antes de seleccionarla, y el botón
   "Añadir y seguir" también refresca las estadísticas.
5. **El rango 19-20 excluía el 20.00 exacto** (app.js, filtrarRango):
   restaba 0.01 a todos los rangos. Ahora el último llega a 20.
6. **Filas sin calificar con CSS inválido** (app.js, cargarCatalogo):
   cGlow era `"border-gray-800 opacity-60"` y cText `"text-gray-500"`
   dentro de `style="..."`, clases Tailwind que el navegador tira: la
   fila perdía borde y opacidad y el "N/A" no se veía gris. Ahora son
   `border-color:#1f2937;opacity:0.6` y `color:#6b7280`.
7. **Estadísticas sin reintento tras un fallo** (app.js): statsListas se
   marcaba true antes de cargar; si el fetch fallaba, quedaban en "—"
   para siempre. Ahora se marca solo tras el éxito.
8. **Toasts sin escapar** (app.js, showToast): el mensaje iba con
   innerHTML directo e incluía títulos de canciones. Ahora pasa por
   escapeHtml (los toasts no llevan HTML).
9. **El export devolvía 0 y la lista null** (main.cpp, exportar): la misma
   canción sin calificar se veía distinto según el endpoint (ritmo,
   letras, coro, importancia). Quitados los COALESCE de esas columnas;
   cancionJson ya devuelve null con NULL. calificacion_final y
   arte_visual siguen en 0 (son el centinela de "sin calificar").
10. **POST sin W.abort() en un camino** (main.cpp): el catch de
    unique_violation volvía 409 sin abortar, el único camino sin abort
    explícito (el chequeo previo y PUT /info sí lo tienen). Añadido.
11. **Autocompletado de artista solo con la página visible** (app.js):
    el datalist se llenaba con los artistas de la página actual (50).
    Ahora, la primera vez que se enfoca el campo, se carga la lista
    completa desde el export (una sola vez, con guarda anti-doble
    llamada) y cargarCatalogo ya no la pisa. Si falla, se queda la lista
    de la página actual.
12. **Código muerto avisoTimer** (app.js): el temporizador de 4 s se
    quitó en la auditoría 08:27, pero quedaron la declaración y 3
    clearTimeout sin efecto. Eliminados.
13. **README con el CORS mal** (docs): decía que sin ALLOWED_ORIGIN
    queda `*`, pero el código fija el dominio de Vercel desde la
    auditoría 08:27. Corregido.
14. **.env.example al revés** (docs): el valor activo era `*` con el
    dominio de Vercel comentado. Ahora el dominio es el ejemplo activo
    y `*` queda solo para pruebas locales.
15. **Manifest con colores viejos**: theme_color y background_color en
    #000000; la página usa #0a1e42. Corregidos a #0a1e42.
16. **datos-reales.json sin proteger**: el export real (213 KB, solo para
    la vista previa) estaba en public/ sin estar en .gitignore: al hacer
    push se subiría y Vercel lo serviría en /datos-reales.json. Añadido
    a .gitignore y creado .dockerignore (el backend solo necesita
    main.cpp y CMakeLists.txt). El archivo se conserva en local para la
    vista previa; el código no lo referencia.

También se corrigió un comentario obsoleto en app.js (decía que el dorado
solo se aplica en orden Top; el dorado sigue el rank_global en cualquier
orden y solo el "#" se muestra únicamente en Top, aclaración 08:21 CST).

### Lo revisado y que está bien (sin cambios)

- Fórmula y desempate (total, base, Importancia, bonos, Descubrimiento
  único, Coro, Ritmo, Letra, ID más antiguo) en DESEMPATE/DESEMPATE_ASC y
  en calificarCancion; rank_global por CTE antes de filtrar; oro Top 10 y
  degradado verde→dorado 50-75 por puesto; ventanas 0.2 con mezcla HSL y
  brillo/tinte que siguen a la mezcla.
- Colores cerrados en toda la interfaz (fondo #0a1e42, paneles #0f1a36,
  acentos fuchsia, degradado Atardecer, navegación con color por sección,
  stats con su color y contexto, rounded-3xl); sin iconos ni emojis.
- Sliders solo por arrastre (26px, zona 46px), sin totales previstos, sin
  burbuja, Importancia separada, bonos con las definiciones del usuario.
- 4 espacios con navegación arriba; histograma clicable con botón para
  quitar el filtro; radar eliminado del frontend y del backend.
- Géneros/tipos nuevos y casillas Instrumental y Banda sonora de punta a
  punta (Agregar, modal de editar, POST/PUT, lista, export, insignias).
- Export público (decisión del usuario); ADMIN_TOKEN sigue SIN confirmar
  en Render (no se inventa que está confirmado); el token sigue por
  prompt() + localStorage en texto plano (punto débil conocido, se dejó
  como está por ser uso personal).
- Pool de conexiones con autorrecuperación, poda de fallos de autorizado,
  validación de género/tipo, parseEntero/parseDoble seguros, W.abort()
  en 404/409, PORT con clamp, CORS por defecto al dominio de Vercel.
- schema.sql (tabla, índice único lower(título, artista), índices,
  trigger updated_at, migración comentada) y lote-ost-asiatica.md (listas
  de revisión por canción, sin cambios en vivo).
- sw.js (red primero, precache de /, /index.html, /app.js, sin
  /styles.css), vercel.json, package.json (build solo explicativo),
  Dockerfile (Crow v1.2.0 fijado), CMakeLists.txt.

### Pendiente (no se pudo verificar sin el servidor en vivo)

- **Compilar main.cpp**: en esta VM no están las cabeceras de Crow ni de
  libpqxx (solo se instalan en el Dockerfile), así que `g++ -fsyntax-only`
  no corre aquí. Los cambios en main.cpp son 4 líneas pequeñas y
  quirúrgicas, con llaves 88/88, pero la compilación real solo se puede
  verificar en el build de Docker (Render) al aplicar.
- **Probar en vivo los caminos corregidos**: el modal de editar, el
  "Siguiente sin calificar" con una canción nueva sin nota, el filtro
  "Sin calificar" del histograma, el formulario tras agregar y el
  autocompletado completo. Todo eso se verifica al aplicar, fase por
  fase, con el backend despierto (hoy Render duerme y no se tocó nada en
  vivo en esta auditoría).
- Siguen pendientes (no son código): confirmar ADMIN_TOKEN en Render
  (≥24), título/artista de la ID 677 por API, y la fase DB al final.

## Cuadros más redondeados — 2026-11-13 ~12:23 CST (decisión del usuario)

El usuario pidió los cuadros más redondeados para que se vean más
elegantes: de rounded-xl (12px) a rounded-3xl (24px) en los 4 cuadros
de estadísticas. La barrita superior queda recortada por el
overflow-hidden, así que no se sale de las esquinas.

## Cuadros de estadísticas mejorados — 2026-11-13 ~12:14 CST (decisión del usuario)

Las 5 mejoras: cada cuadro con su propio color de borde y brillo
(Total fuchsia, Promedio ámbar, GOD verde, Pendientes gris; clases
.stat-fuchsia/.stat-ambar/.stat-verde/.stat-gris, .stat-neon ya no se
usa); valores text-3xl con brillo neón en su color (.val-*); barrita
superior de color en cada cuadro; contexto bajo cada número (Total "en
el catálogo", Promedio "de 20", GOD "% del catálogo" calculado en
cargarEstadisticas, Pendientes "al día" si es 0 o "por calificar");
rounded-xl con elevación al pasar el cursor (hover:-translate-y-0.5 y
brillo más fuerte). Sin iconos.

## Botones de navegación mejorados — 2026-11-13 ~12:05 CST (decisión del usuario)

Las 6 mejoras, sin iconos: botones más altos (py-4, 48px mínimo) y con
sombra flotante; estilo de píldoras redondeadas con separación (el
contenedor móvil ya no es un bloque segmentado); pestaña activa con más
presencia (escala 1.04, brillo más fuerte, transición suave de 0.25s);
color propio por sección en la activa (Top dorado, Evaluar fuchsia,
Agregar cian, Gráficas violeta, clases .tab-top/.tab-rub/.tab-reg/
.tab-gra; .tab-activa con el degradado común ya no se usa); contenedor
flotante con sombra; en PC enlaces más grandes (py-3, text-sm) y nav
en píldora con sombra. switchTab y marcarNav usan el mismo mapa de
colores por sección.

## Título centrado — 2026-11-13 ~11:57 CST (corrección del usuario)

El usuario pidió centrar "Evaluador musical": el contenedor del título
ahora es w-full en el celular y el h1 y el crédito llevan text-center
explícito (md:text-left en PC, como antes). Además se le pidió a la vista
previa corregir sus pestañas: las inactivas se veían grises y sin llenar
el ancho, y se veía Evaluar con Top activo (en el código preparado las
pestañas ya son flex-1 con fondo #0f1a36 y switchTab oculta las demás
secciones, así que eso es solo de la vista previa).

## Títulos y botones superiores — 2026-11-13 ~11:52 CST (decisión del usuario)

El usuario pidió mejorar los títulos y botones superiores y dijo que los
iconos no son necesarios y que, si se ponen, NO sean emojis: no se agregó
ningún icono. Aplicado: título text-3xl en el celular con brillo neón más
fuerte; crédito en mayúsculas con tracking; stats con más padding (p-3),
etiquetas en mayúsculas y valores text-2xl; pestaña activa con degradado
Atardecer (.tab-activa) en móvil (switchTab) y en PC (marcarNav mueve la
activa al hacer clic); línea degradada de 3px con animación de
desplazamiento de 6s (respetada por prefers-reduced-motion).

## Fondo azul visible — 2026-11-13 ~11:36 CST (corrección del usuario)

El usuario mandó captura: con #060b1a el fondo no se veía azul, se veía
negro/morado en el celular. Corrección: fondo #0a1e42 (azul profundo
bien visible), lavado cian superior de 0.12 a 0.18 y rejilla azul de
0.05 a 0.07. Además los paneles se corrieron a azul-violeta #0f1a36
(bonos #12233f, esqueletos #16294d, canción activa #0e1e3d), porque en
el celular los paneles cubren casi toda la pantalla y si se quedaban
morados la página se seguiría viendo morada. Acentos fuchsia,
degradado Atardecer, brillos Synthwave y colores de categoría y de
deslizadores no cambian.

## Fondo más azulado — 2026-11-13 ~11:32 CST (decisión del usuario)

El usuario pidió el fondo de un tono más azulado, sin dejar de ser el
típico neón. Fondo #0b0614 → #060b1a (azul marino profundo): color de
página, theme-color, final del degradado de las filas y cajita de la
nota. La rejilla pasó de violeta a azul (rgba(56,189,248,0.05)) para
acompañar. Los paneles #160a24 no se tocaron. Los lavados Atardecer
(cian, magenta, naranja) y los brillos Synthwave quedan igual, así que
sigue siendo neón.

## Embellecimiento general — 2026-11-13 ~11:27 CST (decisión del usuario)

El usuario pidió verificar toda la UI y aplicar las 8 mejoras propuestas:

1. Rejilla neón sutil fija al fondo (44px, violeta al 4.5%) + lavado
   Atardecer también abajo.
2. Valores de estadísticas más grandes (text-lg md:text-xl) y el número
   de GOD en verde #22c55e, su color de categoría.
3. La caja de la canción seleccionada se tiñe con el color de categoría
   de la canción (borde + brillo), leído del borde de su fila.
4. Insignia de género con el color de la fila (borde al 45%) y "Editar"
   de amarillo-600 a amarillo-400.
5. "Siguiente sin calificar" se oculta cuando no hay pendientes
   (hoy 0); se actualiza al cargar estadísticas.
6. Filas con entrada escalonada (30ms por fila, tope 450ms).
7. "Calificación base" también con brillo fuchsia.
8. Línea degradada Atardecer bajo el encabezado y filas que se
   deslizan 1px a la derecha al pasar el cursor.
15 cambios, node --check OK, divs 42/42. Sin tocar decisiones cerradas.

## Brillo en cada título + nueva base — 2026-11-13 ~11:04 CST (decisión del usuario)

El usuario pidió guardar como nueva base, no sin antes agregar un poco
de brillo a cada título, como el título amarillo con brillo fuerte de
la imagen del mockup Synthwave. Cada título brilla en su propio color:
los títulos de sección (Agregar, Evaluar, Gráficas, Distribución de
notas, Promedio por género, Top, ATENCIÓN del modal) con brillo fuchsia
(`.brillo-titulo`), e Importancia con brillo amarillo
(`.brillo-titulo-amarillo`). El título principal ya tenía su brillo
Synthwave (`.titulo-neon`) y no se tocó. Guardado como nueva base
2026-11-13 11:04 CST.

## Colores de Evaluar en toda la página — 2026-11-13 ~10:53 CST (decisión del usuario)

El usuario aclaró que "aplicarlo en toda la página" significaba exportar
los colores de la zona Evaluar a toda la interfaz, con las excepciones
evidentes. 24 cambios:

- Paneles #0b0b1e → #160a24 de Evaluar en toda la página (stats,
  Agregar, Gráficas, catálogo, modal, inputs, toasts, pistas,
  esqueletos #1e1e3a → #2a0f3d).
- Acentos cian → fuchsia de Evaluar: bordes, textos, botones, chips,
  pestañas, checkboxes, selección.
- Barras superiores de las 3 secciones y botones principales (Añadir
  canción, Confirmar del modal, Guardar) con el degradado Atardecer
  cian→magenta→naranja; la barra de Promedio por género también.
- EXCEPCIONES que no cambiaron: título cian con brillo Synthwave,
  colores de categoría de las canciones, colores por criterio de los
  deslizadores, brillos Synthwave, fondo #0b0614 con lavado Atardecer,
  colores de estado (toasts verde/rojo, avisos amarillos).

## Paleta neón híbrida — 2026-11-13 ~10:19 CST (decisión del usuario)

El usuario eligió una mezcla de las 3 paletas del mockup
`paletas-neon-evaluador` (guiadas por imágenes de referencia):

- **Brillos: Synthwave** — rosa eléctrico #ff2e88, cian eléctrico
  #00e5ff, amarillo #ffd319 (título, canción activa, foco, pestaña
  activa, brillo del botón Guardar).
- **Fondo + zona Guardar calificación: Atardecer neón** — fondo
  #0b0614 con un lavado radial sutil cian→magenta→naranja en la parte
  superior; panel de Evaluar #160a24, bonos #1d0a2e, barra superior y
  botón Guardar con degradado cian→magenta→naranja (#22d3ee → #ff2ea6
  → #ff7a18).
- **Lo demás: Ciberpunk** — paneles #0b0b1e, acentos cian #22d3ee,
  magenta #ff2ea6, violeta #8b5cf6 (stats, Agregar, Gráficas, catálogo,
  inputs, chips, riel de deslizadores, modal).

Sin cambiar: colores de categoría de las canciones ni colores por
criterio de los deslizadores. 18 cambios, node --check OK, divs 41/41.
Alineación posterior (detectada al sincronizar la vista previa): los
fondos pintados desde JS también se actualizaron — el riel sin rellenar
del deslizador (#0a0a0a → #0b0b1e) y el final del degradado de las filas
(#000000 → #0b0614) — para que no quedara negro viejo en la interfaz.
**Aplicada en toda la página** (2026-11-13 ~10:26 CST, a petición del
usuario): los fondos que se pintan desde JS y se habían quedado fuera
del primer pase también usan la paleta híbrida — pistas del histograma
y de Promedio por género, esqueletos de carga, cajita de la nota en
cada fila, inputs/selects del modal Editar y toasts. Ya no queda
ningún fondo gris-950, gris-900 ni negro puro en la interfaz, salvo el
fondo del modal (negro al 80%, a propósito).

## Transiciones más brillantes — 2026-11-13 ~10:06 CST (decisiones del usuario)

El usuario notó que las transiciones se veían apagadas frente a las
categorías plenas. Análisis con los números reales:

- **Mezcla en RGB apagaba los colores**: Fuchsia → Verde al 50% daba
  `#7e86a6`, un gris azulado de solo 24% de saturación (los extremos
  tienen 71% y 83%). Cian → Violeta bajaba a 64%/54%.
- **El brillo no seguía a la mezcla**: se fijaba con la categoría de
  origen y nunca se actualizaba en transición.
- **BUG encontrado**: `${colorBase}33` era CSS inválido cuando colorBase
  venía de mezcla() como `"rgb(...)"`, así que la fila en transición
  perdía su tinte de fondo por completo y se veía sobre negro puro.
- **Correcciones aplicadas** (umbrales, 50-75% y categorías sin cambiar):
  1) mezcla en HSL (tono por el camino más corto, saturación viva):
  Fuchsia → Verde ahora 82%/85% de saturación (antes 24%/52%);
  Cian → Violeta 74%/68%; Verde → Dorado 91%/92%.
  2) en transición el brillo es el del propio color mezclado a 0.6.
  3) el tinte de fondo en transición sube de 0.20 a 0.33, con
  `rgbaDesde()` que acepta hex y `rgb(...)`.

## Burbuja fuera, pesos visibles — 2026-11-13 ~09:55 CST (decisiones del usuario)

- **Burbuja de valor eliminada** (div, CSS y lógica JS): al usuario no le
  gustó; el valor queda solo en la etiqueta de cada deslizador, como antes.
- **Pesos de ponderación junto a cada nombre** (corrección del usuario
  2026-11-13 09:58 CST, con captura): el % va junto a cada nombre, bien
  visible y en negrita (RITMO · 35%, LETRAS · 25%, CORO · 40%). Se quitó
  la línea separada "Ritmo 35% · Letras 25% · Coro 40% de la base" y se
  quitó "· MÁXIMO 10" del título: queda solo "CALIFICACIÓN BASE". Son
  los pesos reales de la fórmula. No es un total previsto: el total sigue
  sin mostrarse mientras se califica.

## Mejoras de Calificaciones — 2026-11-13 ~09:50 CST (decisiones del usuario)

- **(1) Relleno del riel**: `pintarSlider()` pinta el track con un degradado
  neón hasta el valor, actualizado mientras arrastras.
- **(2) Burbuja de valor**: sigue al pulgar solo mientras arrastras y se
  esconde al soltar; el valor queda en la etiqueta como antes.
- **(3) Color propio por criterio**: Ritmo cian, Letras fuchsia, Coro
  violeta, Importancia ámbar (el `accent-yellow` anterior no se aplicaba
  porque el estilo propio lo anulaba; ahora sí es ámbar de verdad).
- **(4) Pulgar más pequeño**: 26px en vez de 30px (decisión del usuario);
  la zona de arrastre se mantiene en 46px.
- **(5) Deshacer NO se hace** (decisión del usuario: si se equivoca, toca
  la canción y cambia la calificación, es sencillo).
- **(6) Siguiente sin calificar**: botón en Evaluar que usa el orden
  `sin_calificar` del backend y deja lista la siguiente canción sin nota.
- **(7) Contexto de la canción**: debajo del título en Evaluar se ven su
  género, su tipo, sus casillas y su nota guardada (no un total previsto).
- **(8) Bonos en filas completas**: cada bono en su propia fila, con su
  definición en la misma línea y toda la fila tocable.
- Sin totales previstos y solo arrastre: se mantienen los vetos del usuario.

## Géneros y tipos nuevos + Instrumental y OST — 2026-11-13 ~09:03 CST

El usuario pidió hacer la corrección de géneros ahora (ya no al final).

- **Géneros nuevos**: R&B, Corridos Tumbados, Hardstyle y "Por clasificar"
  (reemplaza a "Otro"). **Unificados**: Hip Hop → Rap (la lista ya no
  tiene Hip Hop). Los géneros vacíos (Clásica, Latino, Salsa, Románticas)
  NO se eliminan, como corrigió el usuario el 2026-11-13 09:01 CST.
- **Tipos nuevos**: Sped Up, Acústico, En Vivo, Demo, Mashup, Edit
  (la lista pasa de 5 a 11). Valores guardados sin acentos, como antes.
- **Instrumental y OST**: como se acordó, NO son géneros. Instrumental es
  una casilla sí/no aparte y OST es una casilla de origen "Banda sonora",
  independientes del género y del tipo: una canción puede ser Remix +
  Instrumental, o una banda sonora de Pop. Están en Agregar, en el modal
  de editar, se guardan en POST/PUT info, viajan en lista y export, y se
  ven como insignias propias en cada fila.
- **Migración de datos** (en schema.sql, para aplicar juntos con respaldo):
  Hip Hop → Rap (39 canciones) y Otro → Por clasificar (36) son cambios
  directos; las 4 de OST y las 4 de Asiática se revisan canción por
  canción con aprobación del usuario. **Los datos en vivo NO se tocaron.**
- Listas actualizadas en frontend (GENEROS, ETIQUETAS) y backend
  (GENEROS_VALIDOS, ETIQUETAS_VALIDAS); el valor por defecto al crear
  pasa de 'Otro' a 'Por clasificar'.

## Mejoras de Agregar — 2026-11-13 ~08:52 CST (decisiones del usuario)

- **(1) Duplicado avisado mientras escribes**: `revisarDuplicado()` busca en el
  catálogo (endpoint de búsqueda, no solo la página visible) al escribir
  título+artista y muestra "Esa canción ya existe" con botón "Ir a
  calificarla", que busca la canción y la deja lista en Evaluar. El 409
  también dispara el aviso.
- **(2) Añadir y seguir agregando**: segundo botón que registra y se queda en
  Agregar con el cursor en Título. El botón principal sigue llevando a
  Evaluar con la canción lista (en celular cambia a la pestaña Evaluar).
- **(3) NO se conserva el género** (decisión del usuario): tras agregar, el
  género vuelve a "Elige un género".
- **(4) Normalización útil**: `normalizarTexto()` quita espacios extra al
  guardar; si el artista ya existe con otra capitalización (p. ej. "Lil
  nas x" vs "Lil Nas X"), se avisa y un toque usa el nombre existente.
  Alineado 2026-11-13 09:52 CST con la vista previa: `revisarDuplicado()`
  busca por título Y por artista (dos `?buscar=` en paralelo, unidas sin
  duplicar por id), así la sugerencia sale aunque la canción sea nueva.
  El backend ya busca en título o artista. Verificado `node --check` OK.
- **(5) Etiquetas visibles**: Título, Artista, Género y Tipo de versión
  tienen etiqueta arriba del campo (antes solo placeholder).
- **(6) Estado Guardando…**: los dos botones se deshabilitan y el principal
  dice "Guardando…" mientras se registra.
- **(7) Tipos en una sola lista**: `ETIQUETAS` (valor guardado, nombre que
  se ve) genera el select de Agregar y las opciones del modal de editar;
  ya no está escrita a mano en el HTML. Valores sin cambiar (los nuevos
  tipos van en la fase DB).

## Lo que aún faltaba — 2026-11-13 ~08:41 CST (sin tocar géneros)

El usuario pidió hacer lo que aún faltaba, dejando la corrección de géneros
para después. Se hizo, en el código preparado:

- **JSON de canción factorizado**: nueva función `cancionJson()` en `main.cpp`
  (antes el JSON estaba copiado en la lista y en el export, con riesgo de
  desincronizarse). La lista añade solo su `rank_global` encima.
- **Validación de título/artista factorizada**: `validarTituloArtista()`,
  usada en POST y en PUT /info (antes duplicada).
- **Modales unificados**: nueva función `abrirModal()` en `app.js`; editar
  y eliminar ya no copian el código de abrir el modal, poner el título y
  el botón, y resolver al confirmar. Sin cambio visible.
- **tailwind.config.js eliminado**: no se usaba (Tailwind va por CDN) y el
  README ya lo explica. El build de `package.json` ya decía claro que no
  hay build.

Sigue pendiente (no es código): confirmar ADMIN_TOKEN en Render (≥24),
título/artista de la ID 677 por API, y la fase DB al final con la
corrección de géneros por lotes.

## Pendiente de decisión / para después

- Confirmar que `ADMIN_TOKEN` está en Render y tiene ≥24 caracteres (sigue
  sin confirmarse). Si no está, cualquiera puede modificar el catálogo.
- ~~Decidir si `/api/canciones/exportar` sigue público o pasa a ser solo admin.~~
  DECIDIDO 2026-11-13 08:10 CST por el usuario: **el export se queda público**.
  Documentado en README.md (sección Seguridad) y en BASE.md.
- ID 677: título sigue "Calle me by your name" y artista "Lil nas x".
  El arreglo es un dato, no código: se hace por API (`PUT /api/canciones/677/info`)
  con tu ADMIN_TOKEN, cuando lo apliquemos.
- Fase DB (al final, como decidiste): géneros/tipos nuevos, Instrumental
  como casilla aparte, OST como "Banda sonora". Nada de eso se tocó aquí.
- `tailwind.config.js` y el `build` falso ya se quitaron/arreglaron el
  2026-11-13 ~08:41 CST (ver "Lo que aún faltaba").
- ~~El token de admin se sigue pidiendo con `prompt()` y se guarda en
  `localStorage` en texto plano. Es el punto más débil del frontend; se
  dejó como está porque es de uso personal, pero se puede mejorar después.~~
  RESUELTO 2026-11-14 (ver "Editar en Evaluar + token en
  sessionStorage"): el token se guarda en `sessionStorage` (se borra al
  cerrar la pestaña); solo los filtros siguen en `localStorage` porque
  no son sensibles. Si al usuario le molesta reescribir la clave al
  abrir la página, se revierte.
