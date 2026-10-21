/**
 * Research Paper Management System (RPMS)
 * papers.js - Paper Library, Search, Filters, Multi-Author Form & Details
 */

document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop();

  if (currentPath === 'papers.html') {
    initPapersLibrary();
  } else if (currentPath === 'add-paper.html') {
    initPaperForm();
  } else if (currentPath === 'paper-details.html') {
    initPaperDetails();
  } else if (currentPath === 'my-papers.html') {
    initMyPapers();
  }
});

// ==========================================
// RESEARCH PAPER LIBRARY (papers.html)
// ==========================================

function initPapersLibrary() {
  populateFilterDropdowns();

  // Check if navigated with category filter pre-selection
  const savedCat = sessionStorage.getItem('rpms_filter_cat');
  if (savedCat) {
    const catSelect = document.getElementById('filter-category');
    if (catSelect) {
      catSelect.value = savedCat;
    }
    sessionStorage.removeItem('rpms_filter_cat');
  }

  setupFilterListeners();
  renderFilteredPapers();
}

/**
 * Populates Category and Year select dropdowns dynamically from LocalStorage.
 */
function populateFilterDropdowns() {
  const catSelect = document.getElementById('filter-category');
  const yearSelect = document.getElementById('filter-year');
  const papers = getPapers();
  const categories = getCategories();

  if (catSelect) {
    categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      catSelect.appendChild(opt);
    });
  }

  if (yearSelect) {
    const years = [...new Set(papers.map(p => p.publicationYear).filter(Boolean))].sort((a,b) => b - a);
    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSelect.appendChild(opt);
    });
  }
}

function setupFilterListeners() {
  const searchInput = document.getElementById('search-papers');
  const catSelect = document.getElementById('filter-category');
  const yearSelect = document.getElementById('filter-year');
  const statusSelect = document.getElementById('filter-status');
  const typeSelect = document.getElementById('filter-type');
  const sortSelect = document.getElementById('sort-papers');
  const clearBtn = document.getElementById('btn-clear-filters');

  [searchInput, catSelect, yearSelect, statusSelect, typeSelect, sortSelect].forEach(el => {
    if (el) {
      el.addEventListener('input', () => renderFilteredPapers());
      el.addEventListener('change', () => renderFilteredPapers());
    }
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (catSelect) catSelect.value = '';
      if (yearSelect) yearSelect.value = '';
      if (statusSelect) statusSelect.value = '';
      if (typeSelect) typeSelect.value = '';
      if (sortSelect) sortSelect.value = 'newest';
      renderFilteredPapers();
      showToast('Filters cleared', 'info', 2000);
    });
  }
}

/**
 * Filters, sorts, and renders the paper cards list.
 */
