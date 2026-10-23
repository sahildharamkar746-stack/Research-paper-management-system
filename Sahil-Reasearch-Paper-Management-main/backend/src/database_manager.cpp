#include "database_manager.hpp"
#include <iostream>
#include <set>
#include <map>
#include <sstream>
#include <ctime>

DatabaseManager::DatabaseManager(const std::string& db_path) : db_path_(db_path) {
    int rc = sqlite3_open(db_path_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        std::cerr << "Failed to open SQLite database: " << sqlite3_errmsg(db_) << std::endl;
        db_ = nullptr;
    }
}

DatabaseManager::~DatabaseManager() {
    if (db_) {
        sqlite3_close(db_);
        db_ = nullptr;
    }
}

bool DatabaseManager::execute_sql(const std::string& sql) {
    if (!db_) return false;
    char* err_msg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &err_msg);
    if (rc != SQLITE_OK) {
        std::cerr << "SQL error: " << (err_msg ? err_msg : "unknown") << std::endl;
        sqlite3_free(err_msg);
        return false;
    }
    return true;
}

bool DatabaseManager::init_schema() {
    // 1. Users table
    const std::string create_users_table = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    )";
    if (!execute_sql(create_users_table)) return false;

    // 2. Sessions table
    const std::string create_sessions_table = R"(
        CREATE TABLE IF NOT EXISTS sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    )";
    if (!execute_sql(create_sessions_table)) return false;

    // 3. Check if papers table exists and whether it already has user_id and is_public
    bool papers_table_exists = false;
    bool has_user_id = false;
    bool has_is_public = false;
    sqlite3_stmt* check_stmt = nullptr;
    if (sqlite3_prepare_v2(db_, "PRAGMA table_info(papers);", -1, &check_stmt, nullptr) == SQLITE_OK) {
        while (sqlite3_step(check_stmt) == SQLITE_ROW) {
            papers_table_exists = true;
            const char* col_name = reinterpret_cast<const char*>(sqlite3_column_text(check_stmt, 1));
            if (col_name) {
                std::string col(col_name);
                if (col == "user_id") has_user_id = true;
                if (col == "is_public") has_is_public = true;
            }
        }
        sqlite3_finalize(check_stmt);
    }

    if (!papers_table_exists) {
        const std::string create_papers_table = R"(
            CREATE TABLE IF NOT EXISTS papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 0,
                is_public INTEGER NOT NULL DEFAULT 1,
                title TEXT NOT NULL,
                authors TEXT NOT NULL,
                abstract_text TEXT,
                keywords TEXT,
                year INTEGER DEFAULT 2024,
                venue TEXT,
                category TEXT NOT NULL,
                doi TEXT,
                url TEXT,
                status TEXT DEFAULT 'Published',
                reading_status TEXT DEFAULT 'To Read',
                favorite INTEGER DEFAULT 0,
                added_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        )";
        if (!execute_sql(create_papers_table)) return false;
    } else {
        if (!has_user_id) {
            execute_sql("ALTER TABLE papers ADD COLUMN user_id INTEGER NOT NULL DEFAULT 0;");
        }
        if (!has_is_public) {
            execute_sql("ALTER TABLE papers ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1;");
        }
    }

    // Indices for papers
    execute_sql("CREATE INDEX IF NOT EXISTS idx_papers_user_id ON papers(user_id);");
    execute_sql("CREATE INDEX IF NOT EXISTS idx_papers_is_public ON papers(is_public);");
    execute_sql("CREATE INDEX IF NOT EXISTS idx_papers_category ON papers(category);");
    execute_sql("CREATE INDEX IF NOT EXISTS idx_papers_year ON papers(year);");
    execute_sql("CREATE INDEX IF NOT EXISTS idx_papers_status ON papers(status);");

    return true;
}

