// ==UserScript==
// @name         MineCAD · tema visual del panel externo
// @namespace    https://minecad-apps.github.io/
// @version      1.0.0
// @description  Colores y encabezado MineCAD; conserva atribución y funciones de la página original.
// @match        https://extraordinary-jelly-d2ae56.netlify.app/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// ==/UserScript==

(()=>{'use strict';
// Sin @noframes: se aplica tanto al abrir la página como dentro de un iframe.
// No lee datos del diseño, no accede al padre ni modifica cálculos, eventos o almacenamiento.
const root=document.documentElement;
const css=`
:root[data-minecad-skin="on"]{
 --ground:#edf3f8!important;--panel:#fff!important;--panel-2:#f3f7fb!important;--sunk:#edf3f8!important;
 --bg-1:#fff!important;--bg-2:#f3f7fb!important;--bg-3:#edf3f8!important;
 --line:#d8e5ef!important;--line-soft:#e4edf5!important;
 --ink:#18334e!important;--ink-1:#18334e!important;--ink-2:#4e657c!important;--ink-3:#62768a!important;
 --amber:#245e92!important;--amber-fill:#3375c2!important;--on-amber:#fff!important;
 --cyan:#246b9e!important;--cyan-soft:rgba(51,117,194,.10)!important;--focus:#3375c2!important;
 --scr:#0b1725!important;--scr-line:#294158!important;
 --f-body:"Segoe UI",system-ui,sans-serif!important;--f-disp:"Segoe UI",system-ui,sans-serif!important;
 --shadow:0 6px 20px rgba(16,43,72,.08)!important;--radius:10px!important;color-scheme:light!important;
}
html[data-minecad-skin="on"] .topbar{background:#102b48!important;border-bottom-color:#315476!important;color:#fff!important}
html[data-minecad-skin="on"] .topbar .in{gap:9px 14px}
html[data-minecad-skin="on"] .brand::before{content:"MC";display:grid;place-items:center;flex:none;width:36px;height:36px;border:1px solid #739aca;border-radius:9px;color:#fff;font:bold 14px "Segoe UI",sans-serif}
html[data-minecad-skin="on"] .brand #brandlogo,html[data-minecad-skin="on"] .brand #brandmark{display:none!important}
html[data-minecad-skin="on"] .brand h1{color:#fff!important;font-size:17px;letter-spacing:.03em;text-transform:none}
html[data-minecad-skin="on"] .brand .sub,html[data-minecad-skin="on"] .savestate,html[data-minecad-skin="on"] .brand .ver{color:#c9dbe9!important}
html[data-minecad-skin="on"] .brand .sub{letter-spacing:.04em}
html[data-minecad-skin="on"] .topbar .modeswitch{background:#183b5a;border-color:#406386}
html[data-minecad-skin="on"] .topbar .modeswitch button{color:#dfecf7}
html[data-minecad-skin="on"] .topbar .modeswitch .k{color:#b7cde0!important}
html[data-minecad-skin="on"] .topbar .modeswitch button[aria-selected="true"]{background:#3375c2;color:#fff}
html[data-minecad-skin="on"] .topbar .tb-actions button{color:#fff!important;background:#174269!important;border:1px solid #6082a1!important}
html[data-minecad-skin="on"] .topbar .tb-actions #btn-save{background:#3375c2!important;color:#fff!important}
html[data-minecad-skin="on"] .topbar #unitsw{background:#183b5a;color:#e8f3fc}
html[data-minecad-skin="on"] .brand .minecad-credit{color:#c9dbe9!important;text-decoration:none}
html[data-minecad-skin="on"] .brand .minecad-credit:hover{text-decoration:underline}
@media(max-width:700px){html[data-minecad-skin="on"] .brand .sub{display:block!important;font-size:9px}html[data-minecad-skin="on"] .brand h1{font-size:14px}}
@media print{html[data-minecad-skin="on"] .brand::before{color:#102b48;border-color:#102b48}}
`;
GM_addStyle(css);
const heading=document.querySelector('.brand h1'),sub=document.querySelector('.brand .sub');
const originalHeading=heading?.textContent,originalSub=sub?.innerHTML,originalTitle=document.title;
let on=false;
function apply(enabled){on=enabled;root.toggleAttribute('data-minecad-skin',enabled);if(enabled)root.setAttribute('data-minecad-skin','on');
 if(heading)heading.textContent=enabled?'MineCAD · Panel de diseño':originalHeading;
 if(sub){if(enabled){sub.replaceChildren();const a=document.createElement('a');a.href='https://extraordinary-jelly-d2ae56.netlify.app/';a.target='_blank';a.rel='noopener noreferrer';a.className='minecad-credit';a.textContent='Herramienta externa · JR Cognitive Projects';sub.append(a);}else sub.innerHTML=originalSub;}
 document.title=enabled?'MineCAD | Panel externo':originalTitle;
}
apply(true);
GM_registerMenuCommand('Activar/desactivar tema MineCAD',()=>apply(!on));
})();
