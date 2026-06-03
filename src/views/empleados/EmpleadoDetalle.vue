<template>
  <div class="detalle-emp" v-if="empleado">

    <!-- Header perfil -->
    <div class="perfil-header">
      <button class="btn-back" @click="router.back()">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="perfil-av-wrap">
        <img v-if="empleado.fotos" :src="empleado.fotos" class="perfil-foto" />
        <div v-else class="perfil-av" :style="{ background: avatarBg, color: avatarColor }">
          {{ initials }}
        </div>
        <span class="perfil-status" :class="mapEstatus(empleado.estatus)"></span>
      </div>

      <div class="perfil-info">
        <h1 class="perfil-nombre">{{ empleado.nombreCompleto }}</h1>
        <p class="perfil-puesto">{{ empleado.puesto || '—' }}</p>
        <div class="perfil-badges">
          <span class="badge-no">Nº {{ String(empleado.id).padStart(6,'0') }}</span>
          <StatusPill :status="mapEstatus(empleado.estatus)" />
          <span class="badge-dato" v-if="empleado.curp">CURP: {{ empleado.curp }}</span>
          <span class="badge-dato" v-if="empleado.rfc">RFC: {{ empleado.rfc }}</span>
          <span class="badge-dato" v-if="empleado.nss">NSS: {{ empleado.nss }}</span>
          <span class="badge-dato" v-if="empleado.ubicacion_principal">
            <i class="ti ti-map-pin" style="font-size:11px"></i>
            {{ empleado.ubicacion_principal }}
          </span>
        </div>
      </div>
    </div>

    <!-- Alertas -->
    <div v-if="successMsg" class="alert-success"><i class="ti ti-circle-check"></i> {{ successMsg }}</div>
    <div v-if="errorMsg"   class="alert-error"><i class="ti ti-alert-circle"></i> {{ errorMsg }}</div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
        v-show="tab.key !== 'reactivar' || empleado.estatus === 0"
      >
        <i :class="['ti', tab.icon]" aria-hidden="true"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB: Personal -->
    <div v-if="activeTab === 'personal'" class="sec">
      <div class="sec-hdr"><i class="ti ti-user"></i> Datos personales</div>
      <div class="sec-body">
        <div class="field-grid">
          <div class="field"><label>Nombre(s) <span class="req">*</span></label>
            <input v-model="personal.nombre" @input="toUpper(personal,'nombre')" /></div>
          <div class="field"><label>Apellido paterno <span class="req">*</span></label>
            <input v-model="personal.paterno" @input="toUpper(personal,'paterno')" /></div>
          <div class="field"><label>Apellido materno <span class="req">*</span></label>
            <input v-model="personal.materno" @input="toUpper(personal,'materno')" /></div>
          <div class="field"><label>CURP</label>
            <input v-model="personal.curp" maxlength="18" @input="toUpper(personal,'curp')" /></div>
          <div class="field"><label>RFC</label>
            <input v-model="personal.rfc" maxlength="13" @input="toUpper(personal,'rfc')" /></div>
          <div class="field"><label>NSS</label>
            <input v-model="personal.nss" maxlength="11" /></div>
          <div class="field"><label>Código postal fiscal</label>
            <input v-model="personal.cp" maxlength="6" /></div>
          <div class="field"><label>Alergias</label>
            <input v-model="personal.alergias" @input="toUpper(personal,'alergias')" /></div>
          <div class="field"><label>Escolaridad</label>
            <select v-model="personal.escolaridad" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.escolaridad" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
          <div class="field"><label>Tipo de sangre</label>
            <select v-model="personal.tipoSangre" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.tipoSangre" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
          <div class="field"><label>Nombre emergencia</label>
            <input v-model="personal.nombreEmergencia" @input="toUpper(personal,'nombreEmergencia')" /></div>
          <div class="field"><label>Teléfono emergencia</label>
            <input v-model="personal.telefonoEmergencia" maxlength="10" /></div>
          <div class="field"><label>Parentesco</label>
            <select v-model="personal.parentesco" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.parentesco" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
        </div>
        <div class="sec-footer">
          <button class="btn-primary-lg" :disabled="saving" @click="guardarPersonal">
            <i class="ti ti-loader-2 spin" v-if="saving"></i>
            <i class="ti ti-check" v-else></i>
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Trabajo -->
    <div v-if="activeTab === 'trabajo'" class="sec">
      <div class="sec-hdr"><i class="ti ti-briefcase"></i> Datos laborales</div>
      <div class="sec-body">
        <div class="field-grid">
          <div class="field"><label>Turno</label>
            <select v-model="trabajo.turno" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.turno" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
          <div class="field"><label>Puesto</label>
            <select v-model="trabajo.puesto" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.puesto" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
          <div class="field"><label>Periodicidad</label>
            <select v-model="trabajo.periodicidad" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.periodicidad" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select></div>
          <div class="field"><label>Fecha de inicio</label>
            <input type="date" v-model="trabajo.fecha_efectiva" /></div>
        </div>
        <div class="sec-footer">
          <button class="btn-primary-lg" :disabled="saving" @click="guardarTrabajo">
            <i class="ti ti-loader-2 spin" v-if="saving"></i>
            <i class="ti ti-check" v-else></i>
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Banco -->
    <div v-if="activeTab === 'banco'" class="sec">
      <div class="sec-hdr"><i class="ti ti-credit-card"></i> Datos bancarios</div>
      <div class="sec-body">
        <div class="field-grid">
          <div class="field field-full">
            <label>CLABE interbancaria</label>
            <input v-model="banco.interbancaria" maxlength="23"
              placeholder="0000-0000-0000-0000-00"
              @input="onClabeInput" @blur="onClabeBlur" />
          </div>
          <div class="field"><label>Institución bancaria</label>
            <input v-model="banco.institucionBancaria" readonly style="opacity:.7" /></div>
          <div class="field"><label>Código banco</label>
            <input v-model="banco.bancoId" readonly style="opacity:.7" /></div>
        </div>
        <div class="sec-footer">
          <button class="btn-primary-lg" :disabled="saving" @click="guardarBanco">
            <i class="ti ti-loader-2 spin" v-if="saving"></i>
            <i class="ti ti-check" v-else></i>
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Foto -->
    <div v-if="activeTab === 'foto'" class="sec">
      <div class="sec-hdr"><i class="ti ti-camera"></i> Foto del empleado</div>
      <div class="sec-body">
        <div class="foto-wrap">
          <div class="foto-preview" @click="fotoInputRef?.click()">
            <img v-if="fotoPreview || empleado.fotos" :src="fotoPreview || empleado.fotos" />
            <div v-else class="foto-placeholder">
              <i class="ti ti-user-circle"></i>
              <span>Sin foto</span>
            </div>
          </div>
          <div class="foto-actions">
            <button class="btn-sm" @click="fotoInputRef?.click()">
              <i class="ti ti-upload"></i> Subir foto
            </button>
            <button class="btn-primary-lg" :disabled="!fotoFile || saving" @click="guardarFoto">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              <i class="ti ti-check" v-else></i>
              {{ saving ? 'Subiendo...' : 'Guardar foto' }}
            </button>
            <p class="foto-hint">JPG, PNG — máx 2MB</p>
          </div>
          <input ref="fotoInputRef" type="file" accept="image/*" style="display:none" @change="onFotoChange" />
        </div>
      </div>
    </div>

    <!-- TAB: Reactivar (solo si estatus === 0) -->
    <div v-if="activeTab === 'reactivar' && empleado.estatus === 0" class="sec">
      <div class="sec-hdr"><i class="ti ti-user-check"></i> Reactivar empleado</div>
      <div class="sec-body">
        <div class="reactivar-grid">
          <div class="reactivar-card" @click="bajaAccion('reactivacion')">
            <div class="reactivar-icon green"><i class="ti ti-user-check"></i></div>
            <h3>Reactivación</h3>
            <p>Cancela la baja y activa nuevamente al empleado con sus mismos datos.</p>
            <button class="btn-primary-lg" :disabled="saving">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              Reactivar
            </button>
          </div>
          <div class="reactivar-card" @click="bajaAccion('reingreso')">
            <div class="reactivar-icon blue"><i class="ti ti-door-enter"></i></div>
            <h3>Reingreso</h3>
            <p>Registra al empleado como reingreso activo (estatus = 1) sin cancelar la baja anterior.</p>
            <button class="btn-sm" :disabled="saving">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              Registrar reingreso
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="loading-wrap">
    <div class="skeleton-card" v-for="i in 3" :key="i"></div>
  </div>

  <!-- Error -->
  <div v-else class="empty-wrap">
    <i class="ti ti-user-off" style="font-size:48px;opacity:.3"></i>
    <p>No se encontró el empleado</p>
    <button class="btn-sm" @click="router.back()">Regresar</button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { empleadosService } from '@/services/empleados.service.js'
