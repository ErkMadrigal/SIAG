<template>
  <div class="nom-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Pre-nómina</h1>
        <p class="view-sub">Calcula el pago del periodo por zona</p>
      </div>
      <button v-if="modo === 'biometrico' && resultado?.length" class="btn-primary-lg" @click="exportarXLSX">
        <i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Exportar XLSX
      </button>
    </div>

    <!-- Toggle de modo -->
    <div class="modo-toggle">
      <button class="modo-btn" :class="{ active: modo === 'biometrico' }" @click="modo = 'biometrico'">
        <i class="ti ti-fingerprint" aria-hidden="true"></i> Por biométrico
      </button>
      <button class="modo-btn" :class="{ active: modo === 'fatiga' }" @click="modo = 'fatiga'">
        <i class="ti ti-file-spreadsheet" aria-hidden="true"></i> Por fatiga (Excel)
      </button>
      <button class="modo-btn" :class="{ active: modo === 'manual' }" @click="modo = 'manual'">
        <i class="ti ti-keyboard" aria-hidden="true"></i> Captura manual
      </button>
    </div>

    <!-- ════════════════════════════════════════════════════
         MODO: BIOMÉTRICO — todo lo que ya existía
    ════════════════════════════════════════════════════ -->
    <template v-if="modo === 'biometrico'">

      <!-- Filtros -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-filter" aria-hidden="true"></i>
          <span>Parámetros</span>
        </div>
        <div class="sec-body">

          <div class="filtros-grid">
            <div class="field">
              <label>Zona <span class="req">*</span></label>
              <select v-model="zonaSelId" @change="onZonaChange" :disabled="loadingZonas">
                <option value="">{{ loadingZonas ? 'Cargando...' : 'Seleccione una zona' }}</option>
                <option v-for="z in zonas" :key="z.id" :value="z.id">{{ z.zona }}</option>
              </select>
            </div>

            <div class="field">
              <label>Servicio <span class="opt-label">(opcional)</span></label>
              <select v-model="servicioFiltro" :disabled="!zonaSelId || loadingServicios">
                <option value="">— Todos los servicios —</option>
                <option v-for="s in servicios" :key="s.id" :value="s.id">{{ s.servicio }}</option>
              </select>
            </div>

            <div class="field">
              <label>Empleado <span class="opt-label">(opcional)</span></label>
              <select v-model="empleadoFiltro" :disabled="!zonaSelId || loadingEmpleados">
                <option value="">— Todos los empleados —</option>
                <optgroup v-for="grupo in empleadosPorServicio" :key="grupo.servicio" :label="grupo.servicio">
                  <option v-for="e in grupo.empleados" :key="e.id" :value="e.id">
                    {{ e.nombreCompleto }}
                  </option>
                </optgroup>
              </select>
            </div>

            <div class="field">
              <label>Fecha inicio <span class="req">*</span></label>
              <input type="date" v-model="fechaInicio" />
            </div>

            <div class="field">
              <label>Fecha fin <span class="req">*</span></label>
              <input type="date" v-model="fechaFin" />
            </div>
          </div>

          <div class="periodos-rapidos">
            <span class="periodos-label">Periodo rápido:</span>
            <button class="periodo-btn" @click="setPeriodo('q1')">1ra quincena</button>
            <button class="periodo-btn" @click="setPeriodo('q2')">2da quincena</button>
            <button class="periodo-btn" @click="setPeriodo('mes')">Mes completo</button>
            <button class="periodo-btn" @click="setPeriodo('semana')">Esta semana</button>
          </div>

          <div v-if="zonaSelId && !loadingEmpleados" class="calc-info">
            <i class="ti ti-info-circle" aria-hidden="true"></i>
            Se calcularán
            <strong>{{ empleadosFiltrados.length }} empleados</strong>
            en
            <strong>{{ serviciosFiltrados.length }} servicios</strong>
            de la zona seleccionada
          </div>

          <div class="filtros-actions">
            <button class="btn-sm" @click="resetTodo" :disabled="loading">
              <i class="ti ti-eraser" aria-hidden="true"></i> Limpiar
            </button>
            <button
              class="btn-primary-lg"
              :disabled="loading || !zonaSelId || !fechaInicio || !fechaFin || !empleadosFiltrados.length"
              @click="calcular"
            >
              <i class="ti ti-loader-2 spin" v-if="loading" aria-hidden="true"></i>
              <i class="ti ti-calculator" v-else aria-hidden="true"></i>
              {{ loading ? `Calculando ${progresoActual}/${progresoTotal}...` : 'Calcular nómina' }}
            </button>
          </div>

          <div v-if="loading" class="progreso-wrap">
            <div class="progreso-bar">
              <div class="progreso-fill" :style="{ width: (progresoActual / Math.max(progresoTotal,1) * 100) + '%' }"></div>
            </div>
            <span class="progreso-txt">{{ Math.round(progresoActual / Math.max(progresoTotal,1) * 100) }}%</span>
          </div>

          <div v-if="errorMsg" class="alert-warn">
            <i class="ti ti-alert-circle" aria-hidden="true"></i>
            {{ errorMsg }}
          </div>

        </div>
      </div>

      <!-- RESULTADO -->
      <template v-if="resultado?.length">

        <!-- Totales generales -->
        <div class="sec">
          <div class="sec-hdr">
            <i class="ti ti-report-money" aria-hidden="true"></i>
            <span>Resumen zona — {{ zonaActual }}</span>
            <span class="item-count">{{ resultado.length }} empleados</span>
            <span style="font-size:12px;color:var(--tx2);margin-left:4px">
              {{ fechaInicio }} → {{ fechaFin }}
            </span>
          </div>
          <div class="dinero-grid">
            <div class="dinero-item">
              <span class="dinero-label">Empleados</span>
              <span class="dinero-val">{{ resultado.length }}</span>
            </div>
            <div class="dinero-item red">
              <span class="dinero-label">Con faltas</span>
              <span class="dinero-val">{{ resultado.filter(r => r.resumen.tiene_falta_sin_justificar).length }}</span>
            </div>
            <div class="dinero-item">
              <span class="dinero-label">Sueldo total</span>
              <span class="dinero-val">{{ formatMoney(sumaTotal('sueldo_quincenal')) }}</span>
            </div>
            <div class="dinero-item green">
              <span class="dinero-label">Bonos total</span>
              <span class="dinero-val">{{ formatMoney(sumaTotal('bono')) }}</span>
            </div>
            <div class="dinero-item amber">
              <span class="dinero-label">Festivos extra</span>
              <span class="dinero-val">{{ formatMoney(sumaTotal('festivos_extra')) }}</span>
            </div>
            <div class="dinero-item red">
              <span class="dinero-label">Desc. faltas</span>
              <span class="dinero-val">-{{ formatMoney(sumaTotal('total_descuento_faltas')) }}</span>
            </div>
            <div class="dinero-item total">
              <span class="dinero-label">TOTAL NÓMINA</span>
              <span class="dinero-val">{{ formatMoney(sumaTotal('total')) }}</span>
            </div>
          </div>
        </div>

        <!-- Tabla de empleados -->
        <div class="sec">
          <div class="sec-hdr">
            <i class="ti ti-users" aria-hidden="true"></i>
            <span>Detalle por empleado</span>
            <select v-model="filtroServicioResultado" class="sel-sm" style="margin-left:auto">
              <option value="">Todos los servicios</option>
              <option v-for="s in serviciosEnResultado" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th style="width:120px">Servicio</th>
                  <th style="width:100px">Puesto</th>
                  <th style="width:70px">Turno</th>
                  <th style="width:80px;text-align:center">Trabajados</th>
                  <th style="width:55px;text-align:center">Faltas</th>
                  <th style="width:60px;text-align:center">Festivos</th>
                  <th style="width:55px;text-align:center">Incid.</th>
                  <th style="width:110px;text-align:right">Sueldo</th>
                  <th style="width:90px;text-align:right">Bono</th>
                  <th style="width:90px;text-align:right">F.Extra</th>
                  <th style="width:100px;text-align:right">Desc.</th>
                  <th style="width:110px;text-align:right">Total</th>
                  <th style="width:50px;text-align:center">+</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="r in resultadoFiltrado"
                  :key="r?.empleado?.id"
                  :class="{ 'row-falta': r?.resumen?.tiene_falta_sin_justificar }"
                >
                  <td style="font-weight:500">{{ r?.empleado?.nombreCompleto }}</td>
                  <td style="color:var(--tx2);font-size:11px">{{ r?.servicio?.servicio }}</td>
                  <td style="color:var(--tx2);font-size:11px">{{ r?.empleado?.puesto }}</td>
                  <td style="color:var(--tx2);font-size:11px">{{ r?.periodo?.tipo_turno }}</td>
                  <td style="text-align:center">{{ r?.resumen?.dias_trabajados }}</td>
                  <td style="text-align:center">
                    <span :style="(r?.resumen?.dias_falta ?? 0) > 0 ? 'color:var(--red);font-weight:600' : 'color:var(--tx2)'">
                      {{ r?.resumen?.dias_falta ?? 0 }}
                    </span>
                  </td>
                  <td style="text-align:center">{{ r?.resumen?.dias_festivo ?? 0 }}</td>
                  <td style="text-align:center">{{ r?.resumen?.dias_incidencia ?? 0 }}</td>
                  <td style="text-align:right" class="mono">{{ formatMoney(r?.resumen?.sueldo_quincenal) }}</td>
                  <td style="text-align:right;color:var(--grn)" class="mono">{{ formatMoney(r?.resumen?.bono) }}</td>
                  <td style="text-align:right;color:var(--amb)" class="mono">{{ formatMoney(r?.resumen?.festivos_extra) }}</td>
                  <td style="text-align:right;color:var(--red)" class="mono">-{{ formatMoney(r?.resumen?.total_descuento_faltas) }}</td>
                  <td style="text-align:right;font-weight:700;color:var(--grn)" class="mono">{{ formatMoney(r?.resumen?.total) }}</td>
                  <td style="text-align:center">
                    <button class="icon-btn" @click="verDetalle(r)" title="Ver detalle día a día">
                      <i class="ti ti-eye"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="tfoot-row">
                  <td colspan="8" style="text-align:right;font-weight:600;padding:10px 12px">
                    SUBTOTALES ({{ resultadoFiltrado.length }} empleados)
                  </td>
                  <td style="text-align:right;font-family:monospace;padding:10px 12px">
                    {{ formatMoney(resultadoFiltrado.reduce((a,r) => a + (r?.resumen?.sueldo_quincenal ?? 0), 0)) }}
                  </td>
                  <td style="text-align:right;color:var(--grn);font-family:monospace;padding:10px 12px">
                    {{ formatMoney(resultadoFiltrado.reduce((a,r) => a + (r?.resumen?.bono ?? 0), 0)) }}
                  </td>
                  <td style="text-align:right;color:var(--amb);font-family:monospace;padding:10px 12px">
                    {{ formatMoney(resultadoFiltrado.reduce((a,r) => a + (r?.resumen?.festivos_extra ?? 0), 0)) }}
                  </td>
                  <td style="text-align:right;color:var(--red);font-family:monospace;padding:10px 12px">
                    -{{ formatMoney(resultadoFiltrado.reduce((a,r) => a + (r?.resumen?.total_descuento_faltas ?? 0), 0)) }}
                  </td>
                  <td style="text-align:right;font-weight:700;color:var(--grn);font-family:monospace;padding:10px 12px">
                    {{ formatMoney(resultadoFiltrado.reduce((a,r) => a + (r?.resumen?.total ?? 0), 0)) }}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </template>

      <!-- MODAL DETALLE BIOMÉTRICO -->
      <Teleport to="body">
        <div v-if="modalDetalle" class="modal-overlay" @click.self="modalDetalle = null">
          <div class="modal-box xl">
            <div class="modal-hdr">
              <div class="modal-icon"><i class="ti ti-calendar"></i></div>
              <div>
                <p class="modal-title">{{ modalDetalle?.empleado?.nombreCompleto }}</p>
                <p class="modal-sub">
                  {{ modalDetalle?.servicio?.servicio }} ·
                  {{ modalDetalle?.periodo?.fecha_inicio }} → {{ modalDetalle?.periodo?.fecha_fin }} ·
                  {{ modalDetalle?.empleado?.turno }}
                </p>
              </div>
              <button class="modal-close" @click="modalDetalle = null"><i class="ti ti-x"></i></button>
            </div>

            <div class="modal-resumen">
              <div class="mr-item blue"><span class="mr-num">{{ modalDetalle?.resumen?.dias_trabajados }}</span><span>Trabajados</span></div>
              <div class="mr-item red"><span class="mr-num">{{ modalDetalle?.resumen?.dias_falta }}</span><span>Faltas</span></div>
              <div class="mr-item gray"><span class="mr-num">{{ modalDetalle?.resumen?.dias_descanso }}</span><span>Descansos</span></div>
              <div class="mr-item amber"><span class="mr-num">{{ modalDetalle?.resumen?.dias_festivo }}</span><span>Festivos</span></div>
              <div class="mr-item">
                <span class="mr-num" style="font-size:14px">{{ formatMoney(modalDetalle?.resumen?.sueldo_quincenal) }}</span>
                <span>Sueldo base</span>
              </div>
              <div class="mr-item green">
                <span class="mr-num" style="font-size:14px">{{ formatMoney(modalDetalle?.resumen?.bono) }}</span>
                <span>Bono</span>
              </div>
              <div class="mr-item amber" v-if="(modalDetalle?.resumen?.festivos_extra ?? 0) > 0">
                <span class="mr-num" style="font-size:14px">{{ formatMoney(modalDetalle?.resumen?.festivos_extra) }}</span>
                <span>F.Extra</span>
              </div>
              <div class="mr-item red" v-if="(modalDetalle?.resumen?.total_descuento_faltas ?? 0) > 0">
                <span class="mr-num" style="font-size:14px">-{{ formatMoney(modalDetalle?.resumen?.total_descuento_faltas) }}</span>
                <span>Desc.</span>
              </div>
              <div class="mr-item total-item">
                <span class="mr-num" style="font-size:17px">{{ formatMoney(modalDetalle?.resumen?.total) }}</span>
                <span>Total</span>
              </div>
            </div>

            <div class="modal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:100px">Fecha</th>
                    <th style="width:80px">Día</th>
                    <th style="width:130px">Tipo</th>
                    <th style="width:120px">Servicio</th>
                    <th style="width:80px">Entrada</th>
                    <th style="width:80px">Salida</th>
                    <th style="width:70px">Festivo</th>
                    <th>Incidencias</th>
                    <th style="width:50px;text-align:center">Bono</th>
                    <th style="width:90px;text-align:right">Pago día</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in modalDetalle?.detalle" :key="d.fecha" :class="rowClass(d)">
                    <td class="mono">{{ d.fecha }}</td>
                    <td style="color:var(--tx2)">{{ d.dia_semana }}</td>
                    <td><span class="tipo-badge" :class="d.tipo">{{ tipoLabel(d.tipo) }}</span></td>
                    <td style="color:var(--tx2);font-size:11px">{{ d.servicio || '—' }}</td>
                    <td class="mono" style="color:var(--grn)">{{ d.entrada || '—' }}</td>
                    <td class="mono" style="color:var(--red)">{{ d.salida || '—' }}</td>
                    <td>
                      <span v-if="d.es_festivo" class="festivo-badge"><i class="ti ti-star-filled"></i></span>
                      <span v-else style="color:var(--tx3)">—</span>
                    </td>
                    <td>
                      <template v-if="d.incidencias?.length">
                        <span v-for="(inc,i) in d.incidencias" :key="i" class="inc-badge">{{ inc }}</span>
                      </template>
                      <span v-else style="color:var(--tx3)">—</span>
                    </td>
                    <td style="text-align:center">
                      <i v-if="d.aplica_bono" class="ti ti-check" style="color:var(--grn)"></i>
                      <i v-else class="ti ti-minus" style="color:var(--tx3)"></i>
                    </td>
                    <td style="text-align:right">
                      <span v-if="d.pago_dia > 0" class="pago-dia positive">+{{ formatMoney(d.pago_dia) }}</span>
                      <span v-else-if="d.pago_dia < 0" class="pago-dia negative">{{ formatMoney(d.pago_dia) }}</span>
                      <span v-else style="color:var(--tx3)">—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="modal-footer">
              <button class="btn-sm" @click="modalDetalle = null">Cerrar</button>
            </div>
          </div>
        </div>
      </Teleport>

    </template>

    <!-- ════════════════════════════════════════════════════
         MODO: FATIGA (Excel) — nuevo
    ════════════════════════════════════════════════════ -->
    <template v-else-if="modo === 'fatiga'">

      <!-- Zona de subida — drag & drop -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-file-spreadsheet" aria-hidden="true"></i>
          <span>Subir fatiga (Excel)</span>
        </div>
        <div class="sec-body">

          <div
            class="dropzone"
            :class="{ 'is-dragging': isDragging, 'has-file': !!archivoFatiga }"
            @dragover.prevent="onDragOver"
            @dragleave.prevent="onDragLeave"
            @drop.prevent="onDrop"
            @click="abrirSelector"
          >
            <input
              ref="inputFile"
              type="file"
              accept=".xlsx,.xls,.xlsm"
              class="hidden-input"
              @change="onFileSelected"
            />

            <template v-if="!archivoFatiga">
              <div class="dz-icon">
                <i class="ti ti-cloud-upload" aria-hidden="true"></i>
              </div>
              <p class="dz-title">Arrastra el Excel de fatiga aquí</p>
              <p class="dz-sub">o haz clic para seleccionar — formatos .xlsx, .xls</p>
            </template>

            <template v-else>
              <div class="dz-icon ok">
                <i class="ti ti-file-check" aria-hidden="true"></i>
              </div>
              <p class="dz-title">{{ archivoFatiga.name }}</p>
              <p class="dz-sub">{{ formatFileSize(archivoFatiga.size) }} — clic para cambiar</p>
              <button class="dz-clear" @click.stop="limpiarArchivo" title="Quitar archivo">
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
            </template>
          </div>

          <div class="filtros-grid filtros-grid--3">
            <div class="field">
              <label>Nombre de la nómina <span class="req">*</span></label>
              <input type="text" v-model="nombreFatiga" placeholder="Ej. IMSS Bienestar 28 al 12 de junio" />
            </div>
            <div class="field">
              <label>Periodo inicio</label>
              <input type="date" v-model="periodoInicioFatiga" />
            </div>
            <div class="field">
              <label>Periodo fin</label>
              <input type="date" v-model="periodoFinFatiga" />
            </div>
          </div>

          <div v-if="errorMsgFatiga" class="alert-warn">
            <i class="ti ti-alert-circle" aria-hidden="true"></i>
            {{ errorMsgFatiga }}
          </div>

          <div v-if="!procesandoChunks" class="filtros-actions">
            <button
              class="btn-primary-lg"
              :disabled="loadingFatiga || !archivoFatiga || !nombreFatiga.trim()"
              @click="procesarFatiga"
            >
              <i class="ti ti-calculator" aria-hidden="true"></i>
              Procesar nómina
            </button>
          </div>

          <!-- Barra de progreso — solo visible mientras procesa por chunks -->
          <div v-else class="chunk-progreso-wrap">
            <div class="chunk-progreso-hdr">
              <span class="chunk-progreso-label">
                <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
                Procesando {{ chunkProcesadas }} de {{ chunkTotalFilas || '...' }} empleados
              </span>
              <span class="chunk-progreso-pct">
                {{ chunkTotalFilas ? Math.round((chunkProcesadas / chunkTotalFilas) * 100) : 0 }}%
              </span>
            </div>
            <div class="chunk-progreso-bar">
              <div
                class="chunk-progreso-fill"
                :style="{ width: (chunkTotalFilas ? (chunkProcesadas / chunkTotalFilas) * 100 : 0) + '%' }"
              ></div>
            </div>
          </div>

        </div>
      </div>

      <!-- Listado de nóminas procesadas -->
      <div class="sec">
        <div class="sec-hdr">
          <i class="ti ti-history" aria-hidden="true"></i>
          <span>Nóminas procesadas</span>
          <span class="item-count">{{ nominasFatiga.length }}</span>
        </div>

        <div class="table-wrap" v-if="nominasFatiga.length">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th style="width:110px">Periodo</th>
                <th style="width:90px;text-align:center">Empleados</th>
                <th style="width:120px;text-align:right">Total a pagar</th>
                <th style="width:110px">Estatus</th>
                <th style="width:140px">Creada</th>
                <th style="width:110px;text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="n in nominasFatiga" :key="n.id">
                <td style="font-weight:500">{{ n.nombre }}</td>
                <td style="color:var(--tx2);font-size:11px">
                  {{ n.periodo_inicio || '—' }} → {{ n.periodo_fin || '—' }}
                </td>
                <td style="text-align:center">{{ n.total_empleados }}</td>
                <td style="text-align:right;font-weight:600;color:var(--grn)" class="mono">
                  {{ formatMoney(n.total_pagar) }}
                </td>
                <td>
                  <span class="estatus-badge" :class="n.estatus">{{ estatusLabel(n.estatus) }}</span>
                </td>
                <td style="color:var(--tx2);font-size:11px">{{ formatFecha(n.created_at) }}</td>
                <td style="text-align:center">
                  <button class="icon-btn" @click="verDetalleFatiga(n)" title="Ver detalle">
                    <i class="ti ti-eye" aria-hidden="true"></i>
                  </button>
                  <button
                    v-if="n.estatus === 'aprobada'"
                    class="icon-btn"
                    @click="abrirModalDispersion(n)"
                    title="Descargar dispersión"
                  >
                    <i class="ti ti-download" aria-hidden="true"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <i class="ti ti-file-off" aria-hidden="true"></i>
          <p>Aún no has procesado ninguna nómina de fatiga</p>
        </div>
      </div>

      <!-- MODAL DETALLE FATIGA -->
      <Teleport to="body">
        <div v-if="modalNominaFatiga" class="modal-overlay" @click.self="cerrarModalFatiga">
          <div class="modal-box xl">
            <div class="modal-hdr">
              <div class="modal-icon"><i class="ti ti-report-money" aria-hidden="true"></i></div>
              <div>
                <p class="modal-title">{{ modalNominaFatiga.nombre }}</p>
                <p class="modal-sub">
                  {{ modalNominaFatiga.total_empleados }} empleados ·
                  {{ formatMoney(modalNominaFatiga.total_pagar) }} total
                </p>
              </div>
              <button class="modal-close" @click="cerrarModalFatiga"><i class="ti ti-x" aria-hidden="true"></i></button>
            </div>

            <div class="modal-resumen">
              <div class="mr-item blue">
                <span class="mr-num">{{ modalDetalleFatiga.length }}</span>
                <span>Empleados</span>
              </div>
              <div class="mr-item red">
                <span class="mr-num">{{ sinMatchCount }}</span>
                <span>Sin match CURP</span>
              </div>
              <div class="mr-item total-item">
                <span class="mr-num" style="font-size:17px">{{ formatMoney(modalNominaFatiga.total_pagar) }}</span>
                <span>Total</span>
              </div>
            </div>

            <div class="modal-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Empleado (Excel)</th>
                    <th style="width:70px;text-align:center">Match</th>
                    <th style="width:100px">Zona</th>
                    <th style="width:60px">Turno</th>
                    <th style="width:90px;text-align:right">Sueldo</th>
                    <th style="width:90px;text-align:right">Extra</th>
                    <th style="width:90px;text-align:right">Adicional</th>
                    <th style="width:90px;text-align:right">Desc.Faltas</th>
                    <th style="width:90px;text-align:right">Desc.Incid.</th>
                    <th style="width:90px;text-align:right">Otros desc.</th>
                    <th style="width:100px;text-align:right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="d in modalDetalleFatiga" :key="d.id" :class="{ 'row-falta': !d.id_empleado }">
                    <td style="font-weight:500">{{ d.nombre_excel }}</td>
                    <td style="text-align:center">
                      <i v-if="d.id_empleado" class="ti ti-check" style="color:var(--grn)"></i>
                      <i v-else class="ti ti-alert-triangle" style="color:var(--red)" title="No se encontró el empleado en el sistema por CURP"></i>
                    </td>
                    <td style="color:var(--tx2);font-size:11px">{{ d.zona || '—' }}</td>
                    <td style="color:var(--tx2);font-size:11px">{{ d.turno || '—' }}</td>
                    <td style="text-align:right" class="mono">{{ formatMoney(d.sueldo_semanal) }}</td>
                    <td style="text-align:right;color:var(--grn)" class="mono">
                      {{ d.tiempo_extra > 0 ? '+' + formatMoney(d.tiempo_extra) : '—' }}
                    </td>
                    <td style="text-align:right" class="mono">
                      {{ d.adicional > 0 ? '+' + formatMoney(d.adicional) : '—' }}
                    </td>
                    <td style="text-align:right;color:var(--red)" class="mono">
                      {{ d.descuento_faltas > 0 ? '-' + formatMoney(d.descuento_faltas) : '—' }}
                    </td>
                    <td style="text-align:right;color:var(--red)" class="mono">
                      {{ d.descuento_incidencias > 0 ? '-' + formatMoney(d.descuento_incidencias) : '—' }}
                    </td>
                    <td style="text-align:right;color:var(--red)" class="mono">
                      {{ d.otros_descuentos > 0 ? '-' + formatMoney(d.otros_descuentos) : '—' }}
                    </td>
                    <td style="text-align:right;font-weight:700;color:var(--grn)" class="mono">
                      {{ formatMoney(d.total) }}
                    </td>

                  </tr>
                </tbody>
              </table>
            </div>

            <div class="modal-footer modal-footer--split">
              <div class="footer-left">
                <span v-if="modalNominaFatiga.estatus === 'rechazada'" class="estatus-badge rechazada">
                  Rechazada: {{ modalNominaFatiga.comentario_revision }}
                </span>
              </div>
              <div class="footer-actions">
                <template v-if="modalNominaFatiga.estatus === 'borrador' || modalNominaFatiga.estatus === 'en_revision'">
                  <button class="btn-sm danger" @click="rechazarFatiga">
                    <i class="ti ti-x" aria-hidden="true"></i> Rechazar
                  </button>
                  <button class="btn-primary-lg" @click="aprobarFatiga">
                    <i class="ti ti-check" aria-hidden="true"></i> Aprobar nómina
                  </button>
                </template>
                <button v-else class="btn-sm" @click="cerrarModalFatiga">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      </Teleport>


      <!-- MODAL DISPERSIÓN — selector de formato de banco -->
      <Teleport to="body">
        <div v-if="modalDispersion" class="modal-overlay" @click.self="modalDispersion = null">
          <div class="modal-box">
            <div class="modal-hdr">
              <div class="modal-icon" style="background:rgba(34,201,122,.12);color:var(--grn)">
                <i class="ti ti-building-bank" aria-hidden="true"></i>
              </div>
              <div>
                <p class="modal-title">Descargar dispersión</p>
                <p class="modal-sub">{{ modalDispersion.nombre }} · {{ modalDispersion.total_empleados }} empleados · {{ formatMoney(modalDispersion.total_pagar) }}</p>
              </div>
              <button class="modal-close" @click="modalDispersion = null"><i class="ti ti-x"></i></button>
            </div>

            <div class="modal-body-content">
              <p style="font-size:12px;color:var(--tx2);margin-bottom:4px">Selecciona el formato de tu banco:</p>

              <div class="formato-grid">
                <button
                  v-for="fmt in formatosDispersion"
                  :key="fmt.key"
                  class="formato-btn"
                  :class="{ active: formatoSeleccionado === fmt.key }"
                  @click="formatoSeleccionado = fmt.key"
                >
                  <i :class="['ti', fmt.icon]" aria-hidden="true"></i>
                  <span class="formato-nombre">{{ fmt.nombre }}</span>
                  <span class="formato-desc">{{ fmt.desc }}</span>
                </button>
              </div>

              <div v-if="descargandoDispersion" class="alert-info-disp">
                <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
                Generando archivo...
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn-sm" @click="modalDispersion = null">Cancelar</button>
              <button class="btn-primary-lg" :disabled="descargandoDispersion" @click="confirmarDescarga">
                <i class="ti ti-download" aria-hidden="true"></i>
                Descargar {{ formatosDispersion.find(f => f.key === formatoSeleccionado)?.nombre || '' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

    </template>

    <template v-else-if="modo === 'manual'">
      <CapturaManualPanel @procesado="onCapturaManualProcesada" />
    </template>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { nominaService } from '@/services/nomina.service.js'
import { nominaFatigaService } from '@/services/Nominafatiga.service.js'
import api from '@/services/api.js'
import * as XLSX from 'xlsx'
import CapturaManualPanel from '@/components/layout/CapturaManualPanel.vue'

const ui = useUiStore()

/* ── Modo activo ───────────────────────────────────────── */
const modo = ref('biometrico') // 'biometrico' | 'fatiga'

/* ════════════════════════════════════════════════════════
   BIOMÉTRICO — estado y lógica existente, intacta
════════════════════════════════════════════════════════ */
const loading          = ref(false)
const loadingZonas     = ref(true)
const loadingServicios = ref(false)
const loadingEmpleados = ref(false)
const errorMsg         = ref('')
const resultado        = ref(null)
const modalDetalle     = ref(null)
const progresoActual   = ref(0)
const progresoTotal    = ref(0)

const zonas              = ref([])
const servicios          = ref([])
const todosEmpleados     = ref([])
const zonaSelId          = ref('')
const zonaActual         = ref('')
const servicioFiltro     = ref('')
const empleadoFiltro     = ref('')
const fechaInicio        = ref('')
const fechaFin           = ref('')
const filtroServicioResultado = ref('')

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home',       to: '/' },
    { label: 'Pre-nómina', to: '/prenomina' }
  ])
  setPeriodo('q1')
  await cargarZonas()
  await cargarNominasFatiga()
})

