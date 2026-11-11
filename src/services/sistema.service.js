import api from './api.js'

export const sistemaService = {
  async estado() {
    const { data } = await api.get('/sistema/estado')
    return data.data // { hora_servidor, tareas: [...], version: {...} }
  },
}
