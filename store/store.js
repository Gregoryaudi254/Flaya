import { configureStore } from '@reduxjs/toolkit';
import requestmessageReducer from '@/slices/requestmessageSlice';
import sellerproductsReducer from '@/slices/sellerproductsSlice';
import uploadSliceReducer from '@/slices/uploadSlice';
import authReducer from '@/slices/authSlice';
import primarymessageReducer from '@/slices/primaryMessagesSlice'
import profileViewStatusReducer from '@/slices/profileViewSlice'
import dataChangeReducer from '@/slices/dataChangeSlice'
import locationReducer from '@/slices/locationSlice'
import volumeReducer from '@/slices/volumeSlice'
import textImageReducer from '@/slices/textImageSlice'

export const store = configureStore({

  reducer: {
    requestmessages: requestmessageReducer,
    messages:primarymessageReducer,
    products: sellerproductsReducer,
    upload:uploadSliceReducer,
    auth:authReducer,
    profile:profileViewStatusReducer,
    data:dataChangeReducer,
    location:locationReducer,
    volume:volumeReducer,
    textImage:textImageReducer
  },
  
});