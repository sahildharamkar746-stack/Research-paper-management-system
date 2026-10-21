/**
 * Research Paper Management System (RPMS)
 * dashboard.js - Dashboard Metrics, Visual Analytics & Activity Logs
 */

document.addEventListener('DOMContentLoaded', async () => {
  await window.rpmsDataReady;
  // Enforce session check
  const currentUser = requireAuth();
  if (!currentUser) return;

  renderDashboardStats();
  renderDashboardInsights();
  renderAnalyticsCharts();
  renderRecentActivity();
  renderRecentPapersTable();
});

/**
 * Calculates and displays dashboard numeric metric counters.
 */
function renderDashboardStats() {
  const stats = getSystemStats();

  const elTotal = document.getElementById('stat-total-papers');
  const elApproved = document.getElementById('stat-approved-papers');
  const elPending = document.getElementById('stat-pending-papers');
  const elRejected = document.getElementById('stat-rejected-papers');
  const elResearchers = document.getElementById('stat-total-researchers');
  const elCategories = document.getElementById('stat-total-categories');

  if (elTotal) elTotal.textContent = stats.totalPapers;
  if (elApproved) elApproved.textContent = stats.approvedPapers;
  if (elPending) elPending.textContent = stats.pendingPapers + stats.underReviewPapers;
  if (elRejected) elRejected.textContent = stats.rejectedPapers;
  if (elResearchers) elResearchers.textContent = stats.totalResearchers;
  if (elCategories) elCategories.textContent = stats.totalCategories;
}

/**
 * Renders the unique Research Insights section.
 */
function renderDashboardInsights() {
  const container = document.getElementById('insights-grid-container');
  if (!container) return;

  const insights = getResearchInsights();

  container.innerHTML = `
    <div class="insight-card">
      <div class="insight-metric-label">Most Researched Category</div>
      <div class="insight-metric-val">${escapeHtml(insights.topCategory)}</div>
      <div class="insight-subtext">${insights.topCategoryCount} Papers Published</div>
    </div>
    <div class="insight-card">
      <div class="insight-metric-label">Most Active Researcher</div>
      <div class="insight-metric-val">${escapeHtml(insights.topResearcher)}</div>
      <div class="insight-subtext">${insights.topResearcherCount} Research Contributions</div>
    </div>
    <div class="insight-card">
      <div class="insight-metric-label">Publication Acceptance Rate</div>
      <div class="insight-metric-val">${getSystemStats().approvalRate}%</div>
      <div class="insight-subtext">${insights.approvedCount} Approved Out of ${getSystemStats().totalPapers} Total</div>
    </div>
    <div class="insight-card">
      <div class="insight-metric-label">Latest Publication Year</div>
      <div class="insight-metric-val">${insights.latestYear}</div>
      <div class="insight-subtext">${insights.pendingCount} Under Peer Review</div>
    </div>
  `;
}

/**
 * Visualizes analytics using pure HTML5 & CSS bar charts.
 */
function renderAnalyticsCharts() {
  const categoryChartContainer = document.getElementById('category-distribution-chart');
  const statusChartContainer = document.getElementById('status-distribution-chart');
  const papers = getPapers();

  // 1. Category Distribution Bar Chart
  if (categoryChartContainer) {
    const catCounts = {};
    papers.forEach(p => {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
    });

    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const maxCount = sortedCats.length > 0 ? Math.max(...sortedCats.map(c => c[1])) : 1;

    let chartHtml = '';
    sortedCats.slice(0, 6).forEach(([cat, count]) => {
      const percentage = Math.round((count / maxCount) * 100);
      chartHtml += `
        <div class="bar-chart-row">
          <div class="bar-label" title="${escapeHtml(cat)}">${escapeHtml(cat)}</div>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${percentage}%;"></div>
          </div>
          <div class="bar-count">${count}</div>
        </div>
      `;
    });

    categoryChartContainer.innerHTML = chartHtml || '<p class="text-muted text-center">No category data recorded yet.</p>';
  }

  // 2. Status Distribution Overview
  if (statusChartContainer) {
    const stats = getSystemStats();
    const total = stats.totalPapers || 1;

    const approvedPct = Math.round((stats.approvedPapers / total) * 100);
    const reviewPct = Math.round(((stats.pendingPapers + stats.underReviewPapers) / total) * 100);
    const rejectedPct = Math.round((stats.rejectedPapers / total) * 100);

    statusChartContainer.innerHTML = `
      <div style="display: flex; height: 18px; border-radius: var(--radius-full); overflow: hidden; margin-bottom: 1.5rem; background-color: var(--slate-100);">
        <div style="width: ${approvedPct}%; background-color: var(--emerald-500);" title="Approved: ${approvedPct}%"></div>
        <div style="width: ${reviewPct}%; background-color: var(--amber-500);" title="Pending / In Review: ${reviewPct}%"></div>
        <div style="width: ${rejectedPct}%; background-color: var(--rose-500);" title="Rejected: ${rejectedPct}%"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
        <div>
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: var(--emerald-500); margin-right: 4px;"></span>
          <strong>Approved</strong>: ${stats.approvedPapers} (${approvedPct}%)
        </div>
        <div>
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: var(--amber-500); margin-right: 4px;"></span>
          <strong>Review/Pending</strong>: ${stats.pendingPapers + stats.underReviewPapers} (${reviewPct}%)
        </div>
        <div>
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: var(--rose-500); margin-right: 4px;"></span>
          <strong>Rejected</strong>: ${stats.rejectedPapers} (${rejectedPct}%)
        </div>
      </div>
    `;
  }
}

/**
 * Renders the real-time activity feed from LocalStorage.
 */
function renderRecentActivity() {
  const container = document.getElementById('recent-activity-list');
  if (!container) return;

  const activities = getActivities();

  if (activities.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">No recent activity logged.</p>';
    return;
  }

  let html = '';
  activities.slice(0, 6).forEach(act => {
    html += `
      <div class="activity-item">
        <div class="activity-dot"></div>
        <div>
          <div class="activity-text">${escapeHtml(act.text)}</div>
          <div class="activity-time">${escapeHtml(act.timestamp)}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Renders the recent submissions table on the dashboard overview.
 */
function renderRecentPapersTable() {
  const tableBody = document.getElementById('recent-papers-table-body');
  if (!tableBody) return;

  const papers = getPapers();
  const recent = papers.slice(0, 5);

  if (recent.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No research papers available.</td></tr>`;
    return;
  }

  let rows = '';
  recent.forEach(paper => {
    const authors = Array.isArray(paper.authors) 
      ? paper.authors.map(a => a.name).join(', ') 
      : 'Unknown';

    rows += `
      <tr>
        <td>
          <a href="paper-details.html?id=${paper.id}" class="text-semibold" style="color: var(--navy-950);">
            ${escapeHtml(paper.title)}
          </a>
        </td>
        <td>${escapeHtml(authors)}</td>
        <td><span class="badge badge-category">${escapeHtml(paper.category)}</span></td>
        <td>${getStatusBadge(paper.status)}</td>
        <td>
          <a href="paper-details.html?id=${paper.id}" class="btn btn-secondary btn-sm">
            View
          </a>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = rows;
}
