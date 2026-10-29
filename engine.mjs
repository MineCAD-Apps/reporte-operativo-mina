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
 const signature=JSON.stringify({rates:plan.rates,pauses:plan.pauses,works:plan.works,capacities:plan.capacities,dependencies:base.dependencies});
 if(plan.leveledSegments&&plan.levelingSource===signature){
  for(const w of base.works)rows[w.id]={work:w,start:null,end:null,weekly:{},segments:[],quantity:+plan.works[w.id].quantity,pending:0};
  for(const seg of plan.leveledSegments){const r=rows[seg.workId];r.start??=seg.start;r.end=seg.end;r.segments.push(seg);r.weekly[weekAt(seg.start)]=(r.weekly[weekAt(seg.start)]||0)+seg.quantity;segments.push(seg)}
  return {start:tick(plan.start),rows,segments,warnings,capacities:capacityConflicts(base,plan,segments),end:Math.max(tick(plan.start),...segments.map(s=>s.end))};
 }
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
 return {start:tick(plan.start),rows,segments,warnings,capacities:capacityConflicts(base,plan,segments),end:Math.max(tick(plan.start),...Object.values(rows).map(r=>r.end??tick(plan.start)))};
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
/** Daily resource leveling in work-day slices; never increases rates or shifts dated events. */
export function levelCapacity(base,plan){
 const order=validate(base,plan).sort((a,b)=>(+plan.works[a].priority||0)-(+plan.works[b].priority||0)),p=engineClone(plan),remaining=Object.fromEntries(base.works.map(w=>[w.id,+p.works[w.id].quantity])),done={},weekly={},leveledSegments=[],start=tick(p.start);let t=start;for(const [id,q]of Object.entries(remaining))if(q<=EPS)done[id]=start;const total=Object.values(remaining).reduce((a,b)=>a+b,0);if(total<=EPS)return p;
 const maxDate=Math.max(start,...p.rates.map(r=>tick(r.week)),...p.pauses.map(x=>tick(x.resume)),...(p.capacities||[]).map(x=>tick(x.from)));
 let iterations=0;
 while(Object.values(remaining).some(x=>x>EPS)){
  if(++iterations>200000)throw Error('No se pudo ajustar: revisa ritmos, capacidades y pausas');let progressed=false,used={};
  // At most one business-day slice; repeat at fractional predecessor finishes.
  let intervalEnd=Math.floor(t+EPS)+1;
  const allEvents=[...p.rates.map(r=>tick(r.week)),...p.pauses.flatMap(x=>[tick(x.from),tick(x.resume)]),...(p.capacities||[]).map(x=>tick(x.from)),...Object.values(p.works).map(x=>tick(x.earliest))].filter(x=>x>t+EPS);
  if(allEvents.length)intervalEnd=Math.min(intervalEnd,...allEvents);
  const eligible=[];
  for(const id of order){if(remaining[id]<=EPS)continue;const w=base.works.find(w=>w.id===id),cfg=p.works[id];if(t<tick(cfg.earliest)-EPS)continue;const deps=base.dependencies.filter(d=>d.successor===id);if(deps.some(d=>done[d.predecessor]===undefined||t<(d.mode==='next-week'?Math.ceil((done[d.predecessor]-EPS)/6)*6:done[d.predecessor])-EPS))continue;
   if(p.pauses.some(x=>x.workId===id&&t>=tick(x.from)-EPS&&t<tick(x.resume)-EPS))continue;
   const rate=+p.rates.filter(r=>r.workId===id&&tick(r.week)<=t+EPS).sort((a,b)=>a.week.localeCompare(b.week)).at(-1)?.rate||0;if(rate<=EPS)continue;
   const group=cfg.resourceGroup||w.resourceGroup,cap=p.capacities?.filter(c=>c.group===group&&tick(c.from)<=t+EPS).sort((a,b)=>a.from.localeCompare(b.from)).at(-1);const available=cap?Math.max(0,+cap.capacity-(used[group]||0)):Infinity;const assigned=Math.min(rate,available);if(assigned<=EPS)continue;used[group]=(used[group]||0)+assigned;eligible.push({id,rate:assigned});intervalEnd=Math.min(intervalEnd,t+remaining[id]/assigned*6);
  }
  for(const {id,rate}of eligible){const q=Math.min(remaining[id],rate*(intervalEnd-t)/6);remaining[id]-=q;const w=base.works.find(w=>w.id===id);leveledSegments.push({workId:id,start:t,end:intervalEnd,quantity:q,rate,group:p.works[id].resourceGroup||w.resourceGroup,unit:w.unit});const key=id+'|'+weekAt(t);weekly[key]=(weekly[key]||0)+q;if(remaining[id]<=EPS)done[id]=intervalEnd;progressed=true}
  if(!progressed&&t>maxDate+6)throw Error('No hay capacidad o ritmo suficiente para terminar todas las obras');t=intervalEnd;
 }
 // Store resource-leveled execution segments as an explicit plan result, preserving dated requested rates.
 p.leveledWeekly=Object.entries(weekly).map(([key,quantity])=>{const [workId,week]=key.split('|');return {workId,week,quantity}});p.leveledSegments=leveledSegments;p.levelingAppliedAt=new Date().toISOString();p.levelingSource=JSON.stringify({rates:p.rates,pauses:p.pauses,works:p.works,capacities:p.capacities,dependencies:base.dependencies});return p;
}
export function monthly(result){
 const out={};for(const seg of result.segments){let t=seg.start;while(t<seg.end-EPS){const end=Math.min(seg.end,Math.floor(t+EPS)+1),month=dateAt(t).slice(0,7),quantity=seg.quantity*(end-t)/(seg.end-seg.start);const row=(out[month]??={});row[seg.workId]=(row[seg.workId]||0)+quantity;t=end}}
 Object.defineProperty(out,'bounds',{value:{from:dateAt(result.start??0).slice(0,7),to:endDate(result.end).slice(0,7)}});return out;
}
export function setRate(plan,workId,week,rate){day(week);if(!Number.isFinite(+rate)||+rate<0)throw Error('El ritmo debe ser un número no negativo');const p=engineClone(plan);p.rates=p.rates.filter(r=>r.workId!==workId||r.week!==week);p.rates.push({planId:p.id,workId,week,rate:+rate});delete p.leveledWeekly;delete p.levelingSource;return p}
export function newPlan(plan,name,comments){if(!name.trim())throw Error('Escribe un nombre');const p=engineClone(plan);p.id=globalThis.crypto?.randomUUID?.()||'plan-'+Date.now();p.name=name.trim();p.comments=comments;p.createdAt=p.updatedAt=new Date().toISOString();p.revision=0;for(const r of p.rates)r.planId=p.id;return p}
