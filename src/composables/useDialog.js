import { reactive } from 'vue'

/**
 * Diálogos bonitos para reemplazar alert() / confirm() nativos.
 *   const dialog = useDialog()
 *   if (!(await dialog.confirmar({ titulo, mensaje, tipo: 'peligro', confirmText: 'Eliminar' }))) return
 *   dialog.alerta({ titulo: 'Listo', mensaje: '...', tipo: 'exito' })
 * tipo: 'info' | 'exito' | 'aviso' | 'error' | 'peligro'
 */
const state = reactive({ abierto: false, modo: 'alerta', titulo: '', mensaje: '', tipo: 'info', confirmText: 'Aceptar', cancelText: 'Cancelar', _resolve: null })

function abrir(modo, opts) {
  return new Promise(resolve => {
    // Si ya había uno abierto, se cierra como cancelado
    state._resolve?.(false)
    Object.assign(state, {
      abierto: true, modo,
      titulo: opts.titulo || (modo === 'confirmar' ? '¿Estás seguro?' : 'Aviso'),
      mensaje: opts.mensaje || '',
      tipo: opts.tipo || (modo === 'confirmar' ? 'aviso' : 'info'),
      confirmText: opts.confirmText || (modo === 'confirmar' ? 'Confirmar' : 'Entendido'),
      cancelText: opts.cancelText || 'Cancelar',
      _resolve: resolve,
    })
  })
}

export function cerrarDialogo(valor) {
  const r = state._resolve
  state.abierto = false
  state._resolve = null
  r?.(valor)
}

export function useDialog() {
  return {
    state,
    confirmar: (opts) => abrir('confirmar', opts),
    alerta: (opts) => abrir('alerta', typeof opts === 'string' ? { mensaje: opts } : opts),
  }
}
