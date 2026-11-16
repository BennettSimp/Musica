#include "crow.h"
#include "crow/middlewares/cors.h"
#include <pqxx/pqxx>
#include <string>
#include <iostream>
#include <vector>
#include <queue>
#include <mutex>
#include <condition_variable>
#include <memory>
#include <chrono>
#include <map>
#include <utility>
#include <algorithm>
#include <cstdlib>
#include <ctime>
#include <cmath> // std::round (la nota se guarda con 2 decimales)
#include <cctype> // std::tolower (dedupe aproximado de nombres de artista)
#include <stdexcept> // std::runtime_error (timeout del pool)

// La cadena de conexion SOLO viene de la variable de entorno (nunca en el codigo)
std::string obtenerCadenaConexion() {
    const char* env = std::getenv("DATABASE_URL");
    if (env == nullptr || std::string(env).empty()) {
        std::cerr << "[ERROR CRITICO]: define la variable de entorno DATABASE_URL" << std::endl;
        std::exit(1);
    }
    return std::string(env);
}

// ---- Registro (logs) ----
// Un solo mutex para todas las funciones de log: sin él, dos hilos
// podrían mezclar sus líneas en stderr.
static std::string g_databaseUrl; // se fija en main(); solo para sanitizar logs, nunca se imprime
static std::mutex g_logMutex;

// Hora UTC ISO-8601 para los logs (Render guarda stderr; sin marca de
// tiempo no se puede saber cuando paso algo).
// NOTA: std::gmtime NO es seguro en hilos (devuelve un buffer estatico) y
// el servidor atiende varias peticiones a la vez; se usa gmtime_r.
static std::string marcaTiempo() {
    std::time_t t = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
    std::tm tmv{};
    gmtime_r(&t, &tmv);
    char buf[25];
    std::strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tmv);
    return std::string(buf);
}
// Sanitiza un mensaje de log (G-L7/S10): nunca se imprime la cadena de
// conexión (se sustituye por [DATABASE_URL]) y se trunca a 500 caracteres.
static std::string sanitizarLog(const std::string& s) {
    std::string o = s;
    if (!g_databaseUrl.empty()) {
        size_t pos = 0;
        while ((pos = o.find(g_databaseUrl, pos)) != std::string::npos) {
            o.replace(pos, g_databaseUrl.size(), "[DATABASE_URL]");
            pos += 14; // longitud de "[DATABASE_URL]"
        }
    }
    if (o.size() > 500) o = o.substr(0, 500) + "...[truncado]";
    return o;
}
static void logError(const std::string& donde, const std::string& que, int id = -1) {
    std::lock_guard<std::mutex> g(g_logMutex);
    std::cerr << "[" << marcaTiempo() << "] [ERROR] " << donde << ": " << sanitizarLog(que);
    if (id >= 0) std::cerr << " id=" << id;
    std::cerr << std::endl;
}
static void logInfo(const std::string& donde, const std::string& que) {
    std::lock_guard<std::mutex> g(g_logMutex);
    std::cerr << "[" << marcaTiempo() << "] [INFO] " << donde << ": " << sanitizarLog(que) << std::endl;
}
// Rechazos 400/404/409 (G-L4): endpoint + código + motivo (+ id si lo
// hay). Nunca se registran datos sensibles (títulos, tokens, cuerpos).
static void logRechazo(const std::string& donde, int codigo, const std::string& motivo, int id = -1) {
    std::lock_guard<std::mutex> g(g_logMutex);
    std::cerr << "[" << marcaTiempo() << "] [RECHAZO] " << donde << ": " << codigo << " " << sanitizarLog(motivo);
    if (id >= 0) std::cerr << " id=" << id;
    std::cerr << std::endl;
}
// Rechazos de auth 401/429 (G-L2): endpoint + código + IP + hora.
// NUNCA se registra el token.
static void logAuth(const std::string& donde, int codigo, const std::string& ip) {
    std::lock_guard<std::mutex> g(g_logMutex);
    std::cerr << "[" << marcaTiempo() << "] [AUTH] " << donde << ": " << codigo << " ip=" << sanitizarLog(ip) << std::endl;
}

// ---- Respuestas de la API (S7) ----
static void cabecerasSeguridad(crow::response& res) {
    res.add_header("X-Content-Type-Options", "nosniff");
    res.add_header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}
static crow::response respSegura(int codigo) {
    crow::response r(codigo);
    cabecerasSeguridad(r);
    return r;
}
static crow::response respSegura(int codigo, const char* cuerpo) {
    crow::response r(codigo, cuerpo);
    cabecerasSeguridad(r);
    return r;
}
static crow::response respSegura(int codigo, const std::string& cuerpo) {
    crow::response r(codigo, cuerpo);
    cabecerasSeguridad(r);
    return r;
}
static crow::response respSegura(int codigo, crow::json::wvalue cuerpo) {
    crow::response r(codigo, std::move(cuerpo));
    cabecerasSeguridad(r);
    return r;
}
// Rechazo 400/404/409 con su registro (G-L4).
static crow::response rechazo(const std::string& donde, int codigo, const std::string& motivo, int id = -1) {
    logRechazo(donde, codigo, motivo, id);
    return respSegura(codigo, motivo);
}
// Respuesta de auth fallida (S6): el 429 lleva Retry-After: 600.
static crow::response respuestaAuth(int st) {
    crow::response r = respSegura(st, st == 429 ? "Demasiados intentos." : "No autorizado.");
    if (st == 429) r.add_header("Retry-After", "600");
    return r;
}

// Timeout del pool (E12): error propio para distinguirlo del 500 genérico.
struct ErrorPoolTimeout : public std::runtime_error {
    explicit ErrorPoolTimeout(const std::string& m) : std::runtime_error(m) {}
};
// Error de base de datos: el timeout del pool es 503 "DB NO DISPONIBLE"
// (E12); cualquier otro error interno sigue siendo 500.
static crow::response respuestaErrorDb(const std::string& donde, const std::exception& e) {
    logError(donde, e.what());
    if (dynamic_cast<const ErrorPoolTimeout*>(&e) != nullptr) return respSegura(503, "DB NO DISPONIBLE");
    return respSegura(500, "Error interno.");
}

