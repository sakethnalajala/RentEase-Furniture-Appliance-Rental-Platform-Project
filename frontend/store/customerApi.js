import { api } from './api';

function buildQueryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const customerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Categories/products/subcategories change rarely relative to how often the same
    // arg-sets get requested again (Dashboard rows, Browse filters, collection rails all
    // overlap heavily) — a longer cache lifetime means navigating back to a view you already
    // loaded this session is instant instead of re-fetching, without needing a custom cache
    // layer on top of RTK Query's own.
    listCategories: builder.query({
      query: () => '/categories',
      keepUnusedDataFor: 3600,
    }),

    listProducts: builder.query({
      query: (params) => `/products${buildQueryString(params)}`,
      keepUnusedDataFor: 600,
    }),

    listSubCategories: builder.query({
      query: (params) => `/products/subcategories${buildQueryString(params)}`,
      keepUnusedDataFor: 3600,
    }),

    getProduct: builder.query({
      query: (id) => `/products/${id}`,
      keepUnusedDataFor: 600,
    }),

    getWishlist: builder.query({
      query: () => '/wishlist',
      providesTags: ['Wishlist'],
    }),
    addToWishlist: builder.mutation({
      query: (productId) => ({ url: `/wishlist/${productId}`, method: 'POST' }),
      invalidatesTags: ['Wishlist'],
    }),
    removeFromWishlist: builder.mutation({
      query: (productId) => ({ url: `/wishlist/${productId}`, method: 'DELETE' }),
      invalidatesTags: ['Wishlist'],
    }),

    getCart: builder.query({
      query: () => '/cart',
      providesTags: ['Cart'],
    }),
    addToCart: builder.mutation({
      query: (body) => ({ url: '/cart', method: 'POST', body }),
      invalidatesTags: ['Cart'],
    }),
    updateCartItem: builder.mutation({
      query: ({ itemId, ...body }) => ({ url: `/cart/${itemId}`, method: 'PATCH', body }),
      invalidatesTags: ['Cart'],
    }),
    removeCartItem: builder.mutation({
      query: (itemId) => ({ url: `/cart/${itemId}`, method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation({
      query: () => ({ url: '/cart', method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),

    listAddresses: builder.query({
      query: () => '/addresses',
      providesTags: ['Addresses'],
    }),
    createAddress: builder.mutation({
      query: (body) => ({ url: '/addresses', method: 'POST', body }),
      invalidatesTags: ['Addresses'],
    }),
    updateAddress: builder.mutation({
      query: ({ id, ...body }) => ({ url: `/addresses/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Addresses'],
    }),
    deleteAddress: builder.mutation({
      query: (id) => ({ url: `/addresses/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Addresses'],
    }),
  }),
});

export const {
  useListCategoriesQuery,
  useListProductsQuery,
  useListSubCategoriesQuery,
  useGetProductQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
  useListAddressesQuery,
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
} = customerApi;
