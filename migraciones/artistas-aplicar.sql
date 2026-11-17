-- Artistas y colaboraciones — SQL para aplicar en el SQL Editor de Supabase
-- APROBADO por Nova 2026-11-16: verificación completa 677/677 + re-verificación
-- 19/19 + decisiones de criterio (1)-(10) + versiones (6) + lista corta de
-- productores. Detalle en colaboraciones.md, colaboraciones-reverificacion.md
-- y decisiones-colaboraciones.md.
--
-- YA APLICADO 2026-11-16 — NO VOLVER A CORRER: se aplicó con la laptop,
-- junto con el despliegue del código preparado (schema.sql, main.cpp, app.js).
-- Re-correrlo FALLA (INSERTs duplicados: PK de artistas y cancion_artistas,
-- UNIQUE de nombre_norm). Este archivo queda como registro de lo aplicado.
-- Requisitos previos: respaldo del export (/api/canciones/exportar) y el
-- despliegue del código con los 5 géneros nuevos (Bachata, Merengue, Dembow,
-- Reggae, Afrobeats). Este archivo SOLO crea las tablas artistas y
-- cancion_artistas y las puebla; NO toca la tabla canciones ni borra la
-- columna artista (eso es un paso final separado, ver diseno-artistas.md).
-- La fase DB va al final, después de todo lo demás.
--
-- ORDEN RECOMENDADO DE APLICACIÓN (los 5 SQL de la fase DB, en este orden):
--   1. lote-1-aplicar.sql → 2. lote-2-3-aplicar.sql →
--   3. lote-4-aplicar.sql → 4. titulos-correcciones.sql →
--   5. artistas-aplicar.sql (este archivo). Ver schema.sql ("ORDEN RECOMENDADO").
--   El orden con titulos-correcciones.sql NO importa para el nombre del
--   artista (el backfill es SQL estático, no lee la tabla en vivo): el
--   rename del PASO 3 (id 122 'Lil nas x' → 'Lil Nas X') sincroniza
--   ambas tablas con la decisión de Nova sobre la 677.
--
-- PASO 5 (63 canciones): solo 34 cambian de artista_id; las otras 29 son
-- re-escrituras no-op del mismo artista_id, necesarias solo porque el
-- PASO 3 renombró al artista (p. ej. 'Aleman' → Alemán, mismo id 3).
-- Verificado por simulación contra public/datos-reales.json (criterio:
-- cambia el CONJUNTO de principales; la 662 cuenta como cambio porque
-- gana un segundo principal aunque su orden 0 siga siendo Lil Wayne).
--
-- PASO 2 y PASO 3 SON INSEPARABLES: el backfill del PASO 2 viola
-- temporalmente nombre_norm = lower(trim(nombre)) en 21 filas (p. ej.
-- id 3 'Alemán'/'aleman', id 16 'Banda MS de Sergio Lizárraga'/
-- 'banda ms', id 45 'Daddy Yankee'/'daddys yankee'); el PASO 3 corrige
-- las 21 y deja el estado final consistente (0 violaciones). Nunca se
-- aplica el PASO 2 sin el PASO 3, ni se verifica la norma entre ambos.
--
-- CÓMO SE USA (juntos y con la laptop):
--   0. Respaldo: descarga /api/canciones/exportar y guarda ese JSON.
--   1. Supabase → SQL Editor → New query → pega este archivo → Run.
--   2. Revisa el paso de verificación: 677 canciones con principal, 680 filas
--      de principal (531 y 662 tienen más de un principal), 0 huérfanos, y
--      que ningún productor fuera de la lista corta quedó registrado.
--   NOTA POST-678 (2026-11-16): los conteos de verificación de arriba son
--   PRE-678 (catálogo de 677 al aplicar). En vivo, tras agregar la 678
--   'Freaks' (correccion-678.sql, YA APLICADA), los valores actuales son
--   678 canciones con principal, 681 filas de principal y 425 artistas
--   (423 + 437 Timmy Trumpet + 438 Savage).
--   3. Si algo sale mal, usa el ROLLBACK del final.
--
-- NOTAS — fuera de este archivo (se aplican en su fase, no aquí):
--   - 633 'TMM TMM': CORREGIDO 2026-11-16 — su etiqueta_especial YA es
--     'Remix' en vivo (verificado contra el export). NO lleva UPDATE en
--     ningún archivo. La nota anterior ("debe pasar a 'Remix', hoy None")
--     era incorrecta; el mismo error ya está corregido en
--     colaboraciones-reverificacion.md:80 ("ya está en Remix en vivo;
--     sin acción").
--   - Typos de título (629 'tral'→'trap', 631 'Unforgetabble'→'Unforgettable',
--     621 título/artista invertidos, 506 'physco', etc.) van en la fase DB de
--     correcciones de títulos, no en este archivo.
--   - 232 'Kiss [Slowed+Looped]': el principal queda 'Salvia' (la artista
--     galesa, Lilith Morris, es su nombre real; el crédito en streaming es
--     'Salvia' y así se busca). La re-verificación dice 'sin cambio de nombre'.
--   - 464 'Acróstico': 'Milan y Sasha' son DOS invitados (Milan y Sasha).
--   - 531 y 662 tienen VARIOS principales (no uno solo): 531 = Lil Wayne,
--     Wiz Khalifa, Imagine Dragons; 662 = Lil Wayne, Lil Yachty.
--
BEGIN;

-- PASO 1 — Tablas nuevas (diseno-artistas.md).
CREATE TABLE IF NOT EXISTS artistas (
    id SERIAL PRIMARY KEY,
    nombre TEXT NOT NULL,
    nombre_norm TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cancion_artistas (
    cancion_id INTEGER NOT NULL REFERENCES canciones(id) ON DELETE CASCADE,
    artista_id INTEGER NOT NULL REFERENCES artistas(id) ON DELETE RESTRICT,
    rol TEXT NOT NULL CHECK (rol IN ('principal', 'invitado', 'productor')),
    orden INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (cancion_id, artista_id, rol)
);
CREATE INDEX IF NOT EXISTS cancion_artistas_artista_idx
    ON cancion_artistas (artista_id);

-- PASO 2 — Backfill: 222 artistas distintos del catálogo actual
-- (normalizados lower(trim); generados mecánicamente desde public/datos-reales.json).
INSERT INTO artistas (id, nombre, nombre_norm) VALUES
    (1, '4ЯR', '4яr'),
    (2, '50 Cent', '50cent'),
    (3, 'Alemán', 'aleman'),
    (4, 'Alex Gaudino', 'alex gaudino'),
    (5, 'Andrés Castillo', 'andres castillo'),
    (6, 'Angetenar', 'angetenar'),
    (7, 'Anitta', 'anitta'),
    (8, 'Apashe', 'apashe'),
    (9, 'Arca', 'arca'),
    (10, 'Ariis', 'ariis'),
    (11, 'Armani west', 'armani west'),
    (12, 'Atlxs', 'atlxs'),
    (13, 'B.e.r', 'b.e.r'),
    (14, 'Bad Bunny', 'bad bunny'),
    (15, 'Bad Gyal', 'bad gyal'),
    (16, 'Banda MS de Sergio Lizárraga', 'banda ms'),
    (17, 'Becky G', 'becky g'),
    (18, 'Bellakath', 'bellakath'),
    (19, 'Bibi', 'bibi'),
    (20, 'Billie Eilish', 'billie eilish'),
    (21, 'Bizarrap', 'bizarrap'),
    (22, 'Black Eyed Peas', 'black eyed peas'),
    (23, 'bnh0$', 'bnh0$'),
    (24, 'Bones uk', 'bones uk'),
    (25, 'Borgore', 'borgore'),
    (26, 'Bruno mars', 'bruno mars'),
    (27, 'Busta rhymes', 'busta rhymes'),
    (28, 'C-Kan', 'c-kan'),
    (29, 'Calle 13', 'calle 13'),
    (30, 'Camilo sesto', 'camilo sesto'),
    (31, 'Caravan palace', 'caravan palace'),
    (32, 'Cartel de Santa', 'cartel de santa'),
    (33, 'Cazzu', 'cazzu'),
    (34, 'Celso Piña', 'celso piña'),
    (35, 'Chela rivas', 'chela rivas'),
    (36, 'Chesca', 'chesca'),
    (37, 'ChocQuibTown', 'chocqibtown'),
    (38, 'Clave Especial', 'clave especial'),
    (39, 'Code:Pandorum', 'code: pandorum'),
    (40, 'Code:Pandorum', 'code:pandorum'),
    (41, 'Cótiles', 'cotiles'),
    (42, 'Cuco', 'cuco'),
    (43, 'Cyclo', 'cyclo'),
    (44, 'Daddy Yankee', 'daddy yankee'),
    (45, 'Daddy Yankee', 'daddys yankee'),
    (46, 'Dani Flow', 'daniflow'),
    (47, 'David Guetta', 'david guetta'),
    (48, 'Dawnicy', 'dawnicy'),
    (49, 'Dharius', 'dharius'),
    (50, 'DJ dudah', 'dj dudah'),
    (51, 'DJ dudog', 'dj dudog'),
    (52, 'DJ fallthox', 'dj fallthox'),
    (53, 'DJ Rick 013', 'dj rick 013'),
    (54, 'DJ silver zn', 'dj silver zn'),
    (55, 'Doja Cat', 'doja cat'),
    (56, 'Don Omar', 'don omar'),
    (57, 'Dxrk', 'dxrk'),
    (58, 'Dygo', 'dygo'),
    (59, 'El Alfa', 'el alfa'),
    (60, 'El Bogueto', 'el bogueto'),
    (61, 'El pelon del mikrophone', 'el pelon del mikrophone'),
    (62, 'Ellie goulding', 'ellie goulding'),
    (63, 'Enrique Bunbury', 'enrique bunbury'),
    (64, 'Enrique Iglesias', 'enrique iglesias'),
    (65, 'Esperón', 'esperom'),
    (66, 'Esteman', 'esteman'),
    (67, 'Fake blood', 'fake blood'),
    (68, 'Gera MX', 'gera mx'),
    (69, 'GFP', 'gfp'),
    (70, 'Ghost data', 'ghost data'),
    (71, 'gloria gaynor', 'gloria gaynor'),
    (72, 'Glxxmstrider', 'glxxmstrider'),
    (73, 'Gorillaz', 'gorillaz'),
    (74, 'Grandson', 'grandson'),
    (75, 'Greazy puzzy fuckers', 'greazy puzzy fuckers'),
    (76, 'Grupo cañaveral', 'grupo cañaveral'),
    (77, 'Grupo clímax', 'grupo clímax'),
    (78, 'Grupo g', 'grupo g'),
    (79, 'Guaynaa', 'guaynaa'),
    (80, 'Gurú Josh project', 'gurú josh project'),
    (81, 'Gxmz', 'gxmz'),
    (82, 'Haus-a-holics', 'haus-a-holics'),
    (83, 'Hensonn', 'hensonn'),
    (84, 'Heroes del silencio', 'heroes del silencio'),
    (85, 'Hipshaker', 'hipshaker'),
    (86, 'Igris6x', 'igris6x'),
    (87, 'Ilyhiryu', 'ilyhiryu'),
    (88, 'Inna', 'inna'),
    (89, 'Inova', 'inova'),
    (90, 'Insulini', 'insulini'),
    (91, 'Jarico', 'jarico'),
    (92, 'Jedis', 'jedis'),
    (93, 'Jenni Rivera', 'jenni rivera'),
    (94, 'Jombriel', 'jombriel'),
    (95, 'Jose Jose', 'jose jose'),
    (96, 'Joyce Santana', 'joyce santana'),
    (97, 'JT Music', 'jt music'),
    (98, 'Juanes', 'juanes'),
    (99, 'Jung kook', 'jung kook'),
    (100, 'JVLA', 'jvla'),
    (101, 'Kalcetoo', 'kalcetoo'),
    (102, 'Kali Uchis', 'kali uchis'),
    (103, 'Kanye west', 'kanye west'),
    (104, 'Karol G', 'karol g'),
    (105, 'Kehlani', 'kehlani'),
    (106, 'Kenia Os', 'kenia os'),
    (107, 'Keyblade', 'keyblade'),
    (108, 'Knife party', 'knife party'),
    (109, 'Kronno Zomber', 'kronno zomber'),
    (110, 'Kvrxd', 'kvrxd'),
    (111, 'Kylie minogue', 'kylie minogue'),
    (112, 'La santa grifa', 'la santa grifa'),
    (113, 'La sonora dinamita', 'la sonora dinamita'),
    (114, 'La Trakalosa de monterrey', 'la trakalosa de monterrey'),
    (115, 'La union', 'la union'),
    (116, 'Labrinth', 'labrinth'),
    (117, 'Lana del rey', 'lana del rey'),
    (118, 'Lefty SM', 'lefty sm'),
    (119, 'Leonardo favio', 'leonardo favio'),
    (120, 'Lil Joujou', 'lil joujou'),
    (121, 'Lil Leob', 'lil leob'),
    (122, 'Lil nas x', 'lil nas x'),
    (123, 'Lil Wayne', 'lil wayne'),
    (124, 'Longestsoloever', 'longestsoloever'),
    (125, 'Los dutis', 'los dutis'),
    (126, 'Los hijos del pueblo', 'los hijos del pueblo'),
    (127, 'Lxzt', 'lxzt'),
    (128, 'Lyl waine', 'lyl waine'),
    (129, 'Mala Rodríguez', 'mala rodríguez'),
    (130, 'Maluma', 'maluma'),
    (131, 'Marc Seguí', 'marc segui'),
    (132, 'Maretu', 'maretu'),
    (133, 'Marisela', 'marisela'),
    (134, 'Masa works design', 'masa works design'),
    (135, 'Matstubs', 'matstubs'),
    (136, 'MC Davo', 'mc davo'),
    (137, 'Mecano', 'mecano'),
    (138, 'Major Lazer', 'mejor lazer'),
    (139, 'Melanie Martínez', 'melanie martínez'),
    (140, 'Miyagi & Andy Panda', 'miyagi & andy panda'),
    (141, 'Mon Laferte', 'mon laferte'),
    (142, 'Nanpa Básico', 'nanpa basico'),
    (143, 'Naomi', 'naomi'),
    (144, 'Natthy peluso', 'natthy peluso'),
    (145, 'Natti Natasha', 'natti natasha'),
    (146, 'Nextcry', 'nextcry'),
    (147, 'Night club', 'night club'),
    (148, 'Norykko', 'norykoo'),
    (149, 'Party animals', 'party animals'),
    (150, 'Pentatonix', 'pentatonix'),
    (151, 'Piter-G', 'piter g'),
    (152, 'Plan B', 'plan b'),
    (153, 'Psy', 'psy'),
    (154, 'Qmiir', 'qmiir'),
    (155, 'Radical Redemption', 'radical redemption'),
    (156, 'Rammstein', 'rammstein'),
    (157, 'Rauf y faik', 'rauf y faik'),
    (158, 'Rauw Alejandro', 'rauw alejandro'),
    (159, 'Raymix', 'raymix'),
    (160, 'Recycled J', 'recycled j'),
    (161, 'Relyct', 'relyct'),
    (162, 'Remik González', 'remik gonzales'),
    (163, 'Remik González', 'remik gonzalez'),
    (164, 'Residente', 'residente'),
    (165, 'Rich vagos', 'rich vagos'),
    (166, 'Rihanna', 'rihanna'),
    (167, 'Rival', 'rival'),
    (168, 'Robbie williams', 'robbie williams'),
    (169, 'Rosalía', 'rosalia'),
    (170, 'Rosalía', 'rosalía'),
    (171, 'Rude.', 'rude.'),
    (172, 'Sailorfag', 'sailorfag'),
    (173, 'Sak Noel', 'sak noel'),
    (174, 'Salvia', 'salvia'),
    (175, 'Sayfalse', 'sayfalse'),
    (176, 'Sebastián Yatra', 'sebastian yatra'),
    (177, 'Seekae', 'seekae'),
    (178, 'Shakira', 'shakira'),
    (179, 'Shotgun Willy', 'shotgun willy'),
    (180, 'Sia', 'sia'),
    (181, 'Simon curtis', 'simon curtis'),
    (182, 'Skrillex', 'skrillex'),
    (183, 'Snow', 'snow'),
    (184, 'Spirit of god', 'spirit of god'),
    (185, 'Stromae', 'stromae'),
    (186, 'Sxid', 'sxid'),
    (187, 'T-fest x scriptonite', 't-fest x scriptonite'),
    (188, 'T.a.T.u', 't.a.t.u'),
    (189, 'Tails', 'tails'),
    (190, 'Tarkan', 'tarkan'),
    (191, 'Taylor swift', 'taylor swift'),
    (192, 'Tercer cielo', 'tercer cielo'),
    (193, 'Thalia', 'thalia'),
    (194, 'The Enigma tng', 'the enigma tng'),
    (195, 'The Living Tombstone', 'the living tombstone'),
    (196, 'The livings tombstones', 'the livings tombstones'),
    (197, 'The rolling stones', 'the rolling stones'),
    (198, 'Tiesto', 'tiesto'),
    (199, 'Tini', 'tini'),
    (200, 'Tokischa', 'tokischa'),
    (201, 'Trap music now', 'trap music now'),
    (202, 'Tungevaag & Raaban', 'tungevaag'),
    (203, 'Underaiki', 'underaiki'),
    (204, 'Vendredi sur mer', 'vendredi sur mer'),
    (205, 'Videoclub', 'videoclub'),
    (206, 'Viento y sol', 'viento y sol'),
    (207, 'Villano Antillano', 'villano antillano'),
    (208, 'Vyntr', 'vyntr'),
    (209, 'Wisin & Yandel', 'wisin & yandel'),
    (210, 'Xori', 'xori'),
    (211, 'XXXTentacion', 'xxxtentation'),
    (212, 'Yeri Mua', 'yeri mua'),
    (213, 'Yoss Bones', 'yoss bones'),
    (214, 'Ysy a', 'ysy a'),
    (215, 'Zambi', 'zambi'),
    (216, 'Zarcort', 'zarcort'),
    (217, 'Zarcortgame', 'zarcortgame'),
    (218, 'Zhu', 'zhu'),
    (219, 'Zmajor', 'zmajor'),
    (220, 'Zoe', 'zoe'),
    (221, 'Скриптонит', 'скриптонит'),
    (222, '攬佬SKAI ISYOURGOD', '攬佬skai isyourgod');
SELECT setval('artistas_id_seq', 222);

-- PASO 2b — Backfill: 1 fila principal por canción (677), con el artista actual.
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES
    (1, 71, 'principal', 0), -- i will survive
    (2, 194, 'principal', 0), -- Monster killer resurections
    (3, 32, 'principal', 0), -- Bailar y volar
    (4, 32, 'principal', 0), -- Volar volar
    (5, 32, 'principal', 0), -- Shorty party
    (6, 32, 'principal', 0), -- Burbujas de cristal
    (7, 32, 'principal', 0), -- Todas mueren por mi
    (8, 32, 'principal', 0), -- Bombos y tarolas
    (9, 32, 'principal', 0), -- Pollo y conejo
    (10, 32, 'principal', 0), -- El ratón y el queso
    (11, 32, 'principal', 0), -- El arte del engaño
    (12, 32, 'principal', 0), -- La pelotona
    (13, 32, 'principal', 0), -- El dolor del micro
    (14, 32, 'principal', 0), -- Culon culito
    (15, 32, 'principal', 0), -- Súbete y ya verás
    (16, 32, 'principal', 0), -- Perros
    (17, 32, 'principal', 0), -- Vaya vaya
    (18, 32, 'principal', 0), -- Somos chidos
    (19, 32, 'principal', 0), -- Ala entre el humo
    (20, 32, 'principal', 0), -- Mira quién vuelve al 100
    (21, 32, 'principal', 0), -- Pa' no andar triste
    (22, 32, 'principal', 0), -- Súbele a la greibol
    (23, 32, 'principal', 0), -- Clika nostra
    (24, 32, 'principal', 0), -- El hornazo
    (25, 32, 'principal', 0), -- Piensa en mi
    (26, 32, 'principal', 0), -- Blah, blah, blah
    (27, 32, 'principal', 0), -- Ya no van
    (28, 32, 'principal', 0), -- TUY
    (29, 32, 'principal', 0), -- Ahora sí voy a loquear
    (30, 32, 'principal', 0), -- Monster paradise
    (31, 32, 'principal', 0), -- El cabron
    (32, 32, 'principal', 0), -- Ranfla del cartel
    (33, 32, 'principal', 0), -- La llamada
    (34, 32, 'principal', 0), -- La plaga del rap
    (35, 32, 'principal', 0), -- Mariconatico
    (36, 32, 'principal', 0), -- Super MC'
    (37, 32, 'principal', 0), -- Conexión puerto rico
    (38, 32, 'principal', 0), -- Jake mate
    (39, 3, 'principal', 0), -- EYO
    (40, 32, 'principal', 0), -- Si son bien jotos
    (41, 32, 'principal', 0), -- De norte a sur
    (42, 32, 'principal', 0), -- Mi segundo nombre es fiesta
    (43, 32, 'principal', 0), -- Sientes los graves
    (44, 32, 'principal', 0), -- Chinga a los racistas
    (45, 32, 'principal', 0), -- El matador
    (46, 112, 'principal', 0), -- Alcoholizados
    (47, 112, 'principal', 0), -- Solo mintió
    (48, 112, 'principal', 0), -- Monalisa
    (49, 112, 'principal', 0), -- Bailando con la muerte
    (50, 112, 'principal', 0), -- El diablo anda suelto
    (51, 136, 'principal', 0), -- No que no eras fan
    (52, 112, 'principal', 0), -- A su vato engaña
    (53, 112, 'principal', 0), -- Por mi zona
    (54, 28, 'principal', 0), -- Déjame conocerte
    (55, 28, 'principal', 0), -- Un par de balas
    (56, 49, 'principal', 0), -- El pasado está olvidado
    (57, 28, 'principal', 0), -- Vuelve
    (58, 28, 'principal', 0), -- Quién contra mi
    (59, 28, 'principal', 0), -- Cuando el amor se acaba
    (60, 136, 'principal', 0), -- Prendete un blunt
    (61, 28, 'principal', 0), -- Quiuboles que
    (62, 28, 'principal', 0), -- De que me sirve
    (63, 3, 'principal', 0), -- Te quería ver
    (64, 3, 'principal', 0), -- Down with me
    (65, 3, 'principal', 0), -- Rucon
    (66, 3, 'principal', 0), -- Categoría 5
    (67, 3, 'principal', 0), -- So high
    (68, 3, 'principal', 0), -- Mi tío snoop
    (69, 21, 'principal', 0), -- Aleman bzrp sesión n.15
    (70, 3, 'principal', 0), -- Humo en la trampa
    (71, 3, 'principal', 0), -- Bombas
    (72, 3, 'principal', 0), -- Humo en la trampa 2
    (73, 3, 'principal', 0), -- Satanas
    (74, 162, 'principal', 0), -- Odio el drama
    (75, 3, 'principal', 0), -- Requisito 420
    (76, 183, 'principal', 0), -- Te va a gustar
    (77, 3, 'principal', 0), -- Casa en la montaña 2
    (78, 3, 'principal', 0), -- Humo en la trampa 3
    (79, 3, 'principal', 0), -- Narco jr
    (80, 3, 'principal', 0), -- Alterados
    (81, 42, 'principal', 0), -- Coastin'
    (82, 214, 'principal', 0), -- Flechazo en el centro
    (83, 214, 'principal', 0), -- Cómo chilla ella
    (84, 214, 'principal', 0), -- Pa está soledad
    (85, 136, 'principal', 0), -- Desde cero
    (86, 136, 'principal', 0), -- Aunque ya no estés
    (87, 136, 'principal', 0), -- Mis defectos
    (88, 136, 'principal', 0), -- Debes de saber
    (89, 136, 'principal', 0), -- El mañana
    (90, 136, 'principal', 0), -- La paleta
    (91, 136, 'principal', 0), -- Andamos de parranda
    (92, 136, 'principal', 0), -- Quédate un ratito mas
    (93, 136, 'principal', 0), -- Los bandidos
    (94, 136, 'principal', 0), -- Ding dong
    (95, 136, 'principal', 0), -- Ya no te quiero ver
    (96, 162, 'principal', 0), -- Desvielados
    (97, 28, 'principal', 0), -- Round 1
    (98, 28, 'principal', 0), -- Round 4
    (99, 28, 'principal', 0), -- Round 5
    (100, 21, 'principal', 0), -- Bzrp sessión V.51
    (101, 207, 'principal', 0), -- Vip
    (102, 207, 'principal', 0), -- Mujeron
    (103, 96, 'principal', 0), -- Besties
    (104, 207, 'principal', 0), -- Un amarre
    (105, 207, 'principal', 0), -- Cuero
    (106, 207, 'principal', 0), -- Cascara de coco
    (107, 207, 'principal', 0), -- Reina de la selva
    (108, 36, 'principal', 0), -- Activa
    (109, 66, 'principal', 0), -- Noches de verano
    (110, 207, 'principal', 0), -- Hedonismo
    (111, 207, 'principal', 0), -- Kaleidoscopica
    (112, 207, 'principal', 0), -- Yo tengo un novio
    (113, 207, 'principal', 0), -- Vocales
    (114, 207, 'principal', 0), -- Pajara
    (115, 160, 'principal', 0), -- Cruel
    (116, 207, 'principal', 0), -- Precaución, está canción es un hechizo
    (117, 120, 'principal', 0), -- Thick thick
    (118, 207, 'principal', 0), -- ¡Hello Kitty!
    (119, 207, 'principal', 0), -- Veo veo
    (120, 207, 'principal', 0), -- Poli
    (121, 207, 'principal', 0), -- Muñeca
    (122, 207, 'principal', 0), -- Designer pu$$y
    (123, 207, 'principal', 0), -- Mujer
    (124, 207, 'principal', 0), -- Nena mala
    (125, 207, 'principal', 0), -- Puesta
    (126, 207, 'principal', 0), -- Klk
    (127, 207, 'principal', 0), -- Muchos quieren tumbarme
    (128, 33, 'principal', 0), -- N.A.V.E
    (129, 33, 'principal', 0), -- Peli-culeo
    (130, 33, 'principal', 0), -- Turra
    (131, 33, 'principal', 0), -- Mucha data
    (132, 33, 'principal', 0), -- Brinca
    (133, 33, 'principal', 0), -- Maléfica
    (134, 33, 'principal', 0), -- Chapiadora
    (135, 33, 'principal', 0), -- C4torce II
    (136, 33, 'principal', 0), -- Bounce
    (137, 33, 'principal', 0), -- Peli-culeo [Remix]
    (138, 33, 'principal', 0), -- Ya no quiero
    (139, 145, 'principal', 0), -- Las nenas
    (140, 95, 'principal', 0), -- El amar y el querer
    (141, 95, 'principal', 0), -- He renunciado a ti
    (142, 95, 'principal', 0), -- La nave del olvido
    (143, 95, 'principal', 0), -- El triste
    (144, 119, 'principal', 0), -- La foto del carnet
    (145, 30, 'principal', 0), -- El amor de mi vida
    (146, 30, 'principal', 0), -- Melina
    (147, 30, 'principal', 0), -- ¿Quieres ser mi amante?
    (148, 93, 'principal', 0), -- De contrabando
    (149, 93, 'principal', 0), -- Con el
    (150, 93, 'principal', 0), -- Resulta (pop)
    (151, 93, 'principal', 0), -- Amiga si lo ves
    (152, 93, 'principal', 0), -- No llega el olvido
    (153, 93, 'principal', 0), -- Inolvidable
    (154, 93, 'principal', 0), -- Que me vas a dar
    (155, 93, 'principal', 0), -- Ya lo se
    (156, 93, 'principal', 0), -- Querida socia
    (157, 93, 'principal', 0), -- Por qué no le calas
    (158, 93, 'principal', 0), -- Cuando muere una dama
    (159, 93, 'principal', 0), -- Mirame
    (160, 93, 'principal', 0), -- Resulta
    (161, 93, 'principal', 0), -- Culpable o inocente
    (162, 93, 'principal', 0), -- No me pregunten por el
    (163, 93, 'principal', 0), -- El
    (164, 93, 'principal', 0), -- Dama divina
    (165, 93, 'principal', 0), -- La gran señora
    (166, 93, 'principal', 0), -- Cuánto te debo
    (167, 93, 'principal', 0), -- Basta ya [Banda]
    (168, 93, 'principal', 0), -- Ahora que estuviste lejos
    (169, 93, 'principal', 0), -- Resulta [Banda]
    (170, 93, 'principal', 0), -- Tu camisa puesta
    (171, 93, 'principal', 0), -- Aparentemente bien
    (172, 93, 'principal', 0), -- Sufriendo a solas
    (173, 93, 'principal', 0), -- Que ganas de no verte nunca más (pop)
    (174, 93, 'principal', 0), -- Por qué me gusta a morir (pop)
    (175, 93, 'principal', 0), -- A qué no le cuentas (Banda)
    (176, 93, 'principal', 0), -- ¿Qué me vas a dar? [en vivo]
    (177, 93, 'principal', 0), -- Cómo tú mujer [Banda]
    (178, 93, 'principal', 0), -- Ni me viene, ni me va
    (179, 93, 'principal', 0), -- Lo siento mi amor [Banda]
    (180, 93, 'principal', 0), -- Cuando me acuerdo de ti
    (181, 93, 'principal', 0), -- Dama divina [En vivo]
    (182, 93, 'principal', 0), -- Engañemoslo [Mariachi]
    (183, 93, 'principal', 0), -- Ni princesa ni esclava
    (184, 93, 'principal', 0), -- Porque me gusta a morir [Banda]
    (185, 93, 'principal', 0), -- Que ganas de no verte nunca mas [Banda]
    (186, 93, 'principal', 0), -- Brincos dieras
    (187, 104, 'principal', 0), -- 200 copas
    (188, 104, 'principal', 0), -- Provenza
    (189, 104, 'principal', 0), -- Si antes te hubiera conocido
    (190, 104, 'principal', 0), -- Coleccionando heridas
    (191, 104, 'principal', 0), -- TQG
    (192, 104, 'principal', 0), -- Mi ex tenía razon
    (193, 104, 'principal', 0), -- El barco
    (194, 104, 'principal', 0), -- Culpable
    (195, 104, 'principal', 0), -- Qlona
    (196, 104, 'principal', 0), -- Bichota
    (197, 104, 'principal', 0), -- Gatúbela
    (198, 104, 'principal', 0), -- Amargura
    (199, 104, 'principal', 0), -- El makinon
    (200, 104, 'principal', 0), -- Cairo
    (201, 104, 'principal', 0), -- Mientras me curo del cora
    (202, 104, 'principal', 0), -- Contigo
    (203, 104, 'principal', 0), -- Sejodioto
    (204, 104, 'principal', 0), -- Ay, dios mío!
    (205, 104, 'principal', 0), -- Mi cama
    (206, 104, 'principal', 0), -- Karmika
    (207, 104, 'principal', 0), -- Pineapple
    (208, 104, 'principal', 0), -- Carolina
    (209, 104, 'principal', 0), -- Punto g
    (210, 104, 'principal', 0), -- Mañana será bonito
    (211, 104, 'principal', 0), -- Mercurio
    (212, 104, 'principal', 0), -- Mi cama [Remix]
    (213, 104, 'principal', 0), -- Gato malo
    (214, 104, 'principal', 0), -- Leyendas
    (215, 79, 'principal', 0), -- Se te nota
    (216, 79, 'principal', 0), -- Rebota
    (217, 79, 'principal', 0), -- Tra TRA TRA [remix]
    (218, 79, 'principal', 0), -- Chicharrón
    (219, 79, 'principal', 0), -- Cumbia a la gente
    (220, 79, 'principal', 0), -- De party en party
    (221, 79, 'principal', 0), -- Taxi
    (222, 79, 'principal', 0), -- Buyaka
    (223, 79, 'principal', 0), -- Rompe rodillas
    (224, 79, 'principal', 0), -- Demente
    (225, 79, 'principal', 0), -- Los cachos
    (226, 129, 'principal', 0), -- Dame bien
    (227, 176, 'principal', 0), -- Chica idea [remix]
    (228, 79, 'principal', 0), -- Respira
    (229, 15, 'principal', 0), -- Chulo pt.2
    (230, 154, 'principal', 0), -- Tiki Tiki [Slowed]
    (231, 12, 'principal', 0), -- Hypnotic
    (232, 174, 'principal', 0), -- Kiss [Slowed+Looped]
    (233, 52, 'principal', 0), -- Montagem unfound [super slowed]
    (234, 127, 'principal', 0), -- Hexstrom [slowed]
    (235, 110, 'principal', 0), -- Montagem perigosa [ultra slowed]
    (236, 83, 'principal', 0), -- Diamonds
    (237, 143, 'principal', 0), -- Automotivo aura [super slowed]
    (238, 2, 'principal', 0), -- Ayo Technology
    (239, 86, 'principal', 0), -- Ecletica nanolicita 2 [super slowed]
    (240, 87, 'principal', 0), -- Jumpstyle bootleg (slowed)
    (241, 62, 'principal', 0), -- I dont need nobody [slowed+reverb]
    (242, 101, 'principal', 0), -- Hypnosaes espectral 2 x amarella
    (243, 50, 'principal', 0), -- Automotivo malvadão envolvente
    (244, 57, 'principal', 0), -- Bones [slowed]
    (245, 24, 'principal', 0), -- Beautiful Is Boring [slowed + reverb]
    (246, 54, 'principal', 0), -- Montagem relacionista judicial rlt (super slowed)
    (247, 47, 'principal', 0), -- Shot me down [slowed + reverb]
    (248, 48, 'principal', 0), -- Sonic.exe [super slowed]
    (249, 53, 'principal', 0), -- Mtg tapa amedrentador (super slowed)
    (250, 58, 'principal', 0), -- Haunt phonk
    (251, 186, 'principal', 0), -- Brado [super slowed]
    (252, 175, 'principal', 0), -- Ender pearl phonk (ultra slowed)
    (253, 10, 'principal', 0), -- Funk do bounce (slowed)
    (254, 50, 'principal', 0), -- Automotivo ritmo envolvente (slowed + reverb)
    (255, 89, 'principal', 0), -- Disowned (slowed + reverb)
    (256, 219, 'principal', 0), -- Vitality (super slowed)
    (257, 72, 'principal', 0), -- Don't stop [slowed]
    (258, 161, 'principal', 0), -- A - what (ultra slowed y reverb)
    (259, 83, 'principal', 0), -- Flare (Super slowed + reverb)
    (260, 51, 'principal', 0), -- Ritmadinha dancante
    (261, 90, 'principal', 0), -- Letanía 13
    (262, 207, 'principal', 0), -- Xxl
    (263, 117, 'principal', 0), -- Summertimes sadness
    (264, 117, 'principal', 0), -- West coast
    (265, 117, 'principal', 0), -- Born to die
    (266, 117, 'principal', 0), -- Diet mountain dew
    (267, 157, 'principal', 0), -- Vechera
    (268, 187, 'principal', 0), -- Lambada [Pitched + bass]
    (269, 32, 'principal', 0), -- Москва любит...
    (270, 222, 'principal', 0), -- 八方來財 (Stacks from All Sides)
    (271, 116, 'principal', 0), -- Mount everest
    (272, 221, 'principal', 0), -- Baby mama
    (273, 221, 'principal', 0), -- Космос
    (274, 221, 'principal', 0), -- Чистый
    (275, 221, 'principal', 0), -- Танцуй сама
    (276, 221, 'principal', 0), -- Притон
    (277, 221, 'principal', 0), -- Темно
    (278, 140, 'principal', 0), -- Billboard
    (279, 221, 'principal', 0), -- Рамок нет
    (280, 16, 'principal', 0), -- La última sombra
    (281, 140, 'principal', 0), -- Brooklyn [pokra remix]
    (282, 173, 'principal', 0), -- Trumpets [radio remix]
    (283, 115, 'principal', 0), -- Lobo-hombre en paris
    (284, 137, 'principal', 0), -- Cruz de navajas
    (285, 137, 'principal', 0), -- Hijo de la luna
    (286, 137, 'principal', 0), -- Me cuesta tanto olvidarte
    (287, 137, 'principal', 0), -- Maquillaje
    (288, 137, 'principal', 0), -- Solo soy una persona
    (289, 137, 'principal', 0), -- Mujer contra mujer
    (290, 137, 'principal', 0), -- El 7 de septiembre
    (291, 137, 'principal', 0), -- El mundo futuro
    (292, 99, 'principal', 0), -- Standing next to you
    (293, 204, 'principal', 0), -- Écoute chérie
    (294, 126, 'principal', 0), -- El botecito
    (295, 38, 'principal', 0), -- Cómo capo
    (296, 55, 'principal', 0), -- Streets
    (297, 55, 'principal', 0), -- Kiss me more
    (298, 55, 'principal', 0), -- Say so
    (299, 55, 'principal', 0), -- Need to know
    (300, 55, 'principal', 0), -- Wine pon you
    (301, 55, 'principal', 0), -- Boss bitch
    (302, 55, 'principal', 0), -- Vegas
    (303, 55, 'principal', 0), -- Like that
    (304, 55, 'principal', 0), -- Freak
    (305, 55, 'principal', 0), -- Won't bite
    (306, 55, 'principal', 0), -- Love to dream
    (307, 141, 'principal', 0), -- La tirana
    (308, 141, 'principal', 0), -- Mi buen amor
    (309, 141, 'principal', 0), -- Tu falta de querer
    (310, 141, 'principal', 0), -- Amarrame
    (311, 141, 'principal', 0), -- Pa' donde se fue
    (312, 141, 'principal', 0), -- Supermercado
    (313, 141, 'principal', 0), -- Aunque te mueras por volver
    (314, 141, 'principal', 0), -- Plata ta ta
    (315, 113, 'principal', 0), -- Que nadie sepa mi sufrir
    (316, 21, 'principal', 0), -- Nathy peluso bzrp n. 36
    (317, 144, 'principal', 0), -- Business woman
    (318, 95, 'principal', 0), -- Lo dudo [revisitado]
    (319, 19, 'principal', 0), -- Amigos
    (320, 17, 'principal', 0), -- Mayores
    (321, 17, 'principal', 0), -- Sin pijama
    (322, 17, 'principal', 0), -- Cuando te bese
    (323, 145, 'principal', 0), -- Ram pam pam
    (324, 17, 'principal', 0), -- Fulanito
    (325, 17, 'principal', 0), -- Mala santa
    (326, 47, 'principal', 0), -- Mad love
    (327, 17, 'principal', 0), -- Dollar
    (328, 17, 'principal', 0), -- La respuesta
    (329, 199, 'principal', 0), -- La loto
    (330, 17, 'principal', 0), -- Sola
    (331, 45, 'principal', 0), -- Zona de perreo
    (332, 7, 'principal', 0), -- Banana
    (333, 37, 'principal', 0), -- Que me baila
    (334, 130, 'principal', 0), -- Mala mía [remix]
    (335, 17, 'principal', 0), -- Guapa
    (336, 17, 'principal', 0), -- 24/7
    (337, 17, 'principal', 0), -- No te pertenezco
    (338, 17, 'principal', 0), -- Ni de ti ni de nadie
    (339, 17, 'principal', 0), -- Zooted
    (340, 17, 'principal', 0), -- Te supere
    (341, 17, 'principal', 0), -- No mienten
    (342, 17, 'principal', 0), -- Tajin
    (343, 17, 'principal', 0), -- Borracha
    (344, 17, 'principal', 0), -- Que le muerda
    (345, 17, 'principal', 0), -- Dolores
    (346, 17, 'principal', 0), -- Kill bill
    (347, 9, 'principal', 0), -- rakata (prada/rakata)
    (348, 9, 'principal', 0), -- Prada (prada/rakata)
    (349, 29, 'principal', 0), -- La perla
    (350, 172, 'principal', 0), -- Amiga date cuenta
    (351, 172, 'principal', 0), -- Caninas
    (352, 172, 'principal', 0), -- Perrear llorando
    (353, 172, 'principal', 0), -- Bellakosa
    (354, 172, 'principal', 0), -- Terrible, perriemos
    (355, 172, 'principal', 0), -- Gotik
    (356, 172, 'principal', 0), -- Hey bitch lit
    (357, 172, 'principal', 0), -- Ya no quiero
    (358, 172, 'principal', 0), -- Bad girls go to cancun
    (359, 172, 'principal', 0), -- Lejos
    (360, 172, 'principal', 0), -- Sed de la mala
    (361, 172, 'principal', 0), -- Rip
    (362, 172, 'principal', 0), -- Voltaje
    (363, 94, 'principal', 0), -- Vitamina
    (364, 29, 'principal', 0), -- La vuelta al mundo
    (365, 29, 'principal', 0), -- Latinoamérica
    (366, 29, 'principal', 0), -- Ojos color sol
    (367, 29, 'principal', 0), -- No hay nadie como tú
    (368, 29, 'principal', 0), -- El aguante
    (369, 29, 'principal', 0), -- Suave [blass remix]
    (370, 29, 'principal', 0), -- Tango del pecado
    (371, 29, 'principal', 0), -- Un beso de desayuno
    (372, 29, 'principal', 0), -- Adentro
    (373, 29, 'principal', 0), -- Pa'l norte
    (374, 29, 'principal', 0), -- Cumbia de los aburridos
    (375, 29, 'principal', 0), -- Electro movimiento
    (376, 29, 'principal', 0), -- Me vieron cruzar
    (377, 29, 'principal', 0), -- La vida
    (378, 29, 'principal', 0), -- Sin exagerar
    (379, 29, 'principal', 0), -- Tal para cual
    (380, 178, 'principal', 0), -- Gordita
    (381, 109, 'principal', 0), -- Kronno vs zarcort pt.1
    (382, 109, 'principal', 0), -- Animatronicos rap
    (383, 216, 'principal', 0), -- Resident evil rap
    (384, 216, 'principal', 0), -- Halo 5
    (385, 216, 'principal', 0), -- Calle of dury ghost rap
    (386, 43, 'principal', 0), -- Desde tu adiós
    (387, 216, 'principal', 0), -- Battlefield 4
    (388, 216, 'principal', 0), -- Halo 4
    (389, 216, 'principal', 0), -- Nuevo vs clasico
    (390, 216, 'principal', 0), -- Gta v rap
    (391, 216, 'principal', 0), -- Rainbow six siege
    (392, 217, 'principal', 0), -- Destiny
    (393, 216, 'principal', 0), -- Call of duty advance
    (394, 216, 'principal', 0), -- Guerra de shooters
    (395, 216, 'principal', 0), -- Minecraft: juegos del hambre rap rap
    (396, 109, 'principal', 0), -- Mario vs sonic
    (397, 109, 'principal', 0), -- Battlefield 2042
    (398, 216, 'principal', 0), -- Titán fall
    (399, 216, 'principal', 0), -- Fnaf Sister location
    (400, 216, 'principal', 0), -- Fnaf vs Minecraft
    (401, 216, 'principal', 0), -- Assasins creed unity rap
    (402, 216, 'principal', 0), -- League of leyends rap
    (403, 216, 'principal', 0), -- Fin del mundo
    (404, 216, 'principal', 0), -- Sywars
    (405, 216, 'principal', 0), -- Far cry primal
    (406, 216, 'principal', 0), -- Black Goku vs Majin vegeta
    (407, 216, 'principal', 0), -- Homer vs peter
    (408, 216, 'principal', 0), -- Días del futuro pasado
    (409, 216, 'principal', 0), -- Dragon Ball super Broly rap
    (410, 216, 'principal', 0), -- Sons of the dance
    (411, 216, 'principal', 0), -- Until dawn
    (412, 216, 'principal', 0), -- Mickey mouse vs bugs bunny rap
    (413, 216, 'principal', 0), -- Godzilla vs king kong
    (414, 216, 'principal', 0), -- Steve vs aldeano
    (415, 107, 'principal', 0), -- Niko bellic vs cj
    (416, 107, 'principal', 0), -- Ligth vs Lelouch
    (417, 107, 'principal', 0), -- Relleno
    (418, 107, 'principal', 0), -- La impia trinidad
    (419, 107, 'principal', 0), -- Oliver atom vs mark evans
    (420, 107, 'principal', 0), -- L vs conan edogawa
    (421, 107, 'principal', 0), -- Kratos vs asura
    (422, 107, 'principal', 0), -- Tarzan vs cesar
    (423, 107, 'principal', 0), -- Phoenyx Wright vs hershel layton
    (424, 107, 'principal', 0), -- Somos los malos
    (425, 107, 'principal', 0), -- Natsu vs dovakhiin
    (426, 107, 'principal', 0), -- Seres sintientes
    (427, 216, 'principal', 0), -- Euro gamers online rap
    (428, 216, 'principal', 0), -- Shadow of the colossus rap
    (429, 216, 'principal', 0), -- Sombras de mordor
    (430, 29, 'principal', 0), -- Electrico
    (431, 29, 'principal', 0), -- Así de grandes son las ideas
    (432, 98, 'principal', 0), -- Me enamora
    (433, 130, 'principal', 0), -- Hola señorita
    (434, 130, 'principal', 0), -- Borro cassette
    (435, 130, 'principal', 0), -- El perdedor
    (436, 130, 'principal', 0), -- Un polvo
    (437, 178, 'principal', 0), -- Clandestino
    (438, 130, 'principal', 0), -- Mala mia
    (439, 67, 'principal', 0), -- I think i like it
    (440, 64, 'principal', 0), -- I like it
    (441, 40, 'principal', 0), -- Purpose
    (442, 39, 'principal', 0), -- Pyramid
    (443, 39, 'principal', 0), -- Calvaire
    (444, 39, 'principal', 0), -- Wake up, kill, repeat
    (445, 8, 'principal', 0), -- Lacrimosa
    (446, 165, 'principal', 0), -- Día/noche
    (447, 213, 'principal', 0), -- No soy criminal
    (448, 118, 'principal', 0), -- Sientelo
    (449, 213, 'principal', 0), -- Frío
    (450, 213, 'principal', 0), -- Retumbando la ciudad
    (451, 170, 'principal', 0), -- Yo x ti, tu x mi
    (452, 170, 'principal', 0), -- Malamente
    (453, 169, 'principal', 0), -- Pienso en tu mira (Cap 3)
    (454, 170, 'principal', 0), -- Di mi nombre (cap: 8)
    (455, 170, 'principal', 0), -- Vampiros
    (456, 170, 'principal', 0), -- Bagdad (cap: 7)
    (457, 20, 'principal', 0), -- Lo vas a olvidar
    (458, 169, 'principal', 0), -- A ningún hombre (cap 11)
    (459, 20, 'principal', 0), -- Lovely
    (460, 178, 'principal', 0), -- Chantaje
    (461, 22, 'principal', 0), -- Girl like me
    (462, 178, 'principal', 0), -- La bicicleta
    (463, 21, 'principal', 0), -- Shakira bzrp vol. 53
    (464, 178, 'principal', 0), -- Acróstico
    (465, 178, 'principal', 0), -- Loba
    (466, 178, 'principal', 0), -- Loca
    (467, 178, 'principal', 0), -- Rabiosa
    (468, 152, 'principal', 0), -- Es un secreto
    (469, 152, 'principal', 0), -- Fanática sensual
    (470, 152, 'principal', 0), -- ¿Por qué te demoras?
    (471, 152, 'principal', 0), -- Si no le contesto
    (472, 152, 'principal', 0), -- Fronteo
    (473, 152, 'principal', 0), -- Gatauba
    (474, 152, 'principal', 0), -- ¿Te acuerdas de mi?
    (475, 63, 'principal', 0), -- ...Y al final
    (476, 63, 'principal', 0), -- Aunque no sea conmigo
    (477, 63, 'principal', 0), -- Frente a frente
    (478, 220, 'principal', 0), -- Nada
    (479, 84, 'principal', 0), -- Maldito duende
    (480, 114, 'principal', 0), -- Un par de cerdos
    (481, 211, 'principal', 0), -- Moonlight
    (482, 133, 'principal', 0), -- Enamorada y herida
    (483, 132, 'principal', 0), -- マインドブランド
    (484, 192, 'principal', 0), -- Yo te extrañare
    (485, 155, 'principal', 0), -- Brutal 12.0
    (486, 155, 'principal', 0), -- Brutal 8.0
    (487, 155, 'principal', 0), -- Reincarnation
    (488, 155, 'principal', 0), -- Until i win
    (489, 155, 'principal', 0), -- Razor
    (490, 155, 'principal', 0), -- Dominator tribute
    (491, 155, 'principal', 0), -- Kick that kick
    (492, 155, 'principal', 0), -- Kick op je bek
    (493, 155, 'principal', 0), -- Street code
    (494, 155, 'principal', 0), -- Piece of shit
    (495, 155, 'principal', 0), -- Nocturnolz
    (496, 155, 'principal', 0), -- Brotherhood of brutality
    (497, 155, 'principal', 0), -- Command & conquer
    (498, 155, 'principal', 0), -- Out for blood
    (499, 155, 'principal', 0), -- The chronicles of chaos
    (500, 155, 'principal', 0), -- The road to redemption
    (501, 34, 'principal', 0), -- La reina de las cumbias
    (502, 34, 'principal', 0), -- Cumbia sobre el río
    (503, 159, 'principal', 0), -- ¿Dónde estarás?
    (504, 197, 'principal', 0), -- Paint it black
    (505, 202, 'principal', 0), -- Russian roulete
    (506, 181, 'principal', 0), -- Super physco love
    (507, 56, 'principal', 0), -- Angelito
    (508, 56, 'principal', 0), -- Salió el sol
    (509, 56, 'principal', 0), -- Taboo
    (510, 56, 'principal', 0), -- Guaya guaya
    (511, 56, 'principal', 0), -- Dale don dale
    (512, 56, 'principal', 0), -- Dile
    (513, 56, 'principal', 0), -- Virtual diva
    (514, 56, 'principal', 0), -- Bandoleros
    (515, 56, 'principal', 0), -- Ojitos chiquititos
    (516, 56, 'principal', 0), -- Hooka
    (517, 56, 'principal', 0), -- El duro
    (518, 56, 'principal', 0), -- Sexy robótica
    (519, 56, 'principal', 0), -- Conteo
    (520, 14, 'principal', 0), -- Pa' romperla
    (521, 56, 'principal', 0), -- Flow hp
    (522, 56, 'principal', 0), -- Caseríos #2
    (523, 78, 'principal', 0), -- La cumbia de los monjes
    (524, 61, 'principal', 0), -- La cumbia tribalera
    (525, 209, 'principal', 0), -- Pam pam
    (526, 171, 'principal', 0), -- Ethernal Youth
    (527, 210, 'principal', 0), -- Warm nights
    (528, 208, 'principal', 0), -- Bluezao eu sou seu pai
    (529, 200, 'principal', 0), -- Qué viva
    (530, 13, 'principal', 0), -- The last night to shine
    (531, 128, 'principal', 0), -- Sucker for pain
    (532, 102, 'principal', 0), -- Labios mordidos
    (533, 102, 'principal', 0), -- Igual que un ángel
    (534, 142, 'principal', 0), -- Canela
    (535, 165, 'principal', 0), -- Dibujame
    (536, 14, 'principal', 0), -- La romana
    (537, 59, 'principal', 0), -- Besalo
    (538, 59, 'principal', 0), -- Plebada
    (539, 121, 'principal', 0), -- Perry el ortito rico
    (540, 65, 'principal', 0), -- Tristella
    (541, 198, 'principal', 0), -- Seavolution
    (542, 166, 'principal', 0), -- Towards the sun
    (543, 88, 'principal', 0), -- Sun is up
    (544, 11, 'principal', 0), -- Piano tiles
    (545, 150, 'principal', 0), -- God rest ye merry gentlemen
    (546, 153, 'principal', 0), -- Gentlemen
    (547, 106, 'principal', 0), -- Malas decisiones
    (548, 106, 'principal', 0), -- La invitación
    (549, 106, 'principal', 0), -- Kenia roast yourself
    (550, 106, 'principal', 0), -- Rumores
    (551, 106, 'principal', 0), -- Flores
    (552, 106, 'principal', 0), -- Morir de amor
    (553, 106, 'principal', 0), -- Los santos
    (554, 106, 'principal', 0), -- La noche
    (555, 106, 'principal', 0), -- Mia mia
    (556, 106, 'principal', 0), -- Joder
    (557, 212, 'principal', 0), -- Ojitos chiquititos
    (558, 5, 'principal', 0), -- Vaquero
    (559, 212, 'principal', 0), -- El no es tuyo
    (560, 18, 'principal', 0), -- Y yo me le pego
    (561, 18, 'principal', 0), -- Prohibido
    (562, 18, 'principal', 0), -- Lluvia de micheladas
    (563, 18, 'principal', 0), -- Soy peor
    (564, 18, 'principal', 0), -- Fabulosa de paris
    (565, 18, 'principal', 0), -- Cli clan
    (566, 18, 'principal', 0), -- Se va
    (567, 18, 'principal', 0), -- Yo kiero
    (568, 26, 'principal', 0), -- Blinding lights
    (569, 205, 'principal', 0), -- Roi
    (570, 31, 'principal', 0), -- Comics
    (571, 76, 'principal', 0), -- Tiene espinas el rosal
    (572, 105, 'principal', 0), -- Gangsta
    (573, 131, 'principal', 0), -- Tiroteo
    (574, 149, 'principal', 0), -- Hava Naquila
    (575, 215, 'principal', 0), -- Ofrenda
    (576, 125, 'principal', 0), -- Wipy
    (577, 215, 'principal', 0), -- Simon
    (578, 190, 'principal', 0), -- Simarik
    (579, 82, 'principal', 0), -- Que pasa
    (580, 81, 'principal', 0), -- Ritmo de verao
    (581, 103, 'principal', 0), -- On sight
    (582, 64, 'principal', 0), -- No me digas que no
    (583, 156, 'principal', 0), -- Sonne
    (584, 156, 'principal', 0), -- Du hast
    (585, 156, 'principal', 0), -- Deutschland
    (586, 156, 'principal', 0), -- Engel
    (587, 156, 'principal', 0), -- Du riechst so gut
    (588, 156, 'principal', 0), -- Links 2 3 4
    (589, 156, 'principal', 0), -- Te quiero puta
    (590, 23, 'principal', 0), -- 1-800
    (591, 77, 'principal', 0), -- Mesa que más aplauda
    (592, 46, 'principal', 0), -- La matraca
    (593, 45, 'principal', 0), -- Rompe
    (594, 44, 'principal', 0), -- La rompecorazones
    (595, 149, 'principal', 0), -- Used & abused
    (596, 206, 'principal', 0), -- Últimas noticias
    (597, 147, 'principal', 0), -- Show it 2 me
    (598, 100, 'principal', 0), -- Black bimmer
    (599, 141, 'principal', 0), -- Antes de ti
    (600, 195, 'principal', 0), -- I Can't fix you
    (601, 196, 'principal', 0), -- Die in a fire
    (602, 124, 'principal', 0), -- Open the door
    (603, 191, 'principal', 0), -- The last great American dinasty
    (604, 32, 'principal', 0), -- A ti te da besitos
    (605, 109, 'principal', 0), -- Dmc vs the witcher
    (606, 164, 'principal', 0), -- Rap bruto
    (607, 25, 'principal', 0), -- Unicorn zombie apocalypse
    (608, 182, 'principal', 0), -- Ease my mind
    (609, 47, 'principal', 0), -- Gettin over you
    (610, 4, 'principal', 0), -- Destination calabria
    (611, 188, 'principal', 0), -- All the thing she said
    (612, 111, 'principal', 0), -- Can't get you out of my head
    (613, 47, 'principal', 0), -- Memories
    (614, 100, 'principal', 0), -- Shoot it!
    (615, 70, 'principal', 0), -- Full bodied
    (616, 138, 'principal', 0), -- Too original
    (617, 138, 'principal', 0), -- Watch out for this
    (618, 69, 'principal', 0), -- Spaghetti love
    (619, 75, 'principal', 0), -- Greazed up
    (620, 193, 'principal', 0), -- Amar sin ser amada
    (621, 6, 'principal', 0), -- Rampasso
    (622, 176, 'principal', 0), -- Sutra
    (623, 182, 'principal', 0), -- My name Is skrillex
    (624, 74, 'principal', 0), -- Overdose
    (625, 97, 'principal', 0), -- Welcome to my apocalyspe
    (626, 168, 'principal', 0), -- Party like a russian
    (627, 139, 'principal', 0), -- Carousel
    (628, 203, 'principal', 0), -- Nasti nasti
    (629, 201, 'principal', 0), -- Stranger things (official tral remix)
    (630, 167, 'principal', 0), -- Be gone
    (631, 182, 'principal', 0), -- Unforgetabble waiting
    (632, 29, 'principal', 0), -- Yo soy libre porque pienso
    (633, 184, 'principal', 0), -- TMM TMM
    (634, 100, 'principal', 0), -- Corvette
    (635, 27, 'principal', 0), -- Touch it
    (636, 1, 'principal', 0), -- Hide
    (637, 1, 'principal', 0), -- One More night
    (638, 1, 'principal', 0), -- Wasted
    (639, 91, 'principal', 0), -- U
    (640, 60, 'principal', 0), -- Nena moxita
    (641, 68, 'principal', 0), -- Con mi fe
    (642, 180, 'principal', 0), -- Chandelier
    (643, 73, 'principal', 0), -- Dare
    (644, 73, 'principal', 0), -- Fell good inc
    (645, 73, 'principal', 0), -- Clint eastwood
    (646, 73, 'principal', 0), -- On melancholy hill
    (647, 73, 'principal', 0), -- Rhinestone eyes
    (648, 73, 'principal', 0), -- El mañana
    (649, 194, 'principal', 0), -- The monster killer
    (650, 108, 'principal', 0), -- Bonfire
    (651, 108, 'principal', 0), -- Centipede
    (652, 41, 'principal', 0), -- Ena remix
    (653, 218, 'principal', 0), -- Dreams
    (654, 135, 'principal', 0), -- Awaken
    (655, 88, 'principal', 0), -- Cola song
    (656, 163, 'principal', 0), -- Sabadrugs
    (657, 35, 'principal', 0), -- Muero por ti
    (658, 80, 'principal', 0), -- Infinity 2008
    (659, 85, 'principal', 0), -- Bad girls need love tol
    (660, 177, 'principal', 0), -- Test & recognise
    (661, 189, 'principal', 0), -- Skeleton
    (662, 123, 'principal', 0), -- Can't hold me down
    (663, 146, 'principal', 0), -- Cristal x LMFAO
    (664, 134, 'principal', 0), -- Soap lagoon
    (665, 148, 'principal', 0), -- Mr. Delincuente
    (666, 179, 'principal', 0), -- Fuego
    (667, 151, 'principal', 0), -- Far cry 4
    (668, 216, 'principal', 0), -- Cod black ops 3
    (669, 178, 'principal', 0), -- Te felicito
    (670, 158, 'principal', 0), -- Baby hello
    (671, 158, 'principal', 0), -- De carolina
    (672, 92, 'principal', 0), -- Lola
    (673, 14, 'principal', 0), -- Monaco
    (674, 14, 'principal', 0), -- Andrea
    (675, 185, 'principal', 0), -- Carmen
    (676, 185, 'principal', 0), -- Alors in danse
    (677, 122, 'principal', 0); -- Calle me by your name

-- PASO 3 — Renombres de artista (misma artista, corrección de grafía).
-- INSEPARABLE del PASO 2 (ver encabezado): el backfill viola
-- temporalmente nombre_norm = lower(trim(nombre)) en 21 filas; este
-- paso corrige las 21 y deja el estado final consistente.
-- Los renombres con cambio de norma van con la norma nueva; las fusiones
-- (dos grafías del catálogo -> un solo artista) re-apuntan primero la
-- canción del origen secundario y borran su fila huérfana.
UPDATE cancion_artistas SET artista_id = 39 WHERE cancion_id = 441 AND rol = 'principal'; -- fusión: Purpose ('code:pandorum' -> 'code: pandorum')
DELETE FROM artistas WHERE nombre_norm = 'code:pandorum'; -- huérfano tras la fusión
UPDATE artistas SET nombre = 'Code:Pandorum', nombre_norm = 'code:pandorum' WHERE nombre_norm = 'code: pandorum'; -- fusión -> Code:Pandorum
UPDATE cancion_artistas SET artista_id = 162 WHERE cancion_id = 656 AND rol = 'principal'; -- fusión: Sabadrugs ('remik gonzalez' -> 'remik gonzales')
DELETE FROM artistas WHERE nombre_norm = 'remik gonzalez'; -- huérfano tras la fusión
UPDATE artistas SET nombre = 'Remik González', nombre_norm = 'remik gonzález' WHERE nombre_norm = 'remik gonzales'; -- fusión -> Remik González
UPDATE artistas SET nombre = '50 Cent', nombre_norm = '50 cent' WHERE nombre_norm = '50cent'; -- '50cent' -> '50 Cent'
UPDATE artistas SET nombre = 'Alemán', nombre_norm = 'alemán' WHERE nombre_norm = 'aleman'; -- 'aleman' -> 'Alemán'
UPDATE artistas SET nombre = 'Andrés Castillo', nombre_norm = 'andrés castillo' WHERE nombre_norm = 'andres castillo'; -- 'andres castillo' -> 'Andrés Castillo'
UPDATE artistas SET nombre = 'Banda MS de Sergio Lizárraga', nombre_norm = 'banda ms de sergio lizárraga' WHERE nombre_norm = 'banda ms'; -- 'banda ms' -> 'Banda MS de Sergio Lizárraga'
UPDATE artistas SET nombre = 'ChocQuibTown', nombre_norm = 'chocquibtown' WHERE nombre_norm = 'chocqibtown'; -- 'chocqibtown' -> 'ChocQuibTown'
UPDATE artistas SET nombre = 'Cótiles', nombre_norm = 'cótiles' WHERE nombre_norm = 'cotiles'; -- 'cotiles' -> 'Cótiles'
UPDATE cancion_artistas SET artista_id = 44 WHERE cancion_id = 331 AND rol = 'principal'; -- fusión: Zona de perreo ('daddys yankee' -> 'daddy yankee')
UPDATE cancion_artistas SET artista_id = 44 WHERE cancion_id = 593 AND rol = 'principal'; -- fusión: Rompe ('daddys yankee' -> 'daddy yankee')
DELETE FROM artistas WHERE nombre_norm = 'daddys yankee'; -- huérfano tras la fusión
UPDATE artistas SET nombre = 'Dani Flow', nombre_norm = 'dani flow' WHERE nombre_norm = 'daniflow'; -- 'daniflow' -> 'Dani Flow'
UPDATE artistas SET nombre = 'Esperón', nombre_norm = 'esperón' WHERE nombre_norm = 'esperom'; -- 'esperom' -> 'Esperón'
UPDATE artistas SET nombre = 'Lil Nas X' WHERE id = 122; -- 'lil nas x' -> 'Lil Nas X' (decisión de Nova 2026-11-16, titulos-correcciones.sql 677; solo lo usa la 677; la norma 'lil nas x' ya es lower(trim('Lil Nas X')), no cambia)
UPDATE artistas SET nombre = 'Marc Seguí', nombre_norm = 'marc seguí' WHERE nombre_norm = 'marc segui'; -- 'marc segui' -> 'Marc Seguí'
UPDATE artistas SET nombre = 'Major Lazer', nombre_norm = 'major lazer' WHERE nombre_norm = 'mejor lazer'; -- 'mejor lazer' -> 'Major Lazer'
UPDATE artistas SET nombre = 'Nanpa Básico', nombre_norm = 'nanpa básico' WHERE nombre_norm = 'nanpa basico'; -- 'nanpa basico' -> 'Nanpa Básico'
UPDATE artistas SET nombre = 'Norykko', nombre_norm = 'norykko' WHERE nombre_norm = 'norykoo'; -- 'norykoo' -> 'Norykko'
UPDATE artistas SET nombre = 'Piter-G', nombre_norm = 'piter-g' WHERE nombre_norm = 'piter g'; -- 'piter g' -> 'Piter-G'
UPDATE cancion_artistas SET artista_id = 170 WHERE cancion_id = 453 AND rol = 'principal'; -- fusión: Pienso en tu mira (Cap 3) ('rosalia' -> 'rosalía')
UPDATE cancion_artistas SET artista_id = 170 WHERE cancion_id = 458 AND rol = 'principal'; -- fusión: A ningún hombre (cap 11) ('rosalia' -> 'rosalía')
DELETE FROM artistas WHERE nombre_norm = 'rosalia'; -- huérfano tras la fusión
UPDATE artistas SET nombre = 'Sebastián Yatra', nombre_norm = 'sebastián yatra' WHERE nombre_norm = 'sebastian yatra'; -- 'sebastian yatra' -> 'Sebastián Yatra'
UPDATE artistas SET nombre = 'Tungevaag & Raaban', nombre_norm = 'tungevaag & raaban' WHERE nombre_norm = 'tungevaag'; -- 'tungevaag' -> 'Tungevaag & Raaban'
UPDATE artistas SET nombre = 'XXXTentacion', nombre_norm = 'xxxtentacion' WHERE nombre_norm = 'xxxtentation'; -- 'xxxtentation' -> 'XXXTentacion'

-- PASO 4 — Artistas nuevos (214): invitados, productores de la
-- lista corta y principales corregidos que no existían en el catálogo.
INSERT INTO artistas (id, nombre, nombre_norm) VALUES
    (223, '104', '104'),
    (224, 'Adán Cruz', 'adán cruz'),
    (225, 'Akapellah', 'akapellah'),
    (226, 'Akasha', 'akasha'),
    (227, 'Aku P', 'aku p'),
    (228, 'Alan Dazmel', 'alan dazmel'),
    (229, 'Alberto Stylee', 'alberto stylee'),
    (230, 'Alex da Kid', 'alex da kid'),
    (231, 'Alexis Mvgler', 'alexis mvgler'),
    (232, 'Ana Macho', 'ana macho'),
    (233, 'Andrea Storm Kaden', 'andrea storm kaden'),
    (234, 'Anuel AA', 'anuel aa'),
    (235, 'Arcángel', 'arcángel'),
    (236, 'Arianna Puello', 'arianna puello'),
    (237, 'Army of Skanks', 'army of skanks'),
    (238, 'B-Raster', 'b-raster'),
    (239, 'Bajofondo Tango Club', 'bajofondo tango club'),
    (240, 'BeeJay', 'beejay'),
    (241, 'Bicho Ramírez', 'bicho ramírez'),
    (242, 'Big Freedia', 'big freedia'),
    (243, 'Big Man', 'big man'),
    (244, 'Big Soto', 'big soto'),
    (245, 'Blanquito Man', 'blanquito man'),
    (246, 'Buscabulla', 'buscabulla'),
    (247, 'Busy Signal', 'busy signal'),
    (248, 'Café Tacvba', 'café tacvba'),
    (249, 'Caravn', 'caravn'),
    (250, 'Carla Morrison', 'carla morrison'),
    (251, 'Carlos Vives', 'carlos vives'),
    (252, 'Carmen Zapata', 'carmen zapata'),
    (253, 'Cauty', 'cauty'),
    (254, 'Charles Ans', 'charles ans'),
    (255, 'Charlie Who?', 'charlie who?'),
    (256, 'Charusha', 'charusha'),
    (257, 'Chris Redd', 'chris redd'),
    (258, 'Chris Willis', 'chris willis'),
    (259, 'Christiane "Bobo" Hebold', 'christiane "bobo" hebold'),
    (260, 'Chungha', 'chungha'),
    (261, 'Corina Smith', 'corina smith'),
    (262, 'Cozy Cuz', 'cozy cuz'),
    (263, 'Crusher-P', 'crusher-p'),
    (264, 'Crystal Waters', 'crystal waters'),
    (265, 'Cubebass', 'cubebass'),
    (266, 'Cuci Amador', 'cuci amador'),
    (267, 'Dan Bull', 'dan bull'),
    (268, 'Danja', 'danja'),
    (269, 'Darkiel', 'darkiel'),
    (270, 'De La Ghetto', 'de la ghetto'),
    (271, 'De La Soul', 'de la soul'),
    (272, 'Dee', 'dee'),
    (273, 'Del the Funky Homosapien', 'del the funky homosapien'),
    (274, 'DFZM', 'dfzm'),
    (275, 'DJ Foxy', 'dj foxy'),
    (276, 'DJ NIÑOTE', 'dj niñote'),
    (277, 'DJ Playero', 'dj playero'),
    (278, 'DV8', 'dv8'),
    (279, 'Dálmata', 'dálmata'),
    (280, 'El Cata', 'el cata'),
    (281, 'El Jincho', 'el jincho'),
    (282, 'El Malilla', 'el malilla'),
    (283, 'El Pinche Mara', 'el pinche mara'),
    (284, 'Elijah King', 'elijah king'),
    (285, 'Elliphant', 'elliphant'),
    (286, 'Emy Soul', 'emy soul'),
    (287, 'Farina', 'farina'),
    (288, 'Farruko', 'farruko'),
    (289, 'FBM', 'fbm'),
    (290, 'Feduk', 'feduk'),
    (291, 'Fergie', 'fergie'),
    (292, 'Fntxy', 'fntxy'),
    (293, 'Frascasado', 'frascasado'),
    (294, 'French Montana', 'french montana'),
    (295, 'FS Green', 'fs green'),
    (296, 'Fuerza Regida', 'fuerza regida'),
    (297, 'Ghetto Kids', 'ghetto kids'),
    (298, 'GIMS', 'gims'),
    (299, 'Gote', 'gote'),
    (300, 'Gucci Mane', 'gucci mane'),
    (301, 'Héctor "El Father"', 'héctor "el father"'),
    (302, 'iLe', 'ile'),
    (303, 'Imagine Dragons', 'imagine dragons'),
    (304, 'Inverness', 'inverness'),
    (305, 'Ivy Queen', 'ivy queen'),
    (306, 'J Balvin', 'j balvin'),
    (307, 'Jaken', 'jaken'),
    (308, 'Jambene', 'jambene'),
    (309, 'Javu', 'javu'),
    (310, 'JL Amazu', 'jl amazu'),
    (311, 'Jovi Rockwell', 'jovi rockwell'),
    (312, 'Julianno Sosa', 'julianno sosa'),
    (313, 'Julieta Venegas', 'julieta venegas'),
    (314, 'Justin Quiles', 'justin quiles'),
    (315, 'Justin Timberlake', 'justin timberlake'),
    (316, 'Jøtta', 'jøtta'),
    (317, 'Kendo Kaponi', 'kendo kaponi'),
    (318, 'Khalid', 'khalid'),
    (319, 'Kid Bookie', 'kid bookie'),
    (320, 'Kid Cudi', 'kid cudi'),
    (321, 'King Lil G', 'king lil g'),
    (322, 'Konshens', 'konshens'),
    (323, 'Kyle Richh', 'kyle richh'),
    (324, 'L-Gante', 'l-gante'),
    (325, 'La Chilinga', 'la chilinga'),
    (326, 'La Dame Blanche', 'la dame blanche'),
    (327, 'La Dinastia', 'la dinastia'),
    (328, 'La Duraca', 'la duraca'),
    (329, 'La Kelly', 'la kelly'),
    (330, 'La Loquera', 'la loquera'),
    (331, 'Lele Pons', 'lele pons'),
    (332, 'Lil Yachty', 'lil yachty'),
    (333, 'LMFAO', 'lmfao'),
    (334, 'Logic', 'logic'),
    (335, 'Lola Índigo', 'lola índigo'),
    (336, 'Los Dos Carnales', 'los dos carnales'),
    (337, 'Los Ángeles Azules', 'los ángeles azules'),
    (338, 'Mad Fuentes', 'mad fuentes'),
    (339, 'Maire Wink', 'maire wink'),
    (340, 'Maldy', 'maldy'),
    (341, 'Marco Antonio Solís', 'marco antonio solís'),
    (342, 'Margaret Y Ya', 'margaret y ya'),
    (343, 'Mariah Angeliq', 'mariah angeliq'),
    (344, 'María Becerra', 'maría becerra'),
    (345, 'María Daniela y Su Sonido Lasser', 'maría daniela y su sonido lasser'),
    (346, 'María Rita', 'maría rita'),
    (347, 'Mate Five', 'mate five'),
    (348, 'McKlopedia', 'mcklopedia'),
    (349, 'Meny Méndez', 'meny méndez'),
    (350, 'Micho Del Duho', 'micho del duho'),
    (351, 'Milan', 'milan'),
    (352, 'Millonario', 'millonario'),
    (353, 'Miren Iza', 'miren iza'),
    (354, 'Mr. Pomel', 'mr. pomel'),
    (355, 'Muelas de Gallo', 'muelas de gallo'),
    (356, 'Myke Towers', 'myke towers'),
    (357, 'Nach', 'nach'),
    (358, 'Nathy Peluso', 'nathy peluso'),
    (359, 'Nevve', 'nevve'),
    (360, 'Nicky Jam', 'nicky jam'),
    (361, 'Niki & The Dove', 'niki & the dove'),
    (362, 'Nolep', 'nolep'),
    (363, 'Nolz', 'nolz'),
    (364, 'Orishas', 'orishas'),
    (365, 'Override', 'override'),
    (366, 'Ovy on the Drums', 'ovy on the drums'),
    (367, 'Ozuna', 'ozuna'),
    (368, 'Pablo Chill-E', 'pablo chill-e'),
    (369, 'Panasuyo', 'panasuyo'),
    (370, 'Pato Machete', 'pato machete'),
    (371, 'Patán', 'patán'),
    (372, 'Paulo Londra', 'paulo londra'),
    (373, 'Pedro Capó', 'pedro capó'),
    (374, 'Peso Pluma', 'peso pluma'),
    (375, 'Pharrell Williams', 'pharrell williams'),
    (376, 'Phul King Fu', 'phul king fu'),
    (377, 'Piochaz', 'piochaz'),
    (378, 'Pitbull', 'pitbull'),
    (379, 'Pol Granch', 'pol granch'),
    (380, 'Potencia Lirical', 'potencia lirical'),
    (381, 'Ppkachorro', 'ppkachorro'),
    (382, 'Profeta Yao Yao', 'profeta yao yao'),
    (383, 'Ptazeta', 'ptazeta'),
    (384, 'Químico Ultra Mega', 'químico ultra mega'),
    (385, 'RaiNao', 'rainao'),
    (386, 'Randy', 'randy'),
    (387, 'RedOne', 'redone'),
    (388, 'Rich The Kid', 'rich the kid'),
    (389, 'Riky Produce', 'riky produce'),
    (390, 'Rome LMN', 'rome lmn'),
    (391, 'Rompasso', 'rompasso'),
    (392, 'Rubén Blades', 'rubén blades'),
    (393, 'Salvi', 'salvi'),
    (394, 'Samantha Barrón', 'samantha barrón'),
    (395, 'Santa Fe Klan', 'santa fe klan'),
    (396, 'Sasha', 'sasha'),
    (397, 'Sean Paul', 'sean paul'),
    (398, 'Servando y Florentino', 'servando y florentino'),
    (399, 'Shaun Ryder', 'shaun ryder'),
    (400, 'Sikdope', 'sikdope'),
    (401, 'Silvio Rodríguez', 'silvio rodríguez'),
    (402, 'Skisia2', 'skisia2'),
    (403, 'Skylar Grey', 'skylar grey'),
    (404, 'Sleezy O', 'sleezy o'),
    (405, 'Smi-Lee', 'smi-lee'),
    (406, 'Smino', 'smino'),
    (407, 'Snoop Dogg', 'snoop dogg'),
    (408, 'Snow Tha Product', 'snow tha product'),
    (409, 'Sonik 420', 'sonik 420'),
    (410, 'Summer Cem', 'summer cem'),
    (411, 'Susana Baca', 'susana baca'),
    (412, 'SWOG', 'swog'),
    (413, 'SZA', 'sza'),
    (414, 'T-Fest', 't-fest'),
    (415, 'Tego Calderón', 'tego calderón'),
    (416, 'The Flexican', 'the flexican'),
    (417, 'The Weeknd', 'the weeknd'),
    (418, 'Timbaland', 'timbaland'),
    (419, 'Tiësto', 'tiësto'),
    (420, 'Totó la Momposina', 'totó la momposina'),
    (421, 'TRAQULA', 'traqula'),
    (422, 'TumaniYO', 'tumaniyo'),
    (423, 'Ty Dolla $ign', 'ty dolla $ign'),
    (424, 'Vida Baja', 'vida baja'),
    (425, 'VV Brujo', 'vv brujo'),
    (426, 'W. Corona', 'w. corona'),
    (427, 'will.i.am', 'will.i.am'),
    (428, 'Wiz Khalifa', 'wiz khalifa'),
    (429, 'X Ambassadors', 'x ambassadors'),
    (430, 'Yoga Fire', 'yoga fire'),
    (431, 'Young Miko', 'young miko'),
    (432, 'Zion', 'zion'),
    (433, 'Zion & Lennox', 'zion & lennox'),
    (434, 'Zupay', 'zupay'),
    (435, 'Ñengo Flow', 'ñengo flow'),
    (436, 'Райда', 'райда');
SELECT setval('artistas_id_seq', 436);

-- PASO 5 — Correcciones de principal (63 canciones).
-- Se borra la fila principal del backfill y se inserta la corregida.
-- Solo 34 cambian de artista_id; las otras 29 re-escriben el mismo
-- artista_id (no-op) porque el PASO 3 renombró al artista. Ver encabezado.
-- 39 EYO: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 39 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (39, 3, 'principal', 0);
-- 64 Down with me: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 64 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (64, 3, 'principal', 0);
-- 67 So high: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 67 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (67, 3, 'principal', 0);
-- 68 Mi tío snoop: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 68 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (68, 3, 'principal', 0);
-- 69 Aleman bzrp sesión n.15: 'Bizarrap' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 69 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (69, 3, 'principal', 0);
-- 70 Humo en la trampa: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 70 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (70, 3, 'principal', 0);
-- 72 Humo en la trampa 2: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 72 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (72, 3, 'principal', 0);
-- 74 Odio el drama: 'Remik gonzales' -> Remik González
DELETE FROM cancion_artistas WHERE cancion_id = 74 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (74, 162, 'principal', 0);
-- 75 Requisito 420: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 75 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (75, 3, 'principal', 0);
-- 76 Te va a gustar: 'Snow' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 76 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (76, 3, 'principal', 0);
-- 77 Casa en la montaña 2: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 77 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 3, 'principal', 0);
-- 78 Humo en la trampa 3: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 78 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 3, 'principal', 0);
-- 79 Narco jr: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 79 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (79, 3, 'principal', 0);
-- 80 Alterados: 'Aleman' -> Alemán
DELETE FROM cancion_artistas WHERE cancion_id = 80 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (80, 3, 'principal', 0);
-- 96 Desvielados: 'Remik gonzales' -> Remik González
DELETE FROM cancion_artistas WHERE cancion_id = 96 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (96, 162, 'principal', 0);
-- 98 Round 4: 'C-kan' -> MC Davo
DELETE FROM cancion_artistas WHERE cancion_id = 98 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (98, 136, 'principal', 0);
-- 100 Bzrp sessión V.51: 'Bizarrap' -> Villano Antillano
DELETE FROM cancion_artistas WHERE cancion_id = 100 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (100, 207, 'principal', 0);
-- 101 Vip: 'Villano antillano' -> Kenia Os
DELETE FROM cancion_artistas WHERE cancion_id = 101 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (101, 106, 'principal', 0);
-- 102 Mujeron: 'Villano antillano' -> Ptazeta
DELETE FROM cancion_artistas WHERE cancion_id = 102 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (102, 383, 'principal', 0);
-- 104 Un amarre: 'Villano antillano' -> RaiNao
DELETE FROM cancion_artistas WHERE cancion_id = 104 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (104, 385, 'principal', 0);
-- 215 Se te nota: 'Guaynaa' -> Lele Pons
DELETE FROM cancion_artistas WHERE cancion_id = 215 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (215, 331, 'principal', 0);
-- 217 Tra TRA TRA [remix]: 'Guaynaa' -> Ghetto Kids
DELETE FROM cancion_artistas WHERE cancion_id = 217 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (217, 297, 'principal', 0);
-- 220 De party en party: 'Guaynaa' -> Lele Pons
DELETE FROM cancion_artistas WHERE cancion_id = 220 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (220, 331, 'principal', 0);
-- 221 Taxi: 'Guaynaa' -> Mariah Angeliq
DELETE FROM cancion_artistas WHERE cancion_id = 221 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (221, 343, 'principal', 0);
-- 224 Demente: 'Guaynaa' -> Chungha
DELETE FROM cancion_artistas WHERE cancion_id = 224 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (224, 260, 'principal', 0);
-- 227 Chica idea [remix]: 'Sebastian Yatra' -> Sebastián Yatra
DELETE FROM cancion_artistas WHERE cancion_id = 227 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (227, 176, 'principal', 0);
-- 238 Ayo Technology: '50cent' -> 50 Cent
DELETE FROM cancion_artistas WHERE cancion_id = 238 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (238, 2, 'principal', 0);
-- 268 Lambada [Pitched + bass]: 'T-fest x scriptonite' -> T-Fest
DELETE FROM cancion_artistas WHERE cancion_id = 268 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (268, 414, 'principal', 0);
-- 269 Москва любит...: 'Cartel de santa' -> Скриптонит
DELETE FROM cancion_artistas WHERE cancion_id = 269 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (269, 221, 'principal', 0);
-- 280 La última sombra: 'Banda ms' -> Banda MS de Sergio Lizárraga
DELETE FROM cancion_artistas WHERE cancion_id = 280 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (280, 16, 'principal', 0);
-- 295 Cómo capo: 'Clave especial' -> Fuerza Regida
DELETE FROM cancion_artistas WHERE cancion_id = 295 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (295, 296, 'principal', 0);
-- 316 Nathy peluso bzrp n. 36: 'Bizarrap' -> Nathy Peluso
DELETE FROM cancion_artistas WHERE cancion_id = 316 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (316, 358, 'principal', 0);
-- 326 Mad love: 'David guetta' -> Sean Paul
DELETE FROM cancion_artistas WHERE cancion_id = 326 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (326, 397, 'principal', 0);
-- 331 Zona de perreo: 'Daddys yankee' -> Daddy Yankee
DELETE FROM cancion_artistas WHERE cancion_id = 331 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (331, 44, 'principal', 0);
-- 333 Que me baila: 'Chocqibtown' -> ChocQuibTown
DELETE FROM cancion_artistas WHERE cancion_id = 333 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (333, 37, 'principal', 0);
-- 392 Destiny: 'Zarcortgame' -> Zarcort
DELETE FROM cancion_artistas WHERE cancion_id = 392 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (392, 216, 'principal', 0);
-- 444 Wake up, kill, repeat: 'Code: pandorum' -> Code:Pandorum
DELETE FROM cancion_artistas WHERE cancion_id = 444 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (444, 39, 'principal', 0);
-- 446 Día/noche: 'Rich vagos' -> Samantha Barrón
DELETE FROM cancion_artistas WHERE cancion_id = 446 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (446, 394, 'principal', 0);
-- 453 Pienso en tu mira (Cap 3): 'Rosalia' -> Rosalía
DELETE FROM cancion_artistas WHERE cancion_id = 453 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (453, 170, 'principal', 0);
-- 458 A ningún hombre (cap 11): 'Rosalia' -> Rosalía
DELETE FROM cancion_artistas WHERE cancion_id = 458 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (458, 170, 'principal', 0);
-- 463 Shakira bzrp vol. 53: 'Bizarrap' -> Shakira
DELETE FROM cancion_artistas WHERE cancion_id = 463 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (463, 178, 'principal', 0);
-- 481 Moonlight: 'Xxxtentation' -> XXXTentacion
DELETE FROM cancion_artistas WHERE cancion_id = 481 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (481, 211, 'principal', 0);
-- 505 Russian roulete: 'Tungevaag' -> Tungevaag & Raaban
DELETE FROM cancion_artistas WHERE cancion_id = 505 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (505, 202, 'principal', 0);
-- 531 Sucker for pain: 'Lyl waine' -> Lil Wayne + Wiz Khalifa + Imagine Dragons
DELETE FROM cancion_artistas WHERE cancion_id = 531 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 123, 'principal', 0);
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 428, 'principal', 1);
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 303, 'principal', 2);
-- 534 Canela: 'Nanpa basico' -> Nanpa Básico
DELETE FROM cancion_artistas WHERE cancion_id = 534 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (534, 142, 'principal', 0);
-- 535 Dibujame: 'Rich vagos' -> Samantha Barrón
DELETE FROM cancion_artistas WHERE cancion_id = 535 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (535, 394, 'principal', 0);
-- 540 Tristella: 'Esperom' -> Esperón
DELETE FROM cancion_artistas WHERE cancion_id = 540 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (540, 65, 'principal', 0);
-- 558 Vaquero: 'Andres castillo' -> Andrés Castillo
DELETE FROM cancion_artistas WHERE cancion_id = 558 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 5, 'principal', 0);
-- 565 Cli clan: 'Bellakath' -> Potencia Lirical
DELETE FROM cancion_artistas WHERE cancion_id = 565 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (565, 380, 'principal', 0);
-- 568 Blinding lights: 'Bruno mars' -> The Weeknd
DELETE FROM cancion_artistas WHERE cancion_id = 568 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (568, 417, 'principal', 0);
-- 573 Tiroteo: 'Marc segui' -> Marc Seguí
DELETE FROM cancion_artistas WHERE cancion_id = 573 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (573, 131, 'principal', 0);
-- 592 La matraca: 'Daniflow' -> Dani Flow
DELETE FROM cancion_artistas WHERE cancion_id = 592 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (592, 46, 'principal', 0);
-- 593 Rompe: 'Daddys yankee' -> Daddy Yankee
DELETE FROM cancion_artistas WHERE cancion_id = 593 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (593, 44, 'principal', 0);
-- 616 Too original: 'Mejor lazer' -> Major Lazer
DELETE FROM cancion_artistas WHERE cancion_id = 616 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (616, 138, 'principal', 0);
-- 617 Watch out for this: 'Mejor lazer' -> Major Lazer
DELETE FROM cancion_artistas WHERE cancion_id = 617 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (617, 138, 'principal', 0);
-- 621 Rampasso: 'Angetenar' -> Rompasso
DELETE FROM cancion_artistas WHERE cancion_id = 621 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (621, 391, 'principal', 0);
-- 622 Sutra: 'Sebastian yatra' -> Sebastián Yatra
DELETE FROM cancion_artistas WHERE cancion_id = 622 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (622, 176, 'principal', 0);
-- 629 Stranger things (official tral remix): 'Trap music now' -> Override
DELETE FROM cancion_artistas WHERE cancion_id = 629 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (629, 365, 'principal', 0);
-- 631 Unforgetabble waiting: 'Skrillex' -> SWOG
DELETE FROM cancion_artistas WHERE cancion_id = 631 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (631, 412, 'principal', 0);
-- 633 TMM TMM: 'Spirit of god' -> Summer Cem
DELETE FROM cancion_artistas WHERE cancion_id = 633 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (633, 410, 'principal', 0);
-- 656 Sabadrugs: 'Remik gonzalez' -> Remik González
DELETE FROM cancion_artistas WHERE cancion_id = 656 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (656, 162, 'principal', 0);
-- 662 Can't hold me down: 'Lil wayne' -> Lil Wayne + Lil Yachty
DELETE FROM cancion_artistas WHERE cancion_id = 662 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (662, 123, 'principal', 0);
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (662, 332, 'principal', 1);
-- 665 Mr. Delincuente: 'Norykoo' -> Norykko
DELETE FROM cancion_artistas WHERE cancion_id = 665 AND rol = 'principal';
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (665, 148, 'principal', 0);

