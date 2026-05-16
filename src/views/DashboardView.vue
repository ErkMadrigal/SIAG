<template>
  <div class="dash-view">

    <!-- Header -->
    <div class="dash-header">
      <div>
        <h1 class="dash-title">Dashboard</h1>
        <p class="dash-sub">
          <i class="ti ti-calendar"></i>
          Asistencia del día — {{ fechaHoy }}
        </p>
      </div>
      <button class="btn-refresh" @click="loadData" :disabled="loading">
        <i class="ti ti-refresh" :class="{ spin: loading }"></i>
        Actualizar
      </button>
    </div>

    <!-- Resumen global -->
    <div class="global-stats" v-if="!loading && zonas.length">
      <div class="stat-card">
        <i class="ti ti-users"></i>
        <div>
          <span class="stat-val">{{ totalGlobal }}</span>
          <span class="stat-lbl">Total empleados</span>
        </div>
      </div>
      <div class="stat-card green">
        <i class="ti ti-login"></i>
        <div>
          <span class="stat-val">{{ entradasGlobal }}</span>
          <span class="stat-lbl">Entradas hoy</span>
        </div>
      </div>
      <div class="stat-card blue">
        <i class="ti ti-logout"></i>
        <div>
          <span class="stat-val">{{ salidasGlobal }}</span>
          <span class="stat-lbl">Salidas hoy</span>
        </div>
      </div>
      <div class="stat-card red">
        <i class="ti ti-user-x"></i>
        <div>
          <span class="stat-val">{{ faltasGlobal }}</span>
          <span class="stat-lbl">Faltas</span>
        </div>
      </div>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-grid">
      <div class="skeleton-card" v-for="i in 12" :key="i"></div>
    </div>

    <!-- Grid de zonas -->
    <div v-else-if="zonas.length" class="zonas-grid">
      <div
        v-for="z in zonas"
        :key="z.id_zona"
        class="zona-card"
        @click="abrirDetalle(z)"
      >
        <div class="zona-name">{{ z.zona }}</div>

        <!-- Gauge SVG -->
        <div class="gauge-wrap">
          <svg viewBox="0 0 120 70" class="gauge-svg">
            <!-- Arco fondo -->
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none" stroke="var(--bg3)" stroke-width="10"
              stroke-linecap="round"
            />
            <!-- Arco progreso -->
            <path
              d="M 10 65 A 50 50 0 0 1 110 65"
              fill="none"
              :stroke="gaugeColor(z.pct)"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="gaugeArc"
              :stroke-dashoffset="gaugeDashoffset(z.pct)"
            />
            <!-- Texto central -->
            <text x="60" y="58" text-anchor="middle" class="gauge-pct-text">
              {{ z.pct }}%
            </text>
          </svg>
        </div>

        <!-- Stats bajo el gauge -->
        <div class="zona-stats">
          <div class="zs-item green">
            <i class="ti ti-login"></i>
            <span>{{ z.entradas }}</span>
            <span class="zs-lbl">Entradas</span>
          </div>
          <div class="zs-divider"></div>
          <div class="zs-item red">
            <i class="ti ti-user-x"></i>
            <span>{{ z.faltas }}</span>
            <span class="zs-lbl">Faltas</span>
          </div>
          <div class="zs-divider"></div>
          <div class="zs-item tx2">
            <i class="ti ti-users"></i>
            <span>{{ z.total }}</span>
            <span class="zs-lbl">Total</span>
          </div>
        </div>

        <div class="zona-cta">
          <i class="ti ti-chart-bar"></i> Ver detalle
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <i class="ti ti-database-off"></i>
      <p>No hay datos de asistencia disponibles</p>
    </div>

    <!-- MODAL DETALLE ZONA -->
    <Teleport to="body">
      <div v-if="modalZona" class="modal-overlay" @click.self="modalZona = false">
        <div class="modal-box">

          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-chart-bar"></i></div>
            <div>
              <p class="modal-title">{{ zonaDetalle?.zona }}</p>
              <p class="modal-sub">Detalle por servicio — {{ fechaHoy }}</p>
            </div>
            <button class="modal-close" @click="modalZona = false">
              <i class="ti ti-x"></i>
            </button>
          </div>

          <!-- Skeleton modal -->
          <div v-if="loadingDetalle" class="modal-body">
            <div class="skeleton-wrap">
              <div class="skeleton-row" v-for="i in 6" :key="i"></div>
            </div>
          </div>

          <div v-else class="modal-body">

            <!-- Resumen zona -->
            <div class="detalle-stats">
              <div class="ds-item green">
                <span class="ds-val">{{ zonaDetalle?.entradas }}</span>
                <span class="ds-lbl">Entradas</span>
              </div>
              <div class="ds-item blue">
                <span class="ds-val">{{ zonaDetalle?.salidas }}</span>
                <span class="ds-lbl">Salidas</span>
              </div>
              <div class="ds-item red">
                <span class="ds-val">{{ zonaDetalle?.faltas }}</span>
                <span class="ds-lbl">Faltas</span>
              </div>
              <div class="ds-item">
                <span class="ds-val">{{ zonaDetalle?.total }}</span>
                <span class="ds-lbl">Total</span>
              </div>
            </div>

            <!-- Gráfica de barras horizontal -->
            <div class="chart-section" v-if="servicios.length">
              <p class="chart-title">Entradas por servicio</p>
              <div class="bar-chart">
                <div
                  v-for="s in serviciosTop"
                  :key="s.id"
                  class="bar-row"
                >
                  <div class="bar-label" :title="s.servicio">{{ s.servicio }}</div>
                  <div class="bar-track">
                    <div
                      class="bar-fill"
                      :style="{
                        width: maxEntradas > 0 ? (s.entradas / maxEntradas * 100) + '%' : '0%',
                        background: barColor(s.entradas, s.total_empleados)
                      }"
                    ></div>
                  </div>
                  <div class="bar-vals">
                    <span class="bv-in">{{ s.entradas }}</span>
                    <span class="bv-sep">/</span>
                    <span class="bv-tot">{{ s.total_empleados }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Tabla de servicios -->
            <div class="table-section">
              <p class="chart-title">Todos los servicios</p>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Servicio</th>
                      <th style="width:80px;text-align:center">Entradas</th>
                      <th style="width:80px;text-align:center">Salidas</th>
                      <th style="width:80px;text-align:center">Faltas</th>
                      <th style="width:80px;text-align:center">Total</th>
                      <th style="width:90px;text-align:center">Asistencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in servicios" :key="s.id">
                      <td style="font-size:12px">{{ s.servicio }}</td>
                      <td style="text-align:center">
                        <span class="badge green">{{ s.entradas }}</span>
                      </td>
                      <td style="text-align:center">
                        <span class="badge blue">{{ s.salidas }}</span>
                      </td>
                      <td style="text-align:center">
                        <span class="badge red">{{ s.faltas }}</span>
                      </td>
                      <td style="text-align:center;color:var(--tx2)">{{ s.total_empleados }}</td>
                      <td style="text-align:center">
                        <div class="mini-bar-wrap">
                          <div class="mini-bar"
                            :style="{
                              width: s.total_empleados > 0
                                ? (s.entradas / s.total_empleados * 100) + '%'
                                : '0%',
                              background: barColor(s.entradas, s.total_empleados)
                            }"
                          ></div>
                          <span class="mini-pct">
                            {{ s.total_empleados > 0 ? Math.round(s.entradas / s.total_empleados * 100) : 0 }}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!servicios.length">
                      <td colspan="6" class="empty-row">Sin registros de asistencia hoy</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import api from '@/services/api.js'

