cmake_minimum_required(VERSION 3.16)
project(RPMS_CPP LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

include(FetchContent)
find_package(SQLite3 REQUIRED)
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

FetchContent_Declare(httplib
    GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
    GIT_TAG v0.18.3
    GIT_SHALLOW TRUE
)
FetchContent_Declare(json
    GIT_REPOSITORY https://github.com/nlohmann/json.git
    GIT_TAG v3.11.3
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(httplib json)

add_library(rpms_core src/database.cpp)
target_include_directories(rpms_core PUBLIC include)
target_link_libraries(rpms_core PUBLIC SQLite::SQLite3 OpenSSL::Crypto)
target_compile_options(rpms_core PRIVATE
    $<$<CXX_COMPILER_ID:GNU,Clang>:-Wall -Wextra -Wpedantic -Wconversion>
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
)

add_executable(rpms_server src/main.cpp)
target_link_libraries(rpms_server PRIVATE rpms_core httplib::httplib nlohmann_json::nlohmann_json Threads::Threads)

include(CTest)
if(BUILD_TESTING)
    add_executable(rpms_database_tests tests/database_tests.cpp)
    target_link_libraries(rpms_database_tests PRIVATE rpms_core)
    add_test(NAME rpms_database_tests COMMAND rpms_database_tests)
    find_package(Python3 COMPONENTS Interpreter REQUIRED)
    add_test(NAME rpms_http_api_tests
        COMMAND ${Python3_EXECUTABLE} ${CMAKE_CURRENT_SOURCE_DIR}/tests/api_smoke_test.py $<TARGET_FILE:rpms_server>)
    set_tests_properties(rpms_http_api_tests PROPERTIES TIMEOUT 45)
endif()