import { catalogosService } from '@/services/catalogos.service.js'
import StatusPill from '@/components/ui/StatusPill.vue'

const route  = useRoute()
const router = useRouter()
const ui     = useUiStore()

const loading    = ref(true)
const saving     = ref(false)
const loadingCats = ref(true)
const empleado   = ref(null)
const activeTab  = ref('personal')
const successMsg = ref('')
const errorMsg   = ref('')
const fotoPreview = ref(null)
const fotoFile    = ref(null)
const fotoInputRef = ref(null)

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

const tabs = [
  { key: 'personal',   label: 'Personal',  icon: 'ti-user' },
  { key: 'trabajo',    label: 'Trabajo',   icon: 'ti-briefcase' },
  { key: 'banco',      label: 'Banco',     icon: 'ti-credit-card' },
  { key: 'foto',       label: 'Foto',      icon: 'ti-camera' },
  { key: 'reactivar',  label: 'Reactivar', icon: 'ti-user-check' },
]

const personal = reactive({
  nombre: '', paterno: '', materno: '', curp: '', rfc: '', nss: '',
  cp: '', alergias: '', escolaridad: '', tipoSangre: '',
  nombreEmergencia: '', telefonoEmergencia: '', parentesco: ''
})

const trabajo = reactive({
  turno: '', puesto: '', periodicidad: '', fecha_efectiva: ''
})

