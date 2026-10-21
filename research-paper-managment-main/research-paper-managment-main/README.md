# Research Paper Management System (RPMS)

> **“Organize. Discover. Manage Research Smarter.”**

A complete, modern, and professional web-based academic research repository designed as a college engineering mini-project. RPMS operates directly within modern web browsers using pure **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)** with **zero backend dependencies**, leveraging browser `localStorage` as a client-side database.

---

## 1. Introduction

Academic institutions generate substantial intellectual property through undergraduate projects, graduate theses, and faculty research. Traditional paper management often suffers from fragmented file sharing, lost peer reviews, lack of centralized indexing, and missing status visibility. 

The **Research Paper Management System (RPMS)** solves this problem by delivering a single, centralized web portal where students can submit manuscripts, faculty mentors can conduct peer reviews with feedback, and administrators can monitor institutional output with interactive analytics.

---

## 2. Problem Statement

College engineering departments frequently encounter these challenges:
- **Scattered Submissions**: Papers submitted over emails or physical printouts are difficult to track and archive.
- **Opaque Review Lifecycle**: Students are unaware whether their submitted work is pending, under review, accepted, or rejected.
- **Lack of Institutional Search**: Searching past research by domain keywords, DOI, publication year, or authors is cumbersome.
- **Administrative Blind Spots**: Heads of departments lack unified real-time metrics on research domain distributions and acceptance ratios.

---

## 3. Project Objectives

1. Develop a responsive, browser-native academic platform without requiring external backend servers or databases.
2. Implement **Role-Based Access Control (RBAC)** supporting **Student/Researcher**, **Faculty Reviewer**, and **Administrator** roles.
3. Provide a peer-review pipeline enabling structured feedback and multi-stage status tracking (`Pending` &rarr; `Under Review` &rarr; `Approved` / `Rejected`).
4. Enable multi-faceted searching, domain filtering, and metadata sorting across research libraries.
5. Provide live research metrics and domain insights calculated dynamically from client storage.

---

## 4. Key Features

- **Authentication & RBAC**:
  - Secure login with show/hide password toggle.
  - Role-gated navigation and permissions.
  - Registration for Students and Faculty (Admin role is restricted).
  - Quick demo account switchers for viva presentations.
- **Paper Management**:
  - Multi-attribute submission form (Title, Abstract, Category, DOI, Publication Year, Venue, Type, Methodology, Technologies).
  - Dynamic multi-author roster builder (`+ Add Author`).
  - Simulated PDF file upload dropzone with preview, file size tracking, and removal.
  - Digital preservation PDF download generator.
- **Interactive Library**:
  - Full-text search across Title, Authors, Keywords, and DOI.
  - Faceted filters: Category, Year, Status, Publication Type.
  - Sorting: Newest, Oldest, Title A-Z, Title Z-A.
  - Dynamic query feedback (`X papers found for '...'`) and empty state handlers.
- **Visual Status Tracker**:
  - Multi-stage visual lifecycle: `Submitted` &rarr; `Under Review` &rarr; `Approved` / `Rejected`.
- **Peer Review Pipeline (Faculty & Admin)**:
  - Evaluation queue for submitted manuscripts.
  - Interactive evaluation modal with status decision and constructive feedback remarks.
- **Unique Feature — Institutional Research Insights**:
  - Real-time dynamic calculations of:
    - *Most Researched Category*
    - *Most Active Researcher*
    - *Repository Acceptance Rate (%)*
    - *Latest Publication Year*
- **Visual Analytics**:
  - Pure CSS/HTML dynamic bar charts depicting research discipline distribution.
  - Real-time status breakdown proportion bar.
  - Live activity feed tracking submissions, reviews, and updates.
- **Administrative Console**:
  - User management (View details, Disable/Enable accounts, Delete).
  - Manuscript repository audits and status overrides.
  - Discipline category manager (Add, Edit, Delete).
  - Factory reset button to restore default demo records at any time.

---

## 5. Technology Stack

In strict compliance with engineering project guidelines, RPMS uses **pure frontend web standards without third-party frameworks or build tools**:

- **Markup**: HTML5 (Semantic tags: `<header>`, `<aside>`, `<main>`, `<nav>`, `<section>`, `<footer>`)
- **Styling**: CSS3 (CSS Variables / Design Tokens, Flexbox, CSS Grid, Custom Media Queries, Keyframe Animations)
- **Scripting**: Vanilla JavaScript (ES6+ classes, arrow functions, destructuring, template literals, localStorage API, Blob API)
- **Storage**: Browser `localStorage` (JSON serialization)
- **Frameworks/Libraries Used**: **None** (No React, Angular, Vue, Node.js, Express, Bootstrap, Tailwind, Firebase, or Supabase).

---

## 6. Hardware & Software Requirements

### Hardware Requirements
- **Processor**: Intel Core i3 / AMD Ryzen 3 or higher (Any modern x86/ARM CPU)
- **RAM**: Minimum 2 GB RAM (4 GB recommended)
- **Storage**: At least 50 MB of available hard drive space
- **Display**: 1024x768 minimum resolution (responsive down to 360px mobile)

### Software Requirements
- **Operating System**: Windows 10/11, macOS, Linux, or ChromeOS
- **Web Browser**: Any modern evergreen browser (Google Chrome 90+, Mozilla Firefox 88+, Microsoft Edge 90+, Safari 14+)
- **Text Editor (Optional for reviewing code)**: VS Code, Sublime Text, or Notepad++

---

## 7. Project File Structure

