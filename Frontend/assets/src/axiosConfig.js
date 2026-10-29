import axios from 'axios';

// Configure axios globally for the app: send cookies and attach auth header
axios.defaults.withCredentials = true;

// Attach Authorization header from localStorage token if present
function attachAuthHeaderFromStorage() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }
}

attachAuthHeaderFromStorage();

// Interceptor to keep Authorization header in sync with localStorage
axios.interceptors.request.use((config) => {
  const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (t) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${t}`;
  }
  return config;
});

export default axios;
