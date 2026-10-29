
import { createSlice } from '@reduxjs/toolkit';

const UserSlice = createSlice({
  name: 'user',

  initialState: {
    userData: null,
    currentUser: null,
    currentStatus: null,
    currentAddress: null,
    shopInMycity: null,
    itemsInMycity: null,
    cartItems: [],
  },

  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload;
    },

    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },

    setCurrentStatus: (state, action) => {
      state.currentStatus = action.payload;
    },

    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload;
    },

    setShopInMycity: (state, action) => {
      state.shopInMycity = action.payload;
    },

    setItemsInMycity: (state, action) => {
      state.itemsInMycity = action.payload;
    },

    setCartItems: (state, action) => {
      state.cartItems = action.payload;
    },

    addToCart: (state, action) => {
      const cartItem = action.payload;

      const existing = state.cartItems.find(
        (item) => item.id === cartItem.id
      );

      if (existing) {
        existing.quantity += cartItem.quantity ?? 1;
      } else {
        state.cartItems.push({
          ...cartItem,
          quantity: cartItem.quantity ?? 1,
        });
      }
    },
  },
});

export const {
  setUserData,
  setCurrentUser,
  setCurrentStatus,
  setCurrentAddress,
  setShopInMycity,
  setItemsInMycity,
  setCartItems,
  addToCart,
} = UserSlice.actions;

export default UserSlice.reducer;
