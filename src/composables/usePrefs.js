// Preferencias locales del panel (skynet_prefs). Se leen "en vivo" para que los cambios
// de Configuración apliquen sin recargar.
export const INACTIVIDAD_OPCIONES = [5, 10, 15, 20]   // minutos (todos los usuarios)
export const INACTIVIDAD_OPCIONES_ADMIN = [5, 10, 15, 20, 30, 60]   // administradores (nivel 1-2)
export const INACTIVIDAD_RECOMENDADA = 10
export const AUTO_REFRESH_MS = 3 * 60 * 1000          // cada 3 min

export function getPrefs() {
  try { return JSON.parse(localStorage.getItem('skynet_prefs') || '{}') } catch { return {} }
}

export function minutosInactividad(esAdmin = false) {
  const m = Number(getPrefs().inactividadMin)
  const validas = esAdmin ? INACTIVIDAD_OPCIONES_ADMIN : INACTIVIDAD_OPCIONES
  return validas.includes(m) ? m : INACTIVIDAD_RECOMENDADA
}

export function autoRefreshActivo() {
  return getPrefs().autoRefresh !== false   // por defecto: activo
}
