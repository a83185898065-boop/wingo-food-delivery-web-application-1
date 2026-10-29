import React, { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FaArrowLeft, FaShoppingBasket, FaStar, FaTrashAlt, FaUtensils } from 'react-icons/fa';
import { TbMotorbikeFilled } from 'react-icons/tb';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import axios from '../axiosConfig.js';
import CheckoutPage from '../pages/cheakout.jsx';
import { API_BASE_URL } from '../utils/apiBaseUrl.js';
import VideoLoader from './VideoLoader.jsx';
import './UserDashbord.css';

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const DEFAULT_POSITION = [26.8467, 80.9462];
const deliveryMarkerIcon = L.divIcon({
  className: 'customer-delivery-marker',
  html: renderToStaticMarkup(<TbMotorbikeFilled aria-hidden="true" />),
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});
const customerMarkerIcon = L.divIcon({
  className: 'customer-destination-marker',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function MapCenter({ latitude, longitude, destination }) {
  const map = useMap();

  useEffect(() => {
    if (
      Number.isFinite(destination?.latitude) &&
      Number.isFinite(destination?.longitude)
    ) {
      map.fitBounds(
        [
          [latitude, longitude],
          [destination.latitude, destination.longitude],
        ],
        { padding: [32, 32], maxZoom: 15 }
      );
      return;
    }
    map.setView([latitude, longitude], 15);
  }, [latitude, longitude, destination?.latitude, destination?.longitude, map]);

  return null;
}

function getDistanceInMeters(from, to) {
  const toRadians = (degrees) => (degrees * Math.PI) / 180;
  const earthRadiusMeters = 6_371_000;
  const latitudeDifference = toRadians(to.latitude - from.latitude);
  const longitudeDifference = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;

  const boundedHaversine = Math.min(1, Math.max(0, haversine));
  return 2 * earthRadiusMeters * Math.atan2(
    Math.sqrt(boundedHaversine),
    Math.sqrt(1 - boundedHaversine)
  );
}

function formatDistance(meters) {
  return meters < 1000
    ? `about ${Math.round(meters)} m`
    : `about ${(meters / 1000).toFixed(1)} km`;
}

function DeliveryTracking({ assignment, deliveryLocation }) {
  const location = assignment?.currentLocation;
  const hasLocation =
    Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);
  const hasDestination =
    Number.isFinite(deliveryLocation?.latitude) &&
    Number.isFinite(deliveryLocation?.longitude);
  const distance =
    hasLocation && hasDestination
      ? getDistanceInMeters(location, deliveryLocation)
      : null;

  return (
    <div className="customer-order__tracking">
      <h3>Current order tracking</h3>
      {hasLocation ? (
        <>
          <MapContainer
            center={[location.latitude, location.longitude]}
            className="customer-order__map"
            scrollWheelZoom={false}
            zoom={15}
          >
            <MapCenter
              latitude={location.latitude}
              longitude={location.longitude}
              destination={deliveryLocation}
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {hasDestination && (
              <Polyline
                positions={[
                  [location.latitude, location.longitude],
                  [deliveryLocation.latitude, deliveryLocation.longitude],
                ]}
                pathOptions={{ color: '#3454d1', weight: 4 }}
              />
            )}
            <Marker
              icon={deliveryMarkerIcon}
              position={[location.latitude, location.longitude]}
            >
              <Popup>
                {assignment.assignedTo?.fullName || 'Delivery partner'}
              </Popup>
            </Marker>
            {hasDestination && (
              <Marker
                icon={customerMarkerIcon}
                position={[deliveryLocation.latitude, deliveryLocation.longitude]}
              >
                <Popup>Delivery address</Popup>
              </Marker>
            )}
          </MapContainer>
          {distance !== null && (
            <p className="customer-order__distance" role="status">
              Delivery partner is {formatDistance(distance)} from your delivery address
              <span> (straight-line distance)</span>
            </p>
          )}
          <p className="customer-order__location-updated">
            Live location updates automatically
            {location.updatedAt
              ? ` · Updated ${new Date(location.updatedAt).toLocaleTimeString()}`
              : ''}
          </p>
        </>
      ) : (
        <p className="customer-order__tracking-message" role="status">
          Your delivery partner accepted the order. Waiting for their live location…
        </p>
      )}
    </div>
  );
}

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Unable to load Razorpay checkout.'));
    document.body.appendChild(script);
  });

