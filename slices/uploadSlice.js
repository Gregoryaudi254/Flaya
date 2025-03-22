import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  uploadProgress: 0,
  uploadingItem: null,
  isUploading: false,
};

const uploadSlice = createSlice({
  name: 'upload',
  initialState,
  reducers: {
    startUpload: (state, action) => {
      state.uploadingItem = action.payload;
      state.isUploading = true;
      state.uploadProgress = 0;
    },
    updateProgress: (state, action) => {
      state.uploadProgress = action.payload;
    },
    finishUpload: (state) => {
      state.isUploading = false;
      state.uploadingItem = null;
      state.uploadProgress = 0;
    },
  },
});

export const { startUpload, updateProgress, finishUpload } = uploadSlice.actions;
export default uploadSlice.reducer;