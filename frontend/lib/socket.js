import { io } from 'socket.io-client';

// NEXT_PUBLIC_API_URL points at the REST base (".../api/v1") — Socket.IO connects to the bare
// origin and does its own path-based handshake ("/socket.io/..."), so the "/api/v1" suffix has
// to come off first.
function socketBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
  try {
    return new URL(apiUrl).origin;
  } catch {
    return apiUrl.replace(/\/api\/v1\/?$/, '');
  }
}

let socket = null;

// One socket per browser tab, created lazily on first connect and reused across reconnects —
// mirrors the app's existing "one Redux store per tab" (StoreProvider.js) singleton shape.
// `autoConnect: false` because a fresh socket needs the caller's current access token attached
// to `auth` *before* it dials, not after — see connectSocket below.
export function getSocket() {
  if (!socket) {
    socket = io(socketBaseUrl(), {
      autoConnect: false,
      withCredentials: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

// Called whenever the in-memory access token changes (login, silent refresh, token rotation).
// Reconnecting on every token change (rather than trying to swap `auth` on a live connection)
// keeps this simple and correct: the handshake is the only place the server checks the token,
// so a stale token on an already-open socket would otherwise never get re-verified.
export function connectSocket(accessToken) {
  if (!accessToken) return;
  const s = getSocket();
  s.auth = { token: accessToken };
  if (s.connected) s.disconnect();
  s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}

export function getExistingSocket() {
  return socket;
}
