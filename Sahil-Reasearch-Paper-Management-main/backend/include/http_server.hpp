#pragma once
#include <string>
#include <map>
#include <functional>
#include <sstream>
#include <iostream>
#include <thread>
#include <vector>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>

struct HttpRequest {
    std::string method;
    std::string path;
    std::map<std::string, std::string> query_params;
    std::map<std::string, std::string> headers;
    std::map<std::string, std::string> cookies;
    std::string body;

    std::string get_cookie(const std::string& name) const {
        auto it = cookies.find(name);
        if (it != cookies.end()) return it->second;
        return "";
    }
};

struct HttpResponse {
    int status_code{200};
    std::string status_text{"OK"};
    std::string content_type{"application/json; charset=utf-8"};
    std::string body;
    std::vector<std::string> set_cookie_headers;
    std::map<std::string, std::string> extra_headers;

    static HttpResponse json(const std::string& json_str, int code = 200) {
        HttpResponse res;
        res.status_code = code;
        res.status_text = (code == 200) ? "OK" : ((code == 201) ? "Created" : ((code == 400) ? "Bad Request" : ((code == 401) ? "Unauthorized" : ((code == 403) ? "Forbidden" : ((code == 404) ? "Not Found" : "Error")))));
        res.content_type = "application/json; charset=utf-8";
        res.body = json_str;
        return res;
    }

    static HttpResponse error(int code, const std::string& msg) {
        HttpResponse res;
        res.status_code = code;
        res.status_text = (code == 404) ? "Not Found" : ((code == 400) ? "Bad Request" : ((code == 401) ? "Unauthorized" : ((code == 403) ? "Forbidden" : "Internal Error")));
        res.content_type = "application/json; charset=utf-8";
        res.body = "{\"success\":false,\"error\":\"" + msg + "\"}";
        return res;
    }

    static HttpResponse file(const std::string& content, const std::string& mime) {
        HttpResponse res;
        res.status_code = 200;
        res.status_text = "OK";
        res.content_type = mime;
        res.body = content;
        return res;
    }

    void add_cookie(const std::string& name, const std::string& value, int max_age_seconds = 86400 * 7, bool http_only = true, const std::string& same_site = "Lax") {
        std::ostringstream ss;
        ss << name << "=" << value << "; Path=/; Max-Age=" << max_age_seconds << "; SameSite=" << same_site;
        if (http_only) {
            ss << "; HttpOnly";
        }
        set_cookie_headers.push_back(ss.str());
    }

    void clear_cookie(const std::string& name) {
        std::string c = name + "=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; HttpOnly";
        set_cookie_headers.push_back(c);
    }
};

using RouteHandler = std::function<HttpResponse(const HttpRequest&)>;

class HttpServer {
public:
    explicit HttpServer(int port) : port_(port) {}
    ~HttpServer() { stop(); }

    void get(const std::string& path, RouteHandler handler) {
        routes_["GET " + path] = handler;
    }

    void post(const std::string& path, RouteHandler handler) {
        routes_["POST " + path] = handler;
    }

    void put(const std::string& path, RouteHandler handler) {
        routes_["PUT " + path] = handler;
    }

    void del(const std::string& path, RouteHandler handler) {
        routes_["DELETE " + path] = handler;
    }

    void set_static_fallback(RouteHandler handler) {
        static_handler_ = handler;
    }

    void start();
    void stop();

private:
    int port_;
    int server_fd_{-1};
    bool running_{false};
    std::map<std::string, RouteHandler> routes_;
    RouteHandler static_handler_;

    void handle_client(int client_fd);
    HttpRequest parse_request(const std::string& raw);
    static std::string url_decode(const std::string& in);
};
