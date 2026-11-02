const EPS=1e-7;
const monthRE=/^\d{4}-(0[1-9]|1[0-2])$/;
export function productionCaps(rows=[]){
 if(!Array.isArray(rows))throw Error('Los límites de producción deben ser una lista.');
 const caps=rows.map(r=>{const from=String(r.from||''),to=String(r.to||'');if(!monthRE.test(from)||to&&!monthRE.test(to)||to&&to<from)throw Error('Revisa los meses Desde/Hasta del límite de producción.');
 if(r.maxTons===''||r.maxTons===null||r.maxTons===undefined||!Number.isFinite(Number(r.maxTons))||Number(r.maxTons)<0)throw Error('Indica un máximo mensual de toneladas no negativo.');
 return {from,to,maxTons:Number(r.maxTons),comment:String(r.comment||'').trim().slice(0,240)};
 }).sort((a,b)=>a.from.localeCompare(b.from));
 for(let i=1;i<caps.length;i++)if(!caps[i-1].to||caps[i].from<=caps[i-1].to)throw Error('Los periodos de capacidad mensual no pueden superponerse.');
 return caps;
}
export const limitFor=(caps,month)=>caps.find(c=>c.from<=month&&(!c.to||month<=c.to))?.maxTons??Infinity;
export function productionPerMeter(base,w){
 if(w.type!=='Desarrollo'||w.material!=='Min')return 0;
 const aux=base.fixed?.Aux||{},row=Object.keys(aux).filter(k=>/^B\d+$/.test(k)).find(k=>String(aux[k]).toLowerCase()===String(w.section).toLowerCase());
 const area=row?Number(aux['F'+row.slice(1)]):Number(w.sectionArea),density=Number(aux.M24??2.7),factor=Number(aux.M64??.6);
 if(!Number.isFinite(area)||area<=0||!Number.isFinite(density)||density<=0||!Number.isFinite(factor)||factor<0||factor>1)throw Error('Falta sección, densidad o factor de desarrollo para '+w.name);
 return area*density*factor;
}
export function monthlyProductionTotals(base,segments,cal){
 const byId=new Map(base.works.map(w=>[w.id,w])),out={};
 for(const s of segments){const w=byId.get(s.workId);if(!w)throw Error('Obra ajena al programa: '+s.workId);const multiplier=w.type==='Tumbe'&&w.unit==='t'?1:productionPerMeter(base,w);if(!multiplier)continue;
 let at=s.start;while(at<s.end-EPS){const end=Math.min(s.end,Math.floor(at+EPS)+1),month=cal.dateAt(at).slice(0,7),r=out[month]??={development:0,tumbe:0,total:0};const q=s.quantity*(end-at)/(s.end-s.start)*multiplier;r[w.unit==='t'?'tumbe':'development']+=q;r.total+=q;at=end;}
 }return out;
}
export function allocateProduction(items,budget,mode='balanced'){
 const out=Object.fromEntries(items.map(x=>[x.id,0]));let left=budget;
 for(const priority of [...new Set(items.map(x=>x.priority))].sort((a,b)=>a-b)){
  const group=items.filter(x=>x.priority===priority);
  if(mode==='priority'){for(const x of group){const q=Math.min(x.demand,left);out[x.id]=q;left-=q;}continue;}
  let open=[...group];while(left>EPS&&open.length){const share=left/open.length,next=[];for(const x of open){const q=Math.min(share,x.demand-out[x.id]);out[x.id]+=q;left-=q;if(x.demand-out[x.id]>EPS)next.push(x)}if(next.length===open.length)break;open=next;}
 }return out;
}
const nextMonth=m=>{const d=new Date(m+'-01T00:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,7)};
/** Keep the development allocation; reserve its production first, then limit the stopes. */
export function limitMonthlyProduction(base,input,adjusted,cal){
 const {tick,dateAt}=cal,caps=productionCaps(input.productionCaps||[]),p=JSON.parse(JSON.stringify(adjusted));if(!caps.length)return p;
 const linear=p.leveledSegments.filter(s=>s.unit==='m'),fixed=monthlyProductionTotals(base,linear,cal),byId=new Map(base.works.map(w=>[w.id,w]));
 for(const [month,r]of Object.entries(fixed)){const limit=limitFor(caps,month);if(r.development>limit+EPS)throw Error(month+': solo el Desarrollo aporta '+r.development.toFixed(2)+' t y supera el tope de '+limit+' t. Ajusta los metros de desarrollo o ese límite.');}
 const other=base.works.filter(w=>w.unit!=='m');if(other.some(w=>w.type!=='Tumbe'))throw Error('El límite mensual solo admite toneladas de Tumbe.');
 const remaining=Object.fromEntries(other.map(w=>[w.id,Number(input.works[w.id].quantity)])),done={};
 for(const w of base.works)if(w.unit==='m'){const parts=linear.filter(s=>s.workId===w.id);done[w.id]=parts.length?Math.max(...parts.map(s=>s.end)):tick(input.start);}
 for(const w of other)if(remaining[w.id]<=EPS)done[w.id]=tick(input.start);
 const deps=new Map(base.works.map(w=>[w.id,base.dependencies.filter(d=>d.successor===w.id)]));
 const rates=new Map(other.map(w=>[w.id,input.rates.filter(r=>r.workId===w.id).map(r=>({...r,t:tick(r.week)})).sort((a,b)=>a.t-b.t)]));
 const pauses=new Map(other.map(w=>[w.id,input.pauses.filter(r=>r.workId===w.id).map(r=>({start:tick(r.from),end:tick(r.resume)}))]));
 const readyAt=w=>{let at=Math.max(tick(input.start),tick(input.works[w.id].earliest));for(const d of deps.get(w.id)){if(done[d.predecessor]===undefined)return Infinity;const end=done[d.predecessor];at=Math.max(at,d.mode==='next-week'?Math.ceil((end-EPS)/6)*6:end)}return at};
 const segments=[...linear],produced={};let month=dateAt(tick(input.start)).slice(0,7),iterations=0;
 while(other.some(w=>remaining[w.id]>EPS)){
  if(++iterations>2400)throw Error('El tope de producción impide completar el programa en 200 años. Revisa límites, pausas y ritmos.');
  const end=tick(nextMonth(month)+'-01');let t=Math.max(tick(input.start),tick(month+'-01')),left=Math.max(0,limitFor(caps,month)-(fixed[month]?.development||0)),guard=0;
  while(t<end-EPS&&left>EPS){
   if(++guard>20000)throw Error('Demasiados cambios de producción en '+month);
   const waiting=other.filter(w=>remaining[w.id]>EPS),releases=waiting.map(readyAt),events=waiting.flatMap(w=>[...rates.get(w.id).map(r=>r.t),...pauses.get(w.id).flatMap(r=>[r.start,r.end])]);
   const active=waiting.map(w=>({w,rate:Number(rates.get(w.id).filter(r=>r.t<=t+EPS).at(-1)?.rate||0)/6})).filter(x=>x.rate>EPS&&readyAt(x.w)<=t+EPS&&!pauses.get(x.w.id).some(r=>r.start<=t+EPS&&r.end>t+EPS));
   let until=Math.min(end,...[...releases,...events].filter(x=>x>t+EPS));
   if(!active.length){t=until;continue;}
   until=Math.min(until,...active.map(x=>t+remaining[x.w.id]/x.rate));if(until<=t+EPS){t+=EPS;continue;}
   const demands=active.map(({w,rate})=>({id:w.id,demand:Math.min(remaining[w.id],(until-t)*rate),priority:Number(input.works[w.id].priority)||1}));
   const total=demands.reduce((s,x)=>s+x.demand,0),allocation=allocateProduction(demands,Math.min(total,left),input.productionAllocation||'balanced');
   for(const {w}of active){const q=allocation[w.id]||0;if(q<=EPS)continue;segments.push({workId:w.id,start:t,end:until,quantity:q,rate:q/(until-t)*6,unit:'t',group:input.works[w.id].resourceGroup||w.resourceGroup});remaining[w.id]-=q;left-=q;produced[month]=(produced[month]||0)+q;if(remaining[w.id]<=EPS){remaining[w.id]=0;done[w.id]=until;}}
   t=until;
  }
  month=nextMonth(month);
 }
 p.leveledSegments=segments.sort((a,b)=>a.start-b.start||a.workId.localeCompare(b.workId));
 const totals=monthlyProductionTotals(base,p.leveledSegments,cal),months=Object.keys(totals).sort().map(month=>({month,...totals[month],limit:Number.isFinite(limitFor(caps,month))?limitFor(caps,month):null}));
 for(const r of months)if(r.limit!==null&&r.total>r.limit+EPS)throw Error('El ajuste supera el tope de producción en '+r.month);
 p.productionAdjustment={version:1,basis:'total-produced',allocation:input.productionAllocation||'balanced',months};
 return p;
}
