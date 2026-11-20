import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checks, csv, length, newProject, parseProject, stats, template } from './model';
test('Tovex dimensions are exact and unverified mass and price remain absent', () => {
  const p = newProject();
  assert.equal(p.product.diameterMm, 25.4); assert.equal(p.product.lengthMm, 203.2);
  assert.equal(p.product.massKg, null); assert.equal(p.product.price, null);
  assert.equal(stats(p).mass, null); assert.equal(stats(p).cost, null);
  assert.ok(p.layouts.desarrollo.holes.every(h => h.pieces === 0 && h.timeMs === null));
});
test('manual quantities sum per mode, preserving zero cost and supplied mass', () => {
  const p = newProject(); p.layouts.desarrollo.holes[0].pieces = 3; p.layouts.desarrollo.holes[1].pieces = 2;
  p.product.massKg = .123; p.product.price = 0;
  assert.equal(stats(p).pieces, 5); assert.equal(stats(p).mass, .615); assert.equal(stats(p).cost, 0);
  p.mode = 'larga'; assert.equal(stats(p).pieces, 0);
});
test('length uses all three dimensions', () => {
  const p = newProject(), h = p.layouts.desarrollo.holes[0]; h.collar = [1, 2, 3]; h.toe = [4, 6, 15]; assert.equal(length(h), 13);
});
test('round trip preserves both modes, nulls and distinct field records', () => {
  const p = newProject(); p.actual.desarrollo.explosiveKg = 9; p.actual.larga.notes = 'Otra fecha';
  assert.deepEqual(parseProject(JSON.parse(JSON.stringify(p))), p);
});
test('rejects duplicate ids, nonfinite coordinates and malformed tuples', () => {
  const p = newProject(); p.layouts.desarrollo.holes[1].id = p.layouts.desarrollo.holes[0].id;
  assert.throws(() => parseProject(p), /duplicado/);
  const p2 = newProject(); p2.layouts.larga.holes[0].toe[0] = Infinity; assert.throws(() => parseProject(p2), /numérico/);
  const p3 = newProject(); (p3.layouts.larga.holes[0].toe as number[]).pop(); assert.throws(() => parseProject(p3), /coordenada/);
});
test('rejects negative quantities, fractional counts, unexpected material and excessive files', () => {
  for (const value of [-1, .5, 100001]) { const p = newProject(); p.layouts.desarrollo.holes[0].pieces = value; assert.throws(() => parseProject(p)); }
  const p = newProject(); p.product.massKg = 0; assert.throws(() => parseProject(p));
  const p2 = newProject(); p2.product.diameterMm = 30; assert.throws(() => parseProject(p2), /catálogo/);
  const p3 = newProject(); p3.layouts.desarrollo.holes = Array(5001).fill(p3.layouts.desarrollo.holes[0]); assert.throws(() => parseProject(p3), /5,000/);
});
test('detects zero-length, out-of-frame and relief quantities without suggesting loads', () => {
  const p = newProject(), h = p.layouts.desarrollo.holes[4]; h.toe = [...h.collar]; h.role = 'alivio'; h.pieces = 2; h.toe[0] = h.collar[0] = -1;
  const messages = checks(p); assert.equal(messages.filter(m => m.level === 'warn').length, 3);
});
test('CSV quotes text and neutralizes spreadsheet formulas without corrupting coordinates', () => {
  const p = newProject(); p.name = '=HYPERLINK("test")'; p.layouts.desarrollo.holes[0].collar[0] = -1;
  const text = csv(p); assert.ok(text.startsWith('\uFEFF')); assert.ok(text.includes('"\'=HYPERLINK(""test"")"')); assert.ok(text.includes('"-1"')); assert.ok(!text.includes('undefined'));
});
test('longhole template respects ring metadata and leaves scheduling and quantity empty', () => {
  const p = newProject(), l = p.layouts.larga; l.rings = 4; l.spacing = 3;
  const holes = template('larga', l); assert.equal(holes.length, 20); assert.ok(holes.every(h => h.collar[1] === (h.ring - 1) * 3 && h.timeMs === null && h.pieces === 0));
});
test('reference tonnage remains absent until a density is supplied', () => {
  const p = newProject(); assert.equal(stats(p).tonnes, null); p.density = 2.7; assert.equal(stats(p).volume, 48); assert.ok(Math.abs(stats(p).tonnes! - 129.6) < 1e-9);
});