-- PASO 6 — Invitados (330 filas en 232 canciones).
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (3, 352, 'invitado', 0); -- Bailar y volar: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (4, 371, 'invitado', 0); -- Volar volar: Patán
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (5, 329, 'invitado', 0); -- Shorty party: La Kelly
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (6, 352, 'invitado', 0); -- Burbujas de cristal: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (10, 352, 'invitado', 0); -- El ratón y el queso: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (10, 424, 'invitado', 1); -- El ratón y el queso: Vida Baja
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (10, 381, 'invitado', 2); -- El ratón y el queso: Ppkachorro
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (10, 426, 'invitado', 3); -- El ratón y el queso: W. Corona
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (10, 243, 'invitado', 4); -- El ratón y el queso: Big Man
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (13, 313, 'invitado', 0); -- El dolor del micro: Julieta Venegas
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (15, 243, 'invitado', 0); -- Súbete y ya verás: Big Man
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (15, 352, 'invitado', 1); -- Súbete y ya verás: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (18, 241, 'invitado', 0); -- Somos chidos: Bicho Ramírez
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (19, 336, 'invitado', 0); -- Ala entre el humo: Los Dos Carnales
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (27, 243, 'invitado', 0); -- Ya no van: Big Man
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (27, 352, 'invitado', 1); -- Ya no van: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (27, 426, 'invitado', 2); -- Ya no van: W. Corona
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (28, 3, 'invitado', 0); -- TUY: Alemán
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (28, 352, 'invitado', 1); -- TUY: Millonario
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (28, 224, 'invitado', 2); -- TUY: Adán Cruz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (34, 236, 'invitado', 0); -- La plaga del rap: Arianna Puello
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (37, 415, 'invitado', 0); -- Conexión puerto rico: Tego Calderón
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (38, 307, 'invitado', 0); -- Jake mate: Jaken
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (39, 32, 'invitado', 0); -- EYO: Cartel de Santa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (40, 354, 'invitado', 0); -- Si son bien jotos: Mr. Pomel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (41, 309, 'invitado', 0); -- De norte a sur: Javu
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (41, 377, 'invitado', 1); -- De norte a sur: Piochaz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (41, 350, 'invitado', 2); -- De norte a sur: Micho Del Duho
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (42, 310, 'invitado', 0); -- Mi segundo nombre es fiesta: JL Amazu
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (43, 293, 'invitado', 0); -- Sientes los graves: Frascasado
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (64, 286, 'invitado', 0); -- Down with me: Emy Soul
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (67, 355, 'invitado', 0); -- So high: Muelas de Gallo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (67, 292, 'invitado', 1); -- So high: Fntxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (67, 308, 'invitado', 2); -- So high: Jambene
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (68, 407, 'invitado', 0); -- Mi tío snoop: Snoop Dogg
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (70, 430, 'invitado', 0); -- Humo en la trampa: Yoga Fire
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (70, 262, 'invitado', 1); -- Humo en la trampa: Cozy Cuz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (70, 292, 'invitado', 2); -- Humo en la trampa: Fntxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (70, 272, 'invitado', 3); -- Humo en la trampa: Dee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (72, 272, 'invitado', 0); -- Humo en la trampa 2: Dee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (72, 292, 'invitado', 1); -- Humo en la trampa 2: Fntxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (72, 430, 'invitado', 2); -- Humo en la trampa 2: Yoga Fire
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (72, 355, 'invitado', 3); -- Humo en la trampa 2: Muelas de Gallo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (74, 3, 'invitado', 0); -- Odio el drama: Alemán
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (75, 324, 'invitado', 0); -- Requisito 420: L-Gante
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (76, 408, 'invitado', 0); -- Te va a gustar: Snow Tha Product
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 355, 'invitado', 0); -- Casa en la montaña 2: Muelas de Gallo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 272, 'invitado', 1); -- Casa en la montaña 2: Dee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 430, 'invitado', 2); -- Casa en la montaña 2: Yoga Fire
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 292, 'invitado', 3); -- Casa en la montaña 2: Fntxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (77, 376, 'invitado', 4); -- Casa en la montaña 2: Phul King Fu
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 376, 'invitado', 0); -- Humo en la trampa 3: Phul King Fu
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 430, 'invitado', 1); -- Humo en la trampa 3: Yoga Fire
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 272, 'invitado', 2); -- Humo en la trampa 3: Dee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 292, 'invitado', 3); -- Humo en la trampa 3: Fntxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 262, 'invitado', 4); -- Humo en la trampa 3: Cozy Cuz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 226, 'invitado', 5); -- Humo en la trampa 3: Akasha
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (78, 244, 'invitado', 6); -- Humo en la trampa 3: Big Soto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (79, 284, 'invitado', 0); -- Narco jr: Elijah King
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (80, 283, 'invitado', 0); -- Alterados: El Pinche Mara
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (80, 162, 'invitado', 1); -- Alterados: Remik González
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (81, 3, 'invitado', 0); -- Coastin': Alemán
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (85, 395, 'invitado', 0); -- Desde cero: Santa Fe Klan
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (89, 349, 'invitado', 0); -- El mañana: Meny Méndez
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (90, 28, 'invitado', 0); -- La paleta: C-Kan
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (93, 68, 'invitado', 0); -- Los bandidos: Gera MX
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (93, 269, 'invitado', 1); -- Los bandidos: Darkiel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (95, 368, 'invitado', 0); -- Ya no te quiero ver: Pablo Chill-E
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (96, 240, 'invitado', 0); -- Desvielados: BeeJay
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (97, 136, 'invitado', 0); -- Round 1: MC Davo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (98, 28, 'invitado', 0); -- Round 4: C-Kan
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (99, 136, 'invitado', 0); -- Round 5: MC Davo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (101, 207, 'invitado', 0); -- Vip: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (102, 207, 'invitado', 0); -- Mujeron: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (103, 431, 'invitado', 0); -- Besties: Young Miko
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (104, 207, 'invitado', 0); -- Un amarre: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (107, 373, 'invitado', 0); -- Reina de la selva: Pedro Capó
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (108, 207, 'invitado', 0); -- Activa: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (108, 261, 'invitado', 1); -- Activa: Corina Smith
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (109, 207, 'invitado', 0); -- Noches de verano: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (115, 207, 'invitado', 0); -- Cruel: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (117, 207, 'invitado', 0); -- Thick thick: Villano Antillano
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (117, 390, 'invitado', 1); -- Thick thick: Rome LMN
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (121, 232, 'invitado', 0); -- Muñeca: Ana Macho
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (123, 302, 'invitado', 0); -- Mujer: iLe
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (125, 326, 'invitado', 0); -- Puesta: La Dame Blanche
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (129, 270, 'invitado', 0); -- Peli-culeo: De La Ghetto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (129, 386, 'invitado', 1); -- Peli-culeo: Randy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (132, 431, 'invitado', 0); -- Brinca: Young Miko
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (133, 344, 'invitado', 0); -- Maléfica: María Becerra
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (137, 270, 'invitado', 0); -- Peli-culeo [Remix]: De La Ghetto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (137, 386, 'invitado', 1); -- Peli-culeo [Remix]: Randy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (137, 435, 'invitado', 2); -- Peli-culeo [Remix]: Ñengo Flow
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (137, 314, 'invitado', 3); -- Peli-culeo [Remix]: Justin Quiles
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (139, 287, 'invitado', 0); -- Las nenas: Farina
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (139, 33, 'invitado', 1); -- Las nenas: Cazzu
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (139, 328, 'invitado', 2); -- Las nenas: La Duraca
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (167, 341, 'invitado', 0); -- Basta ya [Banda]: Marco Antonio Solís
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (177, 341, 'invitado', 0); -- Cómo tú mujer [Banda]: Marco Antonio Solís
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (190, 341, 'invitado', 0); -- Coleccionando heridas: Marco Antonio Solís
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (191, 178, 'invitado', 0); -- TQG: Shakira
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (194, 234, 'invitado', 0); -- Culpable: Anuel AA
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (195, 374, 'invitado', 0); -- Qlona: Peso Pluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (197, 340, 'invitado', 0); -- Gatúbela: Maldy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (199, 343, 'invitado', 0); -- El makinon: Mariah Angeliq
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (200, 366, 'invitado', 0); -- Cairo: Ovy on the Drums
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (202, 419, 'invitado', 0); -- Contigo: Tiësto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (206, 15, 'invitado', 0); -- Karmika: Bad Gyal
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (206, 397, 'invitado', 1); -- Karmika: Sean Paul
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (210, 250, 'invitado', 0); -- Mañana será bonito: Carla Morrison
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (212, 306, 'invitado', 0); -- Mi cama [Remix]: J Balvin
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (212, 360, 'invitado', 1); -- Mi cama [Remix]: Nicky Jam
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (213, 358, 'invitado', 0); -- Gato malo: Nathy Peluso
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (214, 209, 'invitado', 0); -- Leyendas: Wisin & Yandel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (214, 360, 'invitado', 1); -- Leyendas: Nicky Jam
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (214, 305, 'invitado', 2); -- Leyendas: Ivy Queen
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (214, 432, 'invitado', 3); -- Leyendas: Zion
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (214, 229, 'invitado', 4); -- Leyendas: Alberto Stylee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (215, 79, 'invitado', 0); -- Se te nota: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (217, 79, 'invitado', 0); -- Tra TRA TRA [remix]: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (217, 338, 'invitado', 1); -- Tra TRA TRA [remix]: Mad Fuentes
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (218, 253, 'invitado', 0); -- Chicharrón: Cauty
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (219, 337, 'invitado', 0); -- Cumbia a la gente: Los Ángeles Azules
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (220, 79, 'invitado', 0); -- De party en party: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (221, 79, 'invitado', 0); -- Taxi: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (224, 79, 'invitado', 0); -- Demente: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (225, 398, 'invitado', 0); -- Los cachos: Servando y Florentino
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (226, 79, 'invitado', 0); -- Dame bien: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (226, 242, 'invitado', 1); -- Dame bien: Big Freedia
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (227, 79, 'invitado', 0); -- Chica idea [remix]: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (227, 427, 'invitado', 1); -- Chica idea [remix]: will.i.am
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (228, 335, 'invitado', 0); -- Respira: Lola Índigo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (229, 200, 'invitado', 0); -- Chulo pt.2: Tokischa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (229, 431, 'invitado', 1); -- Chulo pt.2: Young Miko
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (238, 315, 'invitado', 0); -- Ayo Technology: Justin Timberlake
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (238, 418, 'invitado', 1); -- Ayo Technology: Timbaland
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (247, 403, 'invitado', 0); -- Shot me down [slowed + reverb]: Skylar Grey
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (261, 347, 'invitado', 0); -- Letanía 13: Mate Five
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (268, 221, 'invitado', 0); -- Lambada [Pitched + bass]: Скриптонит
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (272, 436, 'invitado', 0); -- Baby mama: Райда
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (273, 256, 'invitado', 0); -- Космос: Charusha
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (278, 221, 'invitado', 0); -- Billboard: Скриптонит
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (278, 223, 'invitado', 1); -- Billboard: 104
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (278, 422, 'invitado', 2); -- Billboard: TumaniYO
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (279, 290, 'invitado', 0); -- Рамок нет: Feduk
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (281, 422, 'invitado', 0); -- Brooklyn [pokra remix]: TumaniYO
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (282, 393, 'invitado', 0); -- Trumpets [radio remix]: Salvi
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (282, 397, 'invitado', 1); -- Trumpets [radio remix]: Sean Paul
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (295, 38, 'invitado', 0); -- Cómo capo: Clave Especial
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (297, 413, 'invitado', 0); -- Kiss me more: SZA
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (300, 322, 'invitado', 0); -- Wine pon you: Konshens
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (303, 300, 'invitado', 0); -- Like that: Gucci Mane
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (305, 406, 'invitado', 0); -- Won't bite: Smino
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (308, 63, 'invitado', 0); -- Mi buen amor: Enrique Bunbury
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (310, 98, 'invitado', 0); -- Amarrame: Juanes
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (314, 79, 'invitado', 0); -- Plata ta ta: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (319, 17, 'invitado', 0); -- Amigos: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (320, 14, 'invitado', 0); -- Mayores: Bad Bunny
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (321, 145, 'invitado', 0); -- Sin pijama: Natti Natasha
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (322, 372, 'invitado', 0); -- Cuando te bese: Paulo Londra
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (323, 17, 'invitado', 0); -- Ram pam pam: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (324, 59, 'invitado', 0); -- Fulanito: El Alfa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (326, 17, 'invitado', 0); -- Mad love: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (327, 356, 'invitado', 0); -- Dollar: Myke Towers
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (328, 130, 'invitado', 0); -- La respuesta: Maluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (329, 17, 'invitado', 0); -- La loto: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (329, 7, 'invitado', 1); -- La loto: Anitta
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (331, 145, 'invitado', 0); -- Zona de perreo: Natti Natasha
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (331, 17, 'invitado', 1); -- Zona de perreo: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (332, 17, 'invitado', 0); -- Banana: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (333, 17, 'invitado', 0); -- Que me baila: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (334, 17, 'invitado', 0); -- Mala mía [remix]: Becky G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (334, 7, 'invitado', 1); -- Mala mía [remix]: Anitta
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (339, 288, 'invitado', 0); -- Zooted: Farruko
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (339, 294, 'invitado', 1); -- Zooted: French Montana
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (340, 433, 'invitado', 0); -- Te supere: Zion & Lennox
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (340, 288, 'invitado', 1); -- Te supere: Farruko
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (342, 79, 'invitado', 0); -- Tajin: Guaynaa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (349, 392, 'invitado', 0); -- La perla: Rubén Blades
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (349, 325, 'invitado', 1); -- La perla: La Chilinga
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (350, 265, 'invitado', 0); -- Amiga date cuenta: Cubebass
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (351, 342, 'invitado', 0); -- Caninas: Margaret Y Ya
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (352, 339, 'invitado', 0); -- Perrear llorando: Maire Wink
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (354, 227, 'invitado', 0); -- Terrible, perriemos: Aku P
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (356, 345, 'invitado', 0); -- Hey bitch lit: María Daniela y Su Sonido Lasser
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (356, 265, 'invitado', 1); -- Hey bitch lit: Cubebass
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (360, 237, 'invitado', 0); -- Sed de la mala: Army of Skanks
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (363, 274, 'invitado', 0); -- Vitamina: DFZM
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (363, 316, 'invitado', 1); -- Vitamina: Jøtta
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (365, 420, 'invitado', 0); -- Latinoamérica: Totó la Momposina
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (365, 411, 'invitado', 1); -- Latinoamérica: Susana Baca
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (365, 346, 'invitado', 2); -- Latinoamérica: María Rita
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (366, 401, 'invitado', 0); -- Ojos color sol: Silvio Rodríguez
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (367, 248, 'invitado', 0); -- No hay nadie como tú: Café Tacvba
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (370, 239, 'invitado', 0); -- Tango del pecado: Bajofondo Tango Club
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (370, 369, 'invitado', 1); -- Tango del pecado: Panasuyo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (373, 364, 'invitado', 0); -- Pa'l norte: Orishas
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (375, 266, 'invitado', 0); -- Electro movimiento: Cuci Amador
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (378, 415, 'invitado', 0); -- Sin exagerar: Tego Calderón
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (380, 164, 'invitado', 0); -- Gordita: Residente
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (381, 216, 'invitado', 0); -- Kronno vs zarcort pt.1: Zarcort
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (384, 151, 'invitado', 0); -- Halo 5: Piter-G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (384, 267, 'invitado', 1); -- Halo 5: Dan Bull
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (400, 109, 'invitado', 0); -- Fnaf vs Minecraft: Kronno Zomber
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (401, 267, 'invitado', 0); -- Assasins creed unity rap: Dan Bull
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (407, 107, 'invitado', 0); -- Homer vs peter: Keyblade
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (433, 298, 'invitado', 0); -- Hola señorita: GIMS
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (436, 14, 'invitado', 0); -- Un polvo: Bad Bunny
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (436, 235, 'invitado', 1); -- Un polvo: Arcángel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (436, 435, 'invitado', 2); -- Un polvo: Ñengo Flow
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (436, 270, 'invitado', 3); -- Un polvo: De La Ghetto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (437, 130, 'invitado', 0); -- Clandestino: Maluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (440, 378, 'invitado', 0); -- I like it: Pitbull
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (444, 319, 'invitado', 0); -- Wake up, kill, repeat: Kid Bookie
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (446, 213, 'invitado', 0); -- Día/noche: Yoss Bones
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (447, 225, 'invitado', 0); -- No soy criminal: Akapellah
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (448, 348, 'invitado', 0); -- Sientelo: McKlopedia
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (448, 213, 'invitado', 1); -- Sientelo: Yoss Bones
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (450, 49, 'invitado', 0); -- Retumbando la ciudad: Dharius
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (451, 367, 'invitado', 0); -- Yo x ti, tu x mi: Ozuna
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (455, 158, 'invitado', 0); -- Vampiros: Rauw Alejandro
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (457, 170, 'invitado', 0); -- Lo vas a olvidar: Rosalía
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (459, 318, 'invitado', 0); -- Lovely: Khalid
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (460, 130, 'invitado', 0); -- Chantaje: Maluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (461, 178, 'invitado', 0); -- Girl like me: Shakira
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (462, 251, 'invitado', 0); -- La bicicleta: Carlos Vives
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (464, 351, 'invitado', 0); -- Acróstico: Milan
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (464, 396, 'invitado', 1); -- Acróstico: Sasha
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (466, 280, 'invitado', 0); -- Loca: El Cata
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (467, 280, 'invitado', 0); -- Rabiosa: El Cata
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (477, 353, 'invitado', 0); -- Frente a frente: Miren Iza
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (496, 363, 'invitado', 0); -- Brotherhood of brutality: Nolz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (498, 363, 'invitado', 0); -- Out for blood: Nolz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (498, 278, 'invitado', 1); -- Out for blood: DV8
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (499, 363, 'invitado', 0); -- The chronicles of chaos: Nolz
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (502, 370, 'invitado', 0); -- Cumbia sobre el río: Pato Machete
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (502, 245, 'invitado', 1); -- Cumbia sobre el río: Blanquito Man
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (505, 255, 'invitado', 0); -- Russian roulete: Charlie Who?
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (514, 415, 'invitado', 0); -- Bandoleros: Tego Calderón
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (516, 152, 'invitado', 0); -- Hooka: Plan B
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (517, 317, 'invitado', 0); -- El duro: Kendo Kaponi
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (520, 56, 'invitado', 0); -- Pa' romperla: Don Omar
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (521, 164, 'invitado', 0); -- Flow hp: Residente
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (522, 301, 'invitado', 0); -- Caseríos #2: Héctor "El Father"
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (529, 384, 'invitado', 0); -- Qué viva: Químico Ultra Mega
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 334, 'invitado', 0); -- Sucker for pain: Logic
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 423, 'invitado', 1); -- Sucker for pain: Ty Dolla $ign
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 429, 'invitado', 2); -- Sucker for pain: X Ambassadors
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (532, 104, 'invitado', 0); -- Labios mordidos: Karol G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (533, 374, 'invitado', 0); -- Igual que un ángel: Peso Pluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (534, 254, 'invitado', 0); -- Canela: Charles Ans
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (535, 142, 'invitado', 0); -- Dibujame: Nanpa Básico
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (536, 59, 'invitado', 0); -- La romana: El Alfa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (537, 158, 'invitado', 0); -- Besalo: Rauw Alejandro
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (538, 374, 'invitado', 0); -- Plebada: Peso Pluma
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (550, 68, 'invitado', 0); -- Rumores: Gera MX
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (556, 408, 'invitado', 0); -- Joder: Snow Tha Product
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (557, 330, 'invitado', 0); -- Ojitos chiquititos: La Loquera
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 18, 'invitado', 0); -- Vaquero: Bellakath
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 282, 'invitado', 1); -- Vaquero: El Malilla
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 60, 'invitado', 2); -- Vaquero: El Bogueto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 327, 'invitado', 3); -- Vaquero: La Dinastia
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (558, 389, 'invitado', 4); -- Vaquero: Riky Produce
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (559, 18, 'invitado', 0); -- El no es tuyo: Bellakath
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (560, 405, 'invitado', 0); -- Y yo me le pego: Smi-Lee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (560, 382, 'invitado', 1); -- Y yo me le pego: Profeta Yao Yao
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (561, 404, 'invitado', 0); -- Prohibido: Sleezy O
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (561, 257, 'invitado', 1); -- Prohibido: Chris Redd
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (561, 425, 'invitado', 2); -- Prohibido: VV Brujo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (562, 382, 'invitado', 0); -- Lluvia de micheladas: Profeta Yao Yao
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (562, 405, 'invitado', 1); -- Lluvia de micheladas: Smi-Lee
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (563, 231, 'invitado', 0); -- Soy peor: Alexis Mvgler
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (563, 275, 'invitado', 1); -- Soy peor: DJ Foxy
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (565, 18, 'invitado', 0); -- Cli clan: Bellakath
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (565, 281, 'invitado', 1); -- Cli clan: El Jincho
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (565, 312, 'invitado', 2); -- Cli clan: Julianno Sosa
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (566, 289, 'invitado', 0); -- Se va: FBM
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (567, 228, 'invitado', 0); -- Yo kiero: Alan Dazmel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (573, 158, 'invitado', 0); -- Tiroteo: Rauw Alejandro
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (573, 379, 'invitado', 1); -- Tiroteo: Pol Granch
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (582, 209, 'invitado', 0); -- No me digas que no: Wisin & Yandel
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (586, 259, 'invitado', 0); -- Engel: Christiane "Bobo" Hebold
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (589, 252, 'invitado', 0); -- Te quiero puta: Carmen Zapata
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (592, 276, 'invitado', 0); -- La matraca: DJ NIÑOTE
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (594, 367, 'invitado', 0); -- La rompecorazones: Ozuna
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (600, 263, 'invitado', 0); -- I Can't fix you: Crusher-P
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (605, 216, 'invitado', 0); -- Dmc vs the witcher: Zarcort
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (606, 357, 'invitado', 0); -- Rap bruto: Nach
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (607, 400, 'invitado', 0); -- Unicorn zombie apocalypse: Sikdope
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (608, 361, 'invitado', 0); -- Ease my mind: Niki & The Dove
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (609, 258, 'invitado', 0); -- Gettin over you: Chris Willis
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (609, 291, 'invitado', 1); -- Gettin over you: Fergie
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (609, 333, 'invitado', 2); -- Gettin over you: LMFAO
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (610, 264, 'invitado', 0); -- Destination calabria: Crystal Waters
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (613, 320, 'invitado', 0); -- Memories: Kid Cudi
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (616, 285, 'invitado', 0); -- Too original: Elliphant
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (616, 311, 'invitado', 1); -- Too original: Jovi Rockwell
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (617, 247, 'invitado', 0); -- Watch out for this: Busy Signal
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (617, 416, 'invitado', 1); -- Watch out for this: The Flexican
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (617, 295, 'invitado', 2); -- Watch out for this: FS Green
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (621, 388, 'invitado', 0); -- Rampasso: Rich The Kid
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (622, 279, 'invitado', 0); -- Sutra: Dálmata
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (625, 233, 'invitado', 0); -- Welcome to my apocalyspe: Andrea Storm Kaden
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (628, 402, 'invitado', 0); -- Nasti nasti: Skisia2
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (630, 249, 'invitado', 0); -- Be gone: Caravn
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (631, 294, 'invitado', 0); -- Unforgetabble waiting: French Montana
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (634, 434, 'invitado', 0); -- Corvette: Zupay
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (640, 212, 'invitado', 0); -- Nena moxita: Yeri Mua
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (641, 321, 'invitado', 0); -- Con mi fe: King Lil G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (643, 399, 'invitado', 0); -- Dare: Shaun Ryder
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (644, 271, 'invitado', 0); -- Fell good inc: De La Soul
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (645, 273, 'invitado', 0); -- Clint eastwood: Del the Funky Homosapien
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (655, 306, 'invitado', 0); -- Cola song: J Balvin
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (656, 283, 'invitado', 0); -- Sabadrugs: El Pinche Mara
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (656, 238, 'invitado', 1); -- Sabadrugs: B-Raster
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (656, 409, 'invitado', 2); -- Sabadrugs: Sonik 420
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (661, 304, 'invitado', 0); -- Skeleton: Inverness
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (661, 359, 'invitado', 1); -- Skeleton: Nevve
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (662, 375, 'invitado', 0); -- Can't hold me down: Pharrell Williams
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (662, 323, 'invitado', 1); -- Can't hold me down: Kyle Richh
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (666, 421, 'invitado', 0); -- Fuego: TRAQULA
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (668, 43, 'invitado', 0); -- Cod black ops 3: Cyclo
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (668, 109, 'invitado', 1); -- Cod black ops 3: Kronno Zomber
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (668, 151, 'invitado', 2); -- Cod black ops 3: Piter-G
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (669, 158, 'invitado', 0); -- Te felicito: Rauw Alejandro
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (670, 21, 'invitado', 0); -- Baby hello: Bizarrap
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (671, 277, 'invitado', 0); -- De carolina: DJ Playero
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (672, 299, 'invitado', 0); -- Lola: Gote
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (672, 362, 'invitado', 1); -- Lola: Nolep
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (674, 246, 'invitado', 0); -- Andrea: Buscabulla

