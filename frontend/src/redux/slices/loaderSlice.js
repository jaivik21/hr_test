import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  loading: false,
  loadingText: '',
};

const loaderSlice = createSlice({
  name: 'loader',
  initialState,
  reducers: {
    setLoadingState: (state, action) => {
      state.loading = action.payload;
    },
    setLoadingText: (state, action) => {
      state.loadingText = action.payload;
    },
  },
});

export const { setLoadingState, setLoadingText } = loaderSlice.actions;

export default loaderSlice.reducer;
