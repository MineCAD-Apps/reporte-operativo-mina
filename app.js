"use strict";
const API_URL = window.MinecadCatalogs.API_URL;
const YD3_TO_M3 = 0.764554857984;
let catalogRows = [];
const state = { work: [], movement: [], equipment: {}, mpReasons: [], planningItems: [], planningUnmatched: [], plant: [] };
const $ = id => document.getElementById(id);
const today = new Date().toISOString().slice(0, 10);
$('fecha').value = today; $('explorationDate').value = today; $('planningDate').value = today; $('geologyDate').value = today;

function uid() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
function esc(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function number(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function normalizeKey(value) { return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " "); }
function equipmentFamily(item) {
  const key = normalizeKey(item?.grupo).replace(/[^a-z0-9]+/g, "_");
  if (key.includes("scoop")) return "SCOOPTRAM";
  if (key.includes("camion")) return "CAMION_BAJO_PERFIL";
  if (key.includes("stope")) return "STOPE_MATE";
  if (key.includes("termita")) return "TERMITA";
  return key.toUpperCase();
}
function movementCountTypeFor(item) { const family = equipmentFamily(item); return family === "SCOOPTRAM" ? "Cucharones" : family === "CAMION_BAJO_PERFIL" ? "Viajes" : ""; }
function rows(type, mine = "", group = "") { return window.MinecadCatalogs.matching(catalogRows, type, mine, group); }
function options(items, placeholder = "Seleccionar") { return `<option value="">${placeholder}</option>${items.map(x => `<option value="${esc(x.nombre)}">${esc(x.nombre)}</option>`).join("")}`; }
function unique(items) { return [...new Map(items.map(x => [x.nombre.toUpperCase(), x])).values()]; }
function selectedEquipment(name) { return rows("EQUIPO", $('mina').value).find(x => x.nombre === name); }
function material(name) { return rows("MATERIAL").find(x => x.nombre.toUpperCase() === String(name).toUpperCase()); }

function showPanel(name) {
  document.querySelectorAll("[data-capture-panel]").forEach(el => el.classList.toggle("hidden", el.dataset.capturePanel !== name));
  document.querySelectorAll("[data-open-capture]").forEach(el => el.classList.toggle("active", el.dataset.openCapture === name));
}
document.querySelectorAll("[data-open-capture]").forEach(button => button.addEventListener("click", () => showPanel(button.dataset.openCapture)));

function populateMineCatalogs() {
  const mine = $('mina').value;
  const places = unique(rows("LUGAR", mine, "OBRA_MINERA"));
  const destinations = unique([...places, ...rows("LUGAR", mine, "DESTINO_ESPECIAL")]);
  $('minePlaces').innerHTML = places.map(x => `<option value="${esc(x.nombre)}"></option>`).join("");
  $('destinations').innerHTML = destinations.map(x => `<option value="${esc(x.nombre)}"></option>`).join("");
  const diesel = rows("EQUIPO", mine).filter(x => ["SCOOPTRAM", "CAMION_BAJO_PERFIL"].includes(equipmentFamily(x)));
  $('movementEquipment').innerHTML = options(diesel);
  const materials = rows("MATERIAL", mine);
  $('workMaterial').innerHTML = options(materials);
  $('movementMaterial').innerHTML = options(materials);
  const stope = rows("EQUIPO", mine).filter(x => equipmentFamily(x) === "STOPE_MATE");
  $('stopeSection').classList.toggle("hidden", !stope.length);
  $('stopeEquipment').innerHTML = options(stope);
  renderEquipmentRows();
  syncMpReasonRows();
}

function populateExploration() {
  const mine = $('explorationMine').value;
  $('explorationEquipment').innerHTML = options(rows("EQUIPO", mine).filter(x => equipmentFamily(x) === "TERMITA"));
  $('explorationPlaces').innerHTML = unique(rows("LUGAR", mine, "OBRA_MINERA")).map(x => `<option value="${esc(x.nombre)}"></option>`).join("");
}

function updateWorkType() {
  const type = $('workType').value;
  const detail = $('workDetail');
  const isCuele = type === "Cuele";
  const catalogDetails = rows("TIPO_TRABAJO", "", "CUELE");
  const fallbackDetails = ["Exploración", "Contra-pozo", "Desarrollo", "Preparación"]
    .map(nombre => ({ nombre }));
  const cueleDetails = unique([...catalogDetails, ...fallbackDetails]);
  detail.disabled = !isCuele;
  detail.innerHTML = isCuele ? options(cueleDetails, "Clasificar cuele") : '<option value="">No aplica</option>';
  $('workUnit').textContent = isCuele ? "m" : (["Tumbe", "Desborde"].includes(type) ? "m³" : "—");
}

function addWork() {
  const obra = $('workPlace').value.trim(), tipoTrabajo = $('workType').value, detalleTrabajo = $('workDetail').value;
  const cantidad = number($('workQuantity').value), materialName = $('workMaterial').value;
  if (!obra || !tipoTrabajo || !materialName || cantidad <= 0 || (tipoTrabajo === "Cuele" && !detalleTrabajo)) return alert("Completa obra, trabajo, clasificación cuando sea cuele, cantidad y material.");
  let clasificacion = tipoTrabajo;
  if (tipoTrabajo === "Cuele") clasificacion = detalleTrabajo === "Contra-pozo" ? (materialName.toUpperCase() === "MINERAL" ? "Exploración" : "Preparación") : detalleTrabajo;
  state.work.push({ id: uid(), obra, tipoTrabajo, detalleTrabajo, clasificacionAvance: clasificacion, metrosLineales: tipoTrabajo === "Cuele" ? cantidad : null, m3: tipoTrabajo === "Cuele" ? null : cantidad, material: materialName });
  ['workPlace', 'workQuantity'].forEach(id => $(id).value = ""); $('workType').value = ""; $('workMaterial').value = ""; updateWorkType(); renderWork();
}

function renderWork() {
  $('workRows').innerHTML = state.work.length ? state.work.map(x => `<div class="data-row work-grid ${x.material.toUpperCase() === "MINERAL" ? "mineral-row" : ""}"><span>${esc(x.obra)}</span><span>${esc(x.tipoTrabajo)}</span><span>${esc(x.detalleTrabajo || "—")}<small>${x.clasificacionAvance !== x.detalleTrabajo && x.detalleTrabajo ? ` → ${esc(x.clasificacionAvance)}` : ""}</small></span><span>${x.metrosLineales ?? x.m3} ${x.metrosLineales != null ? "m" : "m³"}</span><span>${esc(x.material)}</span><button class="delete-button" type="button" data-delete-work="${x.id}">×</button></div>`).join("") : '<div class="empty-state">Sin registros de avance, tumbe o desborde.</div>';
  document.querySelectorAll('[data-delete-work]').forEach(b => b.onclick = () => { state.work = state.work.filter(x => x.id !== b.dataset.deleteWork); renderWork(); });
}

function movementCalculation() {
  const eq = selectedEquipment($('movementEquipment').value), mat = material($('movementMaterial').value), count = number($('movementCount').value);
  const capacity = number(eq?.valor), density = number(mat?.valor), fill = 1;
  const volume = count * capacity * YD3_TO_M3, tons = volume * density * fill;
  return { capacity, density, fill, volume, tons };
}
function previewMovement() { const eq = selectedEquipment($('movementEquipment').value), countType = movementCountTypeFor(eq), c = movementCalculation(); $('movementCountType').value = countType; $('movementEstimate').textContent = c.volume > 0 && c.density > 0 ? `${c.volume.toFixed(2)} m³ · ${c.tons.toFixed(2)} t` : "—"; }
function addMovement() {
  const equipment = $('movementEquipment').value, countType = $('movementCountType').value, count = number($('movementCount').value), origin = $('movementOrigin').value.trim(), destination = $('movementDestination').value.trim(), materialName = $('movementMaterial').value;
  const eq = selectedEquipment(equipment), c = movementCalculation();
  if (!eq || !countType || count <= 0 || !origin || !destination || !materialName || c.density <= 0) return alert("Completa todos los datos del movimiento de material.");
  state.movement.push({ id: uid(), equipo: equipment, familiaEquipo: equipmentFamily(eq), tipoConteo: countType, cantidad: count, procedencia: origin, destino: destination, material: materialName, capacidadYd3: c.capacity, densidadTM3: c.density, factorLlenado: c.fill, volumenM3: c.volume, tonelajeEstimado: c.tons });
  ['movementCount', 'movementOrigin', 'movementDestination'].forEach(id => $(id).value = ""); $('movementEquipment').value = ""; $('movementCountType').value = ""; $('movementMaterial').value = ""; previewMovement(); renderMovement();
}
function renderMovement() {
  $('movementRows').innerHTML = state.movement.length ? state.movement.map(x => `<div class="data-row movement-grid ${x.material.toUpperCase() === "MINERAL" ? "mineral-row" : ""}"><span>${esc(x.equipo)}</span><span>${esc(x.tipoConteo)}</span><span>${x.cantidad}</span><span>${esc(x.procedencia)}</span><span>${esc(x.destino)}</span><span>${esc(x.material)}</span><span>${x.volumenM3.toFixed(2)} m³ · ${x.tonelajeEstimado.toFixed(2)} t</span><button class="delete-button" type="button" data-delete-movement="${x.id}">×</button></div>`).join("") : '<div class="empty-state">Sin movimientos capturados.</div>';
  document.querySelectorAll('[data-delete-movement]').forEach(b => b.onclick = () => { state.movement = state.movement.filter(x => x.id !== b.dataset.deleteMovement); renderMovement(); });
}

function isEquipmentFailure(value) { return normalizeKey(value) === "falla de equipo"; }
function markSelected(html, selected) { return selected ? html.replace(`value="${esc(selected)}"`, `value="${esc(selected)}" selected`) : html; }
function reasonOptions(group, selected = "") {
  const base = ["Falla de Equipo", "Servicio Programado", "Esperando Refacción", "Accidente/Daño", "Falta de Personal", "Falta de Lugar"].map(nombre => ({ nombre }));
  const failureTypes = new Set(["ponchadura", "falla mecanica", "falla electrica", "otro"]);
  const catalog = rows("MOTIVO_NO_OPERACION", $('mina').value, group).filter(item => !failureTypes.has(normalizeKey(item.nombre)));
  return markSelected(options(unique([...base, ...catalog])), selected);
}
function failureOptions(selected = "") {
  const base = ["Ponchadura", "Falla Mecánica", "Falla Eléctrica", "Otro"].map(nombre => ({ nombre }));
  const catalog = rows("TIPO_FALLA", $('mina').value, "EQUIPOS_DIESEL");
  return markSelected(options(unique([...base, ...catalog])), selected);
}
function renderEquipmentRows() {
  const mine = $('mina').value, equipments = rows("EQUIPO", mine).filter(x => ["SCOOPTRAM", "CAMION_BAJO_PERFIL", "STOPE_MATE"].includes(equipmentFamily(x)));
  if (!mine) { $('equipmentRows').innerHTML = '<div class="empty-state">Selecciona una mina.</div>'; return; }
  $('equipmentRows').innerHTML = equipments.map((eq, i) => {
    const saved = state.equipment[eq.nombre] || { familiaEquipo: equipmentFamily(eq), estadoTecnico: "", horasOperadas: "", motivoNoOperacion: "", tipoFalla: "", comentarios: "" };
    state.equipment[eq.nombre] = saved;
    const rowClass = saved.estadoTecnico === "Disponible" ? "available" : saved.estadoTecnico === "No disponible" ? "out" : "";
    return `<div class="equipment-row equipment-v17-grid ${rowClass}" data-eq-row="${esc(eq.nombre)}"><strong>${esc(eq.nombre)}</strong><div class="radio-group"><label class="radio-option"><input type="radio" name="eq-status-${i}" value="Disponible" data-eq-field="estadoTecnico" ${saved.estadoTecnico === "Disponible" ? "checked" : ""} />Disponible</label><label class="radio-option"><input type="radio" name="eq-status-${i}" value="No disponible" data-eq-field="estadoTecnico" ${saved.estadoTecnico === "No disponible" ? "checked" : ""} />No disponible</label></div><input data-eq-field="horasOperadas" type="number" min="0" max="24" step="0.1" value="${esc(saved.horasOperadas)}" placeholder="Horas trabajadas" aria-label="Horas operadas en el día" /><select data-eq-field="motivoNoOperacion" ${saved.estadoTecnico === "No disponible" ? "" : "disabled"}>${reasonOptions("EQUIPOS_DIESEL", saved.motivoNoOperacion)}</select><select data-eq-field="tipoFalla" ${isEquipmentFailure(saved.motivoNoOperacion) ? "" : "disabled"}>${failureOptions(saved.tipoFalla)}</select><input data-eq-field="comentarios" value="${esc(saved.comentarios)}" placeholder="Observación" /></div>`;
  }).join("") || '<div class="empty-state">No hay equipos diésel activos en el catálogo.</div>';
  document.querySelectorAll('[data-eq-row]').forEach(row => row.querySelectorAll('[data-eq-field]').forEach(input => input.addEventListener("change", () => {
    const item = state.equipment[row.dataset.eqRow], field = input.dataset.eqField; item[field] = input.value;
    if (field === "estadoTecnico" && input.value !== "No disponible") { item.motivoNoOperacion = ""; item.tipoFalla = ""; }
    if (field === "motivoNoOperacion" && !isEquipmentFailure(input.value)) item.tipoFalla = "";
    if (["estadoTecnico", "motivoNoOperacion"].includes(field)) renderEquipmentRows();
  })));
}

function mpReasonItems(mine = $('mina').value) {
  const base = ["Falta de Personal", "Falta de Lugar", "Falta de Servicios", "Falta de Insumos", "Falla de Máquina"].map(nombre => ({ nombre }));
  return unique([...base, ...rows("MOTIVO_NO_OPERACION", mine, "MAQUINA_PIERNA")]);
}
function syncMpReasonRows() {
  const scheduled = Math.max(0, Math.floor(number($('mpScheduled').value)));
  const populated = Math.max(0, Math.floor(number($('mpPopulated').value)));
  const missing = Math.max(0, scheduled - populated);
  state.mpReasons = state.mpReasons.slice(0, missing);
  while (state.mpReasons.length < missing) state.mpReasons.push({ id: uid(), motivo: "", comentarios: "" });
  $('mpMissingSummary').innerHTML = `<strong>No pobladas:</strong> ${missing}. Se calcula como ${scheduled} programadas menos ${populated} pobladas.`;
  renderMpReasons();
}
function renderMpReasons() {
  const reasonHtml = item => markSelected(options(mpReasonItems()), item.motivo);
  $('mpReasonRows').innerHTML = state.mpReasons.length ? state.mpReasons.map((item, index) => `<div class="data-row mp-auto-grid"><strong>No poblada ${index + 1}</strong><select data-mp-reason="${index}">${reasonHtml(item)}</select><input data-mp-comment="${index}" value="${esc(item.comentarios)}" placeholder="Observación opcional" /></div>`).join("") : '<div class="empty-state">Todas las programadas fueron pobladas; no se requieren motivos.</div>';
  document.querySelectorAll('[data-mp-reason]').forEach(select => select.addEventListener("change", () => { state.mpReasons[Number(select.dataset.mpReason)].motivo = select.value; }));
  document.querySelectorAll('[data-mp-comment]').forEach(input => input.addEventListener("input", () => { state.mpReasons[Number(input.dataset.mpComment)].comentarios = input.value; }));
}

async function loadPlanningActivities() {
  const mine = $('planningMine').value, date = $('planningDate').value;
  state.planningItems = [];
  state.planningUnmatched = [];
  $('savePlanning').disabled = true;
  $('planningActivities').innerHTML = '<div class="empty-state">Consultando programación…</div>';
  $('planningStatus').textContent = "Consultando…";
  if (!mine || !date) {
    $('planningActivities').innerHTML = '<div class="empty-state">Selecciona mina y fecha.</div>';
    $('planningStatus').textContent = "Selecciona mina y fecha";
    return;
  }
  try {
    const [planResponse, operationResponse] = await Promise.all([
      fetch(`${API_URL}?accion=plan_semanal&mina=${encodeURIComponent(mine)}&fecha=${date}`, { cache: "no-store" }),
      fetch(`${API_URL}?accion=barrenacion&mina=${encodeURIComponent(mine)}&desde=${date}&hasta=${date}`, { cache: "no-store" })
    ]);
    const [planResult, operationResult] = await Promise.all([planResponse.json(), operationResponse.json()]);
    if (!planResult.ok) throw new Error(planResult.mensaje || "No fue posible consultar el plan");
    if (!operationResult.ok) throw new Error(operationResult.mensaje || "No fue posible consultar el reporte de Mina");
    const plans = planResult.datos || [];
    const operationRows = operationResult.datos || [];
    state.planningItems = plans.map(plan => ({
      ...plan,
      operacion: summarizeOperationForPlan(operationRows, plan),
      pueblesRealizados: "",
      disparosRealizados: "",
      comentariosReal: "",
      causas: []
    }));
    state.planningUnmatched = operationRows.filter(row => !plans.some(plan => operationMatchesPlan(row, plan)));
    const matches = state.planningItems.filter(item => item.operacion).length;
    $('planningStatus').textContent = `${state.planningItems.length} actividad(es) · ${matches} con reporte de Mina`;
    $('savePlanning').disabled = !state.planningItems.length;
    renderPlanningActivities();
  } catch (error) {
    console.error("Planeación:", error);
    $('planningActivities').innerHTML = `<div class="catalog-error">${esc(error.message)}</div>`;
    $('planningStatus').textContent = "Error";
  }
}

function operationMatchesPlan(item, plan) {
  if (normalizeKey(item.obra) !== normalizeKey(plan.lugar)) return false;
  if (normalizeKey(item.tipoTrabajo) !== normalizeKey(plan.tipoTrabajo)) return false;
  if (normalizeKey(item.material) !== normalizeKey(plan.material)) return false;
  return normalizeKey(plan.tipoTrabajo) !== "CUELE" || normalizeKey(item.detalleTrabajo) === normalizeKey(plan.detalleTrabajo);
}

function summarizeOperationForPlan(items, plan) {
  const matching = items.filter(item => operationMatchesPlan(item, plan));
  if (!matching.length) return null;
  const summary = { lugar: plan.lugar, metrosLineales: 0, m3: 0, tipos: new Set(), materiales: new Set(), reportes: new Set() };
  matching.forEach(item => {
    summary.metrosLineales += number(item.metrosLineales);
    summary.m3 += number(item.m3);
    if (item.tipoTrabajo) summary.tipos.add(item.tipoTrabajo);
    if (item.material) summary.materiales.add(item.material);
    if (item.idReporte) summary.reportes.add(item.idReporte);
  });
  summary.cantidadReal = plan.unidad === "m" ? summary.metrosLineales : summary.m3;
  return summary;
}

function operationSummaryMarkup(summary, plan) {
  if (!summary) return `<div class="planning-operation empty"><strong>Plan físico</strong><span>${number(plan.cantidadProgramada).toFixed(2)} ${esc(plan.unidad)}</span><small>Sin producción coincidente reportada por Mina.</small></div>`;
  const measures = [];
  if (summary.metrosLineales > 0) measures.push(`${summary.metrosLineales.toFixed(2)} m lineales`);
  if (summary.m3 > 0) measures.push(`${summary.m3.toFixed(2)} m³`);
  const cumplimiento = number(plan.cantidadProgramada) > 0 ? summary.cantidadReal / number(plan.cantidadProgramada) * 100 : 0;
  return `<div class="planning-operation"><strong>Plan físico: ${number(plan.cantidadProgramada).toFixed(2)} ${esc(plan.unidad)}</strong><span>Real: ${number(summary.cantidadReal).toFixed(2)} ${esc(plan.unidad)} · ${cumplimiento.toFixed(1)}%</span><small>${esc(measures.join(" · ") || "Sin cantidad reportada")}</small></div>`;
}

function planningCauseOptions(selected = "") { return markSelected(options(mpReasonItems($('planningMine').value)), selected); }

function renderPlanningActivities() {
  if (!state.planningItems.length) {
    $('planningActivities').innerHTML = '<div class="empty-state">No hay actividades activas programadas para esta mina y fecha.</div>';
    return;
  }
  const unmatched = state.planningUnmatched.length
    ? `<div class="planning-unmatched"><strong>Atención:</strong> Mina reportó combinaciones sin plan: ${[...new Set(state.planningUnmatched.map(item => `${esc(item.obra)} · ${esc(item.tipoTrabajo)} · ${esc(item.material)}`))].join(", ")}.</div>`
    : "";
  $('planningActivities').innerHTML = unmatched + state.planningItems.map((item, index) => `
    <article class="planning-activity">
      <div class="planning-activity-header"><div><strong>${esc(item.lugar || item.idActividad || item.idPlan)}</strong><span>${esc(item.tipoTrabajo)}${item.detalleTrabajo ? ` · ${esc(item.detalleTrabajo)}` : ""} · ${esc(item.material)} · ${esc(item.cuadrilla || "Sin cuadrilla")}</span></div><span>${esc(item.prioridad || "")}</span></div>
      <div class="planning-activity-body">
        ${operationSummaryMarkup(item.operacion, item)}
        <div class="planning-result-grid">
          <label>Puebles programados<input value="${number(item.pueblesProgramados)}" readonly /></label>
          <label>Puebles realizados<input type="number" min="0" step="1" required value="${esc(item.pueblesRealizados)}" data-plan-field="pueblesRealizados" data-plan-index="${index}" /></label>
          <label>Disparos realizados<input type="number" min="0" step="1" required value="${esc(item.disparosRealizados)}" data-plan-field="disparosRealizados" data-plan-index="${index}" /></label>
          <label>Comentarios<input value="${esc(item.comentariosReal)}" data-plan-field="comentariosReal" data-plan-index="${index}" /></label>
        </div>
        <div class="planning-cause-entry entry-row mp-grid">
          <select id="planCauseReason-${index}">${planningCauseOptions()}</select>
          <input id="planCauseQuantity-${index}" type="number" min="1" step="1" placeholder="Cantidad" />
          <input id="planCauseComment-${index}" placeholder="Comentario de la causa" />
          <button type="button" class="add-line-button" data-add-plan-cause="${index}"><span class="plus">+</span><span class="add-label">Agregar causa</span></button>
        </div>
        <div class="planning-causes-list">${renderPlanningCauses(item, index)}</div>
      </div>
    </article>`).join("");
  document.querySelectorAll('[data-plan-field]').forEach(input => input.addEventListener("input", () => { state.planningItems[Number(input.dataset.planIndex)][input.dataset.planField] = input.value; }));
  document.querySelectorAll('[data-add-plan-cause]').forEach(button => button.addEventListener("click", () => addPlanningCause(Number(button.dataset.addPlanCause))));
  document.querySelectorAll('[data-delete-plan-cause]').forEach(button => button.addEventListener("click", () => { const item = state.planningItems[Number(button.dataset.planIndex)]; item.causas = item.causas.filter(c => c.id !== button.dataset.deletePlanCause); renderPlanningActivities(); }));
}

function renderPlanningCauses(item, index) {
  if (!item.causas.length) return '<div class="empty-state">Sin causas registradas.</div>';
  return item.causas.map(cause => `<div class="planning-cause-row"><span>${esc(cause.motivo)}</span><strong>${cause.cantidadNoCumplida}</strong><span>${esc(cause.comentarios || "—")}</span><button type="button" class="delete-button" data-plan-index="${index}" data-delete-plan-cause="${cause.id}">×</button></div>`).join("");
}

function addPlanningCause(index) {
  const motivo = $(`planCauseReason-${index}`).value;
  const cantidadNoCumplida = number($(`planCauseQuantity-${index}`).value);
  const comentarios = $(`planCauseComment-${index}`).value.trim();
  if (!motivo || cantidadNoCumplida < 1) return alert("Selecciona el motivo y captura la cantidad no cumplida.");
  state.planningItems[index].causas.push({ id: uid(), motivo, cantidadNoCumplida, comentarios });
  renderPlanningActivities();
}

function validatePlanningReport() {
  const activities = new Set();
  for (const item of state.planningItems) {
    const placeKey = normalizeKey(item.lugar);
    if (!placeKey) { alert(`El plan ${item.idPlan} no tiene LUGAR y no puede conciliarse con el reporte de Mina.`); return false; }
    const activityKey = [placeKey, normalizeKey(item.tipoTrabajo), normalizeKey(item.detalleTrabajo), normalizeKey(item.material)].join("|");
    if (activities.has(activityKey)) { alert(`Hay programación duplicada para ${item.lugar}, ${item.tipoTrabajo} y ${item.material}. Consolida las cantidades en PLAN_SEMANAL.`); return false; }
    activities.add(activityKey);
    const pReal = number(item.pueblesRealizados), dReal = number(item.disparosRealizados);
    if (!Number.isInteger(pReal) || !Number.isInteger(dReal)) { alert("Los puebles y disparos realizados deben ser números enteros."); return false; }
    const incumple = pReal < number(item.pueblesProgramados) || dReal < number(item.pueblesProgramados);
    if (incumple && !item.causas.length) { alert(`Falta capturar la causa de incumplimiento para ${item.lugar || item.idActividad || item.idPlan}.`); return false; }
  }
  return true;
}
function addPlant() { const toneladas = number($('plantTons').value), procedencia = $('plantOrigin').value.trim(); if (toneladas <= 0 || !procedencia) return alert("Captura tonelaje y procedencia."); state.plant.push({ id: uid(), toneladas, procedencia }); $('plantTons').value = ""; $('plantOrigin').value = ""; renderPlant(); }
function renderPlant() { $('plantRows').innerHTML = state.plant.length ? state.plant.map(x => `<div class="data-row plant-grid"><span>${x.toneladas.toFixed(2)} t</span><span>${esc(x.procedencia)}</span><button class="delete-button" type="button" data-delete-plant="${x.id}">×</button></div>`).join("") : '<div class="empty-state">Sin acarreos a planta.</div>'; $('plantTotal').textContent = `${state.plant.reduce((s, x) => s + x.toneladas, 0).toFixed(2)} t`; document.querySelectorAll('[data-delete-plant]').forEach(b => b.onclick = () => { state.plant = state.plant.filter(x => x.id !== b.dataset.deletePlant); renderPlant(); }); }

function wait(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

async function waitForReportConfirmation(idEnvio) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await wait(attempt === 0 ? 350 : 750);
    try {
      const response = await fetch(`${API_URL}?accion=confirmar_envio&id_envio=${encodeURIComponent(idEnvio)}`, { cache: "no-store" });
      const result = await response.json();
      if (result.ok && result.encontrado) return result;
    } catch (error) {
      console.warn("Confirmación pendiente:", error);
    }
  }
  return null;
}