-- PASO 7 — Productores (14 filas en 13 canciones).
-- SOLO la lista corta confirmada por Nova 2026-11-16. Ningún otro productor
-- entra como rol productor; la lista completa de 527 queda en productores.md
-- como referencia de investigación, no se aplica.
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (69, 21, 'productor', 0); -- Aleman bzrp sesión n.15: Bizarrap
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (100, 21, 'productor', 0); -- Bzrp sessión V.51: Bizarrap
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (191, 366, 'productor', 0); -- TQG: Ovy On The Drums
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (195, 366, 'productor', 0); -- Qlona: Ovy on the Drums
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (200, 366, 'productor', 0); -- Cairo: Ovy on the Drums
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (202, 419, 'productor', 0); -- Contigo: Tiësto
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (238, 418, 'productor', 0); -- Ayo Technology: Timbaland
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (238, 268, 'productor', 1); -- Ayo Technology: Danja
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (316, 21, 'productor', 0); -- Nathy peluso bzrp n. 36: Bizarrap
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (326, 47, 'productor', 0); -- Mad love: David Guetta
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (463, 21, 'productor', 0); -- Shakira bzrp vol. 53: Bizarrap
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (531, 230, 'productor', 0); -- Sucker for pain: Alex da Kid
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (582, 387, 'productor', 0); -- No me digas que no: RedOne
INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES (670, 21, 'productor', 0); -- Baby hello: Bizarrap

