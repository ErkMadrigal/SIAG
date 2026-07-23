<!--
  FatigaCapturaView.vue

  Vista única de captura -- reemplaza el flujo viejo (buscador + modal +
  subir Excel por separado). Todo pasa en la misma pantalla:
    1. Configuración del periodo
    2. Agregar empleados -- por búsqueda real en BD, o cargando un .xlsm
       (el Excel PRE-LLENA la cuadrícula, no abre nada aparte)
    3. Cuadrícula de captura -- días editables directo, y si algún
       empleado necesita corregir sus datos maestros (nombre/CURP/
       salario/modo), se expande INLINE en su misma fila -- sin modal.

  ── Blindaje agregado en esta pasada (2 bugs reportados sin resolver) ──

  BUG 1 -- inputs blanco sobre blanco en TODA la vista:
  Le agregué un valor de respaldo a CADA var(--xxx) usada en el <style>
  (ej. var(--bg2, #1a1f2e)) y forcé color-scheme: dark en la raíz. Esto
  hace que, pase lo que pase con la herencia de las variables del theme,
  los inputs ya NO puedan quedar invisibles -- van a verse con estos
  colores de respaldo aunque las variables reales fallen.
  ESTO NO ES EL FIX DE FONDO. El problema real (por qué esta vista no
  hereda --bg1/--bg2/--tx0/etc. del resto de la app) sigue sin
  diagnosticarse -- para eso necesito una de estas dos cosas:
    a) Un screenshot de la vista rota + abrir DevTools > Elements,
       clickear el <input> roto, pestaña "Computed", filtrar por "--" y
       ver si --bg2/--tx0 aparecen vacías ahí.
    b) El archivo de layout (AppShell.vue o como se llame) + cómo está
       montada la ruta de esta vista en el router, para confirmar que
       está anidada exactamente igual que tus otras vistas que sí
       heredan el theme.

  BUG 2 -- RESUELTO. El endpoint real es GET /empleados/buscar?search=...&limit=...
  (el parámetro se llama `search`, NO `q` -- por eso nunca filtraba nada,
  el backend simplemente ignoraba `q` y regresaba su listado por defecto).
  Ya se corrigió la llamada en `buscarDebounced`. Se deja el filtro en el
  cliente (`resultadosFiltrados`) nada más como red de seguridad, ya no
  como parche principal.

  Backend real confirmado:
    GET  /api/v1/empleados/buscar?search=...&limit=8
         -> { status, data: [{ id, nombre, curp, puesto, ubicacion_principal,
              estatus, fecha_ingreso, fecha_efectiva, acceso_biometrico }], total }
    POST /api/v1/nomina-fatiga/preview-xlsm   (ya lo tienes)
    POST /api/v1/nomina-fatiga/procesar-xlsm  (ya lo tienes -- lo
         reusamos mandando también las filas que se agregaron/editaron
         a mano, empacadas junto con el archivo si lo hay)
