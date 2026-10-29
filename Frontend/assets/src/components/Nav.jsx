import React, { useEffect, useState } from 'react';
import { FaSearchLocation } from 'react-icons/fa';
import { FaCartShopping } from 'react-icons/fa6';
import { MdLocationPin } from 'react-icons/md';
import { reverseGeocode } from '../utils/reverseGeocode.js';
import './Nav.css';

function Nav({
  userName = 'Wingoo User',
  user,
  role = 'user',
  onOrdersClick,
  onCartClick,
  onLocationChange,
  onSearchChange,
  cartCount = 0,
}) {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationAttempt, setLocationAttempt] = useState(0);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    let isActive = true;

    async function loadCurrentCity() {
      const apiKey = import.meta.env.VITE_GEOAPIKEY;

      if (!navigator.geolocation) {
        console.error('Geoapify error: geolocation unsupported');
        if (isActive) {
          setLocation(null);
          setLocationError('Location is not supported by this browser');
          onLocationChange?.(null);
          setIsLoading(false);
        }
        return;
      }

      let gpsCoordinates = null;
      try {
        const position = await new Promise((resolve, reject) => {
          let bestPosition = null;
          let watchId;
          const finish = (result, error) => {
            clearTimeout(timer);
            if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
            if (error) reject(error);
            else resolve(result);
          };
          const timer = setTimeout(() => {
            if (bestPosition) finish(bestPosition);
            else finish(null, new Error('Could not determine your location.'));
          }, 18000);

          watchId = navigator.geolocation.watchPosition(
            (currentPosition) => {
              if (
                !bestPosition ||
                currentPosition.coords.accuracy < bestPosition.coords.accuracy
              ) {
                bestPosition = currentPosition;
              }
              if (currentPosition.coords.accuracy <= 1000) finish(currentPosition);
            },
            (error) => {
              if (bestPosition) finish(bestPosition);
              else finish(null, error);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 0,
            }
          );
        });

        const { latitude, longitude } = position.coords;
        const coordinates = {
          latitude: Number(latitude.toFixed(5)),
          longitude: Number(longitude.toFixed(5)),
          accuracy: Math.round(position.coords.accuracy),
        };
        gpsCoordinates = coordinates;
        const coordinateLocation = { ...coordinates, city: '', state: '', country: '' };
        if (isActive) {
          setLocation(coordinateLocation);
          onLocationChange?.(coordinateLocation);
        }

        const place = await reverseGeocode(
          latitude,
          longitude,
          apiKey,
        );
        const hasCityLevelAccuracy = position.coords.accuracy <= 5000;
        const detectedLocation = {
          ...coordinates,
          city: hasCityLevelAccuracy ? place.city : '',
          area: place.area,
          state: place.state,
          country: place.country,
          formatted: place.formatted,
        };
        if (isActive) {
          setLocation(detectedLocation);
          setLocationError(`GPS accuracy ±${coordinates.accuracy}m`);
          onLocationChange?.(detectedLocation);
        }
      } catch (error) {
        console.error('Current location lookup failed:', error);
        if (isActive) {
          if (error.code === 1 || error.code === 2 || error.code === 3) {
            setLocation(null);
            setLocationError(
              error.code === 1
                ? 'Allow location access in browser settings'
                : error.code === 3
                  ? 'Location request timed out'
                  : 'Could not determine your location'
            );
            onLocationChange?.(null);
          } else if (gpsCoordinates) {
            setLocation({
              ...gpsCoordinates,
              city: '',
              state: '',
              country: '',
              formatted: '',
            });
            setLocationError('Place name unavailable. Tap to retry');
            onLocationChange?.({
              ...gpsCoordinates,
              city: '',
              state: '',
              country: '',
              formatted: '',
            });
          } else {
            setLocation(null);
            setLocationError('Could not detect your city');
            onLocationChange?.(null);
          }
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    }

    setIsLoading(true);
    setLocationError('');
    loadCurrentCity();
    return () => {
      isActive = false;
    };
  }, [locationAttempt, onLocationChange]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('authChange'));
    window.location.href = '/signin';
  };

  const styles = {
    header: {
      background: '#fff5f1',
      padding: '16px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    },
    container: {
      maxWidth: 1120,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      flexWrap: 'wrap',
    },
    logo: {
      fontSize: 24,
      fontWeight: 700,
      color: '#ff4d2d',
    },
    centerGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    location: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      borderRadius: 9999,
      border: '1px solid #e5e7eb',
      background: '#fff',
      padding: '10px 16px',
      fontSize: 14,
      color: '#374151',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    locationButton: {
      border: 0,
      padding: 0,
      background: 'transparent',
      color: '#374151',
      cursor: 'pointer',
      font: 'inherit',
    },
    search: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      borderRadius: 9999,
      border: '1px solid #e5e7eb',
      background: '#fff',
      padding: '10px 16px',
      flex: 1,
      minWidth: 220,
      maxWidth: 520,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    },
    searchInput: {
      flex: 1,
      border: 'none',
      outline: 'none',
      background: 'transparent',
      fontSize: 14,
      color: '#374151',
    },
    ordersButton: {
      borderRadius: 9999,
      border: '1px solid #fb923c',
      background: '#fb923c',
      color: '#fff',
      padding: '10px 16px',
      fontWeight: 700,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    },
    cart: {
      position: 'relative',
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: '#fde68a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      top: -6,
      right: -6,
      minWidth: 18,
      height: 18,
      borderRadius: 9999,
      background: '#fb923c',
      color: '#fff',
      fontSize: 10,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 5px',
    },
    profileWrapper: {
      position: 'relative',
    },
    profileButton: {
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: '#fb923c',
      color: '#fff',
      border: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      cursor: 'pointer',
    },
    dropdown: {
      position: 'absolute',
      right: 0,
      marginTop: 10,
      width: 'min(280px, calc(100vw - 32px))',
      borderRadius: 18,
      boxShadow: '0 20px 50px rgba(0,0,0,0.08)',
      background: '#fff',
      border: '1px solid #e5e7eb',
      zIndex: 10,
    },
    dropdownHeader: {
      padding: '14px 16px',
      borderBottom: '1px solid #f3f4f6',
      color: '#111827',
    },
    profileDetail: {
      margin: '7px 0 0',
      color: '#6b7280',
      fontSize: 12,
      overflowWrap: 'anywhere',
    },
    logoutButton: {
      width: '100%',
      padding: '12px 16px',
      textAlign: 'left',
      background: 'transparent',
      border: 'none',
      color: '#dc2626',
      fontWeight: 700,
      cursor: 'pointer',
    },
  };

  return (
    <header className="customer-nav" style={styles.header}>
      <div className="customer-nav__container" style={styles.container}>
        <div className="customer-nav__logo" style={styles.logo}>Wingoo</div>

        <div className="customer-nav__center" style={styles.centerGroup}>
          <div className="customer-nav__location" style={styles.location}>
            <MdLocationPin size={18} color="#fb923c" />
            <button
              aria-label={
                isLoading
                  ? 'Detecting your location'
                  : `Current location: ${location?.city || location?.formatted || locationError || 'unavailable'}. Retry location detection`
              }
              disabled={isLoading}
              onClick={() => setLocationAttempt((attempt) => attempt + 1)}
              style={styles.locationButton}
              title={
                location?.latitude != null
                  ? `GPS: ${location.latitude}, ${location.longitude} (accuracy ±${location.accuracy}m)`
                  : undefined
              }
              type="button"
            >
              {isLoading
                ? 'Detecting city...'
                : location?.city
                  ? [location.area, location.city, location.state]
                      .filter((part, index, parts) =>
                        part &&
                        parts.findIndex(
                          (candidate) =>
                            candidate?.toLocaleLowerCase() === part.toLocaleLowerCase()
                        ) === index
                      )
                      .join(', ')
                  : location?.formatted
                    ? location.formatted
                  : location?.latitude != null && location?.longitude != null
                    ? `${locationError || 'Place name unavailable'} · Retry`
                    : `${locationError || 'Location unavailable'} · Retry`}
            </button>
          </div>

          <div className="customer-nav__search" style={styles.search}>
            <FaSearchLocation color="#9ca3af" />
            <input
              aria-label="Search food and restaurants"
              onChange={(event) => onSearchChange?.(event.target.value)}
              type="text"
              placeholder="search delicious food..."
              style={styles.searchInput}
            />
          </div>
        </div>

        <div className="customer-nav__actions" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button className="customer-nav__orders" type="button" style={styles.ordersButton} onClick={onOrdersClick}>
            My Orders
          </button>

          <button
            aria-label={`Open cart, ${cartCount} items`}
            onClick={onCartClick}
            className="customer-nav__cart"
            style={{ ...styles.cart, border: 0, cursor: 'pointer' }}
            type="button"
          >
            <FaCartShopping size={20} color="#c2410c" />
            {cartCount > 0 && <span style={styles.badge}>{cartCount}</span>}
          </button>

          <div className="customer-nav__profile" style={styles.profileWrapper}>
            <button
              aria-label="Open profile"
              aria-expanded={open}
              aria-haspopup="menu"
              type="button"
              style={styles.profileButton}
              onClick={() => setOpen((prev) => !prev)}
            >
              {userName?.charAt(0)?.toUpperCase() || 'W'}
            </button>

            {open && (
              <div aria-label="Profile menu" role="menu" style={styles.dropdown}>
                <div style={styles.dropdownHeader}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {user?.fullName || user?.name || userName}
                  </div>
                  <p style={styles.profileDetail}>Email: {user?.email || 'Not provided'}</p>
                  <p style={styles.profileDetail}>Mobile: {user?.mobile || 'Not provided'}</p>
                  <p style={styles.profileDetail}>Account type: {user?.role || role}</p>
                </div>
                <button
                  role="menuitem"
                  type="button"
                  style={styles.logoutButton}
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Nav;