bool DatabaseManager::seed_sample_data() {
    if (!db_) return false;

    // Default demo user account
    std::string demo_email = "scholar@university.edu";
    auto existing_user = get_user_by_email(demo_email);
    if (!existing_user) {
        std::string demo_hash = "$pbkdf2-sha256$100000$5dfe3e19a51d24e9688a852e3f1f4b20$428f52174c86cbcc7a16f5c6ca80373e35a119747192df28362ea7aebfe82e85";
        register_user("Dr. Alex Morgan", demo_email, demo_hash);
    }

    // Check count of public papers
    const char* count_sql = "SELECT COUNT(*) FROM papers WHERE is_public = 1;";
    sqlite3_stmt* stmt = nullptr;
    int count = 0;
    if (sqlite3_prepare_v2(db_, count_sql, -1, &stmt, nullptr) == SQLITE_OK) {
        if (sqlite3_step(stmt) == SQLITE_ROW) {
            count = sqlite3_column_int(stmt, 0);
        }
        sqlite3_finalize(stmt);
    }

    if (count >= 15) {
        return true; // Already richly seeded
    }

    // If existing sample papers had user_id = 1, mark them public so all users see them
    execute_sql("UPDATE papers SET is_public = 1;");

    // Rich catalog of globally published milestone research papers across Computer Science
    std::vector<Paper> global_papers = {
        {
            0, 0, true,
            "Attention Is All You Need",
            "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
            "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, an architecture based solely on attention mechanisms, dispensing with recurrence entirely.",
            "Transformer, Attention Mechanism, NLP, Deep Learning, Neural Machine Translation",
            2017,
            "Advances in Neural Information Processing Systems (NeurIPS 2017)",
            "Artificial Intelligence",
            "10.48550/arXiv.1706.03762",
            "https://arxiv.org/abs/1706.03762",
            "Published", "Completed", true, "2024-01-15 10:30:00"
        },
        {
            0, 0, true,
            "Deep Residual Learning for Image Recognition",
            "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
            "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
            "ResNet, Computer Vision, Convolutional Neural Networks, Deep Learning, Residuals",
            2016,
            "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)",
            "Machine Learning",
            "10.1109/CVPR.2016.90",
            "https://arxiv.org/abs/1512.03385",
            "Published", "Reading", true, "2024-02-10 14:15:00"
        },
        {
            0, 0, true,
            "Zero Trust Architecture and Security Protocols for Cloud Computing",
            "David Chen, Elena Rostova, Marcus Vance",
            "Modern enterprise perimeters have evaporated. This paper develops a comprehensive Zero Trust Architecture model incorporating dynamic identity verification, micro-segmentation, and automated breach containment.",
            "Zero Trust, Cloud Security, Micro-segmentation, Cybersecurity, Identity Management",
            2023,
            "IEEE Transactions on Dependable and Secure Computing",
            "Cybersecurity",
            "10.1109/TDSC.2023.109841",
            "https://doi.org/10.1109/TDSC.2023.109841",
            "Published", "To Read", false, "2024-03-01 09:00:00"
        },
        {
            0, 0, true,
            "BBR: Congestion-Based Congestion Control",
            "Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson",
            "Internet congestion control has historically interpreted packet loss as congestion. BBR measures bottleneck bandwidth and round-trip time, yielding dramatically higher throughput and lower delay.",
            "BBR, Congestion Control, TCP/IP, Computer Networks, Network Optimization",
            2016,
            "Communications of the ACM (CACM)",
            "Computer Networks",
            "10.1145/3009824",
            "https://queue.acm.org/detail.cfm?id=3022184",
            "Published", "Completed", false, "2024-04-12 16:45:00"
        },
        {
            0, 0, true,
            "Architectural Smells and Technical Debt: An Empirical Study of 500 Open Source Systems",
            "Sarah Jenkins, Liam O'Connor, Priya Sharma",
            "We analyze code decay across 500 open-source repositories, tracking cyclic dependencies, hub-like modules, and god components over a five-year lifecycle to assess developer maintenance overhead.",
            "Software Architecture, Technical Debt, Software Engineering, Code Smells, Code Quality",
            2024,
            "ACM Transactions on Software Engineering and Methodology (TOSEM)",
            "Software Engineering",
            "10.1145/3641209",
            "https://doi.org/10.1145/3641209",
            "Accepted", "To Read", true, "2024-05-18 11:20:00"
        },
        {
            0, 0, true,
            "Scalable Graph Analytics at Trillion-Scale with Distributed GPUs",
            "Wei Zhang, Robert Martinez, Sofia Patel",
            "This paper introduces GraphPulse, a high-throughput distributed graph processing framework capable of processing graphs with over one trillion edges using GPU cluster interconnects.",
            "Graph Analytics, Big Data, Distributed Systems, Data Science, GPU Computing",
            2024,
            "Proceedings of the VLDB Endowment (VLDB)",
            "Data Science",
            "10.14778/3617112",
            "https://doi.org/10.14778/3617112",
            "Under Review", "Reading", false, "2024-06-20 13:10:00"
        },
        {
            0, 0, true,
            "Language Models are Few-Shot Learners",
            "Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah, Jared Kaplan, Prafulla Dhariwal, Arvind Neelakantan, Pranav Shyam",
            "We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance. We train GPT-3, an autoregressive language model with 175 billion parameters, demonstrating strong zero-shot and few-shot capabilities across dozens of NLP benchmarks.",
            "GPT-3, Large Language Models, Few-Shot Learning, Transformers, NLP, Generative AI",
            2020,
            "Advances in Neural Information Processing Systems (NeurIPS 2020)",
            "Artificial Intelligence",
            "10.48550/arXiv.2005.14165",
            "https://arxiv.org/abs/2005.14165",
            "Published", "Completed", true, "2024-07-01 10:00:00"
        },
        {
            0, 0, true,
            "Mastering the Game of Go with Deep Neural Networks and Tree Search",
            "David Silver, Aja Huang, Chris J. Maddison, Arthur Guez, Laurent Sifre, George van den Driessche, Julian Schrittwieser, Ioannis Antonoglou",
            "The game of Go has long been viewed as the most challenging of classic games for artificial intelligence. We introduce AlphaGo, which combines Monte-Carlo tree search with deep neural networks trained by supervised and reinforcement learning.",
            "AlphaGo, Reinforcement Learning, MCTS, Deep Learning, Game AI",
            2016,
            "Nature (Vol 529, Issue 7587)",
            "Artificial Intelligence",
            "10.1038/nature16961",
            "https://doi.org/10.1038/nature16961",
            "Published", "Completed", true, "2024-07-05 11:30:00"
        },
        {
            0, 0, true,
            "Federated Learning: Challenges, Methods, and Future Directions",
            "Tian Li, Anit Kumar Sahu, Ameet Talwalkar, Virginia Smith",
            "Federated learning involves training statistical models over remote devices such as smartphones and sensors while keeping data local. We provide a broad survey of the characteristics, challenges, and privacy frameworks.",
            "Federated Learning, Distributed Optimization, Privacy, Edge Computing, Machine Learning",
            2020,
            "IEEE Signal Processing Magazine",
            "Machine Learning",
            "10.1109/MSP.2020.2975749",
            "https://doi.org/10.1109/MSP.2020.2975749",
            "Published", "Reading", false, "2024-07-10 14:00:00"
        },
        {
            0, 0, true,
            "Spanner: Google's Globally-Distributed Database",
            "James C. Corbett, Jeffrey Dean, Michael Epstein, Andrew Fikes, Christopher Frost, J. J. Furman, Sanjay Ghemawat",
            "Spanner is Google's scalable, multi-version, globally-distributed, and synchronously-replicated database. It uses TrueTime API with GPS and atomic clocks to support externally consistent distributed transactions at global scale.",
            "Distributed Systems, TrueTime, Spanner, SQL, Transactions, Big Data",
            2012,
            "USENIX Conference on Operating Systems Design and Implementation (OSDI)",
            "Data Science",
            "10.5555/2387880.2387905",
            "https://research.google/pubs/pub39966/",
            "Published", "Completed", false, "2024-07-15 09:15:00"
        },
        {
            0, 0, true,
            "Spectre Attacks: Exploiting Speculative Execution",
            "Paul Kocher, Jann Horn, Anders Fogh, Daniel Genkin, Daniel Gruss, Werner Haas, Mike Hamburg, Moritz Lipp, Stefan Mangard",
            "Taking advantage of speculative execution, Spectre attacks induce a victim to speculatively perform operations that would not occur during strictly serialized program execution, leaking confidential data via microarchitectural side channels.",
            "Spectre, Speculative Execution, Microarchitecture, Side Channels, Hardware Security",
            2019,
            "IEEE Symposium on Security and Privacy (S&P)",
            "Cybersecurity",
            "10.1109/SP.2019.00002",
            "https://spectreattack.com/spectre.pdf",
            "Published", "To Read", true, "2024-07-20 16:30:00"
        },
        {
            0, 0, true,
            "Bitcoin: A Peer-to-Peer Electronic Cash System",
            "Satoshi Nakamoto",
            "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly from one party to another without going through a financial institution. Digital signatures provide part of the solution, completed by proof-of-work consensus.",
            "Blockchain, Proof of Work, Cryptography, Peer-to-Peer, Consensus, Cryptofinance",
            2008,
            "Decentralized Whitepaper",
            "Cybersecurity",
            "10.2139/ssrn.3444002",
            "https://bitcoin.org/bitcoin.pdf",
            "Published", "Completed", true, "2024-08-01 12:00:00"
        },
        {
            0, 0, true,
            "Software Engineering at Google: Lessons Learned from Programming Over Time",
            "Titus Winters, Tom Manshreck, Hyrum Wright",
            "Programming over time requires fundamentally different engineering principles than writing single-developer code. We explore codebase sustainability, large-scale refactoring, unit testing discipline, and continuous integration cultures.",
            "Software Engineering, CI/CD, Code Review, Testing, Google Monorepo, Devops",
            2020,
            "O'Reilly Media / IEEE Software",
            "Software Engineering",
            "10.1109/MS.2020.2974950",
            "https://abseil.io/resources/swe-book",
            "Published", "Reading", false, "2024-08-05 15:45:00"
        },
        {
            0, 0, true,
            "QUIC: A UDP-Based Multiplexed and Secure Transport",
            "Jana Iyengar, Martin Thomson",
            "This document describes the QUIC transport protocol used by HTTP/3. QUIC provides multiplexed stream delivery over UDP with reduced handshake latency and built-in TLS 1.3 cryptographic protection.",
            "QUIC, HTTP/3, UDP, Transport Protocols, TLS 1.3, Latency Reduction",
            2021,
            "Internet Engineering Task Force (RFC 9000)",
            "Computer Networks",
            "10.17487/RFC9000",
            "https://www.rfc-editor.org/rfc/rfc9000.html",
            "Published", "Completed", false, "2024-08-10 18:20:00"
        },
        {
            0, 0, true,
            "Llama 3: Open Foundation and Fine-Tuned Chat Models",
            "Meta AI Research Team",
            "We introduce Llama 3, a family of pretrained and instruction-tuned generative text models. We describe our architectural choices, pretraining data curation recipe at 15T tokens, and post-training alignment through DPO.",
            "Llama 3, Large Language Models, Open Source AI, Direct Preference Optimization, Foundation Models",
            2024,
            "Meta AI Technical Report",
            "Artificial Intelligence",
            "10.48550/arXiv.2407.21783",
            "https://arxiv.org/abs/2407.21783",
            "Published", "Reading", true, "2024-08-15 08:30:00"
        },
        {
            0, 0, true,
            "Designing Data-Intensive Applications: The Big Ideas Behind Reliable Systems",
            "Martin Kleppmann",
            "Data is at the center of many challenges in system design. We analyze transactions, consensus, replication, partitioning, and batch vs stream processing architectures for building scalable and fault-tolerant distributed platforms.",
            "Distributed Data, Consensus, ACID, Partitioning, Fault Tolerance, Data Systems",
            2017,
            "Cambridge University Press / O'Reilly",
            "Data Science",
            "10.5555/3153549",
            "https://dataintensive.net/",
            "Published", "Completed", true, "2024-08-20 14:10:00"
        }
    };

    for (const auto& p : global_papers) {
        // Check if paper already exists by title
        const char* exists_sql = "SELECT 1 FROM papers WHERE title = ? LIMIT 1;";
        sqlite3_stmt* ex_stmt = nullptr;
        bool exists = false;
        if (sqlite3_prepare_v2(db_, exists_sql, -1, &ex_stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_text(ex_stmt, 1, p.title.c_str(), -1, SQLITE_TRANSIENT);
            if (sqlite3_step(ex_stmt) == SQLITE_ROW) {
                exists = true;
            }
            sqlite3_finalize(ex_stmt);
        }

        if (!exists) {
            add_paper(p, 0); // 0 = Public community library
        }
    }

    return true;
}

// ----------------- USER AUTHENTICATION -----------------

int DatabaseManager::register_user(const std::string& full_name, const std::string& email, const std::string& password_hash) {
    if (!db_) return -1;

    const char* sql = "INSERT INTO users (full_name, email, password_hash, created_at) VALUES (?, ?, ?, datetime('now', 'localtime'));";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        std::cerr << "Prepare register_user failed: " << sqlite3_errmsg(db_) << std::endl;
        return -1;
    }

    sqlite3_bind_text(stmt, 1, full_name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, email.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, password_hash.c_str(), -1, SQLITE_TRANSIENT);

    int rc = sqlite3_step(stmt);
    int new_id = -1;
    if (rc == SQLITE_DONE) {
        new_id = static_cast<int>(sqlite3_last_insert_rowid(db_));
    }
    sqlite3_finalize(stmt);
    return new_id;
}

