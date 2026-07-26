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
    // Real checkout: creates a paid Order + OrderItem(s), immediately visible to the vendor
    // (Orders) and, once the vendor confirms, to a delivery partner (Requests) — not demo data.
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
    getOrder: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: ['MyOrders'],
      keepUnusedDataFor: 300,
    }),
    cancelOrderItem: builder.mutation({
      query: ({ itemId, reason }) => ({ url: `/orders/items/${itemId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['MyOrders'],
    }),

    // Vendor side
    listVendorOrderItems: builder.query({
      query: (params) => `/orders/vendor/my${buildQueryString(params)}`,
      providesTags: ['VendorOrders'],
      keepUnusedDataFor: 300,
    }),
    updateVendorItemStatus: builder.mutation({
      query: ({ itemId, action, note }) => ({
        url: `/orders/vendor/items/${itemId}/status`,
        method: 'PATCH',
        body: { action, note },
      }),
      invalidatesTags: ['VendorOrders'],
    }),
  }),
});

export const {
  useCheckoutMutation,
  useListMyOrdersQuery,
  useListMyOrderItemsQuery,
  useGetOrderQuery,
  useCancelOrderItemMutation,
  useListVendorOrderItemsQuery,
  useUpdateVendorItemStatusMutation,
} = orderApi;
