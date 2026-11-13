import api from './api.js'

export const lectorBiometricoService = {
  async resumen() {
    const { data } = await api.get('/lector-biometrico/resumen')
    return data.data // { totales, fechas, lotes }
  },
  async importar(archivo) {
    const fd = new FormData()
    fd.append('archivo', archivo)
    const { data } = await api.post('/lector-biometrico/importar', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 })
    return data.data
  },
  async movimientos(params) {
    const { data } = await api.get('/lector-biometrico/movimientos', { params })
    return data.data
  },
  async personas(params) {
    const { data } = await api.get('/lector-biometrico/personas', { params })
    return data.data
  },
  async empleados(q) {
    const { data } = await api.get('/lector-biometrico/empleados', { params: { q } })
    return data.data
  },
  async asignar(id_biometrico, id_empleado) {
    const { data } = await api.post('/lector-biometrico/asignar', { id_biometrico, id_empleado })
    return data
  },
  async asignarMasivo(filas) {
    const { data } = await api.post('/lector-biometrico/asignar-masivo', { filas })
    return data.data // { asignados, errores, total_errores }
  },
}
