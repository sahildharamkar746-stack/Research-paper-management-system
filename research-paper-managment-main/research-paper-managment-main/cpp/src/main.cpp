#include "rpms/database.hpp"

#include <httplib.h>
#include <nlohmann/json.hpp>
#include <openssl/rand.h>

#include <atomic>
#include <cstdlib>
#include <iostream>
#include <mutex>
#include <sstream>
#include <string>
#include <unordered_map>

using json = nlohmann::json;

namespace {
struct Session { rpms::User user; };
std::mutex sessionsMutex;
std::unordered_map<std::string, Session> sessions;

json errorJson(const std::string& message) { return json{{"error", message}}; }
void sendJson(httplib::Response& res, int status, const json& body) {
    res.status = status;
    res.set_content(body.dump(), "application/json; charset=utf-8");
}
bool readJson(const httplib::Request& req, json& body) {
    try { body = json::parse(req.body); return body.is_object(); }
    catch (...) { return false; }
}
std::string newToken() {
    unsigned char bytes[32]{};
    if (RAND_bytes(bytes, sizeof(bytes)) != 1) throw std::runtime_error("Secure token generation failed");
    std::ostringstream out;
    out << std::hex;
    for (unsigned char b : bytes) {
        const char* digits = "0123456789abcdef";
        out << digits[(b >> 4U) & 0x0fU] << digits[b & 0x0fU];
    }
    return out.str();
}
bool bearer(const httplib::Request& req, rpms::User& user) {
    const std::string prefix = "Bearer ";
    if (!req.has_header("Authorization")) return false;
    const auto header = req.get_header_value("Authorization");
    if (header.rfind(prefix, 0) != 0) return false;
    const std::string token = header.substr(prefix.size());
    std::lock_guard<std::mutex> lock(sessionsMutex);
    const auto it = sessions.find(token);
    if (it == sessions.end()) return false;
    user = it->second.user;
    return true;
}
bool requireRole(const httplib::Request& req, httplib::Response& res,
                 rpms::User& user, bool adminOnly = false, bool reviewerOnly = false) {
    if (!bearer(req, user)) { sendJson(res, 401, errorJson("Authentication required")); return false; }
    if (adminOnly && user.role != "Admin") {
        sendJson(res, 403, errorJson("Administrator role required")); return false;
    }
    if (reviewerOnly && user.role != "Faculty" && user.role != "Admin") {
        sendJson(res, 403, errorJson("Faculty or Admin role required")); return false;
    }
    return true;
}
json paperJson(const rpms::Paper& p) {
    return json{{"id",p.id},{"title",p.title},{"abstract",p.abstractText},
        {"category",p.category},{"doi",p.doi},{"publicationYear",p.publicationYear},
        {"venue",p.venue},{"paperType",p.paperType},{"status",p.status},
        {"authorEmail",p.authorEmail}};
}
json userJson(const rpms::User& u) {
    return json{{"id",u.id},{"name",u.name},{"email",u.email},{"role",u.role},{"status",u.status}};
}
int envPort() {
    const char* value = std::getenv("RPMS_PORT");
    if (!value || !*value) return 8080;
    try { const int p = std::stoi(value); return p > 0 && p <= 65535 ? p : 8080; }
    catch (...) { return 8080; }
}
}

