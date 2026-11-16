# Base de trabajo — fijada 2026-11-13 08:34 CST, actualizada 2026-11-16 ~13:00 CST por el usuario

## Nueva base 2026-11-16 ~13:00 CST — tabla de artistas + lotes 2 y 3 + 29 géneros

El usuario: "Hora de guardar la nueva base."

Incluye la base 2026-11-15 11:06 CST + todo lo aprobado desde entonces:
tabla de artistas completa (many-to-many, buenas prácticas): schema.sql
con `artistas` + `cancion_artistas`; main.cpp con el arreglo `artistas`
en cada canción, `GET /api/artistas` con TODOS los artistas (sin HAVING;
los 3 productores puros —RedOne, Danja, Alex da Kid— salen con 0/0),
`GET /api/canciones?artista=<id>` y búsqueda por todos los nombres;
app.js con la fila "Principal ft. Invitado1, Invitado2", campos de
invitados y productor en Agregar y Editar, y autocompletado; SQL de
artistas verificado (423 artistas, 680 principales, 232 con invitados,
13 con productor, 248 cambios); la 232 queda "Salvia"; al editar, el
campo Artista se interpreta como lista de principales separados por coma
(la 531 y la 662 ya no se fusionan). Géneros: 29 valores (Lofi y
Hardcore del lote 2, además de los 5 del lote 4), idénticos y en el mismo
orden en app.js y main.cpp. Lotes 2 y 3 completos y aprobados:
lote-2-3-aplicar.sql (94 UPDATEs: 39 Hip Hop + 36 Otro + 19 Villano, con
guarda, BEGIN/COMMIT, ALTER TABLE, verificación y rollback); 365
Alternativo, 374 Cumbia, 375 Electrónica; Otro 36 resuelto (la 576 a Por
clasificar); Villano 21 (Trap 7, Reguetón 6, Rap 5, Electrónica 1, Pop 2
se quedan). Reglas nuevas: género de la canción (no del artista);
género dudoso por el que más representa / predominante; género nuevo si
se cumple ALGUNA de las dos condiciones (≥2 canciones, o representación
nula + muy relevante); el cajón sigue siendo "Por clasificar" ("Otra"
no se crea; solo con 2+ casos así); si algo no queda claro o no estoy
seguro, preguntar. Harness 121 PASS, 0 FAIL. Vista previa sincronizada
(lotes 2+3 aplicados en los datos, 576 en Por clasificar, Lofi/Hardcore
en la lista). Nada en vivo.

## Nueva base 2026-11-15 11:06 CST — transiciones naturales 0–90% con ventana 17.50

El usuario: "Es hora de guardar la base, entonces."

Incluye la base 19:06 CST del 2026-11-13 + todo lo aprobado desde
entonces, paso a paso: auditorías E (7 correcciones), F (3 rondas) y G
(3 rondas, 66 problemas en total; 72 problemas corregidos en total
entre todas las auditorías); dorado del Top 10 SOLO por puesto global,
sin exigir nota ≥19 (decisión 2026-11-13 19:19 CST); rediseño de las
filas del Top (sin ID, nota grande con "/20", artista en su propia
línea a todo lo ancho, género junto a los puntos de bonos, tipo siempre
visible, barra fina de 3px, 5 puntos de bonos, altura uniforme y
contenido centrado verticalmente); botón Editar en Evaluar en el
celular (SOLO Editar, nunca Eliminar; borrar sigue siendo solo desde
el Top); token de admin en sessionStorage (se borra al cerrar la
pestaña); salto de tono 17.79→17.80 explicado, sin cambio; transiciones
naturales (decisiones 2026-11-14 y 2026-11-15): rampas de 0% a 90% con
curva suave (smoothstep), ventanas 0.3 antes de 17.8 (17.5–17.8,
aprobado 2026-11-15), 0.5 antes de 19 (18.5–19) y 0.2 antes de 18
(17.8–18), y la misma rampa 0–90% en la mezcla por puesto del Top
20→10 (puesto 20 = color puro, puesto 11 = 90% dorado); 133 canciones
muestran transición (42 + 16 + 75). Harness 70 PASS, 0 FAIL. Nada en
vivo.

