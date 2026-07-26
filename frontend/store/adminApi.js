import { api } from './api';

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// Moves a vendor between the Vendor Management tabs' cached lists instantly, without waiting on
// (or refetching after) the mutation — every currently-cached `listVendorApplications` entry
// (one per {status, city, search} combo the admin has viewed this session) is patched directly:
// removed from any tab that no longer matches the new status, upserted into any cached tab that
// does. Reverted automatically if the request actually fails.
async function optimisticVendorStatusUpdate(vendorId, newStatus, { dispatch, getState, queryFulfilled }) {
  const patches = [];
  let vendorSnapshot = null;

  const state = getState();
  Object.values(state.api.queries || {}).forEach((entry) => {
    if (!entry || entry.endpointName !== 'listVendorApplications' || !entry.data) return;
    patches.push(
      dispatch(
        api.util.updateQueryData('listVendorApplications', entry.originalArgs, (draft) => {
          if (!Array.isArray(draft?.data)) return;
          const idx = draft.data.findIndex((v) => v._id === vendorId);
          if (idx === -1) return;
          vendorSnapshot = vendorSnapshot || { ...draft.data[idx] };
          const args = typeof entry.originalArgs === 'string' ? { status: entry.originalArgs } : entry.originalArgs || {};
          if (args.status && args.status !== newStatus) {
            draft.data.splice(idx, 1);
          } else {
            draft.data[idx] = { ...draft.data[idx], status: newStatus };
          }
        })
      )
    );
  });

  if (vendorSnapshot) {
    Object.values(state.api.queries || {}).forEach((entry) => {
      if (!entry || entry.endpointName !== 'listVendorApplications' || !entry.data) return;
      const args = typeof entry.originalArgs === 'string' ? { status: entry.originalArgs } : entry.originalArgs || {};
      if (args.status !== newStatus) return;
      patches.push(
        dispatch(
          api.util.updateQueryData('listVendorApplications', entry.originalArgs, (draft) => {
            if (!Array.isArray(draft?.data) || draft.data.some((v) => v._id === vendorId)) return;
            draft.data.unshift({ ...vendorSnapshot, status: newStatus });
          })
        )
      );
    });
  }

  try {
    await queryFulfilled;
  } catch {
    patches.forEach((patch) => patch.undo());
  }
}

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // ---- Dashboard ----
    // Public, unauthenticated endpoint — reused here (not just for uptime monitoring) to power
    // the Admin Profile's "System Health" panel with a genuinely live signal instead of a
    // hardcoded "Operational" label.
    getSystemHealth: builder.query({
      query: () => '/health',
      keepUnusedDataFor: 30,
    }),
    getAdminStats: builder.query({
      query: (params) => `/admin/stats${buildQueryString(params)}`,
      providesTags: ['AdminStats'],
      keepUnusedDataFor: 180,
    }),
    getAdminAnalytics: builder.query({
      query: (params) => `/admin/analytics${buildQueryString(params)}`,
      providesTags: ['AdminStats'],
      keepUnusedDataFor: 180,
    }),

    // ---- Vendor management ----
    // Accepts either a plain status string (legacy call sites) or a params object
    // { status, city, search } — normalized here so both shapes work.
    listVendorApplications: builder.query({
      query: (params) => {
        const normalized = typeof params === 'string' ? { status: params } : params;
        return `/admin/vendors${buildQueryString(normalized)}`;
      },
      providesTags: ['Vendors'],
      keepUnusedDataFor: 300,
    }),
    getVendorApplication: builder.query({
      query: (id) => `/admin/vendors/${id}`,
      providesTags: ['Vendors'],
      keepUnusedDataFor: 300,
    }),
    getVendorPerformance: builder.query({
      query: (id) => `/admin/vendors/${id}/performance`,
      providesTags: ['Vendors'],
      keepUnusedDataFor: 300,
    }),
    approveVendorApplication: builder.mutation({
      query: (id) => ({ url: `/admin/vendors/${id}/approve`, method: 'POST' }),
      // Backend approval is genuinely slow (it awaits full demo-data generation + a synchronous
      // email send before responding) — so the list is patched optimistically here instead of
      // waiting on that round-trip. `invalidatesTags` is kept too, so once the slow request does
      // resolve, a background refetch reconciles the cache with the server's authoritative state
      // (no spinner, since `isLoading` on the list query is already false by then).
      onQueryStarted: (id, api) => optimisticVendorStatusUpdate(id, 'approved', api),
      invalidatesTags: ['Vendors', 'AdminStats'],
    }),
    rejectVendorApplication: builder.mutation({
      query: ({ id, reason }) => ({ url: `/admin/vendors/${id}/reject`, method: 'POST', body: { reason } }),
      onQueryStarted: ({ id }, api) => optimisticVendorStatusUpdate(id, 'rejected', api),
      invalidatesTags: ['Vendors', 'AdminStats'],
    }),
    suspendVendorApplication: builder.mutation({
      query: (id) => ({ url: `/admin/vendors/${id}/suspend`, method: 'POST' }),
      invalidatesTags: ['Vendors', 'AdminStats'],
    }),
    reactivateVendorApplication: builder.mutation({
      query: (id) => ({ url: `/admin/vendors/${id}/reactivate`, method: 'POST' }),
      invalidatesTags: ['Vendors', 'AdminStats'],
    }),
    adminUpdateVendor: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/vendors/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Vendors', 'AdminStats'],
    }),
    adminDeleteVendor: builder.mutation({
      query: (id) => ({ url: `/admin/vendors/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Vendors', 'AdminStats', 'AdminProducts'],
    }),

    // ---- Product management ----
    adminListProducts: builder.query({
      query: (params) => `/admin/products${buildQueryString(params)}`,
      providesTags: ['AdminProducts'],
      keepUnusedDataFor: 300,
    }),
    adminGetProduct: builder.query({
      query: (id) => `/admin/products/${id}`,
      providesTags: ['AdminProducts'],
      keepUnusedDataFor: 300,
    }),
    adminCreateProduct: builder.mutation({
      query: (body) => ({ url: '/admin/products', method: 'POST', body }),
      invalidatesTags: ['AdminProducts', 'AdminInventory', 'AdminStats'],
    }),
    adminUpdateProduct: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/products/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['AdminProducts', 'AdminInventory'],
    }),
    adminSetProductApproval: builder.mutation({
      query: ({ id, approved }) => ({ url: `/admin/products/${id}/approval`, method: 'PATCH', body: { approved } }),
      invalidatesTags: ['AdminProducts', 'AdminInventory', 'AdminStats'],
    }),
    adminDeleteProduct: builder.mutation({
      query: (id) => ({ url: `/admin/products/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminProducts', 'AdminInventory', 'AdminStats'],
    }),

    // ---- Category management ----
    adminListCategories: builder.query({
      query: () => '/admin/categories',
      providesTags: ['AdminCategories'],
      keepUnusedDataFor: 3600,
    }),
    adminCreateCategory: builder.mutation({
      query: (body) => ({ url: '/admin/categories', method: 'POST', body }),
      invalidatesTags: ['AdminCategories'],
    }),
    adminUpdateCategory: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/categories/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['AdminCategories'],
    }),
    adminDeleteCategory: builder.mutation({
      query: (id) => ({ url: `/admin/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminCategories'],
    }),

    // ---- Inventory ----
    adminGetInventoryOverview: builder.query({
      query: (params) => `/admin/inventory${buildQueryString(params)}`,
      providesTags: ['AdminInventory'],
      keepUnusedDataFor: 300,
    }),

    // ---- Customer management ----
    adminListCustomers: builder.query({
      query: (params) => `/admin/customers${buildQueryString(params)}`,
      providesTags: ['AdminCustomers'],
      keepUnusedDataFor: 300,
    }),
    adminGetCustomer: builder.query({
      query: (id) => `/admin/customers/${id}`,
      providesTags: ['AdminCustomers'],
      keepUnusedDataFor: 300,
    }),

    // ---- Delivery partner management ----
    adminListDeliveryPartners: builder.query({
      query: (params) => `/admin/delivery-partners${buildQueryString(params)}`,
      providesTags: ['AdminDeliveryPartners'],
      keepUnusedDataFor: 300,
    }),
    adminGetDeliveryPartner: builder.query({
      query: (id) => `/admin/delivery-partners/${id}`,
      providesTags: ['AdminDeliveryPartners'],
      keepUnusedDataFor: 300,
    }),
    approveDeliveryPartner: builder.mutation({
      query: (id) => ({ url: `/admin/delivery-partners/${id}/approve`, method: 'POST' }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),
    rejectDeliveryPartner: builder.mutation({
      query: ({ id, reason }) => ({ url: `/admin/delivery-partners/${id}/reject`, method: 'POST', body: { reason } }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),
    suspendDeliveryPartner: builder.mutation({
      query: (id) => ({ url: `/admin/delivery-partners/${id}/suspend`, method: 'POST' }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),
    reactivateDeliveryPartner: builder.mutation({
      query: (id) => ({ url: `/admin/delivery-partners/${id}/reactivate`, method: 'POST' }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),
    adminUpdateDeliveryPartner: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/admin/delivery-partners/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),
    adminDeleteDeliveryPartner: builder.mutation({
      query: (id) => ({ url: `/admin/delivery-partners/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminDeliveryPartners', 'AdminStats'],
    }),

    // ---- Orders + Rentals ----
    adminListOrders: builder.query({
      query: (params) => `/admin/orders${buildQueryString(params)}`,
      providesTags: ['AdminOrders'],
      keepUnusedDataFor: 180,
    }),
    adminListRentals: builder.query({
      query: (params) => `/admin/rentals${buildQueryString(params)}`,
      providesTags: ['AdminOrders'],
      keepUnusedDataFor: 180,
    }),

    // ---- Payments ----
    adminListPayments: builder.query({
      query: (params) => `/admin/payments${buildQueryString(params)}`,
      providesTags: ['AdminPayments'],
      keepUnusedDataFor: 180,
    }),
    adminGetPaymentsSummary: builder.query({
      query: (params) => `/admin/payments/summary${buildQueryString(params)}`,
      providesTags: ['AdminPayments'],
      keepUnusedDataFor: 180,
    }),

    // ---- Notifications ----
    adminBroadcastNotification: builder.mutation({
      query: (body) => ({ url: '/admin/notifications/broadcast', method: 'POST', body }),
    }),

    // ---- Settings ----
    adminGetSettings: builder.query({
      query: () => '/admin/settings',
      providesTags: ['AdminSettings'],
      keepUnusedDataFor: 3600,
    }),
    adminUpdateSettings: builder.mutation({
      query: (body) => ({ url: '/admin/settings', method: 'PATCH', body }),
      invalidatesTags: ['AdminSettings'],
    }),
    adminListRentalPlans: builder.query({
      query: () => '/admin/rental-plans',
      providesTags: ['AdminRentalPlans'],
      keepUnusedDataFor: 3600,
    }),
    adminUpsertRentalPlan: builder.mutation({
      query: (body) => ({ url: '/admin/rental-plans', method: 'PUT', body }),
      invalidatesTags: ['AdminRentalPlans'],
    }),
    adminDeleteRentalPlan: builder.mutation({
      query: (id) => ({ url: `/admin/rental-plans/${id}`, method: 'DELETE' }),
      invalidatesTags: ['AdminRentalPlans'],
    }),
  }),
});

