# MineCAD Control Integral de Mina · Actualización v17

## Plan semanal físico y conciliación (esta entrega)

La hoja `PLAN_SEMANAL` debe conservar exactamente estos encabezados:

| ID_PLAN | SEMANA_INICIO | FECHA | MINA | ID_PROYECTO | ID_ACTIVIDAD | LUGAR | CUADRILLA | PUEBLES_PROGRAMADOS | TIPO_TRABAJO | DETALLE_TRABAJO | MATERIAL | CANTIDAD_PROGRAMADA | UNIDAD | COMENTARIOS | PRIORIDAD | ACTIVO |
| --- | --- | --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- | ---: | --- | --- | --- | --- |

`SEMANA_INICIO` debe ser el lunes de la semana de `FECHA`. Para CUELE, la unidad es `m` y el detalle puede ser EXPLORACION, DESARROLLO, PREPARACION o CONTRA-POZO. Para TUMBE y DESBORDE la unidad es `m3` y DETALLE_TRABAJO queda vacío. MATERIAL admite MINERAL o TEPETATE.

El formulario de Planeación compara cada fila con `BARRENACION` mediante la combinación **fecha + mina + lugar + tipo de trabajo + detalle + material**. Muestra cantidad programada, cantidad real y cumplimiento físico. `PUEBLES_PROGRAMADOS` funciona también como disparos previstos; no se captura una segunda columna programada. Los puebles y disparos realizados permanecen separados para identificar pérdidas entre asignación y disparo.

`CUMPLIMIENTO_PUEBLES` conserva `DISPAROS_PROGRAMADOS` por compatibilidad histórica, pero el sistema lo llena automáticamente con el mismo valor de PUEBLES_PROGRAMADOS. También incorpora al final `TIPO_TRABAJO_PROGRAMADO, DETALLE_TRABAJO_PROGRAMADO, MATERIAL_PROGRAMADO, CANTIDAD_PROGRAMADA, UNIDAD_PROGRAMADA, CANTIDAD_REAL`.

Para instalar esta entrega sustituye `Code.gs` y publica una nueva versión de Apps Script. En GitHub sustituye `captura.html`, `app.js`, `style.css`, `index.html`, `service-worker.js` y esta guía. Ejecuta una vez `configurarHojas` después de comprobar que el orden de PLAN_SEMANAL coincide con la tabla anterior.

## Indicadores de consumo de insumos (esta entrega)

Para un sitio actualizado con la versión anterior, sustituye en GitHub **`dashboard.html`, `dashboard.css`, `dashboard.js`, `index.html`, `service-worker.js` y esta guía**. Sustituye `Code.gs` en Google Apps Script y publica una **nueva versión** de la aplicación web. Los demás archivos del ZIP pueden permanecer como están.

La hoja `CONSUMO_DE_INSUMOS` tiene estos encabezados, en cualquier orden:

| FECHA | MINA | INSUMO | CANTIDAD | UNIDAD | APLICACION | LUGAR | RESPONSABLE | OBSERVACIONES |
| --- | --- | --- | ---: | --- | --- | --- | --- | --- |
| 2026-09-18 | Santa Maria | DIESEL | 420 | L | GENERAL | | Almacén | |
| 2026-09-18 | Santa Maria | EXPLOSIVO | 95 | kg | CUELE | | Almacén | |
| 2026-09-18 | Santa Maria | BROCA | 3 | pza | GENERAL | | Almacén | |
| 2026-09-18 | Santa Maria | BARRA | 1 | pza | GENERAL | | Almacén | |

Se suman las filas de la mina y fechas seleccionadas. INSUMO admite `DIESEL` (también `DIÉSEL`), `EXPLOSIVO`, `BROCA` y `BARRA`; las unidades esperadas son respectivamente litros, kg y piezas. Las filas con cantidad negativa, sin número o con unidad incompatible producen un aviso con su número de fila. `APLICACION` y `LUGAR` se conservan como información adicional y no restringen la suma por ahora.

En el tablero aparecen las piezas de broca y barra registradas. Las razones se calculan así para la misma mina y el mismo periodo del filtro:

- **Diésel (L/t enviada a planta)** = litros de diésel registrados ÷ toneladas de `ACARREO_PLANTA`.
- **Explosivo (kg/t enviada a planta)** = kg de explosivo registrados ÷ toneladas de `ACARREO_PLANTA`.

Si faltan registros de un insumo o no hay toneladas enviadas, su razón aparece como «—». Estas son razones entre dos totales del periodo; no asignan combustible ni explosivo a una obra o lote particular. No representan toneladas tumbadas en mina.

## Revisión visual: archivos que deben actualizarse

