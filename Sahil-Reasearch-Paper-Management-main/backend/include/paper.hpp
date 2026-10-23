#pragma once
#include <string>
#include <vector>
#include "json.hpp"

struct User {
    int id{0};
    std::string full_name;
    std::string email;
    std::string password_hash;
    std::string created_at;

    std::string to_json(bool include_private = false) const {
        std::stringstream ss;
        ss << "{"
           << "\"id\":" << id << ","
           << "\"full_name\":" << minijson::escape_string(full_name) << ","
           << "\"email\":" << minijson::escape_string(email) << ","
           << "\"created_at\":" << minijson::escape_string(created_at);
        if (include_private) {
            ss << ",\"password_hash\":" << minijson::escape_string(password_hash);
        }
        ss << "}";
        return ss.str();
    }
};

struct Paper {
    int id{0};
    int user_id{0};             // Owner ID (0 for public community repository)
    bool is_public{true};       // Visible in the Global Public Repository
    std::string title;
    std::string authors;
    std::string abstract_text;
    std::string keywords;
    int year{2024};
    std::string venue;          // Journal or Conference name
    std::string category;       // AI, ML, Data Science, etc.
    std::string doi;
    std::string url;
    std::string status;         // Published, Under Review, Draft, Accepted
    std::string reading_status; // To Read, Reading, Completed
    bool favorite{false};
    std::string added_at;       // ISO timestamp or YYYY-MM-DD HH:MM:SS

    std::string to_json() const {
        std::stringstream ss;
        ss << "{"
           << "\"id\":" << id << ","
           << "\"user_id\":" << user_id << ","
           << "\"is_public\":" << (is_public ? "true" : "false") << ","
           << "\"title\":" << minijson::escape_string(title) << ","
           << "\"authors\":" << minijson::escape_string(authors) << ","
           << "\"abstract\":" << minijson::escape_string(abstract_text) << ","
           << "\"keywords\":" << minijson::escape_string(keywords) << ","
           << "\"year\":" << year << ","
           << "\"venue\":" << minijson::escape_string(venue) << ","
           << "\"category\":" << minijson::escape_string(category) << ","
           << "\"doi\":" << minijson::escape_string(doi) << ","
           << "\"url\":" << minijson::escape_string(url) << ","
           << "\"status\":" << minijson::escape_string(status) << ","
           << "\"reading_status\":" << minijson::escape_string(reading_status) << ","
           << "\"favorite\":" << (favorite ? "true" : "false") << ","
           << "\"added_at\":" << minijson::escape_string(added_at)
           << "}";
        return ss.str();
    }
};

struct PaperFilter {
    std::string scope{"all"}; // "all" (global + own), "mine" (own only), "global" (public only)
    std::string search_query;
    std::string category;
    std::string status;
    std::string reading_status;
    int year{0};
    bool only_favorites{false};
    std::string sort_by{"date_desc"};
};

struct SystemStatistics {
    int total_papers{0};
    int total_authors{0};
    int total_categories{0};
    int favorite_count{0};
    int completed_read_count{0};
    int to_read_count{0};
    int reading_count{0};
    std::vector<std::pair<std::string, int>> category_counts;
    std::vector<std::pair<int, int>> year_counts;
    std::vector<std::pair<std::string, int>> status_counts;
};
