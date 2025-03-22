import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  viewstatus: '',
};

const profileViewSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    setValues: (state,action) => {
      state.viewstatus = action.payload;
    }
  },
});

export const { setValues } = profileViewSlice.actions;

export default profileViewSlice.reducer;