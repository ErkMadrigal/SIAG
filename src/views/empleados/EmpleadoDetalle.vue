<template>
  <div class="detalle-emp" v-if="empleado">

    <!-- Header perfil -->
    <div class="perfil-header">
      <button class="btn-back" @click="router.back()">
        <i class="ti ti-arrow-left" aria-hidden="true"></i>
      </button>

      <div class="perfil-av-wrap">
        <img v-if="empleado.fotos" :src="empleado.fotos" class="perfil-foto foto-click" title="Ver foto" @click="showFotoModal = true" />
        <div v-else class="perfil-av" :style="{ background: avatarBg, color: avatarColor }">
          {{ initials }}
        </div>
        <span class="perfil-status" :class="mapEstatus(empleado.estatus)"></span>
      </div>

      <div class="perfil-info">
        <h1 class="perfil-nombre">{{ empleado.nombreCompleto }}</h1>
        <p class="perfil-puesto">{{ empleado.puesto || '—' }}</p>
        <div class="perfil-badges">
          <span class="badge-no">Nº {{ String(empleado.id).padStart(6,'0') }}</span>
          <StatusPill :status="mapEstatus(empleado.estatus)" />
          <span class="badge-dato" v-if="empleado.curp">CURP: {{ empleado.curp }}</span>
          <span class="badge-dato" v-if="empleado.rfc">RFC: {{ empleado.rfc }}</span>
          <span class="badge-dato" v-if="empleado.nss">NSS: {{ empleado.nss }}</span>
          <span class="badge-dato" v-if="empleado.ubicacion_principal">
            <i class="ti ti-map-pin" style="font-size:11px"></i>
            {{ empleado.ubicacion_principal }}
          </span>
        </div>
      </div>

      <button v-if="can('incidencias', 'leer')" class="btn-incidencias" @click="abrirIncidencias">
        <i class="ti ti-alert-triangle"></i>
        Incidencias
        <span v-if="incidenciasPendientes" class="inc-count">{{ incidenciasPendientes }}</span>
      </button>
    </div>

    <!-- Alertas -->
    <div v-if="successMsg" class="alert-success"><i class="ti ti-circle-check"></i> {{ successMsg }}</div>
    <div v-if="errorMsg"   class="alert-error"><i class="ti ti-alert-circle"></i> {{ errorMsg }}</div>

    <!-- Asistencia / Rostro / Salida anticipada -->
    <div class="sec asistencia-card">
      <div class="sec-hdr"><i class="ti ti-clock-hour-4"></i> Asistencia y biometría</div>
      <div class="sec-body">
        <div class="asis-grid">

          <div class="asis-item">
            <span class="asis-label">Estado actual</span>
            <div v-if="loadingAsistencia" class="asis-skel"></div>
            <span v-else class="asis-pill" :class="asistencia.estado">
              <i class="ti" :class="asistencia.estado === 'dentro' ? 'ti-door-enter' : 'ti-door-exit'"></i>
              {{ asistencia.estado === 'dentro' ? 'Dentro (con entrada activa)' : asistencia.estado === 'fuera' ? 'Fuera' : 'Sin registros' }}
            </span>
          </div>

          <div class="asis-item">
            <span class="asis-label">Último registro</span>
            <div v-if="loadingAsistencia" class="asis-skel"></div>
            <span v-else-if="asistencia.ultima_fecha" class="asis-valor">
              {{ asistencia.ultimo_tipo }} — {{ formatFecha(asistencia.ultima_fecha) }} {{ asistencia.ultima_hora }}
            </span>
            <span v-else class="asis-valor muted">Sin registros aún</span>
          </div>

          <div class="asis-item">
            <span class="asis-label">Rostro enrolado</span>
            <span class="asis-pill" :class="empleado.rostro_enrolado == 1 ? 'dentro' : 'fuera'">
              <i class="ti" :class="empleado.rostro_enrolado == 1 ? 'ti-face-id' : 'ti-face-id-error'"></i>
              {{ empleado.rostro_enrolado == 1 ? 'Enrolado' : 'No enrolado' }}
            </span>
            <div v-if="auth.esAdmin" class="enr-acts">
              <button class="enr-btn main" @click="showEnrolarModal = true">
                <i class="ti ti-camera"></i> {{ empleado.rostro_enrolado == 1 ? 'Volver a enrolar' : 'Enrolar rostro' }}
              </button>
              <button class="enr-btn" :disabled="generandoLink" @click="generarLink">
                <i class="ti ti-link"></i> {{ generandoLink ? 'Generando...' : 'Link para el empleado' }}
              </button>
            </div>
          </div>

          <div class="asis-item">
            <span class="asis-label">
              Permitir salida anticipada
              <i class="ti ti-info-circle" title="Deja a este empleado registrar su salida antes de que cumpla su horario, una sola vez. Se apaga sola después de usarse."></i>
            </span>
            <button
              class="salida-toggle"
              :class="{ active: salidaAnticipada, loading: togglingSalida }"
              :disabled="togglingSalida || !can('empleados', 'actualizar')"
              @click="toggleSalidaAnticipada"
            >
              <span class="salida-track">
                <span class="salida-thumb">
                  <i v-if="togglingSalida" class="ti ti-loader-2 spin"></i>
                </span>
              </span>
              <span class="salida-label">{{ salidaAnticipada ? 'Autorizada' : 'No autorizada' }}</span>
            </button>
          </div>

        </div>

        <!-- Registros de hoy -->
        <div class="hoy-box">
          <div class="hoy-hdr">
            <span><i class="ti ti-calendar-event"></i> Registros de hoy</span>
            <span class="hoy-count" v-if="!loadingHoy">{{ hoyTotal }} {{ hoyTotal === 1 ? 'registro' : 'registros' }}</span>
          </div>
          <div v-if="loadingHoy" class="asis-skel" style="width:100%"></div>
          <div v-else-if="!hoyRegistros.length" class="hoy-vacio">Sin registros el día de hoy</div>
          <template v-else>
            <div v-for="r in hoyRegistros" :key="r.id" class="hoy-row">
              <span class="asis-pill sm" :class="r.tipo === 'Entrada' ? 'dentro' : 'fuera'">
                <i class="ti" :class="r.tipo === 'Entrada' ? 'ti-door-enter' : 'ti-door-exit'"></i>{{ r.tipo }}
              </span>
              <span class="hoy-hora">{{ r.hora }}</span>
              <span class="hoy-ub">{{ r.ubicacion || '—' }}</span>
              <button v-if="r.latitud && r.longitud && Number(r.latitud) !== 0" class="map-link" @click="abrirMapa(r)">
                <i class="ti ti-map-pin"></i> Mapa
              </button>
            </div>
            <button v-if="hoyTotal > 4" class="hoy-mas" @click="abrirHistorial">
              +{{ hoyTotal - 4 }} más hoy — ver historial completo
            </button>
          </template>
        </div>

        <div class="sec-footer" style="justify-content: flex-start; margin-top: 14px;">
          <button class="btn-sm" @click="abrirHistorial">
            <i class="ti ti-history"></i> Ver historial de asistencia
          </button>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs-bar">
      <button
        v-for="tab in tabsVisibles"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
        v-show="tab.key !== 'reactivar' || empleado.estatus === 0"
      >
        <i :class="['ti', tab.icon]" aria-hidden="true"></i>
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB: Personal -->
    <div v-if="activeTab === 'personal'" class="sec">
      <div class="sec-hdr"><i class="ti ti-user"></i> Datos personales</div>
      <div class="sec-body">
        <div class="field-grid">
          <div class="field"><label>Nombre(s) <span class="req">*</span></label>
            <input v-model="personal.nombre" @input="toUpper(personal,'nombre')" /></div>
          <div class="field"><label>Apellido paterno <span class="req">*</span></label>
            <input v-model="personal.paterno" @input="toUpper(personal,'paterno')" /></div>
          <div class="field"><label>Apellido materno <span class="req">*</span></label>
            <input v-model="personal.materno" @input="toUpper(personal,'materno')" /></div>
          <div class="field"><label>CURP</label>
            <input v-model="personal.curp" maxlength="18" @input="toUpper(personal,'curp')" /></div>
          <div class="field"><label>RFC</label>
            <input v-model="personal.rfc" maxlength="13" @input="toUpper(personal,'rfc')" /></div>
          <div class="field"><label>NSS</label>
            <input v-model="personal.nss" maxlength="11" /></div>
          <div class="field"><label>Código postal fiscal</label>
            <input v-model="personal.cp" maxlength="6" /></div>
          <div class="field"><label>Alergias</label>
            <input v-model="personal.alergias" @input="toUpper(personal,'alergias')" /></div>
          <div class="field"><label>Escolaridad</label>
            <SearchSelect v-model="personal.escolaridad" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.escolaridad" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
          <div class="field"><label>Tipo de sangre</label>
            <SearchSelect v-model="personal.tipoSangre" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.tipoSangre" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
          <div class="field"><label>Nombre emergencia</label>
            <input v-model="personal.nombreEmergencia" @input="toUpper(personal,'nombreEmergencia')" /></div>
          <div class="field"><label>Teléfono emergencia</label>
            <input v-model="personal.telefonoEmergencia" maxlength="10" /></div>
          <div class="field"><label>Parentesco</label>
            <SearchSelect v-model="personal.parentesco" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.parentesco" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
        </div>
        <div class="sec-footer">
          <button v-if="can('empleados', 'actualizar')" class="btn-primary-lg" :disabled="saving" @click="guardarPersonal">
            <i class="ti ti-loader-2 spin" v-if="saving"></i>
            <i class="ti ti-check" v-else></i>
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TAB: Trabajo -->
    <div v-if="activeTab === 'trabajo'" class="sec">
      <div class="sec-hdr"><i class="ti ti-briefcase"></i> Datos laborales</div>
      <div class="sec-body">
        <div class="field-grid">
          
          <div class="field field-full" v-if="!esOperador">
            <label>Modo de sueldo</label>
            <div class="modo-sueldo-toggle">
              <button type="button" :class="{ active: trabajo.modo_sueldo === 'tabulador' }" @click="trabajo.modo_sueldo = 'tabulador'">
                <i class="ti ti-table"></i> Por tabulador (puesto/zona)
              </button>
              <button type="button" :class="{ active: trabajo.modo_sueldo === 'salario' }" @click="trabajo.modo_sueldo = 'salario'">
                <i class="ti ti-coin"></i> Sueldo fijo mensual
              </button>
            </div>
          </div>
          <div class="field" v-if="!esOperador && trabajo.modo_sueldo === 'salario'">
            <label>Salario mensual</label>
            <input type="number" v-model.number="trabajo.salario_mensual" step="0.01" placeholder="0.00" />
          </div>


          <div class="field"><label>Turno</label>
            <SearchSelect v-model="trabajo.turno" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.turno" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
          <div class="field"><label>Puesto</label>
            <SearchSelect v-model="trabajo.puesto" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.puesto" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
          <div class="field"><label>Periodicidad</label>
            <SearchSelect v-model="trabajo.periodicidad" :disabled="loadingCats">
              <option value="">Seleccione</option>
              <option v-for="c in cats.periodicidad" :key="c.id" :value="c.id">{{ c.valor }}</option>
            </SearchSelect></div>
          <div class="field"><label>Fecha de inicio</label>
            <input type="date" v-model="trabajo.fecha_efectiva" /></div>
        </div>
        <div class="sec-footer">
          <button v-if="can('empleados', 'actualizar')" class="btn-primary-lg" :disabled="saving" @click="guardarTrabajo">
            <i class="ti ti-loader-2 spin" v-if="saving"></i>
            <i class="ti ti-check" v-else></i>
            {{ saving ? 'Guardando...' : 'Guardar cambios' }}
          </button>
        </div>
      </div>
    </div>

   <!-- TAB: Banco -->
  <div v-if="activeTab === 'banco'" class="sec">
    <div class="sec-hdr"><i class="ti ti-credit-card"></i> Datos bancarios</div>
    <div class="sec-body">
      <div class="field-grid">
        <div class="field field-full">
          <label>
            CLABE interbancaria
            <span v-if="!puedeEditarClabe" class="badge-lock" title="Solo administradores pueden editar este campo">
              <i class="ti ti-lock"></i> Solo Admin
            </span>
          </label>
          <input
            v-model="banco.interbancaria"
            maxlength="23"
            placeholder="0000-0000-0000-0000-00"
            :disabled="!puedeEditarClabe"
            :style="!puedeEditarClabe ? 'opacity:.6; cursor:not-allowed;' : ''"
            @input="onClabeInput"
            @blur="onClabeBlur"
          />
        </div>
        <div class="field"><label>Institución bancaria</label>
          <input v-model="banco.institucionBancaria" readonly style="opacity:.7" /></div>
        <div class="field"><label>Código banco</label>
          <input v-model="banco.bancoId" readonly style="opacity:.7" /></div>
      </div>

      <ExpedienteBanco
        :id-empleado="route.params.id"
        :nombre-empleado="empleado.nombreCompleto"
        @usar-clabe="usarClabeExtraida"
      />

      <div class="sec-footer">
        <button v-if="can('empleados', 'actualizar')" class="btn-primary-lg" :disabled="saving" @click="guardarBanco">
          <i class="ti ti-loader-2 spin" v-if="saving"></i>
          <i class="ti ti-check" v-else></i>
          {{ saving ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </div>
  </div>

    <!-- TAB: Foto -->
    <div v-if="activeTab === 'foto'" class="sec">
      <div class="sec-hdr"><i class="ti ti-camera"></i> Foto del empleado</div>
      <div class="sec-body">
        <div class="foto-wrap">
          <div class="foto-preview" @click="fotoInputRef?.click()">
            <img v-if="fotoPreview || empleado.fotos" :src="fotoPreview || empleado.fotos" />
            <div v-else class="foto-placeholder">
              <i class="ti ti-user-circle"></i>
              <span>Sin foto</span>
            </div>
          </div>
          <div class="foto-actions">
            <button class="btn-sm" @click="fotoInputRef?.click()">
              <i class="ti ti-upload"></i> Subir foto
            </button>
            <button v-if="can('empleados', 'actualizar')" class="btn-primary-lg" :disabled="!fotoFile || saving" @click="guardarFoto">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              <i class="ti ti-check" v-else></i>
              {{ saving ? 'Subiendo...' : 'Guardar foto' }}
            </button>
            <p class="foto-hint">JPG, PNG — máx 2MB</p>
          </div>
          <input ref="fotoInputRef" type="file" accept="image/*" style="display:none" @change="onFotoChange" />
        </div>
      </div>
    </div>

    <!-- TAB: Reactivar (solo si estatus === 0) -->
    <div v-if="activeTab === 'reactivar' && empleado.estatus === 0" class="sec">
      <div class="sec-hdr"><i class="ti ti-user-check"></i> Reactivar empleado</div>
      <div class="sec-body">
        <div class="reactivar-grid">
          <div class="reactivar-card" @click="bajaAccion('reactivacion')">
            <div class="reactivar-icon green"><i class="ti ti-user-check"></i></div>
            <h3>Reactivación</h3>
            <p>Cancela la baja y activa nuevamente al empleado con sus mismos datos.</p>
            <button class="btn-primary-lg" :disabled="saving">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              Reactivar
            </button>
          </div>
          <div class="reactivar-card" @click="bajaAccion('reingreso')">
            <div class="reactivar-icon blue"><i class="ti ti-door-enter"></i></div>
            <h3>Reingreso</h3>
            <p>Registra al empleado como reingreso activo (estatus = 1) sin cancelar la baja anterior.</p>
            <button class="btn-sm" :disabled="saving">
              <i class="ti ti-loader-2 spin" v-if="saving"></i>
              Registrar reingreso
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>

  <!-- Loading -->
  <div v-else-if="loading" class="loading-wrap">
    <div class="skeleton-card" v-for="i in 3" :key="i"></div>
  </div>

  <!-- Error -->
  <div v-else class="empty-wrap">
    <i class="ti ti-user-off" style="font-size:48px;opacity:.3"></i>
    <p>No se encontró el empleado</p>
    <button class="btn-sm" @click="router.back()">Regresar</button>
  </div>

  <!-- Modal enrolar rostro (TensorFlow.js) -->
  <Teleport to="body">
    <div v-if="showEnrolarModal" class="modal-overlay" @click.self="showEnrolarModal = false">
      <div class="modal-historial" style="max-width:520px">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-face-id"></i> Enrolar rostro</h2>
            <p v-if="empleado">{{ empleado.nombreCompleto }}</p>
          </div>
          <button class="btn-close" @click="showEnrolarModal = false"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <EnrolarRostro :submit="enrolarDesdePanel" @done="onEnrolado" />
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal link de enrolamiento -->
  <Teleport to="body">
    <div v-if="linkEnrolamiento" class="modal-overlay" @click.self="linkEnrolamiento = null">
      <div class="modal-historial" style="max-width:520px">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-link"></i> Link de enrolamiento</h2>
            <p v-if="empleado">{{ empleado.nombreCompleto }}</p>
          </div>
          <button class="btn-close" @click="linkEnrolamiento = null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <p class="link-hint">Mándaselo al empleado (WhatsApp, correo…). Lo abre en su celular, toma 2 capturas de su rostro y queda enrolado. Sirve una sola vez y vence en 24 horas.</p>
          <div class="link-box">
            <input :value="linkEnrolamiento.url" readonly @focus="$event.target.select()" />
            <button class="enr-btn main" @click="copiarLink">
              <i class="ti" :class="linkCopiado ? 'ti-check' : 'ti-copy'"></i> {{ linkCopiado ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <small class="link-vence">Vence: {{ linkEnrolamiento.vence }}</small>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal incidencias del empleado -->
  <Teleport to="body">
    <div v-if="showIncidenciasModal" class="modal-overlay" @click.self="showIncidenciasModal = false">
      <div class="modal-historial modal-inc">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-alert-triangle"></i> Incidencias</h2>
            <p v-if="empleado">{{ empleado.nombreCompleto }}</p>
          </div>
          <div class="inc-hdr-acts">
            <button v-if="can('incidencias', 'crear')" class="btn-nueva-inc" @click="showNuevaIncidencia = true">
              <i class="ti ti-plus"></i> Nueva incidencia
            </button>
            <button class="btn-close" @click="showIncidenciasModal = false"><i class="ti ti-x"></i></button>
          </div>
        </div>

        <div class="modal-body">
          <div v-if="loadingIncidencias" class="loading-wrap">
            <div class="skeleton-card" v-for="i in 3" :key="i" style="height:78px"></div>
          </div>

          <div v-else-if="!incidencias.length" class="empty-wrap" style="padding:36px 10px">
            <i class="ti ti-mood-smile" style="font-size:38px;opacity:.35"></i>
            <p>Este empleado no tiene incidencias</p>
          </div>

          <div v-else class="inc-lista">
            <div v-for="i in incidencias" :key="i.id" class="inc-card" :class="estadoIncidencia(i.activo).cls">
              <div class="inc-top">
                <span class="inc-tipo">{{ i.tipo || 'Incidencia' }}</span>
                <span class="inc-pill" :class="estadoIncidencia(i.activo).cls">
                  <i class="ti" :class="estadoIncidencia(i.activo).ico"></i>
                  {{ estadoIncidencia(i.activo).txt }}
                </span>
              </div>
              <p class="inc-desc">{{ i.descripcion }}</p>
              <div class="inc-meta">
                <span><i class="ti ti-calendar"></i> {{ fmtFechaInc(i.fecha_inicio) }}<template v-if="i.fecha_final && i.fecha_final !== i.fecha_inicio"> → {{ fmtFechaInc(i.fecha_final) }}</template></span>
                <a v-if="i.comprobante_ruta" :href="i.comprobante_ruta" target="_blank" rel="noopener" class="inc-comp">
                  <i class="ti ti-paperclip"></i> {{ i.comprobante_nombre_original || 'Comprobante' }}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <ModalIncidencia
    v-if="showNuevaIncidencia && empleado"
    :emp="empParaIncidencia"
    @close="showNuevaIncidencia = false"
    @done="onIncidenciaCreada"
  />

  <!-- Modal foto de perfil -->
  <Teleport to="body">
    <div v-if="showFotoModal && empleado?.fotos" class="modal-overlay overlay-top" @click.self="showFotoModal = false">
      <div class="foto-modal">
        <button class="btn-close foto-modal-x" @click="showFotoModal = false"><i class="ti ti-x"></i></button>
        <img :src="empleado.fotos" :alt="empleado.nombreCompleto" />
        <p>{{ empleado.nombreCompleto }}</p>
      </div>
    </div>
  </Teleport>

  <!-- Modal historial de asistencia -->
  <Teleport to="body">
    <div v-if="showHistorialModal" class="modal-overlay" @click.self="cerrarHistorial">
      <div class="modal-historial">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-history"></i> Historial de asistencia</h2>
            <p v-if="empleado">{{ empleado.nombreCompleto }}</p>
          </div>
          <button class="btn-close" @click="cerrarHistorial"><i class="ti ti-x"></i></button>
        </div>

        <div class="modal-body">
          <div v-if="loadingHistorial" class="loading-wrap">
            <div class="skeleton-card" v-for="i in 4" :key="i" style="height:44px"></div>
          </div>

          <div v-else-if="!historial.length" class="empty-wrap" style="padding:30px">
            <i class="ti ti-calendar-off" style="font-size:36px;opacity:.3"></i>
            <p>Sin registros de asistencia</p>
          </div>

          <table v-else class="tabla-historial">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Ubicación</th>
                <th>Mapa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in historial" :key="r.id">
                <td>{{ formatFecha(r.fecha) }}</td>
                <td>{{ r.hora }}</td>
                <td>
                  <span class="asis-pill sm" :class="r.tipo === 'Entrada' ? 'dentro' : 'fuera'">
                    <i class="ti" :class="r.tipo === 'Entrada' ? 'ti-door-enter' : 'ti-door-exit'"></i>
                    {{ r.tipo }}
                  </span>
                </td>
                <td>{{ r.ubicacion || '—' }}</td>
                <td>
                  <button v-if="r.latitud && r.longitud && Number(r.latitud) !== 0" class="map-link"
                     title="Ver dónde se registró" @click="abrirMapa(r)">
                    <i class="ti ti-map-pin"></i> Ver mapa
                  </button>
                  <span v-else class="muted">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- Modal mapa del registro -->
  <Teleport to="body">
    <div v-if="mapaRegistro" class="modal-overlay overlay-top" @click.self="mapaRegistro = null">
      <div class="modal-historial" style="max-width:640px">
        <div class="modal-hdr">
          <div>
            <h2><i class="ti ti-map-pin"></i> Ubicación del registro</h2>
            <p>{{ mapaRegistro.tipo }} — {{ formatFecha(mapaRegistro.fecha) }} {{ mapaRegistro.hora }}<template v-if="mapaRegistro.ubicacion"> · {{ mapaRegistro.ubicacion }}</template></p>
          </div>
          <button class="btn-close" @click="mapaRegistro = null"><i class="ti ti-x"></i></button>
        </div>
        <div class="modal-body">
          <iframe class="mapa-frame" :src="mapaSrc" loading="lazy" referrerpolicy="no-referrer"></iframe>
          <div class="mapa-foot">
            <span>{{ Number(mapaRegistro.latitud).toFixed(6) }}, {{ Number(mapaRegistro.longitud).toFixed(6) }}</span>
            <a :href="`https://www.google.com/maps?q=${mapaRegistro.latitud},${mapaRegistro.longitud}`" target="_blank" rel="noopener">
              <i class="ti ti-external-link"></i> Abrir en Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import SearchSelect from '@/components/ui/SearchSelect.vue'
import { usePermisos } from '@/composables/usePermisos.js'
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/ui.js'
import { empleadosService } from '@/services/empleados.service.js'
import { catalogosService } from '@/services/catalogos.service.js'
import StatusPill from '@/components/ui/StatusPill.vue'
import ModalIncidencia from '@/components/ui/ModalIncidencia.vue'
import EnrolarRostro from '@/components/ui/EnrolarRostro.vue'
import ExpedienteBanco from '@/components/ui/ExpedienteBanco.vue'
import { useAuthStore } from '@/stores/auth.js'
const { can } = usePermisos()

const route  = useRoute()
const router = useRouter()
const ui     = useUiStore()
const auth   = useAuthStore()

const loading    = ref(true)
const saving     = ref(false)
const loadingCats = ref(true)
const empleado   = ref(null)
const activeTab  = ref('personal')
const successMsg = ref('')
const errorMsg   = ref('')
const fotoPreview = ref(null)
const fotoFile    = ref(null)
const fotoInputRef = ref(null)

const loadingAsistencia = ref(true)
const asistencia = reactive({ estado: null, ultimo_tipo: null, ultima_fecha: null, ultima_hora: null })

const salidaAnticipada = ref(false)
const togglingSalida   = ref(false)

// ── Enrolamiento facial (TensorFlow.js) ──
const showEnrolarModal = ref(false)
const generandoLink    = ref(false)
const linkEnrolamiento = ref(null)
const linkCopiado      = ref(false)

const enrolarDesdePanel = (d1, d2) =>
  empleadosService.enrolarRostro(route.params.id, d1, d2)
    .catch(e => e?.response?.data || { status: 'error', message: 'Error de conexión' })

function onEnrolado() {
  empleado.value.rostro_enrolado = 1
  setTimeout(() => { showEnrolarModal.value = false; showSuccess('Rostro enrolado correctamente') }, 1200)
}

async function generarLink() {
  generandoLink.value = true
  try {
    const r = await empleadosService.generarLinkEnrolamiento(route.params.id)
    const base = `${window.location.origin}${import.meta.env.BASE_URL}`
    linkEnrolamiento.value = {
      url: `${base}enrolar/${r.token}`,
      vence: new Date(r.expires_at.replace(' ', 'T')).toLocaleString('es-MX'),
    }
    linkCopiado.value = false
  } catch (err) {
    showError(err.response?.data?.message || 'No se pudo generar el link')
  } finally { generandoLink.value = false }
}

async function copiarLink() {
  try { await navigator.clipboard.writeText(linkEnrolamiento.value.url); linkCopiado.value = true }
  catch { /* el input queda seleccionable para copiar a mano */ }
}

// ── Incidencias del empleado ──
const showIncidenciasModal = ref(false)
const showNuevaIncidencia  = ref(false)
const loadingIncidencias   = ref(false)
const incidencias          = ref([])
const incidenciasPendientes = computed(() => incidencias.value.filter(i => Number(i.activo) === 0).length)

const empParaIncidencia = computed(() => ({
  id:       empleado.value.id,
  nombre:   empleado.value.nombreCompleto,
  initials: initials.value,
  bg:       avatarBg.value,
  color:    avatarColor.value,
}))

async function cargarIncidencias() {
  loadingIncidencias.value = true
  try {
    incidencias.value = await empleadosService.getIncidencias(route.params.id)
  } catch { incidencias.value = [] }
  finally { loadingIncidencias.value = false }
}
function abrirIncidencias() { showIncidenciasModal.value = true; cargarIncidencias() }
function onIncidenciaCreada() { showNuevaIncidencia.value = false; cargarIncidencias(); showSuccess('Incidencia registrada correctamente') }
function estadoIncidencia(a) {
  const n = Number(a)
  return n === 1 ? { txt: 'Aprobada', cls: 'ok', ico: 'ti-circle-check' }
       : n === 2 ? { txt: 'Rechazada', cls: 'no', ico: 'ti-circle-x' }
                 : { txt: 'Pendiente', cls: 'pend', ico: 'ti-clock' }
}
function fmtFechaInc(f) {
  if (!f) return '—'
  const [y, m, d] = String(f).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

// Registros del día (máx. 4 a la vista; el resto, en el historial)
const loadingHoy    = ref(true)
const hoyRegistros  = ref([])
const hoyTotal      = ref(0)
async function cargarHoy() {
  loadingHoy.value = true
  try {
    const res = await empleadosService.getAsistencias(route.params.id, { hoy: 1, limit: 4 })
    hoyRegistros.value = res.data || []
    hoyTotal.value     = res.total ?? hoyRegistros.value.length
  } catch { hoyRegistros.value = []; hoyTotal.value = 0 }
  finally { loadingHoy.value = false }
}

const showFotoModal = ref(false)
const mapaRegistro = ref(null)
const mapaSrc = computed(() => {
  const r = mapaRegistro.value
  if (!r) return ''
  const lat = Number(r.latitud), lon = Number(r.longitud), d = 0.004
  return `https://www.openstreetmap.org/export/embed.html?bbox=${lon - d},${lat - d},${lon + d},${lat + d}&layer=mapnik&marker=${lat},${lon}`
})
function abrirMapa(r) { mapaRegistro.value = r }

const showHistorialModal = ref(false)
const loadingHistorial   = ref(false)
const historial          = ref([])

const AVATAR_COLORS = [
  { color: '#4f8ef7', bg: '#1a2d4d' },
  { color: '#22c97a', bg: '#0d2e1f' },
  { color: '#f5a623', bg: '#2e1e06' },
  { color: '#f05454', bg: '#2e1010' },
  { color: '#a855f7', bg: '#2d1b4d' },
]

// Operador (nivel 3): datos personales, contacto de emergencia, laborales y foto.
// El Banco queda para nivel 2 o superior.
const esOperador = computed(() => (auth.user?.nivel ?? auth.user?.rol_nivel) > 2)
const tabsVisibles = computed(() => {
  const nivel = auth.user?.nivel ?? auth.user?.rol_nivel
  return nivel > 2 ? tabs.filter(t => ['personal', 'trabajo', 'foto'].includes(t.key)) : tabs
})

const tabs = [
  { key: 'personal',   label: 'Personal',  icon: 'ti-user' },
  { key: 'trabajo',    label: 'Trabajo',   icon: 'ti-briefcase' },
  { key: 'banco',      label: 'Banco',     icon: 'ti-credit-card' },
  { key: 'foto',       label: 'Foto',      icon: 'ti-camera' },
  { key: 'reactivar',  label: 'Reactivar', icon: 'ti-user-check' },
]

const personal = reactive({
  nombre: '', paterno: '', materno: '', curp: '', rfc: '', nss: '',
  cp: '', alergias: '', escolaridad: '', tipoSangre: '',
  nombreEmergencia: '', telefonoEmergencia: '', parentesco: ''
})


const banco = reactive({
  interbancaria: '', institucionBancaria: '', bancoId: ''
})

const cats = reactive({
  turno: [], puesto: [], periodicidad: [],
  parentesco: [], escolaridad: [], tipoSangre: [],
})

const initials = computed(() => {
  if (!empleado.value?.nombreCompleto) return 'US'
  return empleado.value.nombreCompleto
    .split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
})
const avatarBg    = computed(() => AVATAR_COLORS[empleado.value?.id % AVATAR_COLORS.length]?.bg    || '#1a2d4d')
const avatarColor = computed(() => AVATAR_COLORS[empleado.value?.id % AVATAR_COLORS.length]?.color || '#4f8ef7')

const trabajo = reactive({
  turno: '', puesto: '', periodicidad: '', fecha_efectiva: '',
  modo_sueldo: 'tabulador', salario_mensual: null
})

const puedeEditarClabe = computed(() => {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return (user.nivel ?? 99) <= 2
  } catch {
    return false // si algo sale mal parseando, por seguridad NO deja editar
  }
})

onMounted(async () => {
  await Promise.all([fetchEmpleado(), loadCatalogos(), fetchEstadoAsistencia()])
  cargarHoy()
  if (can('incidencias', 'leer')) cargarIncidencias()
})

async function fetchEmpleado() {
  loading.value = true
  try {
    const data = await empleadosService.getById(route.params.id)
    empleado.value = data

    ui.setBreadcrumbs([
      { label: 'Home', to: '/' },
      { label: 'Empleados', to: '/empleados' },
      { label: data.nombreCompleto || 'Detalle', to: '#' }
    ])

    // Llena los formularios
    personal.nombre             = data.nombre             || ''
    personal.paterno            = data.paterno            || ''
    personal.materno            = data.materno            || ''
    personal.curp               = data.curp               || ''
    personal.rfc                = data.rfc                || ''
    personal.nss                = data.nss                || ''
    personal.cp                 = data.CP_fiscal          || ''
    personal.alergias           = data.alergias           || ''
    personal.escolaridad        = data.escolaridad        || ''
    personal.tipoSangre         = data.tipoSangre         || ''
    personal.nombreEmergencia   = data.nombreEmergencia   || ''
    personal.telefonoEmergencia = data.telefonoEmergencia || ''
    personal.parentesco         = data.parentesco         || ''

    trabajo.turno         = data.id_turno      || ''
    trabajo.puesto        = data.id_puesto     || ''
    trabajo.periodicidad  = data.id_periocidad || ''
    trabajo.fecha_efectiva = data.fecha_efectiva || ''
    trabajo.modo_sueldo     = data.modo_sueldo     || 'tabulador'
    trabajo.salario_mensual = data.salario_mensual || null

    banco.interbancaria      = data.clave_interbancaria || ''
    banco.institucionBancaria = data.institucionBancaria || ''
    banco.bancoId            = data.id_banco            || ''

    salidaAnticipada.value = Number(data.permitir_salida_anticipada) === 1

  } catch (err) {
    console.error('Error:', err)
    empleado.value = null
  } finally {
    loading.value = false
  }
}

async function loadCatalogos() {
  try {
    const [turno, puesto, periodicidad, parentesco, escolaridad, tipoSangre] = await Promise.all([
      catalogosService.getCatalogo(7),
      catalogosService.getCatalogo(10),
      catalogosService.getCatalogo(9),
      catalogosService.getCatalogo(17),
      catalogosService.getCatalogo(1),
      catalogosService.getCatalogo(3),
    ])
    cats.turno        = turno
    cats.puesto       = puesto
    cats.periodicidad = periodicidad
    cats.parentesco   = parentesco
    cats.escolaridad  = escolaridad
    cats.tipoSangre   = tipoSangre
  } catch {}
  finally { loadingCats.value = false }
}

async function fetchEstadoAsistencia() {
  loadingAsistencia.value = true
  try {
    const data = await empleadosService.getEstadoAsistencia(route.params.id)
    asistencia.estado       = data.estado
    asistencia.ultimo_tipo  = data.ultimo_tipo
    asistencia.ultima_fecha = data.ultima_fecha
    asistencia.ultima_hora  = data.ultima_hora
  } catch (err) {
    console.error('Error cargando estado de asistencia:', err)
  } finally {
    loadingAsistencia.value = false
  }
}

async function toggleSalidaAnticipada() {
  if (togglingSalida.value) return
  const nuevoValor = salidaAnticipada.value ? 0 : 1

  togglingSalida.value = true
  try {
    await empleadosService.toggleSalidaAnticipada(route.params.id, nuevoValor)
    salidaAnticipada.value = nuevoValor === 1
    showSuccess(
      nuevoValor === 1
        ? 'Se autorizó al empleado a registrar salida anticipada (se apaga sola al usarla)'
        : 'Se quitó la autorización de salida anticipada'
    )
  } catch (err) {
    showError(err.response?.data?.message || 'Error al actualizar la autorización de salida anticipada')
  } finally {
    togglingSalida.value = false
  }
}

async function abrirHistorial() {
  showHistorialModal.value = true
  loadingHistorial.value   = true
  try {
    const res = await empleadosService.getAsistencias(route.params.id, { limit: 50 })
    historial.value = res.data || []
  } catch (err) {
    console.error('Error cargando historial:', err)
    historial.value = []
  } finally {
    loadingHistorial.value = false
  }
}

function cerrarHistorial() {
  showHistorialModal.value = false
}

function formatFecha(fecha) {
  if (!fecha) return '—'
  const [y, m, d] = String(fecha).split('-')
  return d && m && y ? `${d}/${m}/${y}` : fecha
}

function mapEstatus(val) {
  const map = { 1: 'activo', 2: 'permiso', 0: 'baja' }
  return map[val] ?? 'activo'
}

function toUpper(obj, key) { obj[key] = obj[key].toUpperCase() }

function showSuccess(msg) {
  successMsg.value = msg
  errorMsg.value   = ''
  setTimeout(() => successMsg.value = '', 3000)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function showError(msg) {
  errorMsg.value   = msg
  successMsg.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function guardarPersonal() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:               'personal',
      nombre:             personal.nombre,
      paterno:            personal.paterno,
      materno:            personal.materno,
      curp:               personal.curp,
      rfc:                personal.rfc,
      nss:                personal.nss,
      cp:                 personal.cp,
      alergias:           personal.alergias,
      escolaridad:        personal.escolaridad,
      tipo_sangre:        personal.tipoSangre,
      telefonoEmergencia: personal.telefonoEmergencia,
      nombreEmergencia:   personal.nombreEmergencia,
      parentesco:         personal.parentesco,
    })
    showSuccess('Datos personales actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos personales')
  } finally { saving.value = false }
}

async function guardarTrabajo() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:            'trabajo',
      id_turno:        trabajo.turno,
      id_puesto:       trabajo.puesto,
      id_periocidad:   trabajo.periodicidad,
      fecha:           trabajo.fecha_efectiva,
      modo_sueldo:     trabajo.modo_sueldo,
      salario_mensual: trabajo.modo_sueldo === 'salario' ? trabajo.salario_mensual : null,
    })
    showSuccess('Datos laborales actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos laborales')
  } finally { saving.value = false }
}

