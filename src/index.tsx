import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Toaster position="top-right" />
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality with improved error handling
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // FORCE UNREGISTER to clear old cache
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
      for (let registration of registrations) {
        registration.unregister().then(boolean => {
          console.log('Service Worker unregistered: ', boolean);
        });
      }
      console.log('All Service Workers unregistered to force update.');
    });

    /* 
    // TEMPORARILY DISABLED REGISTRATION TO FLUSH CACHE
    // Use a timeout to ensure the app renders properly even if the service worker fails
    setTimeout(() => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered with scope:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
          // App should still function without service worker
          console.log('Application will run without offline capabilities');
        });
    }, 1000); // Delay service worker registration to ensure UI renders first
    */
  });
} else {
  console.log('Service workers are not supported in this browser. App will run without offline capabilities.');
} 