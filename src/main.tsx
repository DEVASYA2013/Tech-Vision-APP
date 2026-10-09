import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register the PWA Service Worker for offline caching and Android/Windows installability
registerSW({
  immediate: true,
  onRegisteredSW(swUrl) {
    console.info('[PWA] Service Worker registered:', swUrl);
  },
  onOfflineReady() {
    console.info('[PWA] App is ready to work offline.');
  },
});

createRoot(document.getElementById('root')!).render(<App />);
