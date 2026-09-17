const HOJAS = {
  REPORTES: "REPORTES_DIARIOS",
  BARRENACION: "BARRENACION",
  EQUIPOS: "ESTADO_EQUIPOS",
  STOPEMATE: "STOPEMATE",
  BARRENO_SERVICIO: "BARRENO_SERVICIO",
  ACARREO_PLANTA: "ACARREO_PLANTA",
  MOVIMIENTO_MATERIAL: "MOVIMIENTO_MATERIAL",
  MAQUINAS_PIERNA: "MAQUINAS_PIERNA",
  MOTIVOS_MP: "MOTIVOS_NO_OPERACION_MP",
  BARRENACION_EXPLORACION: "BARRENACION_EXPLORACION",
  CATALOGOS: "CATALOGOS",
  PLAN_SEMANAL: "PLAN_SEMANAL",
  CUMPLIMIENTO_PUEBLES: "CUMPLIMIENTO_PUEBLES",
  CAUSAS_PUEBLES: "CAUSAS_INCUMPLIMIENTO_PUEBLES",
  SEGURIDAD: "SEGURIDAD",
  PERSONAL: "PERSONAL",
  DOCUMENTOS: "DOCUMENTOS",
  PROYECTOS: "PROYECTOS"
};

const ENCABEZADOS = {
  REPORTES_DIARIOS: [
    "ID_REPORTE",
    "FECHA_HORA_REGISTRO",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "COMENTARIOS_GENERALES",
    "REGISTROS_BARRENACION",
    "REGISTROS_MOVIMIENTO_MATERIAL",
    "REGISTROS_EQUIPOS",
    "REGISTROS_MAQUINAS_PIERNA",
    "REGISTROS_STOPEMATE",
    "TONELADAS_ACARREO_PLANTA"
  ],

  BARRENACION: [
    "ID_REPORTE",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "OBRA",
    "TIPO_TRABAJO",
    "DETALLE_TRABAJO",
    "CLASIFICACION_AVANCE",
    "METROS_LINEALES",
    "M3",
    "MATERIAL"
  ],

  ESTADO_EQUIPOS: [
    "ID_REPORTE",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "EQUIPO",
    "FAMILIA_EQUIPO",
    "ESTADO_TECNICO",
    "HORAS_OPERADAS",
    "MOTIVO_NO_OPERACION",
    "TIPO_FALLA",
    "COMENTARIOS"
  ],

  STOPEMATE: [
    "ID_REPORTE",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "EQUIPO",
    "LUGAR",
    "METROS_DIA"
  ],

  BARRENO_SERVICIO: [
    "ID_REPORTE",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "METROS_DIA"
  ],

  ACARREO_PLANTA: [
    "ID_REPORTE",
    "FECHA",
    "MINA",
    "PERIODO",
    "RESPONSABLE",
    "TONELAJE",
    "PROCEDENCIA"
  ],

  MOVIMIENTO_MATERIAL: [
    "ID_REPORTE", "FECHA", "MINA", "PERIODO", "RESPONSABLE",
    "EQUIPO", "FAMILIA_EQUIPO", "TIPO_CONTEO", "CANTIDAD",
    "PROCEDENCIA", "DESTINO", "MATERIAL", "CAPACIDAD_YD3",
    "DENSIDAD_T_M3", "FACTOR_LLENADO", "VOLUMEN_M3", "TONELAJE_ESTIMADO"
  ],

  MAQUINAS_PIERNA: [
    "ID_REPORTE", "FECHA", "MINA", "PERIODO", "RESPONSABLE",
    "TOTAL_MAQUINAS", "DISPONIBLES_TECNICAMENTE", "PROGRAMADAS", "POBLADAS", "COMENTARIOS"
  ],

  MOTIVOS_NO_OPERACION_MP: [
    "ID_REPORTE", "FECHA", "MINA", "MOTIVO", "CANTIDAD_AFECTADA", "COMENTARIOS"
  ],

  BARRENACION_EXPLORACION: [
    "ID_REPORTE", "FECHA_HORA_REGISTRO", "FECHA", "MINA", "RESPONSABLE",
    "EQUIPO", "NOMBRE_BARRENO", "METROS_BARRENADOS", "UBICACION", "OBJETIVO", "COMENTARIOS"
  ],

  PLAN_SEMANAL: [
    "ID_PLAN", "SEMANA_INICIO", "FECHA", "MINA", "ID_PROYECTO", "ID_ACTIVIDAD",
    "LUGAR", "CUADRILLA", "PUEBLES_PROGRAMADOS", "DISPAROS_PROGRAMADOS", "PRIORIDAD", "COMENTARIOS", "ACTIVO"
  ],

  CUMPLIMIENTO_PUEBLES: [
    "ID_REPORTE", "ID_PLAN", "FECHA", "MINA", "PUEBLES_PROGRAMADOS", "PUEBLES_REALIZADOS",
    "DISPAROS_PROGRAMADOS", "DISPAROS_REALIZADOS", "COMENTARIOS"
  ],

  CAUSAS_INCUMPLIMIENTO_PUEBLES: [
    "ID_REPORTE", "ID_PLAN", "FECHA", "MINA", "MOTIVO", "CANTIDAD_NO_CUMPLIDA", "COMENTARIOS"
  ]
};

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const accion = String(params.accion || "").trim().toLowerCase();

    if (!accion) {
      return respuestaJSON({
        ok: true,
        servicio: "Backend Reporte Operativo Mina",
        estado: "activo",
        fechaHora: new Date()
      });
    }

    if (accion === "barrenacion") {
      return consultarBarrenacion(params);
    }

    if (accion === "equipos") {
      return consultarEquipos(params);
    }

    if (accion === "movimiento_material") {
      return consultarMovimientoMaterial(params);
    }

    if (accion === "maquinas_pierna") {
      return consultarMaquinasPierna(params);
    }

    if (accion === "barrenacion_exploracion") {
      return consultarBarrenacionExploracion(params);
    }

    if (accion === "catalogos") {
      return consultarCatalogos();
    }

    if (accion === "plan_semanal") {
      return consultarPlanSemanal(params);
    }

    if (accion === "acarreo_planta") {
      return consultarAcarreoPlanta(params);
    }

    if (accion === "stopemate") {
      return consultarStopeMate(params);
    }

    if (accion === "barreno_servicio") {
      return consultarBarrenoServicio(params);
    }

    if (accion === "seguridad") {
      return consultarSeguridad();
    }

    if (accion === "personal") {
      return consultarPersonal();
    }

    if (accion === "documentos") {
      return consultarDocumentos(params);
    }

    if (accion === "proyectos") {
      return consultarProyectos(params);
    }

    return respuestaJSON({
      ok: false,
      mensaje: "Acción no reconocida."
    });

  } catch (error) {
    console.error(error);

    return respuestaJSON({
      ok: false,
      mensaje: error.message || String(error)
    });
  }
}

