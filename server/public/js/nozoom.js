// Блок двойного тапа (double-tap zoom)
let lastTouchEnd = 0;
document.addEventListener('touchend', function (e) {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

// Блок pinch-zoom
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

// На всякий случай — запрет масштабирования колесом/клавишами (десктоп WebApp)
document.addEventListener('wheel', e => {
  if (e.ctrlKey) e.preventDefault();
}, { passive: false });
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=')) e.preventDefault();
});
