"use strict";
const API_URL = "https://script.google.com/macros/s/AKfycbzstqms0HqJ5wWqt8oECspm9VkqRy5i5cYrMQ3kY3rhYADVnttDVu2He9tZuCu44w7p/exec";
const MINES = ["Santa Maria", "Unificación/Hallazgo"];
const MINE_LABELS = {"Santa Maria":"Santa María","Unificación/Hallazgo":"Unificación/Hallazgo"};
const $ = id => document.getElementById(id);
let productionChart = null;
let monthlyProductionChart = null;
let availableMonthlyMonths = [];
let monthlyLoaded = false;

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
function reportCalendarPeriod(cutoffDate){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(cutoffDate||""));
  if(!match)return null;
  const year=Number(match[1]), month=Number(match[2]), day=Number(match[3]);
  if(!year||month<1||month>12||day<1||day>31)return null;
  const lastDay=new Date(year,month,0).getDate();
  return {year,month,day:Math.min(day,lastDay),cutoffISO:`${year}-${String(month).padStart(2,"0")}-${String(Math.min(day,lastDay)).padStart(2,"0")}`};
}
function renderSafety(data=null,cutoffDate=null){
  const grid=$('safetyCalendarGrid');
  const period=reportCalendarPeriod(cutoffDate);
  if(!period){
    $('safetyIA').textContent="—";$('safetyIF').textContent="—";$('safetyIG').textContent="—";
    $('safetyCalendarTitle').textContent="Fecha operativa no válida";
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Selecciona una fecha válida.</div>';
    return;
  }

  const {year,month,cutoffISO}=period;
  $('safetyCalendarTitle').textContent=new Date(year,month-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"});

  $('safetyIA').textContent=data?n(data.indiceAccidentabilidad).toFixed(3):"—";
  $('safetyIF').textContent=data?n(data.indiceFrecuencia).toFixed(3):"—";
  $('safetyIG').textContent=data?n(data.indiceGravedad).toFixed(3):"—";

  const sets={};
  ["A","B","C","D","T"].forEach(type=>sets[type]=data?dateSet(data[`accidentesMes${type}`],data[`fechaUltimoAccidente${type}`]):new Set());

  grid.innerHTML="";
  for(let i=0;i<new Date(year,month-1,1).getDay();i++)grid.insertAdjacentHTML("beforeend",'<div class="calendar-cell empty"></div>');
  for(let day=1;day<=new Date(year,month,0).getDate();day++){
    const date=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    let state=date>cutoffISO?"future":"safe";
    if(data){
      if(sets.A.has(date)||sets.B.has(date))state="warning";
      if(sets.C.has(date))state="danger";
      if(sets.T.has(date))state="transit";
      if(sets.D.has(date))state="fatal";
    }
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
  renderSafety(null,date);
  const month=date.slice(0,7), monthStart=`${month}-01`, weekStart=mondayOf(date);
  const queryErrors=[];
  const safe=async(action,params,fallback,nullable=false)=>{
    try{return nullable?await requestNullable(action,params):await request(action,params);}
    catch(error){queryErrors.push(`${action}: ${error.message.replace(/^\w+:\s*/,"")}`);return fallback;}
  };
  try{
    const safetyPromise=safe("seguridad",{hasta:date},null);
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


function lastAvailableMonthEnd(today=new Date()){
  const offset=today.getDate()>=2?0:-1;
  return new Date(today.getFullYear(),today.getMonth()+offset,0);
}
function monthKeyFromDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;}
function monthEndISO(month){
  const [year,number]=month.split("-").map(Number);
  return `${month}-${String(new Date(year,number,0).getDate()).padStart(2,"0")}`;
}
function monthStartISO(month){return `${month}-01`;}
function monthName(monthNumber){
  return new Date(2020,Number(monthNumber)-1,1).toLocaleDateString("es-MX",{month:"long"});
}
function pct(actual,plan){
  return plan>0?actual/plan*100:null;
}
function showMonthlyError(message){$('monthlyErrorBox').hidden=false;$('monthlyErrorBox').textContent=message;}
function clearMonthlyError(){$('monthlyErrorBox').hidden=true;$('monthlyErrorBox').textContent="";}

async function loadAvailableMonthlyPeriods(){
  const endDate=lastAvailableMonthEnd();
  const end=isoLocal(endDate);
  const start="2020-01-01";
  const errors=[];
  const results=await Promise.all(MINES.map(async mine=>{
    try{return await request("dias_reportados",{mina,desde:start,hasta:end});}
    catch(error){errors.push(`${MINE_LABELS[mine]}: ${error.message}`);return [];}
  }));
  const maxMonth=monthKeyFromDate(endDate);
  availableMonthlyMonths=[...new Set(results.flat().map(date=>String(date).slice(0,7)).filter(month=>/^\d{4}-\d{2}$/.test(month)&&month<=maxMonth))].sort();
  populateMonthlyYearSelect();
  if(errors.length)showMonthlyError([...new Set(errors)].join(" · "));
}
function populateMonthlyYearSelect(){
  const yearSelect=$('monthlyYear');
  const monthSelect=$('monthlyMonth');
  const years=[...new Set(availableMonthlyMonths.map(month=>month.slice(0,4)))].sort((a,b)=>Number(b)-Number(a));
  yearSelect.innerHTML="";
  monthSelect.innerHTML="";
  if(!years.length){
    yearSelect.innerHTML='<option value="">Sin años disponibles</option>';
    monthSelect.innerHTML='<option value="">Sin meses disponibles</option>';
    yearSelect.disabled=true;monthSelect.disabled=true;$('refreshMonthlyReport').disabled=true;
    $('monthlyCoverageValue').textContent="Sin meses disponibles";
    $('monthlyCoverageDetail').textContent="No hay meses cerrados con capturas.";
    $('monthlyReportStatus').textContent="Sin información";
    return;
  }
  yearSelect.disabled=false;monthSelect.disabled=false;$('refreshMonthlyReport').disabled=false;
  yearSelect.innerHTML=years.map(year=>`<option value="${year}">${year}</option>`).join("");
  yearSelect.value=availableMonthlyMonths.at(-1).slice(0,4);
  populateMonthlyMonthSelect();
}
function populateMonthlyMonthSelect(){
  const year=$('monthlyYear').value;
  const months=availableMonthlyMonths.filter(month=>month.startsWith(`${year}-`));
  $('monthlyMonth').innerHTML=months.map(month=>{
    const number=month.slice(5,7);
    const label=monthName(number);
    return `<option value="${number}">${label.charAt(0).toUpperCase()+label.slice(1)}</option>`;
  }).join("");
  if(months.length)$('monthlyMonth').value=months.at(-1).slice(5,7);
}
function selectedMonthlyPeriod(){
  const year=$('monthlyYear').value, month=$('monthlyMonth').value;
  return /^\d{4}$/.test(year)&&/^\d{2}$/.test(month)?`${year}-${month}`:"";
}

function renderMonthlySafety(data,month){
  const end=monthEndISO(month);
  const period=reportCalendarPeriod(end);
  const grid=$('monthlySafetyCalendarGrid');
  if(!period){
    $('monthlySafetyCalendarTitle').textContent="Periodo no válido";
    grid.innerHTML='<div class="empty-state" style="grid-column:1/-1">Selecciona un mes válido.</div>';
    return;
  }
  const {year,month:monthNumber}=period;
  $('monthlySafetyCalendarTitle').textContent=new Date(year,monthNumber-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"});
  $('monthlySafetyIA').textContent=data?n(data.indiceAccidentabilidad).toFixed(3):"—";
  $('monthlySafetyIF').textContent=data?n(data.indiceFrecuencia).toFixed(3):"—";
  $('monthlySafetyIG').textContent=data?n(data.indiceGravedad).toFixed(3):"—";
  const sets={};
  ["A","B","C","D","T"].forEach(type=>sets[type]=data?dateSet(data[`accidentesMes${type}`],data[`fechaUltimoAccidente${type}`]):new Set());
  grid.innerHTML="";
  for(let i=0;i<new Date(year,monthNumber-1,1).getDay();i++)grid.insertAdjacentHTML("beforeend",'<div class="calendar-cell empty"></div>');
  for(let day=1;day<=new Date(year,monthNumber,0).getDate();day++){
    const date=`${year}-${String(monthNumber).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    let state="safe";
    if(data){
      if(sets.A.has(date)||sets.B.has(date))state="warning";
      if(sets.C.has(date))state="danger";
      if(sets.T.has(date))state="transit";
      if(sets.D.has(date))state="fatal";
    }
    grid.insertAdjacentHTML("beforeend",`<div class="calendar-cell ${state}" title="${date}">${day}</div>`);
  }
}

function monthlyTumbleTons(advancement,catalogs,mine){
  const volume=(advancement||[]).filter(row=>normalized(row.tipoTrabajo)==="TUMBE"&&normalized(row.material)==="MINERAL").reduce((total,row)=>total+n(row.m3),0);
  const density=materialDensity(catalogs,mine);
  if(volume>0&&density==null)return null;
  return volume*(density||0);
}
function summarizeMonthlyMine(item,catalogs,totalDays){
  const equipment=item.equipment||[];
  const available=equipment.filter(row=>normalized(row.estadoTecnico||row.estado)==="DISPONIBLE").length;
  const unavailable=equipment.filter(row=>normalized(row.estadoTecnico||row.estado)!=="DISPONIBLE");
  const mp=item.mp||[];
  const plan=item.plan||null;
  const reports=[...new Set(item.days||[])];
  return {
    mine:item.mine,
    reports,
    coverage:reports.length,
    expected:totalDays,
    plantActual:sum(item.shipments||[],"tonelaje"),
    plantPlan:plan?n(plan.tonPlantaPlan):null,
    linearActual:sum(item.advancement||[],"metrosLineales"),
    linearPlan:plan?n(plan.metrosLinealesPlan):null,
    tumbleActual:monthlyTumbleTons(item.advancement||[],catalogs,item.mine),
    tumblePlan:plan?n(plan.tonTumbePlan):null,
    availability:equipment.length?available/equipment.length*100:null,
    unavailableDays:unavailable.length,
    equipment,
    mpScheduled:sum(mp,"programadas"),
    mpPopulated:sum(mp,"pobladas"),
    stock:item.stock||null,
    inputs:item.inputs||[],
    stope:item.stope||[],
    service:item.service||[]
  };
}
function monthlyMetricCard(label,actual,plan,unit,detail){
  const compliance=plan>0&&actual!=null?pct(actual,plan):null;
  const variance=actual!=null&&plan!=null?actual-plan:null;
  return `<article class="monthly-performance-card">
    <div class="monthly-performance-head"><span>${esc(label)}</span><strong>${compliance==null?"—":`${fmt(compliance,1)}%`}</strong></div>
    <div class="monthly-performance-values"><div><small>Real</small><b>${actual==null?"—":`${fmt(actual,unit==="m"?2:1)} ${unit}`}</b></div><div><small>Plan</small><b>${plan==null?"—":`${fmt(plan,unit==="m"?2:1)} ${unit}`}</b></div></div>
    <p>${variance==null?"Sin comparación completa.":`Variación ${signed(variance,unit)}.`}${detail?` ${esc(detail)}`:""}</p>
  </article>`;
}
function renderMonthlyExecutive(summaries){
  const plantActual=MINES.reduce((t,m)=>t+summaries[m].plantActual,0);
  const linearActual=MINES.reduce((t,m)=>t+summaries[m].linearActual,0);
  const tumbleValues=MINES.map(m=>summaries[m].tumbleActual);
  const tumbleActual=tumbleValues.some(v=>v==null)?null:tumbleValues.reduce((t,v)=>t+v,0);
  const plansComplete=MINES.every(m=>summaries[m].plantPlan!=null&&summaries[m].linearPlan!=null&&summaries[m].tumblePlan!=null);
  const plantPlan=plansComplete?MINES.reduce((t,m)=>t+summaries[m].plantPlan,0):null;
  const linearPlan=plansComplete?MINES.reduce((t,m)=>t+summaries[m].linearPlan,0):null;
  const tumblePlan=plansComplete?MINES.reduce((t,m)=>t+summaries[m].tumblePlan,0):null;
  $('monthlyExecutiveMetrics').innerHTML=[
    monthlyMetricCard("Toneladas a planta",plantActual,plantPlan,"t","Consolidado SM + UH."),
    monthlyMetricCard("Metros lineales",linearActual,linearPlan,"m","Medición topográfica acumulada."),
    monthlyMetricCard("Tumbe mineral",tumbleActual,tumblePlan,"t","Estimado con densidad activa de mineral.")
  ].join("");
}
function compactMetric(label,actual,plan,unit){
  const compliance=plan>0&&actual!=null?`${fmt(actual/plan*100,1)}%`:"—";
  return `<div class="monthly-mine-metric"><div><span>${esc(label)}</span><small>Real ${actual==null?"—":`${fmt(actual,unit==="m"?2:1)} ${unit}`} · Plan ${plan==null?"—":`${fmt(plan,unit==="m"?2:1)} ${unit}`}</small></div><strong>${compliance}</strong></div>`;
}
function renderMonthlyMineCards(summaries){
  $('monthlyMineComparison').innerHTML=MINES.map(mine=>{
    const s=summaries[mine];
    const coveragePct=s.expected?Math.min(100,s.coverage/s.expected*100):0;
    const stock=s.stock?`${fmt(s.stock.stockPatioTon,1)} t`:"—";
    return `<article class="monthly-mine-card">
      <div class="mine-head"><div><h3>${esc(MINE_LABELS[mine])}</h3><p>${s.coverage}/${s.expected} reportes · ${fmt(coveragePct,1)}% cobertura</p></div><span class="report-state ${s.coverage===s.expected?"":"missing"}">${s.coverage===s.expected?"Completo":"Parcial"}</span></div>
      <div class="monthly-mine-body">
        ${compactMetric("A planta",s.plantActual,s.plantPlan,"t")}
        ${compactMetric("Metros lineales",s.linearActual,s.linearPlan,"m")}
        ${compactMetric("Tumbe mineral",s.tumbleActual,s.tumblePlan,"t")}
      </div>
      <div class="monthly-mine-footer">
        <div><span>Disponibilidad equipos</span><strong>${s.availability==null?"—":`${fmt(s.availability,1)}%`}</strong></div>
        <div><span>Stock al cierre</span><strong>${stock}</strong></div>
      </div>
    </article>`;
  }).join("");
}
function topFailureCause(summaries){
  const counts={};
  MINES.forEach(mine=>(summaries[mine].equipment||[]).forEach(row=>{
    if(normalized(row.estadoTecnico||row.estado)==="DISPONIBLE")return;
    const key=String(row.motivoNoOperacion||row.motivo||"Sin motivo").trim()||"Sin motivo";
    counts[key]=(counts[key]||0)+1;
  }));
  return Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]||null;
}
function inputTotals(summaries){
  const totals={DIESEL:0,EXPLOSIVO:0,BROCA:0,BARRA:0},found={DIESEL:false,EXPLOSIVO:false,BROCA:false,BARRA:false};
  MINES.forEach(mine=>(summaries[mine].inputs||[]).forEach(row=>{
    const key=normalized(row.insumo);
    if(key in totals){totals[key]+=n(row.cantidad);found[key]=true;}
  }));
  return {totals,found};
}
function renderMonthlyOperational(summaries){
  const allEquipment=MINES.flatMap(m=>summaries[m].equipment||[]);
  const available=allEquipment.filter(row=>normalized(row.estadoTecnico||row.estado)==="DISPONIBLE").length;
  const availability=allEquipment.length?available/allEquipment.length*100:null;
  const unavailable=allEquipment.length-available;
  const failure=topFailureCause(summaries);
  const mpScheduled=MINES.reduce((t,m)=>t+summaries[m].mpScheduled,0);
  const mpPopulated=MINES.reduce((t,m)=>t+summaries[m].mpPopulated,0);
  const mpPct=mpScheduled>0?mpPopulated/mpScheduled*100:null;
  const stope=sum(summaries["Santa Maria"].stope||[],"metrosDia")||sum(summaries["Santa Maria"].stope||[],"metrosTurno");
  const service=sum(summaries["Santa Maria"].service||[],"metrosTurno");
  const plantTons=MINES.reduce((t,m)=>t+summaries[m].plantActual,0);
  const inputs=inputTotals(summaries);
  const dieselRate=inputs.found.DIESEL&&plantTons>0?inputs.totals.DIESEL/plantTons:null;
  const explosiveRate=inputs.found.EXPLOSIVO&&plantTons>0?inputs.totals.EXPLOSIVO/plantTons:null;
  $('monthlyOperationalSummary').innerHTML=`
    <article class="monthly-operation-card"><span class="monthly-operation-kicker">Equipos diésel</span><strong>${availability==null?"—":`${fmt(availability,1)}%`}</strong><p>Disponibilidad promedio por registro diario.</p><small>${unavailable} días-equipo no disponibles${failure?` · Principal causa: ${esc(failure[0])} (${failure[1]})`:""}.</small></article>
    <article class="monthly-operation-card"><span class="monthly-operation-kicker">Máquinas de pierna</span><strong>${mpPct==null?"—":`${fmt(mpPct,1)}%`}</strong><p>${fmt(mpPopulated,0)} pobladas / ${fmt(mpScheduled,0)} programadas.</p><small>Cumplimiento acumulado de ambas minas.</small></article>
    <article class="monthly-operation-card"><span class="monthly-operation-kicker">Perforación especial · SM</span><strong>${fmt(stope,1)} m</strong><p>StopeMate acumulado.</p><small>Barreno de servicio: ${fmt(service,1)} m.</small></article>
    <article class="monthly-operation-card"><span class="monthly-operation-kicker">Insumos</span><strong>${dieselRate==null?"—":`${fmt(dieselRate,2)} L/t`}</strong><p>Diésel por tonelada enviada a planta.</p><small>Explosivo ${explosiveRate==null?"—":`${fmt(explosiveRate,3)} kg/t`} · Brocas ${inputs.found.BROCA?fmt(inputs.totals.BROCA,0):"—"} · Barras ${inputs.found.BARRA?fmt(inputs.totals.BARRA,0):"—"}.</small></article>`;
}
function renderMonthlyProductionChart(month,summaries){
  const totalDays=daysInMonth(month);
  const plans=MINES.map(m=>summaries[m].plantPlan).filter(value=>value!=null);
  const fullPlan=plans.length===MINES.length;
  const target=fullPlan?plans.reduce((t,v)=>t+n(v),0):null;
  const byDate={};
  MINES.forEach(mine=>(summaries[mine].shipments||[]).forEach(row=>{byDate[row.fecha]=(byDate[row.fecha]||0)+n(row.tonelaje);}));
  const labels=Array.from({length:totalDays},(_,i)=>String(i+1));
  let running=0;
  const actual=labels.map((_,i)=>{const key=`${month}-${String(i+1).padStart(2,"0")}`;running+=byDate[key]||0;return running;});
  const planLine=fullPlan?labels.map((_,i)=>target*(i+1)/totalDays):[];
  $('monthlyProductionMonth').textContent=monthLabel(month);
  $('monthlyProductionActual').textContent=`${fmt(running,1)} t`;
  $('monthlyProductionPlan').textContent=fullPlan?`${fmt(target,1)} t`:"Sin plan completo";
  $('monthlyProductionCompliance').textContent=target>0?`${fmt(running/target*100,1)}%`:"—";
  $('monthlyProductionNote').textContent=fullPlan?"Real acumulado contra plan acumulado del mes. Sin línea de tendencia.":`Plan incompleto: ${plans.length} de ${MINES.length} minas tienen meta mensual registrada.`;
  if(monthlyProductionChart)monthlyProductionChart.destroy();
  monthlyProductionChart=new Chart($('monthlyProductionChart'),{type:"line",data:{labels,datasets:[
    {label:"Plan acumulado",data:planLine,borderColor:"#3375c2",backgroundColor:"#3375c2",pointRadius:0,borderWidth:2,tension:0},
    {label:"Real acumulado",data:actual,borderColor:"#e78139",backgroundColor:"#e78139",pointRadius:0,pointHoverRadius:4,borderWidth:2.5,tension:0}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{intersect:false,mode:"index"},plugins:{legend:{position:"bottom",labels:{boxWidth:14,font:{size:10}}},tooltip:{callbacks:{label:ctx=>`${ctx.dataset.label}: ${fmt(ctx.parsed.y,1)} t`}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:12,font:{size:9}}},y:{beginAtZero:true,ticks:{font:{size:9}},title:{display:true,text:"t acumuladas",font:{size:10}}}}}});
}

async function loadMonthlyReport(){
  const month=selectedMonthlyPeriod();
  if(!month)return;
  const start=monthStartISO(month), end=monthEndISO(month), totalDays=daysInMonth(month);
  const button=$('refreshMonthlyReport');button.disabled=true;button.textContent="Consultando…";clearMonthlyError();
  $('monthlyPeriodLabel').textContent=monthLabel(month);
  $('monthlyReportStatus').textContent="Consultando…";
  renderMonthlySafety(null,month);
  const errors=[];
  const safe=async(action,params,fallback,nullable=false)=>{
    try{return nullable?await requestNullable(action,params):await request(action,params);}
    catch(error){errors.push(`${action}: ${error.message.replace(/^\w+:\s*/,"")}`);return fallback;}
  };
  try{
    const safetyPromise=safe("seguridad",{hasta:end},null);
    const catalogsPromise=safe("catalogos",{},[]);
    const minePromises=MINES.map(async mine=>{
      const common={mina,desde:start,hasta:end};
      const requests=[
        safe("dias_reportados",common,[]),
        safe("plan_produccion_mensual",{mina,mes:month},null,true),
        safe("acarreo_planta",common,[]),
        safe("avance_topografico",common,[]),
        safe("equipos",common,[]),
        safe("maquinas_pierna",common,[]),
        safe("stock_patio",{mina,hasta:end},null,true),
        safe("consumo_insumos",common,[])
      ];
      if(mine==="Santa Maria"){
        requests.push(safe("stopemate",common,[]),safe("barreno_servicio",common,[]));
      }
      const values=await Promise.all(requests);
      return {
        mine,days:values[0],plan:values[1],shipments:values[2],advancement:values[3],equipment:values[4],mp:values[5],stock:values[6],inputs:values[7],
        stope:mine==="Santa Maria"?values[8]:[],service:mine==="Santa Maria"?values[9]:[]
      };
    });
    const [safety,catalogs,mineData]=await Promise.all([safetyPromise,catalogsPromise,Promise.all(minePromises)]);
    if(errors.length)showMonthlyError([...new Set(errors)].join(" · "));
    renderMonthlySafety(safety,month);
    const summaries={};
    mineData.forEach(item=>{
      const summary=summarizeMonthlyMine(item,catalogs,totalDays);
      summary.shipments=item.shipments||[];
      summaries[item.mine]=summary;
    });
    const received=MINES.reduce((t,m)=>t+summaries[m].coverage,0);
    const expected=totalDays*MINES.length;
    $('monthlyCoverageValue').textContent=`${received} de ${expected} reportes`;
    $('monthlyCoverageDetail').textContent=MINES.map(m=>`${MINE_LABELS[m]}: ${summaries[m].coverage}/${totalDays}`).join(" · ");
    $('monthlyReportStatus').textContent=received===expected?"Completo":received?"Parcial":"Sin capturas";
    renderMonthlyExecutive(summaries);
    renderMonthlyMineCards(summaries);
    renderMonthlyOperational(summaries);
    renderMonthlyProductionChart(month,summaries);
    monthlyLoaded=true;
  }catch(error){
    showMonthlyError(error.message);
    $('monthlyReportStatus').textContent="Error de consulta";
  }finally{
    button.disabled=false;button.textContent="Actualizar";
  }
}

function setReportMode(mode){
  document.querySelectorAll("[data-report-view]").forEach(view=>view.hidden=view.dataset.reportView!==mode);
  document.querySelectorAll("[data-report-mode]").forEach(button=>{
    const active=button.dataset.reportMode===mode;
    button.classList.toggle("active",active);
    button.setAttribute("aria-pressed",String(active));
  });
  if(mode==="monthly"&&!monthlyLoaded&&selectedMonthlyPeriod())loadMonthlyReport();
  requestAnimationFrame(()=>{if(mode==="monthly"&&monthlyProductionChart)monthlyProductionChart.resize();if(mode==="daily"&&productionChart)productionChart.resize();});
}

$('reportDate').value=previousDay();
$('refreshReport').addEventListener("click",loadReport);
$('reportDate').addEventListener("change",loadReport);
$('monthlyYear').addEventListener("change",()=>{populateMonthlyMonthSelect();monthlyLoaded=false;if(selectedMonthlyPeriod())loadMonthlyReport();});
$('monthlyMonth').addEventListener("change",()=>{monthlyLoaded=false;if(selectedMonthlyPeriod())loadMonthlyReport();});
$('refreshMonthlyReport').addEventListener("click",loadMonthlyReport);
document.querySelectorAll("[data-report-mode]").forEach(button=>button.addEventListener("click",()=>setReportMode(button.dataset.reportMode)));
loadReport();
loadAvailableMonthlyPeriods().then(()=>{if(!$('monthlyReportView').hidden&&selectedMonthlyPeriod())loadMonthlyReport();}).catch(error=>showMonthlyError(error.message));
