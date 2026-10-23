#pragma once
#include <vector>
#include <string>
#include <algorithm>
#include "paper.hpp"
#include "database_manager.hpp"

class PaperService {
public:
    explicit PaperService(DatabaseManager& db) : db_(db) {}

    std::vector<Paper> query_papers(int user_id, const PaperFilter& filter) {
        std::vector<Paper> all = db_.get_papers_accessible_by_user(user_id, filter.scope);
        std::vector<Paper> filtered;

        auto to_lower = [](std::string str) {
            std::transform(str.begin(), str.end(), str.begin(), ::tolower);
            return str;
        };

        std::string q = to_lower(filter.search_query);

        for (const auto& p : all) {
            // Favorite filter
            if (filter.only_favorites && !p.favorite) continue;

            // Category filter
            if (!filter.category.empty() && filter.category != "All" && p.category != filter.category) continue;

            // Status filter
            if (!filter.status.empty() && filter.status != "All" && p.status != filter.status) continue;

            // Reading status filter
            if (!filter.reading_status.empty() && filter.reading_status != "All" && p.reading_status != filter.reading_status) continue;

            // Year filter
            if (filter.year > 0 && p.year != filter.year) continue;

            // Search query matches title, authors, keywords, DOI, venue, category
            if (!q.empty()) {
                std::string t = to_lower(p.title);
                std::string a = to_lower(p.authors);
                std::string k = to_lower(p.keywords);
                std::string d = to_lower(p.doi);
                std::string v = to_lower(p.venue);
                std::string c = to_lower(p.category);

                if (t.find(q) == std::string::npos &&
                    a.find(q) == std::string::npos &&
                    k.find(q) == std::string::npos &&
                    d.find(q) == std::string::npos &&
                    v.find(q) == std::string::npos &&
                    c.find(q) == std::string::npos) {
                    continue;
                }
            }

            filtered.push_back(p);
        }

        // Sorting algorithm in C++
        if (filter.sort_by == "title_asc") {
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.title < b.title;
            });
        } else if (filter.sort_by == "title_desc") {
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.title > b.title;
            });
        } else if (filter.sort_by == "year_desc") {
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.year > b.year;
            });
        } else if (filter.sort_by == "year_asc") {
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.year < b.year;
            });
        } else if (filter.sort_by == "date_asc") {
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.id < b.id;
            });
        } else { // default date_desc
            std::sort(filtered.begin(), filtered.end(), [](const Paper& a, const Paper& b) {
                return a.id > b.id;
            });
        }

        return filtered;
    }

private:
    DatabaseManager& db_;
};
