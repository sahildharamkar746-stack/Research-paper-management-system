#include "http_server.hpp"
#include <fstream>
#include <sstream>
#include <vector>
#include <regex>

std::string HttpServer::url_decode(const std::string& in) {
    std::string out;
    for (size_t i = 0; i < in.length(); ++i) {
        if (in[i] == '%') {
            if (i + 2 < in.length()) {
                int hex_val;
                std::istringstream is(in.substr(i + 1, 2));
                if (is >> std::hex >> hex_val) {
                    out += static_cast<char>(hex_val);
                    i += 2;
                } else {
                    out += in[i];
                }
            }
        } else if (in[i] == '+') {
            out += ' ';
        } else {
            out += in[i];
        }
    }
    return out;
}

HttpRequest HttpServer::parse_request(const std::string& raw) {
    HttpRequest req;
    size_t header_end = raw.find("\r\n\r\n");
    std::string header_part = (header_end != std::string::npos) ? raw.substr(0, header_end) : raw;
    req.body = (header_end != std::string::npos) ? raw.substr(header_end + 4) : "";

    std::istringstream stream(header_part);
    std::string line;
    if (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        std::istringstream line_stream(line);
        line_stream >> req.method;
        std::string full_path;
        line_stream >> full_path;

        size_t query_pos = full_path.find('?');
        if (query_pos != std::string::npos) {
            req.path = full_path.substr(0, query_pos);
            std::string query_str = full_path.substr(query_pos + 1);
            std::istringstream qs(query_str);
            std::string pair;
            while (std::getline(qs, pair, '&')) {
                size_t eq = pair.find('=');
                if (eq != std::string::npos) {
                    req.query_params[url_decode(pair.substr(0, eq))] = url_decode(pair.substr(eq + 1));
                } else {
                    req.query_params[url_decode(pair)] = "";
                }
            }
        } else {
            req.path = full_path;
        }
    }

    while (std::getline(stream, line)) {
        if (!line.empty() && line.back() == '\r') line.pop_back();
        size_t colon = line.find(':');
        if (colon != std::string::npos) {
            std::string k = line.substr(0, colon);
            std::string v = line.substr(colon + 1);
            while (!v.empty() && (v.front() == ' ' || v.front() == '\t')) v.erase(0, 1);
            req.headers[k] = v;

            // Parse Cookie header
            if (k == "Cookie" || k == "cookie") {
                std::istringstream cs(v);
                std::string c_pair;
                while (std::getline(cs, c_pair, ';')) {
                    size_t c_eq = c_pair.find('=');
                    if (c_eq != std::string::npos) {
                        std::string c_name = c_pair.substr(0, c_eq);
                        std::string c_val = c_pair.substr(c_eq + 1);
                        while (!c_name.empty() && (c_name.front() == ' ' || c_name.front() == '\t')) c_name.erase(0, 1);
                        while (!c_name.empty() && (c_name.back() == ' ' || c_name.back() == '\t')) c_name.pop_back();
                        while (!c_val.empty() && (c_val.front() == ' ' || c_val.front() == '\t')) c_val.erase(0, 1);
                        while (!c_val.empty() && (c_val.back() == ' ' || c_val.back() == '\t')) c_val.pop_back();
                        req.cookies[c_name] = c_val;
                    }
                }
            }
        }
    }

    return req;
}

void HttpServer::start() {
    server_fd_ = socket(AF_INET, SOCK_STREAM, 0);
    if (server_fd_ < 0) {
        std::cerr << "Cannot create socket" << std::endl;
        return;
    }

    int opt = 1;
    setsockopt(server_fd_, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port_);

    if (bind(server_fd_, (struct sockaddr*)&address, sizeof(address)) < 0) {
        std::cerr << "Bind failed on port " << port_ << std::endl;
        close(server_fd_);
        server_fd_ = -1;
        return;
    }

    if (listen(server_fd_, 20) < 0) {
        std::cerr << "Listen failed" << std::endl;
        close(server_fd_);
        server_fd_ = -1;
        return;
    }

    running_ = true;
    std::cout << "[C++ Backend] Server running on http://localhost:" << port_ << std::endl;

    while (running_) {
        sockaddr_in client_addr{};
        socklen_t client_len = sizeof(client_addr);
        int client_fd = accept(server_fd_, (struct sockaddr*)&client_addr, &client_len);
        if (client_fd < 0) {
            if (!running_) break;
            continue;
        }

        std::thread([this, client_fd]() {
            handle_client(client_fd);
        }).detach();
    }
}

