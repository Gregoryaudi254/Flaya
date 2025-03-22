import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  requestmessages: [], // assuming this is where your messages are stored
};

const requestmessagesSlice = createSlice({
  name: 'requestmessages',
  initialState,
  reducers: {
    setMessages(state, action) {
      state.requestmessages = action.payload;

      console.log("request set")
    },
    removeMessage(state, action) {
      state.messages = state.requestmessages.filter(message => message.id !== action.payload);
    },
    editMessage(state, action) {
      const { id, newContent } = action.payload;
      const messageIndex = state.requestmessages.findIndex(message => message.id === id);
      if (messageIndex !== -1) {
        state.requestmessages[messageIndex] = {
          ...state.requestmessages[messageIndex],
          ...newContent,
        };
      }
    },
  },
});

export const { setMessages, removeMessage, editMessage } = requestmessagesSlice.actions;
export default requestmessagesSlice.reducer;