const ui = useUiStore()

const loading       = ref(true)
const loadingDetalle = ref(false)
const zonas         = ref([])
const fechaHoy      = ref('')
const modalZona     = ref(false)
const zonaDetalle   = ref(null)
const servicios     = ref([])

// Arco total del gauge (semicírculo) en unidades SVG
const gaugeArc = 157

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Dashboard', to: '/' }
  ])
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/dashboard/resumen')
    zonas.value   = data.data || []
    fechaHoy.value = data.fecha || new Date().toISOString().split('T')[0]
  } catch (err) {
    console.error(err)
  } finally { loading.value = false }
}

// Globales
const totalGlobal   = computed(() => zonas.value.reduce((a, z) => a + z.total,    0))
const entradasGlobal = computed(() => zonas.value.reduce((a, z) => a + z.entradas, 0))
const salidasGlobal  = computed(() => zonas.value.reduce((a, z) => a + z.salidas,  0))
const faltasGlobal   = computed(() => zonas.value.reduce((a, z) => a + z.faltas,   0))

// Gauge helpers
function gaugeDashoffset(pct) {
  const progreso = Math.min(100, Math.max(0, pct))
  return gaugeArc - (gaugeArc * progreso / 100)
}

function gaugeColor(pct) {
  if (pct >= 80) return 'var(--grn)'
  if (pct >= 50) return 'var(--amb, #f59e0b)'
  if (pct >= 20) return 'var(--acc)'
  return 'var(--red)'
}

