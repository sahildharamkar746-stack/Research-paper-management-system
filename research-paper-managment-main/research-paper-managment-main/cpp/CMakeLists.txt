cmake_minimum_required(VERSION 3.16)
project(RPMS_CPP LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

find_package(SQLite3 REQUIRED)
find_package(OpenSSL REQUIRED)

add_library(rpms_core
    src/database.cpp
)
target_include_directories(rpms_core PUBLIC include)
target_link_libraries(rpms_core PUBLIC SQLite::SQLite3 OpenSSL::Crypto)
target_compile_options(rpms_core PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Wconversion>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

add_executable(rpms_server src/main.cpp)
target_link_libraries(rpms_server PRIVATE rpms_core)

include(CTest)
if(BUILD_TESTING)
    add_executable(rpms_database_tests tests/database_tests.cpp)
    target_link_libraries(rpms_database_tests PRIVATE rpms_core)
    add_test(NAME rpms_database_tests COMMAND rpms_database_tests)
endif()
