import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import '../css/custom.css'; // Mantenemos custom.css intacto como ordenó el usuario

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register Service Worker for PWA installability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered!', reg.scope))
      .catch(err => console.error('SW registration failed:', err));
  });
}
