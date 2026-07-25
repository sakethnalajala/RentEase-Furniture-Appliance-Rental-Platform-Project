import { api } from './api';

export const notificationApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query({
      query: () => '/notifications',
      providesTags: ['Notifications'],
    }),
    getUnreadNotificationCount: builder.query({
      query: () => '/notifications/unread-count',
      providesTags: ['Notifications'],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: '/notifications/read-all', method: 'PATCH' }),
      invalidatesTags: ['Notifications'],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Notifications'],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
} = notificationApi;
