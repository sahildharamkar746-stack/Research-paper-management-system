/**
 * ScholarTrack — Frontend Controller
 * Connects directly to C++ REST API endpoints with session authentication
 */

const API_BASE = window.location.origin;

let currentUser = null;
let papers = [];
let activeFilters = {
    scope: 'all',
    search: '',
    category: 'All',
    status: 'All',
    year: '0',
    reading_status: 'All',
    favorite: false,
    sort: 'date_desc'
};

let currentViewingPaper = null;
let paperToDeleteId = null;

// Auth Screen Elements
const authScreen = document.getElementById('auth-screen');
const dashboardApp = document.getElementById('dashboard-app');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authAlert = document.getElementById('auth-alert');
const linkShowRegister = document.getElementById('link-show-register');
const linkShowLogin = document.getElementById('link-show-login');
const fillDemoBtn = document.getElementById('fill-demo-btn');
const toggleLoginPwd = document.getElementById('toggle-login-pwd');
const toggleRegisterPwd = document.getElementById('toggle-register-pwd');
const btnLogout = document.getElementById('btn-logout');

// Top User Elements
const topUserName = document.getElementById('top-user-name');
const topUserEmail = document.getElementById('top-user-email');
const heroUserName = document.getElementById('hero-user-name');

// Dashboard DOM Elements
const paperListEl = document.getElementById('paper-list');
const emptyStateEl = document.getElementById('empty-state');
const resultsCountEl = document.getElementById('results-count-text');
const globalSearchInput = document.getElementById('global-search');
const clearSearchBtn = document.getElementById('clear-search');

const statTotalPapers = document.getElementById('stat-total-papers');
const statTotalAuthors = document.getElementById('stat-total-authors');
const statTotalCategories = document.getElementById('stat-total-categories');
const statReadingQueue = document.getElementById('stat-reading-queue');
const statCompleted = document.getElementById('stat-completed');
const menuPaperCount = document.getElementById('menu-paper-count');
const menuFavCount = document.getElementById('menu-fav-count');

const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const filterYear = document.getElementById('filter-year');
const sortSelect = document.getElementById('sort-select');

// Modals
const paperModal = document.getElementById('paper-modal');
const paperDetailModal = document.getElementById('paper-detail-modal');
const confirmModal = document.getElementById('confirm-modal');
const paperForm = document.getElementById('paper-form');
const modalTitle = document.getElementById('modal-title');

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
    initClock();
    populateYearDropdown();
    attachEventListeners();
    attachAuthListeners();
    
    // Check initial authentication state with C++ server
    await checkAuth();
});

function initClock() {
    const clockEl = document.getElementById('clock-display');
    const update = () => {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    update();
    setInterval(update, 1000);
}

function populateYearDropdown() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear + 1; y >= 2010; y--) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        filterYear.appendChild(opt);
    }
}

// -------------------------------------------------------------
// AUTHENTICATION CONTROLLER
// -------------------------------------------------------------

async function checkAuth() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
            credentials: 'include'
        });

        if (res.ok) {
            currentUser = await res.json();
            showDashboard();
        } else {
            showLoginScreen();
        }
    } catch (e) {
        console.error('Error verifying session:', e);
        showLoginScreen();
    }
}

function showLoginScreen() {
    currentUser = null;
    dashboardApp.style.display = 'none';
    authScreen.style.display = 'flex';
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    hideAuthAlert();
}

function showDashboard() {
    authScreen.style.display = 'none';
    dashboardApp.style.display = 'flex';

    if (currentUser) {
        topUserName.textContent = currentUser.full_name;
        topUserEmail.textContent = currentUser.email;
        heroUserName.textContent = currentUser.full_name;
    }

    fetchStatistics();
    fetchPapers();
}

function showAuthAlert(message, type = 'error') {
    authAlert.textContent = message;
    authAlert.className = `auth-alert alert-${type}`;
    authAlert.style.display = 'flex';
}

function hideAuthAlert() {
    authAlert.style.display = 'none';
    authAlert.textContent = '';
}

