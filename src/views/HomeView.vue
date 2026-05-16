<template>
  <div class="dashboard">

    <!-- Métricas -->
    <div class="metrics">
      <div class="mc" v-for="m in metrics" :key="m.label" :class="m.color">
        <div class="mc-top">
          <span class="mc-label">{{ m.label }}</span>
          <div class="mc-icon" :class="m.color">
            <i :class="['ti', m.icon]" aria-hidden="true"></i>
          </div>
        </div>
        <div class="mc-val" :class="m.color">
          <span v-if="loadingMetrics">—</span>
          <span v-else>{{ m.value }}</span>
        </div>
        <div class="mc-sub" v-html="m.sub"></div>
      </div>
    </div>

    <!-- Fila: Gráfica + Acciones rápidas -->
    <div class="row-2col">

      <!-- Gráfica Altas / Bajas -->
      <div class="sec chart-sec">
        <div class="sec-hdr">
          <i class="ti ti-chart-bar" style="font-size:16px;color:var(--tx2)" aria-hidden="true"></i>
          <span class="sec-title">Altas y bajas del período</span>
          <span class="period-badge">Ene – May 2026</span>
        </div>
        <div class="chart-legend">
          <span class="leg-dot green"></span><span class="leg-lbl">Altas</span>
          <span class="leg-dot red"></span><span class="leg-lbl">Bajas</span>
        </div>
        <div class="chart-wrap">
          <canvas id="altasBajasChart" role="img" aria-label="Gráfica comparativa de altas y bajas de empleados enero a mayo 2026">
            Altas: 1151, Bajas: 255 en el período enero–mayo 2026.
          </canvas>
        </div>
        <div class="chart-footer">
          <div class="ratio-bar">
            <div
              class="ratio-fill"
              :style="{ width: altasPct + '%' }"
            ></div>
          </div>
          <div class="ratio-labels">
            <span style="color:var(--grn)">{{ altasPct }}% altas</span>
            <span style="color:var(--red)">{{ bajasPct }}% bajas</span>
          </div>
        </div>
      </div>

      <!-- Acciones rápidas -->
      <div class="quick-col">

        <!-- Card Dashboard -->
        <div class="quick-card accent-card" @click="router.push('/dashboard')" role="button" tabindex="0" @keyup.enter="router.push('/dashboard')">
          <div class="qc-icon-wrap blue">
            <i class="ti ti-layout-dashboard" aria-hidden="true"></i>
          </div>
          <div class="qc-body">
            <div class="qc-title">Dashboard</div>
            <div class="qc-sub">Gauges y estado por zona</div>
          </div>
          <i class="ti ti-arrow-right qc-arrow" aria-hidden="true"></i>
        </div>

        <!-- Card Incidencias pendientes -->
        <div
          class="quick-card"
          :class="{ 'warn-card': incidenciasPendientes > 0 }"
          @click="router.push('/incidencias')"
          role="button"
          tabindex="0"
          @keyup.enter="router.push('/incidencias')"
        >
          <div class="qc-icon-wrap amber">
            <i class="ti ti-alert-triangle" aria-hidden="true"></i>
          </div>
          <div class="qc-body">
            <div class="qc-title">
              <span v-if="loadingIncidencias">—</span>
              <span v-else>{{ incidenciasPendientes }} incidencia{{ incidenciasPendientes !== 1 ? 's' : '' }}</span>
            </div>
            <div class="qc-sub">pendientes de aprobar</div>
          </div>
          <i class="ti ti-arrow-right qc-arrow" aria-hidden="true"></i>
        </div>

        <!-- Card Empleados -->
        <div class="quick-card" @click="router.push('/empleados/nuevo')" role="button" tabindex="0" @keyup.enter="router.push('/empleados/nuevo')">
          <div class="qc-icon-wrap green">
            <i class="ti ti-user-plus" aria-hidden="true"></i>
          </div>
          <div class="qc-body">
            <div class="qc-title">Nuevo empleado</div>
            <div class="qc-sub">Registrar alta en el sistema</div>
          </div>
          <i class="ti ti-arrow-right qc-arrow" aria-hidden="true"></i>
        </div>

        <!-- Card Reportes -->
        <div class="quick-card" @click="router.push('/reportes')" role="button" tabindex="0" @keyup.enter="router.push('/reportes')">
          <div class="qc-icon-wrap purple">
            <i class="ti ti-file-analytics" aria-hidden="true"></i>
          </div>
          <div class="qc-body">
            <div class="qc-title">Reportes</div>
            <div class="qc-sub">Exportar altas, bajas y más</div>
          </div>
          <i class="ti ti-arrow-right qc-arrow" aria-hidden="true"></i>
        </div>

      </div>
    </div>

    <!-- Empleados recientes -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-users" style="font-size:16px;color:var(--tx2)" aria-hidden="true"></i>
        <span class="sec-title">Empleados recientes</span>
        <div class="sec-actions">
          <button class="btn-sm" @click="router.push('/empleados')">
            <i class="ti ti-external-link" aria-hidden="true"></i> Ver todos
          </button>
          <button class="btn-sm btn-primary" @click="router.push('/empleados/nuevo')">
            <i class="ti ti-plus" aria-hidden="true"></i> Nuevo
          </button>
        </div>
      </div>

      <div v-if="loadingEmpleados" class="table-loading">
        <div class="skeleton-row" v-for="i in 4" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:220px">Empleado</th>
              <th style="width:150px">Puesto</th>
              <th style="width:110px">Ingreso</th>
              <th style="width:120px">Estatus</th>
              <th style="width:80px;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="emp in empleadosRecientes"
              :key="emp.id"
              @click="router.push(`/empleados/${emp.id}`)"
            >
              <td>
                <div class="emp-cell">
                  <div class="emp-av" :style="{ background: emp.bg, color: emp.color }">
                    {{ emp.initials }}
                  </div>
                  <div>
                    <div class="emp-name">{{ emp.nombre_completo || emp.nombre }}</div>
                    <div class="emp-id">{{ emp.numero_empleado }}</div>
                  </div>
                </div>
              </td>
              <td style="color:var(--tx1)">{{ emp.puesto || '—' }}</td>
              <td style="color:var(--tx2)">{{ formatDate(emp.fecha_ingreso) }}</td>
              <td><StatusPill :status="emp.estatus || 'activo'" /></td>
              <td>
                <div class="row-actions">
                  <button class="icon-btn" @click.stop="router.push(`/empleados/${emp.id}`)" title="Ver detalle">
                    <i class="ti ti-eye"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!empleadosRecientes.length">
              <td colspan="5" class="empty-row">No hay empleados registrados</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="sec-footer">
        <span class="pg-info">Mostrando {{ empleadosRecientes.length }} de {{ totalEmpleados }} empleados</span>
        <button class="btn-sm" @click="router.push('/empleados')">
          Ver listado completo <i class="ti ti-arrow-right" aria-hidden="true"></i>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { empleadosService } from '@/services/empleados.service.js'
