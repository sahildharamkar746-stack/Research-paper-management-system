# RPMS Migration Map — Source Audit and Phase Plan

## Existing source baseline
The current app is a static HTML/CSS/vanilla-JavaScript application. Its persistent state is in browser LocalStorage. The main data and behavior files are:
- `js/data.js`: seed data and CRUD for users, papers, categories, reviews, activity, and analytics.
- `js/auth.js`: login, registration, session handling, and role-gated routes.
- `js/papers.js`: paper library, filtering, submission form, details, and personal-paper views.
- `js/reviews.js`: faculty/admin review queue and decision submission.
- `js/admin.js`: user management, paper status overrides, category management, and reset.
- `js/dashboard.js`: dashboard statistics, research insights, analytics, and activity feed.
- `js/main.js`: shared UI utilities and rendering helpers.

## Feature mapping
| Existing behavior | Target C++/SQLite responsibility | Validation |
|---|---|---|
| Register/login/current user | Auth service + users repository | Valid/invalid credentials, disabled user, duplicate email, role restrictions |
| Paper submission/details/my papers | Paper service + papers repository | Required fields, author ownership, persistence |
| Library search/filter/sort | Query/service layer | Combined filters, empty results, stable sort |
| Review decisions/comments | Review service + transaction | Role permissions, valid status transition, review history |
| Category CRUD | Category service/repository | Duplicate names, empty values, admin-only mutation |
| User enable/disable/delete | Admin service/repository | Prevent self-disable/delete; preserve referential integrity |
| Dashboard metrics/activity | SQL aggregate queries + activity log | Empty database, accurate counts, consistent status totals |
| File upload/download | File storage service + metadata table | Size/type checks, path safety, missing files |
| Existing responsive UI | Keep HTML/CSS; replace data access with API client | Page smoke tests and browser end-to-end tests |

## Current phase status
Phase 1 (inspection) identified the JavaScript LocalStorage architecture and the major feature modules above.
Phase 2 adds the initial C++17/SQLite data layer, password hashing, schema constraints, build configuration, and basic database tests.
Phase 3 is required before this can be called a migrated application: implement HTTP/JSON endpoints, server-side authorization, API integration in the existing frontend, and full end-to-end tests.

## Explicit safety constraints
- Do not modify `js/main.js` as part of the migration unless a separately documented compatibility requirement is approved; keep it unchanged.
- Never write changes to the `main` branch during migration work.
- Do not report tests as passed unless they were executed in an environment with the stated dependencies.
- Do not store plaintext passwords.
