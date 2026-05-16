<template>
  <div class="colab-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Colaboradores</h1>
        <p class="view-sub">Usuarios con acceso al sistema</p>
      </div>
      <button class="btn-primary-lg" @click="abrirNuevo">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuevo colaborador
      </button>
    </div>

    <!-- Alert credenciales -->
    <transition name="slide">
      <div v-if="credenciales" class="credenciales-card">
        <div class="cred-hdr">
          <div class="cred-icon"><i class="ti ti-shield-check" aria-hidden="true"></i></div>
          <div>
            <p class="cred-title">¡Colaborador creado con éxito!</p>
            <p class="cred-sub">Comparte estas credenciales con el nuevo colaborador</p>
          </div>
          <button class="cred-close" @click="credenciales = null"><i class="ti ti-x"></i></button>
        </div>
        <div class="cred-body">
          <div class="cred-item">
            <span class="cred-label">Usuario</span>
            <span class="cred-val">{{ credenciales.userName }}</span>
          </div>
          <div class="cred-item">
            <span class="cred-label">Contraseña</span>
            <span class="cred-val">{{ credenciales.password }}</span>
          </div>
          <button class="btn-copy" @click="copiarCredenciales">
            <i class="ti ti-copy" aria-hidden="true"></i>
            {{ copiado ? '¡Copiado!' : 'Copiar credenciales' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Formulario nuevo -->
    <div v-if="mostrarForm" class="sec">
      <div class="sec-hdr">
        <i class="ti ti-user-plus" aria-hidden="true"></i>
        <span>Nuevo colaborador</span>
        <button class="btn-sm ml-auto" style="margin-left:auto" @click="mostrarForm = false">
          <i class="ti ti-x"></i>
        </button>
      </div>
      <div class="sec-body">
        <div class="field-grid-4">
          <div class="field">
            <label>Nombre(s) <span class="req">*</span></label>
            <input v-model="form.nombre" :class="{ error: errors.nombre }"
              placeholder="JUAN" @input="toUpper('nombre')" />
            <span v-if="errors.nombre" class="err-msg">{{ errors.nombre }}</span>
          </div>
          <div class="field">
            <label>Apellido paterno <span class="req">*</span></label>
            <input v-model="form.paterno" :class="{ error: errors.paterno }"
              placeholder="GARCÍA" @input="toUpper('paterno')" />
            <span v-if="errors.paterno" class="err-msg">{{ errors.paterno }}</span>
          </div>
          <div class="field">
            <label>Apellido materno <span class="req">*</span></label>
            <input v-model="form.materno" :class="{ error: errors.materno }"
              placeholder="LÓPEZ" @input="toUpper('materno')" />
            <span v-if="errors.materno" class="err-msg">{{ errors.materno }}</span>
          </div>
          <div class="field">
            <label>Correo <span class="req">*</span></label>
            <input v-model="form.correo" type="email" :class="{ error: errors.correo }"
              placeholder="correo@ejemplo.com" />
            <span v-if="errors.correo" class="err-msg">{{ errors.correo }}</span>
          </div>
        </div>

        <!-- Resumen permisos -->
        <div class="perms-summary">
          <div class="perms-summary-info">
            <i class="ti ti-shield" style="color:var(--acc)" aria-hidden="true"></i>
            <span v-if="resumenPermisos">{{ resumenPermisos }}</span>
            <span v-else style="color:var(--tx3)">No has seleccionado permisos</span>
          </div>
          <button class="btn-sm" @click="abrirMatriz('new')">
            <i class="ti ti-settings" aria-hidden="true"></i>
            Seleccionar permisos
          </button>
        </div>

        <div class="sec-footer">
          <button class="btn-sm" @click="mostrarForm = false">Cancelar</button>
          <button class="btn-primary-lg" :disabled="saving" @click="handleCreate">
            <i class="ti ti-loader-2 spin" v-if="saving" aria-hidden="true"></i>
            <i class="ti ti-plus" v-else aria-hidden="true"></i>
            {{ saving ? 'Creando...' : 'Crear colaborador' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Tabla usuarios -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-users" aria-hidden="true"></i>
        <span>Usuarios registrados</span>
        <div class="hdr-actions">
          <div class="search-box">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input v-model="searchQuery" placeholder="Buscar nombre, usuario, correo..." />
            <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">
              <i class="ti ti-x"></i>
            </button>
          </div>
          <select class="sel" v-model="perPage">
            <option :value="5">5</option>
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
          </select>
          <button class="btn-sm" @click="loadUsers">
            <i class="ti ti-refresh" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <!-- Skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 5" :key="i"></div>
      </div>

      <!-- Tabla -->
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:50px">ID</th>
              <th style="width:200px">Nombre</th>
              <th style="width:130px">Usuario</th>
              <th style="width:190px">Correo</th>
              <th style="width:90px">Estatus</th>
              <th>Roles</th>
              <th style="width:80px;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in paginatedUsers" :key="u.id">
              <td class="id-cell">{{ String(u.id).padStart(3,'0') }}</td>
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: getAvatarBg(u.id), color: getAvatarColor(u.id) }">
                    {{ getInitials(u.nombre_completo) }}
                  </div>
                  <div>
                    <div class="emp-name">{{ u.nombre_completo }}</div>
                    <div class="emp-id">{{ u.correo }}</div>
                  </div>
                </div>
              </td>
              <td class="mono">{{ u.name_user || '—' }}</td>
              <td style="color:var(--tx2);font-size:12px">{{ u.correo }}</td>
              <td>
                <span class="pill" :class="u.estatus == 1 ? 'activo' : 'baja'">
                  <span class="dot"></span>
                  {{ u.estatus == 1 ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="roles-wrap">
                  <span v-for="(r, i) in getRoles(u)" :key="i" class="role-tag">{{ r }}</span>
                  <span v-if="!getRoles(u).length" style="color:var(--tx3);font-size:11px">Sin roles</span>
                </div>
              </td>
              <td @click.stop>
                    <div class="row-actions">
                        <button class="icon-btn" @click="abrirMatriz('edit', u)" title="Editar permisos">
                            <i class="ti ti-shield-lock"></i>
                        </button>
                        <button class="icon-btn accent" @click="abrirCambiarPass(u)" title="Cambiar contraseña">
                            <i class="ti ti-key"></i>
                        </button>
                        <button class="icon-btn danger" @click="abrirBaja(u)" title="Dar de baja"
                        v-if="u.estatus == 1">
                           <i class="ti ti-user-off"></i>
                        </button>
                    </div>
                </td>
            </tr>
            <tr v-if="!paginatedUsers.length">
              <td colspan="7" class="empty-row">No se encontraron colaboradores</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="pagination-bar">
        <span class="pg-info">
          Mostrando {{ Math.min((page-1)*perPage+1, filteredUsers.length) }}–{{ Math.min(page*perPage, filteredUsers.length) }}
          de {{ filteredUsers.length }}
        </span>
        <div class="pg-btns">
          <button class="pg-btn" :disabled="page===1" @click="page--">
            <i class="ti ti-chevron-left" style="font-size:13px"></i>
          </button>
          <button v-for="p in visiblePages" :key="p" class="pg-btn"
            :class="{ active: p === page }" @click="page = p">{{ p }}</button>
          <button class="pg-btn" :disabled="page>=totalPages" @click="page++">
            <i class="ti ti-chevron-right" style="font-size:13px"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL MATRIZ PERMISOS -->
    <Teleport to="body">
      <div v-if="matrizOpen" class="modal-overlay" @click.self="matrizOpen = false">
        <div class="matriz-box">

          <div class="modal-hdr">
            <div class="modal-av" v-if="matrizMode==='edit' && matrizUser"
              :style="{ background: getAvatarBg(matrizUser.id), color: getAvatarColor(matrizUser.id) }">
              {{ getInitials(matrizUser.nombre_completo) }}
            </div>
            <div class="modal-av acc" v-else>
              <i class="ti ti-shield" aria-hidden="true"></i>
            </div>
            <div>
              <p class="modal-title">
                {{ matrizMode === 'edit' ? matrizUser?.nombre_completo : 'Nuevo colaborador' }}
              </p>
              <p class="modal-sub">Selecciona permisos por módulo</p>
            </div>
            <button class="modal-close" @click="matrizOpen = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="matriz-body">
            <div v-if="loadingMatriz" class="skeleton-wrap" style="padding:16px">
              <div class="skeleton-row" v-for="i in 6" :key="i"></div>
            </div>
            <div v-else class="tabla-matriz-wrap">
              <table class="tabla-matriz">
                <thead>
                  <tr>
                    <th style="width:40px">#</th>
                    <th>Módulo</th>
                    <th class="tc">Ver</th>
                    <th class="tc">Crear</th>
                    <th class="tc">Actualizar</th>
                    <th class="tc">Eliminar</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in matrizData" :key="row.id_rol">
                    <td class="id-cell">{{ idx + 1 }}</td>
                    <td class="rol-name">{{ row.rol }}</td>
                    <td class="tc"><label class="switch">
                      <input type="checkbox" v-model="row.ver" />
                      <span class="slider"></span>
                    </label></td>
                    <td class="tc"><label class="switch">
                      <input type="checkbox" v-model="row.crear" />
                      <span class="slider"></span>
                    </label></td>
                    <td class="tc"><label class="switch">
                      <input type="checkbox" v-model="row.actualizar" />
                      <span class="slider"></span>
                    </label></td>
                    <td class="tc"><label class="switch">
                      <input type="checkbox" v-model="row.eliminar" />
                      <span class="slider"></span>
                    </label></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="matrizOpen = false">Cancelar</button>
            <button class="btn-primary-lg" :disabled="savingMatriz" @click="guardarMatriz">
              <i class="ti ti-loader-2 spin" v-if="savingMatriz" aria-hidden="true"></i>
              <i class="ti ti-check" v-else aria-hidden="true"></i>
              {{ savingMatriz ? 'Guardando...' : 'Guardar permisos' }}
            </button>
          </div>

        </div>
      </div>
    </Teleport>


    <!-- MODAL CAMBIAR CONTRASEÑA -->
<Teleport to="body">
  <div v-if="modalPass" class="modal-overlay" @click.self="modalPass = false">
    <div class="accion-box">
      <div class="modal-hdr">
        <div class="modal-av" :style="{ background: getAvatarBg(userAccion?.id), color: getAvatarColor(userAccion?.id) }">
          {{ getInitials(userAccion?.nombre_completo) }}
        </div>
        <div>
          <p class="modal-title">{{ userAccion?.nombre_completo }}</p>
          <p class="modal-sub">Restablecer contraseña</p>
        </div>
        <button class="modal-close" @click="modalPass = false"><i class="ti ti-x"></i></button>
      </div>

      <div class="accion-body">
        <!-- Resultado -->
        <template v-if="nuevasCreds">
          <div class="creds-result">
            <div class="creds-result-icon">
              <i class="ti ti-circle-check" aria-hidden="true"></i>
            </div>
            <p class="creds-result-title">¡Contraseña restablecida!</p>
            <p class="creds-result-sub">Comparte estas credenciales con el colaborador</p>
            <div class="creds-result-items">
              <div class="cred-item">
                <span class="cred-label">Usuario</span>
                <span class="cred-val">{{ nuevasCreds.userName }}</span>
              </div>
              <div class="cred-item">
                <span class="cred-label">Nueva contraseña</span>
                <span class="cred-val">{{ nuevasCreds.password }}</span>
              </div>
            </div>
            <button class="btn-copy-full" @click="copiarNuevasCreds">
              <i class="ti ti-copy" aria-hidden="true"></i>
              {{ copiado ? '¡Copiado!' : 'Copiar credenciales' }}
            </button>
          </div>
        </template>

        <!-- Confirmación -->
        <template v-else>
          <div class="accion-warn">
            <i class="ti ti-key" style="font-size:32px;color:var(--amb)" aria-hidden="true"></i>
            <p>Se generará una nueva contraseña aleatoria para <strong>{{ userAccion?.nombre_completo }}</strong>.</p>
            <p style="font-size:12px;color:var(--tx2)">La contraseña actual dejará de funcionar inmediatamente.</p>
          </div>
        </template>
      </div>

      <div class="modal-footer">
        <button class="btn-sm" @click="modalPass = false">{{ nuevasCreds ? 'Cerrar' : 'Cancelar' }}</button>
        <button v-if="!nuevasCreds" class="btn-amber" :disabled="savingAccion" @click="confirmarCambiarPass">
          <i class="ti ti-loader-2 spin" v-if="savingAccion" aria-hidden="true"></i>
          <i class="ti ti-key" v-else aria-hidden="true"></i>
          {{ savingAccion ? 'Generando...' : 'Restablecer contraseña' }}
        </button>
      </div>
    </div>
  </div>
</Teleport>

    <!-- MODAL DAR DE BAJA -->
    <Teleport to="body">
    <div v-if="modalBaja" class="modal-overlay" @click.self="modalBaja = false">
        <div class="accion-box">
        <div class="modal-hdr">
            <div class="modal-av" :style="{ background: getAvatarBg(userAccion?.id), color: getAvatarColor(userAccion?.id) }">
            {{ getInitials(userAccion?.nombre_completo) }}
            </div>
            <div>
            <p class="modal-title">{{ userAccion?.nombre_completo }}</p>
            <p class="modal-sub">Dar de baja del sistema</p>
            </div>
            <button class="modal-close" @click="modalBaja = false"><i class="ti ti-x"></i></button>
        </div>

        <div class="accion-body">
            <div class="accion-warn danger">
            <i class="ti ti-alert-triangle" style="font-size:36px;color:var(--red)" aria-hidden="true"></i>
            <p style="font-size:15px;font-weight:600;color:var(--tx0)">¿Estás seguro?</p>
            <p>Vas a dar de baja a <strong>{{ userAccion?.nombre_completo }}</strong> del sistema.</p>
            <p style="font-size:12px;color:var(--tx2)">El colaborador perderá acceso inmediatamente y no podrá iniciar sesión.</p>
            </div>
        </div>

        <div class="modal-footer">
            <button class="btn-sm" @click="modalBaja = false" :disabled="savingAccion">
            No, cancelar
            </button>
            <button class="btn-danger-lg" :disabled="savingAccion" @click="confirmarBaja">
            <i class="ti ti-loader-2 spin" v-if="savingAccion" aria-hidden="true"></i>
            <i class="ti ti-user-off" v-else aria-hidden="true"></i>
            {{ savingAccion ? 'Procesando...' : 'Sí, dar de baja' }}
            </button>
        </div>
        </div>
    </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { usuariosService } from '@/services/usuarios.service.js'

const ui = useUiStore()

const loading      = ref(true)
const saving       = ref(false)
const savingMatriz = ref(false)
const loadingMatriz = ref(false)
const mostrarForm  = ref(false)
const credenciales = ref(null)
const copiado      = ref(false)
const searchQuery  = ref('')
const page         = ref(1)
const perPage      = ref(10)
const usuarios     = ref([])
const roles        = ref([])

const matrizOpen   = ref(false)
const matrizMode   = ref('new')   // 'new' | 'edit'
const matrizUser   = ref(null)
const matrizData   = ref([])

const modalPass  = ref(false)
const modalBaja  = ref(false)
const userAccion = ref(null)
const nuevasCreds = ref(null)
const savingAccion = ref(false)

const form = reactive({ nombre: '', paterno: '', materno: '', correo: '' })
const errors = reactive({})

// matriz local para nuevo usuario (antes de crear)
const matrizNew = ref([])

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

const PERM = { VER: 4, CREAR: 3, ACTUALIZAR: 1, ELIMINAR: 2 }

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Colaboradores', to: '/colaboradores' }
  ])
  await Promise.all([loadUsers(), loadRoles()])
})

async function loadUsers() {
  loading.value = true
  try {
    usuarios.value = await usuariosService.getAll()
  } catch (err) {
    console.error(err)
  } finally { loading.value = false }
}

async function loadRoles() {
  try {
    roles.value = await usuariosService.getRoles()
  } catch {}
}

// Filtrado local
const filteredUsers = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return usuarios.value
  return usuarios.value.filter(u =>
    (u.nombre_completo || '').toLowerCase().includes(q) ||
    (u.name_user || '').toLowerCase().includes(q) ||
    (u.correo || '').toLowerCase().includes(q)
  )
})

