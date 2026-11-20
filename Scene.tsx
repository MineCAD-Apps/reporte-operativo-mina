import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { COLORS, type Hole, type Layout, type Mode } from './model';
export interface Solid { name: string; object: THREE.Object3D; triangles: number }
export async function readSolid(file: File): Promise<Solid> {
  if (file.size > 40 * 1024 * 1024) throw Error('El sólido supera 40 MB. Simplifica la malla antes de cargarla.');
  let object: THREE.Object3D;
  if (/\.stl$/i.test(file.name)) { const geometry = new STLLoader().parse(await file.arrayBuffer()); geometry.computeVertexNormals(); object = new THREE.Mesh(geometry); }
  else if (/\.obj$/i.test(file.name)) object = new OBJLoader().parse(await file.text());
  else throw Error('Selecciona un sólido STL u OBJ.');
  let triangles = 0;
  object.traverse(child => { if (child instanceof THREE.Mesh) { const position = child.geometry.getAttribute('position'); if (!position) return; triangles += child.geometry.index ? child.geometry.index.count / 3 : position.count / 3; if (Array.from(position.array).some(n => !Number.isFinite(n))) throw Error('La malla contiene coordenadas inválidas.'); child.material = new THREE.MeshStandardMaterial({ color: '#3e9c96', side: THREE.DoubleSide, transparent: true, opacity: .26, depthWrite: false, roughness: .8 }); } });
  if (!triangles || triangles > 400000) throw Error('La malla debe contener entre 1 y 400,000 triángulos.');
  if (new THREE.Box3().setFromObject(object).isEmpty()) throw Error('El sólido no contiene geometría.');
  return { name: file.name, object, triangles };
}
interface Props { layout: Layout; mode: Mode; ring: number; selected: string | null; select: (id: string) => void; time: number; activeTimeline: boolean; solid: Solid | null; fitSolid: boolean; resetKey: number; labels: boolean }
export function Scene3D(props: Props) {
  const root = useRef<HTMLDivElement>(null), [error, setError] = useState('');
  const latest = useRef(props); latest.current = props;
  const runtime = useRef<{ refresh: () => void; update: () => void } | null>(null);
  useEffect(() => {
    const host = root.current!; let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); } catch { setError('Este equipo no pudo iniciar WebGL. La vista 2D sigue disponible.'); return; }
    setError('');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor('#0d2035'); host.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-label', 'Modelo tridimensional de barrenos. Arrastra para girar y usa la rueda para acercar.');
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(42, 1, .01, 100000);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight('#d8eeff', '#1b2b43', 2.6)); const sun = new THREE.DirectionalLight('#ffffff', 2); sun.position.set(10, 30, 20); scene.add(sun);
    let content = new THREE.Group(); scene.add(content);
    const dispose = (group: THREE.Object3D) => group.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line || o instanceof THREE.Sprite) { o.geometry?.dispose(); const materials = Array.isArray(o.material) ? o.material : [o.material]; materials.forEach(m => { if ('map' in m && m.map instanceof THREE.Texture) m.map.dispose(); m.dispose(); }); } });
    const map = (v: number[]) => new THREE.Vector3(v[0], v[2], -v[1]);
    let lastReset = -1;
    function refresh() {
      dispose(content); scene.remove(content); content = new THREE.Group(); scene.add(content);
      const p = latest.current, l = p.layout, blockLength = p.mode === 'desarrollo' ? l.depth : Math.max(l.spacing, (l.rings - 1) * l.spacing);
      const box = new THREE.BoxGeometry(l.width, l.height, blockLength); const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: '#496986', transparent: true, opacity: .6 })); box.dispose(); edges.position.set(l.width / 2, l.height / 2, -blockLength / 2); content.add(edges);
      const grid = new THREE.GridHelper(Math.max(l.width, blockLength) * 2, 20, '#416080', '#243e58'); grid.position.set(l.width / 2, -.04, -blockLength / 2); content.add(grid);
      l.holes.forEach((h, i) => {
        const start = map(h.collar), end = map(h.toe), dir = end.clone().sub(start), len = dir.length(); if (!len) return;
        const fired = p.activeTimeline && h.timeMs !== null && h.timeMs <= p.time;
        const color = h.id === p.selected ? '#ffffff' : fired ? '#f4ba62' : COLORS[h.role];
        const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: h.ring === p.ring ? 1 : .26, emissive: fired ? '#6f3904' : '#000000' });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(h.id === p.selected ? .045 : .028, .028, len, 8), material); mesh.position.copy(start).add(end).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()); mesh.userData.holeId = h.id; content.add(mesh);
        const marker = new THREE.Mesh(new THREE.SphereGeometry(.065, 8, 6), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: h.ring === p.ring ? 1 : .26 })); marker.position.copy(end); marker.userData.holeId = h.id; content.add(marker);
        if (p.labels && l.holes.length <= 200) { const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 64; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#e5f3ff'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 64, 40); const texture = new THREE.CanvasTexture(canvas); const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false })); sprite.position.copy(end).add(new THREE.Vector3(.17, .15, 0)); sprite.scale.set(.6, .3, 1); content.add(sprite); }
      });
      if (p.solid) {
        const solid = p.solid.object.clone(true);
        solid.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry = o.geometry.clone(); o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone(); } });
        const transform = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1); solid.applyMatrix4(transform);
        if (p.fitSolid) { const bounds = new THREE.Box3().setFromObject(solid), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3()), factor = Math.max(l.width, l.height, blockLength) / Math.max(size.x, size.y, size.z); solid.position.sub(center); const group = new THREE.Group(); group.add(solid); group.scale.setScalar(factor); group.position.set(l.width / 2, l.height / 2, -blockLength / 2); content.add(group); }
        else content.add(solid);
      }
      if (p.resetKey !== lastReset) { const extent = Math.max(l.width, l.height, blockLength), center = new THREE.Vector3(l.width / 2, l.height / 2, -blockLength / 2); controls.target.copy(center); camera.position.copy(center).add(new THREE.Vector3(extent * 1.1, extent * .75, extent * 1.6)); camera.far = Math.max(10000, extent * 100); camera.updateProjectionMatrix(); lastReset = p.resetKey; controls.update(); }
    }
    function update() {
      const p = latest.current, lookup = new Map(p.layout.holes.map(h => [h.id, h]));
      content.children.forEach(object => {
        if (!(object instanceof THREE.Mesh) || !object.userData.holeId) return;
        const h = lookup.get(object.userData.holeId); if (!h) return;
        const fired = p.activeTimeline && h.timeMs !== null && h.timeMs <= p.time;
        const material = object.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
        material.color.set(h.id === p.selected ? '#ffffff' : fired ? '#f4ba62' : COLORS[h.role]);
        material.opacity = h.ring === p.ring ? 1 : .26;
        if (material instanceof THREE.MeshStandardMaterial) material.emissive.set(fired ? '#6f3904' : '#000000');
      });
    }
    runtime.current = { refresh, update }; refresh();
    const resize = new ResizeObserver(() => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / Math.max(h, 1); camera.updateProjectionMatrix(); }); resize.observe(host);
    const ray = new THREE.Raycaster(); let down = [0, 0];
    const pointerdown = (e: PointerEvent) => { down = [e.clientX, e.clientY]; };
    const pointerup = (e: PointerEvent) => { if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return; const rect = renderer.domElement.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera); const hit = ray.intersectObjects(content.children, true).find(h => h.object.userData.holeId); if (hit) latest.current.select(hit.object.userData.holeId); };
    renderer.domElement.addEventListener('pointerdown', pointerdown); renderer.domElement.addEventListener('pointerup', pointerup);
    let frame = 0; const tick = () => { frame = requestAnimationFrame(tick); controls.update(); renderer.render(scene, camera); }; tick();
    return () => { cancelAnimationFrame(frame); resize.disconnect(); controls.dispose(); dispose(content); renderer.domElement.removeEventListener('pointerdown', pointerdown); renderer.domElement.removeEventListener('pointerup', pointerup); renderer.dispose(); renderer.domElement.remove(); runtime.current = null; };
  }, []);
  useEffect(() => runtime.current?.refresh(), [props.layout, props.solid, props.fitSolid, props.resetKey, props.mode, props.labels]);
  useEffect(() => runtime.current?.update(), [props.ring, props.selected, props.time, props.activeTimeline]);
  return <div className="scene3d" ref={root}>{error && <p className="webgl-error">{error}</p>}<span className="scene-corner">X / ancho · Y / rumbo · Z / elevación</span></div>;
}
interface PlanProps { layout: Layout; mode: Mode; ring: number; selected: string | null; select: (id: string) => void; edit: (id: string, toe: [number, number]) => void; add: (x: number, z: number) => void; tool: 'select' | 'add'; labels: boolean; time: number; activeTimeline: boolean }
export function Plan2D(p: PlanProps) {
  const svg = useRef<SVGSVGElement>(null), drag = useRef<{ id: string; x: number; z: number; moved: boolean } | null>(null), [preview, setPreview] = useState<{ id: string; x: number; z: number } | null>(null);
  const W = 800, H = 490, pad = 66, scale = Math.min((W - pad * 2) / p.layout.width, (H - pad * 2) / p.layout.height), ox = (W - p.layout.width * scale) / 2, oy = (H + p.layout.height * scale) / 2;
  const point = (e: React.PointerEvent) => { const pt = svg.current!.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const local = pt.matrixTransform(svg.current!.getScreenCTM()!.inverse()); return [Math.max(0, Math.min(p.layout.width, (local.x - ox) / scale)), Math.max(0, Math.min(p.layout.height, (oy - local.y) / scale))] as [number, number]; };
  const holes = p.layout.holes.filter(h => h.ring === p.ring);
  return <svg ref={svg} className={'plan2d ' + (p.tool === 'add' ? 'adding' : '')} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Editor 2D de barrenos; selecciona un fondo y arrástralo para editar" onPointerDown={e => { if (p.tool === 'add' && (e.target as SVGElement).dataset.hole !== '1') { const [x, z] = point(e); p.add(x, z); } }} onPointerMove={e => { if (drag.current) { const [x, z] = point(e); drag.current = { ...drag.current, x, z, moved: true }; setPreview({ id: drag.current.id, x, z }); } }} onPointerUp={() => { if (drag.current?.moved) p.edit(drag.current.id, [drag.current.x, drag.current.z]); drag.current = null; setPreview(null); }} onPointerCancel={() => { drag.current = null; setPreview(null); }}>
    <defs><pattern id="grid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#1d3851" strokeWidth=".7" /></pattern></defs>
    <rect width={W} height={H} fill="url(#grid)" />
    <rect x={ox} y={oy - p.layout.height * scale} width={p.layout.width * scale} height={p.layout.height * scale} rx="3" fill="#122d46" stroke="#5d819e" strokeWidth="1.5" />
    <line x1={W / 2} x2={W / 2} y1={oy - p.layout.height * scale - 12} y2={oy + 12} stroke="#42617c" strokeDasharray="6 6" />
    <text x={W / 2} y={oy + 33} textAnchor="middle" fill="#b3c9dd" fontSize="14">{p.layout.width.toFixed(2)} m</text>
    <text x={ox - 18} y={H / 2} textAnchor="middle" fill="#b3c9dd" fontSize="14" transform={`rotate(-90 ${ox - 18} ${H / 2})`}>{p.layout.height.toFixed(2)} m</text>
    {holes.map(h => { const index = p.layout.holes.indexOf(h) + 1, x = preview?.id === h.id ? preview.x : h.toe[0], z = preview?.id === h.id ? preview.z : h.toe[2], px = ox + x * scale, py = oy - z * scale, fired = p.activeTimeline && h.timeMs !== null && h.timeMs <= p.time, color = fired ? '#f4ba62' : COLORS[h.role]; return <g key={h.id}>
      {p.mode === 'larga' && <line x1={ox + h.collar[0] * scale} y1={oy - h.collar[2] * scale} x2={px} y2={py} stroke={color} strokeWidth={h.id === p.selected ? 2.5 : 1.5} opacity=".7" />}
      {h.id === p.selected && <circle cx={px} cy={py} r="16" fill="#ffffff12" stroke="#ffffff" strokeWidth="1" />}
      <circle data-hole="1" cx={px} cy={py} r={h.role === 'alivio' ? 8 : 6} fill={h.role === 'alivio' ? '#0d2035' : color} stroke={color} strokeWidth="2" style={{ cursor: 'grab' }} onPointerDown={e => { e.stopPropagation(); p.select(h.id); drag.current = { id: h.id, x, z, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); }}><title>{`B${index} · ${h.role} · X ${x.toFixed(2)}, Z ${z.toFixed(2)} m`}</title></circle>
      {p.labels && <text x={px + 11} y={py - 10} fill="#d9e8f7" fontSize="13" pointerEvents="none">B{index}</text>}
    </g>; })}
    <text x="22" y="27" fill="#88a6bf" fontSize="13">{p.mode === 'desarrollo' ? 'SECCIÓN DEL FRENTE' : `SECCIÓN TRANSVERSAL · ANILLO ${p.ring}`}</text>
    {!holes.length && <text x={W / 2} y={H / 2} textAnchor="middle" fill="#b3c9dd" fontSize="18">Usa «Añadir barreno» para comenzar</text>}
  </svg>;
}
