import { PlanningClient } from './reportes-client.mjs';
import { planningConfig } from './planning-config.mjs';

export function connectProjects(reload) {
  let client = new PlanningClient(planningConfig);
  const reconnect = document.getElementById('reconnectProjects');

  document.getElementById('authorizeProjects').addEventListener('click', () => {
    window.open(client.authorizationUrl(), '_blank', 'noopener,noreferrer');
  });
  reconnect.addEventListener('click', async () => {
    reconnect.disabled = true;
    client.dispose();
    client = new PlanningClient(planningConfig);
    try {
      await reload();
    } finally {
      reconnect.disabled = false;
    }
  });

  return async (action, params = {}) => {
    const id = crypto.randomUUID();
    let responses;
    try {
      responses = await client.call('loadOperationalQueries', [{ id, action, params }]);
    } catch (error) {
      if (error.message === 'Consulta de reporte no admitida' || error.message === 'Filtro no admitido') {
        throw new Error('La implementación de Apps Script aún no admite las consultas de proyectos. Publica la actualización del servicio.');
      }
      throw error;
    }
    const reply = Array.isArray(responses) ? responses.find(item => item.id === id) : null;
    if (!reply?.ok) throw new Error(reply?.error || 'El servicio no devolvió una respuesta para esta consulta.');
    if (!reply.result?.ok) throw new Error(reply.result?.mensaje || 'La consulta fue rechazada.');
    return reply.result;
  };
}