watch(searchQuery, () => { page.value = 1 })
watch(perPage,     () => { page.value = 1 })

const totalPages = computed(() => Math.max(1, Math.ceil(filteredUsers.value.length / perPage.value)))

const visiblePages = computed(() => {
  const total = totalPages.value
  const cur   = page.value
  let start   = Math.max(1, cur - 2)
  let end     = Math.min(total, start + 4)
  start       = Math.max(1, end - 4)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

const paginatedUsers = computed(() => {
  const start = (page.value - 1) * perPage.value
  return filteredUsers.value.slice(start, start + perPage.value)
})

// Resumen permisos seleccionados para el nuevo usuario
const resumenPermisos = computed(() => {
  const sel = matrizNew.value.filter(r => r.ver || r.crear || r.actualizar || r.eliminar)
  if (!sel.length) return ''
  return sel.map(r => {
    const count = [r.ver, r.crear, r.actualizar, r.eliminar].filter(Boolean).length
    return `${r.rol} (${count})`
  }).join(' | ')
})

// Abrir formulario nuevo
function abrirNuevo() {
  mostrarForm.value = true
  Object.keys(form).forEach(k => form[k] = '')
  Object.keys(errors).forEach(k => delete errors[k])
  credenciales.value = null
  if (matrizNew.value.length === 0 && roles.value.length) {
    matrizNew.value = buildEmptyMatrix()
  }
}

function buildEmptyMatrix() {
  return roles.value.map(r => ({
    id_rol: Number(r.id),
    rol:    String(r.tipo || r.nombre || `Rol ${r.id}`),
    ver: false, crear: false, actualizar: false, eliminar: false
  }))
}

function abrirCambiarPass(u) {
  userAccion.value  = u
  nuevasCreds.value = null
  modalPass.value   = true
}

function abrirBaja(u) {
  userAccion.value = u
  modalBaja.value  = true
}

async function confirmarCambiarPass() {
  savingAccion.value = true
  try {
    const res = await usuariosService.cambiarPassword(userAccion.value.id)
    nuevasCreds.value = {
      userName: res.data?.name_user || userAccion.value.name_user,
      password: res.data?.password  || res.password || '—'
    }
  } catch (err) {
    console.error(err)
  } finally { savingAccion.value = false }
}

async function confirmarBaja() {
  savingAccion.value = true
  try {
    await usuariosService.darDeBaja(userAccion.value.id)
    modalBaja.value = false
    await loadUsers()
  } catch (err) {
    console.error(err)
  } finally { savingAccion.value = false }
}


function buildMatrixFromUser(rolesPermisos) {
  const arr = Array.isArray(rolesPermisos) ? rolesPermisos : []
  const byId = new Map(arr.map(x => [Number(x.id_rol), x]))

  return roles.value.map(r => {
    const found = byId.get(Number(r.id))

    // Soporta tanto array como string separado por comas
    let perms = []
    if (found?.permisos) {
      if (Array.isArray(found.permisos)) {
        perms = found.permisos.map(p => String(p).toLowerCase().trim())
      } else if (typeof found.permisos === 'string') {
        perms = found.permisos.split(',').map(p => p.toLowerCase().trim())
      }
    }

    return {
      id_rol:     Number(r.id),
      rol:        String(r.tipo || r.nombre || `Rol ${r.id}`).trim(),
      ver:        perms.includes('leer'),
      crear:      perms.includes('crear'),
      actualizar: perms.includes('actualizar'),
      eliminar:   perms.includes('eliminar'),
    }
  })
}

async function copiarNuevasCreds() {
  if (!nuevasCreds.value) return
  const texto = `Usuario: ${nuevasCreds.value.userName}\nContraseña: ${nuevasCreds.value.password}`
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => copiado.value = false, 2000)
  } catch {}
}

