// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey:import.meta.env.VITE_FIREBASE_APIKEY,
  authDomain: "wingoo-8bf2e.firebaseapp.com",
  projectId: "wingoo-8bf2e",
  storageBucket: "wingoo-8bf2e.firebasestorage.app",
  messagingSenderId: "359290309837",
  appId: "1:359290309837:web:c3aac294bd4437c4af6d84"
};  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
export { app, auth, googleProvider }