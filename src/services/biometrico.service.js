import api from './api.js'

export const biometricoService = {
  async getRegistros(params = {}) {
    const { data } = await api.get('/biometrico/registros', { params })
    return data
  }
}