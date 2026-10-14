import api from './api.js'

export const mesaAyudaService = {
  async categorias() {
    const { data } = await api.get('/mesa-ayuda/categorias')
    return data.data || []
  },

  async usuarios() {
    const { data } = await api.get('/mesa-ayuda/usuarios')
    return data.data || []
  },

  async resumen() {
    const { data } = await api.get('/mesa-ayuda/resumen')
    return data.data
  },

  async getAll(params = {}) {
    const { data } = await api.get('/mesa-ayuda', { params })
    return data.data || []
  },

  async getById(id) {
    const { data } = await api.get(`/mesa-ayuda/${id}`)
    return data // { data: ticket, bitacora: [] }
  },

  async create(formData) {
    const { data } = await api.post('/mesa-ayuda', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async seguimiento(id, payload) {
    const { data } = await api.post(`/mesa-ayuda/${id}/seguimiento`, payload)
    return data
  }
}