export const {
  useGetSystemHealthQuery,
  useGetAdminStatsQuery,
  useGetAdminAnalyticsQuery,
  useListVendorApplicationsQuery,
  useGetVendorApplicationQuery,
  useGetVendorPerformanceQuery,
  useApproveVendorApplicationMutation,
  useRejectVendorApplicationMutation,
  useSuspendVendorApplicationMutation,
  useReactivateVendorApplicationMutation,
  useAdminUpdateVendorMutation,
  useAdminDeleteVendorMutation,
  useAdminListProductsQuery,
  useAdminGetProductQuery,
  useAdminCreateProductMutation,
  useAdminUpdateProductMutation,
  useAdminSetProductApprovalMutation,
  useAdminDeleteProductMutation,
  useAdminListCategoriesQuery,
  useAdminCreateCategoryMutation,
  useAdminUpdateCategoryMutation,
  useAdminDeleteCategoryMutation,
  useAdminGetInventoryOverviewQuery,
  useAdminListCustomersQuery,
  useAdminGetCustomerQuery,
  useAdminListDeliveryPartnersQuery,
  useAdminGetDeliveryPartnerQuery,
  useApproveDeliveryPartnerMutation,
  useRejectDeliveryPartnerMutation,
  useSuspendDeliveryPartnerMutation,
  useReactivateDeliveryPartnerMutation,
  useAdminUpdateDeliveryPartnerMutation,
  useAdminDeleteDeliveryPartnerMutation,
  useAdminListOrdersQuery,
  useAdminListRentalsQuery,
  useAdminListPaymentsQuery,
  useAdminGetPaymentsSummaryQuery,
  useAdminBroadcastNotificationMutation,
  useAdminGetSettingsQuery,
  useAdminUpdateSettingsMutation,
  useAdminListRentalPlansQuery,
  useAdminUpsertRentalPlanMutation,
  useAdminDeleteRentalPlanMutation,
} = adminApi;
