import api from './api.js'

export const dispositivosService = {
  async listar() {
    const { data } = await api.get('/dispositivos')
    return data // { data, resumen, version_publicada }
  },
  async actualizar(id, payload) {
    const { data } = await api.patch(`/dispositivos/${id}`, payload)
    return data
  },
  async versiones() {
    const { data } = await api.get('/dispositivos/versiones')
    return data // { data, estable, piloto }
  },
  async alertas(umbral) {
    const { data } = await api.get('/dispositivos/alertas', { params: umbral ? { umbral } : {} })
    return data // { data: [...], umbral }
  },
}