## Nueva base 2026-11-13 19:06 CST — pantalla de carga + burbujas top 3

El usuario: "Sí, guárdala como nueva base."

Incluye la base 16:54 CST (Gráficas + auditoría D) + las 6 mejoras de
la pantalla de carga (esqueletos en Gráficas, brillo neón, estadísticas
con pulso, aviso de despertar solo en la primera carga, botón
REINTENTAR, barra fina de carga), la barra de pestañas móvil con fondo,
la eliminación del texto blanco del Top (solo estaba en la vista
previa), las burbujas de género filtradas (solo con canciones) y
colapsables con el top 3 (Todos + Rap, Pop, Reguetón + "Ver más · 12").
Nada en vivo.

## Nueva base 2026-11-13 16:54 CST — Gráficas + auditoría D

El usuario: "Tómala como nueva base."

Incluye la base 16:45 CST (modal) + las 7 correcciones y mejoras de
Gráficas (histograma se recarga tras agregar/calificar/eliminar, rango
'Menos de 10', porcentajes, rango activo destacado, botón quitar filtro
sky y píldora, mejor género destacado, barras con el color de su
categoría), la auditoría D (harness 18 PASS, 0 FAIL; corrección: editar
ya no deja obsoletos el Promedio por género ni la caja de Evaluar) y el
segundo toque en la barra del histograma que quita el filtro. Nada en
vivo.

## Nueva base 2026-11-13 16:45 CST — mejoras del modal

El usuario: "Perfectos. Guárdala como base."

Incluye el segundo definitivo confirmado 16:35 CST + las 8 mejoras del
modal (panel con .panel-fondo + .panel-neon + rounded-3xl, etiquetas
visibles en editar, confirmar de editar con .btn-atardecer, eliminar
muestra título y artista, animación de entrada, estados GUARDANDO… /
ELIMINANDO…, cerrar tocando fuera, nota guardada en el modal de editar).
Nada en vivo.

## Segundo definitivo confirmado 2026-11-13 16:35 CST

El usuario: "Si eso es todo, excelente. Mantenlo como el segundo definitivo."

El segundo definitivo (14:19 CST) se mantiene e incluye todo lo hecho
después: las 11 correcciones de la primera auditoría (~14:22 CST), las 7
de la segunda (~16:19 CST), los dos grises a azul cielo (~16:17 CST) y
las dos propuestas aplicadas (~16:32 CST: arranque con la DB caída con
conexiones perezosas y Dockerfile con usuario sin privilegios). Nada en
vivo; la compilación completa, el ADMIN_TOKEN y la ID 677 siguen
pendientes para cuando se aplique con la laptop.

## Nueva base 2026-11-13 14:19 CST — SEGUNDO DEFINITIVO (cromo azul)

El usuario: "Perfecto. Guárdalo como un segundo definitivo."

Incluye la base 14:11 CST (fondo de paneles azul .panel-fondo) + el cromo
morado pasado a azul cielo (fuchsia → sky en bordes de paneles, brillo
de títulos, foco, caja Total, crédito, nav PC, títulos y etiquetas,
campos, botones, chips, caja de bonos, caja de Gráficas, paginación, ID
de fila y modal). SIN TOCAR: colores de categoría de canciones,
colores de criterio de sliders, pestañas por sección (Evaluar fuchsia,
Gráficas violeta), degradado Atardecer, título principal, borde de
canción seleccionada, histograma y promedio por género.

## Nueva base 2026-11-13 14:11 CST — fondo de paneles azul magnífico

El usuario: "Ese tono de azul es magnífico. Esa es una base muy buena."

