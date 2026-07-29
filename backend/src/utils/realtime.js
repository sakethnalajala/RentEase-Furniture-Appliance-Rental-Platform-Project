// Thin, swappable handle to the live Socket.IO instance (set once at server startup by
// realtime/index.js). Controllers import only `emitToUser` so they never need to know whether
// a socket server is actually running — on a serverless invocation (Vercel) there is no
// long-lived process to hold a socket connection at all, so `ioInstance` simply stays null and
// every emit below becomes a harmless no-op; the notification itself is still persisted to the
// database either way, and connected clients fall back to their normal polling interval.
let ioInstance = null;

function setIO(io) {
  ioInstance = io;
}

function getIO() {
  return ioInstance;
}

// Pushes `event` with `payload` to every socket this user currently has open (see
// realtime/index.js — each authenticated socket joins a room named `user:<their own id>`).
function emitToUser(userId, event, payload) {
  if (!ioInstance || !userId) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

module.exports = { setIO, getIO, emitToUser };