function renderFilteredPapers() {
  const container = document.getElementById('papers-grid-container');
  const countBar = document.getElementById('search-results-info');
  if (!container) return;

  const query = (document.getElementById('search-papers')?.value || '').trim().toLowerCase();
  const cat = document.getElementById('filter-category')?.value || '';
  const year = document.getElementById('filter-year')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const sortBy = document.getElementById('sort-papers')?.value || 'newest';

  let papers = getPapers();

  // Search filter (Title, Author, Keywords, DOI)
  if (query) {
    papers = papers.filter(p => {
      const matchTitle = (p.title || '').toLowerCase().includes(query);
      const matchDoi = (p.doi || '').toLowerCase().includes(query);
      const matchKeywords = (p.keywords || '').toLowerCase().includes(query);
      const matchAuthors = Array.isArray(p.authors) 
        ? p.authors.some(a => (a.name || '').toLowerCase().includes(query))
        : false;
      return matchTitle || matchDoi || matchKeywords || matchAuthors;
    });
  }

  // Facet filters
  if (cat) papers = papers.filter(p => p.category === cat);
  if (year) papers = papers.filter(p => String(p.publicationYear) === String(year));
  if (status) papers = papers.filter(p => p.status === status);
  if (type) papers = papers.filter(p => p.publicationType === type);

  // Sorting
  papers.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.submissionDate || b.publicationYear) - new Date(a.submissionDate || a.publicationYear);
    if (sortBy === 'oldest') return new Date(a.submissionDate || a.publicationYear) - new Date(b.submissionDate || b.publicationYear);
    if (sortBy === 'title-asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'title-desc') return (b.title || '').localeCompare(a.title || '');
    return 0;
  });

  // Update Result Count Banner
  if (countBar) {
    if (query || cat || year || status || type) {
      countBar.innerHTML = `Showing <strong>${papers.length}</strong> papers matching your filter criteria`;
    } else {
      countBar.innerHTML = `Showing all <strong>${papers.length}</strong> research papers`;
    }
  }

  // Handle empty state
  if (papers.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </div>
        <div class="empty-state-title">No research papers found</div>
        <div class="empty-state-desc">Try loosening your search keywords or clearing applied filters to view more papers.</div>
        <button class="btn btn-secondary" onclick="document.getElementById('btn-clear-filters').click()">Clear All Filters</button>
      </div>
    `;
    return;
  }

  let html = '';
  papers.forEach(p => {
    const authorNames = Array.isArray(p.authors) ? p.authors.map(a => a.name).join(', ') : 'Unknown';
    const keywordChips = (p.keywords || '').split(',').map(k => k.trim()).filter(Boolean).slice(0, 4)
      .map(k => `<span class="tag-keyword">${escapeHtml(k)}</span>`).join('');

    html += `
      <div class="paper-card">
        <div class="paper-card-top">
          <span class="badge badge-category">${escapeHtml(p.category)}</span>
          ${getStatusBadge(p.status)}
        </div>
        <h3 class="paper-card-title">
          <a href="paper-details.html?id=${p.id}">${escapeHtml(p.title)}</a>
        </h3>
        <div class="paper-card-authors">
          <svg style="width: 14px; height: 14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span>${escapeHtml(authorNames)}</span>
        </div>
        <p class="paper-card-abstract">${escapeHtml(p.abstract)}</p>
        <div class="paper-card-tags">
          ${keywordChips}
        </div>
        <div class="paper-card-footer">
          <span style="font-size: 0.8rem; color: var(--slate-500); font-weight: 500;">
            Year: <strong>${escapeHtml(p.publicationYear)}</strong>
          </span>
          <a href="paper-details.html?id=${p.id}" class="btn btn-secondary btn-sm">
            View Details
          </a>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ==========================================
// ADD / EDIT RESEARCH PAPER FORM (add-paper.html)
// ==========================================

let uploadedFileInfo = null;

function initPaperForm() {
  const currentUser = requireAuth();
  if (!currentUser) return;

  populateCategorySelect();
  setupAuthorDynamicList();
  setupFileUploadSimulation();

  // Check if editing an existing paper
  const params = new URLSearchParams(window.location.search);
  const paperId = params.get('id');
  if (paperId) {
    loadPaperForEditing(paperId);
  }

  const form = document.getElementById('paper-form');
  if (form) {
    form.addEventListener('submit', handlePaperFormSubmit);
  }
}

function populateCategorySelect() {
  const select = document.getElementById('paper-category');
  if (!select) return;

  const categories = getCategories();
  select.innerHTML = '<option value="">-- Select Category --</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.name;
    opt.textContent = c.name;
    select.appendChild(opt);
  });
}

function setupAuthorDynamicList() {
  const addBtn = document.getElementById('btn-add-author');
  const container = document.getElementById('authors-container');

  if (addBtn && container) {
    addBtn.addEventListener('click', () => {
      addAuthorRow();
    });
  }
}

function addAuthorRow(name = '', inst = '', email = '') {
  const container = document.getElementById('authors-container');
  if (!container) return;

  const row = document.createElement('div');
  row.className = 'author-entry-row';
  row.innerHTML = `
    <div>
      <label class="form-label">Author Name <span class="required">*</span></label>
      <input type="text" class="form-control author-name-input" placeholder="e.g. Aarav Sharma" value="${escapeHtml(name)}" required>
    </div>
    <div>
      <label class="form-label">Institution</label>
      <input type="text" class="form-control author-inst-input" placeholder="e.g. Apex Tech" value="${escapeHtml(inst)}">
    </div>
    <div>
      <label class="form-label">Email</label>
      <input type="email" class="form-control author-email-input" placeholder="author@inst.edu" value="${escapeHtml(email)}">
    </div>
    <div>
      <button type="button" class="btn btn-secondary btn-sm" onclick="this.closest('.author-entry-row').remove()" title="Remove Author">
        &times;
      </button>
    </div>
  `;
  container.appendChild(row);
}

function setupFileUploadSimulation() {
  const fileInput = document.getElementById('paper-file-input');
  const dropzone = document.getElementById('file-dropzone');
  const preview = document.getElementById('dropzone-file-preview');

  if (!fileInput || !dropzone || !preview) return;

  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Please select a valid PDF file.', 'warning');
        fileInput.value = '';
        return;
      }
      uploadedFileInfo = {
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      };
      renderFilePreview(uploadedFileInfo.name, uploadedFileInfo.size);
    }
  });
}

