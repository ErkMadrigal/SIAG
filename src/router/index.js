import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'
import AppShell from '@/components/layout/AppShell.vue'
import { sesionExpirada } from '@/composables/useInactividad.js'

const LoginView       = () => import('@/views/LoginView.vue')
const HomeView        = () => import('@/views/HomeView.vue')
const DashboardView   = () => import('@/views/DashboardView.vue')
const EmpleadosView   = () => import('@/views/empleados/EmpleadosView.vue')
const EmpleadoDetalle = () => import('@/views/empleados/EmpleadoDetalle.vue')

export const VISTAS_MAP = {
  home:          { path: '/',                label: 'Home',          icon: 'ti-home',              section: null },
  dashboard:     { path: '/dashboard',       label: 'Dashboard',     icon: 'ti-layout-dashboard',  section: null },
  empleados:     { path: '/empleados',       label: 'Empleados',     icon: 'ti-users',             section: 'Empleados' },
  colaboradores: { path: '/colaboradores',   label: 'Colaborador',   icon: 'ti-star',              section: 'Empleados' },
  biometrico:    { path: '/biometrico',      label: 'Biométrico',    icon: 'ti-fingerprint',       section: 'Asistencias' },
  registros:     { path: '/registros',       label: 'Registros',     icon: 'ti-clipboard-list',    section: 'Asistencias' },
  prenomina:     { path: '/prenomina',       label: 'Pre-nómina',    icon: 'ti-chart-bar',         section: 'Reportes' },
  cargar_nomina: { path: '/cargar-nomina', label: 'Cargar nómina', icon: 'ti-cloud-upload', section: 'Reportes' },
  fatiga_buscador: { path: '/fatiga-buscador', label: 'Fatiga · Buscador', icon: 'ti-search', section: 'Reportes' },


  nomina_workflow: { path: '/nominas', label: 'Nóminas', icon: 'ti-list-check', section: 'Reportes' },

  altas_bajas:   { path: '/altas-bajas',     label: 'Altas y Bajas', icon: 'ti-arrows-up-down',    section: 'Reportes' },
  
  incidencias:   { path: '/incidencias',     label: 'Incidencias',   icon: 'ti-alert-triangle',    section: 'Reportes' },
  hospitales:    { path: '/hospitales',      label: 'Hospitales',    icon: 'ti-building-hospital', section: 'Administración' },
  catalogos:     { path: '/catalogos',       label: 'Catálogos',     icon: 'ti-list',              section: 'Administración' },
  tabulador:     { path: '/tabulador',       label: 'Tabulador',     icon: 'ti-ruler-2',           section: 'Administración' },
  usuarios:      { path: '/usuarios',        label: 'Usuarios',      icon: 'ti-shield-lock',       section: 'Sistema' },
  configuracion: { path: '/configuracion',   label: 'Configuración', icon: 'ti-settings',          section: 'Sistema' },
  importaciones: { path: '/importaciones',   label: 'Importaciones', icon: 'ti-cloud-upload',      section: 'Sistema' },
}

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/buscar-empleado',
    name: 'buscador-rapido',
    component: () => import('@/views/BuscadorRapidoView.vue'),
    meta: { public: true }, 
  },
  {
    // AppShell envuelve todas las rutas protegidas
    path: '/',
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      { path: '',                      name: 'home',              component: HomeView,                                                                   meta: { vista: 'home' } },
      { path: 'dashboard',             name: 'dashboard',         component: DashboardView,                                                              meta: { vista: 'dashboard' } },
      { path: 'empleados',             name: 'empleados',         component: EmpleadosView,                                                              meta: { vista: 'empleados' } },
      { path: 'empleados/nuevo',       name: 'empleado-nuevo',    component: () => import('@/views/empleados/EmpleadoNuevo.vue'),                         meta: { vista: 'empleados' } },
      { path: 'empleados/:id',         name: 'empleado-detalle',  component: EmpleadoDetalle,                                                            meta: { vista: 'empleados' } },
      { path: 'colaboradores',         name: 'colaboradores',     component: () => import('@/views/ColaboradoresView.vue'),                               meta: { vista: 'colaboradores' } },
      { path: 'biometrico',            name: 'biometrico',        component: () => import('@/views/BiometricoView.vue'),                                  meta: { vista: 'biometrico' } },
      { path: 'registros',             name: 'registros',         component: () => import('@/views/RegistrosView.vue'),                                   meta: { vista: 'registros' } },
      { path: 'prenomina',             name: 'prenomina',         component: () => import('@/views/PrenominaView.vue'),                                   meta: { vista: 'prenomina' } },
      { path: 'cargar-nomina', name: 'cargar-nomina', component: () => import('@/views/ProcesarXlsmView.vue'), meta: { vista: 'cargar_nomina' } },
      { path: 'fatiga-buscador', name: 'fatiga-buscador', component: () => import('@/views/FatigaBuscadorView.vue'), meta: { vista: 'fatiga_buscador' } },

      { path: 'altas-bajas',           name: 'altas-bajas',       component: () => import('@/views/AltasBajasView.vue'),                                  meta: { vista: 'altas_bajas' } },
      { path: 'incidencias',           name: 'incidencias',       component: () => import('@/views/IncidenciasView.vue'),                                  meta: { vista: 'incidencias' } },
      { path: 'hospitales',            name: 'hospitales',        component: () => import('@/views/PlaceholderView.vue'),                                  meta: { vista: 'hospitales' } },
      { path: 'catalogos',             name: 'catalogos',         component: () => import('@/views/CatalogosView.vue'),                                   meta: { vista: 'catalogos' } },
      { path: 'parametros',            name: 'parametros',        component: () => import('@/views/ParametrosView.vue'),                                  meta: { vista: 'catalogos' } },
      { path: 'tabulador',             name: 'tabulador',         component: () => import('@/views/TabuladorView.vue'),                                   meta: { vista: 'tabulador' } },
      { path: 'usuarios',              name: 'usuarios',          component: () => import('@/views/UsuariosView.vue'),                                    meta: { vista: 'usuarios' } },
      { path: 'configuracion',         name: 'configuracion',     component: () => import('@/views/ConfiguracionView.vue'),                               meta: { vista: 'configuracion' } },
      { path: 'importaciones',         name: 'importaciones',     component: () => import('@/views/ImportacionesView.vue'),                               meta: { vista: 'importaciones' } },
      { path: 'importaciones/masiva',  name: 'importacion-masiva',component: () => import('@/views/ImportacionMasivaView.vue'),                           meta: { vista: 'importaciones' } },
      { path: 'perfil', name: 'perfil', component: () => import('@/views/PerfilView.vue'), meta: { vista: 'home' } },
      { path: 'control-area', name: 'control-area', component: () => import('@/views/ControlAreaView.vue'), meta: { vista: 'home' } },
      { path: 'actividades', name: 'actividades', component: () => import('@/views/ActividadesView.vue'), meta: { vista: 'home' } },
      { path: 'nominas', name: 'nomina-workflow', component: () => import('@/views/NominaWorkflowView.vue'), meta: { vista: 'nomina_workflow' } },

    ]
  },
  // Cualquier ruta desconocida → home (o login si no autenticado, el guard lo maneja)
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// ── GUARD GLOBAL ──────────────────────────────────────────────────────

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()

  if (to.name === 'login') {
    sesionExpirada.value = false
  }

  // ← MOVER aquí, antes de evaluar vistas
  if (!auth.user && auth.accessToken) {
    auth.restoreSession()
  }

  if (to.meta.public) {
    if (auth.isAuthenticated) return next('/')
    return next()
  }

  if (!auth.isAuthenticated) {
    return next({ name: 'login', query: { redirect: to.fullPath } })
  }

  if (to.meta.vista && to.meta.vista !== 'home') {
    console.log('vista pedida:', to.meta.vista, '| vistas del usuario:', auth.userVistas)

    // ← Ahora user ya está restaurado, userVistas calcula bien
    const tieneAcceso = auth.userVistas.includes(to.meta.vista)
    if (!tieneAcceso) return next('/')
  }

  next()
})

export default router