import { createSlice } from '@reduxjs/toolkit';

// Shared in-memory "checkout draft" so Cart and Product Detail can both hand off to the
// Checkout page without losing data. Persisted to sessionStorage (not localStorage — a
// draft shouldn't outlive the tab/session) so a refresh on /customer/checkout doesn't
// strand the user with an empty page.
const STORAGE_KEY = 'rentease_checkout_draft';

const loadPersistedDraft = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: {
    // Each item: { cartItemId, productId, name, image, subCategory, brand, city: {id, name},
    // rentalPlanId, rentalPlanLabel, discountPercent, unitMonthlyRentalPrice, monthlyRentalPrice,
    // securityDeposit, deliveryCharge, installationRequired, estimatedDeliveryDays, quantity }
    items: loadPersistedDraft(),
  },
  reducers: {
    setCheckoutDraft(state, action) {
      state.items = Array.isArray(action.payload) ? action.payload : [];
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
      }
    },
    clearCheckoutDraft(state) {
      state.items = [];
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    },
  },
});

export const { setCheckoutDraft, clearCheckoutDraft } = checkoutSlice.actions;
export default checkoutSlice.reducer;
