import api from './api.js'

export const nominaService = {
  async preview(params) {
    const { data } = await api.get('/nomina/preview', { params })
    if (data.status === 'sin_tabulador' || !data.data) return null
    return data
  }
}