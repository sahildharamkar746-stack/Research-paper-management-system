# RPMS C++ Migration — Phase 2: Core Data Layer

This directory introduces a C++17 domain/data layer without replacing the current browser application yet.

## Included
- SQLite-backed users, categories, papers, reviews, and activity tables.
- Prepared statements for user-supplied values.
- Role/status constraints and foreign-key relationships.
- PBKDF2-HMAC-SHA-256 password derivation with a per-user cryptographically random salt (OpenSSL).
- CMake build and CTest database checks.

## Requirements
- C++17 compiler
- CMake 3.16+
- SQLite3 development package
- OpenSSL development package

## Build and test

From this directory:

```sh
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --config Release
ctest --test-dir build --output-on-failure
```

Run the current data-layer smoke executable:

```sh
./build/rpms_server [path-to-database]
```

On Windows, run `build\\Release\\rpms_server.exe` if using a multi-configuration generator.

## Scope and known gaps
This is an initial implementation phase, not a completed migration. The current executable initializes the database and reports basic status; it is **not yet an HTTP server** and the existing HTML pages are not yet wired to this C++ layer. The next phase must implement and test the API boundary, then migrate frontend data calls while preserving the UI. Authorization checks must be enforced server-side before exposing the API. File upload/storage and multi-author records also need dedicated schema and tests.
