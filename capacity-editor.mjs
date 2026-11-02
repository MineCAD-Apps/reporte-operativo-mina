import {capacitySuggestion} from './capacity.mjs?v=capacity-shots-1';
export function capacityEvents(rows,start){
 const dates=new Set();const events=rows.map(r=>{
  const date=String(r.from||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw Error('Indica una fecha válida para cada capacidad.');
  if(dates.has(date))throw Error('Hay dos capacidades con la misma fecha.');dates.add(date);
  if(r.capacity===''||r.capacity===undefined)throw Error('Indica la capacidad semanal.');
  const c=Number(r.capacity),check=capacitySuggestion(c);if(!check.valid)throw Error(check.suggested===null?'La capacidad debe ser un número no negativo.':`La capacidad ${c} no es divisible por 1.5. La cantidad válida más cercana es ${check.suggested} m/semana. Usa el botón de sugerencia para aceptarla.`);
  return {group:'metros',from:date,capacity:c,unit:'m',comment:String(r.comment||'').trim().slice(0,240)};
 }).sort((a,b)=>a.from.localeCompare(b.from));
 if(!events.length||events[0].from>start)throw Error('La capacidad inicial debe cubrir el inicio del plan.');return events;
}
export function openCapacityEditor({plan,showEditor,onApply,esc}){
 let rows=(plan.capacities||[]).filter(c=>c.group==='metros'&&c.unit==='m').sort((a,b)=>a.from.localeCompare(b.from)).map(c=>({...c}));
 if(!rows.length||rows[0].from>plan.start)rows.unshift({from:plan.start,capacity:34.5,comment:'Capacidad inicial'});
 const rowHTML=(r,i)=>`<div class="capacity-event" data-capacity-row><div class="capacity-event-heading"><strong>${i===0?'Capacidad inicial':'Cambio de capacidad'}</strong>${i?'<button type="button" data-remove-capacity-row>Quitar</button>':''}</div><div class="two"><label>Desde<input data-cap-from type="date" value="${esc(r.from||'')}" required></label><label>Capacidad (m/semana)<input data-cap-value type="number" min="0" step="any" value="${esc(r.capacity??'')}" required></label></div><label>Motivo o comentario<input data-cap-comment maxlength="240" value="${esc(r.comment||'')}" placeholder="Nuevo scooptram, mejora de ventilación, nuevo camión…"></label><div class="capacity-suggestion" data-cap-suggestion aria-live="polite"></div></div>`;
 const read=()=>[...document.querySelectorAll('#capacityEvents [data-capacity-row]')].map(row=>({from:row.querySelector('[data-cap-from]').value,capacity:row.querySelector('[data-cap-value]').value,comment:row.querySelector('[data-cap-comment]').value}));
 showEditor('Capacidad y equipos','AVANCE LINEAL',`<p>Capacidad total de Desarrollo + Preparación. Los cambios se prorratean por los días de lunes a sábado que correspondan a cada tramo.</p><p>Se ajusta en disparos de 1.5 m, hasta 12 m por obra y 9 m por contrapozo. Un remanente menor consume un disparo completo sin aumentar la meta de la obra.</p><div id="capacityEvents">${rows.map(rowHTML).join('')}</div><button type="button" id="addCapacityEvent">(+) Agregar fecha y nueva capacidad</button><p id="capacityFormError" class="danger" role="alert"></p>`,()=>{
  try{const events=capacityEvents(read(),plan.start),p=JSON.parse(JSON.stringify(plan));p.capacities=[...(p.capacities||[]).filter(c=>!(c.group==='metros'&&c.unit==='m')),...events];for(const k of ['leveledSegments','leveledWeekly','levelingSource','capacityAdjustment'])delete p[k];onApply(p)}catch(e){document.querySelector('#capacityFormError').textContent=e.message;throw e}
 });
 const container=document.querySelector('#capacityEvents');
 const refresh=()=>{for(const row of container.querySelectorAll('[data-capacity-row]')){const input=row.querySelector('[data-cap-value]'),box=row.querySelector('[data-cap-suggestion]');if(input.value===''){box.innerHTML='';continue}const c=capacitySuggestion(input.value);box.innerHTML=c.valid?'':c.suggested===null?'Escribe una capacidad no negativa.':`No es múltiplo de 1.5. Capacidad válida más cercana: <strong>${c.suggested} m/semana</strong>. <button type="button" data-use-capacity="${c.suggested}">Usar ${c.suggested}</button>`}};
 container.oninput=()=>{document.querySelector('#capacityFormError').textContent='';refresh()};
 container.onclick=e=>{const suggestion=e.target.closest('[data-use-capacity]');if(suggestion){suggestion.closest('[data-capacity-row]').querySelector('[data-cap-value]').value=suggestion.dataset.useCapacity;refresh();return}const remove=e.target.closest('[data-remove-capacity-row]');if(remove){remove.closest('[data-capacity-row]').remove();refresh()}};
 document.querySelector('#addCapacityEvent').onclick=()=>{rows=read();rows.push({from:'',capacity:'',comment:''});container.innerHTML=rows.map(rowHTML).join('');refresh()};refresh();
}
