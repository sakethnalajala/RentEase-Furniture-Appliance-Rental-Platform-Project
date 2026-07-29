import { api } from './api';

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const orderApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Real checkout: creates a paid, automatically-confirmed Order + OrderItem(s), immediately
    // visible to both the vendor (Orders) and every delivery partner in the order's city
    // (Requests) — not demo data. There is no vendor approval step in this app.
    checkout: builder.mutation({
      query: (body) => ({ url: '/orders/checkout', method: 'POST', body }),
      invalidatesTags: ['MyOrders', 'Cart'],
    }),
    listMyOrders: builder.query({
      query: () => '/orders/my',
      providesTags: ['MyOrders'],
      // Tag invalidation (checkout/cancel above) already forces a refetch the moment this
      // session's own orders actually change, so a longer cache lifetime only ever helps —
      // navigating back to Orders/Rentals within a few minutes is instant instead of an
      // unnecessary reload of data nothing has touched.
      keepUnusedDataFor: 300,
    }),
    listMyOrderItems: builder.query({
      query: (params) => `/orders/my/items${buildQueryString(params)}`,
      providesTags: ['MyOrders'],
      keepUnusedDataFor: 300,
    }),
    listMyPayments: builder.query({
      query: () => '/orders/my/payments',
      providesTags: ['MyOrders'],
      keepUnusedDataFor: 300,
    }),
    getOrder: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: ['MyOrders'],
      keepUnusedDataFor: 300,
    }),
    cancelOrderItem: builder.mutation({
      query: ({ itemId, reason }) => ({ url: `/orders/items/${itemId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['MyOrders'],
    }),

    // Vendor side — view-only, no approve/reject action: orders auto-confirm at checkout.
    listVendorOrderItems: builder.query({
      query: (params) => `/orders/vendor/my${buildQueryString(params)}`,
      providesTags: ['VendorOrders'],
      keepUnusedDataFor: 300,
    }),
  }),
});

export const {
  useCheckoutMutation,
  useListMyOrdersQuery,
  useListMyOrderItemsQuery,
  useListMyPaymentsQuery,
  useGetOrderQuery,
  useCancelOrderItemMutation,
  useListVendorOrderItemsQuery,
} = orderApi;
