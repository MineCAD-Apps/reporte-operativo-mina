import {stableStringify,matchesSignature} from './plan-signature.mjs?v=compare-plans-1';
// Discrete mine-wide linear capacity, in complete 1.5 m blast equivalents.
export const BLAST=1.5;
const EPS=1e-8;
const clone=x=>JSON.parse(JSON.stringify(x));
export function capacitySuggestion(value){
 const n=Number(value);if(!Number.isFinite(n)||n<0)return {valid:false,suggested:null};
 const lo=Math.floor(n/BLAST)*BLAST,hi=lo+BLAST;
 const suggested=Math.abs(n-lo)<=Math.abs(hi-n)+EPS?lo:hi;
 return {valid:Math.abs(n-suggested)<EPS,suggested};
}
export function isRaise(work){
 const text=[work.name,work.section].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 return /contra\s*pozo|c\s*\/\s*pozo|c\s*\/\s*p\b/.test(text);
}
export const linearWork=w=>w.unit==='m'&&['Desarrollo','Preparación'].includes(w.type);
export const maxShots=w=>(isRaise(w)?9:12)/BLAST;
export function distributeShots(items,budget){
 const ordered=[...items].sort((a,b)=>a.priority-b.priority||a.order-b.order);
 const targets=Object.fromEntries(ordered.map(w=>[w.id,Math.min(w.max,Math.max(0,Math.floor(w.requested/BLAST+EPS)))]));
 let used=Object.values(targets).reduce((a,b)=>a+b,0);
 // One increment/decrement per work per round; priorities decide each round's order.
 const adjust=(list,direction)=>{let changed=false;for(const w of list){if(used===budget)break;const q=targets[w.id];if(direction>0?q<w.max:q>0){targets[w.id]+=direction;used+=direction;changed=true}}return changed};
 while(used>budget&&adjust([...ordered].sort((a,b)=>b.priority-a.priority||a.order-b.order),-1)){}
 while(used<budget&&adjust(ordered,1)){}
 return targets;
}
export function discreteLevelCapacity(base,input,cal){
 const {validate,tick,weekAt,dateAt,day}=cal;const order=validate(base,input),p=clone(input);
 const byId=new Map(base.works.map(w=>[w.id,w]));
 const deps=new Map(base.works.map(w=>[w.id,base.dependencies.filter(d=>d.successor===w.id)]));
 const linear=base.works.filter(linearWork),other=base.works.filter(w=>!linearWork(w));
 const caps=(p.capacities||[]).filter(c=>c.unit==='m'&&c.group==='metros').map(c=>({...c,t:tick(c.from)})).sort((a,b)=>a.t-b.t);
 if(!caps.length)throw Error('Define la capacidad inicial de avance en metros.');
 for(const c of caps){const suggestion=capacitySuggestion(c.capacity);if(!suggestion.valid)throw Error('Capacidad '+c.capacity+' m/semana no divisible por1.5. La más cercana es '+suggestion.suggested+' m/semana.');}
 if(caps[0].t>tick(p.start)+EPS)throw Error('La capacidad inicial debe cubrir el inicio del plan.');
 if(new Set(caps.map(c=>c.t)).size!==caps.length)throw Error('Hay dos capacidades de metros con la misma fecha efectiva.');
 const remaining=Object.fromEntries(base.works.map(w=>[w.id,+p.works[w.id].quantity]));
 const done={},segments=[],weeklyInfo=[];
 for(const [id,q]of Object.entries(remaining))if(q<=EPS)done[id]=tick(p.start);
 const rates=new Map(base.works.map(w=>[w.id,p.rates.filter(r=>r.workId===w.id).map(r=>({...r,t:tick(r.week)})).sort((a,b)=>a.t-b.t)]));
 const pauses=new Map(base.works.map(w=>[w.id,p.pauses.filter(x=>x.workId===w.id).map(x=>({a:tick(x.from),b:tick(x.resume)}))]));
 const rateAt=(id,t)=>rates.get(id).filter(r=>r.t<=t+EPS).at(-1)?.rate||0;
 const readyAt=id=>{let at=Math.max(tick(p.start),tick(p.works[id].earliest));for(const d of deps.get(id)){if(done[d.predecessor]===undefined)return Infinity;const end=done[d.predecessor];at=Math.max(at,d.mode==='next-week'?Math.ceil((end-EPS)/6)*6:end)}return at};
 const groupOf=w=>p.works[w.id].resourceGroup||w.resourceGroup;
 // Tumbe keeps its own dated rates; it follows the newly computed predecessors.
 function resolveOther(){let change=true;while(change){change=false;for(const id of order){const w=byId.get(id);if(linearWork(w)||done[id]!==undefined||remaining[id]<=EPS)continue;let t=readyAt(id);if(!Number.isFinite(t))continue;let left=remaining[id],temp=[],guard=0;const events=[...rates.get(id).map(r=>r.t),...pauses.get(id).flatMap(x=>[x.a,x.b])].sort((a,b)=>a-b);
   while(left>EPS){if(++guard>200000)throw Error('Programa excesivamente largo: '+w.name);const stopped=pauses.get(id).some(x=>t>=x.a-EPS&&t<x.b-EPS),rate=stopped?0:+rateAt(id,t),next=events.find(x=>x>t+EPS);if(rate<=EPS){if(next!==undefined){t=next;continue}break}const end=Math.min((Math.floor((t+EPS)/6)+1)*6,next??Infinity,t+left/rate*6),q=Math.min(left,(end-t)*rate/6);if(q<=EPS)throw Error('Intervalo inválido: '+w.name);temp.push({workId:id,start:t,end,quantity:q,rate,group:groupOf(w),unit:w.unit});left-=q;t=end;}
   if(left<=EPS){segments.push(...temp);remaining[id]=0;done[id]=t;change=true;}
  }}}
 resolveOther();
 const start=tick(p.start),lastEvent=Math.max(start,...caps.map(c=>c.t),...p.rates.map(r=>tick(r.week)),...p.pauses.map(x=>tick(x.resume)),...Object.values(p.works).map(x=>tick(x.earliest)));
 let week=Math.floor(start/6)*6,iterations=0,blastCount=0;
 while(linear.some(w=>remaining[w.id]>EPS)){
  if(++iterations>10440)throw Error('El ajuste supera200años; revisa capacidad, pausas y ritmos.');
  const end=week+6,weekKey=weekAt(week),profile=[];let at=Math.max(week,start);
  while(at<end-EPS){const cap=caps.filter(c=>c.t<=at+EPS).at(-1);if(!cap)throw Error('Falta capacidad vigente');const next=caps.find(c=>c.t>at+EPS)?.t??Infinity;const until=Math.min(end,next);profile.push({start:at,end:until,rate:+cap.capacity/6});at=until;}
  const available=profile.reduce((s,x)=>s+(x.end-x.start)*x.rate,0),budget=Math.floor((available+EPS)/BLAST),slots=[];
  // Invert cumulative capacity: an increase cannot be spent before its actual date.
  const cursorFor=quantity=>{let q=quantity;for(const x of profile){const amount=(x.end-x.start)*x.rate;if(x.rate>EPS&&q<=amount+EPS)return Math.min(x.end,x.start+Math.max(0,q)/x.rate);q-=amount}return end};
  for(let i=0;i<budget;i++)slots.push({start:cursorFor(i*BLAST),end:cursorFor((i+1)*BLAST)});
  const used={},lastId={baseline:null,extra:null};
  const candidates=linear.filter(w=>remaining[w.id]>EPS&&tick(p.works[w.id].earliest)<end-EPS&&rateAt(w.id,week)>EPS&&!pauses.get(w.id).some(x=>x.a<=week+EPS&&x.b>=end-EPS));
  const targets=distributeShots(candidates.map((w,i)=>({id:w.id,priority:+p.works[w.id].priority||1,order:i,max:Math.min(maxShots(w),Math.ceil((remaining[w.id]-EPS)/BLAST)),requested:rateAt(w.id,week)})),budget);
  const sorted=[...candidates].sort((a,b)=>(+p.works[a.id].priority||1)-(+p.works[b.id].priority||1)||base.works.indexOf(a)-base.works.indexOf(b));
  // Cursor remains across shots, so one work cannot take several extras before peers.
  const pick=(eligible,kind)=>{if(!eligible.length)return null;const last=lastId[kind],index=sorted.findIndex(w=>w.id===last);for(let offset=1;offset<=sorted.length;offset++){const w=sorted[(index+offset)%sorted.length];if(eligible.includes(w)){lastId[kind]=w.id;return w}}return eligible[0]};
  let usedCapacity=0,actual=0;
  for(const slot of slots){resolveOther();const eligible=sorted.filter(w=>remaining[w.id]>EPS&&(used[w.id]||0)<maxShots(w)&&readyAt(w.id)<=slot.start+EPS&&!pauses.get(w.id).some(x=>x.a<slot.end-EPS&&x.b>slot.start+EPS));
   const owed=eligible.filter(w=>(used[w.id]||0)<(targets[w.id]||0));const w=pick(owed,'baseline')||pick(eligible,'extra');if(!w)continue;
   const q=Math.min(BLAST,remaining[w.id]);segments.push({workId:w.id,start:slot.start,end:slot.end,quantity:q,rate:q/(slot.end-slot.start)*6,resourceQuantity:BLAST,blastUnits:1,group:groupOf(w),unit:w.unit});used[w.id]=(used[w.id]||0)+1;remaining[w.id]-=q;usedCapacity+=BLAST;actual+=q;blastCount++;if(remaining[w.id]<=EPS){remaining[w.id]=0;done[w.id]=slot.end;}
  }
  weeklyInfo.push({week:weekKey,available,usable:budget*BLAST,used:usedCapacity,actual,unused:available-usedCapacity,byWork:used});resolveOther();
  if(!usedCapacity&&week>lastEvent+6){const finiteFuture=linear.some(w=>remaining[w.id]>EPS&&Number.isFinite(readyAt(w.id))&&readyAt(w.id)>=end-EPS);if(!finiteFuture)throw Error('No hay capacidad, ritmo o precedencias disponibles para completar las obras restantes.');}
  week=end;
 }
 resolveOther();if(other.some(w=>remaining[w.id]>EPS))throw Error('Hay obras sin ritmo suficiente después de sus precedentes.');
 p.leveledSegments=segments.sort((a,b)=>a.start-b.start||a.workId.localeCompare(b.workId));
 p.capacityAdjustment={version:1,blastSize:BLAST,maxNormal:12,maxRaise:9,blastCount,weeks:weeklyInfo};
 p.levelingAppliedAt=new Date().toISOString();p.levelingSource=stableStringify({rates:p.rates,pauses:p.pauses,works:p.works,capacities:p.capacities,dependencies:base.dependencies});
 delete p.leveledWeekly;return p;
}
