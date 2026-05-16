<template>
  <div class="imp-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Importaciones</h1>
        <p class="view-sub">Carga masiva de datos mediante archivos Excel predefinidos</p>
      </div>
    </div>

    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-users" aria-hidden="true"></i>
        <span>Empleados</span>
        <span class="sec-sub">Importaciones masivas</span>
      </div>
      <div class="imp-list">
        <div class="imp-item clickable" @click="triggerUpload('nuevos')">
          <div class="imp-icon green"><i class="ti ti-user-plus" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Nuevos empleados <i class="ti ti-arrow-right imp-arrow" aria-hidden="true"></i></h3>
            <p>Se cargarán los datos de los empleados en un archivo Excel predefinido</p>
          </div>
          <div class="imp-actions" @click.stop>
            <button class="btn-sm" @click="descargarPlantilla('nuevos')">
              <i class="ti ti-download" aria-hidden="true"></i> Plantilla
            </button>
          </div>
        </div>

        <div class="imp-item clickable" @click="triggerUpload('actualizacion')">
          <div class="imp-icon blue"><i class="ti ti-user-edit" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Actualización de empleados <i class="ti ti-arrow-right imp-arrow" aria-hidden="true"></i></h3>
            <p>Se actualizarán todos los datos de los empleados desde un archivo Excel predefinido</p>
          </div>
          <div class="imp-actions" @click.stop>
            <button class="btn-sm" @click="descargarPlantilla('actualizacion')">
              <i class="ti ti-download" aria-hidden="true"></i> Plantilla
            </button>
          </div>
        </div>

        <div class="imp-item clickable" @click="triggerUpload('bajas')">
          <div class="imp-icon red"><i class="ti ti-user-off" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Baja de empleados <i class="ti ti-arrow-right imp-arrow" aria-hidden="true"></i></h3>
            <p>Se darán de baja todos los empleados listados en el archivo Excel predefinido</p>
          </div>
          <div class="imp-actions" @click.stop>
            <button class="btn-sm" @click="descargarPlantilla('bajas')">
              <i class="ti ti-download" aria-hidden="true"></i> Plantilla
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-clock" aria-hidden="true"></i>
        <span>Próximamente</span>
        <span class="soon-badge">En desarrollo</span>
      </div>
      <div class="imp-list">
        <div class="imp-item disabled">
          <div class="imp-icon gray"><i class="ti ti-fingerprint" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Registros biométricos <span class="soon-badge">Próximamente</span></h3>
            <p>Importación masiva de registros de asistencia desde dispositivos biométricos</p>
          </div>
          <div class="imp-actions">
            <button class="btn-sm" disabled><i class="ti ti-download" aria-hidden="true"></i> Plantilla</button>
          </div>
        </div>
        <div class="imp-item disabled">
          <div class="imp-icon gray"><i class="ti ti-alert-triangle" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Incidencias masivas <span class="soon-badge">Próximamente</span></h3>
            <p>Carga masiva de incidencias desde un archivo Excel para procesamiento automático</p>
          </div>
          <div class="imp-actions">
            <button class="btn-sm" disabled><i class="ti ti-download" aria-hidden="true"></i> Plantilla</button>
          </div>
        </div>
        <div class="imp-item disabled">
          <div class="imp-icon gray"><i class="ti ti-chart-bar" aria-hidden="true"></i></div>
          <div class="imp-info">
            <h3>Tabulador masivo <span class="soon-badge">Próximamente</span></h3>
            <p>Importa sueldos y bonos de múltiples puestos desde Excel directamente al tabulador</p>
          </div>
          <div class="imp-actions">
            <button class="btn-sm" disabled><i class="ti ti-download" aria-hidden="true"></i> Plantilla</button>
          </div>
        </div>
      </div>
    </div>

    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-history" aria-hidden="true"></i>
        <span>Historial de importaciones</span>
      </div>
      <div v-if="!historial.length" class="hist-empty">
        <i class="ti ti-inbox" aria-hidden="true"></i>
        <p>No hay importaciones registradas aún</p>
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tipo</th><th>Archivo</th><th>Registros</th>
              <th>Resultado</th><th>Fecha</th><th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="h in historial" :key="h.id">
              <td>{{ h.tipo }}</td>
              <td class="mono">{{ h.archivo }}</td>
              <td>{{ h.total }}</td>
              <td>
                <span class="pill" :class="h.ok ? 'activo' : 'baja'">
                  <span class="dot"></span>{{ h.ok ? 'Exitoso' : 'Con errores' }}
                </span>
              </td>
              <td style="color:var(--tx2)">{{ h.fecha }}</td>
              <td style="color:var(--tx1)">{{ h.usuario }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'

const router    = useRouter()
const ui        = useUiStore()
const historial = ref([])

const PLANTILLAS = {
  nuevos:        '/plantillas/plantilla_nuevos_empleados.xlsx',
  actualizacion: '/plantillas/plantilla_actualizacion_empleados.xlsx',
  bajas:         '/plantillas/plantilla_baja_empleados.xlsx',
}

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home',          to: '/' },
    { label: 'Importaciones', to: '/importaciones' }
  ])
})

