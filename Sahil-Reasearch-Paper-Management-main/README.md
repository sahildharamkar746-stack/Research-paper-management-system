# Research Paper Management System (ScholarTrack)

> **College Mini-Project**  
> **Tech Stack:** C++17 (Native REST API Server, POSIX Sockets, Cryptographic PBKDF2 Auth & Session Management), SQLite3 (Persistent Relational Storage & Multi-User Data Isolation), Python 3 (Academic CSV & BibTeX Integration), HTML5, CSS3, Vanilla JavaScript.

---

## 🌟 Overview & Architecture

**ScholarTrack** is a full-stack, responsive web application designed for academic researchers and students to organize, manage, filter, and track scientific research publications with **full multi-user authentication, server-side session management, and strict data isolation**.

Unlike typical college demo projects that only run mock data or rely on heavy Node.js/Python frameworks:
1. **The Core Backend is 100% C++17**:
   - Implements a native HTTP/1.1 REST API server using POSIX sockets and POSIX threads (`std::thread`).
   - Implements persistent data access via direct SQLite3 C/C++ bindings with parameterized prepared statements (`sqlite3_prepare_v2`, `sqlite3_bind_*`).
   - Implements standard cryptographic password hashing using **PBKDF2-HMAC-SHA256 with 100,000 iterations and 128-bit random salts** (NIST SP 800-132 compliant, immune to timing attacks via constant-time comparison).
   - Generates cryptographically secure 256-bit session tokens stored on the server in SQLite with expiration timestamps and delivered via `HttpOnly`, `SameSite=Lax` cookies.
   - Enforces login rate-limiting (10 attempts/minute window) and server-side request authentication.
2. **Strict User Data Isolation**:
   - Every research paper belongs to a specific `user_id`.
   - Every CRUD operation (`GET`, `POST`, `PUT`, `DELETE`, `favorite`, `reading-status`) checks `user_id` ownership at the SQL query level (`WHERE id = ? AND user_id = ?`).
   - A logged-in user cannot view, modify, or delete another user's research papers.
3. **Persistent SQLite Database**:
   - Tables: `users`, `sessions`, `papers`.
   - Foreign keys with cascade deletion and indices on `email`, `user_id`, `category`, `year`, `status`, `expires_at`.
   - Pre-seeded with a default demo academic account (`scholar@university.edu` / `password123`) and milestone research papers.
4. **Python Supporting Utility**:
   - `python/utilities/paper_tool.py`: Handles batch CSV export, BibTeX citation generation, and batch dataset imports without duplicating the C++ backend logic.
5. **Modern Academic Frontend**:
   - Modern dark-navy and blue academic aesthetic.
   - Dedicated **Login & Registration Pages** with password reveal toggles, input validation, and "Remember Me" options.
   - **Protected Dashboard** that is inaccessible without an active authenticated session.
   - Displays authenticated user profile name and email on the navigation bar with an instant one-click logout button.

---

## 📁 Project Structure

```text
research-paper-management/
│
├── backend/
│   ├── include/
│   │   ├── auth_crypto.hpp         # PBKDF2-SHA256, constant-time compare, random tokens
│   │   ├── database_manager.hpp    # SQLite3 schema, user auth, sessions, paper CRUD
│   │   ├── http_server.hpp         # POSIX C++ HTTP server, Cookie & Header parser
│   │   ├── json.hpp                # Minimal high-efficiency JSON parser/serializer
│   │   ├── paper.hpp               # User, Paper, and Filter data structures
│   │   └── paper_service.hpp       # User-isolated search, filter, and sorting algorithms
│   └── src/
│       ├── database_manager.cpp    # CRUD implementations & SQLite prepared statements
│       ├── http_server.cpp         # Socket management, routing, CORS, and Set-Cookie
│       └── main.cpp                # REST API endpoints, auth routes & static file server
│
├── frontend/
│   ├── index.html                  # Academic login, registration & dashboard markup
│   ├── style.css                   # Custom modern styles & responsive design
│   ├── script.js                   # Asynchronous fetch client & auth controllers
│   ├── papers_export.csv           # Sample exported CSV dataset
│   └── papers_export.bib           # Sample exported BibTeX citations
│
├── python/
│   └── utilities/
│       └── paper_tool.py           # Supporting utility for CSV/BibTeX data processing
│
├── database/
│   └── papers.db                   # Persistent SQLite database (auto-generated)
│
├── tests/
│   └── test_backend.cpp            # C++ automated auth, session, and isolation tests
│
├── CMakeLists.txt                  # Standard cross-platform CMake build configuration
├── backend_server                  # Compiled C++ backend binary
├── run_backend_tests               # Compiled C++ test suite binary
├── .gitignore                      # Git ignore rules for clean repo management
└── README.md                       # Comprehensive documentation
```

