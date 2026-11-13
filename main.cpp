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

// La cadena de conexion SOLO viene de la variable de entorno (nunca en el codigo)
std::string obtenerCadenaConexion() {
    const char* env = std::getenv("DATABASE_URL");
    if (env == nullptr || std::string(env).empty()) {
        std::cerr << "[ERROR CRITICO]: define la variable de entorno DATABASE_URL" << std::endl;
        std::exit(1);
    }
    return std::string(env);
}

// Escritura protegida por ADMIN_TOKEN (cabecera X-Admin-Token). Devuelve 0 si pasa, 401 si la clave falla
// y 429 tras 5 fallos seguidos desde la misma IP en 10 minutos.
static int autorizado(const crow::request& req) {
    const char* token = std::getenv("ADMIN_TOKEN");
    if (token == nullptr || *token == '\0') return 0;
    static std::mutex m;
    static std::map<std::string, std::pair<int, std::chrono::steady_clock::time_point>> fallos;
    std::string ip = req.get_header_value("X-Forwarded-For"); // Render agrega la IP real al final
    size_t coma = ip.rfind(',');
    if (coma != std::string::npos) ip = ip.substr(coma + 1);
    size_t ini = ip.find_first_not_of(' ');
    ip = (ini == std::string::npos) ? req.remote_ip_address : ip.substr(ini);
    auto ahora = std::chrono::steady_clock::now();
    std::lock_guard<std::mutex> g(m);
    auto& f = fallos[ip];
    if (ahora - f.second > std::chrono::minutes(10)) f = std::make_pair(0, ahora);
    if (f.first >= 5) return 429;
    if (req.get_header_value("X-Admin-Token") == token) { f.first = 0; return 0; }
    ++f.first;
    return 401;
}

static std::string trim(const std::string& s) {
    size_t inicio = s.find_first_not_of(" \t\n\r");
    if (inicio == std::string::npos) return "";
    size_t fin = s.find_last_not_of(" \t\n\r");
    return s.substr(inicio, fin - inicio + 1);
}

static double clamp(double v, double lo, double hi) {
    return std::max(lo, std::min(hi, v));
}

