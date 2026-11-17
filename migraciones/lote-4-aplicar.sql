-- Lote 4 de géneros — SQL para aplicar en el SQL Editor de Supabase
-- APROBADO por Nova 2026-11-15: las 105 correcciones claras + las 24 dudosas
-- resueltas (3 por Nova directamente, 21 por criterio de Muse con su confianza
-- explícita: 'confiaré en tu criterio e investigación') + Dembow (529, 537, 538)
-- + banda sonora 604. Detalle y motivos en revision-decisiones.md.
-- YA APLICADO 2026-11-16 — NO VOLVER A CORRER (se aplicó con la laptop,
-- junto con el despliegue del código preparado; verificado en vivo:
-- 128 UPDATEs). Las guardas lo harían no-op (UPDATE 0) si se re-corriera.
-- NOTA POST-678: los 'esperado: 677' de la verificación son PRE-678;
-- el vivo actual es 678 (ver correccion-678.sql).
-- (La aplicación fue con la laptop, juntos y fase por fase, junto con el
-- despliegue del código preparado, que incluye los 5 géneros
-- nuevos: Bachata, Merengue, Dembow, Reggae, Afrobeats). Los lotes 2 y 3
-- tienen su propia revisión pendiente; este archivo es solo el lote 4.
--
-- CÓMO SE USA (igual que el lote 1, juntos y con la laptop):
--   0. Respaldo: descarga /api/canciones/exportar y guarda ese JSON.
--   1. Supabase → SQL Editor → New query → pega este archivo → Run.
--   2. Revisa el paso de verificación: las filas corregidas, el total en 677,
--      y que ya no quede ninguna canción en Hip Hop, Otro, OST ni Asiatica
--      (eso último depende de que también se apliquen los lotes 1–3).
--   3. Si algo sale mal, usa el ROLLBACK del final o reimporta el respaldo.
-- NOTA: esto va JUNTO con el despliegue del código preparado y con los
-- géneros nuevos (lista GENEROS en app.js, filtros, Agregar/Editar, schema.sql).
-- No aplicar la DB sin el código.
--
-- ORDEN RECOMENDADO DE APLICACIÓN (los 5 SQL de la fase DB, en este orden):
--   1. lote-1-aplicar.sql → 2. lote-2-3-aplicar.sql →
--   3. lote-4-aplicar.sql (este archivo) → 4. titulos-correcciones.sql →
--   5. artistas-aplicar.sql. Ver schema.sql ("ORDEN RECOMENDADO").
--
-- PRE-FLIGHT (antes de correr este archivo, en vivo):
--   SELECT id, banda_sonora, instrumental FROM canciones
--   WHERE id IN (271, 274, 301, 302, 376, 542, 572, 604);
--   Los ROLLBACK de los lotes suponen banda_sonora = FALSE en esas 8
--   canciones (aquí: 271, 301, 542, 604). Si alguna sale TRUE, PARAR
--   y revisar antes de seguir: el rollback la dejaría en FALSE y se
--   perdería el dato real. Las columnas banda_sonora / instrumental ya
--   existen en vivo: los ALTER TABLE IF NOT EXISTS del PASO 1 son no-op.
--
-- TRANSACCIÓN: todo va dentro de BEGIN/COMMIT (igual que lote-2-3 y
-- títulos). Cada UPDATE lleva además la guarda AND genero = '<viejo>':
-- si el dato en vivo no coincide con lo verificado, ese UPDATE afecta
-- 0 filas en vez de sobrescribir en silencio. Si algún UPDATE afecta
-- 0 filas, PARAR y revisar antes de seguir.
-- DEPENDENCIA DE ORDEN EN LA VERIFICACIÓN (PASO 3): el "0 filas en
-- Hip Hop, Otro, OST ni Asiatica" supone los lotes 1–3 TAMBIÉN
-- aplicados; sin ellos, esa comprobación devuelve filas aunque todo
-- esté bien.

BEGIN;

-- PASO 1 — Columnas nuevas (por si el lote 1 aún no se aplicó):
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS instrumental BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS banda_sonora BOOLEAN NOT NULL DEFAULT FALSE;