function consultarProyectos(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.PROYECTOS);

  if (!hoja) {
    throw new Error('No existe la hoja "PROYECTOS".');
  }

  if (hoja.getLastRow() < 2) {
    return respuestaJSON({
      ok: true,
      accion: "proyectos",
      totalRegistros: 0,
      datos: []
    });
  }

  const rango = hoja.getDataRange();
  const valores = rango.getValues();
  const valoresMostrados = rango.getDisplayValues();
  const encabezados = valores.shift().map(normalizarEncabezadoDocumento);
  valoresMostrados.shift();
  const columnas = {};

  encabezados.forEach((encabezado, indice) => {
    columnas[encabezado] = indice;
  });

  const requeridos = [
    "ID_PROYECTO",
    "MINA",
    "NOMBRE_PROYECTO",
    "TIPO",
    "DESCRIPCION",
    "RESPONSABLE",
    "PRIORIDAD",
    "ESTADO",
    "FECHA_INICIO",
    "FECHA_FIN_PLAN",
    "AVANCE_PORCENTAJE",
    "CARPETA_DRIVE_ID",
    "ACTIVO"
  ];

  const faltantes = requeridos.filter(nombre => columnas[nombre] === undefined);

  if (faltantes.length) {
    throw new Error(
      "Faltan encabezados en PROYECTOS: " + faltantes.join(", ") + "."
    );
  }

  const filtroMina = String(params.mina || "").trim();
  const filtroEstado = String(params.estado || "").trim();
  const filtroPrioridad = String(params.prioridad || "").trim();
  const incluirInactivos =
    String(params.incluir_inactivos || "").trim().toLowerCase() === "si";

  const datos = [];

  valores.forEach((fila, indiceFila) => {
    const idProyecto = valorDocumento(fila, columnas, "ID_PROYECTO");
    const nombreProyecto = valorDocumento(
      fila,
      columnas,
      "NOMBRE_PROYECTO"
    );
    const mina = valorDocumento(fila, columnas, "MINA");
    const estado = valorDocumento(fila, columnas, "ESTADO");
    const prioridad = valorDocumento(fila, columnas, "PRIORIDAD");
    const activo = esValorVigente(
      valorDocumento(fila, columnas, "ACTIVO")
    );

    if (!idProyecto && !nombreProyecto) return;
    if (!incluirInactivos && !activo) return;
    if (filtroMina && !textosDocumentoIguales(mina, filtroMina)) return;
    if (
      filtroEstado &&
      !textosDocumentoIguales(estado, filtroEstado)
    ) return;
    if (
      filtroPrioridad &&
      !textosDocumentoIguales(prioridad, filtroPrioridad)
    ) return;

    const carpetaDriveId = extraerIdDrive(
      valorDocumento(fila, columnas, "CARPETA_DRIVE_ID")
    );

    datos.push({
      idProyecto: idProyecto,
      mina: mina,
      nombreProyecto: nombreProyecto || idProyecto,
      tipo: valorDocumento(fila, columnas, "TIPO"),
      descripcion: valorDocumento(fila, columnas, "DESCRIPCION"),
      responsable: valorDocumento(fila, columnas, "RESPONSABLE"),
      prioridad: prioridad,
      estado: estado,
      fechaInicio: formatearFechaDocumento(fila[columnas.FECHA_INICIO]),
      fechaFinPlan: formatearFechaDocumento(fila[columnas.FECHA_FIN_PLAN]),
      avancePorcentaje: normalizarAvanceProyecto(
        fila[columnas.AVANCE_PORCENTAJE],
        valoresMostrados[indiceFila][columnas.AVANCE_PORCENTAJE]
      ),
      carpetaDriveId: carpetaDriveId,
      urlCarpetaDrive: carpetaDriveId
        ? "https://drive.google.com/drive/folders/" + carpetaDriveId
        : "",
      activo: activo
    });
  });

  datos.sort((a, b) => {
    const prioridadA = ordenPrioridadProyecto(a.prioridad);
    const prioridadB = ordenPrioridadProyecto(b.prioridad);

    if (prioridadA !== prioridadB) return prioridadA - prioridadB;

    return String(a.nombreProyecto).localeCompare(
      String(b.nombreProyecto),
      "es",
      { sensitivity: "base" }
    );
  });

  return respuestaJSON({
    ok: true,
    accion: "proyectos",
    totalRegistros: datos.length,
    datos: datos
  });
}

function normalizarAvanceProyecto(valor, valorMostrado) {
  const mostrado = String(valorMostrado || "").trim();
  let numero;

  if (mostrado.includes("%")) {
    numero = Number(
      mostrado
        .replace("%", "")
        .replace(/\s/g, "")
        .replace(",", ".")
    );
  } else {
    numero = Number(valor);
  }

  if (!Number.isFinite(numero)) return 0;

  return Math.min(100, Math.max(0, Math.round(numero * 100) / 100));
}

function ordenPrioridadProyecto(prioridad) {
  const texto = String(prioridad || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const orden = {
    critica: 1,
    alta: 2,
    media: 3,
    baja: 4
  };

  return orden[texto] || 99;
}

function consultarDocumentos(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.DOCUMENTOS);

  if (!hoja) {
    throw new Error('No existe la hoja "DOCUMENTOS".');
  }

  if (hoja.getLastRow() < 2) {
    return respuestaJSON({
      ok: true,
      accion: "documentos",
      totalRegistros: 0,
      datos: []
    });
  }

  const valores = hoja.getDataRange().getValues();
  const encabezados = valores.shift().map(normalizarEncabezadoDocumento);
  const columnas = {};

  encabezados.forEach((encabezado, indice) => {
    columnas[encabezado] = indice;
  });

  const requeridos = [
    "ID_DOCUMENTO",
    "MINA",
    "SECCION",
    "CATEGORIA",
    "TITULO",
    "FILE_ID_DRIVE",
    "TIPO_ARCHIVO",
    "VERSION",
    "FECHA_ACTUALIZACION",
    "VIGENTE",
    "ORDEN"
  ];

  const faltantes = requeridos.filter(nombre => columnas[nombre] === undefined);

  if (faltantes.length) {
    throw new Error(
      "Faltan encabezados en DOCUMENTOS: " + faltantes.join(", ") + "."
    );
  }

  const filtroMina = String(params.mina || "").trim();
  const filtroSeccion = String(params.seccion || "").trim();
  const filtroCategoria = String(params.categoria || "").trim();
  const incluirNoVigentes =
    String(params.incluir_no_vigentes || "").trim().toLowerCase() === "si";

  const datos = [];

  valores.forEach(fila => {
    const idDocumento = valorDocumento(fila, columnas, "ID_DOCUMENTO");
    const mina = valorDocumento(fila, columnas, "MINA");
    const seccion = valorDocumento(fila, columnas, "SECCION");
    const categoria = valorDocumento(fila, columnas, "CATEGORIA");
    const titulo = valorDocumento(fila, columnas, "TITULO");
    const fileId = extraerIdDrive(
      valorDocumento(fila, columnas, "FILE_ID_DRIVE")
    );
    const tipoArchivo = valorDocumento(
      fila,
      columnas,
      "TIPO_ARCHIVO"
    ).toUpperCase();
    const vigente = esValorVigente(
      valorDocumento(fila, columnas, "VIGENTE")
    );

    if (!idDocumento && !titulo && !fileId) return;
    if (!fileId) return;
    if (!incluirNoVigentes && !vigente) return;
    if (filtroMina && !textosDocumentoIguales(mina, filtroMina)) return;
    if (
      filtroSeccion &&
      !textosDocumentoIguales(seccion, filtroSeccion)
    ) return;
    if (
      filtroCategoria &&
      !textosDocumentoIguales(categoria, filtroCategoria)
    ) return;

    datos.push({
      idDocumento: idDocumento,
      mina: mina,
      seccion: seccion,
      categoria: categoria,
      titulo: titulo || idDocumento,
      fileIdDrive: fileId,
      tipoArchivo: tipoArchivo,
      version: valorDocumento(fila, columnas, "VERSION"),
      fechaActualizacion: formatearFechaDocumento(
        fila[columnas.FECHA_ACTUALIZACION]
      ),
      vigente: vigente,
      orden: Number(valorDocumento(fila, columnas, "ORDEN")) || 0,
      urlVista: "https://drive.google.com/file/d/" + fileId + "/view",
      urlPreview: "https://drive.google.com/file/d/" + fileId + "/preview",
      urlMiniatura:
        "https://drive.google.com/thumbnail?id=" +
        encodeURIComponent(fileId) +
        "&sz=w1200"
    });
  });

  datos.sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden;
    return String(a.titulo).localeCompare(String(b.titulo), "es", {
      sensitivity: "base"
    });
  });

  return respuestaJSON({
    ok: true,
    accion: "documentos",
    totalRegistros: datos.length,
    datos: datos
  });
}

