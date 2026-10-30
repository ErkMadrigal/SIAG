// Preferencias locales del panel (skynet_prefs). Se leen "en vivo" para que los cambios
// de Configuración apliquen sin recargar.
export const INACTIVIDAD_OPCIONES = [5, 10, 15, 20]   // minutos
export const INACTIVIDAD_RECOMENDADA = 10
export const AUTO_REFRESH_MS = 3 * 60 * 1000          // cada 3 min

export function getPrefs() {
  try { return JSON.parse(localStorage.getItem('skynet_prefs') || '{}') } catch { return {} }
}

export function minutosInactividad() {
  const m = Number(getPrefs().inactividadMin)
  return INACTIVIDAD_OPCIONES.includes(m) ? m : INACTIVIDAD_RECOMENDADA
}

export function autoRefreshActivo() {
  return getPrefs().autoRefresh !== false   // por defecto: activo
}
