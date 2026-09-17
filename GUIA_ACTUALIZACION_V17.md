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

`BARRENO_SERVICIO` se conserva solamente como histórico y ya no recibe capturas nuevas.

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
4. Verifica las filas en Google Sheets.
5. Abre el dashboard, selecciona el rango y valida los indicadores.
6. Si GitHub Pages conserva una versión anterior, recarga forzada o cierra y vuelve a abrir la pestaña; el service worker de esta entrega usa una caché nueva.
