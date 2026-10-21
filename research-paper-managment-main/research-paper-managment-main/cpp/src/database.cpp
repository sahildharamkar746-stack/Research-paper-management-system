#include "rpms/database.hpp"

#include <openssl/evp.h>
#include <openssl/rand.h>
#include <sqlite3.h>

#include <array>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace rpms {
namespace {
class Statement {
public:
    Statement(sqlite3* db, const char* sql) : db_(db) {
        if (sqlite3_prepare_v2(db_, sql, -1, &stmt_, nullptr) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db_));
    }
    ~Statement() { sqlite3_finalize(stmt_); }
    Statement(const Statement&) = delete;
    Statement& operator=(const Statement&) = delete;
    sqlite3_stmt* get() const { return stmt_; }
    void text(int index, const std::string& value) {
        if (sqlite3_bind_text(stmt_, index, value.c_str(),
                              static_cast<int>(value.size()), SQLITE_TRANSIENT) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db_));
    }
    void integer(int index, int value) {
        if (sqlite3_bind_int(stmt_, index, value) != SQLITE_OK)
            throw std::runtime_error(sqlite3_errmsg(db_));
    }
    bool stepDone() { return sqlite3_step(stmt_) == SQLITE_DONE; }
private:
    sqlite3* db_;
    sqlite3_stmt* stmt_{nullptr};
};

std::string columnText(sqlite3_stmt* stmt, int col) {
    const auto* value = sqlite3_column_text(stmt, col);
    return value ? reinterpret_cast<const char*>(value) : "";
}
bool allowedRole(const std::string& role) {
    return role == "Student" || role == "Faculty" || role == "Admin";
}
bool allowedStatus(const std::string& status) {
    return status == "Pending" || status == "Under Review" ||
           status == "Approved" || status == "Rejected";
}
} // namespace

