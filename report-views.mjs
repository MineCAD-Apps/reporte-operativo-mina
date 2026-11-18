const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>n===null||n===undefined?'':Number(n).toLocaleString('es-MX',{maximumFractionDigits:d,minimumFractionDigits:d});
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const monthName=key=>months[+key.slice(5)-1]+' de '+key.slice(0,4);
const shortMonth=key=>months[+key.slice(5)-1].slice(0,3)+'-'+key.slice(2,4);
const dateLabel=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'—';

import { INPUT_ROWS, sumProduction } from './mine-production.mjs?v=patio-1';
import { RESOURCE_ROWS } from './resources.mjs?v=patio-1';

const num = n => n == null ? '—' : fmt(n);
const percent = n => n == null ? '—' : fmt(100*n,1)+'%';
const integer = n => n == null ? 'Pendiente' : fmt(n,0);
const cell = (n, format=num) => `<td class="num">${format(n)}</td>`;
const dataRows = (rows, values) => rows.map(([key,label,format]) =>
 `<tr><th scope="row">${esc(label)}</th>${cell(values[key],format)}</tr>`).join('');
const productionRows = [
 ['tons','Mineral a patio de mina (t)'], ['developmentTons','Mineral de Desarrollo (t)'],
 ['tumbeTons','Tumbe (t)'], ['meters','Desarrollo + Preparación (m)'],
 ['agEq','AgEq ponderado'], ['gradeCoverage','Tonelaje con AgEq',percent],
];
const kpiRows = [
 ['drillPerMeter','Barrenación / avance (m/m)'], ['anfoPerTon','ANFO de Tumbe (kg/t)'],
];
const annualNote = 'AgEq ponderado por toneladas programadas a patio. El promedio queda pendiente cuando faltan bloques con AgEq.';

function resourceRows(resources) {
 return dataRows(RESOURCE_ROWS.map(([key,label])=>[key,label,integer]),resources.requirements);
}

export function resourcesDetailReport(record, r){
 const crewRows = [['raiseHoles','Barrenos de contrapozo'],['drillingShifts','Turnos de barrenación'],
  ['reserveShifts','Turnos de reserva'],['supportShifts','Turnos de sostenimiento']];
 return `<p>${r.workdays} días de lunes a sábado. Rendimientos de barrenación: 50 barrenos/turno en obras lineales, ${r.settings.raise} en contrapozos y 1 t/barreno para dimensionar cuadrillas de Tumbe. Reserva de desborde: ${r.settings.overbreak}%.</p>
 <h3>Rendimientos y cuadrillas</h3><table class="input-detail-sheet"><tbody>${dataRows(crewRows,r)}${resourceRows(r)}</tbody></table>
 <p>Anclado y enmallado: ${r.settings.support==null?'rendimiento pendiente':num(r.settings.support)+' m²/turno'}.</p>
 <h3>Insumos previstos</h3><table class="input-detail-sheet"><tbody>${dataRows(INPUT_ROWS,record)}</tbody></table>
 ${[...record.issues,...r.issues].length?`<ul>${[...record.issues,...r.issues].map(issue=>'<li>'+esc(issue)+'</li>').join('')}</ul>`:''}`;
}

export function inputDetailReport(work, month, record){
 const detail = record.details.get(work.id);
 if (!detail) return '<p>La obra no tiene cantidad programada en este mes.</p>';
 return `<p>${esc(monthName(month))} · ${esc(work.block||'Bloque pendiente')}</p>
 <table class="input-detail-sheet"><tbody>${dataRows([['tons','Mineral a patio (t)'],...INPUT_ROWS],detail)}</tbody></table>`;
}

