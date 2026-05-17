<template>
  <div class="ca-wrap">

    <!-- Header métricas globales -->
    <div class="ca-metrics">
      <div class="ca-metric blue">
        <div class="cam-top">
          <span class="cam-label">Zonas monitoreadas</span>
          <div class="cam-icon blue"><i class="ti ti-map-pin"></i></div>
        </div>
        <div class="cam-val blue">{{ zonas.length }}</div>
        <div class="cam-sub">activas hoy</div>
      </div>
      <div class="ca-metric green">
        <div class="cam-top">
          <span class="cam-label">Guardias activos</span>
          <div class="cam-icon green"><i class="ti ti-user-check"></i></div>
        </div>
        <div class="cam-val green">{{ totalActivos }}</div>
        <div class="cam-sub">dentro del servicio</div>
      </div>
      <div class="ca-metric amber">
        <div class="cam-top">
          <span class="cam-label">Requeridos</span>
          <div class="cam-icon amber"><i class="ti ti-users"></i></div>
        </div>
        <div class="cam-val amber">{{ totalRequeridos }}</div>
        <div class="cam-sub">elementos totales</div>
      </div>
      <div class="ca-metric" :class="coberturaGlobal >= 90 ? 'green' : coberturaGlobal >= 60 ? 'amber' : 'red'">
        <div class="cam-top">
          <span class="cam-label">Cobertura global</span>
          <div class="cam-icon" :class="coberturaGlobal >= 90 ? 'green' : coberturaGlobal >= 60 ? 'amber' : 'red'">
            <i class="ti ti-chart-pie"></i>
          </div>
        </div>
        <div class="cam-val" :class="coberturaGlobal >= 90 ? 'green' : coberturaGlobal >= 60 ? 'amber' : 'red'">
          {{ coberturaGlobal }}%
        </div>
        <div class="cam-sub">del total requerido</div>
      </div>
    </div>

    <!-- Buscador -->
    <div class="ca-search">
        <i class="ti ti-search"></i>
        <input
            v-model="busqueda"
            class="ca-search-input"
            placeholder="Buscar zona o servicio..."
            type="text"
        />
        <button v-if="busqueda" class="ca-search-clear" @click="busqueda = ''">
            <i class="ti ti-x"></i>
        </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="ca-loading">
      <div class="skeleton-row" v-for="i in 3" :key="i"></div>
    </div>

    <!-- Sin datos -->
    <div v-else-if="!zonas.length" class="ca-empty">
      <i class="ti ti-map-off"></i>
      <p>Sin registros de asistencia hoy</p>
      <span>{{ fechaHoy }}</span>
    </div>

    <!-- Zonas -->
    <div v-else class="zonas-grid">
      <div
        v-for="zona in zonasFiltradas"
        :key="zona.id_zona"
        class="zona-card"
        :class="{ expanded: zonaExpandida === zona.id_zona }"
      >
        <!-- Header zona -->
        <div class="zona-hdr" @click="toggleZona(zona.id_zona)">
          <div class="zona-hdr-left">
            <div class="zona-estatus-dot" :class="zona.estatus"></div>
            <div>
              <div class="zona-nombre">{{ zona.zona }}</div>
              <div class="zona-sub">{{ zona.servicios.length }} servicio{{ zona.servicios.length !== 1 ? 's' : '' }}</div>
            </div>
          </div>

          <div class="zona-hdr-right">
            <!-- Barra de cobertura zona -->
            <div class="zona-barra-wrap">
              <div class="zona-barra">
                <div
                  class="zona-barra-fill"
                  :class="zona.estatus"
                  :style="{ width: zona.pct + '%' }"
                ></div>
              </div>
              <span class="zona-pct" :class="zona.estatus">{{ zona.pct }}%</span>
            </div>

            <div class="zona-counts">
              <span class="zc-activos">{{ zona.activos }}</span>
              <span class="zc-sep">/</span>
              <span class="zc-req">{{ zona.requeridos }}</span>
            </div>

            <span class="zona-badge" :class="zona.estatus">
                {{ zona.estatus === 'completa' ? 'Completa' 
                    : zona.estatus === 'parcial'  ? 'Parcial' 
                    : zona.estatus === 'deficit'  ? 'Déficit' 
                    : 'Sin datos' }}
            </span>

            <i class="ti ti-chevron-down zona-chevron" :class="{ rotated: zonaExpandida === zona.id_zona }"></i>
          </div>
        </div>

        <!-- Servicios (expandible) -->
        <transition name="expand">
          <div v-if="zonaExpandida === zona.id_zona" class="servicios-wrap">
            <div class="servicios-hdr">
              <span>SERVICIO</span>
              <span>COBERTURA</span>
              <span>ACTIVOS / REQ.</span>
              <span>ESTATUS</span>
            </div>
            <div
              v-for="srv in zona.servicios"
              :key="srv.id_servicio"
              class="servicio-row"
            >
              <div class="srv-nombre">
                <i class="ti ti-building"></i>
                {{ srv.servicio }}
              </div>
              <div class="srv-barra-wrap">
                <div class="srv-barra">
                  <div
                    class="srv-barra-fill"
                    :class="srv.estatus"
                    :style="{ width: srv.pct + '%' }"
                  ></div>
                </div>
                <span class="srv-pct" :class="srv.estatus">{{ srv.pct }}%</span>
              </div>
              <div class="srv-counts">
                <span class="srv-activos">{{ srv.activos }}</span>
                <span class="srv-sep">/</span>
                <span class="srv-req">{{ srv.requeridos }}</span>
              </div>
              <span class="srv-badge" :class="srv.estatus">
                {{ srv.estatus === 'completa' ? '● Completa' : srv.estatus === 'parcial' ? '◑ Parcial' : '○ Déficit' }}
              </span>
            </div>
          </div>
        </transition>
      </div>
    </div>

    <!-- Footer con fecha y refresh -->
    <div class="ca-footer">
      <span class="ca-fecha">
        <i class="ti ti-calendar"></i>
        Datos del {{ fechaHoy }} · Actualizado {{ horaActualizacion }}
      </span>
      <button class="btn-refresh" @click="fetchData" :disabled="loading">
        <i class="ti ti-refresh" :class="{ spin: loading }"></i>
        Actualizar
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import api from '@/services/api.js'

