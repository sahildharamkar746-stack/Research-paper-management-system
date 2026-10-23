#include <iostream>
#include <fstream>
#include <sstream>
#include <filesystem>
#include <mutex>
#include <chrono>
#include <map>
#include "database_manager.hpp"
#include "paper_service.hpp"
#include "http_server.hpp"
#include "auth_crypto.hpp"
#include "json.hpp"

namespace fs = std::filesystem;

static std::string read_entire_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) return "";
    std::ostringstream ss;
    ss << file.rdbuf();
    return ss.str();
}

static std::string get_mime_type(const std::string& path) {
    if (path.rfind(".html") != std::string::npos) return "text/html; charset=utf-8";
    if (path.rfind(".css") != std::string::npos) return "text/css; charset=utf-8";
    if (path.rfind(".js") != std::string::npos) return "application/javascript; charset=utf-8";
    if (path.rfind(".json") != std::string::npos) return "application/json; charset=utf-8";
    if (path.rfind(".svg") != std::string::npos) return "image/svg+xml";
    if (path.rfind(".png") != std::string::npos) return "image/png";
    if (path.rfind(".ico") != std::string::npos) return "image/x-icon";
    if (path.rfind(".csv") != std::string::npos) return "text/csv; charset=utf-8";
    return "text/plain; charset=utf-8";
}

// In-memory rate limiting for login attempts (IP / email based)
struct RateLimitRecord {
    int attempts{0};
    std::chrono::steady_clock::time_point last_attempt;
};
static std::map<std::string, RateLimitRecord> g_login_rate_limits;
static std::mutex g_rate_limit_mutex;

static bool check_rate_limit(const std::string& key) {
    std::lock_guard<std::mutex> lock(g_rate_limit_mutex);
    auto now = std::chrono::steady_clock::now();
    auto& rec = g_login_rate_limits[key];

    // Reset window after 60 seconds
    auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(now - rec.last_attempt).count();
    if (elapsed > 60) {
        rec.attempts = 0;
    }
    rec.last_attempt = now;
    rec.attempts++;

    // Max 10 attempts per minute
    return rec.attempts <= 10;
}

static void reset_rate_limit(const std::string& key) {
    std::lock_guard<std::mutex> lock(g_rate_limit_mutex);
    g_login_rate_limits.erase(key);
}

// Helper to authenticate request from session cookie
static std::optional<int> get_authenticated_user_id(const HttpRequest& req, DatabaseManager& db) {
    std::string session_token = req.get_cookie("scholartrack_session");
    if (session_token.empty()) {
        // Also allow Authorization: Bearer <token> for API convenience
        auto it = req.headers.find("Authorization");
        if (it != req.headers.end()) {
            std::string auth = it->second;
            if (auth.rfind("Bearer ", 0) == 0) {
                session_token = auth.substr(7);
            }
        }
    }
    if (session_token.empty()) return std::nullopt;
    return db.validate_session(session_token);
}