function matrizToPayload(matrix) {
  return matrix
    .filter(r => r.ver || r.crear || r.actualizar || r.eliminar)
    .map(r => {
      const perms = []
      if (r.ver)        perms.push('Leer')
      if (r.crear)      perms.push('Crear')
      if (r.actualizar) perms.push('Actualizar')
      if (r.eliminar)   perms.push('Eliminar')
      return { id: r.id_rol, permisos: perms }
    })
}

// Abrir modal matriz
async function abrirMatriz(mode, user = null) {
  matrizMode.value = mode
  matrizUser.value = user
  matrizOpen.value = true

  if (mode === 'new') {
    if (!matrizNew.value.length) {
      if (!roles.value.length) await loadRoles()
      matrizNew.value = buildEmptyMatrix()
    }
    matrizData.value = matrizNew.value
    return
  }

  // edit — carga permisos del usuario
  loadingMatriz.value = true
  try {
    if (!roles.value.length) await loadRoles()
    const u = await usuariosService.getById(user.id)
    matrizData.value = buildMatrixFromUser(u?.roles_permisos || [])
  } catch { matrizData.value = buildEmptyMatrix() }
  finally { loadingMatriz.value = false }
}

async function guardarMatriz() {
  savingMatriz.value = true
  try {
    if (matrizMode.value === 'new') {
      matrizNew.value = matrizData.value
      matrizOpen.value = false
      return
    }

    const rolesPayload = matrizToPayload(matrizData.value)
    await usuariosService.setRoles(matrizUser.value.id, rolesPayload)
    matrizOpen.value = false
    await loadUsers()
  } catch (err) {
    console.error(err)
  } finally { savingMatriz.value = false }
}

