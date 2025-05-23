import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  imageUri: null,
  text: '',
  backgroundColor: '#3498db',
  fontIndex: 0,
  fontSizeIndex: 1,
  textColor: '#FFFFFF',
  textAlignment: 'center',
  useGradient: false,
  gradientIndex: 0,
};

export const textImageSlice = createSlice({
  name: 'textImage',
  initialState,
  reducers: {
    setTextImageData: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearTextImageData: (state) => {
      return initialState;
    },
    setImageUri: (state, action) => {
      state.imageUri = action.payload;
    },
  },
});

export const { setTextImageData, clearTextImageData, setImageUri } = textImageSlice.actions;

export const selectTextImageData = (state) => state.textImage;
export const selectImageUri = (state) => state.textImage.imageUri;

export default textImageSlice.reducer; 