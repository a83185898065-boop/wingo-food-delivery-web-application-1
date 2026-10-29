import axios from 'axios';
import { auth, googleProvider } from "../../firebase.js";
import { signInWithPopup } from "firebase/auth";
import { API_BASE_URL } from './utils/apiBaseUrl.js';

// Ensure axios includes credentials (cookies) for cross-origin requests by default
axios.defaults.withCredentials = true;

const API = `${API_BASE_URL}/api/auth`;

export async function signup(data, returnFull = false) {
  const res = await axios.post(`${API}/signup`, data, { withCredentials: true });
  console.log('signup response:', res);
  console.log('signup response data:', res.data);
  const payload = returnFull ? res : res.data;
  const token = payload?.data?.token ?? payload?.token;
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    window.dispatchEvent(new Event('authChange'));
  }
  return payload;
}

export async function signin(data, returnFull = false) {
  const res = await axios.post(`${API}/signin`, data, { withCredentials: true });
  console.log('signin response:', res);
  console.log('signin response data:', res.data);
  const payload = returnFull ? res : res.data;
  const token = payload?.data?.token ?? payload?.token;
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    window.dispatchEvent(new Event('authChange'));
  }
  return payload;
}

export async function signout() {
  const res = await axios.get(`${API}/signout`, { withCredentials: true });
  console.log('signout response:', res);
  console.log('signout response data:', res.data);
  // Clear local token fallback and Authorization header
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
  window.dispatchEvent(new Event('authChange'));
  return res.data;
}

export async function googleSignIn() {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const token = await user.getIdToken();

  // Persist token and attach Authorization header for subsequent API calls.
  localStorage.setItem('token', token);
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  window.dispatchEvent(new Event('authChange'));

  return {
    message: "Signed in with Google successfully",
    token,
    user: {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    },
  };
}
