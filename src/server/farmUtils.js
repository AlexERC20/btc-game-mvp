export const FARM_TZ = process.env.FARM_TZ || 'UTC';
export const BASE_USD_LIMIT = Number(process.env.BASE_USD_LIMIT || 5000);
export const BONUS_PER_ACTIVE_FRIEND_USD = Number(process.env.BONUS_PER_ACTIVE_FRIEND_USD || 500);
export const FEATURE_DYNAMIC_LIMIT_USD = process.env.FEATURE_DYNAMIC_LIMIT_USD !== 'false';

export function dayString(date = new Date(), tz = FARM_TZ) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function dailyUsdLimit(activeFriends) {
  return BASE_USD_LIMIT + BONUS_PER_ACTIVE_FRIEND_USD * activeFriends;
}