function barColor(entradas, total) {
  if (!total) return 'var(--tx3)'
  const pct = entradas / total * 100
  if (pct >= 80) return 'var(--grn)'
  if (pct >= 50) return 'var(--amb, #f59e0b)'
  if (pct >= 20) return 'var(--acc)'
  return 'var(--red)'
}

// Top 10 servicios para la gráfica
const serviciosTop = computed(() =>
  [...servicios.value]
    .sort((a, b) => b.entradas - a.entradas)
    .slice(0, 10)
)

const maxEntradas = computed(() =>
  Math.max(1, ...serviciosTop.value.map(s => s.entradas))
)

async function abrirDetalle(z) {
  zonaDetalle.value = z
  modalZona.value   = true
  servicios.value   = []
  loadingDetalle.value = true
  try {
    const { data } = await api.get(`/dashboard/zona/${z.id_zona}`)
    servicios.value = data.servicios || []
    // Actualizar totales del detalle con los datos del EP
    zonaDetalle.value = {
      ...z,
      entradas: data.servicios?.reduce((a, s) => a + s.entradas, 0) ?? z.entradas,
      salidas:  data.servicios?.reduce((a, s) => a + s.salidas,  0) ?? z.salidas,
      faltas:   data.servicios?.reduce((a, s) => a + s.faltas,   0) ?? z.faltas,
      total:    data.servicios?.reduce((a, s) => a + s.total_empleados, 0) ?? z.total,
    }
  } catch (err) {
    console.error(err)
  } finally { loadingDetalle.value = false }
}
</script>

<style scoped>
.dash-view { display: flex; flex-direction: column; gap: 16px; }

/* Header */
.dash-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.dash-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.dash-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; display: flex; align-items: center; gap: 5px; }
.dash-sub i { font-size: 14px; }

.btn-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  font-size: 12px; color: var(--tx1); cursor: pointer; font-family: inherit;
  transition: all .15s;
}
.btn-refresh:hover:not(:disabled) { background: var(--bg3); color: var(--tx0); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

/* Global stats */
.global-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.stat-card {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px;
}
.stat-card i { font-size: 22px; color: var(--tx2); flex-shrink: 0; }
.stat-card.green i { color: var(--grn); }
.stat-card.blue  i { color: var(--acc); }
.stat-card.red   i { color: var(--red); }
.stat-card > div { display: flex; flex-direction: column; gap: 2px; }
.stat-val { font-size: 22px; font-weight: 700; color: var(--tx0); line-height: 1; }
.stat-lbl { font-size: 11px; color: var(--tx2); }

/* Skeleton */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.skeleton-card {
  height: 200px; background: var(--bg1); border-radius: 14px;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Zonas grid */
.zonas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
.zona-card {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 14px; padding: 16px 14px;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  cursor: pointer; transition: all .18s;
}
.zona-card:hover {
  border-color: var(--acc); background: var(--bg2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}
.zona-name {
  font-size: 11px; font-weight: 600; color: var(--tx1);
  text-transform: uppercase; letter-spacing: .6px;
  text-align: center; line-height: 1.3;
}

/* Gauge */
.gauge-wrap { width: 120px; }
.gauge-svg { width: 100%; }
.gauge-pct-text {
  font-size: 16px; font-weight: 700; fill: var(--tx0);
  font-family: inherit;
}

/* Zona stats bajo gauge */
.zona-stats {
  display: flex; align-items: center; gap: 0; width: 100%;
}
.zs-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  font-size: 14px; font-weight: 600; color: var(--tx0);
}
.zs-item.green { color: var(--grn); }
.zs-item.red   { color: var(--red); }
.zs-item.tx2   { color: var(--tx2); }
.zs-item i     { font-size: 13px; }
.zs-lbl { font-size: 9px; font-weight: 400; color: var(--tx3); text-transform: uppercase; }
.zs-divider { width: 0.5px; height: 28px; background: var(--bdr); }

.zona-cta {
  font-size: 11px; color: var(--acc); display: flex; align-items: center; gap: 4px;
  opacity: 0; transition: opacity .15s;
}
.zona-card:hover .zona-cta { opacity: 1; }

/* Empty */
.empty-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px; color: var(--tx2); font-size: 13px;
}
.empty-state i { font-size: 36px; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.65);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 860px;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto; }

