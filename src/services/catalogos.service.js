import api from './api.js'

export const catalogosService = {
  async getCatalogo(id) {
    const { data } = await api.get(`/catalogos/${id}`)
    return data.data || []
  },

  async getInstitucionBancaria(clabe) {
    const { data } = await api.get(`/catalogos/banco/${clabe}`)
    return data.data || null
  }
}