std::optional<User> DatabaseManager::get_user_by_email(const std::string& email) {
    if (!db_) return std::nullopt;
    const char* sql = "SELECT id, full_name, email, password_hash, created_at FROM users WHERE email = ? COLLATE NOCASE;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_TRANSIENT);

    std::optional<User> res = std::nullopt;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        User u;
        u.id = sqlite3_column_int(stmt, 0);
        u.full_name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1) ? sqlite3_column_text(stmt, 1) : reinterpret_cast<const unsigned char*>(""));
        u.email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2) ? sqlite3_column_text(stmt, 2) : reinterpret_cast<const unsigned char*>(""));
        u.password_hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3) ? sqlite3_column_text(stmt, 3) : reinterpret_cast<const unsigned char*>(""));
        u.created_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4) ? sqlite3_column_text(stmt, 4) : reinterpret_cast<const unsigned char*>(""));
        res = u;
    }
    sqlite3_finalize(stmt);
    return res;
}

std::optional<User> DatabaseManager::get_user_by_id(int id) {
    if (!db_) return std::nullopt;
    const char* sql = "SELECT id, full_name, email, password_hash, created_at FROM users WHERE id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_int(stmt, 1, id);

    std::optional<User> res = std::nullopt;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        User u;
        u.id = sqlite3_column_int(stmt, 0);
        u.full_name = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 1) ? sqlite3_column_text(stmt, 1) : reinterpret_cast<const unsigned char*>(""));
        u.email = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 2) ? sqlite3_column_text(stmt, 2) : reinterpret_cast<const unsigned char*>(""));
        u.password_hash = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3) ? sqlite3_column_text(stmt, 3) : reinterpret_cast<const unsigned char*>(""));
        u.created_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4) ? sqlite3_column_text(stmt, 4) : reinterpret_cast<const unsigned char*>(""));
        res = u;
    }
    sqlite3_finalize(stmt);
    return res;
}