// Escritura protegida por ADMIN_TOKEN (cabecera X-Admin-Token).
// Fail-closed (S1/E11): si ADMIN_TOKEN no está definido o tiene menos de
// 24 caracteres, TODAS las escrituras devuelven 401 (el arranque NO se
// cierra: las lecturas siguen funcionando). Devuelve 0 si pasa, 401 si la
// clave falla y 429 tras 5 fallos seguidos desde la misma IP en 10 minutos.
static bool tokenConfigurado() {
    const char* token = std::getenv("ADMIN_TOKEN");
    return token != nullptr && std::string(token).size() >= 24;
}
// Comparación en tiempo constante (S6): bucle propio, sin depender de
// OpenSSL; no hay retorno anticipado por longitud ni por primer byte.
static bool compararConstante(const std::string& a, const std::string& b) {
    size_t n = std::max(a.size(), b.size());
    unsigned char diff = 0;
    for (size_t i = 0; i < n; i++) {
        unsigned char ca = i < a.size() ? static_cast<unsigned char>(a[i]) : 0;
        unsigned char cb = i < b.size() ? static_cast<unsigned char>(b[i]) : 0;
        diff |= static_cast<unsigned char>(ca ^ cb);
    }
    return diff == 0;
}
// Render añade la IP real del cliente al FINAL de X-Forwarded-For; por
// eso se toma el último valor. Suposición (S6): se confía en que Render
// (el proxy delante del servidor) es quien añade ese valor, así que
// rotar los valores anteriores de la cabecera no elude el límite por IP.
static std::string ipCliente(const crow::request& req) {
    std::string ip = req.get_header_value("X-Forwarded-For");
    size_t coma = ip.rfind(',');
    if (coma != std::string::npos) ip = ip.substr(coma + 1);
    size_t ini = ip.find_first_not_of(' ');
    return (ini == std::string::npos) ? req.remote_ip_address : ip.substr(ini);
}
static int autorizado(const crow::request& req, const std::string& donde) {
    if (!tokenConfigurado()) { logAuth(donde, 401, ipCliente(req)); return 401; }
    const std::string token = std::getenv("ADMIN_TOKEN");
    static std::mutex m;
    static std::map<std::string, std::pair<int, std::chrono::steady_clock::time_point>> fallos;
    std::string ip = ipCliente(req);
    auto ahora = std::chrono::steady_clock::now();
    std::lock_guard<std::mutex> g(m);
    for (auto it = fallos.begin(); it != fallos.end(); )
        it = (ahora - it->second.second > std::chrono::minutes(10)) ? fallos.erase(it) : ++it;
    auto& f = fallos[ip];
    if (ahora - f.second > std::chrono::minutes(10)) f = std::make_pair(0, ahora);
    if (f.first >= 5) { logAuth(donde, 429, ip); return 429; }
    if (compararConstante(req.get_header_value("X-Admin-Token"), token)) { f.first = 0; return 0; }
    ++f.first;
    logAuth(donde, 401, ip);
    return 401;
}

// Límite generoso de lectura (S9): 120 req/min por IP en la lista y el
// export. Mismo patrón de mapa con expiración que `autorizado`.
static bool excedeLimiteLectura(const crow::request& req) {
    static std::mutex m;
    static std::map<std::string, std::pair<int, std::chrono::steady_clock::time_point>> lecturas;
    std::string ip = ipCliente(req);
    auto ahora = std::chrono::steady_clock::now();
    std::lock_guard<std::mutex> g(m);
    for (auto it = lecturas.begin(); it != lecturas.end(); )
        it = (ahora - it->second.second > std::chrono::minutes(1)) ? lecturas.erase(it) : ++it;
    auto& f = lecturas[ip];
    if (ahora - f.second > std::chrono::minutes(1)) f = std::make_pair(0, ahora);
    if (++f.first > 120) return true;
    return false;
}
static crow::response respuestaLimiteLectura(const std::string& donde) {
    logRechazo(donde, 429, "Limite de lectura por IP.");
    crow::response r = respSegura(429, "Demasiadas peticiones.");
    r.add_header("Retry-After", "60");
    return r;
}

static std::string trim(const std::string& s) {
    size_t inicio = s.find_first_not_of(" \t\n\r");
    if (inicio == std::string::npos) return "";
    size_t fin = s.find_last_not_of(" \t\n\r");
    return s.substr(inicio, fin - inicio + 1);
}

static int parseEntero(const char* s, int defecto) {
    if (!s || !*s) return defecto;
    try { return std::stoi(s); } catch (...) { return defecto; }
}

static double parseDoble(const char* s, double defecto) {
    if (!s || !*s) return defecto;
    try { return std::stod(s); } catch (...) { return defecto; }
}

static const std::vector<std::string> GENEROS_VALIDOS = {"Pop","Rock","Electronica","Rap","Trap","Reggaeton","R&B","Phonk","Banda","Corridos","Corridos Tumbados","Cumbia","Salsa","Baladas","Metal","Alternativo","Hardstyle","Merengue","Dembow","Reggae","Bachata","Afrobeats","Lofi","Hardcore","Clasica","Latino","Romanticas","Asiatica","Por clasificar"};
static const std::vector<std::string> ETIQUETAS_VALIDAS = {"Original","Remix","Slowed Reverb","Sped Up","Cover","Acustico","En Vivo","Fragmento","Demo","Mashup","Edit"};
static std::string validarTituloArtista(const std::string& titulo, const std::string& artista) {
    if (titulo.empty() || artista.empty()) return "Campos vacios.";
    if (titulo.size() > 200 || artista.size() > 200) return "Titulo o artista demasiado largo.";
    return "";
}

static bool enLista(const std::string& v, const std::vector<std::string>& lista) {
    return std::find(lista.begin(), lista.end(), v) != lista.end();
}

// Desempate final (decidido por el usuario): total, base (Ritmo+Letras+Coro
// ponderada 0-10), Importancia, bonos (0-5), Descubrimiento unico, Coro,
// Ritmo, Letra, y por ultimo el ID mas antiguo. La nota se sigue mostrando
// con 2 decimales; el desempate solo ordena.
// Suma de bonos (0-5) en una sola constante, reutilizada por el
// desempate ASC y DESC: un solo lugar que cambiar si la fórmula cambia.
// La fórmula de calificar en C++ (PUT /calificar: base ponderada +
// importancia + bonos + arte_visual) debe mantenerse igual que esta SQL.
static const std::string SUMA_BONOS =
    "(CASE WHEN COALESCE(antiguedad,false) THEN 1 ELSE 0 END + CASE WHEN COALESCE(nostalgia,false) THEN 1 ELSE 0 END + CASE WHEN COALESCE(descubrimiento_terceros,false) THEN 1 ELSE 0 END + CASE WHEN COALESCE(complejidad,false) THEN 1 ELSE 0 END + COALESCE(arte_visual,0))";
static const std::string DESEMPATE_ASC = // "Peores": espejo exacto del Top; a igualdad
    // total va antes la canción MÁS NUEVA (id DESC). Decisión de Nova 2026-11-16.
    " (COALESCE(ritmo,0)*0.35 + COALESCE(letras,0)*0.25 + COALESCE(coro,0)*0.40) ASC,"
    " COALESCE(importancia,0) ASC,"
    " " + SUMA_BONOS + " ASC,"
    " COALESCE(descubrimiento_terceros,false) ASC,"
    " COALESCE(coro,0) ASC, COALESCE(ritmo,0) ASC, COALESCE(letras,0) ASC, id DESC";

static const std::string DESEMPATE =
    " (COALESCE(ritmo,0)*0.35 + COALESCE(letras,0)*0.25 + COALESCE(coro,0)*0.40) DESC,"
    " COALESCE(importancia,0) DESC,"
    " " + SUMA_BONOS + " DESC,"
    " COALESCE(descubrimiento_terceros,false) DESC,"
    " COALESCE(coro,0) DESC, COALESCE(ritmo,0) DESC, COALESCE(letras,0) DESC, id ASC";

