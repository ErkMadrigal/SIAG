import api from './api.js'

// Mapeo slug-prefijo → una o varias vistas del VISTAS_MAP
const SLUG_A_VISTAS = {
  'empleados':    ['empleados'],
  'incidencias':  ['incidencias'],
  'asistencias':  ['biometrico', 'registros'],
  'biometrico':   ['biometrico', 'registros'],
  'reportes': ['prenomina', 'altas_bajas', 'cargar_nomina', 'nomina_workflow', 'revisar_nomina', 'dispersar_nomina', 'fatiga_buscador'],

  'usuarios':     ['usuarios'],
  'empresas':     ['catalogos', 'hospitales'],
  'catalogos':    ['catalogos'],
  'tabulador':    ['tabulador'],
  'configuracion':['configuracion'],
  'importaciones':['importaciones'],
  'colaboradores':['colaboradores'],
}



function slugsAVistas(slugs = []) {
  const vistas = new Set()
  slugs.forEach(slug => {
    const prefijo = slug.split('.')[0]   // "empleados.listar" → "empleados"
    const mapped  = SLUG_A_VISTAS[prefijo]
    if (mapped) mapped.forEach(v => vistas.add(v))
  })
  return [...vistas]
}

export const authService = {
  async login(credentials) {
    const { data } = await api.post('/auth/login', {
      name_user: credentials.username,
      password:  credentials.password
    })

    const usuario = data.data.usuario

    return {
      access_token:  data.data.tokens.access_token,
      refresh_token: data.data.tokens.refresh_token,
      user: {
        id:        usuario.id,
        nombre:    usuario.nombre,
        username:  usuario.username,
        rol:       usuario.rol,
        nivel:     usuario.nivel,
        rol_nivel: usuario.nivel,
        correo:    usuario.correo,
        empresas:  usuario.empresas,
        vistas:    slugsAVistas(usuario.vistas),
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
  },

  async updateMe(payload) {
    const { data } = await api.put('/auth/me', payload)
    return data
  },
 
  async cambiarPassword(payload) {
    // payload: { password_actual, password_nuevo }
    const { data } = await api.post('/auth/cambiar-password', payload)
    return data
  },
}