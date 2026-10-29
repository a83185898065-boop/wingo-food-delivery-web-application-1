import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice.js';
import mapReducer from './mapslice.js';

export const store = configureStore({
  reducer: {
    user: userReducer,
    map: mapReducer,
  },
});