import { incidenciasService } from '@/services/incidencias.service.js'
import { reportesService } from '@/services/reportes.service.js'
import StatusPill from '@/components/ui/StatusPill.vue'

const router = useRouter()
const ui     = useUiStore()

const loadingMetrics        = ref(true)
const loadingEmpleados      = ref(true)
const loadingIncidencias    = ref(true)
const empleadosData         = ref([])
const totalEmpleados        = ref(0)
const activos_count         = ref(0)
const bajas_count           = ref(0)
const incidenciasPendientes = ref(0)
const altasCount            = ref(0)
const bajasCount            = ref(0)
const altasPorMes           = ref([])
const bajasPorMes           = ref([])
const mesesLabels           = ref([])

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
]

// ── Refs animados para el contador ──
const displayTotal      = ref(0)
const displayActivos    = ref(0)
const displayBajas      = ref(0)
const displayIncidencias = ref(0)

function animarContador(refVal, destino, duracion = 900) {
  const inicio   = performance.now()
  const desde    = refVal.value
  const delta    = destino - desde

  function frame(ahora) {
    const t        = Math.min((ahora - inicio) / duracion, 1)
    // easeOutExpo: arranca rápido, frena al final
    const ease     = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
    refVal.value   = Math.round(desde + delta * ease)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}

const altasPct = computed(() => {
  const total = altasCount.value + bajasCount.value
  if (!total) return 0
  return Math.round((altasCount.value / total) * 100)
})
const bajasPct = computed(() => 100 - altasPct.value)

onMounted(() => {
  ui.setBreadcrumbs([{ label: 'Home', to: '/' }])
  fetchData()
})

async function fetchData() {
  // Fechas del período: inicio del año hasta hoy
  const hoy = new Date()
  const fechaFin   = hoy.toISOString().split('T')[0]
  const fechaInicio = `${hoy.getFullYear()}-01-01`

  await Promise.allSettled([
    fetchEmpleados(),
    fetchIncidencias(),
    fetchAltasBajas(fechaInicio, fechaFin),
  ])
}

async function fetchEmpleados() {
  try {
    const res = await empleadosService.getAll({ limit: 5, page: 1 })
    totalEmpleados.value = res.AllTotal?.empleadosTotales  || 0
    activos_count.value  = res.completados?.empleadosTotales || 0
    bajas_count.value    = res.bajas?.empleadosTotales       || 0

    // Animar contadores al cargar
    animarContador(displayTotal,   totalEmpleados.value)
    animarContador(displayActivos, activos_count.value,  950)
    animarContador(displayBajas,   bajas_count.value,   1000)
    const lista = res.empleado?.data || []
    empleadosData.value = lista.map((e, i) => ({
      ...e,
      initials: getInitials(e.nombre_completo || e.nombre || ''),
      fecha_ingreso: e.fecha_efectiva || e.fecha_ingreso || null,
      estatus: e.estatus === '1' || e.estatus === 1 ? 'activo' : 'baja',
      ...AVATAR_COLORS[i % AVATAR_COLORS.length],
    }))
  } catch (err) {
    console.error('fetchEmpleados:', err)
  } finally {
    loadingEmpleados.value = false
    loadingMetrics.value   = false
  }
}

async function fetchIncidencias() {
  try {
    const lista = await incidenciasService.getAll('pendiente')
    incidenciasPendientes.value = Array.isArray(lista) ? lista.length : 0
    animarContador(displayIncidencias, incidenciasPendientes.value, 1050)
  } catch (err) {
    console.error('fetchIncidencias:', err)
  } finally {
    loadingIncidencias.value = false
  }
}

async function fetchAltasBajas(fechaInicio, fechaFin) {
  try {
    const [resAltas, resBajas] = await Promise.allSettled([
      reportesService.getAltas(fechaInicio, fechaFin),
      reportesService.getBajas(fechaInicio, fechaFin),
    ])

    const listaAltas = resAltas.status === 'fulfilled' && Array.isArray(resAltas.value) ? resAltas.value : []
    const listaBajas = resBajas.status === 'fulfilled' && Array.isArray(resBajas.value) ? resBajas.value : []

    altasCount.value = listaAltas.length
    bajasCount.value = listaBajas.length

    // Agrupar por mes usando fecha_efectiva (formato YYYY-MM-DD)
    const agrupar = (lista) => {
      const mapa = {}
      lista.forEach(emp => {
        const fecha = emp.fecha_efectiva || emp.fechaBaja || ''
        if (!fecha) return
        const mes = fecha.substring(0, 7) // "YYYY-MM"
        mapa[mes] = (mapa[mes] || 0) + 1
      })
      return mapa
    }

    const mapaAltas = agrupar(listaAltas)
    const mapaBajas = agrupar(listaBajas)

    // Unir y ordenar todos los meses presentes
    const todosLosMeses = [...new Set([...Object.keys(mapaAltas), ...Object.keys(mapaBajas)])].sort()

    mesesLabels.value = todosLosMeses.map(m => {
      const [anio, mes] = m.split('-')
      const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
      return `${nombres[parseInt(mes) - 1]} ${anio.slice(2)}`
    })
    altasPorMes.value = todosLosMeses.map(m => mapaAltas[m] || 0)
    bajasPorMes.value = todosLosMeses.map(m => mapaBajas[m] || 0)

  } catch (err) {
    console.error('fetchAltasBajas:', err)
  } finally {
    await nextTick()
    await loadChartJs()
    buildChart()
  }
}

function loadChartJs() {
  return new Promise(resolve => {
    if (window.Chart) return resolve()
    const existing = document.querySelector('script[data-chartjs]')
    if (existing) {
      existing.addEventListener('load', resolve, { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
    script.setAttribute('data-chartjs', '')
    script.onload = resolve
    document.head.appendChild(script)
  })
}

function buildChart() {
  const canvas = document.getElementById('altasBajasChart')
  if (!canvas) return

  const existing = window.Chart.getChart(canvas)
  if (existing) existing.destroy()

  const isDark = document.documentElement.classList.contains('dark') ||
    window.matchMedia('(prefers-color-scheme: dark)').matches

  const gridColor  = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const labelColor = isDark ? '#9ca3af' : '#6b7280'

  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels: mesesLabels.value,
      datasets: [
        {
          label: 'Altas',
          data: altasPorMes.value,
          borderColor: 'rgba(34,201,122,1)',
          backgroundColor: 'rgba(34,201,122,0.08)',
          pointBackgroundColor: 'rgba(34,201,122,1)',
          pointBorderColor: isDark ? '#111827' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
        },
        {
          label: 'Bajas',
          data: bajasPorMes.value,
          borderColor: 'rgba(240,84,84,1)',
          backgroundColor: 'rgba(240,84,84,0.08)',
          pointBackgroundColor: 'rgba(240,84,84,1)',
          pointBorderColor: isDark ? '#111827' : '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2.5,
          tension: 0.35,
          fill: true,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1f2937' : '#fff',
          titleColor: isDark ? '#f9fafb' : '#111827',
          bodyColor:  isDark ? '#d1d5db' : '#374151',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toLocaleString('es-MX')}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: labelColor,
            font: { size: 11 },
            autoSkip: false,
            maxRotation: 0,
          },
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: labelColor,
            font: { size: 11 },
            callback: v => v.toLocaleString('es-MX'),
          },
        }
      }
    }
  })
}

