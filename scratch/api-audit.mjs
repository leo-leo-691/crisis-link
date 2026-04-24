import { io } from 'socket.io-client';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

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
  return api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

function waitForEvent(socket, eventName, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    socket.once(eventName, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

async function main() {
  const results = { endpoints: {}, sockets: {}, details: {} };
  const setResult = (name, pass, details = {}) => {
    results.endpoints[name] = { pass, ...details };
  };
  const setSocketResult = (name, pass, details = {}) => {
    results.sockets[name] = { pass, ...details };
  };

  const adminLogin = await login('admin@grandhotel.com', 'demo1234');
  const frontdeskLogin = await login('frontdesk@grandhotel.com', 'demo1234');

  setResult('POST /api/auth/login (admin)', adminLogin.ok && !!adminLogin.json?.token, { status: adminLogin.status });
  setResult('POST /api/auth/login (frontdesk)', frontdeskLogin.ok && !!frontdeskLogin.json?.token, { status: frontdeskLogin.status });

  if (!adminLogin.ok || !frontdeskLogin.ok) {
    throw new Error('Required login failed');
  }

  const adminToken = adminLogin.json.token;
  const frontdeskToken = frontdeskLogin.json.token;

  const seed = await api('/api/seed', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  results.details.seed = seed.json;

  const socket = io(baseUrl, {
    transports: ['websocket', 'polling'],
    auth: { token: adminToken },
  });

  try {
    const health = await api('/api/health');
    setResult('GET /api/health', health.ok && health.json?.status === 'ok' && health.json?.database === 'connected' && health.json?.provider === 'supabase', { status: health.status });

    const me = await api('/api/auth/me', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setResult('GET /api/auth/me', me.ok && !!me.json?.id && !!me.json?.email && !!me.json?.name && !!me.json?.role, { status: me.status });

    const incidents = await api('/api/incidents', {
      headers: { Authorization: `Bearer ${frontdeskToken}` },
    });
    setResult('GET /api/incidents', incidents.ok && Array.isArray(incidents.json) && incidents.json.length >= 3, { status: incidents.status, count: Array.isArray(incidents.json) ? incidents.json.length : 0 });

    const incidentsNoDrill = await api('/api/incidents?is_drill=false', {
      headers: { Authorization: `Bearer ${frontdeskToken}` },
    });
    const noDrillValid = incidentsNoDrill.ok && Array.isArray(incidentsNoDrill.json) && incidentsNoDrill.json.every((incident) => !incident.is_drill);
    setResult('GET /api/incidents?is_drill=false', noDrillValid, { status: incidentsNoDrill.status, count: Array.isArray(incidentsNoDrill.json) ? incidentsNoDrill.json.length : 0 });

    const incidentNewPromise = waitForEvent(socket, 'incident:new');
    const createIncident = await api('/api/incidents', {
      method: 'POST',
      headers: { Authorization: `Bearer ${frontdeskToken}` },
      body: JSON.stringify({
        type: 'medical',
        zone: 'Restaurant',
        reporter_name: 'API Audit',
        description: 'API audit drill incident',
        reporter_type: 'staff',
        is_drill: true,
      }),
    });
    const createdIncident = createIncident.json?.incident;
    const incidentNewEvent = await incidentNewPromise;
    setResult('POST /api/incidents', createIncident.status === 201 && !!createdIncident?.id, { status: createIncident.status, incidentId: createdIncident?.id });

    const incidentDetail = await api(`/api/incidents/${createdIncident.id}`, {
      headers: { Authorization: `Bearer ${frontdeskToken}` },
    });
    setResult(
      'GET /api/incidents/[id]',
      incidentDetail.ok && !!incidentDetail.json?.incident && Array.isArray(incidentDetail.json?.tasks) && Array.isArray(incidentDetail.json?.messages) && Array.isArray(incidentDetail.json?.timeline),
      { status: incidentDetail.status }
    );

    const statusEventPromise = waitForEvent(socket, 'incident:updated');
    const patchStatus = await api(`/api/incidents/${createdIncident.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${frontdeskToken}` },
      body: JSON.stringify({ status: 'acknowledged' }),
    });
    const updatedEvent = await statusEventPromise;
    setResult('PATCH /api/incidents/[id]/status', patchStatus.ok && patchStatus.json?.status === 'acknowledged' && updatedEvent?.id === createdIncident.id, { status: patchStatus.status });

    const createTask = await api(`/api/incidents/${createdIncident.id}/tasks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${frontdeskToken}` },
      body: JSON.stringify({ title: 'API audit task', priority: 'high', assigned_to: frontdeskLogin.json.user.id }),
    });
    const task = createTask.json;
    setResult('POST /api/incidents/[id]/tasks', createTask.status === 201 && !!task?.id, { status: createTask.status, taskId: task?.id });

    const toggleTask = await api(`/api/incidents/${createdIncident.id}/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${frontdeskToken}` },
    });
    setResult('PATCH /api/incidents/[id]/tasks/[taskId]', toggleTask.ok && toggleTask.json?.is_complete === true, { status: toggleTask.status });

    socket.emit('join:incident', createdIncident.id);
    const messageEventPromise = waitForEvent(socket, 'incident:message');
    const createMessage = await api(`/api/incidents/${createdIncident.id}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${frontdeskToken}` },
      body: JSON.stringify({ message: 'API audit chat message', sender_name: 'API Audit' }),
    });
    const messageEvent = await messageEventPromise;
    setResult('POST /api/incidents/[id]/messages', createMessage.status === 201 && !!createMessage.json?.id && messageEvent?.message === 'API audit chat message', { status: createMessage.status });

    const users = await api('/api/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setResult('GET /api/users', users.ok && Array.isArray(users.json) && users.json.length === 5, { status: users.status, count: Array.isArray(users.json) ? users.json.length : 0 });

    const tempEmail = `apitest-${Date.now()}@grandhotel.com`;
    const createUser = await api('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        email: tempEmail,
        password: 'demo1234',
        name: 'API Temp User',
        role: 'staff',
        zone_assignment: 'Lobby',
      }),
    });
    setResult('POST /api/users', createUser.status === 201 && !!createUser.json?.user?.id, { status: createUser.status });

    const zones = await api('/api/zones', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const zonesValid = zones.ok && Array.isArray(zones.json) && zones.json.length === 14
      && zones.json.every((zone) => typeof zone.map_x === 'number' && typeof zone.map_y === 'number' && typeof zone.map_width === 'number' && typeof zone.map_height === 'number');
    setResult('GET /api/zones', zonesValid, { status: zones.status, count: Array.isArray(zones.json) ? zones.json.length : 0 });

    const analytics = await api('/api/analytics', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const analyticsValid = analytics.ok
      && typeof analytics.json?.totalIncidents === 'number'
      && typeof analytics.json?.activeIncidents === 'number'
      && typeof analytics.json?.resolvedIncidents === 'number'
      && typeof analytics.json?.avgResolutionMinutes === 'number'
      && Array.isArray(analytics.json?.byType)
      && Array.isArray(analytics.json?.byZone)
      && Array.isArray(analytics.json?.dailyCounts);
    setResult('GET /api/analytics', analyticsValid, { status: analytics.status });

    const broadcastPromise = waitForEvent(socket, 'broadcast');
    const broadcast = await api('/api/broadcast', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ message: 'API audit broadcast' }),
    });
    const broadcastEvent = await broadcastPromise;
    setResult('POST /api/broadcast', broadcast.status === 201 && broadcast.json?.success === true && broadcastEvent?.message === 'API audit broadcast', { status: broadcast.status });

    setSocketResult('incident:new emit', createdIncident?.id === incidentNewEvent?.id, {});
    setSocketResult('incident:updated emit', updatedEvent?.id === createdIncident.id && updatedEvent?.status === 'acknowledged', {});

    await api('/api/seed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  } finally {
    socket.disconnect();
  }

  results.passed = Object.values(results.endpoints).filter((entry) => entry.pass).length;
  results.total = Object.keys(results.endpoints).length;
  results.socketPassed = Object.values(results.sockets).filter((entry) => entry.pass).length;
  results.socketTotal = Object.keys(results.sockets).length;
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