// Crear usuario
function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.nombre.trim())  { errors.nombre  = 'Requerido'; ok = false }
  if (!form.paterno.trim()) { errors.paterno = 'Requerido'; ok = false }
  if (!form.materno.trim()) { errors.materno = 'Requerido'; ok = false }
  if (!form.correo.trim())  { errors.correo  = 'Requerido'; ok = false }
  return ok
}

async function handleCreate() {
  if (!validate()) return

  const rolesPayload = matrizToPayload(matrizNew.value)
  if (!rolesPayload.length) {
    errors.correo = 'Selecciona al menos un permiso'
    return
  }

  saving.value = true
  try {
    const res = await usuariosService.create({
      nombre:  form.nombre,
      paterno: form.paterno,
      materno: form.materno,
      correo:  form.correo,
    })

    if (res.last_insert_id) {
      await usuariosService.setRoles(res.last_insert_id, rolesPayload)
    }

    credenciales.value = {
      userName: res.userName || res.name_user || '—',
      password: res.password || '—',
    }

    mostrarForm.value = false
    Object.keys(form).forEach(k => form[k] = '')
    matrizNew.value = buildEmptyMatrix()
    await loadUsers()
  } catch (err) {
    errors.correo = err.response?.data?.message || 'Error al crear el colaborador'
  } finally { saving.value = false }
}