-- PASO 8 — Limpieza: borrar artistas que quedaron sin ninguna fila
-- (p. ej. 'Rich vagos', 'Lyl waine', 'Snow', 'Bruno mars', 'T-fest x scriptonite',
-- 'Angetenar', 'Zarcortgame', 'Trap music now', 'Spirit of god').
-- El NOT EXISTS lo hace seguro: solo borra huérfanos.
DELETE FROM artistas a WHERE NOT EXISTS (
    SELECT 1 FROM cancion_artistas ca WHERE ca.artista_id = a.id
);

-- PASO 9 — Verificación (leer los resultados antes de cerrar).
-- NOTA POST-678 (2026-11-16): los 'esperado' de abajo son PRE-678.
-- En vivo, tras la 678 'Freaks': principal 681, invitado 331,
-- 678 canciones con principal, 425 artistas distintos.
SELECT rol, COUNT(*) AS filas FROM cancion_artistas GROUP BY rol ORDER BY rol;
-- esperado: principal 680, invitado 330, productor 14
SELECT COUNT(*) AS canciones_con_principal FROM (
    SELECT DISTINCT cancion_id FROM cancion_artistas WHERE rol = 'principal'
) t; -- esperado: 677
SELECT id, titulo FROM canciones WHERE id NOT IN (
    SELECT cancion_id FROM cancion_artistas WHERE rol = 'principal'
); -- esperado: 0 filas
SELECT cancion_id, COUNT(*) AS principales FROM cancion_artistas
 WHERE rol = 'principal' GROUP BY cancion_id HAVING COUNT(*) > 1;
