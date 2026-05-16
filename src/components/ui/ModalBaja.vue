<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box">

        <!-- Header -->
        <div class="modal-hdr">
          <div class="modal-av" :style="{ background: emp.bg, color: emp.color }">
            {{ emp.initials }}
          </div>
          <div>
            <h2 class="modal-title">{{ emp.nombre }}</h2>
            <p class="modal-sub">Procesar baja del empleado</p>
          </div>
          <button class="modal-close" @click="$emit('close')">
            <i class="ti ti-x"></i>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">

          <div class="field-row">
            <div class="field">
              <label>Fecha efectiva de la baja <span class="req">*</span></label>
              <input type="date" v-model="form.fecha_baja" :class="{ error: errors.fecha_baja }" />
              <span v-if="errors.fecha_baja" class="err-msg">{{ errors.fecha_baja }}</span>
            </div>
            <div class="field">
              <label>Finiquito <span class="req">*</span></label>
              <select v-model="form.finiquito" :class="{ error: errors.finiquito }">
                <option value="">Selecciona una opción</option>
                <option value="1">Con finiquito</option>
                <option value="0">Sin finiquito</option>
              </select>
              <span v-if="errors.finiquito" class="err-msg">{{ errors.finiquito }}</span>
            </div>
          </div>

          <div class="field">
            <label>Motivo de baja <span class="req">*</span></label>
            <select v-model="form.motivo_baja" :class="{ error: errors.motivo_baja }" :disabled="loadingCats">
              <option value="">Seleccione un motivo</option>
              <option v-for="c in motivosBaja" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </select>
            <span v-if="errors.motivo_baja" class="err-msg">{{ errors.motivo_baja }}</span>
          </div>

          <div class="field">
            <label>Nota</label>
            <textarea v-model="form.nota_baja" rows="3" placeholder="Observaciones adicionales..."></textarea>
          </div>

        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button class="btn-sm" @click="$emit('close')" :disabled="saving">Cancelar</button>
          <button class="btn-danger" :disabled="saving" @click="handleSubmit">
            <i class="ti ti-loader-2 spin" v-if="saving" aria-hidden="true"></i>
            <i class="ti ti-user-off" v-else aria-hidden="true"></i>
            {{ saving ? 'Procesando...' : 'Procesar baja' }}
          </button>
        </div>

      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { catalogosService } from '@/services/catalogos.service.js'
import { empleadosService } from '@/services/empleados.service.js'

const props = defineProps({
  emp: { type: Object, required: true }
})
const emit = defineEmits(['close', 'done'])

const saving     = ref(false)
const loadingCats = ref(true)
const motivosBaja = ref([])

const form = reactive({
  fecha_baja:  new Date().toISOString().split('T')[0],
  finiquito:   '',
  motivo_baja: '',
  nota_baja:   '',
})

const errors = reactive({})

onMounted(async () => {
  try {
    motivosBaja.value = await catalogosService.getCatalogo(16)
  } catch {}
  finally { loadingCats.value = false }
})

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  let ok = true
  if (!form.fecha_baja)  { errors.fecha_baja  = 'La fecha es requerida'; ok = false }
  if (!form.finiquito)   { errors.finiquito   = 'Selecciona una opción'; ok = false }
  if (!form.motivo_baja) { errors.motivo_baja = 'El motivo es requerido'; ok = false }
  return ok
}

async function handleSubmit() {
  if (!validate()) return
  saving.value = true
  try {
    await empleadosService.baja(props.emp.id, {
      status:      0,
      fecha_baja:  form.fecha_baja,
      finiquito:   form.finiquito,
      motivo_baja: form.motivo_baja,
      nota_baja:   form.nota_baja,
    })
    emit('done', '¡Baja procesada correctamente!')
  } catch (err) {
    errors.motivo_baja = err.response?.data?.message || 'Error al procesar la baja'
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
  background: var(--bg1);
  border: 0.5px solid var(--bdr2);
  border-radius: 16px;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px;
  border-bottom: 0.5px solid var(--bdr);
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
.modal-body { padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 5px; }
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
input.error, select.error { border-color: var(--red); }
select option { background: var(--bg1); }
.err-msg { font-size: 11px; color: var(--red); }
.modal-footer {
  padding: 14px 18px;
  border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px;
}
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 13px; color: var(--tx1); cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); }
.btn-danger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--red); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: opacity .15s;
}
.btn-danger:hover:not(:disabled) { opacity: .85; }
.btn-danger:disabled, .btn-sm:disabled { opacity: .5; cursor: not-allowed; }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }
</style>