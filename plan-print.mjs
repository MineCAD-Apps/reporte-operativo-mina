const labels={weeks:'Programa semanal',months:'Plan mensual',annual:'Resumen anual'};
const number=new Intl.NumberFormat('es-MX',{maximumFractionDigits:2});
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

function weeklyTables(works,weeks,result){
 if(!works.length)return '<p>No hay obras que coincidan con los filtros.</p>';
 const sections=[];
 for(let offset=0;offset<weeks.length;offset+=12){
  const block=weeks.slice(offset,offset+12);
  sections.push(`<section class="print-week-block"><table><thead>
   <tr><th colspan="${block.length+2}">Semanas del ${block[0]} al ${block.at(-1)} · fechas de inicio</th></tr>
   <tr><th>Obra</th><th>Unidad</th>${block.map(w=>`<th>${w.slice(8)}/${w.slice(5,7)}</th>`).join('')}</tr>
   </thead><tbody>${works.map(work=>{
    const row=result.rows[work.id];
    return `<tr><th>${escapeHtml(work.name)}<small>${escapeHtml(work.id)} · ${escapeHtml(work.type)}</small></th>
      <td>${escapeHtml(work.unit)}</td>${block.map(week=>{
       const quantity=row.weekly[week];
       return quantity?`<td class="print-active" data-type="${escapeHtml(work.type)}">${number.format(quantity)}</td>`:'<td>—</td>';
      }).join('')}</tr>`;
   }).join('')}</tbody></table></section>`);
 }
 return sections.join('');
}

export function printActivePlan({name,mine,dirty,tab,period,type,search,source,works,weeks,result,monthlyDetails=[]}){
 const root=document.createElement('article');
 root.id='minecad-print';
 root.hidden=true;
 root.innerHTML=`<h1>${escapeHtml(name)}</h1>
  <p>${escapeHtml(mine)} · ${labels[tab]} · ${escapeHtml(period)}${dirty?' · Borrador sin guardar':''}</p>
  ${tab!=='annual'&&(type||search)?`<p>Obras visibles · ${escapeHtml(type||'Todos los tipos')}${search?' · Búsqueda '+escapeHtml(search):''}</p>`:''}`;
 if(tab==='weeks')root.insertAdjacentHTML('beforeend',weeklyTables(works,weeks,result));
 else {
  const report=source.cloneNode(true);
  report.removeAttribute('id');
  root.append(report);
 }
 for(const month of monthlyDetails){
  const section=document.createElement('section');
  section.className='print-month-appendix';
  section.innerHTML=month.html;
  root.append(section);
 }
 document.body.append(root);
 document.body.classList.add('printing-plan');
 const previousTitle=document.title;
 document.title=`MINECAD - ${name} - ${labels[tab]}`;
 function cleanup(){
  root.remove();
  document.body.classList.remove('printing-plan');
  document.title=previousTitle;
 }
 window.addEventListener('afterprint',cleanup,{once:true});
 try{window.print()}catch(error){window.removeEventListener('afterprint',cleanup);cleanup();throw error}
}