function renderFilePreview(name, size) {
  const preview = document.getElementById('dropzone-file-preview');
  if (!preview) return;

  preview.style.display = 'flex';
  preview.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.75rem;">
      <svg style="width: 24px; height: 24px; color: var(--rose-500);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      <div>
        <div style="font-weight: 600; font-size: 0.9rem;">${escapeHtml(name)}</div>
        <div style="font-size: 0.75rem; color: var(--slate-400);">${escapeHtml(size)} (Local simulation)</div>
      </div>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" onclick="removeUploadedFile()">Remove</button>
  `;
}

window.removeUploadedFile = function() {
  uploadedFileInfo = null;
  const fileInput = document.getElementById('paper-file-input');
  if (fileInput) fileInput.value = '';
  const preview = document.getElementById('dropzone-file-preview');
  if (preview) preview.style.display = 'none';
};

function loadPaperForEditing(id) {
  const paper = getPaperById(id);
  if (!paper) {
    showToast('Paper not found', 'error');
    return;
  }

  const currentUser = getCurrentUser();
  if (paper.submittedBy !== currentUser.email && currentUser.role !== 'Admin') {
    alert('Permission denied. You can only edit papers submitted by you.');
    window.location.href = 'papers.html';
    return;
  }

  document.getElementById('form-page-title').textContent = 'Edit Research Paper';
  document.getElementById('paper-title').value = paper.title || '';
  document.getElementById('paper-abstract').value = paper.abstract || '';
  document.getElementById('paper-keywords').value = paper.keywords || '';
  document.getElementById('paper-category').value = paper.category || '';
  document.getElementById('paper-year').value = paper.publicationYear || '';
  document.getElementById('paper-doi').value = paper.doi || '';
  document.getElementById('paper-journal').value = paper.journalConference || '';
  document.getElementById('paper-type').value = paper.publicationType || 'Conference';
  document.getElementById('paper-methodology').value = paper.methodology || '';
  document.getElementById('paper-technologies').value = paper.technologiesUsed || '';

  // Render authors
  const authorsContainer = document.getElementById('authors-container');
  authorsContainer.innerHTML = '';
  if (Array.isArray(paper.authors) && paper.authors.length > 0) {
    paper.authors.forEach(a => addAuthorRow(a.name, a.institution, a.email));
  } else {
    addAuthorRow();
  }

  if (paper.fileName) {
    uploadedFileInfo = { name: paper.fileName, size: paper.fileSize || '2.5 MB' };
    renderFilePreview(uploadedFileInfo.name, uploadedFileInfo.size);
  }
}

function handlePaperFormSubmit(e) {
  e.preventDefault();

  const currentUser = getCurrentUser();
  const params = new URLSearchParams(window.location.search);
  const editingId = params.get('id');

  const title = document.getElementById('paper-title').value.trim();
  const abstract = document.getElementById('paper-abstract').value.trim();
  const keywords = document.getElementById('paper-keywords').value.trim();
  const category = document.getElementById('paper-category').value;
  const year = document.getElementById('paper-year').value.trim();
  const doi = document.getElementById('paper-doi').value.trim();
  const journalConference = document.getElementById('paper-journal').value.trim();
  const publicationType = document.getElementById('paper-type').value;
  const methodology = document.getElementById('paper-methodology').value.trim();
  const technologiesUsed = document.getElementById('paper-technologies').value.trim();

  // Validation
  if (title.length < 5) {
    showToast('Paper title must be at least 5 characters long.', 'error');
    return;
  }
  if (abstract.length < 30) {
    showToast('Abstract should be at least 30 characters for completeness.', 'error');
    return;
  }
  if (!category) {
    showToast('Please select a research category.', 'error');
    return;
  }
  if (!year || isNaN(year) || year < 1990 || year > 2030) {
    showToast('Please enter a valid publication year between 1990 and 2030.', 'error');
    return;
  }

  // Gather authors
  const authorRows = document.querySelectorAll('.author-entry-row');
  const authors = [];
  authorRows.forEach(row => {
    const name = row.querySelector('.author-name-input').value.trim();
    const inst = row.querySelector('.author-inst-input').value.trim();
    const email = row.querySelector('.author-email-input').value.trim();
    if (name) {
      authors.push({ name, institution: inst, email });
    }
  });

  if (authors.length === 0) {
    showToast('Please add at least one author.', 'error');
    return;
  }

  const paperData = {
    title,
    abstract,
    keywords,
    category,
    publicationYear: year,
    doi: doi || `10.1000/rpms.${Date.now()}`,
    journalConference: journalConference || 'RPMS Academic Repository',
    publicationType,
    methodology,
    technologiesUsed,
    authors,
    fileName: uploadedFileInfo ? uploadedFileInfo.name : 'Sample_Research_Manuscript.pdf',
    fileSize: uploadedFileInfo ? uploadedFileInfo.size : '2.4 MB'
  };

  if (editingId) {
    const existing = getPaperById(editingId);
    const updated = {
      ...existing,
      ...paperData
    };
    updatePaper(updated);
    showToast('Paper updated successfully!', 'success');
  } else {
    paperData.id = 'paper_' + Date.now();
    paperData.status = 'Pending';
    paperData.submittedBy = currentUser.email;
    paperData.submissionDate = new Date().toISOString().split('T')[0];
    paperData.feedback = '';
    paperData.reviewedBy = '';
    paperData.reviewedDate = '';
    savePaper(paperData);
    showToast('Paper submitted successfully for review!', 'success');
  }

  setTimeout(() => {
    window.location.href = 'my-papers.html';
  }, 1200);
}

// ==========================================
// PAPER DETAILS PAGE (paper-details.html)
// ==========================================

function initPaperDetails() {
  const params = new URLSearchParams(window.location.search);
  const paperId = params.get('id');

  if (!paperId) {
    showToast('No paper ID provided', 'error');
    window.location.href = 'papers.html';
    return;
  }

  const paper = getPaperById(paperId);
  if (!paper) {
    const container = document.getElementById('paper-details-container');
    if (container) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">Research Paper Not Found</div>
          <div class="empty-state-desc">The requested paper record does not exist or has been removed.</div>
          <a href="papers.html" class="btn btn-primary">Back to Library</a>
        </div>
      `;
    }
    return;
  }

  renderPaperDetails(paper);
}

