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
