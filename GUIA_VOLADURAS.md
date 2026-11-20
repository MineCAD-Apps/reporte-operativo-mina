# MINECAD · Barrenación y voladuras

Primera versión para uso personal. Interfaz React + TypeScript, editor SVG y visor Three.js. Se integra al sitio existente bajo `voladuras/`, sin servidor nuevo ni cambios de Apps Script.

## Uso

1. Abre **Barrenación y voladuras** desde el menú de MINECAD.
2. Selecciona Desarrollo o Barrenación larga. Cada modalidad conserva su geometría y registro real.
3. Selecciona un barreno en la sección, el visor o el listado. Edita collar y fondo en metros, tipo y anillo. Arrastra el fondo en 2D o añade barrenos con la herramienta correspondiente.
4. Captura las piezas de Tovex por barreno y, si corresponde, el tiempo de tu diseño. No se asignan cantidades ni tiempos de forma automática.
5. En **Explosivos y costos**, captura el peso neto real en kg/pieza, el precio por pieza, la moneda y la referencia del proveedor. El catálogo inicial contiene únicamente Tovex 100 de 1″ × 8″ (25.4 × 203.2 mm). El peso no se deduce a partir de las dimensiones ni de una densidad genérica.
6. **Guardar versión** crea una copia independiente en la biblioteca local. El borrador se guarda automáticamente tras una pausa de 650 ms. Exporta JSON antes de cambiar de equipo o borrar los datos del navegador.
7. JSON respalda ambas modalidades y el catálogo. CSV contiene los barrenos de la modalidad abierta y puede abrirse en Excel. **Reporte / PDF** abre la impresión del navegador; selecciona Guardar como PDF para obtener un archivo.

Los datos se guardan mediante IndexedDB en el origen del sitio. No se sincronizan entre equipos. Una ventana privada, otro navegador, otro dominio o eliminar datos de navegación puede impedir recuperar esa biblioteca. El propio programa no envía diseños ni mallas a servidores. El enlace documental externo se abre solo al pulsarlo.

## Geometría y mallas

- Coordenadas: X = ancho, Y = rumbo/profundidad, Z = elevación. Se conservan en metros; el visor transforma los ejes únicamente para dibujar.
- Cambiar las dimensiones del marco, el número de anillos o su separación no redistribuye automáticamente los barrenos existentes. **Recrear plantilla geométrica** reemplaza los barrenos de la modalidad actual con una plantilla ilustrativa, sin explosivo ni tiempos; admite deshacer.
- Las plantillas no representan una recomendación de malla o carga. No hay generador de diseños de voladura optimizados.
- El volumen mostrado es el de un marco rectangular. No descuenta galerías o vacíos ni identifica mineral. El tonelaje de referencia requiere una densidad capturada y no representa toneladas realmente voladas.
- Importación STL y OBJ: hasta 40 MB y 400,000 triángulos. La malla se interpreta en metros y se muestra en sus coordenadas originales. **Ajuste visual** recentra y escala la representación para inspeccionarla; no modifica las coordenadas del diseño y no es una alineación topográfica.
- Las mallas son referencias de visualización. No se guardan dentro del JSON o IndexedDB: vuelve a cargarlas al abrir un diseño. No hay cálculo de intersecciones, secciones de veta ni recorte contra sólidos en esta versión.

## Alcance de la reproducción y revisiones

La línea de tiempo ilumina los barrenos con tiempos capturados, a un quinto de velocidad. No simula propagación física, movimiento de roca, fragmentación, vibración, daño, sobreexcavación ni flujo de rezaga. Las revisiones detectan inconsistencias de captura (por ejemplo, longitud nula o piezas en un alivio); no aprueban el diseño de voladura.

Fuente documental consultada: https://www.semmsa.com/pdf/ficha_tovex100.pdf. No se importaron propiedades técnicas de esa ficha ni se confirmó el peso de la presentación utilizada. Las dimensiones nominales proceden de la indicación del usuario.

## Desarrollo y publicación

Requiere Node.js 22.12+ o una versión compatible con Vite 7 y pnpm. Dependencias fijadas en `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm dev
```

El script de construcción ejecuta TypeScript y Vite. Publica el contenido de `dist/` en la carpeta `voladuras/` de la raíz del sitio. La ruta base es relativa y funciona en GitHub Pages sin reescrituras de rutas. No publiques `node_modules/` ni necesitas modificar el flujo de construcción del sitio actual. El código fuente se conserva en `tools/voladuras/` dentro del repositorio MINECAD.

La integración añade una entrada al `index.html` del menú; no modifica otros módulos, el visor Underground, Apps Script ni las validaciones de origen. El service worker existente conserva su comportamiento de red primero. Para recibir una actualización, abre el sitio conectado a Internet y recarga. Esta versión no promete funcionamiento sin conexión en una instalación nueva.

## Validación realizada

- Diez pruebas automatizadas: conversiones nominales, cantidades por modalidad, masa/costo, longitud 3D, persistencia JSON, validación de importaciones, CSV y comprobaciones de captura.
- TypeScript sin errores y construcción de producción.
- Pruebas de navegador: selección y creación de barrenos, deshacer, piezas/masa/costo con valores sintéticos, guardado de una versión, recarga del borrador y exportación/reimportación JSON; revisión de escritorio y ancho móvil de 390 px.

Las credenciales, diseños personales y archivos de mina no forman parte del paquete.
