import {printActivePlan} from './plan-print.mjs?v=patio-1';
import {applyBlockGrades,mineMonth,sumProduction} from './mine-production.mjs?v=patio-1';
import {availableYears,yearPeriod} from './year-range.mjs?v=annual-years-1';
import {openCapacityEditor} from './capacity-editor.mjs?v=patio-1';
import {reconcileProject} from './project-sync.mjs?v=production-1';
import {monthlyExcelReport,annualExcelReport,annualComparisonReport,bindComparisonScroll,projectExcelGrid,inputDetailReport,monthName,resourcesDetailReport} from './report-views.mjs?v=patio-1';
import {monthlyResources} from './resources.mjs?v=patio-1';
import {isRaise} from './capacity.mjs?v=dated-limit-1';
import {PlanningClient} from './api-client.mjs?v=production-1';
import {planningConfig} from './planning-config.mjs';
import {schedule,setRate,monthly,newPlan,weekAt,tick,dateAt,endDate,levelCapacity,day,iso,validate} from './engine.mjs?v=dated-limit-1';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),fmt=(n,d=2)=>n===null||n===undefined?'—':Number(n).toLocaleString('es-MX',{maximumFractionDigits:d,minimumFractionDigits:d}),clone=x=>JSON.parse(JSON.stringify(x));
const STORAGE='minecad.planning.v1',DRAFT='minecad.planning.draft.v1';let base,plan,result,months,productionCache=new Map(),dirty=false,tab='months',reportMonth='',editHandler,proposal,cloud=false,compareMode=document.body.dataset.view==='compare';
let catalog,currentMine='unificacion';
let planningTransport=new PlanningClient(planningConfig);const server=(method,...args)=>planningTransport.call(method,...args);
function fail(e){$('#error').textContent=e.message||String(e);$('#error').hidden=false;if(/autoriz|authoriz|Google|conectar|sesión|conexión|confirmación/i.test(e.message||''))$('#connectionTools').hidden=false;console.error(e)}function clearError(){$('#error').hidden=true}function busy(v){for(const el of $$('.toolbar button,.actions button,.filters button,.filters input,.filters select,.tabs button,#mine'))el.disabled=v||!plan}
function fromCloud(raw){catalog=raw;const project=raw.schemaVersion===3?raw.projects.find(p=>p.id===currentMine):null;if(raw.schemaVersion===3&&!project)throw Error('Mina no encontrada');const b=clone(base);b.mines=raw.schemaVersion===3?raw.projects.map(p=>({id:p.id,name:p.name,count:p.tables.OBRAS.length-1})):[{id:'unificacion',name:'Unificación',count:raw.tables.OBRAS.length-1}];b.initial=project?.initial||[];const t=project?project.tables:raw.tables;if(!t.OBRAS||!t.PLANES)throw Error('La base de planeación no tiene la estructura requerida. Revisa la instalación.');const objects=rows=>rows.slice(1).filter(r=>r[0]).map(r=>Object.fromEntries(rows[0].map((h,i)=>[h,r[i]??''])));const works=objects(t.OBRAS);b.works=works.map(w=>({id:w.id,name:w.nombre,type:w.tipo,unit:w.unidad,target:+w.objetivo_total,planned:+w.alcance_programado,area:w.area,section:w.seccion,material:w.material,level:w.nivel,priority:+w.prioridad,resourceGroup:w.grupo_recurso}));b.dependencies=objects(t.PRECEDENCIAS).map(d=>({predecessor:d.antecedente_id,successor:d.dependiente_id,mode:d.regla}));
 const rates=objects(t.RITMOS),scopes=objects(t.PLAN_OBRAS),pauses=objects(t.PAUSAS),caps=objects(t.CAPACIDAD),segments=objects(t.SEGMENTOS||[['plan_id']]);b.plans=objects(t.PLANES).map(p=>({id:p.id,name:p.nombre,comments:p.comentarios,start:p.inicio,createdAt:p.creado,updatedAt:p.actualizado,revision:+p.revision,mineId:currentMine,rates:rates.filter(r=>r.plan_id===p.id).map(r=>({planId:p.id,workId:r.obra_id,week:r.semana,rate:+r.ritmo_semanal})),works:Object.fromEntries(scopes.filter(r=>r.plan_id===p.id).map(r=>[r.obra_id,{quantity:+r.alcance,earliest:r.inicio_minimo,priority:+r.prioridad,resourceGroup:r.grupo_recurso}])),pauses:pauses.filter(r=>r.plan_id===p.id).map(r=>({workId:r.obra_id,from:r.desde,resume:r.retoma})),capacities:caps.filter(r=>r.plan_id===p.id).map(r=>({group:r.grupo_recurso,from:r.desde,capacity:+r.capacidad_semanal,unit:r.unidad})),...(p.huella_ajuste?{levelingSource:p.huella_ajuste,leveledSegments:segments.filter(r=>r.plan_id===p.id).map(r=>({workId:r.obra_id,start:+r.inicio_tick,end:+r.fin_tick,quantity:+r.cantidad,rate:+r.ritmo,group:r.grupo,unit:r.unidad}))}:{})}));
 if(project?.savedPlans)b.plans=project.savedPlans.map(clone);
 b.fixed.Aux={};
 for(const [i,row] of (t.Aux||[]).entries())for(const [j,value] of row.slice(0,13).entries()){
  if(value!==''&&value!=null)b.fixed.Aux[String.fromCharCode(65+j)+(i+1)]=value;
 }
 b.grades=t.LEYES?.length?objects(t.LEYES):[];
 if(!project)b.initial=b.works.map(w=>({id:w.id,rate:b.plans[0]?.rates.filter(r=>r.workId===w.id).sort((a,b)=>a.week.localeCompare(b.week))[0]?.rate||0,earliest:b.plans[0]?.works[w.id]?.earliest||b.plans[0]?.start}));applyBlockGrades(b.works,raw.economics,currentMine);b.plans=b.plans.map(p=>reconcileProject(b,p));return b}