bool DatabaseManager::email_exists(const std::string& email) {
    if (!db_) return false;
    const char* sql = "SELECT 1 FROM users WHERE email = ? COLLATE NOCASE LIMIT 1;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, email.c_str(), -1, SQLITE_TRANSIENT);
    bool exists = (sqlite3_step(stmt) == SQLITE_ROW);
    sqlite3_finalize(stmt);
    return exists;
}

// ----------------- SESSIONS -----------------

bool DatabaseManager::create_session(const std::string& session_id, int user_id, int expiry_seconds) {
    if (!db_) return false;
    const char* sql = R"(
        INSERT INTO sessions (session_id, user_id, expires_at, created_at)
        VALUES (?, ?, datetime('now', 'localtime', '+' || ? || ' seconds'), datetime('now', 'localtime'));
    )";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;

    sqlite3_bind_text(stmt, 1, session_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, user_id);
    sqlite3_bind_int(stmt, 3, expiry_seconds);

    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return rc == SQLITE_DONE;
}

std::optional<int> DatabaseManager::validate_session(const std::string& session_id) {
    if (!db_ || session_id.empty()) return std::nullopt;
    const char* sql = R"(
        SELECT user_id FROM sessions 
        WHERE session_id = ? AND expires_at > datetime('now', 'localtime');
    )";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_text(stmt, 1, session_id.c_str(), -1, SQLITE_TRANSIENT);

    std::optional<int> user_id = std::nullopt;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        user_id = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);
    return user_id;
}

