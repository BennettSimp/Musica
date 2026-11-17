-- Lote 1 de géneros — SQL para aplicar en el SQL Editor de Supabase
-- Aprobado por Nova 2026-11-15. YA APLICADO 2026-11-16 (con la laptop,
-- tras respaldo; verificado en vivo: 8 UPDATEs, 0 en OST/Asiatica).
-- NO VOLVER A CORRER: las guardas lo harían no-op (UPDATE 0). Este
-- archivo queda como registro de lo aplicado. Los 'esperado: 677' de la
-- verificación son PRE-678; el vivo actual es 678 (ver correccion-678.sql).
--
-- CÓMO SE USA:
--   0. Respaldo: descarga https://clasificacion-de-musica.onrender.com/api/canciones/exportar
--      y guarda ese JSON. Es la red de seguridad; sin respaldo, no se corre nada.
--   1. En el panel de Supabase: SQL Editor → New query → pega este archivo → Run.
--   2. Revisa el resultado de las consultas de verificación del paso 3.
--      Deben salir: las 8 filas con sus valores nuevos, 0 canciones en
--      OST/Asiatica, y el total en 677.
--   3. Si algo sale mal, usa el ROLLBACK del final (o reimporta el respaldo).
--      Si todo sale bien, verifica en vivo en https://musica-plum-psi.vercel.app/
--
-- NOTA: esto va JUNTO con el despliegue del código preparado (main.cpp +
-- public/app.js ya conocen las columnas banda_sonora / instrumental y la
-- lista nueva de géneros). No aplicar la DB sin el código, ni el código
-- sin la DB, para que el sitio no quede a medias.
--
-- ORDEN RECOMENDADO DE APLICACIÓN (los 5 SQL de la fase DB, en este orden):
--   1. lote-1-aplicar.sql (este archivo) → 2. lote-2-3-aplicar.sql →
--   3. lote-4-aplicar.sql → 4. titulos-correcciones.sql →
--   5. artistas-aplicar.sql. Ver schema.sql ("ORDEN RECOMENDADO").
--
-- PRE-FLIGHT (antes de correr este archivo, en vivo):
--   SELECT id, banda_sonora, instrumental FROM canciones
--   WHERE id IN (271, 274, 301, 302, 376, 542, 572, 604);
--   Los ROLLBACK de los lotes suponen banda_sonora = FALSE en esas 8
--   canciones. Si alguna sale TRUE, PARAR y revisar antes de seguir:
--   el rollback la dejaría en FALSE y se perdería el dato real.
--   Las columnas banda_sonora / instrumental ya existen en vivo: los
--   ALTER TABLE IF NOT EXISTS del PASO 1 son no-op (no crean nada).
--
-- TRANSACCIÓN: todo va dentro de BEGIN/COMMIT (igual que lote-2-3 y
-- títulos). Cada UPDATE lleva además la guarda AND genero = '<viejo>':
-- si el dato en vivo no coincide con lo verificado, ese UPDATE afecta
-- 0 filas en vez de sobrescribir en silencio. Si algún UPDATE afecta
-- 0 filas, PARAR y revisar antes de seguir.

BEGIN;

-- PASO 1 — Columnas nuevas (no borran datos; IF NOT EXISTS = se puede
-- correr dos veces sin romper nada). Sin esto, el paso 2 fallaría porque
-- la columna banda_sonora aún no existe en vivo.
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS instrumental BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE canciones ADD COLUMN IF NOT EXISTS banda_sonora BOOLEAN NOT NULL DEFAULT FALSE;

-- PASO 2 — Lote 1: 8 canciones aprobadas.
-- OST (3 con banda sonora + Rap):
UPDATE canciones SET genero = 'Rap', banda_sonora = TRUE WHERE id = 274 AND genero = 'OST'; -- Чистый — Скриптонит (serie "Псих")
UPDATE canciones SET genero = 'Rap', banda_sonora = TRUE WHERE id = 302 AND genero = 'OST'; -- Vegas — Doja Cat (Elvis, 2022)
UPDATE canciones SET genero = 'Rap', banda_sonora = TRUE WHERE id = 376 AND genero = 'OST'; -- Me vieron cruzar — Calle 13 (Metegol)
-- OST que NO era banda sonora (su etiqueta ya es Remix, solo cambia género + título):
UPDATE canciones SET genero = 'Trap', titulo = 'Stranger things (official trap remix)' WHERE id = 629 AND genero = 'OST'; -- corrige "tral" -> "trap"
-- Asiática (su género real):
UPDATE canciones SET genero = 'Rap' WHERE id = 270 AND genero = 'Asiatica';         -- 八方來財 — SKAI ISYOURGOD
UPDATE canciones SET genero = 'Pop' WHERE id = 292 AND genero = 'Asiatica';         -- Standing next to you — Jung Kook
UPDATE canciones SET genero = 'Rock' WHERE id = 483 AND genero = 'Asiatica';        -- マインドブランド — Maretu
UPDATE canciones SET genero = 'Electronica' WHERE id = 664 AND genero = 'Asiatica'; -- Soap lagoon — Masa Works Design
-- PASO 3 — Verificación (léela antes de dar el lote por aplicado):
-- Las 8 filas con sus valores nuevos:
SELECT id, titulo, genero, etiqueta_especial, banda_sonora
FROM canciones WHERE id IN (270, 274, 292, 302, 376, 483, 629, 664) ORDER BY id;
-- Debe dar 0 filas (ya no queda ninguna canción en OST ni Asiatica):
SELECT genero, COUNT(*) FROM canciones WHERE genero IN ('OST', 'Asiatica') GROUP BY genero;
-- El total no debe cambiar:
SELECT COUNT(*) AS total FROM canciones; -- esperado: 677

COMMIT;

-- ROLLBACK — solo si algo sale mal. Devuelve los valores viejos
-- (genero OST/Asiatica, banda_sonora en falso, título con "tral").
-- UPDATE canciones SET genero = 'OST', banda_sonora = FALSE WHERE id IN (274, 302, 376);
-- UPDATE canciones SET genero = 'OST', titulo = 'Stranger things (official tral remix)' WHERE id = 629;
-- UPDATE canciones SET genero = 'Asiatica' WHERE id IN (270, 292, 483, 664);
