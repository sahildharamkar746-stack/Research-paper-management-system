/**
 * Research Paper Management System (RPMS)
 * reviews.js - Peer Review Pipeline & Faculty Evaluation
 */

let selectedReviewPaperId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Only Faculty & Admin are permitted to access this module
  const currentUser = requireAuth(['Faculty', 'Admin']);
  if (!currentUser) return;

  initReviewsPage();
});

function initReviewsPage() {
  renderReviewList();

  const filterSelect = document.getElementById('filter-review-status');
  if (filterSelect) {
    filterSelect.addEventListener('change', () => {
      renderReviewList(filterSelect.value);
    });
  }

  const reviewForm = document.getElementById('submit-review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', handleReviewSubmit);
  }
}

/**
 * Renders papers eligible for peer-review.
 * @param {string} filterStatus 
 */
function renderReviewList(filterStatus = '') {
  const container = document.getElementById('review-papers-table-body');
  if (!container) return;

  let papers = getPapers();

  if (filterStatus) {
    papers = papers.filter(p => p.status === filterStatus);
  }

  if (papers.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted" style="padding: 3rem;">
          No papers currently match the selected review criteria.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  papers.forEach(p => {
    const authorNames = Array.isArray(p.authors) 
      ? p.authors.map(a => a.name).join(', ') 
      : 'Unknown';

    html += `
      <tr>
        <td>
          <a href="paper-details.html?id=${p.id}" class="text-semibold" style="color: var(--navy-950);">
            ${escapeHtml(p.title)}
          </a>
          <div style="font-size: 0.775rem; color: var(--navy-600); margin-top: 2px;">
            ${escapeHtml(p.journalConference || 'Academic Manuscript')}
          </div>
        </td>
        <td>${escapeHtml(authorNames)}</td>
        <td><span class="badge badge-category">${escapeHtml(p.category)}</span></td>
        <td>${escapeHtml(p.submissionDate || 'N/A')}</td>
        <td>${getStatusBadge(p.status)}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="openReviewModal('${p.id}')">
            Evaluate
          </button>
        </td>
      </tr>
    `;
  });

  container.innerHTML = html;
}

/**
 * Opens evaluation modal with selected paper details.
 * @param {string} paperId 
 */
window.openReviewModal = function(paperId) {
  const paper = getPaperById(paperId);
  if (!paper) {
    showToast('Paper not found', 'error');
    return;
  }

  selectedReviewPaperId = paperId;
  document.getElementById('modal-review-paper-title').textContent = paper.title;
  document.getElementById('modal-review-abstract').textContent = paper.abstract;
  document.getElementById('modal-review-status').value = paper.status === 'Pending' ? 'Under Review' : paper.status;
  document.getElementById('modal-review-feedback').value = paper.feedback || '';

  openModal('review-modal');
};

/**
 * Handles submission of a faculty review and feedback.
 */
function handleReviewSubmit(e) {
  e.preventDefault();

  if (!selectedReviewPaperId) return;

  const currentUser = getCurrentUser();
  const newStatus = document.getElementById('modal-review-status').value;
  const feedback = document.getElementById('modal-review-feedback').value.trim();

  if (!feedback) {
    showToast('Please provide feedback comments for the author.', 'warning');
    return;
  }

  const reviewRecord = {
    id: 'rev_' + Date.now(),
    paperId: selectedReviewPaperId,
    reviewerName: currentUser.name,
    reviewerEmail: currentUser.email,
    status: newStatus,
    feedback: feedback,
    reviewedDate: new Date().toISOString().split('T')[0]
  };

  saveReview(reviewRecord);
  closeModal('review-modal');
  showToast(`Review submitted successfully. Status updated to ${newStatus}.`, 'success');

  const filterSelect = document.getElementById('filter-review-status');
  renderReviewList(filterSelect ? filterSelect.value : '');
}
