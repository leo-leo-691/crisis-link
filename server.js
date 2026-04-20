const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const { setIO } = require('./lib/socket');

const dev  = process.env.NODE_ENV !== 'production';
const port = parseInt(process.env.PORT || '3000', 10);
const app  = next({ dev, hostname: 'localhost', port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request handler error:', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  // Register singleton so API routes can emit events
  setIO(io);

  io.on('connection', (socket) => {
    console.log(`[WS] Connected: ${socket.id}`);

    // Join an incident-specific room for targeted events
    socket.on('join:incident', (incidentId) => {
      socket.join(`incident:${incidentId}`);
      console.log(`[WS] ${socket.id} joined incident:${incidentId}`);
    });

    socket.on('leave:incident', (incidentId) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: ${socket.id}`);
    });
  });

  // Initialize DB (triggers schema creation + seed)
  try {
    require('./lib/db');
    console.log('✅ Database ready');
  } catch (err) {
    console.error('❌ Database init failed:', err.message);
  }

  // Start background escalation service
  const { startEscalationService } = require('./lib/escalation');
  startEscalationService(io);

  httpServer.once('error', (err) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  httpServer.listen(port, () => {
    console.log(`✅ CrisisLink ready — http://localhost:${port}`);
    console.log(`   Demo login: admin@grandhotel.com / demo1234`);
  });
});
