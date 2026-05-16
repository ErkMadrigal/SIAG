import api from './api.js'

export const empleadosService = {
  async getAll(params = {}) {
    const { data } = await api.get('/empleados', { params })
    return data
  },

  async buscar(search, limit = 20, offset = 0) {
    const { data } = await api.get('/empleados/buscar', {
      params: { search, limit, offset }
    })
    return data
  },

  async dashboard() {
    const { data } = await api.get('/empleados/dashboard')
    return data.data || {}
  },

  async getById(id) {
    const { data } = await api.get(`/empleados/${id}`)
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/empleados', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data.data
  },

  async update(id, payload) {
    const { data } = await api.put(`/empleados/${id}`, payload)
    return data.data
  },

  async baja(id, payload) {
    const { data } = await api.post(`/empleados/${id}/baja`, payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.put(`/empleados/${id}`, payload)
    return data
  },

  async subirFoto(id, formData) {
    const { data } = await api.post(`/empleados/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async bajaAccion(id, tipo) {
    const { data } = await api.post(`/empleados/${id}/baja-accion`, { tipo })
    return data
  },
  
}