import api from './api.js'

export const camarasService = {
  async resumen() {
    const { data } = await api.get('/camaras/resumen')
    return data.data
  },

  // Detecta estado y dirección a partir de coordenadas (OpenStreetMap vía backend)
  async geocodificar(lat, lon) {
    const { data } = await api.get('/camaras/geocodificar', { params: { lat, lon } })
    return data.data || {}
  },

  async getAll(params = {}) {
    const { data } = await api.get('/camaras', { params })
    return data.data || []
  },

  async getById(id) {
    const { data } = await api.get(`/camaras/${id}`)
    return data // { data: camara, tickets: [] }
  },

  async create(formData) {
    const { data } = await api.post('/camaras', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async update(id, formData) {
    const { data } = await api.post(`/camaras/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async remove(id) {
    const { data } = await api.delete(`/camaras/${id}`)
    return data
  },

  async getTickets(params = {}) {
    const { data } = await api.get('/camaras/tickets', { params })
    return data.data || []
  },

  async getTicket(id) {
    const { data } = await api.get(`/camaras/tickets/${id}`)
    return data // { data: ticket, bitacora: [] }
  },

  async crearTicket(idCamara, formData) {
    const { data } = await api.post(`/camaras/${idCamara}/tickets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async comentarTicket(idTicket, payload) {
    const { data } = await api.post(`/camaras/tickets/${idTicket}/comentarios`, payload)
    return data
  }
}
