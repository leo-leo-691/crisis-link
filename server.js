const { createServer } = require('http');
const net = require('net');
const next = require('next');
const { Server } = require('socket.io');
const { setIO } = require('./lib/socket');
require('dotenv').config();

const dev  = process.env.NODE_ENV !== 'production';
const hostname = process.env.APP_HOSTNAME || process.env.NEXT_HOST || (dev ? 'localhost' : '0.0.0.0');
const startPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app  = next({ dev, hostname, port: startPort });
const handle = app.getRequestHandler();

function findFreePort(startAtPort) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startAtPort, () => {
      const freePort = server.address().port;
      server.close(() => resolve(freePort));
    });
    server.on('error', () => {
      resolve(findFreePort(startAtPort + 1));
    });
  });
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      handle(req, res);
    } catch (err) {
      console.error('Request handler error:', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Register singleton so API routes can emit events
  setIO(io);

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);

    // Join an incident-specific room for targeted events
    socket.on('join:incident', (incidentId) => {
      socket.join(incidentId);
      console.log(`[WS] ${socket.id} joined ${incidentId}`);
    });

    socket.on('leave:incident', (incidentId) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: ${socket.id}`);
    });
  });

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('⚠️ Supabase credentials not found. Check .env file.');
  }

  // Start background escalation service
  const { startEscalationService } = require('./lib/escalation');
  startEscalationService(io);

  httpServer.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  findFreePort(startPort).then((PORT) => {
    httpServer.listen(PORT, () => {
      console.log(`✅ CrisisLink running on http://localhost:${PORT}`);
      console.log('✅ Database ready');
      console.log('   Demo login: admin@grandhotel.com / demo1234');
    });
  });
});
