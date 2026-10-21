# RPMS C++ Migration — Phase 3: HTTP/JSON API

## Included
- C++17 HTTP API backed by SQLite.
- JSON endpoints for health, student registration/login/logout, categories, papers, paper status, and reviews.
- Bearer-token sessions kept in process memory.
- Public registration can create Student accounts only; Faculty/Admin roles cannot be self-assigned.
- Role checks: authenticated users may submit papers; Faculty/Admin may review; only Admin may override paper status.
- CORS restricted to common local development origins on ports 5500 and 5173.
- HTTP smoke test added to CTest.

## Requirements
C++17, CMake 3.16+, SQLite3, OpenSSL, Python 3, and internet access during the first configure to fetch cpp-httplib and nlohmann/json.

## Build and test
```sh
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```

Run:
```sh
./build/rpms_server [path-to-database]
```
Server listens on `127.0.0.1:8080` by default. Set `RPMS_PORT` to change the port.

## Endpoints
- `GET /health`
- `POST /api/register` — JSON: `name,email,password,role`; only `Student` is accepted
- `POST /api/login` — JSON: `email,password`; returns `token,user`
- `POST /api/logout` — Bearer token
- `GET /api/categories`
- `GET /api/papers`
- `POST /api/papers` — Bearer token; JSON: `title,abstract,category,doi,publicationYear,venue,paperType`
- `PATCH /api/papers/{id}/status` — Admin only; JSON: `status`
- `GET /api/papers/{id}/reviews` — Faculty/Admin only
- `POST /api/papers/{id}/reviews` — Faculty/Admin only; JSON: `decision,comments`

Responses are JSON. Errors use an `error` field and appropriate HTTP status.

## Important limitations
This phase adds the API but does not yet migrate the existing frontend away from LocalStorage. Session tokens are in-memory and expire when the process exits; use HTTPS, durable session management, rate limiting, audit logging, and stronger operational controls before production deployment. The current API is bound to loopback for local development. Faculty/Admin account provisioning is intentionally not exposed as public registration. Existing frontend compatibility and end-to-end browser testing remain for the next phase.