async function guardarBanco() {
  saving.value = true
  try {
    await empleadosService.update(route.params.id, {
      tipo:                'banco',
      clave_interbancaria: banco.interbancaria.replace(/\D/g, ''),
      id_banco:            banco.bancoId,
    })
    showSuccess('Datos bancarios actualizados correctamente')
  } catch (err) {
    showError(err.response?.data?.message || 'Error al guardar datos bancarios')
  } finally { saving.value = false }
}

async function guardarFoto() {
  if (!fotoFile.value) return
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('foto', fotoFile.value)
    await empleadosService.subirFoto(route.params.id, fd)
    showSuccess('Foto actualizada correctamente')
    fotoFile.value = null
    await fetchEmpleado()
  } catch (err) {
    showError('Error al subir la foto')
  } finally { saving.value = false }
}

async function bajaAccion(tipo) {
  saving.value = true
  try {
    await empleadosService.bajaAccion(route.params.id, tipo)
    showSuccess(tipo === 'reactivacion' ? 'Empleado reactivado' : 'Reingreso registrado')
    await fetchEmpleado()
    activeTab.value = 'personal'
  } catch (err) {
    showError(err.response?.data?.message || 'Error al procesar la acción')
  } finally { saving.value = false }
}

function onFotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fotoFile.value = file
  const reader = new FileReader()
  reader.onload = ev => { fotoPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

function formatCLABE(digits) {
  const d = digits.replace(/\D/g, '').slice(0, 18)
  return [d.slice(0,4), d.slice(4,8), d.slice(8,12), d.slice(12,16), d.slice(16,18)]
    .filter(Boolean).join('-')
}
// La CLABE detectada en el estado de cuenta se pasa al formulario; falta "Guardar cambios"
function usarClabeExtraida(clabe) {
  banco.interbancaria = formatCLABE(clabe)
  onClabeBlur()
  showSuccess('CLABE tomada del estado de cuenta. Revisa y presiona "Guardar cambios".')
}
function onClabeInput() {
  banco.interbancaria      = formatCLABE(banco.interbancaria)
  banco.institucionBancaria = ''
  banco.bancoId            = ''
}
async function onClabeBlur() {
  const digits = banco.interbancaria.replace(/\D/g, '')
  if (digits.length < 3) return
  try {
    const b = await catalogosService.getInstitucionBancaria(digits.slice(0,3))
    if (b) { banco.institucionBancaria = b.valor || ''; banco.bancoId = b.id || '' }
  } catch {}
}
</script>

<style scoped>
:where(.ss-root) { width: 100%; }
.detalle-emp { display: flex; flex-direction: column; gap: 14px; }

/* Header perfil */
.perfil-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: var(--bg1);
  border: 0.5px solid var(--bdr);
  border-radius: 12px;
  padding: 20px;
  flex-wrap: wrap;
}
.btn-back {
  width: 36px; height: 36px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx1); font-size: 18px;
  transition: all .15s; flex-shrink: 0;
}
.btn-back:hover { background: var(--bg3); }
.perfil-av-wrap { position: relative; flex-shrink: 0; }
.perfil-foto {
  width: 72px; height: 72px; border-radius: 50%;
  object-fit: cover; border: 2px solid var(--bdr2);
}
.perfil-av {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 600;
}
.perfil-status {
  width: 14px; height: 14px; border-radius: 50%;
  position: absolute; bottom: 2px; right: 2px;
  border: 2px solid var(--bg1);
}
.perfil-status.activo { background: var(--grn); }
.perfil-status.baja   { background: var(--red); }
.perfil-status.permiso { background: var(--amb); }
.perfil-info { flex: 1; }
.perfil-nombre { font-size: 20px; font-weight: 600; color: var(--tx0); margin-bottom: 4px; }
.perfil-puesto { font-size: 13px; color: var(--tx2); margin-bottom: 10px; }
.perfil-badges { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.badge-no {
  font-size: 11px; font-weight: 500; padding: 3px 8px;
  border-radius: 20px; background: var(--acc-dim); color: var(--acc);
}
.badge-dato {
  font-size: 11px; color: var(--tx2);
  background: var(--bg2); padding: 3px 8px;
  border-radius: 20px; border: 0.5px solid var(--bdr2);
}

/* Alerts */
.alert-error, .alert-success {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px; font-size: 13px;
}
.alert-error   { background: var(--red-dim); border: 0.5px solid var(--red); color: var(--red); }
.alert-success { background: var(--grn-dim); border: 0.5px solid var(--grn); color: var(--grn); }

/* Tabs */
.tabs-bar {
  display: flex; gap: 4px; flex-wrap: wrap;
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 12px; padding: 6px;
}
.tab-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px;
  border: none; background: transparent;
  font-size: 13px; color: var(--tx2);
  cursor: pointer; transition: all .15s; font-family: inherit;
}
.tab-btn:hover { background: var(--bg2); color: var(--tx0); }
.tab-btn.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tab-btn i { font-size: 15px; }

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-body { padding: 16px; }
.sec-footer { margin-top: 16px; display: flex; justify-content: flex-end; }

