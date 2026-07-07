<template>
  <div class="tab-view">

    <!-- Header -->
    <div class="view-header">
      <div>
        <h1 class="view-title">Tabulador de salarios</h1>
        <p class="view-sub">Administra sueldos y bonos por zona y puesto</p>
      </div>
      <button class="btn-primary-lg" @click="abrirNuevo">
        <i class="ti ti-plus" aria-hidden="true"></i> Nuevo tabulador
      </button>
    </div>

    <!-- Tabla tabuladores -->
    <div class="sec">
      <div class="sec-hdr">
        <i class="ti ti-ruler-2" aria-hidden="true"></i>
        <span>Tabuladores</span>
        <button class="btn-sm" style="margin-left:auto" @click="loadData">
          <i class="ti ti-refresh" aria-hidden="true"></i>
        </button>
      </div>

      <div v-if="loading" class="skeleton-wrap">
        <div class="skeleton-row" v-for="i in 5" :key="i"></div>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:60px">ID</th>
              <th style="width:150px">Zona</th>
              <th>Nombre</th>
              <th style="width:220px">Vigencia</th>
              <th style="width:70px;text-align:center">Items</th>
              <th style="width:100px">Estatus</th>
              <th style="width:110px;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tabuladores" :key="t.id">
              <td class="mono">{{ t.id }}</td>
              <td style="color:var(--tx1);font-weight:500">{{ t.zona || '—' }}</td>
              <td style="color:var(--tx0)">{{ t.nombre || '—' }}</td>
              <td style="color:var(--tx2);font-size:12px">
                {{ t.vigencia_inicio }} → {{ t.vigencia_fin || 'Sin fin' }}
              </td>
              <td style="text-align:center">
                <span class="count-badge">{{ t.items || 0 }}</span>
              </td>
              <td>
                <span class="pill" :class="t.estatus == 1 ? 'activo' : 'baja'">
                  <span class="dot"></span>
                  {{ t.estatus == 1 ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td>
                <div class="row-actions">
                    <button class="icon-btn" @click="abrirEditar(t)" title="Editar tabulador">
                      <i class="ti ti-pencil"></i>
                    </button>
                    <button class="icon-btn" @click="abrirDuplicar(t)" title="Duplicar tabulador">
                      <i class="ti ti-copy"></i>
                    </button>
                    <button class="icon-btn accent" @click="abrirItems(t)" title="Ver items">
                      <i class="ti ti-list-details"></i>
                    </button>
                </div>
              </td>
            </tr>
            <tr v-if="!tabuladores.length">
              <td colspan="7" class="empty-row">No hay tabuladores registrados</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MODAL NUEVO TABULADOR -->
    <Teleport to="body">
      <div v-if="modalNuevo" class="modal-overlay" @click.self="modalNuevo = false">
        <div class="modal-box sm">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-plus" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Nuevo tabulador</p>
              <p class="modal-sub">Completa la información base</p>
            </div>
            <button class="modal-close" @click="modalNuevo = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="modal-body-content">
            <div class="field">
              <label>Zona <span class="req">*</span></label>
              <select v-model="nuevoForm.id_zona" :class="{ error: nuevoErrors.id_zona }" :disabled="loadingCombos">
                <option value="">Seleccione una zona</option>
                <option v-for="z in zonas" :key="z.id" :value="z.id">{{ z.zona }}</option>
              </select>
              <span v-if="nuevoErrors.id_zona" class="err-msg">{{ nuevoErrors.id_zona }}</span>
            </div>

            <div class="field">
              <label>Nombre</label>
              <input v-model="nuevoForm.nombre" placeholder="TABULADOR LÍNEA 1 2026"
                @input="nuevoForm.nombre = nuevoForm.nombre.toUpperCase()" />
            </div>

            <div class="field-row">
              <div class="field">
                <label>Vigencia inicio <span class="req">*</span></label>
                <input type="date" v-model="nuevoForm.vigencia_inicio" :class="{ error: nuevoErrors.vigencia_inicio }" />
                <span v-if="nuevoErrors.vigencia_inicio" class="err-msg">{{ nuevoErrors.vigencia_inicio }}</span>
              </div>
              <div class="field">
                <label>Vigencia fin <span style="color:var(--tx3);font-size:11px">(opcional)</span></label>
                <input type="date" v-model="nuevoForm.vigencia_fin" />
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="modalNuevo = false" :disabled="savingNuevo">Cancelar</button>
            <button class="btn-primary-lg" :disabled="savingNuevo" @click="crearTabulador">
              <i class="ti ti-loader-2 spin" v-if="savingNuevo" aria-hidden="true"></i>
              <i class="ti ti-check" v-else aria-hidden="true"></i>
              {{ savingNuevo ? 'Guardando...' : 'Crear tabulador' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL EDITAR TABULADOR -->
    <Teleport to="body">
      <div v-if="modalEditar" class="modal-overlay" @click.self="modalEditar = false">
        <div class="modal-box sm">
          <div class="modal-hdr">
            <div class="modal-icon amber"><i class="ti ti-pencil" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Editar tabulador</p>
              <p class="modal-sub">ID {{ editarForm.id }} · {{ editarForm.zona }}</p>
            </div>
            <button class="modal-close" @click="modalEditar = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="modal-body-content">
            <div class="field">
              <label>Zona <span class="req">*</span></label>
              <select v-model="editarForm.id_zona" :disabled="loadingCombos">
                <option value="">Seleccione una zona</option>
                <option v-for="z in zonas" :key="z.id" :value="String(z.id)">{{ z.zona }}</option>
              </select>
            </div>

            <div class="field">
              <label>Nombre</label>
              <input v-model="editarForm.nombre" placeholder="TABULADOR LÍNEA 1 2026"
                @input="editarForm.nombre = editarForm.nombre.toUpperCase()" />
            </div>

            <div class="field-row">
              <div class="field">
                <label>Vigencia inicio <span class="req">*</span></label>
                <input type="date" v-model="editarForm.vigencia_inicio" />
              </div>
              <div class="field">
                <label>Vigencia fin <span style="color:var(--tx3);font-size:11px">(opcional)</span></label>
                <input type="date" v-model="editarForm.vigencia_fin" />
              </div>
            </div>

            <div class="field">
              <label>Estatus</label>
              <select v-model="editarForm.estatus">
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>

            <div v-if="editarError" class="alert-error">
              <i class="ti ti-alert-circle"></i> {{ editarError }}
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn-sm" @click="modalEditar = false" :disabled="savingEditar">Cancelar</button>
            <button class="btn-primary-lg" :disabled="savingEditar" @click="guardarEditar">
              <i class="ti ti-loader-2 spin" v-if="savingEditar" aria-hidden="true"></i>
              <i class="ti ti-device-floppy" v-else aria-hidden="true"></i>
              {{ savingEditar ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL ITEMS -->
    <Teleport to="body">
      <div v-if="modalItems" class="modal-overlay" @click.self="modalItems = false">
        <div class="modal-box xl">

          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-list-details" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">{{ itemsTitulo }}</p>
              <p class="modal-sub">Administra los puestos y salarios de este tabulador</p>
            </div>
            <button class="modal-close" @click="modalItems = false"><i class="ti ti-x"></i></button>
          </div>

          <div class="items-layout">

            <!-- Panel izquierdo: formulario -->
            <div class="items-form-panel">
              <p class="panel-title">Agregar / actualizar puesto</p>

              <div class="field">
                <label>Puesto <span class="req">*</span></label>
                <select v-model="itemForm.id_puesto" :disabled="loadingCombos">
                  <option value="">Seleccione un puesto</option>
                  <option v-for="p in puestos" :key="p.id" :value="p.id">{{ p.puesto }}</option>
                </select>
              </div>

              <div class="field-row">
                <div class="field">
                  <label>Sueldo <span class="req">*</span></label>
                  <input v-model="itemForm.sueldo" type="number" step="0.01" placeholder="4650.00" />
                </div>
                <div class="field">
                  <label>Bono</label>
                  <input v-model="itemForm.bono" type="number" step="0.01" placeholder="450.00" />
                </div>
              </div>

              <div class="field">
                <label>Descuento</label>
                <input v-model="itemForm.descuento" type="number" step="0.01" placeholder="0.00" />
              </div>

              <button class="btn-primary-lg full" :disabled="savingItem" @click="guardarItem">
                <i class="ti ti-loader-2 spin" v-if="savingItem" aria-hidden="true"></i>
                <i class="ti ti-device-floppy" v-else aria-hidden="true"></i>
                {{ savingItem ? 'Guardando...' : 'Guardar item' }}
              </button>

              <!-- Estatus tabulador -->
              <div class="status-actions">
                <p class="panel-title">Estatus del tabulador</p>
                <div class="status-btns">
                  <button class="btn-success-sm" :disabled="savingStatus || tabuladorActual?.estatus == 1" @click="setEstatus(1)">
                    <i class="ti ti-circle-check" aria-hidden="true"></i> Activar
                  </button>
                  <button class="btn-danger-sm" :disabled="savingStatus || tabuladorActual?.estatus == 0" @click="setEstatus(0)">
                    <i class="ti ti-circle-x" aria-hidden="true"></i> Desactivar
                  </button>
                </div>
              </div>
            </div>

            <!-- Panel derecho: tabla de items -->
            <div class="items-table-panel">
              <div v-if="loadingItems" class="skeleton-wrap">
                <div class="skeleton-row" v-for="i in 5" :key="i"></div>
              </div>

              <div v-else class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th style="width:50px">ID</th>
                      <th>Puesto</th>
                      <th style="width:100px">Sueldo</th>
                      <th style="width:90px">Bono</th>
                      <th style="width:100px">Descuento</th>
                      <th style="width:90px">Estatus</th>
                      <th style="width:80px;text-align:right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="it in itemsData" :key="it.id" @click="editarItem(it)" style="cursor:pointer">
                      <td class="mono">{{ it.id }}</td>
                      <td style="font-weight:500">{{ it.puesto }}</td>
                      <td class="money">{{ formatMoney(it.sueldo) }}</td>
                      <td class="money">{{ formatMoney(it.bono) }}</td>
                      <td class="money red">{{ formatMoney(it.descuento) }}</td>
                      <td>
                        <span class="pill" :class="it.estatus == 1 ? 'activo' : 'baja'">
                          <span class="dot"></span>
                          {{ it.estatus == 1 ? 'Activo' : 'Inactivo' }}
                        </span>
                      </td>
                      <td @click.stop>
                        <div class="row-actions">
                          <button class="icon-btn accent" @click="editarItem(it)" title="Editar item">
                            <i class="ti ti-pencil"></i>
                          </button>
                          <button v-if="it.estatus == 1" class="icon-btn danger"
                            @click="desactivarItem(it.id)" title="Desactivar">
                            <i class="ti ti-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="!itemsData.length">
                      <td colspan="7" class="empty-row">Sin items — agrega el primer puesto</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
    </Teleport>

    <!-- MODAL DUPLICAR TABULADOR -->
   <Teleport to="body">
     <div v-if="modalDuplicar" class="modal-overlay" @click.self="modalDuplicar = false">
       <div class="modal-box sm">
         <div class="modal-hdr">
           <div class="modal-icon"><i class="ti ti-copy" aria-hidden="true"></i></div>
           <div>
             <p class="modal-title">Duplicar tabulador</p>
             <p class="modal-sub">Origen: {{ duplicarOrigen?.nombre || duplicarOrigen?.zona }} ({{ duplicarOrigen?.items || 0 }} items)</p>
           </div>
           <button class="modal-close" @click="modalDuplicar = false"><i class="ti ti-x"></i></button>
         </div>

         <div class="modal-body-content">
           <div class="field">
             <label>Nueva zona <span class="req">*</span></label>
             <select v-model="duplicarForm.id_zona" :class="{ error: duplicarErrors.id_zona }" :disabled="loadingCombos">
               <option value="">Seleccione una zona</option>
               <option v-for="z in zonas" :key="z.id" :value="z.id">{{ z.zona }}</option>
             </select>
             <span v-if="duplicarErrors.id_zona" class="err-msg">{{ duplicarErrors.id_zona }}</span>
           </div>

           <div class="field">
             <label>Nombre</label>
             <input v-model="duplicarForm.nombre" placeholder="TABULADOR LÍNEA 1 2026"
               @input="duplicarForm.nombre = duplicarForm.nombre.toUpperCase()" />
           </div>

           <div class="field-row">
             <div class="field">
               <label>Vigencia inicio <span class="req">*</span></label>
               <input type="date" v-model="duplicarForm.vigencia_inicio" :class="{ error: duplicarErrors.vigencia_inicio }" />
               <span v-if="duplicarErrors.vigencia_inicio" class="err-msg">{{ duplicarErrors.vigencia_inicio }}</span>
             </div>
             <div class="field">
               <label>Vigencia fin <span style="color:var(--tx3);font-size:11px">(opcional)</span></label>
               <input type="date" v-model="duplicarForm.vigencia_fin" />
             </div>
           </div>

           <div class="alert-info">
             <i class="ti ti-info-circle"></i>
             Se copiarán los {{ duplicarOrigen?.items || 0 }} item(s) (puestos, sueldos, bonos, descuentos)
             del tabulador origen a este nuevo tabulador.
           </div>
         </div>

         <div class="modal-footer">
           <button class="btn-sm" @click="modalDuplicar = false" :disabled="savingDuplicar">Cancelar</button>
           <button class="btn-primary-lg" :disabled="savingDuplicar" @click="confirmarDuplicar">
             <i class="ti ti-loader-2 spin" v-if="savingDuplicar" aria-hidden="true"></i>
             <i class="ti ti-copy" v-else aria-hidden="true"></i>
             {{ savingDuplicar ? 'Duplicando...' : 'Duplicar tabulador' }}
           </button>
         </div>
       </div>
     </div>
   </Teleport>


  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import { tabuladorService } from '@/services/tabulador.service.js'

const ui = useUiStore()

const loading        = ref(true)
const loadingCombos  = ref(true)
const loadingItems   = ref(false)
const savingNuevo    = ref(false)
const savingEditar   = ref(false)
const savingItem     = ref(false)
const savingStatus   = ref(false)
const tabuladores    = ref([])
const zonas          = ref([])
const puestos        = ref([])
const modalNuevo     = ref(false)
const modalEditar    = ref(false)
const modalItems     = ref(false)
const itemsData      = ref([])
const itemsTitulo    = ref('')
const tabuladorActual = ref(null)
const editarError    = ref('')

const nuevoForm  = reactive({ id_zona: '', nombre: '', vigencia_inicio: '', vigencia_fin: '' })
const nuevoErrors = reactive({})
const editarForm = reactive({ id: '', id_zona: '', zona: '', nombre: '', vigencia_inicio: '', vigencia_fin: '', estatus: '1' })
const itemForm   = reactive({ id_tabulador: '', id_puesto: '', sueldo: '', bono: '', descuento: '' })

const modalDuplicar   = ref(false)
   const savingDuplicar  = ref(false)
   const duplicarOrigen  = ref(null)
   const duplicarForm    = reactive({ id_zona: '', nombre: '', vigencia_inicio: '', vigencia_fin: '' })
   const duplicarErrors  = reactive({})

onMounted(async () => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Tabulador', to: '/tabulador' }
  ])
  await Promise.all([loadData(), loadCombos()])
})

async function loadData() {
  loading.value = true
  try {
    tabuladores.value = await tabuladorService.getAll()
  } catch (err) {
    console.error(err)
  } finally { loading.value = false }
}

async function loadCombos() {
  loadingCombos.value = true
  try {
    const [z, p] = await Promise.all([
      tabuladorService.getZonas(),
      tabuladorService.getPuestos(),
    ])
    zonas.value   = z
    puestos.value = p
  } catch (err) {
    console.error(err)
  } finally { loadingCombos.value = false }
}

// ── Nuevo tabulador ───────────────────────────────────────────────────
function abrirNuevo() {
  Object.keys(nuevoForm).forEach(k => nuevoForm[k] = '')
  Object.keys(nuevoErrors).forEach(k => delete nuevoErrors[k])
  modalNuevo.value = true
}

function abrirDuplicar(t) {
     duplicarOrigen.value = t
     duplicarForm.id_zona = ''
     duplicarForm.nombre  = t.nombre ? `${t.nombre} (COPIA)` : ''
     duplicarForm.vigencia_inicio = ''
     duplicarForm.vigencia_fin    = ''
     Object.keys(duplicarErrors).forEach(k => delete duplicarErrors[k])
     modalDuplicar.value = true
   }

   function validateDuplicar() {
     Object.keys(duplicarErrors).forEach(k => delete duplicarErrors[k])
     let ok = true
     if (!duplicarForm.id_zona)         { duplicarErrors.id_zona        = 'Selecciona una zona'; ok = false }
     if (!duplicarForm.vigencia_inicio) { duplicarErrors.vigencia_inicio = 'La vigencia inicio es requerida'; ok = false }
     return ok
   }

   async function confirmarDuplicar() {
     if (!validateDuplicar()) return
     savingDuplicar.value = true
     try {
       await tabuladorService.duplicar(duplicarOrigen.value.id, {
         id_zona:         duplicarForm.id_zona,
         nombre:          duplicarForm.nombre,
         vigencia_inicio: duplicarForm.vigencia_inicio,
         vigencia_fin:    duplicarForm.vigencia_fin || null,
       })
       modalDuplicar.value = false
       await loadData()
     } catch (err) {
       duplicarErrors.id_zona = err.response?.data?.message || 'Error al duplicar el tabulador'
     } finally {
       savingDuplicar.value = false
     }
   }

function validateNuevo() {
  Object.keys(nuevoErrors).forEach(k => delete nuevoErrors[k])
  let ok = true
  if (!nuevoForm.id_zona)         { nuevoErrors.id_zona        = 'Selecciona una zona'; ok = false }
  if (!nuevoForm.vigencia_inicio) { nuevoErrors.vigencia_inicio = 'La vigencia inicio es requerida'; ok = false }
  return ok
}

async function crearTabulador() {
  if (!validateNuevo()) return
  savingNuevo.value = true
  try {
    await tabuladorService.create({
      id_zona:         nuevoForm.id_zona,
      nombre:          nuevoForm.nombre,
      vigencia_inicio: nuevoForm.vigencia_inicio,
      vigencia_fin:    nuevoForm.vigencia_fin || null,
    })
    modalNuevo.value = false
    await loadData()
  } catch (err) {
    nuevoErrors.id_zona = err.response?.data?.message || 'Error al crear el tabulador'
  } finally { savingNuevo.value = false }
}

// ── Editar tabulador ──────────────────────────────────────────────────
function abrirEditar(t) {
  editarForm.id              = t.id
  editarForm.id_zona         = String(t.id_zona || '')
  editarForm.zona            = t.zona || ''
  editarForm.nombre          = t.nombre || ''
  editarForm.vigencia_inicio = t.vigencia_inicio || ''
  editarForm.vigencia_fin    = t.vigencia_fin || ''
  editarForm.estatus         = String(t.estatus ?? '1')
  editarError.value          = ''
  modalEditar.value          = true
}

async function guardarEditar() {
  if (!editarForm.id_zona || !editarForm.vigencia_inicio) {
    editarError.value = 'Zona y vigencia inicio son requeridos'
    return
  }
  savingEditar.value = true
  editarError.value  = ''
  try {
    await tabuladorService.update(editarForm.id, {
      id_zona:         editarForm.id_zona,
      nombre:          editarForm.nombre,
      vigencia_inicio: editarForm.vigencia_inicio,
      vigencia_fin:    editarForm.vigencia_fin || null,
      estatus:         editarForm.estatus,
    })
    modalEditar.value = false
    await loadData()
  } catch (err) {
    editarError.value = err.response?.data?.message || 'Error al guardar los cambios'
  } finally { savingEditar.value = false }
}

// ── Items ─────────────────────────────────────────────────────────────
async function abrirItems(t) {
  tabuladorActual.value = t
  itemForm.id_tabulador = t.id
  itemForm.id_puesto    = ''
  itemForm.sueldo       = ''
  itemForm.bono         = ''
  itemForm.descuento    = ''
  itemsTitulo.value     = `${t.zona} | ${t.nombre || 'Tabulador'} (${t.vigencia_inicio})`
  modalItems.value      = true
  await fetchItems(t.id)
}

async function fetchItems(id) {
  loadingItems.value = true
  try {
    const res = await tabuladorService.getById(id)
    tabuladorActual.value = res || tabuladorActual.value
    itemsData.value = res.detalle || res.items || []
  } catch (err) {
    console.error(err)
  } finally { loadingItems.value = false }
}

function editarItem(it) {
  // Llenar el formulario de la izquierda con los datos del item
  itemForm.id_puesto  = String(it.id_puesto)
  itemForm.sueldo     = it.sueldo
  itemForm.bono       = it.bono
  itemForm.descuento  = it.descuento
}

async function guardarItem() {
  if (!itemForm.id_puesto) return
  if (itemForm.sueldo === '' || isNaN(Number(itemForm.sueldo))) return
  savingItem.value = true
  try {
    await tabuladorService.upsertItem({
      id_tabulador: itemForm.id_tabulador,
      id_puesto:    itemForm.id_puesto,
      sueldo:       itemForm.sueldo,
      bono:         itemForm.bono    || 0,
      descuento:    itemForm.descuento || 0,
    })
    await fetchItems(itemForm.id_tabulador)
    itemForm.id_puesto  = ''
    itemForm.sueldo     = ''
    itemForm.bono       = ''
    itemForm.descuento  = ''
  } catch (err) {
    console.error(err)
  } finally { savingItem.value = false }
}

async function desactivarItem(id_item) {
  try {
    await tabuladorService.disableItem(id_item)
    await fetchItems(itemForm.id_tabulador)
  } catch (err) {
    console.error(err)
  }
}

async function setEstatus(estatus) {
  savingStatus.value = true
  try {
    await tabuladorService.setEstatus(itemForm.id_tabulador, estatus)
    await loadData()
    await fetchItems(itemForm.id_tabulador)
  } catch (err) {
    console.error(err)
  } finally { savingStatus.value = false }
}

function formatMoney(v) {
  return Number(v || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}
</script>

<style scoped>
.tab-view { display: flex; flex-direction: column; gap: 14px; }

.view-header {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
}
.view-title { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub   { font-size: 12px; color: var(--tx2); margin-top: 3px; }

.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0);
}
.sec-hdr i { font-size: 16px; color: var(--acc); }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr); white-space: nowrap;
}
td { padding: 10px 14px; color: var(--tx0); font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); }
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.mono  { font-family: monospace; font-size: 11px; color: var(--tx2); }
.money { font-family: monospace; font-size: 12px; color: var(--grn); }
.money.red { color: var(--red); }
.empty-row { text-align: center; color: var(--tx2); padding: 32px; font-size: 13px; }
.count-badge {
  display: inline-block; min-width: 24px; text-align: center;
  font-size: 11px; padding: 2px 6px; border-radius: 20px;
  background: var(--acc-dim); color: var(--acc); font-weight: 500;
}
.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 14px; transition: all .15s;
}
.icon-btn.accent { color: var(--acc); }
.icon-btn.danger { color: var(--red); }
.icon-btn:hover { background: var(--bg3); }