function attachAuthListeners() {
    // Switch between login and register
    linkShowRegister.addEventListener('click', (e) => {
        e.preventDefault();
        hideAuthAlert();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    linkShowLogin.addEventListener('click', (e) => {
        e.preventDefault();
        hideAuthAlert();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Toggle password visibility
    toggleLoginPwd.addEventListener('click', () => {
        const pwd = document.getElementById('login-password');
        const icon = toggleLoginPwd.querySelector('i');
        if (pwd.type === 'password') {
            pwd.type = 'text';
            icon.className = 'fa-regular fa-eye-slash';
        } else {
            pwd.type = 'password';
            icon.className = 'fa-regular fa-eye';
        }
    });

    toggleRegisterPwd.addEventListener('click', () => {
        const pwd = document.getElementById('register-password');
        const icon = toggleRegisterPwd.querySelector('i');
        if (pwd.type === 'password') {
            pwd.type = 'text';
            icon.className = 'fa-regular fa-eye-slash';
        } else {
            pwd.type = 'password';
            icon.className = 'fa-regular fa-eye';
        }
    });

    // Auto-fill Demo credentials
    fillDemoBtn.addEventListener('click', () => {
        document.getElementById('login-email').value = 'scholar@university.edu';
        document.getElementById('login-password').value = 'password123';
        showToast('Demo credentials inserted', 'info');
    });

    // Login Form Submit
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthAlert();
        document.getElementById('err-login-email').textContent = '';
        document.getElementById('err-login-password').textContent = '';

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const remember = document.getElementById('login-remember').checked;

        let hasErr = false;
        if (!email) {
            document.getElementById('err-login-email').textContent = 'Email is required.';
            hasErr = true;
        }
        if (!password) {
            document.getElementById('err-login-password').textContent = 'Password is required.';
            hasErr = true;
        }
        if (hasErr) return;

        const btn = document.getElementById('btn-login-submit');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';

        try {
            const res = await fetch(`${API_BASE}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email, password, remember: remember ? 'true' : 'false' })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            currentUser = data;
            showDashboard();
            showToast(`Welcome back, ${currentUser.full_name}!`, 'success');
        } catch (err) {
            showAuthAlert(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Registration Form Submit
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAuthAlert();
        document.getElementById('err-register-name').textContent = '';
        document.getElementById('err-register-email').textContent = '';
        document.getElementById('err-register-password').textContent = '';
        document.getElementById('err-register-confirm').textContent = '';

        const fullName = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm-password').value;

        let hasErr = false;
        if (!fullName) {
            document.getElementById('err-register-name').textContent = 'Full name is required.';
            hasErr = true;
        }
        if (!email || email.indexOf('@') === -1) {
            document.getElementById('err-register-email').textContent = 'Please provide a valid academic email.';
            hasErr = true;
        }
        if (!password || password.length < 6) {
            document.getElementById('err-register-password').textContent = 'Password must be at least 6 characters.';
            hasErr = true;
        }
        if (password !== confirm) {
            document.getElementById('err-register-confirm').textContent = 'Passwords do not match.';
            hasErr = true;
        }
        if (hasErr) return;

        const btn = document.getElementById('btn-register-submit');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...';

        try {
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ full_name: fullName, email, password })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            currentUser = data;
            showDashboard();
            showToast(`Account created! Welcome, ${currentUser.full_name}`, 'success');
        } catch (err) {
            showAuthAlert(err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Logout Button
    btnLogout.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/api/auth/logout`, {
                method: 'POST',
                credentials: 'include'
            });
            showLoginScreen();
            showToast('You have been logged out safely.', 'info');
        } catch (err) {
            showLoginScreen();
        }
    });
}

// -------------------------------------------------------------
// RESEARCH PAPERS CONTROLLER (PROTECTED PER USER)
// -------------------------------------------------------------

async function fetchPapers() {
    try {
        const params = new URLSearchParams();
        if (activeFilters.scope) params.append('scope', activeFilters.scope);
        if (activeFilters.search) params.append('q', activeFilters.search);
        if (activeFilters.category !== 'All') params.append('category', activeFilters.category);
        if (activeFilters.status !== 'All') params.append('status', activeFilters.status);
        if (activeFilters.reading_status !== 'All') params.append('reading_status', activeFilters.reading_status);
        if (activeFilters.year !== '0') params.append('year', activeFilters.year);
        if (activeFilters.favorite) params.append('favorite', 'true');
        if (activeFilters.sort) params.append('sort', activeFilters.sort);

        const res = await fetch(`${API_BASE}/api/papers?${params.toString()}`, {
            credentials: 'include'
        });

        if (res.status === 401) {
            showLoginScreen();
            return;
        }

        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        papers = await res.json();
        renderPapers(papers);
        fetchStatistics();
    } catch (err) {
        console.error('Failed to load papers:', err);
    }
}

async function fetchStatistics() {
    try {
        const res = await fetch(`${API_BASE}/api/statistics`, {
            credentials: 'include'
        });
        if (!res.ok) return;
        const stats = await res.json();

        statTotalPapers.textContent = stats.total_papers || 0;
        statTotalAuthors.textContent = stats.total_authors || 0;
        statTotalCategories.textContent = stats.total_categories || 0;
        statReadingQueue.textContent = (stats.reading_count || 0) + (stats.to_read_count || 0);
        statCompleted.textContent = stats.completed_read_count || 0;
        
        menuPaperCount.textContent = stats.total_papers || 0;
        menuFavCount.textContent = stats.favorite_count || 0;
    } catch (e) {
        console.error("Stats fetch error:", e);
    }
}

function renderPapers(items) {
    paperListEl.innerHTML = '';
    resultsCountEl.textContent = `Showing ${items.length} paper${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
        paperListEl.style.display = 'none';
        emptyStateEl.style.display = 'block';
        return;
    }

    paperListEl.style.display = 'grid';
    emptyStateEl.style.display = 'none';

    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'paper-card';

        const statusClass = p.status.toLowerCase().replace(/\s+/g, '-');
        const readingClass = p.reading_status.toLowerCase().replace(/\s+/g, '-');

        const keywordsList = p.keywords
            ? p.keywords.split(',').map(k => `<span class="keyword-badge">${escapeHtml(k.trim())}</span>`).slice(0, 4).join('')
            : '';

        card.innerHTML = `
            <div>
                <div class="card-top">
                    <span class="category-tag">${escapeHtml(p.category)}</span>
                    <div class="card-actions-top">
                        <button class="fav-btn ${p.favorite ? 'active' : ''}" onclick="toggleFavorite(${p.id}, event)" title="${p.favorite ? 'Remove Favorite' : 'Mark Favorite'}">
                            <i class="${p.favorite ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                        </button>
                    </div>
                </div>

                <h3 class="paper-title" onclick="openDetailModal(${p.id})">${escapeHtml(p.title)}</h3>
                <div class="paper-authors">
                    <i class="fa-solid fa-user-pen"></i>
                    <span>${escapeHtml(p.authors)}</span>
                </div>

                <p class="paper-abstract">${escapeHtml(p.abstract || 'No abstract provided for this publication.')}</p>

                ${keywordsList ? `<div class="keywords-wrap">${keywordsList}</div>` : ''}
            </div>

            <div class="card-footer">
                <div class="footer-meta">
                    <span><i class="fa-regular fa-calendar"></i> ${p.year}</span>
                    <span class="status-pill ${statusClass}">${escapeHtml(p.status)}</span>
                    <span class="reading-pill ${readingClass}">${escapeHtml(p.reading_status)}</span>
                </div>
                <div class="card-btn-group">
                    <button class="icon-btn" onclick="openDetailModal(${p.id})" title="View Details">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                    <button class="icon-btn" onclick="openEditModal(${p.id})" title="Edit Paper">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn" onclick="confirmDelete(${p.id})" title="Delete Paper" style="color: #dc2626;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        paperListEl.appendChild(card);
    });
}