function renderPaperDetails(paper) {
  const currentUser = getCurrentUser();

  // Document Title
  document.title = `${paper.title} - RPMS`;

  // Populate basic text
  document.getElementById('detail-title').textContent = paper.title;
  document.getElementById('detail-category').textContent = paper.category;
  document.getElementById('detail-status-badge').innerHTML = getStatusBadge(paper.status);
  document.getElementById('detail-abstract').textContent = paper.abstract;
  document.getElementById('detail-doi').textContent = paper.doi || 'Not Assigned';
  document.getElementById('detail-journal').textContent = paper.journalConference || 'Academic Repository';
  document.getElementById('detail-pub-type').textContent = paper.publicationType || 'Conference';
  document.getElementById('detail-year').textContent = paper.publicationYear || 'N/A';
  document.getElementById('detail-date').textContent = paper.submissionDate || 'N/A';
  document.getElementById('detail-methodology').textContent = paper.methodology || 'Empirical research and systematic evaluation.';
  document.getElementById('detail-tech').textContent = paper.technologiesUsed || 'Analytical tools, programming environments.';

  // Render Keywords
  const kwContainer = document.getElementById('detail-keywords');
  if (kwContainer) {
    kwContainer.innerHTML = (paper.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
      .map(k => `<span class="tag-keyword">${escapeHtml(k)}</span>`).join(' ');
  }

  // Render Authors
  const authorsContainer = document.getElementById('detail-authors-list');
  if (authorsContainer) {
    let aHtml = '';
    if (Array.isArray(paper.authors)) {
      paper.authors.forEach(a => {
        aHtml += `
          <div style="background-color: var(--slate-50); border: 1px solid var(--slate-200); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <div style="font-weight: 700; color: var(--navy-900);">${escapeHtml(a.name)}</div>
            <div style="font-size: 0.8rem; color: var(--navy-600);">${escapeHtml(a.institution || 'Apex Institute')}</div>
            <div style="font-size: 0.75rem; color: var(--slate-400);">${escapeHtml(a.email || '')}</div>
          </div>
        `;
      });
    }
    authorsContainer.innerHTML = aHtml;
  }

  // Render Status Tracker
  renderStatusTracker(paper.status);

  // Download Action
  const downloadBtn = document.getElementById('btn-download-pdf');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', () => {
      downloadMockPdf(paper.title, paper.fileName);
    });
  }

  // Reviewer Feedback banner
  const feedbackBox = document.getElementById('detail-feedback-box');
  if (feedbackBox) {
    if (paper.feedback) {
      feedbackBox.style.display = 'block';
      document.getElementById('detail-feedback-text').textContent = paper.feedback;
      document.getElementById('detail-reviewed-by').textContent = `Reviewed by ${paper.reviewedBy || 'Faculty'} on ${paper.reviewedDate || 'Recent'}`;
    } else {
      feedbackBox.style.display = 'none';
    }
  }

  // Permissions: Edit / Delete buttons
  const isOwner = currentUser && (paper.submittedBy === currentUser.email);
  const isAdmin = currentUser && (currentUser.role === 'Admin');

  const actionGroup = document.getElementById('detail-actions-group');
  if (actionGroup) {
    if (isOwner || isAdmin) {
      actionGroup.innerHTML = `
        <a href="add-paper.html?id=${paper.id}" class="btn btn-secondary">
          <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Edit Paper
        </a>
        <button class="btn btn-danger" onclick="confirmDeletePaper('${paper.id}')">
          <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          Delete Paper
        </button>
      `;
    }
  }
}