// Una sola funcion para el JSON de una cancion (antes copiado en la lista
// y en el export, con riesgo de que se desincronicen). Los valores de
// ritmo/letras/coro/importancia pueden ser NULL (sin calificar).
static crow::json::wvalue cancionJson(const pqxx::row& f) {
    auto num = [&f](const char* col) -> crow::json::wvalue {
        return f[col].is_null() ? crow::json::wvalue(nullptr) : crow::json::wvalue(f[col].as<double>());
    };
    crow::json::wvalue j;
    j["id"] = f["id"].as<int>();
    j["titulo"] = f["titulo"].c_str();
    j["artista"] = f["artista"].c_str();
    j["calificacion_final"] = num("calificacion_final"); // E14: segura ante NULL por sí misma, sin depender del COALESCE de cada consulta
    j["genero"] = f["genero"].c_str();
    j["etiqueta"] = f["etiqueta_especial"].c_str();
    j["ritmo"] = num("ritmo");
    j["letras"] = num("letras");
    j["coro"] = num("coro");
    j["importancia"] = num("importancia");
    j["arte_visual"] = f["arte_visual"].as<double>();
    j["antiguedad"] = f["antiguedad"].as<bool>();
    j["nostalgia"] = f["nostalgia"].as<bool>();
    j["descubrimiento"] = f["desc_terc"].as<bool>();
    j["complejidad"] = f["complejidad"].as<bool>();
    j["instrumental"] = f["instrumental"].as<bool>();
    j["banda_sonora"] = f["banda_sonora"].as<bool>();
    return j;
}

// (El clamp silencioso se eliminó con la validación estricta de calificar: E2.)


// (marcaTiempo/logError/logInfo viven arriba, junto a la auth.)


// Lectura segura de JSON: si el cliente manda un tipo distinto (p. ej.
// ritmo como texto), .d()/.s()/.b() lanzan y el endpoint devolvia 500.
// En calificar (PUT) la validación es estricta (400, E2); en POST/PUT
// /info los campos opcionales siguen usando valor por defecto.
static bool esNumero(const crow::json::rvalue& v) { return v.t() == crow::json::type::Number; }
// Bono estricto (E2): booleano JSON o número 0/1; cualquier otra cosa es 400.
static bool esBooleanoO01(const crow::json::rvalue& v, bool& salida) {
    if (v.t() == crow::json::type::True) { salida = true; return true; }
    if (v.t() == crow::json::type::False) { salida = false; return true; }
    if (v.t() == crow::json::type::Number) {
        double d = v.d();
        if (d == 0) { salida = false; return true; }
        if (d == 1) { salida = true; return true; }
    }
    return false;
}
static bool boolJson(const crow::json::rvalue& v, bool defecto) {
    if (v.t() == crow::json::type::True) return true;
    if (v.t() == crow::json::type::False) return false;
    return defecto;
}
static bool esTexto(const crow::json::rvalue& v) { return v.t() == crow::json::type::String; }
static std::string textoJson(const crow::json::rvalue& v, const std::string& defecto) {
    return esTexto(v) ? std::string(v.s()) : defecto;
}

static std::string escaparLike(const std::string& s) { // % y _ del usuario se buscan literalmente
    std::string o;
    for (char ch : s) { if (ch == '\\' || ch == '%' || ch == '_') o += '\\'; o += ch; }
    return o;
}

