import { api } from './api';

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const vendorApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyVendorProfile: builder.query({
      query: () => '/vendors/me',
      providesTags: ['VendorProfile'],
    }),
    updateMyVendorProfile: builder.mutation({
      query: (body) => ({ url: '/vendors/me', method: 'PATCH', body }),
      invalidatesTags: ['VendorProfile'],
    }),
    // `type` is 'profilePhoto' | 'coverImage' | 'logo' — one endpoint for all three image slots.
    uploadVendorImage: builder.mutation({
      query: ({ type, formData }) => ({ url: `/vendors/me/image?type=${type}`, method: 'POST', body: formData }),
      invalidatesTags: ['VendorProfile'],
    }),
    getMyVendorStats: builder.query({
      query: (params) => `/vendors/me/stats${buildQueryString(params)}`,
      providesTags: ['VendorProfile'],
    }),
    // Vendor's own catalog — same public /products endpoint the customer Browse page uses,
    // scoped with the `vendor` filter so a vendor only ever sees their own inventory.
    listMyProducts: builder.query({
      query: (params) => `/products${buildQueryString(params)}`,
      keepUnusedDataFor: 600,
    }),
    listMySubCategories: builder.query({
      query: (params) => `/products/subcategories${buildQueryString(params)}`,
      keepUnusedDataFor: 3600,
    }),
    getVendorProduct: builder.query({
      query: (id) => `/products/${id}`,
      keepUnusedDataFor: 600,
    }),
    listVendorCategories: builder.query({
      query: () => '/categories',
      keepUnusedDataFor: 3600,
    }),
    // Delivery Partner Management (Vendor side) — real fleet + per-partner performance/reviews.
    listVendorDeliveryPartners: builder.query({
      query: (params) => `/vendors/me/delivery-partners${buildQueryString(params)}`,
      providesTags: ['VendorDeliveryPartners'],
    }),
    getVendorDeliveryAnalytics: builder.query({
      query: (params) => `/vendors/me/delivery-analytics${buildQueryString(params)}`,
      providesTags: ['VendorDeliveryPartners'],
    }),
    // Rental Requests: real, persisted Approve/Decline decisions keyed by the mock request's own
    // stable id (see mockVendorData.js's buildRentalRequests) — {requestId: 'approved'|'declined'}.
    listRentalRequestDecisions: builder.query({
      query: () => '/vendors/me/rental-requests/decisions',
      providesTags: ['RentalRequestDecisions'],
    }),
    decideRentalRequest: builder.mutation({
      query: ({ requestId, action }) => ({ url: `/vendors/me/rental-requests/${requestId}/decide`, method: 'POST', body: { action } }),
      invalidatesTags: ['RentalRequestDecisions'],
    }),
  }),
});

export const {
  useGetMyVendorProfileQuery,
  useUpdateMyVendorProfileMutation,
  useUploadVendorImageMutation,
  useGetMyVendorStatsQuery,
  useListMyProductsQuery,
  useListMySubCategoriesQuery,
  useGetVendorProductQuery,
  useListVendorCategoriesQuery,
  useListVendorDeliveryPartnersQuery,
  useGetVendorDeliveryAnalyticsQuery,
  useListRentalRequestDecisionsQuery,
  useDecideRentalRequestMutation,
} = vendorApi;
