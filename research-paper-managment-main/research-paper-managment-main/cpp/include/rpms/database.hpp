#pragma once

#include <sqlite3.h>
#include <string>
#include <vector>

namespace rpms {

struct User {
    int id{};
    std::string name;
    std::string email;
    std::string role;
    std::string status;
};

struct Paper {
    int id{};
    std::string title;
    std::string abstractText;
    std::string category;
    std::string doi;
    int publicationYear{};
    std::string venue;
    std::string paperType;
    std::string status;
    std::string authorEmail;
};

struct Review {
    int id{};
    int paperId{};
    int reviewerId{};
    std::string decision;
    std::string comments;
    std::string createdAt;
};

class Database {
public:
    explicit Database(const std::string& path);
    ~Database();

    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    void initialize();
    bool createUser(const std::string& name, const std::string& email,
                    const std::string& password, const std::string& role);
    bool authenticate(const std::string& email, const std::string& password,
                      User& outUser) const;
    std::vector<User> listUsers() const;
    bool updateUserStatus(int userId, const std::string& status);
    bool deleteUser(int userId);
    bool createPaper(const Paper& paper, int authorUserId);
    std::vector<Paper> listPapers() const;
    bool updatePaper(const Paper& paper);
    bool updatePaperStatus(int paperId, const std::string& status);
    bool deletePaper(int paperId);
    bool addReview(int paperId, int reviewerId, const std::string& decision,
                   const std::string& comments);
    std::vector<Review> listReviews(int paperId) const;
    std::vector<Review> listAllReviews() const;
    bool addCategory(const std::string& name);
    bool renameCategory(const std::string& oldName, const std::string& newName);
    bool deleteCategory(const std::string& name);
    std::vector<std::string> listCategories() const;

private:
    sqlite3* db_{nullptr};
    void execute(const char* sql) const;
    static std::string hashPassword(const std::string& password,
                                   const std::string& saltHex);
    static std::string makeSalt();
};

} // namespace rpms
