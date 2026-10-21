/**
 * Research Paper Management System (RPMS)
 * admin.js - Administrative Dashboard, User & Category Management
 */

let editingCategoryId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Strictly enforce Admin privileges
  const currentUser = requireAuth(['Admin']);
  if (!currentUser) return;

  initAdminDashboard();
});

function initAdminDashboard() {
  renderAdminUsersTable();
  renderAdminPapersTable();
  renderAdminCategoriesList();

  // Category modal forms
  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', handleCategoryFormSubmit);
  }

  // Database reset button
  const resetBtn = document.getElementById('btn-reset-db');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('CAUTION: This will reset all demo users, papers, reviews and activities back to factory defaults. Proceed?')) {
        resetDatabaseToDefault();
        showToast('Database reset to default demo records.', 'info');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }
}

// ==========================================
// 1. USER MANAGEMENT
// ==========================================

function renderAdminUsersTable() {
  const container = document.getElementById('admin-users-table-body');
  if (!container) return;

  const users = getUsers();
  let rows = '';

  users.forEach(u => {
    const isCurrent = u.email === getCurrentUser().email;
    const statusBadge = u.status === 'Active' 
      ? '<span class="badge badge-approved">Active</span>'
      : '<span class="badge badge-rejected">Disabled</span>';

    rows += `
      <tr>
        <td>
          <div style="font-weight: 700; color: var(--navy-950);">${escapeHtml(u.name)}</div>
          <div style="font-size: 0.775rem; color: var(--navy-600);">${escapeHtml(u.institution || 'Apex Tech')}</div>
        </td>
        <td>${escapeHtml(u.email)}</td>
        <td><span class="badge badge-role-${u.role.toLowerCase()}">${escapeHtml(u.role)}</span></td>
        <td>${statusBadge}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="viewUserModal('${u.id}')">View</button>
            ${!isCurrent ? `
              <button class="btn btn-secondary btn-sm" onclick="toggleUserStatus('${u.id}')">
                ${u.status === 'Active' ? 'Disable' : 'Enable'}
              </button>
              <button class="btn btn-danger btn-sm" onclick="confirmDeleteUser('${u.id}')">
                Delete
              </button>
            ` : '<span style="font-size: 0.75rem; color: var(--slate-400); padding: 4px;">Current</span>'}
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = rows;
}

window.viewUserModal = function(userId) {
  const user = findUserById(userId);
  if (!user) return;

  document.getElementById('modal-user-name').textContent = user.name;
  document.getElementById('modal-user-email').textContent = user.email;
  document.getElementById('modal-user-role').textContent = user.role;
  document.getElementById('modal-user-dept').textContent = user.department || 'N/A';
  document.getElementById('modal-user-institution').textContent = user.institution || 'Apex Institute of Technology';
  document.getElementById('modal-user-interests').textContent = user.interests || 'N/A';
  document.getElementById('modal-user-bio').textContent = user.bio || 'No biography entered.';

  openModal('user-details-modal');
};

window.toggleUserStatus = function(userId) {
  const user = findUserById(userId);
  if (!user) return;

  user.status = user.status === 'Active' ? 'Disabled' : 'Active';
  updateUser(user);
  showToast(`Account status for ${user.name} changed to ${user.status}.`, 'info');
  renderAdminUsersTable();
};

window.confirmDeleteUser = function(userId) {
  const user = findUserById(userId);
  if (!user) return;

  if (confirm(`Are you sure you want to delete user account "${user.name}"?`)) {
    deleteUser(userId);
    showToast('User removed from system.', 'success');
    renderAdminUsersTable();
  }
};

// ==========================================
// 2. PAPER MANAGEMENT
// ==========================================

function renderAdminPapersTable() {
  const container = document.getElementById('admin-papers-table-body');
  if (!container) return;

  const papers = getPapers();
  let rows = '';

  papers.forEach(p => {
    const authorNames = Array.isArray(p.authors) ? p.authors.map(a => a.name).join(', ') : 'Unknown';

    rows += `
      <tr>
        <td>
          <a href="paper-details.html?id=${p.id}" class="text-semibold" style="color: var(--navy-950);">
            ${escapeHtml(p.title)}
          </a>
        </td>
        <td>${escapeHtml(authorNames)}</td>
        <td><span class="badge badge-category">${escapeHtml(p.category)}</span></td>
        <td>${getStatusBadge(p.status)}</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openStatusChangeModal('${p.id}')">
              Status
            </button>
            <a href="paper-details.html?id=${p.id}" class="btn btn-secondary btn-sm">
              View
            </a>
            <button class="btn btn-danger btn-sm" onclick="adminDeletePaper('${p.id}')">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = rows;
}

window.openStatusChangeModal = function(paperId) {
  const paper = getPaperById(paperId);
  if (!paper) return;

  document.getElementById('status-modal-paper-id').value = paper.id;
  document.getElementById('status-modal-paper-title').textContent = paper.title;
  document.getElementById('status-modal-select').value = paper.status;

  openModal('change-status-modal');
};

document.getElementById('form-change-status')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = document.getElementById('status-modal-paper-id').value;
  const newStatus = document.getElementById('status-modal-select').value;
  const paper = getPaperById(id);

  if (paper) {
    paper.status = newStatus;
    updatePaper(paper);
    addActivity(`Administrator manually changed status of "${paper.title}" to ${newStatus}.`, 'admin');
    closeModal('change-status-modal');
    showToast(`Paper status updated to ${newStatus}.`, 'success');
    renderAdminPapersTable();
  }
});

