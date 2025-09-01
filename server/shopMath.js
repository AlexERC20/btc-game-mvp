export const PRICE_BUMP_STEP = 5;   // каждые 5 покупок
export const PRICE_BUMP_RATE = 0.08;// +8%

export function calcPrice(base, purchases){
  const bumps = Math.floor(purchases / PRICE_BUMP_STEP);
  return Math.round(base * (1 + PRICE_BUMP_RATE * bumps));
}
