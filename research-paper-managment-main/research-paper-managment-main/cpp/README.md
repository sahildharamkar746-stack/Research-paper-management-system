# RPMS C++ Migration — Phase 3: HTTP/JSON API

## Included
- C++17 HTTP API backed by SQLite.
- Health, student registration/login/logout, categories, papers, paper status, and review endpoints.
- Random bearer tokens held in process memory.
- Public registration creates Student accounts only; users cannot self-assign Faculty/Admin.
- Authenticated paper submission; Faculty/Admin review; Admin-only status override.
- Local-development CORS allowlist and HTTP smoke test registered with CTest.

## Requirements
C++17, CMake 3.16+, SQLite3, OpenSSL, Python 3, and internet access during first configure to fetch cpp-httplib and nlohmann/json.

## Build and test
```sh
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```
Run `./build/rpms_server [path-to-database]`. The server binds to `127.0.0.1:8080`; set `RPMS_PORT` to change the port.

## Endpoints
- `GET /health`
- `POST /api/register`: `name,email,password,role` (role must be Student)
- `POST /api/login`: `email,password` (returns `token,user`)
- `POST /api/logout`: Bearer token
- `GET /api/categories`
- `GET /api/papers`
- `POST /api/papers`: Bearer token; `title,abstract,category,doi,publicationYear,venue,paperType`
- `PATCH /api/papers/{id}/status`: Admin only; `status`
- `GET /api/papers/{id}/reviews`: Faculty/Admin only
- `POST /api/papers/{id}/reviews`: Faculty/Admin only; `decision,comments`

Errors return JSON with an `error` field.

## Known gaps
The existing frontend still uses LocalStorage and is not wired to this API. Tokens are in-memory and reset when the server restarts. The service is bound to loopback for development. Before production, add HTTPS termination, rate limiting, durable/revocable sessions, account provisioning for Faculty/Admin, comprehensive audit logs, and deployment hardening.
