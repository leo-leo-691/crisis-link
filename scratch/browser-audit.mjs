import { chromium } from 'playwright';

const baseUrl = 'http://localhost:3000';
const consoleErrors = [];
const results = {
  landing: {},
  demo: {},
  guestFlow: {},
  admin: {},
  roleProtection: {},
  consoleErrors,
};

function recordConsole(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[${label}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`[${label}] ${err.message}`);
  });
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: response.status, ok: response.ok, json, text };
}

async function login(email, password) {
  const response = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok || !response.json?.token) {
    throw new Error(`Login failed for ${email}: ${response.text}`);
  }
  return response.json.token;
}

async function authContext(browser, token) {
  const context = await browser.newContext();
  await context.addInitScript((value) => {
    window.localStorage.setItem('crisislink_token', value);
  }, token);
  return context;
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const seed = await api('/api/seed', { method: 'POST' });
  results.seed = { status: seed.status, body: seed.json };

  const analyticsBeforeDemo = await api('/api/analytics');
  results.demo.analyticsBefore = analyticsBeforeDemo.json;

  const browser = await chromium.launch({ headless: true });

  try {
    const landingContext = await browser.newContext();
    const landingPage = await landingContext.newPage();
    recordConsole(landingPage, 'landing');

    await landingPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await landingPage.waitForSelector('text=Crisis');
    const landingText = await landingPage.locator('main').innerText();
    results.landing.demoButtonVisible = await landingPage.getByRole('button', { name: /Watch Live Demo/i }).isVisible();
    results.landing.counterLabelVisible = await landingPage.getByText('Real incidents from live analytics').isVisible();
    results.landing.usesFallbackTicker = landingText.includes('SYSTEM ACTIVE · ALL CLEAR · MONITORING 14 ZONES · AI TRIAGE READY');
    results.landing.hasPlaceholderExamples = /example|placeholder/i.test(landingText);

    await landingPage.keyboard.press('KeyD');
    await landingPage.waitForSelector('text=Demo Starting', { timeout: 10000 });
    await landingPage.waitForSelector('text=3', { timeout: 10000 });
    results.demo.countdownVisible = true;

    await landingPage.waitForURL(/\/staff\/dashboard/, { timeout: 25000 });
    results.demo.reachedDashboard = true;

    await landingPage.waitForURL(/\/staff\/incident\/.+/, { timeout: 25000 });
    results.demo.incidentUrl = landingPage.url();

    await landingPage.waitForSelector('text=Demo Complete', { timeout: 45000 });
    results.demo.overlayVisible = true;
    const demoRun = await landingPage.evaluate(() => {
      const raw = window.sessionStorage.getItem('crisislink_demo_autopilot');
      return raw ? JSON.parse(raw) : null;
    });
    results.demo.run = demoRun;
    const demoIncidentId = demoRun?.incidentId;
    expect(!!demoIncidentId, 'Demo incident id was not captured');

    const demoIncident = await api(`/api/incidents/${demoIncidentId}`);
    results.demo.incidentAfter = demoIncident.json?.incident;
    expect(demoIncident.json?.incident?.status === 'resolved', 'Demo incident did not resolve');

    const analyticsAfterDemo = await api('/api/analytics');
    results.demo.analyticsAfter = analyticsAfterDemo.json;
    expect(
      analyticsAfterDemo.json?.totalIncidents === analyticsBeforeDemo.json?.totalIncidents,
      'Drill incident leaked into analytics totals'
    );

    await landingContext.close();

    const staffToken = await login('staff@grandhotel.com', 'demo1234');
    const staffContext = await authContext(browser, staffToken);
    const staffPage = await staffContext.newPage();
    recordConsole(staffPage, 'staff');
    await staffPage.goto(`${baseUrl}/staff/dashboard`, { waitUntil: 'networkidle' });
    await staffPage.waitForSelector('text=Staff Dashboard');
    results.guestFlow.dashboardLoaded = true;

    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    recordConsole(guestPage, 'guest');
    const guestDescription = `Playwright guest SOS ${Date.now()} lobby collapse`;
    results.guestFlow.description = guestDescription;

    await guestPage.goto(`${baseUrl}/sos`, { waitUntil: 'networkidle' });
    await guestPage.getByRole('button', { name: /Medical/i }).click();
    await guestPage.locator('select').first().selectOption('Lobby');
    await guestPage.getByRole('button', { name: /Continue/i }).click();
    await guestPage.locator('textarea').fill(guestDescription);
    await guestPage.getByPlaceholder('So we can reach you').fill('Playwright Guest');
    await guestPage.getByRole('button', { name: /DISPATCH EMERGENCY RESPONSE/i }).click();
    await guestPage.waitForURL(/\/sos\/confirm\/.+/, { timeout: 20000 });
    const guestIncidentId = guestPage.url().split('/').pop();
    results.guestFlow.incidentId = guestIncidentId;
    results.guestFlow.redirectedToConfirm = true;

    await staffPage.waitForSelector(`text=${guestDescription.slice(0, 45)}`, { timeout: 20000 });
    results.guestFlow.socketNewVisible = true;
    await staffPage.getByText(guestDescription.slice(0, 45), { exact: false }).click();
    await staffPage.waitForURL(new RegExp(`/staff/incident/${guestIncidentId}`), { timeout: 20000 });

    await staffPage.waitForSelector('text=Escalation Monitor', { timeout: 10000 });
    results.guestFlow.escalationVisible = true;
    await staffPage.locator('[data-action="acknowledge"]').click();
    await guestPage.waitForTimeout(6500);
    results.guestFlow.confirmAcknowledged = (await guestPage.locator('body').textContent()).includes('Acknowledged');

    await staffPage.locator('[data-action="start-response"]').click();
    await guestPage.waitForTimeout(6500);
    results.guestFlow.confirmResponding = (await guestPage.locator('body').textContent()).includes('Responding');

    await staffPage.locator('[data-tab="ai"]').click();
    await staffPage.waitForSelector('text=Do Not Do', { timeout: 10000 });
    results.guestFlow.aiPanelVisible = true;
    results.guestFlow.sopCount = await staffPage.locator('ol > li').count();
    results.guestFlow.evacuationVisible = await staffPage.locator('text=Evacuation Route').count();
    results.guestFlow.doNotDoVisible = await staffPage.locator('text=Do Not Do').count();

    await staffPage.locator('[data-tab="tasks"]').click();
    await staffPage.waitForSelector('[data-task-checkbox="primary"]', { timeout: 10000 });
    results.guestFlow.tasksVisible = true;
    await staffPage.getByRole('button', { name: /\+ Add Task/i }).click();
    await staffPage.getByPlaceholder('Task title').fill('Playwright follow-up task');
    await staffPage.locator('form select').selectOption('high');
    await staffPage.getByRole('button', { name: /^Add Task$/ }).click();
    await staffPage.waitForSelector('text=Playwright follow-up task', { timeout: 10000 });
    results.guestFlow.taskAddWorks = true;

    await staffPage.locator('[data-tab="comms"]').click();
    await staffPage.locator('[data-chat-input="incident"]').fill('Playwright chat ping');
    await staffPage.locator('[data-action="send-chat"]').click();
    await staffPage.waitForSelector('text=Playwright chat ping', { timeout: 10000 });
    results.guestFlow.chatWorks = true;

    await staffPage.locator('[data-tab="timeline"]').click();
    await staffPage.waitForSelector('text=Audit Timeline', { timeout: 10000 });
    results.guestFlow.timelineVisible = true;

    await staffPage.getByRole('button', { name: /Generate Handoff Report/i }).click();
    await staffPage.waitForSelector('text=INCIDENT HANDOFF REPORT', { timeout: 10000 });
    results.guestFlow.handoffModalVisible = true;
    await staffPage.getByRole('button', { name: /^Close$/ }).click();

    await staffPage.locator('[data-action="contained"]').click();
    await staffPage.locator('[data-action="resolve"]').click();
    await staffPage.waitForSelector('[data-tab="debrief"]', { timeout: 15000 });
    await staffPage.locator('[data-tab="debrief"]').click();
    await staffPage.waitForSelector('text=Executive Summary', { timeout: 30000 });
    results.guestFlow.debriefVisible = true;

    await guestPage.waitForTimeout(6500);
    results.guestFlow.confirmResolved = (await guestPage.locator('body').textContent()).includes('Resolved');

    const adminToken = await login('admin@grandhotel.com', 'demo1234');
    const adminContext = await authContext(browser, adminToken);
    const adminPage = await adminContext.newPage();
    recordConsole(adminPage, 'admin');
    await adminPage.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=Broadcast Message');
    results.admin.dashboardLoaded = true;

    await adminPage.getByRole('button', { name: /Drill Mode|Drill ON/i }).click();
    await adminPage.waitForSelector('text=DRILL MODE ACTIVE', { timeout: 10000 });
    results.admin.drillBannerVisible = true;

    await adminPage.locator('textarea').fill('Playwright broadcast verification');
    await adminPage.getByRole('button', { name: /Send to All Staff/i }).click();
    await adminPage.waitForSelector('text=BROADCAST SENT TO ALL STAFF', { timeout: 10000 });
    results.admin.broadcastOverlayVisible = true;

    await adminPage.goto(`${baseUrl}/admin/analytics`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=Live Analytics', { timeout: 15000 });
    results.admin.analyticsChartsSvgCount = await adminPage.locator('svg').count();

    await adminPage.goto(`${baseUrl}/qr`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=QR Code Manager', { timeout: 15000 });
    results.admin.qrImageCount = await adminPage.locator('img[alt^="QR for"]').count();

    const protectedContext = await authContext(browser, staffToken);
    const protectedPage = await protectedContext.newPage();
    recordConsole(protectedPage, 'role-protection');
    await protectedPage.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await protectedPage.waitForURL(/\/staff\/dashboard/, { timeout: 15000 });
    results.roleProtection.redirectedUrl = protectedPage.url();

    const manifest = await api('/manifest.json');
    results.manifest = { status: manifest.status, bodyStart: String(manifest.text).slice(0, 80) };

    console.log(JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
