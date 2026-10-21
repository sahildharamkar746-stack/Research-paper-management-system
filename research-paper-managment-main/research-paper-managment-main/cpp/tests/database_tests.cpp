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
            paper.keywords = "testing, networks";
            paper.methodology = "Unit test";
            paper.technologiesUsed = "C++, SQLite";
            paper.authorsJson = "[{\"name\":\"Test Author\",\"email\":\"student@example.test\"}]";
            paper.fileName = "test.pdf";
            paper.fileSize = "100 KB";
            paper.category = "Computer Networks";
            paper.publicationYear = 2026;
            paper.paperType = "Research Paper";
            require(db.createPaper(paper, user.id), "paper should be created");
            const auto papers = db.listPapers();
            require(papers.size() == 1 && papers.front().title == paper.title,
                    "created paper should be listed");
            require(papers.front().keywords == "testing, networks" && papers.front().methodology == "Unit test" &&
                    papers.front().technologiesUsed == "C++, SQLite" && papers.front().fileName == "test.pdf",
                    "paper metadata should persist");
            require(papers.front().authorsJson.find("Test Author") != std::string::npos,
                    "co-author metadata should persist");
            require(db.updatePaperStatus(papers.front().id, "Under Review"),
                    "valid status update should work");
            require(!db.updatePaperStatus(papers.front().id, "Invalid"),
                    "invalid status should be rejected");
            require(db.addReview(papers.front().id, user.id, "Approved", "Looks good"),
                    "review should be stored and status updated");
            require(db.listReviews(papers.front().id).size() == 1,
                    "review should be listed");
            require(db.updateUserProfile(rpms::User{.id=user.id, .name="Updated Test Student", .email=user.email,
                    .role=user.role, .status=user.status, .institution="Test University", .department="Computing",
                    .designation="Researcher", .bio="Profile test", .interests="AI, Networks"}),
                    "profile fields should update");
            rpms::User cleanupUser;
            require(db.createUser("Cleanup Author", "cleanup@example.test", "cleanup-pass-123", "Student"),
                    "cleanup user should be created");
            require(db.authenticate("cleanup@example.test", "cleanup-pass-123", cleanupUser),
                    "cleanup user should authenticate");
            rpms::Paper cleanupPaper;
            cleanupPaper.title = "Cleanup Paper";
            cleanupPaper.category = "Computer Networks";
            require(db.createPaper(cleanupPaper, cleanupUser.id), "cleanup paper should be created");
            const auto cleanupId = db.listPapers().front().id;
            require(db.addReview(cleanupId, user.id, "Rejected", "cleanup review"),
                    "cleanup review should be created");
            require(db.deleteUser(cleanupUser.id), "user deletion should succeed");
            require(db.listPapers().size() == 1, "deleting a user should remove their authored papers");
            require(db.listReviews(cleanupId).empty(), "deleting a user's paper should remove related reviews");
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
