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
    }),
    listMyOrderItems: builder.query({
      query: (params) => `/orders/my/items${buildQueryString(params)}`,
      providesTags: ['MyOrders'],
    }),
    getOrder: builder.query({
      query: (id) => `/orders/${id}`,
      providesTags: ['MyOrders'],
    }),
    cancelOrderItem: builder.mutation({
      query: ({ itemId, reason }) => ({ url: `/orders/items/${itemId}/cancel`, method: 'POST', body: { reason } }),
      invalidatesTags: ['MyOrders'],
    }),

    // Vendor side
    listVendorOrderItems: builder.query({
      query: (params) => `/orders/vendor/my${buildQueryString(params)}`,
      providesTags: ['VendorOrders'],
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