window.adminDeletePaper = function(paperId) {
  if (confirm('Permanently delete this paper from the academic repository?')) {
    deletePaper(paperId);
    showToast('Paper deleted by administrator.', 'success');
    renderAdminPapersTable();
  }
};

// ==========================================
// 3. CATEGORY MANAGEMENT
// ==========================================

function renderAdminCategoriesList() {
  const container = document.getElementById('admin-categories-table-body');
  if (!container) return;

  const categories = getCategories();
  const papers = getPapers();
  let rows = '';

  categories.forEach(c => {
    const paperCount = papers.filter(p => p.category === c.name).length;

    rows += `
      <tr>
        <td class="text-semibold">${escapeHtml(c.name)}</td>
        <td style="color: var(--navy-600); font-size: 0.85rem;">${escapeHtml(c.description || '')}</td>
        <td><strong>${paperCount}</strong> papers</td>
        <td>
          <div style="display: flex; gap: 0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openEditCategoryModal('${c.id}')">Edit</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteCategory('${c.id}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  });

  container.innerHTML = rows;
}

window.openAddCategoryModal = function() {
  editingCategoryId = null;
  document.getElementById('category-modal-title').textContent = 'Add Research Category';
  document.getElementById('category-name-input').value = '';
  document.getElementById('category-desc-input').value = '';
  openModal('category-modal');
};

window.openEditCategoryModal = function(catId) {
  const categories = getCategories();
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  editingCategoryId = catId;
  document.getElementById('category-modal-title').textContent = 'Edit Research Category';
  document.getElementById('category-name-input').value = cat.name;
  document.getElementById('category-desc-input').value = cat.description || '';
  openModal('category-modal');
};

function handleCategoryFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('category-name-input').value.trim();
  const description = document.getElementById('category-desc-input').value.trim();

  if (!name) {
    showToast('Category name is required.', 'error');
    return;
  }

  if (editingCategoryId) {
    updateCategory({ id: editingCategoryId, name, description });
    showToast('Category updated successfully.', 'success');
  } else {
    saveCategory({ name, description, icon: 'folder' });
    showToast('New category created.', 'success');
  }

  closeModal('category-modal');
  renderAdminCategoriesList();
}

window.confirmDeleteCategory = function(catId) {
  const categories = getCategories();
  const cat = categories.find(c => c.id === catId);
  if (!cat) return;

  if (confirm(`Delete category "${cat.name}"? Existing papers will keep their category title.`)) {
    deleteCategory(catId);
    showToast('Category deleted.', 'info');
    renderAdminCategoriesList();
  }
};
