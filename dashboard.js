"use strict";
const API_URL = "https://script.google.com/macros/s/AKfycbzstqms0HqJ5wWqt8oECspm9VkqRy5i5cYrMQ3kY3rhYADVnttDVu2He9tZuCu44w7p/exec";
const $ = id => document.getElementById(id);
const charts = {};
const colors = { blue: "#3375c2", green: "#23845b", gold: "#e78139", red: "#b52828", purple: "#7257a8" };
function iso(date) { return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`; }
function esc(v) { return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
function n(v) { const x = Number(v); return Number.isFinite(x) ? x : 0; }
function normalized(v) { return String(v || "").trim().toUpperCase(); }
function weekStart(value) { const d = new Date(`${value}T12:00:00`); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return iso(d); }
function sum(rows, field) { return rows.reduce((s, x) => s + n(x[field]), 0); }
function emptySummary(container, text = "Sin datos") { container.innerHTML = `<div class="summary-item"><span>${text}</span><strong>—</strong></div>`; }
function renderSummary(id, map, suffix = "") { const el = $(id), entries = Object.entries(map).sort((a,b)=>b[1]-a[1]); if (!entries.length) return emptySummary(el); el.innerHTML = entries.map(([k,v])=>`<div class="summary-item"><span>${esc(k)}</span><strong>${n(v).toLocaleString("es-MX",{maximumFractionDigits:2})}${suffix}</strong></div>`).join(""); }
function showError(message) { $('errorBox').hidden = false; $('errorBox').textContent = message; }
function clearError() { $('errorBox').hidden = true; $('errorBox').textContent = ""; }

function defaults() { const now = new Date(), first = new Date(now.getFullYear(), now.getMonth(), 1); $('filterFrom').value = iso(first); $('filterTo').value = iso(now); }
async function request(action, common = "") { const response = await fetch(`${API_URL}?accion=${action}${common}`, { cache: "no-store" }); if (!response.ok) throw new Error(`${action}: HTTP ${response.status}`); const result = await response.json(); if (!result.ok) throw new Error(result.mensaje || `${action}: respuesta rechazada`); return result.datos ?? []; }
async function requestNullable(action, common = "") { const response = await fetch(`${API_URL}?accion=${action}${common}`, { cache: "no-store" }); if (!response.ok) throw new Error(`${action}: HTTP ${response.status}`); const result = await response.json(); if (!result.ok) throw new Error(result.mensaje || `${action}: respuesta rechazada`); return result.datos; }
function formatted(value, decimals=1) { return Number(value).toLocaleString("es-MX", {maximumFractionDigits:decimals,minimumFractionDigits:decimals}); }
function daysOfMonth(month) { const [year,number]=month.split("-").map(Number); return new Date(year,number,0).getDate(); }
function monthLabel(month) { return new Date(`${month}-02T12:00:00`).toLocaleDateString("es-MX",{month:"long",year:"numeric"}); }

async function load() {
  const mine = $('filterMine').value, from = $('filterFrom').value, to = $('filterTo').value;
  if (!from || !to || from > to) return alert("Selecciona un rango de fechas válido.");
  const button = $('applyFilters'); button.disabled = true; button.textContent = "Consultando…"; $('statusText').textContent = "Consultando…"; clearError();
  const common = `&mina=${encodeURIComponent(mine)}&desde=${from}&hasta=${to}`;
  const month=to.slice(0,7), monthStart=`${month}-01`, today=iso(new Date()), cutoff=to<today?to:today;
  const monthEnd=`${month}-${String(daysOfMonth(month)).padStart(2,"0")}`;
  const monthParams=`&mina=${encodeURIComponent(mine)}&desde=${monthStart}&hasta=${cutoff}`;
  try {
    const results = await Promise.allSettled([
      request("seguridad"), request("personal"), request("barrenacion", common), request("equipos", common),
      request("movimiento_material", common), request("maquinas_pierna", common), request("acarreo_planta", common),
      request("stopemate", common), request("barrenacion_exploracion", common),
      requestNullable("plan_produccion_mensual",`&mina=${encodeURIComponent(mine)}&mes=${month}`),
      requestNullable("stock_patio",`&mina=${encodeURIComponent(mine)}&hasta=${cutoff}`),
      ...(cutoff>=monthStart ? [request("dias_reportados",monthParams),request("acarreo_planta",monthParams),request("barrenacion",monthParams)] : [Promise.resolve([]),Promise.resolve([]),Promise.resolve([])]),
      request("catalogos")
    ]);
    const data = results.map((r,i) => { if (r.status === "rejected") { showError(`${$('errorBox').textContent ? $('errorBox').textContent + " · " : ""}${r.reason.message}`); return i < 2 ? {} : i===9||i===10 ? null : []; } return r.value; });
    renderSafety(data[0]); renderPersonal(data[1]); renderProduction(data[2]); renderFleet(data[3], data[4], data[5]); renderMp(data[5]); renderPlant(data[6]); renderStope(data[7]); renderExploration(data[8]);
    renderExecutiveMonth({month,monthStart,monthEnd,cutoff,plan:data[9],stock:data[10],days:data[11],shipments:data[12],drilling:data[13],catalogs:data[14],daysOk:results[11].status==='fulfilled',shipmentsOk:results[12].status==='fulfilled',drillingOk:results[13].status==='fulfilled',catalogsOk:results[14].status==='fulfilled'});
    $('statusText').textContent = `${mine} · ${from} a ${to}`;
  } catch (error) { showError(error.message); $('statusText').textContent = "Error de consulta"; }
  finally { button.disabled = false; button.textContent = "Aplicar filtros"; }
}

function dateSet(list, last) { const set = new Set(Array.isArray(list) ? list : []); if (last) set.add(last); return set; }
function renderSafety(data = {}) {
  ["A","B","C","D","T"].forEach(type => { $(`kpiSafety${type}`).textContent = data[`diasSinAccidente${type}`] == null ? "—" : `${n(data[`diasSinAccidente${type}`])} días`; });
  $('kpiSafetyIF').textContent = n(data.indiceFrecuencia).toFixed(3); $('kpiSafetyIG').textContent = n(data.indiceGravedad).toFixed(3); $('kpiSafetyIA').textContent = n(data.indiceAccidentabilidad).toFixed(3); $('safetyStatus').textContent = "Datos globales de ambas minas";
  const year = n(data.anioActual) || new Date().getFullYear(), month = n(data.mesActual) || new Date().getMonth()+1, today = data.fechaActual || iso(new Date());
  const sets = {}; ["A","B","C","D","T"].forEach(t => sets[t] = dateSet(data[`accidentesMes${t}`], data[`fechaUltimoAccidente${t}`]));
  $('safetyCalendarTitle').textContent = `Calendario de seguridad · ${new Date(year,month-1,1).toLocaleDateString("es-MX",{month:"long",year:"numeric"})}`;
  const grid = $('safetyCalendarGrid'); grid.innerHTML = ""; for(let i=0;i<new Date(year,month-1,1).getDay();i++) grid.insertAdjacentHTML("beforeend",'<div class="calendar-cell empty"></div>');
  for(let day=1; day<=new Date(year,month,0).getDate();day++) { const d=`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`; let state=d>today?"future":"safe"; if(sets.A.has(d)||sets.B.has(d))state="warning"; if(sets.C.has(d))state="danger"; if(sets.T.has(d))state="transit"; if(sets.D.has(d))state="fatal"; grid.insertAdjacentHTML("beforeend",`<div class="calendar-cell ${state}" title="${d}"><span class="day-number">${day}</span></div>`); }
}

function renderPersonal(data = {}) { $('kpiPlantillaRequerida').textContent=n(data.plantillaRequerida); $('kpiPlantillaActual').textContent=n(data.plantillaActual); $('kpiCumplimientoPlantilla').textContent=`${n(data.cumplimientoPlantilla).toFixed(1)}%`; $('kpiAusentismo').textContent=`${n(data.indiceAusentismo).toFixed(1)}%`; $('kpiRotacion').textContent=`${n(data.indiceRotacion).toFixed(1)}%`; }

function renderProduction(rows) {
  const ml=sum(rows,"metrosLineales"), m3=sum(rows,"m3"), mineral=rows.filter(x=>normalized(x.material)==="MINERAL"); $('kpiMl').textContent=`${ml.toFixed(2)} m`; $('kpiM3').textContent=`${m3.toFixed(2)} m³`; $('kpiMineral').textContent=`${sum(mineral,"metrosLineales").toFixed(2)} m · ${sum(mineral,"m3").toFixed(2)} m³`;
  const linear={}, volume={}, weeks={}; rows.forEach(x=>{ if(n(x.metrosLineales)>0) linear[x.clasificacionAvance||x.detalleTrabajo||"Sin clasificar"]=(linear[x.clasificacionAvance||x.detalleTrabajo||"Sin clasificar"]||0)+n(x.metrosLineales); if(n(x.m3)>0) volume[x.tipoTrabajo||x.tipoObra||"Sin clasificar"]=(volume[x.tipoTrabajo||x.tipoObra||"Sin clasificar"]||0)+n(x.m3); const w=weekStart(x.fecha); weeks[w] ||= {ml:0,m3:0}; weeks[w].ml+=n(x.metrosLineales); weeks[w].m3+=n(x.m3); });
  renderSummary("linearSummary",linear," m"); renderSummary("volumeSummary",volume," m³");
  const labels=Object.keys(weeks).sort(); chart("weeklyChart","bar",labels,[{label:"Metros lineales (m)",data:labels.map(x=>weeks[x].ml),backgroundColor:colors.blue,yAxisID:"y"},{label:"Volumen (m³)",data:labels.map(x=>weeks[x].m3),backgroundColor:colors.green,yAxisID:"y1"}],false,{scales:{y:{beginAtZero:true,title:{display:true,text:"m"}},y1:{beginAtZero:true,position:"right",grid:{drawOnChartArea:false},title:{display:true,text:"m³"}}}});
  $('productionBody').innerHTML=rows.length?rows.map(x=>`<tr class="${normalized(x.material)==="MINERAL"?"mineral-row":""}"><td>${esc(x.fecha)}</td><td>${esc(x.obra)}</td><td>${esc(x.tipoTrabajo||x.tipoObra)}</td><td>${esc(x.detalleTrabajo||"—")}</td><td>${esc(x.clasificacionAvance||"—")}</td><td>${x.metrosLineales??"—"}</td><td>${x.m3??"—"}</td><td>${esc(x.material)}</td></tr>`).join(""):'<tr><td colspan="8" class="empty-cell">Sin registros.</td></tr>';
}

function available(value) { return normalized(value)==="DISPONIBLE"; }
function renderFleet(equipment, movements, mpRows) {
  const availableCount=equipment.filter(x=>available(x.estadoTecnico||x.estado)).length, hours=sum(equipment,"horasOperadas"), tons=sum(movements,"tonelajeEstimado"); $('kpiAvailability').textContent=equipment.length?`${(availableCount/equipment.length*100).toFixed(1)}%`:"—"; $('kpiHours').textContent=`${hours.toFixed(1)} h`; $('kpiMovedTons').textContent=`${tons.toFixed(2)} t`; $('kpiProductivity').textContent=hours>0?`${(tons/hours).toFixed(2)} t/h`:"—"; $('fleetProductivityDetail').textContent=$('kpiProductivity').textContent;
  const families={}; equipment.forEach(x=>{const f=x.familiaEquipo||"SIN_FAMILIA"; families[f]||={total:0,ok:0};families[f].total++;if(available(x.estadoTecnico||x.estado))families[f].ok++;}); mpRows.forEach(x=>{families.MAQUINA_PIERNA||={total:0,ok:0};families.MAQUINA_PIERNA.total+=n(x.totalMaquinas);families.MAQUINA_PIERNA.ok+=n(x.disponiblesTecnicamente);});
  const labels=Object.keys(families); chart("familyAvailabilityChart","bar",labels,[{label:"Disponibilidad (%)",data:labels.map(x=>families[x].total?families[x].ok/families[x].total*100:0),backgroundColor:colors.blue}],true);
  const failures={}; equipment.filter(x=>!available(x.estadoTecnico||x.estado)).forEach(x=>{const key=x.motivoNoOperacion||x.motivo||"Sin motivo";failures[key]=(failures[key]||0)+1;}); renderSummary("failureSummary",failures);
  const moved={}; movements.forEach(x=>moved[x.equipo||"Sin equipo"]=(moved[x.equipo||"Sin equipo"]||0)+n(x.tonelajeEstimado));renderSummary("movementSummary",moved," t");
  $('equipmentBody').innerHTML=equipment.length?equipment.map(x=>`<tr><td>${esc(x.fecha)}</td><td>${esc(x.equipo)}</td><td>${esc(x.familiaEquipo)}</td><td>${esc(x.estadoTecnico||x.estado)}</td><td>${n(x.horasOperadas).toFixed(1)}</td><td>${esc(x.motivoNoOperacion||x.motivo||"—")}</td><td>${esc(x.tipoFalla||"—")}</td></tr>`).join(""):'<tr><td colspan="7" class="empty-cell">Sin registros.</td></tr>';
}
function renderMp(rows) { const latest=[...rows].sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))[0]||{}; $('kpiMpTotal').textContent=n(latest.totalMaquinas); $('kpiMpAvailable').textContent=n(latest.disponiblesTecnicamente); $('kpiMpScheduled').textContent=n(latest.programadas); $('kpiMpOperating').textContent=n(latest.pobladas ?? latest.operando); }
function renderPlant(rows) { $('kpiPlantTons').textContent=`${sum(rows,"tonelaje").toFixed(2)} t`; const map={};rows.forEach(x=>map[x.procedencia||"Sin procedencia"]=(map[x.procedencia||"Sin procedencia"]||0)+n(x.tonelaje));renderSummary("plantOriginSummary",map," t"); }
function renderStope(rows) { $('kpiStopeMate').textContent=`${sum(rows,"metrosDia")||sum(rows,"metrosTurno")} m`; const map={};rows.forEach(x=>map[x.lugar||"Sin lugar"]=(map[x.lugar||"Sin lugar"]||0)+n(x.metrosDia||x.metrosTurno));renderSummary("stopeLocationSummary",map," m"); }
function renderExploration(rows) { $('kpiExploration').textContent=`${sum(rows,"metrosBarrenados").toFixed(2)} m`; const map={};rows.forEach(x=>map[x.objetivo||"Sin objetivo"]=(map[x.objetivo||"Sin objetivo"]||0)+n(x.metrosBarrenados));renderSummary("explorationSummary",map," m"); }

function renderExecutiveMonth({month,monthStart,monthEnd,cutoff,plan,stock,days,shipments,drilling,catalogs,daysOk,shipmentsOk,drillingOk,catalogsOk}) {
  $('shipmentMonth').textContent=monthLabel(month);
  const totalDays=daysOfMonth(month), actualDays=Array.isArray(days)?days.filter(d=>d>=monthStart&&d<=cutoff).sort():[];
  const last=actualDays.at(-1), lastDay=last?Number(last.slice(-2)):0;
  const elapsed=cutoff>=monthStart?Math.min(totalDays,Number(cutoff.slice(-2))):0;
  const planFraction=elapsed/totalDays, target=plan?Number(plan.tonPlantaPlan):null;
  const shipmentTotals={};
  (shipments||[]).forEach(row=>{if(row.fecha>=monthStart&&row.fecha<=cutoff) shipmentTotals[row.fecha]=(shipmentTotals[row.fecha]||0)+n(row.tonelaje);});
  let running=0;
  const labels=Array.from({length:totalDays},(_,i)=>String(i+1));
  const actual=labels.map((label,i)=>{
    const key=`${month}-${String(i+1).padStart(2,"0")}`;
    running+=shipmentTotals[key]||0;
    return daysOk&&shipmentsOk&&i<lastDay?running:null;
  });
  const accumulated=lastDay?actual[lastDay-1]:0;
  const currentMonth=month===iso(new Date()).slice(0,7);
  const projected=daysOk&&shipmentsOk&&currentMonth&&lastDay>0&&lastDay<totalDays?accumulated/lastDay*totalDays:null;
  const forecast=labels.map((_,i)=>projected!==null&&i>=lastDay-1?(i===lastDay-1?accumulated:accumulated/lastDay*(i+1)):null);
  $('monthPlantActual').textContent=daysOk&&shipmentsOk&&lastDay?`${formatted(accumulated)} t`:"—";
  $('monthPlantPlanned').textContent=plan?`${formatted(target*planFraction)} t`:"Sin plan";
  $('monthPlantProjected').textContent=projected!==null?`${formatted(projected)} t`:"—";
  const note=[];
  if(!plan)note.push("Sin plan mensual registrado.");
  if(!daysOk||!shipmentsOk)note.push("No se pudo consultar el avance mensual.");
  else if(!last)note.push("Todavía no hay días de Mina reportados en este mes.");
  else {
    note.push(`Real hasta el ${last}.`);
    if(actualDays.length<lastDay)note.push(`Faltan ${lastDay-actualDays.length} días de reporte entre el inicio del mes y el último registro.`);
    if(cutoff>last)note.push("Hay días posteriores al último reporte pendientes de captura.");
    if(projected!==null)note.push("Proyección lineal: acumulado real ÷ días transcurridos al último reporte × días del mes.");
  }
  $('shipmentFootnote').textContent=note.join(" ");
  chart("shipmentChart","line",labels,[
    {label:"Plan acumulado",data:plan?labels.map((_,i)=>target*(i+1)/totalDays):[],borderColor:colors.blue,backgroundColor:colors.blue,pointRadius:0,borderWidth:2.5,tension:0},
    {label:"Real acumulado",data:actual,borderColor:colors.gold,backgroundColor:colors.gold,pointRadius:0,pointHoverRadius:5,borderWidth:3,tension:0,spanGaps:false},
    {label:"Proyección",data:forecast,borderColor:"#788899",backgroundColor:"#788899",borderDash:[7,5],pointRadius:0,borderWidth:2,tension:0,spanGaps:false}
  ],false,{interaction:{intersect:false,mode:"index"},plugins:{tooltip:{callbacks:{label:context=>`${context.dataset.label}: ${formatted(context.parsed.y)} t`}}},scales:{x:{title:{display:true,text:"Día del mes"}},y:{beginAtZero:true,title:{display:true,text:"Toneladas acumuladas"}}}});
  const linear=drillingOk?sum((drilling||[]).filter(x=>x.fecha>=monthStart&&x.fecha<=cutoff),"metrosLineales"):null;
  const materialRows=catalogsOk?(catalogs||[]).filter(x=>normalized(x.tipoCatalogo)==="MATERIAL"&&normalized(x.nombre)==="MINERAL"&&n(x.valor)>0):[];
  const densityRow=materialRows.find(x=>normalized(x.mina)===normalized($('filterMine').value))||materialRows.find(x=>normalized(x.mina)==="TODAS");
  const density=densityRow?n(densityRow.valor):null;
  const tumble=drillingOk&&density!==null?(drilling||[]).filter(x=>x.fecha>=monthStart&&x.fecha<=cutoff&&normalized(x.tipoTrabajo)==="TUMBE"&&normalized(x.material)==="MINERAL").reduce((sum,row)=>sum+n(row.m3)*density,0):null;
  compareBars("linearPlanChart",plan?Number(plan.metrosLinealesPlan)*planFraction:null,linear,"m");
  compareBars("tumblePlanChart",plan?Number(plan.tonTumbePlan)*planFraction:null,tumble,"t");
  $('linearPlanNote').textContent=`${plan?"Plan al día: "+formatted(plan.metrosLinealesPlan*planFraction)+" m.":"Sin plan mensual."} ${linear!==null?"Real acumulado: "+formatted(linear)+" m.":"Sin consulta de barrenación."}`;
  $('tumblePlanNote').textContent=`${plan?"Plan al día: "+formatted(plan.tonTumbePlan*planFraction)+" t.":"Sin plan mensual."} ${tumble!==null?"Estimado: "+formatted(tumble)+" t (solo TUMBE en MINERAL; "+density+" t/m³).":density===null?"No hay densidad activa de MINERAL en CATALOGOS.":"Sin consulta de barrenación."}`;
  $('kpiStockPatio').textContent=stock?`${formatted(stock.stockPatioTon)} t`:"—";
  $('stockDate').textContent=stock?`Medición de Geología · ${stock.fecha}`:"Sin medición de Geología";
}
function compareBars(id,planned,actual,unit) {
  chart(id,"bar",["Plan proporcional","Real acumulado"],[{label:unit,data:[planned,actual],backgroundColor:[colors.blue,colors.gold],borderRadius:6,barThickness:24}],false,{indexAxis:"y",plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>ctx.parsed.x===null?"Sin datos":`${formatted(ctx.parsed.x)} ${unit}`}}},scales:{x:{beginAtZero:true,title:{display:true,text:unit}},y:{grid:{display:false}}}});
}
function chart(id,type,labels,datasets,percent=false,extras={}) { if(charts[id])charts[id].destroy(); charts[id]=new Chart($(id),{type,data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:true,max:percent?100:undefined,ticks:{callback:percent?v=>`${v}%`:undefined}}},...extras}}); }
document.querySelectorAll(".area-detail").forEach(detail=>detail.addEventListener("toggle",()=>{if(detail.open){document.querySelectorAll(".area-detail").forEach(other=>{if(other!==detail)other.open=false;});requestAnimationFrame(()=>Object.values(charts).forEach(instance=>instance.resize()));}}));
$('applyFilters').addEventListener("click",load); defaults(); load();
