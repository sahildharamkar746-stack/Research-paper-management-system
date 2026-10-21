# RPMS Migration Map — Phase 3

## Existing frontend
The application is static HTML/CSS/vanilla JavaScript and currently persists application state in LocalStorage.
- `js/data.js`: seed data and CRUD
- `js/auth.js`: login, registration, session handling
- `js/papers.js`: library, filters, paper submission/details
- `js/reviews.js`: review queue and decisions
- `js/admin.js`: user/category/status administration
- `js/dashboard.js`: dashboard analytics and activity
- `js/main.js`: shared UI helpers

## Phase status
1. Source audit and feature mapping — completed.
2. C++17/SQLite domain/data layer and database tests — added; execution still needs CI confirmation.
3. HTTP/JSON API and API smoke tests — added on the migration branch.
4. Frontend API client and LocalStorage migration — not yet completed.
5. Browser-level end-to-end verification, security review, and deployment — not yet completed.

## API contract
See `cpp/README.md` for endpoints and request bodies.

## Guardrails
- Keep `main` unchanged until the migration has been tested and reviewed.
- Do not claim a test passed until its runner reports success.
- Do not store plaintext passwords.
- Server-side authorization must remain authoritative; never trust role values supplied by the browser.
