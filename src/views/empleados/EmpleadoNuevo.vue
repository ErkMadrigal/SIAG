<template>
  <div class="nuevo-emp">

    <!-- Header -->
    <div class="view-header">
      <div class="header-left">
        <button class="btn-back" @click="router.back()">
          <i class="ti ti-arrow-left" aria-hidden="true"></i>
        </button>
        <div>
          <h1 class="view-title">Nuevo empleado</h1>
          <p class="view-sub">Completa todos los campos requeridos</p>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn-sm" @click="limpiarForm">
          <i class="ti ti-eraser" aria-hidden="true"></i> Limpiar
        </button>
        <button class="btn-primary-lg" :disabled="submitting" @click="handleSubmit">
          <i class="ti ti-loader-2 spin" v-if="submitting" aria-hidden="true"></i>
          <i class="ti ti-check" v-else aria-hidden="true"></i>
          {{ submitting ? 'Guardando...' : 'Guardar empleado' }}
        </button>
      </div>
    </div>

    <!-- Banner draft -->
    <div v-if="hasDraft" class="draft-banner">
      <i class="ti ti-device-floppy" aria-hidden="true"></i>
      <span>Borrador guardado el <strong>{{ draftDate }}</strong></span>
      <button class="draft-clear" @click="limpiarForm">
        <i class="ti ti-trash"></i> Descartar
      </button>
    </div>

    <!-- Alert error -->
    <div v-if="errorMsg" class="alert-error">
      <i class="ti ti-alert-circle" aria-hidden="true"></i>
      {{ errorMsg }}
    </div>

    <!-- Alert éxito -->
    <div v-if="successMsg" class="alert-success">
      <i class="ti ti-circle-check" aria-hidden="true"></i>
      {{ successMsg }}
    </div>

    <div class="form-grid">

      <!-- SECCIÓN: Datos personales -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-user" aria-hidden="true"></i>
          <span>Datos personales</span>
        </div>
        <div class="sec-body">
          <div class="field-grid">
            <div class="field">
              <label>Nombre(s) <span class="req">*</span></label>
              <input v-model="form.nombre" :class="{ error: errors.nombre }" placeholder="JUAN" @input="toUpper('nombre')" />
              <span v-if="errors.nombre" class="err-msg">{{ errors.nombre }}</span>
            </div>
            <div class="field">
              <label>Apellido paterno <span class="req">*</span></label>
              <input v-model="form.paterno" :class="{ error: errors.paterno }" placeholder="GARCÍA" @input="toUpper('paterno')" />
              <span v-if="errors.paterno" class="err-msg">{{ errors.paterno }}</span>
            </div>
            <div class="field">
              <label>Apellido materno <span class="req">*</span></label>
              <input v-model="form.materno" :class="{ error: errors.materno }" placeholder="LÓPEZ" @input="toUpper('materno')" />
              <span v-if="errors.materno" class="err-msg">{{ errors.materno }}</span>
            </div>
            <div class="field">
              <label>CURP <span class="req">*</span></label>
              <input v-model="form.curp" :class="{ error: errors.curp }" maxlength="18" placeholder="XXXX000000XXXXXX00" @input="toUpper('curp')" />
              <span v-if="errors.curp" class="err-msg">{{ errors.curp }}</span>
            </div>
            <div class="field">
              <label>RFC <span class="req">*</span></label>
              <input v-model="form.rfc" :class="{ error: errors.rfc }" maxlength="13" placeholder="XXXX000000XXX" @input="toUpper('rfc')" />
              <span v-if="errors.rfc" class="err-msg">{{ errors.rfc }}</span>
            </div>
            <div class="field">
              <label>NSS <span class="req">*</span></label>
              <input v-model="form.nss" :class="{ error: errors.nss }" maxlength="11" placeholder="00000000000" />
              <span v-if="errors.nss" class="err-msg">{{ errors.nss }}</span>
            </div>
            <div class="field">
              <label>Código postal fiscal <span class="req">*</span></label>
              <input v-model="form.cp" :class="{ error: errors.cp }" maxlength="6" placeholder="00000" />
              <span v-if="errors.cp" class="err-msg">{{ errors.cp }}</span>
            </div>
            <div class="field">
              <label>Alergias <span class="req">*</span></label>
              <input v-model="form.alergias" :class="{ error: errors.alergias }" placeholder="NINGUNA" @input="toUpper('alergias')" />
              <span v-if="errors.alergias" class="err-msg">{{ errors.alergias }}</span>
            </div>
            <div class="field">
              <label>Escolaridad <span class="req">*</span></label>
              <select v-model="form.escolaridad" :class="{ error: errors.escolaridad }" :disabled="loadingCats">
                <option value="">Seleccione una escolaridad</option>
                <option v-for="c in cats.escolaridad" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.escolaridad" class="err-msg">{{ errors.escolaridad }}</span>
            </div>
            <div class="field">
              <label>Tipo de sangre <span class="req">*</span></label>
              <select v-model="form.tipoSangre" :class="{ error: errors.tipoSangre }" :disabled="loadingCats">
                <option value="">Seleccione un tipo de sangre</option>
                <option v-for="c in cats.tipoSangre" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.tipoSangre" class="err-msg">{{ errors.tipoSangre }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: Contacto de emergencia -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-first-aid-kit" aria-hidden="true"></i>
          <span>Contacto de emergencia</span>
        </div>
        <div class="sec-body">
          <div class="field-grid">
            <div class="field">
              <label>Nombre de emergencia <span class="req">*</span></label>
              <input v-model="form.nombreEmergencia" :class="{ error: errors.nombreEmergencia }" placeholder="NOMBRE COMPLETO" @input="toUpper('nombreEmergencia')" />
              <span v-if="errors.nombreEmergencia" class="err-msg">{{ errors.nombreEmergencia }}</span>
            </div>
            <div class="field">
              <label>Teléfono de emergencia <span class="req">*</span></label>
              <input v-model="form.telefonoEmergencia" :class="{ error: errors.telefonoEmergencia }" maxlength="10" placeholder="5512345678" />
              <span v-if="errors.telefonoEmergencia" class="err-msg">{{ errors.telefonoEmergencia }}</span>
            </div>
            <div class="field">
              <label>Parentesco <span class="req">*</span></label>
              <select v-model="form.parentesco" :class="{ error: errors.parentesco }" :disabled="loadingCats">
                <option value="">Seleccione un parentesco</option>
                <option v-for="c in cats.parentesco" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.parentesco" class="err-msg">{{ errors.parentesco }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: Datos laborales -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-briefcase" aria-hidden="true"></i>
          <span>Datos laborales</span>
        </div>
        <div class="sec-body">
          <div class="field-grid">
            <div class="field">
              <label>Turno <span class="req">*</span></label>
              <select v-model="form.turno" :class="{ error: errors.turno }" :disabled="loadingCats">
                <option value="">Seleccione un turno</option>
                <option v-for="c in cats.turno" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.turno" class="err-msg">{{ errors.turno }}</span>
            </div>
            <div class="field">
              <label>Puesto <span class="req">*</span></label>
              <select v-model="form.puesto" :class="{ error: errors.puesto }" :disabled="loadingCats">
                <option value="">Seleccione un puesto</option>
                <option v-for="c in cats.puesto" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.puesto" class="err-msg">{{ errors.puesto }}</span>
            </div>
            <div class="field">
              <label>Periodicidad de pago <span class="req">*</span></label>
              <select v-model="form.periodicidad" :class="{ error: errors.periodicidad }" :disabled="loadingCats">
                <option value="">Seleccione una periodicidad</option>
                <option v-for="c in cats.periodicidad" :key="c.id" :value="c.id">{{ c.valor }}</option>
              </select>
              <span v-if="errors.periodicidad" class="err-msg">{{ errors.periodicidad }}</span>
            </div>
            <div class="field">
              <label>Fecha de inicio <span class="req">*</span></label>
              <input type="date" v-model="form.fecha_efectiva" :class="{ error: errors.fecha_efectiva }" />
              <span v-if="errors.fecha_efectiva" class="err-msg">{{ errors.fecha_efectiva }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: Datos bancarios -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-credit-card" aria-hidden="true"></i>
          <span>Datos bancarios</span>
        </div>
        <div class="sec-body">
          <div class="field-grid">
            <div class="field field-full">
              <label>CLABE interbancaria <span class="req">*</span></label>
              <input
                v-model="form.interbancaria"
                :class="{ error: errors.interbancaria }"
                maxlength="23"
                placeholder="0000-0000-0000-0000-00"
                @input="onClabeInput"
                @blur="onClabeBlur"
              />
              <span v-if="errors.interbancaria" class="err-msg">{{ errors.interbancaria }}</span>
            </div>
            <div class="field">
              <label>Institución bancaria</label>
              <input v-model="form.institucionBancaria" readonly placeholder="Se detecta automáticamente" style="opacity:.7;cursor:default" />
            </div>
            <div class="field">
              <label>Código banco</label>
              <input v-model="form.banco" readonly style="opacity:.7;cursor:default" />
            </div>
          </div>
        </div>
      </div>

      <!-- SECCIÓN: Foto -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-camera" aria-hidden="true"></i>
          <span>Foto del empleado</span>
        </div>
        <div class="sec-body">
          <div class="foto-wrap">
            <div class="foto-preview" @click="triggerFoto">
              <img v-if="fotoPreview" :src="fotoPreview" alt="Foto empleado" />
              <div v-else class="foto-placeholder">
                <i class="ti ti-user-circle" aria-hidden="true"></i>
                <span>Clic para subir foto</span>
              </div>
            </div>
            <div class="foto-actions">
              <button class="btn-sm" type="button" @click="triggerFoto">
                <i class="ti ti-upload" aria-hidden="true"></i> Subir foto
              </button>
              <button v-if="fotoPreview" class="btn-sm danger" type="button" @click="quitarFoto">
                <i class="ti ti-trash" aria-hidden="true"></i> Quitar
              </button>
              <p class="foto-hint">JPG, PNG — máx. 2MB</p>
            </div>
            <input ref="fotoInput" type="file" accept="image/*" style="display:none" @change="onFotoChange" />
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { empleadosService } from '@/services/empleados.service.js'
import { catalogosService } from '@/services/catalogos.service.js'

const router = useRouter()
const ui     = useUiStore()

const submitting  = ref(false)
const loadingCats = ref(true)
const errorMsg    = ref('')
const successMsg  = ref('')
const fotoPreview = ref(null)
const fotoFile    = ref(null)
const fotoInput   = ref(null)
const hasDraft    = ref(false)
const draftDate   = ref('')

const DRAFT_KEY = 'siag_nuevo_empleado_draft'

const form = reactive({
  nombre: '', paterno: '', materno: '',
  curp: '', rfc: '', nss: '', cp: '', alergias: '',
  escolaridad: '', tipoSangre: '',
  nombreEmergencia: '', telefonoEmergencia: '', parentesco: '',
  turno: '', puesto: '', periodicidad: '', fecha_efectiva: '',
  interbancaria: '', institucionBancaria: '', banco: '',
})

const errors = reactive({})

const cats = reactive({
  turno: [], puesto: [], periodicidad: [],
  parentesco: [], escolaridad: [], tipoSangre: [],
})

// ── Draft ──────────────────────────────────────────
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({
    savedAt: new Date().toISOString(),
    values:  { ...form }
  }))
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    const draft = JSON.parse(raw)
    if (!draft?.values) return

    const hasData = Object.values(draft.values).some(v => v !== '')
    if (!hasData) return

    Object.entries(draft.values).forEach(([k, v]) => {
      if (k in form) form[k] = v
    })

    hasDraft.value  = true
    draftDate.value = new Date(draft.savedAt).toLocaleString('es-MX', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  } catch {
    localStorage.removeItem(DRAFT_KEY)
  }
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY)
  hasDraft.value  = false
  draftDate.value = ''
}

