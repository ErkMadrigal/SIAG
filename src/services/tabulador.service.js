import api from './api.js'

export const tabuladorService = {
  async getAll() {
    const { data } = await api.get('/tabulador')
    return data.data || []
  },

  async getById(id) {
    const { data } = await api.get(`/tabulador/${id}`)
    return data.data || {}
  },

  async getZonas() {
    const { data } = await api.get('/tabulador/zonas')
    return data.data || []
  },

  async getPuestos() {
    const { data } = await api.get('/tabulador/puestos')
    return (data.data || [])
      .filter(p => String(p.id_catalogo) === '10')
      .map(p => ({ id: p.id, puesto: p.valor }))
  },

  async create(payload) {
    const { data } = await api.post('/tabulador', payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.put(`/tabulador/${id}`, payload)
    return data
  },

  async duplicar(idOrigen, payload) {
    const { data } = await api.post(`/tabulador/${idOrigen}/duplicar`, payload)
    return data
  },

  async upsertItem(payload) {
    const { data } = await api.post(`/tabulador/${payload.id_tabulador}/item`, payload)
    return data
  },

  // ← FIX: la ruta real es singular "item" (no "items"), según Routes.php:
  //   $routes->delete('item/(:num)', 'Api\V1\ReportesController::deshabilitarItem/$1');
  async disableItem(id_item) {
    const { data } = await api.delete(`/tabulador/item/${id_item}`)
    return data
  },

  async setEstatus(id, estatus) {
    const { data } = await api.patch(`/tabulador/${id}/estatus`, { estatus })
    return data
  },
}