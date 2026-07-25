import { createSlice } from '@reduxjs/toolkit';
import { setRoleCookie, clearRoleCookie } from '@/lib/cookies';

const initialState = {
  user: null,
  accessToken: null,
  status: 'idle', // idle | loading | authenticated | unauthenticated
  requires2FA: false,
  requires2FASetup: false,
  tempToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, accessToken, rememberMe } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.status = 'authenticated';
      state.requires2FA = false;
      state.requires2FASetup = false;
      state.tempToken = null;
      // Mirrors whatever persistence the backend's httpOnly refresh cookie actually has —
      // `rememberMe` always comes from the server's response (never inferred client-side), so
      // this stays correct whether we just logged in or a silent /auth/refresh restored an
      // existing session.
      if (typeof window !== 'undefined') setRoleCookie(user.role, Boolean(rememberMe));
    },
    setAccessToken(state, action) {
      state.accessToken = action.payload;
    },
    setPending2FA(state, action) {
      const { tempToken, mode } = action.payload; // mode: 'verify' | 'setup'
      state.tempToken = tempToken;
      state.requires2FA = mode === 'verify';
      state.requires2FASetup = mode === 'setup';
      state.status = 'unauthenticated';
    },
    setUnauthenticated(state) {
      state.status = 'unauthenticated';
    },
    // Lets the 2FA verify/setup screens offer a real "Back to login" action — since `view` on
    // the login page is derived from `requires2FA`/`requires2FASetup`, just navigating away
    // isn't enough (we're already on /login; these flags would still be set and immediately
    // show the 2FA screen again on any re-render). This clears the challenge state so the
    // plain login form reappears.
    cancelTwoFactor(state) {
      state.requires2FA = false;
      state.requires2FASetup = false;
      state.tempToken = null;
    },
    logout(state) {
      Object.assign(state, initialState, { status: 'unauthenticated' });
      if (typeof window !== 'undefined') clearRoleCookie();
    },
  },
});

export const { setCredentials, setAccessToken, setPending2FA, setUnauthenticated, cancelTwoFactor, logout } = authSlice.actions;
export default authSlice.reducer;
