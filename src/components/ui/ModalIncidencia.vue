<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box">

        <div class="modal-hdr">
          <div class="modal-av" :style="{ background: emp.bg, color: emp.color }">
            {{ emp.initials }}
          </div>
          <div>
            <h2 class="modal-title">{{ emp.nombre }}</h2>
            <p class="modal-sub">Registrar incidencia</p>
          </div>
          <button class="modal-close" @click="$emit('close')">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <div class="modal-body">

          <div class="field">
            <label>Motivo de incidencia <span class="req">*</span></label>
            <select v-model="form.motivo" :class="{ error: errors.motivo }" :disabled="loadingCats">
              <option value="">Seleccione una incidencia</option>
              <option v-for="c in motivosInc" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select>
            <span v-if="errors.motivo" class="err-msg">{{ errors.motivo }}</span>
          </div>

          <div class="field">
            <label>Descripción <span class="req">*</span></label>
            <textarea v-model="form.descripcion" rows="3"
              placeholder="Describe la incidencia..."
              :class="{ error: errors.descripcion }"></textarea>
            <span v-if="errors.descripcion" class="err-msg">{{ errors.descripcion }}</span>
          </div>

          <div class="field">
            <label>Día(s) de la incidencia <span class="req">*</span></label>
            <div class="date-range-row">
              <div class="date-wrap">
                <label class="date-label">Inicio</label>
                <input type="date" v-model="form.fecha_inicio" :class="{ error: errors.fecha_inicio }" />
              </div>
              <span class="date-sep">→</span>
              <div class="date-wrap">
                <label class="date-label">Fin</label>
                <input type="date" v-model="form.fecha_final" :min="form.fecha_inicio" />
              </div>
            </div>
            <span v-if="errors.fecha_inicio" class="err-msg">{{ errors.fecha_inicio }}</span>
          </div>

          <div class="field">
            <label>Servicio <span class="req">*</span></label>
            <div class="search-service">
              <i class="ti ti-search" aria-hidden="true"></i>
              <input
                v-model="servicioQuery"
                placeholder="Buscar servicio..."
                @input="onServicioSearch"
                @focus="showServicioList = true"
                autocomplete="off"
              />
              <button v-if="servicioQuery" class="clear-btn" @click="clearServicio">
                <i class="ti ti-x"></i>
              </button>
            </div>
            <div v-if="showServicioList && servicioResultados.length" class="servicio-list">
              <div
                v-for="s in servicioResultados"
                :key="s.id"
                class="servicio-item"
                @mousedown.prevent="selectServicio(s)"
              >
                <i class="ti ti-map-pin" aria-hidden="true"></i>
                {{ s.text || s.valor || s.nombre }}
              </div>
            </div>
            <span v-if="errors.servicio" class="err-msg">{{ errors.servicio }}</span>
            <span v-if="form.servicioId" class="servicio-selected">
              <i class="ti ti-circle-check" style="color:var(--grn)"></i>
              ID seleccionado: {{ form.servicioId }}
            </span>
          </div>

          <!-- Comprobante -->
          <div class="field">
            <label>Comprobante</label>
            <div class="upload-area" @click="fileInputRef?.click()"
              :class="{ 'has-file': comprobante }">
              <template v-if="!comprobante">
                <i class="ti ti-cloud-upload" aria-hidden="true"></i>
                <span>Clic para subir archivo</span>
                <span class="upload-hint">JPG, PNG, PDF — máx. 5MB</span>
              </template>
              <template v-else>
                <div class="file-preview">
                  <img v-if="isImage" :src="comprobantePreview" class="preview-img" />
                  <div v-else class="pdf-preview">
                    <i class="ti ti-file-type-pdf" aria-hidden="true"></i>
                    <span>{{ comprobante.name }}</span>
                  </div>
                  <button class="remove-file" @click.stop="clearComprobante">
                    <i class="ti ti-x"></i>
                  </button>
                </div>
              </template>
            </div>
            <input ref="fileInputRef" type="file" accept="image/*,.pdf"
              style="display:none" @change="onFileChange" />
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-sm" @click="$emit('close')" :disabled="saving">Cancelar</button>
          <button class="btn-primary" :disabled="saving" @click="handleSubmit">
            <i class="ti ti-loader-2 spin" v-if="saving" aria-hidden="true"></i>
            <i class="ti ti-alert-triangle" v-else aria-hidden="true"></i>
            {{ saving ? 'Procesando...' : 'Procesar incidencia' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { catalogosService } from '@/services/catalogos.service.js'
import { empleadosService } from '@/services/empleados.service.js'
import api from '@/services/api.js'

const props = defineProps({
  emp: { type: Object, required: true }
})
const emit = defineEmits(['close', 'done'])

const saving          = ref(false)
const loadingCats     = ref(true)
const motivosInc      = ref([])
const servicioQuery   = ref('')
const servicioResultados = ref([])
const showServicioList = ref(false)
const fileInputRef    = ref(null)
const comprobante     = ref(null)
const comprobantePreview = ref(null)

const form = reactive({
  motivo:       '',
  descripcion:  '',
  fecha_inicio: new Date().toISOString().split('T')[0],
  fecha_final:  new Date().toISOString().split('T')[0],
  servicioId:   '',
})

const errors = reactive({})

const isImage = computed(() =>
  comprobante.value?.type?.startsWith('image/')
)

onMounted(async () => {
  try {
    motivosInc.value = await catalogosService.getCatalogo(18)
  } catch {}
  finally { loadingCats.value = false }

  document.addEventListener('click', handleClickOutside)
})

function handleClickOutside(e) {
  if (!e.target.closest('.search-service') && !e.target.closest('.servicio-list')) {
    showServicioList.value = false
  }
}

let searchTimer = null
function onServicioSearch() {
  form.servicioId = ''
  clearTimeout(searchTimer)
  if (!servicioQuery.value.trim() || servicioQuery.value.length < 2) {
    servicioResultados.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    try {
      const { data } = await api.get('/catalogos/servicios/select', {
        params: { query: servicioQuery.value, limit: 10, action: 'getServiciosSelect' }
      })
      servicioResultados.value = data.data || []
      showServicioList.value = true
    } catch { servicioResultados.value = [] }
  }, 300)
}

function selectServicio(s) {
  form.servicioId  = s.id
  servicioQuery.value = s.text || s.valor || s.nombre
  showServicioList.value = false
}

function clearServicio() {
  servicioQuery.value = ''
  form.servicioId  = ''
  servicioResultados.value = []
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  comprobante.value = file
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = ev => { comprobantePreview.value = ev.target.result }
    reader.readAsDataURL(file)
  }
}

