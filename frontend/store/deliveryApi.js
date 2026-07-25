import { api } from './api';

export const deliveryApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getMyDeliveryProfile: builder.query({
      query: () => '/delivery/me',
      providesTags: ['DeliveryProfile'],
    }),
    updateMyDeliveryProfile: builder.mutation({
      query: (body) => ({ url: '/delivery/me', method: 'PATCH', body }),
      invalidatesTags: ['DeliveryProfile'],
    }),
    updateAvailability: builder.mutation({
      query: (body) => ({ url: '/delivery/me/availability', method: 'PATCH', body }),
      invalidatesTags: ['DeliveryProfile'],
    }),
    uploadDeliveryDocument: builder.mutation({
      query: (formData) => ({ url: '/delivery/me/documents', method: 'POST', body: formData }),
      invalidatesTags: ['DeliveryProfile'],
    }),
    uploadDeliveryPhoto: builder.mutation({
      query: (formData) => ({ url: '/delivery/me/photo', method: 'POST', body: formData }),
      invalidatesTags: ['DeliveryProfile'],
    }),

    listDeliveryRequests: builder.query({
      query: () => '/delivery/requests',
      providesTags: ['DeliveryRequests'],
    }),
    acceptDeliveryRequest: builder.mutation({
      query: (itemId) => ({ url: `/delivery/requests/${itemId}/accept`, method: 'POST' }),
      invalidatesTags: ['DeliveryRequests', 'DeliveryAssigned'],
    }),
    rejectDeliveryRequest: builder.mutation({
      query: (itemId) => ({ url: `/delivery/requests/${itemId}/reject`, method: 'POST' }),
      invalidatesTags: ['DeliveryRequests'],
    }),

    listAssignedDeliveries: builder.query({
      query: () => '/delivery/assigned',
      providesTags: ['DeliveryAssigned'],
    }),
    // Reject a delivery already accepted but not yet picked up — fully cancels it (does not
    // reopen it as a request for other partners), distinct from rejectDeliveryRequest above
    // (which only ever applies to a still-open, unassigned request).
    rejectAssignedDelivery: builder.mutation({
      query: (itemId) => ({ url: `/delivery/assigned/${itemId}/reject`, method: 'POST' }),
      invalidatesTags: ['DeliveryAssigned', 'DeliveryRequests', 'DeliveryHistory'],
    }),
    markPickedUp: builder.mutation({
      query: (itemId) => ({ url: `/delivery/assigned/${itemId}/pickup`, method: 'PATCH' }),
      invalidatesTags: ['DeliveryAssigned'],
    }),
    markDelivered: builder.mutation({
      query: ({ itemId, otp }) => ({ url: `/delivery/assigned/${itemId}/deliver`, method: 'PATCH', body: { otp } }),
      invalidatesTags: ['DeliveryAssigned', 'DeliveryHistory', 'DeliveryProfile'],
    }),

    listDeliveryHistory: builder.query({
      query: () => '/delivery/history',
      providesTags: ['DeliveryHistory'],
    }),
    getDeliveryEarnings: builder.query({
      query: () => '/delivery/earnings',
    }),
    getDeliveryStats: builder.query({
      query: () => '/delivery/stats',
    }),
  }),
});

export const {
  useGetMyDeliveryProfileQuery,
  useUpdateMyDeliveryProfileMutation,
  useUpdateAvailabilityMutation,
  useUploadDeliveryDocumentMutation,
  useUploadDeliveryPhotoMutation,
  useListDeliveryRequestsQuery,
  useAcceptDeliveryRequestMutation,
  useRejectDeliveryRequestMutation,
  useListAssignedDeliveriesQuery,
  useRejectAssignedDeliveryMutation,
  useMarkPickedUpMutation,
  useMarkDeliveredMutation,
  useListDeliveryHistoryQuery,
  useGetDeliveryEarningsQuery,
  useGetDeliveryStatsQuery,
} = deliveryApi;
