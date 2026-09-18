# MineCAD Control Integral de Mina · Actualización v17

## Archivos que deben actualizarse

En GitHub sustituye el contenido del repositorio con esta versión. Los archivos principales modificados son:

- `index.html`
- `captura.html`
- `app.js`
- `catalogos-loader.js` (nuevo)
- `style.css`
- `dashboard.html`
- `dashboard.js`
- `dashboard.css`
- `service-worker.js`

El archivo `Code.gs` no se publica en GitHub como parte de la página: su contenido debe sustituir el código del proyecto de Google Apps Script conectado a la hoja.

## Actualización del Apps Script

1. Abre el Apps Script asociado a la hoja de Google.
2. Sustituye el contenido de su archivo de código por `Code.gs`.
3. Guarda el proyecto.
4. Ejecuta una vez `configurarHojas` desde el editor para validar o crear los encabezados antes de probar.
5. Ve a **Implementar → Administrar implementaciones → Editar**.
6. Selecciona **Nueva versión** y conserva el acceso de prueba como “Cualquier persona con el enlace”.
7. Confirma que la URL de la aplicación web sigue siendo la misma. Si cambia, sustituye `API_URL` en `catalogos-loader.js`, `app.js` y `dashboard.js`.

## Hojas utilizadas por las capturas nuevas

- `REPORTES_DIARIOS`
- `BARRENACION`
- `MOVIMIENTO_MATERIAL`
- `ESTADO_EQUIPOS`
- `MAQUINAS_PIERNA`
- `MOTIVOS_NO_OPERACION_MP`
- `STOPEMATE`
- `ACARREO_PLANTA`
- `BARRENACION_EXPLORACION`
- `CATALOGOS`
- `PLAN_SEMANAL`
- `CUMPLIMIENTO_PUEBLES`
- `CAUSAS_INCUMPLIMIENTO_PUEBLES`
- `CONFIRMACIONES_ENVIO`

`BARRENO_SERVICIO` se conserva solamente como histórico y ya no recibe capturas nuevas.

## Separación entre operación y planeación

El **Reporte de mina** ya no contiene la comparación entre lo programado y lo realizado. El supervisor captura solamente la operación del día.

El botón **Reporte de planeación** abre una captura independiente que:

1. Consulta en `PLAN_SEMANAL` todas las actividades activas de la mina y fecha seleccionadas.
2. Muestra los puebles y disparos programados.
3. Solicita los puebles y disparos realizados.
4. Exige al menos una causa cuando existe incumplimiento.
5. Guarda el resultado en `CUMPLIMIENTO_PUEBLES` y el detalle en `CAUSAS_INCUMPLIMIENTO_PUEBLES`.

Además, la conciliación consulta automáticamente `BARRENACION` para la misma fecha y mina. Los registros se relacionan por el texto normalizado de `LUGAR` en `PLAN_SEMANAL` y `OBRA` en `BARRENACION`. En cada actividad se muestran los metros lineales, metros cúbicos, tipos de trabajo y materiales reportados por Mina. Si Mina reportó un lugar que no aparece en el plan, el formulario muestra una advertencia.

Los puebles y disparos realizados continúan siendo confirmados por Planeación porque no pueden deducirse de forma confiable a partir de metros o metros cúbicos.

Al ejecutar `configurarHojas`, `CUMPLIMIENTO_PUEBLES` incorpora al final las columnas `RESPONSABLE`, `FECHA_HORA_REGISTRO`, `LUGAR`, `ID_REPORTE_OPERATIVO`, `METROS_LINEALES_REPORTADOS`, `M3_REPORTADOS`, `TIPOS_TRABAJO_REPORTADOS` y `MATERIALES_REPORTADOS`; `CAUSAS_INCUMPLIMIENTO_PUEBLES` incorpora `RESPONSABLE`. Los datos anteriores no se desplazan porque las columnas se agregan al final.

La separación de formularios organiza responsabilidades, pero no restringe el acceso por usuario. Mientras GitHub Pages y la aplicación web de Apps Script sean públicas, cualquier persona con el enlace podrá abrir el reporte de planeación.

## Confirmación y limpieza de formularios

Cada captura genera un `ID_ENVIO`. Apps Script registra el resultado en `CONFIRMACIONES_ENVIO` y la página consulta esa hoja antes de mostrar éxito. El formulario se limpia únicamente después de recibir una confirmación `OK`. Si el servidor rechaza el reporte o no puede confirmarse el envío, la información permanece en pantalla.

El reporte diario de Mina rechaza un segundo registro con la misma combinación de fecha y mina. El reporte de Planeación aplica la misma regla. Los reintentos del mismo `ID_ENVIO` son idempotentes y no generan registros duplicados.

## Datos auxiliares del dashboard

La hoja `PERSONAL` usa además:

- `B8`: índice de rotación de personal en porcentaje.

La hoja `SEGURIDAD` usa además:

- `B11`: fecha del último accidente tipo D (defunción).
- `B12`: fecha del último accidente tipo T (trayecto).
- `B23`: lista de fechas tipo D del mes actual.
- `B24`: lista de fechas tipo T del mes actual.

Las listas de fechas aceptan el mismo formato que los tipos A, B y C.

## Prueba recomendada

1. Abre primero `index.html` y espera el indicador **Catálogos actualizados**.
2. Registra un reporte de mina con una línea de producción, un movimiento y un estado de equipo.
3. Registra un reporte de exploración con un `NOMBRE_BARRENO` alfanumérico.
4. En `PLAN_SEMANAL`, deja al menos una actividad activa para la fecha de prueba y registra su conciliación desde **Reporte de planeación**.
5. Verifica las filas en Google Sheets.
6. Abre el dashboard, selecciona el rango y valida los indicadores.
7. Si GitHub Pages conserva una versión anterior, recarga forzada o cierra y vuelve a abrir la pestaña; el service worker de esta entrega usa una caché nueva.
