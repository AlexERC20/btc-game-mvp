export function getTg() {
  return (window as any)?.Telegram?.WebApp;
}

function cmpVersion(a = '0.0', b = '0.0') {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0, db = pb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

export const tgSupport = {
  hasShowAlert(): boolean {
    const tg = getTg();
    return !!(tg && typeof tg.showAlert === 'function');
  },
  hasHaptics(): boolean {
    const tg = getTg();
    return !!(tg && tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function');
  },
  webAppVersionAtLeast(v: string): boolean {
    const tg = getTg();
    return !!(tg && cmpVersion(tg.version, v) >= 0);
  },
};

export const haptic = {
  impact(style: 'light'|'medium'|'heavy'|'rigid'|'soft' = 'light') {
    try {
      const tg = getTg();
      if (tgSupport.hasHaptics()) {
        tg.HapticFeedback.impactOccurred(style);
        return true;
      }
    } catch {}
    if ('vibrate' in navigator) {
      (navigator as any).vibrate?.(20);
      return true;
    }
    return false;
  }
};

export function showAlertSafe(message: string) {
  try {
    const tg = getTg();
    if (tgSupport.hasShowAlert()) {
      tg.showAlert(message);
      return;
    }
  } catch {}
  // Фолбэк браузера
  alert(message);
}

