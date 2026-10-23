#pragma once
#include <string>
#include <vector>
#include <map>
#include <sstream>
#include <algorithm>
#include <cctype>

namespace minijson {

inline std::string escape_string(const std::string& input) {
    std::string out = "\"";
    for (char c : input) {
        switch (c) {
            case '"':  out += "\\\""; break;
            case '\\': out += "\\\\"; break;
            case '\b': out += "\\b"; break;
            case '\f': out += "\\f"; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:
                if (static_cast<unsigned char>(c) < 0x20) {
                    char buf[8];
                    snprintf(buf, sizeof(buf), "\\u%04x", (int)c);
                    out += buf;
                } else {
                    out += c;
                }
        }
    }
    out += "\"";
    return out;
}

// Minimal JSON parser for objects with string/int/bool values
class JsonParser {
public:
    static std::map<std::string, std::string> parse_object(const std::string& json_str) {
        std::map<std::string, std::string> res;
        size_t i = 0;
        size_t n = json_str.size();

        auto skip_ws = [&]() {
            while (i < n && (json_str[i] == ' ' || json_str[i] == '\t' || json_str[i] == '\n' || json_str[i] == '\r')) {
                i++;
            }
        };

        skip_ws();
        if (i >= n || json_str[i] != '{') return res;
        i++; // skip '{'

        while (i < n) {
            skip_ws();
            if (i < n && json_str[i] == '}') {
                i++;
                break;
            }

            // Key
            if (i >= n || json_str[i] != '"') break;
            i++;
            std::string key = "";
            while (i < n && json_str[i] != '"') {
                if (json_str[i] == '\\' && i + 1 < n) {
                    i++;
                    key += json_str[i];
                } else {
                    key += json_str[i];
                }
                i++;
            }
            if (i < n && json_str[i] == '"') i++;

            skip_ws();
            if (i >= n || json_str[i] != ':') break;
            i++; // skip ':'
            skip_ws();

            // Value (string, number, bool, or null)
            std::string value = "";
            if (i < n && json_str[i] == '"') {
                i++;
                while (i < n && json_str[i] != '"') {
                    if (json_str[i] == '\\' && i + 1 < n) {
                        i++;
                        if (json_str[i] == 'n') value += '\n';
                        else if (json_str[i] == 'r') value += '\r';
                        else if (json_str[i] == 't') value += '\t';
                        else value += json_str[i];
                    } else {
                        value += json_str[i];
                    }
                    i++;
                }
                if (i < n && json_str[i] == '"') i++;
            } else {
                // Number / boolean / null
                while (i < n && json_str[i] != ',' && json_str[i] != '}' && !isspace(static_cast<unsigned char>(json_str[i]))) {
                    value += json_str[i];
                    i++;
                }
            }

            res[key] = value;

            skip_ws();
            if (i < n && json_str[i] == ',') {
                i++;
            } else if (i < n && json_str[i] == '}') {
                i++;
                break;
            }
        }
        return res;
    }
};

} // namespace minijson
