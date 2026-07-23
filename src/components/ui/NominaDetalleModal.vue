<!--
  NominaDetalleModal.vue

  Se agregó la posibilidad de QUITAR a un empleado de una nómina ya
  procesada que todavía está en 'borrador' -- para el caso real que
  describiste: "en la nómina Politécnico unos wueyes fueron cargados
  mal, quiero quitarlos y resubirlos correctamente".

  Cómo funciona (ver confirmarQuitar/ejecutarQuitar más abajo):
    1. Aparece un botón de basurita en cada fila, SOLO si
       nomina.estatus === 'borrador' (una vez aprobada/dispersada, ya no
       se debe tocar el detalle desde aquí -- el backend también lo
       bloquea por su lado, no es solo un candado visual).
    2. Al confirmar, llama DELETE /nomina-fatiga/detalle/{id} (nuevo
       endpoint -- ver quitarDetalleNomina.php). Ese endpoint borra la
       fila de nomina_fatiga_detalle Y resta su total del
       total_pagar/total_empleados del lote -- como si esa persona nunca
       hubiera estado en esta carga.
    3. Después de quitarlo, ya puedes ir a la vista de captura, elegir
       "Agregar a lote existente" con esta misma nómina, y volver a
       subir/capturar a esa gente con los datos correctos -- el
       guardarAsistenciaManual()/guardarFilasAsistencia() que ya tienes
       suma en vez de sobreescribir.
