import { createSlice } from '@reduxjs/toolkit';

const loadPersistedCity = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('rentease_city');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const citySlice = createSlice({
  name: 'city',
  initialState: {
    selectedCity: loadPersistedCity(), // { id, name, state } | null
  },
  reducers: {
    setSelectedCity(state, action) {
      state.selectedCity = action.payload;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('rentease_city', JSON.stringify(action.payload));
      }
    },
  },
});

export const { setSelectedCity } = citySlice.actions;
export default citySlice.reducer;
