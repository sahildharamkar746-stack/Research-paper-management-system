#include <iostream>
#include <cassert>
#include <filesystem>
#include "database_manager.hpp"
#include "paper_service.hpp"
#include "auth_crypto.hpp"

namespace fs = std::filesystem;

void run_all_tests() {
    std::cout << "[TEST RUNNER] Starting C++ Authentication & Data Isolation Tests...\n";

    fs::create_directories("database");
    std::string test_db = "database/test_auth_papers.db";
    if (fs::exists(test_db)) {
        fs::remove(test_db);
    }

    DatabaseManager db(test_db);
    assert(db.init_schema() && "Database schema initialization failed");
    std::cout << "  1. [PASS] Database schema initialization (users, sessions, papers)\n";

    // 1. Password Hashing and Verification
    std::string test_pwd = "SuperSecretPassword123!";
    std::string hashed = crypto_utils::hash_password(test_pwd);
    assert(!hashed.empty() && "Password hashing failed");
    assert(hashed.find("$pbkdf2-sha256$100000$") == 0);
    assert(crypto_utils::verify_password(test_pwd, hashed) && "Password verification failed");
    assert(!crypto_utils::verify_password("WrongPassword!", hashed) && "Incorrect password should fail");
    assert(!crypto_utils::verify_password("", hashed) && "Empty password should fail");
    std::cout << "  2. [PASS] Cryptographic PBKDF2-SHA256 password hashing & verification\n";

    // 2. User Registration
    int u1_id = db.register_user("Alice Researcher", "alice@mit.edu", hashed);
    assert(u1_id > 0 && "User 1 registration failed");
    std::cout << "  3. [PASS] User 1 registered with ID: " << u1_id << "\n";

    // Duplicate email registration should fail or exist check should return true
    assert(db.email_exists("alice@mit.edu") && "email_exists returned false for existing user");
    assert(db.email_exists("ALICE@MIT.EDU") && "email_exists case-insensitivity failed");
    std::cout << "  4. [PASS] Duplicate email check and case-insensitivity\n";

    // Register User 2
    std::string u2_hash = crypto_utils::hash_password("BobSecret456!");
    int u2_id = db.register_user("Bob Scientist", "bob@stanford.edu", u2_hash);
    assert(u2_id > 0 && "User 2 registration failed");
    assert(u1_id != u2_id);
    std::cout << "  5. [PASS] User 2 registered with distinct ID: " << u2_id << "\n";

    // 3. Session Management
    std::string session_token = crypto_utils::generate_secure_token(32);
    assert(session_token.length() == 64);
    assert(db.create_session(session_token, u1_id, 3600) && "Create session failed");
    auto validated_user = db.validate_session(session_token);
    assert(validated_user.has_value() && *validated_user == u1_id && "Session validation mismatch");
    std::cout << "  6. [PASS] Cryptographic session creation and validation\n";

    // 4. Paper CRUD & Strict User Data Isolation
    Paper p1;
    p1.is_public = false; // Private paper
    p1.title = "Alice's Quantum Computing Breakthrough";
    p1.authors = "Alice Researcher, Charles Bennett";
    p1.abstract_text = "Quantum algorithms demonstration.";
    p1.keywords = "Quantum, Computing, Physics";
    p1.year = 2025;
    p1.venue = "Nature";
    p1.category = "Computer Networks";
    p1.status = "Published";
    p1.reading_status = "Completed";
    p1.favorite = true;

    int p1_id = db.add_paper(p1, u1_id);
    assert(p1_id > 0 && "Alice adding paper failed");
    std::cout << "  7. [PASS] Alice added paper ID: " << p1_id << "\n";

    // Verify Alice can read her paper
    auto alice_paper = db.get_paper_by_id(p1_id, u1_id);
    assert(alice_paper.has_value() && alice_paper->title == p1.title);
    std::cout << "  8. [PASS] Alice can read her paper\n";

    // DATA ISOLATION TEST: Bob MUST NOT be able to read Alice's paper
    auto bob_attempt = db.get_paper_by_id(p1_id, u2_id);
    assert(!bob_attempt.has_value() && "DATA LEAK: Bob could access Alice's paper!");
    std::cout << "  9. [PASS] Data isolation verified: Bob cannot read Alice's paper\n";

    // DATA ISOLATION TEST: Bob MUST NOT be able to edit Alice's paper
    Paper hack_paper = p1;
    hack_paper.title = "Hacked Title";
    bool bob_update_result = db.update_paper(p1_id, u2_id, hack_paper);
    assert(!bob_update_result && "SECURITY VULNERABILITY: Bob updated Alice's paper!");
    std::cout << " 10. [PASS] Data isolation verified: Bob cannot modify Alice's paper\n";

    // DATA ISOLATION TEST: Bob MUST NOT be able to delete Alice's paper
    bool bob_delete_result = db.delete_paper(p1_id, u2_id);
    assert(!bob_delete_result && "SECURITY VULNERABILITY: Bob deleted Alice's paper!");
    std::cout << " 11. [PASS] Data isolation verified: Bob cannot delete Alice's paper\n";

    // Check Alice's papers count vs Bob's in private scope
    auto alice_papers = db.get_papers_accessible_by_user(u1_id, "mine");
    auto bob_papers = db.get_papers_accessible_by_user(u2_id, "mine");
    assert(alice_papers.size() == 1);
    assert(bob_papers.size() == 0);
    std::cout << " 12. [PASS] User isolated paper lists (Alice: 1, Bob: 0)\n";

    // 5. PaperService Search & Aggregated Statistics Isolation
    PaperService service(db);
    PaperFilter filter;
    filter.scope = "mine";
    filter.search_query = "Quantum";
    auto search_alice = service.query_papers(u1_id, filter);
    assert(search_alice.size() == 1);
    auto search_bob = service.query_papers(u2_id, filter);
    assert(search_bob.size() == 0);
    std::cout << " 13. [PASS] Search queries strictly scoped to authenticated user\n";

    auto alice_stats = db.get_statistics(u1_id, "mine");
    assert(alice_stats.total_papers == 1);
    auto bob_stats = db.get_statistics(u2_id, "mine");
    assert(bob_stats.total_papers == 0);
    std::cout << " 14. [PASS] Statistics aggregation strictly scoped to authenticated user\n";

    // 6. Session Invalidation (Logout)
    assert(db.delete_session(session_token) && "Delete session failed");
    auto logged_out_check = db.validate_session(session_token);
    assert(!logged_out_check.has_value() && "Session still valid after logout!");
    std::cout << " 15. [PASS] Session invalidation upon logout\n";

    // Clean up test db
    if (fs::exists(test_db)) {
        fs::remove(test_db);
    }

    std::cout << "========================================================\n";
    std::cout << "  ALL 15 AUTH & DATA ISOLATION TESTS PASSED (100%)      \n";
    std::cout << "========================================================\n";
}

int main() {
    try {
        run_all_tests();
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "[-] Test failed: " << e.what() << std::endl;
        return 1;
    }
}