// Guarda automáticamente cada vez que cambia el form
watch(form, () => {
  const hasData = Object.values(form).some(v => v !== '')
  if (hasData) {
    saveDraft()
    hasDraft.value = true
  }
}, { deep: true })
// ──────────────────────────────────────────────────

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Empleados', to: '/empleados' },
    { label: 'Nuevo', to: '/empleados/nuevo' },
  ])
  loadDraft()
  await loadCatalogos()
})

async function loadCatalogos() {
  loadingCats.value = true
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
  } catch (err) {
    console.error('Error cargando catálogos:', err)
  } finally {
    loadingCats.value = false
  }
}

function formatCLABE(digits) {
  const d = digits.replace(/\D/g, '').slice(0, 18)
  return [d.slice(0,4), d.slice(4,8), d.slice(8,12), d.slice(12,16), d.slice(16,18)]
    .filter(Boolean).join('-')
}

function onClabeInput() {
  form.interbancaria    = formatCLABE(form.interbancaria)
  form.institucionBancaria = ''
  form.banco            = ''
  delete errors.interbancaria
}

async function onClabeBlur() {
  const digits = form.interbancaria.replace(/\D/g, '')
  if (digits.length < 3) return
  try {
    const banco = await catalogosService.getInstitucionBancaria(digits.slice(0,3))
    if (banco) {
      form.institucionBancaria = banco.valor || ''
      form.banco               = banco.id    || ''
    }
  } catch {}
}

