import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  products: [], // assuming this is where your messages are stored
};

const sellerproductsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setProducts(state, action) {
      state.products = action.payload;
    },
    addProduct(state, action) {
        console.log('here')
        state.products.unshift(action.payload);
      },
    removeProduct(state, action) {
      state.products = state.products.filter(product => product.id !== action.payload);
    },
    editProduct(state, action) {
      const { id, newContent } = action.payload;
      const productIndex = state.products.findIndex(product => product.id === id);
      if (productIndex !== -1) {
        state.products[productIndex] = {
          ...state.products[productIndex],
          ...newContent,
        };
      }
    },
  },
});

export const { setProducts,addProduct, removeProduct, editProduct } = sellerproductsSlice.actions;
export default sellerproductsSlice.reducer;
