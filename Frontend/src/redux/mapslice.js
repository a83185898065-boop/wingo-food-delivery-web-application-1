import {createSlice,current} from '@reduxjs/toolkit';

const mapSlice = createSlice({
  name: 'map',
  initialState: {		
	location: {
		latitude: null,
		longitude: null,
	},
},	
reducers: {
	setlocation: (state, action) => {
		const { latitude, longitude } = action.payload;
		state.location.latitude = latitude;
		state.location.longitude = longitude;
	},
	setAddress: (state, action) => {
		const { address, latitude, longitude } = action.payload;
		state.location.latitude = latitude;
		state.location.longitude = longitude;
	}
}

});

export const { setlocation, setAddress } = mapSlice.actions;
export default mapSlice.reducer;	