import React, { useEffect, useState } from 'react';
import { FaMapMarkerAlt, FaMotorcycle, FaTasks } from 'react-icons/fa';
import axios from '../axiosConfig.js';
import { reverseGeocode } from '../utils/reverseGeocode.js';
import { API_BASE_URL } from '../utils/apiBaseUrl.js';
import './DeliveryBoy.css';

function DeliveryBoy({ user }) {
  const name = user?.fullName || user?.name || 'Delivery Partner';
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [city, setCity] = useState(user?.city || '');
  const [state, setState] = useState(user?.state || '');
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [locationError, setLocationError] = useState('');
  const [acceptingOrderId, setAcceptingOrderId] = useState('');
  const [acceptError, setAcceptError] = useState('');
  const [trackingError, setTrackingError] = useState('');
  const [ordersRefreshKey, setOrdersRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this browser.');
      return () => {
        isMounted = false;
      };
    }

    setLocationMessage('Detecting your current location…');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = await reverseGeocode(
            coords.latitude,
            coords.longitude,
            import.meta.env.VITE_GEOAPIKEY
          );
          if (!place.city || !place.state) {
            throw new Error('Current location did not include a city and state.');
          }

          const response = await axios.patch(
            `${API_BASE_URL}/api/user/delivery-location`,
            { city: place.city, state: place.state }
          );
          if (isMounted) {
            setCity(response.data.location.city);
            setState(response.data.location.state);
            setLocationMessage(
              `Location updated automatically: ${place.city}, ${place.state}.`
            );
            setLocationError('');
          }
        } catch (error) {
          console.error(
            'Automatic delivery location update failed:',
            error.response?.data || error.message
          );
          if (isMounted) {
            setLocationMessage('');
            setLocationError(
              error.response?.data?.message ||
                'Could not detect your location. You can enter your delivery area below.'
            );
          }
        }
      },
      (error) => {
        if (!isMounted) return;
        setLocationMessage('');
        setLocationError(
          error.code === 1
            ? 'Allow location access to update your delivery area automatically.'
            : 'Could not detect your location. You can enter your delivery area below.'
        );
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
    );

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadOrders = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/order/delivery/mine`
        );
        if (isMounted) {
          setOrders(response.data.orders || []);
          setLoadError('');
        }
      } catch (error) {
        console.error(
          'GET /api/order/delivery/mine error:',
          error.response?.data || error.message
        );
        if (isMounted) {
          setLoadError(
            error.response?.data?.message || 'Could not load assigned deliveries.'
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadOrders();
    const ordersInterval = window.setInterval(loadOrders, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(ordersInterval);
    };
  }, [ordersRefreshKey]);

  const activeOrderIds = orders
    .filter(
      (order) =>
        order.status === 'out_for_delivery' &&
        order.assignment?.status === 'assigned' &&
        order.assignment?.assignedTo
    )
    .map((order) => order._id)
    .join(',');

  useEffect(() => {
    if (!activeOrderIds) {
      setTrackingError('');
      return undefined;
    }
    if (!navigator.geolocation) {
      setTrackingError('Live location is not supported by this browser.');
      return undefined;
    }

    const orderIds = activeOrderIds.split(',');
    const watchId = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        try {
          await Promise.all(
            orderIds.map((orderId) =>
              axios.patch(
                `${API_BASE_URL}/api/order/delivery/${orderId}/location`,
                {
                  latitude: coords.latitude,
                  longitude: coords.longitude,
                }
              )
            )
          );
          setTrackingError('');
        } catch (error) {
          console.error(
            'Live delivery location update failed:',
            error.response?.data || error.message
          );
          setTrackingError(
            error.response?.data?.message ||
              'Could not share your live location. Check your connection and location permission.'
          );
        }
      },
      (error) => {
        console.error('Live delivery location access failed:', error);
        setTrackingError(
          error.code === 1
            ? 'Allow location access to share your live location with the customer.'
            : 'Could not get your live location. Please check your device settings.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeOrderIds]);

  const saveLocation = async (event) => {
    event.preventDefault();
    setIsSavingLocation(true);
    setLocationMessage('');
    setLocationError('');
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/user/delivery-location`,
        { city: city.trim(), state: state.trim() }
      );
      setCity(response.data.location.city);
      setState(response.data.location.state);
      setLocationMessage(response.data.message);
    } catch (error) {
      console.error(
        'PATCH /api/user/delivery-location error:',
        error.response?.data || error.message
      );
      setLocationError(
        error.response?.data?.message || 'Could not save your delivery location.'
      );
    } finally {
      setIsSavingLocation(false);
    }
  };

  const acceptOrder = async (orderId) => {
    setAcceptingOrderId(orderId);
    setAcceptError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/order/delivery/${orderId}/accept`
      );
      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === response.data.order._id ? response.data.order : order
        )
      );
    } catch (error) {
      console.error(
        'POST delivery acceptance error:',
        error.response?.data || error.message
      );
      setAcceptError(
        error.response?.data?.message || 'Could not accept this delivery.'
      );
    } finally {
      setAcceptingOrderId('');
    }
  };

  return (
    <div className="delivery-dashboard">
      <section className="delivery-welcome">
        <p className="delivery-welcome__eyebrow">Delivery panel</p>
        <h2>Hello, {name}</h2>
        <p>
          Pick up pending orders, navigate quickly, and complete deliveries smoothly.
        </p>
      </section>

      <form className="delivery-location" onSubmit={saveLocation}>
        <div className="delivery-location__heading">
          <FaMapMarkerAlt aria-hidden="true" />
          <div>
            <h3>Delivery area</h3>
            <p>Your location is detected automatically. You can edit the area if needed.</p>
          </div>
        </div>
        <div className="delivery-location__fields">
          <label>
            City
            <input
              maxLength={80}
              onChange={(event) => setCity(event.target.value)}
              required
              value={city}
            />
          </label>
          <label>
            State
            <input
              maxLength={80}
              onChange={(event) => setState(event.target.value)}
              required
              value={state}
            />
          </label>
          <button disabled={isSavingLocation} type="submit">
            {isSavingLocation ? 'Saving…' : 'Save location'}
          </button>
        </div>
        {locationMessage && <p className="delivery-location__success" role="status">{locationMessage}</p>}
        {locationError && <p className="delivery-location__error" role="alert">{locationError}</p>}
        {activeOrderIds && (
          <p className={trackingError ? 'delivery-location__error' : 'delivery-location__success'} role={trackingError ? 'alert' : 'status'}>
            {trackingError || 'Your live location is shared with the customer for your active delivery.'}
          </p>
        )}
      </form>

      <div className="delivery-cards">
        <article className="delivery-card delivery-card--pending">
          <div className="delivery-card__icon delivery-card__icon--orange">
            <FaTasks />
          </div>
          <h3>Pending Orders</h3>
          <p>{orders.length} available or active {orders.length === 1 ? 'delivery' : 'deliveries'}.</p>
        </article>
        <article className="delivery-card">
          <div className="delivery-card__icon delivery-card__icon--blue">
            <FaMapMarkerAlt />
          </div>
          <h3>Route Planner</h3>
          <p>Best path to reach customers faster.</p>
        </article>
        <article className="delivery-card">
          <div className="delivery-card__icon delivery-card__icon--green">
            <FaMotorcycle />
          </div>
          <h3>Active Bike</h3>
          <p>Your current delivery status is online.</p>
        </article>
      </div>

      <section aria-labelledby="delivery-orders-title" className="delivery-orders">
        <div className="delivery-orders__header">
          <h3 id="delivery-orders-title">My Deliveries</h3>
          <div className="delivery-orders__actions">
            <button
              disabled={isLoading}
              onClick={() => {
                setIsLoading(true);
                setOrdersRefreshKey((key) => key + 1);
              }}
              type="button"
            >
              {isLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            <span>{orders.length}</span>
          </div>
        </div>
        {isLoading && <p className="delivery-orders__message">Loading deliveries…</p>}
        {loadError && <p className="delivery-orders__error" role="alert">{loadError}</p>}
        {!isLoading && !loadError && orders.length === 0 && (
          <p className="delivery-orders__message">
            No delivery requests are available yet. Nearby delivery requests will appear here for you to accept.
          </p>
        )}
        {acceptError && <p className="delivery-orders__error" role="alert">{acceptError}</p>}
        {!loadError && orders.map((order) => (
          <article className="delivery-order" key={order._id}>
            <div className="delivery-order__heading">
              <div>
                <h4>{order.shop?.name || 'Restaurant order'}</h4>
                <p>{order.shop?.city}, {order.shop?.state}</p>
              </div>
              <strong>₹{Number(order.total).toFixed(2)}</strong>
            </div>
            <p className="delivery-order__address">
              <FaMapMarkerAlt aria-hidden="true" />
              {order.deliveryAddress || 'Delivery address not provided'}
            </p>
            {order.customer?.fullName && (
              <p className="delivery-order__customer">
                Customer: {order.customer.fullName}
                {order.customer.mobile && (
                  <> · <a href={`tel:${order.customer.mobile}`}>{order.customer.mobile}</a></>
                )}
              </p>
            )}
            <ul>
              {order.items.map((item, index) => (
                <li key={`${item.item || item.name}-${index}`}>
                  {item.name} × {item.quantity}
                </li>
              ))}
            </ul>
            {order.assignment?.status === 'broadcasted' ? (
              <button
                className="delivery-order__accept"
                disabled={acceptingOrderId === order._id}
                onClick={() => acceptOrder(order._id)}
                type="button"
              >
                {acceptingOrderId === order._id ? 'Accepting…' : 'Accept delivery'}
              </button>
            ) : (
              <p className="delivery-order__accepted">
                Accepted by {order.assignment?.assignedTo?.fullName || 'you'}
              </p>
            )}
          </article>
        ))}
      </section>
    </div>
  );
}

export default DeliveryBoy;