import { api } from './api';

// Separate injection file (not orderApi.js — kept untouched per handoff) for the one extra
// endpoint the checkout flow needs: a demo, real-but-non-functional scannable UPI intent QR.
export const checkoutApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getDemoUpiQr: builder.query({
      query: (amount) => `/orders/demo-upi-qr?amount=${Math.max(0, Math.round(Number(amount) || 0))}`,
    }),
  }),
});

export const { useGetDemoUpiQrQuery, useLazyGetDemoUpiQrQuery } = checkoutApi;
