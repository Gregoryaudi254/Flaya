import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  coordinates: {},
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCoordinates: (state,action) => {
      state.coordinates = action.payload;
    }
  },
});

export const { setCoordinates } = locationSlice.actions;

export default locationSlice.reducer;