/* Detalle stats */
.detalle-stats {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.ds-item {
  background: var(--bg2); border: 0.5px solid var(--bdr);
  border-radius: 10px; padding: 12px;
  display: flex; flex-direction: column; gap: 3px; align-items: center;
}
.ds-val { font-size: 24px; font-weight: 700; color: var(--tx0); }
.ds-lbl { font-size: 11px; color: var(--tx2); }
.ds-item.green .ds-val { color: var(--grn); }
.ds-item.blue  .ds-val { color: var(--acc); }
.ds-item.red   .ds-val { color: var(--red); }

/* Gráfica barras */
.chart-section { display: flex; flex-direction: column; gap: 10px; }
.chart-title { font-size: 11px; font-weight: 600; color: var(--tx2); text-transform: uppercase; letter-spacing: .7px; }
.bar-chart { display: flex; flex-direction: column; gap: 7px; }
.bar-row { display: grid; grid-template-columns: 160px 1fr 70px; align-items: center; gap: 10px; }
.bar-label {
  font-size: 11px; color: var(--tx1); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.bar-track { background: var(--bg3); border-radius: 4px; height: 8px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 4px; transition: width .4s ease; }
.bar-vals { display: flex; align-items: center; gap: 2px; font-size: 11px; }
.bv-in  { color: var(--tx0); font-weight: 600; }
.bv-sep { color: var(--tx3); }
.bv-tot { color: var(--tx2); }

/* Tabla */
.table-section { display: flex; flex-direction: column; gap: 10px; }
.table-wrap { overflow-x: auto; border: 0.5px solid var(--bdr); border-radius: 10px; overflow: hidden; }
table { width: 100%; border-collapse: collapse; }
th {
  padding: 8px 12px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); background: var(--bg2);
}
td { padding: 8px 12px; color: var(--tx0); font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); }
tbody tr:last-child td { border-bottom: none; }
tbody tr:hover td { background: var(--bg2); }

.badge {
  display: inline-block; min-width: 28px; text-align: center;
  font-size: 11px; font-weight: 600; padding: 2px 7px;
  border-radius: 6px;
}
.badge.green { background: var(--grn-dim); color: var(--grn); }
.badge.blue  { background: var(--acc-dim); color: var(--acc); }
.badge.red   { background: var(--red-dim); color: var(--red); }

.mini-bar-wrap {
  display: flex; align-items: center; gap: 6px;
}
.mini-bar {
  height: 6px; border-radius: 3px; flex: 1; transition: width .3s;
}
.mini-pct { font-size: 10px; color: var(--tx2); min-width: 28px; }

.empty-row { text-align: center; color: var(--tx2); padding: 24px; font-size: 13px; }

/* Skeleton modal */
.skeleton-wrap { display: flex; flex-direction: column; gap: 8px; padding: 8px 0; }
.skeleton-row { height: 38px; background: var(--bg2); border-radius: 8px; animation: pulse 1.5s ease-in-out infinite; }

@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .global-stats { grid-template-columns: repeat(2, 1fr); }
  .zonas-grid   { grid-template-columns: repeat(2, 1fr); }
  .detalle-stats { grid-template-columns: repeat(2, 1fr); }
  .bar-row { grid-template-columns: 100px 1fr 55px; }
}
</style>