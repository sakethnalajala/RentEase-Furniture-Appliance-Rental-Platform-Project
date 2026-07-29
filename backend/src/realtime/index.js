const { Server } = require('socket.io');
const env = require('../config/env');
const tokenService = require('../services/tokenService');
const User = require('../models/User');
const logger = require('../utils/logger');
const { setIO } = require('../utils/realtime');

// Every connected client authenticates with the same short-lived JWT access token already used
// for REST calls (sent once, in the handshake `auth` payload — not a header, since the initial
// WebSocket upgrade request can't carry a custom Authorization header from a browser). A socket
// that fails this never finishes connecting; there is no anonymous/unauthenticated socket state.
async function authenticateSocket(socket, next) {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));

    const payload = tokenService.verifyAccessToken(token);
    const user = await User.findById(payload.sub).select('_id isActive');
    if (!user || !user.isActive) return next(new Error('Unauthorized'));

    socket.userId = String(user._id);
    next();
  } catch (err) {
    next(new Error('Unauthorized'));
  }
}

// Attaches Socket.IO to the same HTTP server Express is already listening on (only ever called
// from server.js's persistent `app.listen()` path — never from the Vercel serverless entry
// point, which has no long-lived server to attach to). Every socket joins a room keyed to its
// own user id the moment it connects, which is the only piece of routing the rest of the app
// needs: any controller can reach a specific user's every open tab/device via
// `emitToUser(userId, event, payload)` without knowing how many sockets they have open or which
// page they're on.
function initRealtime(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    socket.join(`user:${socket.userId}`);
  });

  setIO(io);
  logger.success('Realtime (Socket.IO) attached.');
  return io;
}

module.exports = { initRealtime };