/* Fields */
.field-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px;
}
.field { display: flex; flex-direction: column; gap: 5px; }
.field-full { grid-column: 1 / -1; }
label { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req { color: var(--red); }
input, select {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 12px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus, select:focus { border-color: var(--acc); }
input::placeholder { color: var(--tx3); }
select option { background: var(--bg1); }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; transition: background .15s;
  font-family: inherit; font-weight: 500;
}
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

/* Foto */
.foto-wrap { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
.foto-preview {
  width: 120px; height: 120px; border-radius: 12px;
  border: 0.5px solid var(--bdr2); overflow: hidden;
  cursor: pointer; background: var(--bg2); flex-shrink: 0;
}
.foto-preview img { width: 100%; height: 100%; object-fit: cover; }
.foto-placeholder {
  width: 100%; height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 6px; color: var(--tx3); font-size: 11px;
}
.foto-placeholder i { font-size: 36px; }
.foto-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
.foto-hint { font-size: 11px; color: var(--tx3); }

/* Reactivar */
.reactivar-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px;
}
.reactivar-card {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 12px; padding: 20px;
  display: flex; flex-direction: column; gap: 10px;
  cursor: default;
}
.reactivar-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.reactivar-icon.green { background: var(--grn-dim); color: var(--grn); }
.reactivar-icon.blue  { background: var(--acc-dim); color: var(--acc); }
.reactivar-card h3 { font-size: 14px; font-weight: 500; color: var(--tx0); }
.reactivar-card p  { font-size: 12px; color: var(--tx2); line-height: 1.5; }

/* Loading */
.loading-wrap { display: flex; flex-direction: column; gap: 14px; }
.skeleton-card {
  height: 120px; background: var(--bg2); border-radius: 12px;
  animation: pulse 1.5s ease-in-out infinite;
}
.empty-wrap {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; padding: 60px;
  color: var(--tx2); font-size: 13px;
}

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .field-grid { grid-template-columns: 1fr; }
  .reactivar-grid { grid-template-columns: 1fr; }
  .perfil-header { flex-direction: column; align-items: center; text-align: center; }
  .perfil-badges { justify-content: center; }
  .tabs-bar { overflow-x: auto; }
}

