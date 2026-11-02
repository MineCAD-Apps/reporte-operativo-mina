import {productionCaps,limitMonthlyProduction} from './production.mjs?v=production-1';
import {stableStringify,matchesSignature,planSignatureInputs} from './plan-signature.mjs?v=production-1';
import {discreteLevelCapacity} from './capacity.mjs?v=production-1';
/** MineCAD planning kernel. UTC dates; continuous six-day work calendar. */
const MS=86400000,ANCHOR=Date.UTC(2026,9,5)/MS,EPS=1e-8;
export const day=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error('Fecha inválida: '+s);const n=Date.parse(s+'T00:00:00Z')/MS;if(!Number.isFinite(n)||new Date(n*MS).toISOString().slice(0,10)!==s)throw Error('Fecha inválida: '+s);return n};
export const iso=n=>new Date(Math.floor(n)*MS).toISOString().slice(0,10);
export const tick=s=>{const d=day(s)-ANCHOR,w=Math.floor(d/7),r=d-w*7;return w*6+Math.min(r,6)};
export const dateAt=t=>{const w=Math.floor((t+EPS)/6),r=t-w*6;return iso(ANCHOR+w*7+Math.max(0,Math.floor(r+EPS)))};
export const weekAt=t=>iso(ANCHOR+Math.floor((t+EPS)/6)*7);
export const endDate=t=>dateAt(t-EPS*10);
const engineClone=x=>JSON.parse(JSON.stringify(x));
export function validate(base,plan){
 productionCaps(plan.productionCaps||[]);
 const ids=new Set(),errors=[];try{day(plan.start)}catch(e){errors.push(e.message)}
 for(const w of base.works){if(!w.id||ids.has(w.id))errors.push('ID vacío o duplicado: '+w.id);ids.add(w.id);if(!['m','t'].includes(w.unit))errors.push('Unidad inválida: '+w.id);const p=plan.works[w.id];if(!p||!Number.isFinite(+p.quantity)||+p.quantity<0||+p.quantity>+w.target+EPS)errors.push('Alcance inválido: '+w.id);if(p){try{day(p.earliest)}catch(e){errors.push(e.message)}}}
 for(const d of base.dependencies){if(!ids.has(d.predecessor)||!ids.has(d.successor)||d.predecessor===d.successor)errors.push('Precedencia inválida: '+d.predecessor+' → '+d.successor);if(!['proportional','next-week'].includes(d.mode))errors.push('Regla de precedencia inválida')}
 const seen=new Set();for(const r of plan.rates){const key=r.workId+'|'+r.week;if(!ids.has(r.workId)||!Number.isFinite(+r.rate)||+r.rate<0||seen.has(key))errors.push('Ritmo inválido o repetido: '+key);seen.add(key);try{if((day(r.week)-ANCHOR)%7!==0)errors.push('El ritmo debe iniciar un lunes: '+r.week)}catch(e){errors.push(e.message)}}
 for(const p of plan.pauses){if(!ids.has(p.workId))errors.push('Obra de pausa inválida');try{if(day(p.resume)<=day(p.from))errors.push('La reanudación debe ser posterior a la pausa')}catch(e){errors.push(e.message)}}
 for(const c of plan.capacities||[]){if(!c.group||!Number.isFinite(+c.capacity)||+c.capacity<0)errors.push('Capacidad inválida');try{day(c.from)}catch(e){errors.push(e.message)}}
 const visiting=new Set(),done=new Set(),order=[];const visit=id=>{if(visiting.has(id))throw Error('Ciclo de precedencias en '+id);if(done.has(id))return;visiting.add(id);for(const d of base.dependencies.filter(d=>d.successor===id)){if(ids.has(d.predecessor))visit(d.predecessor)}visiting.delete(id);done.add(id);order.push(id)};
 if(errors.length)throw Error(errors.join('\n'));for(const id of ids)visit(id);return order;
}
export function schedule(base,plan){
 const order=validate(base,plan),rows={},warnings=[],segments=[];
 const signature=stableStringify(planSignatureInputs(base,plan));
 if(plan.leveledSegments&&matchesSignature(plan.levelingSource,JSON.parse(signature))){
  for(const w of base.works)rows[w.id]={work:w,start:null,end:null,weekly:{},segments:[],quantity:+plan.works[w.id].quantity,pending:0};
  for(const seg of plan.leveledSegments){const r=rows[seg.workId];r.start??=seg.start;r.end=seg.end;r.segments.push(seg);let t=seg.start;while(t<seg.end-EPS){const week=Math.floor((t+EPS)/6)*6,until=Math.min(seg.end,week+6),q=seg.quantity*(until-t)/(seg.end-seg.start);r.weekly[weekAt(t)]=(r.weekly[weekAt(t)]||0)+q;t=until;}segments.push(seg)}
  return {start:tick(plan.start),rows,segments,warnings,capacities:plan.capacityAdjustment?.version===1?[]:capacityConflicts(base,plan,segments),capacityAdjustment:plan.capacityAdjustment,productionAdjustment:plan.productionAdjustment,productionCaps:plan.productionCaps,end:Math.max(tick(plan.start),...segments.map(s=>s.end))};
 }
 if(plan.autoAdjust)return schedule(base,levelCapacity(base,plan));
 for(const id of order){
  const work=base.works.find(w=>w.id===id),cfg=plan.works[id],rates=plan.rates.filter(r=>r.workId===id).sort((a,b)=>a.week.localeCompare(b.week)),pauses=plan.pauses.filter(p=>p.workId===id).map(p=>({...p,a:tick(p.from),b:tick(p.resume)}));
  const deps=base.dependencies.filter(d=>d.successor===id);let t=Math.max(tick(plan.start),tick(cfg.earliest)),remaining=+cfg.quantity;const result=rows[id]={work,start:null,end:null,weekly:{},segments:[],quantity:remaining,pending:0};
  if(deps.some(d=>rows[d.predecessor]?.pending>EPS)){result.pending=remaining;warnings.push(work.name+': pendiente de antecedente sin ritmo futuro');continue}
  for(const d of deps){let finish=rows[d.predecessor]?.end;if(finish!==null&&finish!==undefined){if(d.mode==='next-week')finish=Math.ceil((finish-EPS)/6)*6;t=Math.max(t,finish)}}
  const eventTimes=[...rates.map(r=>tick(r.week)),...pauses.flatMap(p=>[p.a,p.b])].sort((a,b)=>a-b);let guard=0;
  while(remaining>EPS){
   if(++guard>200000)throw Error('Programa excesivamente largo: '+work.name);
   const current=rates.filter(r=>tick(r.week)<=t+EPS).at(-1),paused=pauses.some(p=>t>=p.a-EPS&&t<p.b-EPS),rate=paused?0:Number(current?.rate||0),next=eventTimes.find(x=>x>t+EPS);
   if(rate<=EPS){if(next!==undefined){t=next;continue}result.pending=remaining;warnings.push(work.name+': sin ritmo positivo posterior');break}
   let until=Math.min((Math.floor((t+EPS)/6)+1)*6,next??Infinity,t+remaining/rate*6);
   if(until<=t+EPS){t+=EPS*2;continue}
   const quantity=Math.min(remaining,(until-t)*rate/6);const seg={workId:id,start:t,end:until,quantity,rate,group:cfg.resourceGroup||work.resourceGroup,unit:work.unit};
   result.start??=t;result.end=until;result.segments.push(seg);segments.push(seg);const week=weekAt(t);result.weekly[week]=(result.weekly[week]||0)+quantity;remaining-=quantity;t=until;
  }
 }
 return {start:tick(plan.start),rows,segments,warnings,capacities:capacityConflicts(base,plan,segments),productionCaps:plan.productionCaps,end:Math.max(tick(plan.start),...Object.values(rows).map(r=>r.end??tick(plan.start)))};
}
export function capacityConflicts(base,plan,segments){
 const issues=[];
 for(const group of new Set((plan.capacities||[]).map(c=>c.group))){
  const caps=plan.capacities.filter(c=>c.group===group).sort((a,b)=>a.from.localeCompare(b.from));const segs=segments.filter(s=>s.group===group);const unitSet=new Set(segs.map(s=>s.unit));if(unitSet.size>1)throw Error('Un grupo de capacidad no puede mezclar metros y toneladas: '+group);
  const events=[...new Set([...segs.flatMap(s=>[s.start,s.end]),...caps.map(c=>tick(c.from))])].sort((a,b)=>a-b);
  for(let i=0;i<events.length-1;i++){const a=events[i],b=events[i+1],cap=caps.filter(c=>tick(c.from)<=a+EPS).at(-1);if(!cap)continue;const active=segs.filter(s=>s.start<=a+EPS&&s.end>a+EPS),demand=active.reduce((sum,s)=>sum+s.rate,0);if(demand>+cap.capacity+EPS)issues.push({group,from:dateAt(a),to:endDate(b),start:a,end:b,demand,capacity:+cap.capacity,works:active.map(s=>s.workId),unit:unitSet.values().next().value})}
 }
 return issues;
}
/** Rebalance whole blasts, preserving scopes, priorities, pauses and dependencies. */
export function levelCapacity(base,plan){
 const cal={validate,tick,weekAt,dateAt,day},original=engineClone(plan);let calculation=engineClone(plan);
 for(let pass=0;pass<100;pass++){
  let adjusted=discreteLevelCapacity(base,calculation,cal);
  if(original.productionCaps?.length)adjusted=limitMonthlyProduction(base,original,adjusted,cal);else delete adjusted.productionAdjustment;
  const starts={},ends={};for(const s of adjusted.leveledSegments){starts[s.workId]=Math.min(starts[s.workId]??Infinity,s.start);ends[s.workId]=Math.max(ends[s.workId]??-Infinity,s.end);}
  let delayed=false;for(const d of base.dependencies){const w=base.works.find(w=>w.id===d.successor);if(w.unit!=='m'||starts[w.id]===undefined||ends[d.predecessor]===undefined)continue;const needed=d.mode==='next-week'?Math.ceil((ends[d.predecessor]-EPS)/6)*6:ends[d.predecessor];if(starts[w.id]<needed-EPS){calculation.works[w.id].earliest=dateAt(Math.ceil(needed-EPS));delayed=true;}}
  if(delayed)continue;
  adjusted.works=original.works;adjusted.projectDependencies=engineClone(base.dependencies);adjusted.autoAdjust=true;
  adjusted.levelingSource=stableStringify(planSignatureInputs(base,adjusted));return adjusted;
 }
 throw Error('No se estabilizaron las dependencias entre desarrollo y producción. Revisa la secuencia de las obras.');
}
export function monthly(result){
 const out={},blastQuantities={};for(const seg of result.segments){let t=seg.start;while(t<seg.end-EPS){const end=Math.min(seg.end,Math.floor(t+EPS)+1),month=dateAt(t).slice(0,7),quantity=seg.quantity*(end-t)/(seg.end-seg.start);const row=(out[month]??={});row[seg.workId]=(row[seg.workId]||0)+quantity;if(seg.resourceQuantity!==undefined){const used=seg.resourceQuantity*(end-t)/(seg.end-seg.start),b=(blastQuantities[month]??={});b[seg.workId]=(b[seg.workId]||0)+used}t=end}}
 Object.defineProperty(out,'blastQuantities',{value:blastQuantities});Object.defineProperty(out,'productionCaps',{value:result.productionCaps||[]});
 Object.defineProperty(out,'bounds',{value:{from:dateAt(result.start??0).slice(0,7),to:endDate(result.end).slice(0,7)}});return out;
}
export function setRate(plan,workId,week,rate){day(week);if(!Number.isFinite(+rate)||+rate<0)throw Error('El ritmo debe ser un número no negativo');const p=engineClone(plan);p.rates=p.rates.filter(r=>r.workId!==workId||r.week!==week);p.rates.push({planId:p.id,workId,week,rate:+rate});delete p.leveledWeekly;delete p.levelingSource;delete p.leveledSegments;delete p.capacityAdjustment;delete p.productionAdjustment;if(plan.autoAdjust||plan.capacityAdjustment?.version===1)p.autoAdjust=true;return p}
export function newPlan(plan,name,comments){if(!name.trim())throw Error('Escribe un nombre');const p=engineClone(plan);p.id=globalThis.crypto?.randomUUID?.()||'plan-'+Date.now();p.name=name.trim();p.comments=comments;p.createdAt=p.updatedAt=new Date().toISOString();p.revision=0;let source=null;if(p.levelingSource&&p.leveledSegments){try{const original=JSON.parse(p.levelingSource);const current=planSignatureInputs({dependencies:p.projectDependencies||original.dependencies,productionFactors:original.productionFactors},p);if(matchesSignature(p.levelingSource,current))source=current}catch{}}for(const r of p.rates)r.planId=p.id;if(source){source.rates=p.rates;p.levelingSource=stableStringify(source)}else{for(const k of ['leveledSegments','leveledWeekly','levelingSource','capacityAdjustment','productionAdjustment'])delete p[k]}return p}
