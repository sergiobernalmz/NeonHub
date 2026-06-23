

const { Server } = require('socket.io');

let io = null;

const ticketPresence = {};

function getTicketRoom(ticketId) {
  return `ticket:${ticketId}`;
}

function initializeSocketIO(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: ['https://neonhub.es', 'http://localhost:5000', 'http://localhost:3000', 'http://127.0.0.1:5000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    socket.on('join:store', (storeId) => {
      if (!storeId) return;
      socket.join(`store:${storeId}`);
    });

    socket.on('ticket:join', ({ ticketId, role }) => {
      if (!ticketId || !role) return;
      const room = getTicketRoom(ticketId);
      socket.join(room);

      if (!ticketPresence[ticketId]) {
        ticketPresence[ticketId] = { admin: new Set(), customer: new Set() };
      }
      ticketPresence[ticketId][role]?.add(socket.id);

      socket.ticketRooms = socket.ticketRooms || [];
      socket.ticketRooms.push({ ticketId, role });

      socket.to(room).emit('ticket:presence', { ticketId, role, online: true });

      const presence = ticketPresence[ticketId];
      socket.emit('ticket:presence', { ticketId, role: 'admin', online: (presence.admin?.size || 0) > 0 });
      socket.emit('ticket:presence', { ticketId, role: 'customer', online: (presence.customer?.size || 0) > 0 });
    });

    socket.on('ticket:leave', ({ ticketId, role }) => {
      if (!ticketId) return;
      const room = getTicketRoom(ticketId);
      socket.leave(room);

      if (ticketPresence[ticketId]?.[role]) {
        ticketPresence[ticketId][role].delete(socket.id);
      }

      const stillOnline = (ticketPresence[ticketId]?.[role]?.size || 0) > 0;
      if (!stillOnline) {
        socket.to(room).emit('ticket:presence', { ticketId, role, online: false });
      }
    });

    socket.on('ticket:typing', ({ ticketId, sender }) => {
      if (!ticketId || !sender) return;
      socket.to(getTicketRoom(ticketId)).emit('ticket:typing', { ticketId, sender });
    });

    socket.on('ticket:stop-typing', ({ ticketId, sender }) => {
      if (!ticketId || !sender) return;
      socket.to(getTicketRoom(ticketId)).emit('ticket:stop-typing', { ticketId, sender });
    });

    socket.on('ticket:mark-read', async ({ ticketId, role }) => {
      if (!ticketId || !role) return;
      try {
        const { SupportTicket } = require('../models');
        const updates = {};
        if (role === 'admin') {
          updates.read_by_admin = true;
          updates.admin_last_seen = new Date();
        } else {
          updates.read_by_customer = true;
          updates.customer_last_seen = new Date();
        }
        await SupportTicket.update(updates, { where: { id: ticketId } });

        
        socket.to(getTicketRoom(ticketId)).emit('ticket:read', { ticketId, role });
      } catch (err) {
        console.error('Error marking ticket as read:', err.message);
      }
    });

    socket.on('disconnect', () => {
      if (socket.ticketRooms) {
        for (const { ticketId, role } of socket.ticketRooms) {
          if (ticketPresence[ticketId]?.[role]) {
            ticketPresence[ticketId][role].delete(socket.id);
            const stillOnline = ticketPresence[ticketId][role].size > 0;
            if (!stillOnline) {
              io.to(getTicketRoom(ticketId)).emit('ticket:presence', { ticketId, role, online: false });
            }
          }
        }
      }
    });
  });

  console.log('🔌 Socket.IO inicializado para tickets en tiempo real');
  return io;
}

function emitNewReply(ticketId, reply, ticket) {
  if (!io) return;
  io.to(getTicketRoom(ticketId)).emit('ticket:new-reply', { ticketId, reply, ticket });
}

function emitStatusChange(ticketId, status) {
  if (!io) return;
  io.to(getTicketRoom(ticketId)).emit('ticket:status-changed', { ticketId, status });
}

function emitNewTicket(ticket) {
  if (!io) return;
  io.emit('ticket:new', { ticket });
}

function emitOrderEvent(storeId, event, data) {
  if (!io || !storeId) return;
  io.to(`store:${storeId}`).emit(event, data);
}

function getIO() {
  return io;
}

module.exports = {
  initializeSocketIO,
  emitNewReply,
  emitStatusChange,
  emitNewTicket,
  emitOrderEvent,
  getIO
};
