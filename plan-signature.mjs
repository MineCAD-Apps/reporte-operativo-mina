import {productionPerMeter} from './production.mjs?v=production-1';
// Google RPC may reorder object properties. Array order and values remain significant.
export function stableStringify(value){
 return JSON.stringify(value,function(key,item){
  return item&&typeof item==='object'&&!Array.isArray(item)
   ?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item;
 });
}
export function matchesSignature(saved,current){
 if(typeof saved!=='string'||!saved)return false;
 try{return stableStringify(JSON.parse(saved))===stableStringify(current)}catch{return false}
}

export function planSignatureInputs(base,p){
 const value={rates:p.rates,pauses:p.pauses,works:p.works,capacities:p.capacities,dependencies:base.dependencies};
 if(p.productionCaps?.length){value.productionCaps=p.productionCaps;value.productionAllocation=p.productionAllocation||'balanced';value.productionFactors=base.productionFactors||Object.fromEntries((base.works||[]).filter(w=>w.type==='Desarrollo'&&w.material==='Min').map(w=>[w.id,productionPerMeter(base,w)]));}
 return value;
}