Los cambios visuales de la entrega anterior se distribuyeron en estos archivos. Si aún no los habías publicado, súbelos también:

- `dashboard.html`
- `dashboard.css`
- `index.html`
- `captura.html`
- `style.css`
- `modulos.css`
- `planos.html`
- `gestion-proyectos.html`
- `planeacion-programacion.html`
- `reportes.html`
- `manifest.json`
- `service-worker.js`
- Los siete archivos `.svg` de `iconos/`
- `GUIA_ACTUALIZACION_V17.md`

Seguridad aparece primero en el tablero. El calendario permanece visible y el desplegable presenta los tres índices y los días sin accidentes de las cinco categorías. El menú principal y las páginas locales usan azul marino en encabezados, azul en acciones y líneas de íconos, y fondo gris azulado. El visualizador 3D enlaza a otro repositorio; sus páginas internas requieren una modificación independiente.

Si todavía no publicaste la entrega anterior, sigue también las indicaciones completas de Apps Script y las hojas de producción y Geología que figuran más abajo.

## Entrega completa anterior

Para instalar v17 desde una versión anterior, sustituye también:

- `index.html`
- `captura.html`
- `app.js`
- `dashboard.html`
- `dashboard.js`
- `dashboard.css`
- `service-worker.js`
- `GUIA_ACTUALIZACION_V17.md`

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
- `PLAN_PRODUCCION_MENSUAL`
- `GEOLOGIA_STOCK_PATIO`
- `CONSUMO_DE_INSUMOS`

## Plan mensual y medición de Geología

`PLAN_PRODUCCION_MENSUAL` tiene exactamente estos encabezados:

| MES | MINA | TON_PLANTA_PLAN | METROS_LINEALES_PLAN | TON_TUMBE_PLAN |
| --- | --- | ---: | ---: | ---: |
| 2026-09 | Santa Maria | 6000 | 220 | 1350 |

Registra una fila por mes y por mina. `MES` usa `AAAA-MM`, o una fecha del primer día de ese mes. Los importes son metas del mes completo: toneladas enviadas a planta, metros lineales y toneladas tumbadas de mineral, respectivamente. La fila es un ejemplo; captura las metas reales antes de validar el tablero. Si falta la fila, el tablero muestra **Sin plan**, sin inventar una meta.

`GEOLOGIA_STOCK_PATIO` se crea con `configurarHojas` y recibe los reportes enviados desde **Captura → Reporte de Geología**. Sus encabezados son `ID_REPORTE, FECHA_HORA_REGISTRO, FECHA, MINA, STOCK_PATIO_TON, RESPONSABLE, OBSERVACIONES`. Se admite una medición por fecha y mina. El tablero muestra la última medición disponible hasta la fecha **Hasta**, con su fecha de origen; no suma mediciones sucesivas.

El gráfico principal muestra el plan mensual acumulado como línea azul, el real de embarque como línea naranja **solamente hasta el último día reportado por Mina**, y una proyección gris discontinua desde ese día hasta el fin del mes en curso. La proyección usa el promedio diario real hasta el último reporte; no se dibuja para meses cerrados, futuros o sin reportes. Si faltan reportes intermedios, se advierte debajo del gráfico. El plan al día se distribuye proporcionalmente entre los días naturales del mes.

Los otros dos gráficos comparan el plan proporcional al día contra el real acumulado. Las toneladas tumbadas son una estimación de `BARRENACION` con trabajo `TUMBE` y material `MINERAL`: m³ × densidad activa de MINERAL en `CATALOGOS`; `DESBORDE` no se considera tonelaje tumbado. Las comparaciones usan el mes de **Hasta**; el detalle desplegable usa el intervalo **Desde–Hasta**.

`BARRENO_SERVICIO` se conserva solamente como histórico y ya no recibe capturas nuevas.

## Separación entre operación y planeación

El **Reporte de mina** ya no contiene la comparación entre lo programado y lo realizado. El supervisor captura solamente la operación del día.

El botón **Reporte de planeación** abre una captura independiente que:

1. Consulta en `PLAN_SEMANAL` todas las actividades activas de la mina y fecha seleccionadas.
2. Muestra los puebles y disparos programados.
3. Solicita los puebles y disparos realizados.
4. Exige al menos una causa cuando existe incumplimiento.
5. Guarda el resultado en `CUMPLIMIENTO_PUEBLES` y el detalle en `CAUSAS_INCUMPLIMIENTO_PUEBLES`.

Además, la conciliación consulta automáticamente `BARRENACION` para la misma fecha y mina. La relación considera lugar, tipo de trabajo, detalle y material; una combinación reportada por Mina que no aparezca en el plan genera una advertencia.

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
