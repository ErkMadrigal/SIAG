<template>
  <Teleport to="body">
    <div class="cp-ov" @click.self="$emit('close')">
      <div class="cp">
        <div class="cp-hdr">
          <div class="cp-av">{{ iniciales }}</div>
          <div class="cp-id">
            <h2>{{ usuario.nombre_completo }}</h2>
            <span class="cp-sub">@{{ usuario.name_user || '—' }} · {{ usuario.correo }}</span>
            <span class="pill" :class="usuario.estatus == 1 ? 'on' : 'off'">{{ usuario.estatus == 1 ? 'Activo' : 'Inactivo' }}</span>
          </div>
          <button class="cp-x" @click="$emit('close')"><i class="ti ti-x"></i></button>
        </div>

        <div class="cp-body">
          <div class="cp-grid">
            <div><label>ID de usuario</label><b>{{ String(usuario.id).padStart(3, '0') }}</b></div>
            <div>
              <label>No. de empleado</label>
              <b v-if="usuario.id_empleado">{{ String(usuario.id_empleado).padStart(6, '0') }} <small>{{ usuario.empleado_nombre }}</small></b>
              <b v-else class="mute">Sin vincular</b>
            </div>
            <div><label>Último movimiento</label><b>{{ ultimo || '—' }}</b></div>
            <div><label>Movimientos registrados</label><b>{{ total }}</b></div>
          </div>

          <h3>Permisos</h3>
          <div v-if="!permisos.length" class="mute small">Sin permisos asignados (si es nivel 2 tiene acceso total)</div>
          <div v-else class="cp-perms">
            <div v-for="r in permisos" :key="r.id_rol" class="cp-perm">
              <span class="pn">{{ r.rol }}</span>
              <span v-for="p in r.permisos" :key="p" class="pc">{{ p }}</span>
            </div>
          </div>

          <div class="cp-mov-h">
            <h3>Movimientos</h3>
            <select v-model="filtroAccion" class="cp-sel" @change="recargar">
              <option value="">Todas las acciones</option>
              <option v-for="a in acciones" :key="a" :value="a">{{ etiqueta(a) }}</option>
            </select>
          </div>

          <div v-if="cargando && !items.length" class="mute small">Cargando movimientos...</div>
          <div v-else-if="!items.length" class="mute small">Este colaborador aún no tiene movimientos registrados</div>
          <div v-else class="cp-tl">
            <div v-for="m in items" :key="m.id" class="cp-it">
              <span class="ic" :class="clase(m.action)"><i class="ti" :class="icono(m.action)"></i></span>
              <div class="tx">
                <b>{{ etiqueta(m.action) }}</b>
                <span v-if="m.message" class="msg">{{ m.message }}</span>
                <span class="meta">{{ fmt(m.created_at) }}<template v-if="m.entity"> · {{ m.entity }}<template v-if="m.entity_id"> #{{ m.entity_id }}</template></template><template v-if="m.ip"> · {{ m.ip }}</template></span>
              </div>
            </div>
            <button v-if="pagina < paginas" class="cp-more" :disabled="cargando" @click="masMovs">{{ cargando ? 'Cargando...' : 'Ver más' }}</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { auditService } from '@/services/audit.service.js'

const props = defineProps({ usuario: { type: Object, required: true } })
defineEmits(['close'])

const items = ref([])
const acciones = ref([])
const filtroAccion = ref('')
const cargando = ref(false)
const pagina = ref(1)
const paginas = ref(1)
const total = ref(0)

const iniciales = computed(() => String(props.usuario.nombre_completo || '').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'US')
const permisos = computed(() => Array.isArray(props.usuario.roles_permisos) ? props.usuario.roles_permisos : [])
const ultimo = computed(() => items.value.length && !filtroAccion.value ? fmt(items.value[0].created_at) : '')