```
Research-Paper-Management-System/
│
├── index.html            # Public landing page with hero, stats & features
├── login.html            # Authentication with demo quick-fill presets
├── register.html         # User registration with role validation
├── dashboard.html        # Main dashboard with metrics, charts & activity
├── papers.html           # Full research library with search & multi-filter
├── add-paper.html        # Manuscript submission form with multi-authors
├── paper-details.html    # Full metadata, visual status tracker & PDF download
├── my-papers.html        # Personal authored paper list with feedback
├── researchers.html      # Directory of faculty & student contributors
├── categories.html       # Research disciplines catalog with paper counts
├── reviews.html          # Faculty peer-review evaluation workflow
├── profile.html          # Researcher profile view and live editing
├── admin.html            # Administrator console for users, papers & categories
├── README.md             # Project documentation for viva presentation
│
├── css/
│   ├── style.css         # Design tokens, base typography, buttons, landing & modals
│   ├── dashboard.css     # Sidebar layout, cards, status tracker, charts & tables
│   └── responsive.css    # Responsive breakpoints for tablets and mobile devices
│
├── js/
│   ├── data.js           # LocalStorage database schema, seed data, and CRUD
│   ├── auth.js           # Session handling, RBAC route protection & user UI
│   ├── papers.js         # Library search, multi-filter, sorting & form logic
│   ├── dashboard.js      # Metric counters, insight engine & SVG/CSS charts
│   ├── reviews.js        # Peer review queue & faculty evaluation modal
│   ├── admin.js          # User, paper, category administration & DB reset
│   └── main.js           # Toast notification engine, modal toggles & helpers
│
└── assets/
    ├── images/           # Visual placeholders
    └── icons/            # SVG vector assets
        └── logo.svg
```

---

## 8. How to Run the Project

No compilation, installation, or Node server is required:

1. Download or extract the `Research-Paper-Management-System` folder.
2. Double-click **`index.html`** or right-click and choose **Open with Google Chrome** (or any browser).
3. Alternatively, if using VS Code, right-click `index.html` and click **"Open with Live Server"**.
4. The system will automatically initialize demo data into `localStorage` on first launch.

---

## 9. Demo Credentials for Viva / Evaluation

The project comes pre-seeded with three realistic user roles:

| Role | Name | Email | Password | Privileges |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@rpms.com` | `admin123` | Full access, user management, status overrides, category editing |
| **Faculty** | Dr. Rahul Kulkarni | `faculty@rpms.com` | `faculty123` | Peer review queue, evaluate papers, approve/reject manuscripts, add feedback |
| **Student** | Aarav Sharma | `student@rpms.com` | `student123` | Submit manuscripts, edit/delete own papers, track review status, view profile |

> **Pro Tip during viva**: On `login.html`, click any of the **🎯 Quick Demo Accounts** chips to immediately auto-populate credentials with one click.

---

## 10. How LocalStorage Is Used (Client Database)

Since this mini-project is designed to run in standalone browser environments without a backend server, all entities are serialized into standard JSON strings and managed through `js/data.js`:

- `rpms_users`: Array of user accounts (ID, name, email, password, role, status, department, bio).
- `rpms_papers`: Collection of research papers with full bibliographic metadata, authors array, status, and feedback.
- `rpms_categories`: List of engineering disciplines with descriptions.
- `rpms_reviews`: Review audit records containing reviewer identity, paper ID, evaluation decision, and comments.
- `rpms_activity`: Chronological log of recent operations (submissions, approvals, logins).
- `rpms_current_user`: Active session object.

### Database Operations Implemented:
- `getUsers()`, `saveUser()`, `updateUser()`, `deleteUser()`, `findUserByEmail()`
- `getPapers()`, `savePaper()`, `getPaperById()`, `updatePaper()`, `deletePaper()`
- `getCategories()`, `saveCategory()`, `updateCategory()`, `deleteCategory()`
- `getReviews()`, `saveReview()`
- `getActivities()`, `addActivity()`
- `getSystemStats()`, `getResearchInsights()`

---

## 11. Security Note for College Demonstration

- In this client-side architecture, credentials and session records reside within browser `localStorage`.
- This approach is ideal for an undergraduate viva demonstration because it works offline on any machine without database configuration.
- In production enterprise deployments, authentication must be verified using server-side session tokens (e.g., JWT, HTTP-only cookies) over HTTPS, with hashed passwords (bcrypt/Argon2) stored in a secure relational/document database (e.g., PostgreSQL, MongoDB).

---

## 12. Limitations

- **Browser-Scoped Storage**: Data is isolated to the specific browser and machine running the project. Clearing browser cache resets `localStorage`.
- **Simulated Binary Uploads**: Due to browser storage constraints (typically 5 MB per origin), manuscripts are represented by metadata and simulated client PDF downloads rather than multi-megabyte binary Blobs.
- **Single-Origin Peer Review**: Simultaneous multi-user concurrent reviews across separate devices require a network backend (WebSocket / REST API).

---

## 13. Future Scope

1. **Cloud Backend Migration**: Integrate a RESTful API using Node.js / Express or Django with PostgreSQL for cross-device persistence.
2. **Plagiarism Detection**: Connect with Turnitin / Copyleaks API to analyze manuscript text similarity during upload.
3. **Automated BibTeX / APA Citation Export**: One-click citation formatting in APA, IEEE, and BibTeX standards.
4. **DOI Minting**: Integration with Crossref or DataCite APIs for real automated DOI assignment.
5. **PDF Annotation**: Inline PDF canvas viewer enabling reviewers to highlight and annotate specific text passages.
