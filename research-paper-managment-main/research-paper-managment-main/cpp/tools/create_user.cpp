#include "rpms/database.hpp"

#include <iostream>
#include <string>

#ifdef _WIN32
#include <conio.h>
#else
#include <termios.h>
#include <unistd.h>
#endif

namespace {
std::string readPassword() {
    std::string password;
    std::cerr << "Password (minimum 8 characters): ";
#ifdef _WIN32
    for (;;) {
        const int ch = _getch();
        if (ch == '\r' || ch == '\n') break;
        if (ch == 8) { if (!password.empty()) password.pop_back(); continue; }
        if (ch >= 32 && ch <= 126) password.push_back(static_cast<char>(ch));
    }
    std::cerr << "\n";
#else
    if (isatty(STDIN_FILENO)) {
        termios oldState{}, hiddenState{};
        if (tcgetattr(STDIN_FILENO, &oldState) == 0) {
            hiddenState = oldState;
            hiddenState.c_lflag &= static_cast<tcflag_t>(~ECHO);
            if (tcsetattr(STDIN_FILENO, TCSAFLUSH, &hiddenState) == 0) {
                std::getline(std::cin, password);
                tcsetattr(STDIN_FILENO, TCSAFLUSH, &oldState);
                std::cerr << "\n";
                return password;
            }
        }
    }
    std::getline(std::cin, password);
#endif
    return password;
}
}

int main(int argc, char** argv) {
    if (argc != 5) {
        std::cerr << "Usage: rpms_create_user <database-path> <name> <email> <Student|Faculty|Admin>\n"
                  << "The password is read from standard input without terminal echo where supported.\n";
        return 2;
    }
    try {
        rpms::Database db(argv[1]);
        db.initialize();
        const std::string password = readPassword();
        if (password.size() < 8) {
            std::cerr << "Password must be at least 8 characters.\n";
            return 3;
        }
        if (!db.createUser(argv[2], argv[3], password, argv[4])) {
            std::cerr << "User creation failed. Check the name, email, role, or whether the email already exists.\n";
            return 4;
        }
        std::cout << "User created successfully.\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "User creation failed: " << error.what() << "\n";
        return 1;
    }
}
