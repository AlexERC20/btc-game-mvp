export function formatUsdShort(n){
  const num = Number(n) || 0;
  const abs = Math.abs(num);
  if(abs < 1000) return '$'+abs.toLocaleString();
  const units = [
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' }
  ];
  for(const u of units){
    if(abs >= u.v){
      const val = abs / u.v;
      const dec = val >= 100 ? 0 : val >= 10 ? 1 : 2;
      return '$'+val.toFixed(dec).replace(/\.0+$|0+$/,'')+u.s;
    }
  }
  return '$'+abs.toLocaleString();
}
