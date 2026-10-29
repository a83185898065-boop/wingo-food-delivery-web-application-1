import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/apiBaseUrl.js';

function useGetCurrentUser() {
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  });
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    const handleAuthChange = () => {
      setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    };

    window.addEventListener('authChange', handleAuthChange);
    return () => window.removeEventListener('authChange', handleAuthChange);
  }, []);

  useEffect(() => {
    if (!token) {
      setCurrentUser(null);
      setError(null);
      setIsLoading(false);
      delete axios.defaults.headers.common['Authorization'];
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    const fetchCurrentUser = async () => {
      try {
        const result = await axios.get(`${API_BASE_URL}/api/user/current`, {
          withCredentials: true,
          signal: controller.signal,
        });
        console.log('fetchCurrentUser response:', result);
        console.log('fetchCurrentUser data:', result.data);
        setCurrentUser(result.data?.user ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err?.response?.status === 401) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setCurrentUser(null);
          setError(null);
          return;
        }
        console.error('fetchCurrentUser error:', err);
        if (err?.response) {
          console.log('fetchCurrentUser error response:', err.response.data);
        }
        setError(err);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    fetchCurrentUser();
    return () => controller.abort();
  }, [token]);

  return { currentUser, error, isLoading };
}

export default useGetCurrentUser;