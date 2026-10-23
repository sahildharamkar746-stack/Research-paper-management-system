/**
 * ScholarTrack — Mock Service Worker for Vercel Static Preview
 * Runs entirely inside the browser when the C++ backend is not accessible.
 */

const SEED_PAPERS = [
    {
        id: 1, user_id: 1, is_public: true,
        title: "Attention Is All You Need",
        authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
        abstract: "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose the Transformer, an architecture based solely on attention mechanisms, dispensing with recurrence entirely.",
        keywords: "Transformer, Attention Mechanism, NLP, Deep Learning, Neural Machine Translation",
        year: 2017,
        venue: "Advances in Neural Information Processing Systems (NeurIPS 2017)",
        category: "Artificial Intelligence",
        doi: "10.48550/arXiv.1706.03762",
        url: "https://arxiv.org/abs/1706.03762",
        status: "Published", reading_status: "Completed", favorite: true,
        added_at: "2024-01-15 10:30:00"
    },
    {
        id: 2, user_id: 1, is_public: true,
        title: "Deep Residual Learning for Image Recognition",
        authors: "Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun",
        abstract: "Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.",
        keywords: "ResNet, Computer Vision, Convolutional Neural Networks, Deep Learning, Residuals",
        year: 2016,
        venue: "IEEE Conference on Computer Vision and Pattern Recognition (CVPR)",
        category: "Machine Learning",
        doi: "10.1109/CVPR.2016.90",
        url: "https://arxiv.org/abs/1512.03385",
        status: "Published", reading_status: "Reading", favorite: true,
        added_at: "2024-02-10 14:15:00"
    },
    {
        id: 3, user_id: 1, is_public: true,
        title: "Zero Trust Architecture and Security Protocols for Cloud Computing",
        authors: "David Chen, Elena Rostova, Marcus Vance",
        abstract: "Modern enterprise perimeters have evaporated. This paper develops a comprehensive Zero Trust Architecture model incorporating dynamic identity verification, micro-segmentation, and automated breach containment.",
        keywords: "Zero Trust, Cloud Security, Micro-segmentation, Cybersecurity, Identity Management",
        year: 2023,
        venue: "IEEE Transactions on Dependable and Secure Computing",
        category: "Cybersecurity",
        doi: "10.1109/TDSC.2023.109841",
        url: "https://doi.org/10.1109/TDSC.2023.109841",
        status: "Published", reading_status: "To Read", favorite: false,
        added_at: "2024-03-01 09:00:00"
    },
    {
        id: 4, user_id: 1, is_public: true,
        title: "BBR: Congestion-Based Congestion Control",
        authors: "Neal Cardwell, Yuchung Cheng, C. Stephen Gunn, Soheil Hassas Yeganeh, Van Jacobson",
        abstract: "Internet congestion control has historically interpreted packet loss as congestion. BBR measures bottleneck bandwidth and round-trip time, yielding dramatically higher throughput and lower delay.",
        keywords: "BBR, Congestion Control, TCP/IP, Computer Networks, Network Optimization",
        year: 2016,
        venue: "Communications of the ACM (CACM)",
        category: "Computer Networks",
        doi: "10.1145/3009824",
        url: "https://queue.acm.org/detail.cfm?id=3022184",
        status: "Published", reading_status: "Completed", favorite: false,
        added_at: "2024-04-12 16:45:00"
    },
    {
        id: 5, user_id: 1, is_public: true,
        title: "Architectural Smells and Technical Debt: An Empirical Study of 500 Open Source Systems",
        authors: "Sarah Jenkins, Liam O'Connor, Priya Sharma",
        abstract: "We analyze code decay across 500 open-source repositories, tracking cyclic dependencies, hub-like modules, and god components over a five-year lifecycle to assess developer maintenance overhead.",
        keywords: "Software Architecture, Technical Debt, Software Engineering, Code Smells, Code Quality",
        year: 2024,
        venue: "ACM Transactions on Software Engineering and Methodology (TOSEM)",
        category: "Software Engineering",
        doi: "10.1145/3641209",
        url: "https://doi.org/10.1145/3641209",
        status: "Accepted", reading_status: "To Read", favorite: true,
        added_at: "2024-05-18 11:20:00"
    },
    {
        id: 6, user_id: 1, is_public: true,
        title: "Scalable Graph Analytics at Trillion-Scale with Distributed GPUs",
        authors: "Wei Zhang, Robert Martinez, Sofia Patel",
        abstract: "This paper introduces GraphPulse, a high-throughput distributed graph processing framework capable of processing graphs with over one trillion edges using GPU cluster interconnects.",
        keywords: "Graph Analytics, Big Data, Distributed Systems, Data Science, GPU Computing",
        year: 2024,
        venue: "Proceedings of the VLDB Endowment (VLDB)",
        category: "Data Science",
        doi: "10.14778/3617112",
        url: "https://doi.org/10.14778/3617112",
        status: "Under Review", reading_status: "Reading", favorite: false,
        added_at: "2024-06-20 13:10:00"
    },
    {
        id: 7, user_id: 1, is_public: true,
        title: "Language Models are Few-Shot Learners",
        authors: "Tom B. Brown, Benjamin Mann, Nick Ryder, Melanie Subbiah",
        abstract: "We demonstrate that scaling up language models greatly improves task-agnostic, few-shot performance across dozens of NLP benchmarks.",
        keywords: "GPT-3, Large Language Models, Few-Shot Learning, Transformers, NLP",
        year: 2020,
        venue: "Advances in Neural Information Processing Systems (NeurIPS 2020)",
        category: "Artificial Intelligence",
        doi: "10.48550/arXiv.2005.14165",
        url: "https://arxiv.org/abs/2005.14165",
        status: "Published", reading_status: "Completed", favorite: true,
        added_at: "2024-07-01 10:00:00"
    },
    {
        id: 8, user_id: 1, is_public: true,
        title: "Mastering the Game of Go with Deep Neural Networks and Tree Search",
        authors: "David Silver, Aja Huang, Chris J. Maddison, Arthur Guez",
        abstract: "We introduce AlphaGo, combining Monte-Carlo tree search with deep neural networks trained by reinforcement learning.",
        keywords: "AlphaGo, Reinforcement Learning, MCTS, Deep Learning, Game AI",
        year: 2016,
        venue: "Nature",
        category: "Artificial Intelligence",
        doi: "10.1038/nature16961",
        url: "https://doi.org/10.1038/nature16961",
        status: "Published", reading_status: "Completed", favorite: true,
        added_at: "2024-07-05 11:30:00"
    },
    {
        id: 9, user_id: 1, is_public: true,
        title: "Federated Learning: Challenges, Methods, and Future Directions",
        authors: "Tian Li, Anit Kumar Sahu, Ameet Talwalkar, Virginia Smith",
        abstract: "Federated learning involves training statistical models over remote devices such as smartphones and sensors while keeping data local.",
        keywords: "Federated Learning, Distributed Optimization, Privacy, Edge Computing",
        year: 2020,
        venue: "IEEE Signal Processing Magazine",
        category: "Machine Learning",
        doi: "10.1109/MSP.2020.2975749",
        url: "https://doi.org/10.1109/MSP.2020.2975749",
        status: "Published", reading_status: "Reading", favorite: false,
        added_at: "2024-07-10 14:00:00"
    },
    {
        id: 10, user_id: 1, is_public: true,
        title: "Spanner: Google's Globally-Distributed Database",
        authors: "James C. Corbett, Jeffrey Dean, Michael Epstein, Sanjay Ghemawat",
        abstract: "Spanner is Google's scalable, multi-version, globally-distributed, and synchronously-replicated database using TrueTime API.",
        keywords: "Distributed Systems, TrueTime, Spanner, SQL, Transactions, Big Data",
        year: 2012,
        venue: "OSDI",
        category: "Data Science",
        doi: "10.5555/2387880.2387905",
        url: "https://research.google/pubs/pub39966/",
        status: "Published", reading_status: "Completed", favorite: false,
        added_at: "2024-07-15 09:15:00"
    },
    {
        id: 11, user_id: 1, is_public: true,
        title: "Spectre Attacks: Exploiting Speculative Execution",
        authors: "Paul Kocher, Jann Horn, Anders Fogh, Daniel Genkin",
        abstract: "Spectre attacks induce a victim to speculatively perform operations leaking confidential data via microarchitectural side channels.",
        keywords: "Spectre, Speculative Execution, Microarchitecture, Side Channels, Hardware Security",
        year: 2019,
        venue: "IEEE S&P",
        category: "Cybersecurity",
        doi: "10.1109/SP.2019.00002",
        url: "https://spectreattack.com/spectre.pdf",
        status: "Published", reading_status: "To Read", favorite: true,
        added_at: "2024-07-20 16:30:00"
    },
    {
        id: 12, user_id: 1, is_public: true,
        title: "Bitcoin: A Peer-to-Peer Electronic Cash System",
        authors: "Satoshi Nakamoto",
        abstract: "A purely peer-to-peer version of electronic cash would allow online payments to be sent directly without going through a financial institution.",
        keywords: "Blockchain, Proof of Work, Cryptography, Peer-to-Peer, Consensus",
        year: 2008,
        venue: "Decentralized Whitepaper",
        category: "Cybersecurity",
        doi: "10.2139/ssrn.3444002",
        url: "https://bitcoin.org/bitcoin.pdf",
        status: "Published", reading_status: "Completed", favorite: true,
        added_at: "2024-08-01 12:00:00"
    },
    {
        id: 13, user_id: 1, is_public: true,
        title: "Software Engineering at Google: Lessons Learned from Programming Over Time",
        authors: "Titus Winters, Tom Manshreck, Hyrum Wright",
        abstract: "Programming over time requires fundamentally different engineering principles: codebase sustainability, refactoring, and CI/CD.",
        keywords: "Software Engineering, CI/CD, Code Review, Testing, Google Monorepo",
        year: 2020,
        venue: "O'Reilly / IEEE Software",
        category: "Software Engineering",
        doi: "10.1109/MS.2020.2974950",
        url: "https://abseil.io/resources/swe-book",
        status: "Published", reading_status: "Reading", favorite: false,
        added_at: "2024-08-05 15:45:00"
    },
    {
        id: 14, user_id: 1, is_public: true,
        title: "QUIC: A UDP-Based Multiplexed and Secure Transport",
        authors: "Jana Iyengar, Martin Thomson",
        abstract: "QUIC provides multiplexed stream delivery over UDP with reduced handshake latency and built-in TLS 1.3 cryptographic protection for HTTP/3.",
        keywords: "QUIC, HTTP/3, UDP, Transport Protocols, TLS 1.3",
        year: 2021,
        venue: "RFC 9000",
        category: "Computer Networks",
        doi: "10.17487/RFC9000",
        url: "https://www.rfc-editor.org/rfc/rfc9000.html",
        status: "Published", reading_status: "Completed", favorite: false,
        added_at: "2024-08-10 18:20:00"
    },
    {
        id: 15, user_id: 1, is_public: true,
        title: "Llama 3: Open Foundation and Fine-Tuned Chat Models",
        authors: "Meta AI Research Team",
        abstract: "We introduce Llama 3, a family of pretrained and instruction-tuned generative text models at 15T tokens with DPO alignment.",
        keywords: "Llama 3, Large Language Models, Open Source AI, Foundation Models",
        year: 2024,
        venue: "Meta AI Technical Report",
        category: "Artificial Intelligence",
        doi: "10.48550/arXiv.2407.21783",
        url: "https://arxiv.org/abs/2407.21783",
        status: "Published", reading_status: "Reading", favorite: true,
        added_at: "2024-08-15 08:30:00"
    },
    {
        id: 16, user_id: 1, is_public: true,
        title: "Designing Data-Intensive Applications: The Big Ideas Behind Reliable Systems",
        authors: "Martin Kleppmann",
        abstract: "Key concepts behind transactions, consensus, replication, partitioning, and batch vs stream architectures.",
        keywords: "Distributed Data, Consensus, ACID, Partitioning, Fault Tolerance",
        year: 2017,
        venue: "Cambridge / O'Reilly",
        category: "Data Science",
        doi: "10.5555/3153549",
        url: "https://dataintensive.net/",
        status: "Published", reading_status: "Completed", favorite: true,
        added_at: "2024-08-20 14:10:00"
    }
];

