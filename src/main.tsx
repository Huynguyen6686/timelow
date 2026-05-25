import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Gracefully intercept and prevent benign Vite WebSocket and fetch connection warnings
// from triggering unhandled rejection crash overlays in the browser environment.
if (typeof window !== 'undefined') {
  const isBenignError = (msg: string) => {
    const str = msg.toLowerCase();
    return str.includes('websocket') || 
           str.includes('hmr') || 
           str.includes('vite') || 
           str.includes('failed to fetch') || 
           str.includes('networkerror') || 
           str.includes('load failed');
  };

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason?.message || String(reason || '');
    if (
      isBenignError(msg) ||
      (reason?.stack && (isBenignError(reason.stack)))
    ) {
      event.preventDefault();
      console.warn('Muted benign local Vite dev server rejection:', reason);
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || '';
    if (isBenignError(msg) || (event.error?.stack && isBenignError(event.error.stack))) {
      event.preventDefault();
      console.warn('Muted benign local Vite dev server error:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Progressive Web App (PWA) Service Worker for smartphone compatibility
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Timeflow Service Worker registered successfully:', reg.scope);
      })
      .catch((err) => {
        console.warn('Timeflow Service Worker registration failed/restricted:', err);
      });
  });
}