function UserDashbord({
  user,
  activePanel,
  onPanelChange,
  onCartCountChange,
  location,
  searchTerm = '',
}) {
  const [shops, setShops] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [cart, setCart] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [orders, setOrders] = useState([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkoutRequested, setCheckoutRequested] = useState(activePanel === 'checkout');
  const currentPanel = checkoutRequested ? 'checkout' : activePanel;
  const checkoutPosition = useMemo(
    () =>
      Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
        ? [location.latitude, location.longitude]
        : DEFAULT_POSITION,
    [location?.latitude, location?.longitude]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart]
  );
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase();
  const normalizeCity = (city) =>
    city?.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase();
  const shopsInLocation = location?.city
    ? shops.filter(
        (shop) =>
          normalizeCity(shop.city) === normalizeCity(location.city)
      )
    : shops;
  const categories = Array.from(
    new Map(
      shopsInLocation
        .flatMap((shop) => shop.items || [])
        .filter((item) => item.category)
        .map((item) => [item.category, item])
    ),
    ([category, item]) => ({ name: category, image: item.image })
  );
  const visibleItems = shopsInLocation.flatMap((shop) =>
    (shop.items || [])
      .filter((item) => {
        const matchesCategory = !selectedCategory || item.category === selectedCategory;
        const matchesSearch =
          !normalizedSearch ||
          `${item.name} ${item.category} ${shop.name}`.toLocaleLowerCase().includes(normalizedSearch);
        return matchesCategory && matchesSearch;
      })
      .map((item) => ({ item, shop }))
  );

  useEffect(() => {
    onCartCountChange(cartCount);
  }, [cartCount, onCartCountChange]);

  useEffect(() => {
    setCheckoutRequested(activePanel === 'checkout');
  }, [activePanel]);

  useEffect(() => {
    const controller = new AbortController();
    axios
      .get(`${API_BASE_URL}/api/order/menu`, { signal: controller.signal })
      .then((response) => {
        console.log('GET /api/order/menu response:', response.data);
        setShops(response.data.shops || []);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('GET /api/order/menu error:', error.response?.data || error.message);
        setErrorMessage(
          error.response?.data?.message || 'Could not load restaurants. Please retry.'
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingMenu(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (activePanel !== 'orders') return;
    let isMounted = true;
    let isLoadingRequest = false;
    setIsLoadingOrders(true);
    setErrorMessage('');

    const refreshOrders = async () => {
      if (isLoadingRequest) return;
      isLoadingRequest = true;
      try {
        const response = await axios.get(`${API_BASE_URL}/api/order/customer/mine`);
        if (isMounted) {
          setOrders(response.data.orders || []);
          setErrorMessage('');
        }
      } catch (error) {
        console.error(
          'GET /api/order/customer/mine error:',
          error.response?.data || error.message
        );
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message || 'Could not load your orders.'
          );
        }
      } finally {
        isLoadingRequest = false;
        if (isMounted) setIsLoadingOrders(false);
      }
    };

    refreshOrders();
    const ordersInterval = window.setInterval(refreshOrders, 5000);
    return () => {
      isMounted = false;
      window.clearInterval(ordersInterval);
    };
  }, [activePanel]);

  const addToCart = (shop, item) => {
    setErrorMessage('');
    if (cart.length && cart[0].shopId !== shop._id) {
      setErrorMessage('Your cart has food from another shop. Place or clear that order first.');
      return;
    }
    setCart((currentCart) => {
      const existing = currentCart.find((line) => line.itemId === item._id);
      if (existing) {
        return currentCart.map((line) =>
          line.itemId === item._id
            ? { ...line, quantity: Math.min(line.quantity + 1, 99) }
            : line
        );
      }
      return [
        ...currentCart,
        {
          itemId: item._id,
          name: item.name,
          image: item.image,
          price: item.price,
          shopId: shop._id,
          shopName: shop.name,
          quantity: 1,
        },
      ];
    });
  };

  const changeQuantity = (itemId, delta) => {
    setCart((currentCart) =>
      currentCart
        .map((line) =>
          line.itemId === itemId
            ? { ...line, quantity: Math.min(line.quantity + delta, 99) }
            : line
        )
        .filter((line) => line.quantity > 0)
    );
  };

  const handleCheckout = async (event, deliveryCoordinates) => {
    event.preventDefault();
    setErrorMessage('');
    if (!cart.length) {
      setErrorMessage('Add food to your cart before checkout.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      if (paymentMethod === 'razorpay') await loadRazorpay();
      const response = await axios.post(`${API_BASE_URL}/api/order`, {
        shopId: cart[0].shopId,
        items: cart.map(({ itemId, quantity }) => ({ itemId, quantity })),
        deliveryAddress,
        deliveryLocation: deliveryCoordinates,
        paymentMethod,
      });
      console.log('POST /api/order response:', response.data);

      if (paymentMethod === 'cod') {
        setCart([]);
        setDeliveryAddress('');
        onPanelChange(null);
        window.alert(response.data.message || 'Order placed successfully.');
        return;
      }

      const { order, payment } = response.data;
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: 'Wingoo',
        description: `Order at ${cart[0].shopName}`,
        order_id: payment.razorpayOrderId,
        prefill: {
          name: user?.fullName || user?.name || '',
          email: user?.email || '',
          contact: user?.mobile || '',
        },
        theme: { color: '#f97316' },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await axios.post(
              `${API_BASE_URL}/api/order/verify-payment`,
              { orderId: order._id, ...paymentResponse }
            );
            console.log(
              'POST /api/order/verify-payment response:',
              verifyResponse.data
            );
            setCart([]);
            setDeliveryAddress('');
            onPanelChange(null);
            window.alert(
              verifyResponse.data.message || 'Payment received and order confirmed.'
            );
          } catch (error) {
            console.error(
              'POST /api/order/verify-payment error:',
              error.response?.data || error.message
            );
            setErrorMessage(
              error.response?.data?.message ||
                'Payment verification failed. Contact support before paying again.'
            );
            onPanelChange('orders');
          } finally {
            setIsPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => setIsPlacingOrder(false),
        },
      });
      checkout.on('payment.failed', (paymentError) => {
        console.error('Razorpay payment failed:', paymentError.error);
        setErrorMessage(
          paymentError.error?.description || 'Payment failed. You can retry checkout.'
        );
        setIsPlacingOrder(false);
      });
      checkout.open();
      setIsPlacingOrder(false);
      return;
    } catch (error) {
      console.error('Order checkout failed:', error.response?.data || error.message);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          'Could not place your order. Please try again.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if ((!activePanel && isLoadingMenu) || (activePanel === 'orders' && isLoadingOrders)) {
    return <VideoLoader />;
  }

  return (
    <div className="customer-dashboard">
      {errorMessage && <p className="customer-error" role="alert">{errorMessage}</p>}

      {currentPanel ? (
        <section aria-labelledby="customer-page-title" className="customer-page">
          {currentPanel === 'cart' ? (
            <header className="customer-cart-page__header">
              <button
                aria-label="Back to menu"
                className="customer-page__back"
                onClick={() => onPanelChange(null)}
                type="button"
              >
                <FaArrowLeft aria-hidden="true" />
              </button>
              <h1 id="customer-page-title">Your Cart</h1>
            </header>
          ) : (
            <header className="customer-page__header">
              <button
                className="customer-page__back"
                disabled={isPlacingOrder}
                onClick={() => {
                  if (currentPanel === 'checkout') setCheckoutRequested(false);
                  onPanelChange(currentPanel === 'checkout' ? 'cart' : null);
                }}
                type="button"
              >
                <FaArrowLeft aria-hidden="true" />
                {currentPanel === 'checkout' ? 'Back to cart' : 'Back to menu'}
              </button>
              <h1 id="customer-page-title">
                {currentPanel === 'checkout' ? 'Checkout' : 'My orders'}
              </h1>
              <p>
                {currentPanel === 'checkout'
                  ? 'Add your delivery details and choose how you would like to pay.'
                  : 'Track the status and details of your orders.'}
              </p>
            </header>
          )}

          {currentPanel === 'cart' && (
            cart.length ? (
              <div className="customer-cart-page">
                <ul className="customer-cart-page__items">
                  {cart.map((line) => (
                    <li className="customer-cart-page__item" key={line.itemId}>
                      <img alt={line.name} src={line.image} />
                      <div className="customer-cart-page__details">
                        <strong>{line.name}</strong>
                        <span>₹{Number(line.price).toFixed(2)} each</span>
                        <small>₹{(line.price * line.quantity).toFixed(2)}</small>
                      </div>
                      <div aria-label={`Quantity for ${line.name}`} className="customer-cart__quantity">
                        <button
                          aria-label={`Remove one ${line.name}`}
                          onClick={() => changeQuantity(line.itemId, -1)}
                          type="button"
                        >
                          −
                        </button>
                        <span>{line.quantity}</span>
                        <button
                          aria-label={`Add one ${line.name}`}
                          disabled={line.quantity >= 99}
                          onClick={() => changeQuantity(line.itemId, 1)}
                          type="button"
                        >
                          +
                        </button>
                      </div>
                      <button
                        aria-label={`Remove ${line.name} from cart`}
                        className="customer-cart-page__remove"
                        onClick={() => changeQuantity(line.itemId, -line.quantity)}
                        type="button"
                      >
                        <FaTrashAlt aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="customer-cart-page__total">
                  <strong>Total Amount</strong>
                  <strong>₹{cartTotal.toFixed(2)}</strong>
                </div>
                <button
                  className="customer-cart-page__submit"
                  onClick={() => {
                    setCheckoutRequested(true);
                    onPanelChange('checkout');
                  }}
                  type="button"
                >
                  Proceed to Checkout
                </button>
              </div>
            ) : (
              <div className="customer-empty">
                <FaShoppingBasket aria-hidden="true" />
                <h2>Your cart is empty</h2>
                <p>Add food from the menu to get started.</p>
                <button className="customer-page__action" onClick={() => onPanelChange(null)} type="button">
                  Browse menu
                </button>
              </div>
            )
          )}

          {currentPanel === 'checkout' && (
            cart.length ? (
              <CheckoutPage
                cart={cart}
                cartTotal={cartTotal}
                deliveryAddress={deliveryAddress}
                initialPosition={checkoutPosition}
                isPlacingOrder={isPlacingOrder}
                onDeliveryAddressChange={setDeliveryAddress}
                onPanelChange={onPanelChange}
                onPaymentMethodChange={setPaymentMethod}
                onSubmit={handleCheckout}
                paymentMethod={paymentMethod}
                changeQuantity={changeQuantity}
              />
            ) : (
              <div className="customer-empty">
                <FaShoppingBasket aria-hidden="true" />
                <h2>Your cart is empty</h2>
                <p>Add food from the menu before checking out.</p>
                <button className="customer-page__action" onClick={() => onPanelChange(null)} type="button">
                  Browse menu
                </button>
              </div>
            )
          )}

          {currentPanel === 'orders' && (
            orders.length ? (
              <div className="customer-orders">
                {orders.map((order) => (
                  <article className="customer-order" key={order._id}>
                    <header>
                      <strong>{order.shop?.name || 'Restaurant order'}</strong>
                      <span className={`customer-order__status customer-order__status--${order.status}`}>
                        {order.status.replaceAll('_', ' ')}
                      </span>
                    </header>
                    <p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(', ')}</p>
                    <footer>
                      <span>{order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Razorpay'} · {order.paymentStatus}</span>
                      <strong>₹{Number(order.total).toFixed(2)}</strong>
                    </footer>
                    {order.status === 'out_for_delivery' &&
                      order.assignment?.status === 'assigned' &&
                      order.assignment?.assignedTo && (
                        <DeliveryTracking
                          assignment={order.assignment}
                          deliveryLocation={order.deliveryLocation}
                        />
                      )}
                  </article>
                ))}
              </div>
            ) : (
              <div className="customer-empty">
                <FaUtensils aria-hidden="true" />
                <h2>No orders yet</h2>
                <p>Your placed orders will appear here.</p>
                <button className="customer-page__action" onClick={() => onPanelChange(null)} type="button">
                  Explore menu
                </button>
              </div>
            )
          )}
        </section>
      ) : (
        <>
          {!shopsInLocation.some((shop) => shop.items?.length) && (
            <section className="customer-empty">
              <FaUtensils aria-hidden="true" />
              <h2>{location?.city ? `No restaurants found in ${location.city}` : 'No food menu available yet'}</h2>
              <p>
                {location?.city
                  ? 'There are no restaurants listed in your detected city yet.'
                  : 'Restaurants and their food items will appear here when available.'}
              </p>
            </section>
          )}
          {shopsInLocation.some((shop) => shop.items?.length) && (
            <>
              <section className="customer-discovery">
                <h1>Inspiration for your first order</h1>
                <div aria-label="Browse food categories" className="customer-categories">
                  {categories.map((category) => (
                    <button
                      aria-pressed={selectedCategory === category.name}
                      className={`customer-category-card${selectedCategory === category.name ? ' is-selected' : ''}`}
                      key={category.name}
                      onClick={() =>
                        setSelectedCategory((current) =>
                          current === category.name ? '' : category.name
                        )
                      }
                      type="button"
                    >
                      <img alt="" src={`${API_BASE_URL}${category.image}`} />
                      <span>{category.name}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="customer-shop">
                <h2 className="customer-section-title">
                  Best shops in {location?.city || 'your area'}
                </h2>
                <div className="customer-shop-grid">
                  {shopsInLocation
                    .filter((shop) => shop.items?.length)
                    .map((shop) => (
                      <article className="customer-shop-card" key={shop._id}>
                        <img alt="" src={`${API_BASE_URL}${shop.image}`} />
                        <h3>{shop.name}</h3>
                      </article>
                    ))}
                </div>
              </section>

              <section className="customer-suggestions">
                <h2 className="customer-section-title">
                  {selectedCategory ? `${selectedCategory} favorites` : 'Suggested food items'}
                </h2>
                {visibleItems.length ? (
                  <div className="customer-menu">
                    {visibleItems.map(({ item, shop }) => (
                      <article className="customer-food-card" key={`${shop._id}-${item._id}`}>
                        <img alt={item.name} src={`${API_BASE_URL}${item.image}`} />
                        <div className="customer-food-card__details">
                          <span>{shop.name} · {item.type}</span>
                          <h3>{item.name}</h3>
                          <div className="customer-food-card__rating" aria-label="No ratings yet">
                            {[0, 1, 2, 3, 4].map((star) => (
                              <FaStar aria-hidden="true" key={star} />
                            ))}
                            <span>New</span>
                          </div>
                          <strong>₹{Number(item.price).toFixed(2)}</strong>
                        </div>
                        <button
                          aria-label={`Add ${item.name} to cart`}
                          onClick={() => addToCart(shop, item)}
                          type="button"
                        >
                          <FaShoppingBasket aria-hidden="true" />
                          Add
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="customer-empty__inline">No food items match your search.</p>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default UserDashbord;