function normalizarEncabezadoDocumento(valor) {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function valorDocumento(fila, columnas, nombre) {
  const indice = columnas[nombre];
  if (indice === undefined) return "";
  return String(fila[indice] ?? "").trim();
}

function extraerIdDrive(valor) {
  const texto = String(valor || "").trim();
  if (!texto) return "";

  const coincidenciaRuta = texto.match(/\/d\/([^/?#]+)/i);
  if (coincidenciaRuta) return coincidenciaRuta[1];

  const coincidenciaCarpeta = texto.match(/\/folders\/([^/?#]+)/i);
  if (coincidenciaCarpeta) return coincidenciaCarpeta[1];

  const coincidenciaParametro = texto.match(/[?&]id=([^&#]+)/i);
  if (coincidenciaParametro) return coincidenciaParametro[1];

  return texto;
}

function esValorVigente(valor) {
  const texto = String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return ["si", "true", "1", "x", "vigente"].includes(texto);
}

function textosDocumentoIguales(valorA, valorB) {
  const normalizar = valor => String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  return normalizar(valorA) === normalizar(valorB);
}

function formatearFechaDocumento(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return Utilities.formatDate(
      valor,
      Session.getScriptTimeZone(),
      "yyyy-MM-dd"
    );
  }

  return String(valor ?? "").trim();
}

function consultarBarrenacion(params) {
  const filtros = validarFiltrosConsulta(params);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.BARRENACION);

  if (!hoja || hoja.getLastRow() < 2) {
    return respuestaConsultaVacia(
      "barrenacion",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const valores = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn())
    .getValues();

  const datos = [];

  valores.forEach(fila => {
    const fechaFila = normalizarFechaHoja(fila[1]);
    const minaFila = String(fila[2] || "").trim();

    if (!fechaFila) return;
    if (minaFila !== filtros.mina) return;
    if (fechaFila < filtros.desde || fechaFila > filtros.hasta) return;

    datos.push({
      idReporte: fila[0] || "",
      fecha: formatearFecha(fechaFila),
      mina: minaFila,
      turno: fila[3] || "",
      responsable: fila[4] || "",
      obra: fila[5] || "",
      tipoTrabajo: fila[6] || "",
      tipoObra: fila[6] || "",
      detalleTrabajo: fila[7] || "",
      clasificacionAvance: fila[8] || "",
      metrosLineales: numeroSeguro(fila[9]),
      m3: numeroSeguro(fila[10]),
      material: fila[11] || ""
    });
  });

  ordenarPorFecha(datos);

  return respuestaJSON({
    ok: true,
    accion: "barrenacion",
    mina: filtros.mina,
    desde: filtros.desdeTexto,
    hasta: filtros.hastaTexto,
    totalRegistros: datos.length,
    datos: datos
  });
}

function consultarEquipos(params) {
  const filtros = validarFiltrosConsulta(params);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.EQUIPOS);

  if (!hoja || hoja.getLastRow() < 2) {
    return respuestaConsultaVacia(
      "equipos",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const valores = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn())
    .getValues();

  const datos = [];

  valores.forEach(fila => {
    /*
      A ID_REPORTE
      B FECHA
      C MINA
      D TURNO
      E RESPONSABLE
      F EQUIPO
      G ESTADO
      H MOTIVO
      I COMENTARIOS
    */

    const fechaFila = normalizarFechaHoja(fila[1]);
    const minaFila = String(fila[2] || "").trim();

    if (!fechaFila) return;
    if (minaFila !== filtros.mina) return;
    if (fechaFila < filtros.desde || fechaFila > filtros.hasta) return;

    datos.push({
      idReporte: fila[0] || "",
      fecha: formatearFecha(fechaFila),
      mina: minaFila,
      turno: fila[3] || "",
      responsable: fila[4] || "",
      equipo: fila[5] || "",
      familiaEquipo: fila[6] || "",
      estadoTecnico: fila[7] || "",
      estado: fila[7] || "",
      horasOperadas: numeroSeguro(fila[8]),
      motivoNoOperacion: fila[9] || "",
      motivo: fila[9] || "",
      tipoFalla: fila[10] || "",
      comentarios: fila[11] || ""
    });
  });

  ordenarPorFecha(datos);

  return respuestaJSON({
    ok: true,
    accion: "equipos",
    mina: filtros.mina,
    desde: filtros.desdeTexto,
    hasta: filtros.hastaTexto,
    totalRegistros: datos.length,
    datos: datos
  });
}


function consultarAcarreoPlanta(params) {
  const filtros = validarFiltrosConsulta(params);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.ACARREO_PLANTA);

  if (!hoja || hoja.getLastRow() < 2) {
    return respuestaConsultaVacia(
      "acarreo_planta",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const valores = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn())
    .getValues();

  const datos = [];

  valores.forEach(fila => {
    const fechaFila = normalizarFechaHoja(fila[1]);
    const minaFila = String(fila[2] || "").trim();

    if (!fechaFila) return;
    if (minaFila !== filtros.mina) return;
    if (fechaFila < filtros.desde || fechaFila > filtros.hasta) return;

    datos.push({
      idReporte: fila[0] || "",
      fecha: formatearFecha(fechaFila),
      mina: minaFila,
      turno: fila[3] || "",
      responsable: fila[4] || "",
      tonelaje: numeroSeguro(fila[5]),
      procedencia: fila[6] || ""
    });
  });

  ordenarPorFecha(datos);

  return respuestaJSON({
    ok: true,
    accion: "acarreo_planta",
    mina: filtros.mina,
    desde: filtros.desdeTexto,
    hasta: filtros.hastaTexto,
    totalRegistros: datos.length,
    datos: datos
  });
}

function consultarStopeMate(params) {
  const filtros = validarFiltrosConsulta(params);

  if (filtros.mina !== "Santa Maria") {
    return respuestaConsultaVacia(
      "stopemate",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.STOPEMATE);

  if (!hoja || hoja.getLastRow() < 2) {
    return respuestaConsultaVacia(
      "stopemate",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const valores = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn())
    .getValues();

  const datos = [];

  valores.forEach(fila => {
    const fechaFila = normalizarFechaHoja(fila[1]);
    const minaFila = String(fila[2] || "").trim();

    if (!fechaFila) return;
    if (minaFila !== filtros.mina) return;
    if (fechaFila < filtros.desde || fechaFila > filtros.hasta) return;

    datos.push({
      idReporte: fila[0] || "",
      fecha: formatearFecha(fechaFila),
      mina: minaFila,
      turno: fila[3] || "",
      responsable: fila[4] || "",
      equipo: fila[5] || "",
      lugar: fila[6] || "",
      metrosTurno: numeroSeguro(fila[7]),
      metrosDia: numeroSeguro(fila[7])
    });
  });

  ordenarPorFecha(datos);

  return respuestaJSON({
    ok: true,
    accion: "stopemate",
    mina: filtros.mina,
    desde: filtros.desdeTexto,
    hasta: filtros.hastaTexto,
    totalRegistros: datos.length,
    datos: datos
  });
}

function consultarBarrenoServicio(params) {
  const filtros = validarFiltrosConsulta(params);

  if (filtros.mina !== "Santa Maria") {
    return respuestaConsultaVacia(
      "barreno_servicio",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.BARRENO_SERVICIO);

  if (!hoja || hoja.getLastRow() < 2) {
    return respuestaConsultaVacia(
      "barreno_servicio",
      filtros.mina,
      filtros.desdeTexto,
      filtros.hastaTexto
    );
  }

  const valores = hoja
    .getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn())
    .getValues();

  const datos = [];

  valores.forEach(fila => {
    const fechaFila = normalizarFechaHoja(fila[1]);
    const minaFila = String(fila[2] || "").trim();

    if (!fechaFila) return;
    if (minaFila !== filtros.mina) return;
    if (fechaFila < filtros.desde || fechaFila > filtros.hasta) return;

    datos.push({
      idReporte: fila[0] || "",
      fecha: formatearFecha(fechaFila),
      mina: minaFila,
      turno: fila[3] || "",
      responsable: fila[4] || "",
      metrosTurno: numeroSeguro(fila[5])
    });
  });

  ordenarPorFecha(datos);

  return respuestaJSON({
    ok: true,
    accion: "barreno_servicio",
    mina: filtros.mina,
    desde: filtros.desdeTexto,
    hasta: filtros.hastaTexto,
    totalRegistros: datos.length,
    datos: datos
  });
}



function consultarCatalogos() {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.CATALOGOS);
  if (!hoja) throw new Error('No existe la hoja "CATALOGOS".');
  if (hoja.getLastRow() < 2) return respuestaJSON({ ok: true, accion: "catalogos", totalRegistros: 0, datos: [] });
  const valores = hoja.getDataRange().getDisplayValues();
  const encabezados = valores.shift().map(normalizarEncabezadoDocumento);
  const indice = {};
  encabezados.forEach((nombre, i) => indice[nombre] = i);
  const datos = valores.map(fila => ({
    tipoCatalogo: fila[indice.TIPO_CATALOGO] || "",
    mina: fila[indice.MINA] || "",
    nombre: fila[indice.NOMBRE] || "",
    grupo: fila[indice.GRUPO] || "",
    valor: fila[indice.VALOR] || "",
    unidad: fila[indice.UNIDAD] || "",
    activo: valorBooleanoDocumento(fila[indice.ACTIVO])
  })).filter(item => item.activo && item.tipoCatalogo && item.nombre);
  return respuestaJSON({ ok: true, accion: "catalogos", totalRegistros: datos.length, datos: datos });
}

function consultarMovimientoMaterial(params) {
  const filtros = validarFiltrosConsulta(params);
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.MOVIMIENTO_MATERIAL);
  if (!hoja || hoja.getLastRow() < 2) return respuestaConsultaVacia("movimiento_material", filtros.mina, filtros.desdeTexto, filtros.hastaTexto);
  const datos = [];
  hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues().forEach(fila => {
    const fecha = normalizarFechaHoja(fila[1]);
    if (!fecha || String(fila[2]).trim() !== filtros.mina || fecha < filtros.desde || fecha > filtros.hasta) return;
    datos.push({ idReporte: fila[0] || "", fecha: formatearFecha(fecha), mina: fila[2] || "", turno: fila[3] || "", responsable: fila[4] || "", equipo: fila[5] || "", familiaEquipo: fila[6] || "", tipoConteo: fila[7] || "", cantidad: numeroSeguro(fila[8]), procedencia: fila[9] || "", destino: fila[10] || "", material: fila[11] || "", capacidadYd3: numeroSeguro(fila[12]), densidadTM3: numeroSeguro(fila[13]), factorLlenado: numeroSeguro(fila[14]), volumenM3: numeroSeguro(fila[15]), tonelajeEstimado: numeroSeguro(fila[16]) });
  });
  ordenarPorFecha(datos);
  return respuestaJSON({ ok: true, accion: "movimiento_material", mina: filtros.mina, desde: filtros.desdeTexto, hasta: filtros.hastaTexto, totalRegistros: datos.length, datos: datos });
}

function consultarPlanSemanal(params) {
  const mina = String(params.mina || "").trim();
  const fechaTexto = String(params.fecha || "").trim();
  if (!mina || !fechaTexto) throw new Error("Para consultar el plan se requieren mina y fecha.");
  const fechaObjetivo = fechaDesdeTexto(fechaTexto);
  if (!fechaObjetivo) throw new Error("La fecha del plan no es válida.");
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.PLAN_SEMANAL);
  if (!hoja || hoja.getLastRow() < 2) return respuestaJSON({ ok: true, accion: "plan_semanal", mina: mina, fecha: fechaTexto, totalRegistros: 0, datos: [] });
  const datos = [];
  hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues().forEach(fila => {
    const fecha = normalizarFechaHoja(fila[2]);
    if (!fecha || String(fila[3]).trim() !== mina || formatearFecha(fecha) !== fechaTexto || !valorBooleanoDocumento(fila[12])) return;
    datos.push({ idPlan: fila[0] || "", semanaInicio: formatearFechaDocumento(fila[1]), fecha: formatearFecha(fecha), mina: fila[3] || "", idProyecto: fila[4] || "", idActividad: fila[5] || "", lugar: fila[6] || "", cuadrilla: fila[7] || "", pueblesProgramados: numeroSeguro(fila[8]), disparosProgramados: numeroSeguro(fila[9]), prioridad: fila[10] || "", comentarios: fila[11] || "" });
  });
  return respuestaJSON({ ok: true, accion: "plan_semanal", mina: mina, fecha: fechaTexto, totalRegistros: datos.length, datos: datos });
}

function consultarMaquinasPierna(params) {
  const filtros = validarFiltrosConsulta(params);
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.MAQUINAS_PIERNA);
  if (!hoja || hoja.getLastRow() < 2) return respuestaConsultaVacia("maquinas_pierna", filtros.mina, filtros.desdeTexto, filtros.hastaTexto);
  const datos = [];
  hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues().forEach(fila => {
    const fecha = normalizarFechaHoja(fila[1]);
    if (!fecha || String(fila[2]).trim() !== filtros.mina || fecha < filtros.desde || fecha > filtros.hasta) return;
    datos.push({ idReporte: fila[0] || "", fecha: formatearFecha(fecha), mina: fila[2] || "", turno: fila[3] || "", responsable: fila[4] || "", totalMaquinas: numeroSeguro(fila[5]), disponiblesTecnicamente: numeroSeguro(fila[6]), programadas: numeroSeguro(fila[7]), pobladas: numeroSeguro(fila[8]), operando: numeroSeguro(fila[8]), comentarios: fila[9] || "" });
  });
  ordenarPorFecha(datos);
  return respuestaJSON({ ok: true, accion: "maquinas_pierna", mina: filtros.mina, desde: filtros.desdeTexto, hasta: filtros.hastaTexto, totalRegistros: datos.length, datos: datos });
}

function consultarBarrenacionExploracion(params) {
  const filtros = validarFiltrosConsulta(params);
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJAS.BARRENACION_EXPLORACION);
  if (!hoja || hoja.getLastRow() < 2) return respuestaConsultaVacia("barrenacion_exploracion", filtros.mina, filtros.desdeTexto, filtros.hastaTexto);
  const datos = [];
  hoja.getRange(2, 1, hoja.getLastRow() - 1, hoja.getLastColumn()).getValues().forEach(fila => {
    const fecha = normalizarFechaHoja(fila[2]);
    if (!fecha || String(fila[3]).trim() !== filtros.mina || fecha < filtros.desde || fecha > filtros.hasta) return;
    datos.push({ idReporte: fila[0] || "", fecha: formatearFecha(fecha), mina: fila[3] || "", responsable: fila[4] || "", equipo: fila[5] || "", nombreBarreno: fila[6] || "", metrosBarrenados: numeroSeguro(fila[7]), ubicacion: fila[8] || "", objetivo: fila[9] || "", comentarios: fila[10] || "" });
  });
  ordenarPorFecha(datos);
  return respuestaJSON({ ok: true, accion: "barrenacion_exploracion", mina: filtros.mina, desde: filtros.desdeTexto, hasta: filtros.hastaTexto, totalRegistros: datos.length, datos: datos });
}

function consultarPersonal() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.PERSONAL);

  if (!hoja) {
    throw new Error('No existe la hoja "PERSONAL".');
  }

  const plantillaRequerida = numeroSeguro(hoja.getRange("B3").getValue()) || 0;
  const plantillaActual = numeroSeguro(hoja.getRange("B4").getValue()) || 0;
  const jornadasProgramadas = numeroSeguro(hoja.getRange("B6").getValue()) || 0;
  const jornadasAusentes = numeroSeguro(hoja.getRange("B7").getValue()) || 0;
  const indiceRotacion = numeroSeguro(hoja.getRange("B8").getValue()) || 0;

  const cumplimientoPlantilla =
    plantillaRequerida > 0
      ? (plantillaActual / plantillaRequerida) * 100
      : 0;

  const indiceAusentismo =
    jornadasProgramadas > 0
      ? (jornadasAusentes / jornadasProgramadas) * 100
      : 0;

  return respuestaJSON({
    ok: true,
    accion: "personal",
    datos: {
      plantillaRequerida: plantillaRequerida,
      plantillaActual: plantillaActual,
      jornadasProgramadas: jornadasProgramadas,
      jornadasAusentes: jornadasAusentes,
      cumplimientoPlantilla: redondear(cumplimientoPlantilla, 2),
      indiceAusentismo: redondear(indiceAusentismo, 2),
      indiceRotacion: redondear(indiceRotacion, 2)
    }
  });
}

function consultarSeguridad() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const hoja = ss.getSheetByName(HOJAS.SEGURIDAD);

  if (!hoja) {
    throw new Error('No existe la hoja "SEGURIDAD".');
  }

  /*
    Configuración esperada:
    B3  Horas-hombre acumuladas
    B4  Accidentes incapacitantes acumulados
    B5  Días perdidos acumulados
    B6  Días cargo acumulados
    B8  Fecha último accidente Tipo A
    B9  Fecha último accidente Tipo B
    B10 Fecha último accidente Tipo C

    Para pintar el calendario del mes actual:
    B20 Fechas del mes actual con accidente Tipo A
    B21 Fechas del mes actual con accidente Tipo B
    B22 Fechas del mes actual con accidente Tipo C

    Formato sugerido para B20:B22:
    2026-09-03, 2026-09-12
    También acepta saltos de línea, punto y coma o dd/mm/yyyy.
  */

  const horasHombre = numeroSeguro(hoja.getRange("B3").getValue()) || 0;
  const accidentesIncapacitantes = numeroSeguro(hoja.getRange("B4").getValue()) || 0;
  const diasPerdidos = numeroSeguro(hoja.getRange("B5").getValue()) || 0;
  const diasCargo = numeroSeguro(hoja.getRange("B6").getValue()) || 0;

  const fechaA = normalizarFechaSeguridad(hoja.getRange("B8").getValue());
  const fechaB = normalizarFechaSeguridad(hoja.getRange("B9").getValue());
  const fechaC = normalizarFechaSeguridad(hoja.getRange("B10").getValue());
  const fechaD = normalizarFechaSeguridad(hoja.getRange("B11").getValue());
  const fechaT = normalizarFechaSeguridad(hoja.getRange("B12").getValue());

  const hoy = new Date();
  const hoyNormalizado = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    0,
    0,
    0,
    0
  );

  const accidentesMesA = combinarFechasSeguridadMesActual(
    parseListaFechasSeguridad(hoja.getRange("B20").getValue()),
    fechaA,
    hoyNormalizado
  );

  const accidentesMesB = combinarFechasSeguridadMesActual(
    parseListaFechasSeguridad(hoja.getRange("B21").getValue()),
    fechaB,
    hoyNormalizado
  );

  const accidentesMesC = combinarFechasSeguridadMesActual(
    parseListaFechasSeguridad(hoja.getRange("B22").getValue()),
    fechaC,
    hoyNormalizado
  );
  const accidentesMesD = combinarFechasSeguridadMesActual(parseListaFechasSeguridad(hoja.getRange("B23").getValue()), fechaD, hoyNormalizado);
  const accidentesMesT = combinarFechasSeguridadMesActual(parseListaFechasSeguridad(hoja.getRange("B24").getValue()), fechaT, hoyNormalizado);

  const indiceFrecuencia =
    horasHombre > 0
      ? (accidentesIncapacitantes * 1000000) / horasHombre
      : 0;

  const indiceGravedad =
    horasHombre > 0
      ? ((diasPerdidos + diasCargo) * 1000000) / horasHombre
      : 0;

  const indiceAccidentabilidad =
    (indiceFrecuencia * indiceGravedad) / 1000;

  return respuestaJSON({
    ok: true,
    accion: "seguridad",
    datos: {
      horasHombre: horasHombre,
      accidentesIncapacitantes: accidentesIncapacitantes,
      diasPerdidos: diasPerdidos,
      diasCargo: diasCargo,

      fechaUltimoAccidenteA: fechaSeguridadAString(fechaA),
      fechaUltimoAccidenteB: fechaSeguridadAString(fechaB),
      fechaUltimoAccidenteC: fechaSeguridadAString(fechaC),
      fechaUltimoAccidenteD: fechaSeguridadAString(fechaD),
      fechaUltimoAccidenteT: fechaSeguridadAString(fechaT),

      diasSinAccidenteA: calcularDiasSinAccidente(fechaA),
      diasSinAccidenteB: calcularDiasSinAccidente(fechaB),
      diasSinAccidenteC: calcularDiasSinAccidente(fechaC),
      diasSinAccidenteD: calcularDiasSinAccidente(fechaD),
      diasSinAccidenteT: calcularDiasSinAccidente(fechaT),

      indiceFrecuencia: redondear(indiceFrecuencia, 3),
      indiceGravedad: redondear(indiceGravedad, 3),
      indiceAccidentabilidad: redondear(indiceAccidentabilidad, 3),

      fechaActual: fechaSeguridadAString(hoyNormalizado),
      anioActual: hoyNormalizado.getFullYear(),
      mesActual: hoyNormalizado.getMonth() + 1,
      accidentesMesA: accidentesMesA,
      accidentesMesB: accidentesMesB,
      accidentesMesC: accidentesMesC,
      accidentesMesD: accidentesMesD,
      accidentesMesT: accidentesMesT
    }
  });
}

function normalizarFechaSeguridad(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(
      valor.getFullYear(),
      valor.getMonth(),
      valor.getDate(),
      0,
      0,
      0,
      0
    );
  }

  const texto = String(valor).trim();

  if (/^\\d{4}-\\d{2}-\\d{2}$/.test(texto)) {
    return fechaDesdeTexto(texto);
  }

  const fecha = new Date(texto);

  if (isNaN(fecha.getTime())) {
    return null;
  }

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    0,
    0,
    0,
    0
  );
}



