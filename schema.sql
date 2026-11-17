-- Evaluador musical — esquema de la tabla canciones (Supabase / PostgreSQL)
-- NUEVO en el repo: antes no existia ningun .sql. Pegar en el SQL Editor de
-- Supabase SOLO cuando lo apliquemos juntos, despues de hacer un respaldo.
-- La tabla ya existe en produccion: este archivo documenta el estado actual
-- y crea lo que falta (indice unico, indices, columnas de fecha) sin borrar datos.
--
-- ESTADO 2026-11-16 — YA APLICADO: la migración documentada aquí (los 5 SQL
-- en orden + corrección 678) ya se aplicó en vivo; este archivo queda como
-- documentación del esquema, NO volver a correrlo como migración. Los
-- conteos de la sección de migración son PRE-678 (677 canciones, 680
-- principales, 423 artistas); el vivo actual es 678 / 681 / 425.
--
-- ORDEN RECOMENDADO DE APLICACIÓN (los 5 SQL de la fase DB, en este orden):
--   1. lote-1-aplicar.sql → 2. lote-2-3-aplicar.sql →
--   3. lote-4-aplicar.sql → 4. titulos-correcciones.sql →
--   5. artistas-aplicar.sql. Cada archivo declara el mismo orden en su
--   encabezado. Dependencias de verificación que dependen del orden:
--   la verificación de lote-2-3 (conteos por género) supone el lote 1
--   y el lote 4 SIN aplicar; la de títulos (LIKE '%tral%') supone el
--   lote 1 APLICADO; la de lote-4 (0 en Hip Hop/Otro/OST/Asiatica)
--   supone los lotes 1–3 aplicados. El orden entre títulos y artistas
--   NO importa para el nombre del artista (backfill estático; el rename
--   del PASO 3 de artistas-aplicar.sql sincroniza ambas tablas).

