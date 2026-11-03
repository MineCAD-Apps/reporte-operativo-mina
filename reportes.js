"use strict";
import {PlanningClient} from "./reportes-client.mjs?v=reports-auth-1";
const API_URL = "https://script.google.com/macros/s/AKfycbzstqms0HqJ5wWqt8oECspm9VkqRy5i5cYrMQ3kY3rhYADVnttDVu2He9tZuCu44w7p/exec";
const MINES = ["Santa Maria", "Unificación/Hallazgo"];
const MINE_LABELS = {"Santa Maria":"Santa María","Unificación/Hallazgo":"Unificación/Hallazgo"};
const $ = id => document.getElementById(id);
let productionChart = null;

function n(value){const x=Number(value);return Number.isFinite(x)?x:0;}
function sum(rows,field){return (rows||[]).reduce((total,row)=>total+n(row[field]),0);}
function normalized(value){return String(value||"").trim().toUpperCase();}
function esc(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}
function isoLocal(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;}
function parseLocal(text){const [y,m,d]=String(text).split("-").map(Number);return new Date(y,m-1,d);}
function fmt(value,decimals=1){return n(value).toLocaleString("es-MX",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});}
function dayLabel(text){return parseLocal(text).toLocaleDateString("es-MX",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
function monthLabel(text){return parseLocal(`${text}-01`).toLocaleDateString("es-MX",{month:"long",year:"numeric"});}
function daysInMonth(month){const [y,m]=month.split("-").map(Number);return new Date(y,m,0).getDate();}
function mondayOf(text){const d=parseLocal(text);const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return isoLocal(d);}
function previousDay(){const d=new Date();d.setDate(d.getDate()-1);return isoLocal(d);}

let reportClient=null,queryQueue=[],flushTimer=null;
const reportConfig={apiUrl:API_URL,parentOrigin:'https://minecad-apps.github.io',timeoutMs:90000};
function client(){return reportClient||(reportClient=new PlanningClient(reportConfig))}
function requestEnvelope(action,params={}){
 return new Promise((resolve,reject)=>{queryQueue.push({id:crypto.randomUUID(),action,params,resolve,reject});if(flushTimer==null)flushTimer=setTimeout(flushQueries,0)});
}
async function flushQueries(){
 const queued=queryQueue.splice(0);flushTimer=null;
 try{for(let offset=0;offset<queued.length;offset+=40){const chunk=queued.slice(offset,offset+40);const responses=await client().call('loadOperationalQueries',chunk.map(({id,action,params})=>({id,action,params})));const byId=new Map(responses.map(r=>[r.id,r]));
  for(const q of chunk){const r=byId.get(q.id);if(!r||!r.ok)q.reject(Error(r?.error||'Consulta sin respuesta'));else if(!r.result?.ok)q.reject(Error(r.result?.mensaje||'Consulta rechazada'));else q.resolve(r.result)}}
 }catch(e){for(const q of queued)q.reject(e)}
}
async function request(action,params={}){const r=await requestEnvelope(action,params);return r.datos??[]}
async function requestNullable(action,params={}){const r=await requestEnvelope(action,params);return r.datos}
function workdayFraction(month,date){const total=daysInMonth(month),cut=Number(date.slice(-2));let a=0,b=0;for(let d=1;d<=total;d++){const day=parseLocal(`${month}-${String(d).padStart(2,'0')}`).getDay();if(day!==0&&day!==6){b++;if(d<=cut)a++}}return b?a/b:0}
function authControls(){const box=document.createElement('div');box.className='report-auth-controls';box.innerHTML='<span>Conexión privada con Google</span><button type="button" id="authorizeReports">Autorizar Google</button><button type="button" id="reconnectReports">Reconectar</button>';document.querySelector('main').prepend(box);
 $('authorizeReports').addEventListener('click',()=>window.open(client().authorizationUrl(),'_blank','noopener'));
 $('reconnectReports').addEventListener('click',()=>{reportClient?.dispose();reportClient=null;activeMode==='monthly'?loadMonthlyReport():loadReport()});
}
function showError(message){$('errorBox').hidden=false;$('errorBox').textContent=message;}
function clearError(){$('errorBox').hidden=true;$('errorBox').textContent="";}

function dateSet(list,last){const set=new Set(Array.isArray(list)?list:[]);if(last)set.add(last);return set;}
function renderSafety(data=null){
  const grid=$('safetyCalendarGrid');
  if(!data||!data.fechaActual){
    $('safetyIA').textContent="—";$('safetyIF').textContent="—";$('safetyIG').textContent="—";
    $('safetyCalendarTitle').textContent="Datos de seguridad no disponibles";
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">No fue posible consultar Seguridad.</div>';
    return;
  }
  $('safetyIA').textContent=n(data.indiceAccidentabilidad).toFixed(3);
  $('safetyIF').textContent=n(data.indiceFrecuencia).toFixed(3);
  $('safetyIG').textContent=n(data.indiceGravedad).toFixed(3);
  const year=n(data.anioActual)||new Date().getFullYear();
  const month=n(data.mesActual)||new Date().getMonth()+1;
  const today=data.fechaActual||isoLocal(new Date());
  const sets={};["A","B","C","D","T"].forEach(type=>sets[type]=dateSet(data[`accidentesMes${type}`],data[`fechaUltimoAccidente${type}`]));
  $('safetyCalendarTitle').textContent=`${new Date(year,month-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"})}`;
  grid.innerHTML="";
  for(let i=0;i<new Date(year,month-1,1).getDay();i++)grid.insertAdjacentHTML("beforeend",'<div class="calendar-cell empty"></div>');
  for(let day=1;day<=new Date(year,month,0).getDate();day++){
    const date=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    let state=date>today?"future":"safe";
    if(sets.A.has(date)||sets.B.has(date))state="warning";
    if(sets.C.has(date))state="danger";
    if(sets.T.has(date))state="transit";
    if(sets.D.has(date))state="fatal";
    grid.insertAdjacentHTML("beforeend",`<div class="calendar-cell ${state}" title="${date}">${day}</div>`);
  }
}

function workAmount(row){if(n(row.metrosLineales)>0)return `${fmt(row.metrosLineales,2)} m`;if(n(row.m3)>0)return `${fmt(row.m3,2)} m³`;return "—";}
function summarizeMine(mine,data,date){
  const work=data.work||[], equipment=data.equipment||[], movement=data.movement||[], plant=data.plant||[], stock=data.stock||null;
  const available=equipment.filter(row=>normalized(row.estadoTecnico||row.estado)==="DISPONIBLE").length;
  const planRows=(data.program||[]).filter(row=>row.fecha===date&&row.mina===mine);
  const plannedPuebles=sum(planRows,"pueblesProgramados");
  const realizedPuebles=planRows.reduce((t,row)=>t+(row.pueblesRealizados==null?0:n(row.pueblesRealizados)),0);
  const realizedShots=planRows.reduce((t,row)=>t+(row.disparosRealizados==null?0:n(row.disparosRealizados)),0);
  return {
    reported:Boolean(data.reported),work,equipment,movement,plant,stock,planRows,
    ml:sum(work,"metrosLineales"),m3:sum(work,"m3"),plantTons:sum(plant,"tonelaje"),movedTons:sum(movement,"tonelajeEstimado"),
    availability:equipment.length?available/equipment.length*100:null,hours:sum(equipment,"horasOperadas"),
    plannedPuebles,realizedPuebles,realizedShots,planningReported:planRows.some(row=>row.tieneReportePlaneacion)
  };
}

function materialDensity(catalogs,mine){
  const rows=(catalogs||[]).filter(row=>normalized(row.tipoCatalogo)==="MATERIAL"&&normalized(row.nombre)==="MINERAL"&&n(row.valor)>0);
  const direct=rows.find(row=>normalized(row.mina)===normalized(mine));
  const global=rows.find(row=>normalized(row.mina)==="TODAS");
  return direct?n(direct.valor):global?n(global.valor):null;
}
function signed(value,unit){
  if(value==null||!Number.isFinite(Number(value)))return "—";
  const number=Number(value), sign=number>0?"+":"";
  return `${sign}${fmt(number,1)} ${unit}`;
}
function complianceRow(label,actual,plan,unit){
  if(actual==null)return `<div class="compliance-row"><div><span>${esc(label)}</span><small>Real no disponible${plan==null?" · sin plan":` · Plan ${fmt(plan,1)} ${unit}`}</small></div><strong>—</strong></div>`;
  if(plan==null)return `<div class="compliance-row"><div><span>${esc(label)}</span><small>Real ${fmt(actual,1)} ${unit} · sin plan</small></div><strong>—</strong></div>`;
  const pct=plan>0?actual/plan*100:null;
  return `<div class="compliance-row"><div><span>${esc(label)}</span><small>Real ${fmt(actual,1)} / Plan ${fmt(plan,1)} ${unit}</small></div><strong>${pct==null?"—":`${fmt(pct,1)}%`}<small>${signed(actual-plan,unit)}</small></strong></div>`;
}

function aggregateMovementByEquipment(rows){
  const map=new Map();
  (rows||[]).forEach(row=>{
    const equipment=String(row.equipo||"").trim();
    if(!equipment)return;
    const key=normalized(equipment).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");
    if(!map.has(key))map.set(key,{equipment,tons:0,viajes:0,cucharones:0,otros:0});
    const item=map.get(key);
    item.tons+=n(row.tonelajeEstimado);
    const quantity=n(row.cantidad);
    const type=normalized(row.tipoConteo);
    if(type.includes("VIAJ"))item.viajes+=quantity;
    else if(type.includes("CUCHAR"))item.cucharones+=quantity;
    else item.otros+=quantity;
  });
  return [...map.values()].sort((a,b)=>b.tons-a.tons||a.equipment.localeCompare(b.equipment,"es"));
}

function movementDetail(item){
  const parts=[];
  if(item.cucharones)parts.push(`${fmt(item.cucharones,0)} cucharones`);
  if(item.viajes)parts.push(`${fmt(item.viajes,0)} viajes`);
  if(item.otros)parts.push(`${fmt(item.otros,0)} movimientos`);
  return parts.join(" · ")||"Movimiento registrado";
}

function renderMineCard(mine,summary){
  const availableRows=summary.equipment.filter(row=>normalized(row.estadoTecnico||row.estado)==="DISPONIBLE");
  const unavailableRows=summary.equipment.filter(row=>normalized(row.estadoTecnico||row.estado)!=="DISPONIBLE");
  const activeMovement=aggregateMovementByEquipment(summary.movement);
  const operationRows=summary.work.length?summary.work.map(row=>`<div class="operation-row"><span>${esc(row.obra||"Sin lugar")} · ${esc(row.tipoTrabajo||row.tipoObra||"Trabajo")}${row.material?` · ${esc(row.material)}`:""}</span><strong>${workAmount(row)}</strong></div>`).join(""):'<div class="empty-state">Sin avances, tumbe o desborde capturados.</div>';
  const movementEquipmentRows=activeMovement.length?activeMovement.map(item=>`<div class="equipment-row" style="border-left:4px solid #26834a;background:#f1faf4;padding:8px 10px"><span><strong style="color:#176b39">● ${esc(item.equipment)}</strong><small style="display:block;color:#64748b;margin-top:2px">${esc(movementDetail(item))}</small></span><strong style="color:#176b39">${fmt(item.tons,1)} t</strong></div>`).join(""):'<div class="empty-state">Sin equipo identificado en los movimientos del día.</div>';
  const availableEquipmentRows=availableRows.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 10px">${availableRows.map(row=>`<span style="display:inline-flex;align-items:center;gap:5px;border:1px solid #b8ddc5;border-radius:999px;padding:5px 8px;background:#f4fbf6;color:#176b39;font-size:11px;font-weight:800">● ${esc(row.equipo||"Equipo")}${n(row.horasOperadas)>0?` · ${fmt(row.horasOperadas,1)} h`:""}</span>`).join("")}</div>`:'<div class="empty-state">Sin equipos marcados como disponibles.</div>';
  const unavailableEquipmentRows=unavailableRows.length?unavailableRows.map(row=>`<div class="equipment-row" style="border-left:4px solid #c64242;background:#fff5f5;padding:8px 10px"><span><strong style="color:#a62f2f">● ${esc(row.equipo||"Equipo")}</strong><small style="display:block;color:#7b6670;margin-top:2px">${esc(row.motivoNoOperacion||row.motivo||row.tipoFalla||"No disponible")}</small></span><strong style="color:#a62f2f">${n(row.horasOperadas)>0?`${fmt(row.horasOperadas,1)} h`:"N/D"}</strong></div>`).join(""):'<div class="empty-state">Sin equipos no disponibles reportados.</div>';
  const availability=summary.availability==null?"—":`${fmt(summary.availability,1)}%`;
  const stock=summary.stock?`${fmt(summary.stock.stockPatioTon,1)} t`:"—";
  const planText=summary.planRows.length?`${summary.realizedPuebles}/${summary.plannedPuebles}`:"—";
  const shotText=summary.planRows.length?`${summary.realizedShots}/${summary.plannedPuebles}`:"—";
  return `<article class="mine-card">
    <div class="mine-head"><div><h3>${esc(MINE_LABELS[mine])}</h3><p>Total diario consolidado</p></div><span class="report-state ${summary.reported?"":"missing"}">${summary.reported?"Reporte recibido":"Sin reporte"}</span></div>
    <div class="mine-stats">
      <div class="mine-stat"><span>A planta</span><strong>${fmt(summary.plantTons,1)} t</strong></div>
      <div class="mine-stat"><span>Avance</span><strong>${fmt(summary.ml,2)} m</strong></div>
      <div class="mine-stat"><span>Volumen</span><strong>${fmt(summary.m3,1)} m³</strong></div>
      <div class="mine-stat"><span>Stock patio</span><strong>${stock}</strong></div>
    </div>
    <div class="mine-body">
      <div class="mine-block"><h4>Cumplimiento acumulado al día</h4><div class="compliance-list">${complianceRow("A planta",summary.monthly.plantActual,summary.monthly.plantPlan,"t")}${complianceRow("Metros lineales",summary.monthly.linearActual,summary.monthly.linearPlan,"m")}${complianceRow("Tumbe mineral",summary.monthly.tumbleActual,summary.monthly.tumblePlan,"t")}</div><h4 class="secondary-title">Operación del día</h4>${operationRows}<p class="mine-note">Toneladas manipuladas por equipos: ${fmt(summary.movedTons,1)} t.</p><h4 class="secondary-title">Equipos con movimiento</h4><div class="equipment-list">${movementEquipmentRows}</div></div>
      <div class="mine-block"><h4>Planeación y estado de flota</h4>
        <div class="planning-grid"><div class="planning-cell"><span>Puebles real / plan</span><strong>${planText}</strong></div><div class="planning-cell"><span>Disparos real / plan</span><strong>${shotText}</strong></div></div>
        <div class="equipment-summary"><div><span>Disponibilidad</span><strong>${availability}</strong></div><div><span>Disponibles</span><strong>${availableRows.length}</strong></div><div><span>No disponibles</span><strong>${unavailableRows.length}</strong></div></div>
        <h4 class="secondary-title">Disponibles / operativos</h4>${availableEquipmentRows}
        <h4 class="secondary-title">No disponibles</h4><div class="equipment-list">${unavailableEquipmentRows}</div>
        ${summary.planRows.length&&!summary.planningReported?'<p class="mine-note">Planeación todavía no tiene conciliación registrada para estas actividades.</p>':""}
      </div>
    </div>
  </article>`;
}

function renderProductionChart(month,date,monthly){
  const totalDays=daysInMonth(month), cutoffDay=Number(date.slice(-2));
  const plans=monthly.map(x=>x.plan).filter(Boolean);
  const fullPlan=plans.length===MINES.length;
  const target=plans.reduce((total,plan)=>total+n(plan.tonPlantaPlan),0);
  const byDate={};
  monthly.forEach(item=>(item.shipments||[]).forEach(row=>{byDate[row.fecha]=(byDate[row.fecha]||0)+n(row.tonelaje);}));
  const labels=Array.from({length:cutoffDay},(_,i)=>String(i+1));
  let running=0;
  const actual=labels.map((_,i)=>{const key=`${month}-${String(i+1).padStart(2,"0")}`;running+=byDate[key]||0;return running;});
  const planLine=fullPlan?labels.map((_,i)=>target*workdayFraction(month,`${month}-${String(i+1).padStart(2,'0')}`)):[];
  const planToDate=fullPlan?target*workdayFraction(month,date):null;
  $('productionMonth').textContent=monthLabel(month);
  $('productionActual').textContent=`${fmt(running,1)} t`;
  $('productionPlan').textContent=planToDate==null?"Sin plan":`${fmt(planToDate,1)} t`;
  $('productionCompliance').textContent=planToDate>0?`${fmt(running/planToDate*100,1)}%`:"—";
  $('productionNote').textContent=fullPlan?"Plan proporcional acumulado de ambas minas contra embarque real acumulado.":`Plan incompleto: ${plans.length} de ${MINES.length} minas tienen meta mensual registrada.`;
  if(productionChart)productionChart.destroy();
  productionChart=new Chart($('productionChart'),{type:"line",data:{labels,datasets:[
    {label:"Plan acumulado",data:planLine,borderColor:"#3375c2",backgroundColor:"#3375c2",pointRadius:0,borderWidth:2,tension:0},
    {label:"Real acumulado",data:actual,borderColor:"#e78139",backgroundColor:"#e78139",pointRadius:0,pointHoverRadius:4,borderWidth:2.5,tension:0}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:"index"},plugins:{legend:{position:"bottom",labels:{boxWidth:14,font:{size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${fmt(ctx.parsed.y,1)} t`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:10,font:{size:9}}},y:{beginAtZero:true,ticks:{font:{size:9}},title:{display:true,text:"t acumuladas",font:{size:10}}}}}});
}

async function loadReport(){
  const epoch=++dailyEpoch;
  const date=$('reportDate').value;
  if(!date)return;
  const button=$('refreshReport');button.disabled=true;button.textContent="Consultando…";clearError();$('reportStatus').textContent="Consultando…";
  $('reportDateLabel').textContent=dayLabel(date);
  const month=date.slice(0,7), monthStart=`${month}-01`, weekStart=mondayOf(date);
  const queryErrors=[];
  const safe=async(action,params,fallback,nullable=false)=>{
    try{return nullable?await requestNullable(action,params):await request(action,params);}
    catch(error){queryErrors.push(`${action}: ${error.message.replace(/^\w+:\s*/,"")}`);return fallback;}
  };
  try{
    const safetyPromise=safe("seguridad",{},null);
    const programPromise=safe("programacion_semanal",{semana_inicio:weekStart},[]);
    const catalogsPromise=safe("catalogos",{},[]);
    const dailyPromises=MINES.map(async mine=>{
      const common={mina:mine,desde:date,hasta:date};
      const [reported,work,equipment,movement,plant,stock]=await Promise.all([
        safe("dias_reportados",common,[]),safe("barrenacion",common,[]),safe("equipos",common,[]),safe("movimiento_material",common,[]),safe("acarreo_planta",common,[]),safe("stock_patio",{mina:mine,hasta:date},null,true)
      ]);
      const registered=reported.includes(date);
      const operationalEvidence=[work,equipment,movement,plant].some(rows=>Array.isArray(rows)&&rows.length>0);
      return {mine,reported:registered||operationalEvidence,registered,operationalEvidence,work,equipment,movement,plant,stock};
    });
    const monthlyPromises=MINES.map(async mine=>{
      const [plan,shipments,advancement]=await Promise.all([
        safe("plan_produccion_mensual",{mina:mine,mes:month},null,true),safe("acarreo_planta",{mina:mine,desde:monthStart,hasta:date},[]),safe("avance_topografico",{mina:mine,desde:monthStart,hasta:date},[])
      ]);
      return {mine,plan,shipments,advancement};
    });
    const [safety,program,catalogs,daily,monthly]=await Promise.all([safetyPromise,programPromise,catalogsPromise,Promise.all(dailyPromises),Promise.all(monthlyPromises)]);
    if(epoch!==dailyEpoch)return;
    if(queryErrors.some(e=>/^(dias_reportados|barrenacion|equipos|movimiento_material|acarreo_planta|seguridad):/.test(e)))throw Error([...new Set(queryErrors)].join(" · "));
    if(queryErrors.length)showError([...new Set(queryErrors)].join(" · "));
    renderSafety(safety);
    const summaries={};daily.forEach(item=>summaries[item.mine]=summarizeMine(item.mine,{...item,program},date));
    const monthFraction=workdayFraction(month,date);
    monthly.forEach(item=>{
      const density=materialDensity(catalogs,item.mine);
      const plan=item.plan||null;
      const advancement=item.advancement||[];
      const tumbleVolume=advancement.filter(row=>normalized(row.tipoTrabajo)==="TUMBE"&&normalized(row.material)==="MINERAL").reduce((total,row)=>total+n(row.m3),0);
      summaries[item.mine].monthly={
        plantActual:sum(item.shipments||[],"tonelaje"),
        plantPlan:plan?n(plan.tonPlantaPlan)*monthFraction:null,
        linearActual:sum(advancement,"metrosLineales"),
        linearPlan:plan?n(plan.metrosLinealesPlan)*monthFraction:null,
        tumbleActual:density==null?0:tumbleVolume*density,
        tumblePlan:plan?n(plan.tonTumbePlan)*monthFraction:null
      };
      if(density==null&&tumbleVolume>0)summaries[item.mine].monthly.tumbleActual=null;
    });
    MINES.forEach(mine=>{if(!summaries[mine].monthly)summaries[mine].monthly={plantActual:0,plantPlan:null,linearActual:0,linearPlan:null,tumbleActual:0,tumblePlan:null};});
    const covered=MINES.filter(mine=>summaries[mine]?.reported).length;
    $('coverageValue').textContent=`${covered} de ${MINES.length} minas reportadas`;
    $('coverageDetail').textContent=MINES.map(mine=>{
      const item=daily.find(row=>row.mine===mine);
      if(!summaries[mine]?.reported)return `${MINE_LABELS[mine]}: pendiente`;
      return `${MINE_LABELS[mine]}: ${item?.registered?"recibido":"captura detectada"}`;
    }).join(" · ");
    $('reportStatus').textContent=covered===MINES.length?"Completo":covered?"Parcial":"Pendiente";
    $('kpiPlantTotal').textContent=`${fmt(MINES.reduce((t,m)=>t+summaries[m].plantTons,0),1)} t`;
    $('kpiLinearTotal').textContent=`${fmt(MINES.reduce((t,m)=>t+summaries[m].ml,0),2)} m`;
    $('kpiVolumeTotal').textContent=`${fmt(MINES.reduce((t,m)=>t+summaries[m].m3,0),1)} m³`;
    const equipment=MINES.flatMap(m=>summaries[m].equipment);const available=equipment.filter(row=>normalized(row.estadoTecnico||row.estado)==="DISPONIBLE").length;
    $('kpiAvailabilityTotal').textContent=equipment.length?`${fmt(available/equipment.length*100,1)}%`:"—";
    const stocks=MINES.map(m=>summaries[m].stock).filter(Boolean);$('kpiStockTotal').textContent=stocks.length?`${fmt(stocks.reduce((t,x)=>t+n(x.stockPatioTon),0),1)} t`:"—";
    $('mineComparison').innerHTML=MINES.map(mine=>renderMineCard(mine,summaries[mine])).join("");
    renderProductionChart(month,date,monthly);
  }catch(error){showError(error.message);$('reportStatus').textContent="Error de consulta";}
  finally{button.disabled=false;button.textContent="Actualizar";}
}

let activeMode="daily",dailyEpoch=0,monthlyEpoch=0;
authControls();
$('reportDate').value=previousDay();
$('refreshReport').addEventListener("click",loadReport);
$('reportDate').addEventListener("change",loadReport);
loadReport();

let monthlyProductionChart=null,availableMonths=[];
function monthlyTable(headers,rows){return `<div class="monthly-scroll"><table class="monthly-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function monthlyCard(title,body){return `<article class="report-card monthly-operation-card"><h3>${esc(title)}</h3>${body}</article>`}
function equipmentKey(value){const s=normalized(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'');const m=s.match(/\b(ST|CBP)\s*[-#]?\s*0*(\d+)\b/);return m?`${m[1]}-${m[2]}`:s.replace(/#/g,' ').replace(/\s+/g,' ').trim()}
function monthlyFleet(rows){const map=new Map();for(const r of rows){const key=equipmentKey(r.equipo);if(!map.has(key))map.set(key,{name:key,days:new Set(),available:new Set(),lastDate:'',lastStatus:'',lastComment:''});const v=map.get(key);v.days.add(r.fecha);if(normalized(r.estadoTecnico||r.estado)==='DISPONIBLE')v.available.add(r.fecha);if(r.fecha>=v.lastDate){v.lastDate=r.fecha;v.lastStatus=r.estadoTecnico||r.estado;v.lastComment=r.comentarios||r.motivoNoOperacion||r.tipoFalla||''}}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'es',{numeric:true}))}
function monthlyMetrics(item){const c=(item.work||[]).filter(r=>normalized(r.tipoTrabajo||r.tipoObra)==='CUELE');return {plant:sum(item.shipments,'tonelaje'),ml:sum(c,'metrosLineales'),desarrollo:sum(c.filter(r=>normalized(r.clasificacionAvance)==='DESARROLLO'),'metrosLineales'),preparacion:sum(c.filter(r=>normalized(r.clasificacionAvance).startsWith('PREPARACI')),'metrosLineales'),otherMl:sum((item.work||[]).filter(r=>!c.includes(r)),'metrosLineales'),volume:sum(item.work,'m3'),drilled:sum(item.drilling,'barrenosDados'),blasted:sum(item.drilling,'barrenosPegados'),available:(item.equipment||[]).filter(r=>normalized(r.estadoTecnico||r.estado)==='DISPONIBLE').length,fleetCount:(item.equipment||[]).length}}
function monthlySafety(data,month){
 const year=Number(month.slice(0,4)),m=Number(month.slice(5));$('monthlySafetyCalendarTitle').textContent=monthLabel(month);const grid=$('monthlySafetyCalendarGrid');grid.innerHTML='';
 for(const key of ['IA','IF','IG'])$('monthlySafety'+key).textContent=data?fmt(data[{IA:'indiceAccidentabilidad',IF:'indiceFrecuencia',IG:'indiceGravedad'}[key]],3):'—';
 if(!data){grid.innerHTML='<p>Sin consulta de seguridad; no se supone ausencia de eventos.</p>';return}
 const events={};for(const t of 'ABCDT')events[t]=dateSet(data['accidentesMes'+t],data['fechaUltimoAccidente'+t]);
 for(let i=0;i<new Date(year,m-1,1).getDay();i++)grid.insertAdjacentHTML('beforeend','<div class="calendar-cell empty"></div>');
 const today=isoLocal(new Date());for(let d=1;d<=daysInMonth(month);d++){const day=`${month}-${String(d).padStart(2,'0')}`;let state=day>today?'future':'safe';if(events.A.has(day)||events.B.has(day))state='warning';if(events.C.has(day))state='danger';if(events.T.has(day))state='transit';if(events.D.has(day))state='fatal';grid.insertAdjacentHTML('beforeend',`<div class="calendar-cell ${state}" title="${day}">${d}</div>`)}
}
function monthlyChart(month,items){const days=daysInMonth(month),plans=items.map(x=>x.plan).filter(Boolean),hasPlans=plans.length===MINES.length,target=sum(plans,'tonPlantaPlan');const byDay={};for(const it of items)for(const r of it.shipments||[])byDay[r.fecha]=(byDay[r.fecha]||0)+n(r.tonelaje);let running=0;const actual=Array.from({length:days},(_,i)=>running+=byDay[`${month}-${String(i+1).padStart(2,'0')}`]||0);const total=actual.at(-1)||0;
 $('monthlyProductionMonth').textContent=monthLabel(month);$('monthlyProductionActual').textContent=fmt(total,2)+' t';$('monthlyProductionPlan').textContent=hasPlans?fmt(target,1)+' t':'Sin plan completo';$('monthlyProductionCompliance').textContent=hasPlans&&target>0?fmt(total/target*100,1)+'%':'—';$('monthlyProductionNote').textContent='Embarques registrados; no equivalen a todo el mineral tumbado. Plan vigente en base al consultar, sobre días de lunes a viernes; no reconstruye versiones anteriores.';
 monthlyProductionChart?.destroy();monthlyProductionChart=new Chart($('monthlyProductionChart'),{type:'line',data:{labels:Array.from({length:days},(_,i)=>i+1),datasets:[{label:'Real acumulado',data:actual,borderColor:'#e78139',pointRadius:0,tension:0},{label:'Plan acumulado',data:hasPlans?Array.from({length:days},(_,i)=>target*workdayFraction(month,`${month}-${String(i+1).padStart(2,'0')}`)):[],borderColor:'#3375c2',pointRadius:0,tension:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Toneladas a planta'}},x:{ticks:{maxTicksLimit:10}}}}});
}
async function loadMonthlyReport(){
 const month=$('monthlyYear').value+'-'+$('monthlyMonth').value;if(!/^20\d{2}-\d{2}$/.test(month))return;const epoch=++monthlyEpoch,button=$('refreshMonthlyReport');button.disabled=true;$('monthlyErrorBox').hidden=true;$('monthlyReportStatus').textContent='Consultando…';
 const start=month+'-01',end=month+'-'+daysInMonth(month);$('monthlyPeriodLabel').textContent=monthLabel(month);const errors=[];
 const get=async(action,params={},nullable=false)=>{try{return nullable?await requestNullable(action,params):await request(action,params)}catch(e){errors.push(action+': '+e.message);return nullable?null:[]}};
 try{
  const safetyP=get('seguridad'),itemsP=MINES.map(async mine=>{const p={mina:mine,desde:start,hasta:end};const [reported,work,equipment,movement,shipments,drilling,plan,advancement,notes]=await Promise.all([get('dias_reportados',p),get('barrenacion',p),get('equipos',p),get('movimiento_material',p),get('acarreo_planta',p),get('perforacion_disparos',p),get('plan_produccion_mensual',{mina:mine,mes:month},true),get('avance_topografico',p),get('report_notes',p)]);return {mine,reported,work,equipment,movement,shipments,drilling,plan,advancement,notes}});
  const [safety,items]=await Promise.all([safetyP,Promise.all(itemsP)]);if(epoch!==monthlyEpoch)return;if(errors.length)throw Error([...new Set(errors)].join(' · '));
  const days=daysInMonth(month),coverage=items.map(x=>new Set(x.reported.filter(d=>d>=start&&d<=end)).size),full=coverage.every(v=>v===days),closed=month<isoLocal(new Date()).slice(0,7);
  $('monthlyCoverageValue').textContent=coverage.reduce((a,b)=>a+b,0)+' / '+days*MINES.length+' partes diarios';$('monthlyCoverageDetail').textContent=items.map((x,i)=>MINE_LABELS[x.mine]+': '+coverage[i]+'/'+days).join(' · ');$('monthlyReportStatus').textContent=closed?(full?'Mes cubierto · revisión de cierre':'Cierre con días faltantes'):'Mes en curso / futuro';
  monthlySafety(safety,month);monthlyChart(month,items);const totals=items.map(monthlyMetrics);const all=(k)=>sum(totals,k),planMl=items.every(x=>x.plan)?sum(items.map(x=>x.plan),'metrosLinealesPlan'):null;
  $('monthlyExecutiveMetrics').innerHTML=[['Metros de cueles',fmt(all('ml'),2)+' m',planMl==null?'Sin plan mensual completo':`${fmt(planMl,1)} m de plan · ${planMl>0?fmt(all('ml')/planMl*100,1)+'%':'sin porcentaje'}`],['Barrenos dados / pegados',fmt(all('drilled'),0)+' / '+fmt(all('blasted'),0),'Son barrenos; no número de voladuras ni productividad equivalente.'],['Volumen registrado',fmt(all('volume'),1)+' m³','Se conserva separado de metros lineales y toneladas.']].map(([title,value,note])=>`<article class="report-card monthly-performance-card"><h3>${esc(title)}</h3><strong>${esc(value)}</strong><p class="monthly-note">${esc(note)}</p></article>`).join('');
  $('monthlyMineComparison').innerHTML=items.map((x,i)=>{const v=totals[i],fleet=monthlyFleet(x.equipment);return `<article class="report-card monthly-mine-card"><h3>${esc(MINE_LABELS[x.mine])}</h3>${monthlyTable(['Indicador','Real','Plan vigente'],[['Enviado a planta',fmt(v.plant,2)+' t',x.plan?fmt(x.plan.tonPlantaPlan,1)+' t':'No capturado'],['Cueles Desarrollo + Preparación',fmt(v.ml,2)+' m',x.plan?fmt(x.plan.metrosLinealesPlan,1)+' m':'No capturado'],['Desarrollo / Preparación',fmt(v.desarrollo,2)+' / '+fmt(v.preparacion,2)+' m','Clasificación almacenada'],['Otros avances lineales / sondeos',fmt(v.otherMl,2)+' m','Fuera de cueles'],['Barrenos dados / pegados',fmt(v.drilled,0)+' / '+fmt(v.blasted,0),'No comparable a voladuras'],['Estados disponibles del periodo',v.fleetCount?fmt(v.available/v.fleetCount*100,1)+'%':'Sin estados','Proporción de registros diarios']])}<h4>Disponibilidad por equipo</h4>${monthlyTable(['Equipo','Días Disponible','Estados','Último comentario'],fleet.map(f=>[f.name,f.available.size+'/'+f.days.size,fmt(f.available.size/f.days.size*100,1)+'%',f.lastComment||f.lastStatus]))}<p class="monthly-note">Disponibilidad por días reportados, no por horas. No se interpreta como autorización de trabajo seguro. Campos de horas vacíos permanecen sin dato.</p></article>`}).join('');
  const notes=items.flatMap(x=>(x.notes||[]).filter(r=>r.comentarios&&!/^NO SE REPORT[EA]N? ACCIDENTES O INCIDENTES\.?\s*$/i.test(r.comentarios.trim())).map(r=>({...r,label:MINE_LABELS[x.mine]}))).sort((a,b)=>a.fecha.localeCompare(b.fecha));
  $('monthlyOperationalSummary').innerHTML=monthlyCard('Hechos de operación y seguridad laboral',notes.map(r=>`<div class="monthly-event"><strong>${esc(r.fecha)} · ${esc(r.label)}</strong><p>${esc(r.comentarios)}</p></div>`).join('')||'<p>Sin comentarios adicionales en los partes consultados.</p>')+monthlyCard('Alcance del cierre','<p>Los cueles son la suma de Desarrollo y Preparación de los partes diarios. Los sondeos se muestran aparte. La comparación usa el plan vigente en la base, sin afirmar que era la meta original del mes.</p><p>La topografía se consulta para identificar el estado del cierre, pero no se mezcla una medición semanal que cruza meses con la suma diaria. Se requiere el cierre topográfico mensual para conciliar ambos.</p><p>El calendario identifica las fechas de eventos disponibles; los índices IA/IF/IG son globales y no se recalculan como índices mensuales. Los movimientos internos pueden repetir material entre etapas; no se suman a los embarques.</p><p>Explosivos, existencias y auxiliares sin conciliación mensual no se presentan como consumos o inventarios definitivos. Cubrir todos los días no certifica por sí solo esos cierres.</p>'+(!full?'<p class="monthly-partial">Faltan partes diarios. Las cifras son parciales y no se asume cero actividad en esos días.</p>':''));
 }catch(e){if(epoch!==monthlyEpoch)return;$('monthlyErrorBox').hidden=false;$('monthlyErrorBox').textContent=e.message;$('monthlyReportStatus').textContent='No actualizado · error de conexión';$('monthlyCoverageValue').textContent='Sin verificar';}
 finally{if(epoch===monthlyEpoch)button.disabled=false}
}
function setMonthOptions(preferred){const year=$('monthlyYear').value;const months=availableMonths.filter(x=>x.startsWith(year+'-')).map(x=>x.slice(5));const opts=months.length?months:Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));$('monthlyMonth').innerHTML=opts.map(m=>`<option value="${m}">${esc(monthLabel(year+'-'+m))}</option>`).join('');$('monthlyMonth').value=opts.includes(preferred)?preferred:opts.at(-1)}
function initMonthly(){
 const today=new Date(),previous=new Date(today.getFullYear(),today.getMonth()-1,1),ym=isoLocal(previous).slice(0,7);availableMonths=[ym,isoLocal(today).slice(0,7)];const years=[today.getFullYear()-1,today.getFullYear(),today.getFullYear()+1];$('monthlyYear').innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');$('monthlyYear').value=ym.slice(0,4);setMonthOptions(ym.slice(5));
 document.querySelectorAll('[data-report-mode]').forEach(button=>button.addEventListener('click',()=>{activeMode=button.dataset.reportMode;document.querySelectorAll('[data-report-mode]').forEach(b=>{const yes=b.dataset.reportMode===activeMode;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes))});document.querySelectorAll('[data-report-view]').forEach(view=>view.hidden=view.dataset.reportView!==activeMode);if(activeMode==='monthly')loadMonthlyReport()}));
 $('monthlyYear').addEventListener('change',()=>{setMonthOptions('10');loadMonthlyReport()});$('monthlyMonth').addEventListener('change',loadMonthlyReport);$('refreshMonthlyReport').addEventListener('click',loadMonthlyReport);
 const print=document.createElement('button');print.type='button';print.textContent='Imprimir / PDF';print.className='primary-button';print.addEventListener('click',()=>window.print());document.querySelector('.monthly-controls').append(print);
 request('available_months').then(months=>{if(Array.isArray(months)&&months.length){availableMonths=months;const year=$('monthlyYear').value,selected=$('monthlyMonth').value;const ys=[...new Set([...months.map(x=>x.slice(0,4)),year])].sort();$('monthlyYear').innerHTML=ys.map(y=>`<option value="${esc(y)}">${esc(y)}</option>`).join('');$('monthlyYear').value=year;setMonthOptions(selected)}}).catch(()=>{});
}
initMonthly();
