import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './styles/bottom-bar.css';
import './components/Sheet/Sheet.css';
import './components/Carousel/carousel.css';

// Блок pinch-zoom (iOS gesturestart) и ctrl+wheel (desktop)
document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
document.addEventListener(
  'wheel',
  (e) => {
    if ((e as WheelEvent).ctrlKey) e.preventDefault();
  },
  { passive: false }
);

// Блок двойного тапа -> zoom
let lastTouchEnd = 0;
document.addEventListener(
  'touchend',
  (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault(); // отменяем double-tap zoom
    }
    lastTouchEnd = now;
  },
  { passive: false }
);

// Резерв: две пальца = попытка zoom -> гасим
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
