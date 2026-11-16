-- Lotes 2 y 3 de géneros — SQL para aplicar en el SQL Editor de Supabase
-- APROBADO por Nova 2026-11-16:
--   Lote 2 (Hip Hop 39 + Otro 36): revisión fila por fila 2026-11-16.
--     Hip Hop → Rap en bloque (acuerdo 2026-11-13, schema.sql) salvo 3
--     excepciones decididas por Nova (365 Alternativo, 374 Cumbia,
--     375 Electrónica). Otro 36: verificación individual canción por
--     canción por criterio delegado de Muse ('Lo dejaré a tu criterio,
--     siempre basate por el género que son, en investigaciones
--     individuales para cada canción'), con sus reglas nuevas: género
--     que más representa la canción, y si ninguno, el predominante.
--     Lofi y Hardcore agregados por Nova 2026-11-16 (condición 1: 2
--     canciones cada uno). 576 Wipy → Por clasificar (sin fuente a
--     nivel de canción; la categoría 'Otra' NO se crea).
--   Lote 3 (Villano Antillano, 21 en Pop): aprobado por Nova 2026-11-16
--     ('Si el lote 3 son las de Villano, si, pásala'). La propuesta
--     Rap×21 NO se sostuvo: Trap 7, Reguetón 6, Rap 5, Electrónica 1,
--     Pop 2 se quedan (120, 124). Detalle y fuentes en
--     lote-2-otro-verificacion.md y lote-3-villano-verificacion.md.
-- NO CORRER TODAVÍA: la aplicación es con la laptop, juntos y fase por
-- fase, junto con el despliegue del código preparado (que ya incluye los
-- géneros nuevos: lista GENEROS de 29 valores en app.js y main.cpp, con
-- Lofi y Hardcore tras Afrobeats). Los lotes 1 y 4 tienen sus propios
-- archivos (lote-1-aplicar.sql, lote-4-aplicar.sql) y NO se tocan aquí:
-- este archivo es SOLO lotes 2 y 3. No hay solapamiento de IDs con
-- los lotes 1 y 4 (verificado mecánicamente).
--
-- NOTA 101 'Vip': NO va en este archivo. En el catálogo está en Rap y
-- el lote 4 ya la mueve a Reguetón (Rap → Reggaeton). No tocarla aquí.
--
-- DIFERENCIA CON EL LOTE 4: cada UPDATE lleva además la guarda
-- AND genero = '<género actual esperado>'. Si el dato en vivo no
-- coincide con lo verificado, ese UPDATE afecta 0 filas en vez de
-- sobrescribir en silencio. Si algún UPDATE afecta 0 filas, PARAR y
-- revisar antes de seguir. Todo va dentro de una transacción
-- (BEGIN/COMMIT): si algo falla, no se aplica nada.
--
-- CÓMO SE USA (igual que los lotes 1 y 4, juntos y con la laptop):
--   0. Respaldo: descarga /api/canciones/exportar y guarda ese JSON.
--   1. Supabase → SQL Editor → New query → pega este archivo → Run.
--   2. Revisa el paso de verificación: las 94 filas con sus valores
--      nuevos, el total en 677, 0 canciones en Hip Hop y Otro, y los
--      conteos de Lofi 2, Hardcore 2, Merengue 1, R&B 1, Por clasificar 1.
--   3. Si algo sale mal, usa el ROLLBACK del final o reimporta el respaldo.
-- NOTA: esto va JUNTO con el despliegue del código preparado. No aplicar
-- la DB sin el código, ni el código sin la DB, para que el sitio no
-- quede a medias.
--
-- ORDEN RECOMENDADO DE APLICACIÓN (los 5 SQL de la fase DB, en este orden):
--   1. lote-1-aplicar.sql → 2. lote-2-3-aplicar.sql (este archivo) →
--   3. lote-4-aplicar.sql → 4. titulos-correcciones.sql →
--   5. artistas-aplicar.sql. Ver schema.sql ("ORDEN RECOMENDADO").
--
-- ADVERTENCIA — la migración en bloque de schema.sql (paso 2 antiguo:
-- Hip Hop → Rap, Otro → Por clasificar) YA NO EXISTE como paso: se
-- borró de schema.sql porque rompería las decisiones por canción de
-- este archivo (excepciones 365 Alternativo, 374 Cumbia, 375
-- Electrónica; y el reparto de Otro: solo la 576 va a Por clasificar,
-- el resto va a su género real). Como red de seguridad SOLO vale
-- DESPUÉS de este archivo, y debe afectar a 0 filas: si afecta a
-- alguna, es que quedó una canción sin cubrir y hay que revisar.
-- NUNCA se corre antes que este archivo.
--
-- PRE-FLIGHT (antes de correr este archivo, en vivo):
--   SELECT id, banda_sonora, instrumental FROM canciones
--   WHERE id IN (271, 274, 301, 302, 376, 542, 572, 604);
--   Los ROLLBACK de los lotes suponen banda_sonora = FALSE en esas 8
--   canciones (aquí: la 572). Si alguna sale TRUE, PARAR y revisar.
--   Las columnas banda_sonora / instrumental ya existen en vivo: los
--   ALTER TABLE IF NOT EXISTS del PASO 1 son no-op.
--
-- DEPENDENCIA DE ORDEN EN LA VERIFICACIÓN (PASO 4): los conteos
-- esperados (Rap 185, Pop 111, Reggaeton 130, Trap 21, Electronica 54,
-- Cumbia 12, Baladas 23, Alternativo 18, Hardstyle 16) se calcularon
-- sobre el export original, es decir, con el lote 1 y el lote 4 SIN
-- aplicar. Si el lote 1 ya se aplicó (orden recomendado), los conteos
-- son Rap 189, Pop 112, Trap 22, Electronica 55 (el resto igual),
-- porque el lote 1 ya movió 4 canciones a Rap, 1 a Pop, 1 a Trap y
-- 1 a Electronica. Si el lote 4 ya se aplicó, estos conteos NO valen.

BEGIN;

-- PASO 1 — Columnas nuevas (por si los lotes 1 y 4 aún no se aplicaron):
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS instrumental BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS banda_sonora BOOLEAN NOT NULL DEFAULT FALSE;

-- PASO 2 — Lote 2: 75 UPDATEs (Hip Hop 39 + Otro 36).
-- Hip Hop → Rap en bloque (36):
UPDATE canciones SET genero = 'Rap' WHERE id = 128 AND genero = 'Hip Hop'; -- N.A.V.E — Cazzu (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 129 AND genero = 'Hip Hop'; -- Peli-culeo — Cazzu (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 130 AND genero = 'Hip Hop'; -- Turra — Cazzu (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 137 AND genero = 'Hip Hop'; -- Peli-culeo [Remix] — Cazzu (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 238 AND genero = 'Hip Hop'; -- Ayo Technology — 50cent (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 317 AND genero = 'Hip Hop'; -- Business woman — Natthy peluso (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 366 AND genero = 'Hip Hop'; -- Ojos color sol — Calle 13 (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 372 AND genero = 'Hip Hop'; -- Adentro — Calle 13 (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 373 AND genero = 'Hip Hop'; -- Pa'l norte — Calle 13 (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 381 AND genero = 'Hip Hop'; -- Kronno vs zarcort pt.1 — Kronno zomber (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 382 AND genero = 'Hip Hop'; -- Animatronicos rap — Kronno zomber (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 383 AND genero = 'Hip Hop'; -- Resident evil rap — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 384 AND genero = 'Hip Hop'; -- Halo 5 — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 385 AND genero = 'Hip Hop'; -- Calle of dury ghost rap — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 386 AND genero = 'Hip Hop'; -- Desde tu adiós — Cyclo (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 387 AND genero = 'Hip Hop'; -- Battlefield 4 — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 388 AND genero = 'Hip Hop'; -- Halo 4 — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 389 AND genero = 'Hip Hop'; -- Nuevo vs clasico — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 390 AND genero = 'Hip Hop'; -- Gta v rap — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 391 AND genero = 'Hip Hop'; -- Rainbow six siege — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 392 AND genero = 'Hip Hop'; -- Destiny — Zarcortgame (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 393 AND genero = 'Hip Hop'; -- Call of duty advance — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 394 AND genero = 'Hip Hop'; -- Guerra de shooters — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 395 AND genero = 'Hip Hop'; -- Minecraft: juegos del hambre rap rap — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 396 AND genero = 'Hip Hop'; -- Mario vs sonic — Kronno zomber (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 397 AND genero = 'Hip Hop'; -- Battlefield 2042 — Kronno zomber (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 398 AND genero = 'Hip Hop'; -- Titán fall — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 399 AND genero = 'Hip Hop'; -- Fnaf Sister location — Zarcort (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 447 AND genero = 'Hip Hop'; -- No soy criminal — Yoss bones (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 448 AND genero = 'Hip Hop'; -- Sientelo — Lefty sm (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 531 AND genero = 'Hip Hop'; -- Sucker for pain — Lyl waine (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 544 AND genero = 'Hip Hop'; -- Piano tiles — Armani west (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 581 AND genero = 'Hip Hop'; -- On sight — Kanye west (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 590 AND genero = 'Hip Hop'; -- 1-800 — bnh0$ (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 635 AND genero = 'Hip Hop'; -- Touch it — Busta rhymes (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
UPDATE canciones SET genero = 'Rap' WHERE id = 662 AND genero = 'Hip Hop'; -- Can't hold me down — Lil wayne (Hip Hop → Rap) [Migración en bloque Hip Hop → Rap aprobada (schema.sql)]
-- Hip Hop, excepciones decididas por Nova 2026-11-16 (3):
UPDATE canciones SET genero = 'Alternativo' WHERE id = 365 AND genero = 'Hip Hop'; -- Latinoamérica — Calle 13 (Hip Hop → Alternativo) [Excepción decidida 2026-11-16: folk/alternativa; el rap es secundario]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 374 AND genero = 'Hip Hop'; -- Cumbia de los aburridos — Calle 13 (Hip Hop → Cumbia) [Excepción decidida 2026-11-16: ritmo de cumbia, "sabor colombiano"]
UPDATE canciones SET genero = 'Electronica' WHERE id = 375 AND genero = 'Hip Hop'; -- Electro movimiento — Calle 13 (Hip Hop → Electronica) [Excepción decidida 2026-11-16: "base musical electrónica vibrante"]
-- Otro → género real, verificación individual (36):
-- Radical Redemption ×16 → Hardstyle:
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 485 AND genero = 'Otro'; -- Brutal 12.0 — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 486 AND genero = 'Otro'; -- Brutal 8.0 — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 487 AND genero = 'Otro'; -- Reincarnation — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 488 AND genero = 'Otro'; -- Until i win — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 489 AND genero = 'Otro'; -- Razor — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 490 AND genero = 'Otro'; -- Dominator tribute — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 491 AND genero = 'Otro'; -- Kick that kick — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 492 AND genero = 'Otro'; -- Kick op je bek — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 493 AND genero = 'Otro'; -- Street code — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 494 AND genero = 'Otro'; -- Piece of shit — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 495 AND genero = 'Otro'; -- Nocturnolz — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 496 AND genero = 'Otro'; -- Brotherhood of brutality — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 497 AND genero = 'Otro'; -- Command & conquer — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 498 AND genero = 'Otro'; -- Out for blood — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 499 AND genero = 'Otro'; -- The chronicles of chaos — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 500 AND genero = 'Otro'; -- The road to redemption — Radical redemption (Otro → Hardstyle) [Verificado: Radical Redemption, DJ/productor de hardstyle/rawstyle]
-- Code:Pandorum ×4 + Apashe → Electrónica:
UPDATE canciones SET genero = 'Electronica' WHERE id = 441 AND genero = 'Otro'; -- Purpose — Code:pandorum (Otro → Electronica) [Verificado: Code:Pandorum es dubstep/deathstep]
UPDATE canciones SET genero = 'Electronica' WHERE id = 442 AND genero = 'Otro'; -- Pyramid — Code: pandorum (Otro → Electronica) [Verificado: Code:Pandorum es dubstep/deathstep]
UPDATE canciones SET genero = 'Electronica' WHERE id = 443 AND genero = 'Otro'; -- Calvaire — Code: pandorum (Otro → Electronica) [Verificado: Code:Pandorum es dubstep/deathstep]
UPDATE canciones SET genero = 'Electronica' WHERE id = 444 AND genero = 'Otro'; -- Wake up, kill, repeat — Code: pandorum (Otro → Electronica) [Verificado: Code:Pandorum es dubstep/deathstep]
UPDATE canciones SET genero = 'Electronica' WHERE id = 445 AND genero = 'Otro'; -- Lacrimosa — Apashe (Otro → Electronica) [Verificado: Apashe, productor electrónico]
-- Resto de Otro (15):
UPDATE canciones SET genero = 'Rap' WHERE id = 91 AND genero = 'Otro'; -- Andamos de parranda — Mc davo (Otro → Rap) [Verificado: álbum El Dominio = Hip-Hop/Rap; flow rapeado]
UPDATE canciones SET genero = 'Merengue' WHERE id = 189 AND genero = 'Otro'; -- Si antes te hubiera conocido — Karol g (Otro → Merengue) [Verificado: es merengue/mambo (Wikipedia); género nuevo]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 261 AND genero = 'Otro'; -- Letanía 13 — Insulini (Otro → Reggaeton) [Dudosa resuelta por criterio de Muse: ritmo dembow; base de "Atrévete-te-te"]
UPDATE canciones SET genero = 'Baladas' WHERE id = 307 AND genero = 'Otro'; -- La tirana — Mon Laferte (Otro → Baladas) [Dudosa resuelta por criterio de Muse: bolero → Baladas; Bolero no se agrega (solo 1)]
UPDATE canciones SET genero = 'Baladas' WHERE id = 311 AND genero = 'Otro'; -- Pa' donde se fue — Mon laferte (Otro → Baladas) [Dudosa resuelta por criterio de Muse: balada emotiva; folklore andino secundario]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 524 AND genero = 'Otro'; -- La cumbia tribalera — El pelon del mikrophone (Otro → Cumbia) [Verificado: cumbia tribalera; "Con mi cumbia tribalera"]
UPDATE canciones SET genero = 'Lofi' WHERE id = 526 AND genero = 'Otro'; -- Ethernal Youth — Rude. (Otro → Lofi) [Verificado: lofi trap / chillhop; género nuevo]
UPDATE canciones SET genero = 'Lofi' WHERE id = 527 AND genero = 'Otro'; -- Warm nights — Xori (Otro → Lofi) [Dudosa resuelta por criterio de Muse: lo-fi hip hop / dreamwave instrumental; género nuevo]
UPDATE canciones SET genero = 'R&B', banda_sonora = TRUE WHERE id = 572 AND genero = 'Otro'; -- Gangsta — Kehlani (Otro → R&B) [Verificado: Alternative R&B, banda sonora de Suicide Squad]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 575 AND genero = 'Otro'; -- Ofrenda — Zambi (Otro → Cumbia) [Verificado: track de Cumbiastep Cartel; cumbia predominante]
UPDATE canciones SET genero = 'Por clasificar' WHERE id = 576 AND genero = 'Otro'; -- Wipy — Los dutis (Otro → Por clasificar) [Decidido 2026-11-16: sin fuente a nivel de canción; no se fuerza a Cumbia; 'Otra' no se crea]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 577 AND genero = 'Otro'; -- Simon — Zambi (Otro → Cumbia) [Verificado: track de Cumbiastep Cartel; cumbia predominante]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 582 AND genero = 'Otro'; -- No me digas que no — Enrique Iglesias (Otro → Reggaeton) [Verificado: versión feat. Wisin & Yandel (la del catálogo); dembow]
UPDATE canciones SET genero = 'Hardcore' WHERE id = 618 AND genero = 'Otro'; -- Spaghetti love — GFP (Otro → Hardcore) [Verificado: uptempo hardcore; género nuevo]
UPDATE canciones SET genero = 'Hardcore' WHERE id = 619 AND genero = 'Otro'; -- Greazed up — Greazy puzzy fuckers (Otro → Hardcore) [Verificado: uptempo hardcore; género nuevo]

-- PASO 3 — Lote 3: 19 UPDATEs (Villano Antillano; 120 Poli y 124 Nena mala
-- se quedan en Pop y NO llevan UPDATE).
-- Trap (7):
UPDATE canciones SET genero = 'Trap' WHERE id = 102 AND genero = 'Pop'; -- Mujeron — Villano antillano (Pop → Trap) [Verificado: "una canción de trap"]
UPDATE canciones SET genero = 'Trap' WHERE id = 104 AND genero = 'Pop'; -- Un amarre — Villano antillano (Pop → Trap) [Dudosa: trap predominante (Trap vs Electronica)]
UPDATE canciones SET genero = 'Trap' WHERE id = 114 AND genero = 'Pop'; -- Pajara — Villano antillano (Pop → Trap) [Verificado: "el himno del trap queer"]
UPDATE canciones SET genero = 'Trap' WHERE id = 116 AND genero = 'Pop'; -- Precaución, está canción es un hechizo — Villano antillano (Pop → Trap) [Verificado: dos reseñas la identifican como trap]
UPDATE canciones SET genero = 'Trap' WHERE id = 121 AND genero = 'Pop'; -- Muñeca — Villano antillano (Pop → Trap) [Verificado: "el himno trap 'Muñeca'"; sin dembow]
UPDATE canciones SET genero = 'Trap' WHERE id = 122 AND genero = 'Pop'; -- Designer pu$$y — Villano antillano (Pop → Trap) [Dudosa: trap predominante]
UPDATE canciones SET genero = 'Trap' WHERE id = 125 AND genero = 'Pop'; -- Puesta — Villano antillano (Pop → Trap) [Dudosa: Pitchfork une "prog and trap"]
-- Reguetón (6):
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 105 AND genero = 'Pop'; -- Cuero — Villano antillano (Pop → Reggaeton) [Verificado: Qobuz "Latin Urban Reggaeton"]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 106 AND genero = 'Pop'; -- Cascara de coco — Villano antillano (Pop → Reggaeton) [Verificado: "Me fui a la raíz del reggaetón"; "reggaetón nuclear"]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 111 AND genero = 'Pop'; -- Kaleidoscopica — Villano antillano (Pop → Reggaeton) [Verificado: "hermanita de Cáscara de Coco"; "el reggaetón de Kaleidoscópica"]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 118 AND genero = 'Pop'; -- ¡Hello Kitty! — Villano antillano (Pop → Reggaeton) [Dudosa: dancehall mapeado a reguetón (pariente más cercano)]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 126 AND genero = 'Pop'; -- Klk — Villano antillano (Pop → Reggaeton) [Verificado: Qobuz cataloga "Reggaeton"; dembow/perreo]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 127 AND genero = 'Pop'; -- Muchos quieren tumbarme — Villano antillano (Pop → Reggaeton) [Verificado: versión del clásico de Ivy Queen; reggaetón clásico]
-- Rap (5):
UPDATE canciones SET genero = 'Rap' WHERE id = 107 AND genero = 'Pop'; -- Reina de la selva — Villano antillano (Pop → Rap) [Dudosa: rap predominante (Rap vs Reggaeton)]
UPDATE canciones SET genero = 'Rap' WHERE id = 112 AND genero = 'Pop'; -- Yo tengo un novio — Villano antillano (Pop → Rap) [Dudosa: balada pop-rap; versos rapeados]
UPDATE canciones SET genero = 'Rap' WHERE id = 113 AND genero = 'Pop'; -- Vocales — Villano antillano (Pop → Rap) [Dudosa: rap predominante; base de rap]
UPDATE canciones SET genero = 'Rap' WHERE id = 119 AND genero = 'Pop'; -- Veo veo — Villano antillano (Pop → Rap) [Dudosa: flow/chanteo; sin base de reguetón]
UPDATE canciones SET genero = 'Rap' WHERE id = 123 AND genero = 'Pop'; -- Mujer — Villano antillano (Pop → Rap) [Dudosa: "tono cercano al Hardcore Hip Hop"]
-- Electrónica (1):
UPDATE canciones SET genero = 'Electronica' WHERE id = 110 AND genero = 'Pop'; -- Hedonismo — Villano antillano (Pop → Electronica) [Dudosa: freestyle ochentero; Electronica es lo más cercano]

-- PASO 4 — Verificación:
SELECT id, titulo, genero, banda_sonora FROM canciones WHERE id IN (91, 102, 104, 105, 106, 107, 110, 111, 112, 113, 114, 116, 118, 119, 121, 122, 123, 125, 126, 127, 128, 129, 130, 137, 189, 238, 261, 307, 311, 317, 365, 366, 372, 373, 374, 375, 381, 382, 383, 384, 385, 386, 387, 388, 389, 390, 391, 392, 393, 394, 395, 396, 397, 398, 399, 441, 442, 443, 444, 445, 447, 448, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 524, 526, 527, 531, 544, 572, 575, 576, 577, 581, 582, 590, 618, 619, 635, 662) ORDER BY id;
-- Esperado: las 94 filas con sus valores nuevos; 572 con banda_sonora TRUE.
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('Hip Hop', 'Otro') GROUP BY genero;
-- Esperado: 0 filas (ya no queda ninguna canción en Hip Hop ni en Otro).
SELECT COUNT(*) AS total FROM canciones; -- esperado: 677
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('Lofi','Hardcore','Merengue','R&B','Por clasificar') GROUP BY genero;
-- Esperado: Lofi 2, Hardcore 2, Merengue 1, R&B 1, Por clasificar 1.
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('Rap','Pop','Reggaeton','Trap','Electronica','Cumbia','Baladas','Alternativo','Hardstyle') GROUP BY genero ORDER BY genero;
-- Esperado: Rap 185, Pop 111, Reggaeton 130, Trap 21, Electronica 54, Cumbia 12, Baladas 23, Alternativo 18, Hardstyle 16.
-- NOTA: estos conteos suponen lote 1 y lote 4 SIN aplicar (ver encabezado).
-- Si el lote 1 ya se aplicó: Rap 189, Pop 112, Trap 22, Electronica 55.

COMMIT;

-- ROLLBACK (no correr salvo que algo salga mal: restaura el género
-- original de cada canción tocada; 572 vuelve con banda_sonora FALSE).
-- UPDATE canciones SET genero = 'Otro' WHERE id = 91; -- Andamos de parranda
-- UPDATE canciones SET genero = 'Pop' WHERE id = 102; -- Mujeron
-- UPDATE canciones SET genero = 'Pop' WHERE id = 104; -- Un amarre
-- UPDATE canciones SET genero = 'Pop' WHERE id = 105; -- Cuero
-- UPDATE canciones SET genero = 'Pop' WHERE id = 106; -- Cascara de coco
-- UPDATE canciones SET genero = 'Pop' WHERE id = 107; -- Reina de la selva
-- UPDATE canciones SET genero = 'Pop' WHERE id = 110; -- Hedonismo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 111; -- Kaleidoscopica
-- UPDATE canciones SET genero = 'Pop' WHERE id = 112; -- Yo tengo un novio
-- UPDATE canciones SET genero = 'Pop' WHERE id = 113; -- Vocales
-- UPDATE canciones SET genero = 'Pop' WHERE id = 114; -- Pajara
-- UPDATE canciones SET genero = 'Pop' WHERE id = 116; -- Precaución, está canción es un hechizo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 118; -- ¡Hello Kitty!
-- UPDATE canciones SET genero = 'Pop' WHERE id = 119; -- Veo veo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 121; -- Muñeca
-- UPDATE canciones SET genero = 'Pop' WHERE id = 122; -- Designer pu$$y
-- UPDATE canciones SET genero = 'Pop' WHERE id = 123; -- Mujer
-- UPDATE canciones SET genero = 'Pop' WHERE id = 125; -- Puesta
-- UPDATE canciones SET genero = 'Pop' WHERE id = 126; -- Klk
-- UPDATE canciones SET genero = 'Pop' WHERE id = 127; -- Muchos quieren tumbarme
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 128; -- N.A.V.E
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 129; -- Peli-culeo
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 130; -- Turra
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 137; -- Peli-culeo [Remix]
-- UPDATE canciones SET genero = 'Otro' WHERE id = 189; -- Si antes te hubiera conocido
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 238; -- Ayo Technology
-- UPDATE canciones SET genero = 'Otro' WHERE id = 261; -- Letanía 13
-- UPDATE canciones SET genero = 'Otro' WHERE id = 307; -- La tirana
-- UPDATE canciones SET genero = 'Otro' WHERE id = 311; -- Pa' donde se fue
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 317; -- Business woman
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 365; -- Latinoamérica
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 366; -- Ojos color sol
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 372; -- Adentro
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 373; -- Pa'l norte
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 374; -- Cumbia de los aburridos
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 375; -- Electro movimiento
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 381; -- Kronno vs zarcort pt.1
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 382; -- Animatronicos rap
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 383; -- Resident evil rap
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 384; -- Halo 5
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 385; -- Calle of dury ghost rap
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 386; -- Desde tu adiós
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 387; -- Battlefield 4
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 388; -- Halo 4
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 389; -- Nuevo vs clasico
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 390; -- Gta v rap
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 391; -- Rainbow six siege
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 392; -- Destiny
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 393; -- Call of duty advance
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 394; -- Guerra de shooters
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 395; -- Minecraft: juegos del hambre rap rap
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 396; -- Mario vs sonic
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 397; -- Battlefield 2042
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 398; -- Titán fall
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 399; -- Fnaf Sister location
-- UPDATE canciones SET genero = 'Otro' WHERE id = 441; -- Purpose
-- UPDATE canciones SET genero = 'Otro' WHERE id = 442; -- Pyramid
-- UPDATE canciones SET genero = 'Otro' WHERE id = 443; -- Calvaire
-- UPDATE canciones SET genero = 'Otro' WHERE id = 444; -- Wake up, kill, repeat
-- UPDATE canciones SET genero = 'Otro' WHERE id = 445; -- Lacrimosa
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 447; -- No soy criminal
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 448; -- Sientelo
-- UPDATE canciones SET genero = 'Otro' WHERE id = 485; -- Brutal 12.0
-- UPDATE canciones SET genero = 'Otro' WHERE id = 486; -- Brutal 8.0
-- UPDATE canciones SET genero = 'Otro' WHERE id = 487; -- Reincarnation
-- UPDATE canciones SET genero = 'Otro' WHERE id = 488; -- Until i win
-- UPDATE canciones SET genero = 'Otro' WHERE id = 489; -- Razor
-- UPDATE canciones SET genero = 'Otro' WHERE id = 490; -- Dominator tribute
-- UPDATE canciones SET genero = 'Otro' WHERE id = 491; -- Kick that kick
-- UPDATE canciones SET genero = 'Otro' WHERE id = 492; -- Kick op je bek
-- UPDATE canciones SET genero = 'Otro' WHERE id = 493; -- Street code
-- UPDATE canciones SET genero = 'Otro' WHERE id = 494; -- Piece of shit
-- UPDATE canciones SET genero = 'Otro' WHERE id = 495; -- Nocturnolz
-- UPDATE canciones SET genero = 'Otro' WHERE id = 496; -- Brotherhood of brutality
-- UPDATE canciones SET genero = 'Otro' WHERE id = 497; -- Command & conquer
-- UPDATE canciones SET genero = 'Otro' WHERE id = 498; -- Out for blood
-- UPDATE canciones SET genero = 'Otro' WHERE id = 499; -- The chronicles of chaos
-- UPDATE canciones SET genero = 'Otro' WHERE id = 500; -- The road to redemption
-- UPDATE canciones SET genero = 'Otro' WHERE id = 524; -- La cumbia tribalera
-- UPDATE canciones SET genero = 'Otro' WHERE id = 526; -- Ethernal Youth
-- UPDATE canciones SET genero = 'Otro' WHERE id = 527; -- Warm nights
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 531; -- Sucker for pain
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 544; -- Piano tiles
-- UPDATE canciones SET genero = 'Otro', banda_sonora = FALSE WHERE id = 572; -- Gangsta
-- UPDATE canciones SET genero = 'Otro' WHERE id = 575; -- Ofrenda
-- UPDATE canciones SET genero = 'Otro' WHERE id = 576; -- Wipy
-- UPDATE canciones SET genero = 'Otro' WHERE id = 577; -- Simon
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 581; -- On sight
-- UPDATE canciones SET genero = 'Otro' WHERE id = 582; -- No me digas que no
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 590; -- 1-800
-- UPDATE canciones SET genero = 'Otro' WHERE id = 618; -- Spaghetti love
-- UPDATE canciones SET genero = 'Otro' WHERE id = 619; -- Greazed up
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 635; -- Touch it
-- UPDATE canciones SET genero = 'Hip Hop' WHERE id = 662; -- Can't hold me down
