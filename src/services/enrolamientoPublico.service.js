import axios from 'axios'
import { API_BASE } from './api.js'

// Rutas públicas (sin login): el token del link es el acceso.
const http = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } })

export const enrolamientoPublicoService = {
  async info(token) {
    const { data } = await http.get(`/enrolamiento-publico/${token}`)
    return data.data
  },
  async enrolar(token, d1, d2) {
    const { data } = await http.post(`/enrolamiento-publico/${token}`, {
      descriptor_guardar: d1,
      descriptor_verificar: d2,
    })
    return data
  },
}
