import api from './api.js'

export const empleadosService = {
  async getAll(params = {}) {
    const { data } = await api.get('/empleados', { params })
    return data
  },

  async buscar(search, limit = 20, offset = 0) {
    const { data } = await api.get('/empleados/buscar', {
      params: { search, limit, offset }
    })
    return data
  },

  async dashboard() {
    const { data } = await api.get('/empleados/dashboard')
    return data.data || {}
  },

  async getById(id) {
    const { data } = await api.get(`/empleados/${id}`)
    return data.data
  },

  async create(payload) {
    const { data } = await api.post('/empleados', payload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data.data
  },

  async update(id, payload) {
    const { data } = await api.put(`/empleados/${id}`, payload)
    return data.data
  },

  async baja(id, payload) {
    const { data } = await api.post(`/empleados/${id}/baja`, payload)
    return data
  },

  async update(id, payload) {
    const { data } = await api.put(`/empleados/${id}`, payload)
    return data
  },

  async subirFoto(id, formData) {
    const { data } = await api.post(`/empleados/${id}/foto`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return data
  },

  async bajaAccion(id, tipo) {
    const { data } = await api.post(`/empleados/${id}/baja-accion`, { tipo })
    return data
  },

  toggleBiometrico(id, valor) {
    return api.patch(`/empleados/${id}/biometrico`, { acceso_biometrico: valor })
    .then(r => r.data)
  },

  toggleSalidaAnticipada(id, valor) {
    return api.patch(`/empleados/${id}/salida-anticipada`, { permitir: valor })
      .then(r => r.data)
  },

  async getEstadoAsistencia(id) {
    const { data } = await api.get(`/empleados/${id}/estado-asistencia`)
    return data.data
  },

  // Expediente digital (solo administradores)
  async getDocumentos(id) {
    const { data } = await api.get(`/empleados/${id}/documentos`)
    return data.data || []
  },
  async subirDocumento(id, formData) {
    const { data } = await api.post(`/empleados/${id}/documentos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },
  async aprobarDocumento(docId) {
    const { data } = await api.post(`/empleados/documentos/${docId}/aprobar`)
    return data
  },
  async rechazarDocumento(docId, motivo) {
    const { data } = await api.post(`/empleados/documentos/${docId}/rechazar`, { motivo })
    return data
  },
  async eliminarDocumento(docId) {
    const { data } = await api.delete(`/empleados/documentos/${docId}`)
    return data
  },
  // El archivo exige JWT, así que se baja como blob y se abre en una pestaña nueva
  async abrirDocumento(docId) {
    const res = await api.get(`/empleados/documentos/${docId}/archivo`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },

  // Enrolamiento facial (TensorFlow.js en el navegador)
  async enrolarRostro(id, descriptorGuardar, descriptorVerificar) {
    const { data } = await api.post(`/empleados/${id}/enrolar`, {
      descriptor_guardar: descriptorGuardar,
      descriptor_verificar: descriptorVerificar,
    })
    return data
  },

  // Permisos del menú de la app Kiosko
  async getPermisosApp(id) {
    const { data } = await api.get(`/empleados/${id}/permisos-app`)
    return data.data
  },

  async guardarPermisosApp(id, permisos) {
    const { data } = await api.post(`/empleados/${id}/permisos-app`, { permisos })
    return data.data
  },

  // Restablece el enrolamiento: el empleado deberá enrolarse de nuevo en la app
  async reiniciarEnrolamiento(id) {
    const { data } = await api.post(`/empleados/${id}/enrolamiento-reset`)
    return data
  },

  async generarLinkEnrolamiento(id) {
    const { data } = await api.post(`/empleados/${id}/enrolamiento-link`)
    return data.data
  },

  async getIncidencias(id) {
    const { data } = await api.get(`/empleados/${id}/incidencias`)
    return data.data || []
  },

  async getAsistencias(id, params = {}) {
    const { data } = await api.get(`/empleados/${id}/asistencias`, { params })
    return data
  }

}