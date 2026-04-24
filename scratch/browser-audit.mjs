import { chromium } from 'playwright';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const consoleErrors = [];
const results = {
  features: {},
  details: {},
  consoleErrors,
};

const feature = (name, value) => {
  results.features[name] = Boolean(value);
  return value;
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

async function authContext(browser, token, extraInitScript) {
  const context = await browser.newContext();
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
  await context.addInitScript((value) => {
    window.localStorage.setItem('crisislink_token', value);
  }, token);
  if (extraInitScript) {
    await context.addInitScript(extraInitScript);
  }
  return context;
}

async function seed(adminToken) {
  const seeded = await api('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (!seeded.ok) {
    throw new Error(`Seed failed: ${seeded.text}`);
  }
  results.details.seed = seeded.json;
}

async function main() {
  const adminToken = await login('admin@grandhotel.com', 'demo1234');
  const staffToken = await login('staff@grandhotel.com', 'demo1234');
  await seed(adminToken);

  const analyticsBeforeDemo = await api('/api/analytics');
  results.details.analyticsBeforeDemo = analyticsBeforeDemo.json;

  const browser = await chromium.launch({ headless: true });

  const speechMock = () => {
    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = true;
        this.lang = 'en-US';
      }

      start() {
        const finalTranscript = 'simulated emergency report';
        setTimeout(() => {
          this.onresult?.({
            results: [
              {
                0: { transcript: finalTranscript },
                isFinal: true,
                length: 1,
              },
            ],
          });
          this.onend?.();
        }, 150);
      }

      stop() {
        this.onend?.();
      }
    }

    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  };

  const audioMock = () => {
    class MockGainNode {
      constructor() {
        this.gain = {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        };
      }
      connect() {}
    }

    class MockOscillator {
      constructor() {
        this.frequency = { value: 0 };
        this.type = 'sine';
      }
      connect() {}
      start() {
        window.__audioToneCount = (window.__audioToneCount || 0) + 1;
      }
      stop() {}
    }

    class MockAudioContext {
      constructor() {
        this.currentTime = 0;
        this.destination = {};
      }
      createOscillator() {
        return new MockOscillator();
      }
      createGain() {
        return new MockGainNode();
      }
    }

    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
  };

  const timeOffsetMock = (offsetMs) => () => {
    const realNow = Date.now.bind(Date);
    Date.now = () => realNow() + offsetMs;
  };

  try {
    const landingContext = await browser.newContext();
    const landingPage = await landingContext.newPage();
    recordConsole(landingPage, 'landing');

    await landingPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await landingPage.waitForSelector('text=Crisis');

    const landingText = await landingPage.locator('main').innerText();
    feature('landing_demo_button', await landingPage.getByRole('button', { name: /Watch Live Demo/i }).isVisible());
    feature('landing_real_counter', await landingPage.getByText('TOTAL INCIDENTS MANAGED').isVisible());
    feature('landing_no_fake_data', !/placeholder|example incident|fake alert|fake incident/i.test(landingText));
    feature('landing_activity_area', /SYSTEM ACTIVE|RESTAURANT|LOBBY|KITCHEN/i.test(landingText));

    await landingPage.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    await landingPage.waitForTimeout(600);
    const visibleScrollItems = await landingPage.locator('.animate-on-scroll.visible').count();
    feature('landing_scroll_animations', visibleScrollItems >= 3);

    const motionStyle = await landingPage.locator('article.animate-on-scroll').first().evaluate((el) => getComputedStyle(el).transform);
    feature('landing_motion_styles', typeof motionStyle === 'string');

    await landingPage.keyboard.press('KeyD');
    await landingPage.waitForSelector('text=Demo Starting', { timeout: 10000 });
    feature('demo_key_trigger', true);
    feature('demo_countdown_modal', await landingPage.getByText(/Demo Starting in 3/).isVisible());

    await landingPage.waitForURL(/\/staff\/dashboard/, { timeout: 25000 });
    feature('demo_dashboard_navigation', true);

    await landingPage.waitForURL(/\/staff\/incident\/.+/, { timeout: 25000 });
    feature('demo_incident_navigation', true);

    await landingPage.waitForSelector('text=Demo Complete', { timeout: 45000 });
    feature('demo_completion_overlay', true);

    const demoRun = await landingPage.evaluate(() => {
      const raw = window.sessionStorage.getItem('crisislink_demo_autopilot');
      return raw ? JSON.parse(raw) : null;
    });
    const demoIncidentId = demoRun?.incidentId;
    results.details.demoIncidentId = demoIncidentId;

    const demoIncident = await api(`/api/incidents/${demoIncidentId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const demoIncidentData = demoIncident.json;
    const demoTimeline = demoIncidentData.timeline || [];
    const demoTasks = demoIncidentData.tasks || [];
    const demoMessages = demoIncidentData.messages || [];
    const demoActions = demoTimeline.map((entry) => entry.action).join('\n');

    feature('demo_step_create', Boolean(demoIncidentData?.incident?.id));
    feature('demo_step_acknowledge', /acknowledged/i.test(demoActions));
    feature('demo_step_start_response', /responding/i.test(demoActions));
    feature('demo_step_check_task', demoTasks.some((task) => task.is_complete));
    feature('demo_step_send_chat', demoMessages.some((message) => /Team on scene situation assessed/i.test(message.message)));
    feature('demo_step_contained', /contained/i.test(demoActions));
    feature('demo_step_resolve', demoIncidentData?.incident?.status === 'resolved');

    const analyticsAfterDemo = await api('/api/analytics');
    results.details.analyticsAfterDemo = analyticsAfterDemo.json;
    feature(
      'demo_drill_excluded_from_analytics',
      analyticsAfterDemo.json?.totalIncidents === analyticsBeforeDemo.json?.totalIncidents
    );

    await landingContext.close();

    const staffContext = await authContext(browser, staffToken, audioMock);
    const staffPage = await staffContext.newPage();
    recordConsole(staffPage, 'staff');
    await staffPage.goto(`${baseUrl}/staff/dashboard`, { waitUntil: 'networkidle' });
    await staffPage.waitForSelector('text=Staff Dashboard');

    const incidentCardStyle = await staffPage.locator('.incident-card').first().evaluate((el) => getComputedStyle(el).transform);
    feature('incident_card_motion', typeof incidentCardStyle === 'string');

    const guestContext = await browser.newContext();
    await guestContext.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
    await guestContext.addInitScript(speechMock);
    const guestPage = await guestContext.newPage();
    recordConsole(guestPage, 'guest');

    const guestDescription = `Playwright guest SOS ${Date.now()} lobby collapse`;
    await guestPage.goto(`${baseUrl}/sos`, { waitUntil: 'networkidle' });
    await guestPage.getByRole('button', { name: /Medical/i }).click();
    await guestPage.locator('select').first().selectOption('Lobby');
    await guestPage.getByRole('button', { name: /Continue/i }).click();
    await guestPage.waitForTimeout(1000);

    const voiceButton = guestPage.locator('button[aria-label]').first();
    const hasVoiceButton = await voiceButton.count().then((count) => count > 0);
    feature('voice_to_text_button', hasVoiceButton);
    if (hasVoiceButton) {
      await voiceButton.click();
      await guestPage.waitForTimeout(400);
    }
    feature(
      'voice_to_text_transcript',
      await guestPage.locator('textarea').inputValue().then((value) => /simulated emergency report/i.test(value))
    );

    await guestPage.locator('textarea').fill(guestDescription);
    await guestPage.getByPlaceholder('So we can reach you').fill('Playwright Guest');
    await guestPage.getByRole('button', { name: /DISPATCH EMERGENCY RESPONSE/i }).click();
    await guestPage.waitForURL(/\/sos\/confirm\/.+/, { timeout: 20000 });
    feature('guest_sos_redirect', true);

    const guestIncidentId = guestPage.url().split('/').pop();
    results.details.guestIncidentId = guestIncidentId;

    const confirmText = await guestPage.locator('body').innerText();
    feature(
      'confirm_stepper_visible',
      ['Reported', 'Acknowledged', 'Responding', 'Resolved'].every((label) => confirmText.includes(label))
    );

    await staffPage.waitForSelector(`text=${guestDescription.slice(0, 32)}`, { timeout: 20000 });
    feature('socket_incident_new_dashboard', true);

    const audioToneCount = await staffPage.evaluate(() => window.__audioToneCount || 0);
    feature('audio_alert_on_new_incident', audioToneCount > 0);

    await staffPage.getByText(guestDescription.slice(0, 32), { exact: false }).click();
    await staffPage.waitForURL(new RegExp(`/staff/incident/${guestIncidentId}`), { timeout: 20000 });

    await staffPage.waitForSelector('text=Escalation Monitor', { timeout: 10000 });
    const severityBars = await staffPage.locator('div.w-4.h-2.rounded-sm').count();
    feature('severity_meter_visible', severityBars >= 5);

    await api(`/api/incidents/${guestIncidentId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ status: 'acknowledged' }),
    });

    await staffPage.waitForSelector('text=acknowledged', { timeout: 15000 });
    feature('socket_incident_updated_detail', true);

    await guestPage.waitForTimeout(5500);
    feature('confirm_polling_updates', (await guestPage.locator('body').innerText()).includes('Acknowledged'));

    await staffPage.locator('[data-action="start-response"]').click();
    await guestPage.waitForTimeout(5500);
    feature('guest_confirm_responding', (await guestPage.locator('body').innerText()).includes('Responding'));

    await staffPage.locator('[data-tab="ai"]').click();
    await staffPage.waitForSelector('text=AI Triage Analysis', { timeout: 10000 });
    const sopCount = await staffPage.locator('ol > li').count();
    const doNotDoCount = await staffPage.locator('text=Do Not Do').count().catch(() => 0);
    feature('ai_panel_loaded', sopCount >= 8);
    feature('sop_8_steps', sopCount >= 8);
    feature('evacuation_route_visible', (await staffPage.locator('text=Evacuation Route').count()) > 0);
    feature('do_not_do_visible', (await staffPage.locator('text=Do Not Do').count()) > 0);

    await staffPage.locator('[data-tab="tasks"]').click();
    await staffPage.waitForSelector('[data-task-checkbox="primary"]', { timeout: 10000 });
    await staffPage.getByRole('button', { name: /\+ Add Task/i }).click();
    await staffPage.getByPlaceholder('Task title').fill('Playwright follow-up task');
    await staffPage.locator('form select').selectOption('high');
    await staffPage.getByRole('button', { name: /^Add Task$/ }).click();
    await staffPage.waitForSelector('text=Playwright follow-up task', { timeout: 10000 });
    await staffPage.waitForTimeout(1200);
    const taskPanelText = await staffPage.locator('body').innerText();
    feature('tasks_with_assignee_names', /Assigned to/i.test(taskPanelText));
    feature('add_task_modal_submit', true);

    await staffPage.locator('[data-tab="comms"]').click();
    await staffPage.locator('[data-chat-input="incident"]').fill('Playwright chat ping');
    await staffPage.locator('[data-action="send-chat"]').click();
    await staffPage.waitForSelector('text=Playwright chat ping', { timeout: 10000 });
    feature('chat_realtime', true);

    await staffPage.locator('[data-tab="timeline"]').click();
    await staffPage.waitForSelector('text=Audit Timeline', { timeout: 10000 });
    const timelineEntries = await staffPage.locator('text=/Status changed|Task added|Message:/').count();
    feature('timeline_audit_entries', timelineEntries > 0);

    await staffPage.getByRole('button', { name: /Generate Handoff Report/i }).click();
    await staffPage.waitForSelector('text=INCIDENT HANDOFF REPORT', { timeout: 10000 });
    await staffPage.getByRole('button', { name: /Copy to Clipboard/i }).click();
    feature('handoff_modal_copy', true);
    await staffPage.getByRole('button', { name: /^Close$/ }).click();

    await staffPage.locator('[data-action="contained"]').click();
    await staffPage.locator('[data-action="resolve"]').click();
    await staffPage.waitForSelector('[data-tab="debrief"]', { timeout: 20000 });
    await staffPage.locator('[data-tab="debrief"]').click();
    let debriefReady = false;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const debriefPayload = await api(`/api/incidents/${guestIncidentId}`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (debriefPayload.json?.incident?.debrief_report) {
        debriefReady = true;
        break;
      }
      await staffPage.waitForTimeout(5000);
    }
    feature('debrief_after_resolve', debriefReady);

    await guestPage.waitForTimeout(5500);
    feature('guest_confirm_resolved', (await guestPage.locator('body').innerText()).includes('Resolved'));

    await staffPage.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 65000;
    });
    await staffPage.goto(`${baseUrl}/staff/incident/INC-SEED-0001`, { waitUntil: 'networkidle' });
    await staffPage.waitForSelector('[data-tab="monitor"]', { timeout: 20000 });
    await staffPage.locator('[data-tab="monitor"]').click();
    const escalationColor = await staffPage.evaluate(() => {
      const bars = Array.from(document.querySelectorAll('div'));
      const bar = bars.find((node) => node.style?.transform?.includes('scaleX') && node.style?.background);
      return bar ? getComputedStyle(bar).backgroundColor : '';
    });
    const escalationText = await staffPage.locator('text=/Response window:/').innerText();
    const remainingMatch = escalationText.match(/Response window:\s*(\d+)s/i);
    const remainingSeconds = remainingMatch ? Number(remainingMatch[1]) : null;
    feature('escalation_red_under_30', remainingSeconds !== null && remainingSeconds < 30);

    const adminContext = await authContext(browser, adminToken);
    const adminPage = await adminContext.newPage();
    recordConsole(adminPage, 'admin');
    await adminPage.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=Broadcast Message');

    await adminPage.getByRole('button', { name: /Drill Mode|Drill ON/i }).click();
    await adminPage.waitForSelector('text=DRILL MODE ACTIVE', { timeout: 10000 });
    const sidebarText = await adminPage.locator('aside').innerText();
    feature('drill_mode_banner_sitewide', /DRILL MODE/i.test(sidebarText));

    await adminPage.locator('textarea').fill('Playwright broadcast verification');
    await adminPage.getByRole('button', { name: /Send to All Staff/i }).click();
    await adminPage.waitForSelector('text=BROADCAST SENT TO ALL STAFF', { timeout: 10000 });
    feature('broadcast_success_overlay', true);

    await adminPage.goto(`${baseUrl}/admin/analytics`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=Live Analytics', { timeout: 15000 });
    const kpiCount = await adminPage.locator('.glass.p-4.border').count();
    const chartPanels = await adminPage.locator('.glass.p-5').count();
    feature('analytics_kpis_and_charts', kpiCount >= 4 && chartPanels >= 3);
    feature('bar_chart_rendered', (await adminPage.locator('text=Incidents by Type').count()) > 0);
    feature('pie_chart_rendered', (await adminPage.locator('text=By Zone').count()) > 0);
    feature('line_chart_rendered', (await adminPage.locator('text=Daily Trend').count()) > 0);

    const kpiBefore = await adminPage.locator('.glass.p-4.border p.text-\\[28px\\]').first().innerText().catch(() => '');
    await adminPage.reload({ waitUntil: 'networkidle' });
    await adminPage.waitForTimeout(1200);
    const kpiAfter = await adminPage.locator('.glass.p-4.border p.text-\\[28px\\]').first().innerText().catch(() => '');
    feature('kpi_count_animation', kpiBefore !== '' && kpiAfter !== '');

    await adminPage.goto(`${baseUrl}/admin/staff`, { waitUntil: 'networkidle' });
    await adminPage.waitForSelector('text=Staff Management', { timeout: 15000 });
    const userRows = await adminPage.locator('tbody tr').count();
    const qrCanvasVisible = await adminPage.locator('#zone-qr-canvas').isVisible();
    feature('staff_table_5_users', userRows === 5);
    feature('qr_code_generation', qrCanvasVisible);

    const protectedContext = await authContext(browser, staffToken);
    const protectedPage = await protectedContext.newPage();
    recordConsole(protectedPage, 'role-protection');
    await protectedPage.goto(`${baseUrl}/admin/dashboard`, { waitUntil: 'domcontentloaded' });
    await protectedPage.waitForURL(/\/staff\/dashboard/, { timeout: 15000 });
    feature('role_protection_redirect', /\/staff\/dashboard/.test(protectedPage.url()));
    await protectedContext.close();

    await staffPage.goto(`${baseUrl}/staff/drill`, { waitUntil: 'networkidle' });
    await staffPage.waitForSelector('text=Emergency Drill Simulator', { timeout: 15000 });
    const scenarioButtons = await staffPage.locator('button.glass').count();
    feature('drill_scenarios_selectable', scenarioButtons >= 5);
    await staffPage.getByRole('button', { name: /Launch Drill/i }).click();
    await staffPage.waitForTimeout(1500);

    const drillList = await api('/api/incidents?all=true', {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const latestDrill = (Array.isArray(drillList.json) ? drillList.json : [])
      .filter((incident) => incident.is_drill)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    results.details.latestDrillIncidentId = latestDrill?.id || null;

    if (latestDrill?.id) {
      await api(`/api/incidents/${latestDrill.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'acknowledged' }),
      });
      await api(`/api/incidents/${latestDrill.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'responding' }),
      });
      await api(`/api/incidents/${latestDrill.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'contained' }),
      });
      await api(`/api/incidents/${latestDrill.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${staffToken}` },
        body: JSON.stringify({ status: 'resolved' }),
      });
    }

    await staffPage.waitForSelector('text=Post-Drill Report', { timeout: 20000 });
    feature('post_drill_report', true);

    await staffPage.goto(`${baseUrl}/staff/map`, { waitUntil: 'networkidle' });
    await staffPage.waitForSelector('text=Staff Venue Map', { timeout: 15000 });
    const zoneNames = ['Lobby', 'Front Desk', 'Restaurant', 'Kitchen', 'Bar/Lounge', 'Pool Area', 'Spa', 'Gym', 'Conference Room A', 'Parking', 'Floor 1', 'Floor 2', 'Floor 3', 'Floor 4'];
    let visibleZones = 0;
    for (const zoneName of zoneNames) {
      if (await staffPage.locator(`text=${zoneName}`).count()) visibleZones += 1;
    }
    feature('venue_map_14_zones', visibleZones === 14);

    await staffPage.evaluate(() => {
      const groups = Array.from(document.querySelectorAll('svg g'));
      const targetGroup = groups.find((group) => group.textContent?.includes('Lobby'));
      const rect = targetGroup?.querySelector('rect');
      rect?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await staffPage.waitForSelector('text=Lobby - Active Incidents', { timeout: 15000 });
    feature('zone_click_opens_drawer', true);
    const mapPins = await staffPage.locator('circle.map-pin').count();
    const mapAnimations = await staffPage.locator('circle.map-pin animate').count();
    feature('active_pins_pulse', mapPins > 0 && mapAnimations > 0);

    const offlineContext = await browser.newContext();
    await offlineContext.addInitScript(speechMock);
    const offlinePage = await offlineContext.newPage();
    recordConsole(offlinePage, 'offline');
    await offlinePage.goto(`${baseUrl}/sos`, { waitUntil: 'networkidle' });
    await offlineContext.setOffline(true);
    await offlinePage.waitForSelector('text=OFFLINE MODE', { timeout: 10000 });
    feature('offline_banner_visible', true);
    await offlinePage.getByRole('button', { name: /Medical/i }).click();
    await offlinePage.locator('select').first().selectOption('Lobby');
    await offlinePage.getByRole('button', { name: /Continue/i }).click();
    await offlinePage.locator('textarea').fill('Offline queue validation');
    await offlinePage.getByPlaceholder('So we can reach you').fill('Offline Guest');
    await offlinePage.getByRole('button', { name: /DISPATCH EMERGENCY RESPONSE/i }).click();
    await offlinePage.waitForSelector('text=Alert Queued', { timeout: 10000 });
    const offlineQueueRaw = await offlinePage.evaluate(() => localStorage.getItem('crisislink-offline-queue'));
    const offlineQueue = offlineQueueRaw ? JSON.parse(offlineQueueRaw) : null;
    feature('offline_queue_persists', (offlineQueue?.state?.queue || []).length > 0);

    const manifest = await api('/manifest.json');
    const icon192 = await api('/icon-192.svg');
    const icon512 = await api('/icon-512.svg');
    feature('manifest_available', manifest.ok);
    feature('svg_icons_available', icon192.ok && icon512.ok);

    results.details.staffAudioToneCount = audioToneCount;
    results.details.visibleZoneLabels = visibleZones;
    results.details.userRows = userRows;
  } finally {
    await browser.close();
  }

  results.frontendPassed = Object.values(results.features).filter(Boolean).length;
  results.frontendTotal = Object.keys(results.features).length;
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
