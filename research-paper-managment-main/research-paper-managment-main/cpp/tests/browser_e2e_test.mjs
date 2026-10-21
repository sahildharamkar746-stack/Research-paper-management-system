import { chromium } from 'playwright';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const serverExe = path.resolve(process.argv[2]);
const provisionExe = path.resolve(process.argv[3]);
const webRoot = path.resolve(process.cwd(), '../../');
const temp = mkdtempSync(path.join(tmpdir(), 'rpms-browser-e2e-'));
const dbPath = path.join(temp, 'rpms-e2e.sqlite3');
const apiPort = 18080;
const webPort = 5500;
const apiUrl = 'http://127.0.0.1:' + apiPort;
const webUrl = 'http://127.0.0.1:' + webPort;
let apiProcess, webProcess, browser;

function provision(name, email, role, password) {
  const result = spawnSync(provisionExe, [dbPath, name, email, role], {
    input: password + '\n', encoding: 'utf8', timeout: 15000
  });
  if (result.status !== 0) throw new Error('Provisioning ' + role + ' failed: ' + result.stderr);
}
async function waitFor(url, processRef, label) {
  for (let i = 0; i < 80; i++) {
    if (processRef.exitCode !== null) throw new Error(label + ' exited early.');
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(label + ' did not start in time.');
}
async function login(page, email, password) {
  await page.goto(webUrl + '/login.html');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.locator('#login-btn').click();
  await page.waitForURL('**/dashboard.html', { timeout: 10000 });
}
async function logout(page) {
  await Promise.all([
    page.waitForURL('**/login.html', { timeout: 8000 }),
    page.getByText('Sign Out', { exact: true }).click()
  ]);
}
try {
  provision('Browser Test Faculty', 'faculty-e2e@example.test', 'Faculty', 'faculty-e2e-pass-123');
  provision('Browser Test Admin', 'admin-e2e@example.test', 'Admin', 'admin-e2e-pass-123');
  apiProcess = spawn(serverExe, [dbPath], { env: { ...process.env, RPMS_PORT: String(apiPort) }, stdio: 'ignore' });
  webProcess = spawn('python3', ['-m', 'http.server', String(webPort), '--bind', '127.0.0.1', '--directory', webRoot], { stdio: 'ignore' });
  await waitFor(apiUrl + '/health', apiProcess, 'RPMS API');
  await waitFor(webUrl + '/register.html', webProcess, 'Static frontend');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript({ content: 'window.RPMS_API_BASE_URL = ' + JSON.stringify(apiUrl) + ';' });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  await page.goto(webUrl + '/register.html');
  await page.locator('#reg-name').fill('Browser Test Student');
  await page.locator('#reg-email').fill('student-e2e@example.test');
  await page.locator('#reg-role').selectOption('Student');
  await page.locator('#reg-password').fill('student-e2e-pass-123');
  await page.locator('#reg-confirm-password').fill('student-e2e-pass-123');
  await page.locator('#reg-submit-btn').click();
  await page.waitForURL('**/login.html', { timeout: 10000 });
  await login(page, 'student-e2e@example.test', 'student-e2e-pass-123');

  await page.goto(webUrl + '/add-paper.html');
  await page.waitForFunction(() => window.rpmsDataReady && document.querySelectorAll('#paper-category option').length > 1, null, { timeout: 10000 });
  await page.locator('#paper-title').fill('Browser E2E Research Paper');
  await page.locator('#paper-abstract').fill('This abstract is long enough to pass the validation used by the research paper submission form.');
  await page.locator('#paper-category').selectOption({ label: 'Computer Networks' });
  await page.locator('#paper-year').fill('2026');
  await page.locator('#paper-keywords').fill('testing, networks');
  await page.locator('#paper-journal').fill('E2E Journal');
  await page.locator('#paper-doi').fill('10.5555/e2e.browser');
  await page.locator('#paper-methodology').fill('Automated browser integration test');
  await page.locator('#paper-technologies').fill('C++, SQLite, Playwright');
  await page.locator('.author-entry-row .author-name-input').first().fill('Browser Test Student');
  await page.locator('.author-entry-row .author-email-input').first().fill('student-e2e@example.test');
  await page.locator('#btn-submit-paper').click();
  await page.waitForURL('**/my-papers.html', { timeout: 10000 });
  let response = await fetch(apiUrl + '/api/papers');
  let payload = await response.json();
  if (!payload.papers.some(p => p.title === 'Browser E2E Research Paper')) throw new Error('Submitted paper was not persisted by the C++ API.');

  await logout(page);
  await login(page, 'faculty-e2e@example.test', 'faculty-e2e-pass-123');
  await page.goto(webUrl + '/reviews.html');
  await page.waitForSelector('#review-papers-table-body button', { timeout: 10000 });
  await page.locator('#review-papers-table-body button').first().click();
  if (!await page.locator('#review-modal').isVisible()) {
    const state = await page.evaluate(() => ({
      paperCache: typeof getPapers === 'function' ? getPapers().map(p => ({ id: p.id, title: p.title })) : 'no getPapers',
      selected: typeof selectedReviewPaperId === 'undefined' ? 'undefined' : selectedReviewPaperId,
      modalClass: document.getElementById('review-modal')?.className,
      button: document.querySelector('#review-papers-table-body button')?.outerHTML,
      toasts: [...document.querySelectorAll('.toast-message')].map(x => x.textContent),
      openReviewModalType: typeof window.openReviewModal
    }));
    throw new Error('Review modal did not open. State: ' + JSON.stringify(state) + '; page errors: ' + JSON.stringify(pageErrors));
  }
  await page.locator('#modal-review-status').selectOption('Approved');
  await page.locator('#modal-review-feedback').fill('Browser E2E review passed.');
  await page.locator('#submit-review-form button[type="submit"]').click();
  await page.waitForTimeout(700);
  const facultyToken = await page.evaluate(() => localStorage.getItem('rpms_api_token'));
  const reviewResponse = await fetch(apiUrl + '/api/reviews', { headers: { Authorization: 'Bearer ' + facultyToken } });
  const reviewPayload = await reviewResponse.json();
  if (!reviewPayload.reviews.some(r => r.comments === 'Browser E2E review passed.')) throw new Error('Review was not persisted. API reviews: ' + JSON.stringify(reviewPayload) + '; toasts: ' + await page.locator('.toast-message').allInnerTexts() + '; page errors: ' + JSON.stringify(pageErrors));
  for (let i = 0; i < 20; i++) {
    response = await fetch(apiUrl + '/api/papers');
    payload = await response.json();
    if (payload.papers.some(p => p.title === 'Browser E2E Research Paper' && p.status === 'Approved')) break;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  if (!payload.papers.some(p => p.title === 'Browser E2E Research Paper' && p.status === 'Approved')) throw new Error('Faculty review did not update the paper status. Current API papers: ' + JSON.stringify(payload.papers) + '; API reviews: ' + JSON.stringify(reviewPayload) + '; page errors: ' + JSON.stringify(pageErrors));

  await logout(page);
  await login(page, 'admin-e2e@example.test', 'admin-e2e-pass-123');
  await page.goto(webUrl + '/admin.html');
  await page.waitForFunction(() => window.rpmsDataReady, null, { timeout: 10000 });
  await page.waitForSelector('#admin-users-table-body tr', { timeout: 10000 });
  const userRows = await page.locator('#admin-users-table-body').innerText();
  if (!userRows.includes('student-e2e@example.test') || !userRows.includes('faculty-e2e@example.test')) throw new Error('Admin dashboard did not load server-backed users.');

  console.log('Browser E2E passed: student registration/login, paper submission, faculty review, admin user listing.');
} finally {
  if (browser) await browser.close().catch(() => {});
  for (const proc of [webProcess, apiProcess]) {
    if (proc && proc.exitCode === null) proc.kill('SIGTERM');
  }
  rmSync(temp, { recursive: true, force: true });
}