function renderStatusTracker(status) {
  const step1 = document.getElementById('step-submitted');
  const step2 = document.getElementById('step-review');
  const step3 = document.getElementById('step-decision');
  const line1 = document.getElementById('line-1');
  const line2 = document.getElementById('line-2');
  const decisionLabel = document.getElementById('step-decision-label');

  if (!step1 || !step2 || !step3) return;

  // Step 1 is always completed
  step1.className = 'tracker-step completed';

  if (status === 'Pending') {
    step2.className = 'tracker-step';
    step3.className = 'tracker-step';
    line1.className = 'tracker-line';
    line2.className = 'tracker-line';
    if (decisionLabel) decisionLabel.textContent = 'Decision';
  } else if (status === 'Under Review') {
    step2.className = 'tracker-step completed';
    step3.className = 'tracker-step';
    line1.className = 'tracker-line active';
    line2.className = 'tracker-line';
    if (decisionLabel) decisionLabel.textContent = 'Decision Pending';
  } else if (status === 'Approved') {
    step2.className = 'tracker-step completed';
    step3.className = 'tracker-step approved';
    line1.className = 'tracker-line active';
    line2.className = 'tracker-line active';
    if (decisionLabel) decisionLabel.textContent = 'Approved';
  } else if (status === 'Rejected') {
    step2.className = 'tracker-step completed';
    step3.className = 'tracker-step rejected';
    line1.className = 'tracker-line active';
    line2.className = 'tracker-line active';
    if (decisionLabel) decisionLabel.textContent = 'Rejected';
  }
}

window.confirmDeletePaper = function(id) {
  if (confirm('Are you sure you want to permanently delete this research paper? This action cannot be undone.')) {
    deletePaper(id);
    showToast('Paper deleted successfully.', 'success');
    setTimeout(() => {
      window.location.href = 'papers.html';
    }, 1000);
  }
};

// ==========================================
// MY PAPERS VIEW (my-papers.html)
// ==========================================

function initMyPapers() {
  const currentUser = requireAuth();
  if (!currentUser) return;

  const container = document.getElementById('my-papers-table-body');
  if (!container) return;

  const allPapers = getPapers();
  const myPapers = allPapers.filter(p => p.submittedBy === currentUser.email);

  if (myPapers.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="empty-state-title">No Papers Yet</div>
            <div class="empty-state-desc">Start building your research library by adding your first paper.</div>
            <a href="add-paper.html" class="btn btn-primary">Add Research Paper</a>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  let rows = '';
  myPapers.forEach(p => {
    rows += `
      <tr>
        <td>
          <a href="paper-details.html?id=${p.id}" class="text-semibold" style="color: var(--navy-950);">
            ${escapeHtml(p.title)}
          </a>
          <div style="font-size: 0.75rem; color: var(--slate-400); margin-top: 2px;">
            Submitted on ${escapeHtml(p.submissionDate || 'N/A')}
          </div>
        </td>
        <td><span class="badge badge-category">${escapeHtml(p.category)}</span></td>
        <td>${escapeHtml(p.publicationYear || 'N/A')}</td>
        <td>${getStatusBadge(p.status)}</td>
        <td>
          ${p.feedback ? `<div style="font-size: 0.8rem; color: var(--navy-700); max-width: 260px; line-height: 1.3;">"${escapeHtml(p.feedback)}"</div>` : '<span class="text-muted" style="font-size: 0.8rem;">No feedback yet</span>'}
        </td>
        <td>
          <div style="display: flex; gap: 0.5rem;">
            <a href="add-paper.html?id=${p.id}" class="btn btn-secondary btn-sm" title="Edit">
              Edit
            </a>
            <button class="btn btn-danger btn-sm" onclick="confirmDeletePaper('${p.id}')" title="Delete">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = rows;
}
