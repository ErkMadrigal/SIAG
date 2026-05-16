<template>
  <div class="cat-view">

    <div class="view-header">
      <div>
        <h1 class="view-title">Multicatálogo</h1>
        <p class="view-sub">Administra tipos y valores de los catálogos del sistema</p>
      </div>
    </div>

    <div class="cat-layout">

      <!-- Panel izquierdo -->
      <div class="cat-sidebar">

        <!-- Nuevo tipo -->
        <div class="sec">
          <div class="sec-hdr">
            <i class="ti ti-tag" aria-hidden="true"></i>
            <span>Tipo de catálogo</span>
          </div>
          <div class="sec-body">
            <div class="field">
              <label>Nombre <span class="req">*</span></label>
              <input
                v-model="nuevoTipo"
                placeholder="Ej. ESTADO_CIVIL"
                @input="nuevoTipo = nuevoTipo.toUpperCase()"
                @keydown.enter="crearTipo"
                :class="{ error: errorTipo }"
              />
              <span v-if="errorTipo" class="err-msg">{{ errorTipo }}</span>
            </div>
            <button class="btn-primary-lg full mt-8" :disabled="savingTipo" @click="crearTipo">
              <i class="ti ti-loader-2 spin" v-if="savingTipo" aria-hidden="true"></i>
              <i class="ti ti-plus" v-else aria-hidden="true"></i>
              {{ savingTipo ? 'Creando...' : 'Agregar tipo' }}
            </button>
          </div>
        </div>

        <!-- Lista de tipos -->
        <div class="sec">
          <div class="sec-hdr">
            <i class="ti ti-list" aria-hidden="true"></i>
            <span>Tipos disponibles</span>
          </div>
          <div v-if="loadingTipos" class="skeleton-wrap">
            <div class="skeleton-row" v-for="i in 5" :key="i" style="height:36px"></div>
          </div>
          <div v-else class="tipos-list">
            <div
              v-for="t in tipos"
              :key="t.id"
              class="tipo-item"
              :class="{ active: tipoSeleccionado?.id === t.id }"
              @click="seleccionarTipo(t)"
            >
              <span class="tipo-name">{{ t.descripcion }}</span>
              <span class="tipo-id">#{{ t.id }}</span>
            </div>
            <div v-if="!tipos.length" class="tipos-empty">
              Sin tipos registrados
            </div>
          </div>
        </div>

      </div>

      <!-- Panel derecho -->
      <div class="cat-main">

        <template v-if="tipoSeleccionado">

          <!-- Agregar item -->
          <div class="sec">
            <div class="sec-hdr">
              <i class="ti ti-circle-plus" aria-hidden="true"></i>
              <span>Agregar a <strong>{{ tipoSeleccionado.descripcion }}</strong></span>
            </div>
            <div class="sec-body">
              <div class="field-row">
                <div class="field">
                  <label>Valor <span class="req">*</span></label>
                  <input
                    v-model="nuevoItem.valor"
                    placeholder="SOLTERO"
                    @input="nuevoItem.valor = nuevoItem.valor.toUpperCase()"
                    :class="{ error: errorItem.valor }"
                  />
                  <span v-if="errorItem.valor" class="err-msg">{{ errorItem.valor }}</span>
                </div>
                <div class="field">
                  <label>Descripción</label>
                  <input v-model="nuevoItem.descripcion" placeholder="Descripción opcional" />
                </div>
              </div>
              <button class="btn-primary-lg mt-8" :disabled="savingItem" @click="crearItem">
                <i class="ti ti-loader-2 spin" v-if="savingItem" aria-hidden="true"></i>
                <i class="ti ti-plus" v-else aria-hidden="true"></i>
                {{ savingItem ? 'Guardando...' : 'Agregar item' }}
              </button>
            </div>
          </div>

          <!-- Tabla de items -->
          <div class="sec">
            <div class="sec-hdr">
              <i class="ti ti-table" aria-hidden="true"></i>
              <span>Items de <strong>{{ tipoSeleccionado.descripcion }}</strong></span>
              <span class="item-count">{{ filteredItems.length }}</span>
              <div class="search-box" style="margin-left:auto">
                <i class="ti ti-search" aria-hidden="true"></i>
                <input v-model="searchItems" placeholder="Buscar..." />
                <button v-if="searchItems" class="clear-btn" @click="searchItems = ''">
                  <i class="ti ti-x"></i>
                </button>
              </div>
            </div>

            <div v-if="loadingItems" class="skeleton-wrap">
              <div class="skeleton-row" v-for="i in 5" :key="i"></div>
            </div>

            <div v-else class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:60px">ID</th>
                    <th>Valor</th>
                    <th>Descripción</th>
                    <th style="width:90px">Estado</th>
                    <th style="width:80px;text-align:right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in filteredItems" :key="item.id">
                    <td class="mono">{{ item.id }}</td>
                    <td style="font-weight:500">{{ item.valor }}</td>
                    <td style="color:var(--tx2)">{{ item.descripcion || '—' }}</td>
                    <td>
                      <span class="pill" :class="item.status == 1 ? 'activo' : 'baja'">
                        <span class="dot"></span>
                        {{ item.status == 1 ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td>
                      <div class="row-actions">
                        <button class="icon-btn accent" @click="abrirEditar(item)" title="Editar">
                          <i class="ti ti-edit"></i>
                        </button>
                        <button class="icon-btn danger" @click="eliminarItem(item)" title="Eliminar">
                          <i class="ti ti-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!filteredItems.length">
                    <td colspan="5" class="empty-row">Sin items en este catálogo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </template>

        <!-- Estado inicial -->
        <div v-else class="select-prompt">
          <i class="ti ti-hand-finger" aria-hidden="true"></i>
          <p>Selecciona un tipo de catálogo para ver y administrar sus items</p>
        </div>

      </div>
    </div>

    <!-- Modal editar -->
    <Teleport to="body">
      <div v-if="modalEditar" class="modal-overlay" @click.self="modalEditar = false">
        <div class="modal-box">
          <div class="modal-hdr">
            <div class="modal-icon"><i class="ti ti-edit" aria-hidden="true"></i></div>
            <div>
              <p class="modal-title">Editar item</p>
              <p class="modal-sub">ID: {{ editForm.id }}</p>
            </div>
            <button class="modal-close" @click="modalEditar = false"><i class="ti ti-x"></i></button>
          </div>
          <div class="modal-body-content">
            <div class="field">
              <label>Valor <span class="req">*</span></label>
              <input v-model="editForm.valor" @input="editForm.valor = editForm.valor.toUpperCase()" />
            </div>
            <div class="field">
              <label>Descripción</label>
              <input v-model="editForm.descripcion" />
            </div>
            <div class="field">
              <label>Estado</label>
              <div class="toggle-row">
                <label class="switch">
                  <input type="checkbox" v-model="editForm.activo" />
                  <span class="slider"></span>
                </label>
                <span style="font-size:13px;color:var(--tx1)">
                  {{ editForm.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-sm" @click="modalEditar = false" :disabled="savingEdit">Cancelar</button>
            <button class="btn-primary-lg" :disabled="savingEdit" @click="guardarEdicion">
              <i class="ti ti-loader-2 spin" v-if="savingEdit" aria-hidden="true"></i>
              <i class="ti ti-check" v-else aria-hidden="true"></i>
              {{ savingEdit ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useUiStore } from '@/stores/ui.js'
import api from '@/services/api.js'

const ui = useUiStore()

const loadingTipos    = ref(true)
const loadingItems    = ref(false)
const savingTipo      = ref(false)
const savingItem      = ref(false)
const savingEdit      = ref(false)
const tipos           = ref([])
const items           = ref([])
const tipoSeleccionado = ref(null)
const nuevoTipo       = ref('')
const errorTipo       = ref('')
const searchItems     = ref('')
const modalEditar     = ref(false)

const nuevoItem = reactive({ valor: '', descripcion: '' })
const errorItem = reactive({ valor: '' })
const editForm  = reactive({ id: '', valor: '', descripcion: '', activo: true })

onMounted(() => {
  ui.setBreadcrumbs([
    { label: 'Home', to: '/' },
    { label: 'Catálogos', to: '/catalogos' }
  ])
  cargarTipos()
})

async function cargarTipos() {
  loadingTipos.value = true
  try {
    const { data } = await api.get('/catalogos/tipos')
    tipos.value = data.data || []
  } catch (err) {
    console.error(err)
  } finally { loadingTipos.value = false }
}

async function seleccionarTipo(t) {
  tipoSeleccionado.value = t
  searchItems.value      = ''
  loadingItems.value     = true
  try {
    const { data } = await api.get(`/catalogos/${t.id}`)
    items.value = data.data || []
  } catch (err) {
    console.error(err)
    items.value = []
  } finally { loadingItems.value = false }
}

async function crearTipo() {
  errorTipo.value = ''
  if (!nuevoTipo.value.trim()) { errorTipo.value = 'El nombre es requerido'; return }
  savingTipo.value = true
  try {
    await api.post('/catalogos/tipos', { descripcion: nuevoTipo.value.trim() })
    nuevoTipo.value = ''
    await cargarTipos()
  } catch (err) {
    errorTipo.value = err.response?.data?.message || 'Error al crear'
  } finally { savingTipo.value = false }
}

async function crearItem() {
  errorItem.valor = ''
  if (!nuevoItem.valor.trim()) { errorItem.valor = 'El valor es requerido'; return }
  savingItem.value = true
  try {
    await api.post(`/catalogos/${tipoSeleccionado.value.id}/items`, {
      valor:       nuevoItem.valor.trim(),
      descripcion: nuevoItem.descripcion.trim(),
    })
    nuevoItem.valor       = ''
    nuevoItem.descripcion = ''
    await seleccionarTipo(tipoSeleccionado.value)
  } catch (err) {
    errorItem.valor = err.response?.data?.message || 'Error al guardar'
  } finally { savingItem.value = false }
}

function abrirEditar(item) {
  editForm.id          = item.id
  editForm.valor       = item.valor
  editForm.descripcion = item.descripcion || ''
  editForm.activo      = item.status == 1
  modalEditar.value    = true
}

async function guardarEdicion() {
  if (!editForm.valor.trim()) return
  savingEdit.value = true
  try {
    await api.put(`/catalogos/items/${editForm.id}`, {
      valor:       editForm.valor.trim(),
      descripcion: editForm.descripcion.trim(),
      status:      editForm.activo ? 1 : 0,
    })
    modalEditar.value = false
    await seleccionarTipo(tipoSeleccionado.value)
  } catch (err) {
    console.error(err)
  } finally { savingEdit.value = false }
}

async function eliminarItem(item) {
  const ok = confirm(`¿Eliminar "${item.valor}"? Se realizará un borrado lógico.`)
  if (!ok) return
  try {
    await api.delete(`/catalogos/items/${item.id}`)
    await seleccionarTipo(tipoSeleccionado.value)
  } catch (err) {
    console.error(err)
  }
}

const filteredItems = computed(() => {
  const q = searchItems.value.toLowerCase().trim()
  if (!q) return items.value
  return items.value.filter(i =>
    (i.valor || '').toLowerCase().includes(q) ||
    (i.descripcion || '').toLowerCase().includes(q)
  )
})
</script>

<style scoped>
.cat-view { display: flex; flex-direction: column; gap: 14px; }
.view-header { display: flex; align-items: center; justify-content: space-between; }
.view-title  { font-size: 20px; font-weight: 600; color: var(--tx0); }
.view-sub    { font-size: 12px; color: var(--tx2); margin-top: 3px; }

/* Layout */
.cat-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 14px;
  align-items: start;
}

/* Sección */
.sec { background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px; overflow: hidden; }
.sec-hdr {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-bottom: 0.5px solid var(--bdr);
  font-size: 13px; font-weight: 500; color: var(--tx0); flex-wrap: wrap;
}
.sec-hdr i { font-size: 16px; color: var(--acc); }
.sec-body { padding: 14px; display: flex; flex-direction: column; gap: 12px; }

/* Tipos list */
.tipos-list { display: flex; flex-direction: column; }
.tipo-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; cursor: pointer; transition: background .12s;
  border-bottom: 0.5px solid var(--bdr); font-size: 13px; color: var(--tx1);
}
.tipo-item:last-child { border-bottom: none; }
.tipo-item:hover { background: var(--bg2); color: var(--tx0); }
.tipo-item.active { background: var(--acc-dim); color: var(--acc); font-weight: 500; }
.tipo-name { flex: 1; }
.tipo-id   { font-size: 10px; color: var(--tx3); font-family: monospace; }
.tipo-item.active .tipo-id { color: var(--acc); opacity: .7; }
.tipos-empty { padding: 24px; text-align: center; font-size: 12px; color: var(--tx3); }

/* Select prompt */
.select-prompt {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; padding: 60px; color: var(--tx3); text-align: center; font-size: 13px;
  background: var(--bg1); border: 0.5px solid var(--bdr); border-radius: 12px;
}
.select-prompt i { font-size: 36px; }

/* Item count */
.item-count {
  font-size: 11px; padding: 2px 7px; border-radius: 20px;
  background: var(--acc-dim); color: var(--acc); font-weight: 500;
}

/* Fields */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
label  { font-size: 12px; font-weight: 500; color: var(--tx1); }
.req   { color: var(--red); }
input  {
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 8px 10px;
  font-size: 13px; color: var(--tx0); outline: none;
  font-family: inherit; transition: border .15s; width: 100%;
}
input:focus { border-color: var(--acc); }
input.error { border-color: var(--red); }
input::placeholder { color: var(--tx3); }
.err-msg { font-size: 11px; color: var(--red); }
.mt-8 { margin-top: 8px; }

/* Search */
.search-box {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr2);
  border-radius: 8px; padding: 4px 8px;
}
.search-box i { font-size: 14px; color: var(--tx2); }
.search-box input {
  background: transparent; border: none; padding: 2px 0;
  width: 140px; font-size: 12px;
}
.clear-btn {
  background: none; border: none; cursor: pointer;
  color: var(--tx2); font-size: 13px; padding: 0; display: flex;
}

/* Tabla */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th {
  padding: 8px 14px; text-align: left;
  font-size: 10px; font-weight: 500; color: var(--tx2);
  text-transform: uppercase; letter-spacing: .7px;
  border-bottom: 0.5px solid var(--bdr);
}
td { padding: 10px 14px; font-size: 12.5px; border-bottom: 0.5px solid var(--bdr); color: var(--tx0); }
tbody tr { transition: background .12s; }
tbody tr:hover td { background: var(--bg2); }
tbody tr:last-child td { border-bottom: none; }
.mono { font-family: monospace; font-size: 11px; color: var(--tx2); }
.empty-row { text-align: center; color: var(--tx2); padding: 32px; }

.pill {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 3px 9px; border-radius: 20px; font-weight: 500;
}
.dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.pill.activo { background: var(--grn-dim); color: var(--grn); }
.pill.baja   { background: var(--red-dim); color: var(--red); }

.row-actions { display: flex; gap: 4px; justify-content: flex-end; }
.icon-btn {
  width: 26px; height: 26px; border-radius: 6px;
  background: var(--bg2); border: 0.5px solid var(--bdr);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--tx2); font-size: 13px; transition: all .15s;
}
.icon-btn.accent { color: var(--acc); }
.icon-btn.danger { color: var(--red); }
.icon-btn:hover  { background: var(--bg3); }

/* Skeleton */
.skeleton-wrap { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.skeleton-row {
  height: 42px; background: var(--bg2); border-radius: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}
@keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 16px;
}
.modal-box {
  background: var(--bg1); border: 0.5px solid var(--bdr2);
  border-radius: 16px; width: 100%; max-width: 400px;
  display: flex; flex-direction: column; overflow: hidden;
}
.modal-hdr {
  display: flex; align-items: center; gap: 12px;
  padding: 16px 18px; border-bottom: 0.5px solid var(--bdr);
}
.modal-icon {
  width: 34px; height: 34px; border-radius: 10px;
  background: var(--acc-dim); color: var(--acc);
  display: flex; align-items: center; justify-content: center; font-size: 17px; flex-shrink: 0;
}
.modal-title { font-size: 14px; font-weight: 600; color: var(--tx0); }
.modal-sub   { font-size: 11px; color: var(--tx2); }
.modal-close {
  margin-left: auto; width: 28px; height: 28px; border-radius: 6px;
  background: var(--bg3); border: none; cursor: pointer;
  color: var(--tx2); font-size: 16px;
  display: flex; align-items: center; justify-content: center;
}
.modal-body-content { padding: 16px 18px; display: flex; flex-direction: column; gap: 12px; }
.modal-footer {
  padding: 12px 18px; border-top: 0.5px solid var(--bdr);
  display: flex; justify-content: flex-end; gap: 8px;
}

/* Toggle */
.toggle-row { display: flex; align-items: center; gap: 10px; }
.switch { position: relative; display: inline-block; width: 36px; height: 20px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; cursor: pointer; inset: 0;
  background: var(--bg4); border-radius: 20px; transition: .2s;
}
.slider::before {
  content: ''; position: absolute;
  width: 14px; height: 14px; left: 3px; bottom: 3px;
  background: #fff; border-radius: 50%; transition: .2s;
}
input:checked + .slider { background: var(--acc); }
input:checked + .slider::before { transform: translateX(16px); }

/* Botones */
.btn-sm {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 8px;
  border: 0.5px solid var(--bdr2); background: transparent;
  font-size: 12px; color: var(--tx1); cursor: pointer;
  transition: all .15s; font-family: inherit;
}
.btn-sm:hover { background: var(--bg3); }
.btn-primary-lg {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 8px; border: none;
  background: var(--acc); font-size: 13px; color: #fff;
  cursor: pointer; font-family: inherit; font-weight: 500; transition: background .15s;
}
.btn-primary-lg.full { width: 100%; justify-content: center; }
.btn-primary-lg:hover:not(:disabled) { background: var(--acc2); }
.btn-primary-lg:disabled { opacity: .6; cursor: not-allowed; }

@keyframes spin { to { transform: rotate(360deg); } }
.spin { display: inline-block; animation: spin .8s linear infinite; }

@media (max-width: 768px) {
  .cat-layout { grid-template-columns: 1fr; }
  .field-row  { grid-template-columns: 1fr; }
}
</style>