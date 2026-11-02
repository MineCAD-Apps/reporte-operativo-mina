// Estimates through delivery to the plant. Geological values already include recovery.
const positive=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(+v)&&+v>0;
const nonnegative=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(+v)&&+v>=0;
export function calculateEconomics({works,quantities,cost,catalog,mineId,developmentFactor=.6,mineralDensity=2.7,wasteDensity=2.5}){
 const settings=catalog?.settings||{},fx=positive(settings.usdMxn)?+settings.usdMxn:null;
 const freightOK=nonnegative(settings.tripMxn)&&positive(settings.tripTons);
 const rows=[],issues=[];let tons=0,value=0,unpricedTons=0;
 for(const w of works){
  const q=+quantities[w.id]||0;if(q<=1e-9)continue;
  const t=w.unit==='t'&&w.type==='Tumbe'?q:w.type==='Desarrollo'&&w.material==='Min'?(+cost.details?.[w.id]?.mineralTons||0)*developmentFactor:0;
  if(t<=1e-9)continue;tons+=t;
  const assignment=catalog?.assignments?.find(a=>a.mineId===mineId&&a.workId===w.id)||{};
  const z=catalog?.zones?.find(z=>z.mineId===mineId&&z.id===assignment.zoneId);
  const widthsOK=positive(assignment.veinWidth)&&positive(assignment.miningWidth)&&positive(mineralDensity)&&positive(wasteDensity);
  const oreWidth=widthsOK?Math.min(+assignment.veinWidth,+assignment.miningWidth):0;
  const factor=widthsOK?oreWidth*mineralDensity/(oreWidth*mineralDensity+Math.max(0,+assignment.miningWidth-oreWidth)*wasteDensity):null;
  const priced=!!z&&nonnegative(z.valueUsd)&&widthsOK;
  const perTon=priced?+z.valueUsd*factor:null,amount=priced?t*perTon:null;
  if(priced)value+=amount;else{unpricedTons+=t;issues.push(w.name+': falta zona, valor o ancho');}
  const freight=freightOK?t/+settings.tripTons*+settings.tripMxn:null;
  rows.push({workId:w.id,name:w.name,zone:z?.name||'',tons:t,veinWidth:assignment.veinWidth??null,miningWidth:assignment.miningWidth??null,dilution:factor===null?null:1-factor,valuePerTonUsd:perTon,valueUsd:amount,haulMxn:freight});
 }
 if(Math.abs(tons-(+cost.tons||0))>1e-5)throw Error('No concilian toneladas económicas con toneladas a producir');
 if(!fx)issues.push('Falta tipo de cambio MXN/USD válido');
 if(!freightOK)issues.push('Falta tarifa o capacidad de acarreo mina–planta');
 const valueUsd=unpricedTons>1e-9?null:value,haulMxn=freightOK?tons/+settings.tripTons*+settings.tripMxn:null;
 const mineMxn=Number.isFinite(cost.total)?cost.total:null,plantMxn=haulMxn===null||mineMxn===null?null:mineMxn+haulMxn;
 const plantUsd=fx&&plantMxn!==null?plantMxn/fx:null,marginUsd=valueUsd===null||plantUsd===null?null:valueUsd-plantUsd;
 return {rows,issues,tons,unpricedTons,valueUsd,haulMxn,haulUsd:fx&&haulMxn!==null?haulMxn/fx:null,mineUsd:fx&&mineMxn!==null?mineMxn/fx:null,plantMxn,plantUsd,marginUsd,marginPct:valueUsd>0&&marginUsd!==null?marginUsd/valueUsd:null,fx};
}
export function economicTotal(records,key){
 if(!records.length)return null;
 if(key==='marginPct'){const v=economicTotal(records,'valueUsd'),m=economicTotal(records,'marginUsd');return v>0&&m!==null?m/v:null;}
 const vals=records.map(r=>r.economics?.[key]);
 return vals.every(v=>typeof v==='number'&&Number.isFinite(v))?vals.reduce((a,b)=>a+b,0):null;
}
