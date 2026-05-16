import api from './api.js'

export const usuariosService = {
  async getAll() {
    const { data } = await api.get('/usuarios')
    return data.data || []
  },

  async getById(id) {
    const { data } = await api.get(`/usuarios/${id}`)
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/usuarios', payload)
    return data
  },

  async getRoles() {
    const { data } = await api.get('/usuarios/roles')
    return data.data || []
  },

  async setRoles(id_usuario, roles) {
    const { data } = await api.post(`/usuarios/${id_usuario}/roles`, { roles })
    return data
  },

  async cambiarPassword(id) {
    const { data } = await api.post(`/usuarios/${id}/reset-password`)
    return data
    },

    async darDeBaja(id) {
    const { data } = await api.patch(`/usuarios/${id}/estatus`)
    return data
    },

  async toggleEstatus(id) {
    const { data } = await api.patch(`/usuarios/${id}/estatus`)
    return data
  }
}