function clearComprobante() {
  comprobante.value = null
  comprobantePreview.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.motivo)      { errors.motivo      = 'El motivo es requerido'; ok = false }
  if (!form.descripcion) { errors.descripcion = 'La descripción es requerida'; ok = false }
  if (!form.fecha_inicio){ errors.fecha_inicio = 'La fecha es requerida'; ok = false }
  if (!form.servicioId)  { errors.servicio    = 'Selecciona un servicio'; ok = false }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('id',           props.emp.id)
    fd.append('motivo',       form.motivo)
    fd.append('descripcion',  form.descripcion)
    fd.append('servicio',     form.servicioId)
    fd.append('fecha_inicio', form.fecha_inicio)
    fd.append('fecha_final',  form.fecha_final || form.fecha_inicio)
    if (comprobante.value) fd.append('comprobante', comprobante.value)

    await api.post('/incidencias', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    emit('done', '¡Incidencia registrada correctamente!')
  } catch (err) {
    errors.motivo = err.response?.data?.message || 'Error al procesar la incidencia'
  } finally { saving.value = false }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 520px;
  display: flex; flex-direction: column; overflow: hidden;
  max-height: 90vh;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr);
  flex-shrink: 0;
}
.modal-av {
  width: 38px; height: 38px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 600; flex-shrink: 0;
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-close:hover { color: var(--tx0); }
.modal-body {
  padding: 18px; display: flex; flex-direction: column;
  gap: 14px; overflow-y: auto;
}
.field { display: flex; flex-direction: column; gap: 5px; position: relative; }
label { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req { color: var(--red); }
input, select, textarea {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 12px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
  resize: vertical;
}
input:focus, select:focus, textarea:focus { border-color: var(--acc); }
input.error, select.error, textarea.error { border-color: var(--red); }
select option { background: var(--bg1); }
.err-msg { font-size: 11px; color: var(--red); }

/* Date range */
.date-range-row {
  display: flex; align-items: center; gap: 8px;
}
.date-wrap { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.date-label { font-size: 10px; color: var(--tx2); }
.date-sep { color: var(--tx3); font-size: 16px; margin-top: 16px; }

/* Servicio search */
.search-service {
  display: flex; align-items: center; gap: 8px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 0 10px;
  transition: border .15s;
}
.search-service:focus-within { border-color: var(--acc); }
.search-service i { font-size: 15px; color: var(--tx2); flex-shrink: 0; }
.search-service input {
  background: transparent; border: none; padding: 8px 0;
  flex: 1;
}
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 14px; padding: 0;
  display: flex; align-items: center;
}
.servicio-list {
  position: absolute; top: calc(100% + 4px); left: 0; right: 0;
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 8px; max-height: 180px; overflow-y: auto;
  z-index: 100;
}
.servicio-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; font-size: 12px; color: var(--tx1);
  cursor: pointer; transition: background .12s;
}
.servicio-item:hover { background: var(--bg2); color: var(--tx0); }
.servicio-item i { font-size: 14px; color: var(--tx2); }
.servicio-selected {
  font-size: 11px; color: var(--grn);
  display: flex; align-items: center; gap: 4px;
}

/* Upload */
.upload-area {
  border: 0.5px dashed var(--bdr2); border-radius: 10px;
  padding: 20px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 6px;
  cursor: pointer; transition: all .15s; background: var(--bg2);
  min-height: 90px; font-size: 12px; color: var(--tx2);
}
.upload-area:hover { border-color: var(--acc); color: var(--tx0); }
.upload-area.has-file { border-style: solid; border-color: var(--acc); padding: 12px; }
.upload-area i { font-size: 24px; }
.upload-hint { font-size: 10px; color: var(--tx3); }
.file-preview { display: flex; align-items: center; gap: 10px; width: 100%; }
.preview-img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
.pdf-preview {
  display: flex; align-items: center; gap: 8px;
  color: var(--red); font-size: 13px;
}
.pdf-preview i { font-size: 28px; }
.remove-file {
  margin-left: auto; width: 26px; height: 26px; border-radius: 6px;
  background: var(--red-dim); border: none; cursor: pointer;
  color: var(--red); display: flex; align-items: center; justify-content: center;
}

.modal-footer {
  padding: 14px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
}
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 13px; color: var(--tx1); cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); }
.btn-primary {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary:hover:not(:disabled) { background: var(--acc2); }
.btn-primary:disabled, .btn-sm:disabled { opacity: .5; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }
</style>