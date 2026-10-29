import React, { useState } from 'react';
import Nav from '../components/Nav.jsx';
import UserDashbord from '../components/UserDashbord.jsx';
import OwnerDashbord from '../components/OwnerDashbord.jsx';
import DeliveryBoy from '../components/DeliveryBoy.jsx';
import { navigateTo } from '../utils/router.js';
import './Home.css';

function Home({ currentUser, page = 'home' }) {
  const [cartCount, setCartCount] = useState(0);
  const [location, setLocation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const customerPanel =
    page === 'cart' || page === 'checkout' || page === 'orders' ? page : null;
  const role = currentUser?.role || 'user';
  const normalizedRole = String(role).toLowerCase().replace(/[\s_-]/g, '');
  if (normalizedRole === 'owner') {
    return <OwnerDashbord user={currentUser} />;
  }

  const Dashboard =
    normalizedRole === 'deliveryboy' || normalizedRole === 'deliverypartner'
      ? DeliveryBoy
      : UserDashbord;

  return (
    <div className="app-shell">
      <Nav
        cartCount={cartCount}
        onCartClick={() => navigateTo('/cart')}
        onLocationChange={setLocation}
        onOrdersClick={() => navigateTo('/orders')}
        onSearchChange={setSearchTerm}
        role={role}
        user={currentUser}
        userName={currentUser?.fullName || currentUser?.name || 'Guest'}
      />
      <main className="app-main">
        <Dashboard
          activePanel={customerPanel}
          onCartCountChange={setCartCount}
          onPanelChange={(panel) => navigateTo(panel ? `/${panel}` : '/home')}
          location={location}
          searchTerm={searchTerm}
          user={currentUser}
        />
      </main>
    </div>
  );
}

export default Home;