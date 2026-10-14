import { useAuthStore } from '@/stores/auth.js'

// const { can } = usePermisos()
// <button v-if="can('usuarios', 'crear')">  (leer | crear | actualizar | eliminar)
export function usePermisos() {
  const auth = useAuthStore()
  return { can: (modulo, accion) => auth.can(modulo, accion) }
}