function combinarFechasSeguridadMesActual(listaFechas, fechaUltimoAccidente, fechaActual) {
  const resultado = new Set(
    Array.isArray(listaFechas) ? listaFechas.filter(Boolean) : []
  );

  if (
    fechaUltimoAccidente &&
    fechaActual &&
    fechaUltimoAccidente.getFullYear() === fechaActual.getFullYear() &&
    fechaUltimoAccidente.getMonth() === fechaActual.getMonth()
  ) {
    resultado.add(fechaSeguridadAString(fechaUltimoAccidente));
  }

  return Array.from(resultado).sort();
}

function parseListaFechasSeguridad(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return [];
  }

  const partes = String(valor)
    .split(/[\n,;]+/)
    .map(item => String(item || "").trim())
    .filter(Boolean);

  const fechas = partes
    .map(normalizarTextoFechaSeguridad)
    .filter(Boolean)
    .map(fecha => fechaSeguridadAString(fecha));

  return fechas;
}

function normalizarTextoFechaSeguridad(texto) {
  if (!texto) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return fechaDesdeTexto(texto);
  }

  const matchLatino = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (matchLatino) {
    const dia = Number(matchLatino[1]);
    const mes = Number(matchLatino[2]) - 1;
    const anio = Number(matchLatino[3]);

    const fecha = new Date(anio, mes, dia, 0, 0, 0, 0);

    if (
      fecha.getFullYear() === anio &&
      fecha.getMonth() === mes &&
      fecha.getDate() === dia
    ) {
      return fecha;
    }

    return null;
  }

  const fecha = new Date(texto);

  if (isNaN(fecha.getTime())) {
    return null;
  }

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    0,
    0,
    0,
    0
  );
}

