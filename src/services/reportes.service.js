import api from './api.js'

export const reportesService = {
  async getAltas(fecha_inicio, fecha_fin) {
    const { data } = await api.get('/reportes/altas', {
      params: { fecha_inicio, fecha_fin }
    })
    return data.data || []
  },

  async getBajas(fecha_inicio, fecha_fin) {
    const { data } = await api.get('/reportes/bajas', {
      params: { fecha_inicio, fecha_fin }
    })
    return data.data || []
  }
}