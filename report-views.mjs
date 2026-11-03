const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=2)=>n===null||n===undefined?'':Number(n).toLocaleString('es-MX',{maximumFractionDigits:d,minimumFractionDigits:d});
const usd=n=>n===null||n===undefined?'Pendiente':'US$ '+fmt(n,0);
const pct=n=>n===null||n===undefined?'—':fmt(n*100,1)+'%';
const money=n=>n===null||n===undefined?'':'$'+fmt(n,0);
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
export const monthName=key=>months[+key.slice(5)-1]+' de '+key.slice(0,4);
const shortMonth=key=>months[+key.slice(5)-1].slice(0,3)+'-'+key.slice(2,4);
const dateLabel=s=>s?s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(2,4):'—';
const cell=(n,format=money)=>`<td class="num">${format(n)}</td>`;
export const COST_ROWS=[
 ['Acero','Brocas','brocas'],['','Barras','barras'],['Explosivo','Alto explosivo','altoExplosivo'],['','Artificios','artificios'],['Diésel','Diésel equipos mina','dieselEquipos'],['','Diésel compresor','dieselCompresor'],['Refacciones','Refacciones scoop','refScoop'],['','Refacciones camión','refCamion'],['','Llantas de equipos mina','llantas'],['','Aceites','aceites'],['Energía','Malacates, compresor y bombeo','energia'],['Servicios mina','Mantenimiento tiro','mttoTiro'],['','Sostenimiento','sostenimiento'],['','Refacciones bombas y perforación','refBombas'],['','Ventilación','ventilacion'],['Nómina variable','Horas extra y bono','nominaVariable'],['Comunidad','Convenio ejidos','ejidos']
];
const total=(works,quantities)=>works.reduce((sum,w)=>sum+(quantities[w.id]||0),0);
import {RESOURCE_ROWS} from './resources.mjs';
const resourceValue=n=>n==null?'Pendiente':fmt(n,0);
const resourceRows=r=>RESOURCE_ROWS.map(([key,label])=>`<tr><th scope="row">${esc(label)}</th>${cell(r.requirements[key],resourceValue)}</tr>`).join('');
export function resourcesDetailReport(r){
 const fleetRows=r.fleets.flatMap(f=>f.rows.map(g=>`<tr><th scope="row">${esc(f.label)} · ${esc(g.equipment)}</th>${cell(g.hours,fmt)}<td class="num">${f.percent==null?'Pendiente':fmt(f.percent)+'%'}</td>${cell(f.hoursPerUnit,fmt)}${cell(g.required,resourceValue)}</tr>`));
 return `<p>${r.workdays} días de lunes a sábado. Equipos: 18 h por día (7 + 6 + 5), menos un día de servicio = <strong>${r.baseHours} h por unidad al 100%</strong>.</p>
 <h3>Cuadrillas de máquina de pierna</h3><table class="detail-cost-sheet"><tbody>
 ${Object.entries(r.holes).map(([label,n])=>`<tr><th scope="row">Barrenos · ${esc(label)}</th>${cell(n,fmt)}</tr>`).join('')}
 <tr><th scope="row">Barrenos calculados${r.requirements.crews==null?' (parcial)':''}</th>${cell(r.totalHoles,fmt)}</tr>
 <tr><th scope="row">Capacidad por cuadrilla (50 barrenos/día)</th>${cell(r.crewCapacity,resourceValue)}</tr></tbody></table>
 <p>Desarrollo y Preparación: disparos equivalentes de 1.5 m × barrenos de la sección. Tumbe: 1 t por barreno pegado, con barra de 6 ft.</p>
 <h3>Horas y unidades por equipo asignado</h3>
 ${fleetRows.length?`<div class="annual-scroll"><table class="detail-cost-sheet"><thead><tr><th>Equipo</th><th>Horas requeridas</th><th>Disponibilidad</th><th>Horas por unidad</th><th>Unidades</th></tr></thead><tbody>${fleetRows.join('')}</tbody></table></div>`:'<p>Sin horas calculadas para mostrar.</p>'}
 <p>Las horas incluyen viaje cargado, regreso vacío y maniobras. Cada equipo asignado se dimensiona por separado; las fracciones se redondean hacia arriba.</p>
 <h3>Recursos necesarios en el mes</h3><table class="detail-cost-sheet"><tbody>${resourceRows(r)}</tbody></table>
 ${r.issues.length?`<ul>${r.issues.map(issue=>'<li>'+esc(issue)+'</li>').join('')}</ul>`:''}`;
}
export function monthlyExcelReport({month,works,quantities,cost,grades=[],resources}){
 const title=monthName(month),lines=cost.lines||{},pay=cost.payroll||{};
 const left=`<aside class="monthly-costs"><h3 class="excel-caption">Costos del mes · todas las obras</h3><table class="cost-sheet"><thead><tr><th>Concepto</th><th>Detalle</th><th class="num">MXN</th></tr></thead><tbody>${COST_ROWS.map(([group,label,key])=>`<tr><td class="cost-group">${esc(group)}</td><td>${esc(label)}</td>${cell(lines[key])}</tr>`).join('')}</tbody></table>
 <table class="month-kpis"><tbody><tr class="grand-total"><th>Costo total</th>${cell(cost.total)}</tr><tr><th>Toneladas a producir</th>${cell(cost.tons,fmt)}</tr><tr><th>Tope de producción del mes</th><td class="num">${cost.productionLimit==null?'Sin límite':fmt(cost.productionLimit)+' t'}</td></tr><tr><th>Costo unitario variable · CUV</th>${cell(cost.cuv)}</tr><tr><th>Costo unitario total · CUT</th>${cell(cost.cut)}</tr></tbody></table>
 <h3 class="excel-caption payroll-caption">Nómina fija y variables</h3><table class="payroll-sheet"><tbody>${[['Nómina fija',cost.fixed],['Horas extra provisionales',pay.overtime],['Bono extra provisional',pay.bonus],['Total nómina',pay.total],['Variables distribuidas',pay.distributed],['Variables sin distribuir',pay.unallocated]].map(([label,value])=>`<tr><th>${esc(label)}</th>${cell(value)}</tr>`).join('')}</tbody></table><p class="report-note">CUV excluye nómina fija. CUT la incluye. Las leyes son de captura manual.</p>${economicsSummary(cost.economics)}</aside>`;
 const sections=[['Tumbe','Ton'],['Desarrollo','M.L.'],['Preparación','M.L.']].map(([type,unit])=>{
  const active=works.filter(w=>w.type===type&&(quantities[w.id]||0)>1e-9);const rows=[];
  for(let i=0;i<active.length;i++){
   const w=active[i];
   const g=grades.find(x=>x.workId===w.id&&x.month===month)||{};
   rows.push(`<tr><td>${esc(w.area)}</td><td><button class="cost-detail" data-cost-work="${esc(w.id)}" data-month="${month}" title="Ver cálculo de costos de ${esc(w.name)}">${esc(w.name)}</button></td>${cell(quantities[w.id],fmt)}${'JKLMN'.split('').map(c=>`<td class="num grade-cell">${g[c]===null||g[c]===undefined?'':fmt(g[c])}</td>`).join('')}${cell(cost.unitCosts[w.id])}</tr>`);
  }
  return `<section class="monthly-block" data-work-type="${esc(type)}"><h3>${esc(type)}</h3><div class="monthly-block-scroll"><table class="monthly-work-sheet"><colgroup><col class="area-col"><col class="place-col"><col class="quantity-col">${'<col class="grade-col">'.repeat(5)}<col class="unit-cost-col"></colgroup><thead><tr><th>Área</th><th>Lugar</th><th class="num">${unit}</th>${['Au','Ag','Pb','Cu','Zn'].map(x=>'<th class="num">'+x+'</th>').join('')}<th class="num">Costo directo<br>${type==='Tumbe'?'$/t':'$/m'}</th></tr></thead><tbody>${rows.length?rows.join(''):'<tr><td colspan="9" class="empty-section">Sin obras programadas en este mes.</td></tr>'}</tbody><tfoot><tr><th colspan="2">Total ${esc(type.toLowerCase())}</th>${cell(total(active,quantities),fmt)}<td colspan="6"></td></tr></tfoot></table></div></section>`;
 }).join('');
 return `<article class="monthly-report"><div class="report-title"><h2>Plan mensual · ${esc(title)}</h2><span>Unificación · MXN</span></div><div class="excel-month-layout">${left}<div class="monthly-works">${sections}${economicsDetails(cost.economics)}</div></div>${resources?`<section><h3>Personal y equipos · todas las obras del mes</h3><table class="month-kpis"><tbody>${resourceRows(resources)}</tbody></table></section>`:''}</article>`;
}
export function economicsSummary(e){
 if(!e)return '';
 return `<section class="economic-summary"><h3>Valor y margen · puesto en planta</h3>${e.issues?.length?`<p class="economic-pending">Valoración pendiente: ${esc(e.issues.join('; '))}. No se presenta margen completo.</p>`:''}<table><tbody>${[['Valor mineral diluido · USD',e.valueUsd],['Costo minero · USD',e.mineUsd],['Acarreo mina–planta · USD',e.haulUsd],['Costo puesto en planta · USD',e.plantUsd],['Margen antes de beneficio · USD',e.marginUsd]].map(([label,v])=>`<tr><th>${esc(label)}</th>${cell(v,usd)}</tr>`).join('')}<tr><th>Margen sobre valor estimado</th>${cell(e.marginPct,pct)}</tr></tbody></table><p class="economic-help">Valor de Geología con recuperación ya incluida; dilución por masa (mineral 2.7, tepetate 2.5 t/m³). No incluye beneficio, fundición ni comercialización. Tipo de cambio: ${fmt(e.fx)} MXN/USD. No representa ingreso facturado ni ganancia neta.</p></section>`;
}
export function economicsDetails(e){
 if(!e?.rows?.length)return '';
 return `<section class="economic-summary"><h3>Valoración por obra</h3><div class="economic-scroll"><table><thead><tr><th>Obra / zona</th><th>Ton a producir</th><th>Ancho veta m</th><th>Ancho minar m</th><th>Dilución peso</th><th>Valor diluido USD/t</th><th>Valor USD</th><th>Acarreo a planta MXN</th></tr></thead><tbody>${e.rows.map(r=>`<tr><td>${esc(r.name)}<small>${esc(r.zone||'Zona pendiente')}</small></td>${cell(r.tons,fmt)}${cell(r.veinWidth,fmt)}${cell(r.miningWidth,fmt)}${cell(r.dilution,pct)}${cell(r.valuePerTonUsd,usd)}${cell(r.valueUsd,usd)}${cell(r.haulMxn)}</tr>`).join('')}</tbody></table></div></section>`;
}
const annualNumber=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
const annualSum=(rows,key)=>rows.every(r=>r[key]!==null)?rows.reduce((s,r)=>s+r[key],0):null;
const annualSubtract=(a,b)=>a===null||b===null?null:a-b;
const annualDivide=(a,b)=>a===null||b===null||b<=0?null:a/b;
const annualUnit=n=>n===null?'—':'US$ '+fmt(n,2);
const annualQuantity=n=>n===null?'—':fmt(n);
/** The same financial definitions serve the annual summary and all scenario columns. */
export function annualMetrics(record){
 const fx=annualNumber(record.economics?.fx),convert=n=>n===null||fx===null||fx<=0?null:n/fx;
 const tons=annualNumber(record.tons),meters=annualNumber(record.meters),mine=annualNumber(record.total),fixed=annualNumber(record.fixed);
 const operating=convert(annualSubtract(mine,fixed)),admin=convert(fixed),haul=annualNumber(record.economics?.haulUsd),value=annualNumber(record.economics?.valueUsd);
 const cost=operating===null||admin===null||haul===null?null:operating+admin+haul;
 return {tons,meters,operating,operatingUnit:annualDivide(operating,tons),value,operatingMargin:annualSubtract(value,operating),admin,haul,cost,totalUnit:annualDivide(cost,tons),plantMargin:annualSubtract(value,cost),details:Object.fromEntries(COST_ROWS.map(([,label,key])=>[key,convert(annualNumber(record.lines?.[key]))]))};
}
export function annualTotals(records){
 const values=records.map(annualMetrics),result={};
 if(!values.length)return annualMetrics({});
 for(const key of ['tons','meters','operating','admin','haul','value'])result[key]=annualSum(values,key);
 result.cost=result.operating===null||result.admin===null||result.haul===null?null:result.operating+result.admin+result.haul;
 result.operatingUnit=annualDivide(result.operating,result.tons);result.totalUnit=annualDivide(result.cost,result.tons);
 result.operatingMargin=annualSubtract(result.value,result.operating);result.plantMargin=annualSubtract(result.value,result.cost);
 result.details=Object.fromEntries(COST_ROWS.map(([,label,key])=>[key,values.every(v=>v.details[key]!==null)?values.reduce((sum,v)=>sum+v.details[key],0):null]));return result;
}
export const ANNUAL_ROWS=[
 {key:'tons',label:'Toneladas Producidas',format:annualQuantity,style:'headline'},
 {key:'operating',label:'Costos Operativos',format:usd,style:'headline',expandable:true},
 {key:'operatingUnit',label:'Costo Unitario Operativo',format:annualUnit,style:'ratio'},
 {key:'value',label:'Valor Mineral',format:usd,style:'headline'},
 {key:'operatingMargin',label:'Margen Operativo',format:usd,style:'headline'},
 {key:'divider',kind:'divider'},
 {key:'meters',label:'Metros Desarrollados',format:annualQuantity,style:''},
 {key:'admin',label:'Costos Administrativos',format:usd,style:''},
 {key:'haul',label:'Costo Acarreo a Planta',format:usd,style:''},
 {key:'cost',label:'Costo Total',format:usd,style:'headline'},
 {key:'totalUnit',label:'Costo Unitario Total',format:annualUnit,style:'ratio'},
 {key:'plantMargin',label:'Margen Puesto en Planta',format:usd,style:'headline'}
];
const annualNote='Importes en USD; unitarios en USD/t. Metros: Desarrollo + Preparación. Administrativos: nómina fija. Margen operativo antes de administración y acarreo; margen puesto en planta antes de beneficio y comercialización. Pendiente indica que falta información para valorar.';
export function annualExcelReport(records){
 const years=[...new Set(records.map(r=>r.month.slice(0,4)))].sort();
 return years.map(year=>{
  const rows=records.filter(r=>r.month.startsWith(year)),values=rows.map(annualMetrics),sum=annualTotals(rows),detailsId='annual-operating-'+year;
  const cellsFor=(get,format)=>values.map(v=>cell(get(v),format)).join('')+`<td class="num annual-total">${format(get(sum))}</td>`;
  let body='<tbody>';
  for(const row of ANNUAL_ROWS){
   if(row.kind==='divider'){body+=`<tr class="annual-divider" aria-hidden="true"><td colspan="${rows.length+2}"></td></tr>`;continue;}
   const label=row.expandable?`<button type="button" class="annual-cost-toggle" data-annual-cost-toggle="${detailsId}" aria-expanded="false" aria-controls="${detailsId}"><span data-expand-icon aria-hidden="true">▸</span> ${esc(row.label)}</button>`:esc(row.label);
   body+=`<tr class="${row.style}" data-annual-metric="${row.key}"><th scope="row">${label}</th>${cellsFor(v=>v[row.key],row.format)}</tr>`;
   if(row.expandable){body+=`</tbody><tbody id="${detailsId}" class="annual-operating-detail" hidden>${COST_ROWS.map(([,label,key])=>`<tr><th scope="row">${esc(label)}</th>${cellsFor(v=>v.details[key],usd)}</tr>`).join('')}</tbody><tbody>`;}
  }
  if(rows.some(r=>r.resources)){
   body+=`<tr class="annual-divider" aria-hidden="true"><td colspan="${rows.length+2}"></td></tr>`;
   for(const [key,label] of RESOURCE_ROWS){
    body+=`<tr><th scope="row">${esc(label)}</th>${rows.map(r=>cell(r.resources?.requirements[key],resourceValue)).join('')}<td class="num annual-total">—</td></tr>`;
   }
  }
  body+='</tbody>';
  return `<section class="annual-report"><h2>Resumen ${year}</h2><p>${monthName(rows[0].month)} a ${monthName(rows.at(-1).month)} · USD</p><div class="annual-scroll"><table class="annual-sheet"><thead><tr><th>Concepto</th>${rows.map(r=>`<th class="num">${esc(shortMonth(r.month))}</th>`).join('')}<th class="num annual-total">Total ${year}</th></tr></thead>${body}</table></div><p class="report-note">${annualNote}</p></section>`;
 }).join('');
}
export function bindAnnualCostDetails(root){
 root.querySelectorAll('[data-annual-cost-toggle]').forEach(button=>{
  button.onclick=()=>{const detail=root.querySelector('#'+button.dataset.annualCostToggle);if(!detail)return;detail.hidden=!detail.hidden;button.setAttribute('aria-expanded',String(!detail.hidden));const icon=button.querySelector('[data-expand-icon]');if(icon)icon.textContent=detail.hidden?'▸':'▾';};
 });
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
 const headers=['Código','Obra','Nivel','Tipo','Min/Tepe','Longitud<br>(m)','Tonelaje<br>(t)','Alcance<br>del plan','Inicio','Fin','Obra Precedente','Área','Sección','UM','Zona económica','Ancho veta m','Ancho minar m'];
 const weeklyTotals=weeklyLinearTotals(works,result,weeks);
 const totalRow=`<tr class="weekly-total-row" aria-label="Total de metros lineales de las obras visibles"><td title="Desarrollo + Preparación de las obras visibles">Total</td><td>Metros lineales</td>${'<td></td>'.repeat(11)}<td>m</td><td></td><td></td><td></td>${weeks.map((week,i)=>`<td class="num weekly-total" title="${weekTooltip(week)} · Desarrollo + Preparación${result.capacityAdjustment?.weeks?.find(w=>w.week===week)?' · Capacidad consumida: '+fmt(result.capacityAdjustment.weeks.find(w=>w.week===week).used)+' m equivalentes de '+fmt(result.capacityAdjustment.weeks.find(w=>w.week===week).available)+' m disponibles':''}" aria-label="Total metros lineales, semana ${week}: ${fmt(weeklyTotals[i])} m">${fmt(weeklyTotals[i])}</td>`).join('')}</tr>`;
 const groups=[];for(const w of weeks){const key=w.slice(0,7);if(groups.at(-1)?.key===key)groups.at(-1).count++;else groups.push({key,count:1})}
 return `<div class="program-legend" aria-label="Colores por tipo de obra"><span class="legend-development">Desarrollo</span><span class="legend-preparation">Preparación</span><span class="legend-stoping">Tumbe</span></div><table class="project-grid"><thead><tr>${headers.map((h,i)=>`<th rowspan="2" class="meta-${i}">${h}</th>`).join('')}${groups.map(g=>`<th class="week-month" title="${esc(monthName(g.key))}" colspan="${g.count}">${esc(monthName(g.key))}</th>`).join('')}</tr><tr>${weeks.map(w=>`<th class="weekcol" title="${weekTooltip(w)}" aria-label="Semana ${weekOrdinal(w)} de ${esc(monthName(w.slice(0,7)))}: ${weekTooltip(w)}">${weekOrdinal(w)}</th>`).join('')}</tr></thead><tbody>${totalRow}${works.map(w=>{const row=result.rows[w.id],cfg=plan.works[w.id];return `<tr><td>${esc(w.id)}</td><td><button class="work-detail" data-work="${esc(w.id)}">${esc(w.name)}</button></td><td>${esc(w.level)}</td><td>${esc(w.type)}</td><td>${esc(w.material)}</td><td class="num">${w.unit==='m'?fmt(w.target):''}</td><td class="num">${w.unit==='t'?fmt(w.target):''}</td><td class="num">${fmt(cfg.quantity)} ${esc(w.unit)}</td><td>${row.start===null?'—':dateLabel(formatStart(row.start))}</td><td>${row.pending>1e-8?'<span class="danger">Sin terminar</span>':row.end===null?'—':dateLabel(formatEnd(row.end))}</td><td>${dependencies.filter(d=>d.successor===w.id).map(d=>esc(d.predecessor)).join('<br>')}</td><td>${esc(w.area)}</td><td>${esc(w.section)}</td><td>${esc(w.unit)}</td><td>${esc(w.economicZone||'Pendiente')}</td>${cell(w.veinWidth,fmt)}${cell(w.miningWidth,fmt)}${weeks.map(week=>{const q=row.weekly[week],change=plan.rates.some(r=>r.workId===w.id&&r.week===week),paused=plan.pauses.some(p=>p.workId===w.id&&p.from<=week&&p.resume>week);return `<td class="weekly-cell"><button data-work="${esc(w.id)}" data-week="${week}" class="${q?'has-work '+workTypeClass(w.type)+' ':''}${change?'change ':''}${paused?'paused':''}" title="${esc(w.type)} · ${weekTooltip(week)}" aria-label="${esc(w.name)}, semana ${week}: ${fmt(q||0)} ${esc(w.unit)}. Editar ritmo">${q?fmt(q):paused?'Pausa':''}</button></td>`}).join('')}</tr>`}).join('')}</tbody></table>`;
}
export function costDetailReport({work,month,quantity,cost}){
 const d=cost.details[work.id];if(!d)return '<p>La obra no tiene cantidad programada en este mes.</p>';
 return `<p>${esc(monthName(month))} · ${fmt(quantity)} ${esc(work.unit)}</p><table class="detail-cost-sheet"><tbody>${[['Explosivos y artificios',d.explosives],['Acero',d.steel],['Rezagado · scoop',d.scoopCost],['Acarreo · camión',d.truckCost],['Sostenimiento',d.supportCost],['Horas extra asignadas',d.overtime],['Bono asignado',d.bonus],['Costo directo total',d.direct],['Costo directo por '+work.unit,cost.unitCosts[work.id]]].map(([label,value])=>`<tr><th>${esc(label)}</th>${cell(value)}</tr>`).join('')}</tbody></table><h3>Recursos calculados</h3><table class="detail-cost-sheet"><tbody>${[['Horas scoop',d.scoopHours],['Horas camión',d.truckHours],['Toneladas a mover',d.tonsMoved],['Metros de barrenación',d.drillMeters],['Anclas con provisión',d.bolts],['Malla con provisión (rollos)',d.meshRolls]].map(([label,value])=>`<tr><th>${esc(label)}</th>${cell(value,fmt)}</tr>`).join('')}</tbody></table><p class="report-note">Costo directo por obra: excluye nómina fija y comunes sin asignar.</p>`;
}