---

## 🚀 Localhost Quick Start (macOS / Linux)

### 1. Access the Running Website
The backend is already running on port 8080:

👉 **[http://localhost:8080](http://localhost:8080)**

#### Default Demo Credentials:
- **Email:** `scholar@university.edu`
- **Password:** `password123`
*(Or click the **"Use Demo User"** pill on the login page to autofill, or register your own new account).*

---

### 2. Manual Recompilation & Server Control

#### Navigate to project root:
```bash
cd /Users/vinit/.gemini/antigravity/scratch/research-paper-management
```

#### Compile the C++ backend:
```bash
clang++ -std=c++17 -Wall -Wextra -Ibackend/include \
    backend/src/database_manager.cpp \
    backend/src/http_server.cpp \
    backend/src/main.cpp \
    -lsqlite3 -lpthread -o backend_server
```

#### Start the backend server:
```bash
./backend_server 8080
```

#### Stop the backend server:
Press `Ctrl + C` in the terminal running `./backend_server`, or run:
```bash
kill -9 $(lsof -t -i :8080)
```

---

## 🧪 Testing the Authentication & Data Isolation

To execute the automated unit and integration tests:
```bash
clang++ -std=c++17 -Wall -Wextra -Ibackend/include \
    tests/test_backend.cpp \
    backend/src/database_manager.cpp \
    -lsqlite3 -lpthread -o run_backend_tests

./run_backend_tests
```

**Automated Verification Includes:**
1. Database schema initialization (`users`, `sessions`, `papers`).
2. Cryptographic PBKDF2-SHA256 password hashing with random salt & verification.
3. User registration and rejection of duplicate emails (case-insensitive).
4. Creation of cryptographically secure 256-bit server sessions.
5. User 1 (Alice) paper insertion and retrieval.
6. **Data Isolation Security Test**: Verification that User 2 (Bob) **cannot read, update, or delete** Alice's paper.
7. Verification of isolated paper count and aggregated metrics.
8. Session invalidation on logout.

---

## 🌐 REST API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account (`{"full_name","email","password"}`) |
| `POST` | `/api/auth/login` | Authenticate user & set `HttpOnly` session cookie |
| `POST` | `/api/auth/logout` | Invalidate server session & clear cookie |
| `GET` | `/api/auth/me` | Fetch currently logged-in user profile |

### Protected Research Paper Endpoints (Require Session)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/papers` | Query papers belonging to the authenticated user |
| `GET` | `/api/papers/{id}` | Get paper by ID (enforces user ownership) |
| `POST` | `/api/papers` | Add new paper under the authenticated user's account |
| `PUT` | `/api/papers/{id}` | Update paper (enforces user ownership) |
| `DELETE` | `/api/papers/{id}` | Delete paper (enforces user ownership) |
| `POST` | `/api/papers/toggle-favorite` | Toggle favorite flag for paper owned by user |
| `POST` | `/api/papers/reading-status` | Update reading status for paper owned by user |
| `GET` | `/api/statistics` | Aggregated metrics for authenticated user |
| `GET` | `/api/categories` | Categories present in authenticated user's library |

---

## 🔒 Security Architecture & Remaining Limitations

### Security Features Implemented:
1. **Password Security**: Standard PBKDF2-HMAC-SHA256 key derivation with 100,000 iterations and 128-bit random salts. Never stored in plain-text.
2. **Timing Attack Protection**: Constant-time comparison for password hash verification.
3. **Session Security**: 256-bit entropy tokens stored on the server in SQLite, transmitted exclusively via `HttpOnly`, `SameSite=Lax` cookies (preventing client-side script extraction or XSS session theft).
4. **SQL Injection Defense**: 100% of SQL operations with dynamic user inputs use SQLite prepared statements and parameterized bindings (`?`).
5. **Rate Limiting**: In-memory rate limiting throttles brute-force attempts on the login endpoint (max 10 attempts per minute).
6. **Data Isolation**: Multi-tenant separation enforced at SQL execution (`WHERE user_id = ?`).

### Known College Project Limitations:
- Running on plain HTTP (`http://localhost:8080`) during local testing. For production deployment over public networks, an SSL/TLS certificate (HTTPS) should terminate at a reverse proxy (e.g. Nginx or Cloudflare) to ensure the `Secure` cookie flag is active.
