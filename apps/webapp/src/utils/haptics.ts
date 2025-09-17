export function haptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' = 'light') {
  const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    if (type === 'selection') tg.selectionChanged();
    else if (type === 'success') tg.notificationOccurred('success');
    else tg.impactOccurred(type);
    return;
  }
  if (navigator.vibrate) {
    const ms = { light: 10, selection: 10, medium: 30, heavy: 50, success: 20 }[type];
    navigator.vibrate(ms);
  }
}