const empleadosRecientes = computed(() => empleadosData.value)

const metrics = computed(() => [
  {
    label: 'Total empleados',
    icon:  'ti-users',
    color: 'blue',
    value: displayTotal.value.toLocaleString('es-MX'),
    sub:   '',
  },
  {
    label: 'Activos',
    icon:  'ti-circle-check',
    color: 'green',
    value: displayActivos.value.toLocaleString('es-MX'),
    sub:   `${totalEmpleados.value ? Math.round((activos_count.value / totalEmpleados.value) * 100) : 0}% del total`,
  },
  {
    label: 'Bajas',
    icon:  'ti-user-off',
    color: 'red',
    value: displayBajas.value.toLocaleString('es-MX'),
    sub:   `${totalEmpleados.value ? Math.round((bajas_count.value / totalEmpleados.value) * 100) : 0}% del total`,
  },
  {
    label: 'Incidencias',
    icon:  'ti-alert-triangle',
    color: 'amber',
    value: loadingIncidencias.value ? '—' : displayIncidencias.value.toLocaleString('es-MX'),
    sub:   'pendientes de aprobar',
  },
])

function getInitials(nombre) {
  return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

function formatDate(fecha) {
  if (!fecha) return '—'
  return new Date(fecha).toLocaleDateString('es-MX', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  })
}
</script>