async function copiarCredenciales() {
  if (!credenciales.value) return
  const texto = `Usuario: ${credenciales.value.userName}\nContraseña: ${credenciales.value.password}`
  try {
    await navigator.clipboard.writeText(texto)
    copiado.value = true
    setTimeout(() => copiado.value = false, 2000)
  } catch {}
}

function toUpper(field) { form[field] = form[field].toUpperCase() }
function getInitials(nombre) {
  if (!nombre) return 'US'
  return nombre.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()
}
function getAvatarBg(id)    { return AVATAR_COLORS[id % AVATAR_COLORS.length].bg }
function getAvatarColor(id) { return AVATAR_COLORS[id % AVATAR_COLORS.length].color }
function getRoles(u) {
  if (Array.isArray(u.roles)) return u.roles
  if (typeof u.roles === 'string') return u.roles.split(',').map(r => r.trim()).filter(Boolean)
  return []
}
</script>

<style scoped>

.icon-btn.accent { color: var(--amb); }
.icon-btn.accent:hover { background: var(--amb-dim); }
.icon-btn.danger { color: var(--red); }
.icon-btn.danger:hover { background: var(--red-dim); }

/* Modal acciones */
.accion-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 420px;
  display: flex; flex-direction: column; overflow: hidden;
}
.accion-body { padding: 20px; }
.accion-warn {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; text-align: center; padding: 10px 0;
  font-size: 13px; color: var(--tx1); line-height: 1.6;
}
.accion-warn.danger { background: var(--red-dim); border-radius: 10px; padding: 20px; }

