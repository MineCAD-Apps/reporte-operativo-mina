export type Vec = [number, number, number];
export type Mode = 'desarrollo' | 'larga';
export type Role = 'produccion' | 'contorno' | 'alivio';
export interface Hole { id: string; ring: number; collar: Vec; toe: Vec; role: Role; pieces: number; timeMs: number | null }
export interface Layout { width: number; height: number; depth: number; spacing: number; rings: number; holes: Hole[] }
export interface Product { name: string; diameterMm: number; lengthMm: number; massKg: number | null; price: number | null; currency: 'MXN' | 'USD'; source: string }
export interface Actual { advance: number | null; tonnes: number | null; explosiveKg: number | null; notes: string }
export interface Project { schema: 'minecad-blast/1'; id: string; name: string; mine: string; location: string; author: string; mode: Mode; layouts: Record<Mode, Layout>; product: Product; density: number | null; actual: Record<Mode, Actual>; updatedAt: string }
export interface Saved { id: string; savedAt: string; project: Project }
export const COLORS: Record<Role, string> = { produccion: '#41b3ed', contorno: '#e7ae57', alivio: '#acbacc' };
export const ROLE_LABEL: Record<Role, string> = { produccion: 'Producción', contorno: 'Contorno', alivio: 'Alivio' };
export function newProject(): Project {
  const project: Project = { schema: 'minecad-blast/1', id: crypto.randomUUID(), name: 'Nuevo diseño', mine: '', location: '', author: '', mode: 'desarrollo', layouts: { desarrollo: { width: 4, height: 4, depth: 3, spacing: 2, rings: 1, holes: [] }, larga: { width: 6, height: 12, depth: 10, spacing: 2, rings: 3, holes: [] } }, product: { name: 'Tovex 100 · bombillo 1″ × 8″', diameterMm: 25.4, lengthMm: 203.2, massKg: null, price: null, currency: 'MXN', source: 'Dimensiones proporcionadas por el usuario. Peso y precio pendientes de la ficha de su proveedor.' }, density: null, actual: { desarrollo: { advance: null, tonnes: null, explosiveKg: null, notes: '' }, larga: { advance: null, tonnes: null, explosiveKg: null, notes: '' } }, updatedAt: new Date().toISOString() };
  project.layouts.desarrollo.holes = template('desarrollo', project.layouts.desarrollo);
  project.layouts.larga.holes = template('larga', project.layouts.larga);
  return project;
}
export function template(mode: Mode, layout: Layout): Hole[] {
  const make = (ring: number, collar: Vec, toe: Vec, role: Role): Hole => ({ id: crypto.randomUUID(), ring, collar, toe, role, pieces: 0, timeMs: null });
  if (mode === 'desarrollo') return Array.from({ length: 9 }, (_, i) => { const x = layout.width * ((i % 3) + 1) / 4, z = layout.height * (Math.floor(i / 3) + 1) / 4; return make(1, [x, 0, z], [x, layout.depth, z], i === 4 ? 'alivio' : i % 2 === 0 ? 'contorno' : 'produccion'); });
  return Array.from({ length: layout.rings }, (_, r) => Array.from({ length: 5 }, (_, h) => make(r + 1, [layout.width / 2, r * layout.spacing, 0], [layout.width * (h + 1) / 6, r * layout.spacing, layout.height], h === 0 || h === 4 ? 'contorno' : 'produccion'))).flat();
}
export function length(h: Hole) { return Math.hypot(...h.toe.map((v, i) => v - h.collar[i])); }
export function stats(project: Project) {
  const layout = project.layouts[project.mode], holes = layout.holes;
  const pieces = holes.reduce((n, h) => n + h.pieces, 0);
  const mass = project.product.massKg === null ? null : pieces * project.product.massKg;
  const cost = project.product.price === null ? null : pieces * project.product.price;
  const volume = layout.width * layout.height * (project.mode === 'desarrollo' ? layout.depth : layout.rings * layout.spacing);
  return { holes: holes.length, metres: holes.reduce((n, h) => n + length(h), 0), pieces, mass, cost, volume, tonnes: project.density === null ? null : volume * project.density };
}
export function checks(project: Project): { level: 'info' | 'warn'; text: string }[] {
  const layout = project.layouts[project.mode], holes = layout.holes;
  const result: { level: 'info' | 'warn'; text: string }[] = [];
  if (!holes.length) result.push({ level: 'warn', text: 'El diseño no contiene barrenos.' });
  if (holes.some(h => length(h) < 0.01)) result.push({ level: 'warn', text: 'Hay barrenos con longitud inferior a 1 cm.' });
  if (holes.some(h => [...[h.collar, h.toe]].some(p => p[0] < 0 || p[0] > layout.width || p[2] < 0 || p[2] > layout.height))) result.push({ level: 'warn', text: 'Hay coordenadas fuera del ancho o alto de referencia. Revisa la geometría.' });
  if (holes.some(h => h.role === 'alivio' && h.pieces > 0)) result.push({ level: 'warn', text: 'Un barreno de alivio tiene piezas registradas. Revisa la captura.' });
  if (project.product.massKg === null) result.push({ level: 'info', text: 'Falta el peso real por bombillo: la masa total queda pendiente.' });
  if (project.product.price === null) result.push({ level: 'info', text: 'Falta el precio por bombillo: el costo queda pendiente.' });
  if (holes.some(h => h.role !== 'alivio' && h.timeMs === null)) result.push({ level: 'info', text: 'Hay barrenos sin tiempo capturado. La reproducción solo incluye tiempos definidos.' });
  return result;
}
const obj = (x: unknown): Record<string, unknown> => { if (!x || typeof x !== 'object' || Array.isArray(x)) throw Error('Estructura JSON inválida.'); return x as Record<string, unknown>; };
const str = (x: unknown, max = 200): string => { if (typeof x !== 'string' || x.length > max) throw Error('Texto inválido o demasiado largo.'); return x; };
const num = (x: unknown, min: number, max: number): number => { if (typeof x !== 'number' || !Number.isFinite(x) || x < min || x > max) throw Error('Hay un valor numérico fuera de rango.'); return x; };
const nullable = (x: unknown, min: number, max: number) => x === null ? null : num(x, min, max);
function vec(x: unknown): Vec { if (!Array.isArray(x) || x.length !== 3) throw Error('Una coordenada debe contener X, Y, Z.'); return x.map(n => num(n, -1e7, 1e7)) as Vec; }
export function parseProject(input: unknown): Project {
  const p = obj(input);
  if (p.schema !== 'minecad-blast/1' || !['desarrollo', 'larga'].includes(String(p.mode))) throw Error('El archivo no es un diseño compatible con MINECAD.');
  const layouts = obj(p.layouts), parsed = {} as Record<Mode, Layout>;
  for (const mode of ['desarrollo', 'larga'] as Mode[]) {
    const l = obj(layouts[mode]);
    const rings = num(l.rings, 1, 100); if (!Number.isInteger(rings)) throw Error('Número de anillos inválido.');
    if (!Array.isArray(l.holes) || l.holes.length > 5000) throw Error('Máximo 5,000 barrenos por modalidad.');
    const ids = new Set<string>();
    const holes = l.holes.map(raw => { const h = obj(raw), id = str(h.id, 100), ring = num(h.ring, 1, rings), pieces = num(h.pieces, 0, 100000), timeMs = nullable(h.timeMs, 0, 1e7); if (ids.has(id) || !id || !Number.isInteger(ring) || !Number.isInteger(pieces) || (timeMs !== null && !Number.isInteger(timeMs)) || !['produccion', 'contorno', 'alivio'].includes(String(h.role))) throw Error('Barreno inválido o identificador duplicado.'); ids.add(id); return { id, ring, collar: vec(h.collar), toe: vec(h.toe), role: h.role as Role, pieces, timeMs }; });
    parsed[mode] = { width: num(l.width, .1, 1000), height: num(l.height, .1, 1000), depth: num(l.depth, .1, 1000), spacing: num(l.spacing, .1, 1000), rings, holes };
  }
  const material = obj(p.product), rawActual = obj(p.actual);
  const actual = {} as Record<Mode, Actual>;
  for (const mode of ['desarrollo', 'larga'] as Mode[]) {
    const a = obj(rawActual[mode]);
    actual[mode] = { advance: nullable(a.advance, 0, 1e6), tonnes: nullable(a.tonnes, 0, 1e9), explosiveKg: nullable(a.explosiveKg, 0, 1e9), notes: str(a.notes, 10000) };
  }
  if (material.name !== 'Tovex 100 · bombillo 1″ × 8″' || material.diameterMm !== 25.4 || material.lengthMm !== 203.2) throw Error('Esta versión admite el catálogo Tovex 100 de 1″ × 8″.');
  if (!['MXN', 'USD'].includes(String(material.currency))) throw Error('Moneda inválida.');
  const updatedAt = str(p.updatedAt, 50); if (!Number.isFinite(Date.parse(updatedAt))) throw Error('Fecha inválida.');
  return { schema: 'minecad-blast/1', id: str(p.id, 100), name: str(p.name), mine: str(p.mine), location: str(p.location), author: str(p.author), mode: p.mode as Mode, layouts: parsed, product: { name: str(material.name), diameterMm: num(material.diameterMm, .1, 1000), lengthMm: num(material.lengthMm, 1, 10000), massKg: nullable(material.massKg, .000001, 1000), price: nullable(material.price, 0, 1e7), currency: material.currency as 'MXN' | 'USD', source: str(material.source, 2000) }, density: nullable(p.density, .001, 30), actual, updatedAt };
}
export function csv(project: Project) {
  const cell = (value: unknown) => { let s = String(value ?? ''); if (/^[=+@-]/.test(s) && typeof value !== 'number') s = "'" + s; return '"' + s.replaceAll('"', '""') + '"'; };
  const rows: unknown[][] = [['Diseño', 'Modalidad', 'ID', 'Anillo', 'Tipo', 'Collar X (m)', 'Collar Y (m)', 'Collar Z (m)', 'Fondo X (m)', 'Fondo Y (m)', 'Fondo Z (m)', 'Longitud (m)', 'Piezas', 'Tiempo (ms)', 'Producto', 'Peso por pieza (kg)', 'Precio por pieza', 'Moneda']];
  for (const h of project.layouts[project.mode].holes) rows.push([project.name, project.mode, h.id, h.ring, ROLE_LABEL[h.role], ...h.collar, ...h.toe, length(h), h.pieces, h.timeMs, project.product.name, project.product.massKg, project.product.price, project.product.currency]);
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