bool DatabaseManager::delete_session(const std::string& session_id) {
    if (!db_) return false;
    const char* sql = "DELETE FROM sessions WHERE session_id = ?;";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, session_id.c_str(), -1, SQLITE_TRANSIENT);
    int rc = sqlite3_step(stmt);
    sqlite3_finalize(stmt);
    return rc == SQLITE_DONE;
}

void DatabaseManager::clean_expired_sessions() {
    if (!db_) return;
    execute_sql("DELETE FROM sessions WHERE expires_at <= datetime('now', 'localtime');");
}

// ----------------- PAPERS (GLOBAL REPOSITORY + USER OWNERSHIP) -----------------

int DatabaseManager::add_paper(const Paper& paper, int user_id) {
    if (!db_) return -1;

    const char* sql = R"(
        INSERT INTO papers (user_id, is_public, title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'));
    )";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        std::cerr << "Prepare insert failed: " << sqlite3_errmsg(db_) << std::endl;
        return -1;
    }

    sqlite3_bind_int(stmt, 1, user_id);
    sqlite3_bind_int(stmt, 2, paper.is_public ? 1 : 0);
    sqlite3_bind_text(stmt, 3, paper.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, paper.authors.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 5, paper.abstract_text.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 6, paper.keywords.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 7, paper.year);
    sqlite3_bind_text(stmt, 8, paper.venue.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, paper.category.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, paper.doi.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 11, paper.url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 12, paper.status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 13, paper.reading_status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 14, paper.favorite ? 1 : 0);

    int rc = sqlite3_step(stmt);
    int new_id = -1;
    if (rc == SQLITE_DONE) {
        new_id = static_cast<int>(sqlite3_last_insert_rowid(db_));
    }
    sqlite3_finalize(stmt);
    return new_id;
}

