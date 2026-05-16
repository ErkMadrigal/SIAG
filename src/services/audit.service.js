import api from './api.js'

export const auditService = {
  async getAll(params = {}) {
    const { data } = await api.get('/audit-log', { params })
    return data
  }
}