cmake_minimum_required(VERSION 3.14)
project(ResearchPaperManagement VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(backend/include)

# SQLite3 library
find_package(SQLite3 REQUIRED)

# Source files
set(SOURCES
    backend/src/main.cpp
    backend/src/database_manager.cpp
    backend/src/http_server.cpp
)

# Main Executable
add_executable(backend_server ${SOURCES})
target_link_libraries(backend_server PRIVATE SQLite::SQLite3 pthread)

# Test Executable
add_executable(run_backend_tests tests/test_backend.cpp backend/src/database_manager.cpp)
target_link_libraries(run_backend_tests PRIVATE SQLite::SQLite3 pthread)
target_include_directories(run_backend_tests PRIVATE backend/include)
