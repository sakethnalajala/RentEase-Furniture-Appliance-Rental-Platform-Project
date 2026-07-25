import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';
import authReducer from './authSlice';
import cityReducer from './citySlice';
import checkoutReducer from './checkoutSlice';

export function makeStore() {
  return configureStore({
    reducer: {
      [api.reducerPath]: api.reducer,
      auth: authReducer,
      city: cityReducer,
      checkout: checkoutReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });
}
