
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { setUserData } from "./redux/user.Slice.js";
import {
  setAddress,
  setlocation,
} from "./redux/mapslice.js";

function useGetCity() {
  const dispatch = useDispatch();
  const apiKey = import.meta.env.VITE_GEOAPIKEY;

  useEffect(() => {
    if (!apiKey) {
      console.error("Geoapify API key is missing.");
      return;
    }

    if (!navigator.geolocation) {
      console.error("Geolocation is not supported by this browser.");
      return;
    }

    const getCity = async (position) => {
      try {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        dispatch(setlocation({ latitude, longitude }));

        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch address.");
        }

        const data = await response.json();
        const place = data.results?.[0];

        if (!place) {
          throw new Error("No address found for this location.");
        }

        dispatch(
          setUserData({
            city:
              place.city ||
              place.town ||
              place.village ||
              "",
            state: place.state || "",
            country: place.country || "",
          })
        );

        dispatch(
          setAddress({
            address: place.formatted || "",
            latitude,
            longitude,
          })
        );
      } catch (error) {
        console.error("Location error:", error.message);
      }
    };

    const handleError = (error) => {
      console.error("Unable to get location:", error.message);
    };

    navigator.geolocation.getCurrentPosition(
      getCity,
      handleError,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, [dispatch, apiKey]);
}

export default useGetCity;
