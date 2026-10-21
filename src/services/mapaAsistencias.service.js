import api from './api.js'

export const mapaAsistenciasService = {
  async getServicios(fecha) {
    const { data } = await api.get('/dashboard/mapa-servicios', { params: fecha ? { fecha } : {} })
    return data
  },

  async getEmpleados(idServicio, fecha) {
    const { data } = await api.get(`/dashboard/mapa-servicios/${idServicio}/empleados`, { params: fecha ? { fecha } : {} })
    return data.data || []
  },
}