const ui = useUiStore()

const loading          = ref(true)
const zonas            = ref([])
const zonaExpandida    = ref(null)
const horaActualizacion = ref('—')
const busqueda = ref('')


const fechaHoy = computed(() => {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
})

const totalActivos    = computed(() => zonas.value.reduce((s, z) => s + z.activos, 0))
const totalRequeridos = computed(() => zonas.value.reduce((s, z) => s + z.requeridos, 0))
const coberturaGlobal = computed(() => {
  if (!totalRequeridos.value) return 0
  return Math.round((totalActivos.value / totalRequeridos.value) * 100)
})

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Control área', to: '/control-area' },
  ])
  fetchData()
})

// Después de cargar, si hay búsqueda expandir todo
watch(busqueda, (q) => {
  if (q) zonaExpandida.value = null // null = cerrar modo individual
})

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/dashboard/control-area')
    zonas.value = data.data || []
    // Expandir la primera zona con déficit, o la primera
    const deficit = zonas.value.find(z => z.estatus === 'deficit')
    zonaExpandida.value = deficit?.id_zona ?? zonas.value[0]?.id_zona ?? null
    horaActualizacion.value = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    console.error('fetchData control-area:', err)
  } finally {
    loading.value = false
  }
}

function toggleZona(id) {
  zonaExpandida.value = zonaExpandida.value === id ? null : id
}

const zonasFiltradas = computed(() => {
  if (!busqueda.value.trim()) return zonas.value
  const q = busqueda.value.toLowerCase()
  return zonas.value
    .map(zona => {
      // Filtrar servicios que coincidan
      const serviciosFiltrados = zona.servicios.filter(s =>
        s.servicio.toLowerCase().includes(q)
      )
      // Incluir zona si su nombre coincide o tiene servicios que coincidan
      if (zona.zona.toLowerCase().includes(q)) return zona
      if (serviciosFiltrados.length) return { ...zona, servicios: serviciosFiltrados }
      return null
    })
    .filter(Boolean)
})
</script>

