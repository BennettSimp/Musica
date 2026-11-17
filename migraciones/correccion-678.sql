-- ============================================================
-- CORRECCIÓN 678 — "Freaks" (Timmy Trumpet)
-- Re-análisis de la canción nueva agregada por Nova en vivo
-- Fecha: 2026-11-16
-- YA APLICADA 2026-11-16 (verificado en vivo: 437 'Timmy Trumpet',
-- 438 'Savage' invitado, 678 'Freaks' / Electronica / 16.09).
-- NO VOLVER A CORRER: las guardas la hacen no-op (UPDATE 0; verificado
-- en Postgres local 2026-11-16). Este archivo queda como registro.
-- ============================================================
-- ANÁLISIS (fuentes: Wikipedia "Freaks (Timmy Trumpet and Savage
-- song)", video oficial de YouTube, Apple Music, AllMusic, APRA):
--
-- * GÉNERO: Electronica SE QUEDA. La canción es Melbourne bounce
--   (Wikipedia: Genre = Melbourne bounce), subgénero de electro
--   house / EDM. En la taxonomía del catálogo, Electronica es el
--   cajón que la representa; 1 sola canción no cumple la regla de
--   género nuevo (2+ canciones o representación nula).
-- * TÍTULO: "Freaks" correcto. Sin cambio.
-- * ETIQUETA: 'Edit' correcto — CONFIRMADO por Nova 2026-11-16 16:39:
--   agregó la versión editada. Sin cambio.
-- * INSTRUMENTAL: FALSE correcto (tiene rap de Savage). Sin cambio.
-- * BANDA SONORA: FALSE correcto. Sin cambio.
-- * CALIFICACIÓN: fórmula verificada (9.1*0.35 + 8.8*0.25 + 5*0.40
--   + 3.7 + 5 bonos = 16.085 → 16.09, dentro de la tolerancia
--   ±0.01 por redondeo flotante). Sin cambio.
--
-- * ARTISTA — 1 corrección (DECIDIDO por Nova 2026-11-16 16:31):
--   El artista principal es TIMMY TRUMPET, solo. Savage se queda
--   como INVITADO (así quedó al agregar la canción y así se queda).
--   Nova lo confirmó por YouTube Music. Mi propuesta inicial de
--   subir a Savage a principal (por el crédito "Timmy Trumpet &
--   Savage" y el precedente 531) queda DESCARTADA por decisión
--   de Nova.
--   La única corrección es la capitalización: el artista quedó
--   guardado como 'Timmy trumpet' (id 437). El nombre correcto es
--   'Timmy Trumpet' (sin S al final: Wikipedia, video oficial,
--   Apple Music, AllMusic, APRA y su web timmytrumpet.com dicen
--   "Timmy Trumpet"; igual que 'Lil nas x' → 'Lil Nas X').
--   Productor: NO se registra (Timmy Trumpet no está en la lista
--   corta de productores "demasiado relevantes" ni se menciona
--   como productor en el título).
--
-- ORDEN DE APLICACIÓN: después de los 5 SQL ya aplicados
-- (lote-1 → lote-2-3 → lote-4 → títulos → artistas).
-- Hacer respaldo del export antes (por si acaso).
-- ============================================================

BEGIN;

-- (1) Capitalización del nombre del artista principal (id 437).
UPDATE artistas
SET nombre = 'Timmy Trumpet'
WHERE id = 437 AND nombre = 'Timmy trumpet';

-- (2) Columna almacenada canciones.artista (las lecturas la derivan
-- del principal, pero se mantiene coherente como en el backfill
-- de artistas-aplicar.sql).
UPDATE canciones
SET artista = 'Timmy Trumpet'
WHERE id = 678 AND artista = 'Timmy trumpet';

COMMIT;

-- ============================================================
-- VERIFICACIÓN (correr después del COMMIT):
-- ============================================================
-- SELECT id, nombre, nombre_norm FROM artistas WHERE id IN (437, 438);
-- Esperado: 437 'Timmy Trumpet' / 'timmy trumpet'; 438 'Savage' / 'savage'.
--
-- SELECT cancion_id, artista_id, rol, orden FROM cancion_artistas
-- WHERE cancion_id = 678 ORDER BY orden;
-- Esperado: (678, 437, 'principal', 1), (678, 438, 'invitado', 2).
--
-- SELECT id, titulo, artista, genero FROM canciones WHERE id = 678;
-- Esperado: 678 | 'Freaks' | 'Timmy Trumpet' | 'Electronica'.
--
-- Y en vivo: /api/canciones/exportar debe mostrar la 678 con
-- artista 'Timmy Trumpet' y artistas [{Timmy Trumpet, principal},
-- {Savage, invitado}].
-- ============================================================
-- ROLLBACK (solo si algo sale mal; NO correr salvo ese caso):
-- ============================================================
-- BEGIN;
-- UPDATE artistas SET nombre = 'Timmy trumpet'
-- WHERE id = 437 AND nombre = 'Timmy Trumpet';
-- UPDATE canciones SET artista = 'Timmy trumpet'
-- WHERE id = 678 AND artista = 'Timmy Trumpet';
-- COMMIT;