async function postReport(payload, button) {
  button.disabled = true; const original = button.textContent; button.textContent = "Enviando…";
  const idEnvio = uid();
  payload.idEnvio = idEnvio;
  try {
    await fetch(API_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
    button.textContent = "Confirmando…";
    const confirmation = await waitForReportConfirmation(idEnvio);
    if (!confirmation) {
      alert("No fue posible confirmar el envío. Los datos se conservaron; no vuelvas a enviarlos hasta revisar la conexión.");
      return false;
    }
    if (confirmation.estado !== "OK") {
      alert(`El reporte no fue guardado: ${confirmation.mensaje || "error no especificado"}`);
      return false;
    }
    alert("Reporte enviado correctamente.");
    return true;
  } catch (error) {
    console.error(error);
    alert(`No se pudo enviar: ${error.message}`);
    return false;
  } finally {
    button.disabled = false; button.textContent = original;
  }
}

function resetMineReport() {
  $('mineReport').reset();
  $('fecha').value = today;
  state.work = []; state.movement = []; state.equipment = {}; state.mpReasons = []; state.plant = [];
  populateMineCatalogs(); updateWorkType(); renderWork(); renderMovement(); renderPlant(); previewMovement();
}

function resetExplorationReport() {
  $('explorationReport').reset();
  $('explorationDate').value = today;
  populateExploration();
}

function resetPlanningReport() {
  $('planningReport').reset();
  $('planningDate').value = today;
  state.planningItems = []; state.planningUnmatched = [];
  $('planningActivities').innerHTML = '<div class="empty-state">Sin programación consultada.</div>';
  $('planningStatus').textContent = "Selecciona mina y fecha";
  $('savePlanning').disabled = true;
}

function resetGeologyReport() {
  $('geologyReport').reset();
  $('geologyDate').value = today;
}
function validateCounts() {
  const values = ['mpTotal','mpAvailable','mpScheduled','mpPopulated'].map(id => number($(id).value));
  if (!values.every(Number.isInteger)) { alert("Los conteos de máquinas de pierna deben ser números enteros."); return false; }
  if (values[1] > values[0] || values[2] > values[0] || values[3] > values[2]) { alert("Revisa máquinas de pierna: disponibles y programadas no pueden superar el total; pobladas no puede superar programadas."); return false; }
  if (state.mpReasons.some(item => !item.motivo)) { alert("Selecciona un motivo para cada pueble programado que no fue poblado."); return false; }
  return true;
}

$('mineReport').addEventListener("submit", async event => {
  event.preventDefault(); if (!$('mineReport').reportValidity() || !validateCounts()) return;
  const equipment = Object.entries(state.equipment).filter(([, x]) => x.estadoTecnico || number(x.horasOperadas) > 0).map(([equipo, x]) => ({ equipo, familiaEquipo: x.familiaEquipo, estadoTecnico: x.estadoTecnico, horasOperadas: number(x.horasOperadas), motivoNoOperacion: x.motivoNoOperacion, tipoFalla: x.tipoFalla, comentarios: x.comentarios }));
  const stopeMeters = number($('stopeMeters').value);
  const payload = { tipoReporte: "mina", encabezado: { mina: $('mina').value, fecha: $('fecha').value, responsable: $('responsable').value.trim() }, barrenacion: state.work, movimientoMaterial: state.movement, estadoEquipos: equipment, maquinasPierna: { totalMaquinas: number($('mpTotal').value), disponiblesTecnicamente: number($('mpAvailable').value), programadas: number($('mpScheduled').value), pobladas: number($('mpPopulated').value), comentarios: $('mpComments').value.trim(), motivos: state.mpReasons.map(item => ({ motivo: item.motivo, cantidadAfectada: 1, comentarios: item.comentarios })) }, stopeMate: stopeMeters > 0 ? { equipo: $('stopeEquipment').value, lugar: $('stopePlace').value.trim(), metrosDia: stopeMeters } : null, acarreoPlanta: state.plant, comentariosGenerales: $('generalComments').value.trim() };
  if (await postReport(payload, $('saveReport'))) resetMineReport();
});

$('explorationReport').addEventListener("submit", async event => {
  event.preventDefault(); if (!$('explorationReport').reportValidity()) return;
  const payload = { tipoReporte: "exploracion", exploracion: { fecha: $('explorationDate').value, mina: $('explorationMine').value, responsable: $('explorationResponsible').value.trim(), equipo: $('explorationEquipment').value, nombreBarreno: $('explorationHole').value.trim(), metrosBarrenados: number($('explorationMeters').value), ubicacion: $('explorationLocation').value.trim(), objetivo: $('explorationObjective').value.trim(), comentarios: $('explorationComments').value.trim() } };
  if (await postReport(payload, $('saveExploration'))) resetExplorationReport();
});

$('planningReport').addEventListener("submit", async event => {
  event.preventDefault();
  if (!$('planningReport').reportValidity() || !state.planningItems.length || !validatePlanningReport()) return;
  const payload = { tipoReporte: "planeacion", planeacion: { fecha: $('planningDate').value, mina: $('planningMine').value, responsable: $('planningResponsible').value.trim(), actividades: state.planningItems.map(item => ({ idPlan: item.idPlan, pueblesRealizados: number(item.pueblesRealizados), disparosRealizados: number(item.disparosRealizados), comentarios: item.comentariosReal, causas: item.causas.map(cause => ({ motivo: cause.motivo, cantidadNoCumplida: cause.cantidadNoCumplida, comentarios: cause.comentarios })) })) } };
  if (await postReport(payload, $('savePlanning'))) resetPlanningReport();
});

$('geologyReport').addEventListener("submit", async event => {
  event.preventDefault();
  if (!$('geologyReport').reportValidity()) return;
  const payload = { tipoReporte: "geologia", geologia: {
    fecha: $('geologyDate').value, mina: $('geologyMine').value,
    responsable: $('geologyResponsible').value.trim(), stockPatioTon: $('geologyStock').value,
    observaciones: $('geologyNotes').value.trim()
  } };
  if (await postReport(payload, $('saveGeology'))) resetGeologyReport();
});

$('mina').addEventListener("change", populateMineCatalogs); $('explorationMine').addEventListener("change", populateExploration); $('planningMine').addEventListener("change", loadPlanningActivities); $('planningDate').addEventListener("change", loadPlanningActivities); $('workType').addEventListener("change", updateWorkType); $('mpScheduled').addEventListener("input", syncMpReasonRows); $('mpPopulated').addEventListener("input", syncMpReasonRows); $('addWork').onclick = addWork; $('addMovement').onclick = addMovement; $('addPlantHaul').onclick = addPlant;
['movementEquipment','movementMaterial','movementCount'].forEach(id => $(id).addEventListener("input", previewMovement));

(async function init() {
  try { const result = await window.MinecadCatalogs.ready; catalogRows = result.rows; $('catalogStatus').textContent = result.source === "google" ? "Catálogos actualizados" : "Catálogos en caché"; populateMineCatalogs(); populateExploration(); updateWorkType(); renderWork(); renderMovement(); renderMpReasons(); renderPlant(); }
  catch (error) { console.error(error); $('catalogStatus').textContent = "Error de catálogos"; alert("No fue posible cargar los catálogos. Revisa el despliegue del Apps Script."); }
})();