const banco = reactive({
  interbancaria: '', institucionBancaria: '', bancoId: ''
})

const cats = reactive({
  turno: [], puesto: [], periodicidad: [],
  parentesco: [], escolaridad: [], tipoSangre: [],
})

const initials = computed(() => {
  if (!empleado.value?.nombreCompleto) return 'US'
  return empleado.value.nombreCompleto
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
})
const avatarBg    = computed(() => AVATAR_COLORS[empleado.value?.id % AVATAR_COLORS.length]?.bg    || '#1a2d4d')
const avatarColor = computed(() => AVATAR_COLORS[empleado.value?.id % AVATAR_COLORS.length]?.color || '#4f8ef7')

onMounted(async () => {
  await Promise.all([fetchEmpleado(), loadCatalogos()])
})

async function fetchEmpleado() {
  loading.value = true
  try {
    const data = await empleadosService.getById(route.params.id)
    empleado.value = data

    ui.setBreadcrumbs([
      { label: 'Home', to: '/' },
      { label: 'Empleados', to: '/empleados' },
      { label: data.nombreCompleto || 'Detalle', to: '#' }
    ])

    // Llena los formularios
    personal.nombre             = data.nombre             || ''
    personal.paterno            = data.paterno            || ''
    personal.materno            = data.materno            || ''
    personal.curp               = data.curp               || ''
    personal.rfc                = data.rfc                || ''
    personal.nss                = data.nss                || ''
    personal.cp                 = data.CP_fiscal          || ''
    personal.alergias           = data.alergias           || ''
    personal.escolaridad        = data.escolaridad        || ''
    personal.tipoSangre         = data.tipoSangre         || ''
    personal.nombreEmergencia   = data.nombreEmergencia   || ''
    personal.telefonoEmergencia = data.telefonoEmergencia || ''
    personal.parentesco         = data.parentesco         || ''

    trabajo.turno         = data.id_turno      || ''
    trabajo.puesto        = data.id_puesto     || ''
    trabajo.periodicidad  = data.id_periocidad || ''
    trabajo.fecha_efectiva = data.fecha_efectiva || ''

    banco.interbancaria      = data.clave_interbancaria || ''
    banco.institucionBancaria = data.institucionBancaria || ''
    banco.bancoId            = data.id_banco            || ''

  } catch (err) {
    console.error('Error:', err)
    empleado.value = null
  } finally {
    loading.value = false
  }
}

