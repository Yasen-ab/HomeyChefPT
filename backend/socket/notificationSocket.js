const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

let notificationNamespace = null;

function buildAudience(decoded) {
  if (decoded.userType === 'chef' || decoded.role === 'chef') {
    return { type: 'chef', id: decoded.userId };
  }
  return { type: 'user', id: decoded.userId };
}

function initNotificationSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  notificationNamespace = io.of('/notifications');

  notificationNamespace.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = buildAudience(decoded);
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  notificationNamespace.on('connection', (socket) => {
    const room = `${socket.user.type}:${socket.user.id}`;
    socket.join(room);
  });

  return io;
}

function emitNotification(notification) {
  if (!notificationNamespace) return;

  if (notification.userId) {
    notificationNamespace.to(`user:${notification.userId}`).emit('notification:new', notification);
  }

  if (notification.chefId) {
    notificationNamespace.to(`chef:${notification.chefId}`).emit('notification:new', notification);
  }
}

module.exports = {
  initNotificationSocket,
  emitNotification
};
