<template>
  <div v-if="visible" class="modal-overlay" @click.self="cerrar">
    <div class="modal-card">
      <div class="modal-header">
        <h3>Generar plantilla de actualización</h3>
        <button class="modal-close" @click="cerrar"><i class="ti ti-x"></i></button>
      </div>

      <p class="modal-sub">
        Elige qué campos vas a actualizar hoy. La plantilla siempre incluye
        <code>id</code> (obligatorio) + los campos que actives aquí.
      </p>

      <div class="campos-toolbar">
        <button class="btn-sm" @click="marcarTodos(true)">Seleccionar todos</button>
        <button class="btn-sm" @click="marcarTodos(false)">Ninguno</button>
      </div>

      <div class="campos-grid">
        <label v-for="c in campos" :key="c.key" class="campo-switch">
          <input type="checkbox" v-model="c.activo" />
          <span class="switch-track"><span class="switch-thumb"></span></span>
          <span class="campo-info">
            <span class="campo-label">{{ c.label }}</span>
            <span class="campo-key">{{ c.key }}</span>
          </span>
        </label>
      </div>

      <div class="modal-footer">
        <span class="seleccionados-count">{{ seleccionados.length }} campo{{ seleccionados.length === 1 ? '' : 's' }} seleccionado{{ seleccionados.length === 1 ? '' : 's' }}</span>
        <button class="btn-primary-lg" :disabled="seleccionados.length === 0" @click="descargarPlantilla">
          <i class="ti ti-download"></i> Descargar plantilla
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import * as XLSX from 'xlsx'

const props = defineProps({
  visible: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])

const FIRMA = 'SIAG2026*' // misma firma que exige validarFirma() al volver a subir

// Lista blanca -- debe coincidir EXACTO con CAMPOS_ACTUALIZABLES del backend
const campos = ref([
  { key: 'CP_fiscal',             label: 'CP Fiscal',                activo: false },
  { key: 'fecha_ingreso',         label: 'Fecha de ingreso',         activo: false },
  { key: 'fecha_efectiva',        label: 'Fecha efectiva',           activo: false },
  { key: 'id_turno',              label: 'Turno (id)',               activo: false },
  { key: 'id_puesto',             label: 'Puesto (id)',              activo: false },
  { key: 'alergias',              label: 'Alergias',                 activo: false },
  { key: 'fotos',                 label: 'Foto (URL)',               activo: false },
  { key: 'id_periocidad',         label: 'Periodicidad de pago (id)',activo: false },
  { key: 'tipoSangre',            label: 'Tipo de sangre (id)',      activo: false },
  { key: 'escolaridad',           label: 'Escolaridad (id)',         activo: false },
  { key: 'parentesco',            label: 'Parentesco (id)',          activo: false },
  { key: 'nombreEmergencia',      label: 'Nombre de emergencia',     activo: false },
  { key: 'telefonoEmergencia',    label: 'Teléfono de emergencia',   activo: false },
  { key: 'estatus',               label: 'Estatus',                  activo: false },
  { key: 'estado_actual',         label: 'Estado actual',            activo: false },
  { key: 'ultima_actividad',      label: 'Última actividad',         activo: false },
  { key: 'gerente',               label: 'Es gerente',               activo: false },
  { key: 'acceso_biometrico',     label: 'Acceso biométrico',        activo: false },
  { key: 'id_hospital',           label: 'Hospital (id)',            activo: false },
  { key: 'id_ubicacion_principal',label: 'Ubicación principal (id)', activo: false },
  { key: 'modo_sueldo',           label: "Modo de sueldo ('tabulador'/'salario')", activo: false },
  { key: 'salario_mensual',       label: 'Salario mensual',          activo: false },
  { key: 'fronterizo',            label: 'Fronterizo (0/1)',         activo: false },
  { key: 'dispersion_alterna',    label: 'Dispersión alterna (0/1)', activo: false },
])

const seleccionados = computed(() => campos.value.filter(c => c.activo))