async function loadCatalogos() {
  try {
    const [turno, puesto, periodicidad, parentesco, escolaridad, tipoSangre] = await Promise.all([
      catalogosService.getCatalogo(7),
      catalogosService.getCatalogo(10),
      catalogosService.getCatalogo(9),
      catalogosService.getCatalogo(17),
      catalogosService.getCatalogo(1),
      catalogosService.getCatalogo(3),
    ])
    cats.turno        = turno
    cats.puesto       = puesto
    cats.periodicidad = periodicidad
    cats.parentesco   = parentesco
    cats.escolaridad  = escolaridad
    cats.tipoSangre   = tipoSangre
  } catch {}
  finally { loadingCats.value = false }
}

function mapEstatus(val) {
  const map = { 1: 'activo', 2: 'permiso', 0: 'baja' }
  return map[val] ?? 'activo'
}

function toUpper(obj, key) { obj[key] = obj[key].toUpperCase() }

function showSuccess(msg) {
  successMsg.value = msg
  errorMsg.value   = ''
  setTimeout(() => successMsg.value = '', 3000)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function showError(msg) {
  errorMsg.value   = msg
  successMsg.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function guardarPersonal() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:               'personal',
      nombre:             personal.nombre,
      paterno:            personal.paterno,
      materno:            personal.materno,
      curp:               personal.curp,
      rfc:                personal.rfc,
      nss:                personal.nss,
      cp:                 personal.cp,
      alergias:           personal.alergias,
      escolaridad:        personal.escolaridad,
      tipo_sangre:        personal.tipoSangre,
      telefonoEmergencia: personal.telefonoEmergencia,
      nombreEmergencia:   personal.nombreEmergencia,
      parentesco:         personal.parentesco,
    })
    showSuccess('Datos personales actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos personales')
  } finally { saving.value = false }
}

async function guardarTrabajo() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:           'trabajo',
      id_turno:       trabajo.turno,
      id_puesto:      trabajo.puesto,
      id_periocidad:  trabajo.periodicidad,
      fecha:          trabajo.fecha_efectiva,
    })
    showSuccess('Datos laborales actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos laborales')
  } finally { saving.value = false }
}

async function guardarBanco() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:                'banco',
      clave_interbancaria: banco.interbancaria.replace(/\D/g, ''),
      id_banco:            banco.bancoId,
    })
    showSuccess('Datos bancarios actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos bancarios')
  } finally { saving.value = false }
}

async function guardarFoto() {
  if (!fotoFile.value) return
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('foto', fotoFile.value)
    await empleadosService.subirFoto(route.params.id, fd)
    showSuccess('Foto actualizada correctamente')
    fotoFile.value = null
    await fetchEmpleado()
  } catch (err) {
    showError('Error al subir la foto')
  } finally { saving.value = false }
}

async function bajaAccion(tipo) {
  saving.value = true
  try {
    await empleadosService.bajaAccion(route.params.id, tipo)
    showSuccess(tipo === 'reactivacion' ? 'Empleado reactivado' : 'Reingreso registrado')
    await fetchEmpleado()
    activeTab.value = 'personal'
  } catch (err) {
    showError(err.response?.data?.message || 'Error al procesar la acción')
  } finally { saving.value = false }
}

function onFotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fotoFile.value = file
  const reader = new FileReader()
  reader.onload = ev => { fotoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function formatCLABE(digits) {
  const d = digits.replace(/\D/g, '').slice(0, 18)
  return [d.slice(0,4), d.slice(4,8), d.slice(8,12), d.slice(12,16), d.slice(16,18)]
    .filter(Boolean).join('-')
}
function onClabeInput() {
  banco.interbancaria      = formatCLABE(banco.interbancaria)
  banco.institucionBancaria = ''
  banco.bancoId            = ''
}
async function onClabeBlur() {
  const digits = banco.interbancaria.replace(/\D/g, '')
  if (digits.length < 3) return
  try {
    const b = await catalogosService.getInstitucionBancaria(digits.slice(0,3))
    if (b) { banco.institucionBancaria = b.valor || ''; banco.bancoId = b.id || '' }
  } catch {}
}
</script>

<style scoped>
.detalle-emp { display: flex; flex-direction: column; gap: 14px; }

/* Header perfil */
.perfil-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  padding: 20px;
  flex-wrap: wrap;
}
.btn-back {
  width: 36px; height: 36px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx1); font-size: 18px;
  transition: all .15s; flex-shrink: 0;
}
.btn-back:hover { background: var(--bg3); }
.perfil-av-wrap { position: relative; flex-shrink: 0; }
.perfil-foto {
  width: 72px; height: 72px; border-radius: 50%;
  object-fit: cover; border: 2px solid var(--bdr2);
}
.perfil-av {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 600;
}
.perfil-status {
  width: 14px; height: 14px; border-radius: 50%;
  position: absolute; bottom: 2px; right: 2px;
  border: 2px solid var(--bg1);
}
.perfil-status.activo { background: var(--grn); }
.perfil-status.baja   { background: var(--red); }
.perfil-status.permiso { background: var(--amb); }
.perfil-info { flex: 1; }
.perfil-nombre { font-size: 20px; font-weight: 600; color: var(--tx0); margin-bottom: 4px; }
.perfil-puesto { font-size: 13px; color: var(--tx2); margin-bottom: 10px; }
.perfil-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.badge-no {
  font-size: 11px; font-weight: 500; padding: 3px 8px;
  border-radius: 20px; background: var(--acc-dim); color: var(--acc);
}
.badge-dato {
  font-size: 11px; color: var(--tx2);
  background: var(--bg2); padding: 3px 8px;
  border-radius: 20px; border: 0.5px solid var(--bdr2);
}

/* Alerts */
.alert-error, .alert-success {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px; font-size: 13px;
}
.alert-error   { background: var(--red-dim); border: 0.5px solid var(--red); color: var(--red); }
.alert-success { background: var(--grn-dim); border: 0.5px solid var(--grn); color: var(--grn); }

/* Tabs */
.tabs-bar {
  display: flex; gap: 4px; flex-wrap: wrap;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 6px;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: none; background: transparent;
  font-size: 13px; color: var(--tx2);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-btn i { font-size: 15px; }

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-body { padding: 16px; }
.sec-footer { margin-top: 16px; display: flex; justify-content: flex-end; }

/* Fields */
.field-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field-full { grid-column: 1 / -1; }
label { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req { color: var(--red); }
input, select {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 12px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus, select:focus { border-color: var(--acc); }
input::placeholder { color: var(--tx3); }
select option { background: var(--bg1); }

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
  cursor: pointer; transition: background .15s;
  font-family: inherit; font-weight: 500;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

/* Foto */
.foto-wrap { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.foto-preview {
  width: 120px; height: 120px; border-radius: 12px;
  border: 0.5px solid var(--bdr2); overflow: hidden;
  cursor: pointer; background: var(--bg2); flex-shrink: 0;
}
.foto-preview img { width: 100%; height: 100%; object-fit: cover; }
.foto-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: var(--tx3); font-size: 11px;
}
.foto-placeholder i { font-size: 36px; }
.foto-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.foto-hint { font-size: 11px; color: var(--tx3); }

/* Reactivar */
.reactivar-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px;
}
.reactivar-card {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 10px;
  cursor: default;
}
.reactivar-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.reactivar-icon.green { background: var(--grn-dim); color: var(--grn); }
.reactivar-icon.blue  { background: var(--acc-dim); color: var(--acc); }
.reactivar-card h3 { font-size: 14px; font-weight: 500; color: var(--tx0); }
.reactivar-card p  { font-size: 12px; color: var(--tx2); line-height: 1.5; }

/* Loading */
.loading-wrap { display: flex; flex-direction: column; gap: 14px; }
.skeleton-card {
  height: 120px; background: var(--bg2); border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}
.empty-wrap {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 60px;
  color: var(--tx2); font-size: 13px;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .field-grid { grid-template-columns: 1fr; }
  .reactivar-grid { grid-template-columns: 1fr; }
  .perfil-header { flex-direction: column; align-items: center; text-align: center; }
  .perfil-badges { justify-content: center; }
  .tabs-bar { overflow-x: auto; }
}
</style>