/* Credenciales resultado */
.creds-result {
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; text-align: center;
}
.creds-result-icon {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--grn-dim); color: var(--grn);
  display: flex; align-items: center; justify-content: center; font-size: 26px;
}
.creds-result-title { font-size: 15px; font-weight: 600; color: var(--tx0); }
.creds-result-sub   { font-size: 12px; color: var(--tx2); }
.creds-result-items {
  display: flex; gap: 24px; background: var(--bg2);
  border: 0.5px solid var(--bdr2); border-radius: 10px;
  padding: 14px 20px; width: 100%; justify-content: center;
}
.btn-copy-full {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 20px; border-radius: 8px; width: 100%; justify-content: center;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  color: var(--tx1); font-size: 13px; cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.btn-copy-full:hover { background: var(--bg3); color: var(--tx0); }

/* Botones acción */
.btn-amber {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--amb); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: opacity .15s;
}
.btn-amber:hover:not(:disabled) { opacity: .85; }
.btn-amber:disabled { opacity: .5; cursor: not-allowed; }
.btn-danger-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--red); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: opacity .15s;
}
.btn-danger-lg:hover:not(:disabled) { opacity: .85; }
.btn-danger-lg:disabled { opacity: .5; cursor: not-allowed; }

.colab-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Credenciales */
.credenciales-card {
  background: var(--grn-dim); border: 0.5px solid var(--grn);
  border-radius: 12px; overflow: hidden;
}
.cred-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; border-bottom: 0.5px solid rgba(34,201,122,.2);
}
.cred-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(34,201,122,.2); color: var(--grn);
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.cred-title { font-size: 13px; font-weight: 500; color: var(--grn); }
.cred-sub   { font-size: 11px; color: var(--grn); opacity: .7; }
.cred-close {
  margin-left: auto; background: none; border: none;
  color: var(--grn); cursor: pointer; font-size: 16px; opacity: .7;
}
.cred-body  { padding: 14px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.cred-item  { display: flex; flex-direction: column; gap: 2px; }
.cred-label { font-size: 10px; color: var(--grn); opacity: .7; text-transform: uppercase; letter-spacing: .8px; }
.cred-val   { font-size: 15px; font-weight: 600; color: var(--grn); font-family: monospace; }
.btn-copy {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 14px; border-radius: 8px;
  background: rgba(34,201,122,.2); border: 0.5px solid var(--grn);
  color: var(--grn); font-size: 12px; cursor: pointer; font-family: inherit;
  margin-left: auto; transition: opacity .15s;
}
.btn-copy:hover { opacity: .8; }

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.hdr-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sec-body { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.sec-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 4px; }

/* Fields */
.field-grid-4 {
  display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 5px; }
label  { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req   { color: var(--red); }
input, select {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 12px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus, select:focus { border-color: var(--acc); }
input.error { border-color: var(--red); }
.err-msg { font-size: 11px; color: var(--red); }

/* Permisos summary */
.perms-summary {
  display: flex; align-items: center; gap: 10px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 10px 14px; flex-wrap: wrap;
}
.perms-summary-info { display: flex; align-items: center; gap: 8px; flex: 1; font-size: 12px; color: var(--tx1); }

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr);
}
td { padding: 10px 14px; color: var(--tx0); font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); }
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.id-cell { font-family: monospace; font-size: 11px; color: var(--tx2); }
.mono    { font-family: monospace; font-size: 12px; color: var(--tx1); }
.emp-cell { display: flex; align-items: center; gap: 8px; }
.emp-av {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; font-size: 13px; }
.emp-id   { font-size: 10px; color: var(--tx2); }
.roles-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
.role-tag {
  font-size: 10px; padding: 2px 7px; border-radius: 20px;
  background: var(--acc-dim); color: var(--acc); font-weight: 500;
}
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.activo { background: var(--grn-dim); color: var(--grn); }
.pill.baja   { background: var(--red-dim); color: var(--red); }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 14px; transition: all .15s;
}
.icon-btn:hover { background: var(--bg3); color: var(--tx0); }
.empty-row { text-align: center; color: var(--tx2); padding: 32px; }