int main(int argc, char* argv[]) {
    int port = 8080;
    if (argc > 1) {
        port = std::stoi(argv[1]);
    }

    fs::create_directories("database");
    std::string db_file = "database/papers.db";

    std::cout << "========================================================\n";
    std::cout << "  Research Paper Management System — C++ Auth Core      \n";
    std::cout << "========================================================\n";

    DatabaseManager db(db_file);
    if (!db.init_schema()) {
        std::cerr << "[-] Error initializing SQLite database schema!\n";
        return 1;
    }
    db.seed_sample_data();
    std::cout << "[+] SQLite Database initialized and seeded at: " << db_file << "\n";

    PaperService service(db);
    HttpServer server(port);

    // -------------------------------------------------------------
    // AUTHENTICATION API ENDPOINTS
    // -------------------------------------------------------------

    // POST /api/auth/register
    server.post("/api/auth/register", [&db](const HttpRequest& req) {
        auto map = minijson::JsonParser::parse_object(req.body);
        std::string full_name = map["full_name"];
        std::string email = map["email"];
        std::string password = map["password"];

        if (full_name.empty()) {
            return HttpResponse::error(400, "Full name is required.");
        }
        if (email.empty() || email.find('@') == std::string::npos) {
            return HttpResponse::error(400, "A valid email address is required.");
        }
        if (password.length() < 6) {
            return HttpResponse::error(400, "Password must be at least 6 characters long.");
        }

        if (db.email_exists(email)) {
            return HttpResponse::error(409, "An account with this email already exists.");
        }

        std::string password_hash = crypto_utils::hash_password(password);
        if (password_hash.empty()) {
            return HttpResponse::error(500, "Cryptographic hashing failure.");
        }

        int new_user_id = db.register_user(full_name, email, password_hash);
        if (new_user_id <= 0) {
            return HttpResponse::error(500, "Failed to create user record.");
        }

        // Auto-login: Create secure session token
        std::string session_token = crypto_utils::generate_secure_token(32);
        db.create_session(session_token, new_user_id, 86400 * 7);

        auto opt_user = db.get_user_by_id(new_user_id);
        HttpResponse res = HttpResponse::json(opt_user->to_json(false), 201);
        res.add_cookie("scholartrack_session", session_token, 86400 * 7, true, "Lax");
        return res;
    });

    // POST /api/auth/login
    server.post("/api/auth/login", [&db](const HttpRequest& req) {
        auto map = minijson::JsonParser::parse_object(req.body);
        std::string email = map["email"];
        std::string password = map["password"];
        bool remember_me = (map["remember"] == "true" || map["remember"] == "1");

        if (email.empty() || password.empty()) {
            return HttpResponse::error(400, "Email and password are required.");
        }

        if (!check_rate_limit(email)) {
            return HttpResponse::error(429, "Too many login attempts. Please wait 1 minute before trying again.");
        }

        auto opt_user = db.get_user_by_email(email);
        if (!opt_user) {
            return HttpResponse::error(401, "Invalid email or password.");
        }

        if (!crypto_utils::verify_password(password, opt_user->password_hash)) {
            return HttpResponse::error(401, "Invalid email or password.");
        }

        // Login successful, reset rate limit counter
        reset_rate_limit(email);

        int expiry = remember_me ? (86400 * 30) : (86400 * 7);
        std::string session_token = crypto_utils::generate_secure_token(32);
        db.create_session(session_token, opt_user->id, expiry);

        HttpResponse res = HttpResponse::json(opt_user->to_json(false), 200);
        res.add_cookie("scholartrack_session", session_token, expiry, true, "Lax");
        return res;
    });

    // POST /api/auth/logout
    server.post("/api/auth/logout", [&db](const HttpRequest& req) {
        std::string session_token = req.get_cookie("scholartrack_session");
        if (!session_token.empty()) {
            db.delete_session(session_token);
        }
        HttpResponse res = HttpResponse::json("{\"success\":true,\"message\":\"Logged out successfully\"}", 200);
        res.clear_cookie("scholartrack_session");
        return res;
    });

    // GET /api/auth/me (Current Authenticated User)
    server.get("/api/auth/me", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) {
            return HttpResponse::error(401, "Not authenticated");
        }

        auto opt_user = db.get_user_by_id(*opt_user_id);
        if (!opt_user) {
            return HttpResponse::error(401, "User record not found");
        }

        return HttpResponse::json(opt_user->to_json(false));
    });

    // -------------------------------------------------------------
    // PROTECTED PAPER CRUD & STATS ENDPOINTS
    // -------------------------------------------------------------

    // API: GET /api/health (Public)
    server.get("/api/health", [](const HttpRequest&) {
        return HttpResponse::json("{\"status\":\"healthy\",\"engine\":\"C++17 Native\",\"auth\":\"PBKDF2/Sessions\"}");
    });

    // API: GET /api/categories (Protected per user)
    server.get("/api/categories", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        auto cats = db.get_categories(*opt_user_id);
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < cats.size(); ++i) {
            ss << minijson::escape_string(cats[i]);
            if (i + 1 < cats.size()) ss << ",";
        }
        ss << "]";
        return HttpResponse::json(ss.str());
    });

    // API: GET /api/statistics (Protected per user)
    server.get("/api/statistics", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        std::string scope = "all";
        if (req.query_params.count("scope")) scope = req.query_params.at("scope");

        auto stats = db.get_statistics(*opt_user_id, scope);
        std::ostringstream ss;
        ss << "{"
           << "\"total_papers\":" << stats.total_papers << ","
           << "\"total_authors\":" << stats.total_authors << ","
           << "\"total_categories\":" << stats.total_categories << ","
           << "\"favorite_count\":" << stats.favorite_count << ","
           << "\"completed_read_count\":" << stats.completed_read_count << ","
           << "\"reading_count\":" << stats.reading_count << ","
           << "\"to_read_count\":" << stats.to_read_count << ","
           << "\"categories\":{";
        for (size_t i = 0; i < stats.category_counts.size(); ++i) {
            ss << minijson::escape_string(stats.category_counts[i].first) << ":" << stats.category_counts[i].second;
            if (i + 1 < stats.category_counts.size()) ss << ",";
        }
        ss << "},\"statuses\":{";
        for (size_t i = 0; i < stats.status_counts.size(); ++i) {
            ss << minijson::escape_string(stats.status_counts[i].first) << ":" << stats.status_counts[i].second;
            if (i + 1 < stats.status_counts.size()) ss << ",";
        }
        ss << "}}";
        return HttpResponse::json(ss.str());
    });

    // API: GET /api/papers (Protected Search, Filter, Sort per user)
    server.get("/api/papers", [&db, &service](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        PaperFilter filter;
        if (req.query_params.count("scope")) filter.scope = req.query_params.at("scope");
        if (req.query_params.count("q")) filter.search_query = req.query_params.at("q");
        if (req.query_params.count("category")) filter.category = req.query_params.at("category");
        if (req.query_params.count("status")) filter.status = req.query_params.at("status");
        if (req.query_params.count("reading_status")) filter.reading_status = req.query_params.at("reading_status");
        if (req.query_params.count("year")) {
            try { filter.year = std::stoi(req.query_params.at("year")); } catch (...) {}
        }
        if (req.query_params.count("favorite") && req.query_params.at("favorite") == "true") {
            filter.only_favorites = true;
        }
        if (req.query_params.count("sort")) filter.sort_by = req.query_params.at("sort");

        auto papers = service.query_papers(*opt_user_id, filter);
        std::ostringstream ss;
        ss << "[";
        for (size_t i = 0; i < papers.size(); ++i) {
            ss << papers[i].to_json();
            if (i + 1 < papers.size()) ss << ",";
        }
        ss << "]";
        return HttpResponse::json(ss.str());
    });

    // API: POST /api/papers (Protected Add paper)
    server.post("/api/papers", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        auto map = minijson::JsonParser::parse_object(req.body);
        if (map["title"].empty() || map["authors"].empty()) {
            return HttpResponse::error(400, "Title and Authors are required fields.");
        }

        Paper p;
        p.user_id = *opt_user_id;
        p.title = map["title"];
        p.authors = map["authors"];
        p.abstract_text = map["abstract"];
        p.keywords = map["keywords"];
        try {
            p.year = map["year"].empty() ? 2024 : std::stoi(map["year"]);
        } catch (...) {
            p.year = 2024;
        }
        p.venue = map["venue"];
        p.category = map["category"].empty() ? "Artificial Intelligence" : map["category"];
        p.doi = map["doi"];
        p.url = map["url"];
        p.status = map["status"].empty() ? "Published" : map["status"];
        p.reading_status = map["reading_status"].empty() ? "To Read" : map["reading_status"];
        p.favorite = (map["favorite"] == "true" || map["favorite"] == "1");

        int id = db.add_paper(p, *opt_user_id);
        if (id > 0) {
            auto created = db.get_paper_by_id(id, *opt_user_id);
            return HttpResponse::json(created->to_json(), 201);
        } else {
            return HttpResponse::error(500, "Failed to save paper to database.");
        }
    });

    // API: GET /api/papers/{id} (Protected single paper)
    server.get("/api/papers/{id}", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        std::string prefix = "/api/papers/";
        if (req.path.rfind(prefix, 0) == 0) {
            std::string id_str = req.path.substr(prefix.length());
            try {
                int id = std::stoi(id_str);
                auto p = db.get_paper_by_id(id, *opt_user_id);
                if (p) {
                    return HttpResponse::json(p->to_json());
                }
            } catch (...) {}
        }
        return HttpResponse::error(404, "Paper not found or access denied.");
    });

    // API: PUT /api/papers/{id} (Protected update paper)
    server.put("/api/papers/{id}", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        std::string prefix = "/api/papers/";
        if (req.path.rfind(prefix, 0) == 0) {
            std::string id_str = req.path.substr(prefix.length());
            try {
                int id = std::stoi(id_str);
                auto map = minijson::JsonParser::parse_object(req.body);

                auto opt_existing = db.get_paper_by_id(id, *opt_user_id);
                if (!opt_existing) {
                    return HttpResponse::error(404, "Paper not found or access denied.");
                }
                Paper p = *opt_existing;
                if (!map["title"].empty()) p.title = map["title"];
                if (!map["authors"].empty()) p.authors = map["authors"];
                if (map.count("abstract")) p.abstract_text = map["abstract"];
                if (map.count("keywords")) p.keywords = map["keywords"];
                if (!map["year"].empty()) {
                    try { p.year = std::stoi(map["year"]); } catch (...) {}
                }
                if (map.count("venue")) p.venue = map["venue"];
                if (!map["category"].empty()) p.category = map["category"];
                if (map.count("doi")) p.doi = map["doi"];
                if (map.count("url")) p.url = map["url"];
                if (!map["status"].empty()) p.status = map["status"];
                if (!map["reading_status"].empty()) p.reading_status = map["reading_status"];
                if (map.count("favorite")) p.favorite = (map["favorite"] == "true" || map["favorite"] == "1");

                if (db.update_paper(id, *opt_user_id, p)) {
                    auto updated = db.get_paper_by_id(id, *opt_user_id);
                    return HttpResponse::json(updated->to_json());
                }
            } catch (...) {}
        }
        return HttpResponse::error(400, "Failed to update paper");
    });

    // API: DELETE /api/papers/{id} (Protected delete paper)
    server.del("/api/papers/{id}", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        std::string prefix = "/api/papers/";
        if (req.path.rfind(prefix, 0) == 0) {
            std::string id_str = req.path.substr(prefix.length());
            try {
                int id = std::stoi(id_str);
                if (db.delete_paper(id, *opt_user_id)) {
                    return HttpResponse::json("{\"success\":true,\"message\":\"Paper deleted successfully\"}");
                }
            } catch (...) {}
        }
        return HttpResponse::error(404, "Paper not found or access denied");
    });

    // API: POST /api/papers/toggle-favorite (Protected)
    server.post("/api/papers/toggle-favorite", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        auto map = minijson::JsonParser::parse_object(req.body);
        if (map.count("id")) {
            int id = std::stoi(map["id"]);
            if (db.toggle_favorite(id, *opt_user_id)) {
                auto p = db.get_paper_by_id(id, *opt_user_id);
                return HttpResponse::json(p->to_json());
            }
        }
        return HttpResponse::error(400, "Invalid ID or access denied");
    });

    // API: POST /api/papers/reading-status (Protected)
    server.post("/api/papers/reading-status", [&db](const HttpRequest& req) {
        auto opt_user_id = get_authenticated_user_id(req, db);
        if (!opt_user_id) return HttpResponse::error(401, "Authentication required");

        auto map = minijson::JsonParser::parse_object(req.body);
        if (map.count("id") && map.count("reading_status")) {
            int id = std::stoi(map["id"]);
            if (db.update_reading_status(id, *opt_user_id, map["reading_status"])) {
                auto p = db.get_paper_by_id(id, *opt_user_id);
                return HttpResponse::json(p->to_json());
            }
        }
        return HttpResponse::error(400, "Invalid request or access denied");
    });

    // Static Frontend File Server
    server.set_static_fallback([](const HttpRequest& req) -> HttpResponse {
        std::string req_path = req.path;
        if (req_path == "/" || req_path.empty()) {
            req_path = "/index.html";
        }

        // Prevent directory traversal
        if (req_path.find("..") != std::string::npos) {
            return HttpResponse::error(403, "Forbidden");
        }

        std::string full_path = "frontend" + req_path;
        if (!fs::exists(full_path)) {
            full_path = req_path.substr(1);
        }

        if (fs::exists(full_path) && !fs::is_directory(full_path)) {
            std::string content = read_entire_file(full_path);
            return HttpResponse::file(content, get_mime_type(full_path));
        }

        // Default fallback to index.html
        if (fs::exists("frontend/index.html")) {
            std::string content = read_entire_file("frontend/index.html");
            return HttpResponse::file(content, "text/html; charset=utf-8");
        }

        return HttpResponse::error(404, "File Not Found");
    });

    std::cout << "[+] Server starting on port " << port << "...\n";
    std::cout << "[+] Open your browser at: http://localhost:" << port << "\n";
    server.start();

    return 0;
}