function fechaSeguridadAString(fecha) {
  if (!fecha) {
    return null;
  }

  return Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function calcularDiasSinAccidente(fecha) {
  if (!fecha) {
    return null;
  }

  const hoy = new Date();

  const hoyNormalizado = new Date(
    hoy.getFullYear(),
    hoy.getMonth(),
    hoy.getDate(),
    0,
    0,
    0,
    0
  );

  const diferenciaMs = hoyNormalizado.getTime() - fecha.getTime();

  if (diferenciaMs < 0) {
    return 0;
  }

  return Math.floor(diferenciaMs / 86400000);
}

function redondear(valor, decimales) {
  const factor = Math.pow(10, decimales);
  return Math.round((Number(valor) || 0) * factor) / factor;
}

function validarFiltrosConsulta(params) {
  const mina = String(params.mina || "").trim();
  const desdeTexto = String(params.desde || "").trim();
  const hastaTexto = String(params.hasta || "").trim();

  if (!mina) {
    throw new Error("Falta el parámetro mina.");
  }

  if (!desdeTexto) {
    throw new Error("Falta el parámetro desde.");
  }

  if (!hastaTexto) {
    throw new Error("Falta el parámetro hasta.");
  }

  const desde = fechaDesdeTexto(desdeTexto);
  const hasta = fechaDesdeTexto(hastaTexto);

  if (!desde || !hasta) {
    throw new Error("Las fechas deben tener formato YYYY-MM-DD.");
  }

  if (desde > hasta) {
    throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");
  }

  hasta.setHours(23, 59, 59, 999);

  return {
    mina,
    desdeTexto,
    hastaTexto,
    desde,
    hasta
  };
}

function respuestaConsultaVacia(accion, mina, desde, hasta) {
  return respuestaJSON({
    ok: true,
    accion: accion,
    mina: mina,
    desde: desde,
    hasta: hasta,
    totalRegistros: 0,
    datos: []
  });
}

function ordenarPorFecha(datos) {
  datos.sort((a, b) => {
    if (a.fecha < b.fecha) return -1;
    if (a.fecha > b.fecha) return 1;
    return 0;
  });
}

function formatearFecha(fecha) {
  return Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone(),
    "yyyy-MM-dd"
  );
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    if (!e || !e.postData || !e.postData.contents) throw new Error("No se recibió información en la petición.");
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    prepararHojas(ss);
    if (String(payload.tipoReporte || "mina").toLowerCase() === "exploracion") {
      return guardarReporteExploracion(ss, payload.exploracion || payload);
    }
    return guardarReporteMina(ss, payload);
  } catch (error) {
    console.error(error);
    return respuestaJSON({ ok: false, mensaje: error.message || String(error) });
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

function guardarReporteExploracion(ss, item) {
  ["fecha", "mina", "responsable", "equipo", "nombreBarreno", "ubicacion", "objetivo"].forEach(campo => {
    if (!item[campo]) throw new Error("Falta el campo de exploración: " + campo + ".");
  });
  if (!(Number(item.metrosBarrenados) > 0)) throw new Error("Los metros barrenados deben ser mayores a cero.");
  const id = Utilities.getUuid();
  agregarFilas(ss.getSheetByName(HOJAS.BARRENACION_EXPLORACION), [[
    id, new Date(), item.fecha, item.mina, item.responsable, item.equipo,
    item.nombreBarreno, Number(item.metrosBarrenados), item.ubicacion, item.objetivo, item.comentarios || ""
  ]]);
  return respuestaJSON({ ok: true, mensaje: "Reporte de exploración guardado correctamente.", id_reporte: id });
}

function guardarReporteMina(ss, reporte) {
  validarReporte(reporte);
  const e = reporte.encabezado;
  const fecha = e.fecha, mina = e.mina, periodo = "Día completo", responsable = e.responsable;
  if (reporteYaExiste(ss, fecha, mina)) throw new Error("Ya existe un reporte diario registrado para " + mina + " / " + fecha + ".");
  const id = Utilities.getUuid(), registro = new Date();

  const barrenacion = (reporte.barrenacion || []).map(item => [
    id, fecha, mina, periodo, responsable, item.obra || "", item.tipoTrabajo || item.tipo || "",
    item.detalleTrabajo || "", item.clasificacionAvance || "", numeroONulo(item.metrosLineales),
    numeroONulo(item.m3), item.material || ""
  ]);
  agregarFilas(ss.getSheetByName(HOJAS.BARRENACION), barrenacion);

  const movimientos = (reporte.movimientoMaterial || []).map(item => [
    id, fecha, mina, periodo, responsable, item.equipo || "", item.familiaEquipo || "",
    item.tipoConteo || "", numeroONulo(item.cantidad), item.procedencia || "", item.destino || "",
    item.material || "", numeroONulo(item.capacidadYd3), numeroONulo(item.densidadTM3),
    numeroONulo(item.factorLlenado), numeroONulo(item.volumenM3), numeroONulo(item.tonelajeEstimado)
  ]);
  agregarFilas(ss.getSheetByName(HOJAS.MOVIMIENTO_MATERIAL), movimientos);

  const listaEquipos = Array.isArray(reporte.estadoEquipos)
    ? reporte.estadoEquipos
    : Object.keys(reporte.estadoEquipos || {}).map(nombre => Object.assign({ equipo: nombre }, reporte.estadoEquipos[nombre]));
  const equipos = listaEquipos.map(item => [
    id, fecha, mina, periodo, responsable, item.equipo || "", item.familiaEquipo || "",
    item.estadoTecnico || item.estado || "", numeroONulo(item.horasOperadas),
    item.motivoNoOperacion || item.motivo || "", item.tipoFalla || "", item.comentarios || ""
  ]);
  agregarFilas(ss.getSheetByName(HOJAS.EQUIPOS), equipos);

  const mp = reporte.maquinasPierna || {};
  let filasMp = 0;
  if ([mp.totalMaquinas, mp.disponiblesTecnicamente, mp.programadas, mp.pobladas, mp.operando].some(v => v !== "" && v !== null && v !== undefined)) {
    agregarFilas(ss.getSheetByName(HOJAS.MAQUINAS_PIERNA), [[id, fecha, mina, periodo, responsable,
      numeroONulo(mp.totalMaquinas), numeroONulo(mp.disponiblesTecnicamente), numeroONulo(mp.programadas),
      numeroONulo(mp.pobladas ?? mp.operando), mp.comentarios || ""]]);
    filasMp = 1;
  }
  agregarFilas(ss.getSheetByName(HOJAS.MOTIVOS_MP), (mp.motivos || []).map(item => [
    id, fecha, mina, item.motivo || "", numeroONulo(item.cantidadAfectada), item.comentarios || ""
  ]));

  const cumplimiento = reporte.cumplimientoPuebles || null;
  if (cumplimiento && cumplimiento.idPlan) {
    agregarFilas(ss.getSheetByName(HOJAS.CUMPLIMIENTO_PUEBLES), [[
      id, cumplimiento.idPlan, fecha, mina, numeroONulo(cumplimiento.pueblesProgramados),
      numeroONulo(cumplimiento.pueblesRealizados), numeroONulo(cumplimiento.disparosProgramados),
      numeroONulo(cumplimiento.disparosRealizados), cumplimiento.comentarios || ""
    ]]);
    agregarFilas(ss.getSheetByName(HOJAS.CAUSAS_PUEBLES), (cumplimiento.causas || []).map(item => [
      id, cumplimiento.idPlan, fecha, mina, item.motivo || "", numeroONulo(item.cantidadNoCumplida), item.comentarios || ""
    ]));
  }

  let filasStope = 0;
  if (reporte.stopeMate && Number(reporte.stopeMate.metrosDia ?? reporte.stopeMate.metrosTurno) > 0) {
    agregarFilas(ss.getSheetByName(HOJAS.STOPEMATE), [[id, fecha, mina, periodo, responsable,
      reporte.stopeMate.equipo || "StopeMate", reporte.stopeMate.lugar || "",
      numeroONulo(reporte.stopeMate.metrosDia ?? reporte.stopeMate.metrosTurno)]]);
    filasStope = 1;
  }

  let toneladasPlanta = 0;
  const planta = (reporte.acarreoPlanta || []).map(item => {
    const toneladas = Number(item.toneladas) || 0; toneladasPlanta += toneladas;
    return [id, fecha, mina, periodo, responsable, toneladas, item.procedencia || ""];
  });
  agregarFilas(ss.getSheetByName(HOJAS.ACARREO_PLANTA), planta);
  agregarFilas(ss.getSheetByName(HOJAS.REPORTES), [[id, registro, fecha, mina, periodo, responsable,
    reporte.comentariosGenerales || "", barrenacion.length, movimientos.length, equipos.length, filasMp, filasStope, toneladasPlanta]]);
  return respuestaJSON({ ok: true, mensaje: "Reporte guardado correctamente.", id_reporte: id });
}

function doPostLegacy(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(15000);

    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No se recibió información en la petición.");
    }

    const reporte = JSON.parse(e.postData.contents);

    validarReporte(reporte);

    const ss = SpreadsheetApp.getActiveSpreadsheet();

    prepararHojas(ss);

    const encabezado = reporte.encabezado;

    const fecha = encabezado.fecha;
    const mina = encabezado.mina;
    const periodo = "Día completo";
    const responsable = encabezado.responsable;

    if (reporteYaExiste(ss, fecha, mina)) {
      throw new Error(
        "Ya existe un reporte diario registrado para " +
        mina + " / " + fecha + "."
      );
    }

    const idReporte = Utilities.getUuid();
    const fechaHoraRegistro = new Date();

    const filasBarrenacion = [];

    (reporte.barrenacion || []).forEach(item => {
      filasBarrenacion.push([
        idReporte,
        fecha,
        mina,
        periodo,
        responsable,
        item.obra || "",
        item.tipo || "",
        numeroONulo(item.metrosLineales),
        numeroONulo(item.m3),
        item.material || ""
      ]);
    });

    agregarFilas(
      ss.getSheetByName(HOJAS.BARRENACION),
      filasBarrenacion
    );

    const filasEquipos = [];
    const equipos = reporte.estadoEquipos || {};

    Object.keys(equipos).forEach(nombreEquipo => {
      const item = equipos[nombreEquipo];

      filasEquipos.push([
        idReporte,
        fecha,
        mina,
        periodo,
        responsable,
        nombreEquipo,
        item.estado || "",
        item.motivo || "",
        item.comentarios || ""
      ]);
    });

    agregarFilas(
      ss.getSheetByName(HOJAS.EQUIPOS),
      filasEquipos
    );

    if (
      mina === "Santa Maria" &&
      reporte.stopeMate !== null &&
      reporte.stopeMate !== undefined
    ) {
      agregarFilas(
        ss.getSheetByName(HOJAS.STOPEMATE),
        [[
          idReporte,
          fecha,
          mina,
          periodo,
          responsable,
          numeroONulo(reporte.stopeMate.metrosDia ?? reporte.stopeMate.metrosTurno)
        ]]
      );
    }

    if (
      mina === "Santa Maria" &&
      reporte.barrenoServicio !== null &&
      reporte.barrenoServicio !== undefined
    ) {
      agregarFilas(
        ss.getSheetByName(HOJAS.BARRENO_SERVICIO),
        [[
          idReporte,
          fecha,
          mina,
          periodo,
          responsable,
          numeroONulo(reporte.barrenoServicio.metrosDia ?? reporte.barrenoServicio.metrosTurno)
        ]]
      );
    }

    const filasPlanta = [];
    let toneladasPlanta = 0;

    (reporte.acarreoPlanta || []).forEach(item => {
      const tonelaje = Number(item.toneladas) || 0;

      toneladasPlanta += tonelaje;

      filasPlanta.push([
        idReporte,
        fecha,
        mina,
        periodo,
        responsable,
        tonelaje,
        item.procedencia || ""
      ]);
    });

    agregarFilas(
      ss.getSheetByName(HOJAS.ACARREO_PLANTA),
      filasPlanta
    );

    const filaReporte = [[
      idReporte,
      fechaHoraRegistro,
      fecha,
      mina,
      periodo,
      responsable,
      reporte.comentariosGenerales || "",
      filasBarrenacion.length,
      filasEquipos.length,
      toneladasPlanta
    ]];

    agregarFilas(
      ss.getSheetByName(HOJAS.REPORTES),
      filaReporte
    );

    return respuestaJSON({
      ok: true,
      mensaje: "Reporte guardado correctamente.",
      id_reporte: idReporte
    });

  } catch (error) {
    console.error(error);

    return respuestaJSON({
      ok: false,
      mensaje: error.message || String(error)
    });

  } finally {
    try {
      lock.releaseLock();
    } catch (e2) {}
  }
}