// ---- Artistas (tabla cancion_artistas, diseno-artistas.md) ----
// Roles válidos. En el JSON el orden es principal, invitado, productor;
// dentro de cada rol manda `orden` (0, 1, 2..., como en
// artistas-aplicar.sql). Una canción puede tener VARIOS principales
// (531: Lil Wayne, Wiz Khalifa, Imagine Dragons; 662: Lil Wayne,
// Lil Yachty): el campo derivado `artista` los une con ", ".
static bool rolValido(const std::string& r) {
    return r == "principal" || r == "invitado" || r == "productor";
}
struct ArtistaEntrada { std::string nombre; std::string rol; };
struct ArtistaResuelto { int id; std::string nombre; std::string rol; int orden; };
// nombre_norm = LOWER(TRIM(nombre)) se calcula en SQL (Postgres maneja
// Unicode; en C++ no se calcula: todas las consultas usan LOWER(TRIM($1))).
// Devuelve el id del artista, creándolo si no existe (por nombre_norm),
// y el nombre guardado (el que ya había, si el nuevo solo cambia la
// capitalización: así el derivado no cambia "Karol G" por "karol g").
static int obtenerOCrearArtista(pqxx::work& W, const std::string& nombre, std::string& nombreGuardado) {
    W.exec_params("INSERT INTO artistas (nombre, nombre_norm) VALUES ($1, LOWER(TRIM($1))) ON CONFLICT (nombre_norm) DO NOTHING", nombre);
    pqxx::result r = W.exec_params("SELECT id, nombre FROM artistas WHERE nombre_norm = LOWER(TRIM($1))", nombre);
    if (r.empty()) throw std::runtime_error("no se pudo crear el artista");
    nombreGuardado = r[0][1].c_str();
    return r[0][0].as<int>();
}
// Lee body["artistas"] ([{nombre, rol}]): nombres recortados, sin vacíos,
// sin duplicados del mismo artista en el mismo rol (se queda el primero),
// roles validados. Si no viene el arreglo, devuelve true con la lista
// vacía (el llamador usa el artista plano como un solo principal).
// Nombres de más de 200 caracteres o roles inválidos dan error.
// Máximo 10 artistas por canción (S5).
static bool leerArtistasJson(const crow::json::rvalue& body, std::vector<ArtistaEntrada>& salida, std::string& error) {
    salida.clear();
    if (!body.has("artistas")) return true;
    const auto& arr = body["artistas"];
    if (arr.t() != crow::json::type::List) { error = "artistas debe ser una lista."; return false; }
    if (arr.size() > 10) { error = "Demasiados artistas (maximo 10 por cancion)."; return false; }
    std::vector<std::string> vistos; // (nombre_norm aproximado, rol): el dedupe exacto lo hace la DB
    for (size_t i = 0; i < arr.size(); i++) {
        const auto& it = arr[i];
        if (!esTexto(it["nombre"])) { error = "Cada artista necesita un nombre."; return false; }
        std::string nombre = trim(std::string(it["nombre"].s()));
        if (nombre.empty()) continue;
        if (nombre.size() > 200) { error = "Nombre de artista demasiado largo."; return false; }
        std::string rol = textoJson(it["rol"], "invitado");
        if (!rolValido(rol)) { error = "Rol de artista no valido."; return false; }
        std::string norm;
        for (char ch : nombre) norm += (char)std::tolower((unsigned char)ch);
        std::string clave = norm + "|" + rol;
        if (std::find(vistos.begin(), vistos.end(), clave) != vistos.end()) continue;
        vistos.push_back(clave);
        salida.push_back({nombre, rol});
    }
    return true;
}
// Lee y valida los artistas de POST y PUT /info (L10, compartida):
// si viene body["artistas"] manda él (con al menos un principal); si no,
// el artista plano es un solo principal. No toca la DB: solo valida.
// Devuelve false + error si el arreglo es inválido o no hay principal.
static bool leerEntradasArtistas(const crow::json::rvalue& body, const std::string& artistaPlano, std::vector<ArtistaEntrada>& entradas, std::string& error) {
    entradas.clear();
    if (body.has("artistas")) {
        if (!leerArtistasJson(body, entradas, error)) return false;
        bool hayPrincipal = false;
        for (const auto& e : entradas) if (e.rol == "principal") { hayPrincipal = true; break; }
        if (!hayPrincipal) { error = "Falta el artista principal."; return false; }
    } else {
        entradas.push_back({artistaPlano, "principal"});
    }
    return true;
}
// Resuelve (crea si hace falta) los artistas de una canción dentro de la
// transacción W y devuelve la lista con ids, nombres guardados y orden
// por rol, más el derivado (principales unidos con ", "). Si la
// transacción se aborta (p. ej. duplicado 409), los artistas creados
// aquí también se revierten.
static std::vector<ArtistaResuelto> resolverArtistas(pqxx::work& W, const std::vector<ArtistaEntrada>& entradas, std::string& derivado) {
    std::map<std::string, int> ordenPorRol;
    std::vector<std::pair<int, std::string>> vistos; // (artista_id, rol) ya resueltos
    std::vector<ArtistaResuelto> out;
    derivado.clear();
    for (const auto& e : entradas) {
        std::string guardado;
        int idArtista = obtenerOCrearArtista(W, e.nombre, guardado);
        bool repetido = false;
        for (const auto& v : vistos) if (v.first == idArtista && v.second == e.rol) { repetido = true; break; }
        if (repetido) continue;
        vistos.push_back({idArtista, e.rol});
        int orden = ordenPorRol[e.rol]++;
        out.push_back({idArtista, guardado, e.rol, orden});
        if (e.rol == "principal") { if (!derivado.empty()) derivado += ", "; derivado += guardado; }
    }
    return out;
}
static void insertarArtistasCancion(pqxx::work& W, int cancionId, const std::vector<ArtistaResuelto>& resueltos) {
    for (const auto& a : resueltos)
        W.exec_params("INSERT INTO cancion_artistas (cancion_id, artista_id, rol, orden) VALUES ($1, $2, $3, $4)", cancionId, a.id, a.rol, a.orden);
}
// Carga los artistas de varias canciones en una sola consulta (sin N+1):
// mapa cancion_id -> filas ya ordenadas por rol (principal, invitado,
// productor) y luego por `orden`. Los ids vienen de la DB (enteros), así
// que la lista IN no es entrada del usuario.
struct ArtistaFila { int cancionId; int id; std::string nombre; std::string rol; };
static std::map<int, std::vector<ArtistaFila>> cargarArtistas(pqxx::nontransaction& N, const std::vector<int>& ids) {
    std::map<int, std::vector<ArtistaFila>> mapa;
    if (ids.empty()) return mapa;
    std::string lista;
    for (int id : ids) { if (!lista.empty()) lista += ","; lista += std::to_string(id); }
    pqxx::result r = N.exec(
        "SELECT ca.cancion_id, a.id, a.nombre, ca.rol FROM cancion_artistas ca "
        "JOIN artistas a ON a.id = ca.artista_id WHERE ca.cancion_id IN (" + lista + ") "
        "ORDER BY ca.cancion_id, CASE ca.rol WHEN 'principal' THEN 0 WHEN 'invitado' THEN 1 ELSE 2 END, ca.orden");
    for (auto const& f : r)
        mapa[f["cancion_id"].as<int>()].push_back({f["cancion_id"].as<int>(), f["id"].as<int>(), f["nombre"].c_str(), f["rol"].c_str()});
    return mapa;
}
// El arreglo `artistas` del JSON de una canción: [{id, nombre, rol}].
// Se devuelve como vector (igual que `canciones` en los endpoints).
static std::vector<crow::json::wvalue> artistasJson(const std::vector<ArtistaFila>& filas) {
    std::vector<crow::json::wvalue> lista;
    for (const auto& f : filas)
        lista.push_back({{"id", f.id}, {"nombre", f.nombre}, {"rol", f.rol}});
    return lista;
}
// El campo derivado `artista`: los principales unidos con ", "
// (531: "Lil Wayne, Wiz Khalifa, Imagine Dragons"). Vacío si la canción
// no tiene filas de principal (entonces el llamador usa la columna).
static std::string artistaDerivado(const std::vector<ArtistaFila>& filas) {
    std::string d;
    for (const auto& f : filas) if (f.rol == "principal") { if (!d.empty()) d += ", "; d += f.nombre; }
    return d;
}
// Enriquecimiento compartido de lista y export (L11): una sola consulta
// de artistas + campo derivado `artista` (principales unidos con ", ").
// Con conRank=true añade además `rank_global` (la lista lo selecciona;
// el export no tiene esa columna).
static std::vector<crow::json::wvalue> cancionesConArtistas(pqxx::nontransaction& N, const pqxx::result& r, bool conRank) {
    std::vector<int> ids;
    for (auto const& fila : r) ids.push_back(fila["id"].as<int>());
    auto mapaArtistas = cargarArtistas(N, ids);
    std::vector<crow::json::wvalue> lista;
    for (auto const& fila : r) {
        crow::json::wvalue j = cancionJson(fila);
        if (conRank) j["rank_global"] = fila["rank_global"].as<int>();
        auto it = mapaArtistas.find(fila["id"].as<int>());
        if (it != mapaArtistas.end()) {
            j["artistas"] = artistasJson(it->second);
            std::string der = artistaDerivado(it->second);
            if (!der.empty()) j["artista"] = der;
        } else {
            j["artistas"] = artistasJson({});
        }
        lista.push_back(std::move(j));
    }
    return lista;
}

// Pool que se recupera solo: valida conexiones inactivas y recrea las perdidas (Supabase cierra las ociosas)
class ConnectionPool {
private:
    using Item = std::pair<std::unique_ptr<pqxx::connection>, std::chrono::steady_clock::time_point>;
    std::mutex mtx;
    std::condition_variable cv;
    std::queue<Item> pool;
    std::string connStr;
    int faltantes = 0; // conexiones perdidas pendientes de recrear

public:
    // Conexiones perezosas: el constructor NO abre conexiones. Si la base
    // esta caida al arrancar, el proceso sigue vivo y /api/salud responde;
    // get() crea cada conexion al pedirla y la recrea si falla, asi que el
    // servidor se recupera solo cuando la base vuelve. Antes se creaban las
    // 5 aqui: si fallaba, main devolvia 1 y Render entraba en ciclo de
    // reinicios sin que /api/salud respondiera nunca.
    ConnectionPool(const std::string& connectionString, int size) : connStr(connectionString), faltantes(size) {}

    std::unique_ptr<pqxx::connection> get() {
        std::unique_lock<std::mutex> lock(mtx);
        // Sin timeout, si las 5 conexiones estan ocupadas el endpoint se
        // queda colgado para siempre. A los 5 s se falla rapido (500) y el
        // frontend muestra "SIN CONEXION"; no se pierde ninguna conexion,
        // solo se deja de esperar.
        if (!cv.wait_for(lock, std::chrono::seconds(5), [this] { return !pool.empty() || faltantes > 0; }))
            throw ErrorPoolTimeout("timeout esperando conexion a la base (5 s)");
        std::unique_ptr<pqxx::connection> conn;
        bool validar = false;
        if (!pool.empty()) {
            conn = std::move(pool.front().first);
            validar = std::chrono::steady_clock::now() - pool.front().second > std::chrono::seconds(30);
            pool.pop();
        } else {
            --faltantes;
        }
        lock.unlock();
        bool recreada = false;
        try {
            if (conn && validar && conn->is_open()) { pqxx::nontransaction n(*conn); n.exec("SELECT 1"); }
            if (!conn || !conn->is_open()) {
                if (conn) recreada = true; // la del pool estaba cerrada: se recrea (G-L10)
                conn = std::make_unique<pqxx::connection>(connStr);
            }
        } catch (...) {
            logInfo("ConnectionPool", "Recreando conexion tras fallo al validar o abrir");
            try {
                conn = std::make_unique<pqxx::connection>(connStr);
            } catch (...) {
                std::lock_guard<std::mutex> g(mtx);
                ++faltantes;
                cv.notify_one();
                throw;
            }
        }
        if (recreada) logInfo("ConnectionPool", "Conexion del pool recreada tras cierre");
        return conn;
    }

