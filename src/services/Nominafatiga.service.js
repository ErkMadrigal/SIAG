import api from './api.js'

export const nominaFatigaService = {
  async procesar(formData) {
    const { data } = await api.post('/nomina-fatiga/procesar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  // Nuevo: procesa xlsm completo (altas + bajas + asistencia en un paso)
  async procesarXlsm(formData) {
    const { data } = await api.post('/nomina-fatiga/procesar-xlsm', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async listar() {
    const { data } = await api.get('/nomina-fatiga')
    return data
  },

  async detalle(idNomina) {
    const { data } = await api.get(`/nomina-fatiga/${idNomina}`)
    return data
  },

  async actualizarDetalle(idNomina, idDetalle, payload) {
    const { data } = await api.put(`/nomina-fatiga/${idNomina}/detalle/${idDetalle}`, payload)
    return data
  },

  async aprobar(idNomina) {
    const { data } = await api.post(`/nomina-fatiga/${idNomina}/aprobar`)
    return data
  },

  async rechazar(idNomina, comentario) {
    const { data } = await api.post(`/nomina-fatiga/${idNomina}/rechazar`, { comentario })
    return data
  },

  async dispersion(idNomina, formato = 'generico') {
    return await api.get(`/nomina-fatiga/${idNomina}/dispersion`, {
      responseType: 'blob',
      params: { formato }
    })
  },

  async iniciarAsistencia(formData) {
    const { data } = await api.post('/nomina-fatiga/iniciar-asistencia', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async procesarChunk(idNomina, limit = 100) {
    const { data } = await api.post(`/nomina-fatiga/${idNomina}/procesar-chunk`, { limit })
    return data
  },
}