Fondo de paneles (.panel-fondo) en los 4 paneles de sección: lavado cian
suave arriba (rgba(34,211,238,0.12)) + degradado azul puro (#0e2242 →
#0b1a33 → #071026), sin nada morado. Versión anterior (lavado fuchsia +
violeta) fue rechazada por morada. Bordes neón, glows, colores de
categoría y todo lo demás sin cambios.

A partir de aquí se parte para los cambios de interfaz. No se vuelve a
empezar desde el código original ni desde un mockup nuevo.

## Qué es la base

- Código preparado: `~/workspace/musica-review-preparado/` (main.cpp, public/index.html,
  public/app.js, public/sw.js, Dockerfile, schema.sql, README.md, .env.example,
  .gitignore, package.json, REVISION.md, lote-1-aplicar.sql,
  lote-2-3-aplicar.sql, lote-4-aplicar.sql, artistas-aplicar.sql,
  lote-2-otro-verificacion.md, lote-3-villano-verificacion.md,
  decisiones-colaboraciones.md, diseno-artistas.md).
- Vista previa: artefacto `vista-previa-evaluador-musical` (versión corregida
  tras la auditoría del 2026-11-13 ~08:27 CST), con las 677 canciones reales.
- NADA de la base está aplicado al Evaluador real (GitHub/Vercel/Render/Supabase).

## Decisiones cerradas que la base ya cumple (verificar antes de cada cambio)

- Colores: Top 10 global dorado con halo animado SOLO por puesto (decisión
  2026-11-13 19:19 CST, sin exigir nota ≥19), GOD >19 verde, >18 fuchsia,
  >17.8 violeta, resto cian. Degradado 0-90 con curva suave (smoothstep):
  cada ventana empieza en el color puro de la categoría y sube hasta 90%
  en el umbral; ventanas 0.3 antes de 17.8 (17.5–17.8, aprobado
  2026-11-15), 0.5 antes de 19 (18.5–19) y 0.2 antes de 18 (17.8–18);
  del 11 al 20 mezcla desde el propio color hacia el dorado con la misma
  rampa (0% puesto 20, 90% puesto 11). Toda la fila iluminada, "#" teñido
  con su color. Sin insignias de texto.
- Top GLOBAL por calificación (no por página, filtro ni orden). Desempate:
  total, base, Importancia, bonos, Descubrimiento único, Coro, Ritmo, Letra,
  ID más antiguo. También en "Peores" (ascendente). Nota con 2 decimales.
- 4 espacios separados: Top, Evaluar, Agregar, Gráficas (con Distribución de
  notas en su propio bloque y Promedio por género en su propia tarjeta).
  Navegación ARRIBA, fija bajo el título, en PC y en celular.
- Sin totales previstos al calificar; solo arrastre; Importancia separada de
  la base; bonos con las definiciones del usuario; sin descripción de fórmula;
  crédito "Hecho por Gémini y mejorado por Muse"; stats 2×2 con Pendientes.
- Carga desde el segundo 0: esqueletos + aviso de despertar al instante,
  contadores en "—". Histograma real con barras clicables (filtra por rango)
  y botón para quitar el filtro. Radar eliminado (frontend + backend).
- Género obligatorio al agregar, autocompletado de artista, chips con conteo,
  paginación "1-50 DE 677", botón Guardar/Actualizar según tenga nota,
  Editar/Eliminar 44×44, avisos arriba en celular.
- Backend: histograma (GROUP BY), stats con mediana/mín/máx, validación de
  género/tipo, PORT seguro, W.abort() explícito, rank_global por CTE,
  valores nulos para sin calificar, CORS por defecto al dominio de Vercel.
- Export público (decisión del usuario 2026-11-13 08:10 CST).
- DB al final: las listas de géneros ya están en el código preparado (29
  valores, incluidos Lofi y Hardcore); los SQL de los lotes 1, 4, 2+3 y de
  artistas están escritos y verificados, sin aplicar. Instrumental y Banda
  sonora como casillas aparte en el código; las columnas no existen aún en
  la DB en vivo.