void HttpServer::stop() {
    running_ = false;
    if (server_fd_ >= 0) {
        close(server_fd_);
        server_fd_ = -1;
    }
}

void HttpServer::handle_client(int client_fd) {
    std::string raw_req;
    char buffer[4096];
    size_t content_length = 0;
    size_t header_end = std::string::npos;
    bool header_parsed = false;

    while (true) {
        ssize_t bytes_read = read(client_fd, buffer, sizeof(buffer));
        if (bytes_read <= 0) break;
        raw_req.append(buffer, bytes_read);

        if (!header_parsed) {
            header_end = raw_req.find("\r\n\r\n");
            if (header_end != std::string::npos) {
                header_parsed = true;
                // Look for Content-Length header in headers
                std::string header_part = raw_req.substr(0, header_end);
                std::istringstream stream(header_part);
                std::string line;
                while (std::getline(stream, line)) {
                    if (!line.empty() && line.back() == '\r') line.pop_back();
                    size_t colon = line.find(':');
                    if (colon != std::string::npos) {
                        std::string k = line.substr(0, colon);
                        std::string v = line.substr(colon + 1);
                        while (!k.empty() && (k.back() == ' ' || k.back() == '\t')) k.pop_back();
                        // Case-insensitive Content-Length
                        std::string lower_k = k;
                        for (auto& c : lower_k) c = std::tolower(c);
                        if (lower_k == "content-length") {
                            while (!v.empty() && (v.front() == ' ' || v.front() == '\t')) v.erase(0, 1);
                            try {
                                content_length = std::stoul(v);
                            } catch (...) {}
                        }
                    }
                }
            }
        }

        if (header_parsed) {
            size_t body_received = raw_req.length() - (header_end + 4);
            if (body_received >= content_length) {
                break;
            }
        }
    }

    if (raw_req.empty()) {
        close(client_fd);
        return;
    }

    HttpRequest req = parse_request(raw_req);

    // If method is OPTIONS, reply CORS preflight immediately
    if (req.method == "OPTIONS") {
        std::string resp = 
            "HTTP/1.1 204 No Content\r\n"
            "Access-Control-Allow-Origin: *\r\n"
            "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n"
            "Access-Control-Allow-Headers: Content-Type, Authorization\r\n"
            "Access-Control-Allow-Credentials: true\r\n"
            "Content-Length: 0\r\n"
            "Connection: close\r\n\r\n";
        write(client_fd, resp.c_str(), resp.length());
        close(client_fd);
        return;
    }

    HttpResponse res;
    std::string route_key = req.method + " " + req.path;

    if (routes_.find(route_key) != routes_.end()) {
        res = routes_[route_key](req);
    } else {
        // Pattern matching for /api/papers/{id}
        bool matched = false;
        for (const auto& [pattern, handler] : routes_) {
            size_t slash_pos = pattern.find('{');
            if (slash_pos != std::string::npos) {
                std::string prefix = pattern.substr(0, slash_pos);
                std::string current_key = req.method + " " + req.path;
                if (current_key.rfind(prefix, 0) == 0) {
                    std::string id_str = current_key.substr(prefix.length());
                    size_t slash_sub = id_str.find('/');
                    if (slash_sub == std::string::npos) {
                        res = handler(req);
                        matched = true;
                        break;
                    }
                }
            }
        }

        if (!matched) {
            if (static_handler_) {
                res = static_handler_(req);
            } else {
                res = HttpResponse::error(404, "Not Found");
            }
        }
    }

    // Assemble response
    std::ostringstream ss;
    ss << "HTTP/1.1 " << res.status_code << " " << res.status_text << "\r\n";
    ss << "Content-Type: " << res.content_type << "\r\n";
    ss << "Content-Length: " << res.body.size() << "\r\n";
    ss << "Access-Control-Allow-Origin: *\r\n";
    ss << "Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS\r\n";
    ss << "Access-Control-Allow-Headers: Content-Type\r\n";
    ss << "Access-Control-Allow-Credentials: true\r\n";
    for (const auto& cookie : res.set_cookie_headers) {
        ss << "Set-Cookie: " << cookie << "\r\n";
    }
    for (const auto& [hk, hv] : res.extra_headers) {
        ss << hk << ": " << hv << "\r\n";
    }
    ss << "Connection: close\r\n\r\n";
    ss << res.body;

    std::string final_str = ss.str();
    write(client_fd, final_str.data(), final_str.size());
    close(client_fd);
}
