import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { required } from './domain/assert';
import './styles.css';

// Keep the app working offline and pick up new versions automatically.
registerSW({ immediate: true });

// Ask the browser not to evict our IndexedDB data under storage pressure.
if ('storage' in navigator && 'persist' in navigator.storage) {
  void navigator.storage.persist();
}

createRoot(required(document.getElementById('root'), 'Missing #root element')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
