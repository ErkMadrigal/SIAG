import api from './api.js'

export const paquetesService = {
  async listar() {
    const { data } = await api.get('/paquetes')
    return data.data || []
  },
  async servicios() {
    const { data } = await api.get('/paquetes/servicios')
    return data.data || []
  },
  async buscarEmpleados(q) {
    const { data } = await api.get('/paquetes/empleados', { params: { q } })
    return data.data || []
  },
  async crear(payload) {
    const { data } = await api.post('/paquetes', payload)
    return data.data // { id, codigo }
  },
  async revocar(id) {
    const { data } = await api.delete(`/paquetes/${id}`)
    return data
  },
}