const empleadosPorServicio = computed(() => {
  const grupos = {}
  todosEmpleados.value.forEach(e => {
    if (!grupos[e.servicio]) grupos[e.servicio] = { servicio: e.servicio, empleados: [] }
    grupos[e.servicio].empleados.push(e)
  })
  return Object.values(grupos)
})

const serviciosFiltrados = computed(() => {
  const ids = new Set(todosEmpleados.value.map(e => String(e.id_servicio)))
  return servicios.value.filter(s => ids.has(String(s.id)))
})

async function onCapturaManualProcesada(data) {
  await cargarNominasFatiga() // refresca la tabla de "Nóminas procesadas"
  modo.value = 'fatiga' // regresa al listado para ver el resultado
}

const empleadosFiltrados = computed(() => {
  let lista = todosEmpleados.value
  if (servicioFiltro.value) lista = lista.filter(e => String(e.id_servicio) === String(servicioFiltro.value))
  if (empleadoFiltro.value) lista = lista.filter(e => String(e.id) === String(empleadoFiltro.value))
  const seen = new Set()
  return lista.filter(e => {
    const key = `${e.id}-${e.id_servicio}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
})

const resultadoFiltrado = computed(() => {
  if (!resultado.value?.length) return []
  if (!filtroServicioResultado.value) return resultado.value
  return resultado.value.filter(r => r?.servicio?.servicio === filtroServicioResultado.value)
})

const serviciosEnResultado = computed(() => {
  if (!resultado.value?.length) return []
  return [...new Set(resultado.value.map(r => r?.servicio?.servicio).filter(Boolean))]
})

function setPeriodo(tipo) {
  const hoy    = new Date()
  const anio   = hoy.getFullYear()
  const mes    = hoy.getMonth() + 1
  const mesStr = String(mes).padStart(2, '0')
  const diasMes = new Date(anio, mes, 0).getDate()
  switch (tipo) {
    case 'q1':
      fechaInicio.value = `${anio}-${mesStr}-01`
      fechaFin.value    = `${anio}-${mesStr}-15`
      break
    case 'q2':
      fechaInicio.value = `${anio}-${mesStr}-16`
      fechaFin.value    = `${anio}-${mesStr}-${diasMes}`
      break
    case 'mes':
      fechaInicio.value = `${anio}-${mesStr}-01`
      fechaFin.value    = `${anio}-${mesStr}-${diasMes}`
      break
    case 'semana': {
      const dia = hoy.getDay() || 7
      const lun = new Date(hoy); lun.setDate(hoy.getDate() - dia + 1)
      const dom = new Date(hoy); dom.setDate(hoy.getDate() - dia + 7)
      fechaInicio.value = lun.toISOString().slice(0, 10)
      fechaFin.value    = dom.toISOString().slice(0, 10)
      break
    }
  }
}

async function cargarZonas() {
  loadingZonas.value = true
  try {
    const { data } = await api.get('/catalogos/zonas')
    zonas.value = (data.data || []).filter(z => z.estatus == 1 || z.status == 1)
  } catch (err) { console.error(err) }
  finally { loadingZonas.value = false }
}

async function onZonaChange() {
  servicioFiltro.value   = ''
  empleadoFiltro.value   = ''
  todosEmpleados.value   = []
  servicios.value        = []
  resultado.value        = null
  errorMsg.value         = ''
  filtroServicioResultado.value = ''

  if (!zonaSelId.value) return

  const zona = zonas.value.find(z => String(z.id) === String(zonaSelId.value))
  zonaActual.value = zona?.zona || ''

  loadingServicios.value = true
  loadingEmpleados.value = true
  try {
    const eRes = await api.get('/nomina/empleados-zona', { params: { id_zona: zonaSelId.value } })
    todosEmpleados.value = eRes.data.data || []

    const serviciosMap = {}
    todosEmpleados.value.forEach(e => {
      if (!serviciosMap[e.id_servicio]) {
        serviciosMap[e.id_servicio] = { id: e.id_servicio, servicio: e.servicio }
      }
    })
    servicios.value = Object.values(serviciosMap).sort((a,b) => a.servicio.localeCompare(b.servicio))
  } catch (err) { console.error(err) }
  finally {
    loadingServicios.value = false
    loadingEmpleados.value = false
  }
}

async function calcular() {
  if (!zonaSelId.value || !fechaInicio.value || !fechaFin.value) return
  const lista = empleadosFiltrados.value
  if (!lista.length) return

  loading.value        = true
  errorMsg.value       = ''
  resultado.value      = null
  progresoActual.value = 0
  progresoTotal.value  = lista.length
  filtroServicioResultado.value = ''

  const resultados = []
  const omitidos   = []

  const BATCH = 5
  for (let i = 0; i < lista.length; i += BATCH) {
    const batch = lista.slice(i, i + BATCH)
    const settled = await Promise.allSettled(
      batch.map(emp =>
        nominaService.preview({
          id_empleado:  emp.id,
          id_ubicacion: emp.id_servicio,
          fecha_inicio: fechaInicio.value,
          fecha_fin:    fechaFin.value,
        })
      )
    )
    settled.forEach((r, idx) => {
      progresoActual.value++
      if (r.status === 'fulfilled' && r.value?.data) {
        resultados.push(r.value.data)
      } else {
        const emp = batch[idx]
        omitidos.push(emp?.nombreCompleto || `ID ${emp?.id}`)
        console.warn('Omitido sin tabulador:', emp?.nombreCompleto, emp?.puesto)
      }
    })
  }

  resultado.value = resultados.filter(r => r != null && r.resumen != null)

  if (omitidos.length) {
    errorMsg.value = `${omitidos.length} empleado(s) omitidos por no tener tabulador activo`
  }

  loading.value = false
}

function resetTodo() {
  zonaSelId.value       = ''
  zonaActual.value      = ''
  servicioFiltro.value  = ''
  empleadoFiltro.value  = ''
  todosEmpleados.value  = []
  servicios.value       = []
  errorMsg.value        = ''
  resultado.value       = null
  filtroServicioResultado.value = ''
  setPeriodo('q1')
}

function verDetalle(r) { modalDetalle.value = r }

function sumaTotal(campo) {
  return (resultado.value || []).reduce((a, r) => a + (r?.resumen?.[campo] ?? 0), 0)
}

function exportarXLSX() {
  if (!resultado.value?.length) return
  const wb = XLSX.utils.book_new()

  const headers = ['Empleado','Servicio','Puesto','Turno','Trabajados','Faltas','Festivos','Incidencias','Sueldo','Bono','F.Extra','Desc.Faltas','Total']
  const rows = resultado.value.map(r => [
    r?.empleado?.nombreCompleto,
    r?.servicio?.servicio,
    r?.empleado?.puesto,
    r?.empleado?.turno,
    r?.resumen?.dias_trabajados,
    r?.resumen?.dias_falta,
    r?.resumen?.dias_festivo,
    r?.resumen?.dias_incidencia,
    r?.resumen?.sueldo_quincenal,
    r?.resumen?.bono,
    r?.resumen?.festivos_extra,
    r?.resumen?.total_descuento_faltas,
    r?.resumen?.total,
  ])
  const wsRes = XLSX.utils.aoa_to_sheet([headers, ...rows])
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen')

  resultado.value.forEach(r => {
    if (!r?.detalle) return
    const dh = ['Fecha','Día','Tipo','Servicio','Entrada','Salida','Festivo','Incidencias','Bono','Pago']
    const dr = r.detalle.map(d => [
      d.fecha, d.dia_semana, tipoLabel(d.tipo),
      d.servicio || '',
      d.entrada  || '', d.salida || '',
      d.es_festivo ? 'Sí' : 'No',
      d.incidencias?.join(', ') || '',
      d.aplica_bono ? 'Sí' : 'No',
      d.pago_dia,
    ])
    const name = (r.empleado?.nombreCompleto || 'empleado').slice(0, 28)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([dh, ...dr]), name)
  })

  XLSX.writeFile(wb, `prenomina_${zonaActual.value}_${fechaInicio.value}.xlsx`.replace(/\s+/g, '_'))
}

function tipoLabel(tipo) {
  const map = {
    trabajo:'Trabajo', descanso:'Descanso', falta:'Falta', incidencia:'Incidencia',
    festivo_trabajado:'Festivo trabajado', festivo_descanso:'Festivo descanso',
    festivo_falta:'Festivo falta', festivo_incidencia:'Festivo incidencia',
  }
  return map[tipo] || tipo
}

function rowClass(d) {
  return {
    'row-falta':      d?.tipo === 'falta' || d?.tipo === 'festivo_falta',
    'row-descanso':   d?.tipo === 'descanso' || d?.tipo === 'festivo_descanso',
    'row-festivo':    d?.es_festivo,
    'row-incidencia': d?.tipo === 'incidencia',
  }
}

/* ════════════════════════════════════════════════════════
   FATIGA (Excel) — estado y lógica nueva
════════════════════════════════════════════════════════ */
const archivoFatiga       = ref(null)
const isDragging          = ref(false)
const inputFile           = ref(null)
const nombreFatiga        = ref('')
const periodoInicioFatiga = ref('')
const periodoFinFatiga    = ref('')
const loadingFatiga       = ref(false)
const errorMsgFatiga      = ref('')

const nominasFatiga      = ref([])
const modalNominaFatiga  = ref(null)
const modalDetalleFatiga = ref([])

/* ── Drag & drop ──────────────────────────────────────── */
function onDragOver()  { isDragging.value = true }
function onDragLeave() { isDragging.value = false }

function onDrop(e) {
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) asignarArchivo(file)
}

function abrirSelector() {
  inputFile.value?.click()
}

function onFileSelected(e) {
  const file = e.target.files?.[0]
  if (file) asignarArchivo(file)
}

function asignarArchivo(file) {
  const extOk = /\.(xlsx|xls|xlsm)$/i.test(file.name)
  if (!extOk) {
    errorMsgFatiga.value = 'El archivo debe ser .xlsx, .xls o .xlsm'
    return
  }
  errorMsgFatiga.value = ''
  archivoFatiga.value  = file
  if (!nombreFatiga.value) {
    nombreFatiga.value = file.name.replace(/\.(xlsx|xls|xlsm)$/i, '')
  }
}

function limpiarArchivo() {
  archivoFatiga.value = null
  if (inputFile.value) inputFile.value.value = ''
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

/* ── Estado de progreso por chunks ──────────────────────── */
const procesandoChunks   = ref(false)
const chunkActual        = ref(0)
const chunkTotalFilas    = ref(0)
const chunkProcesadas    = ref(0)

/* ── Procesar (por chunks — soporta archivos grandes sin tronar) ──── */
async function procesarFatiga() {
  if (!archivoFatiga.value || !nombreFatiga.value.trim()) return

  loadingFatiga.value    = true
  procesandoChunks.value = true
  errorMsgFatiga.value   = ''
  chunkProcesadas.value  = 0
  chunkTotalFilas.value  = 0

  try {
    // ── Paso 1: subir y leer el archivo (rápido, sin calcular todavía) ──
    const formData = new FormData()
    formData.append('archivo', archivoFatiga.value)
    formData.append('nombre', nombreFatiga.value.trim())
    if (periodoInicioFatiga.value) formData.append('periodo_inicio', periodoInicioFatiga.value)
    if (periodoFinFatiga.value)    formData.append('periodo_fin', periodoFinFatiga.value)

    const inicio = await nominaFatigaService.iniciarAsistencia(formData)

    if (inicio.status !== 'ok') {
      errorMsgFatiga.value = inicio.message || 'Error al leer el archivo'
      return
    }

    const idNomina = inicio.data.id_nomina
    chunkTotalFilas.value = inicio.data.total

    // ── Paso 2: loop de chunks hasta completar ──
    let completo = false
    let sinMatchTotal = 0

    while (!completo) {
      const res = await nominaFatigaService.procesarChunk(idNomina, 100)

      if (res.status !== 'ok') {
        errorMsgFatiga.value = res.message || 'Error procesando un lote de empleados'
        break
      }

      chunkProcesadas.value = res.data.filas_procesadas ?? chunkProcesadas.value
      sinMatchTotal += res.data.sin_match_chunk || 0
      completo = res.data.completo === true

      if (completo) {
        chunkProcesadas.value = chunkTotalFilas.value
      }
    }

    if (completo) {
      limpiarArchivo()
      nombreFatiga.value = ''
      periodoInicioFatiga.value = ''
      periodoFinFatiga.value = ''
      await cargarNominasFatiga()

      if (sinMatchTotal > 0) {
        errorMsgFatiga.value = `Procesado con ${sinMatchTotal} empleado(s) sin coincidencia — revísalos en el detalle.`
      }
    }

  } catch (err) {
    errorMsgFatiga.value = err?.response?.data?.message || 'Error al procesar el archivo'
  } finally {
    loadingFatiga.value    = false
    procesandoChunks.value = false
  }
}

/* ── Listado ───────────────────────────────────────────── */
async function cargarNominasFatiga() {
  try {
    const data = await nominaFatigaService.listar()
    nominasFatiga.value = data.data || []
  } catch (err) {
    console.error(err)
  }
}

/* ── Detalle / modal ───────────────────────────────────── */
const sinMatchCount = computed(() =>
  modalDetalleFatiga.value.filter(d => !d.id_empleado).length
)

async function verDetalleFatiga(nomina) {
  try {
    const data = await nominaFatigaService.detalle(nomina.id)
    modalNominaFatiga.value  = data.data.nomina
    modalDetalleFatiga.value = data.data.detalle
  } catch (err) {
    console.error(err)
  }
}

function cerrarModalFatiga() {
  modalNominaFatiga.value  = null
  modalDetalleFatiga.value = []
}

async function editarDetalleFatiga(d) {
  try {
    await nominaFatigaService.actualizarDetalle(modalNominaFatiga.value.id, d.id, {
      adicional: d.adicional || 0,
      otros_descuentos: d.otros_descuentos || 0,
    })
    const data = await nominaFatigaService.detalle(modalNominaFatiga.value.id)
    modalNominaFatiga.value  = data.data.nomina
    modalDetalleFatiga.value = data.data.detalle
    await cargarNominasFatiga()
  } catch (err) {
    console.error(err)
  }
}

async function aprobarFatiga() {
  if (!modalNominaFatiga.value) return
  try {
    await nominaFatigaService.aprobar(modalNominaFatiga.value.id)
    cerrarModalFatiga()
    await cargarNominasFatiga()
  } catch (err) {
    console.error(err)
  }
}

async function rechazarFatiga() {
  if (!modalNominaFatiga.value) return
  const comentario = prompt('Motivo del rechazo:')
  if (comentario === null) return
  try {
    await nominaFatigaService.rechazar(modalNominaFatiga.value.id, comentario)
    cerrarModalFatiga()
    await cargarNominasFatiga()
  } catch (err) {
    console.error(err)
  }
}

// ── Modal de dispersión ────────────────────────────────────
const modalDispersion      = ref(null)
const formatoSeleccionado  = ref('generico')
const descargandoDispersion = ref(false)

const formatosDispersion = [
  { key: 'generico', nombre: 'Genérico',  icon: 'ti-file-spreadsheet', desc: 'CSV con todos los campos' },
  { key: 'spei',     nombre: 'SPEI',      icon: 'ti-transfer',          desc: 'Transferencia interbancaria' },
  { key: 'bbva',     nombre: 'BBVA',      icon: 'ti-building-bank',     desc: 'Layout BBVA Bancomer' },
  { key: 'banamex',  nombre: 'Banamex',   icon: 'ti-building-bank',     desc: 'Layout Citibanamex (pipe)' },
]

function abrirModalDispersion(nomina) {
  modalDispersion.value     = nomina
  formatoSeleccionado.value = 'generico'
}

async function confirmarDescarga() {
  if (!modalDispersion.value) return
  descargandoDispersion.value = true
  try {
    const response = await nominaFatigaService.dispersion(
      modalDispersion.value.id,
      formatoSeleccionado.value
    )
    const ext  = formatoSeleccionado.value === 'banamex' ? 'txt' : 'csv'
    const blob = new Blob([response.data], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `dispersion_${modalDispersion.value.nombre}_${formatoSeleccionado.value}.${ext}`.replace(/\s+/g, '_')
    a.click()
    URL.revokeObjectURL(url)
    await cargarNominasFatiga()
    modalDispersion.value = null
  } catch (err) {
    console.error(err)
  } finally {
    descargandoDispersion.value = false
  }
}

async function descargarDispersion(nomina) {
  abrirModalDispersion(nomina)
}

/* ── Helpers compartidos ───────────────────────────────── */
function estatusLabel(estatus) {
  const map = {
    borrador: 'Borrador',
    en_revision: 'En revisión',
    aprobada: 'Aprobada',
    rechazada: 'Rechazada',
    dispersada: 'Dispersada',
  }
  return map[estatus] || estatus
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatFecha(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.nom-view    { display:flex; flex-direction:column; gap:14px; }
.view-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.view-title  { font-size:20px; font-weight:600; color:var(--tx0); }
.view-sub    { font-size:12px; color:var(--tx2); margin-top:3px; }

/* ── Toggle de modo ────────────────────────────────────── */
.modo-toggle {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: var(--bg2);
  border-radius: 10px;
  width: fit-content;
}
.modo-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--tx2);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all .15s;
  font-family: inherit;
}
.modo-btn:hover  { color: var(--tx0); }
.modo-btn.active { background: var(--acc); color: #fff; }

.sec { background:var(--bg1); border:0.5px solid var(--bdr); border-radius:12px; overflow:hidden; }
.sec-hdr {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-bottom:0.5px solid var(--bdr);
  font-size:13px; font-weight:500; color:var(--tx0); flex-wrap:wrap;
}
.sec-hdr i  { font-size:16px; color:var(--acc); }
.sec-body   { padding:16px; display:flex; flex-direction:column; gap:14px; }

.filtros-grid {
  display:grid;
  grid-template-columns: 1fr 1fr 1fr 140px 140px;
  gap:12px; align-items:start;
}
.filtros-grid--3 {
  grid-template-columns: 1fr 140px 140px;
}
.opt-label { font-size:10px; color:var(--tx3); font-weight:400; }

.periodos-rapidos { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.periodos-label   { font-size:12px; color:var(--tx2); }
.periodo-btn {
  font-size:11px; padding:4px 10px; border-radius:20px;
  border:0.5px solid var(--bdr2); background:var(--bg2);
  color:var(--tx1); cursor:pointer; transition:all .15s; font-family:inherit;
}
.periodo-btn:hover { background:var(--acc-dim); color:var(--acc); border-color:var(--acc); }

.calc-info {
  display:flex; align-items:center; gap:6px;
  font-size:12px; color:var(--tx2); padding:8px 12px;
  background:var(--bg2); border-radius:8px; border:0.5px solid var(--bdr2);
}
.calc-info i { color:var(--acc); }
.calc-info strong { color:var(--tx0); }

.progreso-wrap { display:flex; align-items:center; gap:10px; }
.progreso-bar  { flex:1; height:6px; background:var(--bg3); border-radius:6px; overflow:hidden; }
.progreso-fill { height:100%; background:var(--acc); border-radius:6px; transition:width .3s ease; }
.progreso-txt  { font-size:12px; color:var(--acc); font-weight:500; min-width:36px; }

.filtros-actions { display:flex; justify-content:flex-end; gap:8px; }

.alert-warn {
  display:flex; align-items:center; gap:8px;
  padding:10px 14px; border-radius:8px;
  background:var(--amb-dim); border:0.5px solid var(--amb); color:var(--amb); font-size:13px;
}

/* Dinero */
.dinero-grid { display:flex; flex-wrap:wrap; }
.dinero-item {
  flex:1; min-width:100px; display:flex; flex-direction:column;
  align-items:center; gap:4px; padding:14px;
  border-right:0.5px solid var(--bdr);
}
.dinero-item:last-child { border-right:none; }
.dinero-label { font-size:10px; color:var(--tx2); text-transform:uppercase; letter-spacing:.7px; text-align:center; }
.dinero-val   { font-size:17px; font-weight:600; color:var(--tx0); font-family:monospace; }
.dinero-item.green .dinero-val { color:var(--grn); }
.dinero-item.red   .dinero-val { color:var(--red); }
.dinero-item.amber .dinero-val { color:var(--amb); }
.dinero-item.total { background:var(--bg2); }
.dinero-item.total .dinero-val   { font-size:20px; color:var(--grn); }
.dinero-item.total .dinero-label { color:var(--tx0); font-weight:600; }

/* Tabla */
.table-wrap { overflow-x:auto; }
table { width:100%; border-collapse:collapse; }
th {
  padding:8px 12px; text-align:left;
  font-size:10px; font-weight:500; color:var(--tx2);
  text-transform:uppercase; letter-spacing:.7px;
  border-bottom:0.5px solid var(--bdr); white-space:nowrap;
  position:sticky; top:0; background:var(--bg1); z-index:1;
}
td { padding:9px 12px; font-size:12px; border-bottom:0.5px solid var(--bdr); color:var(--tx0); }
tbody tr { transition:background .1s; }
tbody tr:hover td { background:var(--bg2); }
tbody tr:last-child td { border-bottom:none; }
.mono { font-family:monospace; font-size:11px; }

.row-falta td      { background:rgba(240,84,84,.05); }
.row-descanso td   { background:rgba(100,116,139,.04); }
.row-festivo td    { background:rgba(245,166,35,.05); }
.row-incidencia td { background:rgba(168,85,247,.05); }

.tipo-badge {
  display:inline-block; font-size:10px; padding:2px 7px;
  border-radius:4px; font-weight:500; text-transform:uppercase; font-family:monospace;
}
.tipo-badge.trabajo           { background:var(--acc-dim); color:var(--acc); }
.tipo-badge.descanso          { background:var(--bg3);      color:var(--tx2); }
.tipo-badge.falta             { background:var(--red-dim);  color:var(--red); }
.tipo-badge.incidencia        { background:#2d1b4d;         color:#a855f7; }
.tipo-badge.festivo_trabajado { background:var(--amb-dim);  color:var(--amb); }
.tipo-badge.festivo_descanso  { background:var(--amb-dim);  color:var(--amb); }
.tipo-badge.festivo_falta     { background:var(--red-dim);  color:var(--red); }
.tipo-badge.festivo_incidencia { background:#2d1b4d;        color:#a855f7; }

.festivo-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10px; padding:2px 7px; border-radius:20px;
  background:var(--amb-dim); color:var(--amb);
}
.inc-badge {
  display:inline-block; font-size:10px; padding:2px 6px;
  border-radius:4px; background:#2d1b4d; color:#a855f7; margin-right:3px;
}
.pago-dia         { font-family:monospace; }
.pago-dia.positive { color:var(--grn); font-weight:500; }
.pago-dia.negative { color:var(--red); font-weight:500; }
.tfoot-row td { border-top:2px solid var(--bdr); background:var(--bg2); }

.item-count { font-size:11px; padding:2px 7px; border-radius:20px; background:var(--acc-dim); color:var(--acc); font-weight:500; }
.sel-sm {
  background:var(--bg2); border:0.5px solid var(--bdr2);
  border-radius:8px; padding:4px 8px;
  font-size:11px; color:var(--tx1); outline:none; font-family:inherit;
}
.icon-btn {
  width:26px; height:26px; border-radius:6px;
  background:var(--bg2); border:0.5px solid var(--bdr);
  display:inline-flex; align-items:center; justify-content:center;
  cursor:pointer; color:var(--acc); font-size:13px; transition:all .15s; margin:0 3px;
}
.icon-btn:hover { background:var(--bg3); }

/* Fields */
.field { display:flex; flex-direction:column; gap:5px; }
label  { font-size:12px; font-weight:500; color:var(--tx1); }
.req   { color:var(--red); }
input[type="date"], input[type="text"], input[type="number"], select {
  background:var(--bg2); border:0.5px solid var(--bdr2);
  border-radius:8px; padding:8px 10px;
  font-size:13px; color:var(--tx0); outline:none;
  font-family:inherit; transition:border .15s; width:100%;
}
input:focus, select:focus { border-color:var(--acc); }
select option, select optgroup { background:var(--bg1); }

/* ── Dropzone (modo fatiga) ────────────────────────────── */
.dropzone {
  position:relative;
  border:2px dashed var(--bdr2);
  border-radius:12px;
  padding:36px 20px;
  display:flex; flex-direction:column; align-items:center;
  gap:6px; text-align:center;
  cursor:pointer; transition:all .15s;
  background:var(--bg2);
}
.dropzone:hover         { border-color:var(--acc); background:var(--acc-dim); }
.dropzone.is-dragging   { border-color:var(--acc); background:var(--acc-dim); transform:scale(1.01); }
.dropzone.has-file      { border-color:var(--grn); background:rgba(34,201,122,.06); cursor:default; }
.hidden-input           { display:none; }

.dz-icon {
  width:52px; height:52px; border-radius:14px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center;
  font-size:26px; margin-bottom:4px;
}
.dz-icon.ok { background:rgba(34,201,122,.12); color:var(--grn); }
.dz-title   { font-size:14px; font-weight:600; color:var(--tx0); }
.dz-sub     { font-size:12px; color:var(--tx2); }
.dz-clear {
  position:absolute; top:10px; right:10px;
  width:26px; height:26px; border-radius:6px;
  background:var(--bg3); border:0.5px solid var(--bdr);
  color:var(--tx2); cursor:pointer;
  display:flex; align-items:center; justify-content:center; font-size:13px;
}
.dz-clear:hover { background:var(--red-dim); color:var(--red); }

.inline-edit {
  width:80px; text-align:right;
  background:var(--bg3); border:0.5px solid var(--bdr2);
  border-radius:6px; padding:4px 6px;
  font-size:11px; font-family:monospace; color:var(--tx0);
}
.inline-edit:focus { border-color:var(--acc); }

.estatus-badge {
  font-size:10px; padding:3px 9px; border-radius:20px;
  font-weight:600; text-transform:uppercase; letter-spacing:.4px;
}
.estatus-badge.borrador    { background:var(--bg3);      color:var(--tx2); }
.estatus-badge.en_revision { background:var(--amb-dim);  color:var(--amb); }
.estatus-badge.aprobada    { background:rgba(34,201,122,.12); color:var(--grn); }
.estatus-badge.rechazada   { background:var(--red-dim);  color:var(--red); }
.estatus-badge.dispersada  { background:var(--acc-dim);  color:var(--acc); }

.empty-state {
  display:flex; flex-direction:column; align-items:center; gap:8px;
  padding:40px 20px; color:var(--tx3);
}
.empty-state i { font-size:32px; }
.empty-state p { font-size:13px; }

/* Modal */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;
}
.modal-box {
  background:var(--bg1); border:0.5px solid var(--bdr2);
  border-radius:16px; width:100%; max-width:480px;
  display:flex; flex-direction:column; overflow:hidden; max-height:90vh;
}
.modal-box.xl { max-width:1100px; }
.modal-hdr {
  display:flex; align-items:center; gap:12px;
  padding:14px 18px; border-bottom:0.5px solid var(--bdr); flex-shrink:0;
}
.modal-icon {
  width:34px; height:34px; border-radius:10px;
  background:var(--acc-dim); color:var(--acc);
  display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;
}
.modal-title { font-size:14px; font-weight:600; color:var(--tx0); }
.modal-sub   { font-size:11px; color:var(--tx2); margin-top:2px; }
.modal-close {
  margin-left:auto; width:28px; height:28px; border-radius:6px;
  background:var(--bg3); border:none; cursor:pointer;
  color:var(--tx2); font-size:16px;
  display:flex; align-items:center; justify-content:center;
}
.modal-resumen {
  display:flex; border-bottom:0.5px solid var(--bdr); flex-shrink:0; flex-wrap:wrap;
}
.mr-item {
  flex:1; min-width:70px; display:flex; flex-direction:column;
  align-items:center; gap:3px; padding:10px;
  font-size:11px; color:var(--tx2); border-right:0.5px solid var(--bdr);
}
.mr-item:last-child { border-right:none; }
.mr-item.blue  { color:var(--acc); }
.mr-item.red   { color:var(--red); }
.mr-item.gray  { color:var(--tx2); }
.mr-item.amber { color:var(--amb); }
.mr-item.green { color:var(--grn); }
.mr-item.total-item { background:var(--bg2); color:var(--grn); }
.mr-num { font-size:20px; font-weight:700; font-family:monospace; }
.modal-table-wrap { flex:1; overflow-y:auto; }
.modal-footer {
  padding:12px 18px; border-top:0.5px solid var(--bdr);
  display:flex; justify-content:flex-end; flex-shrink:0;
}
.modal-footer--split { justify-content:space-between; align-items:center; }
.footer-actions { display:flex; gap:8px; }

/* Botones */
.btn-sm {
  display:inline-flex; align-items:center; gap:5px;
  padding:7px 14px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:transparent;
  font-size:12px; color:var(--tx1); cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-sm:hover  { background:var(--bg3); }
.btn-sm.danger { color:var(--red); border-color:var(--red); }
.btn-sm.danger:hover { background:var(--red-dim); }

.btn-primary-lg {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 18px; border-radius:8px; border:none;
  background:var(--acc); font-size:13px; color:#fff;
  cursor:pointer; font-family:inherit; font-weight:500; transition:background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background:var(--acc2); }
.btn-primary-lg:disabled { opacity:.6; cursor:not-allowed; }

@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; animation:spin .8s linear infinite; }

@media (max-width:900px) {
  .filtros-grid { grid-template-columns:1fr 1fr; }
  .dinero-grid  { flex-wrap:wrap; }
}
@media (max-width:600px) {
  .filtros-grid { grid-template-columns:1fr; }
}

/* ── Barra de progreso por chunks ──────────────────────────────────── */
.chunk-progreso-wrap {
  padding: 16px;
  background: var(--bg2);
  border: 0.5px solid var(--bdr2);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chunk-progreso-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.chunk-progreso-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--tx0);
}
.chunk-progreso-label i { color: var(--acc); font-size: 16px; }
.chunk-progreso-pct {
  font-size: 14px;
  font-weight: 700;
  color: var(--acc);
  font-family: monospace;
}
.chunk-progreso-bar {
  height: 10px;
  background: var(--bg3);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
}
.chunk-progreso-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--acc), var(--acc2));
  border-radius: 20px;
  transition: width .4s ease;
  position: relative;
  overflow: hidden;
}
.chunk-progreso-fill::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255,255,255,.25),
    transparent
  );
  animation: chunk-shimmer 1.4s linear infinite;
}
@keyframes chunk-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* ── Modal dispersión — selector de formato ────────────────────────── */
.modal-body-content {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.formato-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.formato-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1.5px solid var(--bdr2);
  background: var(--bg2);
  cursor: pointer;
  transition: all .15s;
  font-family: inherit;
  text-align: left;
}
.formato-btn i { font-size: 20px; color: var(--tx2); margin-bottom: 2px; }
.formato-btn:hover { border-color: var(--acc); background: var(--acc-dim); }
.formato-btn:hover i { color: var(--acc); }
.formato-btn.active { border-color: var(--acc); background: var(--acc-dim); }
.formato-btn.active i { color: var(--acc); }
.formato-nombre { font-size: 13px; font-weight: 600; color: var(--tx0); }
.formato-desc   { font-size: 11px; color: var(--tx2); }
.formato-btn.active .formato-nombre { color: var(--acc); }
.alert-info-disp {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 8px;
  background: var(--acc-dim);
  border: 0.5px solid var(--acc);
  color: var(--acc);
  font-size: 13px;
}
</style>