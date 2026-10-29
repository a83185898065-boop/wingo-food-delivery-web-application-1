import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoLocationSharp, IoSearch } from "react-icons/io5";
import { TbCurrentLocation } from "react-icons/tb";
import "leaflet/dist/leaflet.css";
import "./cheakout.css";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const DEFAULT_POSITION = [26.8467, 80.9462];

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(event) {
      setPosition([event.latlng.lat, event.latlng.lng]);
    },
  });

  return <Marker position={position} icon={markerIcon} />;
}

function Checkout({
  cart = [],
  cartTotal = 0,
  deliveryAddress = "",
  initialPosition = DEFAULT_POSITION,
  isPlacingOrder = false,
  onDeliveryAddressChange = () => {},
  onPanelChange = () => {},
  onPaymentMethodChange = () => {},
  onSubmit = () => {},
  paymentMethod = "cod",
  changeQuantity = () => {},
}) {
  const [position, setPosition] = useState(initialPosition);
  const [address, setAddress] = useState(deliveryAddress || "");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (deliveryAddress) {
      setAddress(deliveryAddress);
    }
  }, [deliveryAddress]);

  useEffect(() => {
    if (Array.isArray(initialPosition) && initialPosition.length === 2) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  const syncAddress = (nextAddress) => {
    const cleanAddress = nextAddress || "";
    setAddress(cleanAddress);
    if (onDeliveryAddressChange) {
      onDeliveryAddressChange(cleanAddress);
    }
  };

  const getAddress = async (lat, lon) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`
      );

      if (!response.ok) throw new Error("Address lookup failed");

      const data = await response.json();
      syncAddress(data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } catch (error) {
      console.error(error);
      syncAddress(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  };

  const searchAddress = async () => {
    if (!search.trim()) return;

    try {
      setLoading(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(search)}`
      );

      if (!response.ok) throw new Error("Address search failed");

      const results = await response.json();

      if (!results.length) {
        alert("Address not found. Please try another search.");
        return;
      }

      const result = results[0];
      const newPosition = [Number(result.lat), Number(result.lon)];
      setPosition(newPosition);
      syncAddress(
        result.display_name || `${newPosition[0].toFixed(5)}, ${newPosition[1].toFixed(5)}`
      );
    } catch (error) {
      console.error(error);
      alert("Unable to search address. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const newPosition = [coords.latitude, coords.longitude];
        setPosition(newPosition);
        await getAddress(coords.latitude, coords.longitude);
      },
      () => alert("Location permission denied. Please allow location access."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const deliveryFee = cart.length ? 35 : 0;
  const taxes = Number((cartTotal * 0.08).toFixed(2));
  const total = cartTotal + deliveryFee + taxes;

  const handleSubmit = (event) => {
    if (!address.trim()) {
      alert("Please select your delivery location first.");
      return;
    }

    onSubmit(event, { latitude: position[0], longitude: position[1] });
  };

  return (
    <div className="checkout-shell">
      <div className="checkout-container">
        <div className="checkout-back">
          <button
            type="button"
            onClick={() => onPanelChange("cart")}
            aria-label="Back to cart"
          >
            <IoIosArrowRoundBack />
          </button>
        </div>

        <div className="checkout-card">
          <header className="checkout-header">
            <h1 className="checkout-title">Checkout</h1>
            <span className="checkout-pill">Fast delivery</span>
          </header>

          <section className="checkout-section">
            <h2 className="section-label">
              <IoLocationSharp />
              Delivery location
            </h2>

            <div className="address-row">
              <input
                type="text"
                className="address-input"
                placeholder="Search area, street or address"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") searchAddress();
                }}
              />

              <div className="address-actions">
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Search delivery address"
                  onClick={searchAddress}
                  disabled={loading}
                >
                  <IoSearch />
                </button>

                <button
                  type="button"
                  className="icon-button"
                  aria-label="Use current location"
                  onClick={useCurrentLocation}
                  disabled={loading}
                >
                  <TbCurrentLocation />
                </button>
              </div>
            </div>

            <p className="map-help">
              Search your address or click on the map to select your delivery
              location.
            </p>

            <div className="checkout-map">
              <MapContainer
                center={position}
                zoom={15}
                scrollWheelZoom
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <LocationMarker
                  position={position}
                  setPosition={(newPosition) => {
                    setPosition(newPosition);
                    getAddress(newPosition[0], newPosition[1]);
                  }}
                />

                <MapCenterUpdater position={position} />
              </MapContainer>
            </div>

            <div className="selected-address">
              <IoLocationSharp />
              <div>
                <strong>
                  {loading ? "Finding address..." : "Selected delivery location"}
                </strong>
                <p>{address || `${position[0].toFixed(5)}, ${position[1].toFixed(5)}`}</p>
              </div>
            </div>
          </section>

          <section className="checkout-items-section">
            <h2 className="section-label">Order items</h2>
            {cart.length ? (
              <ul className="checkout-items">
                {cart.map((line) => (
                  <li key={line.itemId} className="checkout-item-row">
                    <div className="checkout-item-meta">
                      <span className="checkout-item-name">{line.name}</span>
                      <small>₹{Number(line.price).toFixed(2)} each</small>
                    </div>

                    <div className="checkout-item-actions">
                      <button
                        type="button"
                        aria-label={`Decrease quantity for ${line.name}`}
                        onClick={() => changeQuantity(line.itemId, -1)}
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        aria-label={`Increase quantity for ${line.name}`}
                        onClick={() => changeQuantity(line.itemId, 1)}
                      >
                        +
                      </button>
                    </div>

                    <strong>₹{(line.price * line.quantity).toFixed(2)}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="checkout-empty">Your cart is empty.</p>
            )}
          </section>

          <section className="payment-section">
            <h2 className="section-label">Payment method</h2>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={() => onPaymentMethodChange("cod")}
                />
                <span>Cash on delivery</span>
              </label>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="razorpay"
                  checked={paymentMethod === "razorpay"}
                  onChange={() => onPaymentMethodChange("razorpay")}
                />
                <span>Razorpay</span>
              </label>
            </div>
          </section>

          <section className="summary-box">
            <div className="summary-row">
              <span>Item total</span>
              <strong>₹{Number(cartTotal).toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Delivery fee</span>
              <strong>₹{deliveryFee.toFixed(2)}</strong>
            </div>
            <div className="summary-row">
              <span>Taxes</span>
              <strong>₹{taxes.toFixed(2)}</strong>
            </div>
            <div className="summary-row total-row">
              <span>Total</span>
              <strong>₹{total.toFixed(2)}</strong>
            </div>

            <button
              type="button"
              className="checkout-button"
              onClick={handleSubmit}
              disabled={isPlacingOrder || !cart.length}
            >
              {isPlacingOrder ? "Processing..." : "Place order"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function MapCenterUpdater({ position }) {
  const map = useMapEvents({});

  React.useEffect(() => {
    map.setView(position, map.getZoom());
  }, [map, position]);

  return null;
}

export default Checkout;