-- PASO 2 — Lote 4: 128 UPDATEs aprobados.
UPDATE canciones SET genero = 'Trap' WHERE id = 65 AND genero = 'Rap'; -- Rucon — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 70 AND genero = 'Rap'; -- Humo en la trampa — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 71 AND genero = 'Rap'; -- Bombas — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 72 AND genero = 'Rap'; -- Humo en la trampa 2 — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 75 AND genero = 'Rap'; -- Requisito 420 — Aleman (Rap → Cumbia) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 77 AND genero = 'Rap'; -- Casa en la montaña 2 — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 78 AND genero = 'Rap'; -- Humo en la trampa 3 — Aleman (Rap → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 79 AND genero = 'Rap'; -- Narco jr — Aleman (Rap → Trap) [Dudosa resuelta por criterio de Muse: Álbum Eclipse, disco 2 = lado trap según el propio Alemán; las fuentes no distinguen discos]
UPDATE canciones SET genero = 'Trap' WHERE id = 82 AND genero = 'Pop'; -- Flechazo en el centro — Ysy a (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 83 AND genero = 'Pop'; -- Cómo chilla ella — Ysy a (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 84 AND genero = 'Pop'; -- Pa está soledad — Ysy a (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 100 AND genero = 'Pop'; -- Bzrp sessión V.51 — Bizarrap (Pop → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 101 AND genero = 'Rap'; -- Vip — Villano antillano (Rap → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 103 AND genero = 'Pop'; -- Besties — Joyce Santana (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 108 AND genero = 'Pop'; -- Activa — Chesca (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 115 AND genero = 'Pop'; -- Cruel — Recycled J (Pop → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 117 AND genero = 'Pop'; -- Thick thick — Lil joujou (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 131 AND genero = 'Pop'; -- Mucha data — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 132 AND genero = 'Pop'; -- Brinca — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 133 AND genero = 'Pop'; -- Maléfica — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 134 AND genero = 'Pop'; -- Chapiadora — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 135 AND genero = 'Pop'; -- C4torce II — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 136 AND genero = 'Pop'; -- Bounce — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 138 AND genero = 'Pop'; -- Ya no quiero — Cazzu (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 173 AND genero = 'Banda'; -- Que ganas de no verte nunca más (pop) — Jenni Rivera (Banda → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Corridos Tumbados' WHERE id = 187 AND genero = 'Banda'; -- 200 copas — Karol G (Banda → Corridos Tumbados) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 191 AND genero = 'Pop'; -- TQG — Karol G (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 192 AND genero = 'Pop'; -- Mi ex tenía razon — Karol G (Pop → Cumbia) [Corrección clara verificada]
UPDATE canciones SET genero = 'Bachata' WHERE id = 193 AND genero = 'Pop'; -- El barco — Karol G (Pop → Bachata) [Dudosa resuelta por criterio de Muse: Género nuevo: las fuentes la llaman 'la bachata El barco'; empezó como bossa nova]
UPDATE canciones SET genero = 'Trap' WHERE id = 194 AND genero = 'Reggaeton'; -- Culpable — Karol g (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 199 AND genero = 'Trap'; -- El makinon — Karol G (Trap → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 200 AND genero = 'Trap'; -- Cairo — Karol G (Trap → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 211 AND genero = 'Pop'; -- Mercurio — Karol G (Pop → Reggaeton) [Dudosa resuelta por criterio de Muse: Perreo suave y romántico; álbum principalmente de reguetón]
UPDATE canciones SET genero = 'Trap' WHERE id = 213 AND genero = 'Reggaeton'; -- Gato malo — Karol g (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 219 AND genero = 'Pop'; -- Cumbia a la gente — Guaynaa (Pop → Cumbia) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 224 AND genero = 'Pop'; -- Demente — Guaynaa (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 225 AND genero = 'Cumbia'; -- Los cachos — Guaynaa (Cumbia → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 227 AND genero = 'Pop'; -- Chica idea [remix] — Sebastian Yatra (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 228 AND genero = 'Pop'; -- Respira — Guaynaa (Pop → Reggaeton) [Dudosa resuelta por criterio de Muse: Sin ficha por canción; álbum La República es de reguetón, con Lola Índigo]
UPDATE canciones SET genero = 'Hardstyle' WHERE id = 240 AND genero = 'Phonk'; -- Jumpstyle bootleg (slowed) — Ilyhiryu (Phonk → Hardstyle) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rock' WHERE id = 264 AND genero = 'Pop'; -- West coast — Lana del rey (Pop → Rock) [Corrección clara verificada]
UPDATE canciones SET genero = 'Alternativo' WHERE id = 265 AND genero = 'Pop'; -- Born to die — Lana del rey (Pop → Alternativo) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 266 AND genero = 'Pop'; -- Diet mountain dew — Lana del rey (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 268 AND genero = 'Electronica'; -- Lambada [Pitched + bass] — T-fest x scriptonite (Electronica → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 269 AND genero = 'Trap'; -- Москва любит... — Cartel de santa (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B', banda_sonora = TRUE WHERE id = 271 AND genero = 'Pop'; -- Mount everest — Labrinth (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 272 AND genero = 'Trap'; -- Baby mama — Скриптонит (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 273 AND genero = 'Trap'; -- Космос — Скриптонит (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 275 AND genero = 'Trap'; -- Танцуй сама — Скриптонит (Trap → Reggaeton) [Dudosa resuelta por criterio de Muse: No es trap: jazz bailable con saxofón, estilo latino, ritmo parecido al reguetón]
UPDATE canciones SET genero = 'Rock' WHERE id = 276 AND genero = 'Trap'; -- Притон — Скриптонит (Trap → Rock) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 278 AND genero = 'Trap'; -- Billboard — Miyagi & Andy panda (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 279 AND genero = 'Trap'; -- Рамок нет — Скриптонит (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 281 AND genero = 'Trap'; -- Brooklyn [pokra remix] — Miyagi & Andy panda (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Alternativo' WHERE id = 293 AND genero = 'Pop'; -- Écoute chérie — Vendredi sur mer (Pop → Alternativo) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 294 AND genero = 'Banda'; -- El botecito — Los hijos del pueblo (Banda → Cumbia) [Corrección clara verificada]
UPDATE canciones SET genero = 'Corridos Tumbados' WHERE id = 295 AND genero = 'Corridos'; -- Cómo capo — Clave especial (Corridos → Corridos Tumbados) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 296 AND genero = 'Pop'; -- Streets — Doja cat (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 299 AND genero = 'Pop'; -- Need to know — Doja cat (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 300 AND genero = 'Pop'; -- Wine pon you — Doja cat (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET banda_sonora = TRUE WHERE id = 301 AND genero = 'Pop'; -- Boss bitch — Doja cat (Pop → Pop) [Banda sonora (verificado)]
UPDATE canciones SET genero = 'Rap' WHERE id = 303 AND genero = 'Pop'; -- Like that — Doja cat (Pop → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 304 AND genero = 'Pop'; -- Freak — Doja cat (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 305 AND genero = 'Pop'; -- Won't bite — Doja cat (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 306 AND genero = 'Pop'; -- Love to dream — Doja cat (Pop → R&B) [Dudosa resuelta por criterio de Muse: Balada suave de Planet Her (pop/R&B); carácter R&B]
UPDATE canciones SET genero = 'Trap' WHERE id = 316 AND genero = 'Reggaeton'; -- Nathy peluso bzrp n. 36 — Bizarrap (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 319 AND genero = 'Pop'; -- Amigos — Bibi (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 329 AND genero = 'Pop'; -- La loto — Tini (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 330 AND genero = 'Pop'; -- Sola — Becky G (Pop → Reggaeton) [Corrección clara verificada] [NOTA auditoría ronda 3, 2026-11-16: este UPDATE olvidó banda_sonora = TRUE (la 330 es banda sonora de The Crew 2, mismo criterio que la 604); el fix se aplicó en vivo por separado — UPDATE canciones SET banda_sonora = TRUE WHERE id = 330 AND genero = 'Reggaeton' — y se verificó 9/9. No se reescribe el SQL: archivo ya aplicado. Ojo: el ROLLBACK de este archivo (línea 260) solo restaura el género de la 330; si se usara, la dejaría con banda_sonora = TRUE.]
UPDATE canciones SET genero = 'Pop' WHERE id = 335 AND genero = 'Reggaeton'; -- Guapa — Becky g (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 337 AND genero = 'Rock'; -- No te pertenezco — Becky G (Rock → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 340 AND genero = 'Pop'; -- Te supere — Becky G (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 343 AND genero = 'Reggaeton'; -- Borracha — Becky g (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 344 AND genero = 'Reggaeton'; -- Que le muerda — Becky g (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 346 AND genero = 'Reggaeton'; -- Kill bill — Becky g (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Electronica' WHERE id = 347 AND genero = 'Alternativo'; -- rakata (prada/rakata) — Arca (Alternativo → Electronica) [Corrección clara verificada]
UPDATE canciones SET genero = 'Electronica' WHERE id = 348 AND genero = 'Alternativo'; -- Prada (prada/rakata) — Arca (Alternativo → Electronica) [Corrección clara verificada]
UPDATE canciones SET genero = 'Salsa' WHERE id = 349 AND genero = 'Rap'; -- La perla — Calle 13 (Rap → Salsa) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 356 AND genero = 'Alternativo'; -- Hey bitch lit — Sailorfag (Alternativo → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 357 AND genero = 'Electronica'; -- Ya no quiero — Sailorfag (Electronica → Reggaeton) [Dudosa resuelta por criterio de Muse: Sencillo 2018 de su etapa rap/reguetón; las bases electrónicas son producción, no género]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 360 AND genero = 'Alternativo'; -- Sed de la mala — Sailorfag (Alternativo → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 361 AND genero = 'Alternativo'; -- Rip — Sailorfag (Alternativo → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 362 AND genero = 'Electronica'; -- Voltaje — Sailorfag (Electronica → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggae' WHERE id = 364 AND genero = 'Rap'; -- La vuelta al mundo — Calle 13 (Rap → Reggae) [Dudosa resuelta por criterio de Muse: Género nuevo: 'elegante reggae', cantada no rapeada]
UPDATE canciones SET genero = 'Alternativo' WHERE id = 377 AND genero = 'Rap'; -- La vida — Calle 13 (Rap → Alternativo) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 378 AND genero = 'Rap'; -- Sin exagerar — Calle 13 (Rap → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 379 AND genero = 'Rap'; -- Tal para cual — Calle 13 (Rap → Cumbia) [Dudosa resuelta por criterio de Muse: Crónica de concierto: 'cumbia villera'; eLyrics dice reggaeton/hip-hop (etiqueta genérica)]
UPDATE canciones SET genero = 'Rap' WHERE id = 380 AND genero = 'Pop'; -- Gordita — Shakira (Pop → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 431 AND genero = 'Alternativo'; -- Así de grandes son las ideas — Calle 13 (Alternativo → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 436 AND genero = 'Reggaeton'; -- Un polvo — Maluma (Reggaeton → Trap) [Dudosa resuelta por criterio de Muse: En playlists '10s Latin Trap' y 'Trap Classics'; una fuente dice reggaeton]
UPDATE canciones SET genero = 'Pop' WHERE id = 440 AND genero = 'Reggaeton'; -- I like it — Enrique Iglesias (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 446 AND genero = 'Pop'; -- Día/noche — Rich Vagos (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 449 AND genero = 'Alternativo'; -- Frío — Yoss bones (Alternativo → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 452 AND genero = 'Pop'; -- Malamente — Rosalía (Pop → R&B) [Dudosa resuelta por criterio de Muse: Wikipedia: Alternative R&B (flamenco + pop + reggaeton + R&B)]
UPDATE canciones SET genero = 'Pop' WHERE id = 454 AND genero = 'Alternativo'; -- Di mi nombre (cap: 8) — Rosalía (Alternativo → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'R&B' WHERE id = 456 AND genero = 'Pop'; -- Bagdad (cap: 7) — Rosalía (Pop → R&B) [Corrección clara verificada]
UPDATE canciones SET genero = 'Afrobeats' WHERE id = 461 AND genero = 'Pop'; -- Girl like me — Black eyed peas (Pop → Afrobeats) [Dudosa resuelta por criterio de Muse: Género nuevo: la canción es Afro Beat con letra latina]
UPDATE canciones SET genero = 'Merengue' WHERE id = 466 AND genero = 'Pop'; -- Loca — Shakira (Pop → Merengue) [Dudosa resuelta por criterio de Muse: Género nuevo: fusión de merengue electrificado]
UPDATE canciones SET genero = 'Merengue' WHERE id = 467 AND genero = 'Pop'; -- Rabiosa — Shakira (Pop → Merengue) [Dudosa resuelta por criterio de Muse: Género nuevo: mezcla de merengue y reggaeton, base merengue]
UPDATE canciones SET genero = 'Baladas' WHERE id = 484 AND genero = 'Pop'; -- Yo te extrañare — Tercer cielo (Pop → Baladas) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 506 AND genero = 'Rock'; -- Super physco love — Simon curtis (Rock → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Dembow' WHERE id = 529 AND genero = 'Reggaeton'; -- Qué viva — Tokischa (Reggaeton → Dembow) [Dembow dominicano; género nuevo agregado]
UPDATE canciones SET genero = 'Trap' WHERE id = 536 AND genero = 'Reggaeton'; -- La romana — Bad bunny (Reggaeton → Trap) [Dudosa resuelta por criterio de Muse: Híbrido: primera mitad Latin trap (parte principal), segunda mitad dembow]
UPDATE canciones SET genero = 'Dembow' WHERE id = 537 AND genero = 'Reggaeton'; -- Besalo — El alfa (Reggaeton → Dembow) [Dembow dominicano; género nuevo agregado]
UPDATE canciones SET genero = 'Dembow' WHERE id = 538 AND genero = 'Reggaeton'; -- Plebada — El alfa (Reggaeton → Dembow) [Dembow dominicano; género nuevo agregado]
UPDATE canciones SET genero = 'Electronica' WHERE id = 540 AND genero = 'Pop'; -- Tristella — Esperom (Pop → Electronica) [Dudosa resuelta por criterio de Muse: Artista latino de synthwave/electropop; probable Electronica]
UPDATE canciones SET genero = 'Pop', banda_sonora = TRUE WHERE id = 542 AND genero = 'Baladas'; -- Towards the sun — Rihanna (Baladas → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 549 AND genero = 'Pop'; -- Kenia roast yourself — Kenia os (Pop → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 550 AND genero = 'Pop'; -- Rumores — Kenia os (Pop → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Electronica' WHERE id = 551 AND genero = 'Baladas'; -- Flores — Kenia Os (Baladas → Electronica) [Corrección clara verificada]
UPDATE canciones SET genero = 'Baladas' WHERE id = 552 AND genero = 'Pop'; -- Morir de amor — Kenia os (Pop → Baladas) [Dudosa resuelta por criterio de Muse: Balada romántica del álbum Cambios de Luna]
UPDATE canciones SET genero = 'Reggaeton' WHERE id = 553 AND genero = 'Trap'; -- Los santos — Kenia Os (Trap → Reggaeton) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 556 AND genero = 'Reggaeton'; -- Joder — Kenia Os (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Cumbia' WHERE id = 591 AND genero = 'Reggaeton'; -- Mesa que más aplauda — Grupo clímax (Reggaeton → Cumbia) [Corrección clara verificada]
UPDATE canciones SET genero = 'Electronica' WHERE id = 601 AND genero = 'Pop'; -- Die in a fire — The livings tombstones (Pop → Electronica) [Corrección clara verificada]
UPDATE canciones SET genero = 'Metal' WHERE id = 602 AND genero = 'Pop'; -- Open the door — Longestsoloever (Pop → Metal) [Corrección clara verificada]
UPDATE canciones SET banda_sonora = TRUE WHERE id = 604 AND genero = 'Rap'; -- A ti te da besitos — Cartel de Santa (Rap → Rap) [Banda sonora: Los Jefes (2015) — mismo criterio que la 330]
UPDATE canciones SET genero = 'Alternativo' WHERE id = 624 AND genero = 'Rock'; -- Overdose — Grandson (Rock → Alternativo) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 626 AND genero = 'Rap'; -- Party like a russian — Robbie williams (Rap → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 628 AND genero = 'Reggaeton'; -- Nasti nasti — Underaiki (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 632 AND genero = 'Trap'; -- Yo soy libre porque pienso — Calle 13 (Trap → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Electronica' WHERE id = 647 AND genero = 'Pop'; -- Rhinestone eyes — Gorillaz (Pop → Electronica) [Dudosa resuelta por criterio de Muse: Wikipedia: Electro-funk; entró a Dance/Electronic]
UPDATE canciones SET genero = 'Alternativo' WHERE id = 648 AND genero = 'Rock'; -- El mañana — Gorillaz (Rock → Alternativo) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 656 AND genero = 'Reggaeton'; -- Sabadrugs — Remik gonzalez (Reggaeton → Rap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 659 AND genero = 'Electronica'; -- Bad girls need love tol — Hipshaker (Electronica → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 665 AND genero = 'Rap'; -- Mr. Delincuente — Norykoo (Rap → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Trap' WHERE id = 673 AND genero = 'Reggaeton'; -- Monaco — Bad Bunny (Reggaeton → Trap) [Corrección clara verificada]
UPDATE canciones SET genero = 'Pop' WHERE id = 674 AND genero = 'Reggaeton'; -- Andrea — Bad bunny (Reggaeton → Pop) [Corrección clara verificada]
UPDATE canciones SET genero = 'Rap' WHERE id = 677 AND genero = 'Pop'; -- Calle me by your name — Lil nas x (Pop → Rap) [Corrección clara verificada]
-- PASO 3 — Verificación:
SELECT id, titulo, genero, banda_sonora FROM canciones WHERE id IN (65, 70, 71, 72, 75, 77, 78, 79, 82, 83, 84, 100, 101, 103, 108, 115, 117, 131, 132, 133, 134, 135, 136, 138, 173, 187, 191, 192, 193, 194, 199, 200, 211, 213, 219, 224, 225, 227, 228, 240, 264, 265, 266, 268, 269, 271, 272, 273, 275, 276, 278, 279, 281, 293, 294, 295, 296, 299, 300, 301, 303, 304, 305, 306, 316, 319, 329, 330, 335, 337, 340, 343, 344, 346, 347, 348, 349, 356, 357, 360, 361, 362, 364, 377, 378, 379, 380, 431, 436, 440, 446, 449, 452, 454, 456, 461, 466, 467, 484, 506, 529, 536, 537, 538, 540, 542, 549, 550, 551, 552, 553, 556, 591, 601, 602, 604, 624, 626, 628, 632, 647, 648, 656, 659, 665, 673, 674, 677) ORDER BY id;
-- Deben dar 0 filas (tras aplicar lotes 1–3 también):
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('Hip Hop', 'Otro', 'OST', 'Asiatica') GROUP BY genero;
-- El total no debe cambiar:
SELECT COUNT(*) AS total FROM canciones; -- esperado: 677
-- Géneros nuevos que deben existir ya en el código (GENEROS en app.js):
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('Bachata','Merengue','Dembow','Reggae','Afrobeats') GROUP BY genero;

COMMIT;

-- ROLLBACK — solo si algo sale mal (valores viejos según el export 2026-11-13):
-- UPDATE canciones SET genero = 'Rap' WHERE id = 65; -- Rucon
-- UPDATE canciones SET genero = 'Rap' WHERE id = 70; -- Humo en la trampa
-- UPDATE canciones SET genero = 'Rap' WHERE id = 71; -- Bombas
-- UPDATE canciones SET genero = 'Rap' WHERE id = 72; -- Humo en la trampa 2
-- UPDATE canciones SET genero = 'Rap' WHERE id = 75; -- Requisito 420
-- UPDATE canciones SET genero = 'Rap' WHERE id = 77; -- Casa en la montaña 2
-- UPDATE canciones SET genero = 'Rap' WHERE id = 78; -- Humo en la trampa 3
-- UPDATE canciones SET genero = 'Rap' WHERE id = 79; -- Narco jr
-- UPDATE canciones SET genero = 'Pop' WHERE id = 82; -- Flechazo en el centro
-- UPDATE canciones SET genero = 'Pop' WHERE id = 83; -- Cómo chilla ella
-- UPDATE canciones SET genero = 'Pop' WHERE id = 84; -- Pa está soledad
-- UPDATE canciones SET genero = 'Pop' WHERE id = 100; -- Bzrp sessión V.51
-- UPDATE canciones SET genero = 'Rap' WHERE id = 101; -- Vip
-- UPDATE canciones SET genero = 'Pop' WHERE id = 103; -- Besties
-- UPDATE canciones SET genero = 'Pop' WHERE id = 108; -- Activa
-- UPDATE canciones SET genero = 'Pop' WHERE id = 115; -- Cruel
-- UPDATE canciones SET genero = 'Pop' WHERE id = 117; -- Thick thick
-- UPDATE canciones SET genero = 'Pop' WHERE id = 131; -- Mucha data
-- UPDATE canciones SET genero = 'Pop' WHERE id = 132; -- Brinca
-- UPDATE canciones SET genero = 'Pop' WHERE id = 133; -- Maléfica
-- UPDATE canciones SET genero = 'Pop' WHERE id = 134; -- Chapiadora
-- UPDATE canciones SET genero = 'Pop' WHERE id = 135; -- C4torce II
-- UPDATE canciones SET genero = 'Pop' WHERE id = 136; -- Bounce
-- UPDATE canciones SET genero = 'Pop' WHERE id = 138; -- Ya no quiero
-- UPDATE canciones SET genero = 'Banda' WHERE id = 173; -- Que ganas de no verte nunca más (pop)
-- UPDATE canciones SET genero = 'Banda' WHERE id = 187; -- 200 copas
-- UPDATE canciones SET genero = 'Pop' WHERE id = 191; -- TQG
-- UPDATE canciones SET genero = 'Pop' WHERE id = 192; -- Mi ex tenía razon
-- UPDATE canciones SET genero = 'Pop' WHERE id = 193; -- El barco
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 194; -- Culpable
-- UPDATE canciones SET genero = 'Trap' WHERE id = 199; -- El makinon
-- UPDATE canciones SET genero = 'Trap' WHERE id = 200; -- Cairo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 211; -- Mercurio
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 213; -- Gato malo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 219; -- Cumbia a la gente
-- UPDATE canciones SET genero = 'Pop' WHERE id = 224; -- Demente
-- UPDATE canciones SET genero = 'Cumbia' WHERE id = 225; -- Los cachos
-- UPDATE canciones SET genero = 'Pop' WHERE id = 227; -- Chica idea [remix]
-- UPDATE canciones SET genero = 'Pop' WHERE id = 228; -- Respira
-- UPDATE canciones SET genero = 'Phonk' WHERE id = 240; -- Jumpstyle bootleg (slowed)
-- UPDATE canciones SET genero = 'Pop' WHERE id = 264; -- West coast
-- UPDATE canciones SET genero = 'Pop' WHERE id = 265; -- Born to die
-- UPDATE canciones SET genero = 'Pop' WHERE id = 266; -- Diet mountain dew
-- UPDATE canciones SET genero = 'Electronica' WHERE id = 268; -- Lambada [Pitched + bass]
-- UPDATE canciones SET genero = 'Trap' WHERE id = 269; -- Москва любит...
-- UPDATE canciones SET genero = 'Pop', banda_sonora = FALSE WHERE id = 271; -- Mount everest
-- UPDATE canciones SET genero = 'Trap' WHERE id = 272; -- Baby mama
-- UPDATE canciones SET genero = 'Trap' WHERE id = 273; -- Космос
-- UPDATE canciones SET genero = 'Trap' WHERE id = 275; -- Танцуй сама
-- UPDATE canciones SET genero = 'Trap' WHERE id = 276; -- Притон
-- UPDATE canciones SET genero = 'Trap' WHERE id = 278; -- Billboard
-- UPDATE canciones SET genero = 'Trap' WHERE id = 279; -- Рамок нет
-- UPDATE canciones SET genero = 'Trap' WHERE id = 281; -- Brooklyn [pokra remix]
-- UPDATE canciones SET genero = 'Pop' WHERE id = 293; -- Écoute chérie
-- UPDATE canciones SET genero = 'Banda' WHERE id = 294; -- El botecito
-- UPDATE canciones SET genero = 'Corridos' WHERE id = 295; -- Cómo capo
-- UPDATE canciones SET genero = 'Pop' WHERE id = 296; -- Streets
-- UPDATE canciones SET genero = 'Pop' WHERE id = 299; -- Need to know
-- UPDATE canciones SET genero = 'Pop' WHERE id = 300; -- Wine pon you
-- UPDATE canciones SET banda_sonora = FALSE WHERE id = 301; -- Boss bitch
-- UPDATE canciones SET genero = 'Pop' WHERE id = 303; -- Like that
-- UPDATE canciones SET genero = 'Pop' WHERE id = 304; -- Freak
-- UPDATE canciones SET genero = 'Pop' WHERE id = 305; -- Won't bite
-- UPDATE canciones SET genero = 'Pop' WHERE id = 306; -- Love to dream
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 316; -- Nathy peluso bzrp n. 36
-- UPDATE canciones SET genero = 'Pop' WHERE id = 319; -- Amigos
-- UPDATE canciones SET genero = 'Pop' WHERE id = 329; -- La loto
-- UPDATE canciones SET genero = 'Pop' WHERE id = 330; -- Sola
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 335; -- Guapa
-- UPDATE canciones SET genero = 'Rock' WHERE id = 337; -- No te pertenezco
-- UPDATE canciones SET genero = 'Pop' WHERE id = 340; -- Te supere
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 343; -- Borracha
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 344; -- Que le muerda
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 346; -- Kill bill
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 347; -- rakata (prada/rakata)
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 348; -- Prada (prada/rakata)
-- UPDATE canciones SET genero = 'Rap' WHERE id = 349; -- La perla
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 356; -- Hey bitch lit
-- UPDATE canciones SET genero = 'Electronica' WHERE id = 357; -- Ya no quiero
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 360; -- Sed de la mala
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 361; -- Rip
-- UPDATE canciones SET genero = 'Electronica' WHERE id = 362; -- Voltaje
-- UPDATE canciones SET genero = 'Rap' WHERE id = 364; -- La vuelta al mundo
-- UPDATE canciones SET genero = 'Rap' WHERE id = 377; -- La vida
-- UPDATE canciones SET genero = 'Rap' WHERE id = 378; -- Sin exagerar
-- UPDATE canciones SET genero = 'Rap' WHERE id = 379; -- Tal para cual
-- UPDATE canciones SET genero = 'Pop' WHERE id = 380; -- Gordita
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 431; -- Así de grandes son las ideas
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 436; -- Un polvo
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 440; -- I like it
-- UPDATE canciones SET genero = 'Pop' WHERE id = 446; -- Día/noche
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 449; -- Frío
-- UPDATE canciones SET genero = 'Pop' WHERE id = 452; -- Malamente
-- UPDATE canciones SET genero = 'Alternativo' WHERE id = 454; -- Di mi nombre (cap: 8)
-- UPDATE canciones SET genero = 'Pop' WHERE id = 456; -- Bagdad (cap: 7)
-- UPDATE canciones SET genero = 'Pop' WHERE id = 461; -- Girl like me
-- UPDATE canciones SET genero = 'Pop' WHERE id = 466; -- Loca
-- UPDATE canciones SET genero = 'Pop' WHERE id = 467; -- Rabiosa
-- UPDATE canciones SET genero = 'Pop' WHERE id = 484; -- Yo te extrañare
-- UPDATE canciones SET genero = 'Rock' WHERE id = 506; -- Super physco love
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 529; -- Qué viva
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 536; -- La romana
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 537; -- Besalo
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 538; -- Plebada
-- UPDATE canciones SET genero = 'Pop' WHERE id = 540; -- Tristella
-- UPDATE canciones SET genero = 'Baladas', banda_sonora = FALSE WHERE id = 542; -- Towards the sun
-- UPDATE canciones SET genero = 'Pop' WHERE id = 549; -- Kenia roast yourself
-- UPDATE canciones SET genero = 'Pop' WHERE id = 550; -- Rumores
-- UPDATE canciones SET genero = 'Baladas' WHERE id = 551; -- Flores
-- UPDATE canciones SET genero = 'Pop' WHERE id = 552; -- Morir de amor
-- UPDATE canciones SET genero = 'Trap' WHERE id = 553; -- Los santos
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 556; -- Joder
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 591; -- Mesa que más aplauda
-- UPDATE canciones SET genero = 'Pop' WHERE id = 601; -- Die in a fire
-- UPDATE canciones SET genero = 'Pop' WHERE id = 602; -- Open the door
-- UPDATE canciones SET banda_sonora = FALSE WHERE id = 604; -- A ti te da besitos
-- UPDATE canciones SET genero = 'Rock' WHERE id = 624; -- Overdose
-- UPDATE canciones SET genero = 'Rap' WHERE id = 626; -- Party like a russian
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 628; -- Nasti nasti
-- UPDATE canciones SET genero = 'Trap' WHERE id = 632; -- Yo soy libre porque pienso
-- UPDATE canciones SET genero = 'Pop' WHERE id = 647; -- Rhinestone eyes
-- UPDATE canciones SET genero = 'Rock' WHERE id = 648; -- El mañana
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 656; -- Sabadrugs
-- UPDATE canciones SET genero = 'Electronica' WHERE id = 659; -- Bad girls need love tol
-- UPDATE canciones SET genero = 'Rap' WHERE id = 665; -- Mr. Delincuente
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 673; -- Monaco
-- UPDATE canciones SET genero = 'Reggaeton' WHERE id = 674; -- Andrea
-- UPDATE canciones SET genero = 'Pop' WHERE id = 677; -- Calle me by your name
