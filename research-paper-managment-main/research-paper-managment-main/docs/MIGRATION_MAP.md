# RPMS Migration Map

## Current phases
1. Source audit and feature map — completed.
2. C++17/SQLite domain/data layer and database tests — added; execution requires CI confirmation.
3. HTTP/JSON API and API smoke tests — added on migration branch; execution requires CI confirmation.
4. Frontend API client and LocalStorage migration — not yet completed.
5. Browser end-to-end verification, security review, and deployment — not yet completed.

## Existing frontend modules
- `js/data.js`: LocalStorage data and CRUD
- `js/auth.js`: login, registration, sessions
- `js/papers.js`: library, filters, submission/details
- `js/reviews.js`: review queue and decisions
- `js/admin.js`: user/category/status administration
- `js/dashboard.js`: analytics and activity
- `js/main.js`: shared UI utilities

See `cpp/README.md` for the Phase 3 API contract.

## Guardrails
Keep `main` unchanged until tests pass and the migration is reviewed. Do not claim tests passed unless the runner reports success. Never store plaintext passwords or trust browser-provided roles.
