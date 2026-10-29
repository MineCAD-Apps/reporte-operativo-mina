export const CHANNEL='minecad-planning-v2';
export function validApiUrl(value){try{const u=new URL(value);return u.origin==='https://script.google.com'&&/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)&&!u.search&&!u.hash}catch{return false}}
export function isGoogleBridgeOrigin(origin){try{const u=new URL(origin);return u.protocol==='https:'&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||u.hostname.endsWith('-script.googleusercontent.com'))}catch{return false}}
export class PlanningClient {
 constructor(config,host=window,doc=document){this.config=config;this.host=host;this.doc=doc;this.pending=new Map;this.source=null;this.origin=null;this.frame=null;this.ready=null;this.disposed=false;this.onMessage=e=>this.receive(e);host.addEventListener('message',this.onMessage)}
 connect(){
  if(this.disposed)return Promise.reject(Error('Conexión cerrada'));
  if(this.ready)return this.ready;
  if(!validApiUrl(this.config.apiUrl))return Promise.reject(Error('Falta configurar la URL /exec del servicio de planeación en planning-config.mjs.'));
  if(this.host.location.origin!==this.config.parentOrigin)return Promise.reject(Error('Abre esta sección desde '+this.config.parentOrigin+'. La conexión autenticada no se activa desde archivos locales.'));
  const bytes=new Uint8Array(32);this.host.crypto.getRandomValues(bytes);this.nonce=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  this.ready=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject;this.timer=this.host.setTimeout(()=>{this.ready=null;this.cleanupFrame();reject(Error('No se pudo conectar con Google. Pulsa «Autorizar Google», inicia sesión y después «Reconectar». Si el navegador bloquea la sesión en el marco, permite las cookies de Google para esta aplicación.'))},this.config.timeoutMs||30000)});
  this.frame=this.doc.createElement('iframe');this.frame.title='Conexión privada de planeación MINECAD';this.frame.hidden=true;this.frame.referrerPolicy='strict-origin';const u=new URL(this.config.apiUrl);u.searchParams.set('bridge','1');u.searchParams.set('nonce',this.nonce);u.searchParams.set('parentOrigin',this.config.parentOrigin);this.frame.src=u.href;this.doc.body.appendChild(this.frame);return this.ready;
 }
 receive(event){const d=event.data;if(!d||d.channel!==CHANNEL||d.nonce!==this.nonce||!isGoogleBridgeOrigin(event.origin))return;
  if(d.kind==='ready'){if(this.source||!this.resolveReady)return;this.source=event.source;this.origin=event.origin;this.host.clearTimeout(this.timer);const resolve=this.resolveReady;this.resolveReady=null;this.rejectReady=null;resolve(this);return}
  if(event.source!==this.source||event.origin!==this.origin||d.kind!=='response')return;
  const p=this.pending.get(d.id);if(!p)return;this.host.clearTimeout(p.timer);this.pending.delete(d.id);if(d.ok)p.resolve(d.result);else p.reject(Error(d.error||'Error del servicio de planeación'));
 }
 async call(method,...args){if(!['loadPlanningData','savePlanningPlan'].includes(method))throw Error('Operación no admitida');await this.connect();const id=this.host.crypto.randomUUID();return new Promise((resolve,reject)=>{const timer=this.host.setTimeout(()=>{this.pending.delete(id);reject(Error(method==='savePlanningPlan'?'No se recibió confirmación del guardado. Vuelve a cargar los planes para comprobar si se guardó antes de repetir.':'La consulta tardó demasiado. Vuelve a conectar.'))},this.config.timeoutMs||30000);this.pending.set(id,{resolve,reject,timer});this.source.postMessage({channel:CHANNEL,kind:'request',nonce:this.nonce,id,method,args},this.origin)})}
 authorizationUrl(){if(!validApiUrl(this.config.apiUrl))throw Error('Configura primero la URL /exec en planning-config.mjs');return this.config.apiUrl+'?status=1'}
 cleanupFrame(){this.frame?.remove();this.frame=null;this.source=null;this.origin=null;this.resolveReady=null;this.rejectReady=null}
 dispose(){this.disposed=true;this.host.clearTimeout(this.timer);if(this.rejectReady)this.rejectReady(Error('Conexión reiniciada'));this.host.removeEventListener('message',this.onMessage);for(const p of this.pending.values()){this.host.clearTimeout(p.timer);p.reject(Error('Conexión reiniciada'))}this.pending.clear();this.cleanupFrame();this.ready=null}
}
