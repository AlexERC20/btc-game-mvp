export function getTg() {
  return (window as any)?.Telegram?.WebApp;
}

function cmpVersion(a = '0.0', b = '0.0') {
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0, db = pb[i] ?? 0;
    if (da !== db) return da > db ? 1 : -1;
  }
  return 0;
}

export const tgSupport = {
  hasShowAlert(): boolean {
    const tg = getTg();
    return !!(tg && typeof tg.showAlert === 'function' && cmpVersion(tg.version, '6.2') >= 0);
  },
  hasHaptics(): boolean {
    const tg = getTg();
    return !!(tg && tg.HapticFeedback && typeof tg.HapticFeedback.impactOccurred === 'function');
  },
};

export function showAlertSafe(message: string) {
  try {
    if (tgSupport.hasShowAlert()) {
      getTg().showAlert(message);
      return;
    }
  } catch {}
  // максимально безопасный fallback
  try { window.alert(message); } catch {}
}

export const haptic = {
  impact(style: 'light'|'medium'|'heavy'|'rigid'|'soft' = 'light') {
    try {
      if (tgSupport.hasHaptics()) {
        getTg().HapticFeedback.impactOccurred(style);
        return true;
      }
    } catch {}
    if ('vibrate' in navigator) { try { (navigator as any).vibrate?.(20); } catch {} }
    return false;
  },
  selection() {
    try {
      if (tgSupport.hasHaptics()) {
        getTg().HapticFeedback.selectionChanged();
        return true;
      }
    } catch {}
    return false;
  },
};
