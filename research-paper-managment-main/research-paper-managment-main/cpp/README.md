# RPMS C++ Migration — Phase 3: HTTP/JSON API

C++17 HTTP API backed by SQLite. Endpoints cover health, student registration/login/logout, categories, papers, paper status, and reviews. Public registration is limited to Student accounts. Authenticated users may submit papers; Faculty/Admin may review; only Admin may override paper status. CORS is restricted to local development origins.

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
- `GET /api/admin/users`: Admin only
- `DELETE /api/admin/users/{id}`: Admin only; deletes the account, its authored papers, and its reviews
- `GET /api/researchers`: public active Student/Faculty directory
- `PATCH /api/admin/users/{id}/status`: Admin only; `status` is `Active` or `Disabled`
- `POST /api/categories`: Admin only; `name`
- `PATCH /api/categories`: Admin only; `oldName,newName`
- `DELETE /api/categories`: Admin only; `name`
- `DELETE /api/papers/{id}`: Admin only
- `GET /api/reviews`: Faculty/Admin only
- `GET /api/papers`
- `POST /api/papers`: Bearer token; `title,abstract,category,doi,publicationYear,venue,paperType`
- `PATCH /api/papers/{id}`: owner or Admin; updates paper metadata
- `PATCH /api/papers/{id}/status`: Admin only; `status`
- `GET /api/papers/{id}/reviews`: Faculty/Admin only
- `POST /api/papers/{id}/reviews`: Faculty/Admin only; `decision,comments`

Errors return JSON with an `error` field. The CTest HTTP integration test seeds Faculty/Admin users using a separate test-only executable; those credentials are not provisioned by the production API.

## Known gaps
The login and registration pages now call this API, but the remaining application modules still need full data-flow integration and browser end-to-end verification. Tokens are in-memory and reset when the server restarts. The service is bound to loopback for development. Before production, add HTTPS termination, rate limiting, durable/revocable sessions, approved Faculty/Admin provisioning, comprehensive audit logs, and deployment hardening.