export function monthlyExcelReport({month,mine,works,quantities,record,resources,grades=[]}){
 const byWork=new Map(grades.filter(g=>g.mes===month).map(g=>[g.obra_id,g]));
 const metals=['Au','Ag','Pb','Cu','Zn'].filter(key=>works.some(w=>record.details.has(w.id) && byWork.get(w.id)?.[key] != null && byWork.get(w.id)[key]!==''));
 const sections=['Tumbe','Desarrollo','Preparación'].map(type=>{
  const unit=type==='Tumbe'?'t':'m';
  const active=works.filter(w=>w.type===type && record.details.has(w.id));
  const rows=active.map(w=>{
   const detail=record.details.get(w.id);
   const grade=byWork.get(w.id);
   return `<tr><td>${esc(w.area)}</td><td><button type="button" class="input-detail" data-input-work="${esc(w.id)}" data-month="${month}">${esc(w.name)}</button></td>${cell(quantities[w.id])}<td>${esc(w.block||'—')}</td>${cell(w.agEq)}${cell(detail.tons)}${cell(detail.drillMeters)}${cell(detail.anfoKg)}${metals.map(key=>cell(grade?.[key]===''?null:grade?.[key])).join('')}</tr>`;
  });
  return `<section class="monthly-block"><h3>${type}</h3><div class="monthly-block-scroll"><table class="monthly-work-sheet"><thead><tr><th>Área</th><th>Obra</th><th>${unit}</th><th>Bloque</th><th>AgEq</th><th>Mineral a patio (t)</th><th>Barrenación (m)</th><th>ANFO (kg)</th>${metals.map(key=>`<th>${key}</th>`).join('')}</tr></thead>
  <tbody>${rows.join('')||`<tr><td colspan="${8+metals.length}">Sin obras programadas para este filtro.</td></tr>`}</tbody>
  <tfoot><tr><th colspan="2">Total visible</th>${cell(active.reduce((a,w)=>a+quantities[w.id],0))}<td colspan="${5+metals.length}"></td></tr></tfoot></table></div></section>`;
 }).join('');
 const limit=record.productionLimit==null?'Sin límite':num(record.productionLimit)+' t';
 return `<article class="monthly-report"><div class="report-title"><h2>Plan mensual · ${esc(monthName(month))}</h2><span>${esc(mine)} · Patio de mina</span></div>
 <div class="excel-month-layout"><aside class="monthly-inputs"><h3 class="excel-caption">Producción y rendimientos · todas las obras</h3>
 <table class="input-detail-sheet"><tbody>${dataRows([...productionRows,...kpiRows],record)}<tr><th scope="row">Tope del mes</th><td class="num">${limit}</td></tr></tbody></table>
 <h3 class="excel-caption">Insumos y cuadrillas</h3><table class="input-detail-sheet"><tbody>${dataRows(INPUT_ROWS,record)}${resourceRows(resources)}</tbody></table>
 <p class="report-note">${annualNote}</p>${record.issues.length?`<p class="report-note">${esc(record.issues.join(' '))}</p>`:''}</aside><div class="monthly-works">${sections}</div></div></article>`;
}

const ANNUAL_ROWS = [...productionRows,...kpiRows,...INPUT_ROWS].map(([key,label,format=num])=>({
 key,label,format,style:key==='tons'||key==='agEq'?'headline':'',
}));

export function annualExcelReport(records){
 const years=[...new Set(records.map(r=>r.month.slice(0,4)))].sort();
 return years.map(year=>{
  const rows=records.filter(r=>r.month.startsWith(year)),sum=sumProduction(rows);
  const body=ANNUAL_ROWS.map(({key,label,format,style})=>`<tr class="${style}" data-annual-metric="${key}"><th scope="row">${label}</th>${rows.map(r=>cell(r[key],format)).join('')}<td class="num annual-total">${format(sum[key])}</td></tr>`).join('');
  const crews=RESOURCE_ROWS.map(([key,label])=>`<tr><th scope="row">${label}</th>${rows.map(r=>cell(r.resources?.requirements[key],integer)).join('')}<td class="num annual-total">—</td></tr>`).join('');
  return `<section class="annual-report"><h2>Resumen ${year}</h2><p>${monthName(rows[0].month)} a ${monthName(rows.at(-1).month)} · Producción a patio de mina</p>
  <div class="annual-scroll"><table class="annual-sheet"><thead><tr><th>Concepto</th>${rows.map(r=>`<th class="num">${esc(shortMonth(r.month))}</th>`).join('')}<th class="num annual-total">Total ${year}</th></tr></thead><tbody>${body}${crews}</tbody></table></div>
  <p class="report-note">${annualNote}</p></section>`;
 }).join('');
}

