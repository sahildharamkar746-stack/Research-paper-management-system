# RPMS C++ Migration — Phase 3: HTTP/JSON API

C++17 HTTP API backed by SQLite. The frontend is wired to server-backed authentication, papers, authors, categories, reviews, profile, activity, and admin actions. Public registration is limited to Student accounts. Authenticated users may submit papers; Faculty/Admin may review; only Admin may override paper status. CORS is restricted to local development origins.

## Requirements
C++17, CMake 3.16+, SQLite3, OpenSSL, Python 3, and internet access during first configure to fetch cpp-httplib and nlohmann/json.

## Build and test
```sh
cmake -S . -B build -DBUILD_TESTING=ON
cmake --build build --parallel 2
ctest --test-dir build --output-on-failure
```
Run `./build/rpms_server [path-to-database]`. The server binds to `127.0.0.1:8080`; set `RPMS_PORT` to change the port.

## Provision Faculty/Admin accounts

Public registration intentionally creates Student accounts only. After building, run the account-provisioning utility to create Faculty or Admin accounts. It prompts for a password and suppresses terminal echo where supported:

\`\`\`sh
./build/rpms_create_user rpms.sqlite3 "Reviewer Name" reviewer@example.edu Faculty
./build/rpms_create_user rpms.sqlite3 "Administrator" admin@example.edu Admin
\`\`\`

Use the same database path as the server. Keep the database file private and provision accounts only for trusted users.

## Endpoints
- `GET /health`
- `POST /api/register`: `name,email,password,role` (role must be Student)
- `POST /api/login`: `email,password` (returns `token,user`)
- `POST /api/logout`: Bearer token
- `GET /api/categories`
- `PATCH /api/profile`: authenticated user updates their own profile
- `POST /api/admin/reset`: Admin only; resets papers, reviews, categories, and activity while retaining accounts
- `GET /api/admin/users`: Admin only
- `DELETE /api/admin/users/{id}`: Admin only; deletes the account, its authored papers, and its reviews
- `GET /api/researchers`: public active Student/Faculty directory
- `PATCH /api/admin/users/{id}/status`: Admin only; `status` is `Active` or `Disabled`
- `POST /api/categories`: Admin only; `name`
- `PATCH /api/categories`: Admin only; `oldName,newName`
- `DELETE /api/categories`: Admin only; `name`
- `DELETE /api/papers/{id}`: Admin only
- `GET /api/reviews`: Faculty/Admin only
- `GET /api/activity`: authenticated; latest 40 events
- `POST /api/activity`: authenticated; `text,type`
- `GET /api/papers`
- `POST /api/papers`: Bearer token; title/abstract/category plus keywords, authors, methodology, technologies, and file metadata
- `PATCH /api/papers/{id}`: owner or Admin; updates paper metadata
- `PATCH /api/papers/{id}/status`: Admin only; `status`
- `GET /api/papers/{id}/reviews`: Faculty/Admin only
- `POST /api/papers/{id}/reviews`: Faculty/Admin only; `decision,comments`

Errors return JSON with an `error` field. The CI workflow runs CMake/database tests, frontend contract checks, HTTP integration tests, and Playwright browser tests for Student registration/login, paper submission, Faculty review, and Admin user listing. The CTest HTTP integration test seeds Faculty/Admin users using a separate test-only executable; those credentials are not provisioned by the production API.

## Known gaps
The API token is held in process memory and becomes invalid after a server restart; the browser stores the bearer token in LocalStorage. The service binds to loopback for development. Paper file name/size metadata is stored, but uploading and serving actual document bytes is not implemented. Password reset and email verification are not implemented. Before production, add HTTPS, rate limiting, durable sessions, backups, monitoring, and a reviewed CORS policy.
