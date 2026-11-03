# Corrección de Planos · 3 noviembre 2026

El catálogo DOCUMENTOS existe y tiene cinco entradas en la lectura autenticada de hoy. La página anterior aún consultaba `?accion=documentos` con fetch directo a la URL del servicio que ahora utiliza la conexión privada. Esta versión utiliza el mismo puente autenticado de Reportes y planeación.

## Instalar

1. En GitHub, en la carpeta donde está `planos.html`, sustituye **planos.html** y añade **planos-client.mjs**. No cambies los archivos de Reportes ni los de planeación.
2. En Apps Script, sustituye todo **Código.gs** por `apps-script/Código.gs` de este paquete. Conserva las propiedades, servicios y permisos actuales. Incluye la corrección anterior de Reportes y las funciones de planeación; el único cambio del servidor respecto a la entrega de Reportes es permitir la consulta de solo lectura `documentos`.
3. Si ya instalaste ayer el `Bridge.html` de Reportes, déjalo: es exactamente el mismo archivo. Si aún no lo instalaste, sustituye el HTML **Bridge** con `apps-script/Bridge.html` incluido aquí.
4. Publica **Nueva versión** de la **misma implementación**, sin cambiar su URL. No ejecutes funciones de migración ni de configuración inicial.
5. Espera la publicación de GitHub Pages, abre Planos, pulsa **Ctrl+F5** y después **Reconectar**. Si lo solicita Google, pulsa **Autorizar Google**, usa la cuenta ya autorizada para MINECAD y vuelve a reconectar.

No hace falta dar de alta nuevamente los planos, cambiar permisos de Drive o crear otro proyecto de Google Cloud. La página conserva la selección de mina, las categorías, las imágenes, los PDF y sus enlaces actuales.

## Comprobación

La consulta del backend y el renderizado se probaron localmente con las cinco entradas reales de DOCUMENTOS. También se comprobó el cambio de mina, la reconexión conservando la selección, el diagnóstico de un backend sin la consulta de Planos, el escape del contenido y que Reportes siga funcionando en el simulador. No hubo escrituras a la base. El cliente y Bridge mantienen las comprobaciones de cuenta, origen, nonce y métodos permitidos.

No se modificaron Apps Script ni GitHub en línea. La corrección queda pendiente de aplicar y comprobar en la página publicada.