function validarReporte(reporte) {
  if (!reporte) {
    throw new Error("El reporte está vacío.");
  }

  if (!reporte.encabezado) {
    throw new Error("El reporte no contiene encabezado.");
  }

  const encabezado = reporte.encabezado;

  if (!encabezado.mina) {
    throw new Error("Falta la mina.");
  }

  if (!encabezado.fecha) {
    throw new Error("Falta la fecha.");
  }

  if (!encabezado.responsable) {
    throw new Error("Falta el responsable del reporte.");
  }

  const minasValidas = [
    "Santa Maria",
    "Unificación/Hallazgo"
  ];

  if (!minasValidas.includes(encabezado.mina)) {
    throw new Error("La mina indicada no es válida.");
  }
}

function configurarHojas() {
  prepararHojas(SpreadsheetApp.getActiveSpreadsheet());
}

function prepararHojas(ss) {
  migrarModeloReporteDiario(ss);

  Object.keys(ENCABEZADOS).forEach(nombreHoja => {
    let hoja = ss.getSheetByName(nombreHoja);

    if (!hoja) {
      hoja = ss.insertSheet(nombreHoja);
    }

    const encabezados = ENCABEZADOS[nombreHoja];

    if (hoja.getLastRow() === 0) {
      hoja
        .getRange(1, 1, 1, encabezados.length)
        .setValues([encabezados]);

      hoja
        .getRange(1, 1, 1, encabezados.length)
        .setFontWeight("bold");

      hoja.setFrozenRows(1);
    }
  });

  actualizarEncabezadosModeloDiario(ss);
}