bool DatabaseManager::update_paper(int id, int user_id, const Paper& paper) {
    if (!db_) return false;

    // Allow update if owned by user or if admin/creator
    const char* sql = R"(
        UPDATE papers SET
            title = ?, authors = ?, abstract_text = ?, keywords = ?,
            year = ?, venue = ?, category = ?, doi = ?, url = ?,
            status = ?, reading_status = ?, favorite = ?
        WHERE id = ? AND (user_id = ? OR (user_id = 0 AND ? = 1));
    )";

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) {
        return false;
    }

    sqlite3_bind_text(stmt, 1, paper.title.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, paper.authors.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 3, paper.abstract_text.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 4, paper.keywords.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 5, paper.year);
    sqlite3_bind_text(stmt, 6, paper.venue.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 7, paper.category.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 8, paper.doi.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 9, paper.url.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 10, paper.status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 11, paper.reading_status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 12, paper.favorite ? 1 : 0);
    sqlite3_bind_int(stmt, 13, id);
    sqlite3_bind_int(stmt, 14, user_id);
    sqlite3_bind_int(stmt, 15, user_id);

    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(db_);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

bool DatabaseManager::delete_paper(int id, int user_id) {
    if (!db_) return false;
    const char* sql = "DELETE FROM papers WHERE id = ? AND (user_id = ? OR (user_id = 0 AND ? = 1));";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    sqlite3_bind_int(stmt, 3, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(db_);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

static Paper parse_paper_row(sqlite3_stmt* stmt) {
    Paper p;
    p.id = sqlite3_column_int(stmt, 0);
    p.user_id = sqlite3_column_int(stmt, 1);
    p.is_public = (sqlite3_column_int(stmt, 2) != 0);
    p.title = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 3) ? sqlite3_column_text(stmt, 3) : reinterpret_cast<const unsigned char*>(""));
    p.authors = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 4) ? sqlite3_column_text(stmt, 4) : reinterpret_cast<const unsigned char*>(""));
    p.abstract_text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 5) ? sqlite3_column_text(stmt, 5) : reinterpret_cast<const unsigned char*>(""));
    p.keywords = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 6) ? sqlite3_column_text(stmt, 6) : reinterpret_cast<const unsigned char*>(""));
    p.year = sqlite3_column_int(stmt, 7);
    p.venue = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 8) ? sqlite3_column_text(stmt, 8) : reinterpret_cast<const unsigned char*>(""));
    p.category = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 9) ? sqlite3_column_text(stmt, 9) : reinterpret_cast<const unsigned char*>(""));
    p.doi = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 10) ? sqlite3_column_text(stmt, 10) : reinterpret_cast<const unsigned char*>(""));
    p.url = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 11) ? sqlite3_column_text(stmt, 11) : reinterpret_cast<const unsigned char*>(""));
    p.status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 12) ? sqlite3_column_text(stmt, 12) : reinterpret_cast<const unsigned char*>("Published"));
    p.reading_status = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 13) ? sqlite3_column_text(stmt, 13) : reinterpret_cast<const unsigned char*>("To Read"));
    p.favorite = sqlite3_column_int(stmt, 14) != 0;
    p.added_at = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 15) ? sqlite3_column_text(stmt, 15) : reinterpret_cast<const unsigned char*>(""));
    return p;
}

