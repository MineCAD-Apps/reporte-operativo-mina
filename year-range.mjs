/** Years affect display only; quantities and dates remain in the planning engine. */
export function availableYears(dates=[],selected=''){
 const years=dates.map(v=>/^\d{4}(?:-|$)/.test(String(v??''))?Number(String(v).slice(0,4)):NaN).filter(y=>Number.isInteger(y)&&y>=1900&&y<=9999);
 if(/^\d{4}$/.test(String(selected))&&Number(selected)>=1900)years.push(Number(selected));
 const first=Math.min(2026,...years),last=Math.max(2028,...years);
 return Array.from({length:last-first+1},(_,i)=>first+i);
}
export function yearPeriod(year){
 if(!/^\d{4}$/.test(String(year)))throw Error('Selecciona un año válido');
 return {from:year+'-'+(Number(year)===2026?'11':'01'),to:year+'-12'};
}