    void free(std::unique_ptr<pqxx::connection> conn) {
        std::lock_guard<std::mutex> lock(mtx);
        if (conn && conn->is_open()) pool.push(std::make_pair(std::move(conn), std::chrono::steady_clock::now()));
        else ++faltantes;
        cv.notify_one();
    }
};

class ConnectionGuard {
private:
    ConnectionPool& pool;
    std::unique_ptr<pqxx::connection> conn;
public:
    ConnectionGuard(ConnectionPool& p) : pool(p), conn(p.get()) {}
    ~ConnectionGuard() { if (conn) pool.free(std::move(conn)); }
    pqxx::connection& get() { return *conn; }
};

int main() {
    crow::App<crow::CORSHandler> app;
    auto& cors = app.get_middleware<crow::CORSHandler>();
    const char* ao = std::getenv("ALLOWED_ORIGIN"); // vacio tambien vuelve al dominio de Vercel
    cors.global().headers("Content-Type", "Accept", "Origin", "X-Admin-Token").methods("POST"_method, "GET"_method, "PUT"_method, "DELETE"_method, "OPTIONS"_method).origin((ao && *ao) ? ao : "https://musica-plum-psi.vercel.app");

    std::string cadena_conexion = obtenerCadenaConexion();
    g_databaseUrl = cadena_conexion; // solo para sanitizar los logs (G-L7/S10), nunca se imprime

    // El pool ya no conecta al arrancar (conexiones perezosas): si la base
    // esta caida, el proceso sigue vivo, /api/salud responde y /api/salud/db
    // devuelve 503 hasta que la base vuelva. La cadena vacia sigue fallando
    // rapido en obtenerCadenaConexion() (error de configuracion, no de red).
    std::unique_ptr<ConnectionPool> db_pool = std::make_unique<ConnectionPool>(cadena_conexion, 5);
    std::cout << "[SYS] Servidor listo. Conexiones a Supabase bajo demanda (5 max)." << std::endl;

    // 0. SALUD (sin base de datos): un ping externo cada 10 min evita que Render duerma el servidor.
    // OJO: responde OK aunque la base este caida; es solo para despertar el proceso.
    CROW_ROUTE(app, "/api/salud")([]() {
        crow::json::wvalue res;
        res["status"] = "OK";
        res["admin_token_configurado"] = tokenConfigurado(); // booleano (S1): nunca el valor del token
        return respSegura(200, std::move(res));
    });

    // 0b. SALUD DE LA BASE (para monitoreo real): hace SELECT 1. Si la DB
    // esta caida devuelve 503. /api/salud no se toca: el ping que despierta
    // a Render debe seguir respondiendo aunque la base este caida.
    CROW_ROUTE(app, "/api/salud/db")([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            N.exec("SELECT 1");
            return respSegura(200, "OK");
        } catch (const std::exception &e) { logError("GET /api/salud/db", e.what()); return respSegura(503, "DB DOWN"); }
    });

    // 1. LEER (GET)
    CROW_ROUTE(app, "/api/canciones").methods("GET"_method)([&db_pool](const crow::request& req) {
        if (excedeLimiteLectura(req)) return respuestaLimiteLectura("GET /api/canciones");
        try {
            int pagina = std::min(100000, std::max(1, parseEntero(req.url_params.get("pagina"), 1)));
            std::string buscar = req.url_params.get("buscar") ? req.url_params.get("buscar") : "";
            if (buscar.size() > 100) buscar = buscar.substr(0, 100); // S5: tope de 100 caracteres
            std::string orden_param = req.url_params.get("orden") ? req.url_params.get("orden") : "top";
            std::string genero = req.url_params.get("genero") ? req.url_params.get("genero") : "todos";
            // Filtro por artista (diseno-artistas.md): ?artista=<id> (cualquier
            // rol) y &rol=principal opcional. Un id <= 0 o un rol fuera de la
            // lista no filtra (el frontend no manda filtro por artista aún).
            int artistaId = parseEntero(req.url_params.get("artista"), 0);
            std::string rolFiltro = req.url_params.get("rol") ? req.url_params.get("rol") : "";
            if (!rolValido(rolFiltro)) rolFiltro = "";
            
            int limite = 50;
            int offset = (pagina - 1) * limite;
            std::string term = buscar.empty() ? "" : "%" + escaparLike(buscar) + "%";

            std::string order_sql = "calificacion_final DESC NULLS LAST," + DESEMPATE;
            std::string extra_cond = "";
            if (orden_param == "peores") { order_sql = "calificacion_final ASC," + DESEMPATE_ASC; extra_cond = " AND calificacion_final > 0"; }
            else if (orden_param == "ritmo" || orden_param == "letras" || orden_param == "coro" || orden_param == "importancia")
                order_sql = "COALESCE(" + orden_param + ", 0) DESC, calificacion_final DESC NULLS LAST," + DESEMPATE; // lista blanca: sin riesgo de inyeccion
            else if (orden_param == "recientes") order_sql = "id DESC";
            else if (orden_param == "alfabetico") order_sql = "titulo ASC, id ASC"; // mismo titulo, orden fijo
            else if (orden_param == "sin_calificar") extra_cond = " AND COALESCE(calificacion_final, 0) = 0"; // NULL tambien es sin calificar

            // Rango por nota (histograma): se pasa como parametro, no
            // concatenado. -1/999 son "sin filtro" (la nota va de 0 a 20).
            double nota_min = parseDoble(req.url_params.get("nota_min"), -1);
            double nota_max = parseDoble(req.url_params.get("nota_max"), -1);
            double f_min = nota_min >= 0 ? nota_min : -1, f_max = nota_max >= 0 ? nota_max : 999;

            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());

            // La búsqueda coincide con TODOS los nombres de artista
            // (principal, invitado, productor), no solo con el principal:
            // el EXISTS cubre los invitados y productores de la tabla nueva.
            // La columna artista sigue cubriendo al principal (compat).
            std::string cond_buscar = "($1 = '' OR LOWER(titulo) LIKE LOWER($1) OR LOWER(artista) LIKE LOWER($1) OR EXISTS (SELECT 1 FROM cancion_artistas ca JOIN artistas a ON a.id = ca.artista_id WHERE ca.cancion_id = canciones.id AND LOWER(a.nombre) LIKE LOWER($1)))";
            std::string count_sql = "SELECT COUNT(*) FROM canciones WHERE " + cond_buscar + " AND ($2 = 'todos' OR genero = $2)" + extra_cond + " AND COALESCE(calificacion_final, 0) >= $3 AND COALESCE(calificacion_final, 0) <= $4 AND ($5 = 0 OR EXISTS (SELECT 1 FROM cancion_artistas ca WHERE ca.cancion_id = canciones.id AND ca.artista_id = $5 AND ($6 = '' OR ca.rol = $6)))";
            int total_canciones = N.exec_params(count_sql, term, genero, f_min, f_max, artistaId, rolFiltro)[0][0].as<int>();

            std::string select_sql =
                "WITH ranking AS (SELECT id, RANK() OVER (ORDER BY calificacion_final DESC NULLS LAST," + DESEMPATE + ") AS rank_global FROM canciones) "
                "SELECT canciones.id, titulo, artista, COALESCE(calificacion_final, 0) as calificacion_final, ranking.rank_global, "
                "COALESCE(genero, 'Por clasificar') as genero, COALESCE(etiqueta_especial, 'Original') as etiqueta_especial, "
                "ritmo, letras, coro, "
                "importancia, COALESCE(arte_visual, 0) as arte_visual, "
                "COALESCE(antiguedad, false) as antiguedad, COALESCE(nostalgia, false) as nostalgia, "
                "COALESCE(descubrimiento_terceros, false) as desc_terc, COALESCE(complejidad, false) as complejidad, " 
                "COALESCE(instrumental, false) as instrumental, COALESCE(banda_sonora, false) as banda_sonora "
                "FROM canciones JOIN ranking ON ranking.id = canciones.id WHERE " + cond_buscar + " "
                "AND ($2 = 'todos' OR genero = $2)" + extra_cond + " AND COALESCE(calificacion_final, 0) >= $5 AND COALESCE(calificacion_final, 0) <= $6 AND ($7 = 0 OR EXISTS (SELECT 1 FROM cancion_artistas ca WHERE ca.cancion_id = canciones.id AND ca.artista_id = $7 AND ($8 = '' OR ca.rol = $8))) ORDER BY " + order_sql + " LIMIT $3 OFFSET $4";
            
            pqxx::result r = N.exec_params(select_sql, term, genero, limite, offset, f_min, f_max, artistaId, rolFiltro);

            // Artistas de las canciones de esta página, con el campo
            // derivado (L11, compartida con el export).
            std::vector<crow::json::wvalue> lista = cancionesConArtistas(N, r, true);

            crow::json::wvalue res;
            res["total_canciones"] = total_canciones;
            res["pagina_actual"] = pagina;
            res["total_paginas"] = (total_canciones + limite - 1) / std::max(1, limite);
            res["canciones"] = std::move(lista);
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/canciones", e); }
    });

    // 2. ESTADÍSTICAS (GET)
    CROW_ROUTE(app, "/api/canciones/stats").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            crow::json::wvalue res;
            pqxx::row f = N.exec1("SELECT COUNT(*), COALESCE(AVG(calificacion_final) FILTER (WHERE calificacion_final > 0), 0), "
                "COUNT(*) FILTER (WHERE calificacion_final >= 19), COUNT(*) FILTER (WHERE COALESCE(calificacion_final, 0) = 0), "
                "COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY calificacion_final) FILTER (WHERE calificacion_final > 0), 0), "
                "COALESCE(MIN(calificacion_final) FILTER (WHERE calificacion_final > 0), 0), "
                "COALESCE(MAX(calificacion_final), 0) FROM canciones");
            res["total"] = f[0].as<int>();
            res["promedio"] = f[1].as<double>();
            res["obras_maestras"] = f[2].as<int>();
            res["sin_calificar"] = f[3].as<int>();
            res["mediana"] = f[4].as<double>();
            res["minimo"] = f[5].as<double>();
            res["maximo"] = f[6].as<double>();
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/canciones/stats", e); }
    });

    // 2b. HISTOGRAMA DE CALIFICACIONES (GET) — reemplaza al radar.
    // Un solo GROUP BY en SQL: no baja las 677 canciones al frontend.
    CROW_ROUTE(app, "/api/canciones/histograma").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                // La consulta va en subconsulta: Postgres no deja usar el alias
                // 'rango' dentro del CASE del ORDER BY con GROUP BY
                // (error en vivo: column "rango" does not exist). Afuera 'rango'
                // ya es una columna real y el ORDER BY funciona.
                "SELECT rango, total FROM ("
                "SELECT CASE WHEN COALESCE(calificacion_final,0) = 0 THEN 'sin_calificar' "
                "WHEN calificacion_final > 0 AND calificacion_final < 10 THEN 'menos-10' "
                "WHEN calificacion_final < 12 THEN '10-12' WHEN calificacion_final < 14 THEN '12-14' "
                "WHEN calificacion_final < 16 THEN '14-16' WHEN calificacion_final < 18 THEN '16-18' "
                "WHEN calificacion_final < 19 THEN '18-19' ELSE '19-20' END AS rango, COUNT(*) AS total "
                "FROM canciones GROUP BY 1) s "
                "ORDER BY CASE WHEN rango = 'sin_calificar' THEN 99 WHEN rango = 'menos-10' THEN 0 "
                "ELSE CAST(SUBSTRING(rango FROM '^[0-9]+') AS INT) END");
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r)
                lista.push_back({{"rango", f["rango"].c_str()}, {"total", f["total"].as<int>()}});
            crow::json::wvalue res;
            res["histograma"] = std::move(lista);
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/canciones/histograma", e); }
    });

    // 2c. EXPORTAR TODO EL CATALOGO (GET)
    CROW_ROUTE(app, "/api/canciones/exportar").methods("GET"_method)([&db_pool](const crow::request& req) {
        if (excedeLimiteLectura(req)) return respuestaLimiteLectura("GET /api/canciones/exportar");
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                "SELECT id, titulo, artista, COALESCE(genero,'Por clasificar') AS genero, COALESCE(etiqueta_especial,'Original') AS etiqueta_especial, "
                "ritmo, letras, coro, importancia, "
                "COALESCE(arte_visual,0) AS arte_visual, COALESCE(antiguedad,false) AS antiguedad, COALESCE(nostalgia,false) AS nostalgia, "
                "COALESCE(descubrimiento_terceros,false) AS desc_terc, COALESCE(complejidad,false) AS complejidad, "
                "COALESCE(instrumental,false) AS instrumental, COALESCE(banda_sonora,false) AS banda_sonora, "
                "COALESCE(calificacion_final,0) AS calificacion_final FROM canciones ORDER BY id");
            // Artistas del export, con el campo derivado (L11, compartida
            // con la lista).
            std::vector<crow::json::wvalue> lista = cancionesConArtistas(N, r, false);
            crow::json::wvalue res;
            res["canciones"] = std::move(lista);
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/canciones/exportar", e); }
    });

    // 2d. PROMEDIO POR GENERO (GET)
    CROW_ROUTE(app, "/api/canciones/generos").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                "SELECT COALESCE(genero,'Por clasificar') AS genero, COUNT(*) AS total, "
                "COALESCE(AVG(calificacion_final) FILTER (WHERE calificacion_final > 0), 0) AS promedio "
                "FROM canciones GROUP BY 1 ORDER BY promedio DESC, total DESC");
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r)
                lista.push_back({{"genero", f["genero"].c_str()}, {"total", f["total"].as<int>()}, {"promedio", f["promedio"].as<double>()}});
            crow::json::wvalue res;
            res["generos"] = std::move(lista);
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/canciones/generos", e); }
    });

    // 2e. ARTISTAS (GET) — lista con conteos (diseno-artistas.md).
    // canciones = apariciones como principal o invitado (el productor NO
    // cuenta como aparición: producir no es cantar); principales = como
    // principal. Aparecen TODOS los artistas de la tabla, incluidos los
    // productores puros (0 canciones, 0 principales): decisión de Nova
    // 2026-11-16 ("haz lo que es mejor") — la lista completa es mejor
    // que una filtrada, y el autocompletado del productor los necesita.
    // Resuelve la idea pendiente del conteo por artista ("Karol G · 27").
    CROW_ROUTE(app, "/api/artistas").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                "SELECT a.id, a.nombre, "
                "COUNT(DISTINCT ca.cancion_id) FILTER (WHERE ca.rol IN ('principal','invitado')) AS canciones, "
                "COUNT(DISTINCT ca.cancion_id) FILTER (WHERE ca.rol = 'principal') AS principales "
                "FROM artistas a LEFT JOIN cancion_artistas ca ON ca.artista_id = a.id "
                "GROUP BY a.id, a.nombre "
                "ORDER BY canciones DESC, a.nombre ASC");
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r)
                lista.push_back({{"id", f["id"].as<int>()}, {"nombre", f["nombre"].c_str()}, {"canciones", f["canciones"].as<int>()}, {"principales", f["principales"].as<int>()}});
            crow::json::wvalue res;
            res["artistas"] = std::move(lista);
            return respSegura(200, res);
        } catch (const std::exception &e) { return respuestaErrorDb("GET /api/artistas", e); }
    });

    // 3. CREAR (POST)
    // NOTA S5: Crow 1.3.4 no expone un límite de tamaño de cuerpo sin
    // middleware propio ni dependencias nuevas; no se aplica aquí.
    CROW_ROUTE(app, "/api/canciones").methods("POST"_method)([&db_pool](const crow::request& req) {
        if (int st = autorizado(req, "POST /api/canciones")) return respuestaAuth(st);
        try {
            auto body = crow::json::load(req.body);
            if (!body || body.t() != crow::json::type::Object) return rechazo("POST /api/canciones", 400, "JSON no válido.");
            if (!body.has("titulo") || !body.has("artista") || !esTexto(body["titulo"]) || !esTexto(body["artista"])) return rechazo("POST /api/canciones", 400, "Faltan datos.");

            std::string titulo = trim(std::string(body["titulo"].s()));
            std::string artista = trim(std::string(body["artista"].s()));
            std::string genero = textoJson(body["genero"], "Por clasificar");
            std::string etiqueta = textoJson(body["etiqueta"], "Original");
            bool instrumental = boolJson(body["instrumental"], false);
            bool banda_sonora = boolJson(body["banda_sonora"], false);

            // Artistas: validación compartida con PUT /info (L10): si viene
            // el arreglo manda él (con al menos un principal); si no, el
            // artista plano es un solo principal (compatibilidad con el
            // frontend actual y con herramientas).
            std::vector<ArtistaEntrada> entradas;
            std::string errArt;
            if (!leerEntradasArtistas(body, artista, entradas, errArt)) return rechazo("POST /api/canciones", 400, errArt);

            if (std::string err = validarTituloArtista(titulo, artista); !err.empty()) return rechazo("POST /api/canciones", 400, err);
            if (!enLista(genero, GENEROS_VALIDOS) || !enLista(etiqueta, ETIQUETAS_VALIDAS)) return rechazo("POST /api/canciones", 400, "Genero o tipo no valido.");

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());

            // Los artistas se resuelven (se crean si hace falta) en la misma
            // transacción que la canción: si el duplicado aborta, los
            // artistas nuevos también se revierten. El derivado (con los
            // nombres guardados) es el `artista` de la canción.
            std::string derivado;
            auto resueltos = resolverArtistas(W, entradas, derivado);
            if (!derivado.empty()) artista = derivado;
            
            pqxx::result check = W.exec_params("SELECT id FROM canciones WHERE LOWER(titulo) = LOWER($1) AND LOWER(artista) = LOWER($2)", titulo, artista);
            if (!check.empty()) {
                W.abort();
                return rechazo("POST /api/canciones", 409, "La cancion ya existe en el catalogo.");
            }

            pqxx::result r;
            try { r = W.exec_params("INSERT INTO canciones (titulo, artista, genero, etiqueta_especial, instrumental, banda_sonora) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", titulo, artista, genero, etiqueta, instrumental, banda_sonora); }
            catch (const pqxx::unique_violation&) { W.abort(); return rechazo("POST /api/canciones", 409, "La cancion ya existe en el catalogo."); }
            int nuevoId = r[0][0].as<int>();
            insertarArtistasCancion(W, nuevoId, resueltos);
            W.commit();
            logInfo("POST /api/canciones", "id=" + std::to_string(nuevoId));
            return respSegura(201, crow::json::wvalue({{"id", nuevoId}}));
        } catch (const std::exception &e) { return respuestaErrorDb("POST /api/canciones", e); }
    });

    // 4. CALIFICAR (PUT)
    CROW_ROUTE(app, "/api/canciones/<int>/calificar").methods("PUT"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req, "PUT /api/canciones/<id>/calificar")) return respuestaAuth(st);
        if (id <= 0) return rechazo("PUT /api/canciones/<id>/calificar", 400, "ID invalido.", id);
        try {
            auto b = crow::json::load(req.body);
            if (!b || b.t() != crow::json::type::Object) return rechazo("PUT /api/canciones/<id>/calificar", 400, "JSON no válido.", id);

            // Validación estricta (E2): los 9 campos son obligatorios; nada
            // de clamp silencioso ni de valores por defecto (un PUT parcial
            // antes borraba la nota con ceros). Base 0-10, importancia 0-5,
            // arte_visual 0/1, bonos booleanos o 0/1.
            const char* camposNum[] = {"ritmo", "letras", "coro", "importancia", "arte_visual"};
            for (const char* c : camposNum)
                if (!b.has(c)) return rechazo("PUT /api/canciones/<id>/calificar", 400, "Faltan campos de calificación.", id);
            const char* camposBono[] = {"antiguedad", "nostalgia", "descubrimiento_terceros", "complejidad"};
            for (const char* c : camposBono)
                if (!b.has(c)) return rechazo("PUT /api/canciones/<id>/calificar", 400, "Faltan campos de calificación.", id);
            if (!esNumero(b["ritmo"]) || !esNumero(b["letras"]) || !esNumero(b["coro"]) || !esNumero(b["importancia"]) || !esNumero(b["arte_visual"]))
                return rechazo("PUT /api/canciones/<id>/calificar", 400, "La calificación debe ser numérica.", id);
            double ritmo = b["ritmo"].d();
            double letras = b["letras"].d();
            double coro = b["coro"].d();
            double importancia = b["importancia"].d();
            double arte_visual = b["arte_visual"].d();
            if (ritmo < 0 || ritmo > 10 || letras < 0 || letras > 10 || coro < 0 || coro > 10)
                return rechazo("PUT /api/canciones/<id>/calificar", 400, "La base debe estar entre 0 y 10.", id);
            if (importancia < 0 || importancia > 5)
                return rechazo("PUT /api/canciones/<id>/calificar", 400, "La importancia debe estar entre 0 y 5.", id);
            if (arte_visual != 0 && arte_visual != 1)
                return rechazo("PUT /api/canciones/<id>/calificar", 400, "arte_visual debe ser 0 o 1.", id);
            bool antiguedad, nostalgia, desc_terceros, complejidad;
            if (!esBooleanoO01(b["antiguedad"], antiguedad) || !esBooleanoO01(b["nostalgia"], nostalgia) || !esBooleanoO01(b["descubrimiento_terceros"], desc_terceros) || !esBooleanoO01(b["complejidad"], complejidad))
                return rechazo("PUT /api/canciones/<id>/calificar", 400, "Los bonos deben ser booleanos o 0/1.", id);

            double cal_final = (ritmo * 0.35) + (letras * 0.25) + (coro * 0.40) + 
                               antiguedad + nostalgia + desc_terceros + complejidad + importancia + arte_visual;

            // La nota se guarda con 2 decimales, como las 677 que ya hay
            // (promedio en vivo 16.4847 = promedio de los valores guardados,
            // no de los totales exactos de 3 decimales). Sin este redondeo,
            // un total .xx5 se guardaria con 3 decimales y el filtro del
            // histograma ([18, 18.99]) lo dejaria fuera de su propio rango.
            cal_final = std::round(cal_final * 100.0) / 100.0;

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            pqxx::result r = W.exec_params(
                "UPDATE canciones SET ritmo=$1, letras=$2, coro=$3, antiguedad=$4, nostalgia=$5, "
                "descubrimiento_terceros=$6, complejidad=$7, importancia=$8, arte_visual=$9, calificacion_final=$10 WHERE id=$11",
                ritmo, letras, coro, antiguedad, nostalgia, desc_terceros, complejidad, importancia, arte_visual, cal_final, id
            );
            if (r.affected_rows() == 0) { W.abort(); return rechazo("PUT /api/canciones/<id>/calificar", 404, "No encontrada.", id); }
            W.commit();
            logInfo("PUT /api/canciones/<id>/calificar", "id=" + std::to_string(id) + " nota=" + std::to_string(cal_final));
            return respSegura(200, crow::json::wvalue({{"calificacion_final", cal_final}}));
        } catch (const std::exception &e) { return respuestaErrorDb("PUT /api/canciones/<id>/calificar", e); }
    });

    // 5. MODIFICAR INFO (PUT)
    CROW_ROUTE(app, "/api/canciones/<int>/info").methods("PUT"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req, "PUT /api/canciones/<id>/info")) return respuestaAuth(st);
        if (id <= 0) return rechazo("PUT /api/canciones/<id>/info", 400, "ID invalido.", id);
        try {
            auto body = crow::json::load(req.body);
            if (!body || body.t() != crow::json::type::Object) return rechazo("PUT /api/canciones/<id>/info", 400, "JSON no válido.", id);
            if (!body.has("titulo") || !body.has("artista") || !esTexto(body["titulo"]) || !esTexto(body["artista"])) return rechazo("PUT /api/canciones/<id>/info", 400, "Faltan campos.", id);

            std::string titulo = trim(std::string(body["titulo"].s()));
            std::string artista = trim(std::string(body["artista"].s()));
            bool instrumental = boolJson(body["instrumental"], false);
            bool banda_sonora = boolJson(body["banda_sonora"], false);

            if (std::string err = validarTituloArtista(titulo, artista); !err.empty()) return rechazo("PUT /api/canciones/<id>/info", 400, err, id);
            // Artistas: validación compartida con POST (L10), sin DB.
            std::vector<ArtistaEntrada> entradas;
            std::string errArt;
            if (!leerEntradasArtistas(body, artista, entradas, errArt)) return rechazo("PUT /api/canciones/<id>/info", 400, errArt, id);

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            // Existencia ANTES de validar género/etiqueta (E13): un id
            // inexistente es 404 aunque el género también sea inválido.
            pqxx::result actual = W.exec_params("SELECT genero, etiqueta_especial FROM canciones WHERE id = $1", id);
            if (actual.empty()) { W.abort(); return rechazo("PUT /api/canciones/<id>/info", 404, "No encontrado.", id); }
            std::string genero_actual = actual[0][0].is_null() ? "Por clasificar" : actual[0][0].c_str();
            std::string etiqueta_actual = actual[0][1].is_null() ? "Original" : actual[0][1].c_str();
            // Si género o etiqueta no vienen, se conserva el valor actual
            // (S12): el default "Por clasificar"/"Original" solo tiene
            // sentido en POST.
            std::string genero = body.has("genero") ? textoJson(body["genero"], genero_actual) : genero_actual;
            std::string etiqueta = body.has("etiqueta") ? textoJson(body["etiqueta"], etiqueta_actual) : etiqueta_actual;
            if (!enLista(etiqueta, ETIQUETAS_VALIDAS)) { W.abort(); return rechazo("PUT /api/canciones/<id>/info", 400, "Genero o tipo no valido.", id); }
            // El género nuevo debe estar en la lista, salvo que sea el género
            // actual de la canción (géneros heredados: Hip Hop, Otro, OST,
            // 79 canciones que la fase DB unificará; editar no debe obligar
            // a reclasificarla ya — auditoría G, ronda 1: antes el modal
            // enviaba el género heredado y el backend devolvía 400).
            if (!enLista(genero, GENEROS_VALIDOS) && genero != genero_actual) { W.abort(); return rechazo("PUT /api/canciones/<id>/info", 400, "Genero o tipo no valido.", id); }
            // Artistas: se reemplazan las filas de la canción en la misma
            // transacción que el UPDATE: si algo falla, todo se revierte.
            std::string derivado;
            auto resueltos = resolverArtistas(W, entradas, derivado);
            if (!derivado.empty()) artista = derivado;
            pqxx::result r;
            try { r = W.exec_params("UPDATE canciones SET titulo = $1, artista = $2, genero = $3, etiqueta_especial = $4, instrumental = $5, banda_sonora = $6 WHERE id = $7", titulo, artista, genero, etiqueta, instrumental, banda_sonora, id); }
            catch (const pqxx::unique_violation&) { W.abort(); return rechazo("PUT /api/canciones/<id>/info", 409, "Ya existe otra cancion igual.", id); }
            if (r.affected_rows() == 0) { W.abort(); return rechazo("PUT /api/canciones/<id>/info", 404, "No encontrado.", id); }
            W.exec_params("DELETE FROM cancion_artistas WHERE cancion_id = $1", id);
            insertarArtistasCancion(W, id, resueltos);
            W.commit();
            logInfo("PUT /api/canciones/<id>/info", "id=" + std::to_string(id));
            return respSegura(200, "OK");
        } catch (const std::exception &e) { return respuestaErrorDb("PUT /api/canciones/<id>/info", e); }
    });

    // 6. ELIMINAR (DELETE)
    CROW_ROUTE(app, "/api/canciones/<int>").methods("DELETE"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req, "DELETE /api/canciones/<id>")) return respuestaAuth(st);
        if (id <= 0) return rechazo("DELETE /api/canciones/<id>", 400, "ID invalido.", id);
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            if (W.exec_params("DELETE FROM canciones WHERE id = $1", id).affected_rows() == 0) { W.abort(); return rechazo("DELETE /api/canciones/<id>", 404, "No encontrado.", id); }
            W.commit();
            logInfo("DELETE /api/canciones/<id>", "id=" + std::to_string(id));
            return respSegura(200, "OK");
        } catch (const std::exception &e) { return respuestaErrorDb("DELETE /api/canciones/<id>", e); }
    });

    // LECTURA DEL PUERTO DINÁMICO DE RENDER
    int port = std::min(65535, std::max(1, parseEntero(std::getenv("PORT"), 18080)));
    
    // Fail-closed (S1/E11): sin ADMIN_TOKEN válido las escrituras
    // devuelven 401; el arranque NO se cierra para que las lecturas sigan.
    if (!tokenConfigurado()) std::cerr << "[" << marcaTiempo() << "] [AVISO CRITICO] ADMIN_TOKEN no definido o con menos de 24 caracteres: las escrituras devolveran 401 hasta configurarlo con al menos 24 caracteres aleatorios." << std::endl;
    std::cout << "[SYS] Iniciando servidor en el puerto asignado: " << port << std::endl;
    app.bindaddr("0.0.0.0").port(port).multithreaded().run();
}