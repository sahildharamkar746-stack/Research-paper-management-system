#pragma once
#include <string>
#include <vector>
#include <optional>
#include <sqlite3.h>
#include "paper.hpp"

class DatabaseManager {
public:
    explicit DatabaseManager(const std::string& db_path);
    ~DatabaseManager();

    bool init_schema();
    bool seed_sample_data();

    // User Authentication Operations
    int register_user(const std::string& full_name, const std::string& email, const std::string& password_hash);
    std::optional<User> get_user_by_email(const std::string& email);
    std::optional<User> get_user_by_id(int id);
    bool email_exists(const std::string& email);

    // Session Management Operations
    bool create_session(const std::string& session_id, int user_id, int expiry_seconds = 86400 * 7);
    std::optional<int> validate_session(const std::string& session_id);
    bool delete_session(const std::string& session_id);
    void clean_expired_sessions();

    // Paper Operations (Global Public Repository + User Owned Papers)
    int add_paper(const Paper& paper, int user_id);
    bool update_paper(int id, int user_id, const Paper& paper);
    bool delete_paper(int id, int user_id);
    std::optional<Paper> get_paper_by_id(int id, int user_id);
    std::vector<Paper> get_papers_accessible_by_user(int user_id, const std::string& scope = "all");
    bool toggle_favorite(int id, int user_id);
    bool update_reading_status(int id, int user_id, const std::string& status);

    // Categories & Stats
    std::vector<std::string> get_categories(int user_id);
    SystemStatistics get_statistics(int user_id, const std::string& scope = "all");

private:
    std::string db_path_;
    sqlite3* db_{nullptr};

    bool execute_sql(const std::string& sql);
};
