#include "rpms/database.hpp"

#include <cstdio>
#include <iostream>
#include <stdexcept>
#include <string>

namespace {
void require(bool condition, const char* message) {
    if (!condition) throw std::runtime_error(message);
}
}
int main() {
    const std::string path = "rpms_test_database.sqlite3";
    std::remove(path.c_str());
    try {
        {
            rpms::Database db(path);
            db.initialize();
            require(db.listCategories().size() >= 5, "default categories should be seeded");
            require(db.createUser("Test Student", "student@example.test", "correct-horse-123", "Student"),
                    "valid user should be created");
            require(!db.createUser("X", "bad@example.test", "short", "Student"),
                    "invalid user should be rejected");
            rpms::User user;
            require(db.authenticate("STUDENT@example.test", "correct-horse-123", user),
                    "login should be case-insensitive for email");
            require(user.role == "Student", "authenticated role should match");
            rpms::User invalid;
            require(!db.authenticate("student@example.test", "wrong-password", invalid),
                    "wrong password should be rejected");
            rpms::Paper paper;
            paper.title = "A Test Paper";
            paper.abstractText = "Test abstract";
            paper.category = "Computer Networks";
            paper.publicationYear = 2026;
            paper.paperType = "Research Paper";
            require(db.createPaper(paper, user.id), "paper should be created");
            const auto papers = db.listPapers();
            require(papers.size() == 1 && papers.front().title == paper.title,
                    "created paper should be listed");
            require(db.updatePaperStatus(papers.front().id, "Under Review"),
                    "valid status update should work");
            require(!db.updatePaperStatus(papers.front().id, "Invalid"),
                    "invalid status should be rejected");
            require(db.addReview(papers.front().id, user.id, "Approved", "Looks good"),
                    "review should be stored and status updated");
            require(db.listReviews(papers.front().id).size() == 1,
                    "review should be listed");
        }
        std::remove(path.c_str());
        std::remove((path + "-wal").c_str());
        std::remove((path + "-shm").c_str());
        std::cout << "All RPMS database tests passed.\n";
        return 0;
    } catch (const std::exception& ex) {
        std::remove(path.c_str());
        std::cerr << "Test failure: " << ex.what() << "\n";
        return 1;
    }
}
