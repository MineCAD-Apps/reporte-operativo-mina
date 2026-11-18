import { limitFor, productionPerMeter } from './production.mjs?v=production-1';

const zoneGrades = new Map([
  ['Z-UH-1750-N', 182.18], ['Z-UH-1750-S', 182.18], ['Z-UH-1770-S', 147.61],
  ['1750 NORTE', 182.18], ['1750 SUR', 182.18], ['1770 SUR', 147.61],
]);

export function applyBlockGrades(works, catalog, mineId) {
  const assignments = new Map(catalog?.assignments?.filter(a => a.mineId === mineId).map(a => [a.workId, a]));
  const zones = new Map(catalog?.zones?.filter(z => z.mineId === mineId).map(z => [z.id, z.name]));
  for (const work of works) {
    const assignment = assignments.get(work.id);
    const zoneId = assignment?.zoneId;
    work.block = zones.get(zoneId) || zoneId || '';
    work.agEq = mineId === 'unificacion'
      ? zoneGrades.get(zoneId) ?? zoneGrades.get(work.block.trim().toUpperCase()) ?? null
      : null;
    work.veinWidth = assignment?.veinWidth;
    work.miningWidth = assignment?.miningWidth;
  }
}

export const INPUT_ROWS = [
  ['holes', 'Barrenos estimados'], ['drillMeters', 'Barrenación (m)'],
  ['shots', 'Disparos equivalentes'], ['primerKg', 'Bombillo (kg)'], ['anfoKg', 'ANFO (kg)'],
  ['nonel', 'Nonel (pzas)'], ['fuses', 'Cañuela armada (pzas)'], ['cord', 'Cordón detonante (m)'],
  ['bits', 'Brocas equivalentes'], ['bars', 'Barras equivalentes'],
  ['supportArea', 'Superficie de sostenimiento (m²)'], ['bolts', 'Anclas previstas'], ['meshRolls', 'Rollos de malla equivalentes'],
];

const amount = (v, min = 0) => v == null || v === '' || !Number.isFinite(Number(v)) || Number(v) < min ? null : Number(v);
const product = (...values) => values.includes(0) ? 0 : values.includes(null) ? null : values.reduce((a, b) => a * b, 1);
const ratio = (a, b) => a == null || !(b > 0) ? null : a / b;
const fields = ['meters', 'developmentTons', 'tumbeTons', 'tons', 'gradedTons', 'weightedGrade', 'linearDrilling', 'tumbeAnfo', ...INPUT_ROWS.map(([key]) => key)];

export function sumProduction(records) {
  const total = Object.fromEntries(fields.map(key => [key, 0]));
  for (const record of records) for (const key of fields) {
    total[key] = total[key] == null || record[key] == null ? null : total[key] + record[key];
  }
  return {
    ...total,
    agEq: total.tons != null && Math.abs(total.tons - total.gradedTons) < 1e-7 ? ratio(total.weightedGrade, total.gradedTons) : null,
    gradeCoverage: ratio(total.gradedTons, total.tons),
    drillPerMeter: ratio(total.linearDrilling, total.meters),
    anfoPerTon: ratio(total.tumbeAnfo, total.tumbeTons),
  };
}

export function mineMonth(base, distribution, month) {
  const aux = base.fixed?.Aux || {};
  const sections = new Map(Object.keys(aux).filter(k => /^B\d+$/.test(k) && aux[k]).map(k => [String(aux[k]).toLowerCase(), k.slice(1)]));
  const length = amount(aux.M21, Number.MIN_VALUE);
  const advance = amount(aux.M23, Number.MIN_VALUE) ?? product(length, amount(aux.M22, Number.MIN_VALUE));
  const provision = amount(aux.M39);
  const materialFactor = provision == null ? null : 1 + provision;
  const rollArea = amount(aux.M40, Number.MIN_VALUE) ?? product(amount(aux.M52, Number.MIN_VALUE), amount(aux.M53, Number.MIN_VALUE));
  const anchorsPerM2 = amount(aux.M57) ?? ratio(1, product(amount(aux.M38, Number.MIN_VALUE), amount(aux.M54, Number.MIN_VALUE)));
  const diameter = product(amount(aux.M31), .0254);
  const anfoPerHole = amount(aux.M34) ?? product(Math.PI / 4, product(diameter, diameter),
    length == null || [aux.M32, aux.M29, aux.M30].some(v => amount(v) == null) ? null : Math.max(0, length - Number(aux.M32) - Number(aux.M29) * Number(aux.M30)), amount(aux.M33));
  const quantities = distribution[month] || {};
  const blastQuantities = distribution.blastQuantities?.[month] || {};
  const details = new Map();
  const issues = [];
  for (const work of base.works) {
    const quantity = quantities[work.id];
    if (!(quantity > 1e-9)) continue;
    const row = sections.get(String(work.section).toLowerCase());
    const section = col => amount(aux[col + row]);
    const linear = work.unit === 'm';
    const meters = linear ? quantity : 0;
    const tumbeTons = work.type === 'Tumbe' && work.unit === 't' ? quantity : 0;
    let developmentTons;
    try {
      developmentTons = linear ? meters * productionPerMeter(base, work) : 0;
    } catch (error) {
      developmentTons = null;
      issues.push(error.message);
    }
    const tons = developmentTons == null ? null : developmentTons + tumbeTons;
    const density = amount(aux[work.material === 'Min' ? 'M24' : 'M25'], Number.MIN_VALUE);
    const shots = linear
      ? Object.hasOwn(blastQuantities, work.id) ? blastQuantities[work.id] / 1.5 : ratio(quantity, advance)
      : ratio(tumbeTons, product(section('F'), advance, density));
    const holesPerShot = section('C');
    const holes = product(shots, holesPerShot);
    const loaded = product(shots, section('D'));
    const drillMeters = product(holes, length);
    const anfoKg = product(loaded, anfoPerHole);
    const coverage = amount(aux[work.type === 'Desarrollo' ? 'M37' : work.type === 'Preparación' ? 'M50' : 'M51']);
    const width = section('J'), height = section('K'), lower = amount(aux.M55);
    const perimeter = width > 0 && height > 0 && lower != null ? width + 2 * Math.max(0, height - lower) : null;
    const supportArea = product(quantity, coverage, perimeter);
    const gradesKnown = tons != null && work.agEq != null;
    const detail = {
      meters, developmentTons, tumbeTons, tons,
      gradedTons: gradesKnown ? tons : 0, weightedGrade: gradesKnown ? tons * work.agEq : 0,
      shots, holes, holesPerShot, drillMeters, linearDrilling: linear ? drillMeters : 0,
      primerKg: product(loaded, amount(aux.M29), amount(aux.M28)), anfoKg, tumbeAnfo: tumbeTons > 0 ? anfoKg : 0,
      nonel: product(loaded, amount(aux.M35)), fuses: product(shots, amount(aux.M36)), cord: product(shots, section('E')),
      bits: ratio(drillMeters, amount(aux.M26)), bars: ratio(drillMeters, amount(aux.M27)),
      supportArea, bolts: product(supportArea, anchorsPerM2, materialFactor),
      meshRolls: supportArea === 0 ? 0 : ratio(product(supportArea, materialFactor), rollArea),
    };
    if (INPUT_ROWS.some(([key]) => detail[key] == null)) issues.push('Faltan parámetros de insumos o sostenimiento para ' + work.name + '.');
    details.set(work.id, detail);
  }
  const limit = limitFor(distribution.productionCaps || [], month);
  return { ...sumProduction(details.values()), month, details, issues, productionLimit: Number.isFinite(limit) ? limit : null };
}
