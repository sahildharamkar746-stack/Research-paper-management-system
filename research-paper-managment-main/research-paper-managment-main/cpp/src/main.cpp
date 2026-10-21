#include "rpms/database.hpp"

#include <iostream>
#include <string>

int main(int argc, char** argv) {
    const std::string dbPath = argc > 1 ? argv[1] : "rpms.sqlite3";
    try {
        rpms::Database db(dbPath);
        db.initialize();
        std::cout << "RPMS C++ data layer initialized. Database: " << dbPath << "\n";
        std::cout << "This phase provides the persistent domain layer; HTTP/API integration is a later phase.\n";
        std::cout << "Categories available: " << db.listCategories().size() << "\n";
        return 0;
    } catch (const std::exception& ex) {
        std::cerr << "RPMS startup failed: " << ex.what() << "\n";
        return 1;
    }
}