const weekOrdinal=week=>Math.floor((Number(week.slice(8,10))-1)/7)+1;
const weekTooltip=week=>{const end=new Date(week+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+5);const date=s=>s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);return 'Semana del '+date(week)+' al '+date(end.toISOString().slice(0,10))};
const workTypeClass=type=>({'Desarrollo':'work-development','Preparación':'work-preparation','Tumbe':'work-stoping'}[type]||'');
// Sum scheduled linear advance only, using the works visible in the grid.
export function weeklyLinearTotals(works,result,weeks){
 const linearWorks=works.filter(w=>w.unit==='m'&&(w.type==='Desarrollo'||w.type==='Preparación'));
 return weeks.map(week=>linearWorks.reduce((sum,w)=>sum+Number(result.rows[w.id]?.weekly?.[week]??0),0));
}
export function projectExcelGrid({works,plan,result,weeks,dependencies,formatStart,formatEnd}){
 const headers=['Código','Obra','Nivel','Tipo','Min/Tepe','Longitud<br>(m)','Tonelaje<br>(t)','Alcance<br>del plan','Inicio','Fin','Obra Precedente','Área','Sección','UM','Bloque','AgEq','Ancho veta m','Ancho minar m'];
 const weeklyTotals=weeklyLinearTotals(works,result,weeks);
 const totalRow=`<tr class="weekly-total-row" aria-label="Total de metros lineales de las obras visibles"><td title="Desarrollo + Preparación de las obras visibles">Total</td><td>Metros lineales</td>${'<td></td>'.repeat(11)}<td>m</td><td></td><td></td><td></td><td></td>${weeks.map((week,i)=>`<td class="num weekly-total" title="${weekTooltip(week)} · Desarrollo + Preparación${result.capacityAdjustment?.weeks?.find(w=>w.week===week)?' · Capacidad consumida: '+fmt(result.capacityAdjustment.weeks.find(w=>w.week===week).used)+' m equivalentes de '+fmt(result.capacityAdjustment.weeks.find(w=>w.week===week).available)+' m disponibles':''}" aria-label="Total metros lineales, semana ${week}: ${fmt(weeklyTotals[i])} m">${fmt(weeklyTotals[i])}</td>`).join('')}</tr>`;
 const groups=[];for(const w of weeks){const key=w.slice(0,7);if(groups.at(-1)?.key===key)groups.at(-1).count++;else groups.push({key,count:1})}
 return `<div class="program-legend" aria-label="Colores por tipo de obra"><span class="legend-development">Desarrollo</span><span class="legend-preparation">Preparación</span><span class="legend-stoping">Tumbe</span></div><table class="project-grid"><thead><tr>${headers.map((h,i)=>`<th rowspan="2" class="meta-${i}">${h}</th>`).join('')}${groups.map(g=>`<th class="week-month" title="${esc(monthName(g.key))}" colspan="${g.count}">${esc(monthName(g.key))}</th>`).join('')}</tr><tr>${weeks.map(w=>`<th class="weekcol" title="${weekTooltip(w)}" aria-label="Semana ${weekOrdinal(w)} de ${esc(monthName(w.slice(0,7)))}: ${weekTooltip(w)}">${weekOrdinal(w)}</th>`).join('')}</tr></thead><tbody>${totalRow}${works.map(w=>{const row=result.rows[w.id],cfg=plan.works[w.id];return `<tr><td>${esc(w.id)}</td><td><button class="work-detail" data-work="${esc(w.id)}">${esc(w.name)}</button></td><td>${esc(w.level)}</td><td>${esc(w.type)}</td><td>${esc(w.material)}</td><td class="num">${w.unit==='m'?fmt(w.target):''}</td><td class="num">${w.unit==='t'?fmt(w.target):''}</td><td class="num">${fmt(cfg.quantity)} ${esc(w.unit)}</td><td>${row.start===null?'—':dateLabel(formatStart(row.start))}</td><td>${row.pending>1e-8?'<span class="danger">Sin terminar</span>':row.end===null?'—':dateLabel(formatEnd(row.end))}</td><td>${dependencies.filter(d=>d.successor===w.id).map(d=>esc(d.predecessor)).join('<br>')}</td><td>${esc(w.area)}</td><td>${esc(w.section)}</td><td>${esc(w.unit)}</td><td>${esc(w.block || (w.type==='Tumbe'||w.type==='Desarrollo'&&w.material==='Min'?'Pendiente':'—'))}</td>${cell(w.agEq,num)}${cell(w.veinWidth,fmt)}${cell(w.miningWidth,fmt)}${weeks.map(week=>{const q=row.weekly[week],change=plan.rates.some(r=>r.workId===w.id&&r.week===week),paused=plan.pauses.some(p=>p.workId===w.id&&p.from<=week&&p.resume>week);return `<td class="weekly-cell"><button data-work="${esc(w.id)}" data-week="${week}" class="${q?'has-work '+workTypeClass(w.type)+' ':''}${change?'change ':''}${paused?'paused':''}" title="${esc(w.type)} · ${weekTooltip(week)}" aria-label="${esc(w.name)}, semana ${week}: ${fmt(q||0)} ${esc(w.unit)}. Editar ritmo">${q?fmt(q):paused?'Pausa':''}</button></td>`}).join('')}</tr>`}).join('')}</tbody></table>`;
}
export function annualComparisonReport(scenarios){
 const years=[...new Set(scenarios.flatMap(s=>s.records.map(r=>r.month.slice(0,4))))].sort();
 return years.map(year=>{
  const keys=[...new Set(scenarios.flatMap(s=>s.records.filter(r=>r.month.startsWith(year)).map(r=>r.month)))].sort(),middle=Math.floor(scenarios.length/2);
  const concepts=`<aside class="concept-panel"><h3 class="scenario-title">Conceptos</h3><div class="concept-scroll" data-compare-scroll><table class="concept-table"><thead><tr><th scope="col">Resumen ${year}</th></tr></thead><tbody>${ANNUAL_ROWS.map(row=>`<tr class="${row.style}" data-annual-metric="${row.key}"><th scope="row" title="${esc(row.label)}">${esc(row.label)}</th></tr>`).join('')}</tbody></table></div></aside>`;
  const panels=scenarios.map((scenario,i)=>{
   const rows=scenario.records.filter(r=>r.month.startsWith(year)),values=new Map(rows.map(r=>[r.month,r])),sum=sumProduction(rows);
   const panel=`<section class="scenario-panel" aria-label="${esc(scenario.name)}"><h3 class="scenario-title" title="${esc(scenario.name)}">${esc(scenario.name)}</h3><div class="scenario-scroll" data-compare-scroll tabindex="0" role="region" aria-label="Meses del escenario ${esc(scenario.name)}"><table class="scenario-table"><thead><tr>${keys.map(key=>`<th class="num" scope="col">${esc(shortMonth(key))}</th>`).join('')}<th class="num annual-total" scope="col">Total ${year}</th></tr></thead><tbody>${ANNUAL_ROWS.map(row=>{
    return `<tr class="${row.style}" data-annual-metric="${row.key}">${keys.map(key=>{const value=values.get(key);return `<td class="num" aria-label="${esc(row.label)} · ${esc(shortMonth(key))}">${value?row.format(value[row.key]):''}</td>`}).join('')}<td class="num annual-total" aria-label="${esc(row.label)} · Total ${year}">${row.format(sum[row.key])}</td></tr>`;
   }).join('')}</tbody></table></div></section>`;
   return (i===middle?concepts:'')+panel;
  }).join('');
  return `<section class="annual-report"><h2>Resumen ${year} · comparativa</h2><p>${monthName(keys[0])} a ${monthName(keys.at(-1))} · Producción a patio de mina</p><div class="annual-compare-grid" style="--left-panels:${middle};--right-panels:${scenarios.length-middle}">${panels}</div><p class="report-note">${annualNote}</p></section>`;
 }).join('');
}

export function bindComparisonScroll(root){
 root._comparisonCleanup?.();const cleanups=[];
 root.querySelectorAll('.annual-compare-grid').forEach(group=>{
  const panes=[...group.querySelectorAll('[data-compare-scroll]')],concept=group.querySelector('.concept-scroll');let syncing=false;
  const sync=event=>{if(syncing)return;syncing=true;for(const pane of panes)if(pane!==event.currentTarget&&Math.abs(pane.scrollTop-event.currentTarget.scrollTop)>0.5)pane.scrollTop=event.currentTarget.scrollTop;requestAnimationFrame(()=>{syncing=false})};
  panes.forEach(pane=>{pane.addEventListener('scroll',sync,{passive:true});cleanups.push(()=>pane.removeEventListener('scroll',sync))});
  const matchGutter=()=>{const sample=group.querySelector('.scenario-scroll');if(sample&&concept)concept.style.paddingBottom=Math.max(0,sample.offsetHeight-sample.clientHeight-2)+'px'};matchGutter();
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(matchGutter);observer.observe(group);cleanups.push(()=>observer.disconnect())}
 });
 root._comparisonCleanup=()=>{cleanups.forEach(fn=>fn());root._comparisonCleanup=null};
}