<style scoped>
.dashboard { display: flex; flex-direction: column; gap: 14px; }

/* ── Métricas ── */
.metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 768px) {
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .row-2col { flex-direction: column; }
}
.mc {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  padding: 14px 16px;
}
.mc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.mc-label {
  font-size: 10px;
  color: var(--tx2);
  text-transform: uppercase;
  letter-spacing: .8px;
  font-weight: 500;
}
.mc-icon {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.mc-icon.blue  { background: var(--acc-dim); color: var(--acc); }
.mc-icon.green { background: var(--grn-dim); color: var(--grn); }
.mc-icon.red   { background: var(--red-dim); color: var(--red); }
.mc-icon.amber { background: var(--amb-dim); color: var(--amb); }
.mc-val {
  font-size: 26px; font-weight: 600;
  letter-spacing: -1px; line-height: 1; margin-bottom: 5px;
}
.mc-val.blue  { color: var(--acc); }
.mc-val.green { color: var(--grn); }
.mc-val.red   { color: var(--red); }
.mc-val.amber { color: var(--amb); }
.mc-sub { font-size: 11px; color: var(--tx2); }

/* ── Fila 2 columnas ── */
.row-2col {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}
.chart-sec { flex: 1 1 0; min-width: 0; }
.quick-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 240px;
  flex-shrink: 0;
}