-- esperado: 531 (3) y 662 (2), los dos temas con varios principales
SELECT COUNT(*) AS artistas_distintos FROM artistas; -- esperado: 423
SELECT a.id, a.nombre FROM artistas a WHERE NOT EXISTS (
    SELECT 1 FROM cancion_artistas ca WHERE ca.artista_id = a.id
); -- esperado: 0 filas (huérfanos)
SELECT DISTINCT a.nombre FROM cancion_artistas ca
 JOIN artistas a ON a.id = ca.artista_id
 WHERE ca.rol = 'productor' AND a.nombre_norm NOT IN (
  'bizarrap', 'ovy on the drums', 'tiësto', 'david guetta',
  'timbaland', 'danja', 'redone', 'alex da kid');
-- esperado: 0 filas (ningún productor fuera de la lista corta)
-- Comprobación de las decisiones clave (deben salir con estos artistas):
SELECT ca.cancion_id, c.titulo, a.nombre, ca.rol, ca.orden
 FROM cancion_artistas ca JOIN artistas a ON a.id = ca.artista_id
 JOIN canciones c ON c.id = ca.cancion_id
 WHERE ca.cancion_id IN (631, 629, 433, 464, 93, 400, 625, 558, 563, 670, 202, 278, 269, 384, 447, 448, 360, 634, 633, 652, 531, 662)
 ORDER BY ca.cancion_id, ca.rol, ca.orden;

COMMIT;

-- ROLLBACK — solo si algo sale mal (este archivo solo crea dos tablas nuevas
-- y no toca canciones, así que basta con borrarlas; la columna artista de
-- canciones nunca se tocó aquí). Restaurar el respaldo del export solo hace
-- falta si la columna artista se hubiera borrado en el paso final separado.
-- DROP TABLE IF EXISTS cancion_artistas;
-- DROP TABLE IF EXISTS artistas;