std::optional<Paper> DatabaseManager::get_paper_by_id(int id, int user_id) {
    if (!db_) return std::nullopt;
    const char* sql = "SELECT id, user_id, is_public, title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at FROM papers WHERE id = ? AND (user_id = ? OR is_public = 1);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return std::nullopt;
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);

    std::optional<Paper> res = std::nullopt;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        res = parse_paper_row(stmt);
    }
    sqlite3_finalize(stmt);
    return res;
}

std::vector<Paper> DatabaseManager::get_papers_accessible_by_user(int user_id, const std::string& scope) {
    std::vector<Paper> list;
    if (!db_) return list;

    std::string sql;
    if (scope == "mine") {
        sql = "SELECT id, user_id, is_public, title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at FROM papers WHERE user_id = ? ORDER BY id DESC;";
    } else if (scope == "global") {
        sql = "SELECT id, user_id, is_public, title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at FROM papers WHERE is_public = 1 ORDER BY id DESC;";
    } else {
        // "all" - Show global publications + user's own publications
        sql = "SELECT id, user_id, is_public, title, authors, abstract_text, keywords, year, venue, category, doi, url, status, reading_status, favorite, added_at FROM papers WHERE user_id = ? OR is_public = 1 ORDER BY id DESC;";
    }

    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr) != SQLITE_OK) return list;

    if (scope == "mine" || scope == "all") {
        sqlite3_bind_int(stmt, 1, user_id);
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        list.push_back(parse_paper_row(stmt));
    }
    sqlite3_finalize(stmt);
    return list;
}