async function init(){try{busy(true);base={sourceSHA256:'planning-live-v2',works:[],dependencies:[],plans:[],fixed:{Aux:{}}};cloud=true;
 if(!planningConfig.apiUrl)throw Error('Instalación pendiente: pega la URL /exec de Apps Script en planning-config.mjs y vuelve a publicar ese archivo.');
 base=fromCloud(await server('loadPlanningData'));
 $('#connection').textContent='';$('#connection').hidden=true;$('#connectionTools').hidden=true;
 ensureInitialPlan();fillMines();if(!base.plans.length)throw Error('La mina no contiene obras para planear');plan=clone(base.plans[0]);const draft=localStorage.getItem(DRAFT);if(draft&&!compareMode){try{const d=JSON.parse(draft);if(d.sourceSHA===base.sourceSHA256&&d.plan&&(!d.plan.mineId||d.plan.mineId===currentMine)&&confirm('Hay un borrador sin guardar. ¿Quieres recuperarlo?')){plan=reconcileProject(base,d.plan);dirty=true}}catch{}}
 fillPlans();calculate();$('#sourceInfo').textContent=compareMode?'':'Plan: '+plan.name;$('#planner').hidden=compareMode;$('#comparison').hidden=!compareMode;$('#planToolbar').hidden=compareMode;if(compareMode){$('#heading').textContent='Comparación de resúmenes anuales';$('#compareLink').classList.add('active')}else $('#plannerLink').classList.add('active');if(false){$('#plannerLink').href='#programar';$('#compareLink').href='#comparar';for(const [id,value]of [['plannerLink',false],['compareLink',true]])$('#'+id).onclick=e=>{e.preventDefault();compareMode=value;$('#planner').hidden=value;$('#comparison').hidden=!value;$('#planToolbar').hidden=value;$('#heading').textContent=value?'Comparación de planes':'Planeación y escenarios';render()}}if(window.MINECAD_APP_URL){$('#plannerLink').href=window.MINECAD_APP_URL;$('#compareLink').href=window.MINECAD_APP_URL+'?vista=comparar'}render();}catch(e){$('#connection').textContent='No se pudo cargar el plan';$('#connection').hidden=false;$('#connectionTools').hidden=false;$('#save').disabled=true;fail(e)}finally{busy(false)}}
