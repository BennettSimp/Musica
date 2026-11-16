-- Correcciones de TÍTULOS del catálogo — SQL para aplicar en el SQL Editor de Supabase
-- Fuentes: lote-4-correcciones.md (Observaciones) y revision-datos.json (27 ítems,
-- 19 de título), lote-3-villano-verificacion.md (114 'Pájara', 116 'esta canción').
-- Cada título actual se verificó contra public/datos-reales.json antes de escribirlo.
-- ALCANCE: la columna titulo, más UNA excepción en la columna artista: la 677
-- ('Lil nas x' → 'Lil Nas X'), porque artistas-aplicar.sql no cubre ese typo de
-- mayúsculas. Los demás nombres de artista los corrige artistas-aplicar.sql
-- (269 Scriptonite, 568 The Weeknd, 69 Alemán, 76 Alemán ft. Snow Tha Product,
-- 101 Kenia Os ft. Villano, 665 Norykko, 458 Rosalía, 616/617 Major Lazer).
-- ORDEN: el orden entre este archivo y artistas-aplicar.sql NO importa
-- para el nombre del artista. La justificación anterior ("el backfill lee
-- canciones.artista") es INCORRECTA: el backfill de artistas-aplicar.sql
-- es SQL estático generado desde el export y nunca lee la tabla en vivo.
-- Lo que sincroniza ambas tablas es el rename del PASO 3 de
-- artistas-aplicar.sql (id 122 'Lil nas x' → 'Lil Nas X'): corra este
-- archivo antes o después, la 677 termina con artista 'Lil Nas X' en
-- canciones y como principal en cancion_artistas. Orden recomendado
-- general (ver schema.sql): lote-1-aplicar.sql → lote-2-3-aplicar.sql →
-- lote-4-aplicar.sql → titulos-correcciones.sql (este archivo, 4.º) →
-- artistas-aplicar.sql (5.º).
-- NO CORRER TODAVÍA: la aplicación es con la laptop, juntos y fase por fase,
-- junto con el despliegue del código preparado. Nada de esto está en vivo.
--
-- EXCLUIDAS (con motivo, no se pierden):
--   - 629 'Stranger things (official tral remix)': su corrección de título ya está
--     en lote-1-aplicar.sql (línea 32: titulo = 'Stranger things (official trap remix)').
--     No se duplica aquí para no solapar archivos; el orden de aplicación no importa.
--   - 633 'TMM TMM': NO lleva UPDATE — su etiqueta_especial ya es 'Remix' en el
--     catálogo en vivo (export: Original 592, Remix 45, Slowed Reverb 36, Fragmento 4).
--     La nota de colaboraciones-reverificacion.md ('hoy está en None') es incorrecta;
--     se incluye la 633 en la verificación para confirmarlo, sin tocarla.
--   - 677: INCLUIDA (decisión de Nova 2026-11-16: "pon los nombres de la canción como
--     son"): título oficial 'MONTERO (Call Me By Your Name)' (Wikipedia, Last.fm,
--     Discogs) y artista 'Lil Nas X'. Ver PASO 1.
--
-- CÓMO SE USA (igual que los lotes, juntos y con la laptop):
--   0. Respaldo: descarga /api/canciones/exportar y guarda ese JSON.
--   1. Supabase → SQL Editor → New query → pega este archivo → Run.
--   2. Revisa el paso de verificación: los 22 registros corregidos, el total en 677,
--      0 filas con los typos viejos, y la 633 con etiqueta 'Remix' (ya estaba).
--   3. Si algo sale mal, usa el ROLLBACK del final o reimporta el respaldo.
-- NOTA: este archivo es independiente de lote-1-aplicar.sql, lote-2-3-aplicar.sql,
-- lote-4-aplicar.sql y artistas-aplicar.sql (columnas distintas: titulo vs genero /
-- artista / banda_sonora). El orden de aplicación entre ellos no importa para el
-- resultado final; el orden recomendado es lote-1 → lote-2-3 → lote-4 → títulos →
-- artistas (ver ORDEN arriba y schema.sql).
-- DEPENDENCIA DE ORDEN EN LA VERIFICACIÓN (PASO 3): la comprobación
-- titulo LIKE '%tral remix%' supone el lote 1 APLICADO (la 629 se corrige en
-- lote-1-aplicar.sql). Sin el lote 1, esa comprobación devuelve 1 fila
-- (la 629) aunque todo esté bien.
-- FALSO POSITIVO CORREGIDO 2026-11-16 (auditoría ronda 1): '%tral%'
-- también casaba con la 242 'Hypnosaes espectral 2 x amarella'
-- ('especTRAL'), que NO es un typo y NO se toca. El patrón se estrechó
-- a '%tral remix%': la comprobación "0 filas" ya es exacta.
-- No hace falta ALTER TABLE: no se crea ninguna columna.

BEGIN;

-- PASO 1 — Correcciones de título: 22 UPDATEs (21 de título + la 677, título y artista).
-- Cada UPDATE lleva la guarda AND titulo = '<actual esperado>': si el dato en vivo
-- no coincide, afecta 0 filas en vez de sobrescribir en silencio.
UPDATE canciones SET titulo = 'Monster killer resurrections' WHERE id = 2 AND titulo = 'Monster killer resurections'; -- Monster killer resurections → Monster killer resurrections [lote-4 Observaciones / revision-datos.json: typo "resurections" → "resurrections"]
UPDATE canciones SET titulo = 'Mobster Paradise' WHERE id = 30 AND titulo = 'Monster paradise'; -- Monster paradise → Mobster Paradise [lote-4 Observaciones: título real "Mobster Paradise"]
UPDATE canciones SET titulo = 'De Sur a Norte' WHERE id = 41 AND titulo = 'De norte a sur'; -- De norte a sur → De Sur a Norte [lote-4 Observaciones: título real "De Sur a Norte"]
UPDATE canciones SET titulo = 'Pájara' WHERE id = 114 AND titulo = 'Pajara'; -- Pajara → Pájara [lote-3-villano-verificacion.md: "Pájara" en todas las fuentes]
UPDATE canciones SET titulo = 'Precaución, esta canción es un hechizo' WHERE id = 116 AND titulo = 'Precaución, está canción es un hechizo'; -- Precaución, está canción es un hechizo → Precaución, esta canción es un hechizo [lote-3: Zumbido, Jenesaispop, Apple Music y Discogs coinciden ("esta canción")]
UPDATE canciones SET titulo = 'Montagem relacionista judicial RKT (super slowed)' WHERE id = 246 AND titulo = 'Montagem relacionista judicial rlt (super slowed)'; -- Montagem relacionista judicial rlt (super slowed) → Montagem relacionista judicial RKT (super slowed) [revision-datos.json: "rlt" → "RKT"]
UPDATE canciones SET titulo = 'HAUNT FUNK' WHERE id = 250 AND titulo = 'Haunt phonk'; -- Haunt phonk → HAUNT FUNK [revision-datos.json: "Haunt phonk" → "HAUNT FUNK"]
UPDATE canciones SET titulo = 'ENDER PEARL FUNK (ultra slowed)' WHERE id = 252 AND titulo = 'Ender pearl phonk (ultra slowed)'; -- Ender pearl phonk (ultra slowed) → ENDER PEARL FUNK (ultra slowed) [revision-datos.json: "Ender pearl phonk" → "ENDER PEARL FUNK"]
UPDATE canciones SET titulo = 'Summertime Sadness' WHERE id = 263 AND titulo = 'Summertimes sadness'; -- Summertimes sadness → Summertime Sadness [revision-datos.json: Lana Del Rey, "Summertime Sadness"]
UPDATE canciones SET titulo = 'Assassin''s creed unity rap' WHERE id = 401 AND titulo = 'Assasins creed unity rap'; -- Assasins creed unity rap → Assassin's creed unity rap [revision-datos.json: "Assasins" → "Assassin's"]
UPDATE canciones SET titulo = 'League of legends rap' WHERE id = 402 AND titulo = 'League of leyends rap'; -- League of leyends rap → League of legends rap [revision-datos.json: "leyends" → "legends"]
UPDATE canciones SET titulo = 'Light vs Lelouch' WHERE id = 416 AND titulo = 'Ligth vs Lelouch'; -- Ligth vs Lelouch → Light vs Lelouch [revision-datos.json: "Ligth" → "Light"]
UPDATE canciones SET titulo = 'Phoenix Wright vs hershel layton' WHERE id = 423 AND titulo = 'Phoenyx Wright vs hershel layton'; -- Phoenyx Wright vs hershel layton → Phoenix Wright vs hershel layton [revision-datos.json: "Phoenyx" → "Phoenix"]
UPDATE canciones SET titulo = 'Russian roulette' WHERE id = 505 AND titulo = 'Russian roulete'; -- Russian roulete → Russian roulette [revision-datos.json: "roulete" → "roulette"]
UPDATE canciones SET titulo = 'Super Psycho Love' WHERE id = 506 AND titulo = 'Super physco love'; -- Super physco love → Super Psycho Love [revision-datos.json: "physco" → "Psycho" (Simon Curtis)]
UPDATE canciones SET titulo = 'The Night Begins to Shine' WHERE id = 530 AND titulo = 'The last night to shine'; -- The last night to shine → The Night Begins to Shine [revision-datos.json: título incorrecto; la canción real es "The Night Begins to Shine" (B.E.R.)]
UPDATE canciones SET titulo = 'The last great American dynasty' WHERE id = 603 AND titulo = 'The last great American dinasty'; -- The last great American dinasty → The last great American dynasty [revision-datos.json: "dinasty" → "dynasty" (Taylor Swift)]
UPDATE canciones SET titulo = 'Angetenar' WHERE id = 621 AND titulo = 'Rampasso'; -- Rampasso → Angetenar [revision-datos.json: título y artista invertidos; la canción es "Angetenar" de Rompasso (el artista lo corrige artistas-aplicar.sql)]
UPDATE canciones SET titulo = 'Welcome to my apocalypse' WHERE id = 625 AND titulo = 'Welcome to my apocalyspe'; -- Welcome to my apocalyspe → Welcome to my apocalypse [revision-datos.json: "apocalyspe" → "apocalypse"]
UPDATE canciones SET titulo = 'Unforgettable waiting' WHERE id = 631 AND titulo = 'Unforgetabble waiting'; -- Unforgetabble waiting → Unforgettable waiting [revision-datos.json: "Unforgetabble" → "Unforgettable"]
UPDATE canciones SET titulo = 'Bad girls need love too' WHERE id = 659 AND titulo = 'Bad girls need love tol'; -- Bad girls need love tol → Bad girls need love too [revision-datos.json: "tol" → "too"]
UPDATE canciones SET titulo = 'MONTERO (Call Me By Your Name)', artista = 'Lil Nas X' WHERE id = 677 AND titulo = 'Calle me by your name' AND artista = 'Lil nas x'; -- Calle me by your name → MONTERO (Call Me By Your Name) [decisión de Nova 2026-11-16: nombres como son; título oficial Wikipedia/Last.fm/Discogs; artista 'Lil nas x' → 'Lil Nas X'; el orden con artistas-aplicar.sql no importa: el rename del PASO 3 (id 122) sincroniza ambas tablas]

-- PASO 2 — La 633 NO lleva UPDATE (su etiqueta ya es 'Remix'; ver encabezado).
-- Se incluye en la verificación de abajo para confirmarlo.

COMMIT;

-- PASO 3 — Verificación:
SELECT id, titulo, artista, etiqueta_especial FROM canciones WHERE id IN (2, 30, 41, 114, 116, 246, 250, 252, 263, 401, 402, 416, 423, 505, 506, 530, 603, 621, 625, 631, 633, 659, 677) ORDER BY id; -- la 633 debe salir con etiqueta_especial = 'Remix' (ya estaba); la 677 con titulo 'MONTERO (Call Me By Your Name)' y artista 'Lil Nas X'
-- Deben dar 0 filas (los typos viejos ya no existen):
SELECT id, titulo FROM canciones WHERE titulo LIKE '%tral remix%' OR titulo LIKE '%physco%' OR titulo LIKE '%resurections%' OR titulo LIKE '%roulete%' OR titulo LIKE '%Unforgetabble%' OR titulo LIKE '%Assasins%' OR titulo LIKE '%leyends%' OR titulo LIKE '%Ligth%' OR titulo LIKE '%Phoenyx%' OR titulo LIKE '%apocalyspe%' OR titulo LIKE '%dinasty%' OR titulo LIKE '%está canción%' OR titulo LIKE '%Monster paradise%' OR titulo LIKE '%De norte a sur%' OR titulo LIKE '%Haunt phonk%' OR titulo LIKE '%Ender pearl phonk%' OR titulo LIKE '%Summertimes sadness%' OR titulo LIKE '%The last night to shine%' OR titulo LIKE '%judicial rlt%' OR titulo LIKE '%love tol%' OR titulo LIKE '%Calle me by your name%' OR artista = 'Lil nas x';
-- El total no debe cambiar:
SELECT COUNT(*) AS total FROM canciones; -- esperado: 677

-- ROLLBACK — solo si algo sale mal (valores viejos según el export 2026-11-13):
-- UPDATE canciones SET titulo = 'Monster killer resurections' WHERE id = 2; -- Monster killer resurrections
-- UPDATE canciones SET titulo = 'Monster paradise' WHERE id = 30; -- Mobster Paradise
-- UPDATE canciones SET titulo = 'De norte a sur' WHERE id = 41; -- De Sur a Norte
-- UPDATE canciones SET titulo = 'Pajara' WHERE id = 114; -- Pájara
-- UPDATE canciones SET titulo = 'Precaución, está canción es un hechizo' WHERE id = 116; -- Precaución, esta canción es un hechizo
-- UPDATE canciones SET titulo = 'Montagem relacionista judicial rlt (super slowed)' WHERE id = 246; -- Montagem relacionista judicial RKT (super slowed)
-- UPDATE canciones SET titulo = 'Haunt phonk' WHERE id = 250; -- HAUNT FUNK
-- UPDATE canciones SET titulo = 'Ender pearl phonk (ultra slowed)' WHERE id = 252; -- ENDER PEARL FUNK (ultra slowed)
-- UPDATE canciones SET titulo = 'Summertimes sadness' WHERE id = 263; -- Summertime Sadness
-- UPDATE canciones SET titulo = 'Assasins creed unity rap' WHERE id = 401; -- Assassin's creed unity rap
-- UPDATE canciones SET titulo = 'League of leyends rap' WHERE id = 402; -- League of legends rap
-- UPDATE canciones SET titulo = 'Ligth vs Lelouch' WHERE id = 416; -- Light vs Lelouch
-- UPDATE canciones SET titulo = 'Phoenyx Wright vs hershel layton' WHERE id = 423; -- Phoenix Wright vs hershel layton
-- UPDATE canciones SET titulo = 'Russian roulete' WHERE id = 505; -- Russian roulette
-- UPDATE canciones SET titulo = 'Super physco love' WHERE id = 506; -- Super Psycho Love
-- UPDATE canciones SET titulo = 'The last night to shine' WHERE id = 530; -- The Night Begins to Shine
-- UPDATE canciones SET titulo = 'The last great American dinasty' WHERE id = 603; -- The last great American dynasty
-- UPDATE canciones SET titulo = 'Rampasso' WHERE id = 621; -- Angetenar
-- UPDATE canciones SET titulo = 'Welcome to my apocalyspe' WHERE id = 625; -- Welcome to my apocalypse
-- UPDATE canciones SET titulo = 'Unforgetabble waiting' WHERE id = 631; -- Unforgettable waiting
-- UPDATE canciones SET titulo = 'Bad girls need love tol' WHERE id = 659; -- Bad girls need love too
-- UPDATE canciones SET titulo = 'Calle me by your name', artista = 'Lil nas x' WHERE id = 677; -- MONTERO (Call Me By Your Name)
