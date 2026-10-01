"use strict";
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

async function request(action, params={}){
  const query=new URLSearchParams({accion:action,...params});
  const response=await fetch(`${API_URL}?${query.toString()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`${action}: HTTP ${response.status}`);
  const result=await response.json();
  if(!result.ok)throw new Error(result.mensaje||`${action}: respuesta rechazada`);
  return result.datos??[];
}
async function requestNullable(action,params={}){
  const query=new URLSearchParams({accion:action,...params});
  const response=await fetch(`${API_URL}?${query.toString()}`,{cache:"no-store"});
  if(!response.ok)throw new Error(`${action}: HTTP ${response.status}`);
  const result=await response.json();
  if(!result.ok)throw new Error(result.mensaje||`${action}: respuesta rechazada`);
  return result.datos;
}
function showError(message){$('errorBox').hidden=false;$('errorBox').textContent=message;}
function clearError(){$('errorBox').hidden=true;$('errorBox').textContent="";}

function dateSet(list,last){const set=new Set(Array.isArray(list)?list:[]);if(last)set.add(last);return set;}
function renderSafety(data=null,cutoffDate=null){
  const grid=$('safetyCalendarGrid');
  if(!data||!cutoffDate){
    $('safetyIA').textContent="—";$('safetyIF').textContent="—";$('safetyIG').textContent="—";
    $('safetyCalendarTitle').textContent="Datos de seguridad no disponibles";
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">No fue posible consultar Seguridad.</div>';
    return;
  }
  $('safetyIA').textContent=n(data.indiceAccidentabilidad).toFixed(3);
  $('safetyIF').textContent=n(data.indiceFrecuencia).toFixed(3);
  $('safetyIG').textContent=n(data.indiceGravedad).toFixed(3);

  // El calendario del Reporte Diario debe representar la fecha operativa
  // seleccionada, no el mes actual del servidor.
  const cutoff=parseLocal(cutoffDate);
  const year=cutoff.getFullYear();
  const month=cutoff.getMonth()+1;
  const cutoffISO=isoLocal(cutoff);
  const sets={};["A","B","C","D","T"].forEach(type=>sets[type]=dateSet(data[`accidentesMes${type}`],data[`fechaUltimoAccidente${type}`]));

  $('safetyCalendarTitle').textContent=new Date(year,month-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"});
  grid.innerHTML="";
  for(let i=0;i<new Date(year,month-1,1).getDay();i++)grid.insertAdjacentHTML("beforeend",'<div class="calendar-cell empty"></div>');
  for(let day=1;day<=new Date(year,month,0).getDate();day++){
    const date=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    let state=date>cutoffISO?"future":"safe";
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

function renderMineCard(mine,summary){
  const exceptions=summary.equipment.filter(row=>normalized(row.estadoTecnico||row.estado)!=="DISPONIBLE");
  const operationRows=summary.work.length?summary.work.map(row=>`<div class="operation-row"><span>${esc(row.obra||"Sin lugar")} · ${esc(row.tipoTrabajo||row.tipoObra||"Trabajo")}${row.material?` · ${esc(row.material)}`:""}</span><strong>${workAmount(row)}</strong></div>`).join(""):'<div class="empty-state">Sin avances, tumbe o desborde capturados.</div>';
  const equipmentRows=exceptions.length?exceptions.map(row=>`<div class="equipment-row"><span>${esc(row.equipo||"Equipo")} · ${esc(row.motivoNoOperacion||row.motivo||"No disponible")}</span><strong>${fmt(row.horasOperadas,1)} h</strong></div>`).join(""):'<div class="empty-state">Sin excepciones de equipo reportadas.</div>';
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
      <div class="mine-block"><h4>Cumplimiento acumulado al día</h4><div class="compliance-list">${complianceRow("A planta",summary.monthly.plantActual,summary.monthly.plantPlan,"t")}${complianceRow("Metros lineales",summary.monthly.linearActual,summary.monthly.linearPlan,"m")}${complianceRow("Tumbe mineral",summary.monthly.tumbleActual,summary.monthly.tumblePlan,"t")}</div><h4 class="secondary-title">Operación del día</h4>${operationRows}<p class="mine-note">Toneladas manipuladas por equipos: ${fmt(summary.movedTons,1)} t.</p></div>
      <div class="mine-block"><h4>Planeación y equipos</h4>
        <div class="planning-grid"><div class="planning-cell"><span>Puebles real / plan</span><strong>${planText}</strong></div><div class="planning-cell"><span>Disparos real / plan</span><strong>${shotText}</strong></div></div>
        <div class="equipment-summary"><div><span>Disponibilidad</span><strong>${availability}</strong></div><div><span>Horas operadas</span><strong>${fmt(summary.hours,1)} h</strong></div></div>
        <div class="equipment-list">${equipmentRows}</div>
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
  const planLine=fullPlan?labels.map((_,i)=>target*(i+1)/totalDays):[];
  const planToDate=fullPlan?target*cutoffDay/totalDays:null;
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
    if(queryErrors.length)showError([...new Set(queryErrors)].join(" · "));
    renderSafety(safety,date);
    const summaries={};daily.forEach(item=>summaries[item.mine]=summarizeMine(item.mine,{...item,program},date));
    const monthFraction=Number(date.slice(-2))/daysInMonth(month);
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

$('reportDate').value=previousDay();
$('refreshReport').addEventListener("click",loadReport);
$('reportDate').addEventListener("change",loadReport);
loadReport();
