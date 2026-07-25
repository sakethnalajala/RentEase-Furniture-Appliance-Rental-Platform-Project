import { api } from './api';
import { customerApi } from './customerApi';
import { setCredentials, setPending2FA, setAccessToken, logout } from './authSlice';
import { setSelectedCity } from './citySlice';

// Warms the RTK Query cache for the Browse page's default view (and the category list it
// needs for its filter chips) the moment a session starts, so navigating there right after
// login shows real product data immediately instead of an empty grid while the first request
// is still in flight. `force: false` means this is a no-op if something already triggered the
// same query — cheap either way.
function prefetchCatalog(dispatch, getState) {
  const cityId = getState().city?.selectedCity?.id;
  dispatch(customerApi.util.prefetch('listCategories', undefined, { force: false }));
  dispatch(customerApi.util.prefetch('listProducts', { city: cityId, sort: 'newest', page: 1, limit: 12 }, { force: false }));
}

// Without this, a fresh login (no `rentease_city` in localStorage yet) left `city.selectedCity`
// null — Dashboard/Browse queries still fired, but with no city filter, silently showing a
// mixed-city catalog instead of the customer's own city until they manually opened the city
// picker. Resolves in priority order: (1) a city already picked this browser session
// (localStorage — don't clobber a deliberate choice), (2) the account's saved `selectedCity`
// from the backend, (3) fall back to the first city in the list so the app never has "no city"
// as a working state, persisting that default back to the account exactly like a manual pick.
async function resolveSelectedCityOnLogin(user, dispatch, getState) {
  if (getState().city?.selectedCity) return;

  if (user?.selectedCity) {
    const c = user.selectedCity;
    dispatch(setSelectedCity({ id: c._id, name: c.name, state: c.state }));
    return;
  }

  try {
    const { data: cities } = await dispatch(authApi.endpoints.listCities.initiate()).unwrap();
    const first = cities?.[0];
    if (!first) return;
    dispatch(setSelectedCity({ id: first._id, name: first.name, state: first.state }));
    dispatch(authApi.endpoints.selectCity.initiate({ cityId: first._id }));
  } catch {
    // Non-fatal — the city picker in the nav remains manually usable either way.
  }
}

// Shared handler for any auth mutation that can resolve to either a full session
// ({user, accessToken}) or a 2FA challenge ({requires2FA/requires2FASetup, tempToken}).
async function handleAuthResult(queryFulfilled, dispatch, getState) {
  const { data } = await queryFulfilled;
  const payload = data?.data;
  if (!payload) return;

  if (payload.accessToken) {
    dispatch(setCredentials(payload));
    // Wipe every cached query result from whoever (if anyone) was authenticated a moment ago.
    // Without this, switching accounts in the same tab without a full page reload (e.g. demo
    // tiles, or logging in as a newly-created account right after testing another role) could
    // briefly — or indefinitely, if nothing re-triggers a fetch — serve the PREVIOUS account's
    // cached vendor profile/orders/notifications under the new session, since RTK Query caches
    // most of these endpoints under a single no-argument cache key.
    dispatch(api.util.resetApiState());
    await resolveSelectedCityOnLogin(payload.user, dispatch, getState);
    if (payload.user?.role === 'customer') prefetchCatalog(dispatch, getState);
  } else if (payload.requires2FA) {
    dispatch(setPending2FA({ tempToken: payload.tempToken, mode: 'verify' }));
  } else if (payload.requires2FASetup) {
    dispatch(setPending2FA({ tempToken: payload.tempToken, mode: 'setup' }));
  }
}

export const authApi = api.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    verifyEmail: builder.mutation({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),
    resendVerification: builder.mutation({
      query: (body) => ({ url: '/auth/resend-verification', method: 'POST', body }),
    }),
    login: builder.mutation({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => handleAuthResult(queryFulfilled, dispatch, getState),
    }),
    verifyLogin2FA: builder.mutation({
      query: (body) => ({ url: '/auth/login/2fa', method: 'POST', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => handleAuthResult(queryFulfilled, dispatch, getState),
    }),
    requestOtp: builder.mutation({
      query: (body) => ({ url: '/auth/otp/request', method: 'POST', body }),
    }),
    verifyOtp: builder.mutation({
      query: (body) => ({ url: '/auth/otp/verify', method: 'POST', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => handleAuthResult(queryFulfilled, dispatch, getState),
    }),
    // Simulated "Continue with Google" account picker: list which accounts of a role a picker
    // could offer (real accounts first, the platform's one demo account as a separate fallback
    // field — never the filler seed accounts), then sign into a specifically-chosen one.
    // Accepts either a plain role string (legacy call sites) or { role, city } — `city` only
    // matters for delivery_partner, which has a genuine per-city demo account.
    listGoogleAccounts: builder.query({
      query: (arg) => {
        const { role, city } = typeof arg === 'string' ? { role: arg } : arg || {};
        return `/auth/google/accounts?role=${role}${city ? `&city=${encodeURIComponent(city)}` : ''}`;
      },
    }),
    selectGoogleAccount: builder.mutation({
      query: (body) => ({ url: '/auth/google/select', method: 'POST', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => handleAuthResult(queryFulfilled, dispatch, getState),
    }),
    setup2FA: builder.mutation({
      query: (body) => ({ url: '/auth/2fa/setup', method: 'POST', body }),
    }),
    enable2FA: builder.mutation({
      query: (body) => ({ url: '/auth/2fa/enable', method: 'POST', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled, getState }) => handleAuthResult(queryFulfilled, dispatch, getState),
    }),
    disable2FA: builder.mutation({
      query: (body) => ({ url: '/auth/2fa/disable', method: 'POST', body }),
    }),
    forgotPassword: builder.mutation({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    refresh: builder.mutation({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
    }),
    logoutUser: builder.mutation({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled.catch(() => {});
        dispatch(logout());
        dispatch(api.util.resetApiState());
      },
    }),
    getMe: builder.query({
      query: () => '/users/me',
      providesTags: ['Me'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/users/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    selectCity: builder.mutation({
      query: (body) => ({ url: '/users/me/city', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    listCities: builder.query({
      query: () => '/cities',
    }),
    changePassword: builder.mutation({
      query: (body) => ({ url: '/users/me/password', method: 'PATCH', body }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        const { data } = await queryFulfilled;
        if (data?.data?.accessToken) dispatch(setAccessToken(data.data.accessToken));
      },
    }),
    deactivateAccount: builder.mutation({
      query: () => ({ url: '/users/me', method: 'DELETE' }),
      onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
        await queryFulfilled.catch(() => {});
        dispatch(logout());
        dispatch(api.util.resetApiState());
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useVerifyEmailMutation,
  useResendVerificationMutation,
  useLoginMutation,
  useVerifyLogin2FAMutation,
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useLazyListGoogleAccountsQuery,
  useSelectGoogleAccountMutation,
  useSetup2FAMutation,
  useEnable2FAMutation,
  useDisable2FAMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useRefreshMutation,
  useLogoutUserMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useUpdateProfileMutation,
  useSelectCityMutation,
  useListCitiesQuery,
  useChangePasswordMutation,
  useDeactivateAccountMutation,
} = authApi;