function triggerFoto() { fotoInput.value?.click() }
function quitarFoto()  { fotoPreview.value = null; fotoFile.value = null }
function onFotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fotoFile.value = file
  const reader   = new FileReader()
  reader.onload  = (ev) => { fotoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function toUpper(field) { form[field] = form[field].toUpperCase() }

function validate() {
  const required = [
    ['nombre',             'El nombre es requerido'],
    ['paterno',            'El apellido paterno es requerido'],
    ['materno',            'El apellido materno es requerido'],
    ['curp',               'El CURP es requerido'],
    ['rfc',                'El RFC es requerido'],
    ['nss',                'El NSS es requerido'],
    ['cp',                 'El código postal es requerido'],
    ['alergias',           'Las alergias son requeridas'],
    ['escolaridad',        'La escolaridad es requerida'],
    ['tipoSangre',         'El tipo de sangre es requerido'],
    ['nombreEmergencia',   'El nombre de emergencia es requerido'],
    ['telefonoEmergencia', 'El teléfono de emergencia es requerido'],
    ['parentesco',         'El parentesco es requerido'],
    ['turno',              'El turno es requerido'],
    ['puesto',             'El puesto es requerido'],
    ['periodicidad',       'La periodicidad es requerida'],
    ['fecha_efectiva',     'La fecha de inicio es requerida'],
    ['interbancaria',      'La CLABE es requerida'],
  ]

  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true

  required.forEach(([field, msg]) => {
    if (!form[field]) { errors[field] = msg; ok = false }
  })

  const digits = form.interbancaria.replace(/\D/g, '')
  if (digits && digits.length !== 18) {
    errors.interbancaria = 'La CLABE debe tener 18 dígitos'
    ok = false
  }

  return ok
}

async function handleSubmit() {
  errorMsg.value   = ''
  successMsg.value = ''

  if (!validate()) {
    errorMsg.value = 'Por favor corrige los campos marcados en rojo.'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }

  submitting.value = true
  try {
    const fd = new FormData()
    fd.append('action', 'empleados')
    Object.entries(form).forEach(([k, v]) => fd.append(k, v))
    fd.append('institucionBancaria', form.banco)
    if (fotoFile.value) fd.append('fotoEmpleado', fotoFile.value)

    await empleadosService.create(fd)

    clearDraft()
    successMsg.value = '¡Empleado registrado correctamente!'
    window.scrollTo({ top: 0, behavior: 'smooth' })
    setTimeout(() => router.push('/empleados'), 1500)

  } catch (err) {
    errorMsg.value = err.response?.data?.message || 'Error al guardar el empleado'
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitting.value = false
  }
}

function limpiarForm() {
  Object.keys(form).forEach(k => form[k] = '')
  Object.keys(errors).forEach(k => delete errors[k])
  fotoPreview.value = null
  fotoFile.value    = null
  errorMsg.value    = ''
  successMsg.value  = ''
  clearDraft()
}
</script>

<style scoped>
.nuevo-emp { display: flex; flex-direction: column; gap: 14px; }
.view-header {
  display: flex; align-items: flex-start;
  justify-content: space-between; gap: 12px; flex-wrap: wrap;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.btn-back {
  width: 36px; height: 36px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx1); font-size: 18px; flex-shrink: 0; transition: all .15s;
}
.btn-back:hover { background: var(--bg3); color: var(--tx0); }
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }
.header-actions { display: flex; gap: 8px; align-items: center; }

