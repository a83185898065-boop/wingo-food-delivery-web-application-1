import { createSlice } from "@reduxjs/toolkit";
const userslice = createSlice({
  name: 'user',
  initialState: {
    // initial state for user slice
        userData: null,

  },
  reducers: {
    // reducer functions
      setUserData: (state, action) => {
      state.userData = action.payload;
    }
  }
});
export const { setUserData } = userslice.actions;
export default userslice.reducer;