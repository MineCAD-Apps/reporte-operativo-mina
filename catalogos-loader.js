(function () {
  "use strict";
  const API_URL = "https://script.google.com/macros/s/AKfycbzstqms0HqJ5wWqt8oECspm9VkqRy5i5cYrMQ3kY3rhYADVnttDVu2He9tZuCu44w7p/exec";
  const CACHE_KEY = "minecad.catalogos.v18";
  const CACHE_MS = 15 * 60 * 1000;
  const isActive = value => ["si", "sí", "true", "1", "x", "activo"].includes(String(value || "").trim().toLowerCase());
  const normalize = row => ({
    tipoCatalogo: String(row.tipoCatalogo ?? row.TIPO_CATALOGO ?? "").trim().toUpperCase(),
    mina: String(row.mina ?? row.MINA ?? "").trim(),
    nombre: String(row.nombre ?? row.NOMBRE ?? "").trim(),
    grupo: String(row.grupo ?? row.GRUPO ?? "").trim().toUpperCase(),
    valor: row.valor ?? row.VALOR ?? "", unidad: String(row.unidad ?? row.UNIDAD ?? "").trim(),
    activo: row.activo === true || isActive(row.activo ?? row.ACTIVO)
  });
  function fromLegacy(data) {
    const rows = [];
    Object.entries(data.minas || {}).forEach(([mine, cfg]) => {
      (cfg.equipos || []).forEach(eq => rows.push(normalize({ TIPO_CATALOGO: "EQUIPO", MINA: mine, NOMBRE: eq.nombre, GRUPO: eq.tipo || "EQUIPOS_DIESEL", VALOR: eq.capacidadYd3, UNIDAD: "yd3", ACTIVO: "SI" })));
      [...(cfg.obras || []), ...(cfg.lugares || [])].forEach(place => rows.push(normalize({ TIPO_CATALOGO: "LUGAR", MINA: mine, NOMBRE: place, GRUPO: "OBRA_MINERA", ACTIVO: "SI" })));
    });
    Object.entries(data.parametrosMaterial || {}).forEach(([name, cfg]) => rows.push(normalize({ TIPO_CATALOGO: "MATERIAL", MINA: "Todas", NOMBRE: name, VALOR: cfg.densidadTonM3, UNIDAD: "Ton/m3", ACTIVO: "SI" })));
    (data.motivosFueraServicio || []).forEach(name => rows.push(normalize({ TIPO_CATALOGO: "MOTIVO_NO_OPERACION", MINA: "Todas", NOMBRE: name, GRUPO: "EQUIPOS_DIESEL", ACTIVO: "SI" })));
    return rows;
  }
  async function load() {
    let cached = null; try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); } catch (_) {}
    if (cached && Date.now() - cached.savedAt < CACHE_MS && Array.isArray(cached.rows)) return { rows: cached.rows, source: "cache" };
    try {
      const response = await fetch(`${API_URL}?accion=catalogos`, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!payload.ok || !Array.isArray(payload.datos)) throw new Error(payload.mensaje || "Respuesta inválida");
      const rows = payload.datos.map(normalize).filter(r => r.activo && r.tipoCatalogo && r.nombre);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), rows }));
      return { rows, source: "google" };
    } catch (networkError) {
      if (cached?.rows?.length) return { rows: cached.rows, source: "cache-stale", warning: networkError.message };
      const response = await fetch("catalogos.json", { cache: "no-store" });
      if (!response.ok) throw networkError;
      return { rows: fromLegacy(await response.json()), source: "fallback", warning: networkError.message };
    }
  }
  const matching = (rows, type, mine, group) => rows.filter(r => r.tipoCatalogo === String(type || "").toUpperCase() && (!mine || r.mina === mine || r.mina.toLowerCase() === "todas") && (!group || r.grupo === String(group).toUpperCase()));
  window.MinecadCatalogs = { API_URL, ready: load(), matching };
})();