- Pendientes fuera de la base: confirmar ADMIN_TOKEN en Render (≥24),
  título/artista de la ID 677 por API, aplicar fase por fase con verificación
  en vivo (el usuario no tiene la laptop ahora; sin prisa).

## Actualización 2026-11-13 08:40 CST (nueva referencia para las siguientes modificaciones)

- El Top (section-catalogo) ya lleva `hidden md:flex`: en celular solo se ve
  su sección cuando su pestaña está activa; en PC se ven las 4 a la vez.
  Causa del error anterior: el Top era la única sección sin `hidden` y su
  `display:flex` ganaba sobre la clase que debía ocultarla.
- Pestañas móviles: 11px, sin salto de línea, min-w-0, con recorte limpio;
  la primera se llama "Top" (antes "Catálogo" y se cortaba como "Evaluan" /
  "Gráf cas").
- Esta versión corregida de la vista previa es la referencia para los
  siguientes cambios de interfaz. No volver al código original.

## Nueva base 2026-11-13 08:49 CST (guardada por el usuario para futuras modificaciones)

- La vista previa ya está sincronizada con esta base y el usuario la aprobó
  como la nueva referencia. A partir de aquí se hacen las siguientes
  modificaciones; no volver a versiones anteriores.
- Lo que trae esta base respecto a la anterior: cancionJson() (un solo JSON
  de canción para lista y export), validarTituloArtista() (una sola
  validación en POST y PUT /info), abrirModal() (editar y eliminar comparten
  el modal), tailwind.config.js eliminado. Sin cambios visibles: la interfaz
  y los colores quedan exactamente como en la versión anterior.

## Nueva base 2026-11-13 08:57 CST (guardada por el usuario)

- Mejoras de Agregar (decisiones 2026-11-13 08:52 CST: 1 sí, 2 sí, 3 NO,
  4 sí, 5 sí, 6 sí, 7 sí): aviso de duplicado mientras escribes con botón
  "Ir a calificarla", botón "Añadir y seguir agregando", género NO se
  conserva, normalización de espacios + sugerencia de capitalización del
  artista, etiquetas visibles, estado "Guardando…", tipos desde la lista
  ETIQUETAS.
- NOTA (resuelta 2026-11-13 09:52 CST): el código preparado ya busca por
  título Y por artista en `revisarDuplicado()` (dos consultas `?buscar=`
  en paralelo, unidas sin duplicar por id), igual que la vista previa.
  La sugerencia de capitalización ya sale aunque la canción sea nueva.
  Verificado con `node --check` y con una simulación de la lógica
  (duplicado de "LA FOTO DEL CARNET" / Leonardo Favio detectado, id 144).

## Nueva base 2026-11-13 09:45 CST (guardada por el usuario)

- Géneros y tipos nuevos + Instrumental y Banda sonora como casillas
  aparte. Hip Hop unificado en Rap (Rap 182 en los datos de la vista
  previa), Otro → Por clasificar (36). Géneros vacíos NO eliminados.
  Las 4 OST y las 4 Asiática quedan para revisar canción por canción.
  Datos en vivo NO tocados; la migración está en schema.sql.

## Nueva base 2026-11-13 10:03 CST (guardada por el usuario)

- Mejoras de Calificaciones: riel con relleno, color por criterio, pulgar
  26px, Siguiente sin calificar, contexto de la canción, bonos en filas
  completas. Sin Deshacer (decisión del usuario) y sin totales previstos.
- Burbuja de valor ELIMINADA. Pesos visibles junto a cada nombre:
  RITMO · 35%, LETRAS · 25%, CORO · 40% (colores claros, negrita).
  Título de la base sin "· MÁXIMO 10": solo "CALIFICACIÓN BASE".

## Nueva base 2026-11-13 10:09 CST (guardada por el usuario)