const ETIQ = {
  LOGIN: 'Inició sesión', LOGOUT: 'Cerró sesión', CREAR_EMPLEADO: 'Dio de alta un empleado', ACTUALIZAR_EMPLEADO: 'Editó un empleado',
  CREAR_USUARIO_SISTEMA: 'Creó un colaborador', VINCULAR_EMPLEADO_USUARIO: 'Vinculó empleado a usuario',
  SUBIR_DOCUMENTO_EXPEDIENTE: 'Subió documento al expediente', APROBAR_DOCUMENTO_EXPEDIENTE: 'Aprobó un documento',
  RECHAZAR_DOCUMENTO_EXPEDIENTE: 'Rechazó un documento', VER_DOCUMENTO_EXPEDIENTE: 'Consultó un documento',
  ELIMINAR_DOCUMENTO_EXPEDIENTE: 'Eliminó un documento', SUBIR_DOCUMENTO_KIOSKO: 'Documento desde el kiosko',
}
const etiqueta = a => ETIQ[a] || String(a).toLowerCase().replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())
function icono(a) {
  a = String(a)
  if (a.startsWith('LOGIN')) return 'ti-login'
  if (a.startsWith('LOGOUT')) return 'ti-logout'
  if (a.startsWith('CREAR') || a.startsWith('SUBIR')) return 'ti-plus'
  if (a.startsWith('ACTUALIZAR') || a.startsWith('EDITAR') || a.startsWith('VINCULAR')) return 'ti-pencil'
  if (a.startsWith('ELIMINAR') || a.startsWith('RECHAZAR')) return 'ti-trash'
  if (a.startsWith('APROBAR')) return 'ti-check'
  if (a.startsWith('VER')) return 'ti-eye'
  return 'ti-activity'
}
function clase(a) {
  a = String(a)
  if (/^(ELIMINAR|RECHAZAR)/.test(a)) return 'red'
  if (/^(CREAR|SUBIR|APROBAR)/.test(a)) return 'green'
  if (/^LOGIN|^LOGOUT/.test(a)) return 'blue'
  return 'amber'
}
const fmt = f => {
  if (!f) return ''
  const d = new Date(String(f).replace(' ', 'T'))
  return d.toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function cargar(p) {
  cargando.value = true
  try {
    const r = await auditService.getAll({ user_id: props.usuario.id, page: p, limit: 20, ...(filtroAccion.value ? { action: filtroAccion.value } : {}) })
    items.value = p === 1 ? (r.data || []) : [...items.value, ...(r.data || [])]
    pagina.value = r.meta?.page || p
    paginas.value = r.meta?.totalPages || 1
    total.value = r.meta?.total ?? items.value.length
    if (!acciones.value.length) acciones.value = r.meta?.filters?.acciones || []
  } catch { /* sin permiso o sin red */ }
  finally { cargando.value = false }
}
const recargar = () => cargar(1)
const masMovs = () => cargar(pagina.value + 1)
onMounted(() => cargar(1))
</script>

<style scoped>
.cp-ov { position: fixed; inset: 0; z-index: 9990; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 16px; }
.cp { width: 100%; max-width: 680px; max-height: 88vh; display: flex; flex-direction: column; background: var(--bg1); border: 0.5px solid var(--bdr2); border-radius: 18px; color: var(--tx0); }
.cp-hdr { display: flex; align-items: center; gap: 14px; padding: 18px 20px; border-bottom: 0.5px solid var(--bdr2); }
.cp-av { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; background: var(--acc, #4f8ef7); color: #fff; font-weight: 700; font-size: 18px; flex: none; }
.cp-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.cp-id h2 { margin: 0; font-size: 17px; } .cp-sub { font-size: 12px; color: var(--tx2); }
.pill { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 20px; }
.pill.on { background: rgba(34,201,122,.14); color: #22c97a; } .pill.off { background: rgba(240,84,84,.14); color: #f05454; }
.cp-x { background: none; border: none; color: var(--tx2); font-size: 20px; cursor: pointer; align-self: flex-start; }
.cp-body { overflow: auto; padding: 16px 20px 20px; }
.cp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 8px; }
.cp-grid label { display: block; font-size: 11px; color: var(--tx2); margin-bottom: 2px; } .cp-grid b { font-size: 13px; } .cp-grid small { color: var(--tx2); font-weight: 400; display: block; }
h3 { font-size: 13px; margin: 18px 0 8px; color: var(--tx1, var(--tx0)); }
.mute { color: var(--tx3); } .small { font-size: 12px; }
.cp-perms { display: flex; flex-direction: column; gap: 6px; }
.cp-perm { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12px; }
.pn { min-width: 120px; font-weight: 600; } .pc { background: var(--bg2); border: 0.5px solid var(--bdr2); border-radius: 20px; padding: 2px 9px; font-size: 11px; }
.cp-mov-h { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.cp-sel { background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); border-radius: 8px; padding: 6px 8px; font-size: 12px; font-family: inherit; }
.cp-tl { display: flex; flex-direction: column; }
.cp-it { display: flex; gap: 12px; padding: 10px 0; border-bottom: 0.5px solid var(--bdr2); }
.ic { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; flex: none; font-size: 15px; }
.ic.green { background: rgba(34,201,122,.14); color: #22c97a; } .ic.red { background: rgba(240,84,84,.14); color: #f05454; }
.ic.blue { background: rgba(79,142,247,.14); color: #4f8ef7; } .ic.amber { background: rgba(245,166,35,.14); color: #f5a623; }
.tx { display: flex; flex-direction: column; gap: 2px; min-width: 0; } .tx b { font-size: 13px; }
.msg { font-size: 12px; color: var(--tx1, var(--tx0)); word-break: break-word; } .meta { font-size: 11px; color: var(--tx2); }
.cp-more { margin: 12px auto 0; background: var(--bg2); border: 0.5px solid var(--bdr2); color: var(--tx0); padding: 8px 18px; border-radius: 9px; cursor: pointer; font-family: inherit; }
</style>