export function annualComparisonReport(scenarios){
 const years=[...new Set(scenarios.flatMap(s=>s.records.map(r=>r.month.slice(0,4))))].sort();
 return years.map(year=>{
  const keys=[...new Set(scenarios.flatMap(s=>s.records.filter(r=>r.month.startsWith(year)).map(r=>r.month)))].sort(),middle=Math.floor(scenarios.length/2);
  const concepts=`<aside class="concept-panel"><h3 class="scenario-title">Conceptos</h3><div class="concept-scroll" data-compare-scroll><table class="concept-table"><thead><tr><th scope="col">Resumen ${year}</th></tr></thead><tbody>${ANNUAL_ROWS.map(row=>row.kind==='divider'?'<tr class="annual-divider" aria-hidden="true"><th></th></tr>':`<tr class="${row.style}" data-annual-metric="${row.key}"><th scope="row" title="${esc(row.label)}">${esc(row.label)}</th></tr>`).join('')}</tbody></table></div></aside>`;
  const panels=scenarios.map((scenario,i)=>{
   const rows=scenario.records.filter(r=>r.month.startsWith(year)),values=new Map(rows.map(r=>[r.month,annualMetrics(r)])),sum=annualTotals(rows);
   const panel=`<section class="scenario-panel" aria-label="${esc(scenario.name)}"><h3 class="scenario-title" title="${esc(scenario.name)}">${esc(scenario.name)}</h3><div class="scenario-scroll" data-compare-scroll tabindex="0" role="region" aria-label="Meses del escenario ${esc(scenario.name)}"><table class="scenario-table"><thead><tr>${keys.map(key=>`<th class="num" scope="col">${esc(shortMonth(key))}</th>`).join('')}<th class="num annual-total" scope="col">Total ${year}</th></tr></thead><tbody>${ANNUAL_ROWS.map(row=>{
    if(row.kind==='divider')return `<tr class="annual-divider" aria-hidden="true"><td colspan="${keys.length+1}"></td></tr>`;
    return `<tr class="${row.style}" data-annual-metric="${row.key}">${keys.map(key=>{const value=values.get(key);return `<td class="num" aria-label="${esc(row.label)} · ${esc(shortMonth(key))}">${value?row.format(value[row.key]):''}</td>`}).join('')}<td class="num annual-total" aria-label="${esc(row.label)} · Total ${year}">${row.format(sum[row.key])}</td></tr>`;
   }).join('')}</tbody></table></div></section>`;
   return (i===middle?concepts:'')+panel;
  }).join('');
  return `<section class="annual-report"><h2>Resumen ${year} · comparativa</h2><p>${monthName(keys[0])} a ${monthName(keys.at(-1))} · USD</p><div class="annual-compare-grid" style="--left-panels:${middle};--right-panels:${scenarios.length-middle}">${panels}</div><p class="report-note">${annualNote}</p></section>`;
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
