import axios from 'axios';
import { auth, googleProvider } from "../../firebase.js";
import { signInWithPopup } from "firebase/auth";
import { API_BASE_URL } from './utils/apiBaseUrl.js';

// Axios configuration
axios.defaults.withCredentials = true;

const API = `${API_BASE_URL}/api/auth`;

// Signup with email/password
export async function signup(data, returnFull = false) {
  try {
    const res = await axios.post(
      `${API}/signup`,
      data,
      { withCredentials: true }
    );

    console.log('Signup response:', res.data);

    const payload = returnFull ? res : res.data;
    const token = payload?.data?.token ?? payload?.token;

    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      window.dispatchEvent(new Event('authChange'));
    }

    return payload;
  } catch (error) {
    console.error('Signup Error:', error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      'Signup failed'
    );
  }
}

// Signin with email/password
export async function signin(data, returnFull = false) {
  try {
    const res = await axios.post(
      `${API}/signin`,
      data,
      { withCredentials: true }
    );

    console.log('Signin response:', res.data);

    const payload = returnFull ? res : res.data;
    const token = payload?.data?.token ?? payload?.token;

    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      window.dispatchEvent(new Event('authChange'));
    }

    return payload;
  } catch (error) {
    console.error('Signin Error:', error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      'Signin failed'
    );
  }
}

// Signout
export async function signout() {
  try {
    const res = await axios.get(
      `${API}/signout`,
      { withCredentials: true }
    );

    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    window.dispatchEvent(new Event('authChange'));

    console.log('Signout response:', res.data);
    return res.data;
  } catch (error) {
    console.error('Signout Error:', error);
    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      'Signout failed'
    );
  }
}

// Google Signin / Signup
export async function googleSignIn() {
  try {
    // 1. Open Google authentication popup
    const credential = await signInWithPopup(auth, googleProvider);
    const firebaseUser = credential.user;

    // 2. Get Firebase ID token
    const idToken = await firebaseUser.getIdToken();

    // 3. Send Firebase token to Wingoo backend
    const res = await axios.post(
      `${API}/google`,
      { idToken },
      { withCredentials: true }
    );

    console.log('Google authentication response:', res.data);

    // 4. Get Wingoo JWT token
    const payload = res.data;
    const appToken = payload?.data?.token ?? payload?.token;

    if (!appToken) {
      throw new Error(
        'Wingoo backend did not return an authentication token'
      );
    }

    // 5. Save Wingoo JWT token
    localStorage.setItem('token', appToken);

    axios.defaults.headers.common['Authorization'] =
      `Bearer ${appToken}`;

    window.dispatchEvent(new Event('authChange'));

    return {
      ...payload,
      token: appToken,
      message: payload?.message || 'Google authentication successful'
    };

  } catch (error) {
    console.error('Google Signin Error:', error);

    throw new Error(
      error?.response?.data?.message ||
      error.message ||
      'Google sign-in failed'
    );
  }
}