CREATE TABLE IF NOT EXISTS canciones (
    id SERIAL PRIMARY KEY,
    titulo TEXT NOT NULL CHECK (char_length(titulo) <= 200),
    artista TEXT NOT NULL,
    genero TEXT NOT NULL DEFAULT 'Por clasificar' CHECK (genero IN (
        'Pop', 'Rock', 'Electronica', 'Rap', 'Trap', 'Reggaeton', 'R&B',
        'Phonk', 'Banda', 'Corridos', 'Corridos Tumbados', 'Cumbia',
        'Salsa', 'Baladas', 'Metal', 'Alternativo', 'Hardstyle',
        'Merengue', 'Dembow', 'Reggae', 'Bachata', 'Afrobeats', 'Lofi',
        'Hardcore', 'Clasica', 'Latino', 'Romanticas', 'Asiatica',
        'Por clasificar')),
    etiqueta_especial TEXT NOT NULL DEFAULT 'Original' CHECK (etiqueta_especial IN (
        'Original', 'Remix', 'Slowed Reverb', 'Sped Up', 'Cover',
        'Acustico', 'En Vivo', 'Fragmento', 'Demo', 'Mashup', 'Edit')),
    instrumental BOOLEAN NOT NULL DEFAULT FALSE,
    banda_sonora BOOLEAN NOT NULL DEFAULT FALSE,
    ritmo DOUBLE PRECISION CHECK (ritmo BETWEEN 0 AND 10),
    letras DOUBLE PRECISION CHECK (letras BETWEEN 0 AND 10),
    coro DOUBLE PRECISION CHECK (coro BETWEEN 0 AND 10),
    importancia DOUBLE PRECISION CHECK (importancia BETWEEN 0 AND 5),
    arte_visual DOUBLE PRECISION DEFAULT 0 CHECK (arte_visual IN (0, 1)),
    antiguedad BOOLEAN DEFAULT FALSE,
    nostalgia BOOLEAN DEFAULT FALSE,
    descubrimiento_terceros BOOLEAN DEFAULT FALSE,
    complejidad BOOLEAN DEFAULT FALSE,
    calificacion_final DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NOTA sobre los CHECKs: este CREATE TABLE IF NOT EXISTS es no-op en
-- vivo (la tabla ya existe), así que los CHECKs solo aplican a una base
-- nueva. Para la tabla en vivo hace falta un ALTER en la fase DB
-- (ALTER TABLE canciones ADD CONSTRAINT ... CHECK (...)); el de género
-- SOLO se puede añadir DESPUÉS de aplicar los lotes 1–4, porque hasta
-- entonces la tabla aún tiene Hip Hop, Otro y OST, que el CHECK no
-- admite. Los demás CHECKs (etiqueta, notas, arte_visual, título)
-- no dependen de los lotes.
--
-- Una misma cancion (titulo + artista) no se puede repetir, sin importar
-- mayusculas/minusculas. Es el mismo control que el backend hace en POST/PUT.
CREATE UNIQUE INDEX IF NOT EXISTS canciones_titulo_artista_unique
    ON canciones (LOWER(titulo), LOWER(artista));

-- Indices para las consultas que hoy hacen escaneo completo:
-- orden por nota (lista principal) y filtro por genero. El de busqueda
-- (text_pattern_ops) solo sirve con prefijos (LIKE 'abc%'); la busqueda
-- actual es por subcadena (%abc%), que sigue escaneando la tabla: con 677
-- canciones no importa, pero si el catalogo crece a miles, usar pg_trgm.
CREATE INDEX IF NOT EXISTS canciones_nota_idx
    ON canciones (calificacion_final DESC NULLS LAST, id ASC);
CREATE INDEX IF NOT EXISTS canciones_genero_idx
    ON canciones (genero);
CREATE INDEX IF NOT EXISTS canciones_busqueda_idx
    ON canciones (LOWER(titulo) text_pattern_ops, LOWER(artista) text_pattern_ops);

-- updated_at se actualiza solo en cada UPDATE.
CREATE OR REPLACE FUNCTION canciones_touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS canciones_updated_at ON canciones;
CREATE TRIGGER canciones_updated_at
    BEFORE UPDATE ON canciones
    FOR EACH ROW EXECUTE FUNCTION canciones_touch_updated_at();

-- Migracion de generos y tipos (aplicar con respaldo, en la fase DB):
-- 1. Columnas nuevas (no borran datos):
--    ALTER TABLE canciones ADD COLUMN IF NOT EXISTS instrumental BOOLEAN NOT NULL DEFAULT FALSE;
--    ALTER TABLE canciones ADD COLUMN IF NOT EXISTS banda_sonora BOOLEAN NOT NULL DEFAULT FALSE;
--    PENDIENTE CONSCIENTE: 'instrumental' NO tiene migración. Las 677
--    canciones quedan en FALSE: no hay fuente en el paquete para decidir
--    cuáles serían TRUE. Decidirlo es trabajo futuro, no de la fase DB.
-- 2. Unificaciones SIN juicio por canción: BORRADO — los UPDATE en bloque
--    (Hip Hop → Rap, Otro → Por clasificar) contradecían las decisiones
--    por canción aprobadas y YA NO EXISTEN como paso. Aplicarlos rompería:
--    las excepciones 365 (Alternativo), 374 (Cumbia), 375 (Electrónica)
--    y el reparto de Otro (solo la 576 va a Por clasificar; el resto va
--    a su género real: Hardstyle 16, Electrónica 5, Cumbia 3, etc.).
--    La migración correcta es lote-2-3-aplicar.sql (94 UPDATEs con guarda
--    AND genero, aprobados por Nova 2026-11-16); las de OST/Asiática van
--    en lote-1-aplicar.sql y el resto en lote-4-aplicar.sql. Como red de
--    seguridad, la lógica en bloque SOLO vale DESPUÉS de lote-2-3 y debe
--    afectar a 0 filas: si afecta a alguna, quedó una canción sin cubrir.
--    NUNCA se corre antes que lote-2-3-aplicar.sql.
-- 3. Por cancion, con aprobacion del usuario: las 4 de 'OST' (banda_sonora =
--    TRUE + su genero real) y las 4 de 'Asiatica' (su genero real).
--    Ver lote-1-aplicar.sql (8 UPDATEs aprobados). Géneros vacíos:
--    Salsa tenía 0 en el export original, pero tras el lote 4 tiene 1
--    (la 349 'La perla'); Asiática queda en 0 tras el lote 1 por decisión
--    registrada. Los géneros que quedan en 0 (Clasica, Latino, Romanticas,
--    Asiatica) NO se eliminan: el usuario dijo que no es requerido quitarlos.
-- 4. Generos nuevos del lote 4 (aprobados 2026-11-15, regla del usuario:
--    agregar un genero si tiene al menos 2 canciones, o si una sola cancion
--    queda demasiado mal representada en un genero que no es el suyo):
--    Merengue (466, 467; la 189 se aplica en lote-2-3-aplicar.sql, no
--    en el lote 4), Dembow (529, 537, 538), Reggae (364),
--    Bachata (193), Afrobeats (461). Disco NO se agrega: la 1 se queda en
--    Pop, que es uno de sus generos reales. Bossa Nova NO se agrega: la
--    193 va a Bachata. Ver lote-4-aplicar.sql (128 UPDATEs aprobados).
-- 5. Generos nuevos del lote 2 (aprobados 2026-11-16, regla NUEVA del
--    usuario: agregar un genero si se cumple ALGUNA de las dos
--    condiciones: (1) dos o mas canciones, o (2) representacion nula en
--    otro genero — la cancion no se ve representada en ningun genero de
--    la lista, solo en uno que no esta en ella y que es algo muy
--    relevante): Lofi (526, 527 — condicion 1), Hardcore (618, 619 —
--    condicion 1). La lista GENEROS en app.js ya los incluye (29
--    valores). Bolero NO se agrega: solo la 307, y Baladas la representa.

-- Artistas y colaboraciones (diseno-artistas.md, aprobado por Nova
-- 2026-11-15: tabla completa many-to-many, buenas practicas).
-- Un duo o grupo ("Wisin & Yandel", "Miyagi & Andy Panda") es UN solo
-- artista. Principal = a quien se le acredita la cancion, sea productor o
-- no (regla de Nova 2026-11-16; reemplaza "principal = quien canta");
-- invitado = featured; productor =
-- solo cuando esta claramente acreditado (sesiones BZRP, lista corta de
-- 7 demasiado relevantes). Los remixers NO son artistas: el remix ya lo
-- cubre etiqueta_especial.
CREATE TABLE IF NOT EXISTS artistas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nombre_norm TEXT NOT NULL UNIQUE, -- lower(trim(nombre))
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancion_artistas (
    cancion_id INTEGER NOT NULL REFERENCES canciones(id) ON DELETE CASCADE,
    artista_id INTEGER NOT NULL REFERENCES artistas(id) ON DELETE RESTRICT,
    rol TEXT NOT NULL CHECK (rol IN ('principal', 'invitado', 'productor')),
    orden INTEGER NOT NULL DEFAULT 0, -- 0, 1, 2... dentro de cada rol
    PRIMARY KEY (cancion_id, artista_id, rol)
);
CREATE INDEX IF NOT EXISTS cancion_artistas_artista_idx
    ON cancion_artistas (artista_id);

-- Migracion de artistas (aplicar con respaldo, en la fase DB, junto con
-- el despliegue del codigo que ya lee de estas tablas):
-- 1. Crear las tablas con el bloque de arriba.
-- 2. Aplicar artistas-aplicar.sql, que YA INCLUYE el backfill (no se
--    duplica aquí): 222 artistas distintos del catálogo + 677 filas de
--    principal, renombres (PASO 3, inseparable del backfill), 214
--    artistas nuevos, 63 correcciones de principal (solo 34 cambian de
--    artista_id), 330 invitados en 232 canciones y 14 productores en
--    13 canciones. Artistas finales: 423.
-- 3. Verificar con el PASO 9 de artistas-aplicar.sql: 677 canciones con
--    principal, 680 filas de principal (531 con 3 y 662 con 2), 0
--    canciones sin principal, 0 huérfanos, 0 productores fuera de lista.
--    NOTA POST-678 (2026-11-16): estos conteos son PRE-678. En vivo, tras
--    la 678 'Freaks' (correccion-678.sql, YA APLICADA): 678 canciones con
--    principal, 681 filas de principal, 425 artistas. Criterio 34/29: la
--    662 cuenta como cambio porque gana un segundo principal (ver
--    artistas-aplicar.sql, PASO 5).
-- 4. Desplegar el codigo nuevo (main.cpp + app.js ya leen de las tablas;
--    el campo artista de canciones sigue existiendo como derivado).
-- 5. SOLO DESPUES, como paso final separado (NO en este archivo ni en
--    artistas-aplicar.sql): ALTER TABLE canciones DROP COLUMN artista;
--    el rollback es re-crear la columna desde artistas + el respaldo
--    del export. No se hace ahora: mientras la columna exista, el
--    codigo viejo y el nuevo conviven y el export publico no cambia.
-- 6. Canciones nuevas DESPUÉS de la migración (p. ej. la 678 'Freaks',
--    2026-11-16): la app crea los artistas que faltan al agregar
--    (main.cpp INSERT INTO artistas ... ON CONFLICT DO NOTHING; la
--    secuencia quedó en 436, así que los nuevos son 437, 438, ...).
--    NO hace falta ALTER ni migración nueva: solo verificar que el
--    artista quedó con el nombre correcto (ver correccion-678.sql).