int main(int argc, char** argv) {
    const std::string dbPath = argc > 1 ? argv[1] : "rpms.sqlite3";
    try {
        rpms::Database db(dbPath);
        db.initialize();
        httplib::Server server;
        server.set_payload_max_length(1024 * 1024);
        server.set_read_timeout(5, 0);
        server.set_write_timeout(5, 0);

        server.set_default_headers({
            {"X-Content-Type-Options", "nosniff"},
            {"X-Frame-Options", "DENY"},
            {"Referrer-Policy", "no-referrer"}
        });
        server.set_pre_routing_handler([](const httplib::Request& req, httplib::Response& res) {
            if (req.has_header("Origin")) {
                const auto origin = req.get_header_value("Origin");
                if (origin == "http://localhost:5500" || origin == "http://127.0.0.1:5500" ||
                    origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173") {
                    res.set_header("Access-Control-Allow-Origin", origin);
                    res.set_header("Vary", "Origin");
                    res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
                    res.set_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
                } else {
                    res.status = 403;
                    res.set_content("Origin not allowed", "text/plain");
                    return httplib::Server::HandlerResponse::Handled;
                }
            }
            if (req.method == "OPTIONS") {
                res.status = 204;
                return httplib::Server::HandlerResponse::Handled;
            }
            return httplib::Server::HandlerResponse::Unhandled;
        });

        server.Get("/health", [](const httplib::Request&, httplib::Response& res) {
            sendJson(res, 200, json{{"status","ok"},{"service","rpms-cpp"}});
        });

        server.Post("/api/register", [&db](const httplib::Request& req, httplib::Response& res) {
            json body;
            if (!readJson(req, body)) { sendJson(res, 400, errorJson("Expected a JSON object")); return; }
            const auto name = body.value("name", "");
            const auto email = body.value("email", "");
            const auto password = body.value("password", "");
            const auto role = body.value("role", "Student");
            if (role != "Student") { sendJson(res, 403, errorJson("Public registration is limited to Student accounts")); return; }
            try {
                if (!db.createUser(name, email, password, role)) {
                    sendJson(res, 400, errorJson("Name, email, or password is invalid")); return;
                }
            } catch (const std::exception&) {
                sendJson(res, 409, errorJson("An account with that email may already exist")); return;
            }
            sendJson(res, 201, json{{"message","Registration successful"}});
        });

        server.Post("/api/login", [&db](const httplib::Request& req, httplib::Response& res) {
            json body;
            if (!readJson(req, body)) { sendJson(res, 400, errorJson("Expected a JSON object")); return; }
            rpms::User user;
            try {
                if (!db.authenticate(body.value("email", ""), body.value("password", ""), user)) {
                    sendJson(res, 401, errorJson("Invalid email or password")); return;
                }
                const auto token = newToken();
                { std::lock_guard<std::mutex> lock(sessionsMutex); sessions[token] = Session{user}; }
                sendJson(res, 200, json{{"token",token},{"user",userJson(user)}});
            } catch (const std::exception&) {
                sendJson(res, 500, errorJson("Authentication service failed"));
            }
        });

        server.Post("/api/logout", [](const httplib::Request& req, httplib::Response& res) {
            if (!req.has_header("Authorization")) { sendJson(res, 401, errorJson("Authentication required")); return; }
            const auto header = req.get_header_value("Authorization");
            const std::string prefix = "Bearer ";
            if (header.rfind(prefix,0) != 0) { sendJson(res, 401, errorJson("Invalid authorization header")); return; }
            { std::lock_guard<std::mutex> lock(sessionsMutex); sessions.erase(header.substr(prefix.size())); }
            sendJson(res, 200, json{{"message","Logged out"}});
        });

        server.Get("/api/categories", [&db](const httplib::Request&, httplib::Response& res) {
            try { sendJson(res, 200, json{{"categories",db.listCategories()}}); }
            catch (const std::exception&) { sendJson(res, 500, errorJson("Unable to load categories")); }
        });

        server.Get("/api/papers", [&db](const httplib::Request&, httplib::Response& res) {
            try {
                json papers = json::array();
                for (const auto& paper : db.listPapers()) papers.push_back(paperJson(paper));
                sendJson(res, 200, json{{"papers",papers}});
            } catch (const std::exception&) { sendJson(res, 500, errorJson("Unable to load papers")); }
        });

        server.Post("/api/papers", [&db](const httplib::Request& req, httplib::Response& res) {
            rpms::User user;
            if (!requireRole(req,res,user)) return;
            json body;
            if (!readJson(req, body)) { sendJson(res, 400, errorJson("Expected a JSON object")); return; }
            rpms::Paper p;
            p.title = body.value("title","");
            p.abstractText = body.value("abstract","");
            p.category = body.value("category","");
            p.doi = body.value("doi","");
            p.publicationYear = body.value("publicationYear",0);
            p.venue = body.value("venue","");
            p.paperType = body.value("paperType","Research Paper");
            try {
                if (!db.createPaper(p,user.id)) { sendJson(res,400,errorJson("Title and category are required")); return; }
                const auto papers = db.listPapers();
                sendJson(res,201,json{{"paper",paperJson(papers.front())}});
            } catch (const std::exception&) { sendJson(res,400,errorJson("Paper could not be saved; check category and fields")); }
        });

        server.Patch(R"(/api/papers/([0-9]+)/status)", [&db](const httplib::Request& req, httplib::Response& res) {
            rpms::User user;
            if (!requireRole(req,res,user,true)) return;
            json body;
            if (!readJson(req,body)) { sendJson(res,400,errorJson("Expected a JSON object")); return; }
            const int id = std::stoi(req.matches[1]);
            const auto status = body.value("status","");
            try {
                if (!db.updatePaperStatus(id,status)) { sendJson(res,400,errorJson("Paper not found or status invalid")); return; }
                sendJson(res,200,json{{"message","Paper status updated"},{"status",status}});
            } catch (const std::exception&) { sendJson(res,500,errorJson("Unable to update paper status")); }
        });

        server.Post(R"(/api/papers/([0-9]+)/reviews)", [&db](const httplib::Request& req, httplib::Response& res) {
            rpms::User user;
            if (!requireRole(req,res,user,false,true)) return;
            json body;
            if (!readJson(req,body)) { sendJson(res,400,errorJson("Expected a JSON object")); return; }
            const int id = std::stoi(req.matches[1]);
            const auto decision = body.value("decision","");
            const auto comments = body.value("comments","");
            try {
                if (!db.addReview(id,user.id,decision,comments)) { sendJson(res,400,errorJson("Paper not found or review decision invalid")); return; }
                sendJson(res,201,json{{"message","Review recorded"},{"decision",decision}});
            } catch (const std::exception&) { sendJson(res,400,errorJson("Review could not be saved")); }
        });

        server.Get(R"(/api/papers/([0-9]+)/reviews)", [&db](const httplib::Request& req, httplib::Response& res) {
            rpms::User user;
            if (!requireRole(req,res,user,false,true)) return;
            const int id = std::stoi(req.matches[1]);
            try {
                json reviews = json::array();
                for (const auto& r : db.listReviews(id))
                    reviews.push_back(json{{"id",r.id},{"paperId",r.paperId},{"reviewerId",r.reviewerId},
                        {"decision",r.decision},{"comments",r.comments},{"createdAt",r.createdAt}});
                sendJson(res,200,json{{"reviews",reviews}});
            } catch (const std::exception&) { sendJson(res,500,errorJson("Unable to load reviews")); }
        });

        const int port = envPort();
        std::cout << "RPMS API listening on http://127.0.0.1:" << port << std::endl;
        if (!server.listen("127.0.0.1", port)) {
            std::cerr << "Unable to start HTTP server on port " << port << "\n";
            return 1;
        }
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "RPMS startup failed: " << ex.what() << "\n";
        return 1;
    }
}