- Transiciones más brillantes: mezcla en HSL (no RGB), brillo que sigue
  a la mezcla (0.6 en transición, dorado 0.7 en Top 10), tinte de fondo
  0.33 en transición / 0.20 en plenas. Corregido el bug `${colorBase}33`
  (CSS inválido con rgb(...), la fila perdía el tinte). Umbrales, 50-75%
  y categorías sin cambiar.

## Nueva base 2026-11-13 11:04 CST (guardada por el usuario)

- Colores de la zona Evaluar exportados a toda la página (paneles
  #160a24, acentos fuchsia, botones y barras con degradado Atardecer
  cian→magenta→naranja); excepciones sin cambiar: título cian con
  brillo Synthwave, colores de categoría y de deslizadores, fondo
  #0b0614, colores de estado.
- Brillo en cada título, como el título amarillo con brillo de la
  imagen del mockup Synthwave: cada título brilla en su propio color
  (fuchsia en los títulos de sección, amarillo en Importancia).

## Nueva base 2026-11-13 11:32 CST (guardada por el usuario)

- Embellecimiento general: rejilla neón + lavado abajo, estadísticas
  más grandes con GOD en verde, canción seleccionada teñida con su
  color, insignia de género con el color de la fila, Siguiente sin
  calificar oculto sin pendientes, filas con entrada escalonada,
  Calificación base con brillo, línea degradada bajo el encabezado y
  filas que se deslizan al pasar el cursor.

## Nueva base 2026-11-13 11:46 CST (guardada por el usuario)

- Fondo azul visible: fondo #0a1e42, lavado cian más fuerte, rejilla
  azul más visible, paneles en azul-violeta #0f1a36 (bonos #12233f,
  esqueletos #16294d, canción activa #0e1e3d). Acentos fuchsia,
  degradado Atardecer, brillos Synthwave y colores de categoría y de
  deslizadores sin cambiar.

## Nueva base 2026-11-13 12:04 CST (guardada por el usuario)

- Títulos y botones superiores: título text-3xl en el celular con brillo
  neón más fuerte, crédito en mayúsculas con tracking, stats con más
  padding y valores text-2xl, pestaña activa con degradado Atardecer
  (móvil y PC), línea degradada de 3px con animación. Sin iconos (el
  usuario dijo que no son necesarios y que no sean emojis).
- Título "Evaluador musical" centrado en el celular (a la izquierda en
  PC). Pestañas de la vista previa corregidas (llave CSS sin cerrar).

## Nueva base 2026-11-13 12:12 CST (guardada por el usuario)

- Botones de navegación mejorados: más altos (48px) con sombra flotante,
  píldoras redondeadas con separación, activa con más presencia (escala
  1.04, brillo, transición 0.25s), color propio por sección (Top dorado,
  Evaluar fuchsia, Agregar cian, Gráficas violeta), contenedores
  flotantes con sombra, en PC enlaces más grandes y nav en píldora.

## Base definitiva temporal 2026-11-13 12:29 CST (guardada por el usuario)

- El usuario dijo que todo está perfecto y fijó esta versión como base
  definitiva temporal: fondo azul #0a1e42 con paneles azul-violeta,
  títulos y botones superiores mejorados, botones de navegación con
  color propio por sección, cuadros de estadísticas con su color y
  contexto, cuadros rounded-3xl.
- Encargo abierto: depurar, analizar, corregir y crear todo el código
  respectivo a partir de esta base (auditoría completa del paquete
  preparado, sin tocar el proyecto real, la repo, Vercel, Render ni
  Supabase).

## Nueva base 2026-11-13 13:24 CST (guardada por el usuario)

- Fondo azul todavía más oscuro: #040b1a (azul marino casi negro, sigue
  siendo azul), con los lavados Atardecer un poco más suaves para que la
  base oscura se note en el celular. Paneles #0f1a36 sin tocar.
- Incluye las correcciones de la auditoría completa (~12:29 CST).
