import React, { useEffect, useMemo, useState } from 'react';
import SignUp from './signUp.jsx';
import SignIn from './signin.jsx';
import ForgetPassword from './forgetpassword.jsx';
import Home from './pages/Home.jsx';
import VideoLoader from './components/VideoLoader.jsx';
import useGetCurrentUser from './hook.js/usergetcurrent.jsx';
import { API_BASE_URL } from './utils/apiBaseUrl.js';
import { getRouteFromPathname, navigateTo } from './utils/router.js';

export const serverUrl = API_BASE_URL;

function App() {
  const { currentUser, error, isLoading } = useGetCurrentUser();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const [page, setPage] = useState(() => getRouteFromPathname(window.location.pathname));

  useEffect(() => {
    const handleRouteChange = () => setPage(getRouteFromPathname(window.location.pathname));
    window.addEventListener('routechange', handleRouteChange);
    window.addEventListener('popstate', handleRouteChange);
    return () => {
      window.removeEventListener('routechange', handleRouteChange);
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, []);

  const isAuthenticated = Boolean(token);

  if (['home', 'cart', 'checkout', 'orders'].includes(page) && !isAuthenticated) {
    navigateTo('/signin');
    return null;
  }

  if (isAuthenticated && (page === 'signin' || page === 'signup' || page === 'forget-password')) {
    navigateTo('/home');
    return null;
  }

  if (error) {
    console.error('Unable to fetch current user:', error);
  }

  if (['home', 'cart', 'checkout', 'orders'].includes(page) && isLoading) {
    return <VideoLoader />;
  }

  return (
    <>
      <div style={{ paddingTop: 0 }}>
        {page === 'signup' && <SignUp currentUser={currentUser} />}
        {page === 'signin' && <SignIn currentUser={currentUser} />}
        {page === 'forget-password' && <ForgetPassword currentUser={currentUser} />}
        {['home', 'cart', 'checkout', 'orders'].includes(page) && (
          <Home currentUser={currentUser} page={page} />
        )}
      </div>
    </>
  );
}

export default App;