class LocalBackendSimulator {
    constructor() {
        this.initStorage();
    }

    initStorage() {
        if (!localStorage.getItem('scholartrack_papers')) {
            localStorage.setItem('scholartrack_papers', JSON.stringify(SEED_PAPERS));
        }
        if (!localStorage.getItem('scholartrack_users')) {
            const defaultUsers = [
                { id: 1, full_name: "Dr. Alex Morgan", email: "scholar@university.edu", password: "password123" }
            ];
            localStorage.setItem('scholartrack_users', JSON.stringify(defaultUsers));
        }
    }

    getPapers() {
        return JSON.parse(localStorage.getItem('scholartrack_papers') || '[]');
    }

    savePapers(papers) {
        localStorage.setItem('scholartrack_papers', JSON.stringify(papers));
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('scholartrack_users') || '[]');
    }

    saveUsers(users) {
        localStorage.setItem('scholartrack_users', JSON.stringify(users));
    }

    getCurrentUser() {
        const u = localStorage.getItem('scholartrack_current_user');
        return u ? JSON.parse(u) : null;
    }

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('scholartrack_current_user', JSON.stringify(user));
        } else {
            localStorage.removeItem('scholartrack_current_user');
        }
    }

    async handleFetch(url, options = {}) {
        const urlObj = new URL(url, window.location.origin);
        const path = urlObj.pathname;
        const method = (options.method || 'GET').toUpperCase();
        const currentUser = this.getCurrentUser();

        // 1. Auth routes
        if (path === '/api/auth/me') {
            if (currentUser) {
                return new Response(JSON.stringify(currentUser), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/auth/login' && method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const users = this.getUsers();
            let user = users.find(u => u.email.toLowerCase() === (body.email || '').toLowerCase());

            // If user doesn't exist yet, auto-register them seamlessly on the demo deployment!
            if (!user) {
                user = {
                    id: users.length + 1,
                    full_name: body.email.split('@')[0],
                    email: body.email,
                    password: body.password
                };
                users.push(user);
                this.saveUsers(users);
            }

            this.setCurrentUser(user);
            return new Response(JSON.stringify({
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                created_at: new Date().toISOString()
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/auth/register' && method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const users = this.getUsers();
            const existing = users.find(u => u.email.toLowerCase() === (body.email || '').toLowerCase());
            if (existing) {
                this.setCurrentUser(existing);
                return new Response(JSON.stringify(existing), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            const newUser = {
                id: users.length + 1,
                full_name: body.full_name || "Academic Researcher",
                email: body.email,
                password: body.password
            };
            users.push(newUser);
            this.saveUsers(users);
            this.setCurrentUser(newUser);

            return new Response(JSON.stringify({
                id: newUser.id,
                full_name: newUser.full_name,
                email: newUser.email,
                created_at: new Date().toISOString()
            }), { status: 201, headers: { 'Content-Type': 'application/json' } });
        }

        if (path === '/api/auth/logout' && method === 'POST') {
            this.setCurrentUser(null);
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // 2. Protected routes check
        if (!currentUser && path.startsWith('/api/')) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // 3. Papers API
        if (path === '/api/papers') {
            if (method === 'GET') {
                const scope = urlObj.searchParams.get('scope') || 'all';
                const q = (urlObj.searchParams.get('q') || '').toLowerCase();
                const category = urlObj.searchParams.get('category');
                const status = urlObj.searchParams.get('status');
                const reading_status = urlObj.searchParams.get('reading_status');
                const year = parseInt(urlObj.searchParams.get('year') || '0', 10);
                const favorite = urlObj.searchParams.get('favorite') === 'true';
                const sort = urlObj.searchParams.get('sort') || 'date_desc';

                let all = this.getPapers();
                let filtered = all.filter(p => {
                    if (scope === 'mine' && p.user_id !== currentUser.id) return false;
                    if (favorite && !p.favorite) return false;
                    if (category && category !== 'All' && p.category !== category) return false;
                    if (status && status !== 'All' && p.status !== status) return false;
                    if (reading_status && reading_status !== 'All' && p.reading_status !== reading_status) return false;
                    if (year > 0 && p.year !== year) return false;
                    if (q) {
                        const hay = `${p.title} ${p.authors} ${p.keywords} ${p.venue} ${p.doi} ${p.category}`.toLowerCase();
                        if (!hay.includes(q)) return false;
                    }
                    return true;
                });

                if (sort === 'title_asc') filtered.sort((a,b) => a.title.localeCompare(b.title));
                else if (sort === 'title_desc') filtered.sort((a,b) => b.title.localeCompare(a.title));
                else if (sort === 'year_desc') filtered.sort((a,b) => b.year - a.year);
                else if (sort === 'year_asc') filtered.sort((a,b) => a.year - b.year);
                else filtered.sort((a,b) => b.id - a.id);

                return new Response(JSON.stringify(filtered), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }

            if (method === 'POST') {
                const body = JSON.parse(options.body || '{}');
                const all = this.getPapers();
                const newId = all.length > 0 ? Math.max(...all.map(p => p.id)) + 1 : 1;
                const newPaper = {
                    id: newId,
                    user_id: currentUser.id,
                    is_public: true,
                    title: body.title,
                    authors: body.authors,
                    abstract: body.abstract || '',
                    keywords: body.keywords || '',
                    year: parseInt(body.year || '2024', 10),
                    venue: body.venue || '',
                    category: body.category || 'Artificial Intelligence',
                    doi: body.doi || '',
                    url: body.url || '',
                    status: body.status || 'Published',
                    reading_status: body.reading_status || 'To Read',
                    favorite: body.favorite === 'true' || body.favorite === true,
                    added_at: new Date().toISOString()
                };
                all.unshift(newPaper);
                this.savePapers(all);
                return new Response(JSON.stringify(newPaper), { status: 201, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // Toggle favorite
        if (path === '/api/papers/toggle-favorite' && method === 'POST') {
            const body = JSON.parse(options.body || '{}');
            const all = this.getPapers();
            const p = all.find(x => x.id === parseInt(body.id, 10));
            if (p) {
                p.favorite = !p.favorite;
                this.savePapers(all);
                return new Response(JSON.stringify(p), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // Statistics
        if (path === '/api/statistics' && method === 'GET') {
            const all = this.getPapers();
            const authorsSet = new Set();
            const catMap = {};
            const statusMap = {};
            let favs = 0, completed = 0, reading = 0, toRead = 0;

            all.forEach(p => {
                if (p.favorite) favs++;
                if (p.reading_status === 'Completed') completed++;
                else if (p.reading_status === 'Reading') reading++;
                else toRead++;

                catMap[p.category] = (catMap[p.category] || 0) + 1;
                statusMap[p.status] = (statusMap[p.status] || 0) + 1;

                if (p.authors) {
                    p.authors.split(',').forEach(a => {
                        const trimmed = a.trim();
                        if (trimmed) authorsSet.add(trimmed);
                    });
                }
            });

            return new Response(JSON.stringify({
                total_papers: all.length,
                total_authors: authorsSet.size,
                total_categories: Object.keys(catMap).length,
                favorite_count: favs,
                completed_read_count: completed,
                reading_count: reading,
                to_read_count: toRead,
                categories: catMap,
                statuses: statusMap
            }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        // Update single paper
        if (path.startsWith('/api/papers/') && method === 'PUT') {
            const id = parseInt(path.split('/').pop(), 10);
            const body = JSON.parse(options.body || '{}');
            const all = this.getPapers();
            const p = all.find(x => x.id === id);
            if (p) {
                Object.assign(p, body);
                this.savePapers(all);
                return new Response(JSON.stringify(p), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // Delete single paper
        if (path.startsWith('/api/papers/') && method === 'DELETE') {
            const id = parseInt(path.split('/').pop(), 10);
            let all = this.getPapers();
            all = all.filter(x => x.id !== id);
            this.savePapers(all);
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    }
}

// Auto-activate fallback interceptor on Vercel or any static host
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const simulator = new LocalBackendSimulator();
    const originalFetch = window.fetch;
    window.fetch = async function(url, options = {}) {
        const urlStr = (typeof url === 'string') ? url : url.toString();
        if (urlStr.includes('/api/')) {
            try {
                // If there is a real backend responding, try it first
                const res = await originalFetch(url, options);
                if (res.status !== 404 && res.status !== 502 && res.status !== 503) {
                    return res;
                }
            } catch (e) {
                // Network failure or 404 on Vercel -> fallback to Simulator
            }
            return simulator.handleFetch(urlStr, options);
        }
        return originalFetch(url, options);
    };
    console.log("[ScholarTrack] Vercel Static Fallback Engine Initialized");
}