.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.activo { background: var(--grn-dim); color: var(--grn); }
.pill.baja   { background: var(--red-dim);  color: var(--red); }

.skeleton-wrap { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.skeleton-row {
  height: 42px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%;
  display: flex; flex-direction: column; overflow: hidden; max-height: 90vh;
}
.modal-box.sm { max-width: 440px; }
.modal-box.xl { max-width: 900px; }
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr); flex-shrink: 0;
}
.modal-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
}
.modal-icon.amber { background: var(--amb-dim); color: var(--amb); }
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); margin-top: 2px; }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-body-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.modal-footer {
  padding: 14px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px; flex-shrink: 0;
}

.items-layout {
  display: grid; grid-template-columns: 260px 1fr;
  overflow: hidden; flex: 1;
}
.items-form-panel {
  border-right: 0.5px solid var(--bdr);
  padding: 16px; display: flex; flex-direction: column; gap: 12px; overflow-y: auto;
}
.items-table-panel { padding: 16px; overflow-y: auto; }
.panel-title { font-size: 12px; font-weight: 500; color: var(--tx2); text-transform: uppercase; letter-spacing: .7px; }

.field { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
label  { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req   { color: var(--red); }
input, select {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 7px 10px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus, select:focus { border-color: var(--acc); }
input.error, select.error { border-color: var(--red); }
select option { background: var(--bg1); }
.err-msg { font-size: 11px; color: var(--red); }

.alert-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: var(--red-dim); border: 0.5px solid var(--red);
  color: var(--red); font-size: 13px;
}

.status-actions { border-top: 0.5px solid var(--bdr); padding-top: 12px; display: flex; flex-direction: column; gap: 8px; }
.status-btns { display: flex; gap: 8px; }
.btn-success-sm {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px; border-radius: 8px; border: 0.5px solid var(--grn);
  background: var(--grn-dim); color: var(--grn); font-size: 12px; cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-success-sm:hover:not(:disabled) { background: var(--grn); color: #fff; }
.btn-danger-sm {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px; border-radius: 8px; border: 0.5px solid var(--red);
  background: var(--red-dim); color: var(--red); font-size: 12px; cursor: pointer; font-family: inherit; transition: all .15s;
}
.btn-danger-sm:hover:not(:disabled) { background: var(--red); color: #fff; }
.btn-success-sm:disabled, .btn-danger-sm:disabled { opacity: .4; cursor: not-allowed; }

.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer; transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); color: var(--tx0); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: background .15s;
}
.btn-primary-lg.full { width: 100%; justify-content: center; }
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .items-layout { grid-template-columns: 1fr; }
  .items-form-panel { border-right: none; border-bottom: 0.5px solid var(--bdr); }
}

.alert-info {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 8px;
  background: var(--acc-dim); border: 0.5px solid var(--acc);
  color: var(--acc); font-size: 12px; line-height: 1.4;
}
</style>