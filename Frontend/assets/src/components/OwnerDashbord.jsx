import React, { useEffect, useState } from 'react';
import {
  FaArrowLeft,
  FaClipboardList,
  FaTrash,
  FaEdit,
  FaSignOutAlt,
  FaPlus,
  FaTimes,
  FaUtensils,
  FaUser,
} from 'react-icons/fa';
import { MdLocationPin } from 'react-icons/md';
import axios from '../axiosConfig.js';
import { signout } from '../authService.js';
import { reverseGeocode } from '../utils/reverseGeocode.js';
import { API_BASE_URL } from '../utils/apiBaseUrl.js';
import VideoLoader from './VideoLoader.jsx';
import './OwnerDashbord.css';

const categories = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snacks',
  'Beverages',
  'Desserts',
  'Fast Food',
  'Healthy',
  'Vegan',
  'Vegetarian',
  'Seafood',
  'Grill',
  'Pizza',
  'Pasta',
  'Salads',
  'Soups',
  'Sandwiches',
  'Burgers',
  'Asian',
  'Mexican',
  'Indian',
  'Mediterranean',
  'Others',
];

function OwnerDashbord({ user }) {
  const [shop, setShop] = useState(null);
  const [isLoadingShop, setIsLoadingShop] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activePopup, setActivePopup] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [shopImage, setShopImage] = useState(null);
  const [foodImage, setFoodImage] = useState(null);
  const [shopForm, setShopForm] = useState({ name: '', city: '', state: '' });
  const [foodForm, setFoodForm] = useState({
    name: '',
    category: 'Indian',
    type: 'Veg',
    price: '',
  });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [pendingOrderCount, setPendingOrderCount] = useState(0);
  const [ownerOrders, setOwnerOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [ordersError, setOrdersError] = useState('');
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [activeDeliveryOrderId, setActiveDeliveryOrderId] = useState('');
  const [isLoadingDeliveryBoys, setIsLoadingDeliveryBoys] = useState(false);
  const [deliveryBoysError, setDeliveryBoysError] = useState('');
  const [sendingDeliveryRequestId, setSendingDeliveryRequestId] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [locationStatus, setLocationStatus] = useState('loading');
  const [locationAttempt, setLocationAttempt] = useState(0);

  useEffect(() => {
    let isActive = true;
    const controller = new AbortController();

    const setLocationError = (message, error) => {
      if (error) console.error('Owner current location error:', error);
      if (isActive) {
        setCurrentLocation('');
        setLocationStatus(message);
      }
    };

    if (!navigator.geolocation) {
      setLocationError('Location is not supported by this browser.');
      return () => {
        isActive = false;
        controller.abort();
      };
    }

    setLocationStatus('loading');
    const apiKey = import.meta.env.VITE_GEOAPIKEY;
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const place = await reverseGeocode(
            coords.latitude,
            coords.longitude,
            apiKey,
            controller.signal
          );
          const accuracyLabel =
            coords.accuracy > 5000
              ? ` · approximate (GPS ±${Math.round(coords.accuracy)}m)`
              : '';

          if (isActive) {
            setCurrentLocation(`${place.formatted}${accuracyLabel}`);
            setLocationStatus('ready');
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            setLocationError('Could not find the name of your current location.', error);
          }
        }
      },
      (error) => {
        const message =
          error.code === 1
            ? 'Allow location access in your browser to show your current location.'
            : error.code === 3
              ? 'Location request timed out. Please try again.'
              : 'Could not determine your current location. Please try again.';
        setLocationError(message, error);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [locationAttempt]);

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    try {
      const response = await signout();
      console.log('Owner logout response:', response);
    } catch (error) {
      console.error(
        'Owner logout request failed:',
        error.response?.data || error.message
      );
    } finally {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common.Authorization;
      window.dispatchEvent(new Event('authChange'));
      window.location.href = '/signin';
    }
  };

  const handleDeleteFood = async (item) => {
    if (!window.confirm(`Delete "${item.name}" from your menu?`)) return;

    setFormError('');
    try {
      const response = await axios.delete(
        `${API_BASE_URL}/api/item/${item._id}`
      );
      console.log('DELETE food item response:', response.data);
      setShop((currentShop) => ({
        ...currentShop,
        items: currentShop.items.filter(
          (currentItem) => currentItem._id !== item._id
        ),
      }));
    } catch (error) {
      console.error(
        'DELETE food item error:',
        error.response?.data || error.message
      );
      setFormError(
        error.response?.data?.message || 'Could not delete this food item.'
      );
    }
  };

  const loadMyShop = async (signal) => {
    setIsLoadingShop(true);
    setLoadError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/shop/mine`, { signal });
      console.log('GET /api/shop/mine response:', response.data);
      setShop(response.data.shop);
    } catch (error) {
      if (signal?.aborted) return;
      console.error('GET /api/shop/mine error:', error.response?.data || error.message);
      setLoadError(
        error.response?.data?.message ||
          'Could not connect to the server. Please try again.'
      );
    } finally {
      if (!signal?.aborted) setIsLoadingShop(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadMyShop(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!shop?._id) return undefined;

    let isMounted = true;
    const loadPendingCount = async () => {
      try {
        const response = await axios.get(
          `${API_BASE_URL}/api/order/owner/pending-count`
        );
        if (isMounted) setPendingOrderCount(response.data.count);
      } catch (error) {
        console.error(
          'GET /api/order/owner/pending-count error:',
          error.response?.data || error.message
        );
      }
    };

    loadPendingCount();
    const pendingCountInterval = window.setInterval(loadPendingCount, 30000);

    const refreshOrders = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/order/owner/mine`);
        if (!isMounted) return;
        const orders = response.data.orders || [];
        setOwnerOrders(orders);
        setPendingOrderCount(
          orders.filter((order) => order.status === 'pending').length
        );
      } catch (error) {
        console.error(
          'GET /api/order/owner/mine background sync error:',
          error.response?.data || error.message
        );
      }
    };

    refreshOrders();
    const ordersInterval = window.setInterval(refreshOrders, 15000);
    return () => {
      isMounted = false;
      window.clearInterval(pendingCountInterval);
      window.clearInterval(ordersInterval);
    };
  }, [shop?._id]);

  useEffect(() => {
    if (!activePopup) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setActivePopup(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [activePopup]);

  const openShopForm = (editing = false) => {
    setFormError('');
    setShopImage(null);
    setShopForm({
      name: editing ? shop?.name || '' : '',
      city: editing ? shop?.city || '' : '',
      state: editing ? shop?.state || '' : '',
    });
    setActivePopup(editing ? 'edit-shop' : 'create-shop');
  };

  const openFoodForm = () => {
    setFormError('');
    setFoodImage(null);
    setEditingItem(null);
    setFoodForm({ name: '', category: 'Indian', type: 'Veg', price: '' });
    setActivePopup('add-food');
  };

  const openEditFoodForm = (item) => {
    setFormError('');
    setFoodImage(null);
    setFoodForm({
      name: item.name,
      category: item.category,
      type: item.type,
      price: String(item.price),
    });
    setEditingItem(item);
    setActivePopup('edit-food');
  };

  const loadOwnerOrders = async ({ silent = false } = {}) => {
    if (!silent) setIsLoadingOrders(true);
    setOrdersError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/order/owner/mine`);
      console.log('GET /api/order/owner/mine response:', response.data);
      setOwnerOrders(response.data.orders || []);
      setPendingOrderCount(
        (response.data.orders || []).filter((order) => order.status === 'pending').length
      );
    } catch (error) {
      console.error(
        'GET /api/order/owner/mine error:',
        error.response?.data || error.message
      );
      setOrdersError(error.response?.data?.message || 'Could not load shop orders.');
    } finally {
      if (!silent) setIsLoadingOrders(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    setUpdatingOrderId(orderId);
    setOrdersError('');
    const wasPending = ownerOrders.some(
      (order) => order._id === orderId && order.status === 'pending'
    );
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/api/order/owner/${orderId}/status`,
        { status }
      );
      console.log('PATCH order status response:', response.data);
      setOwnerOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === response.data.order._id ? response.data.order : order
        )
      );
      if (wasPending) {
        setPendingOrderCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error(
        'PATCH order status error:',
        error.response?.data || error.message
      );
      setOrdersError(error.response?.data?.message || 'Could not update order status.');
    } finally {
      setUpdatingOrderId('');
    }
  };

  const showDeliveryBoys = async (orderId) => {
    setActiveDeliveryOrderId(orderId);
    setDeliveryBoysError('');
    setIsLoadingDeliveryBoys(true);
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/order/owner/delivery-boys`
      );
      setDeliveryBoys(response.data.deliveryBoys || []);
    } catch (error) {
      console.error(
        'GET /api/order/owner/delivery-boys error:',
        error.response?.data || error.message
      );
      setDeliveryBoysError(
        error.response?.data?.message || 'Could not load delivery partner details.'
      );
    } finally {
      setIsLoadingDeliveryBoys(false);
    }
  };

  const handleOrderStatusChange = (orderId, status) => {
    if (status === 'out_for_delivery') {
      showDeliveryBoys(orderId);
      return;
    }
    setActiveDeliveryOrderId('');
    updateOrderStatus(orderId, status);
  };

  const requestDeliveryPartner = async (orderId) => {
    setSendingDeliveryRequestId(orderId);
    setDeliveryBoysError('');
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/order/owner/${orderId}/assign`
      );
      setOwnerOrders((currentOrders) =>
        currentOrders.map((order) =>
          order._id === response.data.order._id ? response.data.order : order
        )
      );
      setActiveDeliveryOrderId('');
    } catch (error) {
      console.error(
        'POST delivery broadcast error:',
        error.response?.data || error.message
      );
      setDeliveryBoysError(
        error.response?.data?.message || 'Could not send this delivery request.'
      );
    } finally {
      setSendingDeliveryRequestId('');
    }
  };

  const handleShopSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', shopForm.name.trim());
    formData.append('city', shopForm.city.trim());
    formData.append('state', shopForm.state.trim());
    if (shopImage) formData.append('image', shopImage);

    const editing = activePopup === 'edit-shop';
    const url = editing
      ? `${API_BASE_URL}/api/shop/edit/${shop._id}`
      : `${API_BASE_URL}/api/shop/create`;

    try {
      const response = await axios({
        method: editing ? 'put' : 'post',
        url,
        data: formData,
      });
      console.log(`${editing ? 'PUT' : 'POST'} ${url} response:`, response.data);
      setShop(response.data.shop);
      setActivePopup(null);
      setShopImage(null);
    } catch (error) {
      console.error('Shop save error:', error.response?.data || error.message);
      setFormError(
        error.response?.data?.message ||
          'Could not save your shop. Please check the server connection and try again.'
      );
      if (error.response?.status === 409) loadMyShop();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFoodSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', foodForm.name.trim());
    formData.append('category', foodForm.category);
    formData.append('type', foodForm.type);
    formData.append('price', foodForm.price);
    if (foodImage) formData.append('image', foodImage);

    try {
      const editing = activePopup === 'edit-food';
      const response = editing
        ? await axios.put(
            `${API_BASE_URL}/api/item/${editingItem._id}`,
            formData
          )
        : await axios.post(
            `${API_BASE_URL}/api/item/add-item`,
            formData
          );
      console.log(
        `${editing ? 'PUT' : 'POST'} food item response:`,
        response.data
      );
      setShop((currentShop) => ({
        ...currentShop,
        items: editing
          ? currentShop.items.map((item) =>
              item._id === response.data.item._id ? response.data.item : item
            )
          : [...(currentShop?.items || []), response.data.item],
      }));
      setActivePopup(null);
      setFoodImage(null);
      setEditingItem(null);
    } catch (error) {
      console.error(
        'Save food item error:',
        error.response?.data || error.message
      );
      setFormError(
        error.response?.data?.message ||
          'Could not add the food item. Please check the server connection and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ownerName = user?.fullName || user?.name || 'Restaurant Owner';
  const avatar = ownerName.trim().charAt(0).toUpperCase() || 'A';
  const popupTitle = {
    'create-shop': 'Add Your Shop',
    'edit-shop': 'Edit Your Shop',
    'add-food': 'Add Your Food Item',
    'edit-food': 'Edit Food Item',
    orders: 'My Orders',
    profile: 'My Profile',
  }[activePopup];
  const isShopForm = activePopup === 'create-shop' || activePopup === 'edit-shop';

  if (isLoadingShop || (activePopup === 'orders' && isLoadingOrders)) {
    return <VideoLoader />;
  }

  return (
    <section
      className={`owner-dashboard${activePopup === 'orders' ? ' owner-dashboard--orders-open' : ''}`}
    >
      <header className="owner-topbar">
        <a aria-label="Vingo home" className="owner-topbar__logo" href="/home">
          Vingo
        </a>
        <nav aria-label="Owner navigation" className="owner-topbar__actions">
          {shop && (
            <>
              <button
                className="owner-topbar__button"
                onClick={openFoodForm}
                type="button"
              >
                <FaPlus aria-hidden="true" />
                Add Food Item
              </button>
              <button
                className="owner-topbar__button"
                onClick={() => {
                  setActivePopup('orders');
                  loadOwnerOrders();
                }}
                type="button"
              >
                <FaClipboardList aria-hidden="true" />
                My Orders
                {pendingOrderCount > 0 && (
                  <span aria-label={`${pendingOrderCount} pending orders`} className="owner-orders-badge">
                    {pendingOrderCount > 99 ? '99+' : pendingOrderCount}
                  </span>
                )}
              </button>
            </>
          )}
          <div className="owner-profile-menu-wrap">
            <button
              aria-label="Open profile"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              className="owner-topbar__avatar"
              onClick={() => setProfileMenuOpen((isOpen) => !isOpen)}
              type="button"
            >
              {avatar}
            </button>
            {profileMenuOpen && (
              <div className="owner-profile-menu" role="menu">
                <div className="owner-profile-menu__identity">
                  <strong>{ownerName}</strong>
                  <span>Email: {user?.email || 'Not provided'}</span>
                  <span>Mobile: {user?.mobile || 'Not provided'}</span>
                  <span>Account type: {user?.role || 'Owner'}</span>
                </div>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setActivePopup('profile');
                  }}
                  role="menuitem"
                  type="button"
                >
                  <FaUser aria-hidden="true" />
                  Profile
                </button>
                <button
                  className="owner-profile-menu__logout"
                  onClick={handleLogout}
                  role="menuitem"
                  type="button"
                >
                  <FaSignOutAlt aria-hidden="true" />
                  Logout
                </button>
              </div>
            )}
          </div>
          {!shop && !isLoadingShop && !loadError && (
            <button
              className="owner-topbar__button"
              onClick={() => openShopForm()}
              type="button"
            >
              <FaPlus aria-hidden="true" />
              Add Your Shop
            </button>
          )}
        </nav>
      </header>

      <main className="owner-main">
        <div aria-live="polite" className="owner-current-location">
          <MdLocationPin aria-hidden="true" />
          <div className="owner-current-location__text">
            <strong>Your current location</strong>
            <span>
              {locationStatus === 'loading'
                ? 'Detecting your location…'
                : locationStatus === 'ready'
                  ? currentLocation
                  : locationStatus}
            </span>
          </div>
          {locationStatus !== 'loading' && (
            <button
              className="owner-current-location__refresh"
              onClick={() => setLocationAttempt((attempt) => attempt + 1)}
              type="button"
            >
              Refresh
            </button>
          )}
        </div>
        {isLoadingShop && (
          <p aria-live="polite" className="owner-shop-result__message">
            Checking your shop…
          </p>
        )}
        {loadError && (
          <div className="owner-shop-result__error" role="alert">
            <p>{loadError}</p>
            <button onClick={() => loadMyShop()} type="button">
              Retry
            </button>
          </div>
        )}
        {!isLoadingShop && !loadError && !shop && (
          <section className="owner-first-shop">
            <span className="owner-first-shop__icon" aria-hidden="true">
              <FaUtensils />
            </span>
            <h1>Welcome, {ownerName}</h1>
            <p>Add your shop to start sharing your food with customers.</p>
            <button
              className="owner-cta__button"
              onClick={() => openShopForm()}
              type="button"
            >
              Add Your Shop
            </button>
          </section>
        )}
        {shop && (
          <>
            <h1 className="owner-welcome">
              <FaUtensils aria-hidden="true" />
              <span>Welcome to {shop.name}</span>
            </h1>

            <article className="owner-shop-card">
              <div className="owner-shop-card__photo">
                <img
                  alt={`${shop.name} shop`}
                  className="owner-shop-card__image"
                  src={`${API_BASE_URL}${shop.image}`}
                />
                <button
                  aria-label="Edit shop details"
                  className="owner-shop-card__edit"
                  onClick={() => openShopForm(true)}
                  type="button"
                >
                  <FaEdit aria-hidden="true" />
                </button>
              </div>
              <div className="owner-shop-card__details">
                <h2>{shop.name}</h2>
                <span className="owner-shop-card__location-label">Shop location</span>
                <p>{[shop.city, shop.state].filter(Boolean).join(', ') || 'Not provided'}</p>
              </div>
            </article>

            {shop.items?.length > 0 && (
              <section className="owner-items" aria-labelledby="owner-items-title">
                <h2 className="owner-visually-hidden" id="owner-items-title">
                  Your food items
                </h2>
                <div className="owner-items__list">
                  {shop.items.map((item) => (
                    <article className="owner-item-card" key={item._id}>
                      <img alt={item.name} src={`${API_BASE_URL}${item.image}`} />
                      <div className="owner-item-card__details">
                        <h3>{item.name}</h3>
                        <p>Category: {item.category}</p>
                        <p>Food Type: {item.type}</p>
                        <strong>₹{Number(item.price).toFixed(2)}</strong>
                      </div>
                      <div className="owner-item-card__actions">
                        <button
                          aria-label={`Edit ${item.name}`}
                          className="owner-item-card__edit"
                          onClick={() => openEditFoodForm(item)}
                          type="button"
                        >
                          <FaEdit aria-hidden="true" />
                        </button>
                        <button
                          aria-label={`Delete ${item.name}`}
                          className="owner-item-card__delete"
                          onClick={() => handleDeleteFood(item)}
                          type="button"
                        >
                          <FaTrash aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
            {shop.items?.length === 0 && (
              <p className="owner-items__empty">
                No food items yet. Use “Add Food Item” to add one.
              </p>
            )}
          </>
        )}
      </main>

      {activePopup && (
        <div
          className={`owner-modal${activePopup === 'orders' ? ' owner-modal--orders' : ''}`}
          onClick={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setActivePopup(null);
            }
          }}
        >
          <section
            aria-labelledby="owner-modal-title"
            aria-modal="true"
            className={`owner-modal__dialog${activePopup === 'orders' ? ' owner-modal__dialog--orders' : ''}`}
            role="dialog"
          >
            {activePopup === 'orders' ? (
              <div className="owner-orders__page-header">
                <button
                  aria-label="Back to owner dashboard"
                  className="owner-orders__back"
                  onClick={() => setActivePopup(null)}
                  type="button"
                >
                  <FaArrowLeft aria-hidden="true" />
                </button>
                <h2 id="owner-modal-title">My Orders</h2>
              </div>
            ) : (
              <div className="owner-modal__header">
                <h2 id="owner-modal-title">{popupTitle}</h2>
                <button
                  aria-label="Close popup"
                  className="owner-modal__close"
                  disabled={isSubmitting}
                  onClick={() => setActivePopup(null)}
                  type="button"
                >
                  <FaTimes />
                </button>
              </div>
            )}

            {isShopForm && (
              <form className="owner-form" onSubmit={handleShopSubmit}>
                <label>
                  Shop name
                  <input
                    autoFocus
                    maxLength={100}
                    onChange={(event) =>
                      setShopForm({ ...shopForm, name: event.target.value })
                    }
                    placeholder="Enter your shop name"
                    required={activePopup === 'add-food'}
                    value={shopForm.name}
                  />
                </label>
                <label>
                  Shop image {activePopup === 'edit-shop' && '(optional)'}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setShopImage(event.target.files?.[0] || null)
                    }
                    required={activePopup === 'create-shop'}
                    type="file"
                  />
                  <span className="owner-form__filename">
                    JPEG, PNG or WebP · max 5 MB
                  </span>
                  {shopImage && (
                    <span className="owner-form__filename">{shopImage.name}</span>
                  )}
                </label>
                <label>
                  City
                  <input
                    autoComplete="address-level2"
                    maxLength={80}
                    onChange={(event) =>
                      setShopForm({ ...shopForm, city: event.target.value })
                    }
                    placeholder="Enter city"
                    required={activePopup === 'create-shop'}
                    value={shopForm.city}
                  />
                </label>
                <label>
                  State
                  <input
                    autoComplete="address-level1"
                    maxLength={80}
                    onChange={(event) =>
                      setShopForm({ ...shopForm, state: event.target.value })
                    }
                    placeholder="Enter state"
                    required={activePopup === 'add-food'}
                    value={shopForm.state}
                  />
                </label>
                {formError && <p className="owner-form__error" role="alert">{formError}</p>}
                <button className="owner-form__submit" disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? 'Saving shop…'
                    : activePopup === 'edit-shop'
                      ? 'Save Changes'
                      : 'Add Your Shop'}
                </button>
              </form>
            )}

            {(activePopup === 'add-food' || activePopup === 'edit-food') && (
              <form className="owner-form" onSubmit={handleFoodSubmit}>
                <label>
                  Food item name
                  <input
                    autoFocus
                    maxLength={100}
                    onChange={(event) =>
                      setFoodForm({ ...foodForm, name: event.target.value })
                    }
                    placeholder="e.g. Paneer Tikka"
                    required
                    value={foodForm.name}
                  />
                </label>
                <label>
                  Food image {activePopup === 'edit-food' && '(optional)'}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) =>
                      setFoodImage(event.target.files?.[0] || null)
                    }
                    required
                    type="file"
                  />
                  <span className="owner-form__filename">JPEG, PNG or WebP · max 5 MB</span>
                  {foodImage && (
                    <span className="owner-form__filename">{foodImage.name}</span>
                  )}
                </label>
                <label>
                  Category
                  <select
                    onChange={(event) =>
                      setFoodForm({ ...foodForm, category: event.target.value })
                    }
                    value={foodForm.category}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="owner-form__row">
                  <label>
                    Food type
                    <select
                      onChange={(event) =>
                        setFoodForm({ ...foodForm, type: event.target.value })
                      }
                      value={foodForm.type}
                    >
                      <option value="Veg">Veg</option>
                      <option value="Non-Veg">Non-Veg</option>
                    </select>
                  </label>
                  <label>
                    Price (₹)
                    <input
                      min="0"
                      onChange={(event) =>
                        setFoodForm({ ...foodForm, price: event.target.value })
                      }
                      placeholder="0.00"
                      required
                      step="0.01"
                      type="number"
                      value={foodForm.price}
                    />
                  </label>
                </div>
                {formError && <p className="owner-form__error" role="alert">{formError}</p>}
                <button className="owner-form__submit" disabled={isSubmitting} type="submit">
                  {isSubmitting
                    ? 'Saving food item…'
                    : activePopup === 'edit-food'
                      ? 'Save Changes'
                      : 'Add Food Item'}
                </button>
              </form>
            )}

            {activePopup === 'orders' && (
              <section className="owner-orders">
                <div className="owner-orders__list">
                  {isLoadingOrders && <p className="owner-orders__message">Loading orders…</p>}
                  {ordersError && <p className="owner-form__error" role="alert">{ordersError}</p>}
                  {!isLoadingOrders && !ordersError && ownerOrders.length === 0 && (
                    <div className="owner-message owner-orders__empty">
                      <FaClipboardList aria-hidden="true" />
                      <p>No orders yet.</p>
                    </div>
                  )}
                  {ownerOrders.map((order) => {
                    const displayedStatus =
                      activeDeliveryOrderId === order._id && order.status === 'ready'
                        ? 'out_for_delivery'
                        : order.status;
                    return (
                    <article className="owner-order-card" key={order._id}>
                    <div className="owner-order-card__customer">
                      <strong>{order.customer?.fullName || 'Customer order'}</strong>
                      {order.customer?.email && <span>{order.customer.email}</span>}
                      {order.customer?.mobile && (
                        <a href={`tel:${order.customer.mobile}`}>{order.customer.mobile}</a>
                      )}
                    </div>
                    <p className="owner-order-card__address">
                      {order.deliveryAddress || 'Delivery address not provided'}
                    </p>

                    <ul className="owner-order-card__items">
                      {order.items.map((item, index) => {
                        const imageUrl = item.image?.startsWith('http')
                          ? item.image
                          : `${API_BASE_URL}${item.image || ''}`;
                        return (
                          <li className="owner-order-item" key={`${item.item || item.name}-${index}`}>
                            <img alt={item.name} src={imageUrl} />
                            <div className="owner-order-item__details">
                              <strong>{item.name}</strong>
                              <span>Qty: {item.quantity} × ₹{Number(item.unitPrice).toFixed(2)}</span>
                            </div>
                            <strong className="owner-order-item__total">
                              ₹{(Number(item.unitPrice) * Number(item.quantity)).toFixed(2)}
                            </strong>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="owner-order-card__footer">
                      <div className="owner-order-card__status-line">
                        <span>Status:</span>
                        <strong className={`owner-order-card__status owner-order-card__status--${displayedStatus}`}>
                          {displayedStatus.replaceAll('_', ' ')}
                        </strong>
                      </div>
                      <label className="owner-order-card__status-control">
                        <span className="owner-visually-hidden">Change order status</span>
                        <select
                          aria-label={`Change status for order from ${order.customer?.fullName || 'customer'}`}
                          disabled={updatingOrderId === order._id || ['awaiting_payment', 'completed', 'cancelled'].includes(order.status)}
                          onChange={(event) => handleOrderStatusChange(order._id, event.target.value)}
                          value={displayedStatus}
                        >
                          {order.status === 'pending' && (
                            <option disabled value="pending">Pending</option>
                          )}
                          {order.status === 'awaiting_payment' && (
                            <option disabled value="awaiting_payment">Awaiting payment</option>
                          )}
                          <option value="accepted">Accepted</option>
                          <option value="preparing">Preparing</option>
                          <option value="ready">Ready</option>
                          <option
                            disabled={!['ready', 'out_for_delivery'].includes(order.status)}
                            value="out_for_delivery">
                            Out for delivery
                          </option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </label>
                    </div>
                      {order.assignment?.assignedTo && (
                        <div className="owner-order-card__delivery">
                          <p>
                            Delivery partner:{' '}
                            <strong>{order.assignment.assignedTo.fullName}</strong>
                          </p>
                          {order.assignment.assignedTo.mobile && (
                            <a href={`tel:${order.assignment.assignedTo.mobile}`}>
                              {order.assignment.assignedTo.mobile}
                            </a>
                          )}
                          {order.assignment.assignedTo.city && (
                            <small>
                              {order.assignment.assignedTo.city}
                              {order.assignment.assignedTo.state
                                ? `, ${order.assignment.assignedTo.state}`
                                : ''}
                            </small>
                          )}
                        </div>
                      )}
                      {order.status === 'out_for_delivery' &&
                        order.assignment?.status === 'broadcasted' && (
                          <p className="owner-order-card__partners-message">
                            Delivery request sent. Waiting for a delivery partner to accept.
                          </p>
                        )}
                      {activeDeliveryOrderId === order._id && (
                        <section
                          aria-label={`Delivery request for order from ${order.customer?.fullName || 'customer'}`}
                          className="owner-order-card__partners"
                        >
                          <h3>Request a delivery partner</h3>
                          {isLoadingDeliveryBoys && (
                            <p className="owner-order-card__partners-message">
                              Loading delivery partner details…
                            </p>
                          )}
                          {deliveryBoysError && (
                            <p className="owner-order-card__partners-error" role="alert">
                              {deliveryBoysError}
                            </p>
                          )}
                          {!isLoadingDeliveryBoys &&
                            !deliveryBoysError &&
                            deliveryBoys.length === 0 && (
                              <p className="owner-order-card__partners-message">
                                No delivery partners found in your shop location.
                              </p>
                            )}
                          {!isLoadingDeliveryBoys && deliveryBoys.map((deliveryBoy) => (
                            <article
                              className="owner-order-card__partner"
                              key={deliveryBoy._id}
                            >
                              <div>
                                <strong>{deliveryBoy.fullName}</strong>
                                <small>
                                  {deliveryBoy.city}, {deliveryBoy.state}
                                </small>
                              </div>
                            </article>
                          ))}
                          {!isLoadingDeliveryBoys && deliveryBoys.length > 0 && (
                            <>
                              <p className="owner-order-card__partners-message">
                                The first delivery partner to accept will get this order.
                              </p>
                              <button
                                className="owner-order-card__request"
                                disabled={sendingDeliveryRequestId === order._id}
                                onClick={() => requestDeliveryPartner(order._id)}
                                type="button"
                              >
                                {sendingDeliveryRequestId === order._id
                                  ? 'Sending request…'
                                  : `Send request to ${deliveryBoys.length} partner${deliveryBoys.length === 1 ? '' : 's'}`}
                              </button>
                            </>
                          )}
                          <button
                            className="owner-order-card__partners-close"
                            onClick={() => setActiveDeliveryOrderId('')}
                            type="button"
                          >
                            Close
                          </button>
                        </section>
                      )}
                      {order.status === 'ready' &&
                        !order.assignment &&
                        activeDeliveryOrderId !== order._id && (
                          <button
                            className="owner-order-card__choose-partner"
                            onClick={() => showDeliveryBoys(order._id)}
                            type="button"
                          >
                            Request delivery partner
                          </button>
                        )}
                      <div className="owner-order-card__total">
                      <span>{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Razorpay'} · {order.paymentStatus}</span>
                      <strong>Total: ₹{Number(order.total).toFixed(2)}</strong>
                    </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            )}

            {activePopup === 'profile' && (
              <dl className="owner-profile">
                <div><dt>Name</dt><dd>{ownerName}</dd></div>
                <div><dt>Email</dt><dd>{user?.email || 'Not provided'}</dd></div>
                <div><dt>Mobile</dt><dd>{user?.mobile || 'Not provided'}</dd></div>
                <div><dt>Account type</dt><dd>{user?.role || 'Owner'}</dd></div>
              </dl>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

export default OwnerDashbord;