/* ── Quick cards ── */
.quick-card {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.quick-card:hover { background: var(--bg2); border-color: var(--bdr2); }

.warn-card {
  border-color: var(--amb);
  background: var(--amb-dim);
}
.warn-card:hover { background: var(--amb-dim); filter: brightness(1.1); }

.accent-card {
  border-color: var(--acc);
}

.qc-icon-wrap {
  width: 36px; height: 36px;
  border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.qc-icon-wrap.blue   { background: var(--acc-dim); color: var(--acc); }
.qc-icon-wrap.green  { background: var(--grn-dim); color: var(--grn); }
.qc-icon-wrap.amber  { background: var(--amb-dim); color: var(--amb); }
.qc-icon-wrap.purple { background: rgba(168,85,247,.12); color: #a855f7; }

.qc-body { flex: 1; min-width: 0; }
.qc-title { font-size: 13px; font-weight: 600; color: var(--tx0); line-height: 1.2; }
.qc-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.qc-arrow { font-size: 14px; color: var(--tx2); flex-shrink: 0; }

/* ── Gráfica ── */
.chart-sec { position: relative; }
.period-badge {
  margin-left: auto;
  font-size: 10px;
  color: var(--tx2);
  background: var(--bg2);
  border: 0.5px solid var(--bdr);
  border-radius: 20px;
  padding: 2px 8px;
}
.chart-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px 0;
}
.leg-dot {
  width: 10px; height: 10px;
  border-radius: 3px;
}
.leg-dot.green { background: rgba(34,201,122,0.85); }
.leg-dot.red   { background: rgba(240,84,84,0.85); }
.leg-lbl { font-size: 11px; color: var(--tx2); margin-right: 10px; }
.chart-wrap {
  position: relative;
  height: 230px;
  padding: 8px 16px 0;
}
.chart-wrap canvas { height: 100% !important; }
.chart-footer { padding: 10px 16px 14px; }
.ratio-bar {
  height: 4px;
  background: rgba(240,84,84,0.3);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 6px;
}
.ratio-fill {
  height: 100%;
  background: rgba(34,201,122,0.85);
  border-radius: 4px;
  transition: width .5s ease;
}
.ratio-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 500;
}

/* ── Secciones ── */
.sec {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
}
.sec-hdr {
  padding: 12px 16px;
  border-bottom: 0.5px solid var(--bdr);
  display: flex; align-items: center; gap: 8px;
}
.sec-title { font-size: 13px; font-weight: 500; color: var(--tx0); }
.sec-actions { margin-left: auto; display: flex; gap: 6px; }
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 11px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary  { background: var(--acc); border-color: var(--acc); color: #fff; }
.btn-primary:hover { background: var(--acc2); }

/* ── Tabla ── */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr);
}
td {
  padding: 10px 14px; color: var(--tx0);
  font-size: 12.5px; border-bottom: 0.5px solid var(--bdr);
}
tbody tr { cursor: pointer; transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }

.emp-cell { display: flex; align-items: center; gap: 9px; }
.emp-av {
  width: 30px; height: 30px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 600; flex-shrink: 0;
}
.emp-name { font-weight: 500; font-size: 13px; }
.emp-id   { font-size: 10px; color: var(--tx2); }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 14px;
  transition: all .15s;
}
.icon-btn:hover { background: var(--bg3); color: var(--tx0); }
.empty-row { text-align: center; color: var(--tx2); padding: 32px; }

.sec-footer {
  padding: 10px 14px;
  border-top: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: space-between;
}
.pg-info { font-size: 11px; color: var(--tx2); }

/* ── Skeleton ── */
.table-loading { padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.skeleton-row {
  height: 40px; background: var(--bg2);
  border-radius: 8px; animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: .4; }
}
</style>