<style scoped>
.ca-wrap {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Métricas ── */
.ca-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
@media (max-width: 768px) {
  .ca-metrics { grid-template-columns: repeat(2, 1fr); }
}
.ca-metric {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  padding: 14px 16px;
}
.cam-top {
  display: flex; align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.cam-label {
  font-size: 10px; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .8px; font-weight: 500;
}
.cam-icon {
  width: 28px; height: 28px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
}
.cam-icon.blue  { background: var(--acc-dim); color: var(--acc); }
.cam-icon.green { background: var(--grn-dim); color: var(--grn); }
.cam-icon.amber { background: var(--amb-dim); color: var(--amb); }
.cam-icon.red   { background: var(--red-dim); color: var(--red); }
.cam-val {
  font-size: 26px; font-weight: 600;
  letter-spacing: -1px; line-height: 1; margin-bottom: 4px;
}
.cam-val.blue  { color: var(--acc); }
.cam-val.green { color: var(--grn); }
.cam-val.amber { color: var(--amb); }
.cam-val.red   { color: var(--red); }
.cam-sub { font-size: 11px; color: var(--tx2); }

/* ── Zonas grid ── */
.zonas-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ── Zona card ── */
.zona-card {
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color .2s;
}
.zona-card.expanded { border-color: var(--bdr2); }

.zona-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  cursor: pointer;
  transition: background .12s;
  gap: 16px;
}
.zona-hdr:hover { background: var(--bg2); }

.zona-hdr-left {
  display: flex; align-items: center; gap: 12px;
  min-width: 0;
}
.zona-estatus-dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.zona-estatus-dot.completa { background: var(--grn); box-shadow: 0 0 6px var(--grn); }
.zona-estatus-dot.parcial  { background: var(--amb); box-shadow: 0 0 6px var(--amb); }
.zona-estatus-dot.deficit  { background: var(--red); box-shadow: 0 0 6px var(--red); animation: pulse-dot 1.5s ease-in-out infinite; }

@keyframes pulse-dot {
  0%,100% { opacity: 1; }
  50%      { opacity: .4; }
}

.zona-nombre { font-size: 14px; font-weight: 600; color: var(--tx0); }
.zona-sub    { font-size: 11px; color: var(--tx2); margin-top: 2px; }

.zona-hdr-right {
  display: flex; align-items: center; gap: 14px; flex-shrink: 0;
}

/* Barra zona */
.zona-barra-wrap { display: flex; align-items: center; gap: 8px; width: 140px; }
.zona-barra {
  flex: 1; height: 6px;
  background: var(--bg3); border-radius: 4px; overflow: hidden;
}
.zona-barra-fill {
  height: 100%; border-radius: 4px; transition: width .5s ease;
}
.zona-barra-fill.completa { background: var(--grn); }
.zona-barra-fill.parcial  { background: var(--amb); }
.zona-barra-fill.deficit  { background: var(--red); }
.zona-pct { font-size: 12px; font-weight: 600; min-width: 36px; text-align: right; }
.zona-pct.completa { color: var(--grn); }
.zona-pct.parcial  { color: var(--amb); }
.zona-pct.deficit  { color: var(--red); }

/* Contadores */
.zona-counts { display: flex; align-items: baseline; gap: 2px; }
.zc-activos { font-size: 18px; font-weight: 700; color: var(--tx0); }
.zc-sep     { font-size: 13px; color: var(--tx3); }
.zc-req     { font-size: 13px; color: var(--tx2); }

/* Badge zona */
.zona-badge {
  font-size: 10px; font-weight: 500;
  padding: 3px 10px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: .5px;
}
.zona-badge.completa { background: var(--grn-dim); color: var(--grn); }
.zona-badge.parcial  { background: var(--amb-dim); color: var(--amb); }
.zona-badge.deficit  { background: var(--red-dim); color: var(--red); }

/* Chevron */
.zona-chevron { font-size: 16px; color: var(--tx2); transition: transform .2s; }
.zona-chevron.rotated { transform: rotate(180deg); }

/* ── Servicios ── */
.servicios-wrap {
  border-top: 0.5px solid var(--bdr);
}
.servicios-hdr {
  display: grid;
  grid-template-columns: 2fr 1.5fr 120px 100px;
  padding: 8px 16px;
  font-size: 10px;
  color: var(--tx3);
  text-transform: uppercase;
  letter-spacing: .7px;
  font-weight: 500;
  background: var(--bg2);
  gap: 12px;
}
.servicio-row {
  display: grid;
  grid-template-columns: 2fr 1.5fr 120px 100px;
  padding: 12px 16px;
  border-top: 0.5px solid var(--bdr);
  align-items: center;
  gap: 12px;
  transition: background .12s;
}
.servicio-row:hover { background: var(--bg2); }

.srv-nombre {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--tx0); font-weight: 500;
}
.srv-nombre i { font-size: 14px; color: var(--tx2); flex-shrink: 0; }

