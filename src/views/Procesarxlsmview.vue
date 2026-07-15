<template>
  <div class="xlsm-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Cargar plantilla de nómina</h1>
        <p class="view-sub">Procesa altas, bajas y asistencia desde un solo archivo .xlsm</p>
      </div>
    </div>

    <!-- ── Paso 0: Deducciones ──────────────────────────────── -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-building-bank" aria-hidden="true"></i>
        <span>Paso 1 — Cargar deducciones</span>
        <span class="badge-opt">Opcional</span>
        <div class="deducc-resumen" v-if="deduccionesResumen.length" style="margin-left:auto;display:flex;gap:10px">
          <span v-for="d in deduccionesResumen" :key="d.tipo" class="deducc-pill">
            <i class="ti ti-check"></i>
            {{ d.tipo.toUpperCase() }}: {{ formatMoney(d.total_quincenal) }}
            <span class="muted">({{ d.empleados }} emp.)</span>
          </span>
        </div>
      </div>
      <div class="sec-body">
        <div class="deducc-grid">

          <!-- FONACOT -->
          <div class="deducc-card" :class="{ loaded: cargadas.fonacot }">
            <div class="deducc-card-hdr">
              <div class="deducc-icon" :class="{ ok: cargadas.fonacot }">
                <i :class="cargadas.fonacot ? 'ti ti-check' : 'ti ti-building-bank'"></i>
              </div>
              <div>
                <p class="deducc-titulo">FONACOT</p>
                <p class="deducc-desc">{{ cargadas.fonacot ? cargadas.fonacot : 'Sin cargar' }}</p>
              </div>
            </div>
            <label class="btn-upload" :class="{ loading: cargandoDed.fonacot }">
              <i class="ti ti-loader-2 spin" v-if="cargandoDed.fonacot"></i>
              <i class="ti ti-upload" v-else></i>
              {{ cargandoDed.fonacot ? 'Cargando...' : 'Subir xlsx' }}
              <input type="file" accept=".xlsx" style="display:none"
                @change="cargarDeduccion('fonacot', $event)" :disabled="cargandoDed.fonacot" />
            </label>
          </div>

          <!-- INFONAVIT -->
          <div class="deducc-card" :class="{ loaded: cargadas.infonavit }">
            <div class="deducc-card-hdr">
              <div class="deducc-icon" :class="{ ok: cargadas.infonavit }">
                <i :class="cargadas.infonavit ? 'ti ti-check' : 'ti ti-home'"></i>
              </div>
              <div>
                <p class="deducc-titulo">INFONAVIT</p>
                <p class="deducc-desc">{{ cargadas.infonavit ? cargadas.infonavit : 'Sin cargar' }}</p>
              </div>
            </div>
            <label class="btn-upload" :class="{ loading: cargandoDed.infonavit }">
              <i class="ti ti-loader-2 spin" v-if="cargandoDed.infonavit"></i>
              <i class="ti ti-upload" v-else></i>
              {{ cargandoDed.infonavit ? 'Subir otro' : 'Subir xlsx' }}
              <input type="file" accept=".xlsx" style="display:none"
                @change="cargarDeduccion('infonavit', $event)" :disabled="cargandoDed.infonavit" />
            </label>
          </div>

          <!-- PENSIÓN -->
          <div class="deducc-card" :class="{ loaded: cargadas.pension }">
            <div class="deducc-card-hdr">
              <div class="deducc-icon" :class="{ ok: cargadas.pension }">
                <i :class="cargadas.pension ? 'ti ti-check' : 'ti ti-scale'"></i>
              </div>
              <div>
                <p class="deducc-titulo">Pensión alimenticia</p>
                <p class="deducc-desc">{{ cargadas.pension ? cargadas.pension : 'Sin cargar' }}</p>
              </div>
            </div>
            <label class="btn-upload" :class="{ loading: cargandoDed.pension }">
              <i class="ti ti-loader-2 spin" v-if="cargandoDed.pension"></i>
              <i class="ti ti-upload" v-else></i>
              {{ cargandoDed.pension ? 'Subir otro' : 'Subir xlsx' }}
              <input type="file" accept=".xlsx" style="display:none"
                @change="cargarDeduccion('pension', $event)" :disabled="cargandoDed.pension" />
            </label>
          </div>

        </div>

        <div v-if="errorDed" class="alert-warn">
          <i class="ti ti-alert-circle"></i> {{ errorDed }}
        </div>
      </div>
    </div>

    <!-- ── Paso 2: Archivo xlsm ───────────────────────────────── -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
        <span>Archivo de plantilla</span>
      </div>
      <div class="sec-body">

        <div class="field" style="margin-bottom: 16px;">
          <label>¿A dónde va esta carga?</label>
          <div class="lote-toggle">
            <button
              type="button"
              class="lote-toggle-opt"
              :class="{ active: modoLote === 'nuevo' }"
              @click="modoLote = 'nuevo'"
            >
              <div class="lto-icon"><i class="ti ti-folder-plus"></i></div>
              <div class="lto-text">
                <p class="lto-title">Crear nuevo lote</p>
                <p class="lto-sub">Empieza una nómina desde cero</p>
              </div>
            </button>

            <button
              type="button"
              class="lote-toggle-opt"
              :class="{ active: modoLote === 'existente', disabled: !lotesAbiertos.length }"
              :disabled="!lotesAbiertos.length"
              @click="modoLote = 'existente'"
            >
              <div class="lto-icon"><i class="ti ti-stack-2"></i></div>
              <div class="lto-text">
                <p class="lto-title">Agregar a lote existente</p>
                <p class="lto-sub">{{ lotesAbiertos.length }} lote{{ lotesAbiertos.length === 1 ? '' : 's' }} abierto{{ lotesAbiertos.length === 1 ? '' : 's' }}</p>
              </div>
              <span class="lto-badge" v-if="lotesAbiertos.length">{{ lotesAbiertos.length }}</span>
            </button>
          </div>
        </div>

        <div v-if="modoLote === 'existente'" class="lote-select-wrap">
          <select v-model="loteSeleccionado" class="lote-select">
            <option :value="null" disabled>Selecciona un lote...</option>
            <option v-for="l in lotesAbiertos" :key="l.id" :value="l.id">
              {{ l.nombre }} — {{ l.total_empleados }} empleados ({{ l.cargas?.length || 0 }} cargas)
            </option>
          </select>

          <div v-if="loteSeleccionado" class="lote-preview">
            <span class="lp-label">Cargas ya incluidas:</span>
            <div class="lp-cargas">
              <span v-for="c in lotesAbiertos.find(l => l.id === loteSeleccionado)?.cargas" :key="c.id" class="lote-badge" :class="'lote-badge--'+c.estatus">
                {{ c.nombre_carga }} · {{ c.total_empleados }}
                <i v-if="c.estatus === 'completa'" class="ti ti-check"></i>
                <i v-else class="ti ti-loader-2 spin"></i>
              </span>
            </div>
          </div>
        </div>

        <div
          class="dropzone"
          :class="{ 'is-dragging': isDragging, 'has-file': !!archivo, 'procesando': procesando }"
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="onDrop"
          @click="!procesando && $refs.inputFile.click()"
        >
          <input ref="inputFile" type="file" accept=".xlsm,.xlsx" style="display:none" @change="onFileChange" />

          <template v-if="!archivo">
            <div class="dz-icon"><i class="ti ti-cloud-upload"></i></div>
            <p class="dz-title">Arrastra el .xlsm aquí</p>
            <p class="dz-sub">El archivo debe contener las hojas: Asistencia, Altas, Bajas</p>
          </template>

          <template v-else>
            <div class="dz-icon ok"><i class="ti ti-file-check"></i></div>
            <p class="dz-title">{{ archivo.name }}</p>
            <p class="dz-sub">{{ formatSize(archivo.size) }} — clic para cambiar</p>
            <button v-if="!procesando" class="dz-clear" @click.stop="limpiar">
              <i class="ti ti-x"></i>
            </button>
          </template>
        </div>

        <!-- Nombre y periodo -->
        <div class="filtros-grid filtros-grid--3" v-if="modoLote === 'nuevo'">
          <div class="field">
            <label>Nombre de la nómina <span class="req">*</span></label>
            <input type="text" v-model="nombre" :disabled="procesando"
              placeholder="Ej. IMSS Bienestar Guerrero junio 2026" />
          </div>
          <div class="field">
            <label>Periodo inicio</label>
            <input type="date" v-model="periodoInicio" :disabled="procesando" />
          </div>
          <div class="field">
            <label>Periodo fin</label>
            <input type="date" v-model="periodoFin" :disabled="procesando" />
          </div>
        </div>

        <div v-if="errorMsg" class="alert-warn">
          <i class="ti ti-alert-circle"></i> {{ errorMsg }}
        </div>

        <!-- Botón principal -->
        <div v-if="!procesando && !resultado" class="filtros-actions">
          <button
            class="btn-primary-lg"
            :disabled="!archivo || !nombre.trim()"
            @click="iniciarProceso"
          >
            <i class="ti ti-player-play"></i>
            Procesar plantilla
          </button>
        </div>

      </div>
    </div>

    <!-- ── Pasos de progreso ──────────────────────────────────── -->
    <div v-if="procesando || resultado" class="sec">
      <div class="sec-hdr">
        <i class="ti ti-list-check"></i>
        <span>Progreso</span>
      </div>
      <div class="pasos-wrap">

        <!-- Paso 1: Altas -->
        <div class="paso" :class="estadoPaso('altas')">
          <div class="paso-icono">
            <i v-if="pasos.altas === 'ok'"      class="ti ti-check"></i>
            <i v-else-if="pasos.altas === 'error'" class="ti ti-x"></i>
            <i v-else-if="pasos.altas === 'cargando'" class="ti ti-loader-2 spin"></i>
            <span v-else class="paso-num">1</span>
          </div>
          <div class="paso-info">
            <p class="paso-titulo">Altas de empleados</p>
            <p class="paso-desc">
              <template v-if="pasos.altas === 'ok'">
                {{ resultado?.altas?.procesadas ?? 0 }} empleados nuevos insertados
                <span v-if="resultado?.altas?.omitidas" class="muted"> · {{ resultado.altas.omitidas }} omitidos</span>
              </template>
              <template v-else-if="pasos.altas === 'cargando'">Procesando altas...</template>
              <template v-else-if="pasos.altas === 'error'">Error al procesar altas</template>
              <template v-else>Pendiente</template>
            </p>
          </div>
        </div>

        <!-- Paso 2: Bajas -->
        <div class="paso" :class="estadoPaso('bajas')">
          <div class="paso-icono">
            <i v-if="pasos.bajas === 'ok'"      class="ti ti-check"></i>
            <i v-else-if="pasos.bajas === 'error'" class="ti ti-x"></i>
            <i v-else-if="pasos.bajas === 'cargando'" class="ti ti-loader-2 spin"></i>
            <span v-else class="paso-num">2</span>
          </div>
          <div class="paso-info">
            <p class="paso-titulo">Bajas de empleados</p>
            <p class="paso-desc">
              <template v-if="pasos.bajas === 'ok'">
                {{ resultado?.bajas?.procesadas ?? 0 }} empleados dados de baja
                <span v-if="resultado?.bajas?.omitidas" class="muted"> · {{ resultado.bajas.omitidas }} omitidos</span>
              </template>
              <template v-else-if="pasos.bajas === 'cargando'">Procesando bajas...</template>
              <template v-else-if="pasos.bajas === 'error'">Error al procesar bajas</template>
              <template v-else>Pendiente</template>
            </p>
          </div>
        </div>

        <!-- Paso 3: Nómina por chunks -->
        <div class="paso" :class="estadoPaso('nomina')">
          <div class="paso-icono">
            <i v-if="pasos.nomina === 'ok'"         class="ti ti-check"></i>
            <i v-else-if="pasos.nomina === 'error'" class="ti ti-x"></i>
            <i v-else-if="pasos.nomina === 'cargando'" class="ti ti-loader-2 spin"></i>
            <span v-else class="paso-num">3</span>
          </div>
          <div class="paso-info">
            <p class="paso-titulo">Cálculo de pre-nómina</p>
            <p class="paso-desc">
              <template v-if="pasos.nomina === 'ok'">
                {{ chunkProcesadas }} empleados calculados · Total: {{ formatMoney(totalNomina) }}
              </template>
              <template v-else-if="pasos.nomina === 'cargando'">
                Calculando {{ chunkProcesadas }} de {{ chunkTotal }} empleados...
              </template>
              <template v-else-if="pasos.nomina === 'error'">Error en el cálculo</template>
              <template v-else>Pendiente</template>
            </p>
            <!-- Barra de progreso del chunk -->
            <div v-if="pasos.nomina === 'cargando'" class="chunk-bar-wrap">
              <div class="chunk-bar">
                <div class="chunk-fill" :style="{ width: pctNomina + '%' }"></div>
              </div>
              <span class="chunk-pct">{{ pctNomina }}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ── Resultado final ────────────────────────────────────── -->
    <div v-if="resultado && pasos.nomina === 'ok'" class="sec resultado-sec">
      <div class="sec-hdr">
        <i class="ti ti-circle-check" style="color:var(--grn)"></i>
        <span>Proceso completado</span>
      </div>
      <div class="resultado-grid">
        <div class="resultado-card green">
          <span class="rc-val">{{ resultado.altas?.procesadas ?? 0 }}</span>
          <span class="rc-label">Altas insertadas</span>
        </div>
        <div class="resultado-card red">
          <span class="rc-val">{{ resultado.bajas?.procesadas ?? 0 }}</span>
          <span class="rc-label">Bajas procesadas</span>
        </div>
        <div class="resultado-card blue">
          <span class="rc-val">{{ chunkProcesadas }}</span>
          <span class="rc-label">Empleados en nómina</span>
        </div>
        <div class="resultado-card total">
          <span class="rc-val">{{ formatMoney(totalNomina) }}</span>
          <span class="rc-label">Total pre-nómina</span>
        </div>
      </div>
      <div v-if="resultado?.asistencia?.omitidas?.length" class="alert-warn" style="margin:0 16px 14px;">
        <i class="ti ti-alert-circle"></i>
        {{ resultado.asistencia.omitidas.length }} fila(s) del Excel no se procesaron.
        <button class="btn-sm" style="margin-left:auto" @click="exportarOmitidas(resultado.asistencia.omitidas)">
          <i class="ti ti-download"></i> Descargar reporte
        </button>
      </div>
      <div class="resultado-actions">
        <button class="btn-sm" @click="limpiar">
          <i class="ti ti-refresh"></i> Cargar otro archivo
        </button>
        <button class="btn-primary-lg" @click="abrirModalNomina">
          <i class="ti ti-eye"></i> Ver nómina generada
        </button>
      </div>
    </div>

  </div>
  <!-- ── Modal resumen de nómina ─────────────────────────────── -->
  <Teleport to="body">
    <div v-if="modalNomina" class="modal-overlay" @click.self="modalNomina = false">
      <div class="modal-nomina">

        <div class="mn-header">
          <div>
            <p class="mn-title">{{ resultado?.asistencia ? 'Resumen de nómina' : 'Nómina generada' }}</p>
            <p class="mn-sub">
              {{ nombreNomina }} ·
              {{ periodoInicio }} → {{ periodoFin || 'sin fecha fin' }} ·
              <strong>{{ detalleNomina.length }}</strong> empleados ·
              Total: <span class="grn">{{ formatMoney(totalNomina) }}</span>
            </p>
          </div>
          <button class="mn-close" @click="modalNomina = false"><i class="ti ti-x"></i></button>
        </div>

        <!-- Filtros rápidos -->
        <div style="display:flex; align-items:center; gap:16px; padding:14px 20px; border-bottom:0.5px solid var(--bdr); flex-wrap:nowrap;">
          <input
            v-model="filtroNombre"
            placeholder="Buscar empleado..."
            style="flex:1 1 280px; min-width:0; padding:9px 14px; border-radius:8px; border:0.5px solid var(--bdr2); background:var(--bg2); color:var(--tx0); font-size:13px; font-family:inherit; outline:none;"
          />
          <select
            v-model="filtroZona"
            style="flex:0 0 auto; min-width:180px; padding:9px 14px; border-radius:8px; border:0.5px solid var(--bdr2); background:var(--bg2); color:var(--tx0); font-size:13px; font-family:inherit; cursor:pointer; outline:none;"
          >
            <option value="">Todas las zonas</option>
            <option v-for="z in zonasUnicas" :key="z" :value="z">{{ z }}</option>
          </select>

          <div style="display:flex; gap:10px; flex-shrink:0;">
            <button type="button" class="chip-check" :class="{ active: soloNuevos }" @click="soloNuevos = !soloNuevos">
              <span class="chip-check-box"><i class="ti ti-check" v-if="soloNuevos"></i></span>
              Solo nuevos
            </button>
            <button type="button" class="chip-check" :class="{ active: soloSinMatch }" @click="soloSinMatch = !soloSinMatch">
              <span class="chip-check-box"><i class="ti ti-check" v-if="soloSinMatch"></i></span>
              Sin match
            </button>
          </div>
        </div>

        <!-- Tabla -->
        <div class="mn-tabla-wrap">
          <div v-if="cargandoDetalle" class="mn-loading">
            <i class="ti ti-loader-2 spin"></i> Cargando detalle...
          </div>
          <!-- Toggle secciones -->
          <div class="mn-tabs">
            <button :class="['mn-tab', tabActiva === 'prenomina' && 'active']" @click="tabActiva = 'prenomina'">
              <i class="ti ti-calculator"></i> Pre-nómina
            </button>
            <button :class="['mn-tab', tabActiva === 'fiscal' && 'active']" @click="tabActiva = 'fiscal'">
              <i class="ti ti-building-government"></i> Nómina fiscal
            </button>
          </div>

          <!-- ── TAB: PRE-NÓMINA ── -->
          <table v-if="tabActiva === 'prenomina'" class="mn-tabla">
            <thead>
              <tr>
                <th class="th-grupo th-perc" colspan="8">PERCEPCIONES</th>
                <th class="th-grupo th-ded"  colspan="5">DEDUCCIONES</th>
                <th class="th-grupo th-tot"  colspan="2">TOTALES</th>
              </tr>
              <tr>
                <th class="text-left">Empleado</th>
                <th class="text-left">Zona</th>
                <th title="Nuevo ingreso este periodo">★</th>
                <th title="Sueldo base quincenal">Sueldo</th>
                <th title="Tiempo extra (24E/12E)">Extra</th>
                <th title="Monto adicional capturado en el Excel">Adicional</th>
                <th title="Festivos trabajados + Dobletes">Fest/Dob</th>
                <th title="Descuento por faltas">Faltas</th>
                <th title="FONACOT">FONACOT</th>
                <th title="INFONAVIT">INFONAVIT</th>
                <th title="Pensión alimenticia">Pensión</th>
                <th title="Otros descuentos">Otros</th>
                <th title="Total neto a pagar (pre-nómina)" class="col-total">Neto pagar</th>
                <th title="Bono del tabulador">Bono</th>
                <th title="Comentarios del Excel">Comentarios</th>

              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0">
                <td colspan="14" class="sin-resultados">Sin resultados</td>
              </tr>
              <tr
                v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado, 'row-festivo': d.conteo_festivos > 0 }"
              >
                <td class="col-nombre">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn"  v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="col-zona">{{ d.zona || '—' }}</td>
                <td class="center">
                  <i v-if="d.es_nuevo==1" class="ti ti-star-filled" style="color:var(--amb)"></i>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono">{{ fmt(d.sueldo_semanal) }}</td>
                <td class="mono grn">{{ d.tiempo_extra > 0 ? '+'+fmt(d.tiempo_extra) : '—' }}</td>
                <td class="mono grn">{{ d.adicional > 0 ? '+'+fmt(d.adicional) : '—' }}</td>
                <td class="mono grn">
                  <span v-if="d.monto_festivos > 0 || d.monto_dobletes > 0">
                    +{{ fmt((+d.monto_festivos||0) + (+d.monto_dobletes||0)) }}
                    <span class="muted" style="font-size:10px">
                      ({{ d.conteo_festivos > 0 ? d.conteo_festivos+'F' : '' }}{{ d.monto_dobletes > 0 ? ' '+d.conteo_dobletes+'D' : '' }})
                    </span>
                  </span>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono red">{{ d.descuento_faltas > 0 ? '-'+fmt(d.descuento_faltas) : '—' }}</td>
                <td class="mono red">{{ d.desc_fonacot > 0 ? '-'+fmt(d.desc_fonacot) : '—' }}</td>
                <td class="mono red">{{ d.desc_infonavit > 0 ? '-'+fmt(d.desc_infonavit) : '—' }}</td>
                <td class="mono red">{{ d.desc_pension > 0 ? '-'+fmt(d.desc_pension) : '—' }}</td>
                <td class="mono red">{{ d.otros_descuentos > 0 ? '-'+fmt(d.otros_descuentos) : '—' }}</td>
                <td class="mono col-total" :class="d.total > 0 ? 'grn' : 'red'">{{ fmt(d.total) }}</td>
                <td class="mono grn" style="font-size:11px">{{ d.bono > 0 ? '+'+fmt(d.bono) : '—' }}</td>
                <td class="col-comentarios" style="text-align:left; font-size:11px; color:var(--tx2); max-width:200px;">
                  {{ d.comentarios || '—' }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td colspan="3"><strong>TOTALES</strong></td>
                <td class="mono">{{ fmt(sumaCol('sueldo_semanal')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('tiempo_extra')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('adicional')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('monto_festivos') + sumaCol('monto_dobletes')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('descuento_faltas')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_fonacot')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_infonavit')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('desc_pension')) }}</td>
                <td class="mono red">-{{ fmt(sumaCol('otros_descuentos')) }}</td>
                <td class="mono grn col-total">{{ fmt(sumaCol('total')) }}</td>
                <td class="mono grn">+{{ fmt(sumaCol('bono')) }}</td>
                <td></td>

              </tr>
            </tfoot>
          </table>

          <!-- ── TAB: NÓMINA FISCAL ── -->
          <table v-else-if="tabActiva === 'fiscal'" class="mn-tabla mn-tabla-fiscal">
            <thead>
              <tr>
                <th class="th-grupo th-base" colspan="5">BASE</th>
                <th class="th-grupo th-ded"  colspan="7">DEDUCCIONES FISCALES</th>
                <th class="th-grupo th-tot"  colspan="3">DISPERSIÓN</th>
              </tr>
              <tr>
                <th class="text-left sticky-col">Empleado</th>
                <th title="Días efectivamente laborados">Días Lab.</th>
                <th title="Salario Diario">SD</th>
                <th title="Salario Diario Integrado">SDI</th>
                <th title="Ingreso quincenal base gravable (SD × días)">Ingreso Q</th>
                <th title="ISR antes de Subsidio al Empleo">ISR antes Subs.</th>
                <th title="IMSS cuota obrera">IMSS</th>
                <th title="INFONAVIT fijo">INFONAVIT</th>
                <th title="FONACOT">FONACOT</th>
                <th title="Pensión alimenticia">Pensión</th>
                <th title="Subsidio al Empleo acreditado">Subs. Empleo</th>
                <th title="ISR neto a retener (ISR - Subsidio)">ISR neto</th>
                <th title="Neto fiscal (Ingreso Q - IMSS - ISR neto)" class="col-fiscal">Neto Fiscal</th>
                <th title="Ingreso Adicional al Salario (Neto pagar - Neto fiscal)" style="color:var(--amb)">IAS</th>
                <th title="Total a dispersar = Neto fiscal + IAS" class="col-total">Total Disp.</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0">
                <td colspan="15" class="sin-resultados">Sin resultados</td>
              </tr>
              <tr v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado }">
                <td class="col-nombre sticky-col">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn"  v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="mono center">{{ d.dias_pagados || 15 }}</td>
                <td class="mono">{{ d.sd ? fmt(d.sd) : '—' }}</td>
                <td class="mono">{{ d.sdi ? fmt(d.sdi) : '—' }}</td>
                <td class="mono">{{ d.ingreso_quincenal ? fmt(d.ingreso_quincenal) : '—' }}</td>
                <td class="mono red">{{ d.isr_bruto > 0 ? fmt(d.isr_bruto) : '—' }}</td>
                <td class="mono red">{{ d.imss_obrero > 0 ? fmt(d.imss_obrero) : '—' }}</td>
                <td class="mono red">{{ d.desc_infonavit > 0 ? fmt(d.desc_infonavit) : '—' }}</td>
                <td class="mono red">{{ d.desc_fonacot > 0 ? fmt(d.desc_fonacot) : '—' }}</td>
                <td class="mono red">{{ d.desc_pension > 0 ? fmt(d.desc_pension) : '—' }}</td>
                <td class="mono grn">{{ d.subsidio_empleo > 0 ? fmt(d.subsidio_empleo) : '—' }}</td>
                <td class="mono red">{{ d.isr_neto > 0 ? fmt(d.isr_neto) : '—' }}</td>
                <td class="mono col-fiscal">{{ d.neto_fiscal ? fmt(d.neto_fiscal) : '—' }}</td>
                <td class="mono" style="color:var(--amb)">{{ d.ias > 0 ? fmt(d.ias) : '—' }}</td>
                <td class="mono col-total grn">{{ d.total_dispersion ? fmt(d.total_dispersion) : fmt(d.total) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td class="sticky-col" colspan="2"><strong>TOTALES</strong></td>
                <td colspan="2"></td>
                <td class="mono">{{ fmt(sumaCol('ingreso_quincenal')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('isr_bruto')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('imss_obrero')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_infonavit')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_fonacot')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('desc_pension')) }}</td>
                <td class="mono grn">{{ fmt(sumaCol('subsidio_empleo')) }}</td>
                <td class="mono red">{{ fmt(sumaCol('isr_neto')) }}</td>
                <td class="mono col-fiscal">{{ fmt(sumaCol('neto_fiscal')) }}</td>
                <td class="mono" style="color:var(--amb)">{{ fmt(sumaCol('ias')) }}</td>
                <td class="mono grn col-total">{{ fmt(sumaCol('total_dispersion') || sumaCol('total')) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mn-footer-bar">
          <span class="muted" style="font-size:12px">
            Mostrando {{ detallesFiltrados.length }} de {{ detalleNomina.length }} empleados
          </span>
          <div style="display:flex; gap:8px;">
            <button class="btn-primary-lg" @click="mostrarModalDispersion = true">
              <i class="ti ti-cash"></i> Dispersar
            </button>
            <button class="btn-sm" @click="modalNomina = false">Cerrar</button>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
  <Teleport to="body">
    <div v-if="mostrarModalDispersion" class="modal-overlay" @click.self="mostrarModalDispersion = false">
      <div class="modal-nomina" style="max-width:480px; max-height:none;">
        <div class="mn-header">
          <p class="mn-title">Dispersión</p>
          <button class="mn-close" @click="mostrarModalDispersion = false"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding: 0 20px 20px;">
          <DispersionModal :nomina="nominaActual" />
        </div>
      </div>
    </div>
  </Teleport>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { nominaFatigaService } from '@/services/Nominafatiga.service.js'
import api from '@/services/api.js'
import DispersionModal from '@/components/ui/DispersionModal.vue'
import * as XLSX from 'xlsx'  

const emit = defineEmits(['ir-nominas'])

// ── Estado deducciones ───────────────────────────────────────
const cargadas = ref({ fonacot: null, infonavit: null, pension: null })
const cargandoDed = ref({ fonacot: false, infonavit: false, pension: false })
const errorDed = ref('')
const deduccionesResumen = ref([])

const mostrarModalDispersion = ref(false)

const modoLote      = ref('nuevo') // 'nuevo' | 'existente'
const lotesAbiertos = ref([])
const loteSeleccionado = ref(null)
const cargandoLotes = ref(false)

import { useRoute } from 'vue-router'
const route = useRoute()

onMounted(() => {
  if (route.query.id_nomina) {
    modoLote.value = 'existente'
    cargarLotesAbiertos().then(() => {
      loteSeleccionado.value = Number(route.query.id_nomina)
    })
  }
})

async function cargarLotesAbiertos() {
  cargandoLotes.value = true
  try {
    const { data } = await api.get('/nomina-fatiga/lotes-abiertos')
    lotesAbiertos.value = data.data || []
  } catch (err) {
    console.error('Error cargando lotes:', err)
  } finally {
    cargandoLotes.value = false
  }
}

onMounted(cargarLotesAbiertos)


async function cargarDeduccion(tipo, event) {
  const file = event.target.files?.[0]
  if (!file) return
  cargandoDed.value[tipo] = true
  errorDed.value = ''
  try {
    const fd = new FormData()
    fd.append('archivo', file)
    const { data } = await api.post(`/deducciones/${tipo}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    if (data.status === 'ok') {
      cargadas.value[tipo] = `${data.data.insertados} registros — ${file.name}`
      await cargarResumenDeducciones()
    } else {
      errorDed.value = data.message || `Error cargando ${tipo}`
    }
  } catch (err) {
    errorDed.value = err?.response?.data?.message || `Error cargando ${tipo}`
  } finally {
    cargandoDed.value[tipo] = false
    event.target.value = ''
  }
}

async function cargarResumenDeducciones() {
  try {
    const { data } = await api.get('/deducciones/resumen')
    deduccionesResumen.value = data.data || []
  } catch {}
}

// Cargar resumen al montar
onMounted(() => cargarResumenDeducciones())


// ── Estado archivo xlsm ──────────────────────────────────────
const archivo       = ref(null)
const nombre        = ref('')
const periodoInicio = ref('')
const periodoFin    = ref('')
const isDragging    = ref(false)
const procesando    = ref(false)
const errorMsg      = ref('')
const resultado     = ref(null)
const totalNomina   = ref(0)

const chunkTotal     = ref(0)
const chunkProcesadas = ref(0)

const pasos = ref({
  altas:  'pendiente',  // pendiente | cargando | ok | error
  bajas:  'pendiente',
  nomina: 'pendiente',
})

const pctNomina = computed(() =>
  chunkTotal.value ? Math.round((chunkProcesadas.value / chunkTotal.value) * 100) : 0
)

function estadoPaso(paso) {
  return {
    'paso--ok':       pasos.value[paso] === 'ok',
    'paso--error':    pasos.value[paso] === 'error',
    'paso--cargando': pasos.value[paso] === 'cargando',
    'paso--pendiente':pasos.value[paso] === 'pendiente',
  }
}

function onDrop(e) {
  isDragging.value = false
  const f = e.dataTransfer?.files?.[0]
  if (f) asignar(f)
}

function onFileChange(e) {
  const f = e.target.files?.[0]
  if (f) asignar(f)
}

function asignar(f) {
  if (!/\.(xlsm|xlsx)$/i.test(f.name)) {
    errorMsg.value = 'El archivo debe ser .xlsm o .xlsx'
    return
  }
  errorMsg.value = ''
  archivo.value  = f
  if (!nombre.value) nombre.value = f.name.replace(/\.(xlsm|xlsx)$/i, '')
}

function limpiar() {
  archivo.value    = null
  nombre.value     = ''
  periodoInicio.value = ''
  periodoFin.value = ''
  errorMsg.value   = ''
  procesando.value = false
  resultado.value  = null
  totalNomina.value = 0
  chunkTotal.value = 0
  chunkProcesadas.value = 0
  pasos.value = { altas: 'pendiente', bajas: 'pendiente', nomina: 'pendiente' }
}

async function iniciarProceso() {
  if (!archivo.value) return
  if (modoLote.value === 'nuevo' && !nombre.value.trim()) return
  if (modoLote.value === 'existente' && !loteSeleccionado.value) {
    errorMsg.value = 'Selecciona un lote existente'
    return
  }


  procesando.value  = true
  errorMsg.value    = ''
  resultado.value   = null
  chunkProcesadas.value = 0
  chunkTotal.value  = 0
  pasos.value = { altas: 'cargando', bajas: 'pendiente', nomina: 'pendiente' }


  try {
    const fd = new FormData()
    fd.append('archivo', archivo.value)

    if (modoLote.value === 'existente') {
      fd.append('id_nomina', loteSeleccionado.value)
    } else {
      fd.append('nombre', nombre.value.trim())
      if (periodoInicio.value) fd.append('periodo_inicio', periodoInicio.value)
      if (periodoFin.value)    fd.append('periodo_fin', periodoFin.value)
    }

    const res = await nominaFatigaService.procesarXlsm(fd)

    if (res.status !== 'ok') {
      errorMsg.value = res.message || 'Error procesando el archivo'
      pasos.value.altas = 'error'
      return
    }

    pasos.value.altas = 'ok'
    pasos.value.bajas = 'ok'
    resultado.value   = res.data

    const asist = res.data.asistencia
    if (!asist) {
      pasos.value.nomina = 'ok'
      return
    }

    // Paso 3: loop de chunks
    pasos.value.nomina = 'cargando'
    const idNomina = asist.id_nomina
    idNominaActual.value = idNomina
    chunkTotal.value   = asist.total
    let completo = false

    while (!completo) {
      const chunk = await nominaFatigaService.procesarChunk(idNomina, 100)
      if (chunk.status !== 'ok') {
        errorMsg.value = chunk.message || 'Error calculando nómina'
        pasos.value.nomina = 'error'
        break
      }
      chunkProcesadas.value = chunk.data.filas_procesadas ?? chunkProcesadas.value
      completo = chunk.data.completo === true
      if (completo) {
        chunkProcesadas.value = chunkTotal.value
        totalNomina.value     = chunk.data.total_pagar ?? 0
        pasos.value.nomina    = 'ok'
      }
    }

  } catch (err) {
    errorMsg.value = err?.response?.data?.message || 'Error inesperado'
    pasos.value.altas = 'error'
  } finally {
    procesando.value = false
  }
}

// ── Modal nómina ────────────────────────────────────────────
const modalNomina      = ref(false)
const detalleNomina    = ref([])
const cargandoDetalle  = ref(false)
const filtroNombre     = ref('')
const filtroZona       = ref('')
const soloNuevos       = ref(false)
const soloSinMatch     = ref(false)
const nombreNomina     = ref('')
const idNominaActual   = ref(null)
const tabActiva        = ref('prenomina') 
const nominaActual = ref(null)

const zonasUnicas = computed(() =>
  [...new Set(detalleNomina.value.map(d => d.zona).filter(Boolean))].sort()
)

const detallesFiltrados = computed(() => {
  let lista = detalleNomina.value
  if (filtroNombre.value)  lista = lista.filter(d => d.nombre_excel?.toLowerCase().includes(filtroNombre.value.toLowerCase()))
  if (filtroZona.value)    lista = lista.filter(d => d.zona === filtroZona.value)
  if (soloNuevos.value)    lista = lista.filter(d => d.es_nuevo == 1)
  if (soloSinMatch.value)  lista = lista.filter(d => !d.id_empleado)
  return lista
})

function sumaCol(col) {
  return detallesFiltrados.value.reduce((s, d) => s + (parseFloat(d[col]) || 0), 0)
}

function exportarOmitidas(omitidas) {
  if (!omitidas?.length) return
  const rows = [
    ['Fila Excel', 'Nombre', 'Motivo'],
    ...omitidas.map(o => [o.fila, o.nombre, o.motivo])
  ]
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'OMITIDAS')
  XLSX.writeFile(wb, `filas_omitidas_${new Date().toISOString().slice(0,10)}.xlsx`)
}

async function abrirModalNomina() {
  const id = idNominaActual.value || resultado.value?.asistencia?.id_nomina
  if (!id) {
    console.warn('No hay id_nomina disponible', resultado.value)
    return
  }
  modalNomina.value     = true
  cargandoDetalle.value = true
  nombreNomina.value    = nombre.value
  detalleNomina.value   = []
  filtroNombre.value    = ''
  filtroZona.value      = ''
  soloNuevos.value      = false
  soloSinMatch.value    = false
   try {
    const { data } = await api.get(`/nomina-fatiga/${id}`)
    detalleNomina.value = data.data?.detalle || []
    nominaActual.value  = data.data?.nomina || null
  } catch (err) {
    console.error('Error cargando detalle:', err)
  } finally {
    cargandoDetalle.value = false
  }
}

// Alias corto para formatear moneda en la tabla
function fmt(v) {
  return Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatSize(b) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
</script>

<style scoped>
.xlsm-view { display:flex; flex-direction:column; gap:14px; }
.view-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.view-title  { font-size:20px; font-weight:600; color:var(--tx0); }
.view-sub    { font-size:12px; color:var(--tx2); margin-top:3px; }

.sec { background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; }
.sec-hdr {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-bottom:0.5px solid var(--bdr);
  font-size:13px; font-weight:500; color:var(--tx0);
}
.sec-hdr i { font-size:16px; color:var(--acc); }
.sec-body { padding:16px; display:flex; flex-direction:column; gap:14px; }

/* Dropzone */
.dropzone {
  position:relative; border:2px dashed var(--bdr2); border-radius:12px;
  padding:36px 20px; display:flex; flex-direction:column;
  align-items:center; gap:6px; text-align:center;
  cursor:pointer; transition:all .15s; background:var(--bg2);
}
.dropzone:hover, .dropzone.is-dragging { border-color:var(--acc); background:var(--acc-dim); }
.dropzone.has-file  { border-color:var(--grn); background:rgba(34,201,122,.06); }
.dropzone.procesando { cursor:default; opacity:.7; }
.dz-icon {
  width:52px; height:52px; border-radius:14px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center; font-size:26px; margin-bottom:4px;
}
.dz-icon.ok { background:rgba(34,201,122,.12); color:var(--grn); }
.dz-title { font-size:14px; font-weight:600; color:var(--tx0); }
.dz-sub   { font-size:12px; color:var(--tx2); }
.dz-clear {
  position:absolute; top:10px; right:10px;
  width:26px; height:26px; border-radius:6px;
  background:var(--bg3); border:0.5px solid var(--bdr);
  color:var(--tx2); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:13px;
}
.dz-clear:hover { background:var(--red-dim); color:var(--red); }

/* Pasos */
.pasos-wrap { padding:16px; display:flex; flex-direction:column; gap:0; }
.paso {
  display:flex; align-items:flex-start; gap:14px;
  padding:16px 0; border-bottom:0.5px solid var(--bdr);
  transition:all .2s;
}
.paso:last-child { border-bottom:none; }
.paso-icono {
  width:36px; height:36px; border-radius:50%; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
  font-size:16px; font-weight:700;
  background:var(--bg3); color:var(--tx2);
  transition:all .2s;
}
.paso-num { font-size:14px; font-weight:700; }
.paso--ok .paso-icono      { background:rgba(34,201,122,.15); color:var(--grn); }
.paso--error .paso-icono   { background:var(--red-dim); color:var(--red); }
.paso--cargando .paso-icono { background:var(--acc-dim); color:var(--acc); }
.paso-titulo { font-size:13px; font-weight:600; color:var(--tx0); }
.paso-desc   { font-size:12px; color:var(--tx2); margin-top:3px; }
.muted       { opacity:.6; }

/* Chunk bar en el paso 3 */
.chunk-bar-wrap { display:flex; align-items:center; gap:8px; margin-top:8px; }
.chunk-bar {
  flex:1; height:6px; background:var(--bg3); border-radius:6px; overflow:hidden;
}
.chunk-fill {
  height:100%; border-radius:6px;
  background:linear-gradient(90deg, var(--acc), var(--acc2));
  transition:width .4s ease;
}
.chunk-pct { font-size:11px; color:var(--acc); font-weight:600; min-width:32px; }

/* Resultado */
.resultado-sec .sec-hdr i { color:var(--grn); }
.resultado-grid {
  display:grid; grid-template-columns:repeat(4,1fr);
  border-bottom:0.5px solid var(--bdr);
}
.resultado-card {
  display:flex; flex-direction:column; align-items:center; gap:4px;
  padding:20px; border-right:0.5px solid var(--bdr);
}
.resultado-card:last-child { border-right:none; }
.rc-val   { font-size:22px; font-weight:700; font-family:monospace; color:var(--tx0); }
.rc-label { font-size:11px; color:var(--tx2); text-transform:uppercase; letter-spacing:.6px; }
.resultado-card.green .rc-val { color:var(--grn); }
.resultado-card.red   .rc-val { color:var(--red); }
.resultado-card.blue  .rc-val { color:var(--acc); }
.resultado-card.total { background:var(--bg2); }
.resultado-card.total .rc-val { font-size:18px; color:var(--grn); }
.resultado-actions {
  padding:14px 16px; display:flex; justify-content:flex-end; gap:8px;
}

/* Fields */
.filtros-grid--3 { display:grid; grid-template-columns:1fr 140px 140px; gap:12px; }
.field { display:flex; flex-direction:column; gap:5px; }
label  { font-size:12px; font-weight:500; color:var(--tx1); }
.req   { color:var(--red); }
input[type="date"], input[type="text"] {
  background:var(--bg2); border:0.5px solid var(--bdr2);
  border-radius:8px; padding:8px 10px;
  font-size:13px; color:var(--tx0); outline:none;
  font-family:inherit; transition:border .15s; width:100%;
}
input:focus { border-color:var(--acc); }
input:disabled { opacity:.6; }

.alert-warn {
  display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px;
  background:var(--amb-dim); border:0.5px solid var(--amb); color:var(--amb); font-size:13px;
}
.filtros-actions { display:flex; justify-content:flex-end; }

.btn-sm {
  display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:transparent;
  font-size:12px; color:var(--tx1); cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-sm:hover { background:var(--bg3); }
.btn-primary-lg {
  display:inline-flex; align-items:center; gap:6px; padding:8px 18px;
  border-radius:8px; border:none; background:var(--acc);
  font-size:13px; color:#fff; cursor:pointer; font-family:inherit;
  font-weight:500; transition:background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background:var(--acc2); }
.btn-primary-lg:disabled { opacity:.6; cursor:not-allowed; }

@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; animation:spin .8s linear infinite; }

@media (max-width:768px) {
  .filtros-grid--3 { grid-template-columns:1fr; }
  .resultado-grid  { grid-template-columns:1fr 1fr; }
  .deducc-grid     { grid-template-columns:1fr; }
}

/* ── Deducciones ────────────────────────────────────────────── */
.badge-opt {
  font-size:10px; padding:2px 8px; border-radius:20px;
  background:var(--bg3); color:var(--tx2); font-weight:500;
}
.deducc-resumen { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.deducc-pill {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; padding:3px 10px; border-radius:20px;
  background:rgba(34,201,122,.1); color:var(--grn);
  border:0.5px solid var(--grn);
}
.deducc-pill i { font-size:11px; }
.deducc-grid {
  display:grid; grid-template-columns:repeat(3,1fr); gap:12px;
}
.deducc-card {
  border:1.5px solid var(--bdr2); border-radius:12px;
  padding:14px; display:flex; flex-direction:column; gap:12px;
  background:var(--bg2); transition:all .2s;
}
.deducc-card.loaded { border-color:var(--grn); background:rgba(34,201,122,.04); }
.deducc-card-hdr { display:flex; align-items:center; gap:10px; }
.deducc-icon {
  width:36px; height:36px; border-radius:10px;
  background:var(--bg3); color:var(--tx2);
  display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;
}
.deducc-icon.ok { background:rgba(34,201,122,.15); color:var(--grn); }
.deducc-titulo { font-size:13px; font-weight:600; color:var(--tx0); }
.deducc-desc   { font-size:11px; color:var(--tx2); margin-top:2px; }
.btn-upload {
  display:flex; align-items:center; justify-content:center; gap:6px;
  padding:8px 14px; border-radius:8px; border:0.5px solid var(--bdr2);
  background:var(--bg1); color:var(--tx1); font-size:12px;
  cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-upload:hover { background:var(--acc-dim); color:var(--acc); border-color:var(--acc); }
.btn-upload.loading { opacity:.6; cursor:not-allowed; }

/* ── Tabs del modal ─────────────────────────────────────────── */
.mn-tabs {
  display:flex; gap:4px; padding:10px 16px;
  border-bottom:0.5px solid var(--bdr); background:var(--bg2);
}
.mn-tab {
  display:inline-flex; align-items:center; gap:5px;
  padding:6px 14px; border-radius:8px; border:none;
  background:transparent; color:var(--tx2);
  font-size:12px; cursor:pointer; font-family:inherit; transition:all .15s;
}
.mn-tab:hover { background:var(--bg3); color:var(--tx0); }
.mn-tab.active { background:var(--acc-dim); color:var(--acc); font-weight:500; }
.mn-tab i { font-size:14px; }

/* Grupos de columnas en thead */
.th-grupo {
  font-size:10px; font-weight:700; text-transform:uppercase;
  letter-spacing:.5px; padding:5px 8px; border-bottom:0.5px solid var(--bdr);
}
.th-perc { background:rgba(34,201,122,.08); color:var(--grn); }
.th-ded  { background:rgba(255,80,80,.08);  color:var(--red); }
.th-tot  { background:var(--acc-dim); color:var(--acc); }
.th-base { background:var(--bg3); color:var(--tx2); }

.text-left { text-align:left !important; }
.center { text-align:center !important; }
.sin-resultados { text-align:center; padding:24px; color:var(--tx2); }

.mn-sub   { font-size:12px; color:var(--tx2); margin-top:4px; }
.mn-sub .grn { color:var(--grn); }

.mn-search {
  flex: 0 1 320px;   /* antes: flex: 1 1 180px; — ya no crece sin límite */
  min-width: 140px;
  padding: 7px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  color: var(--tx0); font-size: 13px; font-family: inherit; outline: none;
}


.mn-search:focus { border-color:var(--acc); }
.mn-select {
  flex: 0 1 220px;   /* nuevo: también con tope */
  flex-shrink: 1;
  padding: 7px 10px; border-radius: 8px; border: 0.5px solid var(--bdr2);
  background: var(--bg2); color: var(--tx0); font-size: 12px;
  font-family: inherit; cursor: pointer; outline: none;
}

.mn-toggle {
  display:flex; align-items:center; gap:5px;
  font-size:12px; color:var(--tx1); cursor:pointer; white-space:nowrap;
}

.mn-tabla-wrap { overflow:auto; flex:1; }
.mn-loading {
  display:flex; align-items:center; justify-content:center;
  gap:8px; padding:40px; color:var(--tx2); font-size:13px;
}
.mn-tabla { width:100%; border-collapse:collapse; font-size:12px; }
.mn-tabla th {
  background:var(--bg2); color:var(--tx2); font-weight:500;
  padding:8px 10px; text-align:right; white-space:nowrap;
  border-bottom:0.5px solid var(--bdr); position:sticky; top:0;
}
.mn-tabla th:first-child,
.mn-tabla th:nth-child(2) { text-align:left; }
.mn-tabla td {
  padding:7px 10px; border-bottom:0.5px solid var(--bdr);
  text-align:right; color:var(--tx0);
}
.mn-tabla td:first-child,
.mn-tabla td:nth-child(2) { text-align:left; }
.mn-tabla tbody tr:hover { background:var(--bg2); }

.col-nombre { min-width:180px; max-width:220px; }
.col-zona   { max-width:160px; font-size:11px; color:var(--tx2); }
.col-total  { font-weight:600; }
.mono { font-family:monospace; font-size:11px; }
.grn  { color:var(--grn); }
.red  { color:var(--red); }
.muted { opacity:.5; }

.badge-nuevo {
  display:inline-block; font-size:9px; padding:1px 5px;
  border-radius:4px; background:rgba(255,180,0,.15);
  color:var(--amb); font-weight:600; margin-right:4px; vertical-align:middle;
}
.badge-warn {
  display:inline-block; font-size:9px; padding:1px 5px;
  border-radius:4px; background:var(--red-dim);
  color:var(--red); font-weight:600; margin-right:4px; vertical-align:middle;
}

.row-nuevo    { background:rgba(255,180,0,.04); }
.row-sin-match { background:rgba(255,80,80,.05); }
.row-festivo  td.mono.grn { font-weight:600; }

.sticky-col {
  position:sticky; left:0; background:var(--bg1); z-index:2;
  border-right:0.5px solid var(--bdr);
}
.mn-tabla tbody tr:hover .sticky-col { background:var(--bg2); }
.col-fiscal {
  font-weight:600; color:var(--tx0);
  border-left:1px solid var(--bdr);
  border-right:1px solid var(--bdr);
}
.mn-tabla-fiscal { min-width:1400px; }

.mn-tabla tfoot tr.mn-footer td {
  background:var(--bg2); font-weight:600;
  border-top:1.5px solid var(--bdr); position:sticky; bottom:0;
}

.mn-footer-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 20px; border-top:0.5px solid var(--bdr);
}

.lote-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}
.lote-toggle-opt {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1.5px solid var(--bdr2);
  background: var(--bg2);
  cursor: pointer;
  text-align: left;
  transition: all .18s;
  font-family: inherit;
}
.lote-toggle-opt:hover:not(.disabled) {
  border-color: var(--acc);
  background: var(--acc-dim);
}
.lote-toggle-opt.active {
  border-color: var(--acc);
  background: var(--acc-dim);
  box-shadow: 0 0 0 1px var(--acc);
}
.lote-toggle-opt.disabled {
  opacity: .45;
  cursor: not-allowed;
}
.lto-icon {
  width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
  background: var(--bg3); color: var(--tx2);
  display: flex; align-items: center; justify-content: center; font-size: 18px;
  transition: all .18s;
}
.lote-toggle-opt.active .lto-icon { background: var(--acc); color: #fff; }
.lto-title { font-size: 13px; font-weight: 600; color: var(--tx0); }
.lto-sub { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.lto-badge {
  position: absolute; top: 10px; right: 10px;
  background: var(--acc); color: #fff; font-size: 10px; font-weight: 700;
  min-width: 18px; height: 18px; border-radius: 20px;
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
}

.lote-select-wrap { margin-top: 4px; margin-bottom: 16px; }
.lote-select {
  width: 100%; padding: 10px 12px; border-radius: 10px;
  border: 1.5px solid var(--bdr2); background: var(--bg2);
  color: var(--tx0); font-size: 13px; font-family: inherit; cursor: pointer; outline: none;
}
.lote-select:focus { border-color: var(--acc); }

.lote-preview { margin-top: 10px; }
.lp-label { font-size: 11px; color: var(--tx2); display: block; margin-bottom: 6px; }
.lp-cargas { display: flex; flex-wrap: wrap; gap: 6px; }
.lote-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10.5px; padding: 4px 9px; border-radius: 20px;
  background: var(--bg3); color: var(--tx2); border: 0.5px solid var(--bdr2);
}
.lote-badge--completa { background: rgba(34,201,122,.1); color: var(--grn); border-color: var(--grn); }
.lote-badge--procesando { background: var(--acc-dim); color: var(--acc); border-color: var(--acc); }
.lote-badge i { font-size: 10px; }

.mn-filtros-divider {
  width: 1px;
  height: 22px;
  background: var(--bdr2);
  margin: 0 4px;
}

.mn-filtros {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 0.5px solid var(--bdr);
  flex-wrap: nowrap;      /* ← evita que rompa línea */
  overflow-x: auto;        /* ← si no cabe, scroll horizontal en vez de romper */
}

.mn-chips-group {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  white-space: nowrap;
  margin-left: auto;   /* nuevo: los empuja a la derecha con espacio garantizado, en vez de solo "lo que sobre" */
}

.chip-check {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 14px 7px 9px; border-radius: 20px;
  border: 1px solid var(--bdr2); background: var(--bg2);
  color: var(--tx1); font-size: 12px; cursor: pointer;
  font-family: inherit; white-space: nowrap; transition: all .15s;
}
.chip-check:hover { border-color: var(--acc); color: var(--tx0); }
.chip-check.active { background: var(--acc-dim); border-color: var(--acc); color: var(--acc); font-weight: 500; }
.chip-check-box {
  width: 16px; height: 16px; border-radius: 5px;
  border: 1.5px solid var(--bdr2); background: var(--bg1);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; flex-shrink: 0; transition: all .15s;
}
.chip-check.active .chip-check-box {
  background: var(--acc); border-color: var(--acc); color: #fff;
}

.alert-warn {
  display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px;
  background:var(--amb-dim); border:0.5px solid var(--amb); color:var(--amb); font-size:13px;
  justify-content: space-between;  /* 👈 NUEVO */
}
</style>