static std::string escaparLike(const std::string& s) { // % y _ del usuario se buscan literalmente
    std::string o;
    for (char ch : s) { if (ch == '\\' || ch == '%' || ch == '_') o += '\\'; o += ch; }
    return o;
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
    ConnectionPool(const std::string& connectionString, int size) : connStr(connectionString) {
        for (int i = 0; i < size; ++i)
            pool.push(std::make_pair(std::make_unique<pqxx::connection>(connStr), std::chrono::steady_clock::now()));
    }

    std::unique_ptr<pqxx::connection> get() {
        std::unique_lock<std::mutex> lock(mtx);
        cv.wait(lock, [this] { return !pool.empty() || faltantes > 0; });
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
        try {
            if (conn && validar && conn->is_open()) { pqxx::nontransaction n(*conn); n.exec("SELECT 1"); }
            if (!conn || !conn->is_open()) conn = std::make_unique<pqxx::connection>(connStr);
        } catch (...) {
            try {
                conn = std::make_unique<pqxx::connection>(connStr);
            } catch (...) {
                std::lock_guard<std::mutex> g(mtx);
                ++faltantes;
                cv.notify_one();
                throw;
            }
        }
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
    cors.global().headers("Content-Type", "Accept", "Origin", "X-Admin-Token").methods("POST"_method, "GET"_method, "PUT"_method, "DELETE"_method, "OPTIONS"_method).origin(std::getenv("ALLOWED_ORIGIN") ? std::getenv("ALLOWED_ORIGIN") : "*");

    std::string cadena_conexion = obtenerCadenaConexion();

    std::unique_ptr<ConnectionPool> db_pool;
    try {
        db_pool = std::make_unique<ConnectionPool>(cadena_conexion, 5);
        std::cout << "[SYS] Conexion exitosa con Supabase." << std::endl;
    } catch (const std::exception& e) {
        std::cerr << "[ERROR CRITICO DE CONEXION]: " << e.what() << std::endl;
        return 1;
    }

    // 0. SALUD (sin base de datos): un ping externo cada 10 min evita que Render duerma el servidor
    CROW_ROUTE(app, "/api/salud")([]() { return crow::response(200, "OK"); });

    // 1. LEER (GET)
    CROW_ROUTE(app, "/api/canciones").methods("GET"_method)([&db_pool](const crow::request& req) {
        try {
            int pagina = req.url_params.get("pagina") ? std::min(100000, std::max(1, std::stoi(req.url_params.get("pagina")))) : 1;
            std::string buscar = req.url_params.get("buscar") ? req.url_params.get("buscar") : "";
            std::string orden_param = req.url_params.get("orden") ? req.url_params.get("orden") : "top";
            std::string genero = req.url_params.get("genero") ? req.url_params.get("genero") : "todos";
            
            int limite = 50;
            int offset = (pagina - 1) * limite;
            std::string term = buscar.empty() ? "" : "%" + escaparLike(buscar) + "%";

            std::string order_sql = "calificacion_final DESC NULLS LAST, id ASC";
            std::string extra_cond = "";
            if (orden_param == "peores") { order_sql = "calificacion_final ASC, id ASC"; extra_cond = " AND calificacion_final > 0"; }
            else if (orden_param == "ritmo" || orden_param == "letras" || orden_param == "coro" || orden_param == "importancia")
                order_sql = "COALESCE(" + orden_param + ", 0) DESC, calificacion_final DESC NULLS LAST, id ASC"; // lista blanca: sin riesgo de inyeccion
            else if (orden_param == "recientes") order_sql = "id DESC";
            else if (orden_param == "alfabetico") order_sql = "titulo ASC";
            else if (orden_param == "sin_calificar") extra_cond = " AND calificacion_final = 0";

            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());

            std::string count_sql = "SELECT COUNT(*) FROM canciones WHERE ($1 = '' OR LOWER(titulo) LIKE LOWER($1) OR LOWER(artista) LIKE LOWER($1)) AND ($2 = 'todos' OR genero = $2)" + extra_cond;
            int total_canciones = N.exec_params(count_sql, term, genero)[0][0].as<int>();

            std::string select_sql = 
                "SELECT id, titulo, artista, COALESCE(calificacion_final, 0) as calificacion_final, "
                "COALESCE(genero, 'Otro') as genero, COALESCE(etiqueta_especial, 'Original') as etiqueta_especial, "
                "COALESCE(ritmo, 5) as ritmo, COALESCE(letras, 5) as letras, COALESCE(coro, 5) as coro, "
                "COALESCE(importancia, 2.5) as importancia, COALESCE(arte_visual, 0) as arte_visual, "
                "COALESCE(antiguedad, false) as antiguedad, COALESCE(nostalgia, false) as nostalgia, "
                "COALESCE(descubrimiento_terceros, false) as desc_terc, COALESCE(complejidad, false) as complejidad "
                "FROM canciones WHERE ($1 = '' OR LOWER(titulo) LIKE LOWER($1) OR LOWER(artista) LIKE LOWER($1)) "
                "AND ($2 = 'todos' OR genero = $2)" + extra_cond + " ORDER BY " + order_sql + " LIMIT $3 OFFSET $4";
            
            pqxx::result r = N.exec_params(select_sql, term, genero, limite, offset);

            std::vector<crow::json::wvalue> lista;
            for (auto const& fila : r) {
                lista.push_back({
                    {"id", fila["id"].as<int>()},
                    {"titulo", fila["titulo"].c_str()},
                    {"artista", fila["artista"].c_str()},
                    {"calificacion_final", fila["calificacion_final"].as<double>()},
                    {"genero", fila["genero"].c_str()},
                    {"etiqueta", fila["etiqueta_especial"].c_str()},
                    {"ritmo", fila["ritmo"].as<double>()},
                    {"letras", fila["letras"].as<double>()},
                    {"coro", fila["coro"].as<double>()},
                    {"importancia", fila["importancia"].as<double>()},
                    {"arte_visual", fila["arte_visual"].as<double>()},
                    {"antiguedad", fila["antiguedad"].as<bool>()},
                    {"nostalgia", fila["nostalgia"].as<bool>()},
                    {"descubrimiento", fila["desc_terc"].as<bool>()},
                    {"complejidad", fila["complejidad"].as<bool>()}
                });
            }

            crow::json::wvalue res;
            res["total_canciones"] = total_canciones;
            res["pagina_actual"] = pagina;
            res["total_paginas"] = (total_canciones + limite - 1) / std::max(1, limite);
            res["canciones"] = std::move(lista);
            return crow::response(200, res);
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 2. ESTADÍSTICAS (GET)
    CROW_ROUTE(app, "/api/canciones/stats").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            crow::json::wvalue res;
            pqxx::row f = N.exec1("SELECT COUNT(*), COALESCE(AVG(calificacion_final) FILTER (WHERE calificacion_final > 0), 0), "
                "COUNT(*) FILTER (WHERE calificacion_final >= 19), COUNT(*) FILTER (WHERE COALESCE(calificacion_final, 0) = 0) FROM canciones");
            res["total"] = f[0].as<int>();
            res["promedio"] = f[1].as<double>();
            res["obras_maestras"] = f[2].as<int>();
            res["sin_calificar"] = f[3].as<int>();
            return crow::response(200, res);
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 2b. TOP N PARA LA GRAFICA DE RADAR (GET)
    CROW_ROUTE(app, "/api/canciones/top").methods("GET"_method)([&db_pool](const crow::request& req) {
        try {
            int n = req.url_params.get("n") ? std::stoi(req.url_params.get("n")) : 5;
            n = std::max(1, std::min(n, 8));
            std::string por = req.url_params.get("por") ? req.url_params.get("por") : "general";
            std::string orden = "calificacion_final DESC, id ASC";
            if (por == "ritmo" || por == "letras" || por == "coro" || por == "importancia") // lista blanca
                orden = por + " DESC, calificacion_final DESC, id ASC";
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec_params(
                "SELECT id, titulo, artista, calificacion_final, COALESCE(ritmo,0) AS ritmo, COALESCE(letras,0) AS letras, "
                "COALESCE(coro,0) AS coro, COALESCE(importancia,0) AS importancia FROM canciones "
                "WHERE calificacion_final > 0 ORDER BY " + orden + " LIMIT $1", n);
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r) {
                lista.push_back({
                    {"id", f["id"].as<int>()}, {"titulo", f["titulo"].c_str()}, {"artista", f["artista"].c_str()},
                    {"calificacion_final", f["calificacion_final"].as<double>()}, {"ritmo", f["ritmo"].as<double>()},
                    {"letras", f["letras"].as<double>()}, {"coro", f["coro"].as<double>()}, {"importancia", f["importancia"].as<double>()}
                });
            }
            crow::json::wvalue res;
            res["canciones"] = std::move(lista);
            return crow::response(200, res);
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 2c. EXPORTAR TODO EL CATALOGO (GET)
    CROW_ROUTE(app, "/api/canciones/exportar").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                "SELECT id, titulo, artista, COALESCE(genero,'Otro') AS genero, COALESCE(etiqueta_especial,'Original') AS etiqueta, "
                "COALESCE(ritmo,0) AS ritmo, COALESCE(letras,0) AS letras, COALESCE(coro,0) AS coro, COALESCE(importancia,0) AS importancia, "
                "COALESCE(arte_visual,0) AS arte_visual, COALESCE(antiguedad,false) AS antiguedad, COALESCE(nostalgia,false) AS nostalgia, "
                "COALESCE(descubrimiento_terceros,false) AS descubrimiento, COALESCE(complejidad,false) AS complejidad, "
                "COALESCE(calificacion_final,0) AS calificacion_final FROM canciones ORDER BY id");
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r) {
                lista.push_back({
                    {"id", f["id"].as<int>()}, {"titulo", f["titulo"].c_str()}, {"artista", f["artista"].c_str()},
                    {"genero", f["genero"].c_str()}, {"etiqueta", f["etiqueta"].c_str()},
                    {"ritmo", f["ritmo"].as<double>()}, {"letras", f["letras"].as<double>()}, {"coro", f["coro"].as<double>()},
                    {"importancia", f["importancia"].as<double>()}, {"arte_visual", f["arte_visual"].as<double>()},
                    {"antiguedad", f["antiguedad"].as<bool>()}, {"nostalgia", f["nostalgia"].as<bool>()},
                    {"descubrimiento", f["descubrimiento"].as<bool>()}, {"complejidad", f["complejidad"].as<bool>()},
                    {"calificacion_final", f["calificacion_final"].as<double>()}
                });
            }
            crow::json::wvalue res;
            res["canciones"] = std::move(lista);
            return crow::response(200, res);
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 2d. PROMEDIO POR GENERO (GET)
    CROW_ROUTE(app, "/api/canciones/generos").methods("GET"_method)([&db_pool]() {
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::nontransaction N(guard.get());
            pqxx::result r = N.exec(
                "SELECT COALESCE(genero,'Otro') AS genero, COUNT(*) AS total, "
                "COALESCE(AVG(calificacion_final) FILTER (WHERE calificacion_final > 0), 0) AS promedio "
                "FROM canciones GROUP BY 1 ORDER BY promedio DESC, total DESC");
            std::vector<crow::json::wvalue> lista;
            for (auto const& f : r)
                lista.push_back({{"genero", f["genero"].c_str()}, {"total", f["total"].as<int>()}, {"promedio", f["promedio"].as<double>()}});
            crow::json::wvalue res;
            res["generos"] = std::move(lista);
            return crow::response(200, res);
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 3. CREAR (POST)
    CROW_ROUTE(app, "/api/canciones").methods("POST"_method)([&db_pool](const crow::request& req) {
        if (int st = autorizado(req)) return crow::response(st, st == 429 ? "Demasiados intentos." : "No autorizado.");
        try {
            auto body = crow::json::load(req.body);
            if (!body || !body.has("titulo") || !body.has("artista")) return crow::response(400, "Faltan datos.");

            std::string titulo = trim(std::string(body["titulo"].s()));
            std::string artista = trim(std::string(body["artista"].s()));
            std::string genero = body.has("genero") ? std::string(body["genero"].s()) : std::string("Otro");
            std::string etiqueta = body.has("etiqueta") ? std::string(body["etiqueta"].s()) : std::string("Original");

            if (titulo.empty() || artista.empty()) return crow::response(400, "Campos vacios.");
            if (titulo.size() > 200 || artista.size() > 200) return crow::response(400, "Titulo o artista demasiado largo.");

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            
            pqxx::result check = W.exec_params("SELECT id FROM canciones WHERE LOWER(titulo) = LOWER($1) AND LOWER(artista) = LOWER($2)", titulo, artista);
            if (!check.empty()) {
                return crow::response(409, "La cancion ya existe en el catalogo.");
            }

            pqxx::result r;
            try { r = W.exec_params("INSERT INTO canciones (titulo, artista, genero, etiqueta_especial) VALUES ($1, $2, $3, $4) RETURNING id", titulo, artista, genero, etiqueta); }
            catch (const pqxx::unique_violation&) { return crow::response(409, "La cancion ya existe en el catalogo."); }
            W.commit();
            return crow::response(201, crow::json::wvalue({{"id", r[0][0].as<int>()}}));
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 4. CALIFICAR (PUT)
    CROW_ROUTE(app, "/api/canciones/<int>/calificar").methods("PUT"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req)) return crow::response(st, st == 429 ? "Demasiados intentos." : "No autorizado.");
        if (id <= 0) return crow::response(400, "ID invalido.");
        try {
            auto b = crow::json::load(req.body);
            if (!b) return crow::response(400, "JSON vacio.");

            double ritmo = clamp(b.has("ritmo") ? b["ritmo"].d() : 0.0, 0.0, 10.0);
            double letras = clamp(b.has("letras") ? b["letras"].d() : 0.0, 0.0, 10.0);
            double coro = clamp(b.has("coro") ? b["coro"].d() : 0.0, 0.0, 10.0);
            double importancia = clamp(b.has("importancia") ? b["importancia"].d() : 0.0, 0.0, 5.0);
            double arte_visual = clamp(b.has("arte_visual") ? b["arte_visual"].d() : 0.0, 0.0, 1.0);

            bool antiguedad = b.has("antiguedad") && b["antiguedad"].b();
            bool nostalgia = b.has("nostalgia") && b["nostalgia"].b();
            bool desc_terceros = b.has("descubrimiento_terceros") && b["descubrimiento_terceros"].b();
            bool complejidad = b.has("complejidad") && b["complejidad"].b();

            double cal_final = (ritmo * 0.35) + (letras * 0.25) + (coro * 0.40) + 
                               antiguedad + nostalgia + desc_terceros + complejidad + importancia + arte_visual;

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            pqxx::result r = W.exec_params(
                "UPDATE canciones SET ritmo=$1, letras=$2, coro=$3, antiguedad=$4, nostalgia=$5, "
                "descubrimiento_terceros=$6, complejidad=$7, importancia=$8, arte_visual=$9, calificacion_final=$10 WHERE id=$11",
                ritmo, letras, coro, antiguedad, nostalgia, desc_terceros, complejidad, importancia, arte_visual, cal_final, id
            );
            if (r.affected_rows() == 0) return crow::response(404, "No encontrada.");
            W.commit();
            return crow::response(200, crow::json::wvalue({{"calificacion_final", cal_final}}));
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 5. MODIFICAR INFO (PUT)
    CROW_ROUTE(app, "/api/canciones/<int>/info").methods("PUT"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req)) return crow::response(st, st == 429 ? "Demasiados intentos." : "No autorizado.");
        if (id <= 0) return crow::response(400, "ID invalido.");
        try {
            auto body = crow::json::load(req.body);
            if (!body || !body.has("titulo") || !body.has("artista")) return crow::response(400, "Faltan campos.");

            std::string titulo = trim(std::string(body["titulo"].s()));
            std::string artista = trim(std::string(body["artista"].s()));
            std::string genero = body.has("genero") ? std::string(body["genero"].s()) : std::string("Otro");
            std::string etiqueta = body.has("etiqueta") ? std::string(body["etiqueta"].s()) : std::string("Original");

            if (titulo.empty() || artista.empty()) return crow::response(400, "Campos vacios.");
            if (titulo.size() > 200 || artista.size() > 200) return crow::response(400, "Titulo o artista demasiado largo.");

            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            pqxx::result r;
            try { r = W.exec_params("UPDATE canciones SET titulo = $1, artista = $2, genero = $3, etiqueta_especial = $4 WHERE id = $5", titulo, artista, genero, etiqueta, id); }
            catch (const pqxx::unique_violation&) { return crow::response(409, "Ya existe otra cancion igual."); }
            if (r.affected_rows() == 0) return crow::response(404, "No encontrado.");
            W.commit();
            return crow::response(200, "OK");
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // 6. ELIMINAR (DELETE)
    CROW_ROUTE(app, "/api/canciones/<int>").methods("DELETE"_method)([&db_pool](const crow::request& req, int id) {
        if (int st = autorizado(req)) return crow::response(st, st == 429 ? "Demasiados intentos." : "No autorizado.");
        if (id <= 0) return crow::response(400, "ID invalido.");
        try {
            ConnectionGuard guard(*db_pool);
            pqxx::work W(guard.get());
            if (W.exec_params("DELETE FROM canciones WHERE id = $1", id).affected_rows() == 0) return crow::response(404, "No encontrado.");
            W.commit();
            return crow::response(200, "OK");
        } catch (const std::exception &e) { std::cerr << "[ERROR] " << e.what() << std::endl; return crow::response(500, "Error interno."); }
    });

    // LECTURA DEL PUERTO DINÁMICO DE RENDER
    const char* port_env = std::getenv("PORT");
    int port = port_env ? std::stoi(port_env) : 18080;
    
    if (!std::getenv("ADMIN_TOKEN")) std::cerr << "[AVISO] ADMIN_TOKEN no definido: cualquiera puede modificar el catalogo." << std::endl;
    else if (std::string(std::getenv("ADMIN_TOKEN")).size() < 24) std::cerr << "[AVISO] ADMIN_TOKEN muy corto: usa al menos 24 caracteres aleatorios." << std::endl;
    std::cout << "[SYS] Iniciando servidor en el puerto asignado: " << port << std::endl;
    app.bindaddr("0.0.0.0").port(port).multithreaded().run();
}