function reporteYaExiste(ss, fecha, mina) {
  const hoja = ss.getSheetByName(HOJAS.REPORTES);

  if (!hoja || hoja.getLastRow() < 2) {
    return false;
  }

  const filas = hoja
    .getRange(
      2,
      3,
      hoja.getLastRow() - 1,
      2
    )
    .getDisplayValues();

  return filas.some(fila => {
    const fechaExistente = fila[0];
    const minaExistente = fila[1];

    return (
      fechaExistente === String(fecha) &&
      minaExistente === String(mina)
    );
  });
}

function migrarModeloReporteDiario(ss) {
  const hojaNueva = ss.getSheetByName("REPORTES_DIARIOS");
  const hojaAnterior = ss.getSheetByName("REPORTES_TURNO");

  if (!hojaNueva && hojaAnterior) {
    hojaAnterior.setName("REPORTES_DIARIOS");
  }
}

function actualizarEncabezadosModeloDiario(ss) {
  Object.keys(ENCABEZADOS).forEach(nombreHoja => {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;
    const encabezados = ENCABEZADOS[nombreHoja];
    hoja.getRange(1, 1, 1, encabezados.length).setValues([encabezados]).setFontWeight("bold");
    hoja.setFrozenRows(1);
  });
}

function actualizarEncabezadosModeloDiarioLegacy(ss) {
  const configuracion = {
    "REPORTES_DIARIOS": [
      "ID_REPORTE",
      "FECHA_HORA_REGISTRO",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "COMENTARIOS_GENERALES",
      "REGISTROS_BARRENACION",
        "REGISTROS_EQUIPOS",
      "TONELADAS_ACARREO_PLANTA"
    ],
    "BARRENACION": [
      "ID_REPORTE",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "OBRA",
      "TIPO_OBRA",
      "METROS_LINEALES",
      "M3",
      "MATERIAL"
    ],
    "ESTADO_EQUIPOS": [
      "ID_REPORTE",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "EQUIPO",
      "ESTADO",
      "MOTIVO",
      "COMENTARIOS"
    ],
    "STOPEMATE": [
      "ID_REPORTE",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "METROS_DIA"
    ],
    "BARRENO_SERVICIO": [
      "ID_REPORTE",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "METROS_DIA"
    ],
    "ACARREO_PLANTA": [
      "ID_REPORTE",
      "FECHA",
      "MINA",
      "PERIODO",
      "RESPONSABLE",
      "TONELAJE",
      "PROCEDENCIA"
    ]
  };

  Object.keys(configuracion).forEach(nombreHoja => {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) return;

    const encabezados = configuracion[nombreHoja];

    hoja
      .getRange(1, 1, 1, encabezados.length)
      .setValues([encabezados])
      .setFontWeight("bold");

    hoja.setFrozenRows(1);
  });
}

function fechaDesdeTexto(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return null;
  }

  const partes = texto.split("-");

  const fecha = new Date(
    Number(partes[0]),
    Number(partes[1]) - 1,
    Number(partes[2]),
    0,
    0,
    0,
    0
  );

  return fecha;
}

function normalizarFechaHoja(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return new Date(
      valor.getFullYear(),
      valor.getMonth(),
      valor.getDate(),
      0,
      0,
      0,
      0
    );
  }

  const texto = String(valor || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return fechaDesdeTexto(texto);
  }

  const fecha = new Date(texto);

  if (isNaN(fecha.getTime())) {
    return null;
  }

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate(),
    0,
    0,
    0,
    0
  );
}

function agregarFilas(hoja, filas) {
  if (!filas || filas.length === 0) {
    return;
  }

  const filaInicial = hoja.getLastRow() + 1;

  hoja
    .getRange(
      filaInicial,
      1,
      filas.length,
      filas[0].length
    )
    .setValues(filas);
}

function numeroONulo(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return "";
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero)) {
    return "";
  }

  return numero;
}

function numeroSeguro(valor) {
  if (
    valor === null ||
    valor === undefined ||
    valor === ""
  ) {
    return null;
  }

  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : null;
}

function respuestaJSON(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