.modo-sueldo-toggle {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.modo-sueldo-toggle button {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  color: var(--tx1); font-size: 13px; cursor: pointer;
  font-family: inherit; transition: all .15s;
}
.modo-sueldo-toggle button.active {
  background: var(--acc-dim); border-color: var(--acc); color: var(--acc); font-weight: 500;
}

.badge-lock {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; padding: 2px 7px; border-radius: 20px;
  background: var(--amb-dim, rgba(245,158,11,0.12)); color: var(--amb, #f59e0b);
  margin-left: 8px; font-weight: 500;
}

/* Asistencia / biometría */
.asis-grid {
  display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 18px;
}
.asis-item { display: flex; flex-direction: column; gap: 8px; }
.asis-label {
  font-size: 11px; font-weight: 500; color: var(--tx2);
  display: flex; align-items: center; gap: 5px;
}
.asis-label i { font-size: 13px; color: var(--tx3); cursor: help; }
.asis-valor { font-size: 13px; color: var(--tx0); }
.asis-valor.muted { color: var(--tx3); }
.asis-skel { height: 22px; width: 80%; border-radius: 6px; background: var(--bg2); animation: pulse 1.5s ease-in-out infinite; }

.asis-pill {
  display: inline-flex; align-items: center; gap: 6px; width: fit-content;
  font-size: 12px; font-weight: 500; padding: 5px 10px; border-radius: 20px;
}
.asis-pill.dentro { background: var(--grn-dim); color: var(--grn); }
.asis-pill.fuera  { background: var(--bg2); color: var(--tx2); border: 0.5px solid var(--bdr2); }
.asis-pill.sm { padding: 3px 8px; font-size: 11px; }

/* Switch salida anticipada */
.salida-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: none; cursor: pointer;
  font-family: inherit; padding: 0; width: fit-content;
}
.salida-toggle:disabled { cursor: not-allowed; opacity: .7; }
.salida-track {
  width: 38px; height: 22px; border-radius: 20px;
  background: var(--bg3); border: 0.5px solid var(--bdr2);
  position: relative; transition: background .15s, border-color .15s; flex-shrink: 0;
}
.salida-toggle.active .salida-track { background: var(--amb-dim, rgba(245,158,11,0.18)); border-color: var(--amb, #f59e0b); }
.salida-thumb {
  position: absolute; top: 1px; left: 1px;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--tx2); transition: transform .15s, background .15s;
  display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff;
}
.salida-toggle.active .salida-thumb { transform: translateX(16px); background: var(--amb, #f59e0b); }
.salida-label { font-size: 12px; font-weight: 500; color: var(--tx1); }
.salida-toggle.active .salida-label { color: var(--amb, #f59e0b); }

/* Modal historial */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px;
}
.modal-historial {
  background: var(--bg1); border: 0.5px solid var(--bdr);
  border-radius: 14px; width: 100%; max-width: 560px;
  max-height: 80vh; display: flex; flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
}
.modal-hdr {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 18px 20px; border-bottom: 0.5px solid var(--bdr);
}
.modal-hdr h2 {
  font-size: 15px; font-weight: 600; color: var(--tx0);
  display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
}
.modal-hdr h2 i { color: var(--acc); }
.modal-hdr p { font-size: 12px; color: var(--tx2); }
.btn-close {
  width: 30px; height: 30px; border-radius: 8px; flex-shrink: 0;
  border: 0.5px solid var(--bdr2); background: var(--bg2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx1); transition: all .15s;
}
.btn-close:hover { background: var(--bg3); color: var(--tx0); }
.modal-body { padding: 16px 20px 20px; overflow-y: auto; }

.tabla-historial { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tabla-historial th {
  text-align: left; padding: 8px 10px; color: var(--tx3);
  font-weight: 500; font-size: 11px; border-bottom: 0.5px solid var(--bdr);
}
.tabla-historial td {
  padding: 9px 10px; color: var(--tx1);
  border-bottom: 0.5px solid var(--bdr);
}
.tabla-historial tr:last-child td { border-bottom: none; }

@media (max-width: 768px) {
  .asis-grid { grid-template-columns: 1fr 1fr; }
}

/* ── Incidencias ── */
.btn-incidencias {
  margin-left: auto; align-self: flex-start; display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 10px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: inherit;
  background: rgba(245,166,35,.12); border: 1px solid rgba(245,166,35,.4); color: #f5a623; transition: all .15s;
}
.btn-incidencias:hover { background: rgba(245,166,35,.2); }
.inc-count { background: #f5a623; color: #1a1200; border-radius: 20px; font-size: 11px; font-weight: 700; padding: 1px 7px; }
.modal-inc { max-width: 620px; }
.inc-hdr-acts { display: flex; align-items: center; gap: 10px; }
.btn-nueva-inc {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 9px; cursor: pointer;
  background: var(--acc, #4f8ef7); color: #fff; border: none; font-size: 12px; font-weight: 600; font-family: inherit;
}
.inc-lista { display: flex; flex-direction: column; gap: 10px; }
.inc-card {
  border: 0.5px solid var(--bdr2); border-left: 3px solid var(--tx3, #5b6274); border-radius: 12px;
  padding: 12px 14px; background: var(--bg2);
}
.inc-card.ok   { border-left-color: #22c97a; }
.inc-card.no   { border-left-color: #f05454; }
.inc-card.pend { border-left-color: #f5a623; }
.inc-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.inc-tipo { font-size: 14px; font-weight: 700; color: var(--tx0); }
.inc-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; }
.inc-pill.ok   { background: rgba(34,201,122,.14); color: #22c97a; }
.inc-pill.no   { background: rgba(240,84,84,.14);  color: #f05454; }
.inc-pill.pend { background: rgba(245,166,35,.14); color: #f5a623; }
.inc-desc { margin: 6px 0 8px; font-size: 13px; color: var(--tx1, var(--tx0)); line-height: 1.45; white-space: pre-wrap; }
.inc-meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: var(--tx2); }
.inc-meta i { margin-right: 4px; }
.inc-comp { color: var(--acc); text-decoration: none; }
.inc-comp:hover { text-decoration: underline; }

/* ── Enrolamiento ── */
.enr-acts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.enr-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px; cursor: pointer;
  font-size: 12px; font-weight: 600; font-family: inherit; background: var(--bg2); color: var(--tx0); border: 0.5px solid var(--bdr2); }
.enr-btn.main { background: var(--acc, #4f8ef7); border-color: var(--acc, #4f8ef7); color: #fff; }
.enr-btn:disabled { opacity: .6; cursor: wait; }
.link-hint { font-size: 12px; color: var(--tx2); margin: 0 0 12px; line-height: 1.5; }
.link-box { display: flex; gap: 8px; }
.link-box input { flex: 1; min-width: 0; background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 9px;
  padding: 9px 11px; font-size: 12px; color: var(--tx0); font-family: inherit; }
.link-vence { display: block; margin-top: 10px; font-size: 11px; color: var(--tx3, var(--tx2)); }
.foto-click { cursor: zoom-in; }
.map-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; padding: 0; cursor: pointer;
  color: var(--acc, #4f8ef7); font-size: 12px; font-weight: 600; font-family: inherit; white-space: nowrap; }
.map-link:hover { text-decoration: underline; }
.mapa-frame { width: 100%; height: 360px; border: 0; border-radius: 12px; background: var(--bg2); }
.mapa-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: 10px; font-size: 12px; color: var(--tx2); }
.mapa-foot a { color: var(--acc); text-decoration: none; font-weight: 600; }
.foto-modal { position: relative; max-width: min(92vw, 560px); text-align: center; }
.foto-modal img { max-width: 100%; max-height: 80vh; border-radius: 16px; display: block; margin: 0 auto; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.foto-modal p { margin: 12px 0 0; color: #fff; font-size: 14px; font-weight: 600; }
.foto-modal-x { position: absolute; top: -14px; right: -14px; background: var(--bg1); }
.overlay-top { z-index: 5000; }
.hoy-box { margin-top: 16px; border: 0.5px solid var(--bdr2); border-radius: 12px; padding: 12px 14px; background: var(--bg2); }
.hoy-hdr { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; color: var(--tx1, var(--tx0)); margin-bottom: 8px; }
.hoy-hdr i { color: var(--acc); margin-right: 4px; }
.hoy-count { font-weight: 500; color: var(--tx2); }
.hoy-vacio { font-size: 12px; color: var(--tx2); padding: 6px 0; }
.hoy-row { display: flex; align-items: center; gap: 12px; padding: 7px 0; border-top: 0.5px solid var(--bdr2); font-size: 13px; }
.hoy-row:first-of-type { border-top: none; }
.hoy-hora { font-weight: 600; color: var(--tx0); min-width: 62px; }
.hoy-ub { flex: 1; min-width: 0; color: var(--tx1, var(--tx0)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hoy-mas { margin-top: 6px; background: none; border: none; padding: 4px 0; color: var(--acc); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.hoy-mas:hover { text-decoration: underline; }
</style>
