import React from 'react';
import { createRoot } from 'react-dom/client';
// Ensure axios config runs before any components that make requests
import '../assets/src/axiosConfig.js';
import App from '../assets/src/app.jsx';
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import "leaflet/dist/leaflet.css";

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