function fillMines(){$('#mine').innerHTML=base.mines.map(m=>`<option value="${esc(m.id)}" ${m.count?'':'disabled'}>${esc(m.name)}${m.count?'':' · sin obras'}</option>`).join('');$('#mine').value=currentMine;$('#mineName').textContent=base.mines.find(m=>m.id===currentMine)?.name||'Planeación'}
function initialPlan(){const dates=base.initial.map(w=>w.earliest).filter(Boolean).sort(),start=dates[0]||new Date().toISOString().slice(0,10),monday=weekAt(tick(start));return {id:crypto.randomUUID(),mineId:currentMine,name:'Plan inicial',comments:'',start:monday,createdAt:'',updatedAt:'',revision:0,works:Object.fromEntries(base.works.map(w=>[w.id,{quantity:w.planned,earliest:base.initial.find(i=>i.id===w.id)?.earliest||start,priority:w.priority,resourceGroup:w.resourceGroup}])),rates:base.works.map(w=>({workId:w.id,week:monday,rate:base.initial.find(i=>i.id===w.id)?.rate||0})),pauses:[],capacities:[]}}
function ensureInitialPlan(){if(!base.plans.length&&base.works.length)base.plans.push(initialPlan())}
$('#mine').onchange=()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos y cambiar de mina?')){$('#mine').value=currentMine;return}try{currentMine=$('#mine').value;base=fromCloud(catalog);ensureInitialPlan();plan=clone(base.plans[0]);dirty=false;localStorage.removeItem(DRAFT);compareSelected.clear();window.compareInitialized=false;fillMines();fillPlans();calculate();render()}catch(e){fail(e)}};
function fillPlans(){const selected=plan?.id;$('#plans').innerHTML=base.plans.map(p=>`<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('');if(base.plans.some(p=>p.id===selected))$('#plans').value=selected}
function calculate(){validate(base,plan);if(plan.autoAdjust&&!plan.leveledSegments)plan=levelCapacity(base,plan);result=schedule(base,plan);months=monthly(result);productionCache.clear();syncYears()}
function period(){const from=$('#from').value,to=$('#to').value;if(!from||!to||from>to)throw Error('Selecciona un periodo válido');return {from,to}}
function monthKeys(){const{from,to}=period(),out=[];let y=+from.slice(0,4),m=+from.slice(5);while(`${y}-${String(m).padStart(2,'0')}`<=to){out.push(`${y}-${String(m).padStart(2,'0')}`);m++;if(m>12){y++;m=1}if(out.length>1200)throw Error('Selecciona un periodo de hasta 100 años para visualizar')}return out}
function productionFor(month){
 if(!productionCache.has(month))productionCache.set(month,mineMonth(base,months,month));
 return productionCache.get(month);
 }
function selectedWorks(){const query=$('#search').value.toLocaleLowerCase('es'),type=$('#type').value;return base.works.filter(w=>(!type||w.type===type)&&(!query||[w.id,w.name,w.area].some(v=>String(v).toLocaleLowerCase('es').includes(query))))}
function metricsHTML(items){return items.map(([label,value,note])=>`<div class="metric"><span class="label">${esc(label)}</span><strong>${value}</strong><small>${esc(note||'')}</small></div>`).join('')}
function render(){try{clearError();$('#metrics').hidden=compareMode||tab!=='weeks';$('#monthNavigation').hidden=compareMode||tab!=='months';$('#content').classList.toggle('report-canvas',tab==='months');$('#content').classList.toggle('annual-canvas',tab==='annual');$('.hint').hidden=compareMode||tab!=='weeks';if(!compareMode&&tab==='weeks'){
 const sum=sumProduction(monthKeys().map(productionFor));
 $('#metrics').innerHTML=metricsHTML([
  ['Desarrollo + Preparación',fmt(sum.meters),'Metros lineales'],
  ['Mineral a patio de mina',fmt(sum.tons),'Toneladas programadas'],
  ['AgEq ponderado',fmt(sum.agEq),sum.gradeCoverage==null?'Sin tonelaje':fmt(sum.gradeCoverage*100,1)+'% del tonelaje con AgEq'],
  ['Barrenación / avance',fmt(sum.drillPerMeter),'m barrenados por m de avance'],
  ['Fin de todo el plan',endDate(result.end),'Fuera del filtro de visualización']
 ]);
 }
 $('#dirty').textContent=dirty?'Cambios sin guardar':'';$('#planName').textContent=plan.name;$('#planComments').textContent=plan.comments||'';
 const warnings=[...(plan.projectUpdates||[]),...result.warnings];if(plan.productionCaps?.length&&!result.productionAdjustment)warnings.push('Límites mensuales configurados pero aún no aplicados: ejecuta Autoajustar en disparos.');if(!(plan.capacities||[]).length)warnings.push('Capacidad sin definir: no se ha verificado disponibilidad de recursos.');if(result.capacities.length)warnings.push(`${result.capacities.length} intervalos exceden la capacidad declarada. Usa «Proponer ajuste» para revisar una alternativa.`);if(plan.levelingSource&&!plan.leveledSegments)warnings.push('El ajuste guardado no tiene segmentos de ejecución.');$('#warnings').hidden=compareMode;$('#warnings').innerHTML=warnings.length?`<details><summary>${warnings.length} avisos del plan</summary><ul>${warnings.map(w=>'<li>'+esc(w)+'</li>').join('')}</ul></details>`:'';
 if(compareMode)renderComparison();else if(tab==='weeks')renderWeeks();else if(tab==='months')renderMonths();else renderAnnual();}catch(e){fail(e)}}
function syncYears(){
 const select=$('#year'),previous=select.value;
 const dates=[plan.start,...base.plans.map(p=>p.start),endDate(result.end),months.bounds?.from,months.bounds?.to];
 const years=availableYears(dates,previous);
 select.innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('')+'<option value="custom">Periodo personalizado</option>';
 select.value=previous==='custom'?'custom':years.includes(Number(previous))?previous:'2027';
 if(select.value!=='custom')setYear();
}
function setYear(){if($('#year').value==='custom')return;const p=yearPeriod($('#year').value);$('#from').value=p.from;$('#to').value=p.to}
function visibleWeeks(){
 const {from,to}=period();
 const firstTick=Math.floor(tick(from+'-01')/6)*6;
 const nextMonth=new Date(day(to+'-01')*86400000);
 nextMonth.setUTCMonth(nextMonth.getUTCMonth()+1);
 const end=nextMonth.getTime()/86400000;
 const weeks=[];
 for(let t=firstTick;day(weekAt(t))<end;t+=6)weeks.push(weekAt(t));
 if(weeks.length>1100)throw Error('Reduce el periodo semanal a 20 años o menos');
 return weeks;
}
function renderWeeks(){
 $('#content').innerHTML=projectExcelGrid({
  works:selectedWorks(),plan,result,weeks:visibleWeeks(),
  dependencies:base.dependencies,formatStart:dateAt,formatEnd:endDate
 });
}
function resourcesFor(month){return monthlyResources({month,works:base.works,quantities:months[month]||{},blastQuantities:months.blastQuantities?.[month],details:productionFor(month).details,crewInputs:plan.crewInputs,isRaise})}
function monthlyReport(month){
 return monthlyExcelReport({
  month,mine:$('#mineName').textContent,works:selectedWorks(),quantities:months[month]||{},
  record:productionFor(month),resources:resourcesFor(month),grades:base.grades
 });
}
function renderMonths(){
 const keys=monthKeys();
 if(!keys.includes(reportMonth))reportMonth=keys[0];
 $('#monthSelect').innerHTML=keys.map(key=>`<option value="${key}">${esc(monthName(key))}</option>`).join('');
 $('#monthSelect').value=reportMonth;
 $('#previousMonth').disabled=keys[0]===reportMonth;
 $('#nextMonth').disabled=keys.at(-1)===reportMonth;
 $('#content').innerHTML=monthlyReport(reportMonth);
}
function renderAnnual(){
 $('#content').innerHTML=annualExcelReport(monthKeys().map(month=>({...productionFor(month),resources:resourcesFor(month)})));
}
let compareSelected=new Set;
function renderComparison(){
 $('#compareResults')._comparisonCleanup?.();
 if(!window.compareInitialized){base.plans.slice(0,2).forEach(p=>compareSelected.add(p.id));window.compareInitialized=true}
 $('#compareChoices').innerHTML=base.plans.map(p=>`<div class="choice"><input type="checkbox" data-compare="${esc(p.id)}" id="compare-${esc(p.id)}" ${compareSelected.has(p.id)?'checked':''}><label for="compare-${esc(p.id)}">${esc(p.name)}<small>${esc(p.comments)}<br>Actualizado: ${esc(p.updatedAt?.slice(0,10)||'')}</small></label></div>`).join('');
 const chosen=base.plans.filter(p=>compareSelected.has(p.id));
 $('#compareResults').classList.add('annual-canvas');
 if(chosen.length<2){$('#compareResults').innerHTML='<p class="empty">Selecciona al menos dos planes para comparar sus resúmenes anuales.</p>';return}
 const keys=monthKeys();
 const scenarios=chosen.map(p=>{
  const computed=schedule(base,p),distribution=monthly(computed);
  const records=keys.map(month=>mineMonth(base,distribution,month));
  return {name:p.name,comments:p.comments,records};
 });
 $('#compareResults').innerHTML=annualComparisonReport(scenarios);bindComparisonScroll($('#compareResults'));
}

function changed(next=plan){validate(base,next);if(next.capacities?.length&&(next.autoAdjust||next.id===plan.id&&(plan.autoAdjust||plan.capacityAdjustment?.version===1)))next=levelCapacity(base,next);plan=next;dirty=true;calculate();localStorage.setItem(DRAFT,JSON.stringify({sourceSHA:base.sourceSHA256,plan}));render()}
function showEditor(title,type,html,handler){$('#editorTitle').textContent=title;$('#editorType').textContent=type;$('#editorBody').innerHTML=html;$('#editForm button[type="submit"]').hidden=false;editHandler=handler;$('#editor').showModal()}
function editCell(id,week){const w=base.works.find(w=>w.id===id),current=plan.rates.filter(r=>r.workId===id&&r.week<=week).sort((a,b)=>a.week.localeCompare(b.week)).at(-1)?.rate||0,events=plan.rates.filter(r=>r.workId===id).sort((a,b)=>a.week.localeCompare(b.week));showEditor(w.name+' · '+week,'PROGRAMACIÓN SEMANAL',`<label>Acción<select id="editAction"><option value="rate">Cambiar ritmo desde esta semana</option><option value="pause">Pausar obra y definir reanudación</option></select></label><div id="rateFields"><label>Nuevo ritmo (${esc(w.unit)}/semana)<input id="rateValue" type="number" min="0" step="any" value="${current}" required></label><p class="note">Se conserva la programación anterior. El cambio rige hasta el siguiente ritmo guardado. Con autoajuste, el ritmo manual tiene prioridad y marca el máximo de ese lugar, sujeto a la capacidad y los disparos de 1.5 m.</p></div><div id="pauseFields" hidden><div class="two"><label>Desde<input id="pauseFrom" type="date" value="${week}"></label><label>Retomar el<input id="pauseResume" type="date" value="${iso(day(week)+7)}"></label></div></div><div class="event-list"><strong>Cambios de ritmo guardados en este plan</strong>${events.map(r=>`<div class="event-row"><span>${r.week}: ${fmt(r.rate)} ${esc(w.unit)}/semana</span><button type="button" data-remove-rate="${r.week}" data-work="${esc(id)}">Eliminar</button></div>`).join('')}${plan.pauses.filter(p=>p.workId===id).map((p,i)=>`<div class="event-row"><span>Pausa ${p.from} → ${p.resume}</span><button type="button" data-remove-pause="${p.from}" data-work="${esc(id)}">Eliminar</button></div>`).join('')}</div>`,()=>{if($('#editAction').value==='rate')changed(setRate(plan,id,week,+$('#rateValue').value));else{const p=clone(plan);p.pauses.push({workId:id,from:$('#pauseFrom').value,resume:$('#pauseResume').value});delete p.leveledSegments;delete p.levelingSource;changed(p)}});$('#editAction').onchange=()=>{$('#pauseFields').hidden=$('#editAction').value!=='pause';$('#rateFields').hidden=$('#editAction').value!=='rate';$('#rateValue').required=$('#editAction').value==='rate'}}
function editWork(id){const w=base.works.find(w=>w.id===id),cfg=plan.works[id],deps=base.dependencies.filter(d=>d.successor===id);showEditor(w.name,'ALCANCE Y SECUENCIA',`<label>Alcance a programar (${w.unit}) · objetivo total ${fmt(w.target)}<input id="workQuantity" type="number" min="0" max="${w.target}" step="any" value="${cfg.quantity}" required></label><div class="two"><label>Inicio mínimo<input type="date" id="workEarliest" value="${cfg.earliest}" required></label><label>Prioridad (menor = primero)<input type="number" id="workPriority" min="0" step="1" value="${cfg.priority}" required></label></div><label>Grupo de capacidad<input id="workGroup" value="${esc(cfg.resourceGroup)}" required></label><p class="note">Precedencias del catálogo: ${deps.map(d=>esc(base.works.find(w=>w.id===d.predecessor)?.name||d.predecessor)+' ('+(d.mode==='next-week'?'semana siguiente':'proporcional')+')').join('; ')||'sin antecedentes'}. Se administran en la base de datos.</p>`,()=>{const p=clone(plan);p.works[id]={quantity:+$('#workQuantity').value,earliest:$('#workEarliest').value,priority:+$('#workPriority').value,resourceGroup:$('#workGroup').value.trim()};delete p.leveledSegments;delete p.levelingSource;changed(p)})}
async function save(asNew=false){const expected=plan.revision||0;busy(true);try{validate(base,plan);const candidate=clone(plan);if(cloud){const reply=await server('savePlanningPlan',candidate,expected);candidate.revision=reply.revision;candidate.updatedAt=reply.updatedAt;candidate.createdAt=reply.createdAt||candidate.createdAt}else{const latest=JSON.parse(localStorage.getItem(STORAGE)||'{"plans":[]}');const existing=latest.plans?.find(p=>p.id===plan.id);if(existing&&existing.revision!==expected)throw Error('Otro cambio fue guardado en este navegador. Guarda una copia del plan antes de recargar.');candidate.revision=expected+1;candidate.updatedAt=new Date().toISOString()}
 base.plans=base.plans.filter(p=>p.id!==candidate.id);base.plans.push(candidate);plan=candidate;if(!cloud)localStorage.setItem(STORAGE,JSON.stringify({schemaVersion:1,plans:base.plans}));dirty=false;localStorage.removeItem(DRAFT);fillPlans();render()}catch(e){fail(e)}finally{busy(false)}}
$('#newplan').onclick=()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos y crear otro plan?'))return;const fresh=initialPlan();showEditor('Nuevo plan desde la base','ESCENARIOS',`<label>Nombre<input id="newName" value="Nuevo plan" required maxlength="160"></label><label>Inicio<input id="newStart" type="date" value="${fresh.start}" required></label><label>Comentarios<textarea id="newComments" rows="3"></textarea></label>`,()=>{fresh.name=$('#newName').value.trim();fresh.comments=$('#newComments').value;fresh.start=$('#newStart').value;fresh.rates.forEach(r=>r.week=weekAt(tick(fresh.start)));changed(fresh)})};
$('#save').onclick=()=>save();$('#load').onclick=()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartarlos y cargar otro plan?'))return;try{plan=clone(base.plans.find(p=>p.id===$('#plans').value));dirty=false;localStorage.removeItem(DRAFT);calculate();render()}catch(e){fail(e)}};
if($('#deleteplan'))$('#deleteplan').onclick=async()=>{
 try{
  if(!catalog.capabilities?.deletePlans)throw Error('Actualiza Apps Script para eliminar planes desde MINECAD.');
  const target=base.plans.find(p=>p.id===$('#plans').value);if(!target||!target.revision)throw Error('Selecciona un plan guardado; un plan nuevo sin guardar no tiene un registro que eliminar.');
  const discard=target.id===plan.id&&dirty?' También se descartarán sus cambios sin guardar.':'';
  if(!confirm('¿Eliminar el plan «'+target.name+'»?'+discard+' Esta acción elimina solo ese escenario guardado.'))return;
  busy(true);const removed=await server('deletePlanningPlan',target.id,target.revision||0);
  base.plans=base.plans.filter(p=>p.id!==target.id);compareSelected.delete(target.id);
  if(plan.id===target.id){ensureInitialPlan();plan=clone(base.plans[0]);dirty=false;localStorage.removeItem(DRAFT);}
  fillPlans();calculate();render();$('#sourceInfo').textContent='Plan eliminado: '+target.name+(removed.remainingPlans===0?'. No quedan escenarios guardados de esta mina; se muestra un nuevo plan desde la base.':'');
 }catch(e){fail(e)}finally{busy(false)}
};
$('#saveas').onclick=()=>showEditor('Guardar como nuevo plan','ESCENARIOS',`<label>Nombre<input id="newName" value="${esc(plan.name+' · alternativa')}" required maxlength="160"></label><label>Comentarios<textarea id="newComments" rows="4">${esc(plan.comments)}</textarea></label>`,async()=>{plan=newPlan(plan,$('#newName').value,$('#newComments').value);dirty=true;await save(true)});
$('#details').onclick=()=>showEditor('Nombre y comentarios','PLAN',`<label>Nombre<input id="newName" value="${esc(plan.name)}" required maxlength="160"></label><label>Comentarios<textarea id="newComments" rows="4">${esc(plan.comments)}</textarea></label>`,()=>{if(!$('#newName').value.trim())throw Error('Escribe un nombre');plan.name=$('#newName').value.trim();plan.comments=$('#newComments').value;changed()});
$('#capacity').onclick=()=>{try{if(!catalog.capabilities?.discreteBlasts)throw Error('Actualiza primero el servicio Apps Script con la versión de capacidad por disparos.');openCapacityEditor({plan,showEditor,onApply:changed,onCrewSettings:crewInputs=>{plan={...plan,crewInputs};dirty=true;localStorage.setItem(DRAFT,JSON.stringify({sourceSHA:base.sourceSHA256,plan}));render()},esc,monthlyEnabled:!!catalog.capabilities?.monthlyProduction})}catch(e){fail(e)}};
if($('#resources'))$('#resources').onclick=()=>{try{
 const keys=monthKeys();
 showEditor('Insumos y cuadrillas','CONSULTA MENSUAL','<label>Mes<select id="resourceMonth">'+keys.map(k=>'<option value="'+k+'">'+esc(monthName(k))+'</option>').join('')+'</select></label><div id="resourceBreakdown"></div>',()=>{});
 $('#editForm button[type="submit"]').hidden=true;
 const select=$('#resourceMonth');if(keys.includes(reportMonth))select.value=reportMonth;
 const draw=()=>{try{$('#resourceBreakdown').innerHTML=resourcesDetailReport(productionFor(select.value),resourcesFor(select.value))}catch(e){$('#resourceBreakdown').textContent=e.message}};
 select.onchange=draw;draw();
 }catch(e){fail(e)}};
$('#level').onclick=()=>{try{if(!catalog.capabilities?.discreteBlasts)throw Error('Actualiza primero el servicio Apps Script para conservar comentarios y ajustes por disparos.');if(!plan.capacities?.length)throw Error('Define primero la capacidad disponible');if(plan.productionCaps?.length&&!catalog.capabilities?.monthlyProduction)throw Error('Actualiza Apps Script para validar los límites mensuales de producción.');proposal=levelCapacity(base,plan);const next=schedule(base,proposal);$('#proposalBody').innerHTML=`<p>Bloques de 1.5 m; tope por obra según la semana y máximo de 9 m por contrapozo. Avance real y consumo de capacidad se muestran separados.</p><details><summary>Capacidad y avance por semana</summary><table><thead><tr><th>Semana</th><th>Tope por obra (m)</th><th>Capacidad prorrateada</th><th>Consumida (equiv.m)</th><th>Avance real (m)</th><th>Sin usar (equiv.m)</th></tr></thead><tbody>${proposal.capacityAdjustment.weeks.map(w=>`<tr><td>${w.week}</td><td>${fmt(w.normalLimit)}</td><td>${fmt(w.available)}</td><td>${fmt(w.used)}</td><td>${fmt(w.actual)}</td><td>${fmt(w.unused)}</td></tr>`).join('')}</tbody></table></details>${proposal.productionAdjustment?'<details><summary>Producción mensual y límites</summary><table><thead><tr><th>Mes</th><th>Desarrollo al 60%</th><th>Tumbe</th><th>Total t</th><th>Máximo t</th></tr></thead><tbody>'+proposal.productionAdjustment.months.map(m=>'<tr><td>'+m.month+'</td><td>'+fmt(m.development)+'</td><td>'+fmt(m.tumbe)+'</td><td>'+fmt(m.total)+'</td><td>'+(m.limit===null?'Sin límite':fmt(m.limit))+'</td></tr>').join('')+'</tbody></table></details>':''}<p>Fin actual: <strong>${endDate(result.end)}</strong> → fin propuesto: <strong>${endDate(next.end)}</strong></p><p>Conflictos de capacidad: ${result.capacities.length} → ${next.capacities.length}</p><table><thead><tr><th>Obra</th><th>Fin actual</th><th>Fin propuesto</th></tr></thead><tbody>${base.works.map(w=>`<tr><td>${esc(w.name)}</td><td>${result.rows[w.id].end===null?'—':endDate(result.rows[w.id].end)}</td><td>${next.rows[w.id].end===null?'—':endDate(next.rows[w.id].end)}</td></tr>`).join('')}</tbody></table>`;$('#proposal').showModal()}catch(e){fail(e)}};$('#applyLevel').onclick=()=>{changed(proposal);$('#proposal').close()};
$('#editForm').onsubmit=async e=>{e.preventDefault();try{await editHandler();$('#editor').close()}catch(err){fail(err)}};$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
let clickTimer;$('#content').onclick=e=>{const inputButton=e.target.closest('[data-input-work]');if(inputButton){const w=base.works.find(w=>w.id===inputButton.dataset.inputWork),month=inputButton.dataset.month;showEditor(w.name,'INSUMOS PROGRAMADOS',inputDetailReport(w,month,productionFor(month)),()=>{});$('#editForm button[type="submit"]').hidden=true;return}const detail=e.target.closest('.work-detail');if(detail){editWork(detail.dataset.work);return}const cell=e.target.closest('button[data-week]');if(cell){clearTimeout(clickTimer);clickTimer=setTimeout(()=>editCell(cell.dataset.work,cell.dataset.week),230)}};$('#content').ondblclick=e=>{const c=e.target.closest('button[data-week]');if(c){clearTimeout(clickTimer);editCell(c.dataset.work,c.dataset.week)}};$('#content').oncontextmenu=e=>{const c=e.target.closest('button[data-week]');if(c){e.preventDefault();clearTimeout(clickTimer);editCell(c.dataset.work,c.dataset.week)}};
$('#editorBody').onclick=e=>{const r=e.target.closest('[data-remove-rate]'),p=e.target.closest('[data-remove-pause]'),c=e.target.closest('[data-remove-capacity]');if(r){const next=clone(plan);next.rates=next.rates.filter(x=>x.workId!==r.dataset.work||x.week!==r.dataset.removeRate);delete next.leveledSegments;delete next.levelingSource;changed(next);$('#editor').close()}if(p){const next=clone(plan);next.pauses=next.pauses.filter(x=>x.workId!==p.dataset.work||x.from!==p.dataset.removePause);delete next.leveledSegments;delete next.levelingSource;changed(next);$('#editor').close()}if(c){const next=clone(plan);next.capacities.splice(+c.dataset.removeCapacity,1);delete next.leveledSegments;delete next.levelingSource;changed(next);$('#editor').close()}};
$('#monthSelect').onchange=()=>{reportMonth=$('#monthSelect').value;render()};$('#previousMonth').onclick=()=>{const keys=monthKeys(),i=keys.indexOf(reportMonth);if(i>0){reportMonth=keys[i-1];render()}};$('#nextMonth').onclick=()=>{const keys=monthKeys(),i=keys.indexOf(reportMonth);if(i<keys.length-1){reportMonth=keys[i+1];render()}};
$('#year').onchange=()=>{setYear();render()};for(const id of ['from','to'])$('#'+id).onchange=()=>{$('#year').value='custom';render()};for(const id of ['type','search'])$('#'+id).oninput=render;$$('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;$$('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));render()});$('#compareChoices').onchange=e=>{const id=e.target.dataset.compare;if(!id)return;if(e.target.checked)compareSelected.add(id);else compareSelected.delete(id);renderComparison()};
$('#refresh').onclick=async()=>{if(dirty&&!confirm('La actualización puede cambiar los catálogos del borrador. ¿Continuar?'))return;try{busy(true);if(cloud){const fresh=fromCloud(await server('loadPlanningData'));base=fresh;ensureInitialPlan();fillMines();if(dirty)plan=reconcileProject(base,plan);else{const current=fresh.plans.find(p=>p.id===plan.id);plan=clone(current||fresh.plans[0])}fillPlans()}else{const fresh=await fetch('data.json',{cache:'no-store'}).then(r=>r.json());base.fixed=fresh.fixed;base.works=fresh.works;base.dependencies=fresh.dependencies}calculate();render()}catch(e){fail(e)}finally{busy(false)}};
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});window.addEventListener('storage',e=>{if(e.key===STORAGE)fail(Error('Los planes cambiaron en otra pestaña. Guarda una copia antes de volver a cargar.'))});
$('#authorize').onclick=()=>{try{window.open(planningTransport.authorizationUrl(),'_blank','noopener,noreferrer')}catch(e){fail(e)}};
$('#reconnect').onclick=async()=>{if(dirty&&!confirm('Hay cambios sin guardar. ¿Descartar el borrador abierto y recargar?'))return;planningTransport.dispose();planningTransport=new PlanningClient(planningConfig);dirty=false;plan=null;await init()};
init();





function printCurrentPlan(includeMonths=false){
 const {from,to}=period();
 const monthlyDetails=includeMonths?monthKeys().map(month=>({html:monthlyReport(month)})):[];
 printActivePlan({
  name:plan.name,mine:$('#mineName').textContent,dirty,tab,
  period:tab==='months'?monthName(reportMonth):monthName(from)+' – '+monthName(to),
  type:$('#type').value,search:$('#search').value,
  source:$('#content'),works:tab==='weeks'?selectedWorks():[],
  weeks:tab==='weeks'?visibleWeeks():[],result,monthlyDetails
 });
}
const printButton=$('#printPlan');
if(printButton)printButton.addEventListener('click',()=>{
 try{
  if(!plan||!result||compareMode||!$('#error').hidden)return;
  if(tab!=='annual'){printCurrentPlan();return}
  showEditor('Imprimir resumen anual','PDF DEL ESCENARIO',
   '<label>Contenido<select id="annualPrintContents"><option value="summary">Solo resumen anual</option><option value="detailed">Resumen anual y detalle de cada mes</option></select></label><p>El resumen abre el documento como carátula. El detalle incluye los meses del periodo seleccionado, en orden, y cada mes empieza en página nueva.</p>',
   ()=>{
    const includeMonths=$('#annualPrintContents').value==='detailed';
    $('#editor').close();
    printCurrentPlan(includeMonths);
   });
 }catch(e){fail(e)}
});
