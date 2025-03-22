import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [], // assuming this is where your messages are stored
};

const primarymessagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setMessages(state, action) {
      state.messages = action.payload;

      console.log("message set")
    },
    removeMessage(state, action) {
      state.messages = state.messages.filter(message => message.id !== action.payload);
    },
    editMessage(state, action) {
      const { id, newContent } = action.payload;
      const messageIndex = state.messages.findIndex(message => message.id === id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...newContent,
        };
      }
    },
  },
});

export const { setMessages, removeMessage, editMessage } = primarymessagesSlice.actions;
export default primarymessagesSlice.reducer;