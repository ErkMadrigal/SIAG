import api from './api.js'

export const incidenciasService = {
  async getAll(estado = 'pendiente') {
    const { data } = await api.get('/incidencias', { params: { estado } })
    return data.data || []
  },

  async aprobar(id, comentario = '') {
    const { data } = await api.post(`/incidencias/${id}/aprobar`, { tipo: 1, comentario })
    return data
  },

  async rechazar(id, comentario = '') {
    const { data } = await api.post(`/incidencias/${id}/aprobar`, { tipo: 2, comentario })
    return data
  }

}