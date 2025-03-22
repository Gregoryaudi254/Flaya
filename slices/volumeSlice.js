import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  ismute: true,
};

const volumeSlice = createSlice({
  name: 'volume',
  initialState,
  reducers: {
    setVolume: (state,action) => {
      state.ismute = action.payload;
    }
  },
});

export const { setVolume } = volumeSlice.actions;

export default volumeSlice.reducer;