-->
<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cerrar')">
      <div class="modal-nomina">

        <div class="mn-header">
          <div>
            <p class="mn-title">Resumen de nómina</p>
            <p class="mn-sub" v-if="nomina">
              <div v-if="nomina?.cargas?.length > 1" class="mn-cargas-lista">
                <span
                  v-for="c in nomina.cargas"
                  :key="c.id"
                  class="deducc-pill"
                  :title="'Subido por ' + (c.subido_por || 'desconocido') + (c.etiqueta ? (' · Etiqueta: ' + c.etiqueta) : '')"
                >
                  {{ c.nombre_carga }}<span v-if="c.etiqueta" class="pill-etiqueta"> · {{ c.etiqueta }}</span>: {{ c.total_empleados }}
                  <i v-if="c.estatus === 'completa'" class="ti ti-check" style="color:var(--grn)"></i>
                  <i v-else class="ti ti-loader-2 spin" style="color:var(--acc)"></i>
                </span>
              </div>
              {{ nomina.nombre }} ·
              {{ nomina.periodo_inicio }} → {{ nomina.periodo_fin || 'sin fecha fin' }} ·
              <strong>{{ detalleNomina.length }}</strong> empleados ·
              Total: <span class="grn">{{ formatMoney(nomina.total_pagar) }}</span>
              · <span :class="'badge-estatus badge-' + nomina.estatus">{{ nomina.estatus }}</span>
            </p>
          </div>
          <button class="mn-close" @click="$emit('cerrar')"><i class="ti ti-x"></i></button>
        </div>

        <div class="mn-filtros">
          <input v-model="filtroNombre" placeholder="Buscar empleado..." class="mn-search" />
          <select v-model="filtroZona" class="mn-select">
            <option value="">Todas las zonas</option>
            <option v-for="z in zonasUnicas" :key="z" :value="z">{{ z }}</option>
          </select>

          <!-- NUEVO -- filtrar por la etiqueta que se le puso a la carga al
               subirla (ej. "Tadeo"). De aquí sale el caso que pediste: buscas
               la etiqueta, seleccionas todo lo que aparece, y los das de
               baja en lote si se cargaron mal. -->
          <select v-if="etiquetasUnicas.length" v-model="filtroEtiqueta" class="mn-select">
            <option value="">Todas las etiquetas</option>
            <option v-for="e in etiquetasUnicas" :key="e" :value="e">{{ e }}</option>
          </select>

          <div class="mn-filtros-divider"></div>

          <div class="mn-chips-group">
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

        <!-- Barra de acciones masivas -- aparece con algo seleccionado.
             Mismo patrón que ya usas en NominaFatigaWorkflowView para
             aprobar/rechazar en lote. -->
        <div v-if="hayAlgunaSeleccionada" class="mn-bulk-bar">
          <span class="mn-bulk-count">{{ seleccionados.size }} seleccionado{{ seleccionados.size === 1 ? '' : 's' }}</span>
          <span class="mn-bulk-total">· {{ formatMoney(totalSeleccionQuitar) }}</span>
          <div class="mn-bulk-actions">
            <button class="btn-sm btn-sm--red" @click="abrirQuitarMasivo">
              <i class="ti ti-trash" aria-hidden="true"></i> Quitar seleccionados
            </button>
            <button class="btn-sm" @click="limpiarSeleccion">Deseleccionar</button>
          </div>
        </div>

        <div class="mn-tabla-wrap">
          <div v-if="cargando" class="mn-loading">
            <i class="ti ti-loader-2 spin"></i> Cargando detalle...
          </div>

          <div class="mn-tabs">
            <button :class="['mn-tab', tabActiva === 'prenomina' && 'active']" @click="tabActiva = 'prenomina'">
              <i class="ti ti-calculator"></i> Pre-nómina
            </button>
            <button :class="['mn-tab', tabActiva === 'fiscal' && 'active']" @click="tabActiva = 'fiscal'">
              <i class="ti ti-building-government"></i> Nómina fiscal
            </button>
          </div>

          <!-- TAB PRE-NÓMINA -->
          <table v-if="tabActiva === 'prenomina'" class="mn-tabla">
            <thead>
              <tr>
                <th class="th-grupo th-base" colspan="1"></th>
                <th class="th-grupo th-perc" colspan="9">PERCEPCIONES</th>
                <th class="th-grupo th-ded"  colspan="5">DEDUCCIONES</th>
                <th class="th-grupo th-tot"  colspan="2">TOTALES</th>
                <th class="th-grupo th-base" colspan="2">ORIGEN</th>
                <th class="th-grupo th-base" colspan="1"></th>
              </tr>
              <tr>
                <th style="width:32px">
                  <input
                    v-if="nomina?.estatus === 'borrador' && detallesFiltrados.length"
                    type="checkbox"
                    class="mn-checkbox"
                    :checked="todosSeleccionados"
                    @change="toggleSeleccionarTodos"
                  />
                </th>
                <th class="text-left">Empleado</th>
                <th class="text-left">Zona</th>
                <th title="Nuevo ingreso este periodo">★</th>
                <th title="Sueldo base quincenal">Sueldo</th>
                <th title="Sueldo quincenal (tabulador o salario_mensual/2)">Sueldo Quincenal</th>
                <th title="Tiempo extra (24E/12E/8E)">Extra</th>
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
                <th class="text-left">Archivo Origen</th>
                <th style="width:44px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0"><td colspan="19" class="sin-resultados">Sin resultados</td></tr>
              <tr v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado, 'row-editando-inline': filaEditandoId === d.id }">
                <td class="center">
                  <input
                    v-if="nomina?.estatus === 'borrador'"
                    type="checkbox"
                    class="mn-checkbox"
                    :checked="seleccionados.has(d.id)"
                    @change="toggleSeleccion(d.id)"
                  />
                </td>
                <td class="col-nombre">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn" v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="col-zona">{{ d.zona || '—' }}</td>
                <td class="center">
                  <i v-if="d.es_nuevo==1" class="ti ti-star-filled" style="color:var(--amb)"></i>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono">{{ fmt(d.sueldo_semanal) }}</td>
                <td class="mono">{{ d.sueldo_quincenal ? fmt(d.sueldo_quincenal) : '—' }}</td>
                <td class="mono grn">{{ d.tiempo_extra > 0 ? '+'+fmt(d.tiempo_extra) : '—' }}</td>
                <td class="mono grn">
                  <input
                    v-if="filaEditandoId === d.id"
                    v-model.number="edicionTemp.adicional"
                    type="number" step="0.01" class="mn-edit-input"
                  />
                  <span v-else>{{ d.adicional > 0 ? '+'+fmt(d.adicional) : '—' }}</span>
                </td>
                <td class="mono grn">
                  <span v-if="d.monto_festivos > 0 || d.monto_dobletes > 0">
                    +{{ fmt((+d.monto_festivos||0) + (+d.monto_dobletes||0)) }}
                  </span>
                  <span v-else class="muted">—</span>
                </td>
                <td class="mono red">{{ d.descuento_faltas > 0 ? '-'+fmt(d.descuento_faltas) : '—' }}</td>
                <td class="mono red">{{ d.desc_fonacot > 0 ? '-'+fmt(d.desc_fonacot) : '—' }}</td>
                <td class="mono red">{{ d.desc_infonavit > 0 ? '-'+fmt(d.desc_infonavit) : '—' }}</td>
                <td class="mono red">{{ d.desc_pension > 0 ? '-'+fmt(d.desc_pension) : '—' }}</td>
                <td class="mono red">
                  <input
                    v-if="filaEditandoId === d.id"
                    v-model.number="edicionTemp.otros_descuentos"
                    type="number" step="0.01" class="mn-edit-input"
                  />
                  <span v-else>{{ d.otros_descuentos > 0 ? '-'+fmt(d.otros_descuentos) : '—' }}</span>
                </td>
                <td class="mono col-total" :class="d.total > 0 ? 'grn' : 'red'">{{ fmt(d.total) }}</td>
                <td class="mono grn" style="font-size:11px">{{ d.bono > 0 ? '+'+fmt(d.bono) : '—' }}</td>
                <td class="col-comentarios" style="text-align:left; font-size:11px; color:var(--tx2); max-width:200px;">
                  <input
                    v-if="filaEditandoId === d.id"
                    v-model="edicionTemp.comentarios"
                    type="text" class="mn-edit-input" placeholder="—"
                  />
                  <span v-else>{{ d.comentarios || '—' }}</span>
                </td>
                <td style="font-size:11px; color:var(--tx2);" :title="'Subido por ' + (d.subido_por || 'desconocido')">
                  {{ d.archivo_origen || '—' }}
                  <span v-if="d.etiqueta_carga" class="badge-etiqueta">{{ d.etiqueta_carga }}</span>
                </td>
                <td class="center" style="white-space:nowrap">
                  <template v-if="filaEditandoId === d.id">
                    <button class="lc-btn lc-btn--ok" title="Guardar" @click="guardarEdicionFila(d)" :disabled="guardandoEdicion">
                      <i class="ti ti-check"></i>
                    </button>
                    <button class="lc-btn" title="Cancelar" @click="cancelarEdicionFila" :disabled="guardandoEdicion">
                      <i class="ti ti-x"></i>
                    </button>
                  </template>
                  <template v-else-if="nomina?.estatus === 'borrador'">
                    <button class="lc-btn" title="Editar adicional/descuento/comentarios" @click="iniciarEdicionFila(d)">
                      <i class="ti ti-pencil"></i>
                    </button>
                    <button class="lc-btn lc-btn--rechazar" title="Quitar de esta nómina" @click="confirmarQuitar(d)">
                      <i class="ti ti-trash"></i>
                    </button>
                  </template>
                </td>
              </tr>
              <tr v-if="filaEditandoId && errorEdicion" class="row-error-edicion">
                <td colspan="19" class="alert-warn" style="text-align:left; border-radius:0">
                  <i class="ti ti-alert-circle"></i> {{ errorEdicion }}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td></td>
                <td colspan="3"><strong>TOTALES</strong></td>
                <td class="mono">{{ fmt(sumaCol('sueldo_semanal')) }}</td>
                <td></td>
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
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <!-- TAB FISCAL -->
          <table v-else-if="tabActiva === 'fiscal'" class="mn-tabla mn-tabla-fiscal">
            <thead>
              <tr>
                <th class="th-grupo th-base" colspan="1"></th>
                <th class="th-grupo th-base" colspan="6">BASE</th>
                <th class="th-grupo th-ded"  colspan="7">DEDUCCIONES FISCALES</th>
                <th class="th-grupo th-tot"  colspan="3">DISPERSIÓN</th>
                <th class="th-grupo th-base" colspan="1">ORIGEN</th>
                <th class="th-grupo th-base" colspan="1"></th>
              </tr>
              <tr>
                <th style="width:32px">
                  <input
                    v-if="nomina?.estatus === 'borrador' && detallesFiltrados.length"
                    type="checkbox"
                    class="mn-checkbox"
                    :checked="todosSeleccionados"
                    @change="toggleSeleccionarTodos"
                  />
                </th>
                <th class="text-left sticky-col">Empleado</th>
                <th>Días Lab.</th>
                <th title="Sueldo quincenal (tabulador o salario_mensual/2)">Sueldo Quincenal</th>
                <th>SD</th>
                <th>SDI</th>
                <th>Ingreso Q</th>
                <th>ISR antes Subs.</th>
                <th>IMSS</th>
                <th>INFONAVIT</th>
                <th>FONACOT</th>
                <th>Pensión</th>
                <th>Subs. Empleo</th>
                <th>ISR neto</th>
                <th class="col-fiscal">Neto Fiscal</th>
                <th style="color:var(--amb)">IAS</th>
                <th class="col-total">Total Disp.</th>
                <th class="text-left">Archivo Origen</th>
                <th style="width:44px"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="detallesFiltrados.length === 0"><td colspan="19" class="sin-resultados">Sin resultados</td></tr>
              <tr v-for="d in detallesFiltrados" :key="d.id"
                :class="{ 'row-nuevo': d.es_nuevo==1, 'row-sin-match': !d.id_empleado }">
                <td class="center">
                  <input
                    v-if="nomina?.estatus === 'borrador'"
                    type="checkbox"
                    class="mn-checkbox"
                    :checked="seleccionados.has(d.id)"
                    @change="toggleSeleccion(d.id)"
                  />
                </td>
                <td class="col-nombre sticky-col">
                  <span class="badge-nuevo" v-if="d.es_nuevo==1">NUEVO</span>
                  <span class="badge-warn" v-if="!d.id_empleado">SIN ID</span>
                  {{ d.nombre_excel }}
                </td>
                <td class="mono center">{{ d.dias_pagados ?? 15 }}</td>
                <td class="mono">{{ d.sueldo_quincenal ? fmt(d.sueldo_quincenal) : '—' }}</td>
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
                <td style="font-size:11px; color:var(--tx2);" :title="'Subido por ' + (d.subido_por || 'desconocido')">
                  {{ d.archivo_origen || '—' }}
                  <span v-if="d.etiqueta_carga" class="badge-etiqueta">{{ d.etiqueta_carga }}</span>
                </td>
                <td class="center">
                  <button
                    v-if="nomina?.estatus === 'borrador'"
                    class="lc-btn lc-btn--rechazar"
                    title="Quitar de esta nómina"
                    @click="confirmarQuitar(d)"
                  >
                    <i class="ti ti-trash"></i>
                  </button>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="mn-footer">
                <td></td>
                <td class="sticky-col" colspan="3"><strong>TOTALES</strong></td>
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
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="mn-footer-bar">
          <span class="muted" style="font-size:12px">
            Mostrando {{ detallesFiltrados.length }} de {{ detalleNomina.length }} empleados
          </span>
          <div class="mn-footer-actions">
            <button v-if="nomina?.estatus === 'borrador'" class="btn-outline-danger" @click="mostrarConfirmarCancelar = true">
              <i class="ti ti-trash"></i> Cancelar nómina
            </button>
            <button class="btn-ghost" @click="exportarExcel" :disabled="exportando">
              <i class="ti ti-loader-2 spin" v-if="exportando"></i>
              <i class="ti ti-file-spreadsheet" v-else></i>
              {{ exportando ? 'Generando...' : 'Exportar Excel' }}
            </button>
            <button v-if="nomina?.estatus === 'borrador'" class="btn-primary-lg" @click="mostrarConfirmarAprobar = true">
              <i class="ti ti-check"></i> Aprobar nómina
            </button>
            <button v-if="nomina?.estatus === 'aprobada'" class="btn-primary-lg" @click="mostrarDispersion = true">
              <i class="ti ti-cash"></i> Dispersar
            </button>
            <button class="btn-ghost" @click="$emit('cerrar')">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="mostrarDispersion" class="modal-overlay" @click.self="mostrarDispersion = false">
      <div class="modal-nomina" style="max-width:480px; max-height:none;">
        <div class="mn-header">
          <p class="mn-title">Dispersión</p>
          <button class="mn-close" @click="mostrarDispersion = false"><i class="ti ti-x"></i></button>
        </div>
        <div style="padding: 0 20px 20px;">
          <DispersionModal
            :nomina="nomina"
            @close="mostrarDispersion = false"
            @completado="onDispersionCompleta"
          />
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="mostrarConfirmarAprobar" class="modal-overlay" @click.self="mostrarConfirmarAprobar = false">
      <div class="confirm-modal confirm-modal--warning">
        <div class="cm-icon"><i class="ti ti-lock"></i></div>
        <p class="cm-title">Aprobar "{{ nomina?.nombre }}"</p>
        <p class="cm-sub">
          Una vez aprobada, <strong>ya no podrás agregar más cargas ni pre-nóminas</strong> a este lote.
          Cualquier fatiga adicional tendrá que procesarse como un lote aparte.
        </p>
        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="mostrarConfirmarAprobar = false" :disabled="aprobando">Cancelar</button>
          <button class="cm-btn cm-btn--primary" @click="aprobar" :disabled="aprobando">
            {{ aprobando ? 'Aprobando...' : 'Sí, aprobar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
  <div v-if="mostrarConfirmarCancelar" class="modal-overlay" @click.self="mostrarConfirmarCancelar = false">
    <div class="confirm-modal confirm-modal--danger">
      <div class="cm-icon"><i class="ti ti-trash"></i></div>
      <p class="cm-title">Cancelar "{{ nomina?.nombre }}"</p>
      <p class="cm-sub">
        Se marcará como <strong>rechazada</strong> y desaparecerá del flujo de revisión.
        Esta acción no se puede deshacer.
      </p>
      <textarea
        v-model="motivoCancelar"
        placeholder="Motivo de la cancelación (opcional)..."
        class="cm-textarea"
        rows="3"
      ></textarea>
      <div class="cm-actions">
        <button class="cm-btn cm-btn--ghost" @click="mostrarConfirmarCancelar = false" :disabled="cancelando">Volver</button>
        <button class="cm-btn cm-btn--danger" @click="cancelarNomina" :disabled="cancelando">
          {{ cancelando ? 'Cancelando...' : 'Sí, cancelar' }}
        </button>
      </div>
    </div>
  </div>
</Teleport>

  <!-- NUEVO -- confirmar "quitar de la nómina" (baja del cálculo, no del
       empleado). Muestra a quién y cuánto se le va a restar del total. -->
  <Teleport to="body">
    <div v-if="detalleAQuitar" class="modal-overlay" @click.self="!quitando && (detalleAQuitar = null)">
      <div class="confirm-modal confirm-modal--danger">
        <div class="cm-icon"><i class="ti ti-user-minus"></i></div>
        <p class="cm-title">Quitar de esta nómina</p>
        <p class="cm-sub">
          <strong>{{ detalleAQuitar.nombre_excel }}</strong> se va a quitar de esta nómina --
          se borra su fila y se resta <strong class="red">{{ fmt(detalleAQuitar.total) }}</strong>
          del total del lote. Después puedes volver a capturarlo correctamente
          agregándolo a este mismo lote.
        </p>
        <div v-if="errorQuitar" class="alert-warn" style="text-align:left">
          <i class="ti ti-alert-circle"></i> {{ errorQuitar }}
        </div>
        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="detalleAQuitar = null" :disabled="quitando">Cancelar</button>
          <button class="cm-btn cm-btn--danger" @click="ejecutarQuitar" :disabled="quitando">
            {{ quitando ? 'Quitando...' : 'Sí, quitar' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- NUEVO -- quitar EN LOTE. Mismo endpoint que el quitar individual,
       nada más en loop (idéntico patrón a ejecutarMasivo() de tu
       NominaFatigaWorkflowView), con barra de progreso por si son varios. -->
  <Teleport to="body">
    <div v-if="mostrarQuitarMasivo" class="modal-overlay" @click.self="cerrarQuitarMasivo">
      <div class="confirm-modal confirm-modal--danger">
        <div class="cm-icon"><i class="ti ti-users" aria-hidden="true"></i></div>
        <p class="cm-title">Quitar {{ seleccionados.size }} empleado{{ seleccionados.size === 1 ? '' : 's' }}</p>
        <p class="cm-sub">
          Se van a borrar sus filas y se resta <strong class="red">{{ formatMoney(totalSeleccionQuitar) }}</strong>
          del total del lote. Después puedes volver a capturarlos correctamente
          agregándolos a este mismo lote.
        </p>

        <div v-if="procesandoMasivo" class="masivo-progreso">
          <div class="chunk-bar-wrap">
            <div class="chunk-bar"><div class="chunk-fill" :style="{ width: pctMasivo + '%' }"></div></div>
            <span class="chunk-pct">{{ progresoMasivo.hecho }}/{{ progresoMasivo.total }}</span>
          </div>
        </div>

        <div v-if="!procesandoMasivo && erroresMasivo.length" class="alert-warn" style="text-align:left">
          <i class="ti ti-alert-circle" aria-hidden="true"></i>
          No se pudo con: {{ erroresMasivo.join(', ') }}
        </div>

        <div class="cm-actions">
          <button class="cm-btn cm-btn--ghost" @click="cerrarQuitarMasivo" :disabled="procesandoMasivo">
            {{ erroresMasivo.length ? 'Cerrar' : 'Cancelar' }}
          </button>
          <button class="cm-btn cm-btn--danger" @click="ejecutarQuitarMasivo" :disabled="procesandoMasivo">
            {{ procesandoMasivo ? 'Procesando...' : (erroresMasivo.length ? 'Reintentar' : 'Sí, quitar todos') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/services/api.js'
import DispersionModal from './DispersionModal.vue'

const props = defineProps({
  idNomina: { type: [Number, String], required: true },
})
const emit = defineEmits(['cerrar', 'actualizado'])

const nomina         = ref(null)
const detalleNomina  = ref([])
const cargando       = ref(false)
const aprobando      = ref(false)
const mostrarDispersion = ref(false)

const filtroNombre   = ref('')
const filtroZona     = ref('')
const filtroEtiqueta = ref('') // NUEVO -- etiqueta de la carga (ej. "Tadeo")
const soloNuevos    = ref(false)
const soloSinMatch  = ref(false)
const tabActiva     = ref('prenomina')

const zonasUnicas = computed(() =>
  [...new Set(detalleNomina.value.map(d => d.zona).filter(Boolean))].sort()
)
// NUEVO -- etiquetas únicas presentes en el detalle, para armar el <select>
// de filtro. Si nadie ha usado etiquetas en este lote, la lista sale vacía
// y el <select> ni se muestra (ver v-if en el template).
const etiquetasUnicas = computed(() =>
  [...new Set(detalleNomina.value.map(d => d.etiqueta_carga).filter(Boolean))].sort()
)

const mostrarConfirmarAprobar = ref(false)


const detallesFiltrados = computed(() => {
  let lista = detalleNomina.value
  if (filtroNombre.value) lista = lista.filter(d => d.nombre_excel?.toLowerCase().includes(filtroNombre.value.toLowerCase()))
  if (filtroZona.value)   lista = lista.filter(d => d.zona === filtroZona.value)
  if (filtroEtiqueta.value) lista = lista.filter(d => d.etiqueta_carga === filtroEtiqueta.value)
  if (soloNuevos.value)   lista = lista.filter(d => d.es_nuevo == 1)
  if (soloSinMatch.value) lista = lista.filter(d => !d.id_empleado)
  return lista
})

const mostrarConfirmarCancelar = ref(false)
const motivoCancelar = ref('')
const cancelando = ref(false)

const exportando = ref(false)

/* ── Quitar un empleado de esta nómina (baja del cálculo) ────────────
   Solo tiene sentido mientras la nómina sigue en 'borrador' -- el botón
   ya se oculta en el template si no, y el backend lo bloquea también
   por su cuenta (ver quitarDetalleNomina.php) por si alguien pega la
   petición directo sin pasar por la UI. */
const detalleAQuitar = ref(null) // la fila completa (para mostrar nombre/total en el modal)
const quitando = ref(false)
const errorQuitar = ref('')

function confirmarQuitar(fila) {
  errorQuitar.value = ''
  detalleAQuitar.value = fila
}

async function ejecutarQuitar() {
  if (!detalleAQuitar.value) return
  quitando.value = true
  errorQuitar.value = ''
  try {
    await api.delete(`/nomina-fatiga/detalle/${detalleAQuitar.value.id}`)
    detalleNomina.value = detalleNomina.value.filter((d) => d.id !== detalleAQuitar.value.id)
    detalleAQuitar.value = null
    // Refresca el header (nomina.total_pagar/total_empleados) contra lo
    // que el backend ya recalculó, en vez de restar a mano en el cliente.
    await cargar()
    emit('actualizado')
  } catch (err) {
    console.error('Error quitando de la nómina:', err?.response?.data || err)
    errorQuitar.value = err?.response?.data?.message || 'No se pudo quitar -- intenta de nuevo'
  } finally {
    quitando.value = false
  }
}

/* ── Selección múltiple + quitar en lote ─────────────────────────────
   Mismo concepto que el quitar individual (confirmarQuitar/ejecutarQuitar
   arriba), nada más aplicado a varios id's a la vez, en loop, igual que
   ejecutarMasivo() de NominaFatigaWorkflowView. */
const seleccionados = ref(new Set())
const hayAlgunaSeleccionada = computed(() => seleccionados.value.size > 0)
const todosSeleccionados = computed(() =>
  detallesFiltrados.value.length > 0 && detallesFiltrados.value.every((d) => seleccionados.value.has(d.id))
)
const totalSeleccionQuitar = computed(() =>
  detalleNomina.value
    .filter((d) => seleccionados.value.has(d.id))
    .reduce((s, d) => s + (parseFloat(d.total) || 0), 0)
)

function toggleSeleccion(id) {
  const s = new Set(seleccionados.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  seleccionados.value = s
}
function toggleSeleccionarTodos() {
  seleccionados.value = todosSeleccionados.value
    ? new Set()
    : new Set(detallesFiltrados.value.map((d) => d.id))
}
function limpiarSeleccion() {
  seleccionados.value = new Set()
}

const mostrarQuitarMasivo = ref(false)
const procesandoMasivo = ref(false)
const progresoMasivo = ref({ hecho: 0, total: 0 })
const erroresMasivo = ref([])

const pctMasivo = computed(() =>
  progresoMasivo.value.total ? Math.round((progresoMasivo.value.hecho / progresoMasivo.value.total) * 100) : 0
)

function abrirQuitarMasivo() {
  mostrarQuitarMasivo.value = true
  erroresMasivo.value = []
  progresoMasivo.value = { hecho: 0, total: 0 }
}
function cerrarQuitarMasivo() {
  if (procesandoMasivo.value) return
  mostrarQuitarMasivo.value = false
  erroresMasivo.value = []
}

async function ejecutarQuitarMasivo() {
  const ids = Array.from(seleccionados.value)
  if (!ids.length) return

  procesandoMasivo.value = true
  progresoMasivo.value = { hecho: 0, total: ids.length }
  const erroresNuevos = []

  // Uno por uno (no en paralelo) -- mismo motivo que en el workflow: no
  // saturar al backend y poder mostrar progreso real.
  for (const idDet of ids) {
    try {
      await api.delete(`/nomina-fatiga/detalle/${idDet}`)
      detalleNomina.value = detalleNomina.value.filter((d) => d.id !== idDet)
    } catch (err) {
      const fila = detalleNomina.value.find((d) => d.id === idDet)
      erroresNuevos.push(fila?.nombre_excel || `#${idDet}`)
      console.error('[nomina-detalle] error quitando en lote, id', idDet, err?.response?.data || err)
    } finally {
      progresoMasivo.value.hecho++
    }
  }

  erroresMasivo.value = erroresNuevos
  procesandoMasivo.value = false
  await cargar()
  emit('actualizado')

  if (erroresNuevos.length === 0) {
    limpiarSeleccion()
    mostrarQuitarMasivo.value = false
  } else {
    limpiarSeleccion()
  }
}

/* ── Edición inline (adicional / otros_descuentos / comentarios) ─────
   Para cuando el error es chico y no vale la pena quitar y resubir --
   usa el mismo endpoint PUT /nomina-fatiga/:id/detalle/:detId que ya
   tenías (actualizarDetalle()), que recalcula el total server-side.
   OJO: esto NO toca los días trabajados/servicio -- si el error es en el
   calendario o el servicio (lo que afecta el tabulador), sigue siendo
   más seguro quitar la fila y volver a capturarla con
   guardarFilasAsistencia(), que sí recalcula todo desde cero. */
const filaEditandoId = ref(null)
const edicionTemp = reactive({ adicional: 0, otros_descuentos: 0, comentarios: '' })
const guardandoEdicion = ref(false)
const errorEdicion = ref('')

function iniciarEdicionFila(d) {
  filaEditandoId.value = d.id
  edicionTemp.adicional = Number(d.adicional) || 0
  edicionTemp.otros_descuentos = Number(d.otros_descuentos) || 0
  edicionTemp.comentarios = d.comentarios || ''
  errorEdicion.value = ''
}
function cancelarEdicionFila() {
  filaEditandoId.value = null
  errorEdicion.value = ''
}
async function guardarEdicionFila(d) {
  guardandoEdicion.value = true
  errorEdicion.value = ''
  try {
    const { data } = await api.put(`/nomina-fatiga/${props.idNomina}/detalle/${d.id}`, {
      adicional: edicionTemp.adicional,
      otros_descuentos: edicionTemp.otros_descuentos,
      comentarios: edicionTemp.comentarios,
    })
    d.adicional = edicionTemp.adicional
    d.otros_descuentos = edicionTemp.otros_descuentos
    d.comentarios = edicionTemp.comentarios
    if (data?.data?.total !== undefined) d.total = data.data.total
    filaEditandoId.value = null
    await cargar() // refresca total_pagar del header
    emit('actualizado')
  } catch (err) {
    console.error('Error editando fila:', err?.response?.data || err)
    errorEdicion.value = err?.response?.data?.message || 'No se pudo guardar -- intenta de nuevo'
  } finally {
    guardandoEdicion.value = false
  }
}

async function exportarExcel() {
  exportando.value = true
  try {
    const response = await api.get(`/nomina-fatiga/${props.idNomina}/exportar-xlsx`, {
      responseType: 'blob',
    })
    const disposition = response.headers['content-disposition'] || ''
    const match = disposition.match(/filename="(.+)"/)
    const nombreArchivo = match ? match[1] : `nomina_${props.idNomina}.xlsx`

    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', nombreArchivo)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Error exportando:', err)
  } finally {
    exportando.value = false
  }
}

async function onDispersionCompleta() {
  await cargar()
  emit('actualizado')
}

async function cancelarNomina() {
  cancelando.value = true
  try {
    await api.post(`/nomina-fatiga/${props.idNomina}/rechazar`, { comentario: motivoCancelar.value })
    mostrarConfirmarCancelar.value = false
    emit('actualizado')
    emit('cerrar')
  } catch (err) {
    console.error('Error cancelando:', err)
  } finally {
    cancelando.value = false
  }
}

function sumaCol(col) {
  return detallesFiltrados.value.reduce((s, d) => s + (parseFloat(d[col]) || 0), 0)
}

async function cargar() {
  cargando.value = true
  try {
    const { data } = await api.get(`/nomina-fatiga/${props.idNomina}`)
    nomina.value        = data.data?.nomina || null
    detalleNomina.value = data.data?.detalle || []
  } catch (err) {
    console.error('Error cargando nómina:', err)
  } finally {
    cargando.value = false
  }
}

async function aprobar() {
  aprobando.value = true
  try {
    await api.post(`/nomina-fatiga/${props.idNomina}/aprobar`)
    mostrarConfirmarAprobar.value = false
    await cargar()
    emit('actualizado')
  } catch (err) {
    console.error('Error aprobando:', err)
  } finally {
    aprobando.value = false
  }
}

function fmt(v) {
  return Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

onMounted(cargar)
</script>

<style scoped>
.mn-sub   { font-size:12px; color:var(--tx2); margin-top:4px; }
.mn-sub .grn { color:var(--grn); }

.mn-filtros {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px;
  border-bottom: 0.5px solid var(--bdr);
  flex-wrap: wrap;
}

.mn-filtros-divider {
  width: 1px;
  height: 22px;
  background: var(--bdr2);
  margin: 0 4px;
}

.mn-chips-group {
  display: flex;
  gap: 8px;
}

.mn-search {
  flex:1; min-width:200px; padding:7px 12px; border-radius:8px;
  border:0.5px solid var(--bdr2); background:var(--bg2);
  color:var(--tx0); font-size:13px; font-family:inherit; outline:none;
}
.mn-search:focus { border-color:var(--acc); }
.mn-select {
  padding:7px 10px; border-radius:8px; border:0.5px solid var(--bdr2);
  background:var(--bg2); color:var(--tx0); font-size:12px;
  font-family:inherit; cursor:pointer; outline:none;
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
/* NUEVO -- etiqueta de la carga (ej. "Tadeo"), junto al archivo de origen */
.badge-etiqueta {
  display:inline-block; font-size:9px; padding:1px 6px; margin-left:4px;
  border-radius:4px; background:var(--acc-dim); color:var(--acc);
  font-weight:600; vertical-align:middle; white-space:nowrap;
}
.pill-etiqueta { opacity:.8; font-weight:400; }

.row-nuevo    { background:rgba(255,180,0,.04); }
.row-sin-match { background:rgba(255,80,80,.05); }

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-top: 0.5px solid var(--bdr);
  background: var(--bg2);
}

.mn-footer-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-estatus {
  font-size: 10px; padding: 2px 8px; border-radius: 20px; font-weight: 600;
  text-transform: uppercase; margin-left: 6px;
}
.badge-borrador   { background: var(--bg3); color: var(--tx2); }
.badge-aprobada   { background: rgba(34,201,122,.15); color: var(--grn); }
.badge-rechazada  { background: var(--red-dim); color: var(--red); }
.badge-dispersada { background: var(--acc-dim); color: var(--acc); }

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

.btn-outline-danger {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 9px;
  border: 1px solid var(--red); background: transparent;
  color: var(--red); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-outline-danger:hover { background: var(--red-dim); }

.btn-ghost {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px; border-radius: 9px;
  border: 1px solid var(--bdr2); background: var(--bg1);
  color: var(--tx1); font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-ghost:hover { background: var(--bg3); color: var(--tx0); }

.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 18px; border-radius: 9px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500;
  transition: background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

/* NUEVO -- botón de quitar por fila, reusa el mismo look que ya tenías
   para el botón "rechazar" de las tarjetas del kanban (.lc-btn). */
.lc-btn {
  width:26px; height:26px; border-radius:7px; border:0.5px solid var(--bdr2);
  background:var(--bg2); color:var(--tx2); cursor:pointer;
  display:inline-flex; align-items:center; justify-content:center; font-size:12px;
  transition:all .15s;
}
.lc-btn--rechazar:hover { background:var(--red-dim); color:var(--red); border-color:var(--red); }
.lc-btn--ok:hover { background:rgba(34,201,122,.15); color:var(--grn); border-color:var(--grn); }
.lc-btn + .lc-btn { margin-left:4px; }
.lc-btn:disabled { opacity:.5; cursor:not-allowed; }

/* NUEVO -- checkboxes de selección (header "seleccionar todos" + por fila) */
.mn-checkbox {
  width:15px; height:15px; cursor:pointer; accent-color:var(--acc);
  vertical-align:middle;
}

/* NUEVO -- barra de acciones masivas, aparece arriba de la tabla en
   cuanto hay algo seleccionado. Mismo tono que el resto de barras de
   acción de la app (fondo tenue, borde sutil). */
.mn-bulk-bar {
  display:flex; align-items:center; gap:10px;
  padding:10px 20px; background:var(--acc-dim);
  border-bottom:0.5px solid var(--bdr);
  font-size:12px; color:var(--acc);
}
.mn-bulk-count { font-weight:600; }
.mn-bulk-total { color:var(--tx1); }
.mn-bulk-actions { display:flex; align-items:center; gap:8px; margin-left:auto; }

.btn-sm {
  display:inline-flex; align-items:center; gap:5px;
  padding:6px 12px; border-radius:7px;
  border:0.5px solid var(--bdr2); background:var(--bg1);
  color:var(--tx1); font-size:12px; font-weight:500;
  cursor:pointer; font-family:inherit; transition:all .15s;
}
.btn-sm:hover { background:var(--bg3); color:var(--tx0); }
.btn-sm--red { border-color:var(--red); color:var(--red); background:transparent; }
.btn-sm--red:hover { background:var(--red-dim); }

/* NUEVO -- inputs de edición inline (adicional/otros/comentarios), se
   ven en vez del texto normal de la celda cuando esa fila está en modo
   edición. */
.mn-edit-input {
  width:100%; max-width:90px; padding:4px 6px; border-radius:6px;
  border:1px solid var(--acc); background:var(--bg1); color:var(--tx0);
  font-family:inherit; font-size:11px; text-align:right; outline:none;
}
.mn-edit-input[type="text"] { max-width:160px; text-align:left; }
.row-editando-inline { background:var(--acc-dim) !important; }
.row-error-edicion td { padding:8px 10px; }

/* NUEVO -- progreso del quitar en lote, mismo patrón visual que el
   quitar/aprobar masivo del kanban (barra + porcentaje). */
.masivo-progreso { margin:10px 0; }
.chunk-bar-wrap { display:flex; align-items:center; gap:10px; }
.chunk-bar {
  flex:1; height:8px; border-radius:5px; background:var(--bg3);
  overflow:hidden;
}
.chunk-fill { height:100%; background:var(--acc); transition:width .2s ease; }
.chunk-pct { font-size:12px; color:var(--tx2); white-space:nowrap; }
</style>