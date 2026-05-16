import api from './api.js'

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', {
      name_user: credentials.username,
      password:  credentials.password
    })
    // Normaliza la respuesta al formato que usa el store
    return {
      access_token:  data.data.tokens.access_token,
      refresh_token: data.data.tokens.refresh_token,
      user: {
        id:       data.data.usuario.id,
        nombre:   data.data.usuario.nombre,
        username: data.data.usuario.username,
        rol:      data.data.usuario.rol,
        rol_nivel: data.data.usuario.nivel,
        correo:   data.data.usuario.correo,
        empresas: data.data.usuario.empresas,
        vistas:   data.data.usuario.vistas,
      }
    }
  },

  async logout() {
    const { data } = await api.post('/auth/logout')
    return data
  },

  async refresh(refreshToken) {
    const { data } = await api.post('/auth/refresh', {
      refresh_token: refreshToken
    })
    return {
      access_token:  data.data.tokens.access_token,
      refresh_token: data.data.tokens.refresh_token,
    }
  },

  async me() {
    const { data } = await api.get('/auth/me')
    return data.data
  }
}