/* Draft banner */
.draft-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; border-radius: 10px;
  background: var(--acc-dim); border: 0.5px solid var(--acc);
  font-size: 13px; color: var(--acc); flex-wrap: wrap;
}
.draft-banner i  { font-size: 16px; flex-shrink: 0; }
.draft-banner span { flex: 1; }
.draft-clear {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 6px;
  border: 0.5px solid var(--acc); background: transparent;
  color: var(--acc); font-size: 11px; cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.draft-clear:hover { background: var(--acc); color: #fff; }

/* Alerts */
.alert-error, .alert-success {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px; font-size: 13px;
}
.alert-error   { background: var(--red-dim); border: 0.5px solid var(--red); color: var(--red); }
.alert-success { background: var(--grn-dim); border: 0.5px solid var(--grn); color: var(--grn); }

.form-grid { display: flex; flex-direction: column; gap: 14px; }
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-body { padding: 16px; }
.field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
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
input.error, select.error { border-color: var(--red); }
input::placeholder { color: var(--tx3); }
input[readonly] { cursor: default; }
select option { background: var(--bg1); }
.err-msg { font-size: 11px; color: var(--red); }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-sm.danger { color: var(--red); border-color: var(--red); }
.btn-sm.danger:hover { background: var(--red-dim); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; transition: background .15s; font-family: inherit; font-weight: 500;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

/* Foto */
.foto-wrap { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.foto-preview {
  width: 120px; height: 120px; border-radius: 12px;
  border: 0.5px solid var(--bdr2); overflow: hidden;
  cursor: pointer; background: var(--bg2); flex-shrink: 0; transition: border .15s;
}
.foto-preview:hover { border-color: var(--acc); }
.foto-preview img { width: 100%; height: 100%; object-fit: cover; }
.foto-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: var(--tx3); font-size: 11px;
}
.foto-placeholder i { font-size: 36px; }
.foto-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.foto-hint { font-size: 11px; color: var(--tx3); margin-top: 4px; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .field-grid { grid-template-columns: 1fr; }
  .foto-wrap { flex-direction: column; align-items: center; }
}
</style>