import {weekAt,tick} from './engine.mjs';
// Scenarios follow the current work catalog; scenario-specific settings survive by ID.
export function reconcileProject(base,input){
 const p=JSON.parse(JSON.stringify(input)),ids=new Set(base.works.map(w=>w.id)),notes=[];
 p.works||={};p.rates||=[];p.pauses||=[];p.capacities||=[];
 for(const id of Object.keys(p.works))if(!ids.has(id)){delete p.works[id];notes.push('Obra retirada del escenario: '+id)}
 p.rates=p.rates.filter(r=>ids.has(r.workId));p.pauses=p.pauses.filter(r=>ids.has(r.workId));
 for(const w of base.works){const initial=base.initial?.find(i=>i.id===w.id);if(!p.works[w.id]){const rate=initial?.rate;if(!Number.isFinite(rate)||rate<0)throw Error('Define un ritmo inicial válido para '+w.id);p.works[w.id]={quantity:Math.min(w.planned,w.target),earliest:initial.earliest||p.start,priority:w.priority,resourceGroup:w.resourceGroup};p.rates.push({planId:p.id,workId:w.id,week:weekAt(tick(p.start)),rate});notes.push('Obra incorporada con los valores iniciales del proyecto: '+w.id)}
  else if(p.works[w.id].quantity>w.target){p.works[w.id].quantity=w.target;notes.push('Alcance limitado al nuevo objetivo total: '+w.id)}
 }
 const signature=JSON.stringify({rates:p.rates,pauses:p.pauses,works:p.works,capacities:p.capacities,dependencies:base.dependencies});
 if(p.levelingSource&&p.levelingSource!==signature){delete p.leveledSegments;delete p.levelingSource;notes.push('Se recalculó la ejecución; revisa de nuevo el ajuste a capacidad.')}
 if(p.projectDependencies&&JSON.stringify(p.projectDependencies)!==JSON.stringify(base.dependencies))notes.push('Precedencias actualizadas desde el proyecto.');
 p.projectDependencies=JSON.parse(JSON.stringify(base.dependencies));p.projectUpdates=[...new Set([...(p.projectUpdates||[]),...notes])];return p;
}
export function assignModelRows(works){const used=new Set(works.filter(w=>Number.isInteger(w.sourceRow)&&w.sourceRow>=2).map(w=>w.sourceRow)),seen=new Set();let next=2;for(const w of works){if(!Number.isInteger(w.sourceRow)||w.sourceRow<2||seen.has(w.sourceRow)){while(used.has(next))next++;w.sourceRow=next;used.add(next)}seen.add(w.sourceRow)}return works}
