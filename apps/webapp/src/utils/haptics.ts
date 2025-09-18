export function haptic(type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' = 'light') {
  try {
    (window as any).webkit?.messageHandlers?.haptic?.postMessage(type);
  } catch (error) {
    // ignore bridge errors
  }

  const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
  if (tg) {
    if (type === 'selection') tg.selectionChanged();
    else if (type === 'success') tg.notificationOccurred('success');
    else tg.impactOccurred(type);
    return;
  }

  if (navigator.vibrate) {
    const ms = { light: 10, selection: 10, medium: 30, heavy: 50, success: 20 }[type] ?? 10;
    navigator.vibrate(ms);
  }
}