.srv-barra-wrap { display: flex; align-items: center; gap: 8px; }
.srv-barra {
  flex: 1; height: 4px;
  background: var(--bg3); border-radius: 4px; overflow: hidden;
}
.srv-barra-fill {
  height: 100%; border-radius: 4px; transition: width .4s ease;
}
.srv-barra-fill.completa { background: var(--grn); }
.srv-barra-fill.parcial  { background: var(--amb); }
.srv-barra-fill.deficit  { background: var(--red); }
.srv-pct { font-size: 11px; font-weight: 600; min-width: 32px; }
.srv-pct.completa { color: var(--grn); }
.srv-pct.parcial  { color: var(--amb); }
.srv-pct.deficit  { color: var(--red); }

.srv-counts { display: flex; align-items: baseline; gap: 2px; }
.srv-activos { font-size: 14px; font-weight: 700; color: var(--tx0); }
.srv-sep     { font-size: 11px; color: var(--tx3); }
.srv-req     { font-size: 12px; color: var(--tx2); }

.srv-badge {
  font-size: 11px; font-weight: 500;
}
.srv-badge.completa { color: var(--grn); }
.srv-badge.parcial  { color: var(--amb); }
.srv-badge.deficit  { color: var(--red); }

/* ── Estados vacíos ── */
.ca-empty {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 60px 20px; gap: 8px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
}
.ca-empty i    { font-size: 40px; color: var(--tx3); }
.ca-empty p    { font-size: 14px; color: var(--tx2); font-weight: 500; }
.ca-empty span { font-size: 12px; color: var(--tx3); }

/* ── Loading ── */
.ca-loading { display: flex; flex-direction: column; gap: 10px; }
.skeleton-row {
  height: 68px; background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* ── Footer ── */
.ca-footer {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 10px 0;
}
.ca-fecha { font-size: 11px; color: var(--tx2); display: flex; align-items: center; gap: 6px; }
.ca-fecha i { font-size: 14px; }
.btn-refresh {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.btn-refresh:hover { background: var(--bg2); color: var(--tx0); }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }

/* ── Expand transition ── */
.expand-enter-active { transition: all .25s ease; max-height: 1000px; }
.expand-leave-active { transition: all .2s ease; }
.expand-enter-from  { opacity: 0; transform: translateY(-6px); }
.expand-leave-to    { opacity: 0; transform: translateY(-6px); }

/* ── Spin ── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin .7s linear infinite; }

@media (max-width: 768px) {
  .zona-hdr-right { gap: 8px; }
  .zona-barra-wrap { display: none; }
  .zona-badge { display: none; }
  .servicios-hdr,
  .servicio-row { grid-template-columns: 1fr 80px 60px; }
  .servicios-hdr span:nth-child(2),
  .servicio-row .srv-barra-wrap { display: none; }
}


.zona-estatus-dot.sin-datos  { background: var(--tx3); }
.zona-barra-fill.sin-datos   { background: var(--tx3); }
.zona-pct.sin-datos          { color: var(--tx2); }
.zona-badge.sin-datos        { background: var(--bg3); color: var(--tx2); }
.srv-badge.sin-datos         { color: var(--tx2); }
.sbar.active.sin-datos       { background: var(--tx3); }

.ca-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 10px;
  padding: 8px 12px;
  transition: border .15s;
}
.ca-search:focus-within { border-color: var(--acc); }
.ca-search i { font-size: 16px; color: var(--tx2); flex-shrink: 0; }
.ca-search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--tx0);
  font-family: inherit;
}
.ca-search-input::placeholder { color: var(--tx3); }
.ca-search-clear {
  background: none; border: none;
  color: var(--tx2); cursor: pointer;
  font-size: 14px; padding: 2px;
  display: flex; align-items: center;
}
.ca-search-clear:hover { color: var(--tx0); }
</style>