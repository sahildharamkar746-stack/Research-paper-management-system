/**
 * Research Paper Management System (RPMS)
 * main.js - Core UI Utilities, Toasts, Modals, and Helpers
 */

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

/**
 * Creates and displays a toast notification banner.
 * @param {string} message 
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 * @param {number} durationMs - Display time in ms
 */
function showToast(message, type = 'success', durationMs = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type} animate-slide-in`;

  // Select appropriate icon
  let iconSvg = '';
  switch (type) {
    case 'success':
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      break;
    case 'error':
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      break;
    case 'warning':
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      break;
    default:
      iconSvg = '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `
    <div class="toast-content">
      ${iconSvg}
      <span class="toast-message">${escapeHtml(message)}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('animate-fade-out');
    setTimeout(() => toast.remove(), 400);
  }, durationMs);
}

// ==========================================
// MODAL DIALOG CONTROLLER
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
}

// Close modal when user clicks backdrop
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('active');
    document.body.classList.remove('modal-open');
  }
});

// ==========================================
// STRING & HTML ESCAPING
// ==========================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// STATUS BADGES & FORMATTING
// ==========================================

function getStatusBadge(status) {
  const s = status || 'Pending';
  let badgeClass = 'badge-pending';
  let iconSvg = '';

  switch (s) {
    case 'Approved':
      badgeClass = 'badge-approved';
      iconSvg = '<svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
      break;
    case 'Under Review':
      badgeClass = 'badge-review';
      iconSvg = '<svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
      break;
    case 'Rejected':
      badgeClass = 'badge-rejected';
      iconSvg = '<svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      break;
    default:
      badgeClass = 'badge-pending';
      iconSvg = '<svg class="badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>';
  }

  return `<span class="badge ${badgeClass}">${iconSvg}<span>${s}</span></span>`;
}

// ==========================================
// MOBILE SIDEBAR & NAVIGATION TOGGLE
// ==========================================

function initMobileSidebar() {
  const toggleBtn = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.dashboard-sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    });

    if (overlay) {
      overlay.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }
  }

  // Mobile landing navbar menu toggle
  const navToggle = document.getElementById('nav-toggle');
  const navMenu = document.querySelector('.nav-links');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }
}

// ==========================================
// ACTIVE NAVIGATION LINK HIGHLIGHTER
// ==========================================

function highlightActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  
  // Sidebar links
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Landing page nav links
  document.querySelectorAll('.nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
}

// ==========================================
// DOWNLOAD SIMULATION
// ==========================================

function downloadMockPdf(paperTitle, fileName) {
  showToast(`Preparing download for "${paperTitle}"...`, 'info', 2000);
  
  setTimeout(() => {
    // Generate text blob simulating research paper PDF
    const mockContent = `%PDF-1.4
Research Paper Management System (RPMS) - Digital Preservation Copy
Title: ${paperTitle}
File: ${fileName || 'research_paper.pdf'}
Generated: ${new Date().toISOString()}
This is an authentic simulated research PDF document generated directly inside the browser.`;

    const blob = new Blob([mockContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'Research_Paper.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Downloaded: ${fileName || 'Research_Paper.pdf'}`, 'success');
  }, 1200);
}

// Auto init on page load
document.addEventListener('DOMContentLoaded', () => {
  initMobileSidebar();
  highlightActiveNavLink();
});