// Toggle Favorite (C++ API)
async function toggleFavorite(id, event) {
    if (event) event.stopPropagation();
    try {
        const res = await fetch(`${API_BASE}/api/papers/toggle-favorite`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ id: id.toString() })
        });
        if (!res.ok) throw new Error('Failed to update favorite status');
        await fetchPapers();
        showToast('Favorite status updated', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// View Paper Details Modal
function openDetailModal(id) {
    const p = papers.find(x => x.id === id);
    if (!p) return;
    currentViewingPaper = p;

    const body = document.getElementById('detail-modal-body');
    const statusClass = p.status.toLowerCase().replace(/\s+/g, '-');
    const readingClass = p.reading_status.toLowerCase().replace(/\s+/g, '-');

    body.innerHTML = `
        <div class="detail-grid">
            <div class="detail-header-card">
                <h2 class="detail-title">${escapeHtml(p.title)}</h2>
                <div class="detail-authors">
                    <i class="fa-solid fa-feather-pointed"></i> ${escapeHtml(p.authors)}
                </div>
                <div style="font-size: 0.88rem; color: #64748b; margin-top: 4px;">
                    <i class="fa-solid fa-landmark"></i> <strong>Venue:</strong> ${escapeHtml(p.venue || 'Standard Academic Venue')} &bull; <strong>Year:</strong> ${p.year}
                </div>
                <div class="detail-meta-tags">
                    <span class="category-tag">${escapeHtml(p.category)}</span>
                    <span class="status-pill ${statusClass}">${escapeHtml(p.status)}</span>
                    <span class="reading-pill ${readingClass}">Reading: ${escapeHtml(p.reading_status)}</span>
                    ${p.favorite ? '<span class="status-pill" style="background:#fef3c7;color:#b45309;"><i class="fa-solid fa-star"></i> Favorited</span>' : ''}
                </div>
            </div>

            <div>
                <h4 class="detail-section-title">Abstract / Summary</h4>
                <div class="detail-abstract">
                    ${escapeHtml(p.abstract || 'No abstract text available for this publication.')}
                </div>
            </div>

            ${p.keywords ? `
            <div>
                <h4 class="detail-section-title">Keywords</h4>
                <div class="keywords-wrap">
                    ${p.keywords.split(',').map(k => `<span class="keyword-badge" style="font-size:0.8rem;padding:4px 10px;">${escapeHtml(k.trim())}</span>`).join('')}
                </div>
            </div>` : ''}

            <div>
                <h4 class="detail-section-title">Academic Identifiers & Links</h4>
                <div class="detail-links-bar">
                    ${p.doi ? `
                        <a href="https://doi.org/${encodeURIComponent(p.doi)}" target="_blank" class="detail-link-btn">
                            <i class="fa-solid fa-fingerprint"></i> DOI: ${escapeHtml(p.doi)} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.75rem;"></i>
                        </a>
                    ` : '<span style="font-size:0.85rem;color:#94a3b8;">No DOI recorded</span>'}

                    ${p.url ? `
                        <a href="${escapeHtml(p.url)}" target="_blank" class="detail-link-btn" style="background:#f0fdf4;border-color:#bbf7d0;color:#15803d;">
                            <i class="fa-solid fa-link"></i> Full Paper / PDF Link <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:0.75rem;"></i>
                        </a>
                    ` : ''}
                </div>
            </div>

            <div style="font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                Record ID #${p.id} &bull; SQLite Isolated Account Data &bull; Registered: ${p.added_at || 'Recently'}
            </div>
        </div>
    `;

    document.getElementById('detail-edit-btn').onclick = () => {
        closeDetailModal();
        openEditModal(p.id);
    };

    paperDetailModal.classList.add('open');
}

function closeDetailModal() {
    paperDetailModal.classList.remove('open');
    currentViewingPaper = null;
}

function openAddModal() {
    paperForm.reset();
    document.getElementById('paper-id').value = '';
    modalTitle.textContent = 'Add New Research Paper';
    document.getElementById('modal-icon').innerHTML = '<i class="fa-solid fa-file-circle-plus"></i>';
    clearErrors();
    paperModal.classList.add('open');
}

function openEditModal(id) {
    const p = papers.find(x => x.id === id);
    if (!p) return;
    clearErrors();

    document.getElementById('paper-id').value = p.id;
    document.getElementById('paper-title').value = p.title;
    document.getElementById('paper-authors').value = p.authors;
    document.getElementById('paper-category').value = p.category;
    document.getElementById('paper-year').value = p.year;
    document.getElementById('paper-venue').value = p.venue || '';
    document.getElementById('paper-status').value = p.status || 'Published';
    document.getElementById('paper-reading-status').value = p.reading_status || 'To Read';
    document.getElementById('paper-doi').value = p.doi || '';
    document.getElementById('paper-url').value = p.url || '';
    document.getElementById('paper-keywords').value = p.keywords || '';
    document.getElementById('paper-abstract').value = p.abstract || '';

    modalTitle.textContent = 'Edit Research Paper';
    document.getElementById('modal-icon').innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
    paperModal.classList.add('open');
}

function closePaperModal() {
    paperModal.classList.remove('open');
    paperForm.reset();
    clearErrors();
}

function clearErrors() {
    document.getElementById('err-title').textContent = '';
    document.getElementById('err-authors').textContent = '';
    document.getElementById('err-year').textContent = '';
}

// Save Paper Form (Create or Update via C++ API)
paperForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const id = document.getElementById('paper-id').value;
    const title = document.getElementById('paper-title').value.trim();
    const authors = document.getElementById('paper-authors').value.trim();
    const yearVal = document.getElementById('paper-year').value;
    const year = parseInt(yearVal, 10);

    let hasError = false;
    if (!title) {
        document.getElementById('err-title').textContent = 'Paper title is required.';
        hasError = true;
    }
    if (!authors) {
        document.getElementById('err-authors').textContent = 'At least one author is required.';
        hasError = true;
    }
    if (isNaN(year) || year < 1950 || year > 2030) {
        document.getElementById('err-year').textContent = 'Please enter a valid year (1950–2030).';
        hasError = true;
    }
    if (hasError) return;

    const payload = {
        title: title,
        authors: authors,
        category: document.getElementById('paper-category').value,
        year: year.toString(),
        venue: document.getElementById('paper-venue').value.trim(),
        status: document.getElementById('paper-status').value,
        reading_status: document.getElementById('paper-reading-status').value,
        doi: document.getElementById('paper-doi').value.trim(),
        url: document.getElementById('paper-url').value.trim(),
        keywords: document.getElementById('paper-keywords').value.trim(),
        abstract: document.getElementById('paper-abstract').value.trim()
    };

    try {
        let url = `${API_BASE}/api/papers`;
        let method = 'POST';

        if (id) {
            url = `${API_BASE}/api/papers/${id}`;
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errJson = await res.json().catch(() => ({}));
            throw new Error(errJson.error || 'Failed to save paper');
        }

        closePaperModal();
        await fetchPapers();
        showToast(id ? 'Paper updated successfully!' : 'Paper added successfully to repository!', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
});

// Delete Paper (C++ API)
function confirmDelete(id) {
    paperToDeleteId = id;
    confirmModal.classList.add('open');
}

document.getElementById('confirm-cancel-btn').onclick = () => {
    confirmModal.classList.remove('open');
    paperToDeleteId = null;
};

document.getElementById('confirm-ok-btn').onclick = async () => {
    if (!paperToDeleteId) return;
    try {
        const res = await fetch(`${API_BASE}/api/papers/${paperToDeleteId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Delete failed or unauthorized');
        confirmModal.classList.remove('open');
        paperToDeleteId = null;
        await fetchPapers();
        showToast('Paper permanently deleted from database', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
};

// Reset Filters
function resetAllFilters() {
    activeFilters = {
        search: '',
        category: 'All',
        status: 'All',
        year: '0',
        reading_status: 'All',
        favorite: false,
        sort: 'date_desc'
    };
    globalSearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    filterCategory.value = 'All';
    filterStatus.value = 'All';
    filterYear.value = '0';
    sortSelect.value = 'date_desc';

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.tab-btn[data-filter-reading="All"]').classList.add('active');

    fetchPapers();
}

// Export CSV Feature
function exportToCSV() {
    if (!papers || papers.length === 0) {
        showToast('No papers available to export', 'info');
        return;
    }

    const headers = ['ID', 'Title', 'Authors', 'Year', 'Category', 'Venue', 'Status', 'Reading Status', 'DOI', 'URL', 'Keywords'];
    const csvRows = [headers.join(',')];

    papers.forEach(p => {
        const row = [
            p.id,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.authors || '').replace(/"/g, '""')}"`,
            p.year,
            `"${(p.category || '').replace(/"/g, '""')}"`,
            `"${(p.venue || '').replace(/"/g, '""')}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`,
            `"${(p.reading_status || '').replace(/"/g, '""')}"`,
            `"${(p.doi || '').replace(/"/g, '""')}"`,
            `"${(p.url || '').replace(/"/g, '""')}"`,
            `"${(p.keywords || '').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_papers_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Academic CSV exported successfully!', 'success');
}

// Attach Event Listeners
function attachEventListeners() {
    document.getElementById('btn-open-add-modal').onclick = openAddModal;
    document.getElementById('modal-close-btn').onclick = closePaperModal;
    document.getElementById('modal-cancel-btn').onclick = closePaperModal;
    document.getElementById('detail-close-btn').onclick = closeDetailModal;
    document.getElementById('detail-close-footer-btn').onclick = closeDetailModal;
    document.getElementById('btn-reset-filters').onclick = resetAllFilters;
    document.getElementById('btn-export-csv').onclick = exportToCSV;

    // Search input
    let searchTimeout;
    globalSearchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim();
        clearSearchBtn.style.display = val ? 'block' : 'none';
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            activeFilters.search = val;
            fetchPapers();
        }, 250);
    });

    clearSearchBtn.addEventListener('click', () => {
        globalSearchInput.value = '';
        clearSearchBtn.style.display = 'none';
        activeFilters.search = '';
        fetchPapers();
    });

    // Filters
    filterCategory.addEventListener('change', (e) => {
        activeFilters.category = e.target.value;
        fetchPapers();
    });

    filterStatus.addEventListener('change', (e) => {
        activeFilters.status = e.target.value;
        fetchPapers();
    });

    filterYear.addEventListener('change', (e) => {
        activeFilters.year = e.target.value;
        fetchPapers();
    });

    sortSelect.addEventListener('change', (e) => {
        activeFilters.sort = e.target.value;
        fetchPapers();
    });

    // Tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            if (btn.dataset.filterScope) {
                activeFilters.scope = btn.dataset.filterScope;
            } else {
                activeFilters.scope = 'all';
            }

            if (btn.dataset.filterFavorite) {
                activeFilters.favorite = true;
                activeFilters.reading_status = 'All';
            } else {
                activeFilters.favorite = false;
                activeFilters.reading_status = btn.dataset.filterReading || 'All';
            }
            fetchPapers();
        });
    });

    // Sidebar navigation tabs
    document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.sidebar-menu .menu-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            const nav = item.dataset.nav;
            if (nav === 'my-papers') {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                const mineTab = document.querySelector('.tab-btn[data-filter-scope="mine"]');
                if (mineTab) mineTab.classList.add('active');
                activeFilters.scope = 'mine';
                activeFilters.favorite = false;
                activeFilters.reading_status = 'All';
            } else if (nav === 'favorites') {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                const favTab = document.querySelector('.tab-btn[data-filter-favorite="true"]');
                if (favTab) favTab.classList.add('active');
                activeFilters.scope = 'all';
                activeFilters.favorite = true;
                activeFilters.reading_status = 'All';
            } else if (nav === 'reading-list') {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                const readTab = document.querySelector('.tab-btn[data-filter-reading="To Read"]');
                if (readTab) readTab.classList.add('active');
                activeFilters.scope = 'all';
                activeFilters.favorite = false;
                activeFilters.reading_status = 'To Read';
            } else if (nav === 'categories') {
                filterCategory.focus();
                showToast('Use the Category dropdown to filter domains', 'info');
                return;
            } else {
                resetAllFilters();
            }
            fetchPapers();
        });
    });

    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }

    // Modal background close
    [paperModal, paperDetailModal, confirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('open');
            }
        });
    });
}

// Toast helper
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

// Utilities
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