function marcarTodos(valor) {
  campos.value.forEach(c => (c.activo = valor))
}

function cerrar() {
  emit('close')
}

function descargarPlantilla() {
  if (!seleccionados.value.length) return

  const headers = ['id', ...seleccionados.value.map(c => c.key)]

  const wb = XLSX.utils.book_new()

  // Hoja de datos -- solo headers, sin filas (el usuario las llena)
  const wsDatos = XLSX.utils.aoa_to_sheet([headers])
  XLSX.utils.book_append_sheet(wb, wsDatos, 'Plantilla')

  // Hoja "catalogos" con la firma requerida por validarFirma() -- se
  // necesita para que esta misma plantilla, ya llenada, se pueda volver
  // a subir sin que la rechace la validación de firma.
  const wsCatalogos = XLSX.utils.aoa_to_sheet([[]])
  // Escribe la firma exactamente en F225 (fila 225, columna F)
  XLSX.utils.sheet_add_aoa(wsCatalogos, [[FIRMA]], { origin: 'F225' })
  XLSX.utils.book_append_sheet(wb, wsCatalogos, 'catalogos')

  const nombreArchivo = `plantilla_actualizacion_dinamica_${new Date().toISOString().slice(0, 10)}.xlsx`
  XLSX.writeFile(wb, nombreArchivo)

  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
  padding: 20px;
}
.modal-card {
  background: var(--bg1, #131720); border: 0.5px solid var(--bdr, #232a38);
  border-radius: 16px; padding: 24px; max-width: 560px; width: 100%;
  max-height: 85vh; overflow-y: auto;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.modal-header h3 { font-size: 17px; font-weight: 600; color: var(--tx0, #fff); margin: 0; }
.modal-close {
  width: 30px; height: 30px; border-radius: 8px; border: none;
  background: var(--bg2, #171c26); color: var(--tx2, #9aa3af);
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.modal-sub { font-size: 13px; color: var(--tx2, #9aa3af); margin-bottom: 16px; line-height: 1.5; }
.modal-sub code {
  background: var(--bg2, #171c26); padding: 1px 6px; border-radius: 4px; font-size: 12px;
}

.campos-toolbar { display: flex; gap: 8px; margin-bottom: 14px; }
.btn-sm {
  padding: 6px 12px; border-radius: 7px; border: 0.5px solid var(--bdr2, #2a2f3a);
  background: transparent; color: var(--tx1, #d1d5db); font-size: 12px; cursor: pointer; font-family: inherit;
}
.btn-sm:hover { background: var(--bg2, #171c26); }

.campos-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px; margin-bottom: 20px;
}
.campo-switch {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 0.5px solid var(--bdr2, #2a2f3a); background: var(--bg2, #171c26);
  cursor: pointer; transition: border-color .15s;
}
.campo-switch:has(input:checked) { border-color: var(--acc, #3b82f6); background: rgba(59,130,246,0.06); }
.campo-switch input { display: none; }

.switch-track {
  width: 34px; height: 20px; border-radius: 20px; background: var(--bdr2, #2a2f3a);
  position: relative; flex-shrink: 0; transition: background .15s;
}
.campo-switch input:checked ~ .switch-track { background: var(--acc, #3b82f6); }
.switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; transition: transform .15s;
}
.campo-switch input:checked ~ .switch-track .switch-thumb { transform: translateX(14px); }

.campo-info { display: flex; flex-direction: column; min-width: 0; }
.campo-label { font-size: 13px; font-weight: 500; color: var(--tx0, #fff); }
.campo-key { font-size: 10.5px; color: var(--tx2, #9aa3af); font-family: monospace; }

.modal-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding-top: 14px; border-top: 0.5px solid var(--bdr, #232a38);
}
.seleccionados-count { font-size: 12px; color: var(--tx2, #9aa3af); }

.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 9px; border: none;
  background: var(--acc, #3b82f6); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2, #2563eb); }
.btn-primary-lg:disabled { opacity: .5; cursor: not-allowed; }
</style>