/* Search */
.search-box {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 5px 10px; min-width: 220px;
}
.search-box i { font-size: 15px; color: var(--tx2); flex-shrink: 0; }
.search-box input {
  background: transparent; border: none; padding: 0;
  font-size: 12px; outline: none;
}
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 14px; padding: 0; display: flex;
}
.sel {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 5px 8px;
  font-size: 12px; color: var(--tx1); outline: none;
}

/* Paginación */
.pagination-bar {
  padding: 10px 14px; border-top: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;
}
.pg-info { font-size: 11px; color: var(--tx2); }
.pg-btns { display: flex; gap: 3px; }
.pg-btn {
  width: 28px; height: 28px; border-radius: 6px;
  background: transparent; border: 0.5px solid var(--bdr2);
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; cursor: pointer; color: var(--tx1);
  transition: all .15s; font-family: inherit;
}
.pg-btn:hover:not(:disabled) { background: var(--bg3); }
.pg-btn.active { background: var(--acc); color: #fff; border-color: var(--acc); }
.pg-btn:disabled { opacity: .4; cursor: not-allowed; }

/* Skeleton */
.skeleton-wrap { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 42px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Modal overlay */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.matriz-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 680px;
  display: flex; flex-direction: column; max-height: 90vh; overflow: hidden;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-av {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.modal-av.acc { background: var(--acc-dim); color: var(--acc); }
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-footer {
  padding: 14px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
}

/* Tabla matriz */
.matriz-body { flex: 1; overflow-y: auto; }
.tabla-matriz-wrap { padding: 12px 16px; }
.tabla-matriz { width: 100%; border-collapse: collapse; }
.tabla-matriz th {
  padding: 8px 12px; font-size: 10px; font-weight: 500;
  color: var(--tx2); text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); text-align: left;
}
.tabla-matriz td { padding: 10px 12px; border-bottom: 0.5px solid var(--bdr); font-size: 13px; }
.tabla-matriz tbody tr:last-child td { border-bottom: none; }
.tabla-matriz tbody tr:hover td { background: var(--bg2); }
.tc { text-align: center; }
.rol-name { font-weight: 500; color: var(--tx0); }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--bg4); border-radius: 20px; transition: .2s;
}
.slider::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: .2s;
}
input:checked + .slider { background: var(--acc); }
input:checked + .slider::before { transform: translateX(16px); }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

/* Slide transition */
.slide-enter-active, .slide-leave-active { transition: all .3s ease; }
.slide-enter-from { opacity: 0; transform: translateY(-10px); }
.slide-leave-to   { opacity: 0; transform: translateY(-10px); }

@media (max-width: 768px) {
  .field-grid-4 { grid-template-columns: 1fr 1fr; }
  .tabla-matriz th:nth-child(1), .tabla-matriz td:nth-child(1) { display: none; }
}
</style>