-- ============================================================
-- CORRECCIONES DE DATOS — MEGA-AUDITORÍAS RONDA 4
-- Artistas duplicados (H4–H6) + etiqueta 652 (H3) + Guetta
-- invitado en la 326 (H1, decidido por Nova 2026-11-16)
-- Fecha: 2026-11-16
-- ============================================================
-- HALLAZGOS (verificados en vivo vía /api/artistas y export):
--
-- * H4: 'Tiesto' (id 198, sin diéresis) vs 'Tiësto' (id 419).
--   La 541 'Seavolution' tiene como principal al 198; el correcto
--   es el 419 (el de la 202 'Contigo'). Se re-apunta la 541 al 419
--   y se borra el 198.
-- * H5: 'Natthy peluso' (id 144, typo con doble t) vs
--   'Nathy Peluso' (id 358). La 317 'Business woman' tiene como
--   principal al 144; el correcto es el 358. Se re-apunta la 317
--   al 358 y se borra el 144.
-- * H6: 'The livings tombstones' (id 196, plural y minúsculas) vs
--   'The Living Tombstone' (id 195). La 601 'Die in a fire' tiene
--   como principal al 196; el correcto es el 195. Se re-apunta
--   la 601 al 195 y se borra el 196.
-- * H3: 652 'Ena remix' tiene etiqueta_especial 'Original'; es la
--   única de 10 canciones con "remix" en el título sin la etiqueta
--   Remix. Pasa a 'Remix'.
--
-- DECISIONES DE NOVA (ya tomadas, 2026-11-16):
-- * 326 'Mad love': David Guetta solo como productor; Wikipedia
--   acredita el sencillo a "Sean Paul and David Guetta". DECIDIDO
--   por Nova 2026-11-16: Guetta INVITADO (precedente 670/200).
--   Se agrega en el punto (5) de este archivo.
-- * 238 'Ayo Technology': Timbaland ya es invitado + productor;
--   la duda era si el invitado era correcto (el sencillo no lo
--   acredita, el álbum sí). DECIDIDO por Nova 2026-11-16: se queda
--   como invitado (sin cambio).
--
-- ORDEN: después de correccion-678.sql. Hacer respaldo del export
-- antes (por si acaso).
-- ============================================================

BEGIN;

-- (1) 541 'Seavolution': principal 'Tiesto' (198) → 'Tiësto' (419).
UPDATE cancion_artistas
SET artista_id = 419
WHERE cancion_id = 541 AND artista_id = 198 AND rol = 'principal';

UPDATE canciones
SET artista = 'Tiësto'
WHERE id = 541 AND artista = 'Tiesto';

DELETE FROM artistas
WHERE id = 198 AND nombre = 'Tiesto'
  AND NOT EXISTS (SELECT 1 FROM cancion_artistas WHERE artista_id = 198);

-- (2) 317 'Business woman': principal 'Natthy peluso' (144) → 'Nathy Peluso' (358).
UPDATE cancion_artistas
SET artista_id = 358
WHERE cancion_id = 317 AND artista_id = 144 AND rol = 'principal';

UPDATE canciones
SET artista = 'Nathy Peluso'
WHERE id = 317 AND artista = 'Natthy peluso';

DELETE FROM artistas
WHERE id = 144 AND nombre = 'Natthy peluso'
  AND NOT EXISTS (SELECT 1 FROM cancion_artistas WHERE artista_id = 144);

-- (3) 601 'Die in a fire': principal 'The livings tombstones' (196) → 'The Living Tombstone' (195).
UPDATE cancion_artistas
SET artista_id = 195
WHERE cancion_id = 601 AND artista_id = 196 AND rol = 'principal';

UPDATE canciones
SET artista = 'The Living Tombstone'
WHERE id = 601 AND artista = 'The livings tombstones';

DELETE FROM artistas
WHERE id = 196 AND nombre = 'The livings tombstones'
  AND NOT EXISTS (SELECT 1 FROM cancion_artistas WHERE artista_id = 196);

-- (4) 652 'Ena remix': etiqueta 'Original' → 'Remix'.
UPDATE canciones
SET etiqueta_especial = 'Remix'
WHERE id = 652 AND titulo = 'Ena remix' AND etiqueta_especial = 'Original';

-- (5) 326 'Mad love': David Guetta (47) pasa a ser también INVITADO
-- (además de productor). DECIDIDO por Nova 2026-11-16 (precedente
-- 670/200). Idempotente: si ya existe la fila, no hace nada.
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden)
SELECT 326, 47, 'invitado',
       COALESCE((SELECT MAX(orden) FROM cancion_artistas WHERE cancion_id = 326 AND rol = 'invitado'), 0) + 1
WHERE NOT EXISTS (
  SELECT 1 FROM cancion_artistas
  WHERE cancion_id = 326 AND artista_id = 47 AND rol = 'invitado'
);

COMMIT;

-- ============================================================
-- VERIFICACIÓN (correr después del COMMIT):
-- ============================================================
-- SELECT id, nombre FROM artistas WHERE id IN (198, 144, 196);
-- Esperado: 0 filas (borrados).
--
-- SELECT id, nombre FROM artistas WHERE id IN (419, 358, 195);
-- Esperado: 419 'Tiësto', 358 'Nathy Peluso', 195 'The Living Tombstone'.
--
-- SELECT cancion_id, artista_id, rol FROM cancion_artistas
-- WHERE cancion_id IN (541, 317, 601) ORDER BY cancion_id;
-- Esperado: (541, 419, 'principal'), (317, 358, 'principal'),
-- (601, 195, 'principal').
--
-- SELECT id, titulo, artista, etiqueta_especial FROM canciones
-- WHERE id IN (541, 317, 601, 652);
-- Esperado: 541 'Tiësto', 317 'Nathy Peluso', 601 'The Living
-- Tombstone', 652 'Ena remix' / 'Remix'.
--
-- SELECT cancion_id, artista_id, rol, orden FROM cancion_artistas
-- WHERE cancion_id = 326 AND artista_id = 47 ORDER BY rol;
-- Esperado: (326, 47, 'invitado', 3) y (326, 47, 'productor', ...):
-- Guetta con los DOS roles en la 326.
--
-- Y en vivo: /api/artistas debe pasar de 425 a 422 artistas.
-- ============================================================
-- ROLLBACK (solo si algo sale mal; NO correr salvo ese caso):
-- ============================================================
-- Los DELETE no se pueden deshacer sin re-insertar los artistas.
-- Si algo sale mal ANTES del COMMIT, hacer ROLLBACK en vez de
-- COMMIT. Si ya se hizo COMMIT, avisar a Muse con la salida de
-- la verificación para reconstruir los 3 artistas borrados.
