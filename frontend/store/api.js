import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { setAccessToken, logout } from './authSlice';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  credentials: 'include', // sends the httpOnly refresh-token cookie
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// De-dupes concurrent 401s into a single /auth/refresh call instead of one per failed request.
let refreshPromise = null;

// Named `bqApi` (not `api`) so this can still reference the module's own exported `api`
// object below for `api.util.resetApiState()` — the RTK Query lifecycle arg and the
// `createApi` result would otherwise share the same name and shadow each other.
const baseQueryWithReauth = async (args, bqApi, extraOptions) => {
  const url = typeof args === 'string' ? args : args.url;
  let result = await rawBaseQuery(args, bqApi, extraOptions);

  if (result.error?.status === 401 && !url.startsWith('/auth/')) {
    if (!refreshPromise) {
      refreshPromise = rawBaseQuery({ url: '/auth/refresh', method: 'POST' }, bqApi, extraOptions).finally(() => {
        refreshPromise = null;
      });
    }
    const refreshResult = await refreshPromise;
    const newAccessToken = refreshResult.data?.data?.accessToken;

    if (newAccessToken) {
      bqApi.dispatch(setAccessToken(newAccessToken));
      result = await rawBaseQuery(args, bqApi, extraOptions);
    } else {
      bqApi.dispatch(logout());
      // A dead refresh token (expired/revoked) means this session is over — clear every
      // cached query result too, so the next account to log in in this tab never sees this
      // one's leftover vendor/order/notification data.
      bqApi.dispatch(api.util.resetApiState());
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Me',
    'Wishlist',
    'Cart',
    'Addresses',
    'AdminStats',
    'Vendors',
    'Notifications',
    'VendorProfile',
    'MyOrders',
    'VendorOrders',
    'DeliveryProfile',
    'DeliveryRequests',
    'DeliveryAssigned',
    'DeliveryHistory',
    'VendorDeliveryPartners',
    'RentalRequestDecisions',
    'AdminProducts',
    'AdminCategories',
    'AdminInventory',
    'AdminCustomers',
    'AdminDeliveryPartners',
    'AdminOrders',
    'AdminPayments',
    'AdminSettings',
    'AdminRentalPlans',
  ],
  endpoints: () => ({}),
});
