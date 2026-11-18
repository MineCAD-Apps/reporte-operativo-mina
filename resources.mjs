export const RESOURCE_ROWS = [['crews','Cuadrillas de barrenación'], ['support','Cuadrillas de sostenimiento'], ['crewTotal','Total de cuadrillas']];
export const CREW_INPUTS=[
 ['raise','Contrapozo · barrenos por turno',12,1,15],
 ['overbreak','Reserva de barrenación por desborde (%)',2,0,100],
 ['support','Anclado y enmallado · m² terminados por turno',null,0.01,null]
];
export function crewSettings(input={}){
 return Object.fromEntries(CREW_INPUTS.map(([key,label,fallback,min,max])=>{
  const raw=input?.[key];if(raw==null||raw==='')return [key,fallback];
  const value=Number(raw);
  if(!Number.isFinite(value)||value<min||(max!=null&&value>max))throw Error('Revisa el rendimiento o porcentaje: '+label);
  return [key,value];
 }));
}
const up=n=>n>0?Math.max(1,Math.ceil(n-1e-9)):0;
export function monthlyResources({month,works,quantities,blastQuantities={},details,crewInputs,isRaise=()=>false}){
 const [year,m]=month.split('-').map(Number);
 const days=new Date(Date.UTC(year,m,0)).getUTCDate();
 let workdays=0;
 for(let i=1;i<=days;i++)if(new Date(Date.UTC(year,m-1,i)).getUTCDay()!==0)workdays++;
 const holes={Desarrollo:0,Preparación:0,Tumbe:0},issues=[],pending=new Set();
 const settings=crewSettings(crewInputs);
 let raiseHoles=0,supportArea=0,bolts=0,rolls=0;
 for(const w of works){
  const q=quantities[w.id];
  if(!(q>1e-9))continue;
  const d=details.get(w.id)||{};
  if(w.type==='Tumbe')holes.Tumbe+=q;
  else if(Object.hasOwn(holes,w.type)&&Number.isFinite(d.holesPerShot)&&d.holesPerShot>0){
   const n=(blastQuantities[w.id]??q)/1.5*d.holesPerShot;
   holes[w.type]+=n;if(isRaise(w))raiseHoles+=n;
  }
  else {pending.add('crews');issues.push(w.name+': faltan barrenos de la sección.');}
  if(!Number.isFinite(d.supportArea)||d.supportArea<0){pending.add('support');issues.push(w.name+': falta validar la superficie de sostenimiento.');}
  else {supportArea+=d.supportArea;bolts=bolts==null||d.bolts==null?null:bolts+d.bolts;rolls=rolls==null||d.meshRolls==null?null:rolls+d.meshRolls;}
 }
 const totalHoles=Object.values(holes).reduce((a,b)=>a+b,0);
 const drillingShifts=(totalHoles-raiseHoles)/50+raiseHoles/settings.raise;
 const reserveShifts=drillingShifts*settings.overbreak/100;
 const supportShifts=supportArea===0?0:settings.support==null?null:supportArea/settings.support;
 if(supportArea>0&&supportShifts===null)issues.push('Falta capturar el rendimiento de anclado y enmallado.');
 const requirements={crews:pending.has('crews')?null:up((drillingShifts+reserveShifts)/workdays),support:pending.has('support')||supportShifts===null?null:up(supportShifts/workdays)};
 requirements.crewTotal=requirements.crews===null||requirements.support===null?null:requirements.crews+requirements.support;
 return {month,workdays,holes,totalHoles,requirements,issues,settings,raiseHoles,drillingShifts,reserveShifts,supportArea,bolts,rolls,supportShifts};
}