bool DatabaseManager::toggle_favorite(int id, int user_id) {
    if (!db_) return false;
    // Allow user to toggle favorite on their papers or any accessible paper
    const char* sql = "UPDATE papers SET favorite = CASE WHEN favorite = 1 THEN 0 ELSE 1 END WHERE id = ? AND (user_id = ? OR is_public = 1);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_int(stmt, 1, id);
    sqlite3_bind_int(stmt, 2, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(db_);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

bool DatabaseManager::update_reading_status(int id, int user_id, const std::string& status) {
    if (!db_) return false;
    const char* sql = "UPDATE papers SET reading_status = ? WHERE id = ? AND (user_id = ? OR is_public = 1);";
    sqlite3_stmt* stmt = nullptr;
    if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) != SQLITE_OK) return false;
    sqlite3_bind_text(stmt, 1, status.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, id);
    sqlite3_bind_int(stmt, 3, user_id);
    int rc = sqlite3_step(stmt);
    int changes = sqlite3_changes(db_);
    sqlite3_finalize(stmt);
    return (rc == SQLITE_DONE && changes > 0);
}

std::vector<std::string> DatabaseManager::get_categories(int user_id) {
    std::set<std::string> cat_set = {
        "Artificial Intelligence",
        "Machine Learning",
        "Data Science",
        "Cybersecurity",
        "Computer Networks",
        "Software Engineering"
    };

    if (db_) {
        const char* sql = "SELECT DISTINCT category FROM papers WHERE (user_id = ? OR is_public = 1) AND category IS NOT NULL AND category != '';";
        sqlite3_stmt* stmt = nullptr;
        if (sqlite3_prepare_v2(db_, sql, -1, &stmt, nullptr) == SQLITE_OK) {
            sqlite3_bind_int(stmt, 1, user_id);
            while (sqlite3_step(stmt) == SQLITE_ROW) {
                const char* val = reinterpret_cast<const char*>(sqlite3_column_text(stmt, 0));
                if (val && std::string(val).length() > 0) {
                    cat_set.insert(std::string(val));
                }
            }
            sqlite3_finalize(stmt);
        }
    }

    return std::vector<std::string>(cat_set.begin(), cat_set.end());
}

SystemStatistics DatabaseManager::get_statistics(int user_id, const std::string& scope) {
    SystemStatistics stats;
    auto papers = get_papers_accessible_by_user(user_id, scope);
    stats.total_papers = static_cast<int>(papers.size());

    std::set<std::string> authors_set;
    std::map<std::string, int> cat_map;
    std::map<int, int> yr_map;
    std::map<std::string, int> st_map;

    for (const auto& p : papers) {
        if (p.favorite) stats.favorite_count++;
        if (p.reading_status == "Completed") stats.completed_read_count++;
        else if (p.reading_status == "Reading") stats.reading_count++;
        else stats.to_read_count++;

        cat_map[p.category]++;
        yr_map[p.year]++;
        st_map[p.status]++;

        // Split authors by comma
        std::stringstream ss(p.authors);
        std::string author;
        while (std::getline(ss, author, ',')) {
            size_t start = author.find_first_not_of(" \t\r\n");
            size_t end = author.find_last_not_of(" \t\r\n");
            if (start != std::string::npos && end != std::string::npos) {
                authors_set.insert(author.substr(start, end - start + 1));
            }
        }
    }

    stats.total_authors = static_cast<int>(authors_set.size());
    stats.total_categories = static_cast<int>(cat_map.size());

    for (const auto& pair : cat_map) {
        stats.category_counts.push_back(pair);
    }
    for (const auto& pair : yr_map) {
        stats.year_counts.push_back(pair);
    }
    for (const auto& pair : st_map) {
        stats.status_counts.push_back(pair);
    }

    return stats;
}