function triggerUpload(tipo) {
  router.push(`/importaciones/masiva?tipo=${tipo}`)
}

function descargarPlantilla(tipo) {
  const url = PLANTILLAS[tipo]
  const a   = document.createElement('a')
  a.href    = url
  a.download = url.split('/').pop()
  a.click()
}
</script>

<style scoped>
.imp-view    { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; justify-content: space-between; }
.view-title  { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub    { font-size: 12px; color: var(--tx2); margin-top: 3px; }

.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-sub   { font-size: 11px; color: var(--tx2); margin-left: 4px; }

.imp-list { display: flex; flex-direction: column; }
.imp-item {
  display: flex; align-items: center; gap: 14px;
  padding: 16px; border-bottom: 0.5px solid var(--bdr); transition: background .12s;
}
.imp-item:last-child { border-bottom: none; }
.imp-item:hover:not(.disabled) { background: var(--bg2); }
.imp-item.disabled { opacity: .5; }
.imp-icon {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.imp-icon.green  { background: var(--grn-dim); color: var(--grn); }
.imp-icon.blue   { background: var(--acc-dim); color: var(--acc); }
.imp-icon.red    { background: var(--red-dim); color: var(--red); }
.imp-icon.gray   { background: var(--bg3);     color: var(--tx2); }
.imp-info { flex: 1; min-width: 0; }
.imp-info h3 {
  font-size: 14px; font-weight: 500; color: var(--tx0);
  margin-bottom: 4px; display: flex; align-items: center; gap: 8px;
}
.imp-info p { font-size: 12px; color: var(--tx2); line-height: 1.5; }
.imp-actions { display: flex; gap: 8px; flex-shrink: 0; flex-wrap: wrap; }

.hist-empty {
  display: flex; flex-direction: column; align-items: center;
  gap: 8px; padding: 40px; color: var(--tx3); font-size: 13px;
}
.hist-empty i { font-size: 32px; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  padding: 8px 14px; text-align: left; font-size: 10px; font-weight: 500;
  color: var(--tx2); text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr);
}
td { padding: 10px 14px; font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); color: var(--tx0); }
tbody tr:last-child td { border-bottom: none; }
.mono { font-family: monospace; font-size: 12px; }
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.activo { background: var(--grn-dim); color: var(--grn); }
.pill.baja   { background: var(--red-dim); color: var(--red); }
.soon-badge {
  font-size: 10px; padding: 2px 6px; border-radius: 20px;
  background: var(--bg3); color: var(--tx2); font-weight: 400;
}
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer; transition: all .15s; font-family: inherit;
}
.btn-sm:hover:not(:disabled) { background: var(--bg3); }
.btn-sm:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 12px; color: #fff;
  cursor: pointer; font-family: inherit; transition: background .15s;
}
.btn-primary-sm:hover { background: var(--acc2); }
.btn-danger-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px; border: none;
  background: var(--red); font-size: 12px; color: #fff;
  cursor: pointer; font-family: inherit; transition: opacity .15s;
}
.btn-danger-sm:hover { opacity: .85; }

@media (max-width: 768px) {
  .imp-item    { flex-direction: column; align-items: flex-start; }
  .imp-actions { width: 100%; }
}
</style>