-->
<template>
  <div class="cap-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Nómina Fatiga · Captura</h1>
        <p class="view-sub">Agrega empleados a mano o carga un Excel — todo se edita aquí mismo</p>
      </div>
    </div>

    <!-- ════════════ ¿A dónde va esta captura? ════════════
         Igual que en "Cargar plantilla de nómina": nuevo lote desde
         cero, o complementar uno que ya está abierto (ej. le faltaron
         empleados y los vas a agregar por búsqueda). Al elegir un lote
         existente se trae la lista de quién ya está capturado ahí para
         avisar si intentas agregarlo de nuevo -- ver duplicadoEnLote(). -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-stack-2" aria-hidden="true"></i>
        <span>¿A dónde va esta captura?</span>
      </div>
      <div class="sec-body">
        <div class="lote-toggle">
          <button
            type="button"
            class="lote-toggle-opt"
            :class="{ active: modoLote === 'nuevo' }"
            @click="modoLote = 'nuevo'"
          >
            <div class="lto-icon"><i class="ti ti-folder-plus" aria-hidden="true"></i></div>
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
            <div class="lto-icon"><i class="ti ti-search" aria-hidden="true"></i></div>
            <div class="lto-text">
              <p class="lto-title">Agregar a lote existente</p>
              <p class="lto-sub">
                {{ cargandoLotes ? 'Cargando...' : `${lotesAbiertos.length} lote${lotesAbiertos.length === 1 ? '' : 's'} abierto${lotesAbiertos.length === 1 ? '' : 's'}` }}
              </p>
            </div>
            <span class="lto-badge" v-if="lotesAbiertos.length">{{ lotesAbiertos.length }}</span>
          </button>
        </div>

        <div v-if="modoLote === 'existente'" class="lote-select-wrap" ref="loteDropdownRef">
          <button
            type="button"
            class="lote-select-btn"
            :class="{ 'is-open': loteDropdownAbierto }"
            @click="loteDropdownAbierto = !loteDropdownAbierto"
          >
            <i class="ti ti-folder" aria-hidden="true"></i>
            <span v-if="loteSeleccionadoObj" class="lsb-texto">
              {{ loteSeleccionadoObj.nombre }}
              <span class="muted">— {{ loteSeleccionadoObj.total_empleados }} empleados ({{ loteSeleccionadoObj.cargas?.length || 0 }} cargas)</span>
            </span>
            <span v-else class="lsb-placeholder">Selecciona un lote...</span>
            <i class="ti ti-chevron-down lsb-chev" :class="{ 'is-open': loteDropdownAbierto }" aria-hidden="true"></i>
          </button>

          <div v-if="loteDropdownAbierto" class="lote-dropdown-list">
            <div
              v-for="l in lotesAbiertos"
              :key="l.id"
              class="lote-dropdown-item"
              :class="{ active: l.id === loteSeleccionado }"
              @click="loteSeleccionado = l.id; loteDropdownAbierto = false"
            >
              <div class="ldi-icon"><i class="ti ti-folder" aria-hidden="true"></i></div>
              <div class="ldi-info">
                <span class="ldi-nombre">{{ l.nombre }}</span>
                <span class="ldi-meta">{{ l.total_empleados }} empleados · {{ l.cargas?.length || 0 }} carga{{ (l.cargas?.length || 0) === 1 ? '' : 's' }}</span>
              </div>
              <i v-if="l.id === loteSeleccionado" class="ti ti-check ldi-check" aria-hidden="true"></i>
            </div>
          </div>

          <div v-if="loteSeleccionado" class="lote-preview">
            <span class="lp-label">
              <i v-if="cargandoDetalleLote" class="ti ti-loader-2 spin" aria-hidden="true"></i>
              Cargas ya incluidas en este lote:
            </span>
            <div class="lp-cargas">
              <span
                v-for="c in loteSeleccionadoObj?.cargas"
                :key="c.id"
                class="lote-badge"
                :class="'lote-badge--'+c.estatus"
              >
                {{ c.nombre_carga }} · {{ c.total_empleados }}
                <i v-if="c.estatus === 'completa'" class="ti ti-check" aria-hidden="true"></i>
                <i v-else class="ti ti-loader-2 spin" aria-hidden="true"></i>
              </span>
            </div>
            <p class="lp-hint" v-if="!cargandoDetalleLote">
              <i class="ti ti-info-circle" aria-hidden="true"></i>
              Ya tiene <strong>{{ empleadosEnLoteExistente.size }}</strong> empleado(s) capturado(s) --
              si agregas a alguien que ya está, te voy a avisar antes de duplicarlo.
            </p>
          </div>
        </div>

        <!-- NUEVO -- etiqueta de esta carga (texto libre, opcional). No es
             quién está logeado -- es para casos como "Erick logeado
             subiendo lo de Tadeo": luego se busca/filtra por "Tadeo" en el
             resumen de la nómina y se puede dar de baja todo ese grupo si
             algo salió mal. -->
        <div class="field field--etiqueta">
          <label>Etiqueta de esta carga <span class="opcional">(opcional)</span></label>
          <input
            v-model="etiquetaCarga"
            type="text"
            placeholder="Ej. Tadeo, sucursal norte, corrección..."
            maxlength="150"
          />
        </div>
      </div>
    </div>

    <!-- ════════════ Configuración del periodo -- solo para lote nuevo ════════════ -->
    <div class="sec" v-if="modoLote === 'nuevo'">
      <div class="sec-hdr">
        <i class="ti ti-calendar-cog" aria-hidden="true"></i>
        <span>Configuración del periodo</span>
      </div>
      <div class="sec-body">
        <div class="filtros-grid filtros-grid--4">
          <div class="field">
            <label>Nombre de la nómina <span class="req">*</span></label>
            <input v-model="periodo.nombre" type="text" placeholder="Ej. Nómina manual Q1 julio" />
          </div>
          <div class="field">
            <label>Días del periodo <span class="req">*</span></label>
            <input v-model.number="periodo.dias" type="number" min="1" max="31" />
          </div>
          <div class="field">
            <label>Periodo inicio</label>
            <input v-model="periodo.fechaInicio" type="date" />
          </div>
          <div class="field">
            <label>Periodo fin</label>
            <input v-model="periodo.fechaFin" type="date" />
          </div>
        </div>
      </div>
    </div>

    <!-- ════════════ Agregar empleados ════════════ -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-user-plus" aria-hidden="true"></i>
        <span>Agregar empleados</span>
      </div>
      <div class="sec-body">

        <!-- Arriba de todo -- antes estaban debajo del buscador/dropzone y
             el dropdown de resultados de búsqueda las tapaba por completo. -->
        <div v-if="errorXlsm" class="alert-warn">
          <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ errorXlsm }}
        </div>
        <div v-if="resumenCarga" class="alert-ok">
          <i class="ti ti-circle-check" aria-hidden="true"></i> {{ resumenCarga }}
        </div>

        <div class="agregar-grid">
          <!-- Búsqueda manual -->
          <div class="field">
            <label>Buscar por nombre, CURP o RFC</label>
            <div class="buscador-wrap">
              <i class="ti ti-search buscador-search-icon" aria-hidden="true"></i>
              <input
                v-model="qBusqueda"
                type="text"
                class="buscador-input"
                placeholder="erick, madrigal, ROVI950428..."
                @input="onBuscar"
              />
              <i v-if="buscando" class="ti ti-loader-2 spin buscador-spin" aria-hidden="true"></i>
              <button
                v-else-if="qBusqueda"
                type="button"
                class="buscador-clear"
                title="Limpiar"
                @click="qBusqueda = ''; resultadosBusqueda = []"
              >
                <i class="ti ti-x" aria-hidden="true"></i>
              </button>
              <div v-if="resultadosFiltrados.length" class="buscador-resultados">
                <div
                  v-for="e in resultadosFiltrados"
                  :key="idDe(e)"
                  class="buscador-item"
                  @click="agregarEmpleado(e)"
                >
                  <div class="buscador-avatar">{{ nombreDe(e).charAt(0) }}</div>
                  <div class="buscador-info">
                    <span class="buscador-nombre">{{ nombreDe(e) }}</span>
                    <span class="buscador-meta">
                      <span class="mono">{{ curpDe(e) }}</span>
                      <template v-if="puestoDe(e)"> · {{ puestoDe(e) }}</template>
                      <template v-if="ubicacionDe(e)"> · {{ ubicacionDe(e) }}</template>
                    </span>
                  </div>
                  <i class="ti ti-plus buscador-add" aria-hidden="true"></i>
                </div>
              </div>
              <div v-else-if="buscando" class="buscador-resultados">
                <div class="buscador-vacio"><i class="ti ti-loader-2 spin" aria-hidden="true"></i> Buscando...</div>
              </div>
              <div v-else-if="qBusqueda.trim().length >= 2 && buscando === false" class="buscador-resultados">
                <div class="buscador-vacio">Sin resultados — puedes darlo de alta al cargar un Excel de Altas</div>
              </div>
            </div>
          </div>

          <!-- Cargar Excel -->
          <div class="field">
            <label>O carga un Excel (.xlsm/.xlsx)</label>
            <div
              class="mini-dropzone"
              :class="{ 'is-dragging': isDragging, cargando: cargandoXlsm }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="onDrop"
              @click="!cargandoXlsm && inputFile.click()"
            >
              <input ref="inputFile" type="file" accept=".xlsx,.xls,.xlsm" class="hidden-input" @change="onFileSelected" />
              <template v-if="cargandoXlsm">
                <i class="ti ti-loader-2 spin" aria-hidden="true"></i> Leyendo archivo...
              </template>
              <template v-else>
                <i class="ti ti-cloud-upload" aria-hidden="true"></i>
                Arrastra o haz clic para cargar el Excel de fatiga
              </template>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- ════════════ Captura -- Asistencia / Altas / Bajas en pestañas ════════════ -->
    <div class="sec" v-if="empleados.length || altasCargadas.length || bajasCargadas.length">
      <div class="sec-hdr">
        <i class="ti ti-table" aria-hidden="true"></i>
        <span>Captura</span>
        <div class="tab-toggle">
          <button class="tab-btn" :class="{ active: tabActiva === 'asistencia' }" @click="tabActiva = 'asistencia'">
            Asistencia <span class="tab-count">{{ empleados.length }}</span>
          </button>
          <button class="tab-btn" :class="{ active: tabActiva === 'altas' }" @click="tabActiva = 'altas'">
            Altas <span class="tab-count">{{ altasCargadas.length }}</span>
          </button>
          <button class="tab-btn" :class="{ active: tabActiva === 'bajas' }" @click="tabActiva = 'bajas'">
            Bajas <span class="tab-count">{{ bajasCargadas.length }}</span>
          </button>
        </div>
      </div>
      <div class="sec-body">

        <!-- ── Pestaña: Altas (editable) ── -->
        <template v-if="tabActiva === 'altas'">
          <p class="claves-txt">
            Si la CURP ya existe se plancha (actualiza todo excepto CURP/RFC); estas ya están cargadas en la
            pestaña Asistencia. Si no existe, se da de alta al confirmar y guardar. Puedes corregir cualquier
            campo aquí directo si el Excel trae un error.
          </p>
          <div class="table-wrap" v-if="altasCargadas.length">
            <table>
              <thead>
                <tr>
                  <th style="width:36px"></th>
                  <th style="min-width:220px">Nombre</th>
                  <th style="width:170px">CURP</th>
                  <th style="width:100px">Turno</th>
                  <th style="width:130px">Puesto</th>
                  <th style="width:110px;text-align:right">Salario mensual</th>
                  <th style="width:160px">Estatus</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(a, idx) in altasCargadas" :key="idx">
                  <tr :class="{ 'row-editando': a.editando }">
                    <td style="text-align:center">
                      <button class="btn-icon" title="Ver / editar todos los campos" @click="a.editando = !a.editando">
                        <i class="ti ti-pencil" aria-hidden="true"></i>
                      </button>
                    </td>
                    <td style="font-weight:500">{{ a.nombre }} {{ a.paterno }} {{ a.materno }}</td>
                    <td class="mono" style="font-size:11px">{{ a.curp }}</td>
                    <td style="color:var(--tx2, #8a92a6);font-size:11px">{{ a._texto_turno || '—' }}</td>
                    <td style="color:var(--tx2, #8a92a6);font-size:11px">{{ a._texto_puesto || '—' }}</td>
                    <td style="text-align:right" class="mono">{{ formatoMoneda(a.salario_mensual) }}</td>
                    <td>
                      <span class="accion-badge" :class="a.accion === 'actualizar' ? 'actualiza' : 'nuevo'">
                        {{ a.accion === 'actualizar' ? 'Existe · se plancha' : 'Nuevo · se da de alta' }}
                      </span>
                    </td>
                  </tr>

                  <!-- Panel expandido -- TODOS los campos del template de Altas,
                       agrupados por tema en vez de una sola cuadrícula plana -->
                  <tr v-if="a.editando" class="row-edicion-inline">
                    <td colspan="7">
                      <div class="edicion-form">

                        <div class="form-seccion">
                          <div class="form-seccion-titulo"><i class="ti ti-id-badge-2" aria-hidden="true"></i> Identidad</div>
                          <div class="form-seccion-grid">
                            <div class="field">
                              <label>Nombre(s)</label>
                              <input v-model="a.nombre" />
                            </div>
                            <div class="field">
                              <label>Paterno</label>
                              <input v-model="a.paterno" />
                            </div>
                            <div class="field">
                              <label>Materno</label>
                              <input v-model="a.materno" />
                            </div>
                            <div class="field">
                              <label>CURP</label>
                              <input v-model="a.curp" class="mono" style="text-transform:uppercase" />
                            </div>
                            <div class="field">
                              <label>RFC</label>
                              <input v-model="a.rfc" class="mono" style="text-transform:uppercase" />
                            </div>
                          </div>
                        </div>

                        <div class="form-seccion">
                          <div class="form-seccion-titulo"><i class="ti ti-clipboard-heart" aria-hidden="true"></i> Datos generales</div>
                          <div class="form-seccion-grid">
                            <div class="field">
                              <label>NSS</label>
                              <input v-model="a.nss" class="mono" />
                            </div>
                            <div class="field">
                              <label>CP fiscal</label>
                              <input v-model="a.cp_fiscal" />
                            </div>
                            <div class="field">
                              <label>Alergia</label>
                              <input v-model="a.alergia" placeholder="Ninguna" />
                            </div>
                            <div class="field">
                              <label>Escolaridad</label>
                              <input v-model="a._texto_escolaridad" placeholder="Sin especificar" />
                            </div>
                            <div class="field">
                              <label>Tipo de sangre</label>
                              <input v-model="a._texto_tipo_sangre" placeholder="Ej. O+" />
                            </div>
                          </div>
                        </div>

                        <div class="form-seccion">
                          <div class="form-seccion-titulo"><i class="ti ti-phone-call" aria-hidden="true"></i> Contacto de emergencia</div>
                          <div class="form-seccion-grid form-seccion-grid--3">
                            <div class="field">
                              <label>Teléfono</label>
                              <input v-model="a.telefono_emergencia" class="mono" placeholder="Sin registrar" />
                            </div>
                            <div class="field">
                              <label>Nombre</label>
                              <input v-model="a.nombre_emergencia" placeholder="Sin registrar" />
                            </div>
                            <div class="field">
                              <label>Parentesco</label>
                              <input v-model="a._texto_parentesco" placeholder="Sin registrar" />
                            </div>
                          </div>
                        </div>

                        <div class="form-seccion">
                          <div class="form-seccion-titulo"><i class="ti ti-briefcase" aria-hidden="true"></i> Puesto y pago</div>
                          <div class="form-seccion-grid">
                            <div class="field">
                              <label>Turno</label>
                              <input v-model="a._texto_turno" placeholder="Ej. 24 x 24" />
                            </div>
                            <div class="field">
                              <label>Puesto</label>
                              <input v-model="a._texto_puesto" />
                            </div>
                            <div class="field">
                              <label>Periodicidad de pago</label>
                              <input v-model="a._texto_periodicidad" />
                            </div>
                            <div class="field">
                              <label>Fecha de alta</label>
                              <input v-model="a.fecha_alta" type="date" />
                            </div>
                            <div class="field">
                              <label>Modo</label>
                              <select v-model="a.modo">
                                <option value="tabulador">Tabulador</option>
                                <option value="salario">Salario</option>
                              </select>
                            </div>
                            <div class="field">
                              <label>Salario mensual (BD, ya ×2)</label>
                              <input v-model.number="a.salario_mensual" type="number" />
                            </div>
                          </div>
                        </div>

                        <div class="form-seccion form-seccion--last">
                          <div class="form-seccion-titulo"><i class="ti ti-building-bank" aria-hidden="true"></i> Datos bancarios</div>
                          <div class="form-seccion-grid form-seccion-grid--3">
                            <div class="field">
                              <label>Clabe interbancaria</label>
                              <input v-model="a.clabe_interbancaria" class="mono" />
                            </div>
                          </div>
                        </div>

                      </div>
                      <div class="edicion-inline-footer">
                        <span class="claves-txt">
                          <i class="ti ti-lock" aria-hidden="true"></i>
                          CURP y RFC nunca se sobrescriben en un empleado ya existente -- solo se usan para encontrarlo.
                        </span>
                        <button class="btn-sm" @click="a.editando = false">Listo</button>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            <i class="ti ti-user-off" aria-hidden="true"></i>
            <p>Sin altas detectadas -- carga un Excel con hoja "Altas" para verlas aquí</p>
          </div>
        </template>

        <!-- ── Pestaña: Bajas (editable) ── -->
        <template v-else-if="tabActiva === 'bajas'">
          <p class="claves-txt">Se procesan (estatus=0 en empleados) al confirmar y guardar. Puedes corregir cualquier campo si el Excel trae un error.</p>
          <div class="table-wrap" v-if="bajasCargadas.length">
            <table>
              <thead>
                <tr>
                  <th style="min-width:220px">Nombre</th>
                  <th style="width:100px">Número</th>
                  <th style="width:140px">Fecha efectiva</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, idx) in bajasCargadas" :key="idx">
                  <td><input v-model="b.nombre" class="input-inline" style="width:100%" /></td>
                  <td><input v-model.number="b.numero_empleado" type="number" class="input-inline" /></td>
                  <td><input v-model="b.fecha_efectiva" type="date" class="input-inline" /></td>
                  <td><input v-model="b.motivo_baja" class="input-inline" style="width:100%" /></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="empty-state">
            <i class="ti ti-user-off" aria-hidden="true"></i>
            <p>Sin bajas detectadas -- carga un Excel con hoja "Bajas" para verlas aquí</p>
          </div>
        </template>

        <!-- ── Pestaña: Asistencia (la cuadrícula) ── -->
        <template v-else>
        <div class="tabla-toolbar">
          <div class="buscador-tabla-wrap">
            <i class="ti ti-search" aria-hidden="true"></i>
            <input
              v-model="filtroTabla"
              type="text"
              class="buscador-tabla-input"
              placeholder="Filtrar por nombre, CURP o número de empleado..."
            />
            <button v-if="filtroTabla" type="button" class="buscador-tabla-clear" title="Limpiar" @click="filtroTabla = ''">
              <i class="ti ti-x" aria-hidden="true"></i>
            </button>
          </div>
          <span class="tabla-toolbar-count">
            {{ empleadosFiltrados.length }} de {{ empleados.length }} empleado{{ empleados.length === 1 ? '' : 's' }}
          </span>
        </div>
        <div class="table-wrap grid-asistencia">
          <table>
            <thead>
              <tr>
                <th style="min-width:210px">Empleado</th>
                <th style="min-width:150px">Servicio</th>
                <th style="width:60px"></th>
                <th v-for="(d, i) in diasArray" :key="i" class="th-dia">{{ d }}</th>
                <th style="width:80px;text-align:right">Adicional</th>
                <th style="width:80px;text-align:right">Desc.</th>
                <th style="min-width:160px">Comentarios</th>
                <th style="width:36px"></th>
              </tr>
            </thead>
            <tbody>
              <template v-if="!empleadosFiltrados.length">
                <tr><td :colspan="diasArray.length + 7" class="tabla-sin-resultados">Sin resultados para "{{ filtroTabla }}"</td></tr>
              </template>
              <template v-for="(emp, idx) in empleadosFiltrados" :key="emp._key">
                <tr :class="{ 'row-nuevo': emp.esNuevo, 'row-editando': emp.editando }">
                  <td>
                    <span v-if="emp.esNuevo" class="badge-nuevo">NUEVO</span>
                    <span class="mono" style="color:var(--tx2, #8a92a6);font-size:10px">{{ emp.id_empleado || '—' }}</span>
                    — {{ emp.nombre }} {{ emp.paterno }} {{ emp.materno }}
                    <div v-if="emp.curp" class="mono" style="font-size:10px;color:var(--tx3, #5b6274)">{{ emp.curp }}</div>
                  </td>
                  <td>
                    <input type="text" v-model="emp.servicio" class="input-comentario" placeholder="Sin especificar" />
                  </td>
                  <td style="text-align:center;white-space:nowrap">
                    <button class="btn-icon" title="Rellenar patrón" @click="abrirModalPatron(emp)">
                      <i class="ti ti-wand" aria-hidden="true"></i>
                    </button>
                    <button class="btn-icon" title="Editar datos del empleado" @click="emp.editando = !emp.editando">
                      <i class="ti ti-pencil" aria-hidden="true"></i>
                    </button>
                  </td>
                  <td v-for="(d, i) in diasArray" :key="i" class="td-dia">
                    <select v-model="emp.dias[i + 1]" :class="claveClass(emp.dias[i + 1])">
                      <option value="">—</option>
                      <option v-for="c in clavesDisponibles" :key="c" :value="c">{{ c }}</option>
                    </select>
                  </td>
                  <td style="text-align:right">
                    <input type="number" v-model.number="emp.adicional" class="input-num" />
                  </td>
                  <td style="text-align:right">
                    <input type="number" v-model.number="emp.otros_descuentos" class="input-num" />
                  </td>
                  <td>
                    <input type="text" v-model="emp.comentarios" class="input-comentario" placeholder="—" />
                  </td>
                  <td style="text-align:center">
                    <button class="btn-icon btn-icon--danger" title="Quitar de la lista" @click="quitarEmpleado(emp)">
                      <i class="ti ti-x" aria-hidden="true"></i>
                    </button>
                  </td>
                </tr>

                <!-- Fila expandida inline -- edición de datos maestros, sin modal.
                     Mismo patrón de tarjetas agrupadas que el panel de Altas, en
                     vez de la cuadrícula plana de 5 columnas que se veía chica. -->
                <tr v-if="emp.editando" class="row-edicion-inline">
                  <td :colspan="diasArray.length + 7">
                    <div class="edicion-form">

                      <div class="form-seccion">
                        <div class="form-seccion-titulo"><i class="ti ti-id-badge-2" aria-hidden="true"></i> Identidad</div>
                        <div class="form-seccion-grid">
                          <div class="field">
                            <label>Nombre(s)</label>
                            <input v-model="emp.nombre" />
                          </div>
                          <div class="field">
                            <label>Paterno</label>
                            <input v-model="emp.paterno" />
                          </div>
                          <div class="field">
                            <label>Materno</label>
                            <input v-model="emp.materno" />
                          </div>
                          <div class="field">
                            <label>CURP</label>
                            <input v-model="emp.curp" class="mono" style="text-transform:uppercase" />
                          </div>
                          <div class="field">
                            <label>RFC</label>
                            <input v-model="emp.rfc" class="mono" style="text-transform:uppercase" />
                          </div>
                        </div>
                      </div>

                      <div class="form-seccion">
                        <div class="form-seccion-titulo"><i class="ti ti-briefcase" aria-hidden="true"></i> Puesto y ubicación</div>
                        <div class="form-seccion-grid form-seccion-grid--3">
                          <div class="field">
                            <label>Turno</label>
                            <input v-model="emp.turno" placeholder="Ej. 24 x 24" />
                          </div>
                          <div class="field">
                            <label>Puesto</label>
                            <input v-model="emp.puesto" />
                          </div>
                          <div class="field">
                            <label>Servicio</label>
                            <input v-model="emp.servicio" placeholder="Sin especificar" />
                          </div>
                        </div>
                      </div>

                      <div class="form-seccion form-seccion--last">
                        <div class="form-seccion-titulo"><i class="ti ti-cash" aria-hidden="true"></i> Pago</div>
                        <div class="form-seccion-grid form-seccion-grid--3">
                          <div class="field">
                            <label>Salario capturado (quincenal)</label>
                            <input v-model.number="emp.salario_mensual" type="number" />
                          </div>
                          <div class="field">
                            <label>Modo</label>
                            <select v-model="emp.modo_sueldo">
                              <option value="tabulador">Tabulador</option>
                              <option value="salario">Salario</option>
                            </select>
                          </div>
                        </div>
                      </div>

                    </div>
                    <div class="edicion-inline-footer">
                      <span class="claves-txt">
                        {{ emp.esNuevo ? 'Se dará de alta al guardar.' : 'Se actualizarán estos datos al guardar (solo los campos con cambio).' }}
                      </span>
                      <button class="btn-sm" @click="emp.editando = false">Listo</button>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="claves-legend">
          <span class="claves-label">Claves:</span>
          <span class="clave-badge clave-descanso">D = Descanso</span>
          <span class="clave-badge clave-turno">24 = Turno 24x24</span>
          <span class="clave-badge clave-turno">12 = Turno 12x12</span>
          <span class="clave-badge clave-turno">8 = Turno 8x8</span>
          <span class="clave-badge clave-falta">F = Falta</span>
          <span class="clave-badge clave-incapacidad">I = Incapacidad</span>
          <span class="clave-badge clave-pcs">PCS = Permiso con goce</span>
          <span class="clave-badge clave-pss">PSS = Permiso sin goce</span>
          <span class="clave-badge clave-alta">A = Alta</span>
          <span class="clave-badge clave-baja">B = Baja</span>
          <span class="clave-badge clave-vacaciones">V = Vacaciones</span>
          <span class="clave-badge clave-extra">24E / 12E / 8E = Doblete</span>
        </div>
        </template>

        <!-- Errores y acciones -- visibles sin importar qué pestaña esté activa -->
        <div v-if="errorGuardar" class="alert-warn">
          <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ errorGuardar }}
        </div>

        <!-- Progreso del cálculo por chunks -- este paso es justo el que
             faltaba antes: sin esto la nómina se creaba pero se quedaba
             sin calcular, por eso "no hacía nada". -->
        <div v-if="calculando" class="calculo-progreso">
          <div class="calculo-progreso-txt">
            <i class="ti ti-loader-2 spin" aria-hidden="true"></i>
            Calculando {{ chunkProcesadas }} de {{ chunkTotal }} empleados...
          </div>
          <div class="chunk-bar-wrap">
            <div class="chunk-bar"><div class="chunk-fill" :style="{ width: pctCalculo + '%' }"></div></div>
            <span class="chunk-pct">{{ pctCalculo }}%</span>
          </div>
        </div>

        <!-- Resultado de guardar -- reemplaza el alert() nativo que se
             cerraba solo y no dejaba nada visible. Este banner se queda
             fijo en pantalla (con el total calculado y el resumen de
             deducciones si el backend lo trae) hasta que el usuario
             decide empezar una captura nueva. -->
        <div v-if="procesoExitoso" class="resultado-ok">
          <div class="resultado-ok-hdr">
            <div class="resultado-ok-icon"><i class="ti ti-circle-check" aria-hidden="true"></i></div>
            <div class="resultado-ok-txt">
              <strong>Nómina guardada y calculada correctamente</strong>
              <span class="muted">
                {{ nombreNominaGuardada || 'Sin nombre' }}
                <template v-if="totalNominaCalculada">· Total: {{ formatoMoneda(totalNominaCalculada) }}</template>
                <template v-if="idNominaGuardada">· #{{ idNominaGuardada }}</template>
              </span>
            </div>
            <button class="btn-sm" @click="nuevaCaptura">
              <i class="ti ti-plus" aria-hidden="true"></i> Nueva captura
            </button>
          </div>
          <div class="deducc-resumen" v-if="deduccionesResumen.length">
            <span v-for="d in deduccionesResumen" :key="d.tipo" class="deducc-pill">
              <i class="ti ti-check" aria-hidden="true"></i>
              {{ d.tipo.toUpperCase() }}: {{ formatoMoneda(d.total_quincenal) }}
              <span class="muted">({{ d.empleados }} emp.)</span>
            </span>
          </div>
        </div>

        <div class="filtros-actions">
          <button class="btn-sm" @click="limpiarTodo" :disabled="procesoExitoso">
            <i class="ti ti-refresh" aria-hidden="true"></i> Limpiar todo
          </button>
          <button class="btn-primary-lg" :disabled="!puedeGuardar || guardando || procesoExitoso" @click="guardarYCalcular">
            <i class="ti ti-loader-2 spin" v-if="guardando" aria-hidden="true"></i>
            <i class="ti ti-device-floppy" v-else aria-hidden="true"></i>
            {{ calculando ? 'Calculando...' : (guardando ? 'Guardando...' : (procesoExitoso ? 'Guardado' : 'Guardar y calcular nómina')) }}
          </button>
        </div>

      </div>
    </div>

    <div v-else class="empty-state empty-state--inline">
      <i class="ti ti-table-off" aria-hidden="true"></i>
      <p>Agrega empleados por búsqueda o cargando un Excel para empezar a capturar</p>
    </div>

    <!-- ════════════ MODAL — Rellenar patrón ════════════ -->
    <Teleport to="body">
      <div v-if="mostrarModalPatron" class="modal-overlay" @click.self="cerrarModalPatron">
        <div class="modal-box">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-wand" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Rellenar patrón</p>
              <p class="modal-sub">{{ empleadoPatronNombre }}</p>
            </div>
            <button class="modal-close" @click="cerrarModalPatron"><i class="ti ti-x" aria-hidden="true"></i></button>
          </div>

          <div class="modal-body-content">
            <div class="field">
              <label>Patrón a repetir <span class="claves-txt">(ej. D, 24 alterna descanso/trabajo)</span></label>
              <div class="patron-selects">
                <select v-model="formPatron.valorA">
                  <option value="">—</option>
                  <option v-for="c in clavesDisponibles" :key="c" :value="c">{{ c }}</option>
                </select>
                <select v-model="formPatron.valorB">
                  <option value="">—</option>
                  <option v-for="c in clavesDisponibles" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <p class="claves-txt" style="margin-top:2px">
                Si dejas el segundo en "—", se repite solo el primer valor en todos los días.
              </p>
            </div>

            <div class="field">
              <label>Día inicial del patrón</label>
              <input v-model.number="formPatron.diaInicial" type="number" min="1" :max="diasArray.length" />
            </div>

            <div v-if="errorPatron" class="alert-warn">
              <i class="ti ti-alert-circle" aria-hidden="true"></i> {{ errorPatron }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="cerrarModalPatron">Cancelar</button>
            <button class="btn-primary-lg" @click="aplicarPatron">
              <i class="ti ti-check" aria-hidden="true"></i> Aplicar
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import api from '@/services/api.js'
// El mismo servicio que ya usa tu vista de "Cargar plantilla de nómina"
// (la que sí calcula) -- procesarXlsm() crea el lote/altas/bajas, y
// procesarChunk() hace el cálculo real en lotes. Ver guardarYCalcular().
import { nominaFatigaService } from '@/services/Nominafatiga.service.js'

/* ── Periodo ──────────────────────────────────────────────────── */
const periodo = reactive({
  nombre: '',
  dias: 15,
  fechaInicio: '',
  fechaFin: '',
})

/* ── Lote: nuevo o complementar uno existente ───────────────────
   Mismo patrón que ProcesarXlsmView.vue. Al elegir un lote existente,
   se trae su detalle real (GET /nomina-fatiga/:id -- el mismo que ya
   usa el modal de resumen) para saber qué empleados ya están adentro y
   poder avisar si se intenta agregar a alguno de nuevo. */
const modoLote = ref('nuevo') // 'nuevo' | 'existente'
const lotesAbiertos = ref([])
const cargandoLotes = ref(false)
const loteSeleccionado = ref(null)

// NUEVO -- etiqueta de texto libre para ESTA carga en concreto (no del
// lote completo). Sirve para casos como "estoy logeado como Erick pero
// estoy subiendo a la gente de Tadeo" -- luego en el modal de resumen se
// puede buscar/filtrar por esta etiqueta y dar de baja en lote si algo
// salió mal. Es independiente de quién subió (eso ya se guarda solo, vía
// sesión/JWT).
const etiquetaCarga = ref('')

const empleadosEnLoteExistente = ref(new Set())   // ids/numero_empleado ya capturados
const nombresEnLoteExistente = ref({})            // id -> nombre, nada más para el mensaje de aviso
const cargandoDetalleLote = ref(false)

// Dropdown propio para elegir lote -- el <select> nativo se ve horrible al
// abrirse (lista gris del sistema operativo que ningún CSS puede tocar),
// así que aquí se dibuja una lista propia con el mismo estilo que el
// buscador de empleados. loteSeleccionado sigue siendo la misma fuente de
// verdad (el id), nada más cambia cómo se elige.
const loteDropdownAbierto = ref(false)
const loteDropdownRef = ref(null)
const loteSeleccionadoObj = computed(() => lotesAbiertos.value.find((l) => l.id === loteSeleccionado.value) || null)

function onClickFueraLoteDropdown(e) {
  if (loteDropdownRef.value && !loteDropdownRef.value.contains(e.target)) {
    loteDropdownAbierto.value = false
  }
}
onMounted(() => document.addEventListener('click', onClickFueraLoteDropdown))
onUnmounted(() => document.removeEventListener('click', onClickFueraLoteDropdown))

async function cargarLotesAbiertos() {
  cargandoLotes.value = true
  try {
    const { data } = await api.get('/nomina-fatiga/lotes-abiertos')
    lotesAbiertos.value = data.data || []
  } catch (err) {
    console.error('[fatiga-captura] error cargando lotes abiertos:', err)
  } finally {
    cargandoLotes.value = false
  }
}
onMounted(cargarLotesAbiertos)

// watch (no @change) para no depender del orden entre el v-model del
// <select> y un listener manual en el mismo evento -- así se dispara
// siempre que el ref cambie, venga de donde venga.
watch(loteSeleccionado, onSeleccionarLote)

async function onSeleccionarLote() {
  empleadosEnLoteExistente.value = new Set()
  nombresEnLoteExistente.value = {}
  if (!loteSeleccionado.value) return

  cargandoDetalleLote.value = true
  try {
    const { data } = await api.get(`/nomina-fatiga/${loteSeleccionado.value}`)
    const detalle = data.data?.detalle || []
    const set = new Set()
    const nombres = {}
    detalle.forEach((d) => {
      // id_empleado es lo confiable para deduplicar (numero_empleado);
      // si algún día no viene, cae a nombre_excel nada más para no
      // perder el aviso por completo.
      const clave = d.id_empleado != null ? String(d.id_empleado) : null
      if (clave) {
        set.add(clave)
        nombres[clave] = d.nombre_excel
      }
    })
    empleadosEnLoteExistente.value = set
    nombresEnLoteExistente.value = nombres
  } catch (err) {
    console.error('[fatiga-captura] error cargando detalle del lote:', err)
  } finally {
    cargandoDetalleLote.value = false
  }
}

// true si el empleado (por id) ya está capturado en el lote elegido
function duplicadoEnLote(id) {
  return modoLote.value === 'existente' && empleadosEnLoteExistente.value.has(String(id))
}

// Lista de días REALES (como en tu xlsx: 28, 29, 30, 1, 2... 12 -- no un
// contador ciego 1..N). Prioridad:
//   1) Si ya cargaste un Excel, usa el orden real que mandó el backend
//      (dias_columnas -- ver nota en procesarArchivoXlsm más abajo).
//   2) Si no, pero ya capturaste la fecha de inicio del periodo, calcula
//      los días de calendario reales a partir de esa fecha.
//   3) Si no hay ni Excel ni fecha todavía, cae en 1..N solo para no
//      dejar la cuadrícula vacía mientras el usuario llena el formulario.
//
// OJO: el número que se ve en la columna (real, ej. "28") es solo la
// ETIQUETA. Los datos de cada empleado (emp.dias) se guardan con llaves
// 1..N por POSICIÓN, no con el número real -- si usáramos el número real
// como llave, JavaScript reordena solo los objetos con llaves numéricas
// de forma ascendente (28,29,30,1,2... se volvería 1,2...12,28,29,30) y
// se perdería el orden cronológico real. Por eso la posición (índice) es
// la fuente de verdad para el cálculo, y el número real es solo lo que
// se muestra en el encabezado.
const diasColumnas = ref([]) // ej. [28,29,30,1,2,3,4,5,6,7,8,9,10,11,12] -- viene del backend al cargar un Excel

const diasArray = computed(() => {
  const n = periodo.dias || 15

  if (diasColumnas.value.length) {
    return diasColumnas.value.slice(0, n)
  }

  if (periodo.fechaInicio) {
    const [anio, mes, dia] = periodo.fechaInicio.split('-').map(Number)
    const base = new Date(anio, mes - 1, dia)
    return Array.from({ length: n }, (_, i) => {
      const d = new Date(base)
      d.setDate(base.getDate() + i)
      return d.getDate()
    })
  }

  return Array.from({ length: n }, (_, i) => i + 1)
})

const clavesDisponibles = ['D', '24', '12', '8', 'F', 'I', 'PCS', 'PSS', 'A', 'B', 'V', '24E', '12E', '8E']

/* ── Búsqueda real contra BD ──────────────────────────────────── */
const qBusqueda = ref('')
const resultadosBusqueda = ref([])
const buscando = ref(false)

const buscarDebounced = useDebounceFn(async () => {
  const q = qBusqueda.value.trim()
  if (q.length < 2) { resultadosBusqueda.value = []; return }
  buscando.value = true
  try {
    // Confirmado con el endpoint real: el parámetro se llama `search`
    // (no `q`) y acepta `limit`. Con `q` el backend lo ignoraba por
    // completo y regresaba su listado por defecto -- de ahí el bug.
    const { data } = await api.get('/empleados/buscar', { params: { search: q, limit: 8 } })
    resultadosBusqueda.value = data.data ?? []
  } catch (e) {
    resultadosBusqueda.value = []
    console.error('[fatiga-captura] error /empleados/buscar:', e?.response?.status, e?.response?.data || e)
  } finally {
    buscando.value = false
  }
}, 300)

function onBuscar() { buscarDebounced() }

// Red de seguridad -- ahora que el backend filtra bien con `search`, esto
// normalmente no quita nada; se deja nada más por si algún día regresa
// algo de más.
const resultadosFiltrados = computed(() => {
  const q = qBusqueda.value.trim().toLowerCase()
  if (q.length < 2) return []
  return resultadosBusqueda.value.filter((e) => {
    const nombre = nombreDe(e).toLowerCase()
    const curp = String(e.curp || e.CURP || '').toLowerCase()
    const rfc = String(e.rfc || e.RFC || '').toLowerCase()
    return nombre.includes(q) || curp.includes(q) || rfc.includes(q)
  })
})

function nombreDe(e) {
  return (
    e.nombre || e.nombre_completo || e.nombreCompleto ||
    [e.nombre, e.apellido_paterno || e.paterno, e.apellido_materno || e.materno].filter(Boolean).join(' ').trim() ||
    '(sin nombre)'
  )
}
function curpDe(e) { return e.curp || e.CURP || '—' }
function idDe(e) { return e.id ?? e.id_empleado ?? e.ID ?? '—' }
function puestoDe(e) { return e.puesto || e._texto_puesto || '' }
function ubicacionDe(e) { return e.ubicacion_principal || e.ubicacion || e.servicio || '' }

function formatoMoneda(v) {
  const n = Number(v) || 0
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── Altas / Bajas detectadas en el Excel -- solo para mostrarlas ────
   (las altas también se mezclan en la cuadrícula como antes; esto es
   nada más una lista de confirmación aparte, igual para las bajas que
   antes no se veían por ningún lado) ─────────────────────────────── */
const altasCargadas = ref([])
const bajasCargadas = ref([])

/* ── Lista de empleados en captura ───────────────────────────── */
let contadorKey = 0
const empleados = ref([])
const tabActiva = ref('asistencia') // 'asistencia' | 'altas' | 'bajas'

function nuevaFilaVacia(base = {}) {
  // Guarda por POSICIÓN (1..N), no por el número real del día -- ver nota
  // grande junto a diasArray. base.dias (si viene del Excel) sí está
  // etiquetado con el número real (28, 29, 30, 1...), así que lo leemos
  // por ese número real (diasArray.value[i]) pero lo guardamos en la
  // llave posicional (i+1) para que el orden cronológico nunca se pierda.
  const dias = {}
  diasArray.value.forEach((labelReal, i) => {
    dias[i + 1] = base.dias?.[labelReal] ?? ''
  })
  return {
    _key: contadorKey++,
    id_empleado: base.id_empleado ?? base.id ?? null,
    curp: base.curp || base.CURP || '',
    rfc: base.rfc || base.RFC || '',
    nombre: base.nombre || '',
    paterno: base.apellido_paterno || base.paterno || '',
    materno: base.apellido_materno || base.materno || '',
    turno: base.turno || base._texto_turno || '',
    puesto: base.puesto || base._texto_puesto || '',
    // Viene de la hoja Asistencia del Excel (columna Servicio/ID_servicio).
    // El backend ya lo resuelve contra el catálogo real (tabla `servicios`)
    // -- aquí solo se recibe y se deja editar si hace falta corregirlo.
    servicio: base.servicio || base._texto_servicio || '',
    id_servicio: base.id_servicio ?? null,
    salario_mensual: Number(base.salario_mensual || base.salario || 0),
    modo_sueldo: base.modo_sueldo || 'tabulador',
    adicional: Number(base.adicional || 0),
    otros_descuentos: Number(base.otros_descuentos || 0),
    comentarios: base.comentarios || '',
    dias,
    esNuevo: base.esNuevo ?? !base.id_empleado,
    editando: false,
  }
}

function agregarEmpleado(e) {
  const id = idDe(e)
  const yaExiste = empleados.value.some((emp) => emp.id_empleado && emp.id_empleado === id)
  if (yaExiste) {
    errorXlsm.value = `${nombreDe(e)} ya está en la lista`
    setTimeout(() => { errorXlsm.value = '' }, 2500)
    return
  }
  // Si estás complementando un lote existente, avisa en vez de dejar
  // duplicar a alguien que ya quedó capturado en una carga anterior.
  if (duplicadoEnLote(id)) {
    errorXlsm.value = `${nombreDe(e)} (#${id}) ya está capturado en este lote -- evita duplicarlo`
    setTimeout(() => { errorXlsm.value = '' }, 3500)
    return
  }
  // El endpoint de búsqueda no manda `servicio`/`id_servicio` -- lo que sí
  // trae es `ubicacion_principal`, que es el mismo concepto (dónde está
  // asignado el empleado). Se usa como servicio para que no se quede en
  // blanco cuando se agrega por búsqueda en vez de por Excel.
  empleados.value.push(nuevaFilaVacia({ ...e, id_empleado: id, servicio: ubicacionDe(e), esNuevo: false }))
  qBusqueda.value = ''
  resultadosBusqueda.value = []
}

// Recibe el objeto (no el índice) porque la tabla ahora se puede filtrar --
// el índice visible en la fila filtrada ya no coincide con el índice real
// dentro de empleados.value, así que se busca por _key para no quitar a la
// persona equivocada.
function quitarEmpleado(emp) {
  const idx = empleados.value.findIndex((e) => e._key === emp._key)
  if (idx !== -1) empleados.value.splice(idx, 1)
}

/* ── Filtro de la tabla de Asistencia -- para no perderte entre hasta
   1000 filas cargadas de un Excel grande. Filtra sobre lo que ya está
   en memoria, no pega al backend. ────────────────────────────────── */
const filtroTabla = ref('')
const empleadosFiltrados = computed(() => {
  const q = filtroTabla.value.trim().toLowerCase()
  if (!q) return empleados.value
  return empleados.value.filter((emp) => {
    const nombreCompleto = `${emp.nombre} ${emp.paterno} ${emp.materno}`.toLowerCase()
    const curp = String(emp.curp || '').toLowerCase()
    const idEmp = String(emp.id_empleado ?? '')
    return nombreCompleto.includes(q) || curp.includes(q) || idEmp.includes(q)
  })
})

function limpiarTodo() {
  empleados.value = []
  filtroTabla.value = ''
  errorXlsm.value = ''
  errorGuardar.value = ''
  resumenCarga.value = ''
  diasColumnas.value = []
  archivoOriginal.value = null
  altasCargadas.value = []
  bajasCargadas.value = []
}

/* ── Rellenar patrón -- evita llenar día por día a mano ─────────── */
const mostrarModalPatron = ref(false)
const empleadoPatronActual = ref(null)
const errorPatron = ref('')
const formPatron = reactive({
  valorA: '',
  valorB: '',
  diaInicial: 1,
})

const empleadoPatronNombre = computed(() => {
  const emp = empleadoPatronActual.value
  if (!emp) return ''
  return `${emp.nombre} ${emp.paterno} ${emp.materno}`.trim()
})

function abrirModalPatron(emp) {
  empleadoPatronActual.value = emp
  formPatron.valorA = ''
  formPatron.valorB = ''
  formPatron.diaInicial = 1
  errorPatron.value = ''
  mostrarModalPatron.value = true
}

function cerrarModalPatron() {
  mostrarModalPatron.value = false
  empleadoPatronActual.value = null
}

function aplicarPatron() {
  if (!formPatron.valorA) {
    errorPatron.value = 'Elige al menos el primer valor del patrón'
    return
  }
  const emp = empleadoPatronActual.value
  if (!emp) return

  const valores = formPatron.valorB ? [formPatron.valorA, formPatron.valorB] : [formPatron.valorA]
  const inicio = Math.min(Math.max(1, formPatron.diaInicial || 1), diasArray.value.length)

  let vi = 0
  for (let d = inicio; d <= diasArray.value.length; d++) {
    emp.dias[d] = valores[vi % valores.length]
    vi++
  }

  cerrarModalPatron()
}

function claveClass(valor) {
  const v = String(valor || '').toUpperCase()
  if (!v) return 'clave-vacio'
  const mapa = {
    D: 'clave-descanso', F: 'clave-falta', I: 'clave-incapacidad',
    PCS: 'clave-pcs', PSS: 'clave-pss', A: 'clave-alta', B: 'clave-baja',
    V: 'clave-vacaciones', '24': 'clave-turno', '12': 'clave-turno', '8': 'clave-turno',
    '24E': 'clave-extra', '12E': 'clave-extra', '8E': 'clave-extra',
  }
  return mapa[v] || 'clave-normal'
}

/* ── Carga de Excel -- pre-llena la MISMA cuadrícula ────────────── */
const isDragging = ref(false)
const cargandoXlsm = ref(false)
const errorXlsm = ref('')
const resumenCarga = ref('')
const inputFile = ref(null)
const archivoOriginal = ref(null)

/* ── Resultado de guardar y calcular -- reemplaza el alert() nativo ── */
const procesoExitoso = ref(false)
const resultadoNomina = ref(null)
const deduccionesResumen = ref([])
const nombreNominaGuardada = ref('')

function onDrop(e) {
  isDragging.value = false
  const archivo = e.dataTransfer?.files?.[0]
  if (archivo) procesarArchivoXlsm(archivo)
}
function onFileSelected(e) {
  const archivo = e.target.files?.[0]
  if (archivo) procesarArchivoXlsm(archivo)
}

async function procesarArchivoXlsm(archivo) {
  if (!/\.(xlsx|xls|xlsm)$/i.test(archivo.name)) {
    errorXlsm.value = 'El archivo debe ser .xlsx, .xls o .xlsm'
    return
  }

  archivoOriginal.value = archivo
  errorXlsm.value = ''
  resumenCarga.value = ''
  cargandoXlsm.value = true

  const formData = new FormData()
  formData.append('archivo', archivo)

  try {
    const { data } = await api.post('/nomina-fatiga/preview-xlsm', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (data.status !== 'ok') {
      errorXlsm.value = data.message || 'No se pudo procesar el archivo'
      return
    }

    const altas = data.data.altas || []
    const asistencia = data.data.asistencia || []
    const bajas = data.data.bajas || []

    // Listas de solo-confirmación -- independientes de que se mezclen
    // (o no) con la cuadrícula de abajo. Así SIEMPRE se ven, aunque el
    // match por CURP entre Altas y Asistencia falle por alguna razón.
    // `editando` es solo del cliente (para el panel expandible) -- el
    // backend no lo manda.
    altasCargadas.value = altas.map((a) => ({ ...a, editando: false }))
    bajasCargadas.value = bajas

    // Días REALES en el orden verdadero del Excel (ej. 28,29,30,1,2...12) --
    // viene del backend como ARRAY (los arrays sí preservan orden en JS,
    // a diferencia de los objetos con llaves numéricas). Esto tiene que
    // asignarse ANTES de construir las filas de abajo (nuevaFilaVacia usa
    // diasArray para saber qué días leer de cada fila del Excel).
    if (Array.isArray(data.data.dias_columnas) && data.data.dias_columnas.length) {
      diasColumnas.value = data.data.dias_columnas
      periodo.dias = data.data.dias_columnas.length
    }

    // Índice de altas por CURP, para saber si un empleado de Asistencia
    // también viene con datos maestros nuevos/corregidos en Altas
    const altasPorCurp = {}
    altas.forEach((a) => { if (a.curp) altasPorCurp[a.curp.toUpperCase()] = a })

    let agregados = 0
    let omitidosPorLote = 0
    asistencia.forEach((fila) => {
      const altaRelacionada = fila.curp ? altasPorCurp[String(fila.curp).toUpperCase()] : null
      const base = altaRelacionada ? { ...fila, ...altaRelacionada, dias: fila.dias } : fila
      const idBase = base.id_empleado ?? base.id

      const yaExiste = empleados.value.some((emp) => emp.id_empleado && emp.id_empleado === idBase)
      if (yaExiste) return

      // Si estás complementando un lote existente, no metas de nuevo a
      // quien ya quedó capturado en una carga anterior de ese mismo lote.
      if (idBase && duplicadoEnLote(idBase)) {
        omitidosPorLote++
        return
      }

      empleados.value.push(nuevaFilaVacia({
        ...base,
        esNuevo: !base.id_empleado,
        editando: !!altaRelacionada, // si trae datos de alta, abre la edición inline de una vez
      }))
      agregados++
    })

    resumenCarga.value = `Se cargaron ${agregados} empleado(s) desde el Excel` +
      (bajas.length ? ` · ${bajas.length} baja(s) detectada(s) (se procesan al guardar)` : '') +
      (omitidosPorLote ? ` · ${omitidosPorLote} omitido(s) por ya estar en este lote` : '')

  } catch (e) {
    const status = e?.response?.status
    console.error('[fatiga-captura] error /nomina-fatiga/preview-xlsm:', status, e?.response?.data || e)
    errorXlsm.value = e?.response?.data?.message || 'No se pudo leer el archivo -- revisa la consola para el detalle.'
  } finally {
    cargandoXlsm.value = false
    if (inputFile.value) inputFile.value.value = ''
  }
}

/* ── Guardar ──────────────────────────────────────────────────── */
const guardando = ref(false)
const errorGuardar = ref('')

// Progreso del cálculo por chunks (paso 2 -- ver guardarYCalcular)
const chunkTotal = ref(0)
const chunkProcesadas = ref(0)
const totalNominaCalculada = ref(0)
const idNominaGuardada = ref(null)

const pctCalculo = computed(() =>
  chunkTotal.value ? Math.round((chunkProcesadas.value / chunkTotal.value) * 100) : 0
)
const calculando = computed(() => guardando.value && chunkTotal.value > 0)

const puedeGuardar = computed(() => {
  if (empleados.value.length === 0) return false
  if (modoLote.value === 'existente') return !!loteSeleccionado.value
  return periodo.nombre.trim().length > 0 && periodo.dias > 0
})

/*
  ── Por qué "no procesaba nada" ─────────────────────────────────────
  Antes esta función hacía UN solo POST a /procesar-xlsm y, si regresaba
  status:'ok', asumía que la nómina ya estaba calculada. FALSO: según tu
  vista real de "Cargar plantilla de nómina" (la que sí funciona),
  /procesar-xlsm nada más CREA el lote y procesa altas/bajas -- regresa
  un `asistencia.id_nomina` + `asistencia.total`, pero el CÁLCULO real
  (ISR, IMSS, faltas, etc.) se hace aparte, en LOTES ("chunks"), llamando
  repetido a procesarChunk(id_nomina, tamaño) hasta que el backend
  regresa `completo:true`. Sin ese loop, el lote se crea pero se queda
  sin calcular -- exactamente el síntoma que describiste ("no hace el
  cálculo", "no se va a nóminas": el registro nunca llega a estado
  terminado). Ya lo agregué, calcado de tu vista que sí funciona, usando
  el mismo `nominaFatigaService` en vez de armar el POST a mano.
*/
async function guardarYCalcular() {
  if (!puedeGuardar.value) return
  guardando.value = true
  errorGuardar.value = ''
  chunkTotal.value = 0
  chunkProcesadas.value = 0
  totalNominaCalculada.value = 0

  // Si NO hay archivo cargado (agregaste todo por búsqueda), ya no se
  // bloquea con el error -- se manda por el endpoint nuevo
  // /nomina-fatiga/guardar-manual, que calcula todo directo desde JSON
  // sin necesitar volver a leer un Excel (sirve tanto para lote nuevo
  // como para complementar uno existente).
  if (!archivoOriginal.value) {
    await guardarManualSinArchivo()
    return
  }

  const formData = new FormData()
  if (modoLote.value === 'existente') {
    // Complementando un lote que ya existe -- igual que en tu vista de
    // "Cargar plantilla de nómina" (iniciarProceso), se manda id_nomina
    // en vez de nombre/periodo.
    formData.append('id_nomina', loteSeleccionado.value)
  } else {
    formData.append('nombre', periodo.nombre.trim())
    formData.append('periodo_inicio', periodo.fechaInicio || '')
    formData.append('periodo_fin', periodo.fechaFin || '')
  }
  formData.append('archivo', archivoOriginal.value)
  if (etiquetaCarga.value.trim()) formData.append('etiqueta', etiquetaCarga.value.trim())

  // Las filas capturadas/editadas a mano, y las altas/bajas tal como
  // quedaron después de que el usuario las corrigió en sus pestañas, se
  // mandan también por si algún día el backend las prioriza -- hoy
  // procesar-xlsm no las lee (solo re-parsea el archivo), pero mandarlas
  // no rompe nada y evita tener que retocar el frontend cuando ese
  // cambio de backend se haga.
  formData.append('filas_manual', JSON.stringify(empleados.value.map((emp) => ({
    id_empleado: emp.id_empleado,
    curp: emp.curp,
    rfc: emp.rfc,
    nombre: emp.nombre,
    paterno: emp.paterno,
    materno: emp.materno,
    turno: emp.turno,
    puesto: emp.puesto,
    servicio: emp.servicio,
    id_servicio: emp.id_servicio,
    salario_mensual: emp.salario_mensual,
    modo_sueldo: emp.modo_sueldo,
    adicional: emp.adicional,
    otros_descuentos: emp.otros_descuentos,
    comentarios: emp.comentarios,
    dias: emp.dias,
  }))))
  formData.append('altas_manual', JSON.stringify(altasCargadas.value))
  formData.append('bajas_manual', JSON.stringify(bajasCargadas.value))

  try {
    // Paso 1 -- crea el lote / procesa altas y bajas.
    const res = await nominaFatigaService.procesarXlsm(formData)
    if (res.status !== 'ok') {
      errorGuardar.value = res.message || 'No se pudo guardar'
      return
    }
    resultadoNomina.value = res.data || null

    const asist = res.data?.asistencia
    if (!asist || !asist.id_nomina) {
      // No vino info de asistencia/id_nomina -- se guardaron altas/bajas
      // pero no hay nada que calcular por chunks.
      nombreNominaGuardada.value = nombreParaMostrar()
      procesoExitoso.value = true
      return
    }

    // Paso 2 -- el cálculo real, en lotes de 100, hasta terminar. Esto
    // es lo que antes faltaba por completo.
    const idNomina = asist.id_nomina
    chunkTotal.value = asist.total || 0
    let completo = false
    while (!completo) {
      const chunk = await nominaFatigaService.procesarChunk(idNomina, 100)
      if (chunk.status !== 'ok') {
        errorGuardar.value = chunk.message || 'Error calculando la nómina'
        return
      }
      chunkProcesadas.value = chunk.data?.filas_procesadas ?? chunkProcesadas.value
      completo = chunk.data?.completo === true
      if (completo) {
        chunkProcesadas.value = chunkTotal.value
        totalNominaCalculada.value = chunk.data?.total_pagar ?? 0
      }
    }

    nombreNominaGuardada.value = nombreParaMostrar()
    idNominaGuardada.value = idNomina
    procesoExitoso.value = true
  } catch (e) {
    errorGuardar.value = e?.response?.data?.message || 'Error de red al guardar'
    console.error('[fatiga-captura] error al guardar:', e?.response?.data || e)
  } finally {
    guardando.value = false
  }
}

/*
  Captura SIN Excel (todo por búsqueda) -- llama al endpoint nuevo
  /nomina-fatiga/guardar-manual, que calcula todo directo desde JSON
  (mismo cálculo real que usa tu flujo de xlsm por dentro -- tabulador
  por zona/puesto, faltas, etc.) sin necesitar volver a leer un archivo.
  Sirve tanto para lote nuevo como para complementar uno existente
  (manda id_nomina solo si modoLote === 'existente'). A diferencia del
  flujo con Excel, este endpoint regresa el resultado YA calculado en
  una sola llamada -- no hace falta el loop de chunks del lado del
  cliente (el backend lo hace internamente).
*/
async function guardarManualSinArchivo() {
  const payload = {
    nombre: modoLote.value === 'existente' ? undefined : periodo.nombre.trim(),
    periodo_inicio: modoLote.value === 'existente' ? undefined : (periodo.fechaInicio || null),
    periodo_fin: modoLote.value === 'existente' ? undefined : (periodo.fechaFin || null),
    id_nomina: modoLote.value === 'existente' ? loteSeleccionado.value : undefined,
    etiqueta: etiquetaCarga.value.trim() || undefined,
    filas: empleados.value.map((emp) => ({
      id_empleado: emp.id_empleado,
      id_servicio: emp.id_servicio,
      servicio: emp.servicio,
      nombre: `${emp.nombre} ${emp.paterno} ${emp.materno}`.trim(),
      dias: emp.dias,
      adicional: emp.adicional,
      otros_descuentos: emp.otros_descuentos,
      comentarios: emp.comentarios,
    })),
  }

  try {
    const { data } = await api.post('/nomina-fatiga/guardar-manual', payload)
    if (data.status !== 'ok') {
      errorGuardar.value = data.message || 'No se pudo guardar'
      return
    }
    totalNominaCalculada.value = data.data?.total_pagar ?? 0
    idNominaGuardada.value = data.data?.id_nomina ?? null
    nombreNominaGuardada.value = nombreParaMostrar()
    procesoExitoso.value = true
  } catch (e) {
    errorGuardar.value = e?.response?.data?.message || 'Error de red al guardar'
    console.error('[fatiga-captura] error al guardar (manual):', e?.response?.data || e)
  } finally {
    guardando.value = false
  }
}

// Nombre a mostrar en el banner de éxito -- si fue a un lote existente,
// usa el nombre real del lote (el campo periodo.nombre ni se llenó).
function nombreParaMostrar() {
  if (modoLote.value === 'existente') {
    const lote = lotesAbiertos.value.find((l) => l.id === loteSeleccionado.value)
    return lote?.nombre || `Lote #${loteSeleccionado.value}`
  }
  return periodo.nombre.trim()
}

function nuevaCaptura() {
  procesoExitoso.value = false
  resultadoNomina.value = null
  deduccionesResumen.value = []
  nombreNominaGuardada.value = ''
  chunkTotal.value = 0
  chunkProcesadas.value = 0
  totalNominaCalculada.value = 0
  idNominaGuardada.value = null
  modoLote.value = 'nuevo'
  loteSeleccionado.value = null
  etiquetaCarga.value = ''
  empleadosEnLoteExistente.value = new Set()
  nombresEnLoteExistente.value = {}
  limpiarTodo()
  cargarLotesAbiertos() // refresca conteos -- el lote que se acaba de complementar ya cambió
}
</script>

<style scoped>
/*
  BUG 1 -- blindaje contra inputs invisibles.
  Cada var(--xxx) de aquí en adelante trae un segundo argumento de
  respaldo (var(--xxx, #valor)). Si las variables reales del theme no
  llegan a esta vista por la razón que sea, el navegador usa el color de
  respaldo en vez de caer en blanco-sobre-blanco. Los valores de
  respaldo son un dark theme genérico razonable -- ajústalos si no
  calzan con tu paleta real una vez que confirmes cuáles son tus valores
  verdaderos de --bg1/--tx0/etc.
*/
.cap-view {
  display:flex; flex-direction:column; gap:14px;
  color-scheme: dark; /* evita que el navegador fuerce su propio esquema de color en los <input>/<select> nativos */
}
.view-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; }
.view-title  { font-size:20px; font-weight:600; color:var(--tx0, #f1f3f9); }
.view-sub    { font-size:12px; color:var(--tx2, #8a92a6); margin-top:3px; }

/* OJO -- antes tenía overflow:hidden, nada más para redondear la esquina
   de arriba. Pero eso también recortaba CUALQUIER cosa que necesitara
   flotar fuera de la tarjeta (el dropdown del buscador de empleados, el
   dropdown del selector de lote) -- por eso se veían "empujados" adentro
   de la card en vez de flotar por encima. .sec-hdr no pinta su propio
   fondo, así que quitar overflow:hidden no rompe el borde redondeado. */
.sec { background:var(--bg1, #12151f); border:0.5px solid var(--bdr, #262c3d); border-radius:12px; }
.sec-hdr {
  display:flex; align-items:center; gap:8px;
  padding:12px 16px; border-bottom:0.5px solid var(--bdr, #262c3d);
  border-radius:12px 12px 0 0;
  font-size:13px; font-weight:500; color:var(--tx0, #f1f3f9); flex-wrap:wrap;
}
.sec-hdr i  { font-size:16px; color:var(--acc, #4f8cff); }
.sec-body   { padding:16px; display:flex; flex-direction:column; gap:14px; }

.filtros-grid       { display:grid; grid-template-columns:1fr 120px 160px 160px; gap:12px; }
.filtros-grid--4     { grid-template-columns:1fr 120px 160px 160px; }
.agregar-grid        { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }

/* ── Lote: nuevo o complementar existente ────────────────────────── */
.lote-toggle { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
.lote-toggle-opt {
  position:relative; display:flex; align-items:center; gap:12px;
  padding:14px 16px; border-radius:12px; border:1.5px solid var(--bdr2, #333a52);
  background:var(--bg2, #1a1f2e); cursor:pointer; text-align:left;
  transition:all .18s; font-family:inherit;
}
.lote-toggle-opt:hover:not(.disabled) { border-color:var(--acc, #4f8cff); background:var(--acc-dim, rgba(79,140,255,.14)); }
.lote-toggle-opt.active { border-color:var(--acc, #4f8cff); background:var(--acc-dim, rgba(79,140,255,.14)); box-shadow:0 0 0 1px var(--acc, #4f8cff); }
.lote-toggle-opt.disabled { opacity:.45; cursor:not-allowed; }
.lto-icon {
  width:38px; height:38px; border-radius:10px; flex-shrink:0;
  background:var(--bg3, #232a3d); color:var(--tx2, #8a92a6);
  display:flex; align-items:center; justify-content:center; font-size:18px;
  transition:all .18s;
}
.lote-toggle-opt.active .lto-icon { background:var(--acc, #4f8cff); color:#fff; }
.lto-title { font-size:13px; font-weight:600; color:var(--tx0, #f1f3f9); }
.lto-sub { font-size:11px; color:var(--tx2, #8a92a6); margin-top:2px; }
.lto-badge {
  position:absolute; top:10px; right:10px;
  background:var(--acc, #4f8cff); color:#fff; font-size:10px; font-weight:700;
  min-width:18px; height:18px; border-radius:20px;
  display:flex; align-items:center; justify-content:center; padding:0 5px;
}

.lote-select-wrap { margin-top:4px; position:relative; }

/* Dropdown propio -- reemplaza al <select> nativo. El botón se ve igual
   que los demás inputs del theme; la lista que se abre es 100% nuestra
   (mismo lenguaje visual que .buscador-resultados), así que ya no
   depende del estilo feo que el sistema operativo le pone a un <select>
   nativo cuando lo abres. */
.lote-select-btn {
  width:100%; display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:10px;
  border:1.5px solid var(--bdr2, #333a52); background:var(--bg2, #1a1f2e);
  color:var(--tx0, #f1f3f9); font-size:13px; font-family:inherit;
  cursor:pointer; outline:none; text-align:left; transition:border-color .15s, box-shadow .15s;
}
.lote-select-btn:hover { border-color:var(--tx3, #5b6274); }
.lote-select-btn.is-open { border-color:var(--acc, #4f8cff); box-shadow:0 0 0 3px var(--acc-dim, rgba(79,140,255,.14)); }
.lote-select-btn > i:first-child { font-size:15px; color:var(--acc, #4f8cff); flex-shrink:0; }
.lsb-texto { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.lsb-texto .muted { font-size:12px; }
.lsb-placeholder { flex:1; color:var(--tx3, #5b6274); }
.lsb-chev { font-size:13px; color:var(--tx2, #8a92a6); flex-shrink:0; transition:transform .15s; }
.lsb-chev.is-open { transform:rotate(180deg); }

.lote-dropdown-list {
  position:absolute; top:100%; left:0; right:0; z-index:20; margin-top:8px;
  background:var(--bg1, #12151f); border:0.5px solid var(--bdr2, #333a52); border-radius:14px;
  max-height:280px; overflow-y:auto; box-shadow:0 16px 40px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3);
  padding:6px; animation:buscadorIn .14s ease-out;
}
.lote-dropdown-item {
  padding:9px 10px; cursor:pointer; display:flex; align-items:center; gap:11px;
  border-radius:10px; transition:background .12s;
}
.lote-dropdown-item + .lote-dropdown-item { margin-top:1px; }
.lote-dropdown-item:hover { background:var(--bg2, #1a1f2e); }
.lote-dropdown-item.active { background:var(--acc-dim, rgba(79,140,255,.14)); }
.ldi-icon {
  width:32px; height:32px; border-radius:50%; flex-shrink:0;
  background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff);
  display:flex; align-items:center; justify-content:center; font-size:14px;
}
.lote-dropdown-item.active .ldi-icon { background:var(--acc, #4f8cff); color:#fff; }
.ldi-info { display:flex; flex-direction:column; gap:2px; min-width:0; flex:1; }
.ldi-nombre { font-size:13px; color:var(--tx0, #f1f3f9); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ldi-meta { font-size:11px; color:var(--tx2, #8a92a6); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ldi-check { color:var(--acc, #4f8cff); font-size:15px; flex-shrink:0; }

.lote-preview { margin-top:12px; padding:12px 14px; border-radius:10px; background:var(--bg2, #1a1f2e); border:0.5px solid var(--bdr, #262c3d); }
.lp-label { font-size:11px; color:var(--tx2, #8a92a6); display:flex; align-items:center; gap:6px; margin-bottom:8px; }
.lp-cargas { display:flex; flex-wrap:wrap; gap:6px; }
.lote-badge {
  display:inline-flex; align-items:center; gap:4px;
  font-size:10.5px; padding:4px 9px; border-radius:20px;
  background:var(--bg3, #232a3d); color:var(--tx2, #8a92a6); border:0.5px solid var(--bdr2, #333a52);
}
.lote-badge--completa { background:rgba(34,201,122,.1); color:var(--grn, #22c97a); border-color:var(--grn, #22c97a); }
.lote-badge--procesando { background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff); border-color:var(--acc, #4f8cff); }
.lote-badge i { font-size:10px; }
.lp-hint {
  display:flex; align-items:center; gap:6px; margin-top:10px; padding-top:10px;
  border-top:0.5px solid var(--bdr2, #333a52); font-size:11.5px; color:var(--tx2, #8a92a6);
}
.lp-hint i { color:var(--acc, #4f8cff); flex-shrink:0; }

.field { display:flex; flex-direction:column; gap:6px; }
label  { font-size:12px; font-weight:500; color:var(--tx1, #c7cede); }
.req   { color:var(--red, #f05454); }
.opcional { color:var(--tx3, #5b6274); font-weight:400; }
.field--etiqueta { margin-top:14px; max-width:420px; }
input[type="text"], input[type="date"], input[type="number"], select {
  background:var(--bg2, #1a1f2e); border:0.5px solid var(--bdr2, #333a52);
  border-radius:9px; padding:9px 11px;
  font-size:13px; color:var(--tx0, #f1f3f9); outline:none;
  font-family:inherit; transition:border-color .15s, box-shadow .15s; width:100%;
}
input:hover, select:hover { border-color:var(--tx3, #5b6274); }
input:focus, select:focus {
  border-color:var(--acc, #4f8cff);
  box-shadow: 0 0 0 3px var(--acc-dim, rgba(79,140,255,.14));
}
::placeholder { color:var(--tx3, #5b6274); opacity:1; }

/* Los <select> nativos traen su propia flechita fea del sistema operativo
   que no combina con nada del theme -- se apaga y se dibuja una propia,
   consistente con el resto de los íconos. */
select {
  appearance:none; -webkit-appearance:none; -moz-appearance:none;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a92a6' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 12px center;
  padding-right:30px; cursor:pointer;
}
/* autofill de Chrome puede pintar su propio bg/color por encima de todo -- lo forzamos también */
input:-webkit-autofill, input:-webkit-autofill:hover, input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--tx0, #f1f3f9);
  -webkit-box-shadow: 0 0 0px 1000px var(--bg2, #1a1f2e) inset;
  transition: background-color 9999s ease-in-out 0s;
}

.buscador-wrap { position:relative; }
.buscador-search-icon {
  position:absolute; left:12px; top:50%; transform:translateY(-50%);
  font-size:15px; color:var(--tx3, #5b6274); pointer-events:none; z-index:1;
}
.buscador-input { padding-left:36px !important; padding-right:32px !important; }
.buscador-spin {
  position:absolute; right:11px; top:50%; transform:translateY(-50%);
  font-size:14px; color:var(--acc, #4f8cff);
}
.buscador-clear {
  position:absolute; right:7px; top:50%; transform:translateY(-50%);
  width:22px; height:22px; border-radius:50%; border:none; cursor:pointer;
  background:var(--bg3, #232a3d); color:var(--tx2, #8a92a6);
  display:flex; align-items:center; justify-content:center; font-size:11px;
  transition:all .12s;
}
.buscador-clear:hover { background:var(--red-dim, rgba(240,84,84,.14)); color:var(--red, #f05454); }

.buscador-resultados {
  position:absolute; top:100%; left:0; right:0; z-index:20; margin-top:8px;
  background:var(--bg1, #12151f); border:0.5px solid var(--bdr2, #333a52); border-radius:14px;
  max-height:300px; overflow-y:auto; box-shadow:0 16px 40px rgba(0,0,0,.5), 0 2px 8px rgba(0,0,0,.3);
  padding:6px; animation:buscadorIn .14s ease-out;
}
@keyframes buscadorIn {
  from { opacity:0; transform:translateY(-6px); }
  to   { opacity:1; transform:translateY(0); }
}
.buscador-item {
  padding:9px 10px; cursor:pointer; display:flex; align-items:center; gap:11px;
  border-radius:10px; transition:background .12s;
}
.buscador-item + .buscador-item { margin-top:1px; }
.buscador-item:hover { background:var(--bg2, #1a1f2e); }
.buscador-item:hover .buscador-add { opacity:1; transform:scale(1); }
.buscador-item:hover .buscador-avatar { background:var(--acc, #4f8cff); color:#fff; }
.buscador-avatar {
  width:32px; height:32px; border-radius:50%; flex-shrink:0;
  background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff);
  display:flex; align-items:center; justify-content:center;
  font-size:12px; font-weight:700; text-transform:uppercase;
  transition:all .12s;
}
.buscador-info { display:flex; flex-direction:column; gap:3px; min-width:0; flex:1; }
.buscador-nombre { font-size:13px; color:var(--tx0, #f1f3f9); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.buscador-meta { font-size:11px; color:var(--tx2, #8a92a6); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.buscador-meta .mono { font-family:monospace; }
.buscador-add {
  flex-shrink:0; width:22px; height:22px; border-radius:50%;
  background:var(--acc-dim, rgba(79,140,255,.14));
  display:flex; align-items:center; justify-content:center;
  font-size:12px; color:var(--acc, #4f8cff);
  opacity:0; transform:scale(.7); transition:all .12s;
}
.buscador-vacio { padding:16px 12px; font-size:12px; color:var(--tx2, #8a92a6); text-align:center; display:flex; align-items:center; justify-content:center; gap:6px; }

.mini-dropzone {
  border:1.5px dashed var(--bdr2, #333a52); border-radius:10px; padding:14px;
  display:flex; align-items:center; justify-content:center; gap:8px;
  font-size:12.5px; color:var(--tx2, #8a92a6); cursor:pointer; transition:all .15s; background:var(--bg2, #1a1f2e);
}
.mini-dropzone:hover { border-color:var(--acc, #4f8cff); background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff); }
.mini-dropzone.is-dragging { border-color:var(--acc, #4f8cff); background:var(--acc-dim, rgba(79,140,255,.14)); }
.mini-dropzone.cargando { cursor:default; opacity:.7; }
.hidden-input { display:none; }

.alert-warn { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; background:var(--amb-dim, rgba(245,166,35,.14)); border:0.5px solid var(--amb, #f5a623); color:var(--amb, #f5a623); font-size:13px; }
.alert-ok   { display:flex; align-items:center; gap:8px; padding:10px 14px; border-radius:8px; background:rgba(34,201,122,.1); border:0.5px solid var(--grn, #22c97a); color:var(--grn, #22c97a); font-size:13px; }

.muted { color:var(--tx2, #8a92a6); font-weight:400; }

/* Barra de progreso del cálculo por chunks */
.calculo-progreso {
  padding:14px 16px; border-radius:12px;
  background:var(--acc-dim, rgba(79,140,255,.14)); border:0.5px solid var(--acc, #4f8cff);
  display:flex; flex-direction:column; gap:8px;
}
.calculo-progreso-txt { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--tx0, #f1f3f9); }
.chunk-bar-wrap { display:flex; align-items:center; gap:8px; }
.chunk-bar { flex:1; height:6px; background:var(--bg3, #232a3d); border-radius:6px; overflow:hidden; }
.chunk-fill {
  height:100%; border-radius:6px;
  background:linear-gradient(90deg, var(--acc, #4f8cff), var(--acc2, #7aa8ff));
  transition:width .4s ease;
}
.chunk-pct { font-size:11px; color:var(--acc, #4f8cff); font-weight:600; min-width:32px; text-align:right; }

/* Banner de resultado -- reemplaza al alert() nativo. Se queda fijo en
   pantalla en vez de un popup que se cierra solo y no deja rastro. */
.resultado-ok {
  border-radius:12px; padding:14px 16px;
  background:linear-gradient(180deg, rgba(34,201,122,.1) 0%, rgba(34,201,122,.04) 100%);
  border:0.5px solid var(--grn, #22c97a);
  display:flex; flex-direction:column; gap:12px;
}
.resultado-ok-hdr { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.resultado-ok-icon {
  width:34px; height:34px; border-radius:50%; flex-shrink:0;
  background:rgba(34,201,122,.18); color:var(--grn, #22c97a);
  display:flex; align-items:center; justify-content:center; font-size:18px;
}
.resultado-ok-txt { display:flex; flex-direction:column; gap:2px; flex:1; min-width:150px; }
.resultado-ok-txt strong { font-size:13.5px; color:var(--tx0, #f1f3f9); }
.resultado-ok-txt .muted { font-size:11.5px; }

.deducc-resumen { display:flex; gap:8px; flex-wrap:wrap; }
.deducc-pill {
  display:inline-flex; align-items:center; gap:5px;
  font-size:11px; padding:4px 11px; border-radius:20px;
  background:rgba(34,201,122,.1); color:var(--grn, #22c97a);
  border:0.5px solid var(--grn, #22c97a);
}
.deducc-pill i { font-size:11px; }
.deducc-pill .muted { color:inherit; opacity:.7; }

.badge-warn {
  display:inline-block; font-size:9px; padding:1px 6px;
  border-radius:4px; background:var(--red-dim, rgba(240,84,84,.14));
  color:var(--red, #f05454); font-weight:700; margin-right:5px; vertical-align:middle;
}

.item-count { margin-left:auto; font-size:11px; padding:2px 8px; border-radius:20px; background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff); font-weight:500; }

.empty-state { display:flex; flex-direction:column; align-items:center; gap:8px; padding:40px 20px; color:var(--tx3, #5b6274); }
.empty-state i { font-size:28px; }
.empty-state p { font-size:13px; }
.empty-state--inline { background:var(--bg1, #12151f); border:0.5px solid var(--bdr, #262c3d); border-radius:12px; }

.table-wrap { overflow-x:auto; border:0.5px solid var(--bdr, #262c3d); border-radius:10px; }
/* Con cargas de hasta 1000 personas, dejar que la tabla crezca sin límite
   arrastraba TODA la página en un scroll gigante. Aquí se le pone un alto
   fijo y el scroll se queda adentro de la tabla -- el <thead> ya traía
   position:sticky arriba, así que ahora sí sirve de algo. */
.grid-asistencia { max-height:560px; overflow-y:auto; }
table { width:100%; border-collapse:collapse; }
th {
  padding:8px 10px; text-align:left; font-size:10px; font-weight:500; color:var(--tx2, #8a92a6);
  text-transform:uppercase; letter-spacing:.6px; border-bottom:0.5px solid var(--bdr, #262c3d);
  white-space:nowrap; background:var(--bg2, #1a1f2e); position:sticky; top:0; z-index:1;
}
td { padding:6px 8px; font-size:12px; border-bottom:0.5px solid var(--bdr, #262c3d); color:var(--tx0, #f1f3f9); vertical-align:middle; }
tr.row-nuevo td { background:rgba(34,201,122,.04); }
tr.row-editando td { background:var(--acc-dim, rgba(79,140,255,.14)); }
.mono { font-family:monospace; }

.badge-nuevo {
  display:inline-block; font-size:9px; padding:1px 6px; border-radius:4px;
  background:rgba(34,201,122,.15); color:var(--grn, #22c97a); font-weight:700; margin-right:5px; vertical-align:middle;
}

.tabla-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
.buscador-tabla-wrap { position:relative; flex:1; min-width:220px; max-width:420px; }
.buscador-tabla-wrap > i:first-child {
  position:absolute; left:12px; top:50%; transform:translateY(-50%);
  font-size:14px; color:var(--tx3, #5b6274); pointer-events:none;
}
.buscador-tabla-input { padding:8px 32px 8px 34px !important; font-size:12.5px !important; }
.buscador-tabla-clear {
  position:absolute; right:7px; top:50%; transform:translateY(-50%);
  width:20px; height:20px; border-radius:50%; border:none; cursor:pointer;
  background:var(--bg3, #232a3d); color:var(--tx2, #8a92a6);
  display:flex; align-items:center; justify-content:center; font-size:10px;
  transition:all .12s;
}
.buscador-tabla-clear:hover { background:var(--red-dim, rgba(240,84,84,.14)); color:var(--red, #f05454); }
.tabla-toolbar-count { font-size:11.5px; color:var(--tx2, #8a92a6); white-space:nowrap; }
.tabla-sin-resultados { text-align:center; padding:24px 12px !important; color:var(--tx2, #8a92a6); font-size:12.5px; }

.th-dia { width:44px; text-align:center; padding:6px 2px !important; }
.td-dia { padding:3px 2px !important; }
.td-dia select {
  width:44px; padding:4px 2px; font-size:10px; text-align:center; text-align-last:center;
  border-radius:5px; font-weight:600; font-family:monospace;
}

.clave-vacio       { background:var(--bg2, #1a1f2e); color:var(--tx3, #5b6274); }
.clave-descanso    { background:var(--bg3, #232a3d); color:var(--tx1, #c7cede); }
.clave-turno       { background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff); border-color:var(--acc, #4f8cff) !important; }
.clave-falta       { background:var(--red-dim, rgba(240,84,84,.14)); color:var(--red, #f05454); border-color:var(--red, #f05454) !important; }
.clave-incapacidad { background:#2d1b4d; color:#a855f7; border-color:#a855f7 !important; }
.clave-pcs         { background:var(--amb-dim, rgba(245,166,35,.14)); color:var(--amb, #f5a623); border-color:var(--amb, #f5a623) !important; }
.clave-pss         { background:rgba(245,166,35,.24); color:#c2790a; border-color:#c2790a !important; }
.clave-alta        { background:rgba(34,201,122,.14); color:var(--grn, #22c97a); border-color:var(--grn, #22c97a) !important; }
.clave-baja        { background:var(--red-dim, rgba(240,84,84,.14)); color:var(--red, #f05454); border-color:var(--red, #f05454) !important; }
.clave-vacaciones  { background:rgba(34,201,122,.14); color:var(--grn, #22c97a); border-color:var(--grn, #22c97a) !important; }
.clave-extra       { background:rgba(34,190,201,.18); color:#22c9c9; border-color:#22c9c9 !important; }
.clave-normal      { background:var(--bg2, #1a1f2e); color:var(--tx0, #f1f3f9); }

.input-num {
  width:70px; text-align:right; padding:5px 6px; font-size:11px; font-family:monospace;
}
/* Quita las flechitas feas del navegador en los inputs numéricos --
   se ven mejor lisos, consistentes con el resto del theme */
input[type="number"] { -moz-appearance:textfield; }
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance:none; margin:0;
}
.input-comentario {
  width:100%; min-width:150px; padding:5px 8px; font-size:11px;
}
.input-inline {
  padding:5px 8px; font-size:11px; width:100%;
}

/* Pestañas (Asistencia / Altas / Bajas) */
.tab-toggle { display:flex; gap:4px; margin-left:auto; flex-wrap:wrap; }
.tab-btn {
  display:flex; align-items:center; gap:5px;
  padding:5px 11px; border-radius:8px; border:none;
  background:var(--bg2, #1a1f2e); color:var(--tx2, #8a92a6);
  font-size:11px; font-weight:500; cursor:pointer;
  transition:all .15s; font-family:inherit;
}
.tab-btn:hover  { color:var(--tx0, #f1f3f9); }
.tab-btn.active { background:var(--acc, #4f8cff); color:#fff; }
.tab-count {
  font-size:10px; padding:0 5px; border-radius:20px;
  background:rgba(255,255,255,.18);
}
.tab-btn:not(.active) .tab-count { background:var(--bg3, #232a3d); color:var(--tx2, #8a92a6); }

.btn-icon {
  width:26px; height:26px; border-radius:6px; border:0.5px solid var(--bdr2, #333a52);
  background:var(--bg2, #1a1f2e); color:var(--tx2, #8a92a6); cursor:pointer; display:inline-flex;
  align-items:center; justify-content:center; font-size:13px; transition:all .15s;
}
.btn-icon:hover { background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff); border-color:var(--acc, #4f8cff); }
.btn-icon--danger:hover { background:var(--red-dim, rgba(240,84,84,.14)); color:var(--red, #f05454); border-color:var(--red, #f05454); }

/*
  Antes el fondo de esta fila (--bg2) era IDÉNTICO al fondo de los
  inputs de adentro (--bg2), así que todo se veía como un bloque plano
  sin bordes visibles ("se ve de la verga"). Ahora el panel usa --bg1
  (más oscuro/recesado) para que los inputs --bg2 (más claros) resalten
  encima, como una tarjeta dentro de un cajón.
*/
.row-edicion-inline td {
  background:var(--bg1, #12151f);
  padding:16px 18px;
  border-top:1px solid var(--bdr2, #333a52);
  border-bottom:1px solid var(--bdr2, #333a52);
}
.edicion-inline-grid {
  display:grid; grid-template-columns:repeat(5, minmax(120px, 1fr)); gap:12px 14px;
}
.edicion-inline-grid label {
  font-size:11px; color:var(--tx2, #8a92a6); text-transform:uppercase; letter-spacing:.4px;
}
.edicion-inline-grid input, .edicion-inline-grid select {
  background:var(--bg2, #1a1f2e);
  border:0.5px solid var(--bdr2, #333a52);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.25);
}
.edicion-inline-footer {
  display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  margin-top:14px; padding-top:12px; border-top:0.5px solid var(--bdr2, #333a52);
}
.edicion-inline-footer .claves-txt { display:flex; align-items:center; gap:6px; }

/* ── Form agrupado (panel de Altas) --
   antes era una sola cuadrícula plana de 19 inputs idénticos ("se ve re
   ogt"). Ahora se agrupa por tema en tarjetas con su propio título, y
   cada tarjeta tiene su propia cuadrícula responsiva -- así hay
   jerarquía visual real en vez de un muro de cajas grises. ──────────── */
.edicion-form { display:flex; flex-direction:column; gap:12px; }
.form-seccion {
  padding:16px 18px; border-radius:14px;
  background:linear-gradient(180deg, var(--bg2, #1a1f2e) 0%, var(--bg1, #12151f) 100%);
  border:0.5px solid var(--bdr, #262c3d);
  box-shadow:0 1px 0 rgba(255,255,255,.02) inset, 0 6px 16px rgba(0,0,0,.18);
}
.form-seccion-titulo {
  display:flex; align-items:center; gap:9px;
  font-size:11.5px; font-weight:700; color:var(--tx1, #c7cede);
  text-transform:uppercase; letter-spacing:.6px; margin-bottom:14px;
}
.form-seccion-titulo i {
  width:24px; height:24px; border-radius:8px; flex-shrink:0;
  background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff);
  display:flex; align-items:center; justify-content:center; font-size:13px;
}
/*
  Antes eran 5 columnas por fila -- con tantos campos angostos apretados
  uno junto a otro, cada input se veía chico y "precario" comparado con
  el de Salario mensual (que por estar solo en su fila tenía todo el
  espacio para él). Ahora TODOS los campos usan como máximo 3 por fila,
  con más padding y letra más grande -- todos se ven igual de "grandes"
  y respiran igual que el de Salario, ya no nada más el que queda solo.
*/
.form-seccion-grid {
  display:grid; grid-template-columns:repeat(3, minmax(180px, 1fr)); gap:18px 20px;
}
.form-seccion-grid--3 { grid-template-columns:repeat(3, minmax(180px, 1fr)); }
.form-seccion .field { gap:8px; }
.form-seccion .field label { color:var(--tx1, #c7cede); font-size:12px; }
.form-seccion .field input, .form-seccion .field select {
  background:var(--bg1, #12151f);
  border:0.5px solid var(--bdr2, #333a52);
  box-shadow:inset 0 1px 3px rgba(0,0,0,.3);
  font-size:14px; padding:11px 14px; border-radius:10px;
}
.form-seccion .field input::placeholder { color:var(--tx3, #5b6274); font-style:italic; }

/* Modal genérico (Rellenar patrón, etc.) */
.modal-overlay {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  z-index:9999; display:flex; align-items:center; justify-content:center; padding:16px;
}
.modal-box {
  background:var(--bg1, #12151f); border:0.5px solid var(--bdr2, #333a52);
  border-radius:16px; width:100%; max-width:440px;
  display:flex; flex-direction:column; overflow:hidden; max-height:90vh;
}
.modal-hdr {
  display:flex; align-items:center; gap:12px;
  padding:14px 18px; border-bottom:0.5px solid var(--bdr, #262c3d); flex-shrink:0;
}
.modal-icon {
  width:34px; height:34px; border-radius:10px;
  background:var(--acc-dim, rgba(79,140,255,.14)); color:var(--acc, #4f8cff);
  display:flex; align-items:center; justify-content:center; font-size:17px; flex-shrink:0;
}
.modal-title { font-size:14px; font-weight:600; color:var(--tx0, #f1f3f9); }
.modal-sub   { font-size:11px; color:var(--tx2, #8a92a6); margin-top:2px; }
.modal-close {
  margin-left:auto; width:28px; height:28px; border-radius:6px;
  background:var(--bg3, #232a3d); border:none; cursor:pointer;
  color:var(--tx2, #8a92a6); font-size:16px;
  display:flex; align-items:center; justify-content:center;
}
.modal-body-content {
  padding:16px 18px; overflow-y:auto;
  display:flex; flex-direction:column; gap:14px;
}
.modal-footer {
  padding:12px 18px; border-top:0.5px solid var(--bdr, #262c3d);
  display:flex; justify-content:flex-end; gap:8px; flex-shrink:0;
}
.patron-selects { display:grid; grid-template-columns:1fr 1fr; gap:10px; }

.claves-legend { display:flex; flex-wrap:wrap; align-items:center; gap:6px; }
.claves-label  { font-size:11px; color:var(--tx2, #8a92a6); font-weight:500; margin-right:2px; }
.clave-badge {
  display:inline-flex; align-items:center; justify-content:center; padding:3px 8px;
  border-radius:5px; font-size:10px; font-weight:600; font-family:monospace; white-space:nowrap;
}
.claves-txt { font-size:11px; color:var(--tx2, #8a92a6); }

.accion-badge {
  display:inline-block; font-size:10px; padding:3px 9px; border-radius:20px;
  font-weight:600; text-transform:uppercase; letter-spacing:.3px; white-space:nowrap;
}
.accion-badge.actualiza { background:var(--amb-dim, rgba(245,166,35,.14)); color:var(--amb, #f5a623); }
.accion-badge.nuevo     { background:rgba(34,201,122,.14); color:var(--grn, #22c97a); }

.filtros-actions { display:flex; justify-content:space-between; gap:8px; }

.btn-sm {
  display:inline-flex; align-items:center; gap:5px; padding:7px 14px; border-radius:8px;
  border:0.5px solid var(--bdr2, #333a52); background:transparent; font-size:12px; color:var(--tx1, #c7cede);
  cursor:pointer; transition:all .15s; font-family:inherit;
}
.btn-sm:hover { background:var(--bg3, #232a3d); }

.btn-primary-lg {
  display:inline-flex; align-items:center; gap:6px; padding:8px 20px; border-radius:8px;
  border:none; background:var(--acc, #4f8cff); font-size:13px; color:#fff; cursor:pointer;
  font-family:inherit; font-weight:500; transition:background .15s;
}
.btn-primary-lg:hover:not(:disabled) { background:var(--acc2, #3f74e0); }
.btn-primary-lg:disabled { opacity:.6; cursor:not-allowed; }

@keyframes spin { to { transform:rotate(360deg); } }
.spin { display:inline-block; animation:spin .8s linear infinite; }

@media (max-width:900px) {
  .filtros-grid--4 { grid-template-columns:1fr 1fr; }
  .agregar-grid { grid-template-columns:1fr; }
  .edicion-inline-grid { grid-template-columns:1fr 1fr; }
  .form-seccion-grid, .form-seccion-grid--3 { grid-template-columns:1fr 1fr; }
  .lote-toggle { grid-template-columns:1fr; }
}
</style>