Database::Database(const std::string& path) {
    if (sqlite3_open(path.c_str(), &db_) != SQLITE_OK) {
        const std::string message = db_ ? sqlite3_errmsg(db_) : "Unable to open database";
        if (db_) sqlite3_close(db_);
        db_ = nullptr;
        throw std::runtime_error(message);
    }
    sqlite3_busy_timeout(db_, 5000);
    execute("PRAGMA foreign_keys = ON;");
}
Database::~Database() {
    if (db_) sqlite3_close(db_);
}
void Database::execute(const char* sql) const {
    char* error = nullptr;
    if (sqlite3_exec(db_, sql, nullptr, nullptr, &error) != SQLITE_OK) {
        const std::string message = error ? error : sqlite3_errmsg(db_);
        sqlite3_free(error);
        throw std::runtime_error(message);
    }
}
void Database::initialize() {
    execute("CREATE TABLE IF NOT EXISTS users ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,"
            "email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL,"
            "password_salt TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('Student','Faculty','Admin')),"
            "status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active','Disabled')),"
            "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
    execute("CREATE TABLE IF NOT EXISTS categories ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE COLLATE NOCASE);");
    execute("CREATE TABLE IF NOT EXISTS papers ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL,"
            "abstract TEXT NOT NULL DEFAULT '', category TEXT NOT NULL, doi TEXT NOT NULL DEFAULT '',"
            "publication_year INTEGER NOT NULL DEFAULT 0, venue TEXT NOT NULL DEFAULT '',"
            "paper_type TEXT NOT NULL DEFAULT 'Research Paper', status TEXT NOT NULL DEFAULT 'Pending',"
            "author_user_id INTEGER NOT NULL REFERENCES users(id),"
            "created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
    execute("CREATE TABLE IF NOT EXISTS reviews ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, paper_id INTEGER NOT NULL REFERENCES papers(id) ON DELETE CASCADE,"
            "reviewer_id INTEGER NOT NULL REFERENCES users(id), decision TEXT NOT NULL,"
            "comments TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
    execute("CREATE TABLE IF NOT EXISTS activity ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,"
            "event TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);");
    execute("CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);");
    execute("CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);");
    execute("CREATE INDEX IF NOT EXISTS idx_reviews_paper ON reviews(paper_id);");
    execute("INSERT OR IGNORE INTO categories(name) VALUES "
            "('Artificial Intelligence'),('Computer Networks'),('Data Science'),"
            "('Internet of Things'),('Software Engineering');");
}
std::string Database::makeSalt() {
    std::array<unsigned char, 16> bytes{};
    if (RAND_bytes(bytes.data(), static_cast<int>(bytes.size())) != 1)
        throw std::runtime_error("Secure random salt generation failed");
    std::ostringstream out;
    out << std::hex << std::setfill('0');
    for (unsigned char b : bytes) out << std::setw(2) << static_cast<unsigned int>(b);
    return out.str();
}
std::string Database::hashPassword(const std::string& password, const std::string& saltHex) {
    std::array<unsigned char, 16> salt{};
    if (saltHex.size() != salt.size() * 2) throw std::runtime_error("Invalid password salt");
    for (std::size_t i = 0; i < salt.size(); ++i) {
        unsigned int byte = 0;
        std::istringstream in(saltHex.substr(i * 2, 2));
        in >> std::hex >> byte;
        salt[i] = static_cast<unsigned char>(byte);
    }
    std::array<unsigned char, 32> derived{};
    if (PKCS5_PBKDF2_HMAC(password.c_str(), static_cast<int>(password.size()),
            salt.data(), static_cast<int>(salt.size()), 210000, EVP_sha256(),
            static_cast<int>(derived.size()), derived.data()) != 1)
        throw std::runtime_error("Password hashing failed");
    std::ostringstream out;
    out << std::hex << std::setfill('0');
    for (unsigned char b : derived) out << std::setw(2) << static_cast<unsigned int>(b);
    return out.str();
}
bool Database::createUser(const std::string& name, const std::string& email,
                          const std::string& password, const std::string& role) {
    if (name.size() < 2 || email.empty() || password.size() < 8 || !allowedRole(role))
        return false;
    const std::string salt = makeSalt();
    const std::string hash = hashPassword(password, salt);
    Statement s(db_, "INSERT INTO users(name,email,password_hash,password_salt,role) VALUES(?,?,?,?,?);");
    s.text(1, name); s.text(2, email); s.text(3, hash); s.text(4, salt); s.text(5, role);
    return s.stepDone();
}
bool Database::authenticate(const std::string& email, const std::string& password,
                            User& outUser) const {
    Statement s(db_, "SELECT id,name,email,password_hash,password_salt,role,status FROM users WHERE email=? COLLATE NOCASE;");
    s.text(1, email);
    if (sqlite3_step(s.get()) != SQLITE_ROW) return false;
    const std::string storedHash = columnText(s.get(), 3);
    const std::string salt = columnText(s.get(), 4);
    const std::string role = columnText(s.get(), 5);
    const std::string status = columnText(s.get(), 6);
    if (status != "Active" || hashPassword(password, salt) != storedHash) return false;
    outUser.id = sqlite3_column_int(s.get(), 0);
    outUser.name = columnText(s.get(), 1);
    outUser.email = columnText(s.get(), 2);
    outUser.role = role;
    outUser.status = status;
    return true;
}

std::vector<User> Database::listUsers() const {
    Statement s(db_, "SELECT id,name,email,role,status FROM users ORDER BY id;");
    std::vector<User> result;
    while (sqlite3_step(s.get()) == SQLITE_ROW) {
        User u;
        u.id = sqlite3_column_int(s.get(), 0);
        u.name = columnText(s.get(), 1);
        u.email = columnText(s.get(), 2);
        u.role = columnText(s.get(), 3);
        u.status = columnText(s.get(), 4);
        result.push_back(std::move(u));
    }
    return result;
}
bool Database::deleteUser(int userId) {
    if (userId <= 0) return false;
    execute("BEGIN;");
    try {
        Statement reviews(db_, "DELETE FROM reviews WHERE reviewer_id=?;");
        reviews.integer(1, userId);
        if (!reviews.stepDone()) throw std::runtime_error(sqlite3_errmsg(db_));
        Statement papers(db_, "DELETE FROM papers WHERE author_user_id=?;");
        papers.integer(1, userId);
        if (!papers.stepDone()) throw std::runtime_error(sqlite3_errmsg(db_));
        Statement user(db_, "DELETE FROM users WHERE id=?;");
        user.integer(1, userId);
        if (!user.stepDone()) throw std::runtime_error(sqlite3_errmsg(db_));
        const bool deleted = sqlite3_changes(db_) > 0;
        execute("COMMIT;");
        return deleted;
    } catch (...) {
        execute("ROLLBACK;");
        throw;
    }
}
bool Database::updateUserStatus(int userId, const std::string& status) {
    if (userId <= 0 || (status != "Active" && status != "Disabled")) return false;
    Statement s(db_, "UPDATE users SET status=? WHERE id=?;");
    s.text(1, status); s.integer(2, userId);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}

bool Database::createPaper(const Paper& p, int authorUserId) {
    if (p.title.empty() || p.category.empty() || authorUserId <= 0) return false;
    Statement s(db_, "INSERT INTO papers(title,abstract,category,doi,publication_year,venue,paper_type,author_user_id) VALUES(?,?,?,?,?,?,?,?);");
    s.text(1,p.title); s.text(2,p.abstractText); s.text(3,p.category); s.text(4,p.doi);
    s.integer(5,p.publicationYear); s.text(6,p.venue);
    s.text(7,p.paperType.empty() ? "Research Paper" : p.paperType); s.integer(8,authorUserId);
    return s.stepDone();
}
std::vector<Paper> Database::listPapers() const {
    Statement s(db_, "SELECT p.id,p.title,p.abstract,p.category,p.doi,p.publication_year,p.venue,p.paper_type,p.status,u.email FROM papers p JOIN users u ON u.id=p.author_user_id ORDER BY p.id DESC;");
    std::vector<Paper> result;
    while (sqlite3_step(s.get()) == SQLITE_ROW) {
        Paper p;
        p.id=sqlite3_column_int(s.get(),0); p.title=columnText(s.get(),1);
        p.abstractText=columnText(s.get(),2); p.category=columnText(s.get(),3);
        p.doi=columnText(s.get(),4); p.publicationYear=sqlite3_column_int(s.get(),5);
        p.venue=columnText(s.get(),6); p.paperType=columnText(s.get(),7);
        p.status=columnText(s.get(),8); p.authorEmail=columnText(s.get(),9);
        result.push_back(std::move(p));
    }
    return result;
}
bool Database::updatePaper(const Paper& p) {
    if (p.id <= 0 || p.title.empty() || p.category.empty()) return false;
    Statement s(db_, "UPDATE papers SET title=?,abstract=?,category=?,doi=?,publication_year=?,venue=?,paper_type=? WHERE id=?;");
    s.text(1,p.title); s.text(2,p.abstractText); s.text(3,p.category); s.text(4,p.doi);
    s.integer(5,p.publicationYear); s.text(6,p.venue); s.text(7,p.paperType); s.integer(8,p.id);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}
bool Database::updatePaperStatus(int paperId, const std::string& status) {
    if (!allowedStatus(status) || paperId <= 0) return false;
    Statement s(db_, "UPDATE papers SET status=? WHERE id=?;");
    s.text(1,status); s.integer(2,paperId);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}
bool Database::deletePaper(int paperId) {
    if (paperId <= 0) return false;
    Statement s(db_, "DELETE FROM papers WHERE id=?;");
    s.integer(1, paperId);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}
bool Database::addReview(int paperId, int reviewerId, const std::string& decision,
                         const std::string& comments) {
    if (paperId <= 0 || reviewerId <= 0 ||
        (decision != "Under Review" && decision != "Approved" && decision != "Rejected"))
        return false;
    Statement s(db_, "INSERT INTO reviews(paper_id,reviewer_id,decision,comments) VALUES(?,?,?,?);");
    s.integer(1,paperId); s.integer(2,reviewerId); s.text(3,decision); s.text(4,comments);
    if (!s.stepDone()) return false;
    return updatePaperStatus(paperId, decision);
}
std::vector<Review> Database::listReviews(int paperId) const {
    Statement s(db_, "SELECT id,paper_id,reviewer_id,decision,comments,created_at FROM reviews WHERE paper_id=? ORDER BY id DESC;");
    s.integer(1,paperId);
    std::vector<Review> result;
    while (sqlite3_step(s.get()) == SQLITE_ROW) {
        Review r;
        r.id=sqlite3_column_int(s.get(),0); r.paperId=sqlite3_column_int(s.get(),1);
        r.reviewerId=sqlite3_column_int(s.get(),2); r.decision=columnText(s.get(),3);
        r.comments=columnText(s.get(),4); r.createdAt=columnText(s.get(),5);
        result.push_back(std::move(r));
    }
    return result;
}
std::vector<Review> Database::listAllReviews() const {
    Statement s(db_, "SELECT id,paper_id,reviewer_id,decision,comments,created_at FROM reviews ORDER BY id DESC;");
    std::vector<Review> result;
    while (sqlite3_step(s.get()) == SQLITE_ROW) {
        Review r;
        r.id=sqlite3_column_int(s.get(),0); r.paperId=sqlite3_column_int(s.get(),1);
        r.reviewerId=sqlite3_column_int(s.get(),2); r.decision=columnText(s.get(),3);
        r.comments=columnText(s.get(),4); r.createdAt=columnText(s.get(),5);
        result.push_back(std::move(r));
    }
    return result;
}
bool Database::addCategory(const std::string& name) {
    if (name.empty()) return false;
    Statement s(db_, "INSERT INTO categories(name) VALUES(?);");
    s.text(1,name);
    return s.stepDone();
}
bool Database::renameCategory(const std::string& oldName, const std::string& newName) {
    if (oldName.empty() || newName.empty()) return false;
    Statement s(db_, "UPDATE categories SET name=? WHERE name=? COLLATE NOCASE;");
    s.text(1, newName); s.text(2, oldName);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}
bool Database::deleteCategory(const std::string& name) {
    if (name.empty()) return false;
    Statement s(db_, "DELETE FROM categories WHERE name=? COLLATE NOCASE;");
    s.text(1, name);
    if (!s.stepDone()) return false;
    return sqlite3_changes(db_) > 0;
}
std::vector<std::string> Database::listCategories() const {
    Statement s(db_, "SELECT name FROM categories ORDER BY name COLLATE NOCASE;");
    std::vector<std::string> result;
    while (sqlite3_step(s.get()) == SQLITE_ROW) result.push_back(columnText(s.get(),0));
    return result;
}
} // namespace rpms
