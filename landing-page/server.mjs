import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioClient } from 'socket.io-client';

const PORT = parseInt(process.env.PORT || '5000');
const HOST = process.env.HOST || '0.0.0.0';
const BACKEND_URL = (process.env.PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api').replace(/\/api\/?$/, '');

// Astro's standalone entry calls startServer() on import using process.env.PORT.
// Redirect it to a sidecar port so it doesn't conflict with our socket.io server.
process.env.PORT = '14321';
const { handler } = await import('./dist/server/entry.mjs');
process.env.PORT = String(PORT);

const httpServer = createServer(handler);

const io = new Server(httpServer, {
  path: '/socket.io',
  cors: {
    origin: process.env.PUBLIC_SITE_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// ── Bridge: connect to backend Socket.IO and forward ticket events to CEO clients ──
const backendSocket = ioClient(BACKEND_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 2000,
});

backendSocket.on('connect', () => {
  console.log('🔗 Landing bridge → backend socket conectado:', backendSocket.id);
});

backendSocket.on('connect_error', (err) => {
  console.error('⚠️  Landing bridge socket error:', err.message);
});

// Forward ticket events from backend to CEO clients in the same room
backendSocket.on('ticket:new-reply', ({ ticketId, reply, ticket }) => {
  io.to(`ticket:${ticketId}`).emit('ticket:new-reply', { ticketId, reply, ticket });
});

backendSocket.on('ticket:status-changed', ({ ticketId, status }) => {
  io.to(`ticket:${ticketId}`).emit('ticket:status-changed', { ticketId, status });
});

backendSocket.on('ticket:new', ({ ticket }) => {
  io.emit('ticket:new', { ticket });
});

// ── CEO client connections ──
io.on('connection', (socket) => {
  socket.on('ticket:join', ({ ticketId, role }) => {
    socket.join(`ticket:${ticketId}`);
    io.to(`ticket:${ticketId}`).emit('ticket:presence', { ticketId, role, online: true });
  });

  socket.on('ticket:leave', ({ ticketId, role }) => {
    socket.leave(`ticket:${ticketId}`);
    io.to(`ticket:${ticketId}`).emit('ticket:presence', { ticketId, role, online: false });
  });

  socket.on('ticket:typing', ({ ticketId, sender }) => {
    socket.to(`ticket:${ticketId}`).emit('ticket:typing', { ticketId, sender });
  });

  socket.on('ticket:stop-typing', ({ ticketId, sender }) => {
    socket.to(`ticket:${ticketId}`).emit('ticket:stop-typing', { ticketId, sender });
  });

  socket.on('ticket:mark-read', ({ ticketId, role }) => {
    socket.to(`ticket:${ticketId}`).emit('ticket:read', { ticketId, role });
  });

  socket.on('disconnect', () => {});
});

httpServer.listen(PORT, HOST, () => {
  console.log(`Landing + Socket.IO on http://